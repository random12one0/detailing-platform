// 97.50 - "Working out your price..." is a wait, not a refusal. Pressing
// Continue during it (or before tapping a service) must not paint the red
// error box or fire an alert; real refusals still do.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const req = createRequire(new URL("../app/package.json", import.meta.url));
const { build } = req("esbuild");
const out = await build({
  entryPoints: [fileURLToPath(new URL("../app/src/book/Refusal.jsx", import.meta.url))],
  bundle: true, write: false, format: "esm", platform: "node", jsx: "automatic",
  external: ["react", "react/jsx-runtime", "react-dom"], logLevel: "silent",
  nodePaths: [fileURLToPath(new URL("../app/node_modules", import.meta.url))],
});
// The bundle's bare `react` imports resolve from app/node_modules via an absolute path.
const code = out.outputFiles[0].text.replace(/from "(react[^"]*)"/g, (_, m) => `from ${JSON.stringify(req.resolve(m).replace(/\\/g, "/").replace(/^/, "file:///"))}`);
const { default: Refusal } = await import("data:text/javascript;base64," + Buffer.from(code).toString("base64"));
const { createElement } = req("react");
const { renderToStaticMarkup } = req("react-dom/server");
const html = (blocks, tried) => renderToStaticMarkup(createElement(Refusal, { blocks, tried }));

test("a press while the price is worked out stays neutral", () => {
  const h = html(["pricing"], true);
  assert.doesNotMatch(h, /bk-error/, `waiting state painted as an error: ${h}`);
  assert.doesNotMatch(h, /role="alert"/, `waiting state fired an alert: ${h}`);
  assert.match(h, /bk-muted/);
  assert.match(h, /role="status"/, "a press during the wait is still announced");
});

test("a real refusal still goes red and alerts", () => {
  for (const b of [["no-service"], ["no-quote"], ["no-address"]]) {
    const h = html(b, true);
    assert.match(h, /bk-error/, `${b} lost its error style`);
    assert.match(h, /role="alert"/, `${b} lost its alert`);
  }
  assert.doesNotMatch(html(["pricing"], false), /bk-error|role=/, "before any press it is plain grey");
});
