// 97.46 - what a screen reader says for one calendar day.
//
// The grid prints only the number ("17"), so without a label every day
// announces as just that number. Intl already knows the words in both
// page languages - the same call the "Times on ..." heading makes - so
// there is no catalogue entry to translate and none to orphan.
export function dayAriaLabel(dateStr, locale) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

// Closed days are plain cells with no role and no tab stop, so the marker
// a screen reader needs is aria-disabled. Open days carry nothing.
export function dayAriaDisabled(open) {
  return open ? undefined : true;
}
