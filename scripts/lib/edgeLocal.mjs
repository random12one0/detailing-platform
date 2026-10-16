// RUN THIS CHECKOUT'S EDGE FUNCTIONS IN NODE, AGAINST THE REAL DATABASE —
// so a change to `supabase/functions/` can be proven BEFORE it is published.
//
// There is no Deno and no Docker on this machine, and deploying is Andrew's,
// so until this existed a function edit could only be read, never run. Node 24
// strips TypeScript types natively; what is left is three import specifiers
// Node does not know and the two Deno globals the functions touch.
//
//   const edge = await startEdge(["cancel-booking", "update-booking"]);
//   fetch(`${edge.url}/functions/v1/cancel-booking`, …)   // same paths as Supabase
//   await edge.close();
//
// `loadEdge(names, env)` returns the handlers WITHOUT a server, for a test that
// must open no socket and read no secret (ROADMAP 97.3): `env` is a plain object
// the functions read instead of `process.env`, and the caller stubs `fetch`.
//
// WHAT IS NOT LOCAL: `send-email`. Functions reach it over HTTP at
// SUPABASE_URL, so mail goes through the DEPLOYED relay — which drops reserved
// domains (`fixture.test`) above the claim and records an `email_sends` row.
// Push is stubbed: `web-push` is replaced by a no-op, so no phone is pinged.
// The service-role key comes from `.env`; every write is a real write.

import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const APP_PKG = pathToFileURL(join(ROOT, "app", "package.json")).href;
const stub = (src) => `data:text/javascript,${encodeURIComponent(src)}`;

let hooked = false;
function hook() {
  if (hooked) return;
  hooked = true;
  registerHooks({
    resolve(spec, ctx, next) {
      if (spec.startsWith("jsr:")) return { url: stub("export {}"), shortCircuit: true };
      if (spec.startsWith("npm:web-push")) {
        return { url: stub("export default { setVapidDetails() {}, async sendNotification() { return {}; } }"), shortCircuit: true };
      }
      if (spec.startsWith("npm:@supabase/supabase-js")) return next("@supabase/supabase-js", { ...ctx, parentURL: APP_PKG });
      return next(spec, ctx);
    },
  });
}

/** Load the named functions; returns name -> handler. `env` replaces process.env when given. */
export async function loadEdge(names, env) {
  hook();
  const handlers = new Map();
  let loading = null;
  globalThis.Deno = {
    // THE DEPLOYED RUNTIME'S `SUPABASE_SERVICE_ROLE_KEY` IS THE NEW-FORMAT
    // `sb_secret_` KEY, NOT THE JWT `.env` holds under that name — measured
    // 2026-10-06: the deployed `send-email` answers 401 to the JWT and 400
    // (past its auth check) to the secret key. Hand the functions what the
    // runtime hands them, or every email silently fails to relay.
    env: { get: env ? (k) => env[k] : (k) => (k === "SUPABASE_SERVICE_ROLE_KEY" && process.env.SUPABASE_SECRET_KEY) || process.env[k] },
    serve: (h) => { handlers.set(loading, typeof h === "function" ? h : h.handler); },
  };
  for (const name of names) {
    loading = name;
    await import(pathToFileURL(join(ROOT, "supabase", "functions", name, "index.ts")).href);
    if (!handlers.has(name)) throw new Error(`${name} never called Deno.serve`);
  }
  return handlers;
}

/** Load the named functions from this checkout and serve them on a free port. */
export async function startEdge(names) {
  const handlers = await loadEdge(names);
  const { createServer } = await import("node:http"); // here, so loadEdge's callers never load a server
  const server = createServer(async (req, res) => {
    const name = (req.url.match(/^\/functions\/v1\/([a-z0-9-]+)/) || [])[1];
    const h = handlers.get(name);
    if (!h) { res.writeHead(404).end(); return; }
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const request = new Request(`http://localhost${req.url}`, {
      method: req.method,
      headers: req.headers,
      body: ["GET", "HEAD"].includes(req.method) ? undefined : Buffer.concat(chunks),
    });
    const out = await h(request);
    res.writeHead(out.status, Object.fromEntries(out.headers));
    res.end(Buffer.from(await out.arrayBuffer()));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((r) => server.close(r)),
  };
}
