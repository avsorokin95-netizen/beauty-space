import { resolve, join } from "node:path";
import { initializeCredentials } from "./auth.ts";
const directory = resolve(process.env.DATA_DIR || ".data");
initializeCredentials(directory);
console.log(
  `Admin credentials: ${join(directory, "admin-access.txt")}. Existing credentials are never replaced.`,
);
