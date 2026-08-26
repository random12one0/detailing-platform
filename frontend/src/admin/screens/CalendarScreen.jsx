// CalendarScreen — a real month calendar grid for the new admin, rebuilt from the
// owner's feedback (he disliked the agenda list and couldn't edit block-out days).
// Layout: a 7-column month grid (weeks as rows). Desktop (lg+) shows the grid on the
// left with a sticky DETAIL SIDE PANEL on the right; mobile shows the grid and opens
// a BottomSheet with the selected day's details. Each cell shows a booking count and
// markers for block-out / drop-off-only days, with today highlighted. The detail panel
// lists that day's bookings (time-ordered) and lets the owner add/remove block-outs and
// mark/unmark drop-off-only. A Manage toolbar exposes the hours editor + range tools.
import React, { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Plus,
  Ban,
  Car,
  MapPin,
  Clock,
  Trash2,
  CheckSquare,
  X,
} from "lucide-react";
import { formatTime, formatDate, parseLocalDate, money, getStatusDot } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import {
  Card,
  Button,
  StatusBadge,
  EmptyState,
  SectionHeader,
  Modal,
  PeekDrawer,
  TextInput,
  TimeInput,
  Switch,
  useIsDesktop,
} from "@/admin/ui";
import { useBookings } from "@/admin/data/useBookings";
import { useSchedule } from "@/admin/data/useSchedule";
import BookingDetailModal from "@/admin/modals/BookingDetailModal";
import ManualBookingModal from "@/admin/modals/NewBookingModal";
import FinalizePaymentModal from "@/admin/modals/FinalizePaymentModal";

// ── Local date helpers (all YYYY-MM-DD math is done as local dates) ──────────
const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayStr = () => ymd(new Date());
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Permanent weekly default hours (mirrors the availability engine / Settings).
// Keyed by getDay() (0=Sun). Used only to SHOW "Normal hours" context; the real
// weekly schedule still lives in Settings/More — this is display-only here.
const WEEKLY_DEFAULT_HOURS = {
  0: { open: "14:00", close: "18:00" },
  1: { open: "16:00", close: "18:00" },
  2: { open: "16:00", close: "18:00" },
  3: { open: "16:00", close: "18:00" },
  4: { open: "16:00", close: "18:00" },
  5: { open: "16:00", close: "18:00" },
  6: { open: "10:00", close: "18:00" },
};

// Short services summary from packages + add-ons (mirrors TodayScreen).
const serviceSummary = (b) => {
  const parts = [];
  if (b.interior_package?.name) parts.push(b.interior_package.name);
  if (b.exterior_package?.name) parts.push(b.exterior_package.name);
  const addOns = Array.isArray(b.add_ons)
    ? b.add_ons.map((a) => a.add_on?.name).filter(Boolean)
    : [];
  let summary = parts.join(" + ");
  if (addOns.length)
    summary += `${summary ? " · " : ""}+${addOns.length} add-on${
      addOns.length > 1 ? "s" : ""
    }`;
  return summary || "Service";
};

const amountFor = (b) => b.final_amount ?? b.total_price ?? 0;

// Walk a date range (inclusive) as YYYY-MM-DD strings, clamped to [lo, hi].
const eachDayInRange = (start, end, lo, hi, push) => {
  if (!start) return;
  const from = start < lo ? lo : start;
  const to = !end || end > hi ? hi : end;
  let d = parseLocalDate(from);
  const stopD = parseLocalDate(to);
  while (d && stopD && d <= stopD) {
    push(ymd(d));
    d.setDate(d.getDate() + 1);
  }
};

