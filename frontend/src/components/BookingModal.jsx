import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  X, 
  ChevronLeft,
  ChevronRight,
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
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const BookingModal = ({ isOpen, onClose }) => {
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
    if (isOpen) {
      fetchPackages();
      setStep(1);
      setSubmitStatus(null);
    }
  }, [isOpen]);

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
  };

  const prevStep = () => {
    setErrors({});
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    // Validation
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
          onClose();
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
          setStep(1);
          setBookingDetails(null);
        }, 3000);
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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-background rounded-2xl shadow-2xl"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-50 p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
            data-testid="close-booking-modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header with Progress */}
          <div className="sticky top-0 z-40 bg-background border-b border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Book Your Service</h2>
              <span className="text-sm text-muted-foreground">Step {step} of 3</span>
            </div>
            
            {/* Progress Bar */}
            <div className="flex gap-2">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                    s <= step ? 'bg-accent' : 'bg-secondary'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <AnimatePresence mode="wait">
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
                        <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                      )}
                      <p className={submitStatus.type === 'success' ? 'text-green-700' : 'text-red-700'}>
                        {submitStatus.message}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Step 1: Select Services & Vehicle */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {/* Content from Step 1 - Service Type, Packages, Vehicle Size */}
                  <p className="text-center text-muted-foreground">Select your services and vehicle size to see pricing</p>
                  
                  {errors.packages && (
                    <p className="text-sm text-red-500 text-center">{errors.packages}</p>
                  )}
                </motion.div>
              )}

              {/* Step 2: Date & Time */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <p className="text-center text-muted-foreground">Choose when you'd like us to service your vehicle</p>
                </motion.div>
              )}

              {/* Step 3: Customer Info */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <p className="text-center text-muted-foreground">Almost done! Just need your contact information</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer Navigation */}
          <div className="sticky bottom-0 z-40 bg-background border-t border-border p-6 flex justify-between">
            <Button
              variant="outline"
              onClick={step === 1 ? onClose : prevStep}
              disabled={loading}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              {step === 1 ? 'Cancel' : 'Back'}
            </Button>

            {step < 3 ? (
              <Button onClick={nextStep} disabled={loading}>
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? 'Creating Booking...' : 'Confirm Booking'}
                <CheckCircle2 className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default BookingModal;
