// GalleryEditor — owner-managed photo gallery for the public site. Lists every
// row in public.gallery_images, and lets the owner ADD / EDIT / DELETE images by
// pasting URLs (single photos or before/after pairs), toggle visibility, set a
// caption and sort order, with a live preview of the pasted link(s) before saving.
// Built on the new admin design system (src/admin/ui) — dark theme, mobile-first,
// 44px touch targets. Writes go straight to gallery_images via the supabase client.
import React, { useEffect, useMemo, useState } from "react";
import { Images, Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  Button,
  Card,
  EmptyState,
  Modal,
  SectionHeader,
  Select,
  Switch,
  TextInput,
  Textarea,
} from "@/admin/ui";

// Insert Cloudinary transformation params for compact thumbnails/previews.
// Non-Cloudinary URLs are returned untouched.
const cldOptimize = (url, transform) => {
  if (typeof url !== "string") return url;
  const marker = "/image/upload/";
  const idx = url.indexOf(marker);
  if (!url.includes("res.cloudinary.com") || idx === -1) return url;
  const insertAt = idx + marker.length;
  if (url.slice(insertAt).startsWith(`${transform}/`)) return url;
  return `${url.slice(0, insertAt)}${transform}/${url.slice(insertAt)}`;
};

const THUMB = "c_fill,g_auto,w_200,h_200,q_auto,f_auto";

const KIND_OPTIONS = [
  { value: "single", label: "Single photo" },
  { value: "before_after", label: "Before / after pair" },
];

const emptyForm = () => ({
  kind: "single",
  image_url: "",
  before_url: "",
  after_url: "",
  caption: "",
  sort_order: "",
  is_active: true,
});

// A small framed image preview that shows a fallback when the link is broken/empty.
function Preview({ url, label }) {
  const [ok, setOk] = useState(true);
  useEffect(() => setOk(true), [url]);
  const trimmed = (url || "").trim();
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      )}
      <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
        {trimmed && ok ? (
          <img
            src={cldOptimize(trimmed, "c_limit,w_600,q_auto,f_auto")}
            alt={label || "Preview"}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
            onError={() => setOk(false)}
          />
        ) : (
          <span className="px-2 text-center text-xs text-muted-foreground">
            {trimmed ? "Can't load image" : "Paste a URL to preview"}
          </span>
        )}
      </div>
    </div>
  );
}

