// BookingReceipt — a public, shareable confirmation page at /booking/:id.
// Anyone with the link (customer or owner) can re-open a confirmed booking.
// With RLS enabled the anon client can NOT read `bookings` (that would expose
// every customer's PII), so this page fetches the single requested booking via
// the server-side `get-booking-receipt` edge function (service role), which
// returns only that one row + the public business_info fields.
// Light public-site styling (theme tokens), NOT the dark admin.
import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { SUPABASE_FUNCTIONS_URL } from '@/lib/supabase';
import {
  money,
  formatTime,
  formatDate,
  getStatusColor,
  getStatusDot,
} from '@/lib/format';
import {
  Sparkles,
  CheckCircle2,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Truck,
  Home,
  Car,
  Phone,
  MessageSquare,
  Download,
  AlertCircle,
} from 'lucide-react';

// Anon key sent as the Authorization bearer to the edge function, matching how
// the rest of the app calls Supabase functions (BookingWidget, etc.).
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Fallbacks if business_info can't be read (matches the site defaults).
const FALLBACK_BRAND = "Andrew's Auto Detail & Car Wash";
const FALLBACK_DROPOFF = '3538 Del Amo Blvd, Lakewood, CA';
const FALLBACK_PHONE = '562-310-1075';

// Pretty label for a status ("no_show" -> "No Show").
const statusLabel = (s) =>
  (s || 'pending')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

// Two-digit pad for ICS timestamps.
const pad = (n) => String(n).padStart(2, '0');

// Build a floating-local ICS timestamp (YYYYMMDDTHHMMSS) from a "YYYY-MM-DD"
// date and an "HH:MM[:SS]" time. Floating (no Z) so it lands at the venue's
// wall-clock time regardless of the viewer's timezone.
const icsStamp = (dateStr, timeStr) => {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
  const [hh = 0, mm = 0] = (timeStr || '00:00').split(':').map(Number);
  if (!y || !m || !d) return null;
  return `${y}${pad(m)}${pad(d)}T${pad(hh)}${pad(mm)}00`;
};

const escapeICS = (str = '') =>
  String(str).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

