// Utility to format date as YYYY-MM-DD in local time
function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { formatTime, parseLocalDate, money } from '@/lib/format';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  ChevronRight,
  ChevronLeft,
  CheckCircle2, 
  AlertCircle,
  Clock,
  Sparkles,
  Truck,
  Home,
  Car,
  MapPin
} from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import axios from 'axios';
import { SUPABASE_FUNCTIONS_URL } from '@/lib/supabase';
import { getVisitorId, getStoredCampaign, getOwnerAccessToken } from '@/lib/campaign';

const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

const BookingWidget = () => {
    // Add-ons state
    const [addOns, setAddOns] = useState([]);
    const [loadingAddOns, setLoadingAddOns] = useState(false);
    const [addOnsError, setAddOnsError] = useState(null);
    // Monthly plans state
    const [monthlyPlans, setMonthlyPlans] = useState([]);
    const [loadingMonthlyPlans, setLoadingMonthlyPlans] = useState(false);
    const [monthlyPlanError, setMonthlyPlanError] = useState(null);
    // Promo code state
    const [promoLoading, setPromoLoading] = useState(false);
    const [promoStatus, setPromoStatus] = useState(null);
    const [promoDetails, setPromoDetails] = useState(null);
    // Set when the visitor landed via a tracked campaign link (e.g. the golf
    // course QR code) so we can auto-apply its promo code and say why.
    const [campaignInfo, setCampaignInfo] = useState(null);
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      customerAddress: '',
      serviceType: 'mobile',
      vehicleSize: 'small',
      vehicleModel: '', // New field for vehicle name/model
      interiorPackageId: null,
      exteriorPackageId: null,
      hasWaterElectric: false,
      customerNotes: '',
      promoCode: '',
      bookingDate: new Date(),
      startTime: '',
      addOns: [], // array of selected add-on IDs
      referralCode: '',
      monthlyPlanId: null // new field for selected monthly plan
    });

    // Promo code handlers (must be after hooks). Accepts an optional code
    // override so the campaign auto-apply effect doesn't have to wait on a
    // setFormData round-trip before validating.
    const handleApplyPromo = async (codeOverride) => {
      const code = (codeOverride ?? formData.promoCode).trim();
      if (!code) return;
      setPromoLoading(true);
      setPromoStatus(null);
      setPromoDetails(null);
      try {
        const response = await axios.post(`${SUPABASE_FUNCTIONS_URL}/validate-promo-code`, {
          code,
          // Sent so a "one per customer" code can warn at apply time if this
          // person already used it (best-effort — may be blank this early, in
          // which case create-booking is the authoritative check at submit).
          customer_email: formData.customerEmail?.trim() || undefined,
          customer_phone: formData.customerPhone?.trim() || undefined,
        }, {
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        if (response.data.success && response.data.promo) {
          setPromoStatus({ success: true, message: 'Promo code applied!' });
          setPromoDetails(response.data.promo);
          calculateBookingWithPromo(response.data.promo);
        } else {
          setPromoStatus({ success: false, message: response.data.error || 'Invalid promo code' });
        }
      } catch (e) {
        setPromoStatus({ success: false, message: e.response?.data?.error || 'Invalid promo code' });
      } finally {
        setPromoLoading(false);
      }
    };

    const calculateBookingWithPromo = async (promo) => {
      try {
        const response = await axios.post(`${SUPABASE_FUNCTIONS_URL}/calculate-booking`, {
          interior_package_id: formData.interiorPackageId,
          exterior_package_id: formData.exteriorPackageId,
          vehicle_size: formData.vehicleSize,
          booking_date: formData.bookingDate ? formatLocalDate(formData.bookingDate) : undefined,
          add_ons: formData.addOns,
          promo_code: promo?.code || formData.promoCode?.trim() || undefined,
          customer_phone: formData.customerPhone?.trim() || undefined
        }, {
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        if (response.data.success) {
          setBookingDetails(response.data);
        }
      } catch (error) {
        console.error('Error calculating booking with promo:', error);
      }
    };

    // Auto-apply a campaign's promo code (e.g. landed via the golf-course QR
    // link) once on mount, so the visitor doesn't have to type anything.
    useEffect(() => {
      const campaign = getStoredCampaign();
      if (!campaign) return;
      setCampaignInfo(campaign);
      if (campaign.promo_code) {
        setFormData((prev) => ({ ...prev, promoCode: campaign.promo_code }));
        handleApplyPromo(campaign.promo_code);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Recalculate booking when promo code changes and is valid
    React.useEffect(() => {
      if (promoStatus?.success && formData.promoCode) {
        calculateBookingWithPromo(promoDetails);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.promoCode]);
  // Fetch add-ons and monthly plans from Supabase on mount
  useEffect(() => {
    async function fetchAddOns() {
      setLoadingAddOns(true);
      setAddOnsError(null);
      try {
        const { data, error } = await supabase
          .from('add_ons')
          .select('*')
          .eq('is_active', true);
        if (error) throw error;
        setAddOns(data || []);
      } catch (error) {
        setAddOnsError('Failed to load add-ons');
        setAddOns([]);
      } finally {
        setLoadingAddOns(false);
      }
    }
    async function fetchMonthlyPlans() {
      setLoadingMonthlyPlans(true);
      setMonthlyPlanError(null);
      try {
        const { data, error } = await supabase
          .from('monthly_plans')
          .select('*')
          .eq('is_active', true);
        if (error) throw error;
        setMonthlyPlans(data || []);
      } catch (error) {
        setMonthlyPlanError('Failed to load monthly plans');
        setMonthlyPlans([]);
      } finally {
        setLoadingMonthlyPlans(false);
      }
    }
    fetchAddOns();
    fetchMonthlyPlans();
  }, []);

  const [packages, setPackages] = useState({ interior: [], exterior: [] });
  const [bookingDetails, setBookingDetails] = useState(null);
  // id of the newly-created booking, used to link to the shareable receipt page.
  const [confirmedBookingId, setConfirmedBookingId] = useState(null);
  // True when the last submission was an owner preview (email sent, nothing saved).
  const [previewOnly, setPreviewOnly] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  // Slots on the selected date that are DROP-OFF ONLY (a subset of availableSlots).
  const [dropoffSlots, setDropoffSlots] = useState([]);
  // Cache of available slots per date (YYYY-MM-DD)
  const [monthSlots, setMonthSlots] = useState({});
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [packagesError, setPackagesError] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitStatus, setSubmitStatus] = useState(null);
  const [blockoutDates, setBlockoutDates] = useState([]);
  const [dropoffOnly, setDropoffOnly] = useState(false);
  // Effective open/close hours for the selected day (trimmed by any block-out),
  // shown to the customer so they can see the day's hours, not just the slots.
  const [dayHours, setDayHours] = useState(null);
  // Fetch blockout dates from Supabase on mount
  useEffect(() => {
    async function fetchBlockoutDates() {
      const { data, error } = await supabase
        .from('blockout_dates')
        .select('*');
      if (!error) setBlockoutDates(data || []);
    }
    fetchBlockoutDates();
  }, []);

  useEffect(() => {
    fetchPackages();
  }, []);

  const calculateBooking = useCallback(async () => {
    if (!formData.interiorPackageId && !formData.exteriorPackageId) {
      setBookingDetails(null);
      return;
    }

    try {
      const response = await axios.post(`${SUPABASE_FUNCTIONS_URL}/calculate-booking`, {
        interior_package_id: formData.interiorPackageId,
        exterior_package_id: formData.exteriorPackageId,
        vehicle_size: formData.vehicleSize,
        booking_date: formData.bookingDate ? formatLocalDate(formData.bookingDate) : undefined,
        add_ons: formData.addOns,
        referral_code: formData.referralCode?.trim() || undefined,
        customer_phone: formData.customerPhone?.trim() || undefined,
        monthly_plan_id: formData.monthlyPlanId || undefined
      }, {
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        setBookingDetails(response.data);
      }
    } catch (error) {
      console.error('Error calculating booking:', error);
    }
  }, [formData.interiorPackageId, formData.exteriorPackageId, formData.vehicleSize, formData.bookingDate, formData.addOns, formData.referralCode, formData.customerPhone, formData.monthlyPlanId]);

  useEffect(() => {
    calculateBooking();
  }, [calculateBooking]);

  // Duration drives slot availability. Depend on this primitive (not the whole
  // bookingDetails object) so slot fetches don't re-fire on unrelated price
  // changes — that object churn was the source of the calendar flicker.
  const durationMinutes = bookingDetails?.total_duration || null;

  // Fetch the slot list for the selected date (one call).
  const fetchAvailableSlots = useCallback(async () => {
    if (!formData.bookingDate || !durationMinutes) {
      setAvailableSlots([]);
      setDropoffSlots([]);
      setDropoffOnly(false);
      setDayHours(null);
      return;
    }
    setSlotsLoading(true);
    try {
      const response = await axios.post(`${SUPABASE_FUNCTIONS_URL}/available-slots`, {
        booking_date: formatLocalDate(formData.bookingDate),
        duration_minutes: durationMinutes
      }, {
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.data.success) {
        setAvailableSlots(response.data.slots || []);
        setDropoffSlots(response.data.dropoff_slots || []);
        setDropoffOnly(!!response.data.dropoff_only);
        setDayHours(response.data.hours || null);
      } else {
        setAvailableSlots([]);
        setDropoffSlots([]);
        setDropoffOnly(false);
        setDayHours(null);
      }
    } catch (error) {
      setAvailableSlots([]);
      setDropoffSlots([]);
      setDropoffOnly(false);
      setDayHours(null);
    } finally {
      setSlotsLoading(false);
    }
  }, [formData.bookingDate, durationMinutes]);

  // Fetch availability for the whole visible month in a SINGLE range call so the
  // calendar can grey-out fully-blocked days. (Previously ~30 sequential calls.)
  useEffect(() => {
    if (!durationMinutes) {
      setMonthSlots({});
      return;
    }
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDate = formatLocalDate(new Date(year, month, 1));
    const endDate = formatLocalDate(new Date(year, month, daysInMonth));
    let cancelled = false;
    (async () => {
      try {
        const response = await axios.post(`${SUPABASE_FUNCTIONS_URL}/available-slots`, {
          start_date: startDate,
          end_date: endDate,
          duration_minutes: durationMinutes
        }, {
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        if (cancelled) return;
        if (response.data.success && response.data.days) {
          const map = {};
          for (const [date, info] of Object.entries(response.data.days)) {
            map[date] = info.slots || [];
          }
          setMonthSlots(map);
        }
      } catch {
        if (!cancelled) setMonthSlots({});
      }
    })();
    return () => { cancelled = true; };
  }, [calendarMonth, durationMinutes]);

  // Update the selected-date slot list when the date (or duration) changes.
  useEffect(() => {
    fetchAvailableSlots();
  }, [fetchAvailableSlots]);

  // If the chosen date is drop-off only, never let a mobile booking through:
  // force serviceType to 'dropoff' whenever dropoffOnly becomes true.
  useEffect(() => {
    if (dropoffOnly && formData.serviceType === 'mobile') {
      setFormData((prev) => ({ ...prev, serviceType: 'dropoff' }));
    }
  }, [dropoffOnly, formData.serviceType]);

  const fetchPackages = async () => {
    try {
      setLoadingPackages(true);
      setPackagesError(null);
      
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .eq('is_active', true)
        .order('base_price');
      
      if (error) throw error;
      
      const interior = data.filter(p => p.category === 'interior');
      const exterior = data.filter(p => p.category === 'exterior');
      setPackages({ interior, exterior });
    } catch (error) {
      console.error('Error fetching packages:', error);
      setPackagesError('Failed to load packages');
    } finally {
      setLoadingPackages(false);
    }
  };

  const getPackageByTier = (category, tier) => {
    return packages[category].find(p => p.tier === tier);
  };

  const prevMonth = () => {
    const prev = new Date(formData.bookingDate);
    prev.setMonth(prev.getMonth() - 1);
    setFormData({ ...formData, bookingDate: prev, startTime: '' });
  };

  const nextMonth = () => {
    const next = new Date(formData.bookingDate);
    next.setMonth(next.getMonth() + 1);
    setFormData({ ...formData, bookingDate: next, startTime: '' });
  };

  const nextStep = () => {
    if (loadingPackages) return;
    // Step 1: Service selection
    if (step === 1 && !formData.interiorPackageId && !formData.exteriorPackageId) {
      setErrors({ packages: 'Please select at least one service' });
      return;
    }
    // Step 3: Require selected date and time slot
    if (step === 3) {
      if (!formData.bookingDate) {
        setErrors({ bookingDate: 'Please select a date' });
        return;
      }
      if (!formData.startTime) {
        setErrors({ startTime: 'Please select a time slot' });
        return;
      }
    }
    // Step 4: Require Vehicle Name/Model
    if (step === 4 && !formData.vehicleModel.trim()) {
      setErrors({ vehicleModel: 'Vehicle Name/Model is required' });
      return;
    }
    setErrors({});
    setStep(step + 1);
    // Scroll to top of widget
    const widget = document.getElementById('booking-widget');
    if (widget) {
      widget.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const prevStep = () => {
    setErrors({});
    setStep(step - 1);
    // Scroll to top of widget
    const widget = document.getElementById('booking-widget');
    if (widget) {
      widget.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleSubmit = async () => {
    const newErrors = {};

    if (!formData.customerName.trim()) newErrors.customerName = 'Name is required';
    if (!formData.customerPhone.trim()) newErrors.customerPhone = 'Phone is required';
    if (!formData.customerEmail.trim()) newErrors.customerEmail = 'Email is required';
    if (formData.serviceType === 'mobile') {
      if (!formData.customerAddress.trim()) {
        newErrors.customerAddress = 'Address is required for mobile service';
      }
      if (!formData.hasWaterElectric) {
        newErrors.hasWaterElectric = 'You must confirm water/electric access for mobile service';
      }
    }
    if (!formData.bookingDate) newErrors.bookingDate = 'Please select a date';
    if (!formData.startTime) newErrors.startTime = 'Please select a time slot';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setSubmitStatus(null);

    try {
      // Calculate end_time based on start_time + duration
      const bookingDateStr = formatLocalDate(formData.bookingDate);
      const [hours, mins] = formData.startTime.split(':').map(Number);
      const startMinutes = hours * 60 + mins;
      const endMinutes = startMinutes + bookingDetails.total_duration;
      const endHours = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      const endTimeStr = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}:00`;

      const bookingData = {
        customer_name: formData.customerName,
        customer_phone: formData.customerPhone,
        customer_email: formData.customerEmail,
        customer_address: formData.serviceType === 'mobile' ? formData.customerAddress : null,
        service_type: formData.serviceType,
        vehicle_size: formData.vehicleSize,
        vehicle_model: formData.vehicleModel, // Send vehicle model
        interior_package_id: formData.interiorPackageId,
        exterior_package_id: formData.exteriorPackageId,
        has_water_electric: formData.hasWaterElectric,
        customer_notes: formData.customerNotes,
        booking_date: bookingDateStr,
        start_time: `${formData.startTime}:00`,
        end_time: endTimeStr,
        status: 'pending',
        add_ons: formData.addOns, // pass selected add-on IDs to backend
        referral_code: formData.referralCode?.trim() || null,
        applied_promo_code: formData.promoCode?.trim() || null,
        monthly_plan_id: formData.monthlyPlanId || null,
        // Campaign attribution — resolved server-side from the slug, this just
        // tells create-booking which campaign (if any) to credit.
        visitor_id: getVisitorId(),
        campaign_slug: getStoredCampaign()?.slug || null,
        // If the OWNER is submitting (signed into /admin), attach their verified
        // token so create-booking treats this as a no-persist preview: the
        // confirmation email still sends, but nothing is saved to the dashboard.
        owner_access_token: (await getOwnerAccessToken()) || undefined
      };

      const response = await axios.post(`${SUPABASE_FUNCTIONS_URL}/create-booking`, bookingData, {
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success && response.data.booking) {
        const isPreview = !!response.data.test;
        setPreviewOnly(isPreview);
        setSubmitStatus({
          type: 'success',
          message: isPreview
            ? 'Preview sent! The confirmation email was sent — nothing was saved to your bookings.'
            : 'Booking confirmed! Check your email for details.'
        });
        // A preview isn't a real booking, so there's no shareable receipt page.
        setConfirmedBookingId(isPreview ? null : response.data.booking.id);
        // Move to step 6 for a dedicated success screen
        setStep(6);
      } else {
        throw new Error('Booking creation failed');
      }
    } catch (error) {
      console.error('Error creating booking:', error.response?.data || error);
      setSubmitStatus({
        type: 'error',
        message: error.response?.data?.error || error.response?.data?.details || 'Failed to create booking. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const filterDate = (date) => {
    const day = date.getDay();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return false;
    // Only gray out if there is an all-day blockout for this date
    for (const blockout of blockoutDates) {
      const start = parseLocalDate(blockout.start_date);
      const end = parseLocalDate(blockout.end_date || blockout.start_date);
      start.setHours(0,0,0,0);
      end.setHours(0,0,0,0);
      const d = new Date(date);
      d.setHours(0,0,0,0);
      if (d >= start && d <= end && blockout.all_day) {
        return false;
      }
    }
    // Gray out if there are no available slots for this date (from monthSlots cache)
    const dateStr = formatLocalDate(date);
    if (monthSlots[dateStr] && monthSlots[dateStr].length === 0) {
      return false;
    }
    return day >= 0 && day <= 6;
  };

  return (
    <section id="booking-widget" className="py-20 lg:py-28 bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-card/50 rounded-3xl p-5 lg:p-6 border border-border shadow-xl"
        >
          {/* Header - Bigger */}
          <div className="text-center mb-4 flex flex-col items-center">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">
              Schedule Your <span className="text-accent">Car Wash</span>
            </h2>
            {/* Premium shine-gold accent strip under the title */}
            <div className="shine-gold mt-3 h-1.5 w-24 sm:w-32 rounded-full" />
          </div>

          {/* Progress Bar - Condensed with step indicator on same line */}
          <div className="mb-5 flex items-center gap-3">
            <span className="text-xs text-accent font-medium whitespace-nowrap">Step {step > 5 ? 6 : step}/6</span>
            <div className="flex gap-1 flex-1">
              {[1, 2, 3, 4, 5, 6].map((s) => (
                <div
                  key={s}
                  className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                    s <= (step > 5 ? 6 : step) ? 'bg-accent' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Success/Error Message */}
          <AnimatePresence>
            {submitStatus && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`mb-6 p-4 rounded-xl border-2 flex items-start gap-3 ${
                  submitStatus.type === 'success' 
                    ? 'bg-green-700/20 border-green-700/50' 
                    : 'bg-red-500/10 border-red-500/50'
                }`}
              >
                {submitStatus.type === 'success' ? (
                  <CheckCircle2 className="w-6 h-6 text-green-900 opacity-60 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
                )}
                <p className={submitStatus.type === 'success' ? 'text-black' : 'text-red-900'}>
                  {submitStatus.message}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Step Content */}
          <AnimatePresence mode="wait">
            {/* Step 1: Service Selection */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {errors.packages && (
                  <p className="text-sm text-red-500 text-center mb-2">{errors.packages}</p>
                )}
                {loadingPackages && (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent mx-auto"></div>
                    <p className="text-gray-300 text-sm mt-2">Loading services...</p>
                  </div>
                )}
                {packagesError && (
                  <div className="text-center py-4">
                    <p className="text-red-500 text-sm">{packagesError}</p>
                    <button onClick={fetchPackages} className="text-accent hover:underline text-sm">Retry</button>
                  </div>
                )}
                {!loadingPackages && !packagesError && (
                  <>
                    {/* Exterior Section Header */}
                    <div className="mb-3">
                      <h4 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <div className="w-1.5 h-6 bg-accent rounded-full" />
                        Exterior Detailing
                      </h4>
                    </div>

                {/* Exterior Packages - 3 square boxes */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mr-auto">
                  {['standard', 'deluxe', 'ultimate'].map((tier) => {
                    const pkg = getPackageByTier('exterior', tier);
                    if (!pkg) return null;
                    
                    const isSelected = formData.exteriorPackageId === pkg.id;
                    const tierLevel = tier === 'standard' ? 1 : tier === 'deluxe' ? 2 : 3;
                    
                    return (
                      <div key={pkg.id} className="relative">
                        {/* Deluxe — tokenized blue shine outline */}
                        {tierLevel === 2 && !isSelected && (
                          <div
                            className="shine-premium absolute -inset-[2px] rounded-lg pointer-events-none"
                            style={{
                              padding: '2px',
                              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                              WebkitMaskComposite: 'xor',
                              maskComposite: 'exclude',
                            }}
                          />
                        )}

                        {/* Ultimate — gold+blue shine outline (matches the Services cards) */}
                        {tierLevel === 3 && !isSelected && (
                          <div
                            className="shine-gold absolute -inset-[2px] rounded-lg pointer-events-none"
                            style={{
                              padding: '2px',
                              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                              WebkitMaskComposite: 'xor',
                              maskComposite: 'exclude',
                            }}
                          />
                        )}
                        
                        <button
                          onClick={() => setFormData({...formData, exteriorPackageId: isSelected ? null : pkg.id})}
                          data-testid={`exterior-${tier}-btn`}
                          className={`relative w-full p-3 rounded-lg text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-lg border-[3px] flex flex-row items-center gap-3 min-h-[64px] sm:min-h-[80px] ${
                            isSelected
                              ? tierLevel === 1
                                ? 'bg-gray-200 border-gray-400'
                                : tierLevel === 2
                                  ? 'bg-blue-200 border-blue-500'
                                  : 'bg-gradient-to-br from-sky-100 via-white to-amber-100 border-amber-400'
                              : tierLevel === 1
                                ? 'bg-card border-border hover:bg-card/80'
                                : 'bg-card border-transparent hover:bg-card/80'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            tierLevel === 3 ? 'bg-amber-500/20' : tierLevel === 1 ? 'bg-gray-500/20' : 'bg-accent/20'
                          }`}>
                            <Sparkles className={`w-4 h-4 ${
                              tierLevel === 3 ? 'text-amber-500' : tierLevel === 1 ? 'text-gray-400' : 'text-accent'
                            }`} />
                          </div>
                          {/* Slim row: description left, price right on mobile */}
                          <div className="flex-1 flex flex-row items-center justify-between gap-2">
                            <div>
                              <h4 className="text-gray-900 font-semibold text-xs break-words">{pkg.description}</h4>
                              <p className="text-[10px] text-gray-500 mt-0.5">Starting at</p>
                            </div>
                            <span className="text-base font-bold text-gray-900 whitespace-nowrap ml-2">${pkg.base_price}</span>
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="w-5 h-5 text-accent absolute top-1.5 right-1.5" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Interior Section Header */}
                <div className="mb-3 mt-6">
                  <h4 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <div className="w-1.5 h-6 bg-accent rounded-full" />
                    Interior Detailing
                  </h4>
                </div>

                {/* Interior Packages - 3 square boxes */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mr-auto">
                  {['standard', 'deluxe', 'ultimate'].map((tier) => {
                    const pkg = getPackageByTier('interior', tier);
                    if (!pkg) return null;
                    
                    const isSelected = formData.interiorPackageId === pkg.id;
                    const tierLevel = tier === 'standard' ? 1 : tier === 'deluxe' ? 2 : 3;
                    
                    return (
                      <div key={pkg.id} className="relative">
                        {/* Deluxe — tokenized blue shine outline */}
                        {tierLevel === 2 && !isSelected && (
                          <div
                            className="shine-premium absolute -inset-[2px] rounded-lg pointer-events-none"
                            style={{
                              padding: '2px',
                              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                              WebkitMaskComposite: 'xor',
                              maskComposite: 'exclude',
                            }}
                          />
                        )}

                        {/* Ultimate — gold+blue shine outline (matches the Services cards) */}
                        {tierLevel === 3 && !isSelected && (
                          <div
                            className="shine-gold absolute -inset-[2px] rounded-lg pointer-events-none"
                            style={{
                              padding: '2px',
                              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                              WebkitMaskComposite: 'xor',
                              maskComposite: 'exclude',
                            }}
                          />
                        )}
                        
                        <button
                          onClick={() => setFormData({...formData, interiorPackageId: isSelected ? null : pkg.id})}
                          data-testid={`interior-${tier}-btn`}
                          className={`relative w-full p-3 rounded-lg text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-lg border-[3px] flex flex-row items-center gap-3 min-h-[64px] sm:min-h-[80px] ${
                            isSelected
                              ? tierLevel === 1
                                ? 'bg-gray-200 border-gray-400'
                                : tierLevel === 2
                                  ? 'bg-blue-200 border-blue-500'
                                  : 'bg-gradient-to-br from-sky-100 via-white to-amber-100 border-amber-400'
                              : tierLevel === 1
                                ? 'bg-card border-border hover:bg-card/80'
                                : 'bg-card border-transparent hover:bg-card/80'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isSelected
                              ? tierLevel === 1
                                ? 'bg-gray-300'
                                : tierLevel === 2
                                  ? 'bg-blue-200'
                                  : 'bg-accent/20'
                              : tierLevel === 3
                                ? 'bg-amber-500/20'
                                : tierLevel === 1
                                  ? 'bg-gray-500/20'
                                  : 'bg-accent/20'
                          }`}>
                            <Sparkles className={`w-4 h-4 ${
                              tierLevel === 3 ? 'text-amber-500' : tierLevel === 1 ? 'text-gray-400' : 'text-accent'
                            }`} />
                          </div>
                          {/* Slim row: description left, price right on mobile */}
                          <div className="flex-1 flex flex-row items-center justify-between gap-2">
                            <div>
                              <h4 className="text-gray-900 font-semibold text-xs break-words">{pkg.description}</h4>
                              <p className="text-[10px] text-gray-500 mt-0.5">Starting at</p>
                            </div>
                            <span className="text-base font-bold text-gray-900 whitespace-nowrap ml-2">${pkg.base_price}</span>
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="w-5 h-5 text-accent absolute top-1.5 right-1.5" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
                  </>
                )}
              </motion.div>
            )}

            {/* Step 2: Add-On Selection (NEW, fully separate step) */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {/* Monthly Plan Selection */}
                <div className="mb-4">
                  <Label className="block mb-2 text-base font-semibold">Monthly Detail Plan (optional)</Label>
                  {loadingMonthlyPlans ? (
                    <div className="text-sm text-gray-500">Loading monthly plans...</div>
                  ) : monthlyPlanError ? (
                    <div className="text-sm text-red-500">{monthlyPlanError}</div>
                  ) : monthlyPlans.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mr-auto" id="booking-widget-monthlyplans">
                      {monthlyPlans.map((plan) => {
                        const isSelected = formData.monthlyPlanId === plan.id;
                        return (
                          <button
                            key={plan.id}
                            type="button"
                            onClick={() => setFormData({ ...formData, monthlyPlanId: isSelected ? null : plan.id })}
                            className={`relative w-full p-3 rounded-lg text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-lg border-[3px] flex flex-row items-center gap-3 min-h-[64px] sm:min-h-[80px] ${
                              isSelected
                                ? 'bg-blue-100 border-blue-500/70'
                                : 'bg-card border-blue-500/50 hover:bg-blue-50'
                            }`}
                          >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-200">
                              <Sparkles className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="flex-1 flex flex-row items-center justify-between gap-2">
                              <div>
                                <h4 className="text-blue-900 font-semibold text-xs break-words">{plan.name}</h4>
                              </div>
                              <span className="text-base font-bold text-blue-900 whitespace-nowrap ml-2">
                                {plan.discount_type === 'percentage'
                                  ? `${plan.discount_value}% off`
                                  : `${money(plan.discount_value)} off`}
                              </span>
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="w-5 h-5 text-blue-600 absolute top-1.5 right-1.5" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">No monthly plans available</div>
                  )}
                </div>
                <h4 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-6 bg-accent rounded-full" />
                  Select Add-Ons (Optional)
                </h4>
                {loadingAddOns && (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent mx-auto"></div>
                    <p className="text-gray-300 text-sm mt-2">Loading add-ons...</p>
                  </div>
                )}
                {addOnsError && (
                  <div className="text-center py-4">
                    <p className="text-red-500 text-sm">{addOnsError}</p>
                  </div>
                )}
                {!loadingAddOns && !addOnsError && addOns.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mr-auto" id="booking-widget-addons">
                    {addOns.map((addon) => {
                      const isSelected = formData.addOns.includes(addon.id);
                      return (
                        <button
                          key={addon.id}
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              addOns: isSelected
                                ? prev.addOns.filter((id) => id !== addon.id)
                                : [...prev.addOns, addon.id]
                            }));
                            // Scroll to top of Add-Ons grid
                            const grid = document.getElementById('booking-widget-addons');
                            if (grid) {
                              grid.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                          }}
                          className={`relative w-full p-3 rounded-lg text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-lg border-[3px] flex flex-row items-center gap-3 min-h-[64px] sm:min-h-[80px] ${
                            isSelected
                              ? 'bg-green-100 border-green-500/50'
                              : 'bg-card border-green-500/50 hover:bg-card/80'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-accent/20">
                            {addon.name === 'Pet Hair Removal' ? (
                              <Sparkles className="w-4 h-4 text-accent" />
                            ) : addon.name === 'Water Spot Treatment' ? (
                              <Sparkles className="w-4 h-4 text-emerald-600" />
                            ) : addon.name === 'Water Spot Removal' ? (
                              <Sparkles className="w-4 h-4 text-emerald-600" />
                            ) : addon.name === 'Clay Bar & 6-Month Ceramic Sealant' ? (
                              <Sparkles className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Sparkles className="w-4 h-4 text-accent" />
                            )}
                          </div>
                          <div className="flex-1 flex flex-row items-center justify-between gap-2">
                            <div>
                              <h4 className="text-gray-900 font-semibold text-xs break-words">{addon.name}</h4>
                            </div>
                            <span className="text-base font-bold text-gray-900 whitespace-nowrap ml-2">${addon.price}</span>
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="w-5 h-5 text-green-600 absolute top-1.5 right-1.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
                {/* Navigation handled by main widget controls below */}
              </motion.div>
            )}

            {/* Step 4: Service Type & Vehicle Size */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Service Type */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Service Type</h3>
                  <div className="grid md:grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        if (dropoffOnly) return;
                        setFormData({...formData, serviceType: 'mobile'});
                      }}
                      disabled={dropoffOnly}
                      aria-disabled={dropoffOnly}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        dropoffOnly
                          ? 'border-border bg-muted opacity-50 cursor-not-allowed'
                          : formData.serviceType === 'mobile'
                            ? 'border-accent bg-accent/20'
                            : 'border-border bg-card hover:border-muted-foreground'
                      }`}
                    >
                      <Truck className="w-6 h-6 text-accent mb-2 mx-auto" />
                      <h4 className="text-gray-900 font-semibold text-base mb-1">Mobile Service</h4>
                      <p className="text-sm text-gray-600">We come to you</p>
                    </button>

                    <button
                      onClick={() => setFormData({...formData, serviceType: 'dropoff'})}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        formData.serviceType === 'dropoff'
                          ? 'border-accent bg-accent/20'
                          : 'border-border bg-card hover:border-muted-foreground'
                      }`}
                    >
                      <Home className="w-6 h-6 text-accent mb-2 mx-auto" />
                      <h4 className="text-gray-900 font-semibold text-base mb-1">Drop-Off</h4>
                      <p className="text-sm text-gray-600">Bring to us</p>
                    </button>
                  </div>
                  {dropoffOnly && (
                    <p className="mt-2 text-xs text-amber-700 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      This date is drop-off only — mobile isn't available. Pick another date for mobile service.
                    </p>
                  )}
                </div>

                {/* Vehicle Size */}
                <div>
                  <div className="flex items-center mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 mr-2">Vehicle Size</h3>
                    <span className="text-xs text-yellow-600 font-semibold">Price will adjust based on vehicle size.</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    {[
                      { value: 'small', label: 'Small' },
                      { value: 'medium', label: 'Medium' },
                      { value: 'large', label: 'Large' }
                    ].map((size) => (
                      <button
                        key={size.value}
                        onClick={() => setFormData({...formData, vehicleSize: size.value})}
                        className={`p-3 rounded-xl border-2 transition-all ${
                          formData.vehicleSize === size.value
                            ? 'border-accent bg-accent/20'
                            : 'border-border bg-card hover:border-muted-foreground'
                        }`}
                      >
                        <Car className="w-5 h-5 text-accent mb-1 mx-auto" />
                        <h4 className="text-gray-900 font-semibold text-sm mb-0.5">{size.label}</h4>
                      </button>
                    ))}
                  </div>
                  <div className="mt-2">
                    <label className="block text-sm font-medium text-gray-900 mb-1">Vehicle Name/Model *</label>
                    <input
                      type="text"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-gray-900 bg-white/90 ${errors.vehicleModel ? 'border-red-500' : 'border-border'}`}
                      placeholder="e.g. Toyota Camry, Honda Civic, etc."
                      value={formData.vehicleModel}
                      onChange={e => setFormData({...formData, vehicleModel: e.target.value})}
                      required
                    />
                    {errors.vehicleModel && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.vehicleModel}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Date and Time Selection */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h3 className="text-base font-semibold text-gray-900 text-center mb-3">
                  Choose date & time
                </h3>
                <div className="flex flex-col lg:flex-row gap-6 items-start">
                  {/* Calendar Section */}
                  <div className="flex-1 min-w-[280px]">
                    <div className="bg-white/90 rounded-xl p-2 border-2 border-border overflow-x-auto">
                      <Calendar
                        mode="single"
                        selected={formData.bookingDate}
                        onSelect={(date) => {
                          setFormData({...formData, bookingDate: date, startTime: ''});
                        }}
                        disabled={(date) => date < new Date() || !filterDate(date)}
                        initialFocus
                        month={calendarMonth}
                        onMonthChange={setCalendarMonth}
                      />
                    </div>
                    {errors.bookingDate && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.bookingDate}
                      </p>
                    )}
                  </div>

                  {/* Time Selection Section */}
                  {formData.bookingDate && (
                    <div className="flex-1 w-full lg:max-w-xs">
                      {dayHours && (
                        <div className="mb-2 flex items-center gap-1.5 px-1 text-sm font-semibold text-gray-800">
                          <Clock className="w-4 h-4 text-accent" />
                          <span>Hours this day: {formatTime(dayHours.open)} – {formatTime(dayHours.close)}</span>
                        </div>
                      )}
                      <p className="text-[11px] leading-relaxed text-gray-500 mb-3 px-1">
                        Your appointment time is approximate — we aim to arrive within about 30 minutes of it.
                      </p>

                      {/* Loading State */}
                      {slotsLoading && (
                        <div className="flex items-center justify-center py-6">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent"></div>
                          <span className="ml-2 text-gray-300 text-sm">Loading available times...</span>
                        </div>
                      )}


                      {/* Time Slots Grid */}
                      {(!slotsLoading && availableSlots.length > 0) ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {availableSlots
                            .filter((slot) => {
                              // Only allow slots at least 2 hours from now (if booking for today)
                              if (!formData.bookingDate) return true;
                              const now = new Date();
                              const bookingDate = new Date(formData.bookingDate);
                              const [slotHour, slotMinute] = slot.split(":").map(Number);
                              bookingDate.setHours(slotHour, slotMinute, 0, 0);
                              // If booking date is today, check time
                              if (
                                now.toDateString() === bookingDate.toDateString() &&
                                (bookingDate.getTime() - now.getTime()) < 2 * 60 * 60 * 1000
                              ) {
                                return false;
                              }
                              // Otherwise allow
                              return true;
                            })
                            .map((slot) => {
                              const isSelected = formData.startTime === slot;
                              // A slot inside a drop-off-only window can be booked,
                              // but only as a drop-off — selecting it forces that.
                              const isDropoffSlot = dropoffSlots.includes(slot);
                              const displayTime = formatTime(slot);
                              return (
                                <button
                                  key={slot}
                                  type="button"
                                  onClick={() => setFormData({
                                    ...formData,
                                    startTime: slot,
                                    ...(isDropoffSlot ? { serviceType: 'dropoff' } : {})
                                  })}
                                  data-testid={`time-slot-${slot}`}
                                  title={isDropoffSlot ? 'Drop-off only at this time' : undefined}
                                  className={`py-2 px-2 rounded-lg text-xs font-medium transition-all leading-tight ${
                                    isSelected
                                      ? "bg-accent text-white"
                                      : isDropoffSlot
                                        ? "bg-amber-600/90 text-white hover:bg-amber-600"
                                        : "bg-gray-700 text-white hover:bg-gray-600"
                                  }`}
                                >
                                  {displayTime}
                                  {isDropoffSlot && (
                                    <span className="block text-[9px] font-semibold opacity-90">Drop-off</span>
                                  )}
                                </button>
                              );
                            })}
                        </div>
                      ) : null}

                      {/* Drop-off window notice — cleaner, and tells them the window */}
                      {dropoffSlots.length > 0 && (
                        <div className="mt-4 p-3 rounded-xl border border-amber-400/70 bg-amber-50 flex items-start gap-2.5">
                          <Truck className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                          <p className="text-xs leading-relaxed text-amber-900 m-0">
                            {dropoffOnly ? (
                              <><strong>Drop-off only this day.</strong> Mobile service isn't available — bring your vehicle to us.</>
                            ) : (
                              <><strong>Drop-off only from {formatTime(dropoffSlots[0])} to {formatTime(dropoffSlots[dropoffSlots.length - 1])}</strong> (marked “Drop-off” above). Other times are available for mobile service.</>
                            )}
                          </p>
                        </div>
                      )}

                      {/* No Slots Available */}
                      {!slotsLoading && availableSlots.length === 0 && bookingDetails && (
                        <div className="p-3 bg-amber-500/10 border border-amber-500/50 rounded-lg">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                            <p className="text-gray-900 text-xs">
                              No available slots for this date. Please choose another date.
                            </p>
                          </div>
                        </div>
                      )}

                      {errors.startTime && (
                        <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.startTime}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 5: Customer Information */}
            {step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h3 className="text-lg font-semibold text-gray-900 text-center mb-4">
                  Your Information
                </h3>

                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-gray-900 mb-1 block text-sm">Full Name *</Label>
                    <Input
                      value={formData.customerName}
                      onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                      className="bg-white/90 border-border text-gray-900 focus:border-accent h-10 text-sm"
                      placeholder="John Doe"
                      autoComplete="name"
                    />
                    {errors.customerName && (
                      <p className="text-xs text-red-500 mt-1">{errors.customerName}</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-gray-900 mb-1 block text-sm">Phone *</Label>
                    <Input
                      value={formData.customerPhone}
                      onChange={(e) => setFormData({...formData, customerPhone: e.target.value})}
                      className="bg-white/90 border-border text-gray-900 focus:border-accent h-10 text-sm"
                      placeholder="(555) 123-4567"
                      autoComplete="tel"
                    />
                    {errors.customerPhone && (
                      <p className="text-xs text-red-500 mt-1">{errors.customerPhone}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-gray-900 mb-1 block text-sm">Email *</Label>
                  <Input
                    type="email"
                    value={formData.customerEmail}
                    onChange={(e) => setFormData({...formData, customerEmail: e.target.value})}
                    className="bg-white/90 border-border text-gray-900 focus:border-accent h-10 text-sm"
                    placeholder="john@example.com"
                    autoComplete="email"
                  />
                  {errors.customerEmail && (
                    <p className="text-xs text-red-500 mt-1">{errors.customerEmail}</p>
                  )}
                </div>

                {formData.serviceType === 'mobile' && (
                  <>
                    <div>
                      <Label className="text-gray-900 mb-1 block text-sm flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        Service Address *
                      </Label>
                      <Input
                        value={formData.customerAddress}
                        onChange={(e) => setFormData({...formData, customerAddress: e.target.value})}
                        className="bg-white/90 border-border text-gray-900 focus:border-accent h-10 text-sm"
                        placeholder="123 Main St, Lakewood, CA"
                        autoComplete="street-address"
                      />
                      {errors.customerAddress && (
                        <p className="text-xs text-red-500 mt-1">{errors.customerAddress}</p>
                      )}
                    </div>

                    <div className="flex items-start gap-2 p-3 bg-white/50 rounded-lg border border-border">
                      <input
                        type="checkbox"
                        id="water-electric"
                        checked={formData.hasWaterElectric}
                        onChange={(e) => setFormData({...formData, hasWaterElectric: e.target.checked})}
                        className="mt-0.5"
                        required
                      />
                      <Label htmlFor="water-electric" className="cursor-pointer flex-1 text-gray-900 text-xs">
                        I confirm that access to a working water hose and an electrical outlet will be available at the service location.
                      </Label>
                    </div>
                    {errors.hasWaterElectric && (
                      <p className="text-xs text-red-500 mt-1">{errors.hasWaterElectric}</p>
                    )}
                  </>
                )}


                {/* Promo Code Input - Only show on step 5 */}

                {step === 5 && (
                  <div className="mb-4">
                    {campaignInfo && (
                      <div className="mb-2 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-xs text-gray-700">
                        🎉 You're here via our <strong>{campaignInfo.name}</strong> link{campaignInfo.promo_code ? ' — your discount is applied below' : ''}.
                      </div>
                    )}
                    <Label className="text-gray-900 mb-1 block text-sm">Promo Code</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        value={formData.promoCode}
                        onChange={e => {
                          setFormData({ ...formData, promoCode: e.target.value });
                          setPromoStatus(null);
                        }}
                        className="bg-white/90 border-border text-gray-900 focus:border-accent h-10 text-sm flex-1"
                        placeholder="Enter promo code"
                        disabled={promoLoading}
                      />
                      <Button
                        type="button"
                        className={`transition-all duration-300 ${promoStatus?.success ? 'bg-green-600' : 'bg-accent'}`}
                        onClick={handleApplyPromo}
                        disabled={promoLoading || !formData.promoCode.trim()}
                      >
                        {promoLoading ? (
                          <span className="animate-spin">⏳</span>
                        ) : promoStatus?.success ? (
                          <span className="animate-bounce">✔</span>
                        ) : (
                          'Apply'
                        )}
                      </Button>
                    </div>
                    {promoStatus && (
                      <div className={`mt-1 text-xs ${promoStatus.success ? 'text-green-600' : 'text-red-500'}`}>{promoStatus.message}</div>
                    )}

                    {/* Show applied promo code details below input */}
                    {promoStatus?.success && promoDetails && (
                      <div className="mt-3 flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
                        <div className="flex-1">
                          <span className="font-mono font-bold text-green-700">{promoDetails.code}</span>
                          <span className="ml-2 text-green-700 font-semibold">
                            {promoDetails.type === 'percentage'
                              ? `${promoDetails.value}% off`
                              : `$${promoDetails.value} off`}
                          </span>
                        </div>
                        <Button
                          type="button"
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-semibold"
                          onClick={() => {
                            setFormData({ ...formData, promoCode: '' });
                            setPromoStatus(null);
                            setPromoDetails(null);
                            // Optionally, recalculate booking without promo
                            calculateBookingWithPromo({ code: '' });
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <Label className="text-gray-900 mb-1 block text-sm">Notes</Label>
                  <Textarea
                    value={formData.customerNotes}
                    onChange={(e) => setFormData({...formData, customerNotes: e.target.value})}
                    className="bg-white/90 border-border text-gray-900 focus:border-accent text-sm"
                    placeholder="Referral, comments, or requests"
                    rows={3}
                  />
                </div>
              </motion.div>
            )}

            {/* Step 6: Booking Success (separate screen) */}
            {step === 6 && (
              <motion.div
                key="step6-success"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 text-center"
              >
                <div className="py-12 flex flex-col items-center justify-center">
                  <CheckCircle2 className="w-20 h-20 text-green-700 mb-6" />
                  <h3 className="text-3xl font-bold text-gray-900 mb-2">
                    {previewOnly ? 'Preview Sent!' : 'Booking Successful!'}
                  </h3>
                  {previewOnly && (
                    <div className="mb-4 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm font-semibold max-w-md mx-auto">
                      Owner preview — the confirmation email was sent so you can see it, but this booking was <strong>not saved</strong> and won't appear in your dashboard.
                    </div>
                  )}
                  <p className="text-lg text-gray-700 mb-4">
                    {previewOnly
                      ? 'A confirmation email has been sent so you can see exactly what a customer receives.'
                      : 'Thank you for your booking. A confirmation email has been sent to you.'}
                  </p>
                  {/* Show promo code if applied */}
                  {formData.promoCode && promoStatus?.success && promoDetails && (
                    <div className="mb-4 px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-green-700 text-base font-semibold">
                      Promo code <span className="font-mono">{promoDetails.code}</span> applied: {promoDetails.type === 'percentage' ? `${promoDetails.value}% off` : `$${promoDetails.value} off`}
                    </div>
                  )}
                  <p className="text-base text-gray-600 mb-2">
                    If you have any questions, please contact us.
                  </p>
                  {/* Show drop-off address if drop-off booking */}
                  {formData.serviceType === 'dropoff' && (
                    <div className="mt-4 px-4 py-3 bg-blue-50 border-l-4 border-blue-400 text-blue-900 rounded text-base max-w-md mx-auto">
                      <strong>Drop-off Location:</strong><br />
                      3538 del amo blvd lakewood ca
                    </div>
                  )}
                  <div className="mt-4 px-4 py-2 bg-yellow-100 border-l-4 border-yellow-400 text-yellow-800 rounded text-sm max-w-md mx-auto">
                    <strong>Disclaimer:</strong> The price shown is an estimate only. Final pricing may vary based on vehicle condition, additional services, or other factors. You will be notified if any adjustments are needed.
                  </div>
                  <div className="mt-3 px-4 py-2 bg-blue-50 border-l-4 border-blue-400 text-blue-900 rounded text-sm max-w-md mx-auto text-left">
                    <strong>Arrival window:</strong> Your appointment time is approximate — we aim to arrive within about 30 minutes of it.
                  </div>
                  <div className="mt-3 px-4 py-2 bg-yellow-100 border-l-4 border-yellow-400 text-yellow-800 rounded text-sm max-w-md mx-auto text-left">
                    <strong>Please note:</strong> This is a booking request — your chosen time is our best availability, not a guaranteed slot until we confirm it with you.
                  </div>
                  {/* Link to the shareable/saveable receipt page — survives refresh. */}
                  {confirmedBookingId && (
                    <Link
                      to={`/booking/${confirmedBookingId}`}
                      className="mt-6 inline-flex items-center justify-center bg-white border-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground font-semibold px-6 h-11 text-lg rounded-lg transition-colors duration-200 shadow-sm"
                      data-testid="view-confirmation-btn"
                    >
                      View / save your confirmation
                    </Link>
                  )}
                  <div className="flex flex-col sm:flex-row gap-4 mt-6">
                    <Button
                      onClick={() => {
                        const videoSection = document.getElementById('youtube-videos');
                        if (videoSection) {
                          videoSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }}
                      className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold px-6 h-11 text-lg"
                      data-testid="view-videos-btn"
                    >
                      Watch Our Videos
                    </Button>
                    <a
                      href="https://www.instagram.com/andrews.auto_?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw=="
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center bg-pink-600 hover:bg-pink-700 text-white font-semibold px-6 h-11 text-lg rounded-lg transition-colors duration-200 shadow-md"
                      style={{ minWidth: '180px' }}
                    >
                      View Our Instagram
                    </a>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Buttons & Pricing - Stack on mobile */}
          {/* Hide navigation and pricing on success screen */}
          {step !== 6 && (
            <div className="mt-5 pt-4 border-t border-border">
              {/* Price & Duration Summary - Visible on all breakpoints */}
              {bookingDetails && (
                <div className="flex flex-col items-center justify-center gap-1 text-sm mb-3">
                  <div className="flex items-center gap-2 sm:gap-3 whitespace-nowrap">
                    <span className="text-accent font-bold text-base sm:text-lg">${bookingDetails.total_price.toFixed(2)}</span>
                    <span className="text-gray-600">•</span>
                    <span className="text-gray-600 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {(() => {
                        const totalMinutes = bookingDetails.total_duration;
                        const hours = Math.floor(totalMinutes / 60);
                        const minutes = totalMinutes % 60;
                        if (hours > 0 && minutes > 0) {
                          return `${hours}h ${minutes}m`;
                        } else if (hours > 0) {
                          return `${hours}h`;
                        } else {
                          return `${minutes}m`;
                        }
                      })()}
                    </span>
                  </div>
                  {/* Site-wide sale line — total_price already reflects this discount */}
                  {bookingDetails.site_discount && (
                    <div className="text-xs text-center font-semibold text-green-700">
                      {bookingDetails.site_discount.percent}% Sale −${bookingDetails.site_discount.amount.toFixed(2)}
                    </div>
                  )}
                  {/* Discount breakdown display */}
                  {bookingDetails.discount_breakdown && (
                    <div className="mt-1 text-xs text-gray-700 text-center">
                      {Object.entries(bookingDetails.discount_breakdown).map(([key, value]) => (
                        <div key={key}>
                          <span className="font-semibold text-accent">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</span> <span className="text-green-700">-${value.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                {/* Back Button */}
                {step > 1 && step < 6 ? (
                  <Button
                    onClick={prevStep}
                    className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold h-9 px-3 text-sm"
                    disabled={loading}
                    data-testid="back-btn"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back
                  </Button>
                ) : (
                  <div></div>
                )}
                {/* Continue/Confirm Button - Narrower */}
                <div>
                  {step < 6 ? (
                    step < 5 ? (
                      <Button
                        onClick={nextStep}
                        className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold px-4 h-9 text-sm transition-all duration-300 hover:scale-105 hover:shadow-lg"
                        disabled={loading || loadingPackages}
                        data-testid="continue-btn"
                      >
                        Continue
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    ) : (
                      <Button
                        onClick={handleSubmit}
                        className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold px-4 h-9 text-base transition-all duration-300 hover:scale-105 hover:shadow-lg"
                        disabled={loading}
                        data-testid="confirm-booking-btn"
                      >
                        {loading ? 'Creating...' : 'Confirm'}
                        <CheckCircle2 className="w-4 h-4 ml-1" />
                      </Button>
                    )
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default BookingWidget;
