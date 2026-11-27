import { noteKeys, cleanAnswers } from "./setupQuestions.js";
// Only the written shop description crosses the provider boundary. No uploads,
// contacts, account details, links, or structured dashboard records are included.
const permitted = new Set([
  "name",
  ...noteKeys.filter((k) => !["follow_up", "team_notes"].includes(k)),
]);
export function writtenAnswers(answers) {
  return cleanAnswers(
    Object.fromEntries(
      Object.entries(answers).filter(
        ([key, value]) =>
          permitted.has(key) && typeof value === "string" && value.trim(),
      ),
    ),
  );
}
