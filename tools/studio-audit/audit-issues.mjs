// A confirmed audit finding becomes a GitHub issue (replaces the belt's audit-roadmap.mjs, which wrote ROADMAP.md).
// The issue body is the finding's own report; the finding is then marked "sent" with the issue number kept in roadmap_id.
import { execFile } from "node:child_process";

const one = (s) => String(s || "").replace(/\s+/g, " ").trim();

export function issueBody(f, { run, evidence = [] }) {
  const sc = f.second_check || {};
  const rows = [
    ["Severity", f.severity], ["Category", f.category], ["Area", (f.areas || []).join(", ")],
    ["Where", (f.files || []).map((x) => `\`${x}\``).join(", ")],
    ["Supposed to", f.intended], ["What the code does", f.implemented], ["What happens", f.observed], ["Fix", f.recommendation],
    ["Reproduce", f.repro], ["Impact", f.impact], ["Benefit", f.benefit], ["Effort", f.effort], ["Risk of fixing", f.risk], ["Confidence", f.confidence],
    ["Second check", sc.verdict ? `${sc.verdict} by ${sc.by}${sc.why ? ": " + one(sc.why) : ""}` : ""],
  ].filter(([, v]) => v).map(([k, v]) => `- **${k}:** ${one(v)}`);
  const ev = evidence.map((e) => `- ${e.kind}: \`${e.ref}\`${e.detail ? " - " + one(e.detail).slice(0, 300) : ""}`);
  return `From the site audit (finding ${f.id}, run ${run?.n ?? "?"}, commit \`${run?.git_sha || "?"}\`, found by ${f.finder_role || "?"} / ${f.finder_model || "?"}).\n\n`
    + rows.join("\n") + (ev.length ? `\n\n**Evidence**\n${ev.join("\n")}` : "") + "\n";
}

// `gh issue create` in the repo; the issue URL comes back on stdout.
const gh = (repo, args, input) => new Promise((resolve, reject) => {
  const c = execFile("gh", args, { cwd: repo, windowsHide: true, timeout: 60000 }, (e, out, err) => e ? reject(new Error(String(err || e.message).trim())) : resolve(out.trim()));
  c.stdin.end(input || "");
});

export async function sendToIssue(store, finding, { repo, run = store.run(finding.run_id), run_gh = gh } = {}) {
  const title = `Audit ${finding.id}: ${one(finding.title)}`.slice(0, 200);
  const body = issueBody(finding, { run, evidence: store.evidenceFor(finding.id) });
  const url = (await run_gh(repo, ["issue", "create", "--title", title, "--body-file", "-"], body)).split(/\s+/).pop();
  const id = (url.match(/\/(\d+)$/) || [])[1] ? `#${url.match(/\/(\d+)$/)[1]}` : url;
  store.setFinding(finding.id, { status: "sent", roadmap_id: id });
  return { ok: true, said: `GitHub issue ${id} created.`, id, url };
}
