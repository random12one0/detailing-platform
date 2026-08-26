// FinalizePaymentModal — admin-native rebuild of components/PaymentFinalizationModal.
// Same external contract: { booking, onClose, onSave } and the SAME writes:
//   - bookings.update({ final_amount, payment_status, line_items, payment_notes,
//     finalized_at, start_time, end_time })
//   - delete + re-insert booking_line_items (category/label/amount/quantity)
//   - total via computeTotal → roundToNearest5 (src/lib/pricing).
// Only the UI/UX is rebuilt on the admin design system (dark, mobile-first).
import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { Minus, Plus, X } from "lucide-react";
import { supabase, SUPABASE_FUNCTIONS_URL } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { roundToNearest5, vehicleSizeAdd } from "@/lib/pricing";
import { money } from "@/lib/format";
import { Modal } from "@/admin/ui/Modal";
import { Button } from "@/admin/ui/Button";
import { Chip } from "@/admin/ui/Chip";
import {
  TextInput,
  MoneyInput,
  TimeInput,
  Textarea,
  Select,
} from "@/admin/ui/Field";

// Manual (non-inventory) charge categories.
const MANUAL_CATEGORIES = [
  { value: "tip", label: "Tip", hint: "Customer tip" },
  { value: "discount", label: "Discount / Comp", hint: "Money off (stored as negative)" },
  { value: "custom", label: "Custom charge", hint: "Anything else" },
  { value: "travel_fee", label: "Travel / Mobile fee", hint: "Mobile/travel charge" },
];

const CATEGORY_LABELS = {
  upgrade: "Upgrade",
  add_on: "Add-on",
  custom: "Custom charge",
  travel_fee: "Travel / Mobile fee",
  tip: "Tip",
  discount: "Discount / Comp",
};

const categoryLabel = (value) => CATEGORY_LABELS[value] || "Extra";

const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Build the read-only "base services" list for a booking. `overrides` lets the
// finalize flow REPLACE the interior/exterior package (an upgrade swaps the base
// package instead of stacking a second one on top). Shape: { interior?, exterior? }
// where each value is a package row from inventory.
const buildBaseItems = (booking, overrides = {}) => {
  const items = [];
  // Surcharge comes from the shared pricing table — never re-inline the numbers,
  // or this invoice will drift from what the customer was quoted.
  const sizeAdd = vehicleSizeAdd(booking.vehicle_size);

  const interiorPkg = overrides.interior || booking.interior_package;
  const exteriorPkg = overrides.exterior || booking.exterior_package;

  let baseSubtotal = 0;
  if (interiorPkg) {
    const amt = parseFloat(interiorPkg.base_price || interiorPkg.price || 0);
    baseSubtotal += amt;
    items.push({
      description: `Interior: ${interiorPkg.name}${overrides.interior ? " (upgraded)" : ""}`,
      amount: amt,
      type: "base",
    });
  }
  if (exteriorPkg) {
    const amt = parseFloat(exteriorPkg.base_price || exteriorPkg.price || 0);
    baseSubtotal += amt;
    items.push({
      description: `Exterior: ${exteriorPkg.name}${overrides.exterior ? " (upgraded)" : ""}`,
      amount: amt,
      type: "base",
    });
  }
  if (sizeAdd !== 0 && baseSubtotal > 0) {
    items.push({
      description: `Vehicle Size (${booking.vehicle_size}, +$${sizeAdd})`,
      amount: sizeAdd,
      type: "size",
    });
  }
  if (booking.monthly_plan_name) {
    items.push({
      description: `Monthly Plan: ${booking.monthly_plan_name}`,
      amount: booking.monthly_plan_discount
        ? -Math.abs(parseFloat(booking.monthly_plan_discount))
        : 0,
      type: "plan",
    });
  }
  if (Array.isArray(booking.add_ons)) {
    for (const a of booking.add_ons) {
      if (a.add_on && a.add_on.name) {
        items.push({
          description: `Add-On: ${a.add_on.name}`,
          amount: parseFloat(a.add_on.price || 0),
          type: "addon",
        });
      }
    }
  }
  return items;
};

// interior | exterior classification for an inventory package (defaults to exterior).
const packageCategory = (pkg) => (pkg?.category === "interior" ? "interior" : "exterior");

