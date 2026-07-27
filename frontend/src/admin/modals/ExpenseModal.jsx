// ExpenseModal (admin-native) — drop-in replacement for src/components/ExpenseModal.
// SAME props { onClose, onSave } and SAME insert into the `expenses` table
// ({ date, category, description, amount, payment_method, notes }). Rebuilt on the
// admin dark design system: responsive Modal (Dialog desktop / Sheet mobile),
// MoneyInput for amount, dark-readable native date input, admin Select + Textarea.
//
// Bugs fixed vs old:
//  • date default used toISOString() (UTC) → could be the wrong day in local time.
//    Now uses a local YYYY-MM-DD.
//  • amount was a bare parseFloat with no guard → could insert NaN. Now validated
//    (> 0) with an inline error before the insert.
//  • invisible light-on-light inputs on the dark admin theme → admin primitives +
//    [color-scheme:dark] on the native date input.
import React, { useState } from "react";
import { Chip } from "@/admin/ui";
import { Button, MoneyInput, Select, TextInput, Textarea, Field, controlBase } from "@/admin/ui";
import { Modal } from "@/admin/ui";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { value: "products", label: "🧴 Products & Supplies" },
  { value: "equipment", label: "🛠️ Equipment" },
  { value: "marketing", label: "📢 Marketing" },
  { value: "fuel", label: "⛽ Fuel & Travel" },
  { value: "maintenance", label: "🔧 Maintenance" },
  { value: "utilities", label: "💡 Utilities" },
  { value: "other", label: "📦 Other" },
];

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "check", label: "Check" },
  { value: "other", label: "Other" },
];

// Local YYYY-MM-DD for "today" (avoids the UTC off-by-one of toISOString()).
const todayStr = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};

export default function ExpenseModal({ onClose, onSave }) {
  const [formData, setFormData] = useState({
    date: todayStr(),
    category: "products",
    description: "",
    amount: "",
    payment_method: "cash",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setError("");

    const amountNum = parseFloat(formData.amount);
    if (!formData.description.trim()) {
      setError("Please enter a description.");
      return;
    }
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError("Please enter a valid amount greater than 0.");
      return;
    }

    setLoading(true);
    try {
      // SAME insert shape/logic as the old component — do not change.
      const { error: insertError } = await supabase.from("expenses").insert([
        {
          date: formData.date,
          category: formData.category,
          description: formData.description,
          amount: amountNum,
          payment_method: formData.payment_method,
          notes: formData.notes || null,
        },
      ]);

      if (insertError) throw insertError;

      onSave();
      onClose();
    } catch (err) {
      setError(err.message || "Failed to add expense.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Add Expense"
      description="Log a business cost"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={loading}>
            {loading ? "Adding…" : "Add Expense"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Date" required>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => set("date", e.target.value)}
              className={cn(controlBase, "[color-scheme:dark]")}
            />
          </Field>

          <MoneyInput
            label="Amount"
            required
            value={formData.amount}
            onChange={(e) => set("amount", e.target.value)}
            placeholder="0.00"
          />
        </div>

        {/* Category quick-picks (chips) + accessible select fallback */}
        <Field label="Category" required>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <Chip
                key={c.value}
                active={formData.category === c.value}
                onClick={() => set("category", c.value)}
              >
                {c.label}
              </Chip>
            ))}
          </div>
        </Field>

        <TextInput
          label="Description"
          required
          value={formData.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Car wash soap, wax, towels, etc."
        />

        <Select
          label="Payment method"
          required
          value={formData.payment_method}
          onChange={(v) => set("payment_method", v)}
          options={PAYMENT_METHODS}
        />

        <Textarea
          label="Notes"
          rows={3}
          value={formData.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Additional details…"
        />
      </form>
    </Modal>
  );
}
