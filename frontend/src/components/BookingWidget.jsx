import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  ChevronRight,
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
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitStatus, setSubmitStatus] = useState(null);

  useEffect(() => {
    fetchPackages();
  }, []);

  useEffect(() => {
    if (formData.interiorPackageId || formData.exteriorPackageId) {
      calculateBooking();
    }
  }, [formData.interiorPackageId, formData.exteriorPackageId, formData.vehicleSize]);

  useEffect(() => {
    if (formData.bookingDate && bookingDetails) {
      fetchAvailableSlots();
    }
  }, [formData.bookingDate, bookingDetails]);

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

  const calculateBooking = async () => {
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
  };

  const fetchAvailableSlots = async () => {
    if (!formData.bookingDate || !bookingDetails) return;

    try {
      const response = await axios.post(`${BACKEND_URL}/api/bookings/available-slots`, {
        booking_date: formData.bookingDate.toISOString().split('T')[0],
        duration_minutes: bookingDetails.total_duration
      });

      if (response.data.success) {
        setAvailableSlots(response.data.slots);
      }
    } catch (error) {
      console.error('Error fetching slots:', error);
      setAvailableSlots([]);
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
    if (!formData.startTime) newErrors.startTime = 'Please select a time';

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
    <section id="booking-widget" className="py-12 lg:py-16 bg-slate-950">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 lg:p-8 border border-cyan-500/20 shadow-2xl"
        >
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-2xl lg:text-3xl font-bold text-white mb-1">
              GET YOUR FREE <span className="text-cyan-400">QUOTE</span>
            </h2>
            <p className="text-slate-400 text-sm">No obligation, instant estimate</p>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-cyan-400 font-medium">Step {step} of 4</span>
            </div>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                    s <= step ? 'bg-cyan-500' : 'bg-slate-700'
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
                className="space-y-6"
              >
                <h3 className="text-xl font-semibold text-white text-center mb-6">
                  What service are you interested in?
                </h3>
                <p className="text-sm text-slate-400 text-center mb-8">
                  Select one to get your personalized quote
                </p>

                {errors.packages && (
                  <p className="text-sm text-red-400 text-center mb-4">{errors.packages}</p>
                )}

                {/* Interior Packages */}
                <div className="space-y-3">
                  {['standard', 'deluxe', 'ultimate'].map((tier) => {
                    const pkg = getPackageByTier('interior', tier);
                    if (!pkg) return null;
                    
                    const isSelected = formData.interiorPackageId === pkg.id;
                    const tierLevel = tier === 'standard' ? 1 : tier === 'deluxe' ? 2 : 3;
                    
                    return (
                      <motion.div key={pkg.id} className="relative">
                        {/* Tier 2 - Animated Blue border */}
                        {tierLevel === 2 && !isSelected && (
                          <div className="absolute -inset-[1px] rounded-xl overflow-hidden">
                            <motion.div
                              className="absolute inset-0 bg-gradient-to-r from-blue-500 via-blue-400 to-blue-500"
                              style={{ backgroundSize: '200% 100%' }}
                              animate={{ backgroundPosition: ['0% 0%', '200% 0%'] }}
                              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                            />
                          </div>
                        )}

                        {/* Tier 3 - Animated Amber/Purple border */}
                        {tierLevel === 3 && !isSelected && (
                          <div className="absolute -inset-[1px] rounded-xl overflow-hidden">
                            <motion.div
                              className="absolute inset-0 bg-gradient-to-r from-amber-500 via-purple-500 to-blue-500"
                              style={{ backgroundSize: '200% 100%' }}
                              animate={{ backgroundPosition: ['0% 0%', '200% 0%'] }}
                              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                            />
                          </div>
                        )}

                        <button
                          onClick={() => setFormData({...formData, interiorPackageId: isSelected ? null : pkg.id})}
                          className={`relative w-full p-4 rounded-xl text-left transition-all ${
                            tierLevel === 1 ? 'border-2 border-slate-700' : ''
                          } ${
                            isSelected 
                              ? 'bg-cyan-500/10 border-2 border-cyan-500' 
                              : 'bg-slate-800/50 hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                                <Sparkles className="w-4 h-4 text-cyan-400" />
                              </div>
                              <div>
                                <h4 className="text-white font-semibold text-sm mb-0.5">{pkg.name}</h4>
                                <p className="text-xs text-slate-400 line-clamp-1">{pkg.description}</p>
                              </div>
                            </div>
                            <div className="text-right flex items-center gap-2">
                              <p className="text-xl font-bold text-white">${pkg.base_price}</p>
                              {isSelected && (
                                <CheckCircle2 className="w-5 h-5 text-cyan-400" />
                              )}
                            </div>
                          </div>
                        </button>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Exterior Packages */}
                <div className="space-y-3 mt-6">
                  {['standard', 'deluxe', 'ultimate'].map((tier) => {
                    const pkg = getPackageByTier('exterior', tier);
                    if (!pkg) return null;
                    
                    const isSelected = formData.exteriorPackageId === pkg.id;
                    const tierLevel = tier === 'standard' ? 1 : tier === 'deluxe' ? 2 : 3;
                    
                    return (
                      <motion.div key={pkg.id} className="relative">
                        {tierLevel === 2 && !isSelected && (
                          <div className="absolute -inset-[1px] rounded-xl overflow-hidden">
                            <motion.div
                              className="absolute inset-0 bg-gradient-to-r from-blue-500 via-blue-400 to-blue-500"
                              style={{ backgroundSize: '200% 100%' }}
                              animate={{ backgroundPosition: ['0% 0%', '200% 0%'] }}
                              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                            />
                          </div>
                        )}

                        {tierLevel === 3 && !isSelected && (
                          <div className="absolute -inset-[1px] rounded-xl overflow-hidden">
                            <motion.div
                              className="absolute inset-0 bg-gradient-to-r from-amber-500 via-purple-500 to-blue-500"
                              style={{ backgroundSize: '200% 100%' }}
                              animate={{ backgroundPosition: ['0% 0%', '200% 0%'] }}
                              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                            />
                          </div>
                        )}

                        <button
                          onClick={() => setFormData({...formData, exteriorPackageId: isSelected ? null : pkg.id})}
                          className={`relative w-full p-4 rounded-xl text-left transition-all ${
                            tierLevel === 1 ? 'border-2 border-slate-700' : ''
                          } ${
                            isSelected 
                              ? 'bg-cyan-500/10 border-2 border-cyan-500' 
                              : 'bg-slate-800/50 hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                                <Sparkles className="w-4 h-4 text-cyan-400" />
                              </div>
                              <div>
                                <h4 className="text-white font-semibold text-sm mb-0.5">{pkg.name}</h4>
                                <p className="text-xs text-slate-400 line-clamp-1">{pkg.description}</p>
                              </div>
                            </div>
                            <div className="text-right flex items-center gap-2">
                              <p className="text-xl font-bold text-white">${pkg.base_price}</p>
                              {isSelected && (
                                <CheckCircle2 className="w-5 h-5 text-cyan-400" />
                              )}
                            </div>
                          </div>
                        </button>
                      </motion.div>
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
                  <h3 className="text-lg font-semibold text-white mb-3">Service Type</h3>
                  <div className="grid md:grid-cols-2 gap-3">
                    <button
                      onClick={() => setFormData({...formData, serviceType: 'mobile'})}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        formData.serviceType === 'mobile'
                          ? 'border-cyan-500 bg-cyan-500/10'
                          : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                      }`}
                    >
                      <Truck className="w-6 h-6 text-cyan-400 mb-2" />
                      <h4 className="text-white font-semibold text-sm mb-1">Mobile Service</h4>
                      <p className="text-xs text-slate-400">We come to you</p>
                    </button>

                    <button
                      onClick={() => setFormData({...formData, serviceType: 'dropoff'})}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        formData.serviceType === 'dropoff'
                          ? 'border-cyan-500 bg-cyan-500/10'
                          : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                      }`}
                    >
                      <Home className="w-6 h-6 text-cyan-400 mb-2" />
                      <h4 className="text-white font-semibold text-sm mb-1">Drop-Off</h4>
                      <p className="text-xs text-slate-400">Bring to us</p>
                    </button>
                  </div>
                </div>

                {/* Vehicle Size */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Vehicle Size</h3>
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

            {/* Step 3: Date & Time */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h3 className="text-lg font-semibold text-white text-center mb-4">
                  Choose your date and time
                </h3>

                <div className="grid lg:grid-cols-2 gap-4">
                  {/* Date Picker */}
                  <div>
                    <Label className="text-white mb-2 block text-sm font-semibold">Select Date</Label>
                    <div className="bg-slate-800 rounded-xl p-3 border-2 border-slate-700">
                      <DatePicker
                        selected={formData.bookingDate}
                        onChange={(date) => {
                          console.log('Date selected:', date);
                          setFormData({...formData, bookingDate: date, startTime: ''});
                        }}
                        minDate={new Date()}
                        filterDate={filterDate}
                        dateFormat="EEEE, MMMM d, yyyy"
                        className="w-full bg-transparent text-white text-sm"
                        placeholderText="Click to select a date"
                        inline
                      />
                    </div>
                    {errors.bookingDate && (
                      <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.bookingDate}
                      </p>
                    )}
                  </div>

                  {/* Time Selector */}
                  <div className="flex flex-col">
                    <Label className="text-white mb-2 block text-sm font-semibold">Select Time</Label>
                    {!formData.bookingDate ? (
                      <div className="flex-1 p-4 bg-slate-800 border-2 border-slate-700 rounded-xl flex items-center justify-center">
                        <p className="text-slate-400 text-sm text-center">
                          Please select a date first
                        </p>
                      </div>
                    ) : !bookingDetails ? (
                      <div className="flex-1 p-4 bg-slate-800 border-2 border-slate-700 rounded-xl flex items-center justify-center">
                        <p className="text-slate-400 text-sm flex items-center gap-2">
                          <Clock className="w-4 h-4 animate-spin" />
                          Calculating duration...
                        </p>
                      </div>
                    ) : availableSlots.length > 0 ? (
                      <div className="flex-1 flex flex-col">
                        <select
                          value={formData.startTime}
                          onChange={(e) => {
                            console.log('Time selected:', e.target.value);
                            setFormData({...formData, startTime: e.target.value});
                          }}
                          className="flex-1 px-4 py-3 bg-slate-800 border-2 border-slate-700 rounded-xl text-white focus:outline-none focus:border-cyan-500 text-sm"
                        >
                          <option value="">Select a time slot</option>
                          {availableSlots.map((slot) => (
                            <option key={slot} value={slot} className="bg-slate-800 text-white">
                              {slot}
                            </option>
                          ))}
                        </select>
                        {formData.startTime && (
                          <p className="text-xs text-cyan-400 mt-2 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Selected: {formData.startTime}
                          </p>
                        )}
                        {errors.startTime && (
                          <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.startTime}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="flex-1 p-4 bg-yellow-500/10 border-2 border-yellow-500/50 rounded-xl flex items-center justify-center">
                        <p className="text-yellow-100 text-sm text-center flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          No slots available for this date
                        </p>
                      </div>
                    )}
                  </div>
                </div>
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
                <h3 className="text-lg font-semibold text-white text-center mb-4">
                  Your Information
                </h3>

                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-white mb-1 block text-sm">Full Name *</Label>
                    <Input
                      value={formData.customerName}
                      onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                      className="bg-slate-800 border-slate-700 text-white focus:border-cyan-500 h-10 text-sm"
                      placeholder="John Doe"
                    />
                    {errors.customerName && (
                      <p className="text-xs text-red-400 mt-1">{errors.customerName}</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-white mb-1 block text-sm">Phone *</Label>
                    <Input
                      value={formData.customerPhone}
                      onChange={(e) => setFormData({...formData, customerPhone: e.target.value})}
                      className="bg-slate-800 border-slate-700 text-white focus:border-cyan-500 h-10 text-sm"
                      placeholder="(555) 123-4567"
                    />
                    {errors.customerPhone && (
                      <p className="text-xs text-red-400 mt-1">{errors.customerPhone}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-white mb-1 block text-sm">Email *</Label>
                  <Input
                    type="email"
                    value={formData.customerEmail}
                    onChange={(e) => setFormData({...formData, customerEmail: e.target.value})}
                    className="bg-slate-800 border-slate-700 text-white focus:border-cyan-500 h-10 text-sm"
                    placeholder="john@example.com"
                  />
                  {errors.customerEmail && (
                    <p className="text-xs text-red-400 mt-1">{errors.customerEmail}</p>
                  )}
                </div>

                {formData.serviceType === 'mobile' && (
                  <>
                    <div>
                      <Label className="text-white mb-1 block text-sm flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        Service Address *
                      </Label>
                      <Input
                        value={formData.customerAddress}
                        onChange={(e) => setFormData({...formData, customerAddress: e.target.value})}
                        className="bg-slate-800 border-slate-700 text-white focus:border-cyan-500 h-10 text-sm"
                        placeholder="123 Main St, Lakewood, CA"
                      />
                      {errors.customerAddress && (
                        <p className="text-xs text-red-400 mt-1">{errors.customerAddress}</p>
                      )}
                    </div>

                    <div className="flex items-start gap-2 p-3 bg-slate-800/50 rounded-lg">
                      <input
                        type="checkbox"
                        id="water-electric"
                        checked={formData.hasWaterElectric}
                        onChange={(e) => setFormData({...formData, hasWaterElectric: e.target.checked})}
                        className="mt-0.5"
                      />
                      <Label htmlFor="water-electric" className="cursor-pointer flex-1 text-white text-xs">
                        I confirm that access to a working water hose and an electrical outlet will be available at the service location.
                      </Label>
                    </div>
                  </>
                )}

                <div>
                  <Label className="text-white mb-1 block text-sm">Additional Notes</Label>
                  <Textarea
                    value={formData.customerNotes}
                    onChange={(e) => setFormData({...formData, customerNotes: e.target.value})}
                    className="bg-slate-800 border-slate-700 text-white focus:border-cyan-500 text-sm"
                    placeholder="Any special requests..."
                    rows={3}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-slate-700">
            {step > 1 && (
              <Button
                onClick={prevStep}
                variant="outline"
                className="border-slate-700 text-white hover:bg-slate-800"
                disabled={loading}
              >
                Back
              </Button>
            )}
            
            <div className="ml-auto">
              {step < 4 ? (
                <Button
                  onClick={nextStep}
                  className="bg-cyan-500 hover:bg-cyan-400 text-white font-semibold px-8"
                  disabled={loading}
                >
                  Continue
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  className="bg-cyan-500 hover:bg-cyan-400 text-white font-semibold px-8"
                  disabled={loading}
                >
                  {loading ? 'Creating Booking...' : 'Confirm Booking'}
                  <CheckCircle2 className="w-5 h-5 ml-2" />
                </Button>
              )}
            </div>
          </div>

          {/* Pricing Display */}
          {bookingDetails && (
            <div className="mt-6 p-6 bg-slate-800/50 rounded-xl border border-cyan-500/30">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-slate-400 text-sm">Estimated Total</p>
                  <p className="text-sm text-slate-400 mt-1">
                    <Clock className="w-4 h-4 inline mr-1" />
                    ~{bookingDetails.total_duration} minutes
                  </p>
                </div>
                <p className="text-4xl font-bold text-cyan-400">
                  ${bookingDetails.total_price.toFixed(2)}
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default BookingWidget;
