import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

const emptyPromo = {
  code: '',
  type: 'percentage',
  value: '',
  expires_at: '',
  usage_limit: '',
  is_active: true,
  never_expires: false,
  unlimited_usage: false,
  once_per_customer: false,
};

const PromoCodesSection = () => {
  const [promoCodes, setPromoCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // null, 'new', or promo id
  const [form, setForm] = useState(emptyPromo);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPromoCodes();
  }, []);

  const fetchPromoCodes = async () => {
    setLoading(true);
    setError('');
    const { data, error } = await supabase.from('promo_codes').select('*').order('created_at', { ascending: false });
    if (error) setError(error.message);
    else setPromoCodes(data || []);
    setLoading(false);
  };

  const startEdit = (promo) => {
    if (promo) {
      setForm({
        ...promo,
        never_expires: !promo.expires_at,
        unlimited_usage: !promo.usage_limit,
      });
      setEditing(promo.id);
    } else {
      setForm(emptyPromo);
      setEditing('new');
    }
    setError('');
  };

  const cancelEdit = () => {
    setEditing(null);
    setForm(emptyPromo);
    setError('');
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({
      ...f,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const savePromo = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const payload = {
      code: form.code.trim(),
      type: form.type,
      value: form.value,
      expires_at: form.never_expires ? null : (form.expires_at ? new Date(form.expires_at).toISOString() : null),
      usage_limit: form.unlimited_usage ? null : (form.usage_limit ? parseInt(form.usage_limit) : null),
      is_active: form.is_active,
      once_per_customer: !!form.once_per_customer,
    };
    let result;
    if (editing === 'new') {
      result = await supabase.from('promo_codes').insert([payload]);
    } else {
      result = await supabase.from('promo_codes').update(payload).eq('id', editing);
    }
    if (result.error) setError(result.error.message);
    else {
      fetchPromoCodes();
      cancelEdit();
    }
    setSaving(false);
  };

  const deletePromo = async (id) => {
    if (!window.confirm('Delete this promo code?')) return;
    setSaving(true);
    const { error } = await supabase.from('promo_codes').delete().eq('id', id);
    if (error) setError(error.message);
    else fetchPromoCodes();
    setSaving(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-white">Promo Codes</h2>
        <button
          className="px-4 py-2 bg-accent hover:bg-accent/90 text-accent-foreground rounded-lg shadow-lg font-semibold"
          onClick={() => startEdit(null)}
        >
          + New Promo Code
        </button>
      </div>
      {error && <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-200 mb-2">{error}</div>}
      {loading ? (
        <div className="text-gray-400">Loading...</div>
      ) : promoCodes.length === 0 ? (
        <div className="text-gray-400 text-center py-8">No promo codes found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {promoCodes.map((promo) => (
            <div key={promo.id} className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 shadow-xl p-6 flex flex-col gap-2 relative">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-lg font-bold text-accent">{promo.code}</span>
                <span className={`px-2 py-1 rounded text-xs font-semibold uppercase border ${promo.is_active ? 'bg-green-500/20 text-green-400 border-green-500/50' : 'bg-gray-500/20 text-gray-400 border-gray-500/50'}`}>{promo.is_active ? 'Active' : 'Inactive'}</span>
              </div>
              <div className="flex flex-wrap gap-2 text-sm text-gray-300">
                <span className="bg-white/10 px-2 py-1 rounded">{promo.type === 'percentage' ? `${promo.value}% off` : `$${promo.value} off`}</span>
                <span className="bg-white/10 px-2 py-1 rounded">{promo.expires_at ? `Expires: ${promo.expires_at.split('T')[0]}` : 'Never Expires'}</span>
                <span className="bg-white/10 px-2 py-1 rounded">{promo.usage_limit ? `Limit: ${promo.usage_limit}` : 'Unlimited Usage'}</span>
                <span className="bg-white/10 px-2 py-1 rounded">Used: {promo.times_used || 0}</span>
                {promo.once_per_customer && (
                  <span className="bg-accent/20 text-accent px-2 py-1 rounded border border-accent/40">One per customer</span>
                )}
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  onClick={() => startEdit(promo)}
                  disabled={saving}
                >Edit</button>
                <button
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                  onClick={() => deletePromo(promo.id)}
                  disabled={saving}
                >Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for Create/Edit */}
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
              onClick={e => e.stopPropagation()}
            >
              <form onSubmit={savePromo} className="p-4 space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white">{editing === 'new' ? 'New Promo Code' : 'Edit Promo Code'}</h3>
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
                {/* Form Fields */}
                <div className="space-y-4">
                  <div>
                    <label className="block mb-1 text-gray-300">Code</label>
                    <input
                      name="code"
                      value={form.code}
                      onChange={handleChange}
                      className="w-full px-3 py-2 rounded bg-gray-900 border border-gray-700 text-white"
                      required
                      disabled={editing !== 'new'}
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-gray-300">Type</label>
                    <select
                      name="type"
                      value={form.type}
                      onChange={handleChange}
                      className="w-full px-3 py-2 rounded bg-gray-900 border border-gray-700 text-white"
                      required
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="amount">Fixed Amount ($)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1 text-gray-300">Value</label>
                    <input
                      name="value"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={form.value}
                      onChange={handleChange}
                      className="w-full px-3 py-2 rounded bg-gray-900 border border-gray-700 text-white"
                      required
                    />
                  </div>
                  <div className="flex gap-4 items-end">
                    <div className="flex-1">
                      <label className="block mb-1 text-gray-300">Expires At</label>
                      <input
                        name="expires_at"
                        type="date"
                        value={form.expires_at}
                        onChange={handleChange}
                        className="w-full px-3 py-2 rounded bg-gray-900 border border-gray-700 text-white"
                        disabled={form.never_expires}
                      />
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        type="checkbox"
                        id="never_expires"
                        checked={!!form.never_expires}
                        onChange={e => setForm(f => ({ ...f, never_expires: e.target.checked, expires_at: e.target.checked ? '' : f.expires_at }))}
                      />
                      <label htmlFor="never_expires" className="text-sm text-gray-300">Never Expires</label>
                    </div>
                  </div>
                  <div className="flex gap-4 items-end">
                    <div className="flex-1">
                      <label className="block mb-1 text-gray-300">Usage Limit</label>
                      <input
                        name="usage_limit"
                        type="number"
                        min="1"
                        value={form.usage_limit}
                        onChange={handleChange}
                        className="w-full px-3 py-2 rounded bg-gray-900 border border-gray-700 text-white"
                        disabled={form.unlimited_usage}
                      />
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        type="checkbox"
                        id="unlimited_usage"
                        checked={!!form.unlimited_usage}
                        onChange={e => setForm(f => ({ ...f, unlimited_usage: e.target.checked, usage_limit: e.target.checked ? '' : f.usage_limit }))}
                      />
                      <label htmlFor="unlimited_usage" className="text-sm text-gray-300">Unlimited Usage</label>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      name="is_active"
                      type="checkbox"
                      checked={form.is_active}
                      onChange={handleChange}
                      className="w-4 h-4"
                    />
                    <label className="text-gray-300">Active</label>
                  </div>
                  <div className="flex items-start gap-2">
                    <input
                      name="once_per_customer"
                      id="once_per_customer"
                      type="checkbox"
                      checked={!!form.once_per_customer}
                      onChange={handleChange}
                      className="w-4 h-4 mt-1"
                    />
                    <label htmlFor="once_per_customer" className="text-gray-300">
                      One use per customer
                      <span className="block text-xs text-gray-500">
                        Unlimited total uses, but each customer (matched by email or phone) can only redeem it once.
                      </span>
                    </label>
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
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
                    className="flex-1 px-6 py-3 bg-accent hover:bg-accent/90 text-accent-foreground rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PromoCodesSection;
