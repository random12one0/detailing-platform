// CustomerModal (admin-native) — drop-in replacement for src/components/CustomerModal.
// SAME props { customer, onClose, onSave } and SAME supabase writes:
//   • edit  → customers.update(formData).eq(id)
//   • add   → duplicate check by email/phone, then customers.insert([formData])
//   • delete→ customers.delete().eq(id)
// plus the same toast notifications. Rebuilt on the admin dark design system:
// responsive Modal (Dialog desktop / Sheet mobile), admin TextInput/Textarea, and
// tel:/sms: quick actions on the phone.
//
// Bugs fixed vs old: hardcoded purple/gray light-theme styling that was unreadable
// on the dark admin shell → admin tokens; add-mode required phone but had no client
// validation → inline validation; no tap-to-call/text on an existing customer's phone.
import React, { useEffect, useState } from "react";
import { Phone, MessageSquare, Mail } from "lucide-react";
import { Button, TextInput, Textarea } from "@/admin/ui";
import { Modal } from "@/admin/ui";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";

export default function CustomerModal({ customer, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || "",
        email: customer.email || "",
        phone: customer.phone || "",
        address: customer.address || "",
        notes: customer.notes || "",
      });
    }
  }, [customer]);

  const set = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));
  const isEdit = Boolean(customer && customer.id);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setError("");

    if (!formData.name.trim()) {
      setError("Please enter the customer's name.");
      return;
    }
    if (!formData.phone.trim()) {
      setError("Please enter a phone number.");
      return;
    }

    setLoading(true);
    try {
      if (isEdit) {
        // Update existing customer — SAME write as old component.
        const { error: updateError } = await supabase
          .from("customers")
          .update(formData)
          .eq("id", customer.id);

        if (updateError) throw updateError;
        toast({
          title: "Customer Updated",
          description: "Customer information updated successfully.",
          variant: "success",
        });
      } else {
        // Prevent duplicate by email or phone — SAME lookup as old component.
        const { data: existing, error: lookupError } = await supabase
          .from("customers")
          .select("id")
          .or(`email.eq.${formData.email},phone.eq.${formData.phone}`)
          .maybeSingle();
        if (lookupError) throw lookupError;
        if (existing) {
          toast({
            title: "Duplicate Customer",
            description: "A customer with this email or phone already exists.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        // Create new customer — SAME insert as old component.
        const { error: insertError } = await supabase
          .from("customers")
          .insert([formData]);

        if (insertError) throw insertError;
        toast({
          title: "Customer Added",
          description: "Customer created successfully.",
          variant: "success",
        });
      }

      onSave();
      onClose();
    } catch (err) {
      setError(err.message);
      toast({
        title: "Error",
        description: err.message || "Failed to save customer.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!isEdit) {
      setError("Cannot delete: Customer not found in database");
      toast({
        title: "Delete Failed",
        description: "Customer not found in database.",
        variant: "destructive",
      });
      return;
    }

    if (
      !window.confirm(
        "Are you sure you want to delete this customer? This action cannot be undone."
      )
    ) {
      return;
    }

    setDeleting(true);
    setError("");
    try {
      const { error: deleteError } = await supabase
        .from("customers")
        .delete()
        .eq("id", customer.id);

      if (deleteError) throw deleteError;

      toast({
        title: "Customer Deleted",
        description: "Customer deleted successfully.",
        variant: "success",
      });
      onSave();
      onClose();
    } catch (err) {
      setError("Failed to delete customer: " + (err.message || "Unknown error"));
      toast({
        title: "Delete Failed",
        description: err.message || "Failed to delete customer.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const busy = loading || deleting;

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? "Edit Customer" : "Add New Customer"}
      description={isEdit ? "Update contact details and notes" : "Create a new customer record"}
      footer={
        <>
          {isEdit && (
            <Button
              variant="danger"
              size="sm"
              onClick={handleDelete}
              disabled={busy}
              className="mr-auto"
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={busy}>
            {loading ? "Saving…" : isEdit ? "Update" : "Add Customer"}
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

        {/* Quick contact actions on an existing customer */}
        {isEdit && formData.phone && (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" size="sm" asChild>
              <a href={`tel:${formData.phone}`}>
                <Phone />
                Call
              </a>
            </Button>
            <Button variant="secondary" size="sm" asChild>
              <a href={`sms:${formData.phone}`}>
                <MessageSquare />
                Text
              </a>
            </Button>
          </div>
        )}

        <TextInput
          label="Full name"
          required
          value={formData.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="John Doe"
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextInput
            label="Phone"
            required
            type="tel"
            value={formData.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="(555) 123-4567"
          />
          <TextInput
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="john@example.com"
          />
        </div>

        <TextInput
          label="Address"
          value={formData.address}
          onChange={(e) => set("address", e.target.value)}
          placeholder="123 Main St, City, State 12345"
        />

        {formData.email && isEdit && (
          <a
            href={`mailto:${formData.email}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
          >
            <Mail className="size-4" />
            {formData.email}
          </a>
        )}

        <Textarea
          label="Notes"
          rows={4}
          value={formData.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Any special notes about this customer…"
        />
      </form>
    </Modal>
  );
}
