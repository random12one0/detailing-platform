// MoneyScreen — the money home for the solo detailer on the new admin shell.
// Hosts the two "keeper" dashboards from components/RevenueAndCustomers: the rich
// RevenueCalendar (Income) and ExpensesSection (Expenses), toggled by a segmented
// control. These are internally themed (dark) and intentionally not restyled — this
// screen only wires them to live booking data and the existing ExpenseModal.
import React, { useMemo, useState } from "react";
import { formatDate } from "@/lib/format";
import { Button, SectionHeader } from "@/admin/ui";
import { cn } from "@/lib/utils";
import { useBookings } from "@/admin/data/useBookings";
import {
  RevenueCalendar,
  ExpensesSection,
} from "@/components/RevenueAndCustomers";
import ExpenseModal from "@/admin/modals/ExpenseModal";

// All-time completed + finalized revenue (final_amount ?? total_price).
const allTimeRevenue = (bookings) =>
  bookings
    .filter((b) => b.status === "completed" && b.finalized_at)
    .reduce((sum, b) => sum + Number(b.final_amount ?? b.total_price ?? 0), 0);

// Two-button segmented control built from admin primitives.
function Segmented({ value, onChange, options }) {
  return (
    <div className="inline-flex w-full rounded-lg border border-border bg-muted p-1 sm:w-auto">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <Button
            key={opt.value}
            type="button"
            size="sm"
            variant="ghost"
            fullWidth
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className={cn(
              "flex-1 border-0 shadow-none sm:flex-none sm:px-6",
              active
                ? "bg-card text-foreground shadow-sm hover:bg-card"
                : "text-muted-foreground hover:bg-transparent hover:text-foreground"
            )}
          >
            {opt.label}
          </Button>
        );
      })}
    </div>
  );
}

export default function MoneyScreen() {
  const { bookings, refetch } = useBookings();
  const [tab, setTab] = useState("income");
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  const totalRevenue = useMemo(() => allTimeRevenue(bookings), [bookings]);

  return (
    <div className="space-y-6">
      <SectionHeader title="Money" />

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "income", label: "Income" },
          { value: "expenses", label: "Expenses" },
        ]}
      />

      {tab === "income" ? (
        <RevenueCalendar bookings={bookings} formatDate={formatDate} />
      ) : (
        <ExpensesSection
          onAddExpense={() => setShowExpenseModal(true)}
          totalRevenue={totalRevenue}
        />
      )}

      {/* Add Expense — reuses the existing modal; refetch on save so the
          new expense is reflected in ExpensesSection's own data. */}
      {showExpenseModal && (
        <ExpenseModal
          onClose={() => setShowExpenseModal(false)}
          onSave={() => {
            setShowExpenseModal(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}
