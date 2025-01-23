import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import env from "./src/config/env.config";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    https: env.USE_HTTPS
      ? {
          key: fs.readFileSync(path.resolve(__dirname, "./cert/cert.key")),
          cert: fs.readFileSync(path.resolve(__dirname, "./cert/cert.crt")),
        }
      : false,
    host: "localhost",
    port: 3000,
  },
  define: { "process.env": env },
  // envDir: ".env",
});
// # For HTTPS: run this command
// USE_HTTPS=true npm run dev

// # For HTTP: run this command
// npm run dev
