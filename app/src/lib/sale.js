// ROADMAP 101.8 — a site-wide sale that is ON must carry a real percentage.
//
// The Promos screen used to let a detailer switch "Sale is running" on and
// press Save sale with the percentage still at 0, publishing a sale that
// gives nothing while the switch promises "Every booking is 0% cheaper
// right now." `sale` is the screen's own state ({ active, percent }); the
// screen disables Save sale while this returns true and refuses the save.

export const saleSaveBlocked = (sale) =>
  Boolean(sale?.active) && !(Number(sale?.percent) > 0);
