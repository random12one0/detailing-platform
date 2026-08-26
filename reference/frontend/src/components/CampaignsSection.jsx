// CampaignsSection — trackable short links for offline ads / QR codes (e.g. a
// flyer at the golf course pointing at andrewsdetail.com/golf). Create a link,
// optionally auto-apply a promo code, and see visits / unique visitors /
// bookings / conversion / revenue per campaign — plus a site-wide organic card
// so the same visitor-tracking pipeline covers "how many people hit the main
// site and how many of them booked" too.
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { copyText } from '../lib/messages';

const SITE_ORIGIN = 'https://andrewsdetail.com';
const RESERVED_SLUGS = new Set(['admin', 'admin-beta', 'reset-password', 'booking', 'golf-course']);

const emptyForm = { slug: '', name: '', promo_code: '' };

const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const money = (n) => `$${(Math.round((Number(n) || 0) * 100) / 100).toFixed(2)}`;

const CampaignsSection = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [visits, setVisits] = useState([]); // { campaign_id, visitor_id }
  const [bookings, setBookings] = useState([]); // { campaign_id, total_price, final_amount, status }
  const [promoCodes, setPromoCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | campaign id
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [qrFor, setQrFor] = useState(null); // campaign shown in the QR modal
  const [copiedSlug, setCopiedSlug] = useState('');

  const fetchAll = async () => {
    setLoading(true);
    setError('');
    const [campRes, visitRes, bookRes, promoRes] = await Promise.all([
      supabase.from('campaigns').select('*').order('created_at', { ascending: false }),
      supabase.from('campaign_visits').select('campaign_id, visitor_id'),
      supabase.from('bookings').select('campaign_id, total_price, final_amount, status'),
      supabase.from('promo_codes').select('code').eq('is_active', true).order('code'),
    ]);
    if (campRes.error) setError(campRes.error.message);
    setCampaigns(campRes.data || []);
    setVisits(visitRes.data || []);
    setBookings(bookRes.data || []);
    setPromoCodes(promoRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // Per-campaign metrics, plus an "organic" bucket (campaign_id null) for the
  // site-wide card. Computed client-side to match how the rest of the admin
  // aggregates (revenue/customers dashboards do the same).
  const metricsFor = (campaignId) => {
    const campVisits = visits.filter((v) => v.campaign_id === campaignId);
    const uniqueVisitors = new Set(campVisits.map((v) => v.visitor_id)).size;
    const campBookings = bookings.filter(
      (b) => b.campaign_id === campaignId && b.status !== 'cancelled'
    );
    const revenue = campBookings.reduce(
      (s, b) => s + (parseFloat(b.final_amount ?? b.total_price) || 0),
      0
    );
    const conversionRate = uniqueVisitors > 0 ? (campBookings.length / uniqueVisitors) * 100 : 0;
    return { visits: campVisits.length, uniqueVisitors, bookings: campBookings.length, revenue, conversionRate };
  };

  const organic = useMemo(() => metricsFor(null), [visits, bookings]); // eslint-disable-line react-hooks/exhaustive-deps

  const startEdit = (campaign) => {
    if (campaign) {
      setForm({ slug: campaign.slug, name: campaign.name, promo_code: campaign.promo_code || '' });
      setEditing(campaign.id);
    } else {
      setForm(emptyForm);
      setEditing('new');
    }
    setError('');
  };
  const cancelEdit = () => {
    setEditing(null);
    setForm(emptyForm);
    setError('');
  };

  const saveCampaign = async (e) => {
    e.preventDefault();
    const slug = slugify(form.slug);
    if (!slug) return setError('Slug is required.');
    if (RESERVED_SLUGS.has(slug)) return setError(`"${slug}" is reserved — pick a different link.`);
    const collision = campaigns.find((c) => c.slug === slug && c.id !== editing);
    if (collision) return setError(`"${slug}" is already used by another campaign.`);
    if (!form.name.trim()) return setError('Give the campaign a name (e.g. "Golf course flyer").');

    setSaving(true);
    setError('');
    const payload = {
      slug,
      name: form.name.trim(),
      promo_code: form.promo_code || null,
    };
    const result =
      editing === 'new'
        ? await supabase.from('campaigns').insert([payload])
        : await supabase.from('campaigns').update(payload).eq('id', editing);
    if (result.error) setError(result.error.message);
    else {
      await fetchAll();
      cancelEdit();
    }
    setSaving(false);
  };

  const toggleActive = async (campaign) => {
    const { error: err } = await supabase
      .from('campaigns')
      .update({ is_active: !campaign.is_active })
      .eq('id', campaign.id);
    if (err) setError(err.message);
    else fetchAll();
  };

  const deleteCampaign = async (id) => {
    if (!window.confirm('Delete this campaign link? Its visit/booking history stays, but the link stops working.')) return;
    const { error: err } = await supabase.from('campaigns').delete().eq('id', id);
    if (err) setError(err.message);
    else fetchAll();
  };

  const copyLink = async (slug) => {
    const ok = await copyText(`${SITE_ORIGIN}/${slug}`);
    if (ok) {
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug(''), 1500);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-white">Campaign Links</h2>
        <button
          className="px-4 py-2 bg-accent hover:bg-accent/90 text-accent-foreground rounded-lg shadow-lg font-semibold"
          onClick={() => startEdit(null)}
        >
          + New Link
        </button>
      </div>
      <p className="text-sm text-gray-400 mb-4">
        Short trackable links for QR codes, flyers, or ads — e.g. put{' '}
        <span className="font-mono text-accent">andrewsdetail.com/golf</span> on a sign at the golf course.
        Every scan is logged, and if that visitor books (even days later, even after closing the browser),
        it's counted as a conversion for that link.
      </p>
      {error && <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-200 mb-4">{error}</div>}

      {/* Site-wide organic traffic — same pipeline, no campaign slug */}
      <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 shadow-xl p-5 mb-6">
        <div className="text-sm font-semibold text-gray-300 mb-3">Main site (no campaign link)</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-gray-400 text-xs">Visits</div>
            <div className="text-xl font-bold text-white">{organic.visits}</div>
          </div>
          <div>
            <div className="text-gray-400 text-xs">Unique visitors</div>
            <div className="text-xl font-bold text-white">{organic.uniqueVisitors}</div>
          </div>
          <div>
            <div className="text-gray-400 text-xs">Bookings</div>
            <div className="text-xl font-bold text-white">{organic.bookings}</div>
          </div>
          <div>
            <div className="text-gray-400 text-xs">Conversion</div>
            <div className="text-xl font-bold text-emerald-400">{organic.conversionRate.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-400">Loading...</div>
      ) : campaigns.length === 0 ? (
        <div className="text-gray-400 text-center py-8">No campaign links yet — create one above.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {campaigns.map((c) => {
            const m = metricsFor(c.id);
            return (
              <div
                key={c.id}
                className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 shadow-xl p-5 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-white truncate">{c.name}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono text-accent text-sm truncate">{SITE_ORIGIN.replace('https://', '')}/{c.slug}</span>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 px-2 py-1 rounded text-xs font-semibold uppercase border ${
                      c.is_active
                        ? 'bg-green-500/20 text-green-400 border-green-500/50'
                        : 'bg-gray-500/20 text-gray-400 border-gray-500/50'
                    }`}
                  >
                    {c.is_active ? 'Active' : 'Paused'}
                  </span>
                </div>

                {c.promo_code && (
                  <div className="text-xs">
                    <span className="bg-white/10 px-2 py-1 rounded text-gray-300">
                      Auto-applies <span className="font-mono text-accent">{c.promo_code}</span>
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-4 gap-2 text-center border-t border-white/10 pt-3">
                  <div>
                    <div className="text-base font-bold text-white">{m.visits}</div>
                    <div className="text-[10px] text-gray-400 uppercase">Visits</div>
                  </div>
                  <div>
                    <div className="text-base font-bold text-white">{m.uniqueVisitors}</div>
                    <div className="text-[10px] text-gray-400 uppercase">Visitors</div>
                  </div>
                  <div>
                    <div className="text-base font-bold text-white">{m.bookings}</div>
                    <div className="text-[10px] text-gray-400 uppercase">Booked</div>
                  </div>
                  <div>
                    <div className="text-base font-bold text-emerald-400">{m.conversionRate.toFixed(0)}%</div>
                    <div className="text-[10px] text-gray-400 uppercase">Conv.</div>
                  </div>
                </div>
                {m.revenue > 0 && (
                  <div className="text-xs text-gray-400 text-center -mt-1">{money(m.revenue)} attributed revenue</div>
                )}

                <div className="flex gap-2 flex-wrap">
                  <button
                    className="flex-1 min-w-[80px] px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg text-sm font-medium transition-colors"
                    onClick={() => copyLink(c.slug)}
                  >
                    {copiedSlug === c.slug ? 'Copied!' : 'Copy link'}
                  </button>
                  <button
                    className="flex-1 min-w-[80px] px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg text-sm font-medium transition-colors"
                    onClick={() => setQrFor(c)}
                  >
                    QR code
                  </button>
                  <button
                    className="flex-1 min-w-[80px] px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    onClick={() => startEdit(c)}
                  >
                    Edit
                  </button>
                  <button
                    className="flex-1 min-w-[80px] px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg text-sm font-medium transition-colors"
                    onClick={() => toggleActive(c)}
                  >
                    {c.is_active ? 'Pause' : 'Resume'}
                  </button>
                  <button
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                    onClick={() => deleteCampaign(c.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / edit modal */}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-md flex items-start justify-center p-2 sm:p-4 overflow-y-auto"
            style={{ minHeight: '100vh' }}
            onClick={cancelEdit}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gray-900 rounded-xl p-4 w-full max-w-lg border border-white/10 shadow-xl flex flex-col mt-8 mb-8"
              onClick={(e) => e.stopPropagation()}
            >
              <form onSubmit={saveCampaign} className="p-4 space-y-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold text-white">
                    {editing === 'new' ? 'New Campaign Link' : 'Edit Campaign Link'}
                  </h3>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div>
                  <label className="block mb-1 text-gray-300">Name</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2 rounded bg-gray-900 border border-gray-700 text-white"
                    placeholder="e.g. Golf course flyer"
                    required
                  />
                </div>

                <div>
                  <label className="block mb-1 text-gray-300">Link</label>
                  <div className="flex items-center gap-1 rounded bg-gray-900 border border-gray-700 px-3 py-2 focus-within:border-accent">
                    <span className="text-gray-500 text-sm whitespace-nowrap">andrewsdetail.com/</span>
                    <input
                      value={form.slug}
                      onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
                      className="flex-1 min-w-0 bg-transparent text-white outline-none"
                      placeholder="golf"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Lowercase letters, numbers and hyphens only.</p>
                </div>

                <div>
                  <label className="block mb-1 text-gray-300">Auto-apply promo code (optional)</label>
                  <select
                    value={form.promo_code}
                    onChange={(e) => setForm((f) => ({ ...f, promo_code: e.target.value }))}
                    className="w-full px-3 py-2 rounded bg-gray-900 border border-gray-700 text-white"
                  >
                    <option value="">None — just track visits</option>
                    {promoCodes.map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.code}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Manage codes under Promo Codes. A visitor who lands via this link gets it applied automatically.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-6 py-3 bg-accent hover:bg-accent/90 text-accent-foreground rounded-lg transition-colors disabled:opacity-50 font-medium"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR code modal */}
      <AnimatePresence>
        {qrFor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setQrFor(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gray-900 rounded-xl p-6 max-w-xs w-full border border-white/10 shadow-xl text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-white mb-1">{qrFor.name}</h3>
              <p className="font-mono text-accent text-sm mb-4">
                {SITE_ORIGIN.replace('https://', '')}/{qrFor.slug}
              </p>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(
                  `${SITE_ORIGIN}/${qrFor.slug}`
                )}`}
                alt={`QR code for ${qrFor.slug}`}
                className="rounded-lg mx-auto bg-white p-2"
                width={240}
                height={240}
              />
              <p className="text-xs text-gray-500 mt-3">Long-press or right-click the code to save it for print.</p>
              <button
                type="button"
                onClick={() => setQrFor(null)}
                className="mt-4 w-full px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CampaignsSection;
