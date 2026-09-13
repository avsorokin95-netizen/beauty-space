import express, { type ErrorRequestHandler } from "express";
import { rateLimit } from "express-rate-limit";
import { randomBytes } from "node:crypto";
import { join } from "node:path";
import { PricingStore } from "./store.ts";
import { registerGallery } from "./gallery.ts";
import { registerContacts } from "./contacts.ts";
import { registerSeo } from "./seo.ts";
import { readAccessCredentials, replacePassword, sessionHash, verifyAccessPassword } from "./auth.ts";
import { validNewPassword } from "../shared/password.ts";

interface Options {
  directory: string;
  origins: string[];
  production?: boolean;
  staticDirectory?: string;
  publicOrigin?: string;
}

export function createApp(options: Options) {
  const app = express();
  const store = new PricingStore(join(options.directory, "studio.sqlite"));
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
  app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (!req.path.startsWith('/media/')) res.set("X-Robots-Tag", "noindex, nofollow");
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
  app.get("/api/auth/config", (_req, res) => res.json({ mode: "password" }));

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    skipSuccessfulRequests: true,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { message: "Забагато спроб. Спробуй увійти через 15 хвилин." },
  });

  app.post("/api/login", limiter, (req, res) => {
    const credentials = readAccessCredentials(options.directory);
    const password = req.body?.password;
    if (
      typeof password !== "string" ||
      password.length > 256 ||
      !verifyAccessPassword(password, credentials)
    ) {
      res.status(401).json({ message: "Неправильний пароль." });
      return;
    }
    const token = randomBytes(32).toString("base64url");
    store.db
      .prepare("DELETE FROM sessions WHERE expires < ? OR hash = ?")
      .run(Date.now(), sessionHash(tokenFrom(req.headers.cookie)));
    store.db
      .prepare("INSERT INTO sessions (hash, expires, credential_hash) VALUES (?, ?, ?)")
      .run(sessionHash(token), Date.now() + 12 * 60 * 60 * 1000, credentials.generation);
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
        .prepare("SELECT expires, credential_hash FROM sessions WHERE hash = ?")
        .get(sessionHash(token));
    if (!session || Number(session.expires) <= Date.now() || session.credential_hash !== readAccessCredentials(options.directory).generation) {
      res.status(401).json({ message: "Увійди, щоб керувати студією." });
      return;
    }
    next();
  });
  app.get("/api/admin/session", (_req, res) =>
    res.json({ authenticated: true }),
  );
  const passwordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, limit: 10, skipSuccessfulRequests: true,
    standardHeaders: "draft-8", legacyHeaders: false,
    message: { message: "Забагато спроб зміни пароля. Спробуй через 15 хвилин." },
  });
  app.put("/api/admin/password", passwordLimiter, (req, res) => {
    const { currentPassword, newPassword, confirmation } = req.body ?? {};
    if (typeof currentPassword !== "string" || currentPassword.length > 256 || !validNewPassword(newPassword) || confirmation !== newPassword || currentPassword === newPassword) {
      res.status(400).json({ message: "Новий пароль має містити від 12 до 256 символів, відрізнятися від поточного й збігатися з підтвердженням." });
      return;
    }
    if (!verifyAccessPassword(currentPassword, readAccessCredentials(options.directory))) {
      res.status(400).json({ message: "Поточний пароль неправильний." });
      return;
    }
    replacePassword(options.directory, newPassword);
    store.db.exec("DELETE FROM sessions");
    res.clearCookie(cookie, cookieOptions);
    res.status(204).end();
  });
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
    registerSeo(app, store.db, options.staticDirectory, options.publicOrigin);
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
