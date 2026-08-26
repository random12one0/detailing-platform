import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { money } from '../lib/format';
import {
  UPSELL_CATS,
  UPSELL_KEYS,
  deriveBookingExtras,
  groupLineItemsByBooking,
} from '../lib/lineItems';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

// ---- shared helpers (dark data-viz palette; theme-consistent with the app) ----
const compactMoney = (n) => {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(1)}k`;
  return `$${Math.round(v)}`;
};

// Dark categorical slots (stepped for a dark surface) mapped to the app accents.
const VIZ = {
  revenue: '#34d399', // emerald hero
  grid: '#2c2c2a',
  axis: '#898781',
};
// UPSELL_CATS / UPSELL_KEYS now come from lib/lineItems (shared with the
// legacy-jsonb decoder) so the category taxonomy has a single definition.

const RevenueChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-black/80 backdrop-blur-md border border-white/10 rounded-lg px-3 py-2 shadow-xl">
      <div className="text-gray-300 text-xs mb-0.5">{label}</div>
      <div className="text-emerald-400 font-semibold text-sm">{money(payload[0].value)}</div>
      <div className="text-gray-400 text-[10px]">{payload[0].payload.count} jobs</div>
    </div>
  );
};

const RANGES = [
  { key: 'month', label: 'This month' },
  { key: '3m', label: 'Last 3 months' },
  { key: 'year', label: 'This year' },
  { key: 'all', label: 'All time' },
];

const RevenueCalendar = ({ bookings }) => {
  const [showAllMonths, setShowAllMonths] = useState(false);
  const [range, setRange] = useState('3m');
  const [lineItems, setLineItems] = useState([]);
  const [expenses, setExpenses] = useState([]);
  // Hourly-wage card: 0 = current month, -1 = last month, etc.
  const [wageMonthOffset, setWageMonthOffset] = useState(0);

  // Fetch structured line items + expenses (net profit) once.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [liRes, expRes] = await Promise.all([
          supabase.from('booking_line_items').select('*'),
          supabase.from('expenses').select('date, amount'),
        ]);
        if (!active) return;
        if (liRes.error) console.error('Error fetching line items:', liRes.error);
        if (expRes.error) console.error('Error fetching expenses:', expRes.error);
        setLineItems(liRes.data || []);
        setExpenses(expRes.data || []);
      } catch (err) {
        console.error('Error fetching revenue data:', err);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // ---- range boundary ----
  const rangeStart = useMemo(() => {
    const now = new Date();
    if (range === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
    if (range === '3m') return new Date(now.getFullYear(), now.getMonth() - 2, 1);
    if (range === 'year') return new Date(now.getFullYear(), 0, 1);
    return null; // all time
  }, [range]);

  const inRange = useMemo(() => {
    return (dateStr) => {
      if (!dateStr) return false;
      if (!rangeStart) return true;
      const d = new Date(dateStr);
      if (isNaN(d)) return false;
      return d >= rangeStart;
    };
  }, [rangeStart]);

  // amount that counts as revenue for a completed+finalized booking
  const amt = (b) => {
    const v = parseFloat(b?.final_amount ?? b?.total_price);
    return isNaN(v) ? 0 : v;
  };

  // ---- completed + finalized bookings within the selected range ----
  const completedInRange = useMemo(
    () =>
      (bookings || []).filter(
        (b) => b?.status === 'completed' && b?.finalized_at && inRange(b?.booking_date)
      ),
    [bookings, inRange]
  );

  // Structured line items grouped by booking, for O(1) per-booking lookup.
  const lineItemsByBooking = useMemo(
    () => groupLineItemsByBooking(lineItems),
    [lineItems]
  );

  // ---- core KPIs ----
  const stats = useMemo(() => {
    const totalRevenue = completedInRange.reduce((s, b) => s + amt(b), 0);
    const baseRevenue = completedInRange.reduce((s, b) => {
      const v = parseFloat(b?.total_price);
      return s + (isNaN(v) ? 0 : v);
    }, 0);
    const jobs = completedInRange.length;
    const avgTicket = jobs > 0 ? totalRevenue / jobs : 0;

    // Upsell + tips derived PER BOOKING from the merged model: structured
    // booking_line_items when present, else the legacy bookings.line_items
    // jsonb. This is what restores every historical tip/upsell that the
    // structured-only read was dropping to zero.
    let upsellTotal = 0;
    let tipTotal = 0;
    let tippedJobs = 0;
    const upsellByCat = {};
    UPSELL_KEYS.forEach((k) => (upsellByCat[k] = 0));

    completedInRange.forEach((b) => {
      const { tip, upsell, upsellByCat: byCat } = deriveBookingExtras(
        b,
        lineItemsByBooking.get(b?.id)
      );
      upsellTotal += upsell;
      UPSELL_KEYS.forEach((k) => (upsellByCat[k] += byCat[k] || 0));

      // A package swap at finalize (e.g. Standard Exterior -> Deluxe Exterior)
      // replaces the base line instead of adding a stacked line item, so its
      // revenue delta is stored on the booking directly — fold it into the same
      // "Upgrades" bucket a stacked upgrade line item would have reported to.
      const pkgUpgrade = parseFloat(b?.package_upgrade_amount);
      if (!isNaN(pkgUpgrade) && pkgUpgrade !== 0) {
        upsellTotal += pkgUpgrade;
        upsellByCat.upgrade += pkgUpgrade;
      }

      if (tip > 0) {
        tipTotal += tip;
        tippedJobs += 1;
      }
    });

    const avgTip = tippedJobs > 0 ? tipTotal / tippedJobs : 0;
    const tipRate = jobs > 0 ? (tippedJobs / jobs) * 100 : 0;
    const hasTips = tipTotal > 0 || tippedJobs > 0;

    // expenses in range -> net profit
    const expensesTotal = expenses.reduce((s, e) => {
      if (!inRange(e?.date)) return s;
      const v = parseFloat(e?.amount);
      return s + (isNaN(v) ? 0 : v);
    }, 0);
    const netProfit = totalRevenue - expensesTotal;

    return {
      totalRevenue,
      baseRevenue,
      jobs,
      avgTicket,
      upsellTotal,
      upsellByCat,
      tipTotal,
      avgTip,
      tipRate,
      tippedJobs,
      hasTips,
      expensesTotal,
      netProfit,
    };
  }, [completedInRange, lineItemsByBooking, expenses, inRange]);

  // ---- revenue trend series ----
  // The chart MORPHS between ranges (each point animates to its new height). For
  // that to be seamless, every range must yield the SAME number of points — if the
  // count changed, recharts would glitch/redraw instead of morphing. So we always
  // resample the selected window into a FIXED number of equal-width buckets and
  // sum revenue into them. Wider ranges just mean wider buckets (≈days → weeks →
  // months), but the point count — and thus the morph — stays constant.
  const BUCKETS = 12;
  const revenueSeries = useMemo(() => {
    const now = new Date();
    const endMs = now.getTime();
    // Window start: the range boundary, or (for "all") the earliest booking.
    let start = rangeStart;
    if (!start) {
      let min = null;
      completedInRange.forEach((b) => {
        const d = new Date(b.booking_date);
        if (!isNaN(d) && (!min || d < min)) min = d;
      });
      start = min || new Date(now.getFullYear(), now.getMonth() - 11, 1);
    }
    const startMs = start.getTime();
    const span = Math.max(1, endMs - startMs);
    const longRange = range === 'year' || range === 'all';

    const buckets = Array.from({ length: BUCKETS }, (_, i) => {
      const centerMs = startMs + (span * (i + 0.5)) / BUCKETS;
      const c = new Date(centerMs);
      return {
        key: i,
        label: longRange
          ? c.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
          : c.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        total: 0,
        count: 0,
      };
    });

    completedInRange.forEach((b) => {
      const d = new Date(b.booking_date);
      if (isNaN(d)) return;
      let idx = Math.floor(((d.getTime() - startMs) / span) * BUCKETS);
      if (idx < 0) idx = 0;
      if (idx >= BUCKETS) idx = BUCKETS - 1;
      buckets[idx].total += amt(b);
      buckets[idx].count += 1;
    });

    return buckets;
  }, [completedInRange, range, rangeStart]);

  // ---- revenue grouped strictly BY MONTH (for the "Revenue by Month" list) ----
  // Separate from revenueSeries (which changes granularity by range) because the
  // list below is always month-by-month and needs a `full` month label.
  const revenueByMonth = useMemo(() => {
    const pad = (n) => String(n).padStart(2, '0');
    const m = {};
    completedInRange.forEach((b) => {
      const d = new Date(b.booking_date);
      if (isNaN(d)) return;
      const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
      const full = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      if (!m[key]) m[key] = { key, full, total: 0, count: 0 };
      m[key].total += amt(b);
      m[key].count += 1;
    });
    return Object.values(m).sort((a, b) => a.key.localeCompare(b.key));
  }, [completedInRange]);

  const rangeLabel = RANGES.find((r) => r.key === range)?.label || '';

  // ---- most popular days (respects range) ----
  const popularDays = useMemo(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayStats = days.map((day) => ({ day, count: 0, revenue: 0 }));
    completedInRange.forEach((b) => {
      const d = new Date(b.booking_date);
      if (isNaN(d)) return;
      dayStats[d.getDay()].count += 1;
      dayStats[d.getDay()].revenue += amt(b);
    });
    const byCount = [...dayStats].sort((a, b) => b.count - a.count);
    const byRevenue = [...dayStats].sort((a, b) => b.revenue - a.revenue);
    return { topCount: byCount[0], topRevenue: byRevenue[0], any: dayStats.some((x) => x.count > 0) };
  }, [completedInRange]);

  // ---- hourly wage, grouped by every month that has completed+finalized jobs
  // (independent of the range selector above) so the card can be browsed
  // month-to-month instead of always showing "this month" only. ----
  const hoursByMonth = useMemo(() => {
    const m = {};
    (bookings || []).forEach((b) => {
      if (b?.status !== 'completed' || !b?.finalized_at) return;
      const d = new Date(b.booking_date);
      if (isNaN(d)) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      let duration = 0;
      if (b.start_time && b.end_time) {
        const [sh, sm] = b.start_time.split(':').map(Number);
        const [eh, em] = b.end_time.split(':').map(Number);
        let start = sh + (sm || 0) / 60;
        let end = eh + (em || 0) / 60;
        if (end < start) end += 24;
        duration = end - start;
      } else if (b.duration_minutes) {
        duration = b.duration_minutes / 60;
      }
      if (duration <= 0) return;
      if (!m[key]) m[key] = { key, hours: 0, rev: 0 };
      m[key].hours += duration;
      m[key].rev += amt(b);
    });
    return m;
  }, [bookings]);

  const wageMonthKeys = useMemo(() => Object.keys(hoursByMonth).sort(), [hoursByMonth]);

  const wageSelectedDate = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + wageMonthOffset, 1);
  }, [wageMonthOffset]);
  const wageSelectedKey = `${wageSelectedDate.getFullYear()}-${String(wageSelectedDate.getMonth() + 1).padStart(2, '0')}`;
  const wageSelectedLabel = wageSelectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const hourlySelectedMonth = useMemo(() => {
    const entry = hoursByMonth[wageSelectedKey] || { hours: 0, rev: 0 };
    return { hourly: entry.hours > 0 ? entry.rev / entry.hours : 0, hours: entry.hours, rev: entry.rev };
  }, [hoursByMonth, wageSelectedKey]);

  // Average hours worked per month, across every month with at least one
  // completed+finalized job (not just months since the site launched empty).
  const avgHoursPerMonth = useMemo(() => {
    if (wageMonthKeys.length === 0) return 0;
    const total = wageMonthKeys.reduce((s, k) => s + hoursByMonth[k].hours, 0);
    return total / wageMonthKeys.length;
  }, [wageMonthKeys, hoursByMonth]);

  const wageCanGoPrev = wageMonthKeys.length > 0 && wageSelectedKey > wageMonthKeys[0];
  const wageCanGoNext = wageMonthOffset < 0;

  const maxUpsellCat = Math.max(1, ...UPSELL_KEYS.map((k) => stats.upsellByCat[k] || 0));
  const upsellCatsPresent = UPSELL_CATS.filter((c) => (stats.upsellByCat[c.key] || 0) > 0);

  return (
    <div className="space-y-6">
      {/* ---- Range selector ---- */}
      <div className="flex flex-wrap gap-2">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`px-3 md:px-4 py-2 rounded-lg font-medium text-xs md:text-sm transition-all ${
              range === r.key
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow'
                : 'bg-white/5 text-gray-300 hover:bg-white/10'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* ---- HERO: Revenue trend over time ---- */}
      <div className="bg-black/30 backdrop-blur-md rounded-xl p-4 md:p-6 border border-white/10 shadow-xl">
        <div className="flex items-baseline justify-between mb-4 gap-2">
          <h2 className="text-lg md:text-2xl font-bold text-white">Revenue Trend</h2>
          <div className="text-right">
            <div className="text-xl md:text-3xl font-bold text-emerald-400">
              {money(stats.totalRevenue)}
            </div>
            <div className="text-gray-400 text-[10px] md:text-xs">{rangeLabel}</div>
          </div>
        </div>
        {revenueSeries.length === 0 ? (
          <p className="text-gray-300 text-center py-12">No revenue in this period yet</p>
        ) : (
          <div className="w-full h-56 md:h-72">
            {/* No remount key: revenueSeries always has the same number of points
                (BUCKETS), so recharts MORPHS each point to its new height between
                ranges instead of redrawing — smooth, no jump. */}
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={VIZ.revenue} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={VIZ.revenue} stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={VIZ.grid} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: VIZ.axis, fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: VIZ.grid }}
                  minTickGap={8}
                />
                <YAxis
                  tick={{ fill: VIZ.axis, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                  tickFormatter={compactMoney}
                />
                <Tooltip content={<RevenueChartTooltip />} cursor={{ stroke: VIZ.axis, strokeWidth: 1 }} />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke={VIZ.revenue}
                  strokeWidth={2}
                  fill="url(#revFill)"
                  dot={{ r: 3, fill: VIZ.revenue, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: VIZ.revenue, stroke: '#000', strokeWidth: 2 }}
                  animationDuration={650}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ---- Upsell / upgrade revenue ---- */}
      <div className="bg-black/30 backdrop-blur-md rounded-xl p-4 md:p-6 border border-white/10 shadow-xl">
        <h3 className="text-lg md:text-xl font-bold text-white mb-4">Extra Earned at Service Time</h3>
        <div className="grid grid-cols-2 gap-3 md:gap-4 mb-4">
          <div className="bg-white/5 rounded-lg p-3 md:p-4 border border-white/10">
            <div className="text-gray-300 text-xs md:text-sm mb-1">Base / Original Quotes</div>
            <div className="text-xl md:text-3xl font-bold text-blue-400">{money(stats.baseRevenue)}</div>
            <div className="text-gray-400 text-[10px] md:text-xs mt-1">Booked upfront</div>
          </div>
          <div className="bg-emerald-500/10 rounded-lg p-3 md:p-4 border border-emerald-500/30">
            <div className="text-emerald-200 text-xs md:text-sm mb-1">Upsell Revenue</div>
            <div className="text-xl md:text-3xl font-bold text-emerald-400">{money(stats.upsellTotal)}</div>
            <div className="text-emerald-300/70 text-[10px] md:text-xs mt-1">
              {stats.baseRevenue > 0
                ? `+${((stats.upsellTotal / stats.baseRevenue) * 100).toFixed(0)}% on top`
                : 'Upgrades, add-ons, travel'}
            </div>
          </div>
        </div>

        {upsellCatsPresent.length >= 2 ? (
          <div className="space-y-3 pt-1">
            {upsellCatsPresent
              .sort((a, b) => (stats.upsellByCat[b.key] || 0) - (stats.upsellByCat[a.key] || 0))
              .map((c) => {
                const val = stats.upsellByCat[c.key] || 0;
                const pct = (val / maxUpsellCat) * 100;
                return (
                  <div key={c.key} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-gray-200">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-sm"
                          style={{ backgroundColor: c.color }}
                        />
                        {c.label}
                      </span>
                      <span className="text-white font-medium tabular-nums">{money(val)}</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                      <div
                        style={{ width: `${pct}%`, height: '100%', background: c.color, borderRadius: '9999px' }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        ) : stats.upsellTotal === 0 ? (
          <p className="text-gray-400 text-sm">No upsell line items recorded in this period.</p>
        ) : null}
      </div>

      {/* ---- KPI row ---- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-black/30 backdrop-blur-md rounded-xl p-3 md:p-6 border border-white/10 shadow-xl">
          <div className="text-gray-300 text-xs md:text-sm mb-1">Total Revenue</div>
          <div className="text-lg md:text-3xl font-bold text-green-400">{money(stats.totalRevenue)}</div>
          <div className="text-gray-400 text-[10px] md:text-xs mt-1">{rangeLabel}</div>
        </div>
        <div className="bg-black/30 backdrop-blur-md rounded-xl p-3 md:p-6 border border-white/10 shadow-xl">
          <div className="text-gray-300 text-xs md:text-sm mb-1">Net Profit</div>
          <div className={`text-lg md:text-3xl font-bold ${stats.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {money(stats.netProfit)}
          </div>
          <div className="text-gray-400 text-[10px] md:text-xs mt-1">after {money(stats.expensesTotal)} exp.</div>
        </div>
        <div className="bg-black/30 backdrop-blur-md rounded-xl p-3 md:p-6 border border-white/10 shadow-xl">
          <div className="text-gray-300 text-xs md:text-sm mb-1">Jobs Completed</div>
          <div className="text-lg md:text-3xl font-bold text-purple-400">{stats.jobs}</div>
          <div className="text-gray-400 text-[10px] md:text-xs mt-1">{rangeLabel}</div>
        </div>
        <div className="bg-black/30 backdrop-blur-md rounded-xl p-3 md:p-6 border border-white/10 shadow-xl">
          <div className="text-gray-300 text-xs md:text-sm mb-1">Avg Ticket</div>
          <div className="text-lg md:text-3xl font-bold text-blue-400">{money(stats.avgTicket)}</div>
          <div className="text-gray-400 text-[10px] md:text-xs mt-1">Per job</div>
        </div>
      </div>

      {/* ---- Tips ---- */}
      <div className="bg-black/30 backdrop-blur-md rounded-xl p-4 md:p-6 border border-white/10 shadow-xl">
        <h3 className="text-lg md:text-xl font-bold text-white mb-4">Tips</h3>
        {stats.hasTips ? (
          <div className="grid grid-cols-3 gap-3 md:gap-4">
            <div>
              <div className="text-gray-300 text-xs md:text-sm mb-1">Total Tips</div>
              <div className="text-lg md:text-2xl font-bold text-green-400">{money(stats.tipTotal)}</div>
            </div>
            <div>
              <div className="text-gray-300 text-xs md:text-sm mb-1">Avg Tip</div>
              <div className="text-lg md:text-2xl font-bold text-blue-400">{money(stats.avgTip)}</div>
            </div>
            <div>
              <div className="text-gray-300 text-xs md:text-sm mb-1">Tip Rate</div>
              <div className="text-lg md:text-2xl font-bold text-purple-400">{stats.tipRate.toFixed(0)}%</div>
              <div className="text-gray-400 text-[10px] md:text-xs mt-1">{stats.tippedJobs} of {stats.jobs} jobs</div>
            </div>
          </div>
        ) : (
          <p className="text-gray-400 text-sm">No tips recorded in this period.</p>
        )}
      </div>

      {/* ---- Revenue by Month (list) ---- */}
      <div className="bg-black/30 backdrop-blur-md rounded-xl p-4 md:p-6 border border-white/10 shadow-xl">
        <h3 className="text-lg md:text-2xl font-bold text-white mb-4 md:mb-6">Revenue by Month</h3>
        {revenueByMonth.length === 0 ? (
          <p className="text-gray-300 text-center py-8">No revenue data available</p>
        ) : (
          <>
            <div className="space-y-4">
              {(showAllMonths ? [...revenueByMonth].reverse() : [...revenueByMonth].slice(-4).reverse()).map((month) => {
                const visible = showAllMonths ? revenueByMonth : revenueByMonth.slice(-4);
                const maxRevenue = Math.max(...visible.map((m) => m.total));
                const width = maxRevenue > 0 ? (month.total / maxRevenue) * 100 : 0;
                return (
                  <div key={month.key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium">{month.full}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400 text-sm">{month.count} bookings</span>
                        <span className="text-green-400 font-semibold text-lg tabular-nums">{money(month.total)}</span>
                      </div>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden">
                      <div
                        style={{ width: `${width}%`, height: '100%', borderRadius: '9999px', background: VIZ.revenue, transition: 'width 1s' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            {revenueByMonth.length > 4 && (
              <div className="flex justify-center mt-4">
                <button
                  className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-medium shadow hover:from-green-700 hover:to-emerald-700 transition-all"
                  onClick={() => setShowAllMonths((v) => !v)}
                >
                  {showAllMonths ? 'Show Recent Months' : 'Show All Months'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ---- Most Popular Days + Hourly Wage ---- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-black/30 backdrop-blur-md rounded-xl p-4 md:p-6 border border-white/10 shadow-xl">
          <h3 className="text-lg md:text-xl font-bold text-white mb-4">Most Popular Days</h3>
          {popularDays.any ? (
            <div className="flex flex-col gap-2">
              <div>
                <span className="text-white font-semibold">By Bookings: </span>
                <span className="text-blue-400 font-semibold">
                  {popularDays.topCount.day} ({popularDays.topCount.count} bookings)
                </span>
              </div>
              <div>
                <span className="text-white font-semibold">By Revenue: </span>
                <span className="text-green-400 font-semibold">
                  {popularDays.topRevenue.day} ({money(popularDays.topRevenue.revenue)})
                </span>
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No completed jobs in this period.</p>
          )}
        </div>

        <div className="bg-black/30 backdrop-blur-md rounded-xl p-4 md:p-6 border border-white/10 shadow-xl">
          <div className="flex items-center justify-between mb-4 gap-2">
            <h3 className="text-lg md:text-xl font-bold text-white">Hourly Wage</h3>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setWageMonthOffset((o) => o - 1)}
                disabled={!wageCanGoPrev}
                aria-label="Previous month"
                className="flex size-8 items-center justify-center rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <span className="min-w-[9.5rem] text-center text-sm font-medium text-gray-200">{wageSelectedLabel}</span>
              <button
                type="button"
                onClick={() => setWageMonthOffset((o) => o + 1)}
                disabled={!wageCanGoNext}
                aria-label="Next month"
                className="flex size-8 items-center justify-center rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
          {hourlySelectedMonth.hours > 0 ? (
            <div className="flex flex-col gap-1">
              <span className="text-green-400 font-bold text-xl md:text-2xl">{money(hourlySelectedMonth.hourly)} / hr</span>
              <span className="text-gray-400 text-xs">{hourlySelectedMonth.hours.toFixed(1)} hrs worked</span>
              <span className="text-gray-400 text-xs">{money(hourlySelectedMonth.rev)} total this month</span>
              {avgHoursPerMonth > 0 && (
                <span className="text-gray-500 text-xs mt-2 pt-2 border-t border-white/10">
                  Avg {avgHoursPerMonth.toFixed(1)} hrs/month across {wageMonthKeys.length} month{wageMonthKeys.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <p className="text-gray-400 text-sm">No completed jobs that month.</p>
              {avgHoursPerMonth > 0 && (
                <span className="text-gray-500 text-xs mt-2 pt-2 border-t border-white/10">
                  Avg {avgHoursPerMonth.toFixed(1)} hrs/month across {wageMonthKeys.length} month{wageMonthKeys.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Customers Section Component
const CustomersSection = ({ bookings, onCustomerClick, onAddCustomer }) => {
  const [customersFromDB, setCustomersFromDB] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomers();
    
    // Subscribe to real-time updates
    const subscription = supabase
      .channel('customers_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => {
        fetchCustomers();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomersFromDB(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  // ONLY show customers from database, add their booking data
  const customers = useMemo(() => {
    const customerMap = {};
    
    // Add ONLY customers from the database
    customersFromDB.forEach((dbCustomer) => {
      customerMap[dbCustomer.phone] = {
        id: dbCustomer.id,
        name: dbCustomer.name,
        email: dbCustomer.email,
        phone: dbCustomer.phone,
        address: dbCustomer.address,
        notes: dbCustomer.notes,
        bookings: [],
        totalSpent: 0,
        fromDB: true,
      };
    });
    
    // Add booking data ONLY to customers that exist in the database
    bookings.forEach((booking) => {
      const phone = booking.customer_phone;
      
      // Only add booking data if customer exists in database
      if (customerMap[phone]) {
        customerMap[phone].bookings.push(booking);
        // Only count revenue from paid bookings
        if (booking.status !== 'cancelled' && (booking.payment_status === 'paid' || booking.payment_status === 'partial')) {
          const amount = booking.final_amount || booking.total_price || 0;
          customerMap[phone].totalSpent += parseFloat(amount);
        }
      }
    });
    
    return Object.values(customerMap).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [bookings, customersFromDB]);

  const totalCustomers = customers.length;
  const returningCustomers = customers.filter((c) => c.bookings.length > 1).length;
  const topSpender = customers[0];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        <div className="bg-black/30 backdrop-blur-md rounded-xl p-3 md:p-6 border border-white/10 shadow-xl">
          <div className="text-gray-300 text-xs md:text-sm mb-1">Total Customers</div>
          <div className="text-xl md:text-3xl font-bold text-white">{totalCustomers}</div>
        </div>
        <div className="bg-black/30 backdrop-blur-md rounded-xl p-3 md:p-6 border border-white/10 shadow-xl">
          <div className="text-gray-300 text-xs md:text-sm mb-1">Returning Customers</div>
          <div className="text-xl md:text-3xl font-bold text-blue-400">{returningCustomers}</div>
          <div className="text-gray-400 text-[10px] md:text-xs mt-1">
            {totalCustomers > 0 ? ((returningCustomers / totalCustomers) * 100).toFixed(1) : 0}%
            return rate
          </div>
        </div>
        <div className="bg-black/30 backdrop-blur-md rounded-xl p-3 md:p-6 border border-white/10 shadow-xl col-span-2 md:col-span-1">
          <div className="text-gray-300 text-xs md:text-sm mb-1">Top Spender</div>
          {topSpender ? (
            <>
              <div className="text-base md:text-lg font-bold text-purple-400 truncate">{topSpender.name}</div>
              <div className="text-green-400 font-semibold text-sm md:text-base">${topSpender.totalSpent.toFixed(2)}</div>
            </>
          ) : (
            <div className="text-gray-400 text-xs md:text-sm">No data</div>
          )}
        </div>
      </div>

      {/* Customer List */}
      <div className="bg-black/30 backdrop-blur-md rounded-xl p-3 md:p-6 border border-white/10 shadow-xl">
        <div className="flex items-center justify-between mb-3 md:mb-6">
          <h2 className="text-lg md:text-2xl font-bold text-white">All Customers</h2>
          {onAddCustomer && (
            <button
              onClick={onAddCustomer}
              className="px-3 md:px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-colors font-medium text-xs md:text-sm flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden md:inline">New Customer</span>
              <span className="md:hidden">New</span>
            </button>
          )}
        </div>
        
        {loading ? (
          <p className="text-gray-300 text-center py-4 md:py-8 text-sm">Loading customers...</p>
        ) : customers.length === 0 ? (
          <p className="text-gray-300 text-center py-4 md:py-8 text-sm">No customers yet</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
            {customers.map((customer, index) => {
              return (
                <motion.div
                  key={customer.phone || customer.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white/5 rounded-lg border border-white/10 hover:border-purple-500/50 transition-all"
                >
                  {/* Mobile: Thin horizontal layout */}
                  <div className="flex md:hidden items-center gap-2 p-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold text-sm truncate">{customer.name}</h3>
                      <div className="text-gray-400 text-xs truncate">📱 {customer.phone}</div>
                    </div>
                    <div className="text-sm font-bold text-green-400 shrink-0">
                      ${customer.totalSpent.toFixed(2)}
                    </div>
                    <button
                      onClick={() => {
                        if (onCustomerClick) {
                          onCustomerClick(customer);
                        }
                      }}
                      className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-xs font-bold rounded shadow-lg transition-all shrink-0"
                    >
                      ✏️
                    </button>
                  </div>

                  {/* Desktop: Full layout */}
                  <div className="hidden md:block p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-white font-semibold text-base truncate">{customer.name}</h3>
                          {customer.fromDB && (
                            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded text-xs font-medium">
                              Saved
                            </span>
                          )}
                        </div>
                        <div className="text-gray-300 text-sm space-y-1">
                          {customer.email && <div className="truncate">📧 {customer.email}</div>}
                          <div>📱 {customer.phone}</div>
                          {customer.address && <div className="truncate">📍 {customer.address}</div>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 ml-3">
                        <div className="text-lg font-bold text-green-400">
                          ${customer.totalSpent.toFixed(2)}
                        </div>
                        <div className="text-gray-400 text-xs">
                          {customer.bookings.length} booking{customer.bookings.length !== 1 ? 's' : ''}
                        </div>
                        {customer.bookings.length > 1 && (
                          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded text-xs font-medium">
                            Returning
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => {
                        if (onCustomerClick) {
                          onCustomerClick(customer);
                        }
                      }}
                      className="w-full mt-3 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-sm font-bold rounded-lg shadow-lg transition-all"
                    >
                      ✏️ EDIT CUSTOMER
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// Expenses Section Component
const ExpensesSection = ({ onAddExpense, totalRevenue }) => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchExpenses();
    
    // Subscribe to real-time updates
    const subscription = supabase
      .channel('expenses_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => {
        fetchExpenses();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredExpenses = useMemo(() => {
    if (filter === 'all') return expenses;
    return expenses.filter(e => e.category === filter);
  }, [expenses, filter]);

  const totalExpenses = useMemo(() => {
    return expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  }, [expenses]);

  const expensesByCategory = useMemo(() => {
    const categories = {};
    expenses.forEach(expense => {
      if (!categories[expense.category]) {
        categories[expense.category] = 0;
      }
      categories[expense.category] += parseFloat(expense.amount || 0);
    });
    return Object.entries(categories).sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  const categoryIcons = {
    products: '🧴',
    equipment: '🛠️',
    marketing: '📢',
    fuel: '⛽',
    maintenance: '🔧',
    utilities: '💡',
    other: '📦'
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        <div className="bg-black/30 backdrop-blur-md rounded-xl p-3 md:p-6 border border-white/10 shadow-xl">
          <div className="text-gray-300 text-xs md:text-sm mb-1">Total Expenses</div>
          <div className="text-xl md:text-3xl font-bold text-red-400">${totalExpenses.toFixed(2)}</div>
          <div className="text-gray-400 text-[10px] md:text-xs mt-1">All time</div>
        </div>
        <div className="bg-black/30 backdrop-blur-md rounded-xl p-3 md:p-6 border border-white/10 shadow-xl">
          <div className="text-gray-300 text-xs md:text-sm mb-1">Net Revenue</div>
          <div className="text-xl md:text-3xl font-bold text-green-400">${(typeof totalRevenue === 'number' ? totalRevenue - totalExpenses : 0).toFixed(2)}</div>
          <div className="text-gray-400 text-[10px] md:text-xs mt-1">Revenue minus expenses</div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            filter === 'all'
              ? 'bg-purple-500 text-white'
              : 'bg-white/5 text-gray-300 hover:bg-white/10'
          }`}
        >
          All Categories
        </button>
        {Object.keys(categoryIcons).map((category) => (
          <button
            key={category}
            onClick={() => setFilter(category)}
            className={`px-4 py-2 rounded-lg font-medium transition-all capitalize ${
              filter === category
                ? 'bg-purple-500 text-white'
                : 'bg-white/5 text-gray-300 hover:bg-white/10'
            }`}
          >
            {categoryIcons[category]} {category}
          </button>
        ))}
      </div>

      {/* Category Breakdown */}
      <div className="bg-black/30 backdrop-blur-md rounded-xl p-6 border border-white/10 shadow-xl">
        <h3 className="text-xl font-bold text-white mb-4">By Category</h3>
        <div className="space-y-3">
          {expensesByCategory.map(([category, amount]) => (
            <div key={category} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{categoryIcons[category] || '📦'}</span>
                <span className="text-white font-medium capitalize">{category}</span>
              </div>
              <span className="text-red-400 font-semibold">${amount.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Expenses List */}
      <div className="bg-black/30 backdrop-blur-md rounded-xl p-6 border border-white/10 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">All Expenses</h2>
          {onAddExpense && (
            <button
              onClick={onAddExpense}
              className="px-3 md:px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-colors font-medium text-xs md:text-sm flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden md:inline">New Expense</span>
              <span className="md:hidden">New</span>
            </button>
          )}
        </div>
        
        {loading ? (
          <p className="text-gray-300 text-center py-8">Loading expenses...</p>
        ) : filteredExpenses.length === 0 ? (
          <p className="text-gray-300 text-center py-8">No expenses recorded</p>
        ) : (
          <div className="space-y-3">
            {filteredExpenses.map((expense, index) => (
              <motion.div
                key={expense.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white/5 rounded-lg p-4 border border-white/10 hover:border-red-500/50 transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{categoryIcons[expense.category] || '📦'}</span>
                      <h3 className="text-white font-semibold">{expense.description}</h3>
                    </div>
                    <div className="text-gray-300 text-sm mt-1">
                      <div className="flex items-center gap-2">
                        <span className="capitalize">{expense.category}</span>
                        <span>•</span>
                        <span>{new Date(expense.date).toLocaleDateString()}</span>
                        <span>•</span>
                        <span className="capitalize">{expense.payment_method}</span>
                      </div>
                      {expense.notes && (
                        <div className="text-gray-400 text-xs mt-1 italic">{expense.notes}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-red-400">
                    ${parseFloat(expense.amount).toFixed(2)}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export { RevenueCalendar, CustomersSection, ExpensesSection };
