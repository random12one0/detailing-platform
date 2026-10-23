// ROADMAP 101.5 — THE MONEY SCREENS SPEAK ONE LANGUAGE (audit R2-08).
//
// Your subscription, its Cancel box, How you get paid and Money printed
// English sentences on a Spanish dashboard: bare JSX text, a raw "Saved." and
// database error, `period.label` ("All time") never passed through `t()`, and
// Billing's promo and build-fee lines glued from English fragments
// (", and ", "off today", "build.") Spanish cannot reorder.
// `i18n-fragments.mjs` and `i18n-survey.mjs` both read these files as clean —
// multi-line JSX text and text BEFORE a `{hole}` are outside what they match —
// so this parses the files instead of pattern-matching them.
//
//   node --test tests/money-screens-spanish.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.join(ROOT, "app/package.json"));
const { parse } = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const { appEs } = await import(pathToFileURL(path.join(ROOT, "app/src/lib/strings/appEs.js")).href);

const FILES = ["app/src/screens/more/Billing.jsx", "app/src/screens/more/Payments.jsx", "app/src/screens/Money.jsx"];
const FRAGMENTS = new Set(["build.", "off today", ", and ", "every month after", "every year after"]);
const holes = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");

const found = { english: [], keys: [] };
for (const f of FILES) {
  const ast = parse(readFileSync(path.join(ROOT, f), "utf8"), { sourceType: "module", plugins: ["jsx"] });
  const at = (n) => `${path.basename(f)}:${n.loc.start.line}`;
  traverse(ast, {
    JSXText(p) {
      const v = p.node.value.replace(/\s+/g, " ").trim();
      if (/[A-Za-z]{2,}/.test(v)) found.english.push(`${at(p.node)} text "${v.slice(0, 50)}"`);
    },
    ObjectProperty(p) {
      // A message object's `text` is drawn as-is: a literal or a raw error is English.
      if (p.node.key.name !== "text") return;
      const v = p.node.value;
      if (v.type === "StringLiteral" || (v.type === "MemberExpression" && v.property.name === "message"))
        found.english.push(`${at(v)} message text not through t()`);
    },
    MemberExpression(p) {
      // `period.label` is "All time" in English for the lifetime period.
      const n = p.node;
      if (n.object.name !== "period" || n.property.name !== "label") return;
      const call = p.parent.type === "ObjectProperty" && p.parentPath.parentPath.parent;
      const shown = p.parent.type === "JSXExpressionContainer" || call?.callee?.name === "t";
      if (shown) found.english.push(`${at(n)} period.label shown without t()`);
    },
    CallExpression(p) {
      const name = p.node.callee.name;
      if (name !== "t" && name !== "tSentence") return;
      const lits = [];
      const take = (n) => {
        if (!n) return;
        if (n.type === "StringLiteral") lits.push(n);
        else if (n.type === "ConditionalExpression") { take(n.consequent); take(n.alternate); }
      };
      take(p.node.arguments[0]);
      for (const l of lits) found.keys.push({ key: l.value, where: at(l) });
    },
  });
}

test("no English sentence reaches a Spanish dashboard from the money screens", () => {
  assert.deepEqual(found.english, []);
});

test("no sentence is glued from translated fragments", () => {
  assert.deepEqual(found.keys.filter((k) => FRAGMENTS.has(k.key)).map((k) => `${k.where} "${k.key}"`), []);
});

test("every key these screens translate has Spanish with the same placeholders", () => {
  assert.ok(found.keys.length > 50, `only ${found.keys.length} keys found — is the parse still seeing the files?`);
  const bad = found.keys.filter((k) => !appEs[k.key] || holes(appEs[k.key]) !== holes(k.key));
  assert.deepEqual(bad.map((k) => `${k.where} "${k.key}"`), []);
});

test("the lifetime period's label has Spanish", () => {
  assert.ok(appEs["All time"]);
});
