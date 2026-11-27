export function websiteAnswers(a, edited = {}) {
  const map = {
    oldsite: a.website,
    A1: a.name,
    A2: a.about_copy,
    A4: a.service_area,
    G1: a.contact_phone,
    H7: a.tagline,
    H5: a.primary_color ? [a.primary_color] : undefined,
    D5: a.credentials
      ?.map((c) => c.label)
      .filter(Boolean)
      .join(", "),
  };
  return {
    ...Object.fromEntries(
      Object.entries(map).filter(([, v]) => v != null && v !== ""),
    ),
    ...edited,
  };
}
