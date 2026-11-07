import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

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

// STUDIO S1 — `/site/<slug>` is its own entry (site.html, app/src/site/). Dev and
// `vite preview` both answer it here, before Vite's SPA fallback would hand it the
// dashboard's index.html; production does the same with the `/site/*` rule at the
// top of public/_redirects and netlify.toml.
const siteEntry = () => (req, _res, next) => {
  // S7: /site/p/<link> is the detailer's preview page (dev server only, like /site/preview)
  if (/^\/site\/((example|p)\/)?[^/?]*\/?(\?.*)?$/.test(req.url || "")) req.url = "/site.html";
  next();
};
// STUDIO S3 — the Studio starts its phone-preview dev server with STUDIO_PREVIEW_ID set to a random id, and asks for
// it back here, so it never mistakes another dev server on the same port for its own. Dev server only.
const previewId = (req, res, next) => {
  if (req.url !== "/__studio/preview-id") return next();
  const id = process.env.STUDIO_PREVIEW_ID;
  res.statusCode = id ? 200 : 404;
  res.setHeader("content-type", "text/plain; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(id || "");
};
const siteRoute = {
  name: "studio-site-route",
  configureServer(server) { server.middlewares.use(previewId); server.middlewares.use(siteEntry()); },
  configurePreviewServer(server) { server.middlewares.use(siteEntry()); },
};

// THE SITE IS A SECOND BUILD, NOT A SECOND INPUT OF THIS ONE (S1 review B1).
// Two inputs in one build make Rollup split the booking code both pages import
// into a shared chunk, so the dashboard stops being the ONE `assets/index-*.js`
// that live-bundle-switches, live-card-claim, live-setup-counts and
// photo-release-order read off the published site. `vite build` is therefore
// the dashboard exactly as before; `vite build --mode site` adds site.html and
// its own assets to the same dist/ without emptying it (see package.json).
export default defineConfig(({ mode }) => ({
  plugins: [react(), exampleIndex, siteRoute],
  build: mode === "site"
    ? { emptyOutDir: false, copyPublicDir: false, rollupOptions: { input: { site: fileURLToPath(new URL("./site.html", import.meta.url)) } } }
    : undefined,
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
}));
