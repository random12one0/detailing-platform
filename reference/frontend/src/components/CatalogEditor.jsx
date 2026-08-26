import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * CatalogEditor
 * A reusable, mobile-first card editor for a Supabase catalog table
 * (packages / add_ons / monthly_plans). Renders each row as a glass card
 * with key facts; tapping a card or the "+ Add" button opens a typed edit
 * form in a modal. On save it sends ONLY the fields declared in `config.fields`
 * (never derived columns) and validates ONLY fields flagged `required`.
 *
 * config = {
 *   table, title, subtitle, itemLabel,
 *   orderBy: { column, ascending },
 *   priceField: { key, type: 'money'|'discount', valueKey?, typeKey? },
 *   badgeKeys: [key, ...],
 *   fields: [{ key, label, type, required, options, prefix, suffix, placeholder, help, default }]
 * }
 * field.type: 'text' | 'textarea' | 'money' | 'number' | 'select' | 'switch' | 'features'
 */

const NUMBER_TYPES = new Set(['money', 'number']);

function buildEmpty(config) {
  const empty = {};
  for (const f of config.fields) {
    if (f.type === 'switch') empty[f.key] = f.default ?? false;
    else if (f.type === 'features') empty[f.key] = [];
    else empty[f.key] = '';
  }
  return empty;
}

function toFormState(config, row) {
  const state = {};
  for (const f of config.fields) {
    const val = row[f.key];
    if (f.type === 'switch') state[f.key] = val ?? f.default ?? false;
    else if (f.type === 'features') state[f.key] = Array.isArray(val) ? val : [];
    else state[f.key] = val === null || val === undefined ? '' : String(val);
  }
  return state;
}

function buildPayload(config, form) {
  const payload = {};
  for (const f of config.fields) {
    const raw = form[f.key];
    if (f.type === 'switch') {
      payload[f.key] = !!raw;
    } else if (NUMBER_TYPES.has(f.type)) {
      const trimmed = String(raw ?? '').trim();
      if (trimmed === '') {
        payload[f.key] = null;
      } else {
        payload[f.key] = f.type === 'number' ? parseInt(trimmed, 10) : parseFloat(trimmed);
        if (Number.isNaN(payload[f.key])) payload[f.key] = null;
      }
    } else if (f.type === 'features') {
      payload[f.key] = (Array.isArray(raw) ? raw : [])
        .map((s) => String(s).trim())
        .filter((s) => s.length > 0);
    } else {
      const trimmed = String(raw ?? '').trim();
      payload[f.key] = trimmed === '' ? null : trimmed;
    }
  }
  return payload;
}

function formatMoney(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  if (Number.isNaN(n)) return null;
  return `$${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)}`;
}

const badgeClass =
  'px-2 py-1 rounded text-xs font-semibold uppercase tracking-wide bg-accent/15 text-accent border border-accent/30';

// ---------------------------------------------------------------------------
// Features editor: add / remove / reorder a list of string bullet lines
// ---------------------------------------------------------------------------
const FeaturesEditor = ({ value, onChange, label }) => {
  const items = Array.isArray(value) ? value : [];

  const update = (idx, text) => {
    const next = items.slice();
    next[idx] = text;
    onChange(next);
  };
  const add = () => onChange([...items, '']);
  const remove = (idx) => onChange(items.filter((_, i) => i !== idx));
  const move = (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= items.length) return;
    const next = items.slice();
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  };

  return (
    <div>
      <label className="block mb-2 text-sm text-gray-300">{label}</label>
      <div className="space-y-2">
        {items.length === 0 && (
          <p className="text-xs text-gray-500">No features yet. Add bullet lines shown on the public site.</p>
        )}
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="text-accent select-none">•</span>
            <input
              value={item}
              onChange={(e) => update(idx, e.target.value)}
              placeholder="Feature line"
              className="flex-1 min-h-[44px] px-3 py-2 rounded-lg bg-black/40 border border-border text-white placeholder:text-gray-500 focus:outline-none focus:border-accent"
            />
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => move(idx, -1)}
                disabled={idx === 0}
                aria-label="Move feature up"
                className="px-2 h-[22px] flex items-center justify-center text-gray-400 hover:text-white disabled:opacity-30"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => move(idx, 1)}
                disabled={idx === items.length - 1}
                aria-label="Move feature down"
                className="px-2 h-[22px] flex items-center justify-center text-gray-400 hover:text-white disabled:opacity-30"
              >
                ▼
              </button>
            </div>
            <button
              type="button"
              onClick={() => remove(idx)}
              aria-label="Remove feature"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={add}
        className="mt-3 min-h-[44px] px-4 py-2 w-full sm:w-auto bg-white/5 hover:bg-white/10 border border-border text-white rounded-lg text-sm font-medium transition-colors"
      >
        + Add feature
      </button>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Single field renderer
