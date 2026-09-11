import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const proxy = {
  "/api": { target: `http://127.0.0.1:${process.env.API_PORT || 3001}` },
};
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "127.0.0.1",
    proxy,
    fs: {
      deny: [
        "**/.env*",
        "**/.git/**",
        "**/*.{crt,pem}",
        "**/.data/**",
        "**/.test-data/**",
        "**/auth.json",
        "**/owner-auth.json",
        "**/admin-access.txt",
        "**/*.sqlite*",
      ],
    },
  },
  preview: { proxy },
});
