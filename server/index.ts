import { resolve, join } from "node:path";
import { existsSync } from "node:fs";
import { initializeCredentials } from "./auth.ts";
import { createApp } from "./app.ts";

const directory = resolve(process.env.DATA_DIR || ".data");
const production = process.env.NODE_ENV === "production";
if (
  production &&
  (!process.env.APP_ORIGIN?.startsWith("https://") ||
    !existsSync(join(directory, "auth.json")))
) {
  throw new Error(
    "Production requires an HTTPS APP_ORIGIN and credentials. Run npm run admin:setup first.",
  );
}
if (!production) initializeCredentials(directory);
const origins = production
  ? [new URL(process.env.APP_ORIGIN!).origin]
  : [
      "http://127.0.0.1:5173",
      "http://localhost:5173",
      "http://127.0.0.1:4173",
      "http://localhost:4173",
      "http://127.0.0.1:3001",
    ];
const { app, store } = createApp({
  directory,
  origins,
  production,
  staticDirectory: resolve("dist"),
  publicOrigin: production ? origins[0] : undefined,
});
const server = app.listen(
  Number(process.env.API_PORT || 3001),
  process.env.HOST || "127.0.0.1",
  () => {
    console.log(
      `Beauty API ready. Admin credentials: ${join(directory, "admin-access.txt")}`,
    );
  },
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () =>
    server.close(() => {
      store.db.close();
      process.exit(0);
    }),
  );
