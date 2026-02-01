import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FadeUp } from '@/components/animations/AnimationWrappers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Calendar, 
  Clock, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle,
  Car,
  MapPin,
  Sparkles,
  Truck,
  Home
} from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const BookingPage = () => {
  // Form state
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

  // UI state
  const [packages, setPackages] = useState({ interior: [], exterior: [] });
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [bookingDetails, setBookingDetails] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitStatus, setSubmitStatus] = useState(null);

  // Fetch packages on mount
  useEffect(() => {
    fetchPackages();
  }, []);

  // Calculate pricing when packages or vehicle size changes
  useEffect(() => {
    if (formData.interiorPackageId || formData.exteriorPackageId) {
      calculateBooking();
    }
  }, [formData.interiorPackageId, formData.exteriorPackageId, formData.vehicleSize]);

  // Fetch available slots when date and packages change
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

    setCalculating(true);
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
    } finally {
      setCalculating(false);
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

  const validateForm = () => {
    const newErrors = {};

    if (!formData.customerName.trim()) newErrors.customerName = 'Name is required';
    if (!formData.customerPhone.trim()) newErrors.customerPhone = 'Phone is required';
    if (!formData.customerEmail.trim()) newErrors.customerEmail = 'Email is required';
    if (formData.serviceType === 'mobile' && !formData.customerAddress.trim()) {
      newErrors.customerAddress = 'Address is required for mobile service';
    }
    if (!formData.interiorPackageId && !formData.exteriorPackageId) {
      newErrors.packages = 'Please select at least one service';
    }
    if (!formData.bookingDate) newErrors.bookingDate = 'Please select a date';
    if (!formData.startTime) newErrors.startTime = 'Please select a time';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
        
        // Reset form
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
        setBookingDetails(null);
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (error) {
      setSubmitStatus({
        type: 'error',
        message: error.response?.data?.detail || 'Failed to create booking. Please try again.'
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  const getPackageByTier = (category, tier) => {
    return packages[category].find(p => p.tier === tier);
  };

  const isWeekdayAfternoon = (date) => {
    const day = date.getDay();
    return day >= 1 && day <= 5; // Monday-Friday
  };

  const isSaturday = (date) => date.getDay() === 6;
  const isSunday = (date) => date.getDay() === 0;

  const filterDate = (date) => {
    const day = date.getDay();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Don't allow past dates
    if (date < today) return false;
    
    // Allow all days Mon-Sun
    return day >= 0 && day <= 6;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-secondary/20 to-background py-20 lg:py-28">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <FadeUp>
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
              <Calendar className="w-4 h-4" />
              Book Your Service
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-semibold text-foreground mb-4">
              Schedule Your Appointment
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Fill out the form below to book your car detailing service. We'll send you a confirmation email with all the details.
            </p>
          </div>
        </FadeUp>

        {/* Success/Error Message */}
        <AnimatePresence>
          {submitStatus && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6"
            >
              <Card className={`border-2 ${submitStatus.type === 'success' ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
                <CardContent className="p-4 flex items-start gap-3">
                  {submitStatus.type === 'success' ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className={`font-semibold ${submitStatus.type === 'success' ? 'text-green-900' : 'text-red-900'}`}>
                      {submitStatus.type === 'success' ? 'Success!' : 'Error'}
                    </p>
                    <p className={submitStatus.type === 'success' ? 'text-green-700' : 'text-red-700'}>
                      {submitStatus.message}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Service Type Selection */}
          <FadeUp delay={0.1}>
            <Card data-testid="service-type-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-accent" />
                  Service Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, serviceType: 'mobile'})}
                    className={`p-6 rounded-xl border-2 transition-all duration-200 text-left ${
                      formData.serviceType === 'mobile' 
                        ? 'border-accent bg-accent/5' 
                        : 'border-border hover:border-accent/50'
                    }`}
                    data-testid="mobile-service-button"
                  >
                    <Truck className="w-8 h-8 text-accent mb-3" />
                    <h3 className="font-semibold text-lg mb-2">Mobile Service</h3>
                    <p className="text-sm text-muted-foreground">We come to your location</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({...formData, serviceType: 'dropoff', customerAddress: '', hasWaterElectric: false})}
                    className={`p-6 rounded-xl border-2 transition-all duration-200 text-left ${
                      formData.serviceType === 'dropoff' 
                        ? 'border-accent bg-accent/5' 
                        : 'border-border hover:border-accent/50'
                    }`}
                    data-testid="dropoff-service-button"
                  >
                    <Home className="w-8 h-8 text-accent mb-3" />
                    <h3 className="font-semibold text-lg mb-2">Drop-Off</h3>
                    <p className="text-sm text-muted-foreground">Bring your vehicle to us</p>
                  </button>
                </div>
              </CardContent>
            </Card>
          </FadeUp>

          {/* Quick Price Estimate - Sticky at top after selection */}
          {(formData.interiorPackageId || formData.exteriorPackageId) && bookingDetails && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="sticky top-20 z-20 mb-6"
            >
              <div className="bg-gradient-to-r from-accent via-accent/90 to-accent text-white rounded-2xl shadow-2xl overflow-hidden">
                <div className="absolute inset-0 bg-grid-white/10"></div>
                <div className="relative px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium opacity-90">Your Estimated Total</p>
                      <p className="text-3xl font-bold">${bookingDetails.total_price.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="text-right hidden md:block">
                    <p className="text-sm opacity-90">{bookingDetails.packages.length} service(s) selected</p>
                    <p className="text-sm font-medium">~{bookingDetails.total_duration} minutes</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Package Selection */}
          <FadeUp delay={0.15}>
            <Card data-testid="package-selection-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-accent" />
                  Select Services
                </CardTitle>
                {errors.packages && (
                  <p className="text-sm text-red-500 mt-1">{errors.packages}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Interior Packages */}
                <div>
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <div className="w-1 h-6 bg-accent rounded-full" />
                    Interior Detailing <span className="text-sm font-normal text-muted-foreground ml-2">(Choose one)</span>
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    {['standard', 'deluxe', 'ultimate'].map((tier) => {
                      const pkg = getPackageByTier('interior', tier);
                      if (!pkg) return null;
                      
                      const isSelected = formData.interiorPackageId === pkg.id;
                      const tierLevel = tier === 'standard' ? 1 : tier === 'deluxe' ? 2 : 3;
                      
                      return (
                        <motion.div key={pkg.id} className="relative h-full">
                          {/* Tier 2 - Blue animated border */}
                          {tierLevel === 2 && (
                            <div className="absolute -inset-[1px] rounded-xl overflow-hidden">
                              <motion.div
                                className="absolute inset-0"
                                style={{
                                  background: 'linear-gradient(90deg, #3b82f6, #60a5fa, #3b82f6, #60a5fa)',
                                  backgroundSize: '200% 100%',
                                }}
                                animate={{
                                  backgroundPosition: ['0% 0%', '200% 0%'],
                                }}
                                transition={{
                                  duration: 3,
                                  repeat: Infinity,
                                  ease: 'linear',
                                }}
                              />
                            </div>
                          )}

                          {/* Tier 3 - Gold/purple animated border */}
                          {tierLevel === 3 && (
                            <div className="absolute -inset-[2px] rounded-xl overflow-hidden">
                              <motion.div
                                className="absolute inset-0"
                                style={{
                                  background: 'linear-gradient(90deg, #f59e0b, #8b5cf6, #3b82f6, #8b5cf6, #f59e0b)',
                                  backgroundSize: '200% 100%',
                                }}
                                animate={{
                                  backgroundPosition: ['0% 0%', '200% 0%'],
                                }}
                                transition={{
                                  duration: 2,
                                  repeat: Infinity,
                                  ease: 'linear',
                                }}
                              />
                            </div>
                          )}

                          <motion.button
                            type="button"
                            onClick={() => setFormData({...formData, interiorPackageId: isSelected ? null : pkg.id})}
                            whileHover={{ scale: 1.02, y: -4 }}
                            whileTap={{ scale: 0.98 }}
                            className={`relative p-5 rounded-xl transition-all duration-200 text-left overflow-hidden h-full w-full ${
                              tierLevel === 1 ? 'border-2' : 'border-0'
                            } ${
                              isSelected
                                ? tierLevel === 1 ? 'border-gray-400 bg-gray-50' : 'bg-card'
                                : tierLevel === 1 ? 'border-border bg-card' : 'bg-card'
                            }`}
                            data-testid={`interior-${tier}-button`}
                          >
                            {/* Tier 3 - Minecraft enchantment shine */}
                            {tierLevel === 3 && (
                              <>
                                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                  <motion.div
                                    className="absolute w-[200%] h-[200%] -top-1/2 -left-1/2"
                                    style={{
                                      background: `repeating-linear-gradient(
                                        -45deg,
                                        transparent,
                                        transparent 10px,
                                        rgba(255,255,255,0.03) 10px,
                                        rgba(255,255,255,0.03) 20px
                                      )`,
                                    }}
                                    animate={{
                                      x: ['-50%', '0%'],
                                      y: ['-50%', '0%'],
                                    }}
                                    transition={{
                                      duration: 3,
                                      repeat: Infinity,
                                      ease: 'linear',
                                    }}
                                  />
                                </div>
                                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                  <motion.div
                                    className="absolute h-full w-32"
                                    style={{
                                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
                                    }}
                                    animate={{
                                      x: ['-128px', '400px'],
                                    }}
                                    transition={{
                                      duration: 2,
                                      repeat: Infinity,
                                      ease: 'linear',
                                      repeatDelay: 0.5,
                                    }}
                                  />
                                </div>
                              </>
                            )}
                            
                            <div className="relative z-10">
                              <div className="flex items-center justify-between mb-3">
                                <span className={`text-xs font-bold uppercase tracking-wider ${
                                  tierLevel === 3 ? 'text-amber-500' : tierLevel === 2 ? 'text-blue-500' : 'text-gray-500'
                                }`}>
                                  {tier}
                                </span>
                                {isSelected && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                      tierLevel === 3 ? 'bg-amber-500' : tierLevel === 2 ? 'bg-blue-500' : 'bg-gray-500'
                                    }`}
                                  >
                                    <CheckCircle2 className="w-4 h-4 text-white" />
                                  </motion.div>
                                )}
                                {tierLevel === 3 && (
                                  <motion.div
                                    animate={{ 
                                      opacity: [0.6, 1, 0.6],
                                      scale: [1, 1.1, 1],
                                    }}
                                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                                  >
                                    <Sparkles className="w-4 h-4 text-amber-500" />
                                  </motion.div>
                                )}
                              </div>
                              <h4 className="font-semibold text-base mb-2">{pkg.name.replace('Interior ', '')}</h4>
                              <div className="flex items-baseline gap-1 mb-2">
                                <span className={`text-3xl font-bold ${
                                  tierLevel === 3 ? 'text-amber-500' : tierLevel === 2 ? 'text-blue-500' : 'text-gray-600'
                                }`}>${pkg.base_price}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                <span>{pkg.duration_minutes} minutes</span>
                              </div>
                            </div>
                          </motion.button>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* Exterior Packages */}
                <div>
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <div className="w-1 h-6 bg-accent rounded-full" />
                    Exterior Detailing <span className="text-sm font-normal text-muted-foreground ml-2">(Choose one)</span>
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    {['standard', 'deluxe', 'ultimate'].map((tier) => {
                      const pkg = getPackageByTier('exterior', tier);
                      if (!pkg) return null;
                      
                      const isSelected = formData.exteriorPackageId === pkg.id;
                      const tierLevel = tier === 'standard' ? 1 : tier === 'deluxe' ? 2 : 3;
                      
                      return (
                        <motion.div key={pkg.id} className="relative h-full">
                          {/* Tier 2 - Blue animated border */}
                          {tierLevel === 2 && (
                            <div className="absolute -inset-[1px] rounded-xl overflow-hidden">
                              <motion.div
                                className="absolute inset-0"
                                style={{
                                  background: 'linear-gradient(90deg, #3b82f6, #60a5fa, #3b82f6, #60a5fa)',
                                  backgroundSize: '200% 100%',
                                }}
                                animate={{
                                  backgroundPosition: ['0% 0%', '200% 0%'],
                                }}
                                transition={{
                                  duration: 3,
                                  repeat: Infinity,
                                  ease: 'linear',
                                }}
                              />
                            </div>
                          )}

                          {/* Tier 3 - Gold/purple animated border */}
                          {tierLevel === 3 && (
                            <div className="absolute -inset-[2px] rounded-xl overflow-hidden">
                              <motion.div
                                className="absolute inset-0"
                                style={{
                                  background: 'linear-gradient(90deg, #f59e0b, #8b5cf6, #3b82f6, #8b5cf6, #f59e0b)',
                                  backgroundSize: '200% 100%',
                                }}
                                animate={{
                                  backgroundPosition: ['0% 0%', '200% 0%'],
                                }}
                                transition={{
                                  duration: 2,
                                  repeat: Infinity,
                                  ease: 'linear',
                                }}
                              />
                            </div>
                          )}

                          <motion.button
                            type="button"
                            onClick={() => setFormData({...formData, exteriorPackageId: isSelected ? null : pkg.id})}
                            whileHover={{ scale: 1.02, y: -4 }}
                            whileTap={{ scale: 0.98 }}
                            className={`relative p-5 rounded-xl transition-all duration-200 text-left overflow-hidden h-full w-full ${
                              tierLevel === 1 ? 'border-2' : 'border-0'
                            } ${
                              isSelected
                                ? tierLevel === 1 ? 'border-gray-400 bg-gray-50' : 'bg-card'
                                : tierLevel === 1 ? 'border-border bg-card' : 'bg-card'
                            }`}
                            data-testid={`exterior-${tier}-button`}
                          >
                            {/* Tier 3 - Minecraft enchantment shine */}
                            {tierLevel === 3 && (
                              <>
                                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                  <motion.div
                                    className="absolute w-[200%] h-[200%] -top-1/2 -left-1/2"
                                    style={{
                                      background: `repeating-linear-gradient(
                                        -45deg,
                                        transparent,
                                        transparent 10px,
                                        rgba(255,255,255,0.03) 10px,
                                        rgba(255,255,255,0.03) 20px
                                      )`,
                                    }}
                                    animate={{
                                      x: ['-50%', '0%'],
                                      y: ['-50%', '0%'],
                                    }}
                                    transition={{
                                      duration: 3,
                                      repeat: Infinity,
                                      ease: 'linear',
                                    }}
                                  />
                                </div>
                                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                  <motion.div
                                    className="absolute h-full w-32"
                                    style={{
                                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
                                    }}
                                    animate={{
                                      x: ['-128px', '400px'],
                                    }}
                                    transition={{
                                      duration: 2,
                                      repeat: Infinity,
                                      ease: 'linear',
                                      repeatDelay: 0.5,
                                    }}
                                  />
                                </div>
                              </>
                            )}
                            
                            <div className="relative z-10">
                              <div className="flex items-center justify-between mb-3">
                                <span className={`text-xs font-bold uppercase tracking-wider ${
                                  tierLevel === 3 ? 'text-amber-500' : tierLevel === 2 ? 'text-blue-500' : 'text-gray-500'
                                }`}>
                                  {tier}
                                </span>
                                {isSelected && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                      tierLevel === 3 ? 'bg-amber-500' : tierLevel === 2 ? 'bg-blue-500' : 'bg-gray-500'
                                    }`}
                                  >
                                    <CheckCircle2 className="w-4 h-4 text-white" />
                                  </motion.div>
                                )}
                                {tierLevel === 3 && (
                                  <motion.div
                                    animate={{ 
                                      opacity: [0.6, 1, 0.6],
                                      scale: [1, 1.1, 1],
                                    }}
                                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                                  >
                                    <Sparkles className="w-4 h-4 text-amber-500" />
                                  </motion.div>
                                )}
                              </div>
                              <h4 className="font-semibold text-base mb-2">{pkg.name.replace('Exterior ', '')}</h4>
                              <div className="flex items-baseline gap-1 mb-2">
                                <span className={`text-3xl font-bold ${
                                  tierLevel === 3 ? 'text-amber-500' : tierLevel === 2 ? 'text-blue-500' : 'text-gray-600'
                                }`}>${pkg.base_price}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                <span>{pkg.duration_minutes} minutes</span>
                              </div>
                            </div>
                          </motion.button>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </FadeUp>

          {/* Vehicle Size */}
          <FadeUp delay={0.2}>
            <Card data-testid="vehicle-size-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="w-5 h-5 text-accent" />
                  Vehicle Size
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    { value: 'small', label: 'Small', fee: 0, examples: 'Sedan, Compact' },
                    { value: 'medium', label: 'Medium', fee: 5, examples: 'SUV, Crossover' },
                    { value: 'large', label: 'Large', fee: 10, examples: 'Truck, Large SUV' }
                  ].map((size) => (
                    <button
                      key={size.value}
                      type="button"
                      onClick={() => setFormData({...formData, vehicleSize: size.value})}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                        formData.vehicleSize === size.value
                          ? 'border-accent bg-accent/5'
                          : 'border-border hover:border-accent/50'
                      }`}
                      data-testid={`vehicle-${size.value}-button`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">{size.label}</span>
                        {formData.vehicleSize === size.value && (
                          <CheckCircle2 className="w-5 h-5 text-accent" />
                        )}
                      </div>
                      <p className="text-lg font-bold text-accent mb-1">
                        {size.fee === 0 ? 'No fee' : `+$${size.fee}`}
                      </p>
                      <p className="text-xs text-muted-foreground">{size.examples}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </FadeUp>

          {/* Pricing Summary - Enhanced */}
          {bookingDetails && (
            <FadeUp delay={0.25}>
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative"
              >
                {/* Animated gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-accent/10 to-transparent rounded-2xl blur-xl"></div>
                
                <Card className="relative border-2 border-accent/50 bg-gradient-to-br from-accent/5 via-background to-background overflow-hidden" data-testid="pricing-summary">
                  {/* Shine effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                    animate={{
                      x: ['-100%', '200%']
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      repeatDelay: 2,
                      ease: 'linear'
                    }}
                  />
                  
                  <CardContent className="p-8 relative z-10">
                    <div className="flex flex-col md:flex-row gap-6">
                      {/* Icon and Title */}
                      <div className="flex items-center gap-4 md:flex-col md:items-center md:justify-center md:border-r md:border-border md:pr-6">
                        <motion.div 
                          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center flex-shrink-0 shadow-lg"
                          animate={{ 
                            boxShadow: [
                              '0 10px 25px -5px rgba(59, 130, 246, 0.3)',
                              '0 10px 35px -5px rgba(59, 130, 246, 0.5)',
                              '0 10px 25px -5px rgba(59, 130, 246, 0.3)'
                            ]
                          }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <DollarSign className="w-8 h-8 text-white" />
                        </motion.div>
                        <div className="md:text-center">
                          <h3 className="font-semibold text-xl text-foreground">Price Estimate</h3>
                          <p className="text-sm text-muted-foreground">Your booking summary</p>
                        </div>
                      </div>
                      
                      {/* Details */}
                      <div className="flex-1 space-y-4">
                        {/* Service details */}
                        <div className="space-y-3">
                          {bookingDetails.packages.map((pkg, idx) => (
                            <div key={idx} className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
                              <div>
                                <p className="font-medium text-foreground">{pkg.name}</p>
                                <p className="text-xs text-muted-foreground">{pkg.duration_minutes} minutes</p>
                              </div>
                              <span className="font-semibold text-lg text-accent">${pkg.base_price}</span>
                            </div>
                          ))}
                          
                          <div className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
                            <div>
                              <p className="font-medium text-foreground">Vehicle Size</p>
                              <p className="text-xs text-muted-foreground capitalize">{formData.vehicleSize}</p>
                            </div>
                            <span className="font-semibold text-lg text-accent">
                              {bookingDetails.vehicle_size_fee === 0 ? 'Free' : `+$${bookingDetails.vehicle_size_fee}`}
                            </span>
                          </div>
                        </div>
                        
                        {/* Duration info */}
                        <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                          <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <p className="text-sm text-blue-900 dark:text-blue-100">
                            <strong>Total Duration:</strong> {bookingDetails.base_duration} min service + {bookingDetails.buffer_minutes} min buffer = {bookingDetails.total_duration} min
                          </p>
                        </div>
                        
                        {/* Total */}
                        <div className="pt-4 border-t-2 border-accent/30">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm text-muted-foreground">Total Amount</p>
                              <p className="text-xs text-muted-foreground">Due upon service completion</p>
                            </div>
                            <motion.div
                              animate={{ 
                                scale: [1, 1.05, 1]
                              }}
                              transition={{ duration: 2, repeat: Infinity }}
                            >
                              <div className="text-right">
                                <p className="text-4xl font-bold text-accent" data-testid="total-price">
                                  ${bookingDetails.total_price.toFixed(2)}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">Estimated total</p>
                              </div>
                            </motion.div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </FadeUp>
          )}

          {/* Date and Time Selection - Improved */}
          <FadeUp delay={0.3}>
            <Card data-testid="datetime-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-accent" />
                  Select Date & Time
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-2">Choose when you'd like us to service your vehicle</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="booking-date" className="text-base font-semibold mb-3 block">Pick a Date</Label>
                  <DatePicker
                    selected={formData.bookingDate}
                    onChange={(date) => setFormData({...formData, bookingDate: date, startTime: ''})}
                    minDate={new Date()}
                    filterDate={filterDate}
                    dateFormat="EEEE, MMMM d, yyyy"
                    className="w-full mt-1 px-4 py-3 border-2 border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent text-base"
                    placeholderText="Click to select a date"
                    data-testid="booking-date-picker"
                    inline={false}
                  />
                  {errors.bookingDate && (
                    <p className="text-sm text-red-500 mt-2 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.bookingDate}
                    </p>
                  )}
                  
                  {/* Business Hours Info */}
                  {formData.bookingDate && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                          <Clock className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground mb-1">Business Hours</p>
                          <p className="text-sm text-muted-foreground">
                            {isWeekdayAfternoon(formData.bookingDate) && (
                              <>
                                <strong className="text-foreground">Monday - Friday:</strong> 3:00 PM - 6:00 PM
                              </>
                            )}
                            {isSaturday(formData.bookingDate) && (
                              <>
                                <strong className="text-foreground">Saturday:</strong> 10:00 AM - 6:00 PM
                              </>
                            )}
                            {isSunday(formData.bookingDate) && (
                              <>
                                <strong className="text-foreground">Sunday:</strong> 1:00 PM - 6:00 PM
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Available Time Slots */}
                {formData.bookingDate && availableSlots.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Label className="text-base font-semibold mb-3 block">Available Time Slots</Label>
                    <p className="text-sm text-muted-foreground mb-3">Select your preferred start time</p>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                      {availableSlots.map((slot) => (
                        <motion.button
                          key={slot}
                          type="button"
                          onClick={() => setFormData({...formData, startTime: slot})}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className={`relative py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 ${
                            formData.startTime === slot
                              ? 'bg-accent text-white shadow-lg shadow-accent/50'
                              : 'bg-secondary hover:bg-secondary/80 border-2 border-transparent hover:border-accent/30'
                          }`}
                          data-testid={`time-slot-${slot}`}
                        >
                          {slot}
                          {formData.startTime === slot && (
                            <motion.div
                              layoutId="selected-time"
                              className="absolute inset-0 border-2 border-accent rounded-xl"
                            />
                          )}
                        </motion.button>
                      ))}
                    </div>
                    {errors.startTime && (
                      <p className="text-sm text-red-500 mt-2 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.startTime}
                      </p>
                    )}
                  </motion.div>
                )}

                {formData.bookingDate && availableSlots.length === 0 && bookingDetails && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-6 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-xl"
                  >
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">No Available Slots</p>
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                          All time slots are booked for this date. Please select another date.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </FadeUp>

          {/* Customer Information */}
          <FadeUp delay={0.35}>
            <Card data-testid="customer-info-card">
              <CardHeader>
                <CardTitle>Your Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customer-name">Full Name *</Label>
                    <Input
                      id="customer-name"
                      data-testid="customer-name-input"
                      value={formData.customerName}
                      onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                      className={errors.customerName ? 'border-red-500' : ''}
                      placeholder="John Doe"
                    />
                    {errors.customerName && (
                      <p className="text-sm text-red-500 mt-1">{errors.customerName}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="customer-phone">Phone Number *</Label>
                    <Input
                      id="customer-phone"
                      data-testid="customer-phone-input"
                      value={formData.customerPhone}
                      onChange={(e) => setFormData({...formData, customerPhone: e.target.value})}
                      className={errors.customerPhone ? 'border-red-500' : ''}
                      placeholder="(555) 123-4567"
                    />
                    {errors.customerPhone && (
                      <p className="text-sm text-red-500 mt-1">{errors.customerPhone}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="customer-email">Email Address *</Label>
                  <Input
                    id="customer-email"
                    data-testid="customer-email-input"
                    type="email"
                    value={formData.customerEmail}
                    onChange={(e) => setFormData({...formData, customerEmail: e.target.value})}
                    className={errors.customerEmail ? 'border-red-500' : ''}
                    placeholder="john@example.com"
                  />
                  {errors.customerEmail && (
                    <p className="text-sm text-red-500 mt-1">{errors.customerEmail}</p>
                  )}
                </div>

                {/* Conditional Address Field */}
                {formData.serviceType === 'mobile' && (
                  <div>
                    <Label htmlFor="customer-address" className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Service Address *
                    </Label>
                    <Input
                      id="customer-address"
                      data-testid="customer-address-input"
                      value={formData.customerAddress}
                      onChange={(e) => setFormData({...formData, customerAddress: e.target.value})}
                      className={errors.customerAddress ? 'border-red-500' : ''}
                      placeholder="123 Main St, Lakewood, CA 90712"
                    />
                    {errors.customerAddress && (
                      <p className="text-sm text-red-500 mt-1">{errors.customerAddress}</p>
                    )}
                  </div>
                )}

                {/* Water/Electric Checkbox for Mobile */}
                {formData.serviceType === 'mobile' && (
                  <div className="flex items-start gap-3 p-4 bg-secondary/50 rounded-lg">
                    <input
                      type="checkbox"
                      id="water-electric"
                      data-testid="water-electric-checkbox"
                      checked={formData.hasWaterElectric}
                      onChange={(e) => setFormData({...formData, hasWaterElectric: e.target.checked})}
                      className="mt-1"
                    />
                    <Label htmlFor="water-electric" className="cursor-pointer flex-1">
                      <span className="font-medium">Water & Electrical Access Confirmation</span>
                      <p className="text-sm text-muted-foreground mt-1">
                        I confirm that access to a working water hose and an electrical outlet will be available at the service location.
                      </p>
                    </Label>
                  </div>
                )}

                <div>
                  <Label htmlFor="customer-notes">Additional Notes (Optional)</Label>
                  <Textarea
                    id="customer-notes"
                    data-testid="customer-notes-textarea"
                    value={formData.customerNotes}
                    onChange={(e) => setFormData({...formData, customerNotes: e.target.value})}
                    placeholder="Any special requests or information..."
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>
          </FadeUp>

          {/* Submit Button */}
          <FadeUp delay={0.4}>
            <Button
              type="submit"
              size="xl"
              className="w-full"
              disabled={loading || calculating}
              data-testid="submit-booking-button"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                  Creating Booking...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Confirm Booking
                </>
              )}
            </Button>
          </FadeUp>
        </form>
      </div>
    </div>
  );
};

export default BookingPage;
