import { readFileSync } from 'node:fs';
export const rubric = JSON.parse(readFileSync(new URL('./site-rubrics/polished.json', import.meta.url)));
const plain = v => v && typeof v === 'object' && !Array.isArray(v);
const exact = (v, keys) => plain(v) && Object.keys(v).length === keys.length && keys.every(k => k in v);
const questions = Array.from({length:12}, (_, i) => `Q${i + 1}`);
export function validateCritic(value) {
  const v = typeof value === 'string' ? JSON.parse(value) : value;
  if (!plain(v) || Object.keys(v).some(k => !['items','pay','model'].includes(k)) ||
      !exact(v.items, Object.keys(rubric.items)) || !exact(v.pay, questions)) throw Error('Malformed critic contract');
  const answer = x => {
    if (!exact(x, ['answer','evidence']) || !['yes','no'].includes(x.answer) ||
        typeof x.evidence !== 'string' || !x.evidence.trim()) throw Error('Missing binary answer/evidence');
  };
  for (const [group, keys] of Object.entries(rubric.items)) {
    if (!exact(v.items[group], keys)) throw Error(`Malformed ${group} items`);
    keys.forEach(k => answer(v.items[group][k]));
  }
  questions.forEach(k => answer(v.pay[k]));
  return v;
}
export function scoreCritic(value) {
  const v = validateCritic(value);
  return Object.entries(rubric.items).reduce((n, [group, keys]) =>
    n + rubric.weights[group] * keys.filter(k => v.items[group][k].answer === 'yes').length / keys.length, 0);
}
export function grade({gates = {}, critics = []} = {}) {
  const failures = [], scores = [];
  for (const key of rubric.gates) {
    const g = gates[key];
    if (g?.pass !== true || !plain(g.measures) || !Array.isArray(g.failures) || g.failures.length)
      failures.push({gate:key, selector:null, detail:'Missing, failed or unevidenced gate'});
  }
  if (critics.length !== 2 || new Set(critics.map(c => c.model)).size !== 2 ||
      !critics.some(c => c.model === 'claude') || !critics.some(c => c.model === 'codex'))
    failures.push({gate:'critics', selector:null, detail:'Both independent critic families required'});
  for (const critic of critics) {
    try {
      const c = validateCritic(critic), normalized = Object.fromEntries(questions.map(k =>
        [k, c.pay[k].answer === (k === 'Q9' ? 'no' : 'yes')]));
      const passes = Object.values(normalized).filter(Boolean).length;
      const critical = rubric.critical.filter(k => !normalized[k]);
      const score = scoreCritic(c);
      scores.push({model:c.model, score, passes, normalized, critical});
      if (passes < rubric.payMinimum || critical.length) failures.push({gate:'pay', selector:null, model:c.model, detail:{passes,critical}});
      // Each critic's weighted design score must reach the rubric's pass mark on its own.
      if (!(score >= rubric.scoreMinimum)) failures.push({gate:'score', selector:null, model:c.model, detail:{score, minimum:rubric.scoreMinimum}});
    } catch (e) { failures.push({gate:'critics', selector:null, detail:e.message}); }
  }
  return {pass:!failures.length, verdict:failures.length ? 'fail' : 'pass', scores, failures};
}
// The renderer supplies this explicit source contract; absence never earns a pass.
export function contractGate(c) {
  const failures = [], check = (ok, detail) => { if (!ok) failures.push({selector:'#site-contract',detail}); };
  check(c?.schemaVersion === 1 && c?.tier === 'polished', 'Invalid site schema/tier');
  check(Array.isArray(c?.sections) && c.sections.length >= 10 && c.sections.length <= 14 &&
    c.sections.every(s => typeof s === 'string') && new Set(c.sections).size === c.sections.length, 'Contract requires 10–14 distinct sections');
  check(Array.isArray(c?.required) && c.required.length > 0 && c.required.every(s => c.sections?.includes(s)), 'Missing contract coverage');
  check(Array.isArray(c?.bindings) && c.bindings.length > 0 && c.bindings.every(b =>
    typeof b.selector === 'string' && b.selector && typeof b.from === 'string' && b.from), 'Missing figure bindings');
  check(Array.isArray(c?.prose) && c.prose.length > 0 && c.prose.every(s => typeof s === 'string' && !/\d/.test(s)), 'Digits in unbound prose');
  check(Array.isArray(c?.avoidedSkeletons) && c.avoidedSkeletons.length >= 3 &&
    typeof c?.signature === 'string' && c.signature.trim(), 'Missing distinctness evidence');
  check(c?.limits && ['gzipJs','transfer','hero','fontFamilies','fontWeights'].every(k =>
    Number.isFinite(c.limits[k]) && c.limits[k] >= 0 && c.limits[k] <= rubric.ceilings[k]), 'Missing or exceeded tier limits');
  return {pass:!failures.length, measures:{contract:c ?? null}, failures};
}
