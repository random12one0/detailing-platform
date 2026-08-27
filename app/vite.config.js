import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// SMOKE_PROXY_TARGET is test scaffolding only: the headless-browser smoke
// test runs in a sandbox whose egress proxy Chromium can't use, so the built
// app is pointed at http://localhost:4173/sbp and vite preview forwards to
// the real Supabase URL from Node (which can reach it). Unset in normal use.
const smokeTarget = process.env.SMOKE_PROXY_TARGET;

export default defineConfig({
  plugins: [react()],
  preview: smokeTarget
    ? {
      proxy: {
        "/sbp": {
          target: smokeTarget,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/sbp/, ""),
        },
      },
    }
    : undefined,
});