// ── The detail panel: bookings + block-out / drop-off controls for one day ───
function DayDetail({
  dateStr,
  entry,
  override,
  onOpenBooking,
  onNewBooking,
  onBlockDay,
  onBlockTime,
  onRemoveBlockout,
  onDropoffDay,
  onRemoveDropoff,
  onSaveHours,
  onResetHours,
  busy,
}) {
  const d = parseLocalDate(dateStr) || new Date();
  const isToday = dateStr === todayStr();
  const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
  const longDate = d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const bookings = entry?.bookings || [];
  const blockouts = entry?.blockouts || [];
  const dropoffs = entry?.dropoffs || [];

  // Effective hours status for this day: a booking_hours_overrides row wins;
  // otherwise an all-day block-out means "Closed"; otherwise normal weekly hours.
  const allDayBlock = blockouts.find((bo) => bo.all_day || !bo.start_time);
  const weekly = WEEKLY_DEFAULT_HOURS[d.getDay()];
  const [editingHours, setEditingHours] = useState(false);
  // Custom-hours editor defaults to 10:00–18:00 when the day has no override yet
  // (per the owner's request), rather than pre-filling the weekly hours.
  const [openTime, setOpenTime] = useState(
    (override?.open_time || "10:00").slice(0, 5)
  );
  const [closeTime, setCloseTime] = useState(
    (override?.close_time || "18:00").slice(0, 5)
  );
  // Optional: apply the same custom hours to a span of days (this date → end).
  const [hoursEndDate, setHoursEndDate] = useState(dateStr);

  return (
    <div className="space-y-4">
      {/* Day heading */}
      <div>
        <div className="flex items-baseline gap-2">
          <h3 className="text-xl font-bold text-foreground">{weekday}</h3>
          {isToday && (
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent">
              Today
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{longDate}</p>
      </div>

      {/* Hours for this day — lightweight one-off override for THIS date only */}
      <div className="space-y-2 rounded-xl border border-border bg-background/40 p-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Clock className="size-3.5" />
          Hours for this day
        </div>

        <div className="text-sm">
          {override ? (
            <span className="font-semibold text-accent">
              Custom: {formatTime(override.open_time)} – {formatTime(override.close_time)}
            </span>
          ) : allDayBlock ? (
            <span className="font-semibold text-warning">Closed</span>
          ) : (
            <span className="text-foreground">
              <span className="font-semibold">Normal hours</span>
              {weekly && (
                <span className="text-muted-foreground">
                  {" · "}
                  {formatTime(weekly.open)} – {formatTime(weekly.close)}
                </span>
              )}
            </span>
          )}
        </div>

        {editingHours ? (
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <TimeInput
                label="Open"
                value={openTime}
                onChange={(e) => setOpenTime(e.target.value)}
                className="[color-scheme:dark]"
              />
              <TimeInput
                label="Close"
                value={closeTime}
                onChange={(e) => setCloseTime(e.target.value)}
                className="[color-scheme:dark]"
              />
            </div>
            {/* Optional: apply these hours to a span of days ending here. */}
            <TextInput
              label="Apply through (optional)"
              type="date"
              min={dateStr}
              value={hoursEndDate}
              onChange={(e) => setHoursEndDate(e.target.value || dateStr)}
              className="[color-scheme:dark]"
            />
            {hoursEndDate > dateStr && (
              <p className="text-xs text-muted-foreground">
                Sets these hours on every day from {formatDate(dateStr)} through {formatDate(hoursEndDate)}.
              </p>
            )}
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => {
                  setEditingHours(false);
                  setHoursEndDate(dateStr);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={busy || !openTime || !closeTime}
                onClick={async () => {
                  const ok = await onSaveHours(dateStr, openTime, closeTime, hoursEndDate);
                  if (ok) {
                    setEditingHours(false);
                    setHoursEndDate(dateStr);
                  }
                }}
              >
                Save hours
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() => setEditingHours(true)}
            >
              <Clock />
              Set custom hours
            </Button>
            {!allDayBlock && (
              <Button
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => onBlockDay(dateStr)}
              >
                <Ban />
                Close all day
              </Button>
            )}
            {(override || allDayBlock) && (
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => onResetHours(dateStr)}
              >
                Reset to normal
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Availability controls: block-out + drop-off-only */}
      <div className="space-y-2 rounded-xl border border-border bg-background/40 p-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Availability
        </div>

        {/* Existing block-outs on this day, each removable */}
        {blockouts.map((bo) => (
          <div
            key={`bo-${bo.id}`}
            className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 p-2.5"
          >
            <Ban className="size-4 shrink-0 text-warning" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-warning">
                {bo.event_name || "Blocked out"}
              </div>
              <div className="text-xs text-warning/80">
                {bo.all_day || !bo.start_time
                  ? "All day"
                  : `${formatTime(bo.start_time)}${
                      bo.end_time ? ` – ${formatTime(bo.end_time)}` : ""
                    }`}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="size-11 px-0 text-warning hover:bg-warning/15"
              aria-label="Remove block-out"
              disabled={busy}
              onClick={() => onRemoveBlockout(bo.id)}
            >
              <Trash2 />
            </Button>
          </div>
        ))}

        {/* Existing drop-off-only periods, each removable */}
        {dropoffs.map((p) => (
          <div
            key={`do-${p.id}`}
            className="flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/10 p-2.5"
          >
            <Car className="size-4 shrink-0 text-accent" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-accent">
                Drop-off only
              </div>
              <div className="text-xs text-muted-foreground">
                {p.reason ? `${p.reason} · ` : ""}
                {p.start_time
                  ? `${formatTime(p.start_time)}${
                      p.end_time ? ` – ${formatTime(p.end_time)}` : ""
                    }`
                  : "All day"}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="size-11 px-0 text-accent hover:bg-accent/15"
              aria-label="Remove drop-off-only"
              disabled={busy}
              onClick={() => onRemoveDropoff(p.id)}
            >
              <Trash2 />
            </Button>
          </div>
        ))}

        {/* Quick add toggles */}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() => onBlockTime(dateStr)}
          >
            <Ban />
            Block off time…
          </Button>
          {dropoffs.length === 0 && (
            <Button
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() => onDropoffDay(dateStr)}
            >
              <Car />
              Drop-off only
            </Button>
          )}
        </div>
      </div>

      {/* Bookings, time-ordered */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {bookings.length > 0
              ? `${bookings.length} booking${bookings.length > 1 ? "s" : ""}`
              : "Bookings"}
          </div>
          <Button variant="ghost" size="sm" onClick={() => onNewBooking(dateStr)}>
            <Plus />
            Add
          </Button>
        </div>

        {bookings.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-card/50 px-4 py-6 text-center text-sm text-muted-foreground">
            No bookings this day.
          </p>
        ) : (
          bookings.map((b) => {
            const isMobileJob = b.service_type === "mobile";
            const cancelled = b.status === "cancelled";
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => onOpenBooking(b)}
                className={`flex w-full items-start gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  cancelled ? "opacity-60" : ""
                }`}
              >
                <div className="w-14 shrink-0 pt-0.5 text-sm font-semibold text-accent">
                  {formatTime(b.start_time) || "—"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="truncate font-semibold text-foreground">
                      {b.customer_name}
                    </span>
                    <span className="whitespace-nowrap font-semibold text-foreground">
                      {money(amountFor(b))}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {isMobileJob ? (
                        <>
                          <MapPin className="size-3" />
                          Mobile
                        </>
                      ) : (
                        <>
                          <Car className="size-3" />
                          Drop-off
                        </>
                      )}
                    </span>
                    <StatusBadge status={b.status} />
                  </div>
                  <div className="mt-1 truncate text-sm text-muted-foreground">
                    {serviceSummary(b)}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Add block-out / drop-off range form (used inside a Modal) ────────────────
function ScheduleForm({ kind, defaultDate, onSubmit, onCancel, busy }) {
  const isBlock = kind === "blockout";
  const [eventName, setEventName] = useState("");
  const [reason, setReason] = useState("");
  const [startDate, setStartDate] = useState(defaultDate);
  const [endDate, setEndDate] = useState(defaultDate);
  const [allDay, setAllDay] = useState(true);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const submit = () => {
    if (isBlock) {
      onSubmit({
        eventName,
        startDate,
        endDate,
        allDay,
        startTime,
        endTime,
      });
    } else {
      onSubmit({ reason, startDate, endDate, startTime, endTime });
    }
  };

  return (
    <div className="space-y-4">
      {isBlock ? (
        <TextInput
          label="Label"
          placeholder="e.g. Vacation, Holiday"
          value={eventName}
          onChange={(e) => setEventName(e.target.value)}
        />
      ) : (
        <TextInput
          label="Reason (optional)"
          placeholder="e.g. Solo day — drop-offs only"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      )}
      <div className="grid grid-cols-2 gap-3">
        <TextInput
          label="Start date"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <TextInput
          label="End date"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>

      {isBlock && (
        <Switch
          label="All day"
          helper="Turn off to block only part of the day."
          checked={allDay}
          onChange={setAllDay}
        />
      )}

      {(!isBlock || !allDay) && (
        <div className="grid grid-cols-2 gap-3">
          <TimeInput
            label="From"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
          <TimeInput
            label="To"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button size="sm" onClick={submit} disabled={busy || !startDate}>
          {isBlock ? "Add block-out" : "Add drop-off period"}
        </Button>
      </div>
    </div>
  );
}

export default function CalendarScreen() {
  const isDesktop = useIsDesktop();
  const { bookings, loading, updateStatus, updateNotes, updateBooking, deleteBooking, refetch } = useBookings();
  const {
    blockouts,
    dropoffPeriods,
    hoursOverrides,
    refetch: refetchSchedule,
    addBlockout,
    removeBlockout,
    addDropoff,
    removeDropoff,
    upsertHoursOverride,
    removeHoursOverride,
  } = useSchedule();

  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(() => todayStr());
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [finalizeBooking, setFinalizeBooking] = useState(null);
  const [newBookingDate, setNewBookingDate] = useState(null);
  const [scheduleForm, setScheduleForm] = useState(null); // "blockout" | "dropoff"
  const [busy, setBusy] = useState(false);
  // Multi-select: tap several days, then apply one action (block / drop-off /
  // custom hours) to all of them at once.
  const [multiSelect, setMultiSelect] = useState(false);
  const [picked, setPicked] = useState(() => new Set());
  const [multiHours, setMultiHours] = useState(null); // { openTime, closeTime } while the modal is open

  const today = todayStr();
  const monthStartStr = ymd(startOfMonth(month));
  const monthEndStr = ymd(new Date(month.getFullYear(), month.getMonth() + 1, 0));
  const monthLabel = month.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const viewingThisMonth = monthStartStr === ymd(startOfMonth(new Date()));

  // Map every activity in the visible month to its day.
  const byDay = useMemo(() => {
    const map = new Map(); // dateStr -> { bookings, blockouts, dropoffs }
    const bucket = (ds) => {
      if (!map.has(ds))
        map.set(ds, { bookings: [], blockouts: [], dropoffs: [] });
      return map.get(ds);
    };
    const inMonth = (ds) => ds >= monthStartStr && ds <= monthEndStr;

    bookings.forEach((b) => {
      if (b.booking_date && inMonth(b.booking_date))
        bucket(b.booking_date).bookings.push(b);
    });
    blockouts.forEach((bo) =>
      eachDayInRange(bo.start_date, bo.end_date, monthStartStr, monthEndStr, (ds) =>
        bucket(ds).blockouts.push(bo)
      )
    );
    dropoffPeriods.forEach((p) =>
      eachDayInRange(p.start_date, p.end_date, monthStartStr, monthEndStr, (ds) =>
        bucket(ds).dropoffs.push(p)
      )
    );

    // Sort each day's bookings by start_time.
    map.forEach((entry) =>
      entry.bookings.sort((a, b) =>
        (a.start_time || "").localeCompare(b.start_time || "")
      )
    );
    return map;
  }, [bookings, blockouts, dropoffPeriods, monthStartStr, monthEndStr]);

  // Build the grid: leading blanks for the first weekday, then each day of month.
  const cells = useMemo(() => {
    const first = startOfMonth(month);
    const lead = first.getDay(); // 0=Sun
    const daysInMonth = new Date(
      month.getFullYear(),
      month.getMonth() + 1,
      0
    ).getDate();
    const out = [];
    for (let i = 0; i < lead; i++) out.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      out.push(ymd(new Date(month.getFullYear(), month.getMonth(), day)));
    }
    return out;
  }, [month]);

  const selectedEntry = byDay.get(selected) || null;

  // Tapping a day just selects it — the mobile PeekDrawer updates in place, and
  // the calendar stays fully interactive (no modal), so days can be tapped freely.
  const selectDay = (ds) => setSelected(ds);

  // Multi-select helpers.
  const toggleMultiSelect = () => {
    setMultiSelect((on) => {
      if (on) setPicked(new Set()); // leaving select mode clears the picks
      return !on;
    });
  };
  const togglePick = (ds) =>
    setPicked((prev) => {
      const next = new Set(prev);
      next.has(ds) ? next.delete(ds) : next.add(ds);
      return next;
    });
  const clearPicked = () => setPicked(new Set());
  const pickedList = () => Array.from(picked).sort();
  const exitMultiSelect = () => {
    setPicked(new Set());
    setMultiSelect(false);
  };

  const goToday = () => {
    setMonth(startOfMonth(new Date()));
    setSelected(today);
  };

  // ── Schedule mutations (wrap the hook so we can show a busy state) ──────────
  const runBusy = async (fn) => {
    setBusy(true);
    try {
      return await fn();
    } finally {
      setBusy(false);
    }
  };
  const blockDay = (ds) =>
    runBusy(() => addBlockout({ eventName: "Blocked out", startDate: ds, endDate: ds, allDay: true }));
  const dropoffDay = (ds) =>
    runBusy(() => addDropoff({ startDate: ds, endDate: ds }));
  const onRemoveBlockout = (id) => runBusy(() => removeBlockout(id));
  const onRemoveDropoff = (id) => runBusy(() => removeDropoff(id));
  // One-off per-day hours: save a custom override for the selected date, or for
  // every day from ds through endDate (inclusive) when a range is given.
  const saveHours = (ds, openTime, closeTime, endDate) =>
    runBusy(async () => {
      const dates = [];
      let cur = parseLocalDate(ds);
      const stop = parseLocalDate(endDate && endDate > ds ? endDate : ds);
      let guard = 0;
      while (cur && stop && cur <= stop && guard < 366) {
        dates.push(ymd(cur));
        cur.setDate(cur.getDate() + 1);
        guard++;
      }
      let ok = true;
      for (const d of dates) {
        ok = (await upsertHoursOverride({ date: d, openTime, closeTime })) && ok;
      }
      return ok;
    });
  // Reset a day to normal weekly hours: drop any override AND any all-day block-out.
  const resetHours = (ds) =>
    runBusy(async () => {
      let ok = true;
      if (hoursOverrides.some((o) => o.date === ds))
        ok = await removeHoursOverride(ds);
      const allDayBlock = byDay
        .get(ds)
        ?.blockouts.find((bo) => bo.all_day || !bo.start_time);
      if (allDayBlock) ok = (await removeBlockout(allDayBlock.id)) && ok;
      return ok;
    });
  const submitScheduleForm = async (payload) => {
    const ok = await runBusy(() =>
      scheduleForm === "blockout" ? addBlockout(payload) : addDropoff(payload)
    );
    if (ok) setScheduleForm(null);
  };

  // Apply one action to every picked day, then leave multi-select.
  const applyToPicked = (fn) =>
    runBusy(async () => {
      let ok = true;
      for (const d of pickedList()) ok = (await fn(d)) && ok;
      if (ok) exitMultiSelect();
      return ok;
    });
  const blockPicked = () =>
    applyToPicked((d) => addBlockout({ eventName: "Blocked out", startDate: d, endDate: d, allDay: true }));
  const dropoffPicked = () =>
    applyToPicked((d) => addDropoff({ startDate: d, endDate: d }));
  const hoursPicked = async (openTime, closeTime) => {
    const days = pickedList();
    const ok = await runBusy(async () => {
      let good = true;
      for (const d of days) good = (await upsertHoursOverride({ date: d, openTime, closeTime })) && good;
      return good;
    });
    if (ok) {
      setMultiHours(null);
      exitMultiSelect();
    }
  };

  // ── BookingDetailModal handlers (minimal, straight to supabase + refetch) ───

  const selectedOverride =
    hoursOverrides.find((o) => o.date === selected) || null;

  // Quick counts for the mobile peek bar.
  const selectedActiveCount =
    selectedEntry?.bookings.filter((b) => b.status !== "cancelled").length || 0;
  const selectedBlockCount = selectedEntry?.blockouts.length || 0;
  const selectedDropoffCount = selectedEntry?.dropoffs.length || 0;

  // Shared detail props.
  const detailProps = {
    dateStr: selected,
    entry: selectedEntry,
    override: selectedOverride,
    onOpenBooking: (b) => setSelectedBooking(b),
    onNewBooking: (ds) => setNewBookingDate(ds),
    onBlockDay: blockDay,
    // "Block off time…" opens the full block-out form (pre-filled to this date)
    // so a partial window can be chosen, instead of forcing an all-day block.
    onBlockTime: () => setScheduleForm("blockout"),
    onRemoveBlockout,
    onDropoffDay: dropoffDay,
    onRemoveDropoff,
    onSaveHours: saveHours,
    onResetHours: resetHours,
    busy,
  };

  return (
    // Extra bottom padding on mobile so the floating peek drawer never hides the
    // bottom of the calendar (legend / last week).
    <div className="space-y-5 pb-44 lg:pb-0">
      {/* Header + manage toolbar */}
      <SectionHeader
        title="Calendar"
        subtitle="Tap a day to see bookings & manage availability"
        action={
          <Button size="sm" onClick={() => setNewBookingDate(selected || today)}>
            <Plus />
            New Booking
          </Button>
        }
      />

      {/* Manage tools */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setScheduleForm("blockout")}
        >
          <Ban />
          Add block-out
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setScheduleForm("dropoff")}
        >
          <Car />
          Add drop-off day
        </Button>
        <Button
          variant={multiSelect ? "primary" : "secondary"}
          size="sm"
          onClick={toggleMultiSelect}
        >
          <CheckSquare />
          {multiSelect ? "Done selecting" : "Select days"}
        </Button>
      </div>

      {/* Multi-select action bar */}
      {multiSelect && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-accent/50 bg-accent/10 p-3">
          <span className="text-sm font-semibold text-foreground">
            {picked.size} day{picked.size === 1 ? "" : "s"} selected
          </span>
          <span className="text-xs text-muted-foreground">Tap days on the calendar, then choose an action.</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={busy || picked.size === 0}
              onClick={() => setMultiHours({ openTime: "10:00", closeTime: "18:00" })}
            >
              <Clock />
              Custom hours
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={busy || picked.size === 0}
              onClick={blockPicked}
            >
              <Ban />
              Block / close
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={busy || picked.size === 0}
              onClick={dropoffPicked}
            >
              <Car />
              Drop-off only
            </Button>
            {picked.size > 0 && (
              <Button size="sm" variant="ghost" disabled={busy} onClick={clearPicked}>
                <X />
                Clear
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-5">
        {/* Calendar column */}
        <div className="space-y-3">
          {/* Month navigation */}
          <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card p-2">
            <Button
              variant="ghost"
              size="sm"
              aria-label="Previous month"
              onClick={() => setMonth((m) => addMonths(m, -1))}
              className="size-11 px-0"
            >
              <ChevronLeft />
            </Button>
            <div className="min-w-0 text-center">
              <div className="truncate text-base font-semibold text-foreground">
                {monthLabel}
              </div>
              {!viewingThisMonth && (
                <button
                  type="button"
                  onClick={goToday}
                  className="text-xs font-medium text-accent hover:underline"
                >
                  Jump to today
                </button>
              )}
            </div>
            <div className="flex items-center gap-1">
              {viewingThisMonth ? null : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={goToday}
                  className="hidden sm:inline-flex"
                >
                  Today
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                aria-label="Next month"
                onClick={() => setMonth((m) => addMonths(m, 1))}
                className="size-11 px-0"
              >
                <ChevronRight />
              </Button>
            </div>
          </div>

          {/* Grid */}
          <Card padded={false} className="overflow-hidden p-2">
            {/* Weekday header */}
            <div className="grid grid-cols-7">
              {WEEKDAYS.map((w) => (
                <div
                  key={w}
                  className="py-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {w}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-1">
              {cells.map((ds, i) => {
                if (!ds) return <div key={`e-${i}`} className="min-h-[52px]" />;
                const entry = byDay.get(ds);
                const count = entry?.bookings.length || 0;
                const activeCount =
                  entry?.bookings.filter((b) => b.status !== "cancelled").length || 0;
                const hasBlock = (entry?.blockouts.length || 0) > 0;
                const hasDropoff = (entry?.dropoffs.length || 0) > 0;
                const isToday = ds === today;
                const isPicked = multiSelect && picked.has(ds);
                const isSelected = !multiSelect && ds === selected;
                const dayNum = Number(ds.slice(8, 10));

                return (
                  <button
                    key={ds}
                    type="button"
                    onClick={() => (multiSelect ? togglePick(ds) : selectDay(ds))}
                    aria-label={`${ds}${count ? `, ${count} bookings` : ""}`}
                    aria-pressed={isPicked || isSelected}
                    className={`relative flex min-h-[52px] flex-col items-center rounded-lg border p-1 text-center transition-colors sm:min-h-[64px] ${
                      isPicked
                        ? "border-accent bg-accent/25 ring-2 ring-accent"
                        : isSelected
                        ? "border-accent bg-accent/15 ring-1 ring-accent"
                        : isToday
                        ? "border-accent/50 bg-accent/5"
                        : "border-border bg-card hover:bg-muted/60"
                    }`}
                  >
                    {isPicked && (
                      <CheckSquare className="absolute right-1 top-1 size-3.5 text-accent" />
                    )}
                    <span
                      className={`mt-0.5 flex size-6 items-center justify-center rounded-full text-sm font-semibold ${
                        isToday
                          ? "bg-accent text-accent-foreground"
                          : "text-foreground"
                      }`}
                    >
                      {dayNum}
                    </span>

                    {/* Booking count */}
                    {activeCount > 0 && (
                      <span className="mt-0.5 hidden text-[10px] font-medium text-muted-foreground sm:block">
                        {activeCount} job{activeCount > 1 ? "s" : ""}
                      </span>
                    )}

                    {/* Indicators row */}
                    <span className="mt-auto flex items-center justify-center gap-0.5 pb-0.5">
                      {activeCount > 0 && (
                        <span className="flex items-center gap-0.5 sm:hidden">
                          {Array.from({ length: Math.min(activeCount, 3) }).map(
                            (_, k) => (
                              <span
                                key={k}
                                className={`size-1.5 rounded-full ${getStatusDot(
                                  entry.bookings[k]?.status
                                )}`}
                              />
                            )
                          )}
                        </span>
                      )}
                      {hasBlock && (
                        <span
                          title="Block-out"
                          className="size-2 rounded-full bg-warning"
                        />
                      )}
                      {hasDropoff && (
                        <span
                          title="Drop-off only"
                          className="size-2 rounded-full bg-transparent ring-2 ring-inset ring-accent"
                        />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border px-1 pt-2 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className={`size-2 rounded-full ${getStatusDot("confirmed")}`} />
                Bookings
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-warning" />
                Block-out
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-transparent ring-2 ring-inset ring-accent" />
                Drop-off only
              </span>
            </div>
          </Card>
        </div>

        {/* Desktop side panel */}
        <aside className="hidden lg:block">
          <Card className="sticky top-6">
            {loading ? (
              <EmptyState
                icon={CalendarDays}
                title="Loading"
                message="Fetching the calendar…"
              />
            ) : (
              <DayDetail key={selected} {...detailProps} />
            )}
          </Card>
        </aside>
      </div>

      {/* Mobile day drawer — a tiny non-modal peek that stays out of the way so the
          calendar remains tappable; drag up (or tap the bar) for the full details. */}
      {!isDesktop && (
        <PeekDrawer
          expandLabel="day details"
          peek={
            <span className="flex items-center gap-2 py-0.5">
              <span className="truncate text-sm font-semibold text-foreground">
                {(parseLocalDate(selected) || new Date()).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </span>
              <span className="text-sm text-muted-foreground">
                {selectedActiveCount > 0
                  ? `${selectedActiveCount} job${selectedActiveCount > 1 ? "s" : ""}`
                  : "No jobs"}
              </span>
              {selectedBlockCount > 0 && (
                <span className="rounded bg-warning/15 px-1.5 py-0.5 text-[11px] font-semibold text-warning">
                  Closed
                </span>
              )}
              {selectedDropoffCount > 0 && (
                <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[11px] font-semibold text-accent">
                  Drop-off
                </span>
              )}
            </span>
          }
        >
          <DayDetail key={selected} {...detailProps} />
        </PeekDrawer>
      )}

      {/* Add block-out / drop-off range modal */}
      <Modal
        open={!!scheduleForm}
        onClose={() => setScheduleForm(null)}
        title={scheduleForm === "dropoff" ? "Add drop-off-only period" : "Add block-out"}
        description={
          scheduleForm === "dropoff"
            ? "Mark a date range as drop-off only."
            : "Close a date or range so it can't be booked."
        }
      >
        {scheduleForm && (
          <ScheduleForm
            kind={scheduleForm}
            defaultDate={selected || today}
            onSubmit={submitScheduleForm}
            onCancel={() => setScheduleForm(null)}
            busy={busy}
          />
        )}
      </Modal>

      {/* Custom hours for all picked days (defaults to 10:00–18:00) */}
      <Modal
        open={!!multiHours}
        onClose={() => setMultiHours(null)}
        title="Custom hours for selected days"
        description={`Applies to ${picked.size} selected day${picked.size === 1 ? "" : "s"}.`}
      >
        {multiHours && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <TimeInput
                label="Open"
                value={multiHours.openTime}
                onChange={(e) => setMultiHours((h) => ({ ...h, openTime: e.target.value }))}
                className="[color-scheme:dark]"
              />
              <TimeInput
                label="Close"
                value={multiHours.closeTime}
                onChange={(e) => setMultiHours((h) => ({ ...h, closeTime: e.target.value }))}
                className="[color-scheme:dark]"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" disabled={busy} onClick={() => setMultiHours(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={busy || !multiHours.openTime || !multiHours.closeTime}
                onClick={() => hoursPicked(multiHours.openTime, multiHours.closeTime)}
              >
                Save hours
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Booking detail — reuse existing component with fully-wired handlers */}
      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onUpdateStatus={updateStatus}
          onUpdateNotes={updateNotes}
          onUpdateBooking={updateBooking}
          onDelete={deleteBooking}
          onEditPayment={(b) => {
            setSelectedBooking(null);
            setFinalizeBooking(b);
          }}
        />
      )}

      {/* Edit a finalized payment (e.g. correct a wrong price) */}
      {finalizeBooking && (
        <FinalizePaymentModal
          booking={finalizeBooking}
          onClose={() => setFinalizeBooking(null)}
          onSave={() => {
            setFinalizeBooking(null);
            refetch();
          }}
        />
      )}

      {/* New booking — reuse existing manual booking modal */}
      {newBookingDate && (
        <ManualBookingModal
          selectedDate={newBookingDate}
          onClose={() => setNewBookingDate(null)}
          onSave={() => {
            setNewBookingDate(null);
            refetch();
            refetchSchedule();
          }}
        />
      )}
    </div>
  );
}
