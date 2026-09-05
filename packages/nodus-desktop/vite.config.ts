import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],

  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "lucide-react",
      "@tauri-apps/api",
      "@tauri-apps/api/event",
      "@tauri-apps/api/core",
      "@tauri-apps/plugin-opener"
    ],
  },

  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    warmup: {
      clientFiles: ["./src/main.tsx", "./src/App.tsx", "./src/context/DesktopContext.tsx"],
    },
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));
