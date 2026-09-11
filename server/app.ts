import express, { type ErrorRequestHandler } from "express";
import { rateLimit } from "express-rate-limit";
import { randomBytes } from "node:crypto";
import { join } from "node:path";
import { PricingStore } from "./store.ts";
import { registerGallery } from "./gallery.ts";
import { registerContacts } from "./contacts.ts";
import { readCredentials, sessionHash, verifyPassword } from "./auth.ts";

interface Options {
  directory: string;
  origins: string[];
  production?: boolean;
  staticDirectory?: string;
}

export function createApp(options: Options) {
  const app = express();
  const store = new PricingStore(join(options.directory, "studio.sqlite"));
  const credentials = readCredentials(options.directory);
  const cookie = "beauty_session";
  const cookieOptions = {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: Boolean(options.production),
    path: "/api",
  };
  const tokenFrom = (header = "") =>
    header
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${cookie}=`))
      ?.slice(cookie.length + 1) ?? "";
  app.disable("x-powered-by");
  app.use((_req, res, next) => {
    res.set({
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    });
    next();
  });
  app.use("/api", (_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  app.use("/api", (req, res, next) => {
    if (
      !["GET", "HEAD"].includes(req.method) &&
      !options.origins.includes(req.headers.origin ?? "")
    ) {
      res.status(403).json({ message: "Запит з іншого сайту відхилено." });
      return;
    }
    next();
  });
  app.use(express.json({ limit: "32kb", type: "application/json" }));
  app.get("/api/prices", (_req, res) => res.json(store.read()));

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    skipSuccessfulRequests: true,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { message: "Забагато спроб. Спробуй увійти через 15 хвилин." },
  });

  app.post("/api/login", limiter, (req, res) => {
    const password = req.body?.password;
    if (
      typeof password !== "string" ||
      password.length > 256 ||
      !verifyPassword(password, credentials)
    ) {
      res.status(401).json({ message: "Неправильний пароль." });
      return;
    }
    const token = randomBytes(32).toString("base64url");
    store.db
      .prepare("DELETE FROM sessions WHERE expires < ? OR hash = ?")
      .run(Date.now(), sessionHash(tokenFrom(req.headers.cookie)));
    store.db
      .prepare("INSERT INTO sessions VALUES (?, ?)")
      .run(sessionHash(token), Date.now() + 12 * 60 * 60 * 1000);
    res.cookie(cookie, token, {
      ...cookieOptions,
      maxAge: 12 * 60 * 60 * 1000,
    });
    res.json({ authenticated: true });
  });

  app.use("/api/admin", (req, res, next) => {
    const token = tokenFrom(req.headers.cookie);
    const session =
      token &&
      store.db
        .prepare("SELECT expires FROM sessions WHERE hash = ?")
        .get(sessionHash(token));
    if (!session || Number(session.expires) <= Date.now()) {
      res.status(401).json({ message: "Увійди, щоб керувати студією." });
      return;
    }
    next();
  });
  app.get("/api/admin/session", (_req, res) =>
    res.json({ authenticated: true }),
  );
  app.post("/api/admin/logout", (req, res) => {
    store.db
      .prepare("DELETE FROM sessions WHERE hash = ?")
      .run(sessionHash(tokenFrom(req.headers.cookie)));
    res.clearCookie(cookie, cookieOptions);
    res.status(204).end();
  });
  app.put("/api/admin/prices", (req, res, next) => {
    try {
      res.json(store.save(req.body));
    } catch (error) {
      if (error instanceof Error && error.message === "conflict") {
        res
          .status(409)
          .json({
            message:
              "Ціни вже змінено в іншій вкладці. Завантаж актуальний прайс перед редагуванням.",
          });
      } else if (error instanceof Error && error.message === "validation") {
        res
          .status(400)
          .json({
            message:
              "Перевір ціни. Приклад: 550 грн або 50/70 грн; сума від 1 до 100 000.",
          });
      } else next(error);
    }
  });
  registerGallery(app, store.db, options.directory);
  registerContacts(app, store.db);
  app.use("/api", (_req, res) =>
    res.status(404).json({ message: "Сторінку не знайдено." }),
  );
  if (options.staticDirectory) {
    app.use(
      "/assets",
      express.static(join(options.staticDirectory, "assets"), {
        immutable: true,
        maxAge: "1y",
      }),
    );
    app.use(
      express.static(options.staticDirectory, { maxAge: "1h", index: false }),
    );
    app.get(["/", "/admin", "/admin/"], (_req, res) => {
      res.set("Cache-Control", "no-cache");
      res.sendFile(join(options.staticDirectory!, "index.html"));
    });
  }
  const onError: ErrorRequestHandler = (error, _req, res, _next) => {
    const status =
      error.status === 413 ? 413 : error instanceof SyntaxError ? 400 : 500;
    res
      .status(status)
      .json({
        message:
          status === 500
            ? "Не вдалося зберегти зміни. Спробуй ще раз."
            : "Некоректний запит.",
      });
  };
  app.use(onError);
  return { app, store };
}
