// These are the existing field IDs in SiteIntake. Unknowns stay blank.
export const websiteFields = {
  website: "oldsite", name: "A1", about_copy: "A2", service_area: "A4",
  contact_phone: "G1", tagline: "H7", primary_color: "H5", credentials: "D5",
};

export function websiteAnswers(shop, edited = {}) {
  const answers = { ...edited };
  for (const [key, id] of Object.entries(websiteFields)) {
    if (Object.hasOwn(edited, id) || edited[id + "::web"]) continue;
    const value = shop[key];
    if (value == null || value === "") continue;
    const mapped = key === "credentials" ? value.map(c => c.label).filter(Boolean).join(", ") :
      key === "primary_color" ? [value] : value;
    if (mapped === "") continue;
    answers[id] = mapped;
    answers[id + "::from"] = true;
  }
  return answers;
}

// SiteIntake clears ::from when the owner touches a field, even if the text is identical.
// Keep these overrides, including a deliberate blank. Inherited fields follow the next saved shop draft.
export function websiteEdits(next) {
  return Object.fromEntries(Object.entries(next).filter(([key]) =>
    !key.endsWith("::from") && next[key + "::from"] !== true
  ));
}
