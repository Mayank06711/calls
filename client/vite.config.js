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
  
  const isLanMode = mode === 'lan';
  const backendTarget = isLanMode ? 'http://127.0.0.1:5005' : 'https://knowyourfashion.in';

  // Build proxy config
  const proxy = {
    "/api": {
      target: backendTarget,
      changeOrigin: true,
      secure: false,
    },
  };

  // In LAN mode, also proxy Socket.IO through Vite (avoids mixed-content / cert issues)
  if (isLanMode) {
    proxy["/socket.io"] = {
      target: backendTarget,
      changeOrigin: true,
      secure: false,
      ws: true,
    };
  }

  return {
    plugins: [react()],
    server: {
      proxy,
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