// STYLE FAMILIES v1 (STUDIO-SPEC.md §4b.4, §4c; R-CRAFT §3). A family is a whole look, not a colour swap: its own
// type pairing, colour system, corner shape, hero layout (a section variant in spec.js) and section order, plus the
// CSS under `.site[data-family="<key>"]` in site.css. The Studio's direction makers start from one of these and
// write the wording; they cannot change a binding, so every family shows the same live dashboard facts.
// Pure data: the Studio reads it through the platform copy, the renderer through the spec's tokens.
//
// The four are chosen to be far apart on every axis the distinctness check compares (hero layout, type pairing,
// section order) and on the ones it cannot (light or dark, round or square, photo-led or fact-led), and away from the
// current AI tells (cream + serif + clay, black + neon, three equal cards, eyebrows over every heading).
export const FAMILIES = {
  showroom: {
    name: "Showroom",
    line: "Dark and cinematic: one big photo, the headline set huge across it, copper for the one thing to press.",
    fonts: ["Big Shoulders Display", "Figtree"],
    hero: "overlay",
    order: ["hero", "proof", "catalog", "visit", "booking"],
    tokens: { family: "showroom", font_display: "Big Shoulders Display", font_body: "Figtree",
      paper: "#0d0f0e", paper_2: "#171a19", ink: "#eee9e0", soft: "#a9aea8", accent: "#e07a3f", on_accent: "#170902", radius: 2 },
  },
  neighbourhood: {
    name: "Neighbourhood",
    line: "Bright and friendly: sky and sunflower, rounded white cards, the words first and the photo held like a snapshot.",
    fonts: ["Changa One", "Figtree"],
    hero: "stack",
    order: ["hero", "proof", "catalog", "booking", "visit"],
    tokens: { family: "neighbourhood", font_display: "Changa One", font_body: "Figtree",
      paper: "#e7f1f7", paper_2: "#ffffff", ink: "#13284a", soft: "#475a78", accent: "#f5c542", on_accent: "#13284a", radius: 18 },
  },
  workshop: {
    name: "Precision workshop",
    line: "Facts first: porcelain and graphite with cobalt rules, every price on the first screen like a spec sheet.",
    fonts: ["Barlow Condensed", "Source Sans 3"],
    hero: "ledger",
    order: ["hero", "proof", "booking", "catalog", "visit"],
    tokens: { family: "workshop", font_display: "Barlow Condensed", font_body: "Source Sans 3",
      paper: "#f1f2f0", paper_2: "#ffffff", ink: "#1b1f23", soft: "#545c64", accent: "#2350d8", on_accent: "#ffffff", radius: 0 },
  },
  boutique: {
    name: "Boutique",
    line: "Quiet and editorial: petrol on a cool white, a soft serif, a tall framed photo and room to breathe.",
    fonts: ["Fraunces", "Public Sans"],
    hero: "split",
    order: ["hero", "proof", "visit", "catalog", "booking"],
    tokens: { family: "boutique", font_display: "Fraunces", font_body: "Public Sans",
      paper: "#f3f4f2", paper_2: "#e6eae8", ink: "#0f3133", soft: "#4c6162", accent: "#0f3133", on_accent: "#f3f4f2", radius: 4 },
  },
};
