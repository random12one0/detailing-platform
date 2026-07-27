// BookingDetailModal (admin-native) — drop-in replacement for
// src/components/BookingDetailModal. SAME props and SAME write callbacks:
//   { booking, onClose, onUpdateStatus, onUpdateNotes, onUpdateBooking, onDelete }
//     • onUpdateStatus(booking.id, nextStatus)
//     • onUpdateNotes(booking.id, adminNotes)
//     • onUpdateBooking(booking.id, editFields)  // editFields.add_ons = [add_on_id]
//     • onDelete(booking.id)
// Rebuilt on the admin dark design system: responsive Modal (Dialog desktop /
// Sheet mobile), canonical StatusBadge + getStatusColor/getStatusDot, tap-to-call/
// text/navigate, admin form primitives, money() for all prices.
//
// Bugs fixed vs old:
//  • prices via parseFloat(...).toFixed(2) rendered "$NaN" when a value was null →
//    now money() everywhere (null-safe).
//  • no first-class status control — status could only reach "completed"/"cancelled"
//    via footer buttons → a proper status picker covering every status, with an
//    optimistic local update so the badge reflects the change immediately.
//  • duration/promo rows rendered even when null → guarded.
import React, { useEffect, useState } from "react";
import {
  Phone,
  MessageSquare,
  Navigation,
  Mail,
  Pencil,
  Trash2,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { money, formatTime, formatDate, getStatusDot } from "@/lib/format";
import { buildConfirmationText, buildReminderText, smsHref } from "@/lib/messages";
import { cn } from "@/lib/utils";
import {
  Modal,
  Button,
  StatusBadge,
  Chip,
  Field,
  TextInput,
  TimeInput,
  Textarea,
  Select,
  controlBase,
} from "@/admin/ui";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No show" },
];

const SERVICE_OPTIONS = [
  { value: "mobile", label: "Mobile" },
  { value: "dropoff", label: "Drop-off" },
];

const VEHICLE_OPTIONS = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
];

// A labelled spec cell in the details grid.
function Spec({ label, children }) {
  if (!children && children !== 0) return null;
  return (
    <div>
      <span className="block text-xs text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{children}</span>
    </div>
  );
}

