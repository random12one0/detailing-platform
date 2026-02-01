import React, { useState, useEffect, useCallback } from 'react';
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
import DatePicker from 'react-datepicker';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const BookingWidget = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerAddress: '',
    serviceType: 'mobile',
    vehicleSize: 'medium',
    interiorPackageId: null,
    exteriorPackageId: null,
    hasWaterElectric: false,
    customerNotes: '',
    bookingDate: null,
    startTime: ''
  });

  const [packages, setPackages] = useState({ interior: [], exterior: [] });
  const [bookingDetails, setBookingDetails] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitStatus, setSubmitStatus] = useState(null);

  useEffect(() => {
    fetchPackages();
  }, []);

  const calculateBooking = useCallback(async () => {
    if (!formData.interiorPackageId && !formData.exteriorPackageId) {
      setBookingDetails(null);
      return;
    }

    try {
      const response = await axios.post(`${BACKEND_URL}/api/bookings/calculate`, {
        interior_package_id: formData.interiorPackageId,
        exterior_package_id: formData.exteriorPackageId,
        vehicle_size: formData.vehicleSize,
        booking_date: formData.bookingDate?.toISOString().split('T')[0]
      });

      if (response.data.success) {
        setBookingDetails(response.data);
      }
    } catch (error) {
      console.error('Error calculating booking:', error);
    }
  }, [formData.interiorPackageId, formData.exteriorPackageId, formData.vehicleSize, formData.bookingDate]);

  useEffect(() => {
    calculateBooking();
  }, [calculateBooking]);

  // Fetch available slots when date changes and we have booking details
  const fetchAvailableSlots = useCallback(async () => {
    if (!formData.bookingDate || !bookingDetails) {
      setAvailableSlots([]);
      return;
    }

    setSlotsLoading(true);
    try {
      const response = await axios.post(`${BACKEND_URL}/api/bookings/available-slots`, {
        booking_date: formData.bookingDate.toISOString().split('T')[0],
        duration_minutes: bookingDetails.total_duration
      });

      if (response.data.success) {
        setAvailableSlots(response.data.slots || []);
      } else {
        setAvailableSlots([]);
      }
    } catch (error) {
      console.error('Error fetching slots:', error);
      setAvailableSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [formData.bookingDate, bookingDetails]);

  useEffect(() => {
    fetchAvailableSlots();
  }, [fetchAvailableSlots]);

  const fetchPackages = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/packages`);
      if (response.data.success) {
        const interior = response.data.packages.filter(p => p.category === 'interior');
        const exterior = response.data.packages.filter(p => p.category === 'exterior');
        setPackages({ interior, exterior });
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
    }
  };

  const getPackageByTier = (category, tier) => {
    return packages[category].find(p => p.tier === tier);
  };

  const nextStep = () => {
    if (step === 1 && !formData.interiorPackageId && !formData.exteriorPackageId) {
      setErrors({ packages: 'Please select at least one service' });
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
  };

  const handleSubmit = async () => {
    const newErrors = {};
    if (!formData.customerName.trim()) newErrors.customerName = 'Name is required';
    if (!formData.customerPhone.trim()) newErrors.customerPhone = 'Phone is required';
    if (!formData.customerEmail.trim()) newErrors.customerEmail = 'Email is required';
    if (formData.serviceType === 'mobile' && !formData.customerAddress.trim()) {
      newErrors.customerAddress = 'Address is required for mobile service';
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
      const bookingData = {
        customer_name: formData.customerName,
        customer_phone: formData.customerPhone,
        customer_email: formData.customerEmail,
        customer_address: formData.serviceType === 'mobile' ? formData.customerAddress : null,
        service_type: formData.serviceType,
        vehicle_size: formData.vehicleSize,
        interior_package_id: formData.interiorPackageId,
        exterior_package_id: formData.exteriorPackageId,
        has_water_electric: formData.hasWaterElectric,
        customer_notes: formData.customerNotes,
        booking_date: formData.bookingDate.toISOString().split('T')[0],
        start_time: `${formData.bookingDate.toISOString().split('T')[0]}T${formData.startTime}:00`
      };

      const response = await axios.post(`${BACKEND_URL}/api/bookings/create`, bookingData);

      if (response.data.success) {
        setSubmitStatus({
          type: 'success',
          message: 'Booking confirmed! Check your email for details.'
        });
        
        setTimeout(() => {
          setFormData({
            customerName: '',
            customerPhone: '',
            customerEmail: '',
            customerAddress: '',
            serviceType: 'mobile',
            vehicleSize: 'medium',
            interiorPackageId: null,
            exteriorPackageId: null,
            hasWaterElectric: false,
            customerNotes: '',
            bookingDate: null,
            startTime: ''
          });
          setStep(1);
          setBookingDetails(null);
          setSubmitStatus(null);
        }, 4000);
      }
    } catch (error) {
      setSubmitStatus({
        type: 'error',
        message: error.response?.data?.detail || 'Failed to create booking. Please try again.'
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
    return day >= 0 && day <= 6;
  };

  return (
    <section id="booking-widget" className="py-12 lg:py-16 bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-card rounded-3xl p-5 lg:p-6 border border-border shadow-xl"
        >
          {/* Header - Bigger */}
          <div className="text-center mb-4">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
              CREATE <span className="text-accent">BOOKING</span>
            </h2>
          </div>

          {/* Progress Bar - Condensed with step indicator on same line */}
          <div className="mb-5 flex items-center gap-3">
            <span className="text-xs text-accent font-medium whitespace-nowrap">Step {step}/4</span>
            <div className="flex gap-1 flex-1">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                    s <= step ? 'bg-accent' : 'bg-muted'
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
                    ? 'bg-green-500/10 border-green-500/50' 
                    : 'bg-red-500/10 border-red-500/50'
                }`}
              >
                {submitStatus.type === 'success' ? (
                  <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
                )}
                <p className={submitStatus.type === 'success' ? 'text-green-100' : 'text-red-100'}>
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

                {/* Interior Section Header */}
                <div className="mb-2">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <div className="w-1 h-4 bg-accent rounded-full" />
                    Interior Detailing
                  </h4>
                </div>

                {/* Interior Packages - Slimmer buttons with animated outlines */}
                <div className="space-y-2">
                  {['standard', 'deluxe', 'ultimate'].map((tier) => {
                    const pkg = getPackageByTier('interior', tier);
                    if (!pkg) return null;
                    
                    const isSelected = formData.interiorPackageId === pkg.id;
                    const tierLevel = tier === 'standard' ? 1 : tier === 'deluxe' ? 2 : 3;
                    
                    return (
                      <div key={pkg.id} className="relative">
                        {/* Animated OUTLINE ONLY for Deluxe (blue) */}
                        {tierLevel === 2 && !isSelected && (
                          <motion.div
                            className="absolute -inset-[2px] rounded-xl pointer-events-none"
                            style={{
                              background: 'linear-gradient(90deg, transparent, #3b82f6, #60a5fa, #3b82f6, transparent)',
                              backgroundSize: '200% 100%',
                              padding: '2px',
                              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                              WebkitMaskComposite: 'xor',
                              maskComposite: 'exclude',
                            }}
                            animate={{ backgroundPosition: ['0% 0%', '200% 0%'] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                          />
                        )}
                        
                        {/* Animated OUTLINE ONLY for Ultimate (amber/purple) */}
                        {tierLevel === 3 && !isSelected && (
                          <motion.div
                            className="absolute -inset-[2px] rounded-xl pointer-events-none"
                            style={{
                              background: 'linear-gradient(90deg, transparent, #f59e0b, #8b5cf6, #f59e0b, transparent)',
                              backgroundSize: '200% 100%',
                              padding: '2px',
                              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                              WebkitMaskComposite: 'xor',
                              maskComposite: 'exclude',
                            }}
                            animate={{ backgroundPosition: ['0% 0%', '200% 0%'] }}
                            transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                          />
                        )}
                        
                        <button
                          onClick={() => setFormData({...formData, interiorPackageId: isSelected ? null : pkg.id})}
                          data-testid={`interior-${tier}-btn`}
                          className={`relative w-full p-3 rounded-xl text-left transition-all border-2 ${
                            isSelected 
                              ? 'bg-accent/10 border-accent' 
                              : tierLevel === 1 
                                ? 'bg-primary border-border hover:bg-primary/80'
                                : 'bg-primary border-transparent hover:bg-primary/80'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
                                <Sparkles className="w-3.5 h-3.5 text-accent" />
                              </div>
                              <div>
                                <h4 className="text-primary-foreground font-semibold text-sm">{pkg.name}</h4>
                                <p className="text-xs text-muted-foreground line-clamp-1">{pkg.description}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="text-lg font-bold text-primary-foreground">${pkg.base_price}</p>
                              {isSelected && (
                                <CheckCircle2 className="w-5 h-5 text-accent" />
                              )}
                            </div>
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Exterior Section Header */}
                <div className="mb-2 mt-5">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <div className="w-1 h-4 bg-accent rounded-full" />
                    Exterior Detailing
                  </h4>
                </div>

                {/* Exterior Packages - Slimmer buttons with animated outlines */}
                <div className="space-y-2">
                  {['standard', 'deluxe', 'ultimate'].map((tier) => {
                    const pkg = getPackageByTier('exterior', tier);
                    if (!pkg) return null;
                    
                    const isSelected = formData.exteriorPackageId === pkg.id;
                    const tierLevel = tier === 'standard' ? 1 : tier === 'deluxe' ? 2 : 3;
                    
                    return (
                      <div key={pkg.id} className="relative">
                        {/* Animated OUTLINE ONLY for Deluxe (blue) */}
                        {tierLevel === 2 && !isSelected && (
                          <motion.div
                            className="absolute -inset-[2px] rounded-xl pointer-events-none"
                            style={{
                              background: 'linear-gradient(90deg, transparent, #3b82f6, #60a5fa, #3b82f6, transparent)',
                              backgroundSize: '200% 100%',
                              padding: '2px',
                              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                              WebkitMaskComposite: 'xor',
                              maskComposite: 'exclude',
                            }}
                            animate={{ backgroundPosition: ['0% 0%', '200% 0%'] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                          />
                        )}
                        
                        {/* Animated OUTLINE ONLY for Ultimate (amber/purple) */}
                        {tierLevel === 3 && !isSelected && (
                          <motion.div
                            className="absolute -inset-[2px] rounded-xl pointer-events-none"
                            style={{
                              background: 'linear-gradient(90deg, transparent, #f59e0b, #8b5cf6, #f59e0b, transparent)',
                              backgroundSize: '200% 100%',
                              padding: '2px',
                              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                              WebkitMaskComposite: 'xor',
                              maskComposite: 'exclude',
                            }}
                            animate={{ backgroundPosition: ['0% 0%', '200% 0%'] }}
                            transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                          />
                        )}
                        
                        <button
                          onClick={() => setFormData({...formData, exteriorPackageId: isSelected ? null : pkg.id})}
                          data-testid={`exterior-${tier}-btn`}
                          className={`relative w-full p-3 rounded-xl text-left transition-all border-2 ${
                            isSelected 
                              ? 'bg-accent/10 border-accent' 
                              : tierLevel === 1 
                                ? 'bg-primary border-border hover:bg-primary/80'
                                : 'bg-primary border-transparent hover:bg-primary/80'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
                                <Sparkles className="w-3.5 h-3.5 text-accent" />
                              </div>
                              <div>
                                <h4 className="text-primary-foreground font-semibold text-sm">{pkg.name}</h4>
                                <p className="text-xs text-muted-foreground line-clamp-1">{pkg.description}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="text-lg font-bold text-primary-foreground">${pkg.base_price}</p>
                              {isSelected && (
                                <CheckCircle2 className="w-5 h-5 text-accent" />
                              )}
                            </div>
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Step 2: Service Type & Vehicle Size */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Service Type */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">Service Type</h3>
                  <div className="grid md:grid-cols-2 gap-3">
                    <button
                      onClick={() => setFormData({...formData, serviceType: 'mobile'})}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        formData.serviceType === 'mobile'
                          ? 'border-accent bg-accent/10'
                          : 'border-border bg-primary hover:border-muted-foreground'
                      }`}
                    >
                      <Truck className="w-6 h-6 text-accent mb-2 mx-auto" />
                      <h4 className="text-foreground font-semibold text-base mb-1">Mobile Service</h4>
                      <p className="text-sm text-muted-foreground">We come to you</p>
                    </button>

                    <button
                      onClick={() => setFormData({...formData, serviceType: 'dropoff'})}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        formData.serviceType === 'dropoff'
                          ? 'border-accent bg-accent/10'
                          : 'border-border bg-primary hover:border-muted-foreground'
                      }`}
                    >
                      <Home className="w-6 h-6 text-accent mb-2 mx-auto" />
                      <h4 className="text-foreground font-semibold text-base mb-1">Drop-Off</h4>
                      <p className="text-sm text-muted-foreground">Bring to us</p>
                    </button>
                  </div>
                </div>

                {/* Vehicle Size */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">Vehicle Size</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'small', label: 'Small', fee: 0 },
                      { value: 'medium', label: 'Medium', fee: 5 },
                      { value: 'large', label: 'Large', fee: 10 }
                    ].map((size) => (
                      <button
                        key={size.value}
                        onClick={() => setFormData({...formData, vehicleSize: size.value})}
                        className={`p-3 rounded-xl border-2 transition-all ${
                          formData.vehicleSize === size.value
                            ? 'border-cyan-500 bg-cyan-500/10'
                            : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                        }`}
                      >
                        <Car className="w-5 h-5 text-cyan-400 mb-1 mx-auto" />
                        <h4 className="text-white font-semibold text-sm mb-0.5">{size.label}</h4>
                        <p className="text-cyan-400 font-bold text-xs">
                          {size.fee === 0 ? 'Free' : `+$${size.fee}`}
                        </p>
                      </button>
                    ))}
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
                <h3 className="text-base font-semibold text-foreground text-center mb-3">
                  Choose date & time
                </h3>

                {/* Date Picker - Fixed for mobile */}
                <div>
                  <Label className="text-foreground mb-2 block text-sm font-semibold">Select Date</Label>
                  <div className="bg-primary rounded-xl p-2 border-2 border-border overflow-x-auto">
                    <div className="min-w-[280px] max-w-full">
                      <DatePicker
                        selected={formData.bookingDate}
                        onChange={(date) => {
                          setFormData({...formData, bookingDate: date, startTime: ''});
                          setAvailableSlots([]);
                        }}
                        minDate={new Date()}
                        filterDate={filterDate}
                        dateFormat="EEEE, MMMM d, yyyy"
                        className="w-full bg-transparent text-foreground text-sm"
                        placeholderText="Click to select a date"
                        inline
                        calendarClassName="booking-calendar"
                        formatWeekDay={nameOfDay => nameOfDay.slice(0, 2).toUpperCase()}
                        useWeekdaysShort={true}
                      />
                    </div>
                  </div>
                  {errors.bookingDate && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.bookingDate}
                    </p>
                  )}
                </div>

                {/* Time Slots Selection */}
                {formData.bookingDate && (
                  <div className="mt-4">
                    <Label className="text-foreground mb-2 block text-sm font-semibold">Select Time</Label>
                    
                    {/* Business Hours Info */}
                    <div className="p-3 bg-accent/10 border border-accent/50 rounded-lg mb-3">
                      <div className="flex items-start gap-2">
                        <Clock className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-foreground text-xs">
                            {(() => {
                              const day = formData.bookingDate.getDay();
                              if (day >= 1 && day <= 5) {
                                return 'Mon-Fri: 3:00 PM - 6:00 PM';
                              } else if (day === 6) {
                                return 'Saturday: 10:00 AM - 6:00 PM';
                              } else if (day === 0) {
                                return 'Sunday: 1:00 PM - 6:00 PM';
                              }
                            })()}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Loading State */}
                    {slotsLoading && (
                      <div className="flex items-center justify-center py-6">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent"></div>
                        <span className="ml-2 text-muted-foreground text-sm">Loading available times...</span>
                      </div>
                    )}

                    {/* Time Slots Grid */}
                    {!slotsLoading && availableSlots.length > 0 && (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {availableSlots.map((slot) => {
                          const isSelected = formData.startTime === slot;
                          // Convert 24h to 12h format
                          const [hours, minutes] = slot.split(':');
                          const hour = parseInt(hours);
                          const ampm = hour >= 12 ? 'PM' : 'AM';
                          const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
                          const displayTime = `${displayHour}:${minutes} ${ampm}`;
                          
                          return (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => setFormData({...formData, startTime: slot})}
                              data-testid={`time-slot-${slot}`}
                              className={`py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                                isSelected
                                  ? 'bg-cyan-500 text-white'
                                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                              }`}
                            >
                              {displayTime}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* No Slots Available */}
                    {!slotsLoading && availableSlots.length === 0 && bookingDetails && (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/50 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                          <p className="text-amber-100 text-xs">
                            No available slots for this date. Please choose another date.
                          </p>
                        </div>
                      </div>
                    )}

                    {errors.startTime && (
                      <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.startTime}
                      </p>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 4: Customer Information */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h3 className="text-lg font-semibold text-foreground text-center mb-4">
                  Your Information
                </h3>

                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-foreground mb-1 block text-sm">Full Name *</Label>
                    <Input
                      value={formData.customerName}
                      onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                      className="bg-primary border-border text-primary-foreground focus:border-accent h-10 text-sm"
                      placeholder="John Doe"
                    />
                    {errors.customerName && (
                      <p className="text-xs text-red-500 mt-1">{errors.customerName}</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-foreground mb-1 block text-sm">Phone *</Label>
                    <Input
                      value={formData.customerPhone}
                      onChange={(e) => setFormData({...formData, customerPhone: e.target.value})}
                      className="bg-primary border-border text-primary-foreground focus:border-accent h-10 text-sm"
                      placeholder="(555) 123-4567"
                    />
                    {errors.customerPhone && (
                      <p className="text-xs text-red-500 mt-1">{errors.customerPhone}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-foreground mb-1 block text-sm">Email *</Label>
                  <Input
                    type="email"
                    value={formData.customerEmail}
                    onChange={(e) => setFormData({...formData, customerEmail: e.target.value})}
                    className="bg-primary border-border text-primary-foreground focus:border-accent h-10 text-sm"
                    placeholder="john@example.com"
                  />
                  {errors.customerEmail && (
                    <p className="text-xs text-red-500 mt-1">{errors.customerEmail}</p>
                  )}
                </div>

                {formData.serviceType === 'mobile' && (
                  <>
                    <div>
                      <Label className="text-foreground mb-1 block text-sm flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        Service Address *
                      </Label>
                      <Input
                        value={formData.customerAddress}
                        onChange={(e) => setFormData({...formData, customerAddress: e.target.value})}
                        className="bg-primary border-border text-primary-foreground focus:border-accent h-10 text-sm"
                        placeholder="123 Main St, Lakewood, CA"
                      />
                      {errors.customerAddress && (
                        <p className="text-xs text-red-500 mt-1">{errors.customerAddress}</p>
                      )}
                    </div>

                    <div className="flex items-start gap-2 p-3 bg-primary/50 rounded-lg border border-border">
                      <input
                        type="checkbox"
                        id="water-electric"
                        checked={formData.hasWaterElectric}
                        onChange={(e) => setFormData({...formData, hasWaterElectric: e.target.checked})}
                        className="mt-0.5"
                      />
                      <Label htmlFor="water-electric" className="cursor-pointer flex-1 text-foreground text-xs">
                        I confirm that access to a working water hose and an electrical outlet will be available at the service location.
                      </Label>
                    </div>
                  </>
                )}

                <div>
                  <Label className="text-foreground mb-1 block text-sm">Additional Notes</Label>
                  <Textarea
                    value={formData.customerNotes}
                    onChange={(e) => setFormData({...formData, customerNotes: e.target.value})}
                    className="bg-primary border-border text-primary-foreground focus:border-accent text-sm"
                    placeholder="Any special requests..."
                    rows={3}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Buttons & Pricing - Stack on mobile */}
          <div className="mt-5 pt-4 border-t border-border">
            {/* Price & Duration Display - Show above buttons on mobile */}
            {bookingDetails && (
              <div className="flex items-center justify-center gap-3 text-sm mb-3 sm:hidden">
                <span className="text-accent font-bold text-base">${bookingDetails.total_price.toFixed(2)}</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground flex items-center gap-1">
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
            )}
            
            <div className="flex items-center justify-between gap-2">
              {/* Back Button */}
              {step > 1 ? (
                <Button
                  onClick={prevStep}
                  variant="outline"
                  className="border-border text-muted-foreground hover:text-foreground hover:bg-muted h-9 px-3 text-sm"
                  disabled={loading}
                  data-testid="back-btn"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              ) : (
                <div></div>
              )}
              
              {/* Price & Duration Display - Desktop only (middle) */}
              {bookingDetails && (
                <div className="hidden sm:flex items-center gap-3 text-sm">
                  <span className="text-accent font-bold">${bookingDetails.total_price.toFixed(2)}</span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground flex items-center gap-1">
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
              )}
              
              {/* Continue/Confirm Button - Narrower */}
              <div>
                {step < 4 ? (
                  <Button
                    onClick={nextStep}
                    className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold px-4 h-9 text-sm"
                    disabled={loading}
                    data-testid="continue-btn"
                  >
                    Continue
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold px-4 h-9 text-sm"
                    disabled={loading}
                    data-testid="confirm-booking-btn"
                  >
                    {loading ? 'Creating...' : 'Confirm'}
                  <CheckCircle2 className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default BookingWidget;
