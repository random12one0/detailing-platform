// Read-only census and brief validation. No credentials, services or model calls.
// Run: node scripts/supervision-2026-10-22-record.mjs
// --break=brief removes the new instruction in memory; must exit 1.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import * as L from '../../belt/lib.mjs';

const text = readFileSync('ROADMAP.md', 'utf8');
const tally = L.tally(text);
const independent = { open: (text.match(/^- \[ \] /gm) || []).length, done: (text.match(/^- \[[xX]\] /gm) || []).length };
assert.ok(independent.open > 100 && independent.done > 100, 'census has a population');
assert.equal(tally.open, independent.open); assert.equal(tally.done, independent.done);
const belt = JSON.parse(readFileSync('../belt/belt.config.json', 'utf8'));
const staging = JSON.parse(readFileSync('../belt-staging/belt.config.json', 'utf8'));
const bullet = belt.taskTemplate.split('\n').find(x => x.startsWith('- **Keep executable browser'));
assert.equal(bullet, staging.taskTemplate.split('\n').find(x => x.startsWith('- **Keep executable browser')), 'the added paragraph matches in live and staging');
const seesRule = text => text.includes('must not launch browsers or other programs') && text.includes('scripts/<name>.mjs proof') && text.includes('preserve its permission, audit and cleanup assertions');
assert.ok(bullet && seesRule(bullet), 'the actual added paragraph carries all three protections');
assert.equal(seesRule(''), false, 'missing-rule canary is caught');
const broken = process.argv.includes('--break=brief');
assert.ok(seesRule(broken ? belt.taskTemplate.replace(bullet, '') : belt.taskTemplate), 'brief still carries execution placement and existing protections');

const root = '.manager-shots/supervision-2026-10-22-sale';
if (!broken) {
  mkdirSync(root, { recursive: true });
  // Retain this pass separately from the earlier supervision's artifact paths.
  for (const name of ['result.json', 'zero-390.png', 'zero-392.png', 'zero-1440.png', 'saved-768.png']) {
    copyFileSync('.manager-shots/supervision-2026-10-21-sale/' + name, root + '/' + name);
  }
  for (const [kind, source, expected, failures] of [
    ['sale', '.manager-shots/supervision-2026-10-21-sale', 60, 0],
    ['sale-sabotage', '.manager-shots/supervision-2026-10-21-sale-sabotage', 60, 18],
    ['legal', '.manager-shots/supervision-2026-10-22-legal', 96, 0],
    ['legal-sabotage', '.manager-shots/supervision-2026-10-22-legal-sabotage', 96, 16],
    ['legal-checker', '.manager-shots/supervision-2026-10-22-legal-checker', 2, 0],
  ]) {
    const receipt = JSON.parse(readFileSync(source + '/result.json', 'utf8'));
    assert.equal(receipt.expected, expected); assert.equal(receipt.discovered, expected);
    assert.equal(receipt.results.filter(x => !x.ok).length, failures, kind + ' ordinary findings');
    copyFileSync(source + '/result.json', `receipts/supervision-2026-10-22-${kind}.json`);
  }
}
const result = { at: new Date().toISOString(), git_sha: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  command: 'node scripts/supervision-2026-10-22-record.mjs', tally, independent,
  last_supervision: new Date(JSON.parse(readFileSync('../belt/state.json', 'utf8')).lastSupervisedAt).toISOString(),
  added_paragraph_identical: true, full_brief_identical: belt.taskTemplate === staging.taskTemplate, missing_rule_canary_caught: true,
  staging_commit: execFileSync('git', ['-C', '../belt-staging', 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  scope: 'taskTemplate paragraph only; no picking, model, gate, cadence or risky-stop logic changed' };
writeFileSync('receipts/supervision-2026-10-22-census.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
