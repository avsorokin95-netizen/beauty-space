import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, rmSync } from "node:fs";
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

export function readAccessCredentials(directory: string) {
  const admin = readCredentials(directory);
  const ownerFile = join(directory, "owner-auth.json");
  const owner: Credentials | null = existsSync(ownerFile)
    ? JSON.parse(readFileSync(ownerFile, "utf8")) : null;
  return { admin, owner, generation: sessionHash(admin.hash + (owner?.hash ?? "")) };
}

export function verifyAccessPassword(password: string, credentials: ReturnType<typeof readAccessCredentials>) {
  const adminMatches = verifyPassword(password, credentials.admin);
  const ownerMatches = credentials.owner ? verifyPassword(password, credentials.owner) : false;
  return adminMatches || ownerMatches;
}

export function replacePassword(directory: string, password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  const temporary = join(directory, `auth-${randomBytes(12).toString("hex")}.tmp`);
  try {
    writeFileSync(temporary, JSON.stringify({ salt, hash }), { flag: "wx", mode: 0o600 });
    // The bootstrap password becomes obsolete; never write the new password in plaintext.
    rmSync(join(directory, "admin-access.txt"), { force: true });
    renameSync(temporary, join(directory, "auth.json"));
  } finally {
    rmSync(temporary, { force: true });
  }
}

export function verifyPassword(password: string, credentials: Credentials) {
  const actual = scryptSync(password, credentials.salt, 64);
  return timingSafeEqual(actual, Buffer.from(credentials.hash, "hex"));
}

export const sessionHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