const FinalizePaymentModal = ({ booking, onClose, onSave }) => {
  const [baseItems, setBaseItems] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [newItem, setNewItem] = useState({ category: "tip", label: "", amount: "" });
  const [addOnsInventory, setAddOnsInventory] = useState([]);
  const [packagesInventory, setPackagesInventory] = useState([]);
  const [selectedPackageId, setSelectedPackageId] = useState("");
  // Package upgrades REPLACE the same-category base package (no stacking).
  // { interior?: pkgRow, exterior?: pkgRow }
  const [pkgOverrides, setPkgOverrides] = useState({});
  const [finalAmount, setFinalAmount] = useState(0);
  const [percentReduction, setPercentReduction] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("paid");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  // Two-step confirm so the finalize/save button can't be triggered by an
  // accidental tap — first press arms it, second press actually saves.
  const [confirming, setConfirming] = useState(false);
  const confirmTimer = useRef(null);
  // Is this booking already finalized? Then we're EDITING, not finalizing.
  const alreadyFinalized = !!booking?.finalized_at;

  useEffect(() => () => clearTimeout(confirmTimer.current), []);

  // Sum base items + adjustments, apply optional percent reduction, round to $5.
  const computeTotal = useCallback((base, adj, percent) => {
    const baseSum = base.reduce((s, i) => s + parseFloat(i.amount || 0), 0);
    const adjSum = adj.reduce(
      (s, i) => s + parseFloat(i.amount || 0) * parseInt(i.quantity || 1, 10),
      0
    );
    let total = baseSum + adjSum;
    if (percent && !isNaN(percent) && Number(percent) > 0) {
      total -= (total * Number(percent)) / 100;
    }
    return roundToNearest5(total);
  }, []);

  useEffect(() => {
    if (!booking) return;
    let cancelled = false;

    const init = async () => {
      const base = buildBaseItems(booking, {});

      let existing = [];
      const { data, error: liError } = await supabase
        .from("booking_line_items")
        .select("*")
        .eq("booking_id", booking.id)
        .order("created_at", { ascending: true });
      if (!liError && Array.isArray(data)) {
        existing = data.map((r) => ({
          category: r.category,
          label: r.label,
          amount: parseFloat(r.amount),
          quantity: r.quantity || 1,
        }));
      }

      if (cancelled) return;
      setBaseItems(base);
      setAdjustments(existing);
      setFinalAmount(
        booking.final_amount != null && existing.length === 0
          ? parseFloat(booking.final_amount)
          : computeTotal(base, existing, "")
      );
      // A booking's payment_status is 'pending' by default from creation, so
      // this must NOT fall through to it on a first-time finalize — only an
      // already-finalized booking (being re-edited) should keep whatever
      // status the owner previously set here.
      setPaymentStatus(alreadyFinalized ? booking.payment_status || "paid" : "paid");
      setNotes(booking.payment_notes || "");
      setStartTime(booking.start_time ? booking.start_time.slice(0, 5) : booking.predicted_start_time || "");
      setEndTime(booking.end_time ? booking.end_time.slice(0, 5) : booking.predicted_end_time || "");
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [booking, computeTotal, alreadyFinalized]);

  // Load the owner's real inventory of add-ons and packages to pick from.
  useEffect(() => {
    let cancelled = false;
    const loadInventory = async () => {
      const [addOnRes, pkgRes] = await Promise.all([
        supabase.from("add_ons").select("*").eq("is_active", true).order("name"),
        supabase.from("packages").select("*").eq("is_active", true).order("base_price"),
      ]);
      if (cancelled) return;
      if (!addOnRes.error && Array.isArray(addOnRes.data)) setAddOnsInventory(addOnRes.data);
      if (!pkgRes.error && Array.isArray(pkgRes.data)) setPackagesInventory(pkgRes.data);
    };
    loadInventory();
    return () => {
      cancelled = true;
    };
  }, []);

  const recalc = (base, adj, percent) => setFinalAmount(computeTotal(base, adj, percent));

  const toggleAddOn = (addon) => {
    const idx = adjustments.findIndex(
      (a) => a.category === "add_on" && a.label === addon.name
    );
    let updated;
    if (idx >= 0) {
      updated = adjustments.filter((_, i) => i !== idx);
    } else {
      updated = [
        ...adjustments,
        { category: "add_on", label: addon.name, amount: parseFloat(addon.price || 0), quantity: 1 },
      ];
    }
    setAdjustments(updated);
    recalc(baseItems, updated, percentReduction);
  };

  const isAddOnSelected = (addon) =>
    adjustments.some((a) => a.category === "add_on" && a.label === addon.name);

  const changeQuantity = (index, delta) => {
    const updated = adjustments.map((a, i) =>
      i === index ? { ...a, quantity: Math.max(1, (parseInt(a.quantity, 10) || 1) + delta) } : a
    );
    setAdjustments(updated);
    recalc(baseItems, updated, percentReduction);
  };

  // Replace the same-category base package with the chosen one (upgrade = swap,
  // not stack). Rebuilds the base list + total off the new override.
  const replacePackage = (packageId) => {
    setSelectedPackageId("");
    const pkg = packagesInventory.find((p) => String(p.id) === String(packageId));
    if (!pkg) return;
    const nextOverrides = { ...pkgOverrides, [packageCategory(pkg)]: pkg };
    setPkgOverrides(nextOverrides);
    const base = buildBaseItems(booking, nextOverrides);
    setBaseItems(base);
    recalc(base, adjustments, percentReduction);
  };

  // Undo all package swaps, back to the originally-booked packages.
  const resetPackages = () => {
    setPkgOverrides({});
    const base = buildBaseItems(booking, {});
    setBaseItems(base);
    recalc(base, adjustments, percentReduction);
  };

  const addAdjustment = () => {
    if (newItem.amount === "") return;
    let amount = parseFloat(newItem.amount);
    if (isNaN(amount)) return;
    if (newItem.category === "discount") amount = -Math.abs(amount);
    // Description is optional — fall back to the category name (e.g. "Tip").
    const label = newItem.label.trim() || categoryLabel(newItem.category);
    const updated = [
      ...adjustments,
      { category: newItem.category, label, amount, quantity: 1 },
    ];
    setAdjustments(updated);
    recalc(baseItems, updated, percentReduction);
    setNewItem({ category: newItem.category, label: "", amount: "" });
  };

  const removeAdjustment = (index) => {
    const updated = adjustments.filter((_, i) => i !== index);
    setAdjustments(updated);
    recalc(baseItems, updated, percentReduction);
  };

  const handlePercentReductionChange = (e) => {
    const val = e.target.value;
    setPercentReduction(val);
    recalc(baseItems, adjustments, val);
  };

  // Form submit is gated by a confirm step: first submit arms `confirming`, the
  // second actually saves. Auto-disarms after a few seconds so it never stays hot.
  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!confirming) {
      setConfirming(true);
      clearTimeout(confirmTimer.current);
      confirmTimer.current = setTimeout(() => setConfirming(false), 4000);
      return;
    }
    clearTimeout(confirmTimer.current);
    setConfirming(false);
    doSave();
  };

  const doSave = async () => {
    setLoading(true);
    setError("");

    try {
      const snapshot = [
        ...baseItems.map((i) => ({ description: i.description, amount: i.amount, type: i.type })),
        ...adjustments.map((i) => ({
          description: i.label,
          amount: i.amount,
          type: "additional",
          category: i.category,
        })),
      ];

      // Persist any package swap so the booking, receipt and invoice reflect the
      // service actually rendered (e.g. Deluxe exterior in place of Standard).
      const pkgUpdate = {};
      if (pkgOverrides.interior) pkgUpdate.interior_package_id = pkgOverrides.interior.id;
      if (pkgOverrides.exterior) pkgUpdate.exterior_package_id = pkgOverrides.exterior.id;

      // The swap replaces the base line rather than stacking a second one, so the
      // price delta it added has nowhere else to live — store it so the revenue
      // dashboard can still count it as "Upgrade" upsell (same bucket a stacked
      // upgrade line item would have reported to). Written every save (0 when
      // there's no override) so resetting back to the original package clears it.
      const packageUpgradeAmount = ["interior", "exterior"].reduce((sum, cat) => {
        const override = pkgOverrides[cat];
        if (!override) return sum;
        const originalPkg = cat === "interior" ? booking.interior_package : booking.exterior_package;
        const originalPrice = parseFloat(originalPkg?.base_price ?? originalPkg?.price ?? 0) || 0;
        const newPrice = parseFloat(override.base_price || 0) || 0;
        return sum + (newPrice - originalPrice);
      }, 0);

      const { error: updateError } = await supabase
        .from("bookings")
        .update({
          final_amount: finalAmount,
          payment_status: paymentStatus,
          line_items: snapshot,
          payment_notes: notes || null,
          finalized_at: new Date().toISOString(),
          start_time: startTime ? `${startTime}:00` : null,
          end_time: endTime ? `${endTime}:00` : null,
          package_upgrade_amount: packageUpgradeAmount,
          ...pkgUpdate,
        })
        .eq("id", booking.id);
      if (updateError) throw updateError;

      const { error: delError } = await supabase
        .from("booking_line_items")
        .delete()
        .eq("booking_id", booking.id);
      if (delError) throw delError;

      if (adjustments.length > 0) {
        const rows = adjustments.map((a) => ({
          booking_id: booking.id,
          category: a.category,
          label: a.label,
          amount: a.amount,
          quantity: a.quantity || 1,
        }));
        const { error: insError } = await supabase.from("booking_line_items").insert(rows);
        if (insError) throw insError;
      }

      // Best-effort: email the customer a finalized invoice/receipt, plus a
      // separate thank-you/review-request note (send-invoice sends both). The
      // DB writes above already succeeded, so an email failure must NOT fail
      // the finalize.
      try {
        const invoiceRes = await axios.post(
          `${SUPABASE_FUNCTIONS_URL}/send-invoice`,
          { id: booking.id },
          {
            headers: {
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
              "Content-Type": "application/json",
            },
          }
        );
        const thankYouSent = invoiceRes?.data?.thank_you_sent;
        toast({
          title: "Payment finalized",
          description:
            thankYouSent === false
              ? "Invoice emailed, but the thank-you email failed to send."
              : "Invoice and thank-you email sent to the customer.",
          variant: thankYouSent === false ? "destructive" : "success",
        });
      } catch (invoiceErr) {
        console.warn("Invoice email failed to send (finalize still saved):", invoiceErr);
        toast({
          title: "Payment finalized",
          description: "Saved, but the invoice email could not be sent.",
          variant: "destructive",
        });
      }

      onSave();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!booking) return null;

  const baseTotal = baseItems.reduce((s, i) => s + parseFloat(i.amount || 0), 0);
  const originalTotal = parseFloat(booking.total_price) || 0;
  const difference = finalAmount - originalTotal;
  const upsellTotal = adjustments
    .filter((a) => a.category !== "discount" && a.category !== "tip")
    .reduce((s, a) => s + parseFloat(a.amount || 0) * (a.quantity || 1), 0);

  const baseLabel = alreadyFinalized ? "Update payment" : "Finalize payment";
  const footer = (
    <>
      <Button
        type="button"
        variant="ghost"
        onClick={() => {
          if (confirming) {
            setConfirming(false);
            clearTimeout(confirmTimer.current);
          } else {
            onClose();
          }
        }}
      >
        {confirming ? "Back" : "Cancel"}
      </Button>
      <Button
        type="submit"
        form="finalize-payment-form"
        disabled={loading}
        variant={confirming ? "primary" : undefined}
        className={confirming ? "ring-2 ring-accent ring-offset-2 ring-offset-card" : undefined}
      >
        {loading ? "Saving…" : confirming ? `Tap again to ${alreadyFinalized ? "save" : "finalize"}` : baseLabel}
      </Button>
    </>
  );

  return (
    <Modal
      open
      onClose={onClose}
      title={alreadyFinalized ? "Edit payment" : "Finalize payment"}
      description={booking.customer_name}
      size="lg"
      footer={footer}
    >
      <form id="finalize-payment-form" onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Base services */}
        <div className="rounded-xl border border-border bg-background/40 p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Base services
          </div>
          <div className="mt-1 text-2xl font-bold text-foreground">{money(baseTotal)}</div>
          {baseItems.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {baseItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate text-muted-foreground">{item.description}</span>
                  <span
                    className={
                      item.amount < 0 ? "font-medium text-destructive" : "font-medium text-foreground"
                    }
                  >
                    {item.amount < 0 ? "-" : ""}
                    {money(Math.abs(item.amount))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Current adjustments */}
        <div>
          <div className="mb-2 text-sm font-semibold text-foreground">
            Extras, upgrades &amp; adjustments
          </div>
          {adjustments.length > 0 ? (
            <div className="space-y-2">
              {adjustments.map((item, index) => {
                const qty = parseInt(item.quantity, 10) || 1;
                const lineTotal = parseFloat(item.amount || 0) * qty;
                const showStepper = item.category === "add_on" || item.category === "upgrade";
                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-foreground">{item.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {categoryLabel(item.category)}
                        {qty > 1 && <span> · {money(Math.abs(item.amount))} ea</span>}
                      </div>
                    </div>
                    {showStepper && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => changeQuantity(index, -1)}
                          disabled={qty <= 1}
                          className="flex size-11 items-center justify-center rounded-lg border border-border bg-background text-foreground disabled:opacity-40"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="size-4" />
                        </button>
                        <span className="w-6 text-center text-sm text-foreground">{qty}</span>
                        <button
                          type="button"
                          onClick={() => changeQuantity(index, 1)}
                          className="flex size-11 items-center justify-center rounded-lg border border-border bg-background text-foreground"
                          aria-label="Increase quantity"
                        >
                          <Plus className="size-4" />
                        </button>
                      </div>
                    )}
                    <div
                      className={
                        lineTotal < 0
                          ? "font-semibold text-destructive"
                          : "font-semibold text-success"
                      }
                    >
                      {lineTotal < 0 ? "-" : "+"}
                      {money(Math.abs(lineTotal))}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAdjustment(index)}
                      className="flex size-11 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10"
                      aria-label="Remove"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No extras added yet.</p>
          )}
        </div>

        {/* Add-on inventory picker */}
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <div className="text-sm font-medium text-foreground">Add extras from inventory</div>
          <p className="text-xs text-muted-foreground">
            Tap an add-on to toggle it — the price is pulled automatically.
          </p>
          {addOnsInventory.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {addOnsInventory.map((addon) => (
                <Chip
                  key={addon.id}
                  active={isAddOnSelected(addon)}
                  onClick={() => toggleAddOn(addon)}
                >
                  {addon.name} · {money(addon.price)}
                </Chip>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No active add-ons in inventory.</p>
          )}

          {packagesInventory.length > 0 && (
            <div className="space-y-2 border-t border-border pt-3">
              <Select
                label="Upgrade / change a package"
                placeholder="Pick a package…"
                value={selectedPackageId || undefined}
                onChange={replacePackage}
                options={packagesInventory.map((pkg) => ({
                  value: String(pkg.id),
                  label: `${packageCategory(pkg) === "interior" ? "Interior" : "Exterior"}: ${pkg.name} — ${money(pkg.base_price)}`,
                }))}
              />
              <p className="text-xs text-muted-foreground">
                This <span className="font-medium text-foreground">replaces</span> the
                same-type base package (interior or exterior) — it won't stack a second
                one on top. Add-ons still stack.
              </p>
              {(pkgOverrides.interior || pkgOverrides.exterior) && (
                <button
                  type="button"
                  onClick={resetPackages}
                  className="text-xs font-medium text-accent hover:underline"
                >
                  Reset to originally-booked packages
                </button>
              )}
            </div>
          )}
        </div>

        {/* Manual charge entry */}
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <div className="text-sm font-medium text-foreground">
            Add a tip, discount or custom charge
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              label="Type"
              value={newItem.category}
              onChange={(v) => setNewItem({ ...newItem, category: v })}
              options={MANUAL_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
            />
            <MoneyInput
              label="Amount"
              value={newItem.amount}
              onChange={(e) => setNewItem({ ...newItem, amount: e.target.value })}
              placeholder="0.00"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addAdjustment();
                }
              }}
            />
            <TextInput
              containerClassName="sm:col-span-2"
              label="Description (optional)"
              value={newItem.label}
              onChange={(e) => setNewItem({ ...newItem, label: e.target.value })}
              placeholder={`Leave blank for “${categoryLabel(newItem.category)}”`}
              helper="Only needed if you want to note something specific."
            />
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={addAdjustment}>
            Add charge
          </Button>
        </div>

        {/* Percent off + running total */}
        <div className="space-y-3 rounded-xl border border-accent/40 bg-accent/10 p-4">
          <MoneyInput
            label="Percent off (optional)"
            symbol="%"
            value={percentReduction}
            onChange={handlePercentReductionChange}
            placeholder="e.g. 10"
          />
          <div className="flex items-center justify-between border-t border-border/60 pt-3">
            <span className="text-sm font-medium text-muted-foreground">Final amount</span>
            <span className="text-3xl font-bold text-foreground">{money(finalAmount)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Original quote {money(originalTotal)}</span>
            {difference !== 0 && (
              <span className={difference > 0 ? "text-success" : "text-destructive"}>
                {difference > 0 ? "+" : ""}
                {money(difference)}
              </span>
            )}
          </div>
          {upsellTotal > 0 && (
            <div className="text-right text-xs text-success">Upsell: +{money(upsellTotal)}</div>
          )}
        </div>

        {/* Times */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TimeInput
            label="Start time"
            required
            className="[color-scheme:dark]"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
          <TimeInput
            label="End time"
            required
            className="[color-scheme:dark]"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>

        {/* Payment status */}
        <Select
          label="Payment status"
          required
          value={paymentStatus}
          onChange={setPaymentStatus}
          options={[
            { value: "paid", label: "Paid" },
            { value: "partial", label: "Partially paid" },
            { value: "pending", label: "Pending" },
          ]}
        />

        {/* Notes */}
        <Textarea
          label="Payment notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Payment method, additional notes…"
        />
      </form>
    </Modal>
  );
};

export default FinalizePaymentModal;
