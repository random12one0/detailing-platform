import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from '@/hooks/use-toast';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const emptyInfo = {
  brand_name: '',
  phone: '',
  email: '',
  service_area: '',
  dropoff_address: '',
  social_yelp: '',
  social_google: '',
  social_instagram: '',
  site_discount_active: false,
  site_discount_percent: '',
  site_discount_label: '',
};

// Inputs live inside dark (bg-black/30) cards, so pin an explicitly dark field
// surface + white text. Using the theme `bg-background` token here was the bug:
// in a light context it resolved to near-white, hiding white input text.
const inputClass =
  'w-full min-h-[44px] px-3 py-2 rounded-lg bg-slate-900/70 border border-white/15 text-white placeholder-gray-500 [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-accent/60';
const labelClass = 'block mb-1 text-sm font-medium text-gray-300';
const cardClass = 'bg-black/30 backdrop-blur-md rounded-xl border border-white/10 shadow-xl p-5 sm:p-6';

const BusinessSettingsSection = () => {
  const [info, setInfo] = useState(emptyInfo);
  const [hours, setHours] = useState([]); // 7 rows keyed by weekday
  const [loading, setLoading] = useState(true);
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingHours, setSavingHours] = useState(false);
  const [savingDiscount, setSavingDiscount] = useState(false);
  const [error, setError] = useState('');

  // Bulk hours editor: set many days at once instead of one-by-one.
  const [bulkOpen, setBulkOpen] = useState('16:00');
  const [bulkClose, setBulkClose] = useState('18:00');
  const [bulkDays, setBulkDays] = useState([0, 1, 2, 3, 4, 5, 6]);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    setError('');
    const [infoRes, hoursRes] = await Promise.all([
      supabase.from('business_info').select('*').eq('id', 1).single(),
      supabase.from('business_hours').select('*').order('weekday', { ascending: true }),
    ]);

    if (infoRes.error) {
      setError(infoRes.error.message);
    } else if (infoRes.data) {
      setInfo({
        ...emptyInfo,
        ...infoRes.data,
        site_discount_active: !!infoRes.data.site_discount_active,
        site_discount_percent: infoRes.data.site_discount_percent ?? '',
        site_discount_label: infoRes.data.site_discount_label ?? '',
      });
    }

    // Build a full 7-day array, filling any missing weekdays.
    const byWeekday = {};
    (hoursRes.data || []).forEach((r) => {
      byWeekday[r.weekday] = r;
    });
    const fullHours = WEEKDAYS.map((_, i) => {
      const row = byWeekday[i] || {};
      const open = row.open_time || null;
      const close = row.close_time || null;
      return {
        weekday: i,
        open_time: open ? open.slice(0, 5) : '',
        close_time: close ? close.slice(0, 5) : '',
        closed: !open && !close,
      };
    });
    setHours(fullHours);

    if (hoursRes.error) setError((e) => e || hoursRes.error.message);
    setLoading(false);
  };

  const handleInfoChange = (e) => {
    const { name, value, type, checked } = e.target;
    setInfo((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const setHourField = (weekday, field, value) => {
    setHours((rows) =>
      rows.map((r) => (r.weekday === weekday ? { ...r, [field]: value } : r))
    );
  };

  const toggleClosed = (weekday, closed) => {
    setHours((rows) =>
      rows.map((r) =>
        r.weekday === weekday
          ? closed
            ? { ...r, closed: true, open_time: '', close_time: '' }
            : { ...r, closed: false }
          : r
      )
    );
  };

  const saveInfo = async (e) => {
    e.preventDefault();
    setSavingInfo(true);
    setError('');
    const payload = {
      brand_name: info.brand_name?.trim() || null,
      phone: info.phone?.trim() || null,
      email: info.email?.trim() || null,
      service_area: info.service_area?.trim() || null,
      dropoff_address: info.dropoff_address?.trim() || null,
      social_yelp: info.social_yelp?.trim() || null,
      social_google: info.social_google?.trim() || null,
      social_instagram: info.social_instagram?.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('business_info').update(payload).eq('id', 1);
    if (error) {
      setError(error.message);
      toast({ title: 'Save Failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Business Info Saved', description: 'Your business details were updated.', variant: 'success' });
    }
    setSavingInfo(false);
  };

  const toggleBulkDay = (d) =>
    setBulkDays((days) =>
      days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort((a, b) => a - b)
    );

  // Preset day selections for the bulk editor.
  const bulkPresets = {
    all: [0, 1, 2, 3, 4, 5, 6],
    weekdays: [1, 2, 3, 4, 5],
    weekends: [0, 6],
  };
  const selectBulkPreset = (key) => setBulkDays(bulkPresets[key]);

  // Apply the chosen open/close times to every selected day (marks them open).
  const applyBulkTimes = () =>
    setHours((rows) =>
      rows.map((r) =>
        bulkDays.includes(r.weekday)
          ? { ...r, open_time: bulkOpen, close_time: bulkClose, closed: false }
          : r
      )
    );

  // Mark every selected day closed at once.
  const applyBulkClosed = () =>
    setHours((rows) =>
      rows.map((r) =>
        bulkDays.includes(r.weekday) ? { ...r, closed: true, open_time: '', close_time: '' } : r
      )
    );

  const saveHours = async () => {
    setSavingHours(true);
    setError('');
    const rows = hours.map((r) => ({
      weekday: r.weekday,
      open_time: r.closed || !r.open_time ? null : r.open_time,
      close_time: r.closed || !r.close_time ? null : r.close_time,
    }));
    const { error } = await supabase.from('business_hours').upsert(rows, { onConflict: 'weekday' });
    if (error) {
      setError(error.message);
      toast({ title: 'Save Failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Hours Saved', description: 'Business hours were updated.', variant: 'success' });
    }
    setSavingHours(false);
  };

  const saveDiscount = async () => {
    setSavingDiscount(true);
    setError('');
    const pct =
      info.site_discount_percent === '' || info.site_discount_percent === null
        ? null
        : parseFloat(info.site_discount_percent);
    const payload = {
      site_discount_active: !!info.site_discount_active,
      site_discount_percent: pct,
      site_discount_label: info.site_discount_label?.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('business_info').update(payload).eq('id', 1);
    if (error) {
      setError(error.message);
      toast({ title: 'Save Failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Discount Saved', description: 'Site-wide discount setting updated.', variant: 'success' });
    }
    setSavingDiscount(false);
  };

  if (loading) {
    return <div className="text-gray-400">Loading settings...</div>;
  }

  const discountPct = info.site_discount_percent === '' ? 'X' : info.site_discount_percent;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Settings</h2>
        <p className="text-sm text-gray-400 mt-1">Manage your business info, hours, and site-wide discount.</p>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-200">{error}</div>
      )}

      {/* Card 1: Business Info */}
      <form onSubmit={saveInfo} className={cardClass}>
        <h3 className="text-lg font-semibold text-white mb-4">Business Info</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={labelClass}>Brand Name</label>
            <input name="brand_name" value={info.brand_name || ''} onChange={handleInfoChange} className={inputClass} placeholder="e.g. Shine Auto Detailing" />
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <input name="phone" value={info.phone || ''} onChange={handleInfoChange} className={inputClass} placeholder="(555) 123-4567" />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input name="email" type="email" value={info.email || ''} onChange={handleInfoChange} className={inputClass} placeholder="hello@example.com" />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Service Area</label>
            <input name="service_area" value={info.service_area || ''} onChange={handleInfoChange} className={inputClass} placeholder="e.g. Greater Austin Area" />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Drop-off Address</label>
            <input name="dropoff_address" value={info.dropoff_address || ''} onChange={handleInfoChange} className={inputClass} placeholder="123 Main St, City, State" />
          </div>
          <div>
            <label className={labelClass}>Yelp URL</label>
            <input name="social_yelp" value={info.social_yelp || ''} onChange={handleInfoChange} className={inputClass} placeholder="https://yelp.com/..." />
          </div>
          <div>
            <label className={labelClass}>Google URL</label>
            <input name="social_google" value={info.social_google || ''} onChange={handleInfoChange} className={inputClass} placeholder="https://g.page/..." />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Instagram URL</label>
            <input name="social_instagram" value={info.social_instagram || ''} onChange={handleInfoChange} className={inputClass} placeholder="https://instagram.com/..." />
          </div>
        </div>
        <div className="mt-5">
          <button
            type="submit"
            disabled={savingInfo}
            className="w-full sm:w-auto min-h-[44px] px-6 py-2 bg-accent hover:bg-accent/90 text-accent-foreground rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingInfo ? 'Saving...' : 'Save Business Info'}
          </button>
        </div>
      </form>

      {/* Card 2: Hours */}
      <div className={cardClass}>
        <h3 className="text-lg font-semibold text-white mb-1">Business Hours</h3>

        {/* Bulk editor — set many days at once instead of editing each row. */}
        <div className="mb-5 rounded-lg border border-white/10 bg-white/5 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-sm font-semibold text-white">Set multiple days at once</span>
          </div>

          {/* Day selector chips + presets */}
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            {WEEKDAYS.map((name, i) => {
              const on = bulkDays.includes(i);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleBulkDay(i)}
                  aria-pressed={on}
                  className={`min-h-[36px] min-w-[40px] px-2 rounded-md text-xs font-semibold transition-colors ${
                    on
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-slate-900/70 text-gray-300 border border-white/10 hover:text-white'
                  }`}
                >
                  {name.slice(0, 3)}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {[
              { key: 'all', label: 'All days' },
              { key: 'weekdays', label: 'Weekdays' },
              { key: 'weekends', label: 'Weekends' },
            ].map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => selectBulkPreset(p.key)}
                className="min-h-[36px] px-3 rounded-md text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Times + apply actions */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex items-center gap-2">
              <div>
                <label className="block mb-1 text-xs text-gray-400">Open</label>
                <input
                  type="time"
                  value={bulkOpen}
                  onChange={(e) => setBulkOpen(e.target.value)}
                  className={inputClass}
                  aria-label="Bulk open time"
                />
              </div>
              <span className="text-gray-400 pt-5">to</span>
              <div>
                <label className="block mb-1 text-xs text-gray-400">Close</label>
                <input
                  type="time"
                  value={bulkClose}
                  onChange={(e) => setBulkClose(e.target.value)}
                  className={inputClass}
                  aria-label="Bulk close time"
                />
              </div>
            </div>
            <div className="flex flex-1 gap-2">
              <button
                type="button"
                onClick={applyBulkTimes}
                disabled={bulkDays.length === 0}
                className="flex-1 sm:flex-none min-h-[44px] px-4 py-2 bg-accent hover:bg-accent/90 text-accent-foreground rounded-lg font-semibold text-sm transition-colors disabled:opacity-40"
              >
                Apply to {bulkDays.length} day{bulkDays.length === 1 ? '' : 's'}
              </button>
              <button
                type="button"
                onClick={applyBulkClosed}
                disabled={bulkDays.length === 0}
                className="min-h-[44px] px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 rounded-lg text-sm transition-colors disabled:opacity-40"
              >
                Mark closed
              </button>
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Pick days, set the times, then apply. Fine-tune any single day below. Nothing saves
            until you hit “Save Hours”.
          </p>
        </div>

        <div className="space-y-3">
          {hours.map((row) => (
            <div
              key={row.weekday}
              className="flex flex-col sm:flex-row sm:items-center gap-3 py-2 border-b border-white/5 last:border-b-0"
            >
              <div className="sm:w-28 font-medium text-white">{WEEKDAYS[row.weekday]}</div>
              <div className="flex flex-1 items-center gap-2">
                <input
                  type="time"
                  value={row.open_time}
                  disabled={row.closed}
                  onChange={(e) => setHourField(row.weekday, 'open_time', e.target.value)}
                  className={`${inputClass} disabled:opacity-40`}
                  aria-label={`${WEEKDAYS[row.weekday]} open time`}
                />
                <span className="text-gray-400">to</span>
                <input
                  type="time"
                  value={row.close_time}
                  disabled={row.closed}
                  onChange={(e) => setHourField(row.weekday, 'close_time', e.target.value)}
                  className={`${inputClass} disabled:opacity-40`}
                  aria-label={`${WEEKDAYS[row.weekday]} close time`}
                />
              </div>
              <label className="flex items-center gap-2 min-h-[44px] cursor-pointer select-none sm:w-28">
                <input
                  type="checkbox"
                  checked={row.closed}
                  onChange={(e) => toggleClosed(row.weekday, e.target.checked)}
                  className="w-4 h-4 accent-accent"
                />
                <span className="text-sm text-gray-300">Closed</span>
              </label>
            </div>
          ))}
        </div>
        <div className="mt-5">
          <button
            onClick={saveHours}
            disabled={savingHours}
            className="w-full sm:w-auto min-h-[44px] px-6 py-2 bg-accent hover:bg-accent/90 text-accent-foreground rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingHours ? 'Saving...' : 'Save Hours'}
          </button>
        </div>
      </div>

      {/* Card 3: Site-wide Discount */}
      <div className={`${cardClass} ${info.site_discount_active ? 'ring-2 ring-accent/60' : ''}`}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Site-wide Discount</h3>
            <p className="text-sm text-gray-400 mt-1">Apply a promotional discount across the entire site.</p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none shrink-0 min-h-[44px]">
            <span className={`text-xs font-semibold uppercase ${info.site_discount_active ? 'text-accent' : 'text-gray-400'}`}>
              {info.site_discount_active ? 'On' : 'Off'}
            </span>
            <span className="relative inline-flex">
              <input
                type="checkbox"
                name="site_discount_active"
                checked={info.site_discount_active}
                onChange={handleInfoChange}
                className="peer sr-only"
              />
              <span className="w-11 h-6 rounded-full bg-white/10 border border-border peer-checked:bg-accent transition-colors" />
              <span className="absolute left-0.5 top-0.5 w-5 h-5 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
            </span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Discount Percent (%)</label>
            <input
              name="site_discount_percent"
              type="number"
              min="0"
              max="100"
              step="1"
              value={info.site_discount_percent}
              onChange={handleInfoChange}
              className={inputClass}
              placeholder="e.g. 15"
            />
          </div>
          <div>
            <label className={labelClass}>Label (optional)</label>
            <input
              name="site_discount_label"
              value={info.site_discount_label || ''}
              onChange={handleInfoChange}
              className={inputClass}
              placeholder="e.g. Spring Special"
            />
          </div>
        </div>

        <div className="mt-4 rounded-lg bg-accent/10 border border-accent/30 p-3 text-sm text-accent">
          When on, this applies {discountPct}% off across the site.
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Applies automatically to every new booking's price (before promo codes and
          monthly plans) and shows as a sale in the booking widget.
        </p>

        <div className="mt-5">
          <button
            onClick={saveDiscount}
            disabled={savingDiscount}
            className="w-full sm:w-auto min-h-[44px] px-6 py-2 bg-accent hover:bg-accent/90 text-accent-foreground rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingDiscount ? 'Saving...' : 'Save Discount'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BusinessSettingsSection;
