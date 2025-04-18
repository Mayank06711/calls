import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    server: {
      proxy:{
        "/api":"https://knowyourfashion.in"
      },
      https: env.USE_HTTPS === 'true'
        ? {
            key: fs.readFileSync(path.resolve(__dirname, "./cert/key.pem")),
            cert: fs.readFileSync(path.resolve(__dirname, "./cert/cert.pem")),
          }
        : false,
      host: "0.0.0.0",
      port: 3000,
    },
    define: {
      'process.env': Object.assign({}, env)
    }
  }
});