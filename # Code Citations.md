# Code Citations

## License: unknown
https://github.com/nick-barth/spokenword/blob/42400614921bde7e6d15058f25bbea4df771e283/supabase/functions/parse/index.ts

```
# Complete Technical Breakdown: Car Wash Booking System

## Project Architecture Overview

This is a **React-based single-page application** integrated with **Supabase** as the backend-as-a-service platform. The system consists of:

1. **Customer-facing booking widget** (public)
2. **Admin dashboard** (authenticated)
3. **Supabase Edge Functions** (serverless backend)
4. **PostgreSQL database** via Supabase
5. **Email notifications** via Resend API

---

## 1. DATABASE SCHEMA & TABLES

### 1.1 `bookings` Table
**Location**: `carwebitebooking/supabase/migrations/20240101000000_initial_schema.sql`

```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_address TEXT,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  total_duration_minutes INTEGER NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('mobile', 'shop')),
  vehicle_size TEXT NOT NULL CHECK (vehicle_size IN ('small', 'medium', 'large')),
  vehicle_size_fee NUMERIC(10,2) DEFAULT 0,
  interior_package_id UUID REFERENCES packages(id),
  exterior_package_id UUID REFERENCES packages(id),
  subtotal NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  has_water_electric BOOLEAN DEFAULT false,
  customer_notes TEXT,
  google_calendar_event_id TEXT,
  ics_file_sent BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  final_amount NUMERIC(10,2),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  line_items JSONB,
  payment_notes TEXT,
  finalized_at TIMESTAMPTZ
);
```

**Key Design Decisions**:
- `id` is UUID for security (non-sequential, unpredictable)
- `customer_phone` not unique (allows repeat customers)
- `service_type` enum constraint enforces valid values
- `vehicle_size_fee` stored separately for price transparency
- Foreign keys to `packages` table with `ON DELETE SET NULL` (if package deleted, booking retains price but loses reference)
- `status` and `payment_status` separate fields for business logic flexibility
- `line_items` as JSONB for flexible pricing breakdown
- `finalized_at` timestamp tracks when admin confirmed final pricing

### 1.2 `packages` Table
**Location**: Same migration file

```sql
CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  package_type TEXT NOT NULL CHECK (package_type IN ('interior', 'exterior')),
  price NUMERIC(10,2) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  description TEXT,
  features TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Initial Data**:
- 3 interior packages: Standard ($20, 30min), Deluxe ($40, 45min), Ultimate ($60, 60min)
- 3 exterior packages: Standard ($20, 30min), Deluxe ($35, 45min), Ultimate ($50, 60min)

### 1.3 `customers` Table
**Location**: `carwebitebooking/supabase/migrations/20240103000000_add_customers_table.sql`

```sql
CREATE TABLE customers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT,
  address TEXT,
  notes TEXT,
  total_bookings INTEGER DEFAULT 0,
  total_spent NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Design Decisions**:
- `phone` is UNIQUE constraint (one customer record per phone number)
- `BIGSERIAL` primary key (auto-incrementing integer)
- `total_bookings` and `total_spent` are **denormalized aggregates** for performance
- Updated via triggers or application logic after each booking

### 1.4 Row-Level Security (RLS)

**Authentication Context**: 
- Public users: `anon` role (JWT with `role: 'anon'`)
- Admin users: Manual authentication check in frontend (no actual auth table)

**RLS Policies** (`carwebitebooking/supabase/migrations/20240101000001_rls_policies.sql`):

```sql
-- Bookings: Public can insert (create bookings)
CREATE POLICY "Anyone can create bookings"
  ON bookings FOR INSERT
  TO anon
  WITH CHECK (true);

-- Bookings: Public can read their own (via email match)
CREATE POLICY "Anyone can read their bookings"
  ON bookings FOR SELECT
  TO anon
  USING (customer_email = current_setting('request.jwt.claims')::json->>'email');

-- Packages: Public read-only
CREATE POLICY "Anyone can view active packages"
  ON packages FOR SELECT
  TO anon
  USING (is_active = true);

-- Customers: Authenticated only
CREATE POLICY "Authenticated users can manage customers"
  ON customers FOR ALL
  TO authenticated
  USING (true);
```

**Security Analysis**:
- ❌ **VULNERABILITY**: Admin dashboard bypasses RLS by using `service_role` key client-side
- ⚠️ **RISK**: Service role key exposed in frontend env (`VITE_SUPABASE_SERVICE_KEY`)
- ✅ **MITIGATION**: Should use server-side Edge Functions for admin operations
- ✅ **Booking creation**: Properly uses `anon` key, no escalation possible

---

## 2. BOOKING WIDGET - COMPLETE TECHNICAL BREAKDOWN

### 2.1 Component Structure

**File**: `carwebitebooking/frontend/src/components/BookingWidget.jsx`

**Framework**: React 18 with Hooks
**Dependencies**:
- `react-datepicker` v4.x (calendar UI)
- `lucide-react` (icons)
- `@supabase/supabase-js` v2.x (database client)
- `date-fns` (date manipulation)

**State Management** (all local via `useState`):

```javascript
const [step, setStep] = useState(1);                    // Current form step (1-5)
const [serviceType, setServiceType] = useState('');     // 'mobile' | 'shop'
const [vehicleSize, setVehicleSize] = useState('');     // 'small' | 'medium' | 'large'
const [selectedDate, setSelectedDate] = useState(null); // Date object
const [selectedTime, setSelectedTime] = useState('');   // 'HH:MM' string
const [interiorPackage, setInteriorPackage] = useState(null); // Package object
const [exteriorPackage, setExteriorPackage] = useState(null); // Package object
const [packages, setPackages] = useState([]);           // Fetched from DB
const [availableSlots, setAvailableSlots] = useState([]); // Calculated time slots
const [customerInfo, setCustomerInfo] = useState({      // Form data
  name: '', phone: '', email: '', address: '', notes: '', hasWaterElectric: false
});
const [isSubmitting, setIsSubmitting] = useState(false);
const [errors, setErrors] = useState({});               // Validation errors
const [showThankYou, setShowThankYou] = useState(false);
const [totalPrice, setTotalPrice] = useState(0);        // Calculated price
const [totalDuration, setTotalDuration] = useState(0);  // Calculated minutes
```

### 2.2 Data Fetching on Mount

**Execution Flow**:

```javascript
useEffect(() => {
  const fetchPackages = async () => {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });
    
    if (!error) setPackages(data);
  };
  fetchPackages();
}, []);
```

**Query Details**:
- **Table**: `packages`
- **Filter**: `is_active = true`
- **Order**: By `price` ASC (cheapest first)
- **Auth**: Uses `anon` key (public read)
- **RLS**: Passes "view active packages" policy

### 2.3 Step 1: Service Type Selection

**UI**: Two large buttons (Mobile / Shop Location)

**Event Handler**:
```javascript
const handleServiceTypeSelect = (type) => {
  setServiceType(type);
  setStep(2); // Auto-advance
};
```

**Validation**: None (both options always valid)

**State Change**: 
- `serviceType` → 'mobile' or 'shop'
- `step` → 2

**Conditional Logic**: If `serviceType === 'mobile'`, Step 4 requires `address` field

### 2.4 Step 2: Vehicle Size Selection

**UI**: Three buttons (Small / Medium / Large)

**Pricing Logic** (hardcoded in frontend):
```javascript
const vehicleSizeFees = {
  small: 0,
  medium: 5,
  large: 10
};
```

**Event Handler**:
```javascript
const handleVehicleSizeSelect = (size) => {
  setVehicleSize(size);
  setStep(3);
};
```

**Price Calculation Trigger**: 
```javascript
useEffect(() => {
  const interiorPrice = interiorPackage?.price || 0;
  const exteriorPrice = exteriorPackage?.price || 0;
  const sizeFee = vehicleSizeFees[vehicleSize] || 0;
  const total = interiorPrice + exteriorPrice + sizeFee;
  
  setTotalPrice(total);
}, [interiorPackage, exteriorPackage, vehicleSize]);
```

**State Change**:
- `vehicleSize` → 'small' | 'medium' | 'large'
- `step` → 3

### 2.5 Step 3: Package Selection

**UI Structure**:
- Two sections: Exterior Detailing (top), Interior Detailing (bottom)
- Each shows 3 packages filtered by `package_type`
- "Skip Interior" / "Skip Exterior" buttons for non-combo bookings

**Package Filtering**:
```javascript
const exteriorPackages = packages.filter(pkg => pkg.package_type === 'exterior');
const interiorPackages = packages.filter(pkg => pkg.package_type === 'interior');
```

**Duration Calculation**:
```javascript
useEffect(() => {
  const interiorDuration = interiorPackage?.duration_minutes || 0;
  const exteriorDuration = exteriorPackage?.duration_minutes || 0;
  // Durations ADD (not overlap)
  setTotalDuration(interiorDuration + exteriorDuration);
}, [interiorPackage, exteriorPackage]);
```

**Selection Logic**:
```javascript
const handlePackageSelect = (pkg, type) => {
  if (type === 'interior') {
    setInteriorPackage(interiorPackage?.id === pkg.id ? null : pkg); // Toggle
  } else {
    setExteriorPackage(exteriorPackage?.id === pkg.id ? null : pkg);
  }
};
```

**Validation**:
```javascript
const canProceed = interiorPackage || exteriorPackage; // At least one required
```

**State Change**:
- `interiorPackage` → Package object or null
- `exteriorPackage` → Package object or null
- `totalDuration` → Sum of selected package durations
- `totalPrice` → Recalculated via useEffect
- `step` → 4 (on "Next" click)

### 2.6 Step 4: Date & Time Selection

**Date Picker Configuration**:
```javascript
<DatePicker
  selected={selectedDate}
  onChange={handleDateChange}
  minDate={new Date()} // Cannot book past dates
  maxDate={addDays(new Date(), 90)} // 90-day booking window
  filterDate={isDateAvailable} // Custom filter function
  inline
  calendarClassName="booking-calendar"
/>
```

**Date Availability Filter**:
```javascript
const isDateAvailable = (date) => {
  const day = date.getDay();
  // 0 = Sunday, 6 = Saturday
  return day !== 0 && day !== 6; // Weekdays only (Mon-Fri)
};
```

**Time Slot Generation** (triggered on date selection):

```javascript
const handleDateChange = async (date) => {
  setSelectedDate(date);
  setSelectedTime(''); // Reset time selection
  
  // Fetch existing bookings for this date
  const { data: existingBookings } = await supabase
    .from('bookings')
    .select('start_time, end_time')
    .eq('booking_date', format(date, 'yyyy-MM-dd'))
    .neq('status', 'cancelled');
  
  const slots = generateAvailableSlots(date, existingBookings);
  setAvailableSlots(slots);
};
```

**Slot Generation Algorithm**:

```javascript
const generateAvailableSlots = (date, existingBookings) => {
  const slots = [];
  const businessHours = { start: 15, end: 18 }; // 3 PM - 6 PM
  
  // Generate 30-minute intervals
  for (let hour = businessHours.start; hour < businessHours.end; hour++) {
    for (let minute of [0, 30]) {
      const slotStart = new Date(date);
      slotStart.setHours(hour, minute, 0, 0);
      
      // Calculate slot end time based on total duration
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + totalDuration);
      
      // Check if slot end exceeds business hours
      const endHour = slotEnd.getHours();
      const endMinute = slotEnd.getMinutes();
      const endTime = endHour + endMinute / 60;
      
      if (endTime > businessHours.end) continue; // Slot too late
      
      // Check for conflicts with existing bookings
      const hasConflict = existingBookings.some(booking => {
        const bookingStart = parseTime(booking.start_time);
        const bookingEnd = parseTime(booking.end_time);
        
        // Conflict if:
        // 1. New slot starts during existing booking
        // 2. New slot ends during existing booking
        // 3. New slot completely contains existing booking
        return (
          (slotStart >= bookingStart && slotStart < bookingEnd) ||
          (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
          (slotStart <= bookingStart && slotEnd >= bookingEnd)
        );
      });
      
      if (!hasConflict) {
        slots.push({
          time: format(slotStart, 'HH:mm'),
          display: format(slotStart, 'h:mm a')
        });
      }
    }
  }
  
  return slots;
};

const parseTime = (timeString) => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};
```

**Conflict Detection Logic Explained**:

Given:
- Existing booking: 3:00 PM - 4:30 PM
- New booking duration: 60 minutes

Scenarios:
1. **Slot 3:30 PM**: Would end at 4:30 PM → **CONFLICT** (overlaps existing)
2. **Slot 4:30 PM**: Would end at 5:30 PM → **AVAILABLE** (starts after existing ends)
3. **Slot 2:30 PM**: Would end at 3:30 PM → **CONFLICT** (ends during existing)

**Time Selection Handler**:
```javascript
const handleTimeSelect = (time) => {
  setSelectedTime(time);
  setStep(5); // Auto-advance
};
```

**State Changes**:
- `selectedDate` → Date object
- `selectedTime` → 'HH:MM' string
- `availableSlots` → Array of available time objects
- `step` → 5

### 2.7 Step 5: Customer Information

**Form Fields**:
```javascript
<input 
  type="text" 
  value={customerInfo.name}
  onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
  required 
/>
<input 
  type="tel" 
  value={customerInfo.phone}
  pattern="[0-9]{10}" // Validates 10-digit US phone
  required 
/>
<input 
  type="email" 
  value={customerInfo.email}
  required 
/>
{serviceType === 'mobile' && (
  <input 
    type="text" 
    value={customerInfo.address}
    required 
  />
)}
<textarea 
  value={customerInfo.notes}
  placeholder="Any special requests?" 
/>
{serviceType === 'mobile' && (
  <label>
    <input 
      type="checkbox" 
      checked={customerInfo.hasWaterElectric}
      onChange={(e) => setCustomerInfo({...customerInfo, hasWaterElectric: e.target.checked})}
    />
    I have water and electricity available
  </label>
)}
```

**Validation Logic**:
```javascript
const validateForm = () => {
  const newErrors = {};
  
  if (!customerInfo.name.trim()) {
    newErrors.name = 'Name is required';
  }
  
  if (!customerInfo.phone.trim()) {
    newErrors.phone = 'Phone number is required';
  } else if (!/^\d{10}$/.test(customerInfo.phone.replace(/\D/g, ''))) {
    newErrors.phone = 'Please enter a valid 10-digit phone number';
  }
  
  if (!customerInfo.email.trim()) {
    newErrors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerInfo.email)) {
    newErrors.email = 'Please enter a valid email address';
  }
  
  if (serviceType === 'mobile' && !customerInfo.address.trim()) {
    newErrors.address = 'Address is required for mobile service';
  }
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

**Submit Handler**:
```javascript
const handleSubmit = async () => {
  if (!validateForm()) {
    return; // Show errors, don't submit
  }
  
  setIsSubmitting(true);
  
  try {
    // Calculate end time
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const startTime = new Date(selectedDate);
    startTime.setHours(hours, minutes, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + totalDuration);
    
    // Prepare payload
    const bookingData = {
      customer_name: customerInfo.name.trim(),
      customer_phone: customerInfo.phone.replace(/\D/g, ''), // Strip formatting
      customer_email: customerInfo.email.trim().toLowerCase(),
      customer_address: serviceType === 'mobile' ? customerInfo.address.trim() : null,
      service_type: serviceType,
      vehicle_size: vehicleSize,
      interior_package_id: interiorPackage?.id || null,
      exterior_package_id: exteriorPackage?.id || null,
      has_water_electric: serviceType === 'mobile' ? customerInfo.hasWaterElectric : false,
      customer_notes: customerInfo.notes.trim() || null,
      booking_date: format(selectedDate, 'yyyy-MM-dd'),
      start_time: format(startTime, 'HH:mm:ss'),
      end_time: format(endTime, 'HH:mm:ss'),
      status: 'pending' // Admin must confirm
    };
    
    // Call Edge Function (NOT direct DB insert)
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-booking`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(bookingData)
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Booking failed');
    }
    
    const result = await response.json();
    
    // Success state
    setShowThankYou(true);
    
    // Reset form after 5 seconds
    setTimeout(() => {
      resetForm();
    }, 5000);
    
  } catch (error) {
    console.error('Booking error:', error);
    setErrors({ submit: error.message || 'Something went wrong. Please try again.' });
  } finally {
    setIsSubmitting(false);
  }
};
```

**Why Edge Function Instead of Direct Insert?**
1. **Business Logic**: Price calculation, duration validation, conflict checking
2. **Customer Auto-Creation**: Automatically creates/updates customer record
3. **Email Notifications**: Sends emails to customer and owner
4. **Calendar Integration**: Creates Google Calendar event (if configured)
5. **Data Integrity**: Server-side validation prevents tampering

---

## 3. EDGE FUNCTION: `create-booking`

**File**: `carwebitebooking/supabase/functions/create-booking/index.ts`

**Runtime**: Deno (TypeScript)

**Authentication**: Public endpoint (uses `anon` key)

### 3.1 Request Handler

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
```


## License: unknown
https://github.com/nick-barth/spokenword/blob/42400614921bde7e6d15058f25bbea4df771e283/supabase/functions/parse/index.ts

```
# Complete Technical Breakdown: Car Wash Booking System

## Project Architecture Overview

This is a **React-based single-page application** integrated with **Supabase** as the backend-as-a-service platform. The system consists of:

1. **Customer-facing booking widget** (public)
2. **Admin dashboard** (authenticated)
3. **Supabase Edge Functions** (serverless backend)
4. **PostgreSQL database** via Supabase
5. **Email notifications** via Resend API

---

## 1. DATABASE SCHEMA & TABLES

### 1.1 `bookings` Table
**Location**: `carwebitebooking/supabase/migrations/20240101000000_initial_schema.sql`

```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_address TEXT,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  total_duration_minutes INTEGER NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('mobile', 'shop')),
  vehicle_size TEXT NOT NULL CHECK (vehicle_size IN ('small', 'medium', 'large')),
  vehicle_size_fee NUMERIC(10,2) DEFAULT 0,
  interior_package_id UUID REFERENCES packages(id),
  exterior_package_id UUID REFERENCES packages(id),
  subtotal NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  has_water_electric BOOLEAN DEFAULT false,
  customer_notes TEXT,
  google_calendar_event_id TEXT,
  ics_file_sent BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  final_amount NUMERIC(10,2),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  line_items JSONB,
  payment_notes TEXT,
  finalized_at TIMESTAMPTZ
);
```

**Key Design Decisions**:
- `id` is UUID for security (non-sequential, unpredictable)
- `customer_phone` not unique (allows repeat customers)
- `service_type` enum constraint enforces valid values
- `vehicle_size_fee` stored separately for price transparency
- Foreign keys to `packages` table with `ON DELETE SET NULL` (if package deleted, booking retains price but loses reference)
- `status` and `payment_status` separate fields for business logic flexibility
- `line_items` as JSONB for flexible pricing breakdown
- `finalized_at` timestamp tracks when admin confirmed final pricing

### 1.2 `packages` Table
**Location**: Same migration file

```sql
CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  package_type TEXT NOT NULL CHECK (package_type IN ('interior', 'exterior')),
  price NUMERIC(10,2) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  description TEXT,
  features TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Initial Data**:
- 3 interior packages: Standard ($20, 30min), Deluxe ($40, 45min), Ultimate ($60, 60min)
- 3 exterior packages: Standard ($20, 30min), Deluxe ($35, 45min), Ultimate ($50, 60min)

### 1.3 `customers` Table
**Location**: `carwebitebooking/supabase/migrations/20240103000000_add_customers_table.sql`

```sql
CREATE TABLE customers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT,
  address TEXT,
  notes TEXT,
  total_bookings INTEGER DEFAULT 0,
  total_spent NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Design Decisions**:
- `phone` is UNIQUE constraint (one customer record per phone number)
- `BIGSERIAL` primary key (auto-incrementing integer)
- `total_bookings` and `total_spent` are **denormalized aggregates** for performance
- Updated via triggers or application logic after each booking

### 1.4 Row-Level Security (RLS)

**Authentication Context**: 
- Public users: `anon` role (JWT with `role: 'anon'`)
- Admin users: Manual authentication check in frontend (no actual auth table)

**RLS Policies** (`carwebitebooking/supabase/migrations/20240101000001_rls_policies.sql`):

```sql
-- Bookings: Public can insert (create bookings)
CREATE POLICY "Anyone can create bookings"
  ON bookings FOR INSERT
  TO anon
  WITH CHECK (true);

-- Bookings: Public can read their own (via email match)
CREATE POLICY "Anyone can read their bookings"
  ON bookings FOR SELECT
  TO anon
  USING (customer_email = current_setting('request.jwt.claims')::json->>'email');

-- Packages: Public read-only
CREATE POLICY "Anyone can view active packages"
  ON packages FOR SELECT
  TO anon
  USING (is_active = true);

-- Customers: Authenticated only
CREATE POLICY "Authenticated users can manage customers"
  ON customers FOR ALL
  TO authenticated
  USING (true);
```

**Security Analysis**:
- ❌ **VULNERABILITY**: Admin dashboard bypasses RLS by using `service_role` key client-side
- ⚠️ **RISK**: Service role key exposed in frontend env (`VITE_SUPABASE_SERVICE_KEY`)
- ✅ **MITIGATION**: Should use server-side Edge Functions for admin operations
- ✅ **Booking creation**: Properly uses `anon` key, no escalation possible

---

## 2. BOOKING WIDGET - COMPLETE TECHNICAL BREAKDOWN

### 2.1 Component Structure

**File**: `carwebitebooking/frontend/src/components/BookingWidget.jsx`

**Framework**: React 18 with Hooks
**Dependencies**:
- `react-datepicker` v4.x (calendar UI)
- `lucide-react` (icons)
- `@supabase/supabase-js` v2.x (database client)
- `date-fns` (date manipulation)

**State Management** (all local via `useState`):

```javascript
const [step, setStep] = useState(1);                    // Current form step (1-5)
const [serviceType, setServiceType] = useState('');     // 'mobile' | 'shop'
const [vehicleSize, setVehicleSize] = useState('');     // 'small' | 'medium' | 'large'
const [selectedDate, setSelectedDate] = useState(null); // Date object
const [selectedTime, setSelectedTime] = useState('');   // 'HH:MM' string
const [interiorPackage, setInteriorPackage] = useState(null); // Package object
const [exteriorPackage, setExteriorPackage] = useState(null); // Package object
const [packages, setPackages] = useState([]);           // Fetched from DB
const [availableSlots, setAvailableSlots] = useState([]); // Calculated time slots
const [customerInfo, setCustomerInfo] = useState({      // Form data
  name: '', phone: '', email: '', address: '', notes: '', hasWaterElectric: false
});
const [isSubmitting, setIsSubmitting] = useState(false);
const [errors, setErrors] = useState({});               // Validation errors
const [showThankYou, setShowThankYou] = useState(false);
const [totalPrice, setTotalPrice] = useState(0);        // Calculated price
const [totalDuration, setTotalDuration] = useState(0);  // Calculated minutes
```

### 2.2 Data Fetching on Mount

**Execution Flow**:

```javascript
useEffect(() => {
  const fetchPackages = async () => {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });
    
    if (!error) setPackages(data);
  };
  fetchPackages();
}, []);
```

**Query Details**:
- **Table**: `packages`
- **Filter**: `is_active = true`
- **Order**: By `price` ASC (cheapest first)
- **Auth**: Uses `anon` key (public read)
- **RLS**: Passes "view active packages" policy

### 2.3 Step 1: Service Type Selection

**UI**: Two large buttons (Mobile / Shop Location)

**Event Handler**:
```javascript
const handleServiceTypeSelect = (type) => {
  setServiceType(type);
  setStep(2); // Auto-advance
};
```

**Validation**: None (both options always valid)

**State Change**: 
- `serviceType` → 'mobile' or 'shop'
- `step` → 2

**Conditional Logic**: If `serviceType === 'mobile'`, Step 4 requires `address` field

### 2.4 Step 2: Vehicle Size Selection

**UI**: Three buttons (Small / Medium / Large)

**Pricing Logic** (hardcoded in frontend):
```javascript
const vehicleSizeFees = {
  small: 0,
  medium: 5,
  large: 10
};
```

**Event Handler**:
```javascript
const handleVehicleSizeSelect = (size) => {
  setVehicleSize(size);
  setStep(3);
};
```

**Price Calculation Trigger**: 
```javascript
useEffect(() => {
  const interiorPrice = interiorPackage?.price || 0;
  const exteriorPrice = exteriorPackage?.price || 0;
  const sizeFee = vehicleSizeFees[vehicleSize] || 0;
  const total = interiorPrice + exteriorPrice + sizeFee;
  
  setTotalPrice(total);
}, [interiorPackage, exteriorPackage, vehicleSize]);
```

**State Change**:
- `vehicleSize` → 'small' | 'medium' | 'large'
- `step` → 3

### 2.5 Step 3: Package Selection

**UI Structure**:
- Two sections: Exterior Detailing (top), Interior Detailing (bottom)
- Each shows 3 packages filtered by `package_type`
- "Skip Interior" / "Skip Exterior" buttons for non-combo bookings

**Package Filtering**:
```javascript
const exteriorPackages = packages.filter(pkg => pkg.package_type === 'exterior');
const interiorPackages = packages.filter(pkg => pkg.package_type === 'interior');
```

**Duration Calculation**:
```javascript
useEffect(() => {
  const interiorDuration = interiorPackage?.duration_minutes || 0;
  const exteriorDuration = exteriorPackage?.duration_minutes || 0;
  // Durations ADD (not overlap)
  setTotalDuration(interiorDuration + exteriorDuration);
}, [interiorPackage, exteriorPackage]);
```

**Selection Logic**:
```javascript
const handlePackageSelect = (pkg, type) => {
  if (type === 'interior') {
    setInteriorPackage(interiorPackage?.id === pkg.id ? null : pkg); // Toggle
  } else {
    setExteriorPackage(exteriorPackage?.id === pkg.id ? null : pkg);
  }
};
```

**Validation**:
```javascript
const canProceed = interiorPackage || exteriorPackage; // At least one required
```

**State Change**:
- `interiorPackage` → Package object or null
- `exteriorPackage` → Package object or null
- `totalDuration` → Sum of selected package durations
- `totalPrice` → Recalculated via useEffect
- `step` → 4 (on "Next" click)

### 2.6 Step 4: Date & Time Selection

**Date Picker Configuration**:
```javascript
<DatePicker
  selected={selectedDate}
  onChange={handleDateChange}
  minDate={new Date()} // Cannot book past dates
  maxDate={addDays(new Date(), 90)} // 90-day booking window
  filterDate={isDateAvailable} // Custom filter function
  inline
  calendarClassName="booking-calendar"
/>
```

**Date Availability Filter**:
```javascript
const isDateAvailable = (date) => {
  const day = date.getDay();
  // 0 = Sunday, 6 = Saturday
  return day !== 0 && day !== 6; // Weekdays only (Mon-Fri)
};
```

**Time Slot Generation** (triggered on date selection):

```javascript
const handleDateChange = async (date) => {
  setSelectedDate(date);
  setSelectedTime(''); // Reset time selection
  
  // Fetch existing bookings for this date
  const { data: existingBookings } = await supabase
    .from('bookings')
    .select('start_time, end_time')
    .eq('booking_date', format(date, 'yyyy-MM-dd'))
    .neq('status', 'cancelled');
  
  const slots = generateAvailableSlots(date, existingBookings);
  setAvailableSlots(slots);
};
```

**Slot Generation Algorithm**:

```javascript
const generateAvailableSlots = (date, existingBookings) => {
  const slots = [];
  const businessHours = { start: 15, end: 18 }; // 3 PM - 6 PM
  
  // Generate 30-minute intervals
  for (let hour = businessHours.start; hour < businessHours.end; hour++) {
    for (let minute of [0, 30]) {
      const slotStart = new Date(date);
      slotStart.setHours(hour, minute, 0, 0);
      
      // Calculate slot end time based on total duration
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + totalDuration);
      
      // Check if slot end exceeds business hours
      const endHour = slotEnd.getHours();
      const endMinute = slotEnd.getMinutes();
      const endTime = endHour + endMinute / 60;
      
      if (endTime > businessHours.end) continue; // Slot too late
      
      // Check for conflicts with existing bookings
      const hasConflict = existingBookings.some(booking => {
        const bookingStart = parseTime(booking.start_time);
        const bookingEnd = parseTime(booking.end_time);
        
        // Conflict if:
        // 1. New slot starts during existing booking
        // 2. New slot ends during existing booking
        // 3. New slot completely contains existing booking
        return (
          (slotStart >= bookingStart && slotStart < bookingEnd) ||
          (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
          (slotStart <= bookingStart && slotEnd >= bookingEnd)
        );
      });
      
      if (!hasConflict) {
        slots.push({
          time: format(slotStart, 'HH:mm'),
          display: format(slotStart, 'h:mm a')
        });
      }
    }
  }
  
  return slots;
};

const parseTime = (timeString) => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};
```

**Conflict Detection Logic Explained**:

Given:
- Existing booking: 3:00 PM - 4:30 PM
- New booking duration: 60 minutes

Scenarios:
1. **Slot 3:30 PM**: Would end at 4:30 PM → **CONFLICT** (overlaps existing)
2. **Slot 4:30 PM**: Would end at 5:30 PM → **AVAILABLE** (starts after existing ends)
3. **Slot 2:30 PM**: Would end at 3:30 PM → **CONFLICT** (ends during existing)

**Time Selection Handler**:
```javascript
const handleTimeSelect = (time) => {
  setSelectedTime(time);
  setStep(5); // Auto-advance
};
```

**State Changes**:
- `selectedDate` → Date object
- `selectedTime` → 'HH:MM' string
- `availableSlots` → Array of available time objects
- `step` → 5

### 2.7 Step 5: Customer Information

**Form Fields**:
```javascript
<input 
  type="text" 
  value={customerInfo.name}
  onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
  required 
/>
<input 
  type="tel" 
  value={customerInfo.phone}
  pattern="[0-9]{10}" // Validates 10-digit US phone
  required 
/>
<input 
  type="email" 
  value={customerInfo.email}
  required 
/>
{serviceType === 'mobile' && (
  <input 
    type="text" 
    value={customerInfo.address}
    required 
  />
)}
<textarea 
  value={customerInfo.notes}
  placeholder="Any special requests?" 
/>
{serviceType === 'mobile' && (
  <label>
    <input 
      type="checkbox" 
      checked={customerInfo.hasWaterElectric}
      onChange={(e) => setCustomerInfo({...customerInfo, hasWaterElectric: e.target.checked})}
    />
    I have water and electricity available
  </label>
)}
```

**Validation Logic**:
```javascript
const validateForm = () => {
  const newErrors = {};
  
  if (!customerInfo.name.trim()) {
    newErrors.name = 'Name is required';
  }
  
  if (!customerInfo.phone.trim()) {
    newErrors.phone = 'Phone number is required';
  } else if (!/^\d{10}$/.test(customerInfo.phone.replace(/\D/g, ''))) {
    newErrors.phone = 'Please enter a valid 10-digit phone number';
  }
  
  if (!customerInfo.email.trim()) {
    newErrors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerInfo.email)) {
    newErrors.email = 'Please enter a valid email address';
  }
  
  if (serviceType === 'mobile' && !customerInfo.address.trim()) {
    newErrors.address = 'Address is required for mobile service';
  }
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

**Submit Handler**:
```javascript
const handleSubmit = async () => {
  if (!validateForm()) {
    return; // Show errors, don't submit
  }
  
  setIsSubmitting(true);
  
  try {
    // Calculate end time
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const startTime = new Date(selectedDate);
    startTime.setHours(hours, minutes, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + totalDuration);
    
    // Prepare payload
    const bookingData = {
      customer_name: customerInfo.name.trim(),
      customer_phone: customerInfo.phone.replace(/\D/g, ''), // Strip formatting
      customer_email: customerInfo.email.trim().toLowerCase(),
      customer_address: serviceType === 'mobile' ? customerInfo.address.trim() : null,
      service_type: serviceType,
      vehicle_size: vehicleSize,
      interior_package_id: interiorPackage?.id || null,
      exterior_package_id: exteriorPackage?.id || null,
      has_water_electric: serviceType === 'mobile' ? customerInfo.hasWaterElectric : false,
      customer_notes: customerInfo.notes.trim() || null,
      booking_date: format(selectedDate, 'yyyy-MM-dd'),
      start_time: format(startTime, 'HH:mm:ss'),
      end_time: format(endTime, 'HH:mm:ss'),
      status: 'pending' // Admin must confirm
    };
    
    // Call Edge Function (NOT direct DB insert)
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-booking`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(bookingData)
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Booking failed');
    }
    
    const result = await response.json();
    
    // Success state
    setShowThankYou(true);
    
    // Reset form after 5 seconds
    setTimeout(() => {
      resetForm();
    }, 5000);
    
  } catch (error) {
    console.error('Booking error:', error);
    setErrors({ submit: error.message || 'Something went wrong. Please try again.' });
  } finally {
    setIsSubmitting(false);
  }
};
```

**Why Edge Function Instead of Direct Insert?**
1. **Business Logic**: Price calculation, duration validation, conflict checking
2. **Customer Auto-Creation**: Automatically creates/updates customer record
3. **Email Notifications**: Sends emails to customer and owner
4. **Calendar Integration**: Creates Google Calendar event (if configured)
5. **Data Integrity**: Server-side validation prevents tampering

---

## 3. EDGE FUNCTION: `create-booking`

**File**: `carwebitebooking/supabase/functions/create-booking/index.ts`

**Runtime**: Deno (TypeScript)

**Authentication**: Public endpoint (uses `anon` key)

### 3.1 Request Handler

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
```


## License: unknown
https://github.com/nick-barth/spokenword/blob/42400614921bde7e6d15058f25bbea4df771e283/supabase/functions/parse/index.ts

```
# Complete Technical Breakdown: Car Wash Booking System

## Project Architecture Overview

This is a **React-based single-page application** integrated with **Supabase** as the backend-as-a-service platform. The system consists of:

1. **Customer-facing booking widget** (public)
2. **Admin dashboard** (authenticated)
3. **Supabase Edge Functions** (serverless backend)
4. **PostgreSQL database** via Supabase
5. **Email notifications** via Resend API

---

## 1. DATABASE SCHEMA & TABLES

### 1.1 `bookings` Table
**Location**: `carwebitebooking/supabase/migrations/20240101000000_initial_schema.sql`

```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_address TEXT,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  total_duration_minutes INTEGER NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('mobile', 'shop')),
  vehicle_size TEXT NOT NULL CHECK (vehicle_size IN ('small', 'medium', 'large')),
  vehicle_size_fee NUMERIC(10,2) DEFAULT 0,
  interior_package_id UUID REFERENCES packages(id),
  exterior_package_id UUID REFERENCES packages(id),
  subtotal NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  has_water_electric BOOLEAN DEFAULT false,
  customer_notes TEXT,
  google_calendar_event_id TEXT,
  ics_file_sent BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  final_amount NUMERIC(10,2),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  line_items JSONB,
  payment_notes TEXT,
  finalized_at TIMESTAMPTZ
);
```

**Key Design Decisions**:
- `id` is UUID for security (non-sequential, unpredictable)
- `customer_phone` not unique (allows repeat customers)
- `service_type` enum constraint enforces valid values
- `vehicle_size_fee` stored separately for price transparency
- Foreign keys to `packages` table with `ON DELETE SET NULL` (if package deleted, booking retains price but loses reference)
- `status` and `payment_status` separate fields for business logic flexibility
- `line_items` as JSONB for flexible pricing breakdown
- `finalized_at` timestamp tracks when admin confirmed final pricing

### 1.2 `packages` Table
**Location**: Same migration file

```sql
CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  package_type TEXT NOT NULL CHECK (package_type IN ('interior', 'exterior')),
  price NUMERIC(10,2) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  description TEXT,
  features TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Initial Data**:
- 3 interior packages: Standard ($20, 30min), Deluxe ($40, 45min), Ultimate ($60, 60min)
- 3 exterior packages: Standard ($20, 30min), Deluxe ($35, 45min), Ultimate ($50, 60min)

### 1.3 `customers` Table
**Location**: `carwebitebooking/supabase/migrations/20240103000000_add_customers_table.sql`

```sql
CREATE TABLE customers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT,
  address TEXT,
  notes TEXT,
  total_bookings INTEGER DEFAULT 0,
  total_spent NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Design Decisions**:
- `phone` is UNIQUE constraint (one customer record per phone number)
- `BIGSERIAL` primary key (auto-incrementing integer)
- `total_bookings` and `total_spent` are **denormalized aggregates** for performance
- Updated via triggers or application logic after each booking

### 1.4 Row-Level Security (RLS)

**Authentication Context**: 
- Public users: `anon` role (JWT with `role: 'anon'`)
- Admin users: Manual authentication check in frontend (no actual auth table)

**RLS Policies** (`carwebitebooking/supabase/migrations/20240101000001_rls_policies.sql`):

```sql
-- Bookings: Public can insert (create bookings)
CREATE POLICY "Anyone can create bookings"
  ON bookings FOR INSERT
  TO anon
  WITH CHECK (true);

-- Bookings: Public can read their own (via email match)
CREATE POLICY "Anyone can read their bookings"
  ON bookings FOR SELECT
  TO anon
  USING (customer_email = current_setting('request.jwt.claims')::json->>'email');

-- Packages: Public read-only
CREATE POLICY "Anyone can view active packages"
  ON packages FOR SELECT
  TO anon
  USING (is_active = true);

-- Customers: Authenticated only
CREATE POLICY "Authenticated users can manage customers"
  ON customers FOR ALL
  TO authenticated
  USING (true);
```

**Security Analysis**:
- ❌ **VULNERABILITY**: Admin dashboard bypasses RLS by using `service_role` key client-side
- ⚠️ **RISK**: Service role key exposed in frontend env (`VITE_SUPABASE_SERVICE_KEY`)
- ✅ **MITIGATION**: Should use server-side Edge Functions for admin operations
- ✅ **Booking creation**: Properly uses `anon` key, no escalation possible

---

## 2. BOOKING WIDGET - COMPLETE TECHNICAL BREAKDOWN

### 2.1 Component Structure

**File**: `carwebitebooking/frontend/src/components/BookingWidget.jsx`

**Framework**: React 18 with Hooks
**Dependencies**:
- `react-datepicker` v4.x (calendar UI)
- `lucide-react` (icons)
- `@supabase/supabase-js` v2.x (database client)
- `date-fns` (date manipulation)

**State Management** (all local via `useState`):

```javascript
const [step, setStep] = useState(1);                    // Current form step (1-5)
const [serviceType, setServiceType] = useState('');     // 'mobile' | 'shop'
const [vehicleSize, setVehicleSize] = useState('');     // 'small' | 'medium' | 'large'
const [selectedDate, setSelectedDate] = useState(null); // Date object
const [selectedTime, setSelectedTime] = useState('');   // 'HH:MM' string
const [interiorPackage, setInteriorPackage] = useState(null); // Package object
const [exteriorPackage, setExteriorPackage] = useState(null); // Package object
const [packages, setPackages] = useState([]);           // Fetched from DB
const [availableSlots, setAvailableSlots] = useState([]); // Calculated time slots
const [customerInfo, setCustomerInfo] = useState({      // Form data
  name: '', phone: '', email: '', address: '', notes: '', hasWaterElectric: false
});
const [isSubmitting, setIsSubmitting] = useState(false);
const [errors, setErrors] = useState({});               // Validation errors
const [showThankYou, setShowThankYou] = useState(false);
const [totalPrice, setTotalPrice] = useState(0);        // Calculated price
const [totalDuration, setTotalDuration] = useState(0);  // Calculated minutes
```

### 2.2 Data Fetching on Mount

**Execution Flow**:

```javascript
useEffect(() => {
  const fetchPackages = async () => {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });
    
    if (!error) setPackages(data);
  };
  fetchPackages();
}, []);
```

**Query Details**:
- **Table**: `packages`
- **Filter**: `is_active = true`
- **Order**: By `price` ASC (cheapest first)
- **Auth**: Uses `anon` key (public read)
- **RLS**: Passes "view active packages" policy

### 2.3 Step 1: Service Type Selection

**UI**: Two large buttons (Mobile / Shop Location)

**Event Handler**:
```javascript
const handleServiceTypeSelect = (type) => {
  setServiceType(type);
  setStep(2); // Auto-advance
};
```

**Validation**: None (both options always valid)

**State Change**: 
- `serviceType` → 'mobile' or 'shop'
- `step` → 2

**Conditional Logic**: If `serviceType === 'mobile'`, Step 4 requires `address` field

### 2.4 Step 2: Vehicle Size Selection

**UI**: Three buttons (Small / Medium / Large)

**Pricing Logic** (hardcoded in frontend):
```javascript
const vehicleSizeFees = {
  small: 0,
  medium: 5,
  large: 10
};
```

**Event Handler**:
```javascript
const handleVehicleSizeSelect = (size) => {
  setVehicleSize(size);
  setStep(3);
};
```

**Price Calculation Trigger**: 
```javascript
useEffect(() => {
  const interiorPrice = interiorPackage?.price || 0;
  const exteriorPrice = exteriorPackage?.price || 0;
  const sizeFee = vehicleSizeFees[vehicleSize] || 0;
  const total = interiorPrice + exteriorPrice + sizeFee;
  
  setTotalPrice(total);
}, [interiorPackage, exteriorPackage, vehicleSize]);
```

**State Change**:
- `vehicleSize` → 'small' | 'medium' | 'large'
- `step` → 3

### 2.5 Step 3: Package Selection

**UI Structure**:
- Two sections: Exterior Detailing (top), Interior Detailing (bottom)
- Each shows 3 packages filtered by `package_type`
- "Skip Interior" / "Skip Exterior" buttons for non-combo bookings

**Package Filtering**:
```javascript
const exteriorPackages = packages.filter(pkg => pkg.package_type === 'exterior');
const interiorPackages = packages.filter(pkg => pkg.package_type === 'interior');
```

**Duration Calculation**:
```javascript
useEffect(() => {
  const interiorDuration = interiorPackage?.duration_minutes || 0;
  const exteriorDuration = exteriorPackage?.duration_minutes || 0;
  // Durations ADD (not overlap)
  setTotalDuration(interiorDuration + exteriorDuration);
}, [interiorPackage, exteriorPackage]);
```

**Selection Logic**:
```javascript
const handlePackageSelect = (pkg, type) => {
  if (type === 'interior') {
    setInteriorPackage(interiorPackage?.id === pkg.id ? null : pkg); // Toggle
  } else {
    setExteriorPackage(exteriorPackage?.id === pkg.id ? null : pkg);
  }
};
```

**Validation**:
```javascript
const canProceed = interiorPackage || exteriorPackage; // At least one required
```

**State Change**:
- `interiorPackage` → Package object or null
- `exteriorPackage` → Package object or null
- `totalDuration` → Sum of selected package durations
- `totalPrice` → Recalculated via useEffect
- `step` → 4 (on "Next" click)

### 2.6 Step 4: Date & Time Selection

**Date Picker Configuration**:
```javascript
<DatePicker
  selected={selectedDate}
  onChange={handleDateChange}
  minDate={new Date()} // Cannot book past dates
  maxDate={addDays(new Date(), 90)} // 90-day booking window
  filterDate={isDateAvailable} // Custom filter function
  inline
  calendarClassName="booking-calendar"
/>
```

**Date Availability Filter**:
```javascript
const isDateAvailable = (date) => {
  const day = date.getDay();
  // 0 = Sunday, 6 = Saturday
  return day !== 0 && day !== 6; // Weekdays only (Mon-Fri)
};
```

**Time Slot Generation** (triggered on date selection):

```javascript
const handleDateChange = async (date) => {
  setSelectedDate(date);
  setSelectedTime(''); // Reset time selection
  
  // Fetch existing bookings for this date
  const { data: existingBookings } = await supabase
    .from('bookings')
    .select('start_time, end_time')
    .eq('booking_date', format(date, 'yyyy-MM-dd'))
    .neq('status', 'cancelled');
  
  const slots = generateAvailableSlots(date, existingBookings);
  setAvailableSlots(slots);
};
```

**Slot Generation Algorithm**:

```javascript
const generateAvailableSlots = (date, existingBookings) => {
  const slots = [];
  const businessHours = { start: 15, end: 18 }; // 3 PM - 6 PM
  
  // Generate 30-minute intervals
  for (let hour = businessHours.start; hour < businessHours.end; hour++) {
    for (let minute of [0, 30]) {
      const slotStart = new Date(date);
      slotStart.setHours(hour, minute, 0, 0);
      
      // Calculate slot end time based on total duration
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + totalDuration);
      
      // Check if slot end exceeds business hours
      const endHour = slotEnd.getHours();
      const endMinute = slotEnd.getMinutes();
      const endTime = endHour + endMinute / 60;
      
      if (endTime > businessHours.end) continue; // Slot too late
      
      // Check for conflicts with existing bookings
      const hasConflict = existingBookings.some(booking => {
        const bookingStart = parseTime(booking.start_time);
        const bookingEnd = parseTime(booking.end_time);
        
        // Conflict if:
        // 1. New slot starts during existing booking
        // 2. New slot ends during existing booking
        // 3. New slot completely contains existing booking
        return (
          (slotStart >= bookingStart && slotStart < bookingEnd) ||
          (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
          (slotStart <= bookingStart && slotEnd >= bookingEnd)
        );
      });
      
      if (!hasConflict) {
        slots.push({
          time: format(slotStart, 'HH:mm'),
          display: format(slotStart, 'h:mm a')
        });
      }
    }
  }
  
  return slots;
};

const parseTime = (timeString) => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};
```

**Conflict Detection Logic Explained**:

Given:
- Existing booking: 3:00 PM - 4:30 PM
- New booking duration: 60 minutes

Scenarios:
1. **Slot 3:30 PM**: Would end at 4:30 PM → **CONFLICT** (overlaps existing)
2. **Slot 4:30 PM**: Would end at 5:30 PM → **AVAILABLE** (starts after existing ends)
3. **Slot 2:30 PM**: Would end at 3:30 PM → **CONFLICT** (ends during existing)

**Time Selection Handler**:
```javascript
const handleTimeSelect = (time) => {
  setSelectedTime(time);
  setStep(5); // Auto-advance
};
```

**State Changes**:
- `selectedDate` → Date object
- `selectedTime` → 'HH:MM' string
- `availableSlots` → Array of available time objects
- `step` → 5

### 2.7 Step 5: Customer Information

**Form Fields**:
```javascript
<input 
  type="text" 
  value={customerInfo.name}
  onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
  required 
/>
<input 
  type="tel" 
  value={customerInfo.phone}
  pattern="[0-9]{10}" // Validates 10-digit US phone
  required 
/>
<input 
  type="email" 
  value={customerInfo.email}
  required 
/>
{serviceType === 'mobile' && (
  <input 
    type="text" 
    value={customerInfo.address}
    required 
  />
)}
<textarea 
  value={customerInfo.notes}
  placeholder="Any special requests?" 
/>
{serviceType === 'mobile' && (
  <label>
    <input 
      type="checkbox" 
      checked={customerInfo.hasWaterElectric}
      onChange={(e) => setCustomerInfo({...customerInfo, hasWaterElectric: e.target.checked})}
    />
    I have water and electricity available
  </label>
)}
```

**Validation Logic**:
```javascript
const validateForm = () => {
  const newErrors = {};
  
  if (!customerInfo.name.trim()) {
    newErrors.name = 'Name is required';
  }
  
  if (!customerInfo.phone.trim()) {
    newErrors.phone = 'Phone number is required';
  } else if (!/^\d{10}$/.test(customerInfo.phone.replace(/\D/g, ''))) {
    newErrors.phone = 'Please enter a valid 10-digit phone number';
  }
  
  if (!customerInfo.email.trim()) {
    newErrors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerInfo.email)) {
    newErrors.email = 'Please enter a valid email address';
  }
  
  if (serviceType === 'mobile' && !customerInfo.address.trim()) {
    newErrors.address = 'Address is required for mobile service';
  }
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

**Submit Handler**:
```javascript
const handleSubmit = async () => {
  if (!validateForm()) {
    return; // Show errors, don't submit
  }
  
  setIsSubmitting(true);
  
  try {
    // Calculate end time
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const startTime = new Date(selectedDate);
    startTime.setHours(hours, minutes, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + totalDuration);
    
    // Prepare payload
    const bookingData = {
      customer_name: customerInfo.name.trim(),
      customer_phone: customerInfo.phone.replace(/\D/g, ''), // Strip formatting
      customer_email: customerInfo.email.trim().toLowerCase(),
      customer_address: serviceType === 'mobile' ? customerInfo.address.trim() : null,
      service_type: serviceType,
      vehicle_size: vehicleSize,
      interior_package_id: interiorPackage?.id || null,
      exterior_package_id: exteriorPackage?.id || null,
      has_water_electric: serviceType === 'mobile' ? customerInfo.hasWaterElectric : false,
      customer_notes: customerInfo.notes.trim() || null,
      booking_date: format(selectedDate, 'yyyy-MM-dd'),
      start_time: format(startTime, 'HH:mm:ss'),
      end_time: format(endTime, 'HH:mm:ss'),
      status: 'pending' // Admin must confirm
    };
    
    // Call Edge Function (NOT direct DB insert)
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-booking`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(bookingData)
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Booking failed');
    }
    
    const result = await response.json();
    
    // Success state
    setShowThankYou(true);
    
    // Reset form after 5 seconds
    setTimeout(() => {
      resetForm();
    }, 5000);
    
  } catch (error) {
    console.error('Booking error:', error);
    setErrors({ submit: error.message || 'Something went wrong. Please try again.' });
  } finally {
    setIsSubmitting(false);
  }
};
```

**Why Edge Function Instead of Direct Insert?**
1. **Business Logic**: Price calculation, duration validation, conflict checking
2. **Customer Auto-Creation**: Automatically creates/updates customer record
3. **Email Notifications**: Sends emails to customer and owner
4. **Calendar Integration**: Creates Google Calendar event (if configured)
5. **Data Integrity**: Server-side validation prevents tampering

---

## 3. EDGE FUNCTION: `create-booking`

**File**: `carwebitebooking/supabase/functions/create-booking/index.ts`

**Runtime**: Deno (TypeScript)

**Authentication**: Public endpoint (uses `anon` key)

### 3.1 Request Handler

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
```


## License: unknown
https://github.com/nick-barth/spokenword/blob/42400614921bde7e6d15058f25bbea4df771e283/supabase/functions/parse/index.ts

```
# Complete Technical Breakdown: Car Wash Booking System

## Project Architecture Overview

This is a **React-based single-page application** integrated with **Supabase** as the backend-as-a-service platform. The system consists of:

1. **Customer-facing booking widget** (public)
2. **Admin dashboard** (authenticated)
3. **Supabase Edge Functions** (serverless backend)
4. **PostgreSQL database** via Supabase
5. **Email notifications** via Resend API

---

## 1. DATABASE SCHEMA & TABLES

### 1.1 `bookings` Table
**Location**: `carwebitebooking/supabase/migrations/20240101000000_initial_schema.sql`

```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_address TEXT,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  total_duration_minutes INTEGER NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('mobile', 'shop')),
  vehicle_size TEXT NOT NULL CHECK (vehicle_size IN ('small', 'medium', 'large')),
  vehicle_size_fee NUMERIC(10,2) DEFAULT 0,
  interior_package_id UUID REFERENCES packages(id),
  exterior_package_id UUID REFERENCES packages(id),
  subtotal NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  has_water_electric BOOLEAN DEFAULT false,
  customer_notes TEXT,
  google_calendar_event_id TEXT,
  ics_file_sent BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  final_amount NUMERIC(10,2),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  line_items JSONB,
  payment_notes TEXT,
  finalized_at TIMESTAMPTZ
);
```

**Key Design Decisions**:
- `id` is UUID for security (non-sequential, unpredictable)
- `customer_phone` not unique (allows repeat customers)
- `service_type` enum constraint enforces valid values
- `vehicle_size_fee` stored separately for price transparency
- Foreign keys to `packages` table with `ON DELETE SET NULL` (if package deleted, booking retains price but loses reference)
- `status` and `payment_status` separate fields for business logic flexibility
- `line_items` as JSONB for flexible pricing breakdown
- `finalized_at` timestamp tracks when admin confirmed final pricing

### 1.2 `packages` Table
**Location**: Same migration file

```sql
CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  package_type TEXT NOT NULL CHECK (package_type IN ('interior', 'exterior')),
  price NUMERIC(10,2) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  description TEXT,
  features TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Initial Data**:
- 3 interior packages: Standard ($20, 30min), Deluxe ($40, 45min), Ultimate ($60, 60min)
- 3 exterior packages: Standard ($20, 30min), Deluxe ($35, 45min), Ultimate ($50, 60min)

### 1.3 `customers` Table
**Location**: `carwebitebooking/supabase/migrations/20240103000000_add_customers_table.sql`

```sql
CREATE TABLE customers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT,
  address TEXT,
  notes TEXT,
  total_bookings INTEGER DEFAULT 0,
  total_spent NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Design Decisions**:
- `phone` is UNIQUE constraint (one customer record per phone number)
- `BIGSERIAL` primary key (auto-incrementing integer)
- `total_bookings` and `total_spent` are **denormalized aggregates** for performance
- Updated via triggers or application logic after each booking

### 1.4 Row-Level Security (RLS)

**Authentication Context**: 
- Public users: `anon` role (JWT with `role: 'anon'`)
- Admin users: Manual authentication check in frontend (no actual auth table)

**RLS Policies** (`carwebitebooking/supabase/migrations/20240101000001_rls_policies.sql`):

```sql
-- Bookings: Public can insert (create bookings)
CREATE POLICY "Anyone can create bookings"
  ON bookings FOR INSERT
  TO anon
  WITH CHECK (true);

-- Bookings: Public can read their own (via email match)
CREATE POLICY "Anyone can read their bookings"
  ON bookings FOR SELECT
  TO anon
  USING (customer_email = current_setting('request.jwt.claims')::json->>'email');

-- Packages: Public read-only
CREATE POLICY "Anyone can view active packages"
  ON packages FOR SELECT
  TO anon
  USING (is_active = true);

-- Customers: Authenticated only
CREATE POLICY "Authenticated users can manage customers"
  ON customers FOR ALL
  TO authenticated
  USING (true);
```

**Security Analysis**:
- ❌ **VULNERABILITY**: Admin dashboard bypasses RLS by using `service_role` key client-side
- ⚠️ **RISK**: Service role key exposed in frontend env (`VITE_SUPABASE_SERVICE_KEY`)
- ✅ **MITIGATION**: Should use server-side Edge Functions for admin operations
- ✅ **Booking creation**: Properly uses `anon` key, no escalation possible

---

## 2. BOOKING WIDGET - COMPLETE TECHNICAL BREAKDOWN

### 2.1 Component Structure

**File**: `carwebitebooking/frontend/src/components/BookingWidget.jsx`

**Framework**: React 18 with Hooks
**Dependencies**:
- `react-datepicker` v4.x (calendar UI)
- `lucide-react` (icons)
- `@supabase/supabase-js` v2.x (database client)
- `date-fns` (date manipulation)

**State Management** (all local via `useState`):

```javascript
const [step, setStep] = useState(1);                    // Current form step (1-5)
const [serviceType, setServiceType] = useState('');     // 'mobile' | 'shop'
const [vehicleSize, setVehicleSize] = useState('');     // 'small' | 'medium' | 'large'
const [selectedDate, setSelectedDate] = useState(null); // Date object
const [selectedTime, setSelectedTime] = useState('');   // 'HH:MM' string
const [interiorPackage, setInteriorPackage] = useState(null); // Package object
const [exteriorPackage, setExteriorPackage] = useState(null); // Package object
const [packages, setPackages] = useState([]);           // Fetched from DB
const [availableSlots, setAvailableSlots] = useState([]); // Calculated time slots
const [customerInfo, setCustomerInfo] = useState({      // Form data
  name: '', phone: '', email: '', address: '', notes: '', hasWaterElectric: false
});
const [isSubmitting, setIsSubmitting] = useState(false);
const [errors, setErrors] = useState({});               // Validation errors
const [showThankYou, setShowThankYou] = useState(false);
const [totalPrice, setTotalPrice] = useState(0);        // Calculated price
const [totalDuration, setTotalDuration] = useState(0);  // Calculated minutes
```

### 2.2 Data Fetching on Mount

**Execution Flow**:

```javascript
useEffect(() => {
  const fetchPackages = async () => {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });
    
    if (!error) setPackages(data);
  };
  fetchPackages();
}, []);
```

**Query Details**:
- **Table**: `packages`
- **Filter**: `is_active = true`
- **Order**: By `price` ASC (cheapest first)
- **Auth**: Uses `anon` key (public read)
- **RLS**: Passes "view active packages" policy

### 2.3 Step 1: Service Type Selection

**UI**: Two large buttons (Mobile / Shop Location)

**Event Handler**:
```javascript
const handleServiceTypeSelect = (type) => {
  setServiceType(type);
  setStep(2); // Auto-advance
};
```

**Validation**: None (both options always valid)

**State Change**: 
- `serviceType` → 'mobile' or 'shop'
- `step` → 2

**Conditional Logic**: If `serviceType === 'mobile'`, Step 4 requires `address` field

### 2.4 Step 2: Vehicle Size Selection

**UI**: Three buttons (Small / Medium / Large)

**Pricing Logic** (hardcoded in frontend):
```javascript
const vehicleSizeFees = {
  small: 0,
  medium: 5,
  large: 10
};
```

**Event Handler**:
```javascript
const handleVehicleSizeSelect = (size) => {
  setVehicleSize(size);
  setStep(3);
};
```

**Price Calculation Trigger**: 
```javascript
useEffect(() => {
  const interiorPrice = interiorPackage?.price || 0;
  const exteriorPrice = exteriorPackage?.price || 0;
  const sizeFee = vehicleSizeFees[vehicleSize] || 0;
  const total = interiorPrice + exteriorPrice + sizeFee;
  
  setTotalPrice(total);
}, [interiorPackage, exteriorPackage, vehicleSize]);
```

**State Change**:
- `vehicleSize` → 'small' | 'medium' | 'large'
- `step` → 3

### 2.5 Step 3: Package Selection

**UI Structure**:
- Two sections: Exterior Detailing (top), Interior Detailing (bottom)
- Each shows 3 packages filtered by `package_type`
- "Skip Interior" / "Skip Exterior" buttons for non-combo bookings

**Package Filtering**:
```javascript
const exteriorPackages = packages.filter(pkg => pkg.package_type === 'exterior');
const interiorPackages = packages.filter(pkg => pkg.package_type === 'interior');
```

**Duration Calculation**:
```javascript
useEffect(() => {
  const interiorDuration = interiorPackage?.duration_minutes || 0;
  const exteriorDuration = exteriorPackage?.duration_minutes || 0;
  // Durations ADD (not overlap)
  setTotalDuration(interiorDuration + exteriorDuration);
}, [interiorPackage, exteriorPackage]);
```

**Selection Logic**:
```javascript
const handlePackageSelect = (pkg, type) => {
  if (type === 'interior') {
    setInteriorPackage(interiorPackage?.id === pkg.id ? null : pkg); // Toggle
  } else {
    setExteriorPackage(exteriorPackage?.id === pkg.id ? null : pkg);
  }
};
```

**Validation**:
```javascript
const canProceed = interiorPackage || exteriorPackage; // At least one required
```

**State Change**:
- `interiorPackage` → Package object or null
- `exteriorPackage` → Package object or null
- `totalDuration` → Sum of selected package durations
- `totalPrice` → Recalculated via useEffect
- `step` → 4 (on "Next" click)

### 2.6 Step 4: Date & Time Selection

**Date Picker Configuration**:
```javascript
<DatePicker
  selected={selectedDate}
  onChange={handleDateChange}
  minDate={new Date()} // Cannot book past dates
  maxDate={addDays(new Date(), 90)} // 90-day booking window
  filterDate={isDateAvailable} // Custom filter function
  inline
  calendarClassName="booking-calendar"
/>
```

**Date Availability Filter**:
```javascript
const isDateAvailable = (date) => {
  const day = date.getDay();
  // 0 = Sunday, 6 = Saturday
  return day !== 0 && day !== 6; // Weekdays only (Mon-Fri)
};
```

**Time Slot Generation** (triggered on date selection):

```javascript
const handleDateChange = async (date) => {
  setSelectedDate(date);
  setSelectedTime(''); // Reset time selection
  
  // Fetch existing bookings for this date
  const { data: existingBookings } = await supabase
    .from('bookings')
    .select('start_time, end_time')
    .eq('booking_date', format(date, 'yyyy-MM-dd'))
    .neq('status', 'cancelled');
  
  const slots = generateAvailableSlots(date, existingBookings);
  setAvailableSlots(slots);
};
```

**Slot Generation Algorithm**:

```javascript
const generateAvailableSlots = (date, existingBookings) => {
  const slots = [];
  const businessHours = { start: 15, end: 18 }; // 3 PM - 6 PM
  
  // Generate 30-minute intervals
  for (let hour = businessHours.start; hour < businessHours.end; hour++) {
    for (let minute of [0, 30]) {
      const slotStart = new Date(date);
      slotStart.setHours(hour, minute, 0, 0);
      
      // Calculate slot end time based on total duration
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + totalDuration);
      
      // Check if slot end exceeds business hours
      const endHour = slotEnd.getHours();
      const endMinute = slotEnd.getMinutes();
      const endTime = endHour + endMinute / 60;
      
      if (endTime > businessHours.end) continue; // Slot too late
      
      // Check for conflicts with existing bookings
      const hasConflict = existingBookings.some(booking => {
        const bookingStart = parseTime(booking.start_time);
        const bookingEnd = parseTime(booking.end_time);
        
        // Conflict if:
        // 1. New slot starts during existing booking
        // 2. New slot ends during existing booking
        // 3. New slot completely contains existing booking
        return (
          (slotStart >= bookingStart && slotStart < bookingEnd) ||
          (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
          (slotStart <= bookingStart && slotEnd >= bookingEnd)
        );
      });
      
      if (!hasConflict) {
        slots.push({
          time: format(slotStart, 'HH:mm'),
          display: format(slotStart, 'h:mm a')
        });
      }
    }
  }
  
  return slots;
};

const parseTime = (timeString) => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};
```

**Conflict Detection Logic Explained**:

Given:
- Existing booking: 3:00 PM - 4:30 PM
- New booking duration: 60 minutes

Scenarios:
1. **Slot 3:30 PM**: Would end at 4:30 PM → **CONFLICT** (overlaps existing)
2. **Slot 4:30 PM**: Would end at 5:30 PM → **AVAILABLE** (starts after existing ends)
3. **Slot 2:30 PM**: Would end at 3:30 PM → **CONFLICT** (ends during existing)

**Time Selection Handler**:
```javascript
const handleTimeSelect = (time) => {
  setSelectedTime(time);
  setStep(5); // Auto-advance
};
```

**State Changes**:
- `selectedDate` → Date object
- `selectedTime` → 'HH:MM' string
- `availableSlots` → Array of available time objects
- `step` → 5

### 2.7 Step 5: Customer Information

**Form Fields**:
```javascript
<input 
  type="text" 
  value={customerInfo.name}
  onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
  required 
/>
<input 
  type="tel" 
  value={customerInfo.phone}
  pattern="[0-9]{10}" // Validates 10-digit US phone
  required 
/>
<input 
  type="email" 
  value={customerInfo.email}
  required 
/>
{serviceType === 'mobile' && (
  <input 
    type="text" 
    value={customerInfo.address}
    required 
  />
)}
<textarea 
  value={customerInfo.notes}
  placeholder="Any special requests?" 
/>
{serviceType === 'mobile' && (
  <label>
    <input 
      type="checkbox" 
      checked={customerInfo.hasWaterElectric}
      onChange={(e) => setCustomerInfo({...customerInfo, hasWaterElectric: e.target.checked})}
    />
    I have water and electricity available
  </label>
)}
```

**Validation Logic**:
```javascript
const validateForm = () => {
  const newErrors = {};
  
  if (!customerInfo.name.trim()) {
    newErrors.name = 'Name is required';
  }
  
  if (!customerInfo.phone.trim()) {
    newErrors.phone = 'Phone number is required';
  } else if (!/^\d{10}$/.test(customerInfo.phone.replace(/\D/g, ''))) {
    newErrors.phone = 'Please enter a valid 10-digit phone number';
  }
  
  if (!customerInfo.email.trim()) {
    newErrors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerInfo.email)) {
    newErrors.email = 'Please enter a valid email address';
  }
  
  if (serviceType === 'mobile' && !customerInfo.address.trim()) {
    newErrors.address = 'Address is required for mobile service';
  }
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

**Submit Handler**:
```javascript
const handleSubmit = async () => {
  if (!validateForm()) {
    return; // Show errors, don't submit
  }
  
  setIsSubmitting(true);
  
  try {
    // Calculate end time
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const startTime = new Date(selectedDate);
    startTime.setHours(hours, minutes, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + totalDuration);
    
    // Prepare payload
    const bookingData = {
      customer_name: customerInfo.name.trim(),
      customer_phone: customerInfo.phone.replace(/\D/g, ''), // Strip formatting
      customer_email: customerInfo.email.trim().toLowerCase(),
      customer_address: serviceType === 'mobile' ? customerInfo.address.trim() : null,
      service_type: serviceType,
      vehicle_size: vehicleSize,
      interior_package_id: interiorPackage?.id || null,
      exterior_package_id: exteriorPackage?.id || null,
      has_water_electric: serviceType === 'mobile' ? customerInfo.hasWaterElectric : false,
      customer_notes: customerInfo.notes.trim() || null,
      booking_date: format(selectedDate, 'yyyy-MM-dd'),
      start_time: format(startTime, 'HH:mm:ss'),
      end_time: format(endTime, 'HH:mm:ss'),
      status: 'pending' // Admin must confirm
    };
    
    // Call Edge Function (NOT direct DB insert)
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-booking`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(bookingData)
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Booking failed');
    }
    
    const result = await response.json();
    
    // Success state
    setShowThankYou(true);
    
    // Reset form after 5 seconds
    setTimeout(() => {
      resetForm();
    }, 5000);
    
  } catch (error) {
    console.error('Booking error:', error);
    setErrors({ submit: error.message || 'Something went wrong. Please try again.' });
  } finally {
    setIsSubmitting(false);
  }
};
```

**Why Edge Function Instead of Direct Insert?**
1. **Business Logic**: Price calculation, duration validation, conflict checking
2. **Customer Auto-Creation**: Automatically creates/updates customer record
3. **Email Notifications**: Sends emails to customer and owner
4. **Calendar Integration**: Creates Google Calendar event (if configured)
5. **Data Integrity**: Server-side validation prevents tampering

---

## 3. EDGE FUNCTION: `create-booking`

**File**: `carwebitebooking/supabase/functions/create-booking/index.ts`

**Runtime**: Deno (TypeScript)

**Authentication**: Public endpoint (uses `anon` key)

### 3.1 Request Handler

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
```


## License: unknown
https://github.com/nick-barth/spokenword/blob/42400614921bde7e6d15058f25bbea4df771e283/supabase/functions/parse/index.ts

```
# Complete Technical Breakdown: Car Wash Booking System

## Project Architecture Overview

This is a **React-based single-page application** integrated with **Supabase** as the backend-as-a-service platform. The system consists of:

1. **Customer-facing booking widget** (public)
2. **Admin dashboard** (authenticated)
3. **Supabase Edge Functions** (serverless backend)
4. **PostgreSQL database** via Supabase
5. **Email notifications** via Resend API

---

## 1. DATABASE SCHEMA & TABLES

### 1.1 `bookings` Table
**Location**: `carwebitebooking/supabase/migrations/20240101000000_initial_schema.sql`

```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_address TEXT,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  total_duration_minutes INTEGER NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('mobile', 'shop')),
  vehicle_size TEXT NOT NULL CHECK (vehicle_size IN ('small', 'medium', 'large')),
  vehicle_size_fee NUMERIC(10,2) DEFAULT 0,
  interior_package_id UUID REFERENCES packages(id),
  exterior_package_id UUID REFERENCES packages(id),
  subtotal NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  has_water_electric BOOLEAN DEFAULT false,
  customer_notes TEXT,
  google_calendar_event_id TEXT,
  ics_file_sent BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  final_amount NUMERIC(10,2),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  line_items JSONB,
  payment_notes TEXT,
  finalized_at TIMESTAMPTZ
);
```

**Key Design Decisions**:
- `id` is UUID for security (non-sequential, unpredictable)
- `customer_phone` not unique (allows repeat customers)
- `service_type` enum constraint enforces valid values
- `vehicle_size_fee` stored separately for price transparency
- Foreign keys to `packages` table with `ON DELETE SET NULL` (if package deleted, booking retains price but loses reference)
- `status` and `payment_status` separate fields for business logic flexibility
- `line_items` as JSONB for flexible pricing breakdown
- `finalized_at` timestamp tracks when admin confirmed final pricing

### 1.2 `packages` Table
**Location**: Same migration file

```sql
CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  package_type TEXT NOT NULL CHECK (package_type IN ('interior', 'exterior')),
  price NUMERIC(10,2) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  description TEXT,
  features TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Initial Data**:
- 3 interior packages: Standard ($20, 30min), Deluxe ($40, 45min), Ultimate ($60, 60min)
- 3 exterior packages: Standard ($20, 30min), Deluxe ($35, 45min), Ultimate ($50, 60min)

### 1.3 `customers` Table
**Location**: `carwebitebooking/supabase/migrations/20240103000000_add_customers_table.sql`

```sql
CREATE TABLE customers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT,
  address TEXT,
  notes TEXT,
  total_bookings INTEGER DEFAULT 0,
  total_spent NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Design Decisions**:
- `phone` is UNIQUE constraint (one customer record per phone number)
- `BIGSERIAL` primary key (auto-incrementing integer)
- `total_bookings` and `total_spent` are **denormalized aggregates** for performance
- Updated via triggers or application logic after each booking

### 1.4 Row-Level Security (RLS)

**Authentication Context**: 
- Public users: `anon` role (JWT with `role: 'anon'`)
- Admin users: Manual authentication check in frontend (no actual auth table)

**RLS Policies** (`carwebitebooking/supabase/migrations/20240101000001_rls_policies.sql`):

```sql
-- Bookings: Public can insert (create bookings)
CREATE POLICY "Anyone can create bookings"
  ON bookings FOR INSERT
  TO anon
  WITH CHECK (true);

-- Bookings: Public can read their own (via email match)
CREATE POLICY "Anyone can read their bookings"
  ON bookings FOR SELECT
  TO anon
  USING (customer_email = current_setting('request.jwt.claims')::json->>'email');

-- Packages: Public read-only
CREATE POLICY "Anyone can view active packages"
  ON packages FOR SELECT
  TO anon
  USING (is_active = true);

-- Customers: Authenticated only
CREATE POLICY "Authenticated users can manage customers"
  ON customers FOR ALL
  TO authenticated
  USING (true);
```

**Security Analysis**:
- ❌ **VULNERABILITY**: Admin dashboard bypasses RLS by using `service_role` key client-side
- ⚠️ **RISK**: Service role key exposed in frontend env (`VITE_SUPABASE_SERVICE_KEY`)
- ✅ **MITIGATION**: Should use server-side Edge Functions for admin operations
- ✅ **Booking creation**: Properly uses `anon` key, no escalation possible

---

## 2. BOOKING WIDGET - COMPLETE TECHNICAL BREAKDOWN

### 2.1 Component Structure

**File**: `carwebitebooking/frontend/src/components/BookingWidget.jsx`

**Framework**: React 18 with Hooks
**Dependencies**:
- `react-datepicker` v4.x (calendar UI)
- `lucide-react` (icons)
- `@supabase/supabase-js` v2.x (database client)
- `date-fns` (date manipulation)

**State Management** (all local via `useState`):

```javascript
const [step, setStep] = useState(1);                    // Current form step (1-5)
const [serviceType, setServiceType] = useState('');     // 'mobile' | 'shop'
const [vehicleSize, setVehicleSize] = useState('');     // 'small' | 'medium' | 'large'
const [selectedDate, setSelectedDate] = useState(null); // Date object
const [selectedTime, setSelectedTime] = useState('');   // 'HH:MM' string
const [interiorPackage, setInteriorPackage] = useState(null); // Package object
const [exteriorPackage, setExteriorPackage] = useState(null); // Package object
const [packages, setPackages] = useState([]);           // Fetched from DB
const [availableSlots, setAvailableSlots] = useState([]); // Calculated time slots
const [customerInfo, setCustomerInfo] = useState({      // Form data
  name: '', phone: '', email: '', address: '', notes: '', hasWaterElectric: false
});
const [isSubmitting, setIsSubmitting] = useState(false);
const [errors, setErrors] = useState({});               // Validation errors
const [showThankYou, setShowThankYou] = useState(false);
const [totalPrice, setTotalPrice] = useState(0);        // Calculated price
const [totalDuration, setTotalDuration] = useState(0);  // Calculated minutes
```

### 2.2 Data Fetching on Mount

**Execution Flow**:

```javascript
useEffect(() => {
  const fetchPackages = async () => {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });
    
    if (!error) setPackages(data);
  };
  fetchPackages();
}, []);
```

**Query Details**:
- **Table**: `packages`
- **Filter**: `is_active = true`
- **Order**: By `price` ASC (cheapest first)
- **Auth**: Uses `anon` key (public read)
- **RLS**: Passes "view active packages" policy

### 2.3 Step 1: Service Type Selection

**UI**: Two large buttons (Mobile / Shop Location)

**Event Handler**:
```javascript
const handleServiceTypeSelect = (type) => {
  setServiceType(type);
  setStep(2); // Auto-advance
};
```

**Validation**: None (both options always valid)

**State Change**: 
- `serviceType` → 'mobile' or 'shop'
- `step` → 2

**Conditional Logic**: If `serviceType === 'mobile'`, Step 4 requires `address` field

### 2.4 Step 2: Vehicle Size Selection

**UI**: Three buttons (Small / Medium / Large)

**Pricing Logic** (hardcoded in frontend):
```javascript
const vehicleSizeFees = {
  small: 0,
  medium: 5,
  large: 10
};
```

**Event Handler**:
```javascript
const handleVehicleSizeSelect = (size) => {
  setVehicleSize(size);
  setStep(3);
};
```

**Price Calculation Trigger**: 
```javascript
useEffect(() => {
  const interiorPrice = interiorPackage?.price || 0;
  const exteriorPrice = exteriorPackage?.price || 0;
  const sizeFee = vehicleSizeFees[vehicleSize] || 0;
  const total = interiorPrice + exteriorPrice + sizeFee;
  
  setTotalPrice(total);
}, [interiorPackage, exteriorPackage, vehicleSize]);
```

**State Change**:
- `vehicleSize` → 'small' | 'medium' | 'large'
- `step` → 3

### 2.5 Step 3: Package Selection

**UI Structure**:
- Two sections: Exterior Detailing (top), Interior Detailing (bottom)
- Each shows 3 packages filtered by `package_type`
- "Skip Interior" / "Skip Exterior" buttons for non-combo bookings

**Package Filtering**:
```javascript
const exteriorPackages = packages.filter(pkg => pkg.package_type === 'exterior');
const interiorPackages = packages.filter(pkg => pkg.package_type === 'interior');
```

**Duration Calculation**:
```javascript
useEffect(() => {
  const interiorDuration = interiorPackage?.duration_minutes || 0;
  const exteriorDuration = exteriorPackage?.duration_minutes || 0;
  // Durations ADD (not overlap)
  setTotalDuration(interiorDuration + exteriorDuration);
}, [interiorPackage, exteriorPackage]);
```

**Selection Logic**:
```javascript
const handlePackageSelect = (pkg, type) => {
  if (type === 'interior') {
    setInteriorPackage(interiorPackage?.id === pkg.id ? null : pkg); // Toggle
  } else {
    setExteriorPackage(exteriorPackage?.id === pkg.id ? null : pkg);
  }
};
```

**Validation**:
```javascript
const canProceed = interiorPackage || exteriorPackage; // At least one required
```

**State Change**:
- `interiorPackage` → Package object or null
- `exteriorPackage` → Package object or null
- `totalDuration` → Sum of selected package durations
- `totalPrice` → Recalculated via useEffect
- `step` → 4 (on "Next" click)

### 2.6 Step 4: Date & Time Selection

**Date Picker Configuration**:
```javascript
<DatePicker
  selected={selectedDate}
  onChange={handleDateChange}
  minDate={new Date()} // Cannot book past dates
  maxDate={addDays(new Date(), 90)} // 90-day booking window
  filterDate={isDateAvailable} // Custom filter function
  inline
  calendarClassName="booking-calendar"
/>
```

**Date Availability Filter**:
```javascript
const isDateAvailable = (date) => {
  const day = date.getDay();
  // 0 = Sunday, 6 = Saturday
  return day !== 0 && day !== 6; // Weekdays only (Mon-Fri)
};
```

**Time Slot Generation** (triggered on date selection):

```javascript
const handleDateChange = async (date) => {
  setSelectedDate(date);
  setSelectedTime(''); // Reset time selection
  
  // Fetch existing bookings for this date
  const { data: existingBookings } = await supabase
    .from('bookings')
    .select('start_time, end_time')
    .eq('booking_date', format(date, 'yyyy-MM-dd'))
    .neq('status', 'cancelled');
  
  const slots = generateAvailableSlots(date, existingBookings);
  setAvailableSlots(slots);
};
```

**Slot Generation Algorithm**:

```javascript
const generateAvailableSlots = (date, existingBookings) => {
  const slots = [];
  const businessHours = { start: 15, end: 18 }; // 3 PM - 6 PM
  
  // Generate 30-minute intervals
  for (let hour = businessHours.start; hour < businessHours.end; hour++) {
    for (let minute of [0, 30]) {
      const slotStart = new Date(date);
      slotStart.setHours(hour, minute, 0, 0);
      
      // Calculate slot end time based on total duration
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + totalDuration);
      
      // Check if slot end exceeds business hours
      const endHour = slotEnd.getHours();
      const endMinute = slotEnd.getMinutes();
      const endTime = endHour + endMinute / 60;
      
      if (endTime > businessHours.end) continue; // Slot too late
      
      // Check for conflicts with existing bookings
      const hasConflict = existingBookings.some(booking => {
        const bookingStart = parseTime(booking.start_time);
        const bookingEnd = parseTime(booking.end_time);
        
        // Conflict if:
        // 1. New slot starts during existing booking
        // 2. New slot ends during existing booking
        // 3. New slot completely contains existing booking
        return (
          (slotStart >= bookingStart && slotStart < bookingEnd) ||
          (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
          (slotStart <= bookingStart && slotEnd >= bookingEnd)
        );
      });
      
      if (!hasConflict) {
        slots.push({
          time: format(slotStart, 'HH:mm'),
          display: format(slotStart, 'h:mm a')
        });
      }
    }
  }
  
  return slots;
};

const parseTime = (timeString) => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};
```

**Conflict Detection Logic Explained**:

Given:
- Existing booking: 3:00 PM - 4:30 PM
- New booking duration: 60 minutes

Scenarios:
1. **Slot 3:30 PM**: Would end at 4:30 PM → **CONFLICT** (overlaps existing)
2. **Slot 4:30 PM**: Would end at 5:30 PM → **AVAILABLE** (starts after existing ends)
3. **Slot 2:30 PM**: Would end at 3:30 PM → **CONFLICT** (ends during existing)

**Time Selection Handler**:
```javascript
const handleTimeSelect = (time) => {
  setSelectedTime(time);
  setStep(5); // Auto-advance
};
```

**State Changes**:
- `selectedDate` → Date object
- `selectedTime` → 'HH:MM' string
- `availableSlots` → Array of available time objects
- `step` → 5

### 2.7 Step 5: Customer Information

**Form Fields**:
```javascript
<input 
  type="text" 
  value={customerInfo.name}
  onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
  required 
/>
<input 
  type="tel" 
  value={customerInfo.phone}
  pattern="[0-9]{10}" // Validates 10-digit US phone
  required 
/>
<input 
  type="email" 
  value={customerInfo.email}
  required 
/>
{serviceType === 'mobile' && (
  <input 
    type="text" 
    value={customerInfo.address}
    required 
  />
)}
<textarea 
  value={customerInfo.notes}
  placeholder="Any special requests?" 
/>
{serviceType === 'mobile' && (
  <label>
    <input 
      type="checkbox" 
      checked={customerInfo.hasWaterElectric}
      onChange={(e) => setCustomerInfo({...customerInfo, hasWaterElectric: e.target.checked})}
    />
    I have water and electricity available
  </label>
)}
```

**Validation Logic**:
```javascript
const validateForm = () => {
  const newErrors = {};
  
  if (!customerInfo.name.trim()) {
    newErrors.name = 'Name is required';
  }
  
  if (!customerInfo.phone.trim()) {
    newErrors.phone = 'Phone number is required';
  } else if (!/^\d{10}$/.test(customerInfo.phone.replace(/\D/g, ''))) {
    newErrors.phone = 'Please enter a valid 10-digit phone number';
  }
  
  if (!customerInfo.email.trim()) {
    newErrors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerInfo.email)) {
    newErrors.email = 'Please enter a valid email address';
  }
  
  if (serviceType === 'mobile' && !customerInfo.address.trim()) {
    newErrors.address = 'Address is required for mobile service';
  }
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

**Submit Handler**:
```javascript
const handleSubmit = async () => {
  if (!validateForm()) {
    return; // Show errors, don't submit
  }
  
  setIsSubmitting(true);
  
  try {
    // Calculate end time
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const startTime = new Date(selectedDate);
    startTime.setHours(hours, minutes, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + totalDuration);
    
    // Prepare payload
    const bookingData = {
      customer_name: customerInfo.name.trim(),
      customer_phone: customerInfo.phone.replace(/\D/g, ''), // Strip formatting
      customer_email: customerInfo.email.trim().toLowerCase(),
      customer_address: serviceType === 'mobile' ? customerInfo.address.trim() : null,
      service_type: serviceType,
      vehicle_size: vehicleSize,
      interior_package_id: interiorPackage?.id || null,
      exterior_package_id: exteriorPackage?.id || null,
      has_water_electric: serviceType === 'mobile' ? customerInfo.hasWaterElectric : false,
      customer_notes: customerInfo.notes.trim() || null,
      booking_date: format(selectedDate, 'yyyy-MM-dd'),
      start_time: format(startTime, 'HH:mm:ss'),
      end_time: format(endTime, 'HH:mm:ss'),
      status: 'pending' // Admin must confirm
    };
    
    // Call Edge Function (NOT direct DB insert)
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-booking`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(bookingData)
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Booking failed');
    }
    
    const result = await response.json();
    
    // Success state
    setShowThankYou(true);
    
    // Reset form after 5 seconds
    setTimeout(() => {
      resetForm();
    }, 5000);
    
  } catch (error) {
    console.error('Booking error:', error);
    setErrors({ submit: error.message || 'Something went wrong. Please try again.' });
  } finally {
    setIsSubmitting(false);
  }
};
```

**Why Edge Function Instead of Direct Insert?**
1. **Business Logic**: Price calculation, duration validation, conflict checking
2. **Customer Auto-Creation**: Automatically creates/updates customer record
3. **Email Notifications**: Sends emails to customer and owner
4. **Calendar Integration**: Creates Google Calendar event (if configured)
5. **Data Integrity**: Server-side validation prevents tampering

---

## 3. EDGE FUNCTION: `create-booking`

**File**: `carwebitebooking/supabase/functions/create-booking/index.ts`

**Runtime**: Deno (TypeScript)

**Authentication**: Public endpoint (uses `anon` key)

### 3.1 Request Handler

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
```


## License: unknown
https://github.com/nick-barth/spokenword/blob/42400614921bde7e6d15058f25bbea4df771e283/supabase/functions/parse/index.ts

```
# Complete Technical Breakdown: Car Wash Booking System

## Project Architecture Overview

This is a **React-based single-page application** integrated with **Supabase** as the backend-as-a-service platform. The system consists of:

1. **Customer-facing booking widget** (public)
2. **Admin dashboard** (authenticated)
3. **Supabase Edge Functions** (serverless backend)
4. **PostgreSQL database** via Supabase
5. **Email notifications** via Resend API

---

## 1. DATABASE SCHEMA & TABLES

### 1.1 `bookings` Table
**Location**: `carwebitebooking/supabase/migrations/20240101000000_initial_schema.sql`

```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_address TEXT,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  total_duration_minutes INTEGER NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('mobile', 'shop')),
  vehicle_size TEXT NOT NULL CHECK (vehicle_size IN ('small', 'medium', 'large')),
  vehicle_size_fee NUMERIC(10,2) DEFAULT 0,
  interior_package_id UUID REFERENCES packages(id),
  exterior_package_id UUID REFERENCES packages(id),
  subtotal NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  has_water_electric BOOLEAN DEFAULT false,
  customer_notes TEXT,
  google_calendar_event_id TEXT,
  ics_file_sent BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  final_amount NUMERIC(10,2),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  line_items JSONB,
  payment_notes TEXT,
  finalized_at TIMESTAMPTZ
);
```

**Key Design Decisions**:
- `id` is UUID for security (non-sequential, unpredictable)
- `customer_phone` not unique (allows repeat customers)
- `service_type` enum constraint enforces valid values
- `vehicle_size_fee` stored separately for price transparency
- Foreign keys to `packages` table with `ON DELETE SET NULL` (if package deleted, booking retains price but loses reference)
- `status` and `payment_status` separate fields for business logic flexibility
- `line_items` as JSONB for flexible pricing breakdown
- `finalized_at` timestamp tracks when admin confirmed final pricing

### 1.2 `packages` Table
**Location**: Same migration file

```sql
CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  package_type TEXT NOT NULL CHECK (package_type IN ('interior', 'exterior')),
  price NUMERIC(10,2) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  description TEXT,
  features TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Initial Data**:
- 3 interior packages: Standard ($20, 30min), Deluxe ($40, 45min), Ultimate ($60, 60min)
- 3 exterior packages: Standard ($20, 30min), Deluxe ($35, 45min), Ultimate ($50, 60min)

### 1.3 `customers` Table
**Location**: `carwebitebooking/supabase/migrations/20240103000000_add_customers_table.sql`

```sql
CREATE TABLE customers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT,
  address TEXT,
  notes TEXT,
  total_bookings INTEGER DEFAULT 0,
  total_spent NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Design Decisions**:
- `phone` is UNIQUE constraint (one customer record per phone number)
- `BIGSERIAL` primary key (auto-incrementing integer)
- `total_bookings` and `total_spent` are **denormalized aggregates** for performance
- Updated via triggers or application logic after each booking

### 1.4 Row-Level Security (RLS)

**Authentication Context**: 
- Public users: `anon` role (JWT with `role: 'anon'`)
- Admin users: Manual authentication check in frontend (no actual auth table)

**RLS Policies** (`carwebitebooking/supabase/migrations/20240101000001_rls_policies.sql`):

```sql
-- Bookings: Public can insert (create bookings)
CREATE POLICY "Anyone can create bookings"
  ON bookings FOR INSERT
  TO anon
  WITH CHECK (true);

-- Bookings: Public can read their own (via email match)
CREATE POLICY "Anyone can read their bookings"
  ON bookings FOR SELECT
  TO anon
  USING (customer_email = current_setting('request.jwt.claims')::json->>'email');

-- Packages: Public read-only
CREATE POLICY "Anyone can view active packages"
  ON packages FOR SELECT
  TO anon
  USING (is_active = true);

-- Customers: Authenticated only
CREATE POLICY "Authenticated users can manage customers"
  ON customers FOR ALL
  TO authenticated
  USING (true);
```

**Security Analysis**:
- ❌ **VULNERABILITY**: Admin dashboard bypasses RLS by using `service_role` key client-side
- ⚠️ **RISK**: Service role key exposed in frontend env (`VITE_SUPABASE_SERVICE_KEY`)
- ✅ **MITIGATION**: Should use server-side Edge Functions for admin operations
- ✅ **Booking creation**: Properly uses `anon` key, no escalation possible

---

## 2. BOOKING WIDGET - COMPLETE TECHNICAL BREAKDOWN

### 2.1 Component Structure

**File**: `carwebitebooking/frontend/src/components/BookingWidget.jsx`

**Framework**: React 18 with Hooks
**Dependencies**:
- `react-datepicker` v4.x (calendar UI)
- `lucide-react` (icons)
- `@supabase/supabase-js` v2.x (database client)
- `date-fns` (date manipulation)

**State Management** (all local via `useState`):

```javascript
const [step, setStep] = useState(1);                    // Current form step (1-5)
const [serviceType, setServiceType] = useState('');     // 'mobile' | 'shop'
const [vehicleSize, setVehicleSize] = useState('');     // 'small' | 'medium' | 'large'
const [selectedDate, setSelectedDate] = useState(null); // Date object
const [selectedTime, setSelectedTime] = useState('');   // 'HH:MM' string
const [interiorPackage, setInteriorPackage] = useState(null); // Package object
const [exteriorPackage, setExteriorPackage] = useState(null); // Package object
const [packages, setPackages] = useState([]);           // Fetched from DB
const [availableSlots, setAvailableSlots] = useState([]); // Calculated time slots
const [customerInfo, setCustomerInfo] = useState({      // Form data
  name: '', phone: '', email: '', address: '', notes: '', hasWaterElectric: false
});
const [isSubmitting, setIsSubmitting] = useState(false);
const [errors, setErrors] = useState({});               // Validation errors
const [showThankYou, setShowThankYou] = useState(false);
const [totalPrice, setTotalPrice] = useState(0);        // Calculated price
const [totalDuration, setTotalDuration] = useState(0);  // Calculated minutes
```

### 2.2 Data Fetching on Mount

**Execution Flow**:

```javascript
useEffect(() => {
  const fetchPackages = async () => {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });
    
    if (!error) setPackages(data);
  };
  fetchPackages();
}, []);
```

**Query Details**:
- **Table**: `packages`
- **Filter**: `is_active = true`
- **Order**: By `price` ASC (cheapest first)
- **Auth**: Uses `anon` key (public read)
- **RLS**: Passes "view active packages" policy

### 2.3 Step 1: Service Type Selection

**UI**: Two large buttons (Mobile / Shop Location)

**Event Handler**:
```javascript
const handleServiceTypeSelect = (type) => {
  setServiceType(type);
  setStep(2); // Auto-advance
};
```

**Validation**: None (both options always valid)

**State Change**: 
- `serviceType` → 'mobile' or 'shop'
- `step` → 2

**Conditional Logic**: If `serviceType === 'mobile'`, Step 4 requires `address` field

### 2.4 Step 2: Vehicle Size Selection

**UI**: Three buttons (Small / Medium / Large)

**Pricing Logic** (hardcoded in frontend):
```javascript
const vehicleSizeFees = {
  small: 0,
  medium: 5,
  large: 10
};
```

**Event Handler**:
```javascript
const handleVehicleSizeSelect = (size) => {
  setVehicleSize(size);
  setStep(3);
};
```

**Price Calculation Trigger**: 
```javascript
useEffect(() => {
  const interiorPrice = interiorPackage?.price || 0;
  const exteriorPrice = exteriorPackage?.price || 0;
  const sizeFee = vehicleSizeFees[vehicleSize] || 0;
  const total = interiorPrice + exteriorPrice + sizeFee;
  
  setTotalPrice(total);
}, [interiorPackage, exteriorPackage, vehicleSize]);
```

**State Change**:
- `vehicleSize` → 'small' | 'medium' | 'large'
- `step` → 3

### 2.5 Step 3: Package Selection

**UI Structure**:
- Two sections: Exterior Detailing (top), Interior Detailing (bottom)
- Each shows 3 packages filtered by `package_type`
- "Skip Interior" / "Skip Exterior" buttons for non-combo bookings

**Package Filtering**:
```javascript
const exteriorPackages = packages.filter(pkg => pkg.package_type === 'exterior');
const interiorPackages = packages.filter(pkg => pkg.package_type === 'interior');
```

**Duration Calculation**:
```javascript
useEffect(() => {
  const interiorDuration = interiorPackage?.duration_minutes || 0;
  const exteriorDuration = exteriorPackage?.duration_minutes || 0;
  // Durations ADD (not overlap)
  setTotalDuration(interiorDuration + exteriorDuration);
}, [interiorPackage, exteriorPackage]);
```

**Selection Logic**:
```javascript
const handlePackageSelect = (pkg, type) => {
  if (type === 'interior') {
    setInteriorPackage(interiorPackage?.id === pkg.id ? null : pkg); // Toggle
  } else {
    setExteriorPackage(exteriorPackage?.id === pkg.id ? null : pkg);
  }
};
```

**Validation**:
```javascript
const canProceed = interiorPackage || exteriorPackage; // At least one required
```

**State Change**:
- `interiorPackage` → Package object or null
- `exteriorPackage` → Package object or null
- `totalDuration` → Sum of selected package durations
- `totalPrice` → Recalculated via useEffect
- `step` → 4 (on "Next" click)

### 2.6 Step 4: Date & Time Selection

**Date Picker Configuration**:
```javascript
<DatePicker
  selected={selectedDate}
  onChange={handleDateChange}
  minDate={new Date()} // Cannot book past dates
  maxDate={addDays(new Date(), 90)} // 90-day booking window
  filterDate={isDateAvailable} // Custom filter function
  inline
  calendarClassName="booking-calendar"
/>
```

**Date Availability Filter**:
```javascript
const isDateAvailable = (date) => {
  const day = date.getDay();
  // 0 = Sunday, 6 = Saturday
  return day !== 0 && day !== 6; // Weekdays only (Mon-Fri)
};
```

**Time Slot Generation** (triggered on date selection):

```javascript
const handleDateChange = async (date) => {
  setSelectedDate(date);
  setSelectedTime(''); // Reset time selection
  
  // Fetch existing bookings for this date
  const { data: existingBookings } = await supabase
    .from('bookings')
    .select('start_time, end_time')
    .eq('booking_date', format(date, 'yyyy-MM-dd'))
    .neq('status', 'cancelled');
  
  const slots = generateAvailableSlots(date, existingBookings);
  setAvailableSlots(slots);
};
```

**Slot Generation Algorithm**:

```javascript
const generateAvailableSlots = (date, existingBookings) => {
  const slots = [];
  const businessHours = { start: 15, end: 18 }; // 3 PM - 6 PM
  
  // Generate 30-minute intervals
  for (let hour = businessHours.start; hour < businessHours.end; hour++) {
    for (let minute of [0, 30]) {
      const slotStart = new Date(date);
      slotStart.setHours(hour, minute, 0, 0);
      
      // Calculate slot end time based on total duration
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + totalDuration);
      
      // Check if slot end exceeds business hours
      const endHour = slotEnd.getHours();
      const endMinute = slotEnd.getMinutes();
      const endTime = endHour + endMinute / 60;
      
      if (endTime > businessHours.end) continue; // Slot too late
      
      // Check for conflicts with existing bookings
      const hasConflict = existingBookings.some(booking => {
        const bookingStart = parseTime(booking.start_time);
        const bookingEnd = parseTime(booking.end_time);
        
        // Conflict if:
        // 1. New slot starts during existing booking
        // 2. New slot ends during existing booking
        // 3. New slot completely contains existing booking
        return (
          (slotStart >= bookingStart && slotStart < bookingEnd) ||
          (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
          (slotStart <= bookingStart && slotEnd >= bookingEnd)
        );
      });
      
      if (!hasConflict) {
        slots.push({
          time: format(slotStart, 'HH:mm'),
          display: format(slotStart, 'h:mm a')
        });
      }
    }
  }
  
  return slots;
};

const parseTime = (timeString) => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};
```

**Conflict Detection Logic Explained**:

Given:
- Existing booking: 3:00 PM - 4:30 PM
- New booking duration: 60 minutes

Scenarios:
1. **Slot 3:30 PM**: Would end at 4:30 PM → **CONFLICT** (overlaps existing)
2. **Slot 4:30 PM**: Would end at 5:30 PM → **AVAILABLE** (starts after existing ends)
3. **Slot 2:30 PM**: Would end at 3:30 PM → **CONFLICT** (ends during existing)

**Time Selection Handler**:
```javascript
const handleTimeSelect = (time) => {
  setSelectedTime(time);
  setStep(5); // Auto-advance
};
```

**State Changes**:
- `selectedDate` → Date object
- `selectedTime` → 'HH:MM' string
- `availableSlots` → Array of available time objects
- `step` → 5

### 2.7 Step 5: Customer Information

**Form Fields**:
```javascript
<input 
  type="text" 
  value={customerInfo.name}
  onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
  required 
/>
<input 
  type="tel" 
  value={customerInfo.phone}
  pattern="[0-9]{10}" // Validates 10-digit US phone
  required 
/>
<input 
  type="email" 
  value={customerInfo.email}
  required 
/>
{serviceType === 'mobile' && (
  <input 
    type="text" 
    value={customerInfo.address}
    required 
  />
)}
<textarea 
  value={customerInfo.notes}
  placeholder="Any special requests?" 
/>
{serviceType === 'mobile' && (
  <label>
    <input 
      type="checkbox" 
      checked={customerInfo.hasWaterElectric}
      onChange={(e) => setCustomerInfo({...customerInfo, hasWaterElectric: e.target.checked})}
    />
    I have water and electricity available
  </label>
)}
```

**Validation Logic**:
```javascript
const validateForm = () => {
  const newErrors = {};
  
  if (!customerInfo.name.trim()) {
    newErrors.name = 'Name is required';
  }
  
  if (!customerInfo.phone.trim()) {
    newErrors.phone = 'Phone number is required';
  } else if (!/^\d{10}$/.test(customerInfo.phone.replace(/\D/g, ''))) {
    newErrors.phone = 'Please enter a valid 10-digit phone number';
  }
  
  if (!customerInfo.email.trim()) {
    newErrors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerInfo.email)) {
    newErrors.email = 'Please enter a valid email address';
  }
  
  if (serviceType === 'mobile' && !customerInfo.address.trim()) {
    newErrors.address = 'Address is required for mobile service';
  }
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

**Submit Handler**:
```javascript
const handleSubmit = async () => {
  if (!validateForm()) {
    return; // Show errors, don't submit
  }
  
  setIsSubmitting(true);
  
  try {
    // Calculate end time
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const startTime = new Date(selectedDate);
    startTime.setHours(hours, minutes, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + totalDuration);
    
    // Prepare payload
    const bookingData = {
      customer_name: customerInfo.name.trim(),
      customer_phone: customerInfo.phone.replace(/\D/g, ''), // Strip formatting
      customer_email: customerInfo.email.trim().toLowerCase(),
      customer_address: serviceType === 'mobile' ? customerInfo.address.trim() : null,
      service_type: serviceType,
      vehicle_size: vehicleSize,
      interior_package_id: interiorPackage?.id || null,
      exterior_package_id: exteriorPackage?.id || null,
      has_water_electric: serviceType === 'mobile' ? customerInfo.hasWaterElectric : false,
      customer_notes: customerInfo.notes.trim() || null,
      booking_date: format(selectedDate, 'yyyy-MM-dd'),
      start_time: format(startTime, 'HH:mm:ss'),
      end_time: format(endTime, 'HH:mm:ss'),
      status: 'pending' // Admin must confirm
    };
    
    // Call Edge Function (NOT direct DB insert)
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-booking`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(bookingData)
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Booking failed');
    }
    
    const result = await response.json();
    
    // Success state
    setShowThankYou(true);
    
    // Reset form after 5 seconds
    setTimeout(() => {
      resetForm();
    }, 5000);
    
  } catch (error) {
    console.error('Booking error:', error);
    setErrors({ submit: error.message || 'Something went wrong. Please try again.' });
  } finally {
    setIsSubmitting(false);
  }
};
```

**Why Edge Function Instead of Direct Insert?**
1. **Business Logic**: Price calculation, duration validation, conflict checking
2. **Customer Auto-Creation**: Automatically creates/updates customer record
3. **Email Notifications**: Sends emails to customer and owner
4. **Calendar Integration**: Creates Google Calendar event (if configured)
5. **Data Integrity**: Server-side validation prevents tampering

---

## 3. EDGE FUNCTION: `create-booking`

**File**: `carwebitebooking/supabase/functions/create-booking/index.ts`

**Runtime**: Deno (TypeScript)

**Authentication**: Public endpoint (uses `anon` key)

### 3.1 Request Handler

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
```


## License: unknown
https://github.com/nick-barth/spokenword/blob/42400614921bde7e6d15058f25bbea4df771e283/supabase/functions/parse/index.ts

```
# Complete Technical Breakdown: Car Wash Booking System

## Project Architecture Overview

This is a **React-based single-page application** integrated with **Supabase** as the backend-as-a-service platform. The system consists of:

1. **Customer-facing booking widget** (public)
2. **Admin dashboard** (authenticated)
3. **Supabase Edge Functions** (serverless backend)
4. **PostgreSQL database** via Supabase
5. **Email notifications** via Resend API

---

## 1. DATABASE SCHEMA & TABLES

### 1.1 `bookings` Table
**Location**: `carwebitebooking/supabase/migrations/20240101000000_initial_schema.sql`

```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_address TEXT,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  total_duration_minutes INTEGER NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('mobile', 'shop')),
  vehicle_size TEXT NOT NULL CHECK (vehicle_size IN ('small', 'medium', 'large')),
  vehicle_size_fee NUMERIC(10,2) DEFAULT 0,
  interior_package_id UUID REFERENCES packages(id),
  exterior_package_id UUID REFERENCES packages(id),
  subtotal NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  has_water_electric BOOLEAN DEFAULT false,
  customer_notes TEXT,
  google_calendar_event_id TEXT,
  ics_file_sent BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  final_amount NUMERIC(10,2),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  line_items JSONB,
  payment_notes TEXT,
  finalized_at TIMESTAMPTZ
);
```

**Key Design Decisions**:
- `id` is UUID for security (non-sequential, unpredictable)
- `customer_phone` not unique (allows repeat customers)
- `service_type` enum constraint enforces valid values
- `vehicle_size_fee` stored separately for price transparency
- Foreign keys to `packages` table with `ON DELETE SET NULL` (if package deleted, booking retains price but loses reference)
- `status` and `payment_status` separate fields for business logic flexibility
- `line_items` as JSONB for flexible pricing breakdown
- `finalized_at` timestamp tracks when admin confirmed final pricing

### 1.2 `packages` Table
**Location**: Same migration file

```sql
CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  package_type TEXT NOT NULL CHECK (package_type IN ('interior', 'exterior')),
  price NUMERIC(10,2) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  description TEXT,
  features TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Initial Data**:
- 3 interior packages: Standard ($20, 30min), Deluxe ($40, 45min), Ultimate ($60, 60min)
- 3 exterior packages: Standard ($20, 30min), Deluxe ($35, 45min), Ultimate ($50, 60min)

### 1.3 `customers` Table
**Location**: `carwebitebooking/supabase/migrations/20240103000000_add_customers_table.sql`

```sql
CREATE TABLE customers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT,
  address TEXT,
  notes TEXT,
  total_bookings INTEGER DEFAULT 0,
  total_spent NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Design Decisions**:
- `phone` is UNIQUE constraint (one customer record per phone number)
- `BIGSERIAL` primary key (auto-incrementing integer)
- `total_bookings` and `total_spent` are **denormalized aggregates** for performance
- Updated via triggers or application logic after each booking

### 1.4 Row-Level Security (RLS)

**Authentication Context**: 
- Public users: `anon` role (JWT with `role: 'anon'`)
- Admin users: Manual authentication check in frontend (no actual auth table)

**RLS Policies** (`carwebitebooking/supabase/migrations/20240101000001_rls_policies.sql`):

```sql
-- Bookings: Public can insert (create bookings)
CREATE POLICY "Anyone can create bookings"
  ON bookings FOR INSERT
  TO anon
  WITH CHECK (true);

-- Bookings: Public can read their own (via email match)
CREATE POLICY "Anyone can read their bookings"
  ON bookings FOR SELECT
  TO anon
  USING (customer_email = current_setting('request.jwt.claims')::json->>'email');

-- Packages: Public read-only
CREATE POLICY "Anyone can view active packages"
  ON packages FOR SELECT
  TO anon
  USING (is_active = true);

-- Customers: Authenticated only
CREATE POLICY "Authenticated users can manage customers"
  ON customers FOR ALL
  TO authenticated
  USING (true);
```

**Security Analysis**:
- ❌ **VULNERABILITY**: Admin dashboard bypasses RLS by using `service_role` key client-side
- ⚠️ **RISK**: Service role key exposed in frontend env (`VITE_SUPABASE_SERVICE_KEY`)
- ✅ **MITIGATION**: Should use server-side Edge Functions for admin operations
- ✅ **Booking creation**: Properly uses `anon` key, no escalation possible

---

## 2. BOOKING WIDGET - COMPLETE TECHNICAL BREAKDOWN

### 2.1 Component Structure

**File**: `carwebitebooking/frontend/src/components/BookingWidget.jsx`

**Framework**: React 18 with Hooks
**Dependencies**:
- `react-datepicker` v4.x (calendar UI)
- `lucide-react` (icons)
- `@supabase/supabase-js` v2.x (database client)
- `date-fns` (date manipulation)

**State Management** (all local via `useState`):

```javascript
const [step, setStep] = useState(1);                    // Current form step (1-5)
const [serviceType, setServiceType] = useState('');     // 'mobile' | 'shop'
const [vehicleSize, setVehicleSize] = useState('');     // 'small' | 'medium' | 'large'
const [selectedDate, setSelectedDate] = useState(null); // Date object
const [selectedTime, setSelectedTime] = useState('');   // 'HH:MM' string
const [interiorPackage, setInteriorPackage] = useState(null); // Package object
const [exteriorPackage, setExteriorPackage] = useState(null); // Package object
const [packages, setPackages] = useState([]);           // Fetched from DB
const [availableSlots, setAvailableSlots] = useState([]); // Calculated time slots
const [customerInfo, setCustomerInfo] = useState({      // Form data
  name: '', phone: '', email: '', address: '', notes: '', hasWaterElectric: false
});
const [isSubmitting, setIsSubmitting] = useState(false);
const [errors, setErrors] = useState({});               // Validation errors
const [showThankYou, setShowThankYou] = useState(false);
const [totalPrice, setTotalPrice] = useState(0);        // Calculated price
const [totalDuration, setTotalDuration] = useState(0);  // Calculated minutes
```

### 2.2 Data Fetching on Mount

**Execution Flow**:

```javascript
useEffect(() => {
  const fetchPackages = async () => {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });
    
    if (!error) setPackages(data);
  };
  fetchPackages();
}, []);
```

**Query Details**:
- **Table**: `packages`
- **Filter**: `is_active = true`
- **Order**: By `price` ASC (cheapest first)
- **Auth**: Uses `anon` key (public read)
- **RLS**: Passes "view active packages" policy

### 2.3 Step 1: Service Type Selection

**UI**: Two large buttons (Mobile / Shop Location)

**Event Handler**:
```javascript
const handleServiceTypeSelect = (type) => {
  setServiceType(type);
  setStep(2); // Auto-advance
};
```

**Validation**: None (both options always valid)

**State Change**: 
- `serviceType` → 'mobile' or 'shop'
- `step` → 2

**Conditional Logic**: If `serviceType === 'mobile'`, Step 4 requires `address` field

### 2.4 Step 2: Vehicle Size Selection

**UI**: Three buttons (Small / Medium / Large)

**Pricing Logic** (hardcoded in frontend):
```javascript
const vehicleSizeFees = {
  small: 0,
  medium: 5,
  large: 10
};
```

**Event Handler**:
```javascript
const handleVehicleSizeSelect = (size) => {
  setVehicleSize(size);
  setStep(3);
};
```

**Price Calculation Trigger**: 
```javascript
useEffect(() => {
  const interiorPrice = interiorPackage?.price || 0;
  const exteriorPrice = exteriorPackage?.price || 0;
  const sizeFee = vehicleSizeFees[vehicleSize] || 0;
  const total = interiorPrice + exteriorPrice + sizeFee;
  
  setTotalPrice(total);
}, [interiorPackage, exteriorPackage, vehicleSize]);
```

**State Change**:
- `vehicleSize` → 'small' | 'medium' | 'large'
- `step` → 3

### 2.5 Step 3: Package Selection

**UI Structure**:
- Two sections: Exterior Detailing (top), Interior Detailing (bottom)
- Each shows 3 packages filtered by `package_type`
- "Skip Interior" / "Skip Exterior" buttons for non-combo bookings

**Package Filtering**:
```javascript
const exteriorPackages = packages.filter(pkg => pkg.package_type === 'exterior');
const interiorPackages = packages.filter(pkg => pkg.package_type === 'interior');
```

**Duration Calculation**:
```javascript
useEffect(() => {
  const interiorDuration = interiorPackage?.duration_minutes || 0;
  const exteriorDuration = exteriorPackage?.duration_minutes || 0;
  // Durations ADD (not overlap)
  setTotalDuration(interiorDuration + exteriorDuration);
}, [interiorPackage, exteriorPackage]);
```

**Selection Logic**:
```javascript
const handlePackageSelect = (pkg, type) => {
  if (type === 'interior') {
    setInteriorPackage(interiorPackage?.id === pkg.id ? null : pkg); // Toggle
  } else {
    setExteriorPackage(exteriorPackage?.id === pkg.id ? null : pkg);
  }
};
```

**Validation**:
```javascript
const canProceed = interiorPackage || exteriorPackage; // At least one required
```

**State Change**:
- `interiorPackage` → Package object or null
- `exteriorPackage` → Package object or null
- `totalDuration` → Sum of selected package durations
- `totalPrice` → Recalculated via useEffect
- `step` → 4 (on "Next" click)

### 2.6 Step 4: Date & Time Selection

**Date Picker Configuration**:
```javascript
<DatePicker
  selected={selectedDate}
  onChange={handleDateChange}
  minDate={new Date()} // Cannot book past dates
  maxDate={addDays(new Date(), 90)} // 90-day booking window
  filterDate={isDateAvailable} // Custom filter function
  inline
  calendarClassName="booking-calendar"
/>
```

**Date Availability Filter**:
```javascript
const isDateAvailable = (date) => {
  const day = date.getDay();
  // 0 = Sunday, 6 = Saturday
  return day !== 0 && day !== 6; // Weekdays only (Mon-Fri)
};
```

**Time Slot Generation** (triggered on date selection):

```javascript
const handleDateChange = async (date) => {
  setSelectedDate(date);
  setSelectedTime(''); // Reset time selection
  
  // Fetch existing bookings for this date
  const { data: existingBookings } = await supabase
    .from('bookings')
    .select('start_time, end_time')
    .eq('booking_date', format(date, 'yyyy-MM-dd'))
    .neq('status', 'cancelled');
  
  const slots = generateAvailableSlots(date, existingBookings);
  setAvailableSlots(slots);
};
```

**Slot Generation Algorithm**:

```javascript
const generateAvailableSlots = (date, existingBookings) => {
  const slots = [];
  const businessHours = { start: 15, end: 18 }; // 3 PM - 6 PM
  
  // Generate 30-minute intervals
  for (let hour = businessHours.start; hour < businessHours.end; hour++) {
    for (let minute of [0, 30]) {
      const slotStart = new Date(date);
      slotStart.setHours(hour, minute, 0, 0);
      
      // Calculate slot end time based on total duration
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + totalDuration);
      
      // Check if slot end exceeds business hours
      const endHour = slotEnd.getHours();
      const endMinute = slotEnd.getMinutes();
      const endTime = endHour + endMinute / 60;
      
      if (endTime > businessHours.end) continue; // Slot too late
      
      // Check for conflicts with existing bookings
      const hasConflict = existingBookings.some(booking => {
        const bookingStart = parseTime(booking.start_time);
        const bookingEnd = parseTime(booking.end_time);
        
        // Conflict if:
        // 1. New slot starts during existing booking
        // 2. New slot ends during existing booking
        // 3. New slot completely contains existing booking
        return (
          (slotStart >= bookingStart && slotStart < bookingEnd) ||
          (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
          (slotStart <= bookingStart && slotEnd >= bookingEnd)
        );
      });
      
      if (!hasConflict) {
        slots.push({
          time: format(slotStart, 'HH:mm'),
          display: format(slotStart, 'h:mm a')
        });
      }
    }
  }
  
  return slots;
};

const parseTime = (timeString) => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};
```

**Conflict Detection Logic Explained**:

Given:
- Existing booking: 3:00 PM - 4:30 PM
- New booking duration: 60 minutes

Scenarios:
1. **Slot 3:30 PM**: Would end at 4:30 PM → **CONFLICT** (overlaps existing)
2. **Slot 4:30 PM**: Would end at 5:30 PM → **AVAILABLE** (starts after existing ends)
3. **Slot 2:30 PM**: Would end at 3:30 PM → **CONFLICT** (ends during existing)

**Time Selection Handler**:
```javascript
const handleTimeSelect = (time) => {
  setSelectedTime(time);
  setStep(5); // Auto-advance
};
```

**State Changes**:
- `selectedDate` → Date object
- `selectedTime` → 'HH:MM' string
- `availableSlots` → Array of available time objects
- `step` → 5

### 2.7 Step 5: Customer Information

**Form Fields**:
```javascript
<input 
  type="text" 
  value={customerInfo.name}
  onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
  required 
/>
<input 
  type="tel" 
  value={customerInfo.phone}
  pattern="[0-9]{10}" // Validates 10-digit US phone
  required 
/>
<input 
  type="email" 
  value={customerInfo.email}
  required 
/>
{serviceType === 'mobile' && (
  <input 
    type="text" 
    value={customerInfo.address}
    required 
  />
)}
<textarea 
  value={customerInfo.notes}
  placeholder="Any special requests?" 
/>
{serviceType === 'mobile' && (
  <label>
    <input 
      type="checkbox" 
      checked={customerInfo.hasWaterElectric}
      onChange={(e) => setCustomerInfo({...customerInfo, hasWaterElectric: e.target.checked})}
    />
    I have water and electricity available
  </label>
)}
```

**Validation Logic**:
```javascript
const validateForm = () => {
  const newErrors = {};
  
  if (!customerInfo.name.trim()) {
    newErrors.name = 'Name is required';
  }
  
  if (!customerInfo.phone.trim()) {
    newErrors.phone = 'Phone number is required';
  } else if (!/^\d{10}$/.test(customerInfo.phone.replace(/\D/g, ''))) {
    newErrors.phone = 'Please enter a valid 10-digit phone number';
  }
  
  if (!customerInfo.email.trim()) {
    newErrors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerInfo.email)) {
    newErrors.email = 'Please enter a valid email address';
  }
  
  if (serviceType === 'mobile' && !customerInfo.address.trim()) {
    newErrors.address = 'Address is required for mobile service';
  }
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

**Submit Handler**:
```javascript
const handleSubmit = async () => {
  if (!validateForm()) {
    return; // Show errors, don't submit
  }
  
  setIsSubmitting(true);
  
  try {
    // Calculate end time
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const startTime = new Date(selectedDate);
    startTime.setHours(hours, minutes, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + totalDuration);
    
    // Prepare payload
    const bookingData = {
      customer_name: customerInfo.name.trim(),
      customer_phone: customerInfo.phone.replace(/\D/g, ''), // Strip formatting
      customer_email: customerInfo.email.trim().toLowerCase(),
      customer_address: serviceType === 'mobile' ? customerInfo.address.trim() : null,
      service_type: serviceType,
      vehicle_size: vehicleSize,
      interior_package_id: interiorPackage?.id || null,
      exterior_package_id: exteriorPackage?.id || null,
      has_water_electric: serviceType === 'mobile' ? customerInfo.hasWaterElectric : false,
      customer_notes: customerInfo.notes.trim() || null,
      booking_date: format(selectedDate, 'yyyy-MM-dd'),
      start_time: format(startTime, 'HH:mm:ss'),
      end_time: format(endTime, 'HH:mm:ss'),
      status: 'pending' // Admin must confirm
    };
    
    // Call Edge Function (NOT direct DB insert)
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-booking`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(bookingData)
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Booking failed');
    }
    
    const result = await response.json();
    
    // Success state
    setShowThankYou(true);
    
    // Reset form after 5 seconds
    setTimeout(() => {
      resetForm();
    }, 5000);
    
  } catch (error) {
    console.error('Booking error:', error);
    setErrors({ submit: error.message || 'Something went wrong. Please try again.' });
  } finally {
    setIsSubmitting(false);
  }
};
```

**Why Edge Function Instead of Direct Insert?**
1. **Business Logic**: Price calculation, duration validation, conflict checking
2. **Customer Auto-Creation**: Automatically creates/updates customer record
3. **Email Notifications**: Sends emails to customer and owner
4. **Calendar Integration**: Creates Google Calendar event (if configured)
5. **Data Integrity**: Server-side validation prevents tampering

---

## 3. EDGE FUNCTION: `create-booking`

**File**: `carwebitebooking/supabase/functions/create-booking/index.ts`

**Runtime**: Deno (TypeScript)

**Authentication**: Public endpoint (uses `anon` key)

### 3.1 Request Handler

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
```


## License: unknown
https://github.com/nick-barth/spokenword/blob/42400614921bde7e6d15058f25bbea4df771e283/supabase/functions/parse/index.ts

```
# Complete Technical Breakdown: Car Wash Booking System

## Project Architecture Overview

This is a **React-based single-page application** integrated with **Supabase** as the backend-as-a-service platform. The system consists of:

1. **Customer-facing booking widget** (public)
2. **Admin dashboard** (authenticated)
3. **Supabase Edge Functions** (serverless backend)
4. **PostgreSQL database** via Supabase
5. **Email notifications** via Resend API

---

## 1. DATABASE SCHEMA & TABLES

### 1.1 `bookings` Table
**Location**: `carwebitebooking/supabase/migrations/20240101000000_initial_schema.sql`

```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_address TEXT,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  total_duration_minutes INTEGER NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('mobile', 'shop')),
  vehicle_size TEXT NOT NULL CHECK (vehicle_size IN ('small', 'medium', 'large')),
  vehicle_size_fee NUMERIC(10,2) DEFAULT 0,
  interior_package_id UUID REFERENCES packages(id),
  exterior_package_id UUID REFERENCES packages(id),
  subtotal NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  has_water_electric BOOLEAN DEFAULT false,
  customer_notes TEXT,
  google_calendar_event_id TEXT,
  ics_file_sent BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  final_amount NUMERIC(10,2),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  line_items JSONB,
  payment_notes TEXT,
  finalized_at TIMESTAMPTZ
);
```

**Key Design Decisions**:
- `id` is UUID for security (non-sequential, unpredictable)
- `customer_phone` not unique (allows repeat customers)
- `service_type` enum constraint enforces valid values
- `vehicle_size_fee` stored separately for price transparency
- Foreign keys to `packages` table with `ON DELETE SET NULL` (if package deleted, booking retains price but loses reference)
- `status` and `payment_status` separate fields for business logic flexibility
- `line_items` as JSONB for flexible pricing breakdown
- `finalized_at` timestamp tracks when admin confirmed final pricing

### 1.2 `packages` Table
**Location**: Same migration file

```sql
CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  package_type TEXT NOT NULL CHECK (package_type IN ('interior', 'exterior')),
  price NUMERIC(10,2) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  description TEXT,
  features TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Initial Data**:
- 3 interior packages: Standard ($20, 30min), Deluxe ($40, 45min), Ultimate ($60, 60min)
- 3 exterior packages: Standard ($20, 30min), Deluxe ($35, 45min), Ultimate ($50, 60min)

### 1.3 `customers` Table
**Location**: `carwebitebooking/supabase/migrations/20240103000000_add_customers_table.sql`

```sql
CREATE TABLE customers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT,
  address TEXT,
  notes TEXT,
  total_bookings INTEGER DEFAULT 0,
  total_spent NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Design Decisions**:
- `phone` is UNIQUE constraint (one customer record per phone number)
- `BIGSERIAL` primary key (auto-incrementing integer)
- `total_bookings` and `total_spent` are **denormalized aggregates** for performance
- Updated via triggers or application logic after each booking

### 1.4 Row-Level Security (RLS)

**Authentication Context**: 
- Public users: `anon` role (JWT with `role: 'anon'`)
- Admin users: Manual authentication check in frontend (no actual auth table)

**RLS Policies** (`carwebitebooking/supabase/migrations/20240101000001_rls_policies.sql`):

```sql
-- Bookings: Public can insert (create bookings)
CREATE POLICY "Anyone can create bookings"
  ON bookings FOR INSERT
  TO anon
  WITH CHECK (true);

-- Bookings: Public can read their own (via email match)
CREATE POLICY "Anyone can read their bookings"
  ON bookings FOR SELECT
  TO anon
  USING (customer_email = current_setting('request.jwt.claims')::json->>'email');

-- Packages: Public read-only
CREATE POLICY "Anyone can view active packages"
  ON packages FOR SELECT
  TO anon
  USING (is_active = true);

-- Customers: Authenticated only
CREATE POLICY "Authenticated users can manage customers"
  ON customers FOR ALL
  TO authenticated
  USING (true);
```

**Security Analysis**:
- ❌ **VULNERABILITY**: Admin dashboard bypasses RLS by using `service_role` key client-side
- ⚠️ **RISK**: Service role key exposed in frontend env (`VITE_SUPABASE_SERVICE_KEY`)
- ✅ **MITIGATION**: Should use server-side Edge Functions for admin operations
- ✅ **Booking creation**: Properly uses `anon` key, no escalation possible

---

## 2. BOOKING WIDGET - COMPLETE TECHNICAL BREAKDOWN

### 2.1 Component Structure

**File**: `carwebitebooking/frontend/src/components/BookingWidget.jsx`

**Framework**: React 18 with Hooks
**Dependencies**:
- `react-datepicker` v4.x (calendar UI)
- `lucide-react` (icons)
- `@supabase/supabase-js` v2.x (database client)
- `date-fns` (date manipulation)

**State Management** (all local via `useState`):

```javascript
const [step, setStep] = useState(1);                    // Current form step (1-5)
const [serviceType, setServiceType] = useState('');     // 'mobile' | 'shop'
const [vehicleSize, setVehicleSize] = useState('');     // 'small' | 'medium' | 'large'
const [selectedDate, setSelectedDate] = useState(null); // Date object
const [selectedTime, setSelectedTime] = useState('');   // 'HH:MM' string
const [interiorPackage, setInteriorPackage] = useState(null); // Package object
const [exteriorPackage, setExteriorPackage] = useState(null); // Package object
const [packages, setPackages] = useState([]);           // Fetched from DB
const [availableSlots, setAvailableSlots] = useState([]); // Calculated time slots
const [customerInfo, setCustomerInfo] = useState({      // Form data
  name: '', phone: '', email: '', address: '', notes: '', hasWaterElectric: false
});
const [isSubmitting, setIsSubmitting] = useState(false);
const [errors, setErrors] = useState({});               // Validation errors
const [showThankYou, setShowThankYou] = useState(false);
const [totalPrice, setTotalPrice] = useState(0);        // Calculated price
const [totalDuration, setTotalDuration] = useState(0);  // Calculated minutes
```

### 2.2 Data Fetching on Mount

**Execution Flow**:

```javascript
useEffect(() => {
  const fetchPackages = async () => {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });
    
    if (!error) setPackages(data);
  };
  fetchPackages();
}, []);
```

**Query Details**:
- **Table**: `packages`
- **Filter**: `is_active = true`
- **Order**: By `price` ASC (cheapest first)
- **Auth**: Uses `anon` key (public read)
- **RLS**: Passes "view active packages" policy

### 2.3 Step 1: Service Type Selection

**UI**: Two large buttons (Mobile / Shop Location)

**Event Handler**:
```javascript
const handleServiceTypeSelect = (type) => {
  setServiceType(type);
  setStep(2); // Auto-advance
};
```

**Validation**: None (both options always valid)

**State Change**: 
- `serviceType` → 'mobile' or 'shop'
- `step` → 2

**Conditional Logic**: If `serviceType === 'mobile'`, Step 4 requires `address` field

### 2.4 Step 2: Vehicle Size Selection

**UI**: Three buttons (Small / Medium / Large)

**Pricing Logic** (hardcoded in frontend):
```javascript
const vehicleSizeFees = {
  small: 0,
  medium: 5,
  large: 10
};
```

**Event Handler**:
```javascript
const handleVehicleSizeSelect = (size) => {
  setVehicleSize(size);
  setStep(3);
};
```

**Price Calculation Trigger**: 
```javascript
useEffect(() => {
  const interiorPrice = interiorPackage?.price || 0;
  const exteriorPrice = exteriorPackage?.price || 0;
  const sizeFee = vehicleSizeFees[vehicleSize] || 0;
  const total = interiorPrice + exteriorPrice + sizeFee;
  
  setTotalPrice(total);
}, [interiorPackage, exteriorPackage, vehicleSize]);
```

**State Change**:
- `vehicleSize` → 'small' | 'medium' | 'large'
- `step` → 3

### 2.5 Step 3: Package Selection

**UI Structure**:
- Two sections: Exterior Detailing (top), Interior Detailing (bottom)
- Each shows 3 packages filtered by `package_type`
- "Skip Interior" / "Skip Exterior" buttons for non-combo bookings

**Package Filtering**:
```javascript
const exteriorPackages = packages.filter(pkg => pkg.package_type === 'exterior');
const interiorPackages = packages.filter(pkg => pkg.package_type === 'interior');
```

**Duration Calculation**:
```javascript
useEffect(() => {
  const interiorDuration = interiorPackage?.duration_minutes || 0;
  const exteriorDuration = exteriorPackage?.duration_minutes || 0;
  // Durations ADD (not overlap)
  setTotalDuration(interiorDuration + exteriorDuration);
}, [interiorPackage, exteriorPackage]);
```

**Selection Logic**:
```javascript
const handlePackageSelect = (pkg, type) => {
  if (type === 'interior') {
    setInteriorPackage(interiorPackage?.id === pkg.id ? null : pkg); // Toggle
  } else {
    setExteriorPackage(exteriorPackage?.id === pkg.id ? null : pkg);
  }
};
```

**Validation**:
```javascript
const canProceed = interiorPackage || exteriorPackage; // At least one required
```

**State Change**:
- `interiorPackage` → Package object or null
- `exteriorPackage` → Package object or null
- `totalDuration` → Sum of selected package durations
- `totalPrice` → Recalculated via useEffect
- `step` → 4 (on "Next" click)

### 2.6 Step 4: Date & Time Selection

**Date Picker Configuration**:
```javascript
<DatePicker
  selected={selectedDate}
  onChange={handleDateChange}
  minDate={new Date()} // Cannot book past dates
  maxDate={addDays(new Date(), 90)} // 90-day booking window
  filterDate={isDateAvailable} // Custom filter function
  inline
  calendarClassName="booking-calendar"
/>
```

**Date Availability Filter**:
```javascript
const isDateAvailable = (date) => {
  const day = date.getDay();
  // 0 = Sunday, 6 = Saturday
  return day !== 0 && day !== 6; // Weekdays only (Mon-Fri)
};
```

**Time Slot Generation** (triggered on date selection):

```javascript
const handleDateChange = async (date) => {
  setSelectedDate(date);
  setSelectedTime(''); // Reset time selection
  
  // Fetch existing bookings for this date
  const { data: existingBookings } = await supabase
    .from('bookings')
    .select('start_time, end_time')
    .eq('booking_date', format(date, 'yyyy-MM-dd'))
    .neq('status', 'cancelled');
  
  const slots = generateAvailableSlots(date, existingBookings);
  setAvailableSlots(slots);
};
```

**Slot Generation Algorithm**:

```javascript
const generateAvailableSlots = (date, existingBookings) => {
  const slots = [];
  const businessHours = { start: 15, end: 18 }; // 3 PM - 6 PM
  
  // Generate 30-minute intervals
  for (let hour = businessHours.start; hour < businessHours.end; hour++) {
    for (let minute of [0, 30]) {
      const slotStart = new Date(date);
      slotStart.setHours(hour, minute, 0, 0);
      
      // Calculate slot end time based on total duration
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + totalDuration);
      
      // Check if slot end exceeds business hours
      const endHour = slotEnd.getHours();
      const endMinute = slotEnd.getMinutes();
      const endTime = endHour + endMinute / 60;
      
      if (endTime > businessHours.end) continue; // Slot too late
      
      // Check for conflicts with existing bookings
      const hasConflict = existingBookings.some(booking => {
        const bookingStart = parseTime(booking.start_time);
        const bookingEnd = parseTime(booking.end_time);
        
        // Conflict if:
        // 1. New slot starts during existing booking
        // 2. New slot ends during existing booking
        // 3. New slot completely contains existing booking
        return (
          (slotStart >= bookingStart && slotStart < bookingEnd) ||
          (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
          (slotStart <= bookingStart && slotEnd >= bookingEnd)
        );
      });
      
      if (!hasConflict) {
        slots.push({
          time: format(slotStart, 'HH:mm'),
          display: format(slotStart, 'h:mm a')
        });
      }
    }
  }
  
  return slots;
};

const parseTime = (timeString) => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};
```

**Conflict Detection Logic Explained**:

Given:
- Existing booking: 3:00 PM - 4:30 PM
- New booking duration: 60 minutes

Scenarios:
1. **Slot 3:30 PM**: Would end at 4:30 PM → **CONFLICT** (overlaps existing)
2. **Slot 4:30 PM**: Would end at 5:30 PM → **AVAILABLE** (starts after existing ends)
3. **Slot 2:30 PM**: Would end at 3:30 PM → **CONFLICT** (ends during existing)

**Time Selection Handler**:
```javascript
const handleTimeSelect = (time) => {
  setSelectedTime(time);
  setStep(5); // Auto-advance
};
```

**State Changes**:
- `selectedDate` → Date object
- `selectedTime` → 'HH:MM' string
- `availableSlots` → Array of available time objects
- `step` → 5

### 2.7 Step 5: Customer Information

**Form Fields**:
```javascript
<input 
  type="text" 
  value={customerInfo.name}
  onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
  required 
/>
<input 
  type="tel" 
  value={customerInfo.phone}
  pattern="[0-9]{10}" // Validates 10-digit US phone
  required 
/>
<input 
  type="email" 
  value={customerInfo.email}
  required 
/>
{serviceType === 'mobile' && (
  <input 
    type="text" 
    value={customerInfo.address}
    required 
  />
)}
<textarea 
  value={customerInfo.notes}
  placeholder="Any special requests?" 
/>
{serviceType === 'mobile' && (
  <label>
    <input 
      type="checkbox" 
      checked={customerInfo.hasWaterElectric}
      onChange={(e) => setCustomerInfo({...customerInfo, hasWaterElectric: e.target.checked})}
    />
    I have water and electricity available
  </label>
)}
```

**Validation Logic**:
```javascript
const validateForm = () => {
  const newErrors = {};
  
  if (!customerInfo.name.trim()) {
    newErrors.name = 'Name is required';
  }
  
  if (!customerInfo.phone.trim()) {
    newErrors.phone = 'Phone number is required';
  } else if (!/^\d{10}$/.test(customerInfo.phone.replace(/\D/g, ''))) {
    newErrors.phone = 'Please enter a valid 10-digit phone number';
  }
  
  if (!customerInfo.email.trim()) {
    newErrors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerInfo.email)) {
    newErrors.email = 'Please enter a valid email address';
  }
  
  if (serviceType === 'mobile' && !customerInfo.address.trim()) {
    newErrors.address = 'Address is required for mobile service';
  }
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

**Submit Handler**:
```javascript
const handleSubmit = async () => {
  if (!validateForm()) {
    return; // Show errors, don't submit
  }
  
  setIsSubmitting(true);
  
  try {
    // Calculate end time
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const startTime = new Date(selectedDate);
    startTime.setHours(hours, minutes, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + totalDuration);
    
    // Prepare payload
    const bookingData = {
      customer_name: customerInfo.name.trim(),
      customer_phone: customerInfo.phone.replace(/\D/g, ''), // Strip formatting
      customer_email: customerInfo.email.trim().toLowerCase(),
      customer_address: serviceType === 'mobile' ? customerInfo.address.trim() : null,
      service_type: serviceType,
      vehicle_size: vehicleSize,
      interior_package_id: interiorPackage?.id || null,
      exterior_package_id: exteriorPackage?.id || null,
      has_water_electric: serviceType === 'mobile' ? customerInfo.hasWaterElectric : false,
      customer_notes: customerInfo.notes.trim() || null,
      booking_date: format(selectedDate, 'yyyy-MM-dd'),
      start_time: format(startTime, 'HH:mm:ss'),
      end_time: format(endTime, 'HH:mm:ss'),
      status: 'pending' // Admin must confirm
    };
    
    // Call Edge Function (NOT direct DB insert)
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-booking`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(bookingData)
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Booking failed');
    }
    
    const result = await response.json();
    
    // Success state
    setShowThankYou(true);
    
    // Reset form after 5 seconds
    setTimeout(() => {
      resetForm();
    }, 5000);
    
  } catch (error) {
    console.error('Booking error:', error);
    setErrors({ submit: error.message || 'Something went wrong. Please try again.' });
  } finally {
    setIsSubmitting(false);
  }
};
```

**Why Edge Function Instead of Direct Insert?**
1. **Business Logic**: Price calculation, duration validation, conflict checking
2. **Customer Auto-Creation**: Automatically creates/updates customer record
3. **Email Notifications**: Sends emails to customer and owner
4. **Calendar Integration**: Creates Google Calendar event (if configured)
5. **Data Integrity**: Server-side validation prevents tampering

---

## 3. EDGE FUNCTION: `create-booking`

**File**: `carwebitebooking/supabase/functions/create-booking/index.ts`

**Runtime**: Deno (TypeScript)

**Authentication**: Public endpoint (uses `anon` key)

### 3.1 Request Handler

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
```


## License: unknown
https://github.com/nick-barth/spokenword/blob/42400614921bde7e6d15058f25bbea4df771e283/supabase/functions/parse/index.ts

```
# Complete Technical Breakdown: Car Wash Booking System

## Project Architecture Overview

This is a **React-based single-page application** integrated with **Supabase** as the backend-as-a-service platform. The system consists of:

1. **Customer-facing booking widget** (public)
2. **Admin dashboard** (authenticated)
3. **Supabase Edge Functions** (serverless backend)
4. **PostgreSQL database** via Supabase
5. **Email notifications** via Resend API

---

## 1. DATABASE SCHEMA & TABLES

### 1.1 `bookings` Table
**Location**: `carwebitebooking/supabase/migrations/20240101000000_initial_schema.sql`

```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_address TEXT,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  total_duration_minutes INTEGER NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('mobile', 'shop')),
  vehicle_size TEXT NOT NULL CHECK (vehicle_size IN ('small', 'medium', 'large')),
  vehicle_size_fee NUMERIC(10,2) DEFAULT 0,
  interior_package_id UUID REFERENCES packages(id),
  exterior_package_id UUID REFERENCES packages(id),
  subtotal NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  has_water_electric BOOLEAN DEFAULT false,
  customer_notes TEXT,
  google_calendar_event_id TEXT,
  ics_file_sent BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  final_amount NUMERIC(10,2),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  line_items JSONB,
  payment_notes TEXT,
  finalized_at TIMESTAMPTZ
);
```

**Key Design Decisions**:
- `id` is UUID for security (non-sequential, unpredictable)
- `customer_phone` not unique (allows repeat customers)
- `service_type` enum constraint enforces valid values
- `vehicle_size_fee` stored separately for price transparency
- Foreign keys to `packages` table with `ON DELETE SET NULL` (if package deleted, booking retains price but loses reference)
- `status` and `payment_status` separate fields for business logic flexibility
- `line_items` as JSONB for flexible pricing breakdown
- `finalized_at` timestamp tracks when admin confirmed final pricing

### 1.2 `packages` Table
**Location**: Same migration file

```sql
CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  package_type TEXT NOT NULL CHECK (package_type IN ('interior', 'exterior')),
  price NUMERIC(10,2) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  description TEXT,
  features TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Initial Data**:
- 3 interior packages: Standard ($20, 30min), Deluxe ($40, 45min), Ultimate ($60, 60min)
- 3 exterior packages: Standard ($20, 30min), Deluxe ($35, 45min), Ultimate ($50, 60min)

### 1.3 `customers` Table
**Location**: `carwebitebooking/supabase/migrations/20240103000000_add_customers_table.sql`

```sql
CREATE TABLE customers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT,
  address TEXT,
  notes TEXT,
  total_bookings INTEGER DEFAULT 0,
  total_spent NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Design Decisions**:
- `phone` is UNIQUE constraint (one customer record per phone number)
- `BIGSERIAL` primary key (auto-incrementing integer)
- `total_bookings` and `total_spent` are **denormalized aggregates** for performance
- Updated via triggers or application logic after each booking

### 1.4 Row-Level Security (RLS)

**Authentication Context**: 
- Public users: `anon` role (JWT with `role: 'anon'`)
- Admin users: Manual authentication check in frontend (no actual auth table)

**RLS Policies** (`carwebitebooking/supabase/migrations/20240101000001_rls_policies.sql`):

```sql
-- Bookings: Public can insert (create bookings)
CREATE POLICY "Anyone can create bookings"
  ON bookings FOR INSERT
  TO anon
  WITH CHECK (true);

-- Bookings: Public can read their own (via email match)
CREATE POLICY "Anyone can read their bookings"
  ON bookings FOR SELECT
  TO anon
  USING (customer_email = current_setting('request.jwt.claims')::json->>'email');

-- Packages: Public read-only
CREATE POLICY "Anyone can view active packages"
  ON packages FOR SELECT
  TO anon
  USING (is_active = true);

-- Customers: Authenticated only
CREATE POLICY "Authenticated users can manage customers"
  ON customers FOR ALL
  TO authenticated
  USING (true);
```

**Security Analysis**:
- ❌ **VULNERABILITY**: Admin dashboard bypasses RLS by using `service_role` key client-side
- ⚠️ **RISK**: Service role key exposed in frontend env (`VITE_SUPABASE_SERVICE_KEY`)
- ✅ **MITIGATION**: Should use server-side Edge Functions for admin operations
- ✅ **Booking creation**: Properly uses `anon` key, no escalation possible

---

## 2. BOOKING WIDGET - COMPLETE TECHNICAL BREAKDOWN

### 2.1 Component Structure

**File**: `carwebitebooking/frontend/src/components/BookingWidget.jsx`

**Framework**: React 18 with Hooks
**Dependencies**:
- `react-datepicker` v4.x (calendar UI)
- `lucide-react` (icons)
- `@supabase/supabase-js` v2.x (database client)
- `date-fns` (date manipulation)

**State Management** (all local via `useState`):

```javascript
const [step, setStep] = useState(1);                    // Current form step (1-5)
const [serviceType, setServiceType] = useState('');     // 'mobile' | 'shop'
const [vehicleSize, setVehicleSize] = useState('');     // 'small' | 'medium' | 'large'
const [selectedDate, setSelectedDate] = useState(null); // Date object
const [selectedTime, setSelectedTime] = useState('');   // 'HH:MM' string
const [interiorPackage, setInteriorPackage] = useState(null); // Package object
const [exteriorPackage, setExteriorPackage] = useState(null); // Package object
const [packages, setPackages] = useState([]);           // Fetched from DB
const [availableSlots, setAvailableSlots] = useState([]); // Calculated time slots
const [customerInfo, setCustomerInfo] = useState({      // Form data
  name: '', phone: '', email: '', address: '', notes: '', hasWaterElectric: false
});
const [isSubmitting, setIsSubmitting] = useState(false);
const [errors, setErrors] = useState({});               // Validation errors
const [showThankYou, setShowThankYou] = useState(false);
const [totalPrice, setTotalPrice] = useState(0);        // Calculated price
const [totalDuration, setTotalDuration] = useState(0);  // Calculated minutes
```

### 2.2 Data Fetching on Mount

**Execution Flow**:

```javascript
useEffect(() => {
  const fetchPackages = async () => {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });
    
    if (!error) setPackages(data);
  };
  fetchPackages();
}, []);
```

**Query Details**:
- **Table**: `packages`
- **Filter**: `is_active = true`
- **Order**: By `price` ASC (cheapest first)
- **Auth**: Uses `anon` key (public read)
- **RLS**: Passes "view active packages" policy

### 2.3 Step 1: Service Type Selection

**UI**: Two large buttons (Mobile / Shop Location)

**Event Handler**:
```javascript
const handleServiceTypeSelect = (type) => {
  setServiceType(type);
  setStep(2); // Auto-advance
};
```

**Validation**: None (both options always valid)

**State Change**: 
- `serviceType` → 'mobile' or 'shop'
- `step` → 2

**Conditional Logic**: If `serviceType === 'mobile'`, Step 4 requires `address` field

### 2.4 Step 2: Vehicle Size Selection

**UI**: Three buttons (Small / Medium / Large)

**Pricing Logic** (hardcoded in frontend):
```javascript
const vehicleSizeFees = {
  small: 0,
  medium: 5,
  large: 10
};
```

**Event Handler**:
```javascript
const handleVehicleSizeSelect = (size) => {
  setVehicleSize(size);
  setStep(3);
};
```

**Price Calculation Trigger**: 
```javascript
useEffect(() => {
  const interiorPrice = interiorPackage?.price || 0;
  const exteriorPrice = exteriorPackage?.price || 0;
  const sizeFee = vehicleSizeFees[vehicleSize] || 0;
  const total = interiorPrice + exteriorPrice + sizeFee;
  
  setTotalPrice(total);
}, [interiorPackage, exteriorPackage, vehicleSize]);
```

**State Change**:
- `vehicleSize` → 'small' | 'medium' | 'large'
- `step` → 3

### 2.5 Step 3: Package Selection

**UI Structure**:
- Two sections: Exterior Detailing (top), Interior Detailing (bottom)
- Each shows 3 packages filtered by `package_type`
- "Skip Interior" / "Skip Exterior" buttons for non-combo bookings

**Package Filtering**:
```javascript
const exteriorPackages = packages.filter(pkg => pkg.package_type === 'exterior');
const interiorPackages = packages.filter(pkg => pkg.package_type === 'interior');
```

**Duration Calculation**:
```javascript
useEffect(() => {
  const interiorDuration = interiorPackage?.duration_minutes || 0;
  const exteriorDuration = exteriorPackage?.duration_minutes || 0;
  // Durations ADD (not overlap)
  setTotalDuration(interiorDuration + exteriorDuration);
}, [interiorPackage, exteriorPackage]);
```

**Selection Logic**:
```javascript
const handlePackageSelect = (pkg, type) => {
  if (type === 'interior') {
    setInteriorPackage(interiorPackage?.id === pkg.id ? null : pkg); // Toggle
  } else {
    setExteriorPackage(exteriorPackage?.id === pkg.id ? null : pkg);
  }
};
```

**Validation**:
```javascript
const canProceed = interiorPackage || exteriorPackage; // At least one required
```

**State Change**:
- `interiorPackage` → Package object or null
- `exteriorPackage` → Package object or null
- `totalDuration` → Sum of selected package durations
- `totalPrice` → Recalculated via useEffect
- `step` → 4 (on "Next" click)

### 2.6 Step 4: Date & Time Selection

**Date Picker Configuration**:
```javascript
<DatePicker
  selected={selectedDate}
  onChange={handleDateChange}
  minDate={new Date()} // Cannot book past dates
  maxDate={addDays(new Date(), 90)} // 90-day booking window
  filterDate={isDateAvailable} // Custom filter function
  inline
  calendarClassName="booking-calendar"
/>
```

**Date Availability Filter**:
```javascript
const isDateAvailable = (date) => {
  const day = date.getDay();
  // 0 = Sunday, 6 = Saturday
  return day !== 0 && day !== 6; // Weekdays only (Mon-Fri)
};
```

**Time Slot Generation** (triggered on date selection):

```javascript
const handleDateChange = async (date) => {
  setSelectedDate(date);
  setSelectedTime(''); // Reset time selection
  
  // Fetch existing bookings for this date
  const { data: existingBookings } = await supabase
    .from('bookings')
    .select('start_time, end_time')
    .eq('booking_date', format(date, 'yyyy-MM-dd'))
    .neq('status', 'cancelled');
  
  const slots = generateAvailableSlots(date, existingBookings);
  setAvailableSlots(slots);
};
```

**Slot Generation Algorithm**:

```javascript
const generateAvailableSlots = (date, existingBookings) => {
  const slots = [];
  const businessHours = { start: 15, end: 18 }; // 3 PM - 6 PM
  
  // Generate 30-minute intervals
  for (let hour = businessHours.start; hour < businessHours.end; hour++) {
    for (let minute of [0, 30]) {
      const slotStart = new Date(date);
      slotStart.setHours(hour, minute, 0, 0);
      
      // Calculate slot end time based on total duration
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + totalDuration);
      
      // Check if slot end exceeds business hours
      const endHour = slotEnd.getHours();
      const endMinute = slotEnd.getMinutes();
      const endTime = endHour + endMinute / 60;
      
      if (endTime > businessHours.end) continue; // Slot too late
      
      // Check for conflicts with existing bookings
      const hasConflict = existingBookings.some(booking => {
        const bookingStart = parseTime(booking.start_time);
        const bookingEnd = parseTime(booking.end_time);
        
        // Conflict if:
        // 1. New slot starts during existing booking
        // 2. New slot ends during existing booking
        // 3. New slot completely contains existing booking
        return (
          (slotStart >= bookingStart && slotStart < bookingEnd) ||
          (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
          (slotStart <= bookingStart && slotEnd >= bookingEnd)
        );
      });
      
      if (!hasConflict) {
        slots.push({
          time: format(slotStart, 'HH:mm'),
          display: format(slotStart, 'h:mm a')
        });
      }
    }
  }
  
  return slots;
};

const parseTime = (timeString) => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};
```

**Conflict Detection Logic Explained**:

Given:
- Existing booking: 3:00 PM - 4:30 PM
- New booking duration: 60 minutes

Scenarios:
1. **Slot 3:30 PM**: Would end at 4:30 PM → **CONFLICT** (overlaps existing)
2. **Slot 4:30 PM**: Would end at 5:30 PM → **AVAILABLE** (starts after existing ends)
3. **Slot 2:30 PM**: Would end at 3:30 PM → **CONFLICT** (ends during existing)

**Time Selection Handler**:
```javascript
const handleTimeSelect = (time) => {
  setSelectedTime(time);
  setStep(5); // Auto-advance
};
```

**State Changes**:
- `selectedDate` → Date object
- `selectedTime` → 'HH:MM' string
- `availableSlots` → Array of available time objects
- `step` → 5

### 2.7 Step 5: Customer Information

**Form Fields**:
```javascript
<input 
  type="text" 
  value={customerInfo.name}
  onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
  required 
/>
<input 
  type="tel" 
  value={customerInfo.phone}
  pattern="[0-9]{10}" // Validates 10-digit US phone
  required 
/>
<input 
  type="email" 
  value={customerInfo.email}
  required 
/>
{serviceType === 'mobile' && (
  <input 
    type="text" 
    value={customerInfo.address}
    required 
  />
)}
<textarea 
  value={customerInfo.notes}
  placeholder="Any special requests?" 
/>
{serviceType === 'mobile' && (
  <label>
    <input 
      type="checkbox" 
      checked={customerInfo.hasWaterElectric}
      onChange={(e) => setCustomerInfo({...customerInfo, hasWaterElectric: e.target.checked})}
    />
    I have water and electricity available
  </label>
)}
```

**Validation Logic**:
```javascript
const validateForm = () => {
  const newErrors = {};
  
  if (!customerInfo.name.trim()) {
    newErrors.name = 'Name is required';
  }
  
  if (!customerInfo.phone.trim()) {
    newErrors.phone = 'Phone number is required';
  } else if (!/^\d{10}$/.test(customerInfo.phone.replace(/\D/g, ''))) {
    newErrors.phone = 'Please enter a valid 10-digit phone number';
  }
  
  if (!customerInfo.email.trim()) {
    newErrors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerInfo.email)) {
    newErrors.email = 'Please enter a valid email address';
  }
  
  if (serviceType === 'mobile' && !customerInfo.address.trim()) {
    newErrors.address = 'Address is required for mobile service';
  }
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

**Submit Handler**:
```javascript
const handleSubmit = async () => {
  if (!validateForm()) {
    return; // Show errors, don't submit
  }
  
  setIsSubmitting(true);
  
  try {
    // Calculate end time
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const startTime = new Date(selectedDate);
    startTime.setHours(hours, minutes, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + totalDuration);
    
    // Prepare payload
    const bookingData = {
      customer_name: customerInfo.name.trim(),
      customer_phone: customerInfo.phone.replace(/\D/g, ''), // Strip formatting
      customer_email: customerInfo.email.trim().toLowerCase(),
      customer_address: serviceType === 'mobile' ? customerInfo.address.trim() : null,
      service_type: serviceType,
      vehicle_size: vehicleSize,
      interior_package_id: interiorPackage?.id || null,
      exterior_package_id: exteriorPackage?.id || null,
      has_water_electric: serviceType === 'mobile' ? customerInfo.hasWaterElectric : false,
      customer_notes: customerInfo.notes.trim() || null,
      booking_date: format(selectedDate, 'yyyy-MM-dd'),
      start_time: format(startTime, 'HH:mm:ss'),
      end_time: format(endTime, 'HH:mm:ss'),
      status: 'pending' // Admin must confirm
    };
    
    // Call Edge Function (NOT direct DB insert)
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-booking`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(bookingData)
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Booking failed');
    }
    
    const result = await response.json();
    
    // Success state
    setShowThankYou(true);
    
    // Reset form after 5 seconds
    setTimeout(() => {
      resetForm();
    }, 5000);
    
  } catch (error) {
    console.error('Booking error:', error);
    setErrors({ submit: error.message || 'Something went wrong. Please try again.' });
  } finally {
    setIsSubmitting(false);
  }
};
```

**Why Edge Function Instead of Direct Insert?**
1. **Business Logic**: Price calculation, duration validation, conflict checking
2. **Customer Auto-Creation**: Automatically creates/updates customer record
3. **Email Notifications**: Sends emails to customer and owner
4. **Calendar Integration**: Creates Google Calendar event (if configured)
5. **Data Integrity**: Server-side validation prevents tampering

---

## 3. EDGE FUNCTION: `create-booking`

**File**: `carwebitebooking/supabase/functions/create-booking/index.ts`

**Runtime**: Deno (TypeScript)

**Authentication**: Public endpoint (uses `anon` key)

### 3.1 Request Handler

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow
```


## License: unknown
https://github.com/nick-barth/spokenword/blob/42400614921bde7e6d15058f25bbea4df771e283/supabase/functions/parse/index.ts

```
# Complete Technical Breakdown: Car Wash Booking System

## Project Architecture Overview

This is a **React-based single-page application** integrated with **Supabase** as the backend-as-a-service platform. The system consists of:

1. **Customer-facing booking widget** (public)
2. **Admin dashboard** (authenticated)
3. **Supabase Edge Functions** (serverless backend)
4. **PostgreSQL database** via Supabase
5. **Email notifications** via Resend API

---

## 1. DATABASE SCHEMA & TABLES

### 1.1 `bookings` Table
**Location**: `carwebitebooking/supabase/migrations/20240101000000_initial_schema.sql`

```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_address TEXT,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  total_duration_minutes INTEGER NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('mobile', 'shop')),
  vehicle_size TEXT NOT NULL CHECK (vehicle_size IN ('small', 'medium', 'large')),
  vehicle_size_fee NUMERIC(10,2) DEFAULT 0,
  interior_package_id UUID REFERENCES packages(id),
  exterior_package_id UUID REFERENCES packages(id),
  subtotal NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  has_water_electric BOOLEAN DEFAULT false,
  customer_notes TEXT,
  google_calendar_event_id TEXT,
  ics_file_sent BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  final_amount NUMERIC(10,2),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  line_items JSONB,
  payment_notes TEXT,
  finalized_at TIMESTAMPTZ
);
```

**Key Design Decisions**:
- `id` is UUID for security (non-sequential, unpredictable)
- `customer_phone` not unique (allows repeat customers)
- `service_type` enum constraint enforces valid values
- `vehicle_size_fee` stored separately for price transparency
- Foreign keys to `packages` table with `ON DELETE SET NULL` (if package deleted, booking retains price but loses reference)
- `status` and `payment_status` separate fields for business logic flexibility
- `line_items` as JSONB for flexible pricing breakdown
- `finalized_at` timestamp tracks when admin confirmed final pricing

### 1.2 `packages` Table
**Location**: Same migration file

```sql
CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  package_type TEXT NOT NULL CHECK (package_type IN ('interior', 'exterior')),
  price NUMERIC(10,2) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  description TEXT,
  features TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Initial Data**:
- 3 interior packages: Standard ($20, 30min), Deluxe ($40, 45min), Ultimate ($60, 60min)
- 3 exterior packages: Standard ($20, 30min), Deluxe ($35, 45min), Ultimate ($50, 60min)

### 1.3 `customers` Table
**Location**: `carwebitebooking/supabase/migrations/20240103000000_add_customers_table.sql`

```sql
CREATE TABLE customers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT,
  address TEXT,
  notes TEXT,
  total_bookings INTEGER DEFAULT 0,
  total_spent NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Design Decisions**:
- `phone` is UNIQUE constraint (one customer record per phone number)
- `BIGSERIAL` primary key (auto-incrementing integer)
- `total_bookings` and `total_spent` are **denormalized aggregates** for performance
- Updated via triggers or application logic after each booking

### 1.4 Row-Level Security (RLS)

**Authentication Context**: 
- Public users: `anon` role (JWT with `role: 'anon'`)
- Admin users: Manual authentication check in frontend (no actual auth table)

**RLS Policies** (`carwebitebooking/supabase/migrations/20240101000001_rls_policies.sql`):

```sql
-- Bookings: Public can insert (create bookings)
CREATE POLICY "Anyone can create bookings"
  ON bookings FOR INSERT
  TO anon
  WITH CHECK (true);

-- Bookings: Public can read their own (via email match)
CREATE POLICY "Anyone can read their bookings"
  ON bookings FOR SELECT
  TO anon
  USING (customer_email = current_setting('request.jwt.claims')::json->>'email');

-- Packages: Public read-only
CREATE POLICY "Anyone can view active packages"
  ON packages FOR SELECT
  TO anon
  USING (is_active = true);

-- Customers: Authenticated only
CREATE POLICY "Authenticated users can manage customers"
  ON customers FOR ALL
  TO authenticated
  USING (true);
```

**Security Analysis**:
- ❌ **VULNERABILITY**: Admin dashboard bypasses RLS by using `service_role` key client-side
- ⚠️ **RISK**: Service role key exposed in frontend env (`VITE_SUPABASE_SERVICE_KEY`)
- ✅ **MITIGATION**: Should use server-side Edge Functions for admin operations
- ✅ **Booking creation**: Properly uses `anon` key, no escalation possible

---

## 2. BOOKING WIDGET - COMPLETE TECHNICAL BREAKDOWN

### 2.1 Component Structure

**File**: `carwebitebooking/frontend/src/components/BookingWidget.jsx`

**Framework**: React 18 with Hooks
**Dependencies**:
- `react-datepicker` v4.x (calendar UI)
- `lucide-react` (icons)
- `@supabase/supabase-js` v2.x (database client)
- `date-fns` (date manipulation)

**State Management** (all local via `useState`):

```javascript
const [step, setStep] = useState(1);                    // Current form step (1-5)
const [serviceType, setServiceType] = useState('');     // 'mobile' | 'shop'
const [vehicleSize, setVehicleSize] = useState('');     // 'small' | 'medium' | 'large'
const [selectedDate, setSelectedDate] = useState(null); // Date object
const [selectedTime, setSelectedTime] = useState('');   // 'HH:MM' string
const [interiorPackage, setInteriorPackage] = useState(null); // Package object
const [exteriorPackage, setExteriorPackage] = useState(null); // Package object
const [packages, setPackages] = useState([]);           // Fetched from DB
const [availableSlots, setAvailableSlots] = useState([]); // Calculated time slots
const [customerInfo, setCustomerInfo] = useState({      // Form data
  name: '', phone: '', email: '', address: '', notes: '', hasWaterElectric: false
});
const [isSubmitting, setIsSubmitting] = useState(false);
const [errors, setErrors] = useState({});               // Validation errors
const [showThankYou, setShowThankYou] = useState(false);
const [totalPrice, setTotalPrice] = useState(0);        // Calculated price
const [totalDuration, setTotalDuration] = useState(0);  // Calculated minutes
```

### 2.2 Data Fetching on Mount

**Execution Flow**:

```javascript
useEffect(() => {
  const fetchPackages = async () => {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });
    
    if (!error) setPackages(data);
  };
  fetchPackages();
}, []);
```

**Query Details**:
- **Table**: `packages`
- **Filter**: `is_active = true`
- **Order**: By `price` ASC (cheapest first)
- **Auth**: Uses `anon` key (public read)
- **RLS**: Passes "view active packages" policy

### 2.3 Step 1: Service Type Selection

**UI**: Two large buttons (Mobile / Shop Location)

**Event Handler**:
```javascript
const handleServiceTypeSelect = (type) => {
  setServiceType(type);
  setStep(2); // Auto-advance
};
```

**Validation**: None (both options always valid)

**State Change**: 
- `serviceType` → 'mobile' or 'shop'
- `step` → 2

**Conditional Logic**: If `serviceType === 'mobile'`, Step 4 requires `address` field

### 2.4 Step 2: Vehicle Size Selection

**UI**: Three buttons (Small / Medium / Large)

**Pricing Logic** (hardcoded in frontend):
```javascript
const vehicleSizeFees = {
  small: 0,
  medium: 5,
  large: 10
};
```

**Event Handler**:
```javascript
const handleVehicleSizeSelect = (size) => {
  setVehicleSize(size);
  setStep(3);
};
```

**Price Calculation Trigger**: 
```javascript
useEffect(() => {
  const interiorPrice = interiorPackage?.price || 0;
  const exteriorPrice = exteriorPackage?.price || 0;
  const sizeFee = vehicleSizeFees[vehicleSize] || 0;
  const total = interiorPrice + exteriorPrice + sizeFee;
  
  setTotalPrice(total);
}, [interiorPackage, exteriorPackage, vehicleSize]);
```

**State Change**:
- `vehicleSize` → 'small' | 'medium' | 'large'
- `step` → 3

### 2.5 Step 3: Package Selection

**UI Structure**:
- Two sections: Exterior Detailing (top), Interior Detailing (bottom)
- Each shows 3 packages filtered by `package_type`
- "Skip Interior" / "Skip Exterior" buttons for non-combo bookings

**Package Filtering**:
```javascript
const exteriorPackages = packages.filter(pkg => pkg.package_type === 'exterior');
const interiorPackages = packages.filter(pkg => pkg.package_type === 'interior');
```

**Duration Calculation**:
```javascript
useEffect(() => {
  const interiorDuration = interiorPackage?.duration_minutes || 0;
  const exteriorDuration = exteriorPackage?.duration_minutes || 0;
  // Durations ADD (not overlap)
  setTotalDuration(interiorDuration + exteriorDuration);
}, [interiorPackage, exteriorPackage]);
```

**Selection Logic**:
```javascript
const handlePackageSelect = (pkg, type) => {
  if (type === 'interior') {
    setInteriorPackage(interiorPackage?.id === pkg.id ? null : pkg); // Toggle
  } else {
    setExteriorPackage(exteriorPackage?.id === pkg.id ? null : pkg);
  }
};
```

**Validation**:
```javascript
const canProceed = interiorPackage || exteriorPackage; // At least one required
```

**State Change**:
- `interiorPackage` → Package object or null
- `exteriorPackage` → Package object or null
- `totalDuration` → Sum of selected package durations
- `totalPrice` → Recalculated via useEffect
- `step` → 4 (on "Next" click)

### 2.6 Step 4: Date & Time Selection

**Date Picker Configuration**:
```javascript
<DatePicker
  selected={selectedDate}
  onChange={handleDateChange}
  minDate={new Date()} // Cannot book past dates
  maxDate={addDays(new Date(), 90)} // 90-day booking window
  filterDate={isDateAvailable} // Custom filter function
  inline
  calendarClassName="booking-calendar"
/>
```

**Date Availability Filter**:
```javascript
const isDateAvailable = (date) => {
  const day = date.getDay();
  // 0 = Sunday, 6 = Saturday
  return day !== 0 && day !== 6; // Weekdays only (Mon-Fri)
};
```

**Time Slot Generation** (triggered on date selection):

```javascript
const handleDateChange = async (date) => {
  setSelectedDate(date);
  setSelectedTime(''); // Reset time selection
  
  // Fetch existing bookings for this date
  const { data: existingBookings } = await supabase
    .from('bookings')
    .select('start_time, end_time')
    .eq('booking_date', format(date, 'yyyy-MM-dd'))
    .neq('status', 'cancelled');
  
  const slots = generateAvailableSlots(date, existingBookings);
  setAvailableSlots(slots);
};
```

**Slot Generation Algorithm**:

```javascript
const generateAvailableSlots = (date, existingBookings) => {
  const slots = [];
  const businessHours = { start: 15, end: 18 }; // 3 PM - 6 PM
  
  // Generate 30-minute intervals
  for (let hour = businessHours.start; hour < businessHours.end; hour++) {
    for (let minute of [0, 30]) {
      const slotStart = new Date(date);
      slotStart.setHours(hour, minute, 0, 0);
      
      // Calculate slot end time based on total duration
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + totalDuration);
      
      // Check if slot end exceeds business hours
      const endHour = slotEnd.getHours();
      const endMinute = slotEnd.getMinutes();
      const endTime = endHour + endMinute / 60;
      
      if (endTime > businessHours.end) continue; // Slot too late
      
      // Check for conflicts with existing bookings
      const hasConflict = existingBookings.some(booking => {
        const bookingStart = parseTime(booking.start_time);
        const bookingEnd = parseTime(booking.end_time);
        
        // Conflict if:
        // 1. New slot starts during existing booking
        // 2. New slot ends during existing booking
        // 3. New slot completely contains existing booking
        return (
          (slotStart >= bookingStart && slotStart < bookingEnd) ||
          (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
          (slotStart <= bookingStart && slotEnd >= bookingEnd)
        );
      });
      
      if (!hasConflict) {
        slots.push({
          time: format(slotStart, 'HH:mm'),
          display: format(slotStart, 'h:mm a')
        });
      }
    }
  }
  
  return slots;
};

const parseTime = (timeString) => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};
```

**Conflict Detection Logic Explained**:

Given:
- Existing booking: 3:00 PM - 4:30 PM
- New booking duration: 60 minutes

Scenarios:
1. **Slot 3:30 PM**: Would end at 4:30 PM → **CONFLICT** (overlaps existing)
2. **Slot 4:30 PM**: Would end at 5:30 PM → **AVAILABLE** (starts after existing ends)
3. **Slot 2:30 PM**: Would end at 3:30 PM → **CONFLICT** (ends during existing)

**Time Selection Handler**:
```javascript
const handleTimeSelect = (time) => {
  setSelectedTime(time);
  setStep(5); // Auto-advance
};
```

**State Changes**:
- `selectedDate` → Date object
- `selectedTime` → 'HH:MM' string
- `availableSlots` → Array of available time objects
- `step` → 5

### 2.7 Step 5: Customer Information

**Form Fields**:
```javascript
<input 
  type="text" 
  value={customerInfo.name}
  onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
  required 
/>
<input 
  type="tel" 
  value={customerInfo.phone}
  pattern="[0-9]{10}" // Validates 10-digit US phone
  required 
/>
<input 
  type="email" 
  value={customerInfo.email}
  required 
/>
{serviceType === 'mobile' && (
  <input 
    type="text" 
    value={customerInfo.address}
    required 
  />
)}
<textarea 
  value={customerInfo.notes}
  placeholder="Any special requests?" 
/>
{serviceType === 'mobile' && (
  <label>
    <input 
      type="checkbox" 
      checked={customerInfo.hasWaterElectric}
      onChange={(e) => setCustomerInfo({...customerInfo, hasWaterElectric: e.target.checked})}
    />
    I have water and electricity available
  </label>
)}
```

**Validation Logic**:
```javascript
const validateForm = () => {
  const newErrors = {};
  
  if (!customerInfo.name.trim()) {
    newErrors.name = 'Name is required';
  }
  
  if (!customerInfo.phone.trim()) {
    newErrors.phone = 'Phone number is required';
  } else if (!/^\d{10}$/.test(customerInfo.phone.replace(/\D/g, ''))) {
    newErrors.phone = 'Please enter a valid 10-digit phone number';
  }
  
  if (!customerInfo.email.trim()) {
    newErrors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerInfo.email)) {
    newErrors.email = 'Please enter a valid email address';
  }
  
  if (serviceType === 'mobile' && !customerInfo.address.trim()) {
    newErrors.address = 'Address is required for mobile service';
  }
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

**Submit Handler**:
```javascript
const handleSubmit = async () => {
  if (!validateForm()) {
    return; // Show errors, don't submit
  }
  
  setIsSubmitting(true);
  
  try {
    // Calculate end time
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const startTime = new Date(selectedDate);
    startTime.setHours(hours, minutes, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + totalDuration);
    
    // Prepare payload
    const bookingData = {
      customer_name: customerInfo.name.trim(),
      customer_phone: customerInfo.phone.replace(/\D/g, ''), // Strip formatting
      customer_email: customerInfo.email.trim().toLowerCase(),
      customer_address: serviceType === 'mobile' ? customerInfo.address.trim() : null,
      service_type: serviceType,
      vehicle_size: vehicleSize,
      interior_package_id: interiorPackage?.id || null,
      exterior_package_id: exteriorPackage?.id || null,
      has_water_electric: serviceType === 'mobile' ? customerInfo.hasWaterElectric : false,
      customer_notes: customerInfo.notes.trim() || null,
      booking_date: format(selectedDate, 'yyyy-MM-dd'),
      start_time: format(startTime, 'HH:mm:ss'),
      end_time: format(endTime, 'HH:mm:ss'),
      status: 'pending' // Admin must confirm
    };
    
    // Call Edge Function (NOT direct DB insert)
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-booking`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(bookingData)
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Booking failed');
    }
    
    const result = await response.json();
    
    // Success state
    setShowThankYou(true);
    
    // Reset form after 5 seconds
    setTimeout(() => {
      resetForm();
    }, 5000);
    
  } catch (error) {
    console.error('Booking error:', error);
    setErrors({ submit: error.message || 'Something went wrong. Please try again.' });
  } finally {
    setIsSubmitting(false);
  }
};
```

**Why Edge Function Instead of Direct Insert?**
1. **Business Logic**: Price calculation, duration validation, conflict checking
2. **Customer Auto-Creation**: Automatically creates/updates customer record
3. **Email Notifications**: Sends emails to customer and owner
4. **Calendar Integration**: Creates Google Calendar event (if configured)
5. **Data Integrity**: Server-side validation prevents tampering

---

## 3. EDGE FUNCTION: `create-booking`

**File**: `carwebitebooking/supabase/functions/create-booking/index.ts`

**Runtime**: Deno (TypeScript)

**Authentication**: Public endpoint (uses `anon` key)

### 3.1 Request Handler

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey,
```


## License: unknown
https://github.com/nick-barth/spokenword/blob/42400614921bde7e6d15058f25bbea4df771e283/supabase/functions/parse/index.ts

```
# Complete Technical Breakdown: Car Wash Booking System

## Project Architecture Overview

This is a **React-based single-page application** integrated with **Supabase** as the backend-as-a-service platform. The system consists of:

1. **Customer-facing booking widget** (public)
2. **Admin dashboard** (authenticated)
3. **Supabase Edge Functions** (serverless backend)
4. **PostgreSQL database** via Supabase
5. **Email notifications** via Resend API

---

## 1. DATABASE SCHEMA & TABLES

### 1.1 `bookings` Table
**Location**: `carwebitebooking/supabase/migrations/20240101000000_initial_schema.sql`

```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_address TEXT,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  total_duration_minutes INTEGER NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('mobile', 'shop')),
  vehicle_size TEXT NOT NULL CHECK (vehicle_size IN ('small', 'medium', 'large')),
  vehicle_size_fee NUMERIC(10,2) DEFAULT 0,
  interior_package_id UUID REFERENCES packages(id),
  exterior_package_id UUID REFERENCES packages(id),
  subtotal NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  has_water_electric BOOLEAN DEFAULT false,
  customer_notes TEXT,
  google_calendar_event_id TEXT,
  ics_file_sent BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  final_amount NUMERIC(10,2),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  line_items JSONB,
  payment_notes TEXT,
  finalized_at TIMESTAMPTZ
);
```

**Key Design Decisions**:
- `id` is UUID for security (non-sequential, unpredictable)
- `customer_phone` not unique (allows repeat customers)
- `service_type` enum constraint enforces valid values
- `vehicle_size_fee` stored separately for price transparency
- Foreign keys to `packages` table with `ON DELETE SET NULL` (if package deleted, booking retains price but loses reference)
- `status` and `payment_status` separate fields for business logic flexibility
- `line_items` as JSONB for flexible pricing breakdown
- `finalized_at` timestamp tracks when admin confirmed final pricing

### 1.2 `packages` Table
**Location**: Same migration file

```sql
CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  package_type TEXT NOT NULL CHECK (package_type IN ('interior', 'exterior')),
  price NUMERIC(10,2) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  description TEXT,
  features TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Initial Data**:
- 3 interior packages: Standard ($20, 30min), Deluxe ($40, 45min), Ultimate ($60, 60min)
- 3 exterior packages: Standard ($20, 30min), Deluxe ($35, 45min), Ultimate ($50, 60min)

### 1.3 `customers` Table
**Location**: `carwebitebooking/supabase/migrations/20240103000000_add_customers_table.sql`

```sql
CREATE TABLE customers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT,
  address TEXT,
  notes TEXT,
  total_bookings INTEGER DEFAULT 0,
  total_spent NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Design Decisions**:
- `phone` is UNIQUE constraint (one customer record per phone number)
- `BIGSERIAL` primary key (auto-incrementing integer)
- `total_bookings` and `total_spent` are **denormalized aggregates** for performance
- Updated via triggers or application logic after each booking

### 1.4 Row-Level Security (RLS)

**Authentication Context**: 
- Public users: `anon` role (JWT with `role: 'anon'`)
- Admin users: Manual authentication check in frontend (no actual auth table)

**RLS Policies** (`carwebitebooking/supabase/migrations/20240101000001_rls_policies.sql`):

```sql
-- Bookings: Public can insert (create bookings)
CREATE POLICY "Anyone can create bookings"
  ON bookings FOR INSERT
  TO anon
  WITH CHECK (true);

-- Bookings: Public can read their own (via email match)
CREATE POLICY "Anyone can read their bookings"
  ON bookings FOR SELECT
  TO anon
  USING (customer_email = current_setting('request.jwt.claims')::json->>'email');

-- Packages: Public read-only
CREATE POLICY "Anyone can view active packages"
  ON packages FOR SELECT
  TO anon
  USING (is_active = true);

-- Customers: Authenticated only
CREATE POLICY "Authenticated users can manage customers"
  ON customers FOR ALL
  TO authenticated
  USING (true);
```

**Security Analysis**:
- ❌ **VULNERABILITY**: Admin dashboard bypasses RLS by using `service_role` key client-side
- ⚠️ **RISK**: Service role key exposed in frontend env (`VITE_SUPABASE_SERVICE_KEY`)
- ✅ **MITIGATION**: Should use server-side Edge Functions for admin operations
- ✅ **Booking creation**: Properly uses `anon` key, no escalation possible

---

## 2. BOOKING WIDGET - COMPLETE TECHNICAL BREAKDOWN

### 2.1 Component Structure

**File**: `carwebitebooking/frontend/src/components/BookingWidget.jsx`

**Framework**: React 18 with Hooks
**Dependencies**:
- `react-datepicker` v4.x (calendar UI)
- `lucide-react` (icons)
- `@supabase/supabase-js` v2.x (database client)
- `date-fns` (date manipulation)

**State Management** (all local via `useState`):

```javascript
const [step, setStep] = useState(1);                    // Current form step (1-5)
const [serviceType, setServiceType] = useState('');     // 'mobile' | 'shop'
const [vehicleSize, setVehicleSize] = useState('');     // 'small' | 'medium' | 'large'
const [selectedDate, setSelectedDate] = useState(null); // Date object
const [selectedTime, setSelectedTime] = useState('');   // 'HH:MM' string
const [interiorPackage, setInteriorPackage] = useState(null); // Package object
const [exteriorPackage, setExteriorPackage] = useState(null); // Package object
const [packages, setPackages] = useState([]);           // Fetched from DB
const [availableSlots, setAvailableSlots] = useState([]); // Calculated time slots
const [customerInfo, setCustomerInfo] = useState({      // Form data
  name: '', phone: '', email: '', address: '', notes: '', hasWaterElectric: false
});
const [isSubmitting, setIsSubmitting] = useState(false);
const [errors, setErrors] = useState({});               // Validation errors
const [showThankYou, setShowThankYou] = useState(false);
const [totalPrice, setTotalPrice] = useState(0);        // Calculated price
const [totalDuration, setTotalDuration] = useState(0);  // Calculated minutes
```

### 2.2 Data Fetching on Mount

**Execution Flow**:

```javascript
useEffect(() => {
  const fetchPackages = async () => {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });
    
    if (!error) setPackages(data);
  };
  fetchPackages();
}, []);
```

**Query Details**:
- **Table**: `packages`
- **Filter**: `is_active = true`
- **Order**: By `price` ASC (cheapest first)
- **Auth**: Uses `anon` key (public read)
- **RLS**: Passes "view active packages" policy

### 2.3 Step 1: Service Type Selection

**UI**: Two large buttons (Mobile / Shop Location)

**Event Handler**:
```javascript
const handleServiceTypeSelect = (type) => {
  setServiceType(type);
  setStep(2); // Auto-advance
};
```

**Validation**: None (both options always valid)

**State Change**: 
- `serviceType` → 'mobile' or 'shop'
- `step` → 2

**Conditional Logic**: If `serviceType === 'mobile'`, Step 4 requires `address` field

### 2.4 Step 2: Vehicle Size Selection

**UI**: Three buttons (Small / Medium / Large)

**Pricing Logic** (hardcoded in frontend):
```javascript
const vehicleSizeFees = {
  small: 0,
  medium: 5,
  large: 10
};
```

**Event Handler**:
```javascript
const handleVehicleSizeSelect = (size) => {
  setVehicleSize(size);
  setStep(3);
};
```

**Price Calculation Trigger**: 
```javascript
useEffect(() => {
  const interiorPrice = interiorPackage?.price || 0;
  const exteriorPrice = exteriorPackage?.price || 0;
  const sizeFee = vehicleSizeFees[vehicleSize] || 0;
  const total = interiorPrice + exteriorPrice + sizeFee;
  
  setTotalPrice(total);
}, [interiorPackage, exteriorPackage, vehicleSize]);
```

**State Change**:
- `vehicleSize` → 'small' | 'medium' | 'large'
- `step` → 3

### 2.5 Step 3: Package Selection

**UI Structure**:
- Two sections: Exterior Detailing (top), Interior Detailing (bottom)
- Each shows 3 packages filtered by `package_type`
- "Skip Interior" / "Skip Exterior" buttons for non-combo bookings

**Package Filtering**:
```javascript
const exteriorPackages = packages.filter(pkg => pkg.package_type === 'exterior');
const interiorPackages = packages.filter(pkg => pkg.package_type === 'interior');
```

**Duration Calculation**:
```javascript
useEffect(() => {
  const interiorDuration = interiorPackage?.duration_minutes || 0;
  const exteriorDuration = exteriorPackage?.duration_minutes || 0;
  // Durations ADD (not overlap)
  setTotalDuration(interiorDuration + exteriorDuration);
}, [interiorPackage, exteriorPackage]);
```

**Selection Logic**:
```javascript
const handlePackageSelect = (pkg, type) => {
  if (type === 'interior') {
    setInteriorPackage(interiorPackage?.id === pkg.id ? null : pkg); // Toggle
  } else {
    setExteriorPackage(exteriorPackage?.id === pkg.id ? null : pkg);
  }
};
```

**Validation**:
```javascript
const canProceed = interiorPackage || exteriorPackage; // At least one required
```

**State Change**:
- `interiorPackage` → Package object or null
- `exteriorPackage` → Package object or null
- `totalDuration` → Sum of selected package durations
- `totalPrice` → Recalculated via useEffect
- `step` → 4 (on "Next" click)

### 2.6 Step 4: Date & Time Selection

**Date Picker Configuration**:
```javascript
<DatePicker
  selected={selectedDate}
  onChange={handleDateChange}
  minDate={new Date()} // Cannot book past dates
  maxDate={addDays(new Date(), 90)} // 90-day booking window
  filterDate={isDateAvailable} // Custom filter function
  inline
  calendarClassName="booking-calendar"
/>
```

**Date Availability Filter**:
```javascript
const isDateAvailable = (date) => {
  const day = date.getDay();
  // 0 = Sunday, 6 = Saturday
  return day !== 0 && day !== 6; // Weekdays only (Mon-Fri)
};
```

**Time Slot Generation** (triggered on date selection):

```javascript
const handleDateChange = async (date) => {
  setSelectedDate(date);
  setSelectedTime(''); // Reset time selection
  
  // Fetch existing bookings for this date
  const { data: existingBookings } = await supabase
    .from('bookings')
    .select('start_time, end_time')
    .eq('booking_date', format(date, 'yyyy-MM-dd'))
    .neq('status', 'cancelled');
  
  const slots = generateAvailableSlots(date, existingBookings);
  setAvailableSlots(slots);
};
```

**Slot Generation Algorithm**:

```javascript
const generateAvailableSlots = (date, existingBookings) => {
  const slots = [];
  const businessHours = { start: 15, end: 18 }; // 3 PM - 6 PM
  
  // Generate 30-minute intervals
  for (let hour = businessHours.start; hour < businessHours.end; hour++) {
    for (let minute of [0, 30]) {
      const slotStart = new Date(date);
      slotStart.setHours(hour, minute, 0, 0);
      
      // Calculate slot end time based on total duration
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + totalDuration);
      
      // Check if slot end exceeds business hours
      const endHour = slotEnd.getHours();
      const endMinute = slotEnd.getMinutes();
      const endTime = endHour + endMinute / 60;
      
      if (endTime > businessHours.end) continue; // Slot too late
      
      // Check for conflicts with existing bookings
      const hasConflict = existingBookings.some(booking => {
        const bookingStart = parseTime(booking.start_time);
        const bookingEnd = parseTime(booking.end_time);
        
        // Conflict if:
        // 1. New slot starts during existing booking
        // 2. New slot ends during existing booking
        // 3. New slot completely contains existing booking
        return (
          (slotStart >= bookingStart && slotStart < bookingEnd) ||
          (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
          (slotStart <= bookingStart && slotEnd >= bookingEnd)
        );
      });
      
      if (!hasConflict) {
        slots.push({
          time: format(slotStart, 'HH:mm'),
          display: format(slotStart, 'h:mm a')
        });
      }
    }
  }
  
  return slots;
};

const parseTime = (timeString) => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};
```

**Conflict Detection Logic Explained**:

Given:
- Existing booking: 3:00 PM - 4:30 PM
- New booking duration: 60 minutes

Scenarios:
1. **Slot 3:30 PM**: Would end at 4:30 PM → **CONFLICT** (overlaps existing)
2. **Slot 4:30 PM**: Would end at 5:30 PM → **AVAILABLE** (starts after existing ends)
3. **Slot 2:30 PM**: Would end at 3:30 PM → **CONFLICT** (ends during existing)

**Time Selection Handler**:
```javascript
const handleTimeSelect = (time) => {
  setSelectedTime(time);
  setStep(5); // Auto-advance
};
```

**State Changes**:
- `selectedDate` → Date object
- `selectedTime` → 'HH:MM' string
- `availableSlots` → Array of available time objects
- `step` → 5

### 2.7 Step 5: Customer Information

**Form Fields**:
```javascript
<input 
  type="text" 
  value={customerInfo.name}
  onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
  required 
/>
<input 
  type="tel" 
  value={customerInfo.phone}
  pattern="[0-9]{10}" // Validates 10-digit US phone
  required 
/>
<input 
  type="email" 
  value={customerInfo.email}
  required 
/>
{serviceType === 'mobile' && (
  <input 
    type="text" 
    value={customerInfo.address}
    required 
  />
)}
<textarea 
  value={customerInfo.notes}
  placeholder="Any special requests?" 
/>
{serviceType === 'mobile' && (
  <label>
    <input 
      type="checkbox" 
      checked={customerInfo.hasWaterElectric}
      onChange={(e) => setCustomerInfo({...customerInfo, hasWaterElectric: e.target.checked})}
    />
    I have water and electricity available
  </label>
)}
```

**Validation Logic**:
```javascript
const validateForm = () => {
  const newErrors = {};
  
  if (!customerInfo.name.trim()) {
    newErrors.name = 'Name is required';
  }
  
  if (!customerInfo.phone.trim()) {
    newErrors.phone = 'Phone number is required';
  } else if (!/^\d{10}$/.test(customerInfo.phone.replace(/\D/g, ''))) {
    newErrors.phone = 'Please enter a valid 10-digit phone number';
  }
  
  if (!customerInfo.email.trim()) {
    newErrors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerInfo.email)) {
    newErrors.email = 'Please enter a valid email address';
  }
  
  if (serviceType === 'mobile' && !customerInfo.address.trim()) {
    newErrors.address = 'Address is required for mobile service';
  }
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

**Submit Handler**:
```javascript
const handleSubmit = async () => {
  if (!validateForm()) {
    return; // Show errors, don't submit
  }
  
  setIsSubmitting(true);
  
  try {
    // Calculate end time
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const startTime = new Date(selectedDate);
    startTime.setHours(hours, minutes, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + totalDuration);
    
    // Prepare payload
    const bookingData = {
      customer_name: customerInfo.name.trim(),
      customer_phone: customerInfo.phone.replace(/\D/g, ''), // Strip formatting
      customer_email: customerInfo.email.trim().toLowerCase(),
      customer_address: serviceType === 'mobile' ? customerInfo.address.trim() : null,
      service_type: serviceType,
      vehicle_size: vehicleSize,
      interior_package_id: interiorPackage?.id || null,
      exterior_package_id: exteriorPackage?.id || null,
      has_water_electric: serviceType === 'mobile' ? customerInfo.hasWaterElectric : false,
      customer_notes: customerInfo.notes.trim() || null,
      booking_date: format(selectedDate, 'yyyy-MM-dd'),
      start_time: format(startTime, 'HH:mm:ss'),
      end_time: format(endTime, 'HH:mm:ss'),
      status: 'pending' // Admin must confirm
    };
    
    // Call Edge Function (NOT direct DB insert)
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-booking`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(bookingData)
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Booking failed');
    }
    
    const result = await response.json();
    
    // Success state
    setShowThankYou(true);
    
    // Reset form after 5 seconds
    setTimeout(() => {
      resetForm();
    }, 5000);
    
  } catch (error) {
    console.error('Booking error:', error);
    setErrors({ submit: error.message || 'Something went wrong. Please try again.' });
  } finally {
    setIsSubmitting(false);
  }
};
```

**Why Edge Function Instead of Direct Insert?**
1. **Business Logic**: Price calculation, duration validation, conflict checking
2. **Customer Auto-Creation**: Automatically creates/updates customer record
3. **Email Notifications**: Sends emails to customer and owner
4. **Calendar Integration**: Creates Google Calendar event (if configured)
5. **Data Integrity**: Server-side validation prevents tampering

---

## 3. EDGE FUNCTION: `create-booking`

**File**: `carwebitebooking/supabase/functions/create-booking/index.ts`

**Runtime**: Deno (TypeScript)

**Authentication**: Public endpoint (uses `anon` key)

### 3.1 Request Handler

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey,
```


## License: unknown
https://github.com/nick-barth/spokenword/blob/42400614921bde7e6d15058f25bbea4df771e283/supabase/functions/parse/index.ts

```
# Complete Technical Breakdown: Car Wash Booking System

## Project Architecture Overview

This is a **React-based single-page application** integrated with **Supabase** as the backend-as-a-service platform. The system consists of:

1. **Customer-facing booking widget** (public)
2. **Admin dashboard** (authenticated)
3. **Supabase Edge Functions** (serverless backend)
4. **PostgreSQL database** via Supabase
5. **Email notifications** via Resend API

---

## 1. DATABASE SCHEMA & TABLES

### 1.1 `bookings` Table
**Location**: `carwebitebooking/supabase/migrations/20240101000000_initial_schema.sql`

```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_address TEXT,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  total_duration_minutes INTEGER NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('mobile', 'shop')),
  vehicle_size TEXT NOT NULL CHECK (vehicle_size IN ('small', 'medium', 'large')),
  vehicle_size_fee NUMERIC(10,2) DEFAULT 0,
  interior_package_id UUID REFERENCES packages(id),
  exterior_package_id UUID REFERENCES packages(id),
  subtotal NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  has_water_electric BOOLEAN DEFAULT false,
  customer_notes TEXT,
  google_calendar_event_id TEXT,
  ics_file_sent BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  final_amount NUMERIC(10,2),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  line_items JSONB,
  payment_notes TEXT,
  finalized_at TIMESTAMPTZ
);
```

**Key Design Decisions**:
- `id` is UUID for security (non-sequential, unpredictable)
- `customer_phone` not unique (allows repeat customers)
- `service_type` enum constraint enforces valid values
- `vehicle_size_fee` stored separately for price transparency
- Foreign keys to `packages` table with `ON DELETE SET NULL` (if package deleted, booking retains price but loses reference)
- `status` and `payment_status` separate fields for business logic flexibility
- `line_items` as JSONB for flexible pricing breakdown
- `finalized_at` timestamp tracks when admin confirmed final pricing

### 1.2 `packages` Table
**Location**: Same migration file

```sql
CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  package_type TEXT NOT NULL CHECK (package_type IN ('interior', 'exterior')),
  price NUMERIC(10,2) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  description TEXT,
  features TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Initial Data**:
- 3 interior packages: Standard ($20, 30min), Deluxe ($40, 45min), Ultimate ($60, 60min)
- 3 exterior packages: Standard ($20, 30min), Deluxe ($35, 45min), Ultimate ($50, 60min)

### 1.3 `customers` Table
**Location**: `carwebitebooking/supabase/migrations/20240103000000_add_customers_table.sql`

```sql
CREATE TABLE customers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT,
  address TEXT,
  notes TEXT,
  total_bookings INTEGER DEFAULT 0,
  total_spent NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Design Decisions**:
- `phone` is UNIQUE constraint (one customer record per phone number)
- `BIGSERIAL` primary key (auto-incrementing integer)
- `total_bookings` and `total_spent` are **denormalized aggregates** for performance
- Updated via triggers or application logic after each booking

### 1.4 Row-Level Security (RLS)

**Authentication Context**: 
- Public users: `anon` role (JWT with `role: 'anon'`)
- Admin users: Manual authentication check in frontend (no actual auth table)

**RLS Policies** (`carwebitebooking/supabase/migrations/20240101000001_rls_policies.sql`):

```sql
-- Bookings: Public can insert (create bookings)
CREATE POLICY "Anyone can create bookings"
  ON bookings FOR INSERT
  TO anon
  WITH CHECK (true);

-- Bookings: Public can read their own (via email match)
CREATE POLICY "Anyone can read their bookings"
  ON bookings FOR SELECT
  TO anon
  USING (customer_email = current_setting('request.jwt.claims')::json->>'email');

-- Packages: Public read-only
CREATE POLICY "Anyone can view active packages"
  ON packages FOR SELECT
  TO anon
  USING (is_active = true);

-- Customers: Authenticated only
CREATE POLICY "Authenticated users can manage customers"
  ON customers FOR ALL
  TO authenticated
  USING (true);
```

**Security Analysis**:
- ❌ **VULNERABILITY**: Admin dashboard bypasses RLS by using `service_role` key client-side
- ⚠️ **RISK**: Service role key exposed in frontend env (`VITE_SUPABASE_SERVICE_KEY`)
- ✅ **MITIGATION**: Should use server-side Edge Functions for admin operations
- ✅ **Booking creation**: Properly uses `anon` key, no escalation possible

---

## 2. BOOKING WIDGET - COMPLETE TECHNICAL BREAKDOWN

### 2.1 Component Structure

**File**: `carwebitebooking/frontend/src/components/BookingWidget.jsx`

**Framework**: React 18 with Hooks
**Dependencies**:
- `react-datepicker` v4.x (calendar UI)
- `lucide-react` (icons)
- `@supabase/supabase-js` v2.x (database client)
- `date-fns` (date manipulation)

**State Management** (all local via `useState`):

```javascript
const [step, setStep] = useState(1);                    // Current form step (1-5)
const [serviceType, setServiceType] = useState('');     // 'mobile' | 'shop'
const [vehicleSize, setVehicleSize] = useState('');     // 'small' | 'medium' | 'large'
const [selectedDate, setSelectedDate] = useState(null); // Date object
const [selectedTime, setSelectedTime] = useState('');   // 'HH:MM' string
const [interiorPackage, setInteriorPackage] = useState(null); // Package object
const [exteriorPackage, setExteriorPackage] = useState(null); // Package object
const [packages, setPackages] = useState([]);           // Fetched from DB
const [availableSlots, setAvailableSlots] = useState([]); // Calculated time slots
const [customerInfo, setCustomerInfo] = useState({      // Form data
  name: '', phone: '', email: '', address: '', notes: '', hasWaterElectric: false
});
const [isSubmitting, setIsSubmitting] = useState(false);
const [errors, setErrors] = useState({});               // Validation errors
const [showThankYou, setShowThankYou] = useState(false);
const [totalPrice, setTotalPrice] = useState(0);        // Calculated price
const [totalDuration, setTotalDuration] = useState(0);  // Calculated minutes
```

### 2.2 Data Fetching on Mount

**Execution Flow**:

```javascript
useEffect(() => {
  const fetchPackages = async () => {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });
    
    if (!error) setPackages(data);
  };
  fetchPackages();
}, []);
```

**Query Details**:
- **Table**: `packages`
- **Filter**: `is_active = true`
- **Order**: By `price` ASC (cheapest first)
- **Auth**: Uses `anon` key (public read)
- **RLS**: Passes "view active packages" policy

### 2.3 Step 1: Service Type Selection

**UI**: Two large buttons (Mobile / Shop Location)

**Event Handler**:
```javascript
const handleServiceTypeSelect = (type) => {
  setServiceType(type);
  setStep(2); // Auto-advance
};
```

**Validation**: None (both options always valid)

**State Change**: 
- `serviceType` → 'mobile' or 'shop'
- `step` → 2

**Conditional Logic**: If `serviceType === 'mobile'`, Step 4 requires `address` field

### 2.4 Step 2: Vehicle Size Selection

**UI**: Three buttons (Small / Medium / Large)

**Pricing Logic** (hardcoded in frontend):
```javascript
const vehicleSizeFees = {
  small: 0,
  medium: 5,
  large: 10
};
```

**Event Handler**:
```javascript
const handleVehicleSizeSelect = (size) => {
  setVehicleSize(size);
  setStep(3);
};
```

**Price Calculation Trigger**: 
```javascript
useEffect(() => {
  const interiorPrice = interiorPackage?.price || 0;
  const exteriorPrice = exteriorPackage?.price || 0;
  const sizeFee = vehicleSizeFees[vehicleSize] || 0;
  const total = interiorPrice + exteriorPrice + sizeFee;
  
  setTotalPrice(total);
}, [interiorPackage, exteriorPackage, vehicleSize]);
```

**State Change**:
- `vehicleSize` → 'small' | 'medium' | 'large'
- `step` → 3

### 2.5 Step 3: Package Selection

**UI Structure**:
- Two sections: Exterior Detailing (top), Interior Detailing (bottom)
- Each shows 3 packages filtered by `package_type`
- "Skip Interior" / "Skip Exterior" buttons for non-combo bookings

**Package Filtering**:
```javascript
const exteriorPackages = packages.filter(pkg => pkg.package_type === 'exterior');
const interiorPackages = packages.filter(pkg => pkg.package_type === 'interior');
```

**Duration Calculation**:
```javascript
useEffect(() => {
  const interiorDuration = interiorPackage?.duration_minutes || 0;
  const exteriorDuration = exteriorPackage?.duration_minutes || 0;
  // Durations ADD (not overlap)
  setTotalDuration(interiorDuration + exteriorDuration);
}, [interiorPackage, exteriorPackage]);
```

**Selection Logic**:
```javascript
const handlePackageSelect = (pkg, type) => {
  if (type === 'interior') {
    setInteriorPackage(interiorPackage?.id === pkg.id ? null : pkg); // Toggle
  } else {
    setExteriorPackage(exteriorPackage?.id === pkg.id ? null : pkg);
  }
};
```

**Validation**:
```javascript
const canProceed = interiorPackage || exteriorPackage; // At least one required
```

**State Change**:
- `interiorPackage` → Package object or null
- `exteriorPackage` → Package object or null
- `totalDuration` → Sum of selected package durations
- `totalPrice` → Recalculated via useEffect
- `step` → 4 (on "Next" click)

### 2.6 Step 4: Date & Time Selection

**Date Picker Configuration**:
```javascript
<DatePicker
  selected={selectedDate}
  onChange={handleDateChange}
  minDate={new Date()} // Cannot book past dates
  maxDate={addDays(new Date(), 90)} // 90-day booking window
  filterDate={isDateAvailable} // Custom filter function
  inline
  calendarClassName="booking-calendar"
/>
```

**Date Availability Filter**:
```javascript
const isDateAvailable = (date) => {
  const day = date.getDay();
  // 0 = Sunday, 6 = Saturday
  return day !== 0 && day !== 6; // Weekdays only (Mon-Fri)
};
```

**Time Slot Generation** (triggered on date selection):

```javascript
const handleDateChange = async (date) => {
  setSelectedDate(date);
  setSelectedTime(''); // Reset time selection
  
  // Fetch existing bookings for this date
  const { data: existingBookings } = await supabase
    .from('bookings')
    .select('start_time, end_time')
    .eq('booking_date', format(date, 'yyyy-MM-dd'))
    .neq('status', 'cancelled');
  
  const slots = generateAvailableSlots(date, existingBookings);
  setAvailableSlots(slots);
};
```

**Slot Generation Algorithm**:

```javascript
const generateAvailableSlots = (date, existingBookings) => {
  const slots = [];
  const businessHours = { start: 15, end: 18 }; // 3 PM - 6 PM
  
  // Generate 30-minute intervals
  for (let hour = businessHours.start; hour < businessHours.end; hour++) {
    for (let minute of [0, 30]) {
      const slotStart = new Date(date);
      slotStart.setHours(hour, minute, 0, 0);
      
      // Calculate slot end time based on total duration
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + totalDuration);
      
      // Check if slot end exceeds business hours
      const endHour = slotEnd.getHours();
      const endMinute = slotEnd.getMinutes();
      const endTime = endHour + endMinute / 60;
      
      if (endTime > businessHours.end) continue; // Slot too late
      
      // Check for conflicts with existing bookings
      const hasConflict = existingBookings.some(booking => {
        const bookingStart = parseTime(booking.start_time);
        const bookingEnd = parseTime(booking.end_time);
        
        // Conflict if:
        // 1. New slot starts during existing booking
        // 2. New slot ends during existing booking
        // 3. New slot completely contains existing booking
        return (
          (slotStart >= bookingStart && slotStart < bookingEnd) ||
          (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
          (slotStart <= bookingStart && slotEnd >= bookingEnd)
        );
      });
      
      if (!hasConflict) {
        slots.push({
          time: format(slotStart, 'HH:mm'),
          display: format(slotStart, 'h:mm a')
        });
      }
    }
  }
  
  return slots;
};

const parseTime = (timeString) => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};
```

**Conflict Detection Logic Explained**:

Given:
- Existing booking: 3:00 PM - 4:30 PM
- New booking duration: 60 minutes

Scenarios:
1. **Slot 3:30 PM**: Would end at 4:30 PM → **CONFLICT** (overlaps existing)
2. **Slot 4:30 PM**: Would end at 5:30 PM → **AVAILABLE** (starts after existing ends)
3. **Slot 2:30 PM**: Would end at 3:30 PM → **CONFLICT** (ends during existing)

**Time Selection Handler**:
```javascript
const handleTimeSelect = (time) => {
  setSelectedTime(time);
  setStep(5); // Auto-advance
};
```

**State Changes**:
- `selectedDate` → Date object
- `selectedTime` → 'HH:MM' string
- `availableSlots` → Array of available time objects
- `step` → 5

### 2.7 Step 5: Customer Information

**Form Fields**:
```javascript
<input 
  type="text" 
  value={customerInfo.name}
  onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
  required 
/>
<input 
  type="tel" 
  value={customerInfo.phone}
  pattern="[0-9]{10}" // Validates 10-digit US phone
  required 
/>
<input 
  type="email" 
  value={customerInfo.email}
  required 
/>
{serviceType === 'mobile' && (
  <input 
    type="text" 
    value={customerInfo.address}
    required 
  />
)}
<textarea 
  value={customerInfo.notes}
  placeholder="Any special requests?" 
/>
{serviceType === 'mobile' && (
  <label>
    <input 
      type="checkbox" 
      checked={customerInfo.hasWaterElectric}
      onChange={(e) => setCustomerInfo({...customerInfo, hasWaterElectric: e.target.checked})}
    />
    I have water and electricity available
  </label>
)}
```

**Validation Logic**:
```javascript
const validateForm = () => {
  const newErrors = {};
  
  if (!customerInfo.name.trim()) {
    newErrors.name = 'Name is required';
  }
  
  if (!customerInfo.phone.trim()) {
    newErrors.phone = 'Phone number is required';
  } else if (!/^\d{10}$/.test(customerInfo.phone.replace(/\D/g, ''))) {
    newErrors.phone = 'Please enter a valid 10-digit phone number';
  }
  
  if (!customerInfo.email.trim()) {
    newErrors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerInfo.email)) {
    newErrors.email = 'Please enter a valid email address';
  }
  
  if (serviceType === 'mobile' && !customerInfo.address.trim()) {
    newErrors.address = 'Address is required for mobile service';
  }
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

**Submit Handler**:
```javascript
const handleSubmit = async () => {
  if (!validateForm()) {
    return; // Show errors, don't submit
  }
  
  setIsSubmitting(true);
  
  try {
    // Calculate end time
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const startTime = new Date(selectedDate);
    startTime.setHours(hours, minutes, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + totalDuration);
    
    // Prepare payload
    const bookingData = {
      customer_name: customerInfo.name.trim(),
      customer_phone: customerInfo.phone.replace(/\D/g, ''), // Strip formatting
      customer_email: customerInfo.email.trim().toLowerCase(),
      customer_address: serviceType === 'mobile' ? customerInfo.address.trim() : null,
      service_type: serviceType,
      vehicle_size: vehicleSize,
      interior_package_id: interiorPackage?.id || null,
      exterior_package_id: exteriorPackage?.id || null,
      has_water_electric: serviceType === 'mobile' ? customerInfo.hasWaterElectric : false,
      customer_notes: customerInfo.notes.trim() || null,
      booking_date: format(selectedDate, 'yyyy-MM-dd'),
      start_time: format(startTime, 'HH:mm:ss'),
      end_time: format(endTime, 'HH:mm:ss'),
      status: 'pending' // Admin must confirm
    };
    
    // Call Edge Function (NOT direct DB insert)
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-booking`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(bookingData)
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Booking failed');
    }
    
    const result = await response.json();
    
    // Success state
    setShowThankYou(true);
    
    // Reset form after 5 seconds
    setTimeout(() => {
      resetForm();
    }, 5000);
    
  } catch (error) {
    console.error('Booking error:', error);
    setErrors({ submit: error.message || 'Something went wrong. Please try again.' });
  } finally {
    setIsSubmitting(false);
  }
};
```

**Why Edge Function Instead of Direct Insert?**
1. **Business Logic**: Price calculation, duration validation, conflict checking
2. **Customer Auto-Creation**: Automatically creates/updates customer record
3. **Email Notifications**: Sends emails to customer and owner
4. **Calendar Integration**: Creates Google Calendar event (if configured)
5. **Data Integrity**: Server-side validation prevents tampering

---

## 3. EDGE FUNCTION: `create-booking`

**File**: `carwebitebooking/supabase/functions/create-booking/index.ts`

**Runtime**: Deno (TypeScript)

**Authentication**: Public endpoint (uses `anon` key)

### 3.1 Request Handler

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve
```


## License: unknown
https://github.com/mugoooz/donation-platform-front/blob/391be762d8883e1250fedcd1d4dd8116e5042e08/src/components/LoginForm.js

```
# Complete Technical Breakdown: Car Wash Booking System

## Project Architecture Overview

This is a **React-based single-page application** integrated with **Supabase** as the backend-as-a-service platform. The system consists of:

1. **Customer-facing booking widget** (public)
2. **Admin dashboard** (authenticated)
3. **Supabase Edge Functions** (serverless backend)
4. **PostgreSQL database** via Supabase
5. **Email notifications** via Resend API

---

## 1. DATABASE SCHEMA & TABLES

### 1.1 `bookings` Table
**Location**: `carwebitebooking/supabase/migrations/20240101000000_initial_schema.sql`

```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_address TEXT,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  total_duration_minutes INTEGER NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('mobile', 'shop')),
  vehicle_size TEXT NOT NULL CHECK (vehicle_size IN ('small', 'medium', 'large')),
  vehicle_size_fee NUMERIC(10,2) DEFAULT 0,
  interior_package_id UUID REFERENCES packages(id),
  exterior_package_id UUID REFERENCES packages(id),
  subtotal NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  has_water_electric BOOLEAN DEFAULT false,
  customer_notes TEXT,
  google_calendar_event_id TEXT,
  ics_file_sent BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  final_amount NUMERIC(10,2),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  line_items JSONB,
  payment_notes TEXT,
  finalized_at TIMESTAMPTZ
);
```

**Key Design Decisions**:
- `id` is UUID for security (non-sequential, unpredictable)
- `customer_phone` not unique (allows repeat customers)
- `service_type` enum constraint enforces valid values
- `vehicle_size_fee` stored separately for price transparency
- Foreign keys to `packages` table with `ON DELETE SET NULL` (if package deleted, booking retains price but loses reference)
- `status` and `payment_status` separate fields for business logic flexibility
- `line_items` as JSONB for flexible pricing breakdown
- `finalized_at` timestamp tracks when admin confirmed final pricing

### 1.2 `packages` Table
**Location**: Same migration file

```sql
CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  package_type TEXT NOT NULL CHECK (package_type IN ('interior', 'exterior')),
  price NUMERIC(10,2) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  description TEXT,
  features TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Initial Data**:
- 3 interior packages: Standard ($20, 30min), Deluxe ($40, 45min), Ultimate ($60, 60min)
- 3 exterior packages: Standard ($20, 30min), Deluxe ($35, 45min), Ultimate ($50, 60min)

### 1.3 `customers` Table
**Location**: `carwebitebooking/supabase/migrations/20240103000000_add_customers_table.sql`

```sql
CREATE TABLE customers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT,
  address TEXT,
  notes TEXT,
  total_bookings INTEGER DEFAULT 0,
  total_spent NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Design Decisions**:
- `phone` is UNIQUE constraint (one customer record per phone number)
- `BIGSERIAL` primary key (auto-incrementing integer)
- `total_bookings` and `total_spent` are **denormalized aggregates** for performance
- Updated via triggers or application logic after each booking

### 1.4 Row-Level Security (RLS)

**Authentication Context**: 
- Public users: `anon` role (JWT with `role: 'anon'`)
- Admin users: Manual authentication check in frontend (no actual auth table)

**RLS Policies** (`carwebitebooking/supabase/migrations/20240101000001_rls_policies.sql`):

```sql
-- Bookings: Public can insert (create bookings)
CREATE POLICY "Anyone can create bookings"
  ON bookings FOR INSERT
  TO anon
  WITH CHECK (true);

-- Bookings: Public can read their own (via email match)
CREATE POLICY "Anyone can read their bookings"
  ON bookings FOR SELECT
  TO anon
  USING (customer_email = current_setting('request.jwt.claims')::json->>'email');

-- Packages: Public read-only
CREATE POLICY "Anyone can view active packages"
  ON packages FOR SELECT
  TO anon
  USING (is_active = true);

-- Customers: Authenticated only
CREATE POLICY "Authenticated users can manage customers"
  ON customers FOR ALL
  TO authenticated
  USING (true);
```

**Security Analysis**:
- ❌ **VULNERABILITY**: Admin dashboard bypasses RLS by using `service_role` key client-side
- ⚠️ **RISK**: Service role key exposed in frontend env (`VITE_SUPABASE_SERVICE_KEY`)
- ✅ **MITIGATION**: Should use server-side Edge Functions for admin operations
- ✅ **Booking creation**: Properly uses `anon` key, no escalation possible

---

## 2. BOOKING WIDGET - COMPLETE TECHNICAL BREAKDOWN

### 2.1 Component Structure

**File**: `carwebitebooking/frontend/src/components/BookingWidget.jsx`

**Framework**: React 18 with Hooks
**Dependencies**:
- `react-datepicker` v4.x (calendar UI)
- `lucide-react` (icons)
- `@supabase/supabase-js` v2.x (database client)
- `date-fns` (date manipulation)

**State Management** (all local via `useState`):

```javascript
const [step, setStep] = useState(1);                    // Current form step (1-5)
const [serviceType, setServiceType] = useState('');     // 'mobile' | 'shop'
const [vehicleSize, setVehicleSize] = useState('');     // 'small' | 'medium' | 'large'
const [selectedDate, setSelectedDate] = useState(null); // Date object
const [selectedTime, setSelectedTime] = useState('');   // 'HH:MM' string
const [interiorPackage, setInteriorPackage] = useState(null); // Package object
const [exteriorPackage, setExteriorPackage] = useState(null); // Package object
const [packages, setPackages] = useState([]);           // Fetched from DB
const [availableSlots, setAvailableSlots] = useState([]); // Calculated time slots
const [customerInfo, setCustomerInfo] = useState({      // Form data
  name: '', phone: '', email: '', address: '', notes: '', hasWaterElectric: false
});
const [isSubmitting, setIsSubmitting] = useState(false);
const [errors, setErrors] = useState({});               // Validation errors
const [showThankYou, setShowThankYou] = useState(false);
const [totalPrice, setTotalPrice] = useState(0);        // Calculated price
const [totalDuration, setTotalDuration] = useState(0);  // Calculated minutes
```

### 2.2 Data Fetching on Mount

**Execution Flow**:

```javascript
useEffect(() => {
  const fetchPackages = async () => {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });
    
    if (!error) setPackages(data);
  };
  fetchPackages();
}, []);
```

**Query Details**:
- **Table**: `packages`
- **Filter**: `is_active = true`
- **Order**: By `price` ASC (cheapest first)
- **Auth**: Uses `anon` key (public read)
- **RLS**: Passes "view active packages" policy

### 2.3 Step 1: Service Type Selection

**UI**: Two large buttons (Mobile / Shop Location)

**Event Handler**:
```javascript
const handleServiceTypeSelect = (type) => {
  setServiceType(type);
  setStep(2); // Auto-advance
};
```

**Validation**: None (both options always valid)

**State Change**: 
- `serviceType` → 'mobile' or 'shop'
- `step` → 2

**Conditional Logic**: If `serviceType === 'mobile'`, Step 4 requires `address` field

### 2.4 Step 2: Vehicle Size Selection

**UI**: Three buttons (Small / Medium / Large)

**Pricing Logic** (hardcoded in frontend):
```javascript
const vehicleSizeFees = {
  small: 0,
  medium: 5,
  large: 10
};
```

**Event Handler**:
```javascript
const handleVehicleSizeSelect = (size) => {
  setVehicleSize(size);
  setStep(3);
};
```

**Price Calculation Trigger**: 
```javascript
useEffect(() => {
  const interiorPrice = interiorPackage?.price || 0;
  const exteriorPrice = exteriorPackage?.price || 0;
  const sizeFee = vehicleSizeFees[vehicleSize] || 0;
  const total = interiorPrice + exteriorPrice + sizeFee;
  
  setTotalPrice(total);
}, [interiorPackage, exteriorPackage, vehicleSize]);
```

**State Change**:
- `vehicleSize` → 'small' | 'medium' | 'large'
- `step` → 3

### 2.5 Step 3: Package Selection

**UI Structure**:
- Two sections: Exterior Detailing (top), Interior Detailing (bottom)
- Each shows 3 packages filtered by `package_type`
- "Skip Interior" / "Skip Exterior" buttons for non-combo bookings

**Package Filtering**:
```javascript
const exteriorPackages = packages.filter(pkg => pkg.package_type === 'exterior');
const interiorPackages = packages.filter(pkg => pkg.package_type === 'interior');
```

**Duration Calculation**:
```javascript
useEffect(() => {
  const interiorDuration = interiorPackage?.duration_minutes || 0;
  const exteriorDuration = exteriorPackage?.duration_minutes || 0;
  // Durations ADD (not overlap)
  setTotalDuration(interiorDuration + exteriorDuration);
}, [interiorPackage, exteriorPackage]);
```

**Selection Logic**:
```javascript
const handlePackageSelect = (pkg, type) => {
  if (type === 'interior') {
    setInteriorPackage(interiorPackage?.id === pkg.id ? null : pkg); // Toggle
  } else {
    setExteriorPackage(exteriorPackage?.id === pkg.id ? null : pkg);
  }
};
```

**Validation**:
```javascript
const canProceed = interiorPackage || exteriorPackage; // At least one required
```

**State Change**:
- `interiorPackage` → Package object or null
- `exteriorPackage` → Package object or null
- `totalDuration` → Sum of selected package durations
- `totalPrice` → Recalculated via useEffect
- `step` → 4 (on "Next" click)

### 2.6 Step 4: Date & Time Selection

**Date Picker Configuration**:
```javascript
<DatePicker
  selected={selectedDate}
  onChange={handleDateChange}
  minDate={new Date()} // Cannot book past dates
  maxDate={addDays(new Date(), 90)} // 90-day booking window
  filterDate={isDateAvailable} // Custom filter function
  inline
  calendarClassName="booking-calendar"
/>
```

**Date Availability Filter**:
```javascript
const isDateAvailable = (date) => {
  const day = date.getDay();
  // 0 = Sunday, 6 = Saturday
  return day !== 0 && day !== 6; // Weekdays only (Mon-Fri)
};
```

**Time Slot Generation** (triggered on date selection):

```javascript
const handleDateChange = async (date) => {
  setSelectedDate(date);
  setSelectedTime(''); // Reset time selection
  
  // Fetch existing bookings for this date
  const { data: existingBookings } = await supabase
    .from('bookings')
    .select('start_time, end_time')
    .eq('booking_date', format(date, 'yyyy-MM-dd'))
    .neq('status', 'cancelled');
  
  const slots = generateAvailableSlots(date, existingBookings);
  setAvailableSlots(slots);
};
```

**Slot Generation Algorithm**:

```javascript
const generateAvailableSlots = (date, existingBookings) => {
  const slots = [];
  const businessHours = { start: 15, end: 18 }; // 3 PM - 6 PM
  
  // Generate 30-minute intervals
  for (let hour = businessHours.start; hour < businessHours.end; hour++) {
    for (let minute of [0, 30]) {
      const slotStart = new Date(date);
      slotStart.setHours(hour, minute, 0, 0);
      
      // Calculate slot end time based on total duration
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + totalDuration);
      
      // Check if slot end exceeds business hours
      const endHour = slotEnd.getHours();
      const endMinute = slotEnd.getMinutes();
      const endTime = endHour + endMinute / 60;
      
      if (endTime > businessHours.end) continue; // Slot too late
      
      // Check for conflicts with existing bookings
      const hasConflict = existingBookings.some(booking => {
        const bookingStart = parseTime(booking.start_time);
        const bookingEnd = parseTime(booking.end_time);
        
        // Conflict if:
        // 1. New slot starts during existing booking
        // 2. New slot ends during existing booking
        // 3. New slot completely contains existing booking
        return (
          (slotStart >= bookingStart && slotStart < bookingEnd) ||
          (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
          (slotStart <= bookingStart && slotEnd >= bookingEnd)
        );
      });
      
      if (!hasConflict) {
        slots.push({
          time: format(slotStart, 'HH:mm'),
          display: format(slotStart, 'h:mm a')
        });
      }
    }
  }
  
  return slots;
};

const parseTime = (timeString) => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};
```

**Conflict Detection Logic Explained**:

Given:
- Existing booking: 3:00 PM - 4:30 PM
- New booking duration: 60 minutes

Scenarios:
1. **Slot 3:30 PM**: Would end at 4:30 PM → **CONFLICT** (overlaps existing)
2. **Slot 4:30 PM**: Would end at 5:30 PM → **AVAILABLE** (starts after existing ends)
3. **Slot 2:30 PM**: Would end at 3:30 PM → **CONFLICT** (ends during existing)

**Time Selection Handler**:
```javascript
const handleTimeSelect = (time) => {
  setSelectedTime(time);
  setStep(5); // Auto-advance
};
```

**State Changes**:
- `selectedDate` → Date object
- `selectedTime` → 'HH:MM' string
- `availableSlots` → Array of available time objects
- `step` → 5

### 2.7 Step 5: Customer Information

**Form Fields**:
```javascript
<input 
  type="text" 
  value={customerInfo.name}
  onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
  required 
/>
<input 
  type="tel" 
  value={customerInfo.phone}
  pattern="[0-9]{10}" // Validates 10-digit US phone
  required 
/>
<input 
  type="email" 
  value={customerInfo.email}
  required 
/>
{serviceType === 'mobile' && (
  <input 
    type="text" 
    value={customerInfo.address}
    required 
  />
)}
<textarea 
  value={customerInfo.notes}
  placeholder="Any special requests?" 
/>
{serviceType === 'mobile' && (
  <label>
    <input 
      type="checkbox" 
      checked={customerInfo.hasWaterElectric}
      onChange={(e) => setCustomerInfo({...customerInfo, hasWaterElectric: e.target.checked})}
    />
    I have water and electricity available
  </label>
)}
```

**Validation Logic**:
```javascript
const validateForm = () => {
  const newErrors = {};
  
  if (!customerInfo.name.trim()) {
    newErrors.name = 'Name is required';
  }
  
  if (!customerInfo.phone.trim()) {
    newErrors.phone = 'Phone number is required';
  } else if (!/^\d{10}$/.test(customerInfo.phone.replace(/\D/g, ''))) {
    newErrors.phone = 'Please enter a valid 10-digit phone number';
  }
  
  if (!customerInfo.email.trim()) {
    newErrors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerInfo.email)) {
    newErrors.email = 'Please enter a valid email address';
  }
  
  if (serviceType === 'mobile' && !customerInfo.address.trim()) {
    newErrors.address = 'Address is required for mobile service';
  }
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

**Submit Handler**:
```javascript
const handleSubmit = async () => {
  if (!validateForm()) {
    return; // Show errors, don't submit
  }
  
  setIsSubmitting(true);
  
  try {
    // Calculate end time
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const startTime = new Date(selectedDate);
    startTime.setHours(hours, minutes, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + totalDuration);
    
    // Prepare payload
    const bookingData = {
      customer_name: customerInfo.name.trim(),
      customer_phone: customerInfo.phone.replace(/\D/g, ''), // Strip formatting
      customer_email: customerInfo.email.trim().toLowerCase(),
      customer_address: serviceType === 'mobile' ? customerInfo.address.trim() : null,
      service_type: serviceType,
      vehicle_size: vehicleSize,
      interior_package_id: interiorPackage?.id || null,
      exterior_package_id: exteriorPackage?.id || null,
      has_water_electric: serviceType === 'mobile' ? customerInfo.hasWaterElectric : false,
      customer_notes: customerInfo.notes.trim() || null,
      booking_date: format(selectedDate, 'yyyy-MM-dd'),
      start_time: format(startTime, 'HH:mm:ss'),
      end_time: format(endTime, 'HH:mm:ss'),
      status: 'pending' // Admin must confirm
    };
    
    // Call Edge Function (NOT direct DB insert)
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-booking`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(bookingData)
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Booking failed');
    }
    
    const result = await response.json();
    
    // Success state
    setShowThankYou(true);
    
    // Reset form after 5 seconds
    setTimeout(() => {
      resetForm();
    }, 5000);
    
  } catch (error) {
    console.error('Booking error:', error);
    setErrors({ submit: error.message || 'Something went wrong. Please try again.' });
  } finally {
    setIsSubmitting(false);
  }
};
```

**Why Edge Function Instead of Direct Insert?**
1. **Business Logic**: Price calculation, duration validation, conflict checking
2. **Customer Auto-Creation**: Automatically creates/updates customer record
3. **Email Notifications**: Sends emails to customer and owner
4. **Calendar Integration**: Creates Google Calendar event (if configured)
5. **Data Integrity**: Server-side validation prevents tampering

---

## 3. EDGE FUNCTION: `create-booking`

**File**: `carwebitebooking/supabase/functions/create-booking/index.ts`

**Runtime**: Deno (TypeScript)

**Authentication**: Public endpoint (uses `anon` key)

### 3.1 Request Handler

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const bookingData = await req.json();
    
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Elevated permissions
    );
    
    // Step 1: Calculate pricing
    const pricing = await calculatePricing(supabaseClient, bookingData);
    
    // Step 2: Create/update customer
    const customer = await upsertCustomer(supabaseClient, bookingData);
    
    // Step 3: Insert booking
    const booking = await insertBooking(supabaseClient, bookingData, pricing);
    
    // Step 4: Send notifications (async, don't wait)
    sendNotifications(booking).catch(console.error);
    
    return new Response(
      JSON.stringify(booking),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### 3.2 Pricing Calculation

```typescript
async function calculatePricing(supabase, bookingData) {
  const { interior_package_id, exterior_package_id, vehicle_size } = bookingData;
  
  let subtotal = 0;
  let totalDuration = 0;
  
  // Fetch package prices
  if (interior_package_id) {
    const { data: pkg } = await supabase
      .from('packages')
      .select('price, duration_minutes')
      .eq('id', interior_package_id)
      .single();
    
    if (pkg) {
      subtotal += pkg.price;
      totalDuration += pkg.duration_minutes;
    }
  }
  
  if (exterior_package_id) {
    const { data: pkg } = await supabase
      .from('packages')
      .select('price, duration_minutes')
      .eq('id', exterior_package_id)
      .single();
    
    if (pkg) {
      subtotal += pkg.price;
      totalDuration += pkg.duration_minutes;
    }
  }
  
  // Add vehicle size fee
  const vehicleSizeFees = {
    small: 0,
    medium: 5,
    large: 10
  };
  
  const sizeFee = vehicleSizeFees[vehicle_size] || 0;
  const totalPrice = subtotal + sizeFee;
  
  return {
    subtotal,
    vehicle_size_fee: sizeFee,
    total_price: totalPrice,
    total_duration_minutes: totalDuration
  };
}
```

### 3.3 Customer Upsert Logic

```typescript
async function upsertCustomer(supabase, bookingData) {
  const { customer_name, customer_phone, customer_email, customer_address } = bookingData;
  
  // Check if customer exists (by phone)
  const { data: existingCustomer, error: checkError } = await supabase
    .from('customers')
    .select('*')
    .eq('phone', customer_phone)
    .maybeSingle(); // Returns null if not found (doesn't throw error)
  
  if (checkError && checkError.code !== 'PGRST116') {
    // PGRST116 = no rows returned (expected)
    throw checkError;
  }
  
  if (existingCustomer) {
    console.log('Customer already exists:', existingCustomer.id);
    
    // Update customer info (email/address may have changed)
    const { data: updatedCustomer } = await supabase
      .from('customers')
      .update({
        name: customer_name,
        email: customer_email,
        address: customer_address,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingCustomer.id)
      .select()
      .single();
    
    return updatedCustomer || existingCustomer;
  }
  
  // Create new customer
  const { data: newCustomer, error: insertError } = await supabase
    .from('customers')
    .insert([{
      name: customer_name,
      phone: customer_phone,
      email: customer_email,
      address: customer_address,
      total_bookings: 0,
      total_spent: 0
    }])
    .select()
    .single();
  
  if (insertError) throw insertError;
  
  console.log('New customer created:', newCustomer.id);
  return newCustomer;
}
```

**Key Fix**: Changed `.single()` to `.maybeSingle()` on line 203 of the original code. 

**Why?**
- `.single()` throws error if 0 rows returned → customer creation was silently failing
- `.maybeSingle()` returns `null` if 0 rows → proper check for non-existent customer

### 3.4 Booking Insertion

```typescript
async function insertBooking(supabase, bookingData, pricing) {
  const { data: booking, error } = await supabase
    .from('bookings')
    .insert([{
      ...bookingData,
      ...pricing,
      status: 'confirmed', // Auto-confirm (or use 'pending' for manual approval)
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])
    .select()
    .single();
  
  if (error) {
    console.error('Insert error:', error);
    throw new Error('Failed to create booking: ' + error.message);
  }
  
  console.log('Booking created successfully:', booking.id);
  return booking;
}
```

### 3.5 Email Notifications

```typescript
async function sendNotifications(booking) {
  const SEND_EMAIL_URL = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`;
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
  
  // Customer confirmation email
  try {
    const customerEmailResponse = await fetch(SEND_EMAIL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        to: booking.customer_email,
        subject: 'Booking Confirmation - Andrew\'s Car Wash',
        body: generateCustomerEmailHTML(booking)
      })
    });
    
    if (customerEmailResponse.ok) {
      console.log('✅ Customer confirmation email sent successfully');
    } else {
      const errorText = await customerEmailResponse.text();
      console.error('❌ Failed to send customer email:', errorText);
    }
  } catch (error) {
    console.error('❌ Email error:', error);
  }
  
  // Owner notification email
  const OWNER_EMAIL = Deno.env.get('OWNER_EMAIL') || 'andrewswashing@gmail.com';
  
  try {
    const ownerEmailResponse = await fetch(SEND_EMAIL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        to: OWNER_EMAIL,
        subject: `New Booking: ${booking.customer_name}`,
        body: generateOwnerEmailHTML(booking)
      })
    });
    
    if (ownerEmailResponse.ok) {
      console.log('✅ Owner notification email sent successfully');
    } else {
      const errorText = await ownerEmailResponse.text();
      console.error('❌ Failed to send owner email:', errorText);
    }
  } catch (error) {
    console.error('❌ Email error:', error);
  }
}
```

---

## 4. EDGE FUNCTION: `send-email`

**File**: `carwebitebooking/supabase/functions/send-email/index.ts`

**Email Provider**: Resend (https://resend.com)

**Authentication**: Public endpoint (no JWT validation to allow internal calls)

### 4.1 Request Handler

```typescript
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { to, subject, body } = await req.json();
    
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'bookings@andrew.us.kg';
    
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured');
    }
    
    // Call Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `Andrew's Car Wash <${FROM_EMAIL}>`,
        to: [to],
        subject: subject,
        html: body
      })
    });
    
    const result = await resendResponse.json();
    
    if (!resendResponse.ok) {
      throw new Error(result.message || 'Failed to send email');
    }
    
    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully', id: result.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Send email error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### 4.2 Email Templates

**Customer Confirmation Email**:
```typescript
function generateCustomerEmailHTML(booking) {
  const dateStr = new Date(booking.booking_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                  color: white; padding: 30px; text-align: center; }
        .content { background: #f9f9f9; padding: 30px; }
        .details { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Booking Confirmed! 🚗✨</h1>
        </div>
        <div class="content">
          <p>Hi ${booking.customer_name},</p>
          <p>Your car wash appointment has been confirmed!</p>
          
          <div class="details">
            <h3>Booking Details</h3>
            <p><strong>Date:</strong> ${dateStr}</p>
            <p><strong>Time:</strong> ${booking.start_time}</p>
            <p><strong>Service:</strong> ${booking.service_type === 'mobile' ? 'Mobile Service' : 'Shop Location'}</p>
            ${booking.service_type === 'mobile' ? `<p><strong>Address:</strong> ${booking.customer_address}</p>` : ''}
            <p><strong>Vehicle Size:</strong> ${booking.vehicle_size}</p>
            <p><strong>Duration:</strong> ${booking.total_duration_minutes} minutes</p>
            <p><strong>Total Price:</strong> $${booking.total_price}</p>
          </div>
          
          <p>We'll send you a reminder 24 hours before your appointment.</p>
          <p>If you need to reschedule or cancel, please contact us at least 24 hours in advance.</p>
        </div>
        <div class="footer">
          <p>Andrew's Car Wash | (562) 310-1075 | andrewswashing@gmail.com</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
```

**Owner Notification Email** (with Apple Calendar link):
```typescript
function generateOwnerEmailHTML(booking) {
  const dateStr = new Date(booking.booking_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Generate ICS file content
  const icsContent = generateICS(booking);
  const icsDataURI = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 30px; text-align: center; }
        .content { background: #f9f9f9; padding: 30px; }
        .details { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .calendar-btn { display: inline-block; background: #10b981; color: white; 
                        padding: 12px 24px; text-decoration: none; border-radius: 6px; 
                        margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔔 New Booking Received</h1>
        </div>
        <div class="content">
          <div class="details">
            <h3>Customer Information</h3>
            <p><strong>Name:</strong> ${booking.customer_name}</p>
            <p><strong>Phone:</strong> ${booking.customer_phone}</p>
            <p><strong>Email:</strong> ${booking.customer_email}</p>
            ${booking.customer_address ? `<p><strong>Address:</strong> ${booking.customer_address}</p>` : ''}
          </div>
          
          <div class="details">
            <h3>Service Details</h3>
            <p><strong>Date:</strong> ${dateStr}</p>
            <p><strong>Time:</strong> ${booking.start_time} - ${booking.end_time}</p>
            <p><strong>Service Type:</strong> ${booking.service_type === 'mobile' ? 'Mobile Service' : 'Shop Location'}</p>
            <p><strong>Vehicle Size:</strong> ${booking.vehicle_size}</p>
            <p><strong>Duration:</strong> ${booking.total_duration_minutes} minutes</p>
            <p><strong>Total Price:</strong> $${booking.total_price}</p>
            ${booking.customer_notes ? `<p><strong>Notes:</strong> ${booking.customer_notes}</p>` : ''}
          </div>
          
          <div style="text-align: center;">
            <a href="${icsDataURI}" download="booking-${booking.id}.ics" class="calendar-btn">
              📅 Add to Apple Calendar
            </a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateICS(booking) {
  const startDate = new Date(`${booking.booking_date}T${booking.start_time}`);
  const endDate = new Date(`${booking.booking_date}T${booking.end_time}`);
  
  // Format as YYYYMMDDTHHMMSS
  const formatICSDate = (date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };
  
  const location = booking.service_type === 'mobile' 
    ? booking.customer_address 
    : 'Andrew\'s Car Wash - Shop Location';
  
  const description = `
Customer: ${booking.customer_name}
Phone: ${booking.customer_phone}
Email: ${booking.customer_email}
Service: ${booking.service_type}
Vehicle: ${booking.vehicle_size}
Price: $${booking.total_price}
${booking.customer_notes ? `Notes: ${booking.customer_notes}` : ''}
  `.trim();
  
  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Andrew's Car Wash//Booking System//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:${booking.id}@andrew.us.kg
DTSTAMP:${formatICSDate(new Date())}
DTSTART:${formatICSDate(startDate)}
DTEND:${formatICSDate(endDate)}
SUMMARY:Car Wash - ${booking.customer_name}
DESCRIPTION:${description.replace(/\n/g, '\\n')}
LOCATION:${location}
STATUS:CONFIRMED
SEQUENCE:0
BEGIN:VALARM
TRIGGER:-PT24H
DESCRIPTION:Reminder: Car wash appointment tomorrow
ACTION:DISPLAY
END:VALARM
END:VEVENT
END:VCALENDAR`;
}
```

**Domain Configuration for Resend**:
- Domain: `andrew.us.kg`
- DNS Records added to Netlify:
  - SPF: `v=spf1 include:_spf.resend.com ~all`
  - DKIM: TXT record (provided by Resend)
  - Return-Path: CNAME (provided by Resend)
- From address: `bookings@andrew.us.kg`
- Domain verified ✅

---

## 5. ADMIN DASHBOARD - COMPLETE TECHNICAL BREAKDOWN

**File**: `carwebitebooking/frontend/src/components/AdminDashboard.jsx`

### 5.1 Authentication System

**CRITICAL SECURITY ISSUE**: 
- No actual authentication system implemented
- Hardcoded password check in frontend: `password === 'andrew123'`
- Service role key exposed in browser environment variables

```javascript
const AdminDashboard = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const handleLogin = () => {
    if (password === 'andrew123') { // ❌ INSECURE
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Invalid password');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-96">
          <h2 className="text-2xl font-bold mb-4
```


## License: unknown
https://github.com/mugoooz/donation-platform-front/blob/391be762d8883e1250fedcd1d4dd8116e5042e08/src/components/LoginForm.js

```
# Complete Technical Breakdown: Car Wash Booking System

## Project Architecture Overview

This is a **React-based single-page application** integrated with **Supabase** as the backend-as-a-service platform. The system consists of:

1. **Customer-facing booking widget** (public)
2. **Admin dashboard** (authenticated)
3. **Supabase Edge Functions** (serverless backend)
4. **PostgreSQL database** via Supabase
5. **Email notifications** via Resend API

---

## 1. DATABASE SCHEMA & TABLES

### 1.1 `bookings` Table
**Location**: `carwebitebooking/supabase/migrations/20240101000000_initial_schema.sql`

```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_address TEXT,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  total_duration_minutes INTEGER NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('mobile', 'shop')),
  vehicle_size TEXT NOT NULL CHECK (vehicle_size IN ('small', 'medium', 'large')),
  vehicle_size_fee NUMERIC(10,2) DEFAULT 0,
  interior_package_id UUID REFERENCES packages(id),
  exterior_package_id UUID REFERENCES packages(id),
  subtotal NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  has_water_electric BOOLEAN DEFAULT false,
  customer_notes TEXT,
  google_calendar_event_id TEXT,
  ics_file_sent BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  final_amount NUMERIC(10,2),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  line_items JSONB,
  payment_notes TEXT,
  finalized_at TIMESTAMPTZ
);
```

**Key Design Decisions**:
- `id` is UUID for security (non-sequential, unpredictable)
- `customer_phone` not unique (allows repeat customers)
- `service_type` enum constraint enforces valid values
- `vehicle_size_fee` stored separately for price transparency
- Foreign keys to `packages` table with `ON DELETE SET NULL` (if package deleted, booking retains price but loses reference)
- `status` and `payment_status` separate fields for business logic flexibility
- `line_items` as JSONB for flexible pricing breakdown
- `finalized_at` timestamp tracks when admin confirmed final pricing

### 1.2 `packages` Table
**Location**: Same migration file

```sql
CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  package_type TEXT NOT NULL CHECK (package_type IN ('interior', 'exterior')),
  price NUMERIC(10,2) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  description TEXT,
  features TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Initial Data**:
- 3 interior packages: Standard ($20, 30min), Deluxe ($40, 45min), Ultimate ($60, 60min)
- 3 exterior packages: Standard ($20, 30min), Deluxe ($35, 45min), Ultimate ($50, 60min)

### 1.3 `customers` Table
**Location**: `carwebitebooking/supabase/migrations/20240103000000_add_customers_table.sql`

```sql
CREATE TABLE customers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT,
  address TEXT,
  notes TEXT,
  total_bookings INTEGER DEFAULT 0,
  total_spent NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Design Decisions**:
- `phone` is UNIQUE constraint (one customer record per phone number)
- `BIGSERIAL` primary key (auto-incrementing integer)
- `total_bookings` and `total_spent` are **denormalized aggregates** for performance
- Updated via triggers or application logic after each booking

### 1.4 Row-Level Security (RLS)

**Authentication Context**: 
- Public users: `anon` role (JWT with `role: 'anon'`)
- Admin users: Manual authentication check in frontend (no actual auth table)

**RLS Policies** (`carwebitebooking/supabase/migrations/20240101000001_rls_policies.sql`):

```sql
-- Bookings: Public can insert (create bookings)
CREATE POLICY "Anyone can create bookings"
  ON bookings FOR INSERT
  TO anon
  WITH CHECK (true);

-- Bookings: Public can read their own (via email match)
CREATE POLICY "Anyone can read their bookings"
  ON bookings FOR SELECT
  TO anon
  USING (customer_email = current_setting('request.jwt.claims')::json->>'email');

-- Packages: Public read-only
CREATE POLICY "Anyone can view active packages"
  ON packages FOR SELECT
  TO anon
  USING (is_active = true);

-- Customers: Authenticated only
CREATE POLICY "Authenticated users can manage customers"
  ON customers FOR ALL
  TO authenticated
  USING (true);
```

**Security Analysis**:
- ❌ **VULNERABILITY**: Admin dashboard bypasses RLS by using `service_role` key client-side
- ⚠️ **RISK**: Service role key exposed in frontend env (`VITE_SUPABASE_SERVICE_KEY`)
- ✅ **MITIGATION**: Should use server-side Edge Functions for admin operations
- ✅ **Booking creation**: Properly uses `anon` key, no escalation possible

---

## 2. BOOKING WIDGET - COMPLETE TECHNICAL BREAKDOWN

### 2.1 Component Structure

**File**: `carwebitebooking/frontend/src/components/BookingWidget.jsx`

**Framework**: React 18 with Hooks
**Dependencies**:
- `react-datepicker` v4.x (calendar UI)
- `lucide-react` (icons)
- `@supabase/supabase-js` v2.x (database client)
- `date-fns` (date manipulation)

**State Management** (all local via `useState`):

```javascript
const [step, setStep] = useState(1);                    // Current form step (1-5)
const [serviceType, setServiceType] = useState('');     // 'mobile' | 'shop'
const [vehicleSize, setVehicleSize] = useState('');     // 'small' | 'medium' | 'large'
const [selectedDate, setSelectedDate] = useState(null); // Date object
const [selectedTime, setSelectedTime] = useState('');   // 'HH:MM' string
const [interiorPackage, setInteriorPackage] = useState(null); // Package object
const [exteriorPackage, setExteriorPackage] = useState(null); // Package object
const [packages, setPackages] = useState([]);           // Fetched from DB
const [availableSlots, setAvailableSlots] = useState([]); // Calculated time slots
const [customerInfo, setCustomerInfo] = useState({      // Form data
  name: '', phone: '', email: '', address: '', notes: '', hasWaterElectric: false
});
const [isSubmitting, setIsSubmitting] = useState(false);
const [errors, setErrors] = useState({});               // Validation errors
const [showThankYou, setShowThankYou] = useState(false);
const [totalPrice, setTotalPrice] = useState(0);        // Calculated price
const [totalDuration, setTotalDuration] = useState(0);  // Calculated minutes
```

### 2.2 Data Fetching on Mount

**Execution Flow**:

```javascript
useEffect(() => {
  const fetchPackages = async () => {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });
    
    if (!error) setPackages(data);
  };
  fetchPackages();
}, []);
```

**Query Details**:
- **Table**: `packages`
- **Filter**: `is_active = true`
- **Order**: By `price` ASC (cheapest first)
- **Auth**: Uses `anon` key (public read)
- **RLS**: Passes "view active packages" policy

### 2.3 Step 1: Service Type Selection

**UI**: Two large buttons (Mobile / Shop Location)

**Event Handler**:
```javascript
const handleServiceTypeSelect = (type) => {
  setServiceType(type);
  setStep(2); // Auto-advance
};
```

**Validation**: None (both options always valid)

**State Change**: 
- `serviceType` → 'mobile' or 'shop'
- `step` → 2

**Conditional Logic**: If `serviceType === 'mobile'`, Step 4 requires `address` field

### 2.4 Step 2: Vehicle Size Selection

**UI**: Three buttons (Small / Medium / Large)

**Pricing Logic** (hardcoded in frontend):
```javascript
const vehicleSizeFees = {
  small: 0,
  medium: 5,
  large: 10
};
```

**Event Handler**:
```javascript
const handleVehicleSizeSelect = (size) => {
  setVehicleSize(size);
  setStep(3);
};
```

**Price Calculation Trigger**: 
```javascript
useEffect(() => {
  const interiorPrice = interiorPackage?.price || 0;
  const exteriorPrice = exteriorPackage?.price || 0;
  const sizeFee = vehicleSizeFees[vehicleSize] || 0;
  const total = interiorPrice + exteriorPrice + sizeFee;
  
  setTotalPrice(total);
}, [interiorPackage, exteriorPackage, vehicleSize]);
```

**State Change**:
- `vehicleSize` → 'small' | 'medium' | 'large'
- `step` → 3

### 2.5 Step 3: Package Selection

**UI Structure**:
- Two sections: Exterior Detailing (top), Interior Detailing (bottom)
- Each shows 3 packages filtered by `package_type`
- "Skip Interior" / "Skip Exterior" buttons for non-combo bookings

**Package Filtering**:
```javascript
const exteriorPackages = packages.filter(pkg => pkg.package_type === 'exterior');
const interiorPackages = packages.filter(pkg => pkg.package_type === 'interior');
```

**Duration Calculation**:
```javascript
useEffect(() => {
  const interiorDuration = interiorPackage?.duration_minutes || 0;
  const exteriorDuration = exteriorPackage?.duration_minutes || 0;
  // Durations ADD (not overlap)
  setTotalDuration(interiorDuration + exteriorDuration);
}, [interiorPackage, exteriorPackage]);
```

**Selection Logic**:
```javascript
const handlePackageSelect = (pkg, type) => {
  if (type === 'interior') {
    setInteriorPackage(interiorPackage?.id === pkg.id ? null : pkg); // Toggle
  } else {
    setExteriorPackage(exteriorPackage?.id === pkg.id ? null : pkg);
  }
};
```

**Validation**:
```javascript
const canProceed = interiorPackage || exteriorPackage; // At least one required
```

**State Change**:
- `interiorPackage` → Package object or null
- `exteriorPackage` → Package object or null
- `totalDuration` → Sum of selected package durations
- `totalPrice` → Recalculated via useEffect
- `step` → 4 (on "Next" click)

### 2.6 Step 4: Date & Time Selection

**Date Picker Configuration**:
```javascript
<DatePicker
  selected={selectedDate}
  onChange={handleDateChange}
  minDate={new Date()} // Cannot book past dates
  maxDate={addDays(new Date(), 90)} // 90-day booking window
  filterDate={isDateAvailable} // Custom filter function
  inline
  calendarClassName="booking-calendar"
/>
```

**Date Availability Filter**:
```javascript
const isDateAvailable = (date) => {
  const day = date.getDay();
  // 0 = Sunday, 6 = Saturday
  return day !== 0 && day !== 6; // Weekdays only (Mon-Fri)
};
```

**Time Slot Generation** (triggered on date selection):

```javascript
const handleDateChange = async (date) => {
  setSelectedDate(date);
  setSelectedTime(''); // Reset time selection
  
  // Fetch existing bookings for this date
  const { data: existingBookings } = await supabase
    .from('bookings')
    .select('start_time, end_time')
    .eq('booking_date', format(date, 'yyyy-MM-dd'))
    .neq('status', 'cancelled');
  
  const slots = generateAvailableSlots(date, existingBookings);
  setAvailableSlots(slots);
};
```

**Slot Generation Algorithm**:

```javascript
const generateAvailableSlots = (date, existingBookings) => {
  const slots = [];
  const businessHours = { start: 15, end: 18 }; // 3 PM - 6 PM
  
  // Generate 30-minute intervals
  for (let hour = businessHours.start; hour < businessHours.end; hour++) {
    for (let minute of [0, 30]) {
      const slotStart = new Date(date);
      slotStart.setHours(hour, minute, 0, 0);
      
      // Calculate slot end time based on total duration
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + totalDuration);
      
      // Check if slot end exceeds business hours
      const endHour = slotEnd.getHours();
      const endMinute = slotEnd.getMinutes();
      const endTime = endHour + endMinute / 60;
      
      if (endTime > businessHours.end) continue; // Slot too late
      
      // Check for conflicts with existing bookings
      const hasConflict = existingBookings.some(booking => {
        const bookingStart = parseTime(booking.start_time);
        const bookingEnd = parseTime(booking.end_time);
        
        // Conflict if:
        // 1. New slot starts during existing booking
        // 2. New slot ends during existing booking
        // 3. New slot completely contains existing booking
        return (
          (slotStart >= bookingStart && slotStart < bookingEnd) ||
          (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
          (slotStart <= bookingStart && slotEnd >= bookingEnd)
        );
      });
      
      if (!hasConflict) {
        slots.push({
          time: format(slotStart, 'HH:mm'),
          display: format(slotStart, 'h:mm a')
        });
      }
    }
  }
  
  return slots;
};

const parseTime = (timeString) => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};
```

**Conflict Detection Logic Explained**:

Given:
- Existing booking: 3:00 PM - 4:30 PM
- New booking duration: 60 minutes

Scenarios:
1. **Slot 3:30 PM**: Would end at 4:30 PM → **CONFLICT** (overlaps existing)
2. **Slot 4:30 PM**: Would end at 5:30 PM → **AVAILABLE** (starts after existing ends)
3. **Slot 2:30 PM**: Would end at 3:30 PM → **CONFLICT** (ends during existing)

**Time Selection Handler**:
```javascript
const handleTimeSelect = (time) => {
  setSelectedTime(time);
  setStep(5); // Auto-advance
};
```

**State Changes**:
- `selectedDate` → Date object
- `selectedTime` → 'HH:MM' string
- `availableSlots` → Array of available time objects
- `step` → 5

### 2.7 Step 5: Customer Information

**Form Fields**:
```javascript
<input 
  type="text" 
  value={customerInfo.name}
  onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
  required 
/>
<input 
  type="tel" 
  value={customerInfo.phone}
  pattern="[0-9]{10}" // Validates 10-digit US phone
  required 
/>
<input 
  type="email" 
  value={customerInfo.email}
  required 
/>
{serviceType === 'mobile' && (
  <input 
    type="text" 
    value={customerInfo.address}
    required 
  />
)}
<textarea 
  value={customerInfo.notes}
  placeholder="Any special requests?" 
/>
{serviceType === 'mobile' && (
  <label>
    <input 
      type="checkbox" 
      checked={customerInfo.hasWaterElectric}
      onChange={(e) => setCustomerInfo({...customerInfo, hasWaterElectric: e.target.checked})}
    />
    I have water and electricity available
  </label>
)}
```

**Validation Logic**:
```javascript
const validateForm = () => {
  const newErrors = {};
  
  if (!customerInfo.name.trim()) {
    newErrors.name = 'Name is required';
  }
  
  if (!customerInfo.phone.trim()) {
    newErrors.phone = 'Phone number is required';
  } else if (!/^\d{10}$/.test(customerInfo.phone.replace(/\D/g, ''))) {
    newErrors.phone = 'Please enter a valid 10-digit phone number';
  }
  
  if (!customerInfo.email.trim()) {
    newErrors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerInfo.email)) {
    newErrors.email = 'Please enter a valid email address';
  }
  
  if (serviceType === 'mobile' && !customerInfo.address.trim()) {
    newErrors.address = 'Address is required for mobile service';
  }
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

**Submit Handler**:
```javascript
const handleSubmit = async () => {
  if (!validateForm()) {
    return; // Show errors, don't submit
  }
  
  setIsSubmitting(true);
  
  try {
    // Calculate end time
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const startTime = new Date(selectedDate);
    startTime.setHours(hours, minutes, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + totalDuration);
    
    // Prepare payload
    const bookingData = {
      customer_name: customerInfo.name.trim(),
      customer_phone: customerInfo.phone.replace(/\D/g, ''), // Strip formatting
      customer_email: customerInfo.email.trim().toLowerCase(),
      customer_address: serviceType === 'mobile' ? customerInfo.address.trim() : null,
      service_type: serviceType,
      vehicle_size: vehicleSize,
      interior_package_id: interiorPackage?.id || null,
      exterior_package_id: exteriorPackage?.id || null,
      has_water_electric: serviceType === 'mobile' ? customerInfo.hasWaterElectric : false,
      customer_notes: customerInfo.notes.trim() || null,
      booking_date: format(selectedDate, 'yyyy-MM-dd'),
      start_time: format(startTime, 'HH:mm:ss'),
      end_time: format(endTime, 'HH:mm:ss'),
      status: 'pending' // Admin must confirm
    };
    
    // Call Edge Function (NOT direct DB insert)
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-booking`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(bookingData)
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Booking failed');
    }
    
    const result = await response.json();
    
    // Success state
    setShowThankYou(true);
    
    // Reset form after 5 seconds
    setTimeout(() => {
      resetForm();
    }, 5000);
    
  } catch (error) {
    console.error('Booking error:', error);
    setErrors({ submit: error.message || 'Something went wrong. Please try again.' });
  } finally {
    setIsSubmitting(false);
  }
};
```

**Why Edge Function Instead of Direct Insert?**
1. **Business Logic**: Price calculation, duration validation, conflict checking
2. **Customer Auto-Creation**: Automatically creates/updates customer record
3. **Email Notifications**: Sends emails to customer and owner
4. **Calendar Integration**: Creates Google Calendar event (if configured)
5. **Data Integrity**: Server-side validation prevents tampering

---

## 3. EDGE FUNCTION: `create-booking`

**File**: `carwebitebooking/supabase/functions/create-booking/index.ts`

**Runtime**: Deno (TypeScript)

**Authentication**: Public endpoint (uses `anon` key)

### 3.1 Request Handler

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const bookingData = await req.json();
    
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Elevated permissions
    );
    
    // Step 1: Calculate pricing
    const pricing = await calculatePricing(supabaseClient, bookingData);
    
    // Step 2: Create/update customer
    const customer = await upsertCustomer(supabaseClient, bookingData);
    
    // Step 3: Insert booking
    const booking = await insertBooking(supabaseClient, bookingData, pricing);
    
    // Step 4: Send notifications (async, don't wait)
    sendNotifications(booking).catch(console.error);
    
    return new Response(
      JSON.stringify(booking),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### 3.2 Pricing Calculation

```typescript
async function calculatePricing(supabase, bookingData) {
  const { interior_package_id, exterior_package_id, vehicle_size } = bookingData;
  
  let subtotal = 0;
  let totalDuration = 0;
  
  // Fetch package prices
  if (interior_package_id) {
    const { data: pkg } = await supabase
      .from('packages')
      .select('price, duration_minutes')
      .eq('id', interior_package_id)
      .single();
    
    if (pkg) {
      subtotal += pkg.price;
      totalDuration += pkg.duration_minutes;
    }
  }
  
  if (exterior_package_id) {
    const { data: pkg } = await supabase
      .from('packages')
      .select('price, duration_minutes')
      .eq('id', exterior_package_id)
      .single();
    
    if (pkg) {
      subtotal += pkg.price;
      totalDuration += pkg.duration_minutes;
    }
  }
  
  // Add vehicle size fee
  const vehicleSizeFees = {
    small: 0,
    medium: 5,
    large: 10
  };
  
  const sizeFee = vehicleSizeFees[vehicle_size] || 0;
  const totalPrice = subtotal + sizeFee;
  
  return {
    subtotal,
    vehicle_size_fee: sizeFee,
    total_price: totalPrice,
    total_duration_minutes: totalDuration
  };
}
```

### 3.3 Customer Upsert Logic

```typescript
async function upsertCustomer(supabase, bookingData) {
  const { customer_name, customer_phone, customer_email, customer_address } = bookingData;
  
  // Check if customer exists (by phone)
  const { data: existingCustomer, error: checkError } = await supabase
    .from('customers')
    .select('*')
    .eq('phone', customer_phone)
    .maybeSingle(); // Returns null if not found (doesn't throw error)
  
  if (checkError && checkError.code !== 'PGRST116') {
    // PGRST116 = no rows returned (expected)
    throw checkError;
  }
  
  if (existingCustomer) {
    console.log('Customer already exists:', existingCustomer.id);
    
    // Update customer info (email/address may have changed)
    const { data: updatedCustomer } = await supabase
      .from('customers')
      .update({
        name: customer_name,
        email: customer_email,
        address: customer_address,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingCustomer.id)
      .select()
      .single();
    
    return updatedCustomer || existingCustomer;
  }
  
  // Create new customer
  const { data: newCustomer, error: insertError } = await supabase
    .from('customers')
    .insert([{
      name: customer_name,
      phone: customer_phone,
      email: customer_email,
      address: customer_address,
      total_bookings: 0,
      total_spent: 0
    }])
    .select()
    .single();
  
  if (insertError) throw insertError;
  
  console.log('New customer created:', newCustomer.id);
  return newCustomer;
}
```

**Key Fix**: Changed `.single()` to `.maybeSingle()` on line 203 of the original code. 

**Why?**
- `.single()` throws error if 0 rows returned → customer creation was silently failing
- `.maybeSingle()` returns `null` if 0 rows → proper check for non-existent customer

### 3.4 Booking Insertion

```typescript
async function insertBooking(supabase, bookingData, pricing) {
  const { data: booking, error } = await supabase
    .from('bookings')
    .insert([{
      ...bookingData,
      ...pricing,
      status: 'confirmed', // Auto-confirm (or use 'pending' for manual approval)
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])
    .select()
    .single();
  
  if (error) {
    console.error('Insert error:', error);
    throw new Error('Failed to create booking: ' + error.message);
  }
  
  console.log('Booking created successfully:', booking.id);
  return booking;
}
```

### 3.5 Email Notifications

```typescript
async function sendNotifications(booking) {
  const SEND_EMAIL_URL = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`;
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
  
  // Customer confirmation email
  try {
    const customerEmailResponse = await fetch(SEND_EMAIL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        to: booking.customer_email,
        subject: 'Booking Confirmation - Andrew\'s Car Wash',
        body: generateCustomerEmailHTML(booking)
      })
    });
    
    if (customerEmailResponse.ok) {
      console.log('✅ Customer confirmation email sent successfully');
    } else {
      const errorText = await customerEmailResponse.text();
      console.error('❌ Failed to send customer email:', errorText);
    }
  } catch (error) {
    console.error('❌ Email error:', error);
  }
  
  // Owner notification email
  const OWNER_EMAIL = Deno.env.get('OWNER_EMAIL') || 'andrewswashing@gmail.com';
  
  try {
    const ownerEmailResponse = await fetch(SEND_EMAIL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        to: OWNER_EMAIL,
        subject: `New Booking: ${booking.customer_name}`,
        body: generateOwnerEmailHTML(booking)
      })
    });
    
    if (ownerEmailResponse.ok) {
      console.log('✅ Owner notification email sent successfully');
    } else {
      const errorText = await ownerEmailResponse.text();
      console.error('❌ Failed to send owner email:', errorText);
    }
  } catch (error) {
    console.error('❌ Email error:', error);
  }
}
```

---

## 4. EDGE FUNCTION: `send-email`

**File**: `carwebitebooking/supabase/functions/send-email/index.ts`

**Email Provider**: Resend (https://resend.com)

**Authentication**: Public endpoint (no JWT validation to allow internal calls)

### 4.1 Request Handler

```typescript
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { to, subject, body } = await req.json();
    
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'bookings@andrew.us.kg';
    
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured');
    }
    
    // Call Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `Andrew's Car Wash <${FROM_EMAIL}>`,
        to: [to],
        subject: subject,
        html: body
      })
    });
    
    const result = await resendResponse.json();
    
    if (!resendResponse.ok) {
      throw new Error(result.message || 'Failed to send email');
    }
    
    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully', id: result.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Send email error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### 4.2 Email Templates

**Customer Confirmation Email**:
```typescript
function generateCustomerEmailHTML(booking) {
  const dateStr = new Date(booking.booking_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                  color: white; padding: 30px; text-align: center; }
        .content { background: #f9f9f9; padding: 30px; }
        .details { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Booking Confirmed! 🚗✨</h1>
        </div>
        <div class="content">
          <p>Hi ${booking.customer_name},</p>
          <p>Your car wash appointment has been confirmed!</p>
          
          <div class="details">
            <h3>Booking Details</h3>
            <p><strong>Date:</strong> ${dateStr}</p>
            <p><strong>Time:</strong> ${booking.start_time}</p>
            <p><strong>Service:</strong> ${booking.service_type === 'mobile' ? 'Mobile Service' : 'Shop Location'}</p>
            ${booking.service_type === 'mobile' ? `<p><strong>Address:</strong> ${booking.customer_address}</p>` : ''}
            <p><strong>Vehicle Size:</strong> ${booking.vehicle_size}</p>
            <p><strong>Duration:</strong> ${booking.total_duration_minutes} minutes</p>
            <p><strong>Total Price:</strong> $${booking.total_price}</p>
          </div>
          
          <p>We'll send you a reminder 24 hours before your appointment.</p>
          <p>If you need to reschedule or cancel, please contact us at least 24 hours in advance.</p>
        </div>
        <div class="footer">
          <p>Andrew's Car Wash | (562) 310-1075 | andrewswashing@gmail.com</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
```

**Owner Notification Email** (with Apple Calendar link):
```typescript
function generateOwnerEmailHTML(booking) {
  const dateStr = new Date(booking.booking_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Generate ICS file content
  const icsContent = generateICS(booking);
  const icsDataURI = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 30px; text-align: center; }
        .content { background: #f9f9f9; padding: 30px; }
        .details { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .calendar-btn { display: inline-block; background: #10b981; color: white; 
                        padding: 12px 24px; text-decoration: none; border-radius: 6px; 
                        margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔔 New Booking Received</h1>
        </div>
        <div class="content">
          <div class="details">
            <h3>Customer Information</h3>
            <p><strong>Name:</strong> ${booking.customer_name}</p>
            <p><strong>Phone:</strong> ${booking.customer_phone}</p>
            <p><strong>Email:</strong> ${booking.customer_email}</p>
            ${booking.customer_address ? `<p><strong>Address:</strong> ${booking.customer_address}</p>` : ''}
          </div>
          
          <div class="details">
            <h3>Service Details</h3>
            <p><strong>Date:</strong> ${dateStr}</p>
            <p><strong>Time:</strong> ${booking.start_time} - ${booking.end_time}</p>
            <p><strong>Service Type:</strong> ${booking.service_type === 'mobile' ? 'Mobile Service' : 'Shop Location'}</p>
            <p><strong>Vehicle Size:</strong> ${booking.vehicle_size}</p>
            <p><strong>Duration:</strong> ${booking.total_duration_minutes} minutes</p>
            <p><strong>Total Price:</strong> $${booking.total_price}</p>
            ${booking.customer_notes ? `<p><strong>Notes:</strong> ${booking.customer_notes}</p>` : ''}
          </div>
          
          <div style="text-align: center;">
            <a href="${icsDataURI}" download="booking-${booking.id}.ics" class="calendar-btn">
              📅 Add to Apple Calendar
            </a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateICS(booking) {
  const startDate = new Date(`${booking.booking_date}T${booking.start_time}`);
  const endDate = new Date(`${booking.booking_date}T${booking.end_time}`);
  
  // Format as YYYYMMDDTHHMMSS
  const formatICSDate = (date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };
  
  const location = booking.service_type === 'mobile' 
    ? booking.customer_address 
    : 'Andrew\'s Car Wash - Shop Location';
  
  const description = `
Customer: ${booking.customer_name}
Phone: ${booking.customer_phone}
Email: ${booking.customer_email}
Service: ${booking.service_type}
Vehicle: ${booking.vehicle_size}
Price: $${booking.total_price}
${booking.customer_notes ? `Notes: ${booking.customer_notes}` : ''}
  `.trim();
  
  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Andrew's Car Wash//Booking System//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:${booking.id}@andrew.us.kg
DTSTAMP:${formatICSDate(new Date())}
DTSTART:${formatICSDate(startDate)}
DTEND:${formatICSDate(endDate)}
SUMMARY:Car Wash - ${booking.customer_name}
DESCRIPTION:${description.replace(/\n/g, '\\n')}
LOCATION:${location}
STATUS:CONFIRMED
SEQUENCE:0
BEGIN:VALARM
TRIGGER:-PT24H
DESCRIPTION:Reminder: Car wash appointment tomorrow
ACTION:DISPLAY
END:VALARM
END:VEVENT
END:VCALENDAR`;
}
```

**Domain Configuration for Resend**:
- Domain: `andrew.us.kg`
- DNS Records added to Netlify:
  - SPF: `v=spf1 include:_spf.resend.com ~all`
  - DKIM: TXT record (provided by Resend)
  - Return-Path: CNAME (provided by Resend)
- From address: `bookings@andrew.us.kg`
- Domain verified ✅

---

## 5. ADMIN DASHBOARD - COMPLETE TECHNICAL BREAKDOWN

**File**: `carwebitebooking/frontend/src/components/AdminDashboard.jsx`

### 5.1 Authentication System

**CRITICAL SECURITY ISSUE**: 
- No actual authentication system implemented
- Hardcoded password check in frontend: `password === 'andrew123'`
- Service role key exposed in browser environment variables

```javascript
const AdminDashboard = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const handleLogin = () => {
    if (password === 'andrew123') { // ❌ INSECURE
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Invalid password');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-96">
          <h2 className="text-2xl font-bold mb-4
```


## License: unknown
https://github.com/mugoooz/donation-platform-front/blob/391be762d8883e1250fedcd1d4dd8116e5042e08/src/components/LoginForm.js

```
# Complete Technical Breakdown: Car Wash Booking System

## Project Architecture Overview

This is a **React-based single-page application** integrated with **Supabase** as the backend-as-a-service platform. The system consists of:

1. **Customer-facing booking widget** (public)
2. **Admin dashboard** (authenticated)
3. **Supabase Edge Functions** (serverless backend)
4. **PostgreSQL database** via Supabase
5. **Email notifications** via Resend API

---

## 1. DATABASE SCHEMA & TABLES

### 1.1 `bookings` Table
**Location**: `carwebitebooking/supabase/migrations/20240101000000_initial_schema.sql`

```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_address TEXT,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  total_duration_minutes INTEGER NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('mobile', 'shop')),
  vehicle_size TEXT NOT NULL CHECK (vehicle_size IN ('small', 'medium', 'large')),
  vehicle_size_fee NUMERIC(10,2) DEFAULT 0,
  interior_package_id UUID REFERENCES packages(id),
  exterior_package_id UUID REFERENCES packages(id),
  subtotal NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  has_water_electric BOOLEAN DEFAULT false,
  customer_notes TEXT,
  google_calendar_event_id TEXT,
  ics_file_sent BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  final_amount NUMERIC(10,2),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  line_items JSONB,
  payment_notes TEXT,
  finalized_at TIMESTAMPTZ
);
```

**Key Design Decisions**:
- `id` is UUID for security (non-sequential, unpredictable)
- `customer_phone` not unique (allows repeat customers)
- `service_type` enum constraint enforces valid values
- `vehicle_size_fee` stored separately for price transparency
- Foreign keys to `packages` table with `ON DELETE SET NULL` (if package deleted, booking retains price but loses reference)
- `status` and `payment_status` separate fields for business logic flexibility
- `line_items` as JSONB for flexible pricing breakdown
- `finalized_at` timestamp tracks when admin confirmed final pricing

### 1.2 `packages` Table
**Location**: Same migration file

```sql
CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  package_type TEXT NOT NULL CHECK (package_type IN ('interior', 'exterior')),
  price NUMERIC(10,2) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  description TEXT,
  features TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Initial Data**:
- 3 interior packages: Standard ($20, 30min), Deluxe ($40, 45min), Ultimate ($60, 60min)
- 3 exterior packages: Standard ($20, 30min), Deluxe ($35, 45min), Ultimate ($50, 60min)

### 1.3 `customers` Table
**Location**: `carwebitebooking/supabase/migrations/20240103000000_add_customers_table.sql`

```sql
CREATE TABLE customers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT,
  address TEXT,
  notes TEXT,
  total_bookings INTEGER DEFAULT 0,
  total_spent NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Design Decisions**:
- `phone` is UNIQUE constraint (one customer record per phone number)
- `BIGSERIAL` primary key (auto-incrementing integer)
- `total_bookings` and `total_spent` are **denormalized aggregates** for performance
- Updated via triggers or application logic after each booking

### 1.4 Row-Level Security (RLS)

**Authentication Context**: 
- Public users: `anon` role (JWT with `role: 'anon'`)
- Admin users: Manual authentication check in frontend (no actual auth table)

**RLS Policies** (`carwebitebooking/supabase/migrations/20240101000001_rls_policies.sql`):

```sql
-- Bookings: Public can insert (create bookings)
CREATE POLICY "Anyone can create bookings"
  ON bookings FOR INSERT
  TO anon
  WITH CHECK (true);

-- Bookings: Public can read their own (via email match)
CREATE POLICY "Anyone can read their bookings"
  ON bookings FOR SELECT
  TO anon
  USING (customer_email = current_setting('request.jwt.claims')::json->>'email');

-- Packages: Public read-only
CREATE POLICY "Anyone can view active packages"
  ON packages FOR SELECT
  TO anon
  USING (is_active = true);

-- Customers: Authenticated only
CREATE POLICY "Authenticated users can manage customers"
  ON customers FOR ALL
  TO authenticated
  USING (true);
```

**Security Analysis**:
- ❌ **VULNERABILITY**: Admin dashboard bypasses RLS by using `service_role` key client-side
- ⚠️ **RISK**: Service role key exposed in frontend env (`VITE_SUPABASE_SERVICE_KEY`)
- ✅ **MITIGATION**: Should use server-side Edge Functions for admin operations
- ✅ **Booking creation**: Properly uses `anon` key, no escalation possible

---

## 2. BOOKING WIDGET - COMPLETE TECHNICAL BREAKDOWN

### 2.1 Component Structure

**File**: `carwebitebooking/frontend/src/components/BookingWidget.jsx`

**Framework**: React 18 with Hooks
**Dependencies**:
- `react-datepicker` v4.x (calendar UI)
- `lucide-react` (icons)
- `@supabase/supabase-js` v2.x (database client)
- `date-fns` (date manipulation)

**State Management** (all local via `useState`):

```javascript
const [step, setStep] = useState(1);                    // Current form step (1-5)
const [serviceType, setServiceType] = useState('');     // 'mobile' | 'shop'
const [vehicleSize, setVehicleSize] = useState('');     // 'small' | 'medium' | 'large'
const [selectedDate, setSelectedDate] = useState(null); // Date object
const [selectedTime, setSelectedTime] = useState('');   // 'HH:MM' string
const [interiorPackage, setInteriorPackage] = useState(null); // Package object
const [exteriorPackage, setExteriorPackage] = useState(null); // Package object
const [packages, setPackages] = useState([]);           // Fetched from DB
const [availableSlots, setAvailableSlots] = useState([]); // Calculated time slots
const [customerInfo, setCustomerInfo] = useState({      // Form data
  name: '', phone: '', email: '', address: '', notes: '', hasWaterElectric: false
});
const [isSubmitting, setIsSubmitting] = useState(false);
const [errors, setErrors] = useState({});               // Validation errors
const [showThankYou, setShowThankYou] = useState(false);
const [totalPrice, setTotalPrice] = useState(0);        // Calculated price
const [totalDuration, setTotalDuration] = useState(0);  // Calculated minutes
```

### 2.2 Data Fetching on Mount

**Execution Flow**:

```javascript
useEffect(() => {
  const fetchPackages = async () => {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });
    
    if (!error) setPackages(data);
  };
  fetchPackages();
}, []);
```

**Query Details**:
- **Table**: `packages`
- **Filter**: `is_active = true`
- **Order**: By `price` ASC (cheapest first)
- **Auth**: Uses `anon` key (public read)
- **RLS**: Passes "view active packages" policy

### 2.3 Step 1: Service Type Selection

**UI**: Two large buttons (Mobile / Shop Location)

**Event Handler**:
```javascript
const handleServiceTypeSelect = (type) => {
  setServiceType(type);
  setStep(2); // Auto-advance
};
```

**Validation**: None (both options always valid)

**State Change**: 
- `serviceType` → 'mobile' or 'shop'
- `step` → 2

**Conditional Logic**: If `serviceType === 'mobile'`, Step 4 requires `address` field

### 2.4 Step 2: Vehicle Size Selection

**UI**: Three buttons (Small / Medium / Large)

**Pricing Logic** (hardcoded in frontend):
```javascript
const vehicleSizeFees = {
  small: 0,
  medium: 5,
  large: 10
};
```

**Event Handler**:
```javascript
const handleVehicleSizeSelect = (size) => {
  setVehicleSize(size);
  setStep(3);
};
```

**Price Calculation Trigger**: 
```javascript
useEffect(() => {
  const interiorPrice = interiorPackage?.price || 0;
  const exteriorPrice = exteriorPackage?.price || 0;
  const sizeFee = vehicleSizeFees[vehicleSize] || 0;
  const total = interiorPrice + exteriorPrice + sizeFee;
  
  setTotalPrice(total);
}, [interiorPackage, exteriorPackage, vehicleSize]);
```

**State Change**:
- `vehicleSize` → 'small' | 'medium' | 'large'
- `step` → 3

### 2.5 Step 3: Package Selection

**UI Structure**:
- Two sections: Exterior Detailing (top), Interior Detailing (bottom)
- Each shows 3 packages filtered by `package_type`
- "Skip Interior" / "Skip Exterior" buttons for non-combo bookings

**Package Filtering**:
```javascript
const exteriorPackages = packages.filter(pkg => pkg.package_type === 'exterior');
const interiorPackages = packages.filter(pkg => pkg.package_type === 'interior');
```

**Duration Calculation**:
```javascript
useEffect(() => {
  const interiorDuration = interiorPackage?.duration_minutes || 0;
  const exteriorDuration = exteriorPackage?.duration_minutes || 0;
  // Durations ADD (not overlap)
  setTotalDuration(interiorDuration + exteriorDuration);
}, [interiorPackage, exteriorPackage]);
```

**Selection Logic**:
```javascript
const handlePackageSelect = (pkg, type) => {
  if (type === 'interior') {
    setInteriorPackage(interiorPackage?.id === pkg.id ? null : pkg); // Toggle
  } else {
    setExteriorPackage(exteriorPackage?.id === pkg.id ? null : pkg);
  }
};
```

**Validation**:
```javascript
const canProceed = interiorPackage || exteriorPackage; // At least one required
```

**State Change**:
- `interiorPackage` → Package object or null
- `exteriorPackage` → Package object or null
- `totalDuration` → Sum of selected package durations
- `totalPrice` → Recalculated via useEffect
- `step` → 4 (on "Next" click)

### 2.6 Step 4: Date & Time Selection

**Date Picker Configuration**:
```javascript
<DatePicker
  selected={selectedDate}
  onChange={handleDateChange}
  minDate={new Date()} // Cannot book past dates
  maxDate={addDays(new Date(), 90)} // 90-day booking window
  filterDate={isDateAvailable} // Custom filter function
  inline
  calendarClassName="booking-calendar"
/>
```

**Date Availability Filter**:
```javascript
const isDateAvailable = (date) => {
  const day = date.getDay();
  // 0 = Sunday, 6 = Saturday
  return day !== 0 && day !== 6; // Weekdays only (Mon-Fri)
};
```

**Time Slot Generation** (triggered on date selection):

```javascript
const handleDateChange = async (date) => {
  setSelectedDate(date);
  setSelectedTime(''); // Reset time selection
  
  // Fetch existing bookings for this date
  const { data: existingBookings } = await supabase
    .from('bookings')
    .select('start_time, end_time')
    .eq('booking_date', format(date, 'yyyy-MM-dd'))
    .neq('status', 'cancelled');
  
  const slots = generateAvailableSlots(date, existingBookings);
  setAvailableSlots(slots);
};
```

**Slot Generation Algorithm**:

```javascript
const generateAvailableSlots = (date, existingBookings) => {
  const slots = [];
  const businessHours = { start: 15, end: 18 }; // 3 PM - 6 PM
  
  // Generate 30-minute intervals
  for (let hour = businessHours.start; hour < businessHours.end; hour++) {
    for (let minute of [0, 30]) {
      const slotStart = new Date(date);
      slotStart.setHours(hour, minute, 0, 0);
      
      // Calculate slot end time based on total duration
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + totalDuration);
      
      // Check if slot end exceeds business hours
      const endHour = slotEnd.getHours();
      const endMinute = slotEnd.getMinutes();
      const endTime = endHour + endMinute / 60;
      
      if (endTime > businessHours.end) continue; // Slot too late
      
      // Check for conflicts with existing bookings
      const hasConflict = existingBookings.some(booking => {
        const bookingStart = parseTime(booking.start_time);
        const bookingEnd = parseTime(booking.end_time);
        
        // Conflict if:
        // 1. New slot starts during existing booking
        // 2. New slot ends during existing booking
        // 3. New slot completely contains existing booking
        return (
          (slotStart >= bookingStart && slotStart < bookingEnd) ||
          (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
          (slotStart <= bookingStart && slotEnd >= bookingEnd)
        );
      });
      
      if (!hasConflict) {
        slots.push({
          time: format(slotStart, 'HH:mm'),
          display: format(slotStart, 'h:mm a')
        });
      }
    }
  }
  
  return slots;
};

const parseTime = (timeString) => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};
```

**Conflict Detection Logic Explained**:

Given:
- Existing booking: 3:00 PM - 4:30 PM
- New booking duration: 60 minutes

Scenarios:
1. **Slot 3:30 PM**: Would end at 4:30 PM → **CONFLICT** (overlaps existing)
2. **Slot 4:30 PM**: Would end at 5:30 PM → **AVAILABLE** (starts after existing ends)
3. **Slot 2:30 PM**: Would end at 3:30 PM → **CONFLICT** (ends during existing)

**Time Selection Handler**:
```javascript
const handleTimeSelect = (time) => {
  setSelectedTime(time);
  setStep(5); // Auto-advance
};
```

**State Changes**:
- `selectedDate` → Date object
- `selectedTime` → 'HH:MM' string
- `availableSlots` → Array of available time objects
- `step` → 5

### 2.7 Step 5: Customer Information

**Form Fields**:
```javascript
<input 
  type="text" 
  value={customerInfo.name}
  onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
  required 
/>
<input 
  type="tel" 
  value={customerInfo.phone}
  pattern="[0-9]{10}" // Validates 10-digit US phone
  required 
/>
<input 
  type="email" 
  value={customerInfo.email}
  required 
/>
{serviceType === 'mobile' && (
  <input 
    type="text" 
    value={customerInfo.address}
    required 
  />
)}
<textarea 
  value={customerInfo.notes}
  placeholder="Any special requests?" 
/>
{serviceType === 'mobile' && (
  <label>
    <input 
      type="checkbox" 
      checked={customerInfo.hasWaterElectric}
      onChange={(e) => setCustomerInfo({...customerInfo, hasWaterElectric: e.target.checked})}
    />
    I have water and electricity available
  </label>
)}
```

**Validation Logic**:
```javascript
const validateForm = () => {
  const newErrors = {};
  
  if (!customerInfo.name.trim()) {
    newErrors.name = 'Name is required';
  }
  
  if (!customerInfo.phone.trim()) {
    newErrors.phone = 'Phone number is required';
  } else if (!/^\d{10}$/.test(customerInfo.phone.replace(/\D/g, ''))) {
    newErrors.phone = 'Please enter a valid 10-digit phone number';
  }
  
  if (!customerInfo.email.trim()) {
    newErrors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerInfo.email)) {
    newErrors.email = 'Please enter a valid email address';
  }
  
  if (serviceType === 'mobile' && !customerInfo.address.trim()) {
    newErrors.address = 'Address is required for mobile service';
  }
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

**Submit Handler**:
```javascript
const handleSubmit = async () => {
  if (!validateForm()) {
    return; // Show errors, don't submit
  }
  
  setIsSubmitting(true);
  
  try {
    // Calculate end time
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const startTime = new Date(selectedDate);
    startTime.setHours(hours, minutes, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + totalDuration);
    
    // Prepare payload
    const bookingData = {
      customer_name: customerInfo.name.trim(),
      customer_phone: customerInfo.phone.replace(/\D/g, ''), // Strip formatting
      customer_email: customerInfo.email.trim().toLowerCase(),
      customer_address: serviceType === 'mobile' ? customerInfo.address.trim() : null,
      service_type: serviceType,
      vehicle_size: vehicleSize,
      interior_package_id: interiorPackage?.id || null,
      exterior_package_id: exteriorPackage?.id || null,
      has_water_electric: serviceType === 'mobile' ? customerInfo.hasWaterElectric : false,
      customer_notes: customerInfo.notes.trim() || null,
      booking_date: format(selectedDate, 'yyyy-MM-dd'),
      start_time: format(startTime, 'HH:mm:ss'),
      end_time: format(endTime, 'HH:mm:ss'),
      status: 'pending' // Admin must confirm
    };
    
    // Call Edge Function (NOT direct DB insert)
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-booking`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(bookingData)
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Booking failed');
    }
    
    const result = await response.json();
    
    // Success state
    setShowThankYou(true);
    
    // Reset form after 5 seconds
    setTimeout(() => {
      resetForm();
    }, 5000);
    
  } catch (error) {
    console.error('Booking error:', error);
    setErrors({ submit: error.message || 'Something went wrong. Please try again.' });
  } finally {
    setIsSubmitting(false);
  }
};
```

**Why Edge Function Instead of Direct Insert?**
1. **Business Logic**: Price calculation, duration validation, conflict checking
2. **Customer Auto-Creation**: Automatically creates/updates customer record
3. **Email Notifications**: Sends emails to customer and owner
4. **Calendar Integration**: Creates Google Calendar event (if configured)
5. **Data Integrity**: Server-side validation prevents tampering

---

## 3. EDGE FUNCTION: `create-booking`

**File**: `carwebitebooking/supabase/functions/create-booking/index.ts`

**Runtime**: Deno (TypeScript)

**Authentication**: Public endpoint (uses `anon` key)

### 3.1 Request Handler

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const bookingData = await req.json();
    
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Elevated permissions
    );
    
    // Step 1: Calculate pricing
    const pricing = await calculatePricing(supabaseClient, bookingData);
    
    // Step 2: Create/update customer
    const customer = await upsertCustomer(supabaseClient, bookingData);
    
    // Step 3: Insert booking
    const booking = await insertBooking(supabaseClient, bookingData, pricing);
    
    // Step 4: Send notifications (async, don't wait)
    sendNotifications(booking).catch(console.error);
    
    return new Response(
      JSON.stringify(booking),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### 3.2 Pricing Calculation

```typescript
async function calculatePricing(supabase, bookingData) {
  const { interior_package_id, exterior_package_id, vehicle_size } = bookingData;
  
  let subtotal = 0;
  let totalDuration = 0;
  
  // Fetch package prices
  if (interior_package_id) {
    const { data: pkg } = await supabase
      .from('packages')
      .select('price, duration_minutes')
      .eq('id', interior_package_id)
      .single();
    
    if (pkg) {
      subtotal += pkg.price;
      totalDuration += pkg.duration_minutes;
    }
  }
  
  if (exterior_package_id) {
    const { data: pkg } = await supabase
      .from('packages')
      .select('price, duration_minutes')
      .eq('id', exterior_package_id)
      .single();
    
    if (pkg) {
      subtotal += pkg.price;
      totalDuration += pkg.duration_minutes;
    }
  }
  
  // Add vehicle size fee
  const vehicleSizeFees = {
    small: 0,
    medium: 5,
    large: 10
  };
  
  const sizeFee = vehicleSizeFees[vehicle_size] || 0;
  const totalPrice = subtotal + sizeFee;
  
  return {
    subtotal,
    vehicle_size_fee: sizeFee,
    total_price: totalPrice,
    total_duration_minutes: totalDuration
  };
}
```

### 3.3 Customer Upsert Logic

```typescript
async function upsertCustomer(supabase, bookingData) {
  const { customer_name, customer_phone, customer_email, customer_address } = bookingData;
  
  // Check if customer exists (by phone)
  const { data: existingCustomer, error: checkError } = await supabase
    .from('customers')
    .select('*')
    .eq('phone', customer_phone)
    .maybeSingle(); // Returns null if not found (doesn't throw error)
  
  if (checkError && checkError.code !== 'PGRST116') {
    // PGRST116 = no rows returned (expected)
    throw checkError;
  }
  
  if (existingCustomer) {
    console.log('Customer already exists:', existingCustomer.id);
    
    // Update customer info (email/address may have changed)
    const { data: updatedCustomer } = await supabase
      .from('customers')
      .update({
        name: customer_name,
        email: customer_email,
        address: customer_address,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingCustomer.id)
      .select()
      .single();
    
    return updatedCustomer || existingCustomer;
  }
  
  // Create new customer
  const { data: newCustomer, error: insertError } = await supabase
    .from('customers')
    .insert([{
      name: customer_name,
      phone: customer_phone,
      email: customer_email,
      address: customer_address,
      total_bookings: 0,
      total_spent: 0
    }])
    .select()
    .single();
  
  if (insertError) throw insertError;
  
  console.log('New customer created:', newCustomer.id);
  return newCustomer;
}
```

**Key Fix**: Changed `.single()` to `.maybeSingle()` on line 203 of the original code. 

**Why?**
- `.single()` throws error if 0 rows returned → customer creation was silently failing
- `.maybeSingle()` returns `null` if 0 rows → proper check for non-existent customer

### 3.4 Booking Insertion

```typescript
async function insertBooking(supabase, bookingData, pricing) {
  const { data: booking, error } = await supabase
    .from('bookings')
    .insert([{
      ...bookingData,
      ...pricing,
      status: 'confirmed', // Auto-confirm (or use 'pending' for manual approval)
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])
    .select()
    .single();
  
  if (error) {
    console.error('Insert error:', error);
    throw new Error('Failed to create booking: ' + error.message);
  }
  
  console.log('Booking created successfully:', booking.id);
  return booking;
}
```

### 3.5 Email Notifications

```typescript
async function sendNotifications(booking) {
  const SEND_EMAIL_URL = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`;
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
  
  // Customer confirmation email
  try {
    const customerEmailResponse = await fetch(SEND_EMAIL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        to: booking.customer_email,
        subject: 'Booking Confirmation - Andrew\'s Car Wash',
        body: generateCustomerEmailHTML(booking)
      })
    });
    
    if (customerEmailResponse.ok) {
      console.log('✅ Customer confirmation email sent successfully');
    } else {
      const errorText = await customerEmailResponse.text();
      console.error('❌ Failed to send customer email:', errorText);
    }
  } catch (error) {
    console.error('❌ Email error:', error);
  }
  
  // Owner notification email
  const OWNER_EMAIL = Deno.env.get('OWNER_EMAIL') || 'andrewswashing@gmail.com';
  
  try {
    const ownerEmailResponse = await fetch(SEND_EMAIL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        to: OWNER_EMAIL,
        subject: `New Booking: ${booking.customer_name}`,
        body: generateOwnerEmailHTML(booking)
      })
    });
    
    if (ownerEmailResponse.ok) {
      console.log('✅ Owner notification email sent successfully');
    } else {
      const errorText = await ownerEmailResponse.text();
      console.error('❌ Failed to send owner email:', errorText);
    }
  } catch (error) {
    console.error('❌ Email error:', error);
  }
}
```

---

## 4. EDGE FUNCTION: `send-email`

**File**: `carwebitebooking/supabase/functions/send-email/index.ts`

**Email Provider**: Resend (https://resend.com)

**Authentication**: Public endpoint (no JWT validation to allow internal calls)

### 4.1 Request Handler

```typescript
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { to, subject, body } = await req.json();
    
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'bookings@andrew.us.kg';
    
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured');
    }
    
    // Call Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `Andrew's Car Wash <${FROM_EMAIL}>`,
        to: [to],
        subject: subject,
        html: body
      })
    });
    
    const result = await resendResponse.json();
    
    if (!resendResponse.ok) {
      throw new Error(result.message || 'Failed to send email');
    }
    
    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully', id: result.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Send email error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### 4.2 Email Templates

**Customer Confirmation Email**:
```typescript
function generateCustomerEmailHTML(booking) {
  const dateStr = new Date(booking.booking_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                  color: white; padding: 30px; text-align: center; }
        .content { background: #f9f9f9; padding: 30px; }
        .details { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Booking Confirmed! 🚗✨</h1>
        </div>
        <div class="content">
          <p>Hi ${booking.customer_name},</p>
          <p>Your car wash appointment has been confirmed!</p>
          
          <div class="details">
            <h3>Booking Details</h3>
            <p><strong>Date:</strong> ${dateStr}</p>
            <p><strong>Time:</strong> ${booking.start_time}</p>
            <p><strong>Service:</strong> ${booking.service_type === 'mobile' ? 'Mobile Service' : 'Shop Location'}</p>
            ${booking.service_type === 'mobile' ? `<p><strong>Address:</strong> ${booking.customer_address}</p>` : ''}
            <p><strong>Vehicle Size:</strong> ${booking.vehicle_size}</p>
            <p><strong>Duration:</strong> ${booking.total_duration_minutes} minutes</p>
            <p><strong>Total Price:</strong> $${booking.total_price}</p>
          </div>
          
          <p>We'll send you a reminder 24 hours before your appointment.</p>
          <p>If you need to reschedule or cancel, please contact us at least 24 hours in advance.</p>
        </div>
        <div class="footer">
          <p>Andrew's Car Wash | (562) 310-1075 | andrewswashing@gmail.com</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
```

**Owner Notification Email** (with Apple Calendar link):
```typescript
function generateOwnerEmailHTML(booking) {
  const dateStr = new Date(booking.booking_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Generate ICS file content
  const icsContent = generateICS(booking);
  const icsDataURI = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 30px; text-align: center; }
        .content { background: #f9f9f9; padding: 30px; }
        .details { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .calendar-btn { display: inline-block; background: #10b981; color: white; 
                        padding: 12px 24px; text-decoration: none; border-radius: 6px; 
                        margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔔 New Booking Received</h1>
        </div>
        <div class="content">
          <div class="details">
            <h3>Customer Information</h3>
            <p><strong>Name:</strong> ${booking.customer_name}</p>
            <p><strong>Phone:</strong> ${booking.customer_phone}</p>
            <p><strong>Email:</strong> ${booking.customer_email}</p>
            ${booking.customer_address ? `<p><strong>Address:</strong> ${booking.customer_address}</p>` : ''}
          </div>
          
          <div class="details">
            <h3>Service Details</h3>
            <p><strong>Date:</strong> ${dateStr}</p>
            <p><strong>Time:</strong> ${booking.start_time} - ${booking.end_time}</p>
            <p><strong>Service Type:</strong> ${booking.service_type === 'mobile' ? 'Mobile Service' : 'Shop Location'}</p>
            <p><strong>Vehicle Size:</strong> ${booking.vehicle_size}</p>
            <p><strong>Duration:</strong> ${booking.total_duration_minutes} minutes</p>
            <p><strong>Total Price:</strong> $${booking.total_price}</p>
            ${booking.customer_notes ? `<p><strong>Notes:</strong> ${booking.customer_notes}</p>` : ''}
          </div>
          
          <div style="text-align: center;">
            <a href="${icsDataURI}" download="booking-${booking.id}.ics" class="calendar-btn">
              📅 Add to Apple Calendar
            </a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateICS(booking) {
  const startDate = new Date(`${booking.booking_date}T${booking.start_time}`);
  const endDate = new Date(`${booking.booking_date}T${booking.end_time}`);
  
  // Format as YYYYMMDDTHHMMSS
  const formatICSDate = (date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };
  
  const location = booking.service_type === 'mobile' 
    ? booking.customer_address 
    : 'Andrew\'s Car Wash - Shop Location';
  
  const description = `
Customer: ${booking.customer_name}
Phone: ${booking.customer_phone}
Email: ${booking.customer_email}
Service: ${booking.service_type}
Vehicle: ${booking.vehicle_size}
Price: $${booking.total_price}
${booking.customer_notes ? `Notes: ${booking.customer_notes}` : ''}
  `.trim();
  
  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Andrew's Car Wash//Booking System//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:${booking.id}@andrew.us.kg
DTSTAMP:${formatICSDate(new Date())}
DTSTART:${formatICSDate(startDate)}
DTEND:${formatICSDate(endDate)}
SUMMARY:Car Wash - ${booking.customer_name}
DESCRIPTION:${description.replace(/\n/g, '\\n')}
LOCATION:${location}
STATUS:CONFIRMED
SEQUENCE:0
BEGIN:VALARM
TRIGGER:-PT24H
DESCRIPTION:Reminder: Car wash appointment tomorrow
ACTION:DISPLAY
END:VALARM
END:VEVENT
END:VCALENDAR`;
}
```

**Domain Configuration for Resend**:
- Domain: `andrew.us.kg`
- DNS Records added to Netlify:
  - SPF: `v=spf1 include:_spf.resend.com ~all`
  - DKIM: TXT record (provided by Resend)
  - Return-Path: CNAME (provided by Resend)
- From address: `bookings@andrew.us.kg`
- Domain verified ✅

---

## 5. ADMIN DASHBOARD - COMPLETE TECHNICAL BREAKDOWN

**File**: `carwebitebooking/frontend/src/components/AdminDashboard.jsx`

### 5.1 Authentication System

**CRITICAL SECURITY ISSUE**: 
- No actual authentication system implemented
- Hardcoded password check in frontend: `password === 'andrew123'`
- Service role key exposed in browser environment variables

```javascript
const AdminDashboard = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const handleLogin = () => {
    if (password === 'andrew123') { // ❌ INSECURE
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Invalid password');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-96">
          <h2 className="text-2xl font-bold mb-4
```


## License: unknown
https://github.com/mugoooz/donation-platform-front/blob/391be762d8883e1250fedcd1d4dd8116e5042e08/src/components/LoginForm.js

```
# Complete Technical Breakdown: Car Wash Booking System

## Project Architecture Overview

This is a **React-based single-page application** integrated with **Supabase** as the backend-as-a-service platform. The system consists of:

1. **Customer-facing booking widget** (public)
2. **Admin dashboard** (authenticated)
3. **Supabase Edge Functions** (serverless backend)
4. **PostgreSQL database** via Supabase
5. **Email notifications** via Resend API

---

## 1. DATABASE SCHEMA & TABLES

### 1.1 `bookings` Table
**Location**: `carwebitebooking/supabase/migrations/20240101000000_initial_schema.sql`

```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_address TEXT,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  total_duration_minutes INTEGER NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('mobile', 'shop')),
  vehicle_size TEXT NOT NULL CHECK (vehicle_size IN ('small', 'medium', 'large')),
  vehicle_size_fee NUMERIC(10,2) DEFAULT 0,
  interior_package_id UUID REFERENCES packages(id),
  exterior_package_id UUID REFERENCES packages(id),
  subtotal NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  has_water_electric BOOLEAN DEFAULT false,
  customer_notes TEXT,
  google_calendar_event_id TEXT,
  ics_file_sent BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  final_amount NUMERIC(10,2),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  line_items JSONB,
  payment_notes TEXT,
  finalized_at TIMESTAMPTZ
);
```

**Key Design Decisions**:
- `id` is UUID for security (non-sequential, unpredictable)
- `customer_phone` not unique (allows repeat customers)
- `service_type` enum constraint enforces valid values
- `vehicle_size_fee` stored separately for price transparency
- Foreign keys to `packages` table with `ON DELETE SET NULL` (if package deleted, booking retains price but loses reference)
- `status` and `payment_status` separate fields for business logic flexibility
- `line_items` as JSONB for flexible pricing breakdown
- `finalized_at` timestamp tracks when admin confirmed final pricing

### 1.2 `packages` Table
**Location**: Same migration file

```sql
CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  package_type TEXT NOT NULL CHECK (package_type IN ('interior', 'exterior')),
  price NUMERIC(10,2) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  description TEXT,
  features TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Initial Data**:
- 3 interior packages: Standard ($20, 30min), Deluxe ($40, 45min), Ultimate ($60, 60min)
- 3 exterior packages: Standard ($20, 30min), Deluxe ($35, 45min), Ultimate ($50, 60min)

### 1.3 `customers` Table
**Location**: `carwebitebooking/supabase/migrations/20240103000000_add_customers_table.sql`

```sql
CREATE TABLE customers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT,
  address TEXT,
  notes TEXT,
  total_bookings INTEGER DEFAULT 0,
  total_spent NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Design Decisions**:
- `phone` is UNIQUE constraint (one customer record per phone number)
- `BIGSERIAL` primary key (auto-incrementing integer)
- `total_bookings` and `total_spent` are **denormalized aggregates** for performance
- Updated via triggers or application logic after each booking

### 1.4 Row-Level Security (RLS)

**Authentication Context**: 
- Public users: `anon` role (JWT with `role: 'anon'`)
- Admin users: Manual authentication check in frontend (no actual auth table)

**RLS Policies** (`carwebitebooking/supabase/migrations/20240101000001_rls_policies.sql`):

```sql
-- Bookings: Public can insert (create bookings)
CREATE POLICY "Anyone can create bookings"
  ON bookings FOR INSERT
  TO anon
  WITH CHECK (true);

-- Bookings: Public can read their own (via email match)
CREATE POLICY "Anyone can read their bookings"
  ON bookings FOR SELECT
  TO anon
  USING (customer_email = current_setting('request.jwt.claims')::json->>'email');

-- Packages: Public read-only
CREATE POLICY "Anyone can view active packages"
  ON packages FOR SELECT
  TO anon
  USING (is_active = true);

-- Customers: Authenticated only
CREATE POLICY "Authenticated users can manage customers"
  ON customers FOR ALL
  TO authenticated
  USING (true);
```

**Security Analysis**:
- ❌ **VULNERABILITY**: Admin dashboard bypasses RLS by using `service_role` key client-side
- ⚠️ **RISK**: Service role key exposed in frontend env (`VITE_SUPABASE_SERVICE_KEY`)
- ✅ **MITIGATION**: Should use server-side Edge Functions for admin operations
- ✅ **Booking creation**: Properly uses `anon` key, no escalation possible

---

## 2. BOOKING WIDGET - COMPLETE TECHNICAL BREAKDOWN

### 2.1 Component Structure

**File**: `carwebitebooking/frontend/src/components/BookingWidget.jsx`

**Framework**: React 18 with Hooks
**Dependencies**:
- `react-datepicker` v4.x (calendar UI)
- `lucide-react` (icons)
- `@supabase/supabase-js` v2.x (database client)
- `date-fns` (date manipulation)

**State Management** (all local via `useState`):

```javascript
const [step, setStep] = useState(1);                    // Current form step (1-5)
const [serviceType, setServiceType] = useState('');     // 'mobile' | 'shop'
const [vehicleSize, setVehicleSize] = useState('');     // 'small' | 'medium' | 'large'
const [selectedDate, setSelectedDate] = useState(null); // Date object
const [selectedTime, setSelectedTime] = useState('');   // 'HH:MM' string
const [interiorPackage, setInteriorPackage] = useState(null); // Package object
const [exteriorPackage, setExteriorPackage] = useState(null); // Package object
const [packages, setPackages] = useState([]);           // Fetched from DB
const [availableSlots, setAvailableSlots] = useState([]); // Calculated time slots
const [customerInfo, setCustomerInfo] = useState({      // Form data
  name: '', phone: '', email: '', address: '', notes: '', hasWaterElectric: false
});
const [isSubmitting, setIsSubmitting] = useState(false);
const [errors, setErrors] = useState({});               // Validation errors
const [showThankYou, setShowThankYou] = useState(false);
const [totalPrice, setTotalPrice] = useState(0);        // Calculated price
const [totalDuration, setTotalDuration] = useState(0);  // Calculated minutes
```

### 2.2 Data Fetching on Mount

**Execution Flow**:

```javascript
useEffect(() => {
  const fetchPackages = async () => {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });
    
    if (!error) setPackages(data);
  };
  fetchPackages();
}, []);
```

**Query Details**:
- **Table**: `packages`
- **Filter**: `is_active = true`
- **Order**: By `price` ASC (cheapest first)
- **Auth**: Uses `anon` key (public read)
- **RLS**: Passes "view active packages" policy

### 2.3 Step 1: Service Type Selection

**UI**: Two large buttons (Mobile / Shop Location)

**Event Handler**:
```javascript
const handleServiceTypeSelect = (type) => {
  setServiceType(type);
  setStep(2); // Auto-advance
};
```

**Validation**: None (both options always valid)

**State Change**: 
- `serviceType` → 'mobile' or 'shop'
- `step` → 2

**Conditional Logic**: If `serviceType === 'mobile'`, Step 4 requires `address` field

### 2.4 Step 2: Vehicle Size Selection

**UI**: Three buttons (Small / Medium / Large)

**Pricing Logic** (hardcoded in frontend):
```javascript
const vehicleSizeFees = {
  small: 0,
  medium: 5,
  large: 10
};
```

**Event Handler**:
```javascript
const handleVehicleSizeSelect = (size) => {
  setVehicleSize(size);
  setStep(3);
};
```

**Price Calculation Trigger**: 
```javascript
useEffect(() => {
  const interiorPrice = interiorPackage?.price || 0;
  const exteriorPrice = exteriorPackage?.price || 0;
  const sizeFee = vehicleSizeFees[vehicleSize] || 0;
  const total = interiorPrice + exteriorPrice + sizeFee;
  
  setTotalPrice(total);
}, [interiorPackage, exteriorPackage, vehicleSize]);
```

**State Change**:
- `vehicleSize` → 'small' | 'medium' | 'large'
- `step` → 3

### 2.5 Step 3: Package Selection

**UI Structure**:
- Two sections: Exterior Detailing (top), Interior Detailing (bottom)
- Each shows 3 packages filtered by `package_type`
- "Skip Interior" / "Skip Exterior" buttons for non-combo bookings

**Package Filtering**:
```javascript
const exteriorPackages = packages.filter(pkg => pkg.package_type === 'exterior');
const interiorPackages = packages.filter(pkg => pkg.package_type === 'interior');
```

**Duration Calculation**:
```javascript
useEffect(() => {
  const interiorDuration = interiorPackage?.duration_minutes || 0;
  const exteriorDuration = exteriorPackage?.duration_minutes || 0;
  // Durations ADD (not overlap)
  setTotalDuration(interiorDuration + exteriorDuration);
}, [interiorPackage, exteriorPackage]);
```

**Selection Logic**:
```javascript
const handlePackageSelect = (pkg, type) => {
  if (type === 'interior') {
    setInteriorPackage(interiorPackage?.id === pkg.id ? null : pkg); // Toggle
  } else {
    setExteriorPackage(exteriorPackage?.id === pkg.id ? null : pkg);
  }
};
```

**Validation**:
```javascript
const canProceed = interiorPackage || exteriorPackage; // At least one required
```

**State Change**:
- `interiorPackage` → Package object or null
- `exteriorPackage` → Package object or null
- `totalDuration` → Sum of selected package durations
- `totalPrice` → Recalculated via useEffect
- `step` → 4 (on "Next" click)

### 2.6 Step 4: Date & Time Selection

**Date Picker Configuration**:
```javascript
<DatePicker
  selected={selectedDate}
  onChange={handleDateChange}
  minDate={new Date()} // Cannot book past dates
  maxDate={addDays(new Date(), 90)} // 90-day booking window
  filterDate={isDateAvailable} // Custom filter function
  inline
  calendarClassName="booking-calendar"
/>
```

**Date Availability Filter**:
```javascript
const isDateAvailable = (date) => {
  const day = date.getDay();
  // 0 = Sunday, 6 = Saturday
  return day !== 0 && day !== 6; // Weekdays only (Mon-Fri)
};
```

**Time Slot Generation** (triggered on date selection):

```javascript
const handleDateChange = async (date) => {
  setSelectedDate(date);
  setSelectedTime(''); // Reset time selection
  
  // Fetch existing bookings for this date
  const { data: existingBookings } = await supabase
    .from('bookings')
    .select('start_time, end_time')
    .eq('booking_date', format(date, 'yyyy-MM-dd'))
    .neq('status', 'cancelled');
  
  const slots = generateAvailableSlots(date, existingBookings);
  setAvailableSlots(slots);
};
```

**Slot Generation Algorithm**:

```javascript
const generateAvailableSlots = (date, existingBookings) => {
  const slots = [];
  const businessHours = { start: 15, end: 18 }; // 3 PM - 6 PM
  
  // Generate 30-minute intervals
  for (let hour = businessHours.start; hour < businessHours.end; hour++) {
    for (let minute of [0, 30]) {
      const slotStart = new Date(date);
      slotStart.setHours(hour, minute, 0, 0);
      
      // Calculate slot end time based on total duration
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + totalDuration);
      
      // Check if slot end exceeds business hours
      const endHour = slotEnd.getHours();
      const endMinute = slotEnd.getMinutes();
      const endTime = endHour + endMinute / 60;
      
      if (endTime > businessHours.end) continue; // Slot too late
      
      // Check for conflicts with existing bookings
      const hasConflict = existingBookings.some(booking => {
        const bookingStart = parseTime(booking.start_time);
        const bookingEnd = parseTime(booking.end_time);
        
        // Conflict if:
        // 1. New slot starts during existing booking
        // 2. New slot ends during existing booking
        // 3. New slot completely contains existing booking
        return (
          (slotStart >= bookingStart && slotStart < bookingEnd) ||
          (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
          (slotStart <= bookingStart && slotEnd >= bookingEnd)
        );
      });
      
      if (!hasConflict) {
        slots.push({
          time: format(slotStart, 'HH:mm'),
          display: format(slotStart, 'h:mm a')
        });
      }
    }
  }
  
  return slots;
};

const parseTime = (timeString) => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};
```

**Conflict Detection Logic Explained**:

Given:
- Existing booking: 3:00 PM - 4:30 PM
- New booking duration: 60 minutes

Scenarios:
1. **Slot 3:30 PM**: Would end at 4:30 PM → **CONFLICT** (overlaps existing)
2. **Slot 4:30 PM**: Would end at 5:30 PM → **AVAILABLE** (starts after existing ends)
3. **Slot 2:30 PM**: Would end at 3:30 PM → **CONFLICT** (ends during existing)

**Time Selection Handler**:
```javascript
const handleTimeSelect = (time) => {
  setSelectedTime(time);
  setStep(5); // Auto-advance
};
```

**State Changes**:
- `selectedDate` → Date object
- `selectedTime` → 'HH:MM' string
- `availableSlots` → Array of available time objects
- `step` → 5

### 2.7 Step 5: Customer Information

**Form Fields**:
```javascript
<input 
  type="text" 
  value={customerInfo.name}
  onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
  required 
/>
<input 
  type="tel" 
  value={customerInfo.phone}
  pattern="[0-9]{10}" // Validates 10-digit US phone
  required 
/>
<input 
  type="email" 
  value={customerInfo.email}
  required 
/>
{serviceType === 'mobile' && (
  <input 
    type="text" 
    value={customerInfo.address}
    required 
  />
)}
<textarea 
  value={customerInfo.notes}
  placeholder="Any special requests?" 
/>
{serviceType === 'mobile' && (
  <label>
    <input 
      type="checkbox" 
      checked={customerInfo.hasWaterElectric}
      onChange={(e) => setCustomerInfo({...customerInfo, hasWaterElectric: e.target.checked})}
    />
    I have water and electricity available
  </label>
)}
```

**Validation Logic**:
```javascript
const validateForm = () => {
  const newErrors = {};
  
  if (!customerInfo.name.trim()) {
    newErrors.name = 'Name is required';
  }
  
  if (!customerInfo.phone.trim()) {
    newErrors.phone = 'Phone number is required';
  } else if (!/^\d{10}$/.test(customerInfo.phone.replace(/\D/g, ''))) {
    newErrors.phone = 'Please enter a valid 10-digit phone number';
  }
  
  if (!customerInfo.email.trim()) {
    newErrors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerInfo.email)) {
    newErrors.email = 'Please enter a valid email address';
  }
  
  if (serviceType === 'mobile' && !customerInfo.address.trim()) {
    newErrors.address = 'Address is required for mobile service';
  }
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

**Submit Handler**:
```javascript
const handleSubmit = async () => {
  if (!validateForm()) {
    return; // Show errors, don't submit
  }
  
  setIsSubmitting(true);
  
  try {
    // Calculate end time
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const startTime = new Date(selectedDate);
    startTime.setHours(hours, minutes, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + totalDuration);
    
    // Prepare payload
    const bookingData = {
      customer_name: customerInfo.name.trim(),
      customer_phone: customerInfo.phone.replace(/\D/g, ''), // Strip formatting
      customer_email: customerInfo.email.trim().toLowerCase(),
      customer_address: serviceType === 'mobile' ? customerInfo.address.trim() : null,
      service_type: serviceType,
      vehicle_size: vehicleSize,
      interior_package_id: interiorPackage?.id || null,
      exterior_package_id: exteriorPackage?.id || null,
      has_water_electric: serviceType === 'mobile' ? customerInfo.hasWaterElectric : false,
      customer_notes: customerInfo.notes.trim() || null,
      booking_date: format(selectedDate, 'yyyy-MM-dd'),
      start_time: format(startTime, 'HH:mm:ss'),
      end_time: format(endTime, 'HH:mm:ss'),
      status: 'pending' // Admin must confirm
    };
    
    // Call Edge Function (NOT direct DB insert)
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-booking`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(bookingData)
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Booking failed');
    }
    
    const result = await response.json();
    
    // Success state
    setShowThankYou(true);
    
    // Reset form after 5 seconds
    setTimeout(() => {
      resetForm();
    }, 5000);
    
  } catch (error) {
    console.error('Booking error:', error);
    setErrors({ submit: error.message || 'Something went wrong. Please try again.' });
  } finally {
    setIsSubmitting(false);
  }
};
```

**Why Edge Function Instead of Direct Insert?**
1. **Business Logic**: Price calculation, duration validation, conflict checking
2. **Customer Auto-Creation**: Automatically creates/updates customer record
3. **Email Notifications**: Sends emails to customer and owner
4. **Calendar Integration**: Creates Google Calendar event (if configured)
5. **Data Integrity**: Server-side validation prevents tampering

---

## 3. EDGE FUNCTION: `create-booking`

**File**: `carwebitebooking/supabase/functions/create-booking/index.ts`

**Runtime**: Deno (TypeScript)

**Authentication**: Public endpoint (uses `anon` key)

### 3.1 Request Handler

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const bookingData = await req.json();
    
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Elevated permissions
    );
    
    // Step 1: Calculate pricing
    const pricing = await calculatePricing(supabaseClient, bookingData);
    
    // Step 2: Create/update customer
    const customer = await upsertCustomer(supabaseClient, bookingData);
    
    // Step 3: Insert booking
    const booking = await insertBooking(supabaseClient, bookingData, pricing);
    
    // Step 4: Send notifications (async, don't wait)
    sendNotifications(booking).catch(console.error);
    
    return new Response(
      JSON.stringify(booking),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### 3.2 Pricing Calculation

```typescript
async function calculatePricing(supabase, bookingData) {
  const { interior_package_id, exterior_package_id, vehicle_size } = bookingData;
  
  let subtotal = 0;
  let totalDuration = 0;
  
  // Fetch package prices
  if (interior_package_id) {
    const { data: pkg } = await supabase
      .from('packages')
      .select('price, duration_minutes')
      .eq('id', interior_package_id)
      .single();
    
    if (pkg) {
      subtotal += pkg.price;
      totalDuration += pkg.duration_minutes;
    }
  }
  
  if (exterior_package_id) {
    const { data: pkg } = await supabase
      .from('packages')
      .select('price, duration_minutes')
      .eq('id', exterior_package_id)
      .single();
    
    if (pkg) {
      subtotal += pkg.price;
      totalDuration += pkg.duration_minutes;
    }
  }
  
  // Add vehicle size fee
  const vehicleSizeFees = {
    small: 0,
    medium: 5,
    large: 10
  };
  
  const sizeFee = vehicleSizeFees[vehicle_size] || 0;
  const totalPrice = subtotal + sizeFee;
  
  return {
    subtotal,
    vehicle_size_fee: sizeFee,
    total_price: totalPrice,
    total_duration_minutes: totalDuration
  };
}
```

### 3.3 Customer Upsert Logic

```typescript
async function upsertCustomer(supabase, bookingData) {
  const { customer_name, customer_phone, customer_email, customer_address } = bookingData;
  
  // Check if customer exists (by phone)
  const { data: existingCustomer, error: checkError } = await supabase
    .from('customers')
    .select('*')
    .eq('phone', customer_phone)
    .maybeSingle(); // Returns null if not found (doesn't throw error)
  
  if (checkError && checkError.code !== 'PGRST116') {
    // PGRST116 = no rows returned (expected)
    throw checkError;
  }
  
  if (existingCustomer) {
    console.log('Customer already exists:', existingCustomer.id);
    
    // Update customer info (email/address may have changed)
    const { data: updatedCustomer } = await supabase
      .from('customers')
      .update({
        name: customer_name,
        email: customer_email,
        address: customer_address,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingCustomer.id)
      .select()
      .single();
    
    return updatedCustomer || existingCustomer;
  }
  
  // Create new customer
  const { data: newCustomer, error: insertError } = await supabase
    .from('customers')
    .insert([{
      name: customer_name,
      phone: customer_phone,
      email: customer_email,
      address: customer_address,
      total_bookings: 0,
      total_spent: 0
    }])
    .select()
    .single();
  
  if (insertError) throw insertError;
  
  console.log('New customer created:', newCustomer.id);
  return newCustomer;
}
```

**Key Fix**: Changed `.single()` to `.maybeSingle()` on line 203 of the original code. 

**Why?**
- `.single()` throws error if 0 rows returned → customer creation was silently failing
- `.maybeSingle()` returns `null` if 0 rows → proper check for non-existent customer

### 3.4 Booking Insertion

```typescript
async function insertBooking(supabase, bookingData, pricing) {
  const { data: booking, error } = await supabase
    .from('bookings')
    .insert([{
      ...bookingData,
      ...pricing,
      status: 'confirmed', // Auto-confirm (or use 'pending' for manual approval)
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])
    .select()
    .single();
  
  if (error) {
    console.error('Insert error:', error);
    throw new Error('Failed to create booking: ' + error.message);
  }
  
  console.log('Booking created successfully:', booking.id);
  return booking;
}
```

### 3.5 Email Notifications

```typescript
async function sendNotifications(booking) {
  const SEND_EMAIL_URL = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`;
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
  
  // Customer confirmation email
  try {
    const customerEmailResponse = await fetch(SEND_EMAIL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        to: booking.customer_email,
        subject: 'Booking Confirmation - Andrew\'s Car Wash',
        body: generateCustomerEmailHTML(booking)
      })
    });
    
    if (customerEmailResponse.ok) {
      console.log('✅ Customer confirmation email sent successfully');
    } else {
      const errorText = await customerEmailResponse.text();
      console.error('❌ Failed to send customer email:', errorText);
    }
  } catch (error) {
    console.error('❌ Email error:', error);
  }
  
  // Owner notification email
  const OWNER_EMAIL = Deno.env.get('OWNER_EMAIL') || 'andrewswashing@gmail.com';
  
  try {
    const ownerEmailResponse = await fetch(SEND_EMAIL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        to: OWNER_EMAIL,
        subject: `New Booking: ${booking.customer_name}`,
        body: generateOwnerEmailHTML(booking)
      })
    });
    
    if (ownerEmailResponse.ok) {
      console.log('✅ Owner notification email sent successfully');
    } else {
      const errorText = await ownerEmailResponse.text();
      console.error('❌ Failed to send owner email:', errorText);
    }
  } catch (error) {
    console.error('❌ Email error:', error);
  }
}
```

---

## 4. EDGE FUNCTION: `send-email`

**File**: `carwebitebooking/supabase/functions/send-email/index.ts`

**Email Provider**: Resend (https://resend.com)

**Authentication**: Public endpoint (no JWT validation to allow internal calls)

### 4.1 Request Handler

```typescript
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { to, subject, body } = await req.json();
    
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'bookings@andrew.us.kg';
    
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured');
    }
    
    // Call Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `Andrew's Car Wash <${FROM_EMAIL}>`,
        to: [to],
        subject: subject,
        html: body
      })
    });
    
    const result = await resendResponse.json();
    
    if (!resendResponse.ok) {
      throw new Error(result.message || 'Failed to send email');
    }
    
    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully', id: result.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Send email error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### 4.2 Email Templates

**Customer Confirmation Email**:
```typescript
function generateCustomerEmailHTML(booking) {
  const dateStr = new Date(booking.booking_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                  color: white; padding: 30px; text-align: center; }
        .content { background: #f9f9f9; padding: 30px; }
        .details { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Booking Confirmed! 🚗✨</h1>
        </div>
        <div class="content">
          <p>Hi ${booking.customer_name},</p>
          <p>Your car wash appointment has been confirmed!</p>
          
          <div class="details">
            <h3>Booking Details</h3>
            <p><strong>Date:</strong> ${dateStr}</p>
            <p><strong>Time:</strong> ${booking.start_time}</p>
            <p><strong>Service:</strong> ${booking.service_type === 'mobile' ? 'Mobile Service' : 'Shop Location'}</p>
            ${booking.service_type === 'mobile' ? `<p><strong>Address:</strong> ${booking.customer_address}</p>` : ''}
            <p><strong>Vehicle Size:</strong> ${booking.vehicle_size}</p>
            <p><strong>Duration:</strong> ${booking.total_duration_minutes} minutes</p>
            <p><strong>Total Price:</strong> $${booking.total_price}</p>
          </div>
          
          <p>We'll send you a reminder 24 hours before your appointment.</p>
          <p>If you need to reschedule or cancel, please contact us at least 24 hours in advance.</p>
        </div>
        <div class="footer">
          <p>Andrew's Car Wash | (562) 310-1075 | andrewswashing@gmail.com</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
```

**Owner Notification Email** (with Apple Calendar link):
```typescript
function generateOwnerEmailHTML(booking) {
  const dateStr = new Date(booking.booking_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Generate ICS file content
  const icsContent = generateICS(booking);
  const icsDataURI = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 30px; text-align: center; }
        .content { background: #f9f9f9; padding: 30px; }
        .details { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .calendar-btn { display: inline-block; background: #10b981; color: white; 
                        padding: 12px 24px; text-decoration: none; border-radius: 6px; 
                        margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔔 New Booking Received</h1>
        </div>
        <div class="content">
          <div class="details">
            <h3>Customer Information</h3>
            <p><strong>Name:</strong> ${booking.customer_name}</p>
            <p><strong>Phone:</strong> ${booking.customer_phone}</p>
            <p><strong>Email:</strong> ${booking.customer_email}</p>
            ${booking.customer_address ? `<p><strong>Address:</strong> ${booking.customer_address}</p>` : ''}
          </div>
          
          <div class="details">
            <h3>Service Details</h3>
            <p><strong>Date:</strong> ${dateStr}</p>
            <p><strong>Time:</strong> ${booking.start_time} - ${booking.end_time}</p>
            <p><strong>Service Type:</strong> ${booking.service_type === 'mobile' ? 'Mobile Service' : 'Shop Location'}</p>
            <p><strong>Vehicle Size:</strong> ${booking.vehicle_size}</p>
            <p><strong>Duration:</strong> ${booking.total_duration_minutes} minutes</p>
            <p><strong>Total Price:</strong> $${booking.total_price}</p>
            ${booking.customer_notes ? `<p><strong>Notes:</strong> ${booking.customer_notes}</p>` : ''}
          </div>
          
          <div style="text-align: center;">
            <a href="${icsDataURI}" download="booking-${booking.id}.ics" class="calendar-btn">
              📅 Add to Apple Calendar
            </a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateICS(booking) {
  const startDate = new Date(`${booking.booking_date}T${booking.start_time}`);
  const endDate = new Date(`${booking.booking_date}T${booking.end_time}`);
  
  // Format as YYYYMMDDTHHMMSS
  const formatICSDate = (date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };
  
  const location = booking.service_type === 'mobile' 
    ? booking.customer_address 
    : 'Andrew\'s Car Wash - Shop Location';
  
  const description = `
Customer: ${booking.customer_name}
Phone: ${booking.customer_phone}
Email: ${booking.customer_email}
Service: ${booking.service_type}
Vehicle: ${booking.vehicle_size}
Price: $${booking.total_price}
${booking.customer_notes ? `Notes: ${booking.customer_notes}` : ''}
  `.trim();
  
  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Andrew's Car Wash//Booking System//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:${booking.id}@andrew.us.kg
DTSTAMP:${formatICSDate(new Date())}
DTSTART:${formatICSDate(startDate)}
DTEND:${formatICSDate(endDate)}
SUMMARY:Car Wash - ${booking.customer_name}
DESCRIPTION:${description.replace(/\n/g, '\\n')}
LOCATION:${location}
STATUS:CONFIRMED
SEQUENCE:0
BEGIN:VALARM
TRIGGER:-PT24H
DESCRIPTION:Reminder: Car wash appointment tomorrow
ACTION:DISPLAY
END:VALARM
END:VEVENT
END:VCALENDAR`;
}
```

**Domain Configuration for Resend**:
- Domain: `andrew.us.kg`
- DNS Records added to Netlify:
  - SPF: `v=spf1 include:_spf.resend.com ~all`
  - DKIM: TXT record (provided by Resend)
  - Return-Path: CNAME (provided by Resend)
- From address: `bookings@andrew.us.kg`
- Domain verified ✅

---

## 5. ADMIN DASHBOARD - COMPLETE TECHNICAL BREAKDOWN

**File**: `carwebitebooking/frontend/src/components/AdminDashboard.jsx`

### 5.1 Authentication System

**CRITICAL SECURITY ISSUE**: 
- No actual authentication system implemented
- Hardcoded password check in frontend: `password === 'andrew123'`
- Service role key exposed in browser environment variables

```javascript
const AdminDashboard = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const handleLogin = () => {
    if (password === 'andrew123') { // ❌ INSECURE
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Invalid password');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-96">
          <h2 className="text-2xl font-bold mb-4
```


## License: unknown
https://github.com/mugoooz/donation-platform-front/blob/391be762d8883e1250fedcd1d4dd8116e5042e08/src/components/LoginForm.js

```
# Complete Technical Breakdown: Car Wash Booking System

## Project Architecture Overview

This is a **React-based single-page application** integrated with **Supabase** as the backend-as-a-service platform. The system consists of:

1. **Customer-facing booking widget** (public)
2. **Admin dashboard** (authenticated)
3. **Supabase Edge Functions** (serverless backend)
4. **PostgreSQL database** via Supabase
5. **Email notifications** via Resend API

---

## 1. DATABASE SCHEMA & TABLES

### 1.1 `bookings` Table
**Location**: `carwebitebooking/supabase/migrations/20240101000000_initial_schema.sql`

```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_address TEXT,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  total_duration_minutes INTEGER NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('mobile', 'shop')),
  vehicle_size TEXT NOT NULL CHECK (vehicle_size IN ('small', 'medium', 'large')),
  vehicle_size_fee NUMERIC(10,2) DEFAULT 0,
  interior_package_id UUID REFERENCES packages(id),
  exterior_package_id UUID REFERENCES packages(id),
  subtotal NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  has_water_electric BOOLEAN DEFAULT false,
  customer_notes TEXT,
  google_calendar_event_id TEXT,
  ics_file_sent BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  final_amount NUMERIC(10,2),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  line_items JSONB,
  payment_notes TEXT,
  finalized_at TIMESTAMPTZ
);
```

**Key Design Decisions**:
- `id` is UUID for security (non-sequential, unpredictable)
- `customer_phone` not unique (allows repeat customers)
- `service_type` enum constraint enforces valid values
- `vehicle_size_fee` stored separately for price transparency
- Foreign keys to `packages` table with `ON DELETE SET NULL` (if package deleted, booking retains price but loses reference)
- `status` and `payment_status` separate fields for business logic flexibility
- `line_items` as JSONB for flexible pricing breakdown
- `finalized_at` timestamp tracks when admin confirmed final pricing

### 1.2 `packages` Table
**Location**: Same migration file

```sql
CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  package_type TEXT NOT NULL CHECK (package_type IN ('interior', 'exterior')),
  price NUMERIC(10,2) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  description TEXT,
  features TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Initial Data**:
- 3 interior packages: Standard ($20, 30min), Deluxe ($40, 45min), Ultimate ($60, 60min)
- 3 exterior packages: Standard ($20, 30min), Deluxe ($35, 45min), Ultimate ($50, 60min)

### 1.3 `customers` Table
**Location**: `carwebitebooking/supabase/migrations/20240103000000_add_customers_table.sql`

```sql
CREATE TABLE customers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT,
  address TEXT,
  notes TEXT,
  total_bookings INTEGER DEFAULT 0,
  total_spent NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Design Decisions**:
- `phone` is UNIQUE constraint (one customer record per phone number)
- `BIGSERIAL` primary key (auto-incrementing integer)
- `total_bookings` and `total_spent` are **denormalized aggregates** for performance
- Updated via triggers or application logic after each booking

### 1.4 Row-Level Security (RLS)

**Authentication Context**: 
- Public users: `anon` role (JWT with `role: 'anon'`)
- Admin users: Manual authentication check in frontend (no actual auth table)

**RLS Policies** (`carwebitebooking/supabase/migrations/20240101000001_rls_policies.sql`):

```sql
-- Bookings: Public can insert (create bookings)
CREATE POLICY "Anyone can create bookings"
  ON bookings FOR INSERT
  TO anon
  WITH CHECK (true);

-- Bookings: Public can read their own (via email match)
CREATE POLICY "Anyone can read their bookings"
  ON bookings FOR SELECT
  TO anon
  USING (customer_email = current_setting('request.jwt.claims')::json->>'email');

-- Packages: Public read-only
CREATE POLICY "Anyone can view active packages"
  ON packages FOR SELECT
  TO anon
  USING (is_active = true);

-- Customers: Authenticated only
CREATE POLICY "Authenticated users can manage customers"
  ON customers FOR ALL
  TO authenticated
  USING (true);
```

**Security Analysis**:
- ❌ **VULNERABILITY**: Admin dashboard bypasses RLS by using `service_role` key client-side
- ⚠️ **RISK**: Service role key exposed in frontend env (`VITE_SUPABASE_SERVICE_KEY`)
- ✅ **MITIGATION**: Should use server-side Edge Functions for admin operations
- ✅ **Booking creation**: Properly uses `anon` key, no escalation possible

---

## 2. BOOKING WIDGET - COMPLETE TECHNICAL BREAKDOWN

### 2.1 Component Structure

**File**: `carwebitebooking/frontend/src/components/BookingWidget.jsx`

**Framework**: React 18 with Hooks
**Dependencies**:
- `react-datepicker` v4.x (calendar UI)
- `lucide-react` (icons)
- `@supabase/supabase-js` v2.x (database client)
- `date-fns` (date manipulation)

**State Management** (all local via `useState`):

```javascript
const [step, setStep] = useState(1);                    // Current form step (1-5)
const [serviceType, setServiceType] = useState('');     // 'mobile' | 'shop'
const [vehicleSize, setVehicleSize] = useState('');     // 'small' | 'medium' | 'large'
const [selectedDate, setSelectedDate] = useState(null); // Date object
const [selectedTime, setSelectedTime] = useState('');   // 'HH:MM' string
const [interiorPackage, setInteriorPackage] = useState(null); // Package object
const [exteriorPackage, setExteriorPackage] = useState(null); // Package object
const [packages, setPackages] = useState([]);           // Fetched from DB
const [availableSlots, setAvailableSlots] = useState([]); // Calculated time slots
const [customerInfo, setCustomerInfo] = useState({      // Form data
  name: '', phone: '', email: '', address: '', notes: '', hasWaterElectric: false
});
const [isSubmitting, setIsSubmitting] = useState(false);
const [errors, setErrors] = useState({});               // Validation errors
const [showThankYou, setShowThankYou] = useState(false);
const [totalPrice, setTotalPrice] = useState(0);        // Calculated price
const [totalDuration, setTotalDuration] = useState(0);  // Calculated minutes
```

### 2.2 Data Fetching on Mount

**Execution Flow**:

```javascript
useEffect(() => {
  const fetchPackages = async () => {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });
    
    if (!error) setPackages(data);
  };
  fetchPackages();
}, []);
```

**Query Details**:
- **Table**: `packages`
- **Filter**: `is_active = true`
- **Order**: By `price` ASC (cheapest first)
- **Auth**: Uses `anon` key (public read)
- **RLS**: Passes "view active packages" policy

### 2.3 Step 1: Service Type Selection

**UI**: Two large buttons (Mobile / Shop Location)

**Event Handler**:
```javascript
const handleServiceTypeSelect = (type) => {
  setServiceType(type);
  setStep(2); // Auto-advance
};
```

**Validation**: None (both options always valid)

**State Change**: 
- `serviceType` → 'mobile' or 'shop'
- `step` → 2

**Conditional Logic**: If `serviceType === 'mobile'`, Step 4 requires `address` field

### 2.4 Step 2: Vehicle Size Selection

**UI**: Three buttons (Small / Medium / Large)

**Pricing Logic** (hardcoded in frontend):
```javascript
const vehicleSizeFees = {
  small: 0,
  medium: 5,
  large: 10
};
```

**Event Handler**:
```javascript
const handleVehicleSizeSelect = (size) => {
  setVehicleSize(size);
  setStep(3);
};
```

**Price Calculation Trigger**: 
```javascript
useEffect(() => {
  const interiorPrice = interiorPackage?.price || 0;
  const exteriorPrice = exteriorPackage?.price || 0;
  const sizeFee = vehicleSizeFees[vehicleSize] || 0;
  const total = interiorPrice + exteriorPrice + sizeFee;
  
  setTotalPrice(total);
}, [interiorPackage, exteriorPackage, vehicleSize]);
```

**State Change**:
- `vehicleSize` → 'small' | 'medium' | 'large'
- `step` → 3

### 2.5 Step 3: Package Selection

**UI Structure**:
- Two sections: Exterior Detailing (top), Interior Detailing (bottom)
- Each shows 3 packages filtered by `package_type`
- "Skip Interior" / "Skip Exterior" buttons for non-combo bookings

**Package Filtering**:
```javascript
const exteriorPackages = packages.filter(pkg => pkg.package_type === 'exterior');
const interiorPackages = packages.filter(pkg => pkg.package_type === 'interior');
```

**Duration Calculation**:
```javascript
useEffect(() => {
  const interiorDuration = interiorPackage?.duration_minutes || 0;
  const exteriorDuration = exteriorPackage?.duration_minutes || 0;
  // Durations ADD (not overlap)
  setTotalDuration(interiorDuration + exteriorDuration);
}, [interiorPackage, exteriorPackage]);
```

**Selection Logic**:
```javascript
const handlePackageSelect = (pkg, type) => {
  if (type === 'interior') {
    setInteriorPackage(interiorPackage?.id === pkg.id ? null : pkg); // Toggle
  } else {
    setExteriorPackage(exteriorPackage?.id === pkg.id ? null : pkg);
  }
};
```

**Validation**:
```javascript
const canProceed = interiorPackage || exteriorPackage; // At least one required
```

**State Change**:
- `interiorPackage` → Package object or null
- `exteriorPackage` → Package object or null
- `totalDuration` → Sum of selected package durations
- `totalPrice` → Recalculated via useEffect
- `step` → 4 (on "Next" click)

### 2.6 Step 4: Date & Time Selection

**Date Picker Configuration**:
```javascript
<DatePicker
  selected={selectedDate}
  onChange={handleDateChange}
  minDate={new Date()} // Cannot book past dates
  maxDate={addDays(new Date(), 90)} // 90-day booking window
  filterDate={isDateAvailable} // Custom filter function
  inline
  calendarClassName="booking-calendar"
/>
```

**Date Availability Filter**:
```javascript
const isDateAvailable = (date) => {
  const day = date.getDay();
  // 0 = Sunday, 6 = Saturday
  return day !== 0 && day !== 6; // Weekdays only (Mon-Fri)
};
```

**Time Slot Generation** (triggered on date selection):

```javascript
const handleDateChange = async (date) => {
  setSelectedDate(date);
  setSelectedTime(''); // Reset time selection
  
  // Fetch existing bookings for this date
  const { data: existingBookings } = await supabase
    .from('bookings')
    .select('start_time, end_time')
    .eq('booking_date', format(date, 'yyyy-MM-dd'))
    .neq('status', 'cancelled');
  
  const slots = generateAvailableSlots(date, existingBookings);
  setAvailableSlots(slots);
};
```

**Slot Generation Algorithm**:

```javascript
const generateAvailableSlots = (date, existingBookings) => {
  const slots = [];
  const businessHours = { start: 15, end: 18 }; // 3 PM - 6 PM
  
  // Generate 30-minute intervals
  for (let hour = businessHours.start; hour < businessHours.end; hour++) {
    for (let minute of [0, 30]) {
      const slotStart = new Date(date);
      slotStart.setHours(hour, minute, 0, 0);
      
      // Calculate slot end time based on total duration
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + totalDuration);
      
      // Check if slot end exceeds business hours
      const endHour = slotEnd.getHours();
      const endMinute = slotEnd.getMinutes();
      const endTime = endHour + endMinute / 60;
      
      if (endTime > businessHours.end) continue; // Slot too late
      
      // Check for conflicts with existing bookings
      const hasConflict = existingBookings.some(booking => {
        const bookingStart = parseTime(booking.start_time);
        const bookingEnd = parseTime(booking.end_time);
        
        // Conflict if:
        // 1. New slot starts during existing booking
        // 2. New slot ends during existing booking
        // 3. New slot completely contains existing booking
        return (
          (slotStart >= bookingStart && slotStart < bookingEnd) ||
          (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
          (slotStart <= bookingStart && slotEnd >= bookingEnd)
        );
      });
      
      if (!hasConflict) {
        slots.push({
          time: format(slotStart, 'HH:mm'),
          display: format(slotStart, 'h:mm a')
        });
      }
    }
  }
  
  return slots;
};

const parseTime = (timeString) => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};
```

**Conflict Detection Logic Explained**:

Given:
- Existing booking: 3:00 PM - 4:30 PM
- New booking duration: 60 minutes

Scenarios:
1. **Slot 3:30 PM**: Would end at 4:30 PM → **CONFLICT** (overlaps existing)
2. **Slot 4:30 PM**: Would end at 5:30 PM → **AVAILABLE** (starts after existing ends)
3. **Slot 2:30 PM**: Would end at 3:30 PM → **CONFLICT** (ends during existing)

**Time Selection Handler**:
```javascript
const handleTimeSelect = (time) => {
  setSelectedTime(time);
  setStep(5); // Auto-advance
};
```

**State Changes**:
- `selectedDate` → Date object
- `selectedTime` → 'HH:MM' string
- `availableSlots` → Array of available time objects
- `step` → 5

### 2.7 Step 5: Customer Information

**Form Fields**:
```javascript
<input 
  type="text" 
  value={customerInfo.name}
  onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
  required 
/>
<input 
  type="tel" 
  value={customerInfo.phone}
  pattern="[0-9]{10}" // Validates 10-digit US phone
  required 
/>
<input 
  type="email" 
  value={customerInfo.email}
  required 
/>
{serviceType === 'mobile' && (
  <input 
    type="text" 
    value={customerInfo.address}
    required 
  />
)}
<textarea 
  value={customerInfo.notes}
  placeholder="Any special requests?" 
/>
{serviceType === 'mobile' && (
  <label>
    <input 
      type="checkbox" 
      checked={customerInfo.hasWaterElectric}
      onChange={(e) => setCustomerInfo({...customerInfo, hasWaterElectric: e.target.checked})}
    />
    I have water and electricity available
  </label>
)}
```

**Validation Logic**:
```javascript
const validateForm = () => {
  const newErrors = {};
  
  if (!customerInfo.name.trim()) {
    newErrors.name = 'Name is required';
  }
  
  if (!customerInfo.phone.trim()) {
    newErrors.phone = 'Phone number is required';
  } else if (!/^\d{10}$/.test(customerInfo.phone.replace(/\D/g, ''))) {
    newErrors.phone = 'Please enter a valid 10-digit phone number';
  }
  
  if (!customerInfo.email.trim()) {
    newErrors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerInfo.email)) {
    newErrors.email = 'Please enter a valid email address';
  }
  
  if (serviceType === 'mobile' && !customerInfo.address.trim()) {
    newErrors.address = 'Address is required for mobile service';
  }
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

**Submit Handler**:
```javascript
const handleSubmit = async () => {
  if (!validateForm()) {
    return; // Show errors, don't submit
  }
  
  setIsSubmitting(true);
  
  try {
    // Calculate end time
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const startTime = new Date(selectedDate);
    startTime.setHours(hours, minutes, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + totalDuration);
    
    // Prepare payload
    const bookingData = {
      customer_name: customerInfo.name.trim(),
      customer_phone: customerInfo.phone.replace(/\D/g, ''), // Strip formatting
      customer_email: customerInfo.email.trim().toLowerCase(),
      customer_address: serviceType === 'mobile' ? customerInfo.address.trim() : null,
      service_type: serviceType,
      vehicle_size: vehicleSize,
      interior_package_id: interiorPackage?.id || null,
      exterior_package_id: exteriorPackage?.id || null,
      has_water_electric: serviceType === 'mobile' ? customerInfo.hasWaterElectric : false,
      customer_notes: customerInfo.notes.trim() || null,
      booking_date: format(selectedDate, 'yyyy-MM-dd'),
      start_time: format(startTime, 'HH:mm:ss'),
      end_time: format(endTime, 'HH:mm:ss'),
      status: 'pending' // Admin must confirm
    };
    
    // Call Edge Function (NOT direct DB insert)
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-booking`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(bookingData)
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Booking failed');
    }
    
    const result = await response.json();
    
    // Success state
    setShowThankYou(true);
    
    // Reset form after 5 seconds
    setTimeout(() => {
      resetForm();
    }, 5000);
    
  } catch (error) {
    console.error('Booking error:', error);
    setErrors({ submit: error.message || 'Something went wrong. Please try again.' });
  } finally {
    setIsSubmitting(false);
  }
};
```

**Why Edge Function Instead of Direct Insert?**
1. **Business Logic**: Price calculation, duration validation, conflict checking
2. **Customer Auto-Creation**: Automatically creates/updates customer record
3. **Email Notifications**: Sends emails to customer and owner
4. **Calendar Integration**: Creates Google Calendar event (if configured)
5. **Data Integrity**: Server-side validation prevents tampering

---

## 3. EDGE FUNCTION: `create-booking`

**File**: `carwebitebooking/supabase/functions/create-booking/index.ts`

**Runtime**: Deno (TypeScript)

**Authentication**: Public endpoint (uses `anon` key)

### 3.1 Request Handler

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const bookingData = await req.json();
    
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Elevated permissions
    );
    
    // Step 1: Calculate pricing
    const pricing = await calculatePricing(supabaseClient, bookingData);
    
    // Step 2: Create/update customer
    const customer = await upsertCustomer(supabaseClient, bookingData);
    
    // Step 3: Insert booking
    const booking = await insertBooking(supabaseClient, bookingData, pricing);
    
    // Step 4: Send notifications (async, don't wait)
    sendNotifications(booking).catch(console.error);
    
    return new Response(
      JSON.stringify(booking),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### 3.2 Pricing Calculation

```typescript
async function calculatePricing(supabase, bookingData) {
  const { interior_package_id, exterior_package_id, vehicle_size } = bookingData;
  
  let subtotal = 0;
  let totalDuration = 0;
  
  // Fetch package prices
  if (interior_package_id) {
    const { data: pkg } = await supabase
      .from('packages')
      .select('price, duration_minutes')
      .eq('id', interior_package_id)
      .single();
    
    if (pkg) {
      subtotal += pkg.price;
      totalDuration += pkg.duration_minutes;
    }
  }
  
  if (exterior_package_id) {
    const { data: pkg } = await supabase
      .from('packages')
      .select('price, duration_minutes')
      .eq('id', exterior_package_id)
      .single();
    
    if (pkg) {
      subtotal += pkg.price;
      totalDuration += pkg.duration_minutes;
    }
  }
  
  // Add vehicle size fee
  const vehicleSizeFees = {
    small: 0,
    medium: 5,
    large: 10
  };
  
  const sizeFee = vehicleSizeFees[vehicle_size] || 0;
  const totalPrice = subtotal + sizeFee;
  
  return {
    subtotal,
    vehicle_size_fee: sizeFee,
    total_price: totalPrice,
    total_duration_minutes: totalDuration
  };
}
```

### 3.3 Customer Upsert Logic

```typescript
async function upsertCustomer(supabase, bookingData) {
  const { customer_name, customer_phone, customer_email, customer_address } = bookingData;
  
  // Check if customer exists (by phone)
  const { data: existingCustomer, error: checkError } = await supabase
    .from('customers')
    .select('*')
    .eq('phone', customer_phone)
    .maybeSingle(); // Returns null if not found (doesn't throw error)
  
  if (checkError && checkError.code !== 'PGRST116') {
    // PGRST116 = no rows returned (expected)
    throw checkError;
  }
  
  if (existingCustomer) {
    console.log('Customer already exists:', existingCustomer.id);
    
    // Update customer info (email/address may have changed)
    const { data: updatedCustomer } = await supabase
      .from('customers')
      .update({
        name: customer_name,
        email: customer_email,
        address: customer_address,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingCustomer.id)
      .select()
      .single();
    
    return updatedCustomer || existingCustomer;
  }
  
  // Create new customer
  const { data: newCustomer, error: insertError } = await supabase
    .from('customers')
    .insert([{
      name: customer_name,
      phone: customer_phone,
      email: customer_email,
      address: customer_address,
      total_bookings: 0,
      total_spent: 0
    }])
    .select()
    .single();
  
  if (insertError) throw insertError;
  
  console.log('New customer created:', newCustomer.id);
  return newCustomer;
}
```

**Key Fix**: Changed `.single()` to `.maybeSingle()` on line 203 of the original code. 

**Why?**
- `.single()` throws error if 0 rows returned → customer creation was silently failing
- `.maybeSingle()` returns `null` if 0 rows → proper check for non-existent customer

### 3.4 Booking Insertion

```typescript
async function insertBooking(supabase, bookingData, pricing) {
  const { data: booking, error } = await supabase
    .from('bookings')
    .insert([{
      ...bookingData,
      ...pricing,
      status: 'confirmed', // Auto-confirm (or use 'pending' for manual approval)
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])
    .select()
    .single();
  
  if (error) {
    console.error('Insert error:', error);
    throw new Error('Failed to create booking: ' + error.message);
  }
  
  console.log('Booking created successfully:', booking.id);
  return booking;
}
```

### 3.5 Email Notifications

```typescript
async function sendNotifications(booking) {
  const SEND_EMAIL_URL = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`;
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
  
  // Customer confirmation email
  try {
    const customerEmailResponse = await fetch(SEND_EMAIL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        to: booking.customer_email,
        subject: 'Booking Confirmation - Andrew\'s Car Wash',
        body: generateCustomerEmailHTML(booking)
      })
    });
    
    if (customerEmailResponse.ok) {
      console.log('✅ Customer confirmation email sent successfully');
    } else {
      const errorText = await customerEmailResponse.text();
      console.error('❌ Failed to send customer email:', errorText);
    }
  } catch (error) {
    console.error('❌ Email error:', error);
  }
  
  // Owner notification email
  const OWNER_EMAIL = Deno.env.get('OWNER_EMAIL') || 'andrewswashing@gmail.com';
  
  try {
    const ownerEmailResponse = await fetch(SEND_EMAIL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        to: OWNER_EMAIL,
        subject: `New Booking: ${booking.customer_name}`,
        body: generateOwnerEmailHTML(booking)
      })
    });
    
    if (ownerEmailResponse.ok) {
      console.log('✅ Owner notification email sent successfully');
    } else {
      const errorText = await ownerEmailResponse.text();
      console.error('❌ Failed to send owner email:', errorText);
    }
  } catch (error) {
    console.error('❌ Email error:', error);
  }
}
```

---

## 4. EDGE FUNCTION: `send-email`

**File**: `carwebitebooking/supabase/functions/send-email/index.ts`

**Email Provider**: Resend (https://resend.com)

**Authentication**: Public endpoint (no JWT validation to allow internal calls)

### 4.1 Request Handler

```typescript
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { to, subject, body } = await req.json();
    
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'bookings@andrew.us.kg';
    
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured');
    }
    
    // Call Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `Andrew's Car Wash <${FROM_EMAIL}>`,
        to: [to],
        subject: subject,
        html: body
      })
    });
    
    const result = await resendResponse.json();
    
    if (!resendResponse.ok) {
      throw new Error(result.message || 'Failed to send email');
    }
    
    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully', id: result.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Send email error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### 4.2 Email Templates

**Customer Confirmation Email**:
```typescript
function generateCustomerEmailHTML(booking) {
  const dateStr = new Date(booking.booking_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                  color: white; padding: 30px; text-align: center; }
        .content { background: #f9f9f9; padding: 30px; }
        .details { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Booking Confirmed! 🚗✨</h1>
        </div>
        <div class="content">
          <p>Hi ${booking.customer_name},</p>
          <p>Your car wash appointment has been confirmed!</p>
          
          <div class="details">
            <h3>Booking Details</h3>
            <p><strong>Date:</strong> ${dateStr}</p>
            <p><strong>Time:</strong> ${booking.start_time}</p>
            <p><strong>Service:</strong> ${booking.service_type === 'mobile' ? 'Mobile Service' : 'Shop Location'}</p>
            ${booking.service_type === 'mobile' ? `<p><strong>Address:</strong> ${booking.customer_address}</p>` : ''}
            <p><strong>Vehicle Size:</strong> ${booking.vehicle_size}</p>
            <p><strong>Duration:</strong> ${booking.total_duration_minutes} minutes</p>
            <p><strong>Total Price:</strong> $${booking.total_price}</p>
          </div>
          
          <p>We'll send you a reminder 24 hours before your appointment.</p>
          <p>If you need to reschedule or cancel, please contact us at least 24 hours in advance.</p>
        </div>
        <div class="footer">
          <p>Andrew's Car Wash | (562) 310-1075 | andrewswashing@gmail.com</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
```

**Owner Notification Email** (with Apple Calendar link):
```typescript
function generateOwnerEmailHTML(booking) {
  const dateStr = new Date(booking.booking_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Generate ICS file content
  const icsContent = generateICS(booking);
  const icsDataURI = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 30px; text-align: center; }
        .content { background: #f9f9f9; padding: 30px; }
        .details { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .calendar-btn { display: inline-block; background: #10b981; color: white; 
                        padding: 12px 24px; text-decoration: none; border-radius: 6px; 
                        margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔔 New Booking Received</h1>
        </div>
        <div class="content">
          <div class="details">
            <h3>Customer Information</h3>
            <p><strong>Name:</strong> ${booking.customer_name}</p>
            <p><strong>Phone:</strong> ${booking.customer_phone}</p>
            <p><strong>Email:</strong> ${booking.customer_email}</p>
            ${booking.customer_address ? `<p><strong>Address:</strong> ${booking.customer_address}</p>` : ''}
          </div>
          
          <div class="details">
            <h3>Service Details</h3>
            <p><strong>Date:</strong> ${dateStr}</p>
            <p><strong>Time:</strong> ${booking.start_time} - ${booking.end_time}</p>
            <p><strong>Service Type:</strong> ${booking.service_type === 'mobile' ? 'Mobile Service' : 'Shop Location'}</p>
            <p><strong>Vehicle Size:</strong> ${booking.vehicle_size}</p>
            <p><strong>Duration:</strong> ${booking.total_duration_minutes} minutes</p>
            <p><strong>Total Price:</strong> $${booking.total_price}</p>
            ${booking.customer_notes ? `<p><strong>Notes:</strong> ${booking.customer_notes}</p>` : ''}
          </div>
          
          <div style="text-align: center;">
            <a href="${icsDataURI}" download="booking-${booking.id}.ics" class="calendar-btn">
              📅 Add to Apple Calendar
            </a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateICS(booking) {
  const startDate = new Date(`${booking.booking_date}T${booking.start_time}`);
  const endDate = new Date(`${booking.booking_date}T${booking.end_time}`);
  
  // Format as YYYYMMDDTHHMMSS
  const formatICSDate = (date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };
  
  const location = booking.service_type === 'mobile' 
    ? booking.customer_address 
    : 'Andrew\'s Car Wash - Shop Location';
  
  const description = `
Customer: ${booking.customer_name}
Phone: ${booking.customer_phone}
Email: ${booking.customer_email}
Service: ${booking.service_type}
Vehicle: ${booking.vehicle_size}
Price: $${booking.total_price}
${booking.customer_notes ? `Notes: ${booking.customer_notes}` : ''}
  `.trim();
  
  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Andrew's Car Wash//Booking System//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:${booking.id}@andrew.us.kg
DTSTAMP:${formatICSDate(new Date())}
DTSTART:${formatICSDate(startDate)}
DTEND:${formatICSDate(endDate)}
SUMMARY:Car Wash - ${booking.customer_name}
DESCRIPTION:${description.replace(/\n/g, '\\n')}
LOCATION:${location}
STATUS:CONFIRMED
SEQUENCE:0
BEGIN:VALARM
TRIGGER:-PT24H
DESCRIPTION:Reminder: Car wash appointment tomorrow
ACTION:DISPLAY
END:VALARM
END:VEVENT
END:VCALENDAR`;
}
```

**Domain Configuration for Resend**:
- Domain: `andrew.us.kg`
- DNS Records added to Netlify:
  - SPF: `v=spf1 include:_spf.resend.com ~all`
  - DKIM: TXT record (provided by Resend)
  - Return-Path: CNAME (provided by Resend)
- From address: `bookings@andrew.us.kg`
- Domain verified ✅

---

## 5. ADMIN DASHBOARD - COMPLETE TECHNICAL BREAKDOWN

**File**: `carwebitebooking/frontend/src/components/AdminDashboard.jsx`

### 5.1 Authentication System

**CRITICAL SECURITY ISSUE**: 
- No actual authentication system implemented
- Hardcoded password check in frontend: `password === 'andrew123'`
- Service role key exposed in browser environment variables

```javascript
const AdminDashboard = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const handleLogin = () => {
    if (password === 'andrew123') { // ❌ INSECURE
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Invalid password');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-96">
          <h2 className="text-2xl font-bold mb-4
```


## License: unknown
https://github.com/mugoooz/donation-platform-front/blob/391be762d8883e1250fedcd1d4dd8116e5042e08/src/components/LoginForm.js

```
# Complete Technical Breakdown: Car Wash Booking System

## Project Architecture Overview

This is a **React-based single-page application** integrated with **Supabase** as the backend-as-a-service platform. The system consists of:

1. **Customer-facing booking widget** (public)
2. **Admin dashboard** (authenticated)
3. **Supabase Edge Functions** (serverless backend)
4. **PostgreSQL database** via Supabase
5. **Email notifications** via Resend API

---

## 1. DATABASE SCHEMA & TABLES

### 1.1 `bookings` Table
**Location**: `carwebitebooking/supabase/migrations/20240101000000_initial_schema.sql`

```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_address TEXT,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  total_duration_minutes INTEGER NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('mobile', 'shop')),
  vehicle_size TEXT NOT NULL CHECK (vehicle_size IN ('small', 'medium', 'large')),
  vehicle_size_fee NUMERIC(10,2) DEFAULT 0,
  interior_package_id UUID REFERENCES packages(id),
  exterior_package_id UUID REFERENCES packages(id),
  subtotal NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  has_water_electric BOOLEAN DEFAULT false,
  customer_notes TEXT,
  google_calendar_event_id TEXT,
  ics_file_sent BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  final_amount NUMERIC(10,2),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  line_items JSONB,
  payment_notes TEXT,
  finalized_at TIMESTAMPTZ
);
```

**Key Design Decisions**:
- `id` is UUID for security (non-sequential, unpredictable)
- `customer_phone` not unique (allows repeat customers)
- `service_type` enum constraint enforces valid values
- `vehicle_size_fee` stored separately for price transparency
- Foreign keys to `packages` table with `ON DELETE SET NULL` (if package deleted, booking retains price but loses reference)
- `status` and `payment_status` separate fields for business logic flexibility
- `line_items` as JSONB for flexible pricing breakdown
- `finalized_at` timestamp tracks when admin confirmed final pricing

### 1.2 `packages` Table
**Location**: Same migration file

```sql
CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  package_type TEXT NOT NULL CHECK (package_type IN ('interior', 'exterior')),
  price NUMERIC(10,2) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  description TEXT,
  features TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Initial Data**:
- 3 interior packages: Standard ($20, 30min), Deluxe ($40, 45min), Ultimate ($60, 60min)
- 3 exterior packages: Standard ($20, 30min), Deluxe ($35, 45min), Ultimate ($50, 60min)

### 1.3 `customers` Table
**Location**: `carwebitebooking/supabase/migrations/20240103000000_add_customers_table.sql`

```sql
CREATE TABLE customers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT,
  address TEXT,
  notes TEXT,
  total_bookings INTEGER DEFAULT 0,
  total_spent NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Design Decisions**:
- `phone` is UNIQUE constraint (one customer record per phone number)
- `BIGSERIAL` primary key (auto-incrementing integer)
- `total_bookings` and `total_spent` are **denormalized aggregates** for performance
- Updated via triggers or application logic after each booking

### 1.4 Row-Level Security (RLS)

**Authentication Context**: 
- Public users: `anon` role (JWT with `role: 'anon'`)
- Admin users: Manual authentication check in frontend (no actual auth table)

**RLS Policies** (`carwebitebooking/supabase/migrations/20240101000001_rls_policies.sql`):

```sql
-- Bookings: Public can insert (create bookings)
CREATE POLICY "Anyone can create bookings"
  ON bookings FOR INSERT
  TO anon
  WITH CHECK (true);

-- Bookings: Public can read their own (via email match)
CREATE POLICY "Anyone can read their bookings"
  ON bookings FOR SELECT
  TO anon
  USING (customer_email = current_setting('request.jwt.claims')::json->>'email');

-- Packages: Public read-only
CREATE POLICY "Anyone can view active packages"
  ON packages FOR SELECT
  TO anon
  USING (is_active = true);

-- Customers: Authenticated only
CREATE POLICY "Authenticated users can manage customers"
  ON customers FOR ALL
  TO authenticated
  USING (true);
```

**Security Analysis**:
- ❌ **VULNERABILITY**: Admin dashboard bypasses RLS by using `service_role` key client-side
- ⚠️ **RISK**: Service role key exposed in frontend env (`VITE_SUPABASE_SERVICE_KEY`)
- ✅ **MITIGATION**: Should use server-side Edge Functions for admin operations
- ✅ **Booking creation**: Properly uses `anon` key, no escalation possible

---

## 2. BOOKING WIDGET - COMPLETE TECHNICAL BREAKDOWN

### 2.1 Component Structure

**File**: `carwebitebooking/frontend/src/components/BookingWidget.jsx`

**Framework**: React 18 with Hooks
**Dependencies**:
- `react-datepicker` v4.x (calendar UI)
- `lucide-react` (icons)
- `@supabase/supabase-js` v2.x (database client)
- `date-fns` (date manipulation)

**State Management** (all local via `useState`):

```javascript
const [step, setStep] = useState(1);                    // Current form step (1-5)
const [serviceType, setServiceType] = useState('');     // 'mobile' | 'shop'
const [vehicleSize, setVehicleSize] = useState('');     // 'small' | 'medium' | 'large'
const [selectedDate, setSelectedDate] = useState(null); // Date object
const [selectedTime, setSelectedTime] = useState('');   // 'HH:MM' string
const [interiorPackage, setInteriorPackage] = useState(null); // Package object
const [exteriorPackage, setExteriorPackage] = useState(null); // Package object
const [packages, setPackages] = useState([]);           // Fetched from DB
const [availableSlots, setAvailableSlots] = useState([]); // Calculated time slots
const [customerInfo, setCustomerInfo] = useState({      // Form data
  name: '', phone: '', email: '', address: '', notes: '', hasWaterElectric: false
});
const [isSubmitting, setIsSubmitting] = useState(false);
const [errors, setErrors] = useState({});               // Validation errors
const [showThankYou, setShowThankYou] = useState(false);
const [totalPrice, setTotalPrice] = useState(0);        // Calculated price
const [totalDuration, setTotalDuration] = useState(0);  // Calculated minutes
```

### 2.2 Data Fetching on Mount

**Execution Flow**:

```javascript
useEffect(() => {
  const fetchPackages = async () => {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });
    
    if (!error) setPackages(data);
  };
  fetchPackages();
}, []);
```

**Query Details**:
- **Table**: `packages`
- **Filter**: `is_active = true`
- **Order**: By `price` ASC (cheapest first)
- **Auth**: Uses `anon` key (public read)
- **RLS**: Passes "view active packages" policy

### 2.3 Step 1: Service Type Selection

**UI**: Two large buttons (Mobile / Shop Location)

**Event Handler**:
```javascript
const handleServiceTypeSelect = (type) => {
  setServiceType(type);
  setStep(2); // Auto-advance
};
```

**Validation**: None (both options always valid)

**State Change**: 
- `serviceType` → 'mobile' or 'shop'
- `step` → 2

**Conditional Logic**: If `serviceType === 'mobile'`, Step 4 requires `address` field

### 2.4 Step 2: Vehicle Size Selection

**UI**: Three buttons (Small / Medium / Large)

**Pricing Logic** (hardcoded in frontend):
```javascript
const vehicleSizeFees = {
  small: 0,
  medium: 5,
  large: 10
};
```

**Event Handler**:
```javascript
const handleVehicleSizeSelect = (size) => {
  setVehicleSize(size);
  setStep(3);
};
```

**Price Calculation Trigger**: 
```javascript
useEffect(() => {
  const interiorPrice = interiorPackage?.price || 0;
  const exteriorPrice = exteriorPackage?.price || 0;
  const sizeFee = vehicleSizeFees[vehicleSize] || 0;
  const total = interiorPrice + exteriorPrice + sizeFee;
  
  setTotalPrice(total);
}, [interiorPackage, exteriorPackage, vehicleSize]);
```

**State Change**:
- `vehicleSize` → 'small' | 'medium' | 'large'
- `step` → 3

### 2.5 Step 3: Package Selection

**UI Structure**:
- Two sections: Exterior Detailing (top), Interior Detailing (bottom)
- Each shows 3 packages filtered by `package_type`
- "Skip Interior" / "Skip Exterior" buttons for non-combo bookings

**Package Filtering**:
```javascript
const exteriorPackages = packages.filter(pkg => pkg.package_type === 'exterior');
const interiorPackages = packages.filter(pkg => pkg.package_type === 'interior');
```

**Duration Calculation**:
```javascript
useEffect(() => {
  const interiorDuration = interiorPackage?.duration_minutes || 0;
  const exteriorDuration = exteriorPackage?.duration_minutes || 0;
  // Durations ADD (not overlap)
  setTotalDuration(interiorDuration + exteriorDuration);
}, [interiorPackage, exteriorPackage]);
```

**Selection Logic**:
```javascript
const handlePackageSelect = (pkg, type) => {
  if (type === 'interior') {
    setInteriorPackage(interiorPackage?.id === pkg.id ? null : pkg); // Toggle
  } else {
    setExteriorPackage(exteriorPackage?.id === pkg.id ? null : pkg);
  }
};
```

**Validation**:
```javascript
const canProceed = interiorPackage || exteriorPackage; // At least one required
```

**State Change**:
- `interiorPackage` → Package object or null
- `exteriorPackage` → Package object or null
- `totalDuration` → Sum of selected package durations
- `totalPrice` → Recalculated via useEffect
- `step` → 4 (on "Next" click)

### 2.6 Step 4: Date & Time Selection

**Date Picker Configuration**:
```javascript
<DatePicker
  selected={selectedDate}
  onChange={handleDateChange}
  minDate={new Date()} // Cannot book past dates
  maxDate={addDays(new Date(), 90)} // 90-day booking window
  filterDate={isDateAvailable} // Custom filter function
  inline
  calendarClassName="booking-calendar"
/>
```

**Date Availability Filter**:
```javascript
const isDateAvailable = (date) => {
  const day = date.getDay();
  // 0 = Sunday, 6 = Saturday
  return day !== 0 && day !== 6; // Weekdays only (Mon-Fri)
};
```

**Time Slot Generation** (triggered on date selection):

```javascript
const handleDateChange = async (date) => {
  setSelectedDate(date);
  setSelectedTime(''); // Reset time selection
  
  // Fetch existing bookings for this date
  const { data: existingBookings } = await supabase
    .from('bookings')
    .select('start_time, end_time')
    .eq('booking_date', format(date, 'yyyy-MM-dd'))
    .neq('status', 'cancelled');
  
  const slots = generateAvailableSlots(date, existingBookings);
  setAvailableSlots(slots);
};
```

**Slot Generation Algorithm**:

```javascript
const generateAvailableSlots = (date, existingBookings) => {
  const slots = [];
  const businessHours = { start: 15, end: 18 }; // 3 PM - 6 PM
  
  // Generate 30-minute intervals
  for (let hour = businessHours.start; hour < businessHours.end; hour++) {
    for (let minute of [0, 30]) {
      const slotStart = new Date(date);
      slotStart.setHours(hour, minute, 0, 0);
      
      // Calculate slot end time based on total duration
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + totalDuration);
      
      // Check if slot end exceeds business hours
      const endHour = slotEnd.getHours();
      const endMinute = slotEnd.getMinutes();
      const endTime = endHour + endMinute / 60;
      
      if (endTime > businessHours.end) continue; // Slot too late
      
      // Check for conflicts with existing bookings
      const hasConflict = existingBookings.some(booking => {
        const bookingStart = parseTime(booking.start_time);
        const bookingEnd = parseTime(booking.end_time);
        
        // Conflict if:
        // 1. New slot starts during existing booking
        // 2. New slot ends during existing booking
        // 3. New slot completely contains existing booking
        return (
          (slotStart >= bookingStart && slotStart < bookingEnd) ||
          (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
          (slotStart <= bookingStart && slotEnd >= bookingEnd)
        );
      });
      
      if (!hasConflict) {
        slots.push({
          time: format(slotStart, 'HH:mm'),
          display: format(slotStart, 'h:mm a')
        });
      }
    }
  }
  
  return slots;
};

const parseTime = (timeString) => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};
```

**Conflict Detection Logic Explained**:

Given:
- Existing booking: 3:00 PM - 4:30 PM
- New booking duration: 60 minutes

Scenarios:
1. **Slot 3:30 PM**: Would end at 4:30 PM → **CONFLICT** (overlaps existing)
2. **Slot 4:30 PM**: Would end at 5:30 PM → **AVAILABLE** (starts after existing ends)
3. **Slot 2:30 PM**: Would end at 3:30 PM → **CONFLICT** (ends during existing)

**Time Selection Handler**:
```javascript
const handleTimeSelect = (time) => {
  setSelectedTime(time);
  setStep(5); // Auto-advance
};
```

**State Changes**:
- `selectedDate` → Date object
- `selectedTime` → 'HH:MM' string
- `availableSlots` → Array of available time objects
- `step` → 5

### 2.7 Step 5: Customer Information

**Form Fields**:
```javascript
<input 
  type="text" 
  value={customerInfo.name}
  onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
  required 
/>
<input 
  type="tel" 
  value={customerInfo.phone}
  pattern="[0-9]{10}" // Validates 10-digit US phone
  required 
/>
<input 
  type="email" 
  value={customerInfo.email}
  required 
/>
{serviceType === 'mobile' && (
  <input 
    type="text" 
    value={customerInfo.address}
    required 
  />
)}
<textarea 
  value={customerInfo.notes}
  placeholder="Any special requests?" 
/>
{serviceType === 'mobile' && (
  <label>
    <input 
      type="checkbox" 
      checked={customerInfo.hasWaterElectric}
      onChange={(e) => setCustomerInfo({...customerInfo, hasWaterElectric: e.target.checked})}
    />
    I have water and electricity available
  </label>
)}
```

**Validation Logic**:
```javascript
const validateForm = () => {
  const newErrors = {};
  
  if (!customerInfo.name.trim()) {
    newErrors.name = 'Name is required';
  }
  
  if (!customerInfo.phone.trim()) {
    newErrors.phone = 'Phone number is required';
  } else if (!/^\d{10}$/.test(customerInfo.phone.replace(/\D/g, ''))) {
    newErrors.phone = 'Please enter a valid 10-digit phone number';
  }
  
  if (!customerInfo.email.trim()) {
    newErrors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerInfo.email)) {
    newErrors.email = 'Please enter a valid email address';
  }
  
  if (serviceType === 'mobile' && !customerInfo.address.trim()) {
    newErrors.address = 'Address is required for mobile service';
  }
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

**Submit Handler**:
```javascript
const handleSubmit = async () => {
  if (!validateForm()) {
    return; // Show errors, don't submit
  }
  
  setIsSubmitting(true);
  
  try {
    // Calculate end time
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const startTime = new Date(selectedDate);
    startTime.setHours(hours, minutes, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + totalDuration);
    
    // Prepare payload
    const bookingData = {
      customer_name: customerInfo.name.trim(),
      customer_phone: customerInfo.phone.replace(/\D/g, ''), // Strip formatting
      customer_email: customerInfo.email.trim().toLowerCase(),
      customer_address: serviceType === 'mobile' ? customerInfo.address.trim() : null,
      service_type: serviceType,
      vehicle_size: vehicleSize,
      interior_package_id: interiorPackage?.id || null,
      exterior_package_id: exteriorPackage?.id || null,
      has_water_electric: serviceType === 'mobile' ? customerInfo.hasWaterElectric : false,
      customer_notes: customerInfo.notes.trim() || null,
      booking_date: format(selectedDate, 'yyyy-MM-dd'),
      start_time: format(startTime, 'HH:mm:ss'),
      end_time: format(endTime, 'HH:mm:ss'),
      status: 'pending' // Admin must confirm
    };
    
    // Call Edge Function (NOT direct DB insert)
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-booking`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(bookingData)
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Booking failed');
    }
    
    const result = await response.json();
    
    // Success state
    setShowThankYou(true);
    
    // Reset form after 5 seconds
    setTimeout(() => {
      resetForm();
    }, 5000);
    
  } catch (error) {
    console.error('Booking error:', error);
    setErrors({ submit: error.message || 'Something went wrong. Please try again.' });
  } finally {
    setIsSubmitting(false);
  }
};
```

**Why Edge Function Instead of Direct Insert?**
1. **Business Logic**: Price calculation, duration validation, conflict checking
2. **Customer Auto-Creation**: Automatically creates/updates customer record
3. **Email Notifications**: Sends emails to customer and owner
4. **Calendar Integration**: Creates Google Calendar event (if configured)
5. **Data Integrity**: Server-side validation prevents tampering

---

## 3. EDGE FUNCTION: `create-booking`

**File**: `carwebitebooking/supabase/functions/create-booking/index.ts`

**Runtime**: Deno (TypeScript)

**Authentication**: Public endpoint (uses `anon` key)

### 3.1 Request Handler

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const bookingData = await req.json();
    
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Elevated permissions
    );
    
    // Step 1: Calculate pricing
    const pricing = await calculatePricing(supabaseClient, bookingData);
    
    // Step 2: Create/update customer
    const customer = await upsertCustomer(supabaseClient, bookingData);
    
    // Step 3: Insert booking
    const booking = await insertBooking(supabaseClient, bookingData, pricing);
    
    // Step 4: Send notifications (async, don't wait)
    sendNotifications(booking).catch(console.error);
    
    return new Response(
      JSON.stringify(booking),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### 3.2 Pricing Calculation

```typescript
async function calculatePricing(supabase, bookingData) {
  const { interior_package_id, exterior_package_id, vehicle_size } = bookingData;
  
  let subtotal = 0;
  let totalDuration = 0;
  
  // Fetch package prices
  if (interior_package_id) {
    const { data: pkg } = await supabase
      .from('packages')
      .select('price, duration_minutes')
      .eq('id', interior_package_id)
      .single();
    
    if (pkg) {
      subtotal += pkg.price;
      totalDuration += pkg.duration_minutes;
    }
  }
  
  if (exterior_package_id) {
    const { data: pkg } = await supabase
      .from('packages')
      .select('price, duration_minutes')
      .eq('id', exterior_package_id)
      .single();
    
    if (pkg) {
      subtotal += pkg.price;
      totalDuration += pkg.duration_minutes;
    }
  }
  
  // Add vehicle size fee
  const vehicleSizeFees = {
    small: 0,
    medium: 5,
    large: 10
  };
  
  const sizeFee = vehicleSizeFees[vehicle_size] || 0;
  const totalPrice = subtotal + sizeFee;
  
  return {
    subtotal,
    vehicle_size_fee: sizeFee,
    total_price: totalPrice,
    total_duration_minutes: totalDuration
  };
}
```

### 3.3 Customer Upsert Logic

```typescript
async function upsertCustomer(supabase, bookingData) {
  const { customer_name, customer_phone, customer_email, customer_address } = bookingData;
  
  // Check if customer exists (by phone)
  const { data: existingCustomer, error: checkError } = await supabase
    .from('customers')
    .select('*')
    .eq('phone', customer_phone)
    .maybeSingle(); // Returns null if not found (doesn't throw error)
  
  if (checkError && checkError.code !== 'PGRST116') {
    // PGRST116 = no rows returned (expected)
    throw checkError;
  }
  
  if (existingCustomer) {
    console.log('Customer already exists:', existingCustomer.id);
    
    // Update customer info (email/address may have changed)
    const { data: updatedCustomer } = await supabase
      .from('customers')
      .update({
        name: customer_name,
        email: customer_email,
        address: customer_address,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingCustomer.id)
      .select()
      .single();
    
    return updatedCustomer || existingCustomer;
  }
  
  // Create new customer
  const { data: newCustomer, error: insertError } = await supabase
    .from('customers')
    .insert([{
      name: customer_name,
      phone: customer_phone,
      email: customer_email,
      address: customer_address,
      total_bookings: 0,
      total_spent: 0
    }])
    .select()
    .single();
  
  if (insertError) throw insertError;
  
  console.log('New customer created:', newCustomer.id);
  return newCustomer;
}
```

**Key Fix**: Changed `.single()` to `.maybeSingle()` on line 203 of the original code. 

**Why?**
- `.single()` throws error if 0 rows returned → customer creation was silently failing
- `.maybeSingle()` returns `null` if 0 rows → proper check for non-existent customer

### 3.4 Booking Insertion

```typescript
async function insertBooking(supabase, bookingData, pricing) {
  const { data: booking, error } = await supabase
    .from('bookings')
    .insert([{
      ...bookingData,
      ...pricing,
      status: 'confirmed', // Auto-confirm (or use 'pending' for manual approval)
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])
    .select()
    .single();
  
  if (error) {
    console.error('Insert error:', error);
    throw new Error('Failed to create booking: ' + error.message);
  }
  
  console.log('Booking created successfully:', booking.id);
  return booking;
}
```

### 3.5 Email Notifications

```typescript
async function sendNotifications(booking) {
  const SEND_EMAIL_URL = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`;
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
  
  // Customer confirmation email
  try {
    const customerEmailResponse = await fetch(SEND_EMAIL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        to: booking.customer_email,
        subject: 'Booking Confirmation - Andrew\'s Car Wash',
        body: generateCustomerEmailHTML(booking)
      })
    });
    
    if (customerEmailResponse.ok) {
      console.log('✅ Customer confirmation email sent successfully');
    } else {
      const errorText = await customerEmailResponse.text();
      console.error('❌ Failed to send customer email:', errorText);
    }
  } catch (error) {
    console.error('❌ Email error:', error);
  }
  
  // Owner notification email
  const OWNER_EMAIL = Deno.env.get('OWNER_EMAIL') || 'andrewswashing@gmail.com';
  
  try {
    const ownerEmailResponse = await fetch(SEND_EMAIL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        to: OWNER_EMAIL,
        subject: `New Booking: ${booking.customer_name}`,
        body: generateOwnerEmailHTML(booking)
      })
    });
    
    if (ownerEmailResponse.ok) {
      console.log('✅ Owner notification email sent successfully');
    } else {
      const errorText = await ownerEmailResponse.text();
      console.error('❌ Failed to send owner email:', errorText);
    }
  } catch (error) {
    console.error('❌ Email error:', error);
  }
}
```

---

## 4. EDGE FUNCTION: `send-email`

**File**: `carwebitebooking/supabase/functions/send-email/index.ts`

**Email Provider**: Resend (https://resend.com)

**Authentication**: Public endpoint (no JWT validation to allow internal calls)

### 4.1 Request Handler

```typescript
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { to, subject, body } = await req.json();
    
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'bookings@andrew.us.kg';
    
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured');
    }
    
    // Call Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `Andrew's Car Wash <${FROM_EMAIL}>`,
        to: [to],
        subject: subject,
        html: body
      })
    });
    
    const result = await resendResponse.json();
    
    if (!resendResponse.ok) {
      throw new Error(result.message || 'Failed to send email');
    }
    
    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully', id: result.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Send email error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### 4.2 Email Templates

**Customer Confirmation Email**:
```typescript
function generateCustomerEmailHTML(booking) {
  const dateStr = new Date(booking.booking_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                  color: white; padding: 30px; text-align: center; }
        .content { background: #f9f9f9; padding: 30px; }
        .details { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Booking Confirmed! 🚗✨</h1>
        </div>
        <div class="content">
          <p>Hi ${booking.customer_name},</p>
          <p>Your car wash appointment has been confirmed!</p>
          
          <div class="details">
            <h3>Booking Details</h3>
            <p><strong>Date:</strong> ${dateStr}</p>
            <p><strong>Time:</strong> ${booking.start_time}</p>
            <p><strong>Service:</strong> ${booking.service_type === 'mobile' ? 'Mobile Service' : 'Shop Location'}</p>
            ${booking.service_type === 'mobile' ? `<p><strong>Address:</strong> ${booking.customer_address}</p>` : ''}
            <p><strong>Vehicle Size:</strong> ${booking.vehicle_size}</p>
            <p><strong>Duration:</strong> ${booking.total_duration_minutes} minutes</p>
            <p><strong>Total Price:</strong> $${booking.total_price}</p>
          </div>
          
          <p>We'll send you a reminder 24 hours before your appointment.</p>
          <p>If you need to reschedule or cancel, please contact us at least 24 hours in advance.</p>
        </div>
        <div class="footer">
          <p>Andrew's Car Wash | (562) 310-1075 | andrewswashing@gmail.com</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
```

**Owner Notification Email** (with Apple Calendar link):
```typescript
function generateOwnerEmailHTML(booking) {
  const dateStr = new Date(booking.booking_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Generate ICS file content
  const icsContent = generateICS(booking);
  const icsDataURI = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 30px; text-align: center; }
        .content { background: #f9f9f9; padding: 30px; }
        .details { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .calendar-btn { display: inline-block; background: #10b981; color: white; 
                        padding: 12px 24px; text-decoration: none; border-radius: 6px; 
                        margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔔 New Booking Received</h1>
        </div>
        <div class="content">
          <div class="details">
            <h3>Customer Information</h3>
            <p><strong>Name:</strong> ${booking.customer_name}</p>
            <p><strong>Phone:</strong> ${booking.customer_phone}</p>
            <p><strong>Email:</strong> ${booking.customer_email}</p>
            ${booking.customer_address ? `<p><strong>Address:</strong> ${booking.customer_address}</p>` : ''}
          </div>
          
          <div class="details">
            <h3>Service Details</h3>
            <p><strong>Date:</strong> ${dateStr}</p>
            <p><strong>Time:</strong> ${booking.start_time} - ${booking.end_time}</p>
            <p><strong>Service Type:</strong> ${booking.service_type === 'mobile' ? 'Mobile Service' : 'Shop Location'}</p>
            <p><strong>Vehicle Size:</strong> ${booking.vehicle_size}</p>
            <p><strong>Duration:</strong> ${booking.total_duration_minutes} minutes</p>
            <p><strong>Total Price:</strong> $${booking.total_price}</p>
            ${booking.customer_notes ? `<p><strong>Notes:</strong> ${booking.customer_notes}</p>` : ''}
          </div>
          
          <div style="text-align: center;">
            <a href="${icsDataURI}" download="booking-${booking.id}.ics" class="calendar-btn">
              📅 Add to Apple Calendar
            </a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateICS(booking) {
  const startDate = new Date(`${booking.booking_date}T${booking.start_time}`);
  const endDate = new Date(`${booking.booking_date}T${booking.end_time}`);
  
  // Format as YYYYMMDDTHHMMSS
  const formatICSDate = (date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };
  
  const location = booking.service_type === 'mobile' 
    ? booking.customer_address 
    : 'Andrew\'s Car Wash - Shop Location';
  
  const description = `
Customer: ${booking.customer_name}
Phone: ${booking.customer_phone}
Email: ${booking.customer_email}
Service: ${booking.service_type}
Vehicle: ${booking.vehicle_size}
Price: $${booking.total_price}
${booking.customer_notes ? `Notes: ${booking.customer_notes}` : ''}
  `.trim();
  
  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Andrew's Car Wash//Booking System//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:${booking.id}@andrew.us.kg
DTSTAMP:${formatICSDate(new Date())}
DTSTART:${formatICSDate(startDate)}
DTEND:${formatICSDate(endDate)}
SUMMARY:Car Wash - ${booking.customer_name}
DESCRIPTION:${description.replace(/\n/g, '\\n')}
LOCATION:${location}
STATUS:CONFIRMED
SEQUENCE:0
BEGIN:VALARM
TRIGGER:-PT24H
DESCRIPTION:Reminder: Car wash appointment tomorrow
ACTION:DISPLAY
END:VALARM
END:VEVENT
END:VCALENDAR`;
}
```

**Domain Configuration for Resend**:
- Domain: `andrew.us.kg`
- DNS Records added to Netlify:
  - SPF: `v=spf1 include:_spf.resend.com ~all`
  - DKIM: TXT record (provided by Resend)
  - Return-Path: CNAME (provided by Resend)
- From address: `bookings@andrew.us.kg`
- Domain verified ✅

---

## 5. ADMIN DASHBOARD - COMPLETE TECHNICAL BREAKDOWN

**File**: `carwebitebooking/frontend/src/components/AdminDashboard.jsx`

### 5.1 Authentication System

**CRITICAL SECURITY ISSUE**: 
- No actual authentication system implemented
- Hardcoded password check in frontend: `password === 'andrew123'`
- Service role key exposed in browser environment variables

```javascript
const AdminDashboard = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const handleLogin = () => {
    if (password === 'andrew123') { // ❌ INSECURE
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Invalid password');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-96">
          <h2 className="text-2xl font-bold mb-4
```


## License: unknown
https://github.com/mugoooz/donation-platform-front/blob/391be762d8883e1250fedcd1d4dd8116e5042e08/src/components/LoginForm.js

```
# Complete Technical Breakdown: Car Wash Booking System

## Project Architecture Overview

This is a **React-based single-page application** integrated with **Supabase** as the backend-as-a-service platform. The system consists of:

1. **Customer-facing booking widget** (public)
2. **Admin dashboard** (authenticated)
3. **Supabase Edge Functions** (serverless backend)
4. **PostgreSQL database** via Supabase
5. **Email notifications** via Resend API

---

## 1. DATABASE SCHEMA & TABLES

### 1.1 `bookings` Table
**Location**: `carwebitebooking/supabase/migrations/20240101000000_initial_schema.sql`

```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_address TEXT,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  total_duration_minutes INTEGER NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('mobile', 'shop')),
  vehicle_size TEXT NOT NULL CHECK (vehicle_size IN ('small', 'medium', 'large')),
  vehicle_size_fee NUMERIC(10,2) DEFAULT 0,
  interior_package_id UUID REFERENCES packages(id),
  exterior_package_id UUID REFERENCES packages(id),
  subtotal NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  has_water_electric BOOLEAN DEFAULT false,
  customer_notes TEXT,
  google_calendar_event_id TEXT,
  ics_file_sent BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  final_amount NUMERIC(10,2),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  line_items JSONB,
  payment_notes TEXT,
  finalized_at TIMESTAMPTZ
);
```

**Key Design Decisions**:
- `id` is UUID for security (non-sequential, unpredictable)
- `customer_phone` not unique (allows repeat customers)
- `service_type` enum constraint enforces valid values
- `vehicle_size_fee` stored separately for price transparency
- Foreign keys to `packages` table with `ON DELETE SET NULL` (if package deleted, booking retains price but loses reference)
- `status` and `payment_status` separate fields for business logic flexibility
- `line_items` as JSONB for flexible pricing breakdown
- `finalized_at` timestamp tracks when admin confirmed final pricing

### 1.2 `packages` Table
**Location**: Same migration file

```sql
CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  package_type TEXT NOT NULL CHECK (package_type IN ('interior', 'exterior')),
  price NUMERIC(10,2) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  description TEXT,
  features TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Initial Data**:
- 3 interior packages: Standard ($20, 30min), Deluxe ($40, 45min), Ultimate ($60, 60min)
- 3 exterior packages: Standard ($20, 30min), Deluxe ($35, 45min), Ultimate ($50, 60min)

### 1.3 `customers` Table
**Location**: `carwebitebooking/supabase/migrations/20240103000000_add_customers_table.sql`

```sql
CREATE TABLE customers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT,
  address TEXT,
  notes TEXT,
  total_bookings INTEGER DEFAULT 0,
  total_spent NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Design Decisions**:
- `phone` is UNIQUE constraint (one customer record per phone number)
- `BIGSERIAL` primary key (auto-incrementing integer)
- `total_bookings` and `total_spent` are **denormalized aggregates** for performance
- Updated via triggers or application logic after each booking

### 1.4 Row-Level Security (RLS)

**Authentication Context**: 
- Public users: `anon` role (JWT with `role: 'anon'`)
- Admin users: Manual authentication check in frontend (no actual auth table)

**RLS Policies** (`carwebitebooking/supabase/migrations/20240101000001_rls_policies.sql`):

```sql
-- Bookings: Public can insert (create bookings)
CREATE POLICY "Anyone can create bookings"
  ON bookings FOR INSERT
  TO anon
  WITH CHECK (true);

-- Bookings: Public can read their own (via email match)
CREATE POLICY "Anyone can read their bookings"
  ON bookings FOR SELECT
  TO anon
  USING (customer_email = current_setting('request.jwt.claims')::json->>'email');

-- Packages: Public read-only
CREATE POLICY "Anyone can view active packages"
  ON packages FOR SELECT
  TO anon
  USING (is_active = true);

-- Customers: Authenticated only
CREATE POLICY "Authenticated users can manage customers"
  ON customers FOR ALL
  TO authenticated
  USING (true);
```

**Security Analysis**:
- ❌ **VULNERABILITY**: Admin dashboard bypasses RLS by using `service_role` key client-side
- ⚠️ **RISK**: Service role key exposed in frontend env (`VITE_SUPABASE_SERVICE_KEY`)
- ✅ **MITIGATION**: Should use server-side Edge Functions for admin operations
- ✅ **Booking creation**: Properly uses `anon` key, no escalation possible

---

## 2. BOOKING WIDGET - COMPLETE TECHNICAL BREAKDOWN

### 2.1 Component Structure

**File**: `carwebitebooking/frontend/src/components/BookingWidget.jsx`

**Framework**: React 18 with Hooks
**Dependencies**:
- `react-datepicker` v4.x (calendar UI)
- `lucide-react` (icons)
- `@supabase/supabase-js` v2.x (database client)
- `date-fns` (date manipulation)

**State Management** (all local via `useState`):

```javascript
const [step, setStep] = useState(1);                    // Current form step (1-5)
const [serviceType, setServiceType] = useState('');     // 'mobile' | 'shop'
const [vehicleSize, setVehicleSize] = useState('');     // 'small' | 'medium' | 'large'
const [selectedDate, setSelectedDate] = useState(null); // Date object
const [selectedTime, setSelectedTime] = useState('');   // 'HH:MM' string
const [interiorPackage, setInteriorPackage] = useState(null); // Package object
const [exteriorPackage, setExteriorPackage] = useState(null); // Package object
const [packages, setPackages] = useState([]);           // Fetched from DB
const [availableSlots, setAvailableSlots] = useState([]); // Calculated time slots
const [customerInfo, setCustomerInfo] = useState({      // Form data
  name: '', phone: '', email: '', address: '', notes: '', hasWaterElectric: false
});
const [isSubmitting, setIsSubmitting] = useState(false);
const [errors, setErrors] = useState({});               // Validation errors
const [showThankYou, setShowThankYou] = useState(false);
const [totalPrice, setTotalPrice] = useState(0);        // Calculated price
const [totalDuration, setTotalDuration] = useState(0);  // Calculated minutes
```

### 2.2 Data Fetching on Mount

**Execution Flow**:

```javascript
useEffect(() => {
  const fetchPackages = async () => {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });
    
    if (!error) setPackages(data);
  };
  fetchPackages();
}, []);
```

**Query Details**:
- **Table**: `packages`
- **Filter**: `is_active = true`
- **Order**: By `price` ASC (cheapest first)
- **Auth**: Uses `anon` key (public read)
- **RLS**: Passes "view active packages" policy

### 2.3 Step 1: Service Type Selection

**UI**: Two large buttons (Mobile / Shop Location)

**Event Handler**:
```javascript
const handleServiceTypeSelect = (type) => {
  setServiceType(type);
  setStep(2); // Auto-advance
};
```

**Validation**: None (both options always valid)

**State Change**: 
- `serviceType` → 'mobile' or 'shop'
- `step` → 2

**Conditional Logic**: If `serviceType === 'mobile'`, Step 4 requires `address` field

### 2.4 Step 2: Vehicle Size Selection

**UI**: Three buttons (Small / Medium / Large)

**Pricing Logic** (hardcoded in frontend):
```javascript
const vehicleSizeFees = {
  small: 0,
  medium: 5,
  large: 10
};
```

**Event Handler**:
```javascript
const handleVehicleSizeSelect = (size) => {
  setVehicleSize(size);
  setStep(3);
};
```

**Price Calculation Trigger**: 
```javascript
useEffect(() => {
  const interiorPrice = interiorPackage?.price || 0;
  const exteriorPrice = exteriorPackage?.price || 0;
  const sizeFee = vehicleSizeFees[vehicleSize] || 0;
  const total = interiorPrice + exteriorPrice + sizeFee;
  
  setTotalPrice(total);
}, [interiorPackage, exteriorPackage, vehicleSize]);
```

**State Change**:
- `vehicleSize` → 'small' | 'medium' | 'large'
- `step` → 3

### 2.5 Step 3: Package Selection

**UI Structure**:
- Two sections: Exterior Detailing (top), Interior Detailing (bottom)
- Each shows 3 packages filtered by `package_type`
- "Skip Interior" / "Skip Exterior" buttons for non-combo bookings

**Package Filtering**:
```javascript
const exteriorPackages = packages.filter(pkg => pkg.package_type === 'exterior');
const interiorPackages = packages.filter(pkg => pkg.package_type === 'interior');
```

**Duration Calculation**:
```javascript
useEffect(() => {
  const interiorDuration = interiorPackage?.duration_minutes || 0;
  const exteriorDuration = exteriorPackage?.duration_minutes || 0;
  // Durations ADD (not overlap)
  setTotalDuration(interiorDuration + exteriorDuration);
}, [interiorPackage, exteriorPackage]);
```

**Selection Logic**:
```javascript
const handlePackageSelect = (pkg, type) => {
  if (type === 'interior') {
    setInteriorPackage(interiorPackage?.id === pkg.id ? null : pkg); // Toggle
  } else {
    setExteriorPackage(exteriorPackage?.id === pkg.id ? null : pkg);
  }
};
```

**Validation**:
```javascript
const canProceed = interiorPackage || exteriorPackage; // At least one required
```

**State Change**:
- `interiorPackage` → Package object or null
- `exteriorPackage` → Package object or null
- `totalDuration` → Sum of selected package durations
- `totalPrice` → Recalculated via useEffect
- `step` → 4 (on "Next" click)

### 2.6 Step 4: Date & Time Selection

**Date Picker Configuration**:
```javascript
<DatePicker
  selected={selectedDate}
  onChange={handleDateChange}
  minDate={new Date()} // Cannot book past dates
  maxDate={addDays(new Date(), 90)} // 90-day booking window
  filterDate={isDateAvailable} // Custom filter function
  inline
  calendarClassName="booking-calendar"
/>
```

**Date Availability Filter**:
```javascript
const isDateAvailable = (date) => {
  const day = date.getDay();
  // 0 = Sunday, 6 = Saturday
  return day !== 0 && day !== 6; // Weekdays only (Mon-Fri)
};
```

**Time Slot Generation** (triggered on date selection):

```javascript
const handleDateChange = async (date) => {
  setSelectedDate(date);
  setSelectedTime(''); // Reset time selection
  
  // Fetch existing bookings for this date
  const { data: existingBookings } = await supabase
    .from('bookings')
    .select('start_time, end_time')
    .eq('booking_date', format(date, 'yyyy-MM-dd'))
    .neq('status', 'cancelled');
  
  const slots = generateAvailableSlots(date, existingBookings);
  setAvailableSlots(slots);
};
```

**Slot Generation Algorithm**:

```javascript
const generateAvailableSlots = (date, existingBookings) => {
  const slots = [];
  const businessHours = { start: 15, end: 18 }; // 3 PM - 6 PM
  
  // Generate 30-minute intervals
  for (let hour = businessHours.start; hour < businessHours.end; hour++) {
    for (let minute of [0, 30]) {
      const slotStart = new Date(date);
      slotStart.setHours(hour, minute, 0, 0);
      
      // Calculate slot end time based on total duration
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + totalDuration);
      
      // Check if slot end exceeds business hours
      const endHour = slotEnd.getHours();
      const endMinute = slotEnd.getMinutes();
      const endTime = endHour + endMinute / 60;
      
      if (endTime > businessHours.end) continue; // Slot too late
      
      // Check for conflicts with existing bookings
      const hasConflict = existingBookings.some(booking => {
        const bookingStart = parseTime(booking.start_time);
        const bookingEnd = parseTime(booking.end_time);
        
        // Conflict if:
        // 1. New slot starts during existing booking
        // 2. New slot ends during existing booking
        // 3. New slot completely contains existing booking
        return (
          (slotStart >= bookingStart && slotStart < bookingEnd) ||
          (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
          (slotStart <= bookingStart && slotEnd >= bookingEnd)
        );
      });
      
      if (!hasConflict) {
        slots.push({
          time: format(slotStart, 'HH:mm'),
          display: format(slotStart, 'h:mm a')
        });
      }
    }
  }
  
  return slots;
};

const parseTime = (timeString) => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};
```

**Conflict Detection Logic Explained**:

Given:
- Existing booking: 3:00 PM - 4:30 PM
- New booking duration: 60 minutes

Scenarios:
1. **Slot 3:30 PM**: Would end at 4:30 PM → **CONFLICT** (overlaps existing)
2. **Slot 4:30 PM**: Would end at 5:30 PM → **AVAILABLE** (starts after existing ends)
3. **Slot 2:30 PM**: Would end at 3:30 PM → **CONFLICT** (ends during existing)

**Time Selection Handler**:
```javascript
const handleTimeSelect = (time) => {
  setSelectedTime(time);
  setStep(5); // Auto-advance
};
```

**State Changes**:
- `selectedDate` → Date object
- `selectedTime` → 'HH:MM' string
- `availableSlots` → Array of available time objects
- `step` → 5

### 2.7 Step 5: Customer Information

**Form Fields**:
```javascript
<input 
  type="text" 
  value={customerInfo.name}
  onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
  required 
/>
<input 
  type="tel" 
  value={customerInfo.phone}
  pattern="[0-9]{10}" // Validates 10-digit US phone
  required 
/>
<input 
  type="email" 
  value={customerInfo.email}
  required 
/>
{serviceType === 'mobile' && (
  <input 
    type="text" 
    value={customerInfo.address}
    required 
  />
)}
<textarea 
  value={customerInfo.notes}
  placeholder="Any special requests?" 
/>
{serviceType === 'mobile' && (
  <label>
    <input 
      type="checkbox" 
      checked={customerInfo.hasWaterElectric}
      onChange={(e) => setCustomerInfo({...customerInfo, hasWaterElectric: e.target.checked})}
    />
    I have water and electricity available
  </label>
)}
```

**Validation Logic**:
```javascript
const validateForm = () => {
  const newErrors = {};
  
  if (!customerInfo.name.trim()) {
    newErrors.name = 'Name is required';
  }
  
  if (!customerInfo.phone.trim()) {
    newErrors.phone = 'Phone number is required';
  } else if (!/^\d{10}$/.test(customerInfo.phone.replace(/\D/g, ''))) {
    newErrors.phone = 'Please enter a valid 10-digit phone number';
  }
  
  if (!customerInfo.email.trim()) {
    newErrors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerInfo.email)) {
    newErrors.email = 'Please enter a valid email address';
  }
  
  if (serviceType === 'mobile' && !customerInfo.address.trim()) {
    newErrors.address = 'Address is required for mobile service';
  }
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

**Submit Handler**:
```javascript
const handleSubmit = async () => {
  if (!validateForm()) {
    return; // Show errors, don't submit
  }
  
  setIsSubmitting(true);
  
  try {
    // Calculate end time
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const startTime = new Date(selectedDate);
    startTime.setHours(hours, minutes, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + totalDuration);
    
    // Prepare payload
    const bookingData = {
      customer_name: customerInfo.name.trim(),
      customer_phone: customerInfo.phone.replace(/\D/g, ''), // Strip formatting
      customer_email: customerInfo.email.trim().toLowerCase(),
      customer_address: serviceType === 'mobile' ? customerInfo.address.trim() : null,
      service_type: serviceType,
      vehicle_size: vehicleSize,
      interior_package_id: interiorPackage?.id || null,
      exterior_package_id: exteriorPackage?.id || null,
      has_water_electric: serviceType === 'mobile' ? customerInfo.hasWaterElectric : false,
      customer_notes: customerInfo.notes.trim() || null,
      booking_date: format(selectedDate, 'yyyy-MM-dd'),
      start_time: format(startTime, 'HH:mm:ss'),
      end_time: format(endTime, 'HH:mm:ss'),
      status: 'pending' // Admin must confirm
    };
    
    // Call Edge Function (NOT direct DB insert)
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-booking`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(bookingData)
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Booking failed');
    }
    
    const result = await response.json();
    
    // Success state
    setShowThankYou(true);
    
    // Reset form after 5 seconds
    setTimeout(() => {
      resetForm();
    }, 5000);
    
  } catch (error) {
    console.error('Booking error:', error);
    setErrors({ submit: error.message || 'Something went wrong. Please try again.' });
  } finally {
    setIsSubmitting(false);
  }
};
```

**Why Edge Function Instead of Direct Insert?**
1. **Business Logic**: Price calculation, duration validation, conflict checking
2. **Customer Auto-Creation**: Automatically creates/updates customer record
3. **Email Notifications**: Sends emails to customer and owner
4. **Calendar Integration**: Creates Google Calendar event (if configured)
5. **Data Integrity**: Server-side validation prevents tampering

---

## 3. EDGE FUNCTION: `create-booking`

**File**: `carwebitebooking/supabase/functions/create-booking/index.ts`

**Runtime**: Deno (TypeScript)

**Authentication**: Public endpoint (uses `anon` key)

### 3.1 Request Handler

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const bookingData = await req.json();
    
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Elevated permissions
    );
    
    // Step 1: Calculate pricing
    const pricing = await calculatePricing(supabaseClient, bookingData);
    
    // Step 2: Create/update customer
    const customer = await upsertCustomer(supabaseClient, bookingData);
    
    // Step 3: Insert booking
    const booking = await insertBooking(supabaseClient, bookingData, pricing);
    
    // Step 4: Send notifications (async, don't wait)
    sendNotifications(booking).catch(console.error);
    
    return new Response(
      JSON.stringify(booking),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### 3.2 Pricing Calculation

```typescript
async function calculatePricing(supabase, bookingData) {
  const { interior_package_id, exterior_package_id, vehicle_size } = bookingData;
  
  let subtotal = 0;
  let totalDuration = 0;
  
  // Fetch package prices
  if (interior_package_id) {
    const { data: pkg } = await supabase
      .from('packages')
      .select('price, duration_minutes')
      .eq('id', interior_package_id)
      .single();
    
    if (pkg) {
      subtotal += pkg.price;
      totalDuration += pkg.duration_minutes;
    }
  }
  
  if (exterior_package_id) {
    const { data: pkg } = await supabase
      .from('packages')
      .select('price, duration_minutes')
      .eq('id', exterior_package_id)
      .single();
    
    if (pkg) {
      subtotal += pkg.price;
      totalDuration += pkg.duration_minutes;
    }
  }
  
  // Add vehicle size fee
  const vehicleSizeFees = {
    small: 0,
    medium: 5,
    large: 10
  };
  
  const sizeFee = vehicleSizeFees[vehicle_size] || 0;
  const totalPrice = subtotal + sizeFee;
  
  return {
    subtotal,
    vehicle_size_fee: sizeFee,
    total_price: totalPrice,
    total_duration_minutes: totalDuration
  };
}
```

### 3.3 Customer Upsert Logic

```typescript
async function upsertCustomer(supabase, bookingData) {
  const { customer_name, customer_phone, customer_email, customer_address } = bookingData;
  
  // Check if customer exists (by phone)
  const { data: existingCustomer, error: checkError } = await supabase
    .from('customers')
    .select('*')
    .eq('phone', customer_phone)
    .maybeSingle(); // Returns null if not found (doesn't throw error)
  
  if (checkError && checkError.code !== 'PGRST116') {
    // PGRST116 = no rows returned (expected)
    throw checkError;
  }
  
  if (existingCustomer) {
    console.log('Customer already exists:', existingCustomer.id);
    
    // Update customer info (email/address may have changed)
    const { data: updatedCustomer } = await supabase
      .from('customers')
      .update({
        name: customer_name,
        email: customer_email,
        address: customer_address,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingCustomer.id)
      .select()
      .single();
    
    return updatedCustomer || existingCustomer;
  }
  
  // Create new customer
  const { data: newCustomer, error: insertError } = await supabase
    .from('customers')
    .insert([{
      name: customer_name,
      phone: customer_phone,
      email: customer_email,
      address: customer_address,
      total_bookings: 0,
      total_spent: 0
    }])
    .select()
    .single();
  
  if (insertError) throw insertError;
  
  console.log('New customer created:', newCustomer.id);
  return newCustomer;
}
```

**Key Fix**: Changed `.single()` to `.maybeSingle()` on line 203 of the original code. 

**Why?**
- `.single()` throws error if 0 rows returned → customer creation was silently failing
- `.maybeSingle()` returns `null` if 0 rows → proper check for non-existent customer

### 3.4 Booking Insertion

```typescript
async function insertBooking(supabase, bookingData, pricing) {
  const { data: booking, error } = await supabase
    .from('bookings')
    .insert([{
      ...bookingData,
      ...pricing,
      status: 'confirmed', // Auto-confirm (or use 'pending' for manual approval)
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])
    .select()
    .single();
  
  if (error) {
    console.error('Insert error:', error);
    throw new Error('Failed to create booking: ' + error.message);
  }
  
  console.log('Booking created successfully:', booking.id);
  return booking;
}
```

### 3.5 Email Notifications

```typescript
async function sendNotifications(booking) {
  const SEND_EMAIL_URL = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`;
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
  
  // Customer confirmation email
  try {
    const customerEmailResponse = await fetch(SEND_EMAIL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        to: booking.customer_email,
        subject: 'Booking Confirmation - Andrew\'s Car Wash',
        body: generateCustomerEmailHTML(booking)
      })
    });
    
    if (customerEmailResponse.ok) {
      console.log('✅ Customer confirmation email sent successfully');
    } else {
      const errorText = await customerEmailResponse.text();
      console.error('❌ Failed to send customer email:', errorText);
    }
  } catch (error) {
    console.error('❌ Email error:', error);
  }
  
  // Owner notification email
  const OWNER_EMAIL = Deno.env.get('OWNER_EMAIL') || 'andrewswashing@gmail.com';
  
  try {
    const ownerEmailResponse = await fetch(SEND_EMAIL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        to: OWNER_EMAIL,
        subject: `New Booking: ${booking.customer_name}`,
        body: generateOwnerEmailHTML(booking)
      })
    });
    
    if (ownerEmailResponse.ok) {
      console.log('✅ Owner notification email sent successfully');
    } else {
      const errorText = await ownerEmailResponse.text();
      console.error('❌ Failed to send owner email:', errorText);
    }
  } catch (error) {
    console.error('❌ Email error:', error);
  }
}
```

---

## 4. EDGE FUNCTION: `send-email`

**File**: `carwebitebooking/supabase/functions/send-email/index.ts`

**Email Provider**: Resend (https://resend.com)

**Authentication**: Public endpoint (no JWT validation to allow internal calls)

### 4.1 Request Handler

```typescript
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { to, subject, body } = await req.json();
    
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'bookings@andrew.us.kg';
    
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured');
    }
    
    // Call Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `Andrew's Car Wash <${FROM_EMAIL}>`,
        to: [to],
        subject: subject,
        html: body
      })
    });
    
    const result = await resendResponse.json();
    
    if (!resendResponse.ok) {
      throw new Error(result.message || 'Failed to send email');
    }
    
    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully', id: result.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Send email error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### 4.2 Email Templates

**Customer Confirmation Email**:
```typescript
function generateCustomerEmailHTML(booking) {
  const dateStr = new Date(booking.booking_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                  color: white; padding: 30px; text-align: center; }
        .content { background: #f9f9f9; padding: 30px; }
        .details { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Booking Confirmed! 🚗✨</h1>
        </div>
        <div class="content">
          <p>Hi ${booking.customer_name},</p>
          <p>Your car wash appointment has been confirmed!</p>
          
          <div class="details">
            <h3>Booking Details</h3>
            <p><strong>Date:</strong> ${dateStr}</p>
            <p><strong>Time:</strong> ${booking.start_time}</p>
            <p><strong>Service:</strong> ${booking.service_type === 'mobile' ? 'Mobile Service' : 'Shop Location'}</p>
            ${booking.service_type === 'mobile' ? `<p><strong>Address:</strong> ${booking.customer_address}</p>` : ''}
            <p><strong>Vehicle Size:</strong> ${booking.vehicle_size}</p>
            <p><strong>Duration:</strong> ${booking.total_duration_minutes} minutes</p>
            <p><strong>Total Price:</strong> $${booking.total_price}</p>
          </div>
          
          <p>We'll send you a reminder 24 hours before your appointment.</p>
          <p>If you need to reschedule or cancel, please contact us at least 24 hours in advance.</p>
        </div>
        <div class="footer">
          <p>Andrew's Car Wash | (562) 310-1075 | andrewswashing@gmail.com</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
```

**Owner Notification Email** (with Apple Calendar link):
```typescript
function generateOwnerEmailHTML(booking) {
  const dateStr = new Date(booking.booking_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Generate ICS file content
  const icsContent = generateICS(booking);
  const icsDataURI = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 30px; text-align: center; }
        .content { background: #f9f9f9; padding: 30px; }
        .details { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .calendar-btn { display: inline-block; background: #10b981; color: white; 
                        padding: 12px 24px; text-decoration: none; border-radius: 6px; 
                        margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔔 New Booking Received</h1>
        </div>
        <div class="content">
          <div class="details">
            <h3>Customer Information</h3>
            <p><strong>Name:</strong> ${booking.customer_name}</p>
            <p><strong>Phone:</strong> ${booking.customer_phone}</p>
            <p><strong>Email:</strong> ${booking.customer_email}</p>
            ${booking.customer_address ? `<p><strong>Address:</strong> ${booking.customer_address}</p>` : ''}
          </div>
          
          <div class="details">
            <h3>Service Details</h3>
            <p><strong>Date:</strong> ${dateStr}</p>
            <p><strong>Time:</strong> ${booking.start_time} - ${booking.end_time}</p>
            <p><strong>Service Type:</strong> ${booking.service_type === 'mobile' ? 'Mobile Service' : 'Shop Location'}</p>
            <p><strong>Vehicle Size:</strong> ${booking.vehicle_size}</p>
            <p><strong>Duration:</strong> ${booking.total_duration_minutes} minutes</p>
            <p><strong>Total Price:</strong> $${booking.total_price}</p>
            ${booking.customer_notes ? `<p><strong>Notes:</strong> ${booking.customer_notes}</p>` : ''}
          </div>
          
          <div style="text-align: center;">
            <a href="${icsDataURI}" download="booking-${booking.id}.ics" class="calendar-btn">
              📅 Add to Apple Calendar
            </a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateICS(booking) {
  const startDate = new Date(`${booking.booking_date}T${booking.start_time}`);
  const endDate = new Date(`${booking.booking_date}T${booking.end_time}`);
  
  // Format as YYYYMMDDTHHMMSS
  const formatICSDate = (date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };
  
  const location = booking.service_type === 'mobile' 
    ? booking.customer_address 
    : 'Andrew\'s Car Wash - Shop Location';
  
  const description = `
Customer: ${booking.customer_name}
Phone: ${booking.customer_phone}
Email: ${booking.customer_email}
Service: ${booking.service_type}
Vehicle: ${booking.vehicle_size}
Price: $${booking.total_price}
${booking.customer_notes ? `Notes: ${booking.customer_notes}` : ''}
  `.trim();
  
  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Andrew's Car Wash//Booking System//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:${booking.id}@andrew.us.kg
DTSTAMP:${formatICSDate(new Date())}
DTSTART:${formatICSDate(startDate)}
DTEND:${formatICSDate(endDate)}
SUMMARY:Car Wash - ${booking.customer_name}
DESCRIPTION:${description.replace(/\n/g, '\\n')}
LOCATION:${location}
STATUS:CONFIRMED
SEQUENCE:0
BEGIN:VALARM
TRIGGER:-PT24H
DESCRIPTION:Reminder: Car wash appointment tomorrow
ACTION:DISPLAY
END:VALARM
END:VEVENT
END:VCALENDAR`;
}
```

**Domain Configuration for Resend**:
- Domain: `andrew.us.kg`
- DNS Records added to Netlify:
  - SPF: `v=spf1 include:_spf.resend.com ~all`
  - DKIM: TXT record (provided by Resend)
  - Return-Path: CNAME (provided by Resend)
- From address: `bookings@andrew.us.kg`
- Domain verified ✅

---

## 5. ADMIN DASHBOARD - COMPLETE TECHNICAL BREAKDOWN

**File**: `carwebitebooking/frontend/src/components/AdminDashboard.jsx`

### 5.1 Authentication System

**CRITICAL SECURITY ISSUE**: 
- No actual authentication system implemented
- Hardcoded password check in frontend: `password === 'andrew123'`
- Service role key exposed in browser environment variables

```javascript
const AdminDashboard = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const handleLogin = () => {
    if (password === 'andrew123') { // ❌ INSECURE
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Invalid password');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-96">
          <h2 className="text-2xl font-bold mb-4
```


## License: unknown
https://github.com/mugoooz/donation-platform-front/blob/391be762d8883e1250fedcd1d4dd8116e5042e08/src/components/LoginForm.js

```
# Complete Technical Breakdown: Car Wash Booking System

## Project Architecture Overview

This is a **React-based single-page application** integrated with **Supabase** as the backend-as-a-service platform. The system consists of:

1. **Customer-facing booking widget** (public)
2. **Admin dashboard** (authenticated)
3. **Supabase Edge Functions** (serverless backend)
4. **PostgreSQL database** via Supabase
5. **Email notifications** via Resend API

---

## 1. DATABASE SCHEMA & TABLES

### 1.1 `bookings` Table
**Location**: `carwebitebooking/supabase/migrations/20240101000000_initial_schema.sql`

```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_address TEXT,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  total_duration_minutes INTEGER NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('mobile', 'shop')),
  vehicle_size TEXT NOT NULL CHECK (vehicle_size IN ('small', 'medium', 'large')),
  vehicle_size_fee NUMERIC(10,2) DEFAULT 0,
  interior_package_id UUID REFERENCES packages(id),
  exterior_package_id UUID REFERENCES packages(id),
  subtotal NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  has_water_electric BOOLEAN DEFAULT false,
  customer_notes TEXT,
  google_calendar_event_id TEXT,
  ics_file_sent BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  final_amount NUMERIC(10,2),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  line_items JSONB,
  payment_notes TEXT,
  finalized_at TIMESTAMPTZ
);
```

**Key Design Decisions**:
- `id` is UUID for security (non-sequential, unpredictable)
- `customer_phone` not unique (allows repeat customers)
- `service_type` enum constraint enforces valid values
- `vehicle_size_fee` stored separately for price transparency
- Foreign keys to `packages` table with `ON DELETE SET NULL` (if package deleted, booking retains price but loses reference)
- `status` and `payment_status` separate fields for business logic flexibility
- `line_items` as JSONB for flexible pricing breakdown
- `finalized_at` timestamp tracks when admin confirmed final pricing

### 1.2 `packages` Table
**Location**: Same migration file

```sql
CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  package_type TEXT NOT NULL CHECK (package_type IN ('interior', 'exterior')),
  price NUMERIC(10,2) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  description TEXT,
  features TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Initial Data**:
- 3 interior packages: Standard ($20, 30min), Deluxe ($40, 45min), Ultimate ($60, 60min)
- 3 exterior packages: Standard ($20, 30min), Deluxe ($35, 45min), Ultimate ($50, 60min)

### 1.3 `customers` Table
**Location**: `carwebitebooking/supabase/migrations/20240103000000_add_customers_table.sql`

```sql
CREATE TABLE customers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT,
  address TEXT,
  notes TEXT,
  total_bookings INTEGER DEFAULT 0,
  total_spent NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Design Decisions**:
- `phone` is UNIQUE constraint (one customer record per phone number)
- `BIGSERIAL` primary key (auto-incrementing integer)
- `total_bookings` and `total_spent` are **denormalized aggregates** for performance
- Updated via triggers or application logic after each booking

### 1.4 Row-Level Security (RLS)

**Authentication Context**: 
- Public users: `anon` role (JWT with `role: 'anon'`)
- Admin users: Manual authentication check in frontend (no actual auth table)

**RLS Policies** (`carwebitebooking/supabase/migrations/20240101000001_rls_policies.sql`):

```sql
-- Bookings: Public can insert (create bookings)
CREATE POLICY "Anyone can create bookings"
  ON bookings FOR INSERT
  TO anon
  WITH CHECK (true);

-- Bookings: Public can read their own (via email match)
CREATE POLICY "Anyone can read their bookings"
  ON bookings FOR SELECT
  TO anon
  USING (customer_email = current_setting('request.jwt.claims')::json->>'email');

-- Packages: Public read-only
CREATE POLICY "Anyone can view active packages"
  ON packages FOR SELECT
  TO anon
  USING (is_active = true);

-- Customers: Authenticated only
CREATE POLICY "Authenticated users can manage customers"
  ON customers FOR ALL
  TO authenticated
  USING (true);
```

**Security Analysis**:
- ❌ **VULNERABILITY**: Admin dashboard bypasses RLS by using `service_role` key client-side
- ⚠️ **RISK**: Service role key exposed in frontend env (`VITE_SUPABASE_SERVICE_KEY`)
- ✅ **MITIGATION**: Should use server-side Edge Functions for admin operations
- ✅ **Booking creation**: Properly uses `anon` key, no escalation possible

---

## 2. BOOKING WIDGET - COMPLETE TECHNICAL BREAKDOWN

### 2.1 Component Structure

**File**: `carwebitebooking/frontend/src/components/BookingWidget.jsx`

**Framework**: React 18 with Hooks
**Dependencies**:
- `react-datepicker` v4.x (calendar UI)
- `lucide-react` (icons)
- `@supabase/supabase-js` v2.x (database client)
- `date-fns` (date manipulation)

**State Management** (all local via `useState`):

```javascript
const [step, setStep] = useState(1);                    // Current form step (1-5)
const [serviceType, setServiceType] = useState('');     // 'mobile' | 'shop'
const [vehicleSize, setVehicleSize] = useState('');     // 'small' | 'medium' | 'large'
const [selectedDate, setSelectedDate] = useState(null); // Date object
const [selectedTime, setSelectedTime] = useState('');   // 'HH:MM' string
const [interiorPackage, setInteriorPackage] = useState(null); // Package object
const [exteriorPackage, setExteriorPackage] = useState(null); // Package object
const [packages, setPackages] = useState([]);           // Fetched from DB
const [availableSlots, setAvailableSlots] = useState([]); // Calculated time slots
const [customerInfo, setCustomerInfo] = useState({      // Form data
  name: '', phone: '', email: '', address: '', notes: '', hasWaterElectric: false
});
const [isSubmitting, setIsSubmitting] = useState(false);
const [errors, setErrors] = useState({});               // Validation errors
const [showThankYou, setShowThankYou] = useState(false);
const [totalPrice, setTotalPrice] = useState(0);        // Calculated price
const [totalDuration, setTotalDuration] = useState(0);  // Calculated minutes
```

### 2.2 Data Fetching on Mount

**Execution Flow**:

```javascript
useEffect(() => {
  const fetchPackages = async () => {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });
    
    if (!error) setPackages(data);
  };
  fetchPackages();
}, []);
```

**Query Details**:
- **Table**: `packages`
- **Filter**: `is_active = true`
- **Order**: By `price` ASC (cheapest first)
- **Auth**: Uses `anon` key (public read)
- **RLS**: Passes "view active packages" policy

### 2.3 Step 1: Service Type Selection

**UI**: Two large buttons (Mobile / Shop Location)

**Event Handler**:
```javascript
const handleServiceTypeSelect = (type) => {
  setServiceType(type);
  setStep(2); // Auto-advance
};
```

**Validation**: None (both options always valid)

**State Change**: 
- `serviceType` → 'mobile' or 'shop'
- `step` → 2

**Conditional Logic**: If `serviceType === 'mobile'`, Step 4 requires `address` field

### 2.4 Step 2: Vehicle Size Selection

**UI**: Three buttons (Small / Medium / Large)

**Pricing Logic** (hardcoded in frontend):
```javascript
const vehicleSizeFees = {
  small: 0,
  medium: 5,
  large: 10
};
```

**Event Handler**:
```javascript
const handleVehicleSizeSelect = (size) => {
  setVehicleSize(size);
  setStep(3);
};
```

**Price Calculation Trigger**: 
```javascript
useEffect(() => {
  const interiorPrice = interiorPackage?.price || 0;
  const exteriorPrice = exteriorPackage?.price || 0;
  const sizeFee = vehicleSizeFees[vehicleSize] || 0;
  const total = interiorPrice + exteriorPrice + sizeFee;
  
  setTotalPrice(total);
}, [interiorPackage, exteriorPackage, vehicleSize]);
```

**State Change**:
- `vehicleSize` → 'small' | 'medium' | 'large'
- `step` → 3

### 2.5 Step 3: Package Selection

**UI Structure**:
- Two sections: Exterior Detailing (top), Interior Detailing (bottom)
- Each shows 3 packages filtered by `package_type`
- "Skip Interior" / "Skip Exterior" buttons for non-combo bookings

**Package Filtering**:
```javascript
const exteriorPackages = packages.filter(pkg => pkg.package_type === 'exterior');
const interiorPackages = packages.filter(pkg => pkg.package_type === 'interior');
```

**Duration Calculation**:
```javascript
useEffect(() => {
  const interiorDuration = interiorPackage?.duration_minutes || 0;
  const exteriorDuration = exteriorPackage?.duration_minutes || 0;
  // Durations ADD (not overlap)
  setTotalDuration(interiorDuration + exteriorDuration);
}, [interiorPackage, exteriorPackage]);
```

**Selection Logic**:
```javascript
const handlePackageSelect = (pkg, type) => {
  if (type === 'interior') {
    setInteriorPackage(interiorPackage?.id === pkg.id ? null : pkg); // Toggle
  } else {
    setExteriorPackage(exteriorPackage?.id === pkg.id ? null : pkg);
  }
};
```

**Validation**:
```javascript
const canProceed = interiorPackage || exteriorPackage; // At least one required
```

**State Change**:
- `interiorPackage` → Package object or null
- `exteriorPackage` → Package object or null
- `totalDuration` → Sum of selected package durations
- `totalPrice` → Recalculated via useEffect
- `step` → 4 (on "Next" click)

### 2.6 Step 4: Date & Time Selection

**Date Picker Configuration**:
```javascript
<DatePicker
  selected={selectedDate}
  onChange={handleDateChange}
  minDate={new Date()} // Cannot book past dates
  maxDate={addDays(new Date(), 90)} // 90-day booking window
  filterDate={isDateAvailable} // Custom filter function
  inline
  calendarClassName="booking-calendar"
/>
```

**Date Availability Filter**:
```javascript
const isDateAvailable = (date) => {
  const day = date.getDay();
  // 0 = Sunday, 6 = Saturday
  return day !== 0 && day !== 6; // Weekdays only (Mon-Fri)
};
```

**Time Slot Generation** (triggered on date selection):

```javascript
const handleDateChange = async (date) => {
  setSelectedDate(date);
  setSelectedTime(''); // Reset time selection
  
  // Fetch existing bookings for this date
  const { data: existingBookings } = await supabase
    .from('bookings')
    .select('start_time, end_time')
    .eq('booking_date', format(date, 'yyyy-MM-dd'))
    .neq('status', 'cancelled');
  
  const slots = generateAvailableSlots(date, existingBookings);
  setAvailableSlots(slots);
};
```

**Slot Generation Algorithm**:

```javascript
const generateAvailableSlots = (date, existingBookings) => {
  const slots = [];
  const businessHours = { start: 15, end: 18 }; // 3 PM - 6 PM
  
  // Generate 30-minute intervals
  for (let hour = businessHours.start; hour < businessHours.end; hour++) {
    for (let minute of [0, 30]) {
      const slotStart = new Date(date);
      slotStart.setHours(hour, minute, 0, 0);
      
      // Calculate slot end time based on total duration
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + totalDuration);
      
      // Check if slot end exceeds business hours
      const endHour = slotEnd.getHours();
      const endMinute = slotEnd.getMinutes();
      const endTime = endHour + endMinute / 60;
      
      if (endTime > businessHours.end) continue; // Slot too late
      
      // Check for conflicts with existing bookings
      const hasConflict = existingBookings.some(booking => {
        const bookingStart = parseTime(booking.start_time);
        const bookingEnd = parseTime(booking.end_time);
        
        // Conflict if:
        // 1. New slot starts during existing booking
        // 2. New slot ends during existing booking
        // 3. New slot completely contains existing booking
        return (
          (slotStart >= bookingStart && slotStart < bookingEnd) ||
          (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
          (slotStart <= bookingStart && slotEnd >= bookingEnd)
        );
      });
      
      if (!hasConflict) {
        slots.push({
          time: format(slotStart, 'HH:mm'),
          display: format(slotStart, 'h:mm a')
        });
      }
    }
  }
  
  return slots;
};

const parseTime = (timeString) => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};
```

**Conflict Detection Logic Explained**:

Given:
- Existing booking: 3:00 PM - 4:30 PM
- New booking duration: 60 minutes

Scenarios:
1. **Slot 3:30 PM**: Would end at 4:30 PM → **CONFLICT** (overlaps existing)
2. **Slot 4:30 PM**: Would end at 5:30 PM → **AVAILABLE** (starts after existing ends)
3. **Slot 2:30 PM**: Would end at 3:30 PM → **CONFLICT** (ends during existing)

**Time Selection Handler**:
```javascript
const handleTimeSelect = (time) => {
  setSelectedTime(time);
  setStep(5); // Auto-advance
};
```

**State Changes**:
- `selectedDate` → Date object
- `selectedTime` → 'HH:MM' string
- `availableSlots` → Array of available time objects
- `step` → 5

### 2.7 Step 5: Customer Information

**Form Fields**:
```javascript
<input 
  type="text" 
  value={customerInfo.name}
  onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
  required 
/>
<input 
  type="tel" 
  value={customerInfo.phone}
  pattern="[0-9]{10}" // Validates 10-digit US phone
  required 
/>
<input 
  type="email" 
  value={customerInfo.email}
  required 
/>
{serviceType === 'mobile' && (
  <input 
    type="text" 
    value={customerInfo.address}
    required 
  />
)}
<textarea 
  value={customerInfo.notes}
  placeholder="Any special requests?" 
/>
{serviceType === 'mobile' && (
  <label>
    <input 
      type="checkbox" 
      checked={customerInfo.hasWaterElectric}
      onChange={(e) => setCustomerInfo({...customerInfo, hasWaterElectric: e.target.checked})}
    />
    I have water and electricity available
  </label>
)}
```

**Validation Logic**:
```javascript
const validateForm = () => {
  const newErrors = {};
  
  if (!customerInfo.name.trim()) {
    newErrors.name = 'Name is required';
  }
  
  if (!customerInfo.phone.trim()) {
    newErrors.phone = 'Phone number is required';
  } else if (!/^\d{10}$/.test(customerInfo.phone.replace(/\D/g, ''))) {
    newErrors.phone = 'Please enter a valid 10-digit phone number';
  }
  
  if (!customerInfo.email.trim()) {
    newErrors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerInfo.email)) {
    newErrors.email = 'Please enter a valid email address';
  }
  
  if (serviceType === 'mobile' && !customerInfo.address.trim()) {
    newErrors.address = 'Address is required for mobile service';
  }
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

**Submit Handler**:
```javascript
const handleSubmit = async () => {
  if (!validateForm()) {
    return; // Show errors, don't submit
  }
  
  setIsSubmitting(true);
  
  try {
    // Calculate end time
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const startTime = new Date(selectedDate);
    startTime.setHours(hours, minutes, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + totalDuration);
    
    // Prepare payload
    const bookingData = {
      customer_name: customerInfo.name.trim(),
      customer_phone: customerInfo.phone.replace(/\D/g, ''), // Strip formatting
      customer_email: customerInfo.email.trim().toLowerCase(),
      customer_address: serviceType === 'mobile' ? customerInfo.address.trim() : null,
      service_type: serviceType,
      vehicle_size: vehicleSize,
      interior_package_id: interiorPackage?.id || null,
      exterior_package_id: exteriorPackage?.id || null,
      has_water_electric: serviceType === 'mobile' ? customerInfo.hasWaterElectric : false,
      customer_notes: customerInfo.notes.trim() || null,
      booking_date: format(selectedDate, 'yyyy-MM-dd'),
      start_time: format(startTime, 'HH:mm:ss'),
      end_time: format(endTime, 'HH:mm:ss'),
      status: 'pending' // Admin must confirm
    };
    
    // Call Edge Function (NOT direct DB insert)
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-booking`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(bookingData)
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Booking failed');
    }
    
    const result = await response.json();
    
    // Success state
    setShowThankYou(true);
    
    // Reset form after 5 seconds
    setTimeout(() => {
      resetForm();
    }, 5000);
    
  } catch (error) {
    console.error('Booking error:', error);
    setErrors({ submit: error.message || 'Something went wrong. Please try again.' });
  } finally {
    setIsSubmitting(false);
  }
};
```

**Why Edge Function Instead of Direct Insert?**
1. **Business Logic**: Price calculation, duration validation, conflict checking
2. **Customer Auto-Creation**: Automatically creates/updates customer record
3. **Email Notifications**: Sends emails to customer and owner
4. **Calendar Integration**: Creates Google Calendar event (if configured)
5. **Data Integrity**: Server-side validation prevents tampering

---

## 3. EDGE FUNCTION: `create-booking`

**File**: `carwebitebooking/supabase/functions/create-booking/index.ts`

**Runtime**: Deno (TypeScript)

**Authentication**: Public endpoint (uses `anon` key)

### 3.1 Request Handler

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const bookingData = await req.json();
    
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Elevated permissions
    );
    
    // Step 1: Calculate pricing
    const pricing = await calculatePricing(supabaseClient, bookingData);
    
    // Step 2: Create/update customer
    const customer = await upsertCustomer(supabaseClient, bookingData);
    
    // Step 3: Insert booking
    const booking = await insertBooking(supabaseClient, bookingData, pricing);
    
    // Step 4: Send notifications (async, don't wait)
    sendNotifications(booking).catch(console.error);
    
    return new Response(
      JSON.stringify(booking),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### 3.2 Pricing Calculation

```typescript
async function calculatePricing(supabase, bookingData) {
  const { interior_package_id, exterior_package_id, vehicle_size } = bookingData;
  
  let subtotal = 0;
  let totalDuration = 0;
  
  // Fetch package prices
  if (interior_package_id) {
    const { data: pkg } = await supabase
      .from('packages')
      .select('price, duration_minutes')
      .eq('id', interior_package_id)
      .single();
    
    if (pkg) {
      subtotal += pkg.price;
      totalDuration += pkg.duration_minutes;
    }
  }
  
  if (exterior_package_id) {
    const { data: pkg } = await supabase
      .from('packages')
      .select('price, duration_minutes')
      .eq('id', exterior_package_id)
      .single();
    
    if (pkg) {
      subtotal += pkg.price;
      totalDuration += pkg.duration_minutes;
    }
  }
  
  // Add vehicle size fee
  const vehicleSizeFees = {
    small: 0,
    medium: 5,
    large: 10
  };
  
  const sizeFee = vehicleSizeFees[vehicle_size] || 0;
  const totalPrice = subtotal + sizeFee;
  
  return {
    subtotal,
    vehicle_size_fee: sizeFee,
    total_price: totalPrice,
    total_duration_minutes: totalDuration
  };
}
```

### 3.3 Customer Upsert Logic

```typescript
async function upsertCustomer(supabase, bookingData) {
  const { customer_name, customer_phone, customer_email, customer_address } = bookingData;
  
  // Check if customer exists (by phone)
  const { data: existingCustomer, error: checkError } = await supabase
    .from('customers')
    .select('*')
    .eq('phone', customer_phone)
    .maybeSingle(); // Returns null if not found (doesn't throw error)
  
  if (checkError && checkError.code !== 'PGRST116') {
    // PGRST116 = no rows returned (expected)
    throw checkError;
  }
  
  if (existingCustomer) {
    console.log('Customer already exists:', existingCustomer.id);
    
    // Update customer info (email/address may have changed)
    const { data: updatedCustomer } = await supabase
      .from('customers')
      .update({
        name: customer_name,
        email: customer_email,
        address: customer_address,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingCustomer.id)
      .select()
      .single();
    
    return updatedCustomer || existingCustomer;
  }
  
  // Create new customer
  const { data: newCustomer, error: insertError } = await supabase
    .from('customers')
    .insert([{
      name: customer_name,
      phone: customer_phone,
      email: customer_email,
      address: customer_address,
      total_bookings: 0,
      total_spent: 0
    }])
    .select()
    .single();
  
  if (insertError) throw insertError;
  
  console.log('New customer created:', newCustomer.id);
  return newCustomer;
}
```

**Key Fix**: Changed `.single()` to `.maybeSingle()` on line 203 of the original code. 

**Why?**
- `.single()` throws error if 0 rows returned → customer creation was silently failing
- `.maybeSingle()` returns `null` if 0 rows → proper check for non-existent customer

### 3.4 Booking Insertion

```typescript
async function insertBooking(supabase, bookingData, pricing) {
  const { data: booking, error } = await supabase
    .from('bookings')
    .insert([{
      ...bookingData,
      ...pricing,
      status: 'confirmed', // Auto-confirm (or use 'pending' for manual approval)
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])
    .select()
    .single();
  
  if (error) {
    console.error('Insert error:', error);
    throw new Error('Failed to create booking: ' + error.message);
  }
  
  console.log('Booking created successfully:', booking.id);
  return booking;
}
```

### 3.5 Email Notifications

```typescript
async function sendNotifications(booking) {
  const SEND_EMAIL_URL = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`;
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
  
  // Customer confirmation email
  try {
    const customerEmailResponse = await fetch(SEND_EMAIL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        to: booking.customer_email,
        subject: 'Booking Confirmation - Andrew\'s Car Wash',
        body: generateCustomerEmailHTML(booking)
      })
    });
    
    if (customerEmailResponse.ok) {
      console.log('✅ Customer confirmation email sent successfully');
    } else {
      const errorText = await customerEmailResponse.text();
      console.error('❌ Failed to send customer email:', errorText);
    }
  } catch (error) {
    console.error('❌ Email error:', error);
  }
  
  // Owner notification email
  const OWNER_EMAIL = Deno.env.get('OWNER_EMAIL') || 'andrewswashing@gmail.com';
  
  try {
    const ownerEmailResponse = await fetch(SEND_EMAIL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        to: OWNER_EMAIL,
        subject: `New Booking: ${booking.customer_name}`,
        body: generateOwnerEmailHTML(booking)
      })
    });
    
    if (ownerEmailResponse.ok) {
      console.log('✅ Owner notification email sent successfully');
    } else {
      const errorText = await ownerEmailResponse.text();
      console.error('❌ Failed to send owner email:', errorText);
    }
  } catch (error) {
    console.error('❌ Email error:', error);
  }
}
```

---

## 4. EDGE FUNCTION: `send-email`

**File**: `carwebitebooking/supabase/functions/send-email/index.ts`

**Email Provider**: Resend (https://resend.com)

**Authentication**: Public endpoint (no JWT validation to allow internal calls)

### 4.1 Request Handler

```typescript
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { to, subject, body } = await req.json();
    
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'bookings@andrew.us.kg';
    
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured');
    }
    
    // Call Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `Andrew's Car Wash <${FROM_EMAIL}>`,
        to: [to],
        subject: subject,
        html: body
      })
    });
    
    const result = await resendResponse.json();
    
    if (!resendResponse.ok) {
      throw new Error(result.message || 'Failed to send email');
    }
    
    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully', id: result.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Send email error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### 4.2 Email Templates

**Customer Confirmation Email**:
```typescript
function generateCustomerEmailHTML(booking) {
  const dateStr = new Date(booking.booking_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                  color: white; padding: 30px; text-align: center; }
        .content { background: #f9f9f9; padding: 30px; }
        .details { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Booking Confirmed! 🚗✨</h1>
        </div>
        <div class="content">
          <p>Hi ${booking.customer_name},</p>
          <p>Your car wash appointment has been confirmed!</p>
          
          <div class="details">
            <h3>Booking Details</h3>
            <p><strong>Date:</strong> ${dateStr}</p>
            <p><strong>Time:</strong> ${booking.start_time}</p>
            <p><strong>Service:</strong> ${booking.service_type === 'mobile' ? 'Mobile Service' : 'Shop Location'}</p>
            ${booking.service_type === 'mobile' ? `<p><strong>Address:</strong> ${booking.customer_address}</p>` : ''}
            <p><strong>Vehicle Size:</strong> ${booking.vehicle_size}</p>
            <p><strong>Duration:</strong> ${booking.total_duration_minutes} minutes</p>
            <p><strong>Total Price:</strong> $${booking.total_price}</p>
          </div>
          
          <p>We'll send you a reminder 24 hours before your appointment.</p>
          <p>If you need to reschedule or cancel, please contact us at least 24 hours in advance.</p>
        </div>
        <div class="footer">
          <p>Andrew's Car Wash | (562) 310-1075 | andrewswashing@gmail.com</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
```

**Owner Notification Email** (with Apple Calendar link):
```typescript
function generateOwnerEmailHTML(booking) {
  const dateStr = new Date(booking.booking_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Generate ICS file content
  const icsContent = generateICS(booking);
  const icsDataURI = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 30px; text-align: center; }
        .content { background: #f9f9f9; padding: 30px; }
        .details { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .calendar-btn { display: inline-block; background: #10b981; color: white; 
                        padding: 12px 24px; text-decoration: none; border-radius: 6px; 
                        margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔔 New Booking Received</h1>
        </div>
        <div class="content">
          <div class="details">
            <h3>Customer Information</h3>
            <p><strong>Name:</strong> ${booking.customer_name}</p>
            <p><strong>Phone:</strong> ${booking.customer_phone}</p>
            <p><strong>Email:</strong> ${booking.customer_email}</p>
            ${booking.customer_address ? `<p><strong>Address:</strong> ${booking.customer_address}</p>` : ''}
          </div>
          
          <div class="details">
            <h3>Service Details</h3>
            <p><strong>Date:</strong> ${dateStr}</p>
            <p><strong>Time:</strong> ${booking.start_time} - ${booking.end_time}</p>
            <p><strong>Service Type:</strong> ${booking.service_type === 'mobile' ? 'Mobile Service' : 'Shop Location'}</p>
            <p><strong>Vehicle Size:</strong> ${booking.vehicle_size}</p>
            <p><strong>Duration:</strong> ${booking.total_duration_minutes} minutes</p>
            <p><strong>Total Price:</strong> $${booking.total_price}</p>
            ${booking.customer_notes ? `<p><strong>Notes:</strong> ${booking.customer_notes}</p>` : ''}
          </div>
          
          <div style="text-align: center;">
            <a href="${icsDataURI}" download="booking-${booking.id}.ics" class="calendar-btn">
              📅 Add to Apple Calendar
            </a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateICS(booking) {
  const startDate = new Date(`${booking.booking_date}T${booking.start_time}`);
  const endDate = new Date(`${booking.booking_date}T${booking.end_time}`);
  
  // Format as YYYYMMDDTHHMMSS
  const formatICSDate = (date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };
  
  const location = booking.service_type === 'mobile' 
    ? booking.customer_address 
    : 'Andrew\'s Car Wash - Shop Location';
  
  const description = `
Customer: ${booking.customer_name}
Phone: ${booking.customer_phone}
Email: ${booking.customer_email}
Service: ${booking.service_type}
Vehicle: ${booking.vehicle_size}
Price: $${booking.total_price}
${booking.customer_notes ? `Notes: ${booking.customer_notes}` : ''}
  `.trim();
  
  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Andrew's Car Wash//Booking System//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:${booking.id}@andrew.us.kg
DTSTAMP:${formatICSDate(new Date())}
DTSTART:${formatICSDate(startDate)}
DTEND:${formatICSDate(endDate)}
SUMMARY:Car Wash - ${booking.customer_name}
DESCRIPTION:${description.replace(/\n/g, '\\n')}
LOCATION:${location}
STATUS:CONFIRMED
SEQUENCE:0
BEGIN:VALARM
TRIGGER:-PT24H
DESCRIPTION:Reminder: Car wash appointment tomorrow
ACTION:DISPLAY
END:VALARM
END:VEVENT
END:VCALENDAR`;
}
```

**Domain Configuration for Resend**:
- Domain: `andrew.us.kg`
- DNS Records added to Netlify:
  - SPF: `v=spf1 include:_spf.resend.com ~all`
  - DKIM: TXT record (provided by Resend)
  - Return-Path: CNAME (provided by Resend)
- From address: `bookings@andrew.us.kg`
- Domain verified ✅

---

## 5. ADMIN DASHBOARD - COMPLETE TECHNICAL BREAKDOWN

**File**: `carwebitebooking/frontend/src/components/AdminDashboard.jsx`

### 5.1 Authentication System

**CRITICAL SECURITY ISSUE**: 
- No actual authentication system implemented
- Hardcoded password check in frontend: `password === 'andrew123'`
- Service role key exposed in browser environment variables

```javascript
const AdminDashboard = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const handleLogin = () => {
    if (password === 'andrew123') { // ❌ INSECURE
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Invalid password');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-96">
          <h2 className="text-2xl font-bold mb-4">Admin Login</h2>
          <input
            type="passwor
```

