// ClientsScreen — the new admin's customer book. A searchable, sortable card list
// of every DB customer enriched with booking count, lifetime value and last visit
// (via useCustomers over the shared useBookings feed). Each card can be edited
// (CustomerModal) or re-booked (ManualBookingModal). Mobile-first: 1 col → 2/3.
import React, { useMemo, useState } from "react";
import {
  Users,
  UserPlus,
  Search,
  Phone,
  Mail,
  CalendarClock,
  CalendarPlus,
  Pencil,
  SearchX,
} from "lucide-react";
import { money, formatDate } from "@/lib/format";
import {
  Card,
  Button,
  TextInput,
  FilterChips,
  EmptyState,
  SectionHeader,
} from "@/admin/ui";
import { useBookings } from "@/admin/data/useBookings";
import { useCustomers } from "@/admin/data/useCustomers";
import CustomerModal from "@/admin/modals/CustomerModal";
import ManualBookingModal from "@/admin/modals/NewBookingModal";

const SORTS = [
  { value: "recent", label: "Recent" },
  { value: "top", label: "Top spender" },
  { value: "az", label: "A–Z" },
];

// Local YYYY-MM-DD for "today" — passed to ManualBookingModal as a sensible default.
const todayStr = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};

// A single labelled detail row inside a customer card. Renders nothing when the
// value is missing so cards stay tidy for customers with sparse data.
function DetailRow({ icon: Icon, children }) {
  if (!children) return null;
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Icon className="size-4 shrink-0" />
      <span className="min-w-0 truncate">{children}</span>
    </div>
  );
}

function CustomerCard({ customer, onEdit, onBookAgain }) {
  const {
    name,
    phone,
    email,
    lifetimeValue,
    lastVisit,
    bookingCount,
  } = customer;

  return (
    <Card className="flex flex-col gap-3">
      {/* Name + lifetime value */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold text-foreground">
            {name || "Unnamed customer"}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {bookingCount} booking{bookingCount === 1 ? "" : "s"}
          </p>
        </div>
        <div className="text-right">
          <div className="whitespace-nowrap text-lg font-semibold text-accent">
            {money(lifetimeValue)}
          </div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Lifetime
          </div>
        </div>
      </div>

      {/* Contact + history details (each guarded for null) */}
      <div className="space-y-1.5">
        <DetailRow icon={Phone}>{phone}</DetailRow>
        <DetailRow icon={Mail}>{email}</DetailRow>
        <DetailRow icon={CalendarClock}>
          {lastVisit ? `Last visit ${formatDate(lastVisit)}` : "No visits yet"}
        </DetailRow>
      </div>

      {/* Actions */}
      <div className="mt-auto flex gap-2 pt-1">
        <Button
          variant="secondary"
          size="sm"
          className="flex-1"
          onClick={() => onEdit(customer)}
        >
          <Pencil />
          Edit
        </Button>
        <Button
          size="sm"
          className="flex-1"
          onClick={() => onBookAgain(customer)}
        >
          <CalendarPlus />
          Book again
        </Button>
      </div>
    </Card>
  );
}

export default function ClientsScreen() {
  const { bookings, refetch: refetchBookings } = useBookings();
  const { customers, loading, refetch: refetchCustomers } = useCustomers(bookings);

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recent");

  // Modal state. `editing`: undefined = closed, null = add-new, object = edit.
  // `bookAgain`: the customer to prefill ManualBookingModal for (or null).
  const [editing, setEditing] = useState(undefined);
  const [bookAgain, setBookAgain] = useState(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? customers.filter((c) =>
          [c.name, c.phone, c.email]
            .filter(Boolean)
            .some((v) => v.toLowerCase().includes(q))
        )
      : customers.slice();

    const collator = new Intl.Collator(undefined, { sensitivity: "base" });
    filtered.sort((a, b) => {
      if (sort === "top") return b.lifetimeValue - a.lifetimeValue;
      if (sort === "az") return collator.compare(a.name || "", b.name || "");
      // recent: most recent last visit first, customers with no visit last.
      if (a.lastVisit && b.lastVisit) return b.lastVisit.localeCompare(a.lastVisit);
      if (a.lastVisit) return -1;
      if (b.lastVisit) return 1;
      return collator.compare(a.name || "", b.name || "");
    });
    return filtered;
  }, [customers, query, sort]);

  const hasCustomers = customers.length > 0;

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Clients"
        subtitle={
          hasCustomers
            ? `${customers.length} customer${customers.length === 1 ? "" : "s"}`
            : undefined
        }
        action={
          <Button size="sm" onClick={() => setEditing(null)}>
            <UserPlus />
            Add Customer
          </Button>
        }
      />

      {/* Search + sort controls */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <TextInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, phone or email"
            aria-label="Search customers"
            className="pl-9"
          />
        </div>
        <FilterChips options={SORTS} value={sort} onChange={setSort} />
      </div>

      {/* List / empty states */}
      {loading ? (
        <EmptyState
          icon={Users}
          title="Loading clients"
          message="Fetching your customer book…"
        />
      ) : !hasCustomers ? (
        <EmptyState
          icon={Users}
          title="No customers yet"
          message="Add your first customer to start tracking history and lifetime value."
          action={
            <Button size="sm" onClick={() => setEditing(null)}>
              <UserPlus />
              Add Customer
            </Button>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No matches"
          message={`No customers match "${query.trim()}".`}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((c) => (
            <CustomerCard
              key={c.id || c.phone}
              customer={c}
              onEdit={setEditing}
              onBookAgain={setBookAgain}
            />
          ))}
        </div>
      )}

      {/* Add / edit customer — refetch on save so the list reflects the change. */}
      {editing !== undefined && (
        <CustomerModal
          customer={editing}
          onClose={() => setEditing(undefined)}
          onSave={refetchCustomers}
        />
      )}

      {/* Book again — opens the manual booking flow (defaults to today). The
          modal has its own customer picker; refetch both feeds on save. */}
      {bookAgain && (
        <ManualBookingModal
          selectedDate={todayStr()}
          onClose={() => setBookAgain(null)}
          onSave={() => {
            setBookAgain(null);
            refetchBookings();
            refetchCustomers();
          }}
        />
      )}
    </div>
  );
}
