// The Website Studio and the site Audit on one localhost page.   node tools/studio-audit/server.mjs   (PORT=5300 by default)
// Replaces the retired Control Room: it mounts the same two modules the Control Room did, with nothing else around them.
import http from "node:http";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createStudio } from "./studio.mjs";
import { createAudit } from "./audit.mjs";
import { TOOL_DIR, REPO_ROOT } from "./paths.mjs";

const PORT = Number(process.env.PORT || 5300), HOST = "127.0.0.1";
const log = (m) => console.log(`  ${m}`);

const json = (res, code, obj) => { res.writeHead(code, { "content-type": "application/json", "cache-control": "no-store" }); res.end(JSON.stringify(obj)); };
const body = (req, res, limit, fn) => {
  let raw = "";
  req.on("data", (c) => { raw += c; if (raw.length > limit) req.destroy(); });
  req.on("end", () => { let b = {}; try { b = raw ? JSON.parse(raw) : {}; } catch { return json(res, 400, { error: "bad json" }); } fn(b); });
};

const STUDIO = createStudio({ HERE: TOOL_DIR, port: PORT, json, body, log });
const AUDIT = createAudit({ HERE: TOOL_DIR, C: { repo: REPO_ROOT }, json, body, log });
STUDIO.startNightly?.();

const FILES = { "/": ["index.html", "text/html; charset=utf-8"], "/base.css": ["base.css", "text/css; charset=utf-8"] };
const local = new Set([`127.0.0.1:${PORT}`, `localhost:${PORT}`]);

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  // This page can run AI work and publish sites: answer only this computer's own address, and only writes that come from this page.
  if (!local.has(String(req.headers.host))) return json(res, 403, { ok: false, said: "Open this page at http://127.0.0.1:" + PORT });
  if (req.method === "POST" && req.headers.origin && !local.has(new URL(req.headers.origin).host)) return json(res, 403, { ok: false, said: "Not from this page." });
  const f = FILES[url.pathname];
  if (f) { res.writeHead(200, { "content-type": f[1], "cache-control": "no-store" }); return res.end(readFileSync(path.join(TOOL_DIR, f[0]))); }
  if ((url.pathname.startsWith("/api/audit") || url.pathname.startsWith("/audit/")) && AUDIT.handle(req, res, url)) return;
  if ((url.pathname.startsWith("/api/studio/") || url.pathname.startsWith("/studio/")) && STUDIO.handle(req, res, url)) return;
  json(res, 404, { ok: false });
});
server.listen(PORT, HOST, () => console.log(`Studio and Audit: http://${HOST}:${PORT}/`));
