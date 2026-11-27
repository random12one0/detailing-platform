export const providerNames = {
  openai: "OpenAI",
  anthropic: "Claude",
  gemini: "Gemini",
};
// These are format hints only. Ambiguous / generic keys require a manual choice.
export function keyHint(raw) {
  const k = raw.trim();
  if (k.startsWith("sk-ant-")) return "anthropic";
  if (/^sk-(proj|svcacct)-/.test(k)) return "openai";
  if (/^AIza[\w-]{20,}$/.test(k)) return "gemini";
  return "";
}
