// LAUNCH DAY PREFLIGHT (GitHub issues #6 and #10). READ-ONLY: changes nothing, prints no secret.
//
//   node scripts/go-live-check.mjs [--owner-email=<real owner address>]
//
// Exit 0 only when every item passes. Plain-English checklist; see docs/GO-LIVE.md.
// Takes a minute: it runs deployed-inventory and migration-drift, which read the whole server.

import { loadEnv, runChecks, printChecks } from "./lib/goLive.mjs";

loadEnv();
const owner = (process.argv.find((a) => a.startsWith("--owner-email=")) || "").split("=").slice(1).join("=");
const rows = await runChecks({ ownerEmail: owner });
printChecks(rows);
process.exit(rows.every((r) => r.status === "PASS") ? 0 : 1);