export default function GalleryEditor() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editing, setEditing] = useState(null); // null | "new" | row.id
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchRows = async () => {
    setLoading(true);
    setError("");
    const { data, error } = await supabase
      .from("gallery_images")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) setError(error.message);
    else setRows(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchRows();
  }, []);

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const startNew = () => {
    setForm(emptyForm());
    setFormError("");
    setEditing("new");
  };

  const startEdit = (row) => {
    setForm({
      kind: row.kind === "before_after" ? "before_after" : "single",
      image_url: row.image_url || "",
      before_url: row.before_url || "",
      after_url: row.after_url || "",
      caption: row.caption || "",
      sort_order: row.sort_order == null ? "" : String(row.sort_order),
      is_active: row.is_active ?? true,
    });
    setFormError("");
    setEditing(row.id);
  };

  const closeModal = () => {
    setEditing(null);
    setFormError("");
  };

  const buildPayload = () => {
    const isPair = form.kind === "before_after";
    const trimmedSort = String(form.sort_order ?? "").trim();
    return {
      kind: form.kind,
      image_url: isPair ? null : form.image_url.trim() || null,
      before_url: isPair ? form.before_url.trim() || null : null,
      after_url: isPair ? form.after_url.trim() || null : null,
      caption: form.caption.trim() || null,
      sort_order: trimmedSort === "" ? 0 : parseInt(trimmedSort, 10) || 0,
      is_active: !!form.is_active,
    };
  };

  const save = async (e) => {
    e.preventDefault();
    setFormError("");
    // Validate that URL(s) are present for the chosen kind.
    if (form.kind === "before_after") {
      if (!form.before_url.trim() || !form.after_url.trim()) {
        setFormError("Both a Before URL and an After URL are required.");
        return;
      }
    } else if (!form.image_url.trim()) {
      setFormError("An image URL is required.");
      return;
    }

    setSaving(true);
    const payload = buildPayload();
    const result =
      editing === "new"
        ? await supabase.from("gallery_images").insert(payload)
        : await supabase.from("gallery_images").update(payload).eq("id", editing);
    setSaving(false);
    if (result.error) {
      setFormError(result.error.message);
      return;
    }
    closeModal();
    fetchRows();
  };

  const remove = async (row) => {
    if (!window.confirm("Delete this image? This cannot be undone.")) return;
    setSaving(true);
    const { error } = await supabase
      .from("gallery_images")
      .delete()
      .eq("id", row.id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (editing === row.id) closeModal();
    fetchRows();
  };

  const toggleActive = async (row) => {
    // Optimistic flip so the toggle feels instant.
    setRows((rs) =>
      rs.map((r) => (r.id === row.id ? { ...r, is_active: !r.is_active } : r))
    );
    const { error } = await supabase
      .from("gallery_images")
      .update({ is_active: !row.is_active })
      .eq("id", row.id);
    if (error) {
      setError(error.message);
      fetchRows();
    }
  };

  const isPair = form.kind === "before_after";
  const modalTitle = editing === "new" ? "Add photo" : "Edit photo";

  const thumbFor = (row) => {
    const src = row.kind === "before_after" ? row.after_url || row.before_url : row.image_url;
    return src ? cldOptimize(src, THUMB) : null;
  };

  const activeCount = useMemo(
    () => rows.filter((r) => r.is_active).length,
    [rows]
  );

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Gallery"
        subtitle={`Photos shown in the "Our Work" section on the public site`}
        action={
          <Button size="sm" onClick={startNew}>
            <Plus />
            Add
          </Button>
        }
      />

      {rows.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {rows.length} photo{rows.length === 1 ? "" : "s"} · {activeCount} visible
        </p>
      )}

      {error && (
        <Card className="border-destructive/40 text-sm text-destructive">{error}</Card>
      )}

      {loading ? (
        <Card className="text-sm text-muted-foreground">Loading…</Card>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Images}
          title="No photos yet"
          message="Add your first photo by pasting an image URL. You can also add before/after pairs."
          action={
            <Button size="sm" onClick={startNew}>
              <Plus />
              Add photo
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const thumb = thumbFor(row);
            return (
              <Card key={row.id} padded={false} className="overflow-hidden">
                <div className="flex items-center gap-3 p-3">
                  <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={row.caption || "Gallery thumbnail"}
                        width={64}
                        height={64}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Images className="size-6 text-muted-foreground" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {row.kind === "before_after" ? "Before/After" : "Single"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        #{row.sort_order ?? 0}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-foreground">
                      {row.caption || <span className="text-muted-foreground">No caption</span>}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <Switch
                      checked={!!row.is_active}
                      onChange={() => toggleActive(row)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="px-2"
                      onClick={() => startEdit(row)}
                      aria-label="Edit"
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="px-2 text-destructive hover:bg-destructive/10"
                      onClick={() => remove(row)}
                      aria-label="Delete"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={editing !== null}
        onClose={closeModal}
        title={modalTitle}
        description="Paste an image link. It will preview below so you can confirm it works."
        footer={
          <>
            {editing !== "new" && editing !== null && (
              <Button
                variant="danger"
                size="sm"
                className="mr-auto"
                disabled={saving}
                onClick={() => {
                  const row = rows.find((r) => r.id === editing);
                  if (row) remove(row);
                }}
              >
                <Trash2 />
                Delete
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={closeModal} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        <form onSubmit={save} className="space-y-4">
          <Select
            label="Type"
            value={form.kind}
            onChange={(v) => setField("kind", v)}
            options={KIND_OPTIONS}
          />

          {isPair ? (
            <>
              <TextInput
                label="Before URL"
                required
                value={form.before_url}
                onChange={(e) => setField("before_url", e.target.value)}
                placeholder="https://…"
                inputMode="url"
              />
              <TextInput
                label="After URL"
                required
                value={form.after_url}
                onChange={(e) => setField("after_url", e.target.value)}
                placeholder="https://…"
                inputMode="url"
              />
              <div className="grid grid-cols-2 gap-3">
                <Preview url={form.before_url} label="Before" />
                <Preview url={form.after_url} label="After" />
              </div>
            </>
          ) : (
            <>
              <TextInput
                label="Image URL"
                required
                value={form.image_url}
                onChange={(e) => setField("image_url", e.target.value)}
                placeholder="https://…"
                inputMode="url"
              />
              <Preview url={form.image_url} label="Preview" />
            </>
          )}

          <Textarea
            label="Caption"
            value={form.caption}
            onChange={(e) => setField("caption", e.target.value)}
            placeholder="Optional caption shown under before/after pairs"
            rows={2}
          />

          <TextInput
            label="Sort order"
            type="number"
            inputMode="numeric"
            value={form.sort_order}
            onChange={(e) => setField("sort_order", e.target.value)}
            placeholder="0"
            helper="Lower numbers appear first."
          />

          <Switch
            label="Active (visible on the site)"
            checked={form.is_active}
            onChange={(v) => setField("is_active", v)}
          />

          {formError && (
            <p className="text-sm text-destructive">{formError}</p>
          )}
          {/* Enables Enter-to-submit inside the form. */}
          <button type="submit" className="hidden" aria-hidden="true" />
        </form>
      </Modal>
    </div>
  );
}
