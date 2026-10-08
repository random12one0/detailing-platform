// ROADMAP 14.21 — admin-contrast.mjs MUST TEAR ITS THROWAWAY PLATFORM ADMIN DOWN
// ON EVERY WAY A RUN CAN END.
//
//   node --test tests/admin-contrast-teardown.test.mjs
//
// Credential-free, no browser, no real database: the script is run against a
// tiny fake of the two Supabase endpoints it touches, on 127.0.0.1.
//
// WHAT THIS PROVES (browser-free): `--drop-leftover` finds and removes the
// leftover test account by its address, reads `platform_admins` by EMAIL ONLY
// (never the note column, which has held a password), and leaves every other
// row alone; and the source has the three exits the item asks for.
//
// WHAT IT DOES NOT PROVE, AND THE ITEM IS NOT DONE ON ITS STRENGTH: that a crash
// after sign-in, or a SIGTERM mid-run, leaves the real table unchanged. Those
// need the browser and the demo database, and say so in ROADMAP 14.21. On
// Windows a signal sent to a child is a hard kill, so the signal path could not
// be driven from node here even with a browser.

import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const SRC = readFileSync("scripts/admin-contrast.mjs", "utf8");
const ACCOUNT = readFileSync("scripts/admin-account.mjs", "utf8");
const MINE = "admin-contrast-test@detailplatform.com";  // mail-sink: a login name in a fake backend on 127.0.0.1; nothing here can send

function fakeBackend(users, admins) {
  const log = [];
  const server = createServer((req, res) => {
    const u = new URL(req.url, "http://x");
    log.push(`${req.method} ${u.pathname}${u.search}`);
    const send = (code, body) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };
    if (req.method === "GET" && u.pathname === "/rest/v1/platform_admins") {
      // The real table returns whatever columns are asked for; a request for the
      // note must be visible to the test, so it is answered with it.
      const cols = (u.searchParams.get("select") ?? "*").split(",");
      return send(200, admins.map((a) => Object.fromEntries(cols.map((c) => [c, a[c] ?? null]))));
    }
    if (req.method === "GET" && u.pathname === "/auth/v1/admin/users") return send(200, { users });
    if (req.method === "DELETE" && u.pathname === "/rest/v1/platform_admins") {
      const id = u.searchParams.get("user_id")?.replace("eq.", "");
      const i = admins.findIndex((a) => a.user_id === id); if (i >= 0) admins.splice(i, 1);
      return send(204, {});
    }
    if (req.method === "DELETE" && u.pathname.startsWith("/auth/v1/admin/users/")) {
      const id = u.pathname.split("/").pop();
      const i = users.findIndex((x) => x.id === id); if (i >= 0) users.splice(i, 1);
      return send(200, {});
    }
    send(404, { error: "unexpected " + req.method + " " + u.pathname });
  });
  return new Promise((ok) => server.listen(0, "127.0.0.1", () => ok({ server, log, url: `http://127.0.0.1:${server.address().port}` })));
}

const run = (url, args) => new Promise((ok) => {
  const p = spawn(process.execPath, ["scripts/admin-contrast.mjs", ...args], {
    env: { ...process.env, SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: "fake-key-for-the-fake-backend" },
  });
  let out = "";
  p.stdout.on("data", (d) => (out += d)); p.stderr.on("data", (d) => (out += d));
  p.on("close", (code) => ok({ code, out }));
});

