// ROADMAP 97.57: PNG icons at 192/512 and a 180px apple-touch-icon exist,
// are listed in the manifest and the head, and are the size they claim.
// Vite copies app/public into the build verbatim, so a file here is a URL there.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const APP = join(import.meta.dirname, "..", "app");
const PUB = join(APP, "public");
const manifest = JSON.parse(readFileSync(join(PUB, "manifest.webmanifest"), "utf8"));
const html = readFileSync(join(APP, "index.html"), "utf8");

// PNG width/height live in the IHDR chunk at bytes 16..23.
const pngSize = (file) => {
  const b = readFileSync(join(PUB, file));
  assert.equal(b.toString("latin1", 1, 4), "PNG", `${file} is a PNG`);
  return `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`;
};

for (const [href, size] of [["/icon-192.png", "192x192"], ["/icon-512.png", "512x512"]]) {
  test(`manifest lists ${href} at ${size}`, () => {
    const icon = manifest.icons.find((i) => i.src === href);
    assert.ok(icon, `${href} missing from manifest`);
    assert.equal(icon.sizes, size);
    assert.equal(icon.type, "image/png");
    assert.ok(existsSync(join(PUB, href)), `${href} missing from app/public`);
    assert.equal(pngSize(href), size);
  });
}

test("head declares a 180px apple-touch-icon PNG", () => {
  const m = html.match(/<link rel="apple-touch-icon"[^>]*href="([^"]+)"/);
  assert.ok(m, "no apple-touch-icon link in app/index.html");
  assert.equal(pngSize(m[1]), "180x180");
});