// ---------------------------------------------------------------------------
const Field = ({ field, value, onChange }) => {
  const baseInput =
    'w-full min-h-[44px] px-3 py-2 rounded-lg bg-black/40 border border-border text-white placeholder:text-gray-500 focus:outline-none focus:border-accent';

  if (field.type === 'switch') {
    return (
      <label className="flex items-center justify-between gap-3 min-h-[44px] px-3 py-2 rounded-lg bg-black/20 border border-border cursor-pointer">
        <span className="text-sm text-gray-200">
          {field.label}
          {field.required && <span className="text-accent"> *</span>}
        </span>
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          className="w-6 h-6 accent-accent cursor-pointer"
        />
      </label>
    );
  }

  const labelEl = (
    <label className="block mb-1.5 text-sm text-gray-300">
      {field.label}
      {field.required && <span className="text-accent"> *</span>}
    </label>
  );

  if (field.type === 'features') {
    return <FeaturesEditor value={value} onChange={onChange} label={field.label} />;
  }

  if (field.type === 'textarea') {
    return (
      <div>
        {labelEl}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={field.key === 'notes' ? 2 : 3}
          className={`${baseInput} min-h-[72px] resize-y`}
        />
      </div>
    );
  }

  if (field.type === 'select') {
    return (
      <div>
        {labelEl}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={baseInput}
        >
          <option value="">Select {field.label.toLowerCase()}…</option>
          {field.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // money / number / text
  const isNumeric = NUMBER_TYPES.has(field.type);
  return (
    <div>
      {labelEl}
      <div className="relative">
        {field.prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            {field.prefix}
          </span>
        )}
        <input
          type={isNumeric ? 'number' : 'text'}
          inputMode={isNumeric ? 'decimal' : undefined}
          min={isNumeric ? '0' : undefined}
          step={field.type === 'money' ? '0.01' : field.type === 'number' ? '1' : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={`${baseInput} ${field.prefix ? 'pl-7' : ''} ${field.suffix ? 'pr-14' : ''}`}
        />
        {field.suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
            {field.suffix}
          </span>
        )}
      </div>
      {field.help && <p className="mt-1 text-xs text-gray-500">{field.help}</p>}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Card summary
// ---------------------------------------------------------------------------
function priceLabel(config, row) {
  const p = config.priceField;
  if (!p) return null;
  if (p.type === 'discount') {
    const val = row[p.valueKey];
    if (val === null || val === undefined || val === '') return null;
    return row[p.typeKey] === 'percentage' ? `${val}% off` : `${formatMoney(val)} off`;
  }
  return formatMoney(row[p.key]);
}

const CatalogEditor = ({ config }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | id
  const [form, setForm] = useState(() => buildEmpty(config));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.table]);

  const fetchRows = async () => {
    setLoading(true);
    setError('');
    let q = supabase.from(config.table).select('*');
    if (config.orderBy) q = q.order(config.orderBy.column, { ascending: config.orderBy.ascending });
    const { data, error } = await q;
    if (error) setError(error.message);
    else setRows(data || []);
    setLoading(false);
  };

  const startNew = () => {
    setForm(buildEmpty(config));
    setEditing('new');
    setFormError('');
  };
  const startEdit = (row) => {
    setForm(toFormState(config, row));
    setEditing(row.id);
    setFormError('');
  };
  const cancel = () => {
    setEditing(null);
    setFormError('');
  };

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const save = async (e) => {
    e.preventDefault();
    setFormError('');
    // Validate ONLY required fields
    for (const f of config.fields) {
      if (!f.required) continue;
      const v = form[f.key];
      if (NUMBER_TYPES.has(f.type)) {
        if (String(v ?? '').trim() === '' || Number.isNaN(Number(v))) {
          setFormError(`${f.label} is required.`);
          return;
        }
      } else if (String(v ?? '').trim() === '') {
        setFormError(`${f.label} is required.`);
        return;
      }
    }
    setSaving(true);
    const payload = buildPayload(config, form);
    let result;
    if (editing === 'new') result = await supabase.from(config.table).insert(payload);
    else result = await supabase.from(config.table).update(payload).eq('id', editing);
    if (result.error) {
      setFormError(result.error.message);
      setSaving(false);
      return;
    }
    setSaving(false);
    setEditing(null);
    fetchRows();
  };

  const titleKey = config.titleField || 'name';
  const subtitleKey = config.subtitleField || 'description';

  const remove = async (row) => {
    if (!window.confirm(`Delete "${row[titleKey] || 'this item'}"? This cannot be undone.`)) return;
    setSaving(true);
    const { error } = await supabase.from(config.table).delete().eq('id', row.id);
    setSaving(false);
    if (error) setError(error.message);
    else fetchRows();
  };

  return (
    <section className="mb-12">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h2 className="text-2xl font-bold text-white">{config.title}</h2>
        <button
          onClick={startNew}
          className="min-h-[44px] px-4 py-2 bg-accent hover:bg-accent/90 text-accent-foreground rounded-lg shadow-lg font-semibold transition-colors"
        >
          ＋ Add {config.itemLabel}
        </button>
      </div>
      {config.subtitle && <p className="text-sm text-gray-400 mb-4">{config.subtitle}</p>}

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-200 mb-4 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="text-gray-400">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 p-8 text-center text-gray-400">
          No {config.itemLabel.toLowerCase()}s yet. Tap “＋ Add {config.itemLabel}” to create one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {rows.map((row) => {
            const price = priceLabel(config, row);
            const badges = (config.badgeKeys || [])
              .map((k) => row[k])
              .filter((v) => v !== null && v !== undefined && v !== '');
            const featureField = config.fields.find((f) => f.type === 'features');
            const featureCount = featureField && Array.isArray(row[featureField.key]) ? row[featureField.key].length : 0;
            const isActive = 'is_active' in row ? row.is_active : null;
            return (
              <button
                key={row.id}
                type="button"
                onClick={() => startEdit(row)}
                className="text-left bg-black/30 backdrop-blur-md rounded-xl border border-white/10 shadow-xl p-5 flex flex-col gap-3 hover:border-accent/40 hover:bg-black/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-lg font-semibold text-white leading-tight">{row[titleKey] || 'Untitled'}</h3>
                  {isActive !== null && (
                    <span
                      className={`shrink-0 px-2 py-1 rounded text-xs font-semibold uppercase border ${
                        isActive
                          ? 'bg-green-500/20 text-green-400 border-green-500/50'
                          : 'bg-gray-500/20 text-gray-400 border-gray-500/50'
                      }`}
                    >
                      {isActive ? 'Active' : 'Inactive'}
                    </span>
                  )}
                </div>

                {row[subtitleKey] && (
                  <p className="text-sm text-gray-400 line-clamp-2">{row[subtitleKey]}</p>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  {price && <span className="text-accent font-bold text-base">{price}</span>}
                  {badges.map((b) => (
                    <span key={b} className={badgeClass}>
                      {b}
                    </span>
                  ))}
                  {row.duration_minutes != null && row.duration_minutes !== '' && (
                    <span className="text-xs text-gray-300 bg-white/10 px-2 py-1 rounded">
                      {row.duration_minutes} min
                    </span>
                  )}
                  {featureField && (
                    <span className="text-xs text-gray-400 bg-white/5 px-2 py-1 rounded">
                      {featureCount} feature{featureCount === 1 ? '' : 's'}
                    </span>
                  )}
                </div>

                <span className="mt-auto text-xs text-accent font-medium">Tap to edit →</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Edit / create modal */}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-end sm:items-start justify-center p-0 sm:p-4 overflow-y-auto"
            onClick={cancel}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="bg-gray-900 w-full max-w-lg border border-white/10 shadow-2xl rounded-t-2xl sm:rounded-2xl sm:my-8 max-h-[92vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-white/10 sticky top-0 bg-gray-900 rounded-t-2xl z-10">
                <h3 className="text-lg font-bold text-white">
                  {editing === 'new' ? `New ${config.itemLabel}` : `Edit ${config.itemLabel}`}
                </h3>
                <button
                  type="button"
                  onClick={cancel}
                  aria-label="Close"
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-white/10 rounded-lg text-gray-400 hover:text-white"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={save} className="flex-1 overflow-y-auto p-4 space-y-4">
                {config.fields.map((field) => (
                  <Field key={field.key} field={field} value={form[field.key]} onChange={(v) => setField(field.key, v)} />
                ))}

                {formError && (
                  <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-200 text-sm">
                    {formError}
                  </div>
                )}

                <div className="flex flex-wrap gap-3 pt-2">
                  {editing !== 'new' && (
                    <button
                      type="button"
                      onClick={() => {
                        const row = rows.find((r) => r.id === editing);
                        if (row) remove(row);
                      }}
                      disabled={saving}
                      className="min-h-[44px] px-4 py-2 bg-red-600/90 hover:bg-red-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      Delete
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={cancel}
                    className="flex-1 min-h-[44px] px-4 py-2 bg-white/5 hover:bg-white/10 border border-border text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 min-h-[44px] px-4 py-2 bg-accent hover:bg-accent/90 text-accent-foreground rounded-lg font-semibold transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default CatalogEditor;