test("ROADMAP 14.21 — the throwaway admin's teardown", async (t) => {
  await t.test("1 · --drop-leftover removes the test account and nothing else, and reads email only", async () => {
    const users = [{ id: "u-demo", email: "demo@detailplatform.com" }, { id: "u-mine", email: MINE }];  // mail-sink: a login name in a fake backend on 127.0.0.1; nothing here can send
    const admins = [
      { user_id: "u-demo", email: "demo@detailplatform.com", note: "SECRET-NOTE-DO-NOT-READ" },
      { user_id: "u-mine", email: MINE, note: "TEST ACCOUNT" },
    ];
    const { server, log, url } = await fakeBackend(users, admins);
    const r = await run(url, ["--drop-leftover"]);
    server.close();
    assert.equal(r.code, 0, r.out);
    assert.deepEqual(users.map((u) => u.email), ["demo@detailplatform.com"]);  // mail-sink: a login name in a fake backend on 127.0.0.1; nothing here can send
    assert.deepEqual(admins.map((a) => a.email), ["demo@detailplatform.com"]);
    assert.match(r.out, /platform_admins now: \["demo@detailplatform.com"\]/);
    assert.doesNotMatch(r.out, /SECRET-NOTE/, "the note column must never be printed");
    assert.ok(log.filter((l) => l.includes("/rest/v1/platform_admins") && l.startsWith("GET")).every((l) => /select=email/.test(l)), "the roster is read by email only");
  });

  await t.test("2 · with no leftover it says so, and touches nothing", async () => {
    const users = [{ id: "u-demo", email: "demo@detailplatform.com" }];  // mail-sink: a login name in a fake backend on 127.0.0.1; nothing here can send
    const admins = [{ user_id: "u-demo", email: "demo@detailplatform.com" }];  // mail-sink: a login name in a fake backend on 127.0.0.1; nothing here can send
    const { server, log, url } = await fakeBackend(users, admins);
    const r = await run(url, ["--drop-leftover"]);
    server.close();
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /no leftover/);
    assert.equal(log.filter((l) => l.startsWith("DELETE")).length, 0);
  });

  await t.test("3 · the three exits exist in the source: finally, crash flag, signal handlers", () => {
    assert.match(SRC, /\} finally \{[\s\S]{0,400}await teardown\(/);
    assert.match(SRC, /--crash-after-signin/);
    assert.match(SRC, /for \(const sig of \["SIGINT", "SIGTERM", "SIGBREAK"\]\)[\s\S]{0,200}await teardown\(sig\)/);
    // the crash flag sits after the tab list is read and BEFORE the screenshots
    const at = SRC.indexOf("process.argv.includes(\"--crash-after-signin\")");
    assert.ok(at > SRC.indexOf("const TABS") && at < SRC.indexOf("await screen(name)"));
  });

  await t.test("4 · no process.exit sits inside the try, where it would skip the finally", () => {
    const inside = SRC.slice(SRC.indexOf("try {\nbrowser ="), SRC.indexOf("} finally {"));
    assert.ok(inside.length > 200, "could not find the try body");
    assert.doesNotMatch(inside, /process\.exit/);
  });

  await t.test("5 · the table is read before and after, and the password is never printed", () => {
    assert.match(SRC, /platform_admins BEFORE/);
    assert.match(SRC, /platform_admins AFTER/);
    assert.match(SRC, /select=email/);
    assert.doesNotMatch(SRC, /select=\*|select=[^`"]*note/);
    assert.doesNotMatch(SRC.replace(/\/\/[^\n]*/g, ""), /console\.(log|error)\([^)]*\bPW\b/);
    assert.match(SRC, /redact\(/);
  });

  await t.test("6 · the account is flagged as a test account, in its address and its note", () => {
    assert.match(SRC, /ADMIN_EMAIL = "admin-contrast-test@/);
    assert.match(ACCOUNT, /note: "TEST ACCOUNT/);
  });

  await t.test("7 · SABOTAGE — each exit removed from a copy of the source is seen", () => {
    const hasFinally = (src) => /\} finally \{[\s\S]{0,400}await teardown\(/.test(src);
    const hasSignals = (src) => /for \(const sig of \["SIGINT", "SIGTERM", "SIGBREAK"\]\)[\s\S]{0,200}await teardown\(sig\)/.test(src);
    const exitInTry = (src) => /process\.exit/.test(src.slice(src.indexOf("try {\nbrowser ="), src.indexOf("} finally {")));
    assert.ok(hasFinally(SRC) && hasSignals(SRC) && !exitInTry(SRC));
    assert.equal(hasFinally(SRC.replace("} finally {", "} finalx {")), false);
    assert.equal(hasSignals(SRC.replace('"SIGTERM"', '"SIGXXX"')), false);
    assert.equal(exitInTry(SRC.replace("crashed = e;", "crashed = e; process.exit(2);")), true);
  });
});