export default function BookingDetailModal({
  booking,
  onClose,
  onUpdateStatus,
  onUpdateNotes,
  onDelete,
  onUpdateBooking,
  onEditPayment,
}) {
  // Optimistic status so the badge/CTA reflect a change before the parent refetches.
  const [status, setStatus] = useState(booking.status);
  const [adminNotes, setAdminNotes] = useState(booking.admin_notes || "");
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editFields, setEditFields] = useState({
    customer_name: booking.customer_name || "",
    customer_phone: booking.customer_phone || "",
    customer_email: booking.customer_email || "",
    customer_address: booking.customer_address || "",
    booking_date: booking.booking_date || "",
    start_time: booking.start_time || "",
    end_time: booking.end_time || "",
    service_type: booking.service_type || "",
    vehicle_size: booking.vehicle_size || "",
    add_ons: (booking.add_ons || []).map((a) => a.add_on_id),
  });

  const [allAddOns, setAllAddOns] = useState([]);
  const [loadingAddOns, setLoadingAddOns] = useState(false);
  const [addOnsError, setAddOnsError] = useState(null);

  useEffect(() => {
    let active = true;
    async function fetchAddOns() {
      setLoadingAddOns(true);
      setAddOnsError(null);
      try {
        const { data, error } = await supabase
          .from("add_ons")
          .select("*")
          .eq("is_active", true);
        if (error) throw error;
        if (active) setAllAddOns(data || []);
      } catch (err) {
        if (active) {
          setAddOnsError("Failed to load add-ons");
          setAllAddOns([]);
        }
      } finally {
        if (active) setLoadingAddOns(false);
      }
    }
    fetchAddOns();
    return () => {
      active = false;
    };
  }, []);

  const setEdit = (key, value) =>
    setEditFields((prev) => ({ ...prev, [key]: value }));

  const handleChangeStatus = (next) => {
    if (next === status) return;
    setStatus(next); // optimistic
    onUpdateStatus(booking.id, next);
  };

  const handleSaveNotes = () => {
    onUpdateNotes(booking.id, adminNotes);
    setIsEditingNotes(false);
  };

  const handleSaveEdit = () => {
    onUpdateBooking(booking.id, editFields);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (
      window.confirm(
        `Are you sure you want to permanently delete this booking for ${booking.customer_name}? This action cannot be undone.`
      )
    ) {
      onDelete(booking.id);
      onClose();
    }
  };

  const isMobileJob = booking.service_type === "mobile";
  const displayPrice = booking.final_amount ?? booking.total_price;
  // Apple Maps (owner is on iOS): `?q=` shows the location, `?daddr=` starts turn-by-turn.
  const addressQuery = booking.customer_address
    ? encodeURIComponent(booking.customer_address)
    : null;
  const mapUrl = addressQuery ? `https://maps.apple.com/?q=${addressQuery}` : null;
  const directionsUrl = addressQuery
    ? `https://maps.apple.com/?daddr=${addressQuery}`
    : null;

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={booking.customer_name || "Booking"}
      description={booking.id ? `Job #${booking.id.slice(0, 8)}` : undefined}
    >
      <div className="space-y-4">
        {/* Top action row — Edit lives up here so it's reachable without scrolling,
            and there's no floating bar to fat-finger. The state-changing actions
            (Mark complete / Done) sit at the very bottom of the content instead. */}
        <div className="flex justify-end">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsEditing((v) => !v)}
          >
            <Pencil />
            {isEditing ? "Close edit" : "Edit"}
          </Button>
        </div>

        {/* Status control */}
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/40 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span
              className={cn("size-2.5 rounded-full", getStatusDot(status))}
              aria-hidden
            />
            <StatusBadge status={status} />
          </div>
          <div className="sm:w-48">
            <Select
              aria-label="Change status"
              value={status}
              onChange={handleChangeStatus}
              options={STATUS_OPTIONS}
            />
          </div>
        </div>

        {/* Quick contact actions — each opens the phone's messaging app with the
            message already prefilled (no copy/paste needed). "Text confirm" is the
            warm intro for a new booking; "Text reminder" is the short day-of nudge. */}
        <div className="grid grid-cols-3 gap-2">
          <Button variant="secondary" size="sm" asChild>
            <a href={`tel:${booking.customer_phone}`}>
              <Phone />
              Call
            </a>
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <a href={smsHref(booking.customer_phone, buildConfirmationText(booking))}>
              <MessageSquare />
              Text confirm
            </a>
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <a href={smsHref(booking.customer_phone, buildReminderText(booking))}>
              <MessageSquare />
              Text reminder
            </a>
          </Button>
        </div>

        {/* Route strip — top need for mobile jobs */}
        {isMobileJob && (
          <div className="rounded-xl border border-accent/40 bg-accent/10 p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent">
                  <Navigation className="size-4" />
                  On-site job
                </div>
                <div className="mt-1 break-words font-medium text-foreground">
                  {booking.customer_address || "No address on file"}
                </div>
              </div>
              {directionsUrl && (
                <Button size="sm" asChild className="shrink-0">
                  <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
                    <Navigation />
                    Navigate
                  </a>
                </Button>
              )}
            </div>
            {booking.has_water_electric !== null &&
              booking.has_water_electric !== undefined && (
                <div
                  className={cn(
                    "mt-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium",
                    booking.has_water_electric
                      ? "border-success/30 bg-success/10 text-success"
                      : "border-warning/30 bg-warning/10 text-warning"
                  )}
                >
                  <Zap className="size-4 shrink-0" />
                  Water / Electric on-site:{" "}
                  {booking.has_water_electric
                    ? "Available"
                    : "NOT available — bring supply"}
                </div>
              )}
          </div>
        )}

        {/* Edit form (toggled) */}
        {isEditing && (
          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <h3 className="mb-3 border-b border-border pb-2 text-base font-semibold text-foreground">
              Edit job
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextInput
                label="Name"
                value={editFields.customer_name}
                onChange={(e) => setEdit("customer_name", e.target.value)}
              />
              <TextInput
                label="Phone"
                value={editFields.customer_phone}
                onChange={(e) => setEdit("customer_phone", e.target.value)}
              />
              <TextInput
                label="Email"
                value={editFields.customer_email}
                onChange={(e) => setEdit("customer_email", e.target.value)}
              />
              <TextInput
                label="Address"
                value={editFields.customer_address}
                onChange={(e) => setEdit("customer_address", e.target.value)}
              />
              <Field label="Date">
                <input
                  type="date"
                  value={editFields.booking_date}
                  onChange={(e) => setEdit("booking_date", e.target.value)}
                  className={cn(controlBase, "[color-scheme:dark]")}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <TimeInput
                  label="Start"
                  value={editFields.start_time}
                  onChange={(e) => setEdit("start_time", e.target.value)}
                  className="[color-scheme:dark]"
                />
                <TimeInput
                  label="End"
                  value={editFields.end_time}
                  onChange={(e) => setEdit("end_time", e.target.value)}
                  className="[color-scheme:dark]"
                />
              </div>
              <Select
                label="Service type"
                value={editFields.service_type}
                onChange={(v) => setEdit("service_type", v)}
                options={SERVICE_OPTIONS}
              />
              <Select
                label="Vehicle size"
                value={editFields.vehicle_size}
                onChange={(v) => setEdit("vehicle_size", v)}
                options={VEHICLE_OPTIONS}
              />
            </div>

            {/* Add-ons editor */}
            <div className="mt-4">
              <span className="text-sm font-medium text-foreground">Add-ons</span>
              {loadingAddOns && (
                <div className="mt-1 text-sm text-muted-foreground">
                  Loading add-ons…
                </div>
              )}
              {addOnsError && (
                <div className="mt-1 text-sm text-destructive">{addOnsError}</div>
              )}
              {!loadingAddOns && !addOnsError && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {allAddOns.map((addon) => {
                    const isSelected = editFields.add_ons.includes(addon.id);
                    return (
                      <Chip
                        key={addon.id}
                        active={isSelected}
                        onClick={() =>
                          setEditFields((prev) => ({
                            ...prev,
                            add_ons: isSelected
                              ? prev.add_ons.filter((id) => id !== addon.id)
                              : [...prev.add_ons, addon.id],
                          }))
                        }
                      >
                        {addon.name} ({money(addon.price)})
                      </Chip>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <Button size="sm" className="flex-1" onClick={handleSaveEdit}>
                Save changes
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* The job */}
        <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-4">
          <h3 className="border-b border-border pb-2 text-base font-semibold text-foreground">
            The job
          </h3>

          {booking.interior_package && (
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium text-foreground">
                  {booking.interior_package.name}
                </div>
                <div className="text-xs capitalize text-muted-foreground">
                  {booking.interior_package.tier} Interior
                </div>
              </div>
              <div className="whitespace-nowrap font-semibold text-foreground">
                {money(booking.interior_package.base_price)}
              </div>
            </div>
          )}
          {booking.exterior_package && (
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium text-foreground">
                  {booking.exterior_package.name}
                </div>
                <div className="text-xs capitalize text-muted-foreground">
                  {booking.exterior_package.tier} Exterior
                </div>
              </div>
              <div className="whitespace-nowrap font-semibold text-foreground">
                {money(booking.exterior_package.base_price)}
              </div>
            </div>
          )}
          {booking.monthly_plan_name && (
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium text-foreground">
                  Monthly Plan: {booking.monthly_plan_name}
                </div>
                {booking.monthly_plan_discount != null && (
                  <div className="text-xs text-success">
                    Discount: -{money(booking.monthly_plan_discount)}
                  </div>
                )}
              </div>
            </div>
          )}
          {booking.add_ons && booking.add_ons.length > 0 && (
            <div>
              <span className="text-xs text-muted-foreground">Add-ons</span>
              <ul className="ml-5 mt-1 list-disc space-y-0.5">
                {booking.add_ons.map((a) => (
                  <li key={a.add_on_id} className="text-sm text-foreground">
                    {a.add_on?.name}{" "}
                    {a.add_on?.price != null ? `(${money(a.add_on.price)})` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Spec grid */}
          <div className="grid grid-cols-2 gap-3 pt-1 text-sm">
            <Spec label="Vehicle">
              <span className="capitalize">{booking.vehicle_size}</span>
            </Spec>
            <Spec label="Service">
              <span className="capitalize">{booking.service_type}</span>
            </Spec>
            <Spec label="Date">{formatDate(booking.booking_date)}</Spec>
            <Spec label="Time">
              {formatTime(booking.start_time)} – {formatTime(booking.end_time)}
            </Spec>
            {booking.total_duration_minutes != null && (
              <Spec label="Duration">{booking.total_duration_minutes} min</Spec>
            )}
            {(booking.promo_code ||
              booking.applied_promo_code ||
              booking.discount_code) && (
              <div>
                <span className="block text-xs text-muted-foreground">Promo</span>
                <span className="font-medium text-success">
                  {booking.promo_code ||
                    booking.applied_promo_code ||
                    booking.discount_code}
                </span>
              </div>
            )}
          </div>

          {/* Price */}
          <div className="mt-1 space-y-1 border-t border-border pt-3">
            {booking.subtotal != null && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">{money(booking.subtotal)}</span>
              </div>
            )}
            <div className="flex items-baseline justify-between">
              <span className="font-semibold text-foreground">Total</span>
              <span className="text-2xl font-bold text-accent">
                {money(displayPrice)}
              </span>
            </div>
            {booking.finalized_at && (
              <div className="mt-1 flex items-center justify-between gap-3">
                <div className="text-xs text-success">
                  Payment finalized: {money(booking.final_amount ?? booking.total_price)}
                </div>
                {onEditPayment && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onEditPayment(booking)}
                  >
                    Edit payment
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Contact */}
        <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-4 text-sm">
          <h3 className="border-b border-border pb-2 text-base font-semibold text-foreground">
            Contact
          </h3>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Phone</span>
            <a
              href={`tel:${booking.customer_phone}`}
              className="font-medium text-accent"
            >
              {booking.customer_phone}
            </a>
          </div>
          {booking.customer_email && (
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Email</span>
              <a
                href={`mailto:${booking.customer_email}`}
                className="flex items-center gap-1 break-all text-right font-medium text-accent"
              >
                <Mail className="size-3.5 shrink-0" />
                {booking.customer_email}
              </a>
            </div>
          )}
          {!isMobileJob && booking.customer_address && (
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Address</span>
              {mapUrl ? (
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-right font-medium text-accent"
                >
                  {booking.customer_address}
                </a>
              ) : (
                <span className="text-right font-medium text-foreground">
                  {booking.customer_address}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Customer notes */}
        {booking.customer_notes && (
          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <h3 className="mb-2 border-b border-border pb-2 text-base font-semibold text-foreground">
              Customer notes
            </h3>
            <p className="text-sm text-muted-foreground">{booking.customer_notes}</p>
          </div>
        )}

        {/* Admin notes */}
        <div className="rounded-xl border border-border bg-muted/40 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-base font-semibold text-foreground">Admin notes</h3>
            {!isEditingNotes && (
              <button
                type="button"
                onClick={() => setIsEditingNotes(true)}
                className="min-h-[44px] px-2 text-sm font-medium text-accent"
              >
                {adminNotes ? "Edit" : "Add note"}
              </button>
            )}
          </div>
          {isEditingNotes ? (
            <div className="space-y-2">
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add internal notes (not visible to customer)…"
                rows={4}
              />
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={handleSaveNotes}>
                  Save
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setAdminNotes(booking.admin_notes || "");
                    setIsEditingNotes(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {adminNotes || "No admin notes yet"}
            </p>
          )}
        </div>

        {/* Timestamps */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {booking.created_at && (
            <div>Created: {new Date(booking.created_at).toLocaleString()}</div>
          )}
          {booking.updated_at && (
            <div>Updated: {new Date(booking.updated_at).toLocaleString()}</div>
          )}
        </div>

        {/* Primary action — at the bottom of the content (no sticky bar). */}
        {status === "confirmed" ? (
          <Button fullWidth onClick={() => handleChangeStatus("completed")}>
            <CheckCircle2 />
            Mark complete
          </Button>
        ) : (
          <Button fullWidth variant="secondary" onClick={onClose}>
            Done
          </Button>
        )}

        {/* Delete */}
        <Button variant="danger" fullWidth onClick={handleDelete}>
          <Trash2 />
          Delete booking permanently
        </Button>
      </div>
    </Modal>
  );
}
