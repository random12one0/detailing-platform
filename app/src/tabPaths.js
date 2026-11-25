// Split out of App.jsx so main.jsx can build the five /app/<tab> routes
// without importing the whole dashboard into the marketing bundle.
export const TAB_PATHS = ["today", "calendar", "money", "clients", "business"];
