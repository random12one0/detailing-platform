// NewBookingModal — admin-native rebuild of components/ManualBookingModal.
// Same external contract: { selectedDate, onClose, onSave } and the SAME Supabase
// writes (insert into bookings + booking_add_ons, optional customer upsert).
// Only the UI/UX is rebuilt on the admin design system (dark, mobile-first).
import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { money } from "@/lib/format";
import { Modal } from "@/admin/ui/Modal";
import { Button } from "@/admin/ui/Button";
import { Chip } from "@/admin/ui/Chip";
import {
  Field,
  TextInput,
  MoneyInput,
  TimeInput,
  Textarea,
  Select,
} from "@/admin/ui/Field";

// Sentinel for Radix Select "None" options (Radix forbids empty-string values).
const NONE = "__none__";

// Vehicle size adds — MUST match the edge-function / old-modal pricing logic.
const VEHICLE_SIZE_ADDS = { small: 0, medium: 15, large: 30 };

// Normalize the selectedDate prop (Date OR "YYYY-MM-DD" string) to a date-input
// value. Fixes the AdminShell bug where a raw `new Date()` was fed to <input type=date>.
const toDateStr = (d) => {
  if (!d) return "";
  if (typeof d === "string") return d.slice(0, 10);
  if (d instanceof Date && !isNaN(d)) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  return "";
};

