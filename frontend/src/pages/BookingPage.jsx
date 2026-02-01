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
                    Interior Detailing
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    {['standard', 'deluxe', 'ultimate'].map((tier) => {
                      const pkg = getPackageByTier('interior', tier);
                      if (!pkg) return null;
                      
                      return (
                        <button
                          key={pkg.id}
                          type="button"
                          onClick={() => setFormData({...formData, interiorPackageId: formData.interiorPackageId === pkg.id ? null : pkg.id})}
                          className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                            formData.interiorPackageId === pkg.id
                              ? 'border-accent bg-accent/5'
                              : 'border-border hover:border-accent/50'
                          }`}
                          data-testid={`interior-${tier}-button`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium uppercase tracking-wider text-accent">
                              {tier}
                            </span>
                            {formData.interiorPackageId === pkg.id && (
                              <CheckCircle2 className="w-5 h-5 text-accent" />
                            )}
                          </div>
                          <h4 className="font-semibold mb-1">{pkg.name}</h4>
                          <p className="text-2xl font-bold text-accent mb-2">${pkg.base_price}</p>
                          <p className="text-xs text-muted-foreground">{pkg.duration_minutes} min</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Exterior Packages */}
                <div>
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <div className="w-1 h-6 bg-accent rounded-full" />
                    Exterior Detailing
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    {['standard', 'deluxe', 'ultimate'].map((tier) => {
                      const pkg = getPackageByTier('exterior', tier);
                      if (!pkg) return null;
                      
                      return (
                        <button
                          key={pkg.id}
                          type="button"
                          onClick={() => setFormData({...formData, exteriorPackageId: formData.exteriorPackageId === pkg.id ? null : pkg.id})}
                          className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                            formData.exteriorPackageId === pkg.id
                              ? 'border-accent bg-accent/5'
                              : 'border-border hover:border-accent/50'
                          }`}
                          data-testid={`exterior-${tier}-button`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium uppercase tracking-wider text-accent">
                              {tier}
                            </span>
                            {formData.exteriorPackageId === pkg.id && (
                              <CheckCircle2 className="w-5 h-5 text-accent" />
                            )}
                          </div>
                          <h4 className="font-semibold mb-1">{pkg.name}</h4>
                          <p className="text-2xl font-bold text-accent mb-2">${pkg.base_price}</p>
                          <p className="text-xs text-muted-foreground">{pkg.duration_minutes} min</p>
                        </button>
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

          {/* Pricing Summary */}
          {bookingDetails && (
            <FadeUp delay={0.25}>
              <Card className="border-accent/50 bg-accent/5" data-testid="pricing-summary">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <DollarSign className="w-6 h-6 text-accent" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-4">Booking Summary</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Services Subtotal</span>
                          <span className="font-medium">${bookingDetails.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Vehicle Size Fee</span>
                          <span className="font-medium">${bookingDetails.vehicle_size_fee.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Estimated Duration</span>
                          <span className="font-medium">{bookingDetails.base_duration} min + {bookingDetails.buffer_minutes} min buffer</span>
                        </div>
                        <div className="pt-2 border-t border-border flex justify-between items-center">
                          <span className="font-semibold text-lg">Total Price</span>
                          <span className="font-bold text-2xl text-accent" data-testid="total-price">
                            ${bookingDetails.total_price.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </FadeUp>
          )}

          {/* Date and Time Selection */}
          <FadeUp delay={0.3}>
            <Card data-testid="datetime-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-accent" />
                  Select Date & Time
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="booking-date">Date</Label>
                  <DatePicker
                    selected={formData.bookingDate}
                    onChange={(date) => setFormData({...formData, bookingDate: date, startTime: ''})}
                    minDate={new Date()}
                    filterDate={filterDate}
                    dateFormat="MMMM d, yyyy"
                    className="w-full mt-1 px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholderText="Select a date"
                    data-testid="booking-date-picker"
                  />
                  {errors.bookingDate && (
                    <p className="text-sm text-red-500 mt-1">{errors.bookingDate}</p>
                  )}
                  
                  {/* Business Hours Info */}
                  {formData.bookingDate && (
                    <div className="mt-3 p-3 bg-secondary/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        <strong>Business Hours:</strong>{' '}
                        {isWeekdayAfternoon(formData.bookingDate) && '3:00 PM - 6:00 PM'}
                        {isSaturday(formData.bookingDate) && '10:00 AM - 6:00 PM'}
                        {isSunday(formData.bookingDate) && '1:00 PM - 6:00 PM'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Available Time Slots */}
                {formData.bookingDate && availableSlots.length > 0 && (
                  <div>
                    <Label>Available Time Slots</Label>
                    <div className="grid grid-cols-4 md:grid-cols-6 gap-2 mt-2">
                      {availableSlots.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setFormData({...formData, startTime: slot})}
                          className={`py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                            formData.startTime === slot
                              ? 'bg-accent text-white'
                              : 'bg-secondary hover:bg-secondary/80'
                          }`}
                          data-testid={`time-slot-${slot}`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                    {errors.startTime && (
                      <p className="text-sm text-red-500 mt-1">{errors.startTime}</p>
                    )}
                  </div>
                )}

                {formData.bookingDate && availableSlots.length === 0 && bookingDetails && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      No available slots for this date. Please select another date.
                    </p>
                  </div>
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
                      <span className="font-medium">Water & Electrical Access Available</span>
                      <p className="text-sm text-muted-foreground mt-1">
                        I confirm that water and electrical access will be available at the service location.
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