const BookingReceipt = () => {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setNotFound(false);
      try {
        // Server-side fetch: the edge function returns { booking, business },
        // where `booking` already has the interior/exterior package + add-on
        // joins the UI expects, and `business` is the public business_info row.
        const response = await axios.post(
          `${SUPABASE_FUNCTIONS_URL}/get-booking-receipt`,
          { id },
          {
            headers: {
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
          },
        );
        if (!active) return;
        const data = response.data || {};
        if (!data.booking) {
          setNotFound(true);
        } else {
          setBooking(data.booking);
          if (data.business) setBusiness(data.business);
        }
      } catch (err) {
        if (!active) return;
        // 404 (not_found) or any error → graceful not-found state.
        setNotFound(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const brandName = business?.brand_name?.trim() || FALLBACK_BRAND;
  const bizPhone = business?.phone?.trim() || FALLBACK_PHONE;
  const dropoffAddress = business?.dropoff_address?.trim() || FALLBACK_DROPOFF;

  // Loading state — centered spinner.
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent" />
        <p className="text-muted-foreground text-sm">Loading your confirmation…</p>
      </div>
    );
  }

  // Not-found state — graceful, with a link home.
  if (notFound || !booking) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6 text-center">
        <AlertCircle className="w-12 h-12 text-muted-foreground" />
        <h1 className="text-2xl font-bold text-foreground">We couldn&apos;t find that booking</h1>
        <p className="text-muted-foreground max-w-md">
          This confirmation link may be incorrect or the booking may have been removed.
        </p>
        <Link
          to="/"
          className="mt-2 inline-flex items-center justify-center rounded-lg bg-accent hover:bg-accent/90 text-accent-foreground font-semibold px-6 h-11 transition-colors"
        >
          Back to home
        </Link>
      </div>
    );
  }

  const isMobile = booking.service_type === 'mobile';
  const serviceAddress = isMobile ? booking.customer_address : dropoffAddress;
  const mapUrl = serviceAddress
    ? `https://maps.google.com/?q=${encodeURIComponent(serviceAddress)}`
    : null;

  // Selected services list (packages + add-ons + monthly plan).
  const services = [];
  if (booking.exterior_package?.name)
    services.push({ label: booking.exterior_package.name, sub: 'Exterior' });
  if (booking.interior_package?.name)
    services.push({ label: booking.interior_package.name, sub: 'Interior' });
  const addOns = Array.isArray(booking.add_ons)
    ? booking.add_ons.map((a) => a.add_on).filter(Boolean)
    : [];
  addOns.forEach((a) =>
    services.push({ label: a.name, sub: 'Add-on', price: a.price != null ? money(a.price) : null }),
  );
  if (booking.monthly_plan_name)
    services.push({ label: booking.monthly_plan_name, sub: 'Monthly plan' });

  // Pricing: final_amount is the settled/paid total; otherwise total_price is an estimate.
  const hasFinal = booking.final_amount != null;
  const grandTotal = hasFinal ? booking.final_amount : booking.total_price;
  const promoDiscount = Number(booking.promo_discount) || 0;
  const planDiscount = Number(booking.monthly_plan_discount) || 0;

  // Build + download an .ics file client-side (no external libs).
  const handleAddToCalendar = () => {
    const dtStart = icsStamp(booking.booking_date, booking.start_time);
    const dtEnd = icsStamp(booking.booking_date, booking.end_time) || dtStart;
    const dtStamp = new Date()
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '');
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Andrews Auto Detail//Booking//EN',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:booking-${booking.id}@andrewsauto`,
      `DTSTAMP:${dtStamp}`,
      dtStart ? `DTSTART:${dtStart}` : '',
      dtEnd ? `DTEND:${dtEnd}` : '',
      `SUMMARY:${escapeICS(`${brandName} — ${hasFinal ? money(grandTotal) : `Est. ${money(grandTotal)}`}`)}`,
      serviceAddress ? `LOCATION:${escapeICS(serviceAddress)}` : '',
      `DESCRIPTION:${escapeICS(
        `${isMobile ? 'Mobile service' : 'Drop-off'} — ${services.map((s) => s.label).join(', ') || 'Car detail'}`,
      )}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].filter(Boolean);
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `booking-${booking.id}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background py-8 sm:py-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Brand header */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-accent" />
          </div>
          <span className="font-semibold text-lg tracking-tight text-foreground text-center">
            {brandName}
          </span>
        </div>

        {/* Receipt card */}
        <div className="bg-card rounded-3xl border border-border shadow-xl overflow-hidden">
          {/* Confirmed banner */}
          <div className="bg-accent/10 border-b border-border px-6 py-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-status-confirmed mx-auto mb-2" />
            <h1 className="text-2xl font-bold text-foreground">Booking Confirmed</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Thanks{booking.customer_name ? `, ${booking.customer_name}` : ''}! Here&apos;s your confirmation.
            </p>
            <div className="mt-3 flex items-center justify-center">
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${getStatusColor(
                  booking.status,
                )}`}
              >
                <span className={`w-2 h-2 rounded-full ${getStatusDot(booking.status)}`} />
                {statusLabel(booking.status)}
              </span>
            </div>
          </div>

          <div className="px-6 py-6 space-y-6">
            {/* Date & time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <CalendarIcon className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="text-sm font-semibold text-foreground">{formatDate(booking.booking_date)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Time</p>
                  <p className="text-sm font-semibold text-foreground">
                    {formatTime(booking.start_time)}
                    {booking.end_time ? ` – ${formatTime(booking.end_time)}` : ''}
                  </p>
                </div>
              </div>
            </div>

            {!hasFinal && (
              <p className="text-xs leading-relaxed text-muted-foreground -mt-2">
                Your appointment time is approximate — we aim to arrive within about 30 minutes of it.
              </p>
            )}

            {/* Service type + location */}
            <div className="flex items-start gap-3">
              {isMobile ? (
                <Truck className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
              ) : (
                <Home className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">{isMobile ? 'Mobile service' : 'Drop-off'}</p>
                <p className="text-sm font-semibold text-foreground">
                  {isMobile ? 'We come to you' : 'Bring your vehicle to us'}
                </p>
                {serviceAddress && (
                  <div className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>
                      {serviceAddress}
                      {mapUrl && (
                        <>
                          {' · '}
                          <a
                            href={mapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent font-medium hover:underline"
                          >
                            Directions
                          </a>
                        </>
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Vehicle */}
            <div className="flex items-start gap-3">
              <Car className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Vehicle</p>
                <p className="text-sm font-semibold text-foreground">
                  {booking.vehicle_model || '—'}
                  {booking.vehicle_size ? (
                    <span className="font-normal text-muted-foreground capitalize"> · {booking.vehicle_size}</span>
                  ) : null}
                </p>
              </div>
            </div>

            {/* Services */}
            {services.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Services</p>
                <ul className="space-y-2">
                  {services.map((s, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex items-center gap-2 text-foreground">
                        <Sparkles className="w-4 h-4 text-accent flex-shrink-0" />
                        {s.label}
                        <span className="text-xs text-muted-foreground">({s.sub})</span>
                      </span>
                      {s.price && <span className="text-muted-foreground">{s.price}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Price summary */}
            <div className="border-t border-border pt-4 space-y-2">
              {booking.subtotal != null && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{money(booking.subtotal)}</span>
                </div>
              )}
              {promoDiscount > 0 && (
                <div className="flex justify-between text-sm text-status-completed">
                  <span>Promo{booking.applied_promo_code ? ` (${booking.applied_promo_code})` : ''}</span>
                  <span>−{money(promoDiscount)}</span>
                </div>
              )}
              {planDiscount > 0 && (
                <div className="flex justify-between text-sm text-status-completed">
                  <span>Monthly plan discount</span>
                  <span>−{money(planDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-1">
                <span className="text-base font-semibold text-foreground">
                  {hasFinal ? 'Total paid' : 'Estimated total'}
                </span>
                <span className="text-xl font-bold text-accent">{money(grandTotal)}</span>
              </div>
              {!hasFinal && (
                <div className="mt-2 px-3 py-2 bg-warning/10 border-l-4 border-warning rounded text-xs text-foreground/80">
                  <strong>Estimate only.</strong> Final pricing may vary based on vehicle condition,
                  additional services, or other factors. You&apos;ll be notified if any adjustments are needed.
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleAddToCalendar}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent hover:bg-accent/90 text-accent-foreground font-semibold px-4 h-11 transition-colors flex-1"
              >
                <Download className="w-4 h-4" />
                Add to calendar
              </button>
              {mapUrl && (
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card hover:bg-muted text-foreground font-semibold px-4 h-11 transition-colors flex-1"
                >
                  <MapPin className="w-4 h-4" />
                  Get directions
                </a>
              )}
            </div>

            {/* Questions / contact */}
            <div className="border-t border-border pt-4 text-center">
              <p className="text-xs text-muted-foreground mb-2">Questions about your booking?</p>
              <div className="flex items-center justify-center gap-3">
                <a
                  href={`tel:${bizPhone}`}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
                >
                  <Phone className="w-4 h-4" />
                  Call
                </a>
                <span className="text-border">|</span>
                <a
                  href={`sms:${bizPhone}`}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
                >
                  <MessageSquare className="w-4 h-4" />
                  Text
                </a>
                <span className="text-muted-foreground text-sm">{bizPhone}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Booking reference + home link */}
        <div className="mt-6 text-center space-y-2">
          <p className="text-xs text-muted-foreground">
            Booking reference: <span className="font-mono">{booking.id}</span>
          </p>
          <Link to="/" className="text-sm text-accent font-medium hover:underline">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BookingReceipt;