const NewBookingModal = ({ onClose, onSave, selectedDate }) => {
  const [loading, setLoading] = useState(false);
  const [useExistingCustomer, setUseExistingCustomer] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [monthlyPlans, setMonthlyPlans] = useState([]);
  const [allAddOns, setAllAddOns] = useState([]);
  const [loadingAddOns, setLoadingAddOns] = useState(false);
  const [addOnsError, setAddOnsError] = useState(null);
  const [error, setError] = useState("");
  const [priceStr, setPriceStr] = useState("0");

  const [formData, setFormData] = useState({
    customer_id: "",
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    customer_address: "",
    booking_date: toDateStr(selectedDate),
    start_time: "",
    end_time: "",
    service_type: "mobile",
    vehicle_size: "small",
    interior_package_id: "",
    exterior_package_id: "",
    add_ons: [],
    total_price: 0,
    status: "confirmed",
    monthly_plan_id: "",
    notes: "",
  });

  // --- Data loads (identical queries to the old modal) ---
  useEffect(() => {
    async function fetchCustomers() {
      const { data, error: e } = await supabase
        .from("customers")
        .select("*")
        .order("name", { ascending: true });
      setCustomers(e ? [] : data || []);
    }
    fetchCustomers();
  }, []);

  useEffect(() => {
    async function fetchPackages() {
      const { data, error: e } = await supabase
        .from("packages")
        .select("*")
        .eq("is_active", true)
        .order("base_price");
      setPackages(e ? [] : data || []);
    }
    fetchPackages();
  }, []);

  useEffect(() => {
    async function fetchMonthlyPlans() {
      const { data, error: e } = await supabase
        .from("monthly_plans")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (!e) setMonthlyPlans(data || []);
    }
    fetchMonthlyPlans();
  }, []);

  useEffect(() => {
    async function fetchAddOns() {
      setLoadingAddOns(true);
      setAddOnsError(null);
      try {
        const { data, error: e } = await supabase
          .from("add_ons")
          .select("*")
          .eq("is_active", true);
        if (e) throw e;
        setAllAddOns(data || []);
      } catch (_) {
        setAddOnsError("Failed to load add-ons");
        setAllAddOns([]);
      } finally {
        setLoadingAddOns(false);
      }
    }
    fetchAddOns();
  }, []);

  // --- Pricing (identical math: base + size add + add-ons, plan discount, floor to $5) ---
  const calculateTotalPrice = useCallback(() => {
    let basePrice = 0;
    if (formData.interior_package_id) {
      const pkg = packages.find((p) => p.id === formData.interior_package_id);
      if (pkg) basePrice += parseFloat(pkg.base_price);
    }
    if (formData.exterior_package_id) {
      const pkg = packages.find((p) => p.id === formData.exterior_package_id);
      if (pkg) basePrice += parseFloat(pkg.base_price);
    }
    const sizeAdd = VEHICLE_SIZE_ADDS[formData.vehicle_size] || 0;
    let serviceSubtotal = basePrice + sizeAdd;

    let addOnsTotal = 0;
    if (formData.add_ons?.length > 0 && allAddOns.length > 0) {
      for (const addOnId of formData.add_ons) {
        const addOn = allAddOns.find((a) => a.id === addOnId);
        if (addOn) addOnsTotal += parseFloat(addOn.price);
      }
    }

    let subtotal = serviceSubtotal + addOnsTotal;
    if (formData.monthly_plan_id && monthlyPlans.length > 0) {
      const plan = monthlyPlans.find(
        (p) => String(p.id) === String(formData.monthly_plan_id)
      );
      if (plan) {
        if (plan.discount_type === "percentage") {
          subtotal -= subtotal * (parseFloat(plan.discount_value) / 100);
        } else if (plan.discount_type === "amount") {
          subtotal -= parseFloat(plan.discount_value);
        }
        if (subtotal < 0) subtotal = 0;
      }
    }
    // Always round DOWN to the nearest 5 (matches the old modal exactly).
    return Math.floor(subtotal / 5) * 5;
  }, [
    formData.interior_package_id,
    formData.exterior_package_id,
    formData.vehicle_size,
    formData.add_ons,
    formData.monthly_plan_id,
    packages,
    allAddOns,
    monthlyPlans,
  ]);

  const calculateTotalDurationMinutes = () => {
    let totalMinutes = 0;
    if (formData.interior_package_id) {
      const pkg = packages.find((p) => p.id === formData.interior_package_id);
      if (pkg?.duration_minutes) totalMinutes += parseInt(pkg.duration_minutes, 10);
    }
    if (formData.exterior_package_id) {
      const pkg = packages.find((p) => p.id === formData.exterior_package_id);
      if (pkg?.duration_minutes) totalMinutes += parseInt(pkg.duration_minutes, 10);
    }
    return totalMinutes;
  };

  // Auto-recalc keeps total_price in sync; also refreshes the editable price field.
  useEffect(() => {
    const total = calculateTotalPrice();
    setFormData((prev) => ({ ...prev, total_price: total }));
    setPriceStr(String(total));
  }, [calculateTotalPrice]);

  const handleCustomerSelect = (customerId) => {
    const customer = customers.find((c) => String(c.id) === String(customerId));
    if (customer) {
      setFormData((prev) => ({
        ...prev,
        customer_id: customerId,
        customer_name: customer.name,
        customer_phone: customer.phone,
        customer_email: customer.email || "",
        customer_address: customer.address || "",
      }));
    }
  };

  const toggleAddOn = (id) => {
    setFormData((prev) => ({
      ...prev,
      add_ons: prev.add_ons.includes(id)
        ? prev.add_ons.filter((x) => x !== id)
        : [...prev.add_ons, id],
    }));
  };

  const handlePriceChange = (e) => {
    const v = e.target.value;
    setPriceStr(v);
    setFormData((prev) => ({ ...prev, total_price: parseFloat(v) || 0 }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!formData.interior_package_id && !formData.exterior_package_id) {
        setError("Please select at least one package.");
        setLoading(false);
        return;
      }
      if (useExistingCustomer && !formData.customer_id) {
        setError("Please select a customer.");
        setLoading(false);
        return;
      }
      if (!useExistingCustomer && (!formData.customer_name?.trim() || !formData.customer_phone?.trim())) {
        setError("Customer name and phone are required.");
        setLoading(false);
        return;
      }
      if (!formData.booking_date || !formData.start_time || !formData.end_time) {
        setError("Date, start time and end time are required.");
        setLoading(false);
        return;
      }
      if (formData.service_type === "mobile" && !formData.customer_address?.trim()) {
        setError("Address is required for mobile service.");
        setLoading(false);
        return;
      }

      const totalDurationMinutes = calculateTotalDurationMinutes();
      const subtotal = formData.total_price;

      const bookingData = {
        customer_name: formData.customer_name,
        customer_phone: formData.customer_phone,
        customer_email: formData.customer_email || null,
        customer_address: formData.customer_address?.trim() || null,
        booking_date: formData.booking_date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        service_type: formData.service_type,
        vehicle_size: formData.vehicle_size,
        interior_package_id: formData.interior_package_id || null,
        exterior_package_id: formData.exterior_package_id || null,
        total_duration_minutes: totalDurationMinutes,
        subtotal,
        total_price: formData.total_price,
        status: formData.status,
        monthly_plan_id: formData.monthly_plan_id || null,
        customer_notes: formData.notes || null,
      };

      const { data: bookingInsertData, error: insertError } = await supabase
        .from("bookings")
        .insert([bookingData])
        .select("id")
        .single();
      if (insertError) throw insertError;

      if (formData.add_ons?.length > 0 && bookingInsertData?.id) {
        const addOnRows = formData.add_ons.map((add_on_id) => ({
          booking_id: bookingInsertData.id,
          add_on_id,
        }));
        const { error: addOnInsertError } = await supabase
          .from("booking_add_ons")
          .insert(addOnRows);
        if (addOnInsertError) throw addOnInsertError;
      }

      if (!useExistingCustomer && formData.customer_name && formData.customer_phone) {
        const { data: existingCustomer } = await supabase
          .from("customers")
          .select("id")
          .or(`phone.eq.${formData.customer_phone},email.eq.${formData.customer_email || "none"}`)
          .maybeSingle();
        if (!existingCustomer) {
          await supabase.from("customers").insert([
            {
              name: formData.customer_name,
              phone: formData.customer_phone,
              email: formData.customer_email || null,
              address: formData.customer_address?.trim() || null,
            },
          ]);
        }
      }

      onSave();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const interiorPackages = packages.filter((p) => p.category === "interior");
  const exteriorPackages = packages.filter((p) => p.category === "exterior");

  const pkgOption = (p) => ({ value: p.id, label: `${p.name} — ${money(p.base_price)}` });

  const footer = (
    <>
      <Button type="button" variant="ghost" onClick={onClose}>
        Cancel
      </Button>
      <Button type="submit" form="new-booking-form" disabled={loading}>
        {loading ? "Creating…" : "Create booking"}
      </Button>
    </>
  );

  return (
    <Modal
      open
      onClose={onClose}
      title="New booking"
      description="Create a booking manually"
      size="lg"
      footer={footer}
    >
      <form id="new-booking-form" onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Customer */}
        <section className="space-y-3">
          <div className="flex gap-2">
            <Chip active={useExistingCustomer} onClick={() => setUseExistingCustomer(true)}>
              Existing customer
            </Chip>
            <Chip active={!useExistingCustomer} onClick={() => setUseExistingCustomer(false)}>
              New customer
            </Chip>
          </div>

          {useExistingCustomer ? (
            <Select
              label="Select customer"
              required
              placeholder="Choose a customer…"
              value={formData.customer_id ? String(formData.customer_id) : undefined}
              onChange={handleCustomerSelect}
              options={customers.map((c) => ({
                value: String(c.id),
                label: `${c.name} — ${c.phone}`,
              }))}
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextInput
                label="Customer name"
                required
                placeholder="John Doe"
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
              />
              <TextInput
                label="Phone"
                required
                type="tel"
                placeholder="(555) 123-4567"
                value={formData.customer_phone}
                onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
              />
              <TextInput
                containerClassName="sm:col-span-2"
                label="Email"
                type="email"
                placeholder="john@example.com"
                value={formData.customer_email}
                onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
              />
            </div>
          )}

          {formData.service_type === "mobile" && (
            <TextInput
              label="Address"
              required
              placeholder="123 Main St, City, State"
              value={formData.customer_address}
              onChange={(e) => setFormData({ ...formData, customer_address: e.target.value })}
            />
          )}
        </section>

        {/* Schedule */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <TextInput
            label="Date"
            required
            type="date"
            className="[color-scheme:dark]"
            value={formData.booking_date}
            onChange={(e) => setFormData({ ...formData, booking_date: e.target.value })}
          />
          <TimeInput
            label="Start time"
            required
            className="[color-scheme:dark]"
            value={formData.start_time}
            onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
          />
          <TimeInput
            label="End time"
            required
            className="[color-scheme:dark]"
            value={formData.end_time}
            onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
          />
        </section>

        {/* Service details */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select
            label="Service type"
            required
            value={formData.service_type}
            onChange={(v) => setFormData({ ...formData, service_type: v })}
            options={[
              { value: "mobile", label: "Mobile" },
              { value: "dropoff", label: "Drop-off" },
            ]}
          />
          <Select
            label="Vehicle size"
            required
            value={formData.vehicle_size}
            onChange={(v) => setFormData({ ...formData, vehicle_size: v })}
            options={[
              { value: "small", label: "Small" },
              { value: "medium", label: "Medium (+$15)" },
              { value: "large", label: "Large (+$30)" },
            ]}
          />
          <Select
            label="Interior package"
            placeholder="None"
            value={formData.interior_package_id || NONE}
            onChange={(v) =>
              setFormData({ ...formData, interior_package_id: v === NONE ? "" : v })
            }
            options={[{ value: NONE, label: "None" }, ...interiorPackages.map(pkgOption)]}
          />
          <Select
            label="Exterior package"
            placeholder="None"
            value={formData.exterior_package_id || NONE}
            onChange={(v) =>
              setFormData({ ...formData, exterior_package_id: v === NONE ? "" : v })
            }
            options={[{ value: NONE, label: "None" }, ...exteriorPackages.map(pkgOption)]}
          />
        </section>

        {/* Add-ons */}
        <Field label="Add-ons">
          {loadingAddOns && (
            <p className="text-sm text-muted-foreground">Loading add-ons…</p>
          )}
          {addOnsError && <p className="text-sm text-destructive">{addOnsError}</p>}
          {!loadingAddOns && !addOnsError && (
            <div className="flex flex-wrap gap-2">
              {allAddOns.length === 0 && (
                <p className="text-sm text-muted-foreground">No active add-ons.</p>
              )}
              {allAddOns.map((addon) => (
                <Chip
                  key={addon.id}
                  active={formData.add_ons.includes(addon.id)}
                  onClick={() => toggleAddOn(addon.id)}
                >
                  {addon.name} · {money(addon.price)}
                </Chip>
              ))}
            </div>
          )}
        </Field>

        {/* Monthly plan */}
        <Select
          label="Monthly plan"
          placeholder="None"
          value={formData.monthly_plan_id ? String(formData.monthly_plan_id) : NONE}
          onChange={(v) =>
            setFormData({ ...formData, monthly_plan_id: v === NONE ? "" : v })
          }
          options={[
            { value: NONE, label: "None" },
            ...monthlyPlans.map((plan) => ({
              value: String(plan.id),
              label:
                plan.discount_type === "percentage"
                  ? `${plan.name} (${plan.discount_value}% off)`
                  : plan.discount_type === "amount"
                  ? `${plan.name} (${money(plan.discount_value)} off)`
                  : plan.name,
            })),
          ]}
        />

        {/* Status + price */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select
            label="Status"
            required
            value={formData.status}
            onChange={(v) => setFormData({ ...formData, status: v })}
            options={[
              { value: "confirmed", label: "Confirmed" },
              { value: "completed", label: "Completed" },
              { value: "cancelled", label: "Cancelled" },
            ]}
          />
          <MoneyInput
            label="Total price"
            helper="Auto-calculated — editable"
            required
            value={priceStr}
            onChange={handlePriceChange}
          />
        </section>

        {/* Running total */}
        <div className="flex items-center justify-between rounded-xl border border-accent/40 bg-accent/10 px-4 py-3">
          <span className="text-sm font-medium text-muted-foreground">Booking total</span>
          <span className="text-2xl font-bold text-foreground">
            {money(formData.total_price)}
          </span>
        </div>

        <Textarea
          label="Admin notes"
          rows={3}
          placeholder="Any special notes…"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        />
      </form>
    </Modal>
  );
};

export default NewBookingModal;
