// ROADMAP 101.8 — a site-wide sale that is ON must carry a real percentage.
//
// The Promos screen used to let a detailer switch "Sale is running" on and
// press Save sale with the percentage still at 0, publishing a sale that
// gives nothing while the switch promises "Every booking is 0% cheaper
// right now." `sale` is the screen's own state ({ active, percent }); the
// screen disables Save sale while this returns true and refuses the save.

export const saleSaveBlocked = (sale) =>
  Boolean(sale?.active) && !(Number(sale?.percent) > 0);

// Self-review 1 (101.8) - Billing's own `busy` shape: while a save is in
// flight the button is disabled, so a second press is refused, not sent
// twice. The screen calls exactly this function for `disabled`.
export const saleSaveDisabled = (sale, busy) =>
  Boolean(busy) || saleSaveBlocked(sale);

// ROADMAP 101.8 F1 - the save's `busy` flag must clear even when the write
// throws (the read-only preview guard throws during `update`), or Save sale
// stays disabled for that screen, including after editing is unlocked. The
// screen runs its whole write inside this helper; `finally` is the fix.
export const withBusy = async (setBusy, fn) => {
  setBusy(true);
  try {
    return await fn();
  } finally {
    setBusy(false);
  }
};
