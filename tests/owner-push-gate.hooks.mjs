// Tests/owner-push-gate loader hooks — ROADMAP 97.33.
//
// Node cannot resolve the edge runtime's module kinds, so three specifiers
// are redirected to `owner-push-gate.stubs.mjs` (imported by the test too, so
// one instance serves both sides): the push network (`npm:web-push@3`), the
// database client (`./db.ts` anywhere under supabase/functions), and the
// edge-runtime type import (`jsr:`, satisfied with an empty module — it
// carries types only). Every other import loads the real file. Registered
// with `module.register` before the real modules are imported.

const STUBS = new URL("./owner-push-gate.stubs.mjs", import.meta.url).href;
const EMPTY = "data:text/javascript,export default 0;";

export async function resolve(specifier, context, next) {
  if (specifier === "npm:web-push@3") return { url: STUBS, shortCircuit: true };
  if ((specifier === "./db.ts" || specifier.endsWith("/_shared/db.ts")) && context.parentURL.includes("/supabase/functions/")) {
    return { url: STUBS, shortCircuit: true };
  }
  if (specifier.startsWith("jsr:")) return { url: EMPTY, shortCircuit: true };
  return next(specifier, context);
}
