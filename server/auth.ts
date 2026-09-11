import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface Credentials {
  salt: string;
  hash: string;
}

export function initializeCredentials(directory: string) {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const file = join(directory, "auth.json");
  if (existsSync(file)) return;
  const password = randomBytes(18).toString("base64url");
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  writeFileSync(file, JSON.stringify({ salt, hash }), {
    flag: "wx",
    mode: 0o600,
  });
  writeFileSync(
    join(directory, "admin-access.txt"),
    `Beauty Space Victoriya\nAdmin: /admin\nPassword: ${password}\n\nKeep this file private. You can remove it after saving the password in your password manager.\n`,
    { flag: "wx", mode: 0o600 },
  );
}

export function readCredentials(directory: string): Credentials {
  return JSON.parse(readFileSync(join(directory, "auth.json"), "utf8"));
}

export function verifyPassword(password: string, credentials: Credentials) {
  const actual = scryptSync(password, credentials.salt, 64);
  return timingSafeEqual(actual, Buffer.from(credentials.hash, "hex"));
}

export const sessionHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
