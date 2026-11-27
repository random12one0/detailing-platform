// In the owner pilot, an uncertain price, duration, or fee policy stays a note for review.
const purchase =
  /\b(?:once|one time|one fee|only once|single surcharge|una vez|una sola vez)\b.*?\b(?:booking|appointment|purchase|visit|order|reserva|cita|compra)\b/i;
const perService =
  /\b(?:per|each|every|por|cada)\s+(?:single\s+)?(?:service|package|servicio|paquete)\b/i;
const flat =
  /same price|no (?:size|extra) (?:fee|charge)|regardless of size|mismo precio|sin recargo/i;
const uncertain =
  /\b(sometimes|maybe|might|depends|case.by.case|a veces|depende)\b/i;
const escape = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function amount(value, unit, quote) {
  const n = escape(Number(value)) + "(?:\\.0+)?(?![\\d.])";
  if (unit === "money")
    return new RegExp(
      "(?:\\$\\s*" + n + "|(?<![\\d.])" + n + "\\s*(?:USD|dollars?|dólares))",
      "i",
    ).test(quote);
  return new RegExp("(?<![\\d.])" + n + "\\s*" + unit, "i").test(quote);
}
function clearNegatedScope(text) {
  return text.replace(
    /\b(?:not|never|no|nunca)\s+(?:(?:charged?|applied|aplica)\s+)?(?:per|for each|each|every|por|cada)\s+(?:service|package|booking|purchase|visit|cita|servicio|compra)\b/gi,
    "",
  );
}
function firstPriceMatches(value, text) {
  const found = text.match(
    /(?:\$\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:USD|dollars?|dólares))/i,
  );
  return !!found && Number(found[1] ?? found[2]) === Number(value);
}
function nearby(label, quote) {
  const start = quote.toLowerCase().indexOf(String(label).toLowerCase());
  if (start < 0) return "";
  return quote.slice(start).split(/(?:[.;\n](?!\d)|,\s*(?=[\p{L}]))/u)[0];
}
export function evidencedDraftValue(key, value, quote, answers) {
  const fees = answers.size_details || "";
  if (key === "size_mode") {
    if (value === "flat") return flat.test(quote);
    const other = value === "purchase" ? perService : purchase;
    const expected = value === "purchase" ? purchase : perService;
    const source = clearNegatedScope(fees || quote);
    return (
      expected.test(clearNegatedScope(quote)) &&
      expected.test(source) &&
      !other.test(source)
    );
  }
  if (key === "vehicle_sizes" && Array.isArray(value))
    return value.every((r) => {
      const clause = nearby(r.label, quote);
      return (
        !!clause &&
        (r.fee == null ||
          (r.fee === 0 && /base|no (?:extra|fee)|sin recargo/i.test(clause)) ||
          firstPriceMatches(r.fee, clause)) &&
        (r.extra_minutes == null ||
          amount(r.extra_minutes, "(?:min|minute|minuto)", clause))
      );
    });
  if (["services", "addons"].includes(key) && Array.isArray(value))
    return value.every((r) => {
      const clause = nearby(r.name, quote);
      return (
        !!clause &&
        (r.price == null || firstPriceMatches(r.price, clause)) &&
        (r.minutes == null ||
          amount(r.minutes, "(?:min|minute|minuto)", clause)) &&
        (!r.size_prices?.length ||
          (!purchase.test(fees) &&
            r.size_prices.every(
              (p) =>
                quote.toLowerCase().includes(String(p.size).toLowerCase()) &&
                (p.price == null || amount(p.price, "money", quote)) &&
                (p.minutes == null ||
                  amount(p.minutes, "(?:min|minute|minuto)", quote)),
            )))
      );
    });
  if (key === "cancellation_window_hours")
    return (
      !uncertain.test(quote) &&
      amount(value, "(?:hr|hour|hora)", quote) &&
      /cancel|reschedul|reprogram/i.test(quote)
    );
  if (key === "price_rules" && uncertain.test(quote)) return false;
  if (key === "follow_up")
    return (
      typeof value === "string" &&
      quote.toLowerCase().includes(value.toLowerCase())
    );
  return true;
}
