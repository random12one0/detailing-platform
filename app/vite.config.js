import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// SMOKE_PROXY_TARGET is test scaffolding only: the headless-browser smoke
// test runs in a sandbox whose egress proxy Chromium can't use, so the built
// app is pointed at http://localhost:4173/sbp and vite preview forwards to
// the real Supabase URL from Node (which can reach it). Unset in normal use.
const smokeTarget = process.env.SMOKE_PROXY_TARGET;

// THE EXAMPLE SITES NEED A DIRECTORY INDEX IN DEV, AND VITE HAS NONE.
// `scripts/build-examples.mjs` writes `public/ex1/index.html`, so the dev
// server serves `/ex1/index.html` and `/ex1/work.html` but NOT `/ex1` — that
// path matches no file, hits the SPA history fallback, and draws the app
// shell. Production is already right: the same script prepends slashless
// rewrites to `_redirects` for the built site.
//
// So this is the DEV half of a rule that already exists for the deploy, and it
// is deliberately narrow — it only ever rewrites a path that resolves to a
// real file under `public/`, and it runs before Vite's fallback.
const exampleIndex = {
  name: "example-directory-index",
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      const m = /^\/((?:ex|example)\d+|examples)\/?(\?.*)?$/.exec(req.url || "");
      if (m) req.url = `/${m[1]}/index.html${m[2] || ""}`;
      next();
    });
  },
};

export default defineConfig({
  plugins: [react(), exampleIndex],
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
