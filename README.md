# Andrew's Auto Detail & Car Wash 🚗✨

Professional mobile car detailing and wash services booking platform built with React, Supabase, and modern web technologies.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18.x-61dafb.svg)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E.svg)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.x-38B2AC.svg)

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Schema](#database-schema)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [SEO Optimization](#seo-optimization)
- [Email Templates](#email-templates)
- [Business Logic](#business-logic)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Overview

Andrew's Auto Detail & Car Wash is a modern web application that allows customers to book mobile car detailing and drop-off services online. The platform features real-time availability checking, automated email confirmations, Google Calendar integration, and a seamless 5-step booking process.

**Live Site:** [andrewsautodetail.com](https://andrewsautodetail.com)  
**Location:** Lakewood, California  
**Owner:** Andrew  
**Contact:** andrewswashing@gmail.com

### Business Hours
- **Monday-Friday:** 3:00 PM - 6:00 PM
- **Saturday:** 10:00 AM - 6:00 PM
- **Sunday:** 1:00 PM - 6:00 PM

## ✨ Features

### Customer-Facing Features
- 🗓️ **Real-Time Booking System** - 5-step wizard with instant availability checking
- 📱 **Mobile-First Design** - Fully responsive across all devices
- 🎨 **Modern UI/UX** - Dark theme with smooth animations using Framer Motion
- 📧 **Automated Confirmations** - Beautiful HTML email notifications via SendGrid
- 📅 **Calendar Integration** - Automatic Google Calendar event creation
- 💰 **Dynamic Pricing** - Real-time price calculation based on services and vehicle size
- ⏰ **Smart Scheduling** - 30-minute buffer between appointments
- 🚗 **Service Options** - Mobile (we come to you) or Drop-off service
- 📝 **Package Tiers** - Standard, Deluxe, and Ultimate for both interior and exterior

### Admin Features
- � **Admin Dashboard** - Password-protected control panel at `/admin`
- 📊 **Booking Management** - View, update, and manage all appointments
- 📅 **Calendar View** - Weekly calendar with color-coded time blocks
- 📈 **Analytics Dashboard** - Real-time metrics (today's bookings, revenue, next appointment)
- 🔍 **Advanced Filters** - Search and filter by date, status, service type
- 📝 **Admin Notes** - Internal notes on bookings (not visible to customers)
- 🔄 **Status Updates** - Mark bookings as Completed or Cancelled
- ⚡ **Real-Time Updates** - Dashboard updates automatically when bookings change
- 📧 **Owner Notifications** - Email alerts for new bookings
- 📆 **Calendar Sync** - All bookings automatically added to Google Calendar

### Technical Features
- ⚡ **Serverless Architecture** - Supabase Edge Functions (Deno runtime)
- 🔒 **Type Safety** - TypeScript for backend functions
- 🎯 **Real-Time Data** - PostgreSQL with instant updates
- 🚀 **Fast Performance** - Optimized React components with code splitting
- 🔍 **SEO Optimized** - Meta tags, Open Graph, Twitter Cards, and structured data
- 📱 **PWA Ready** - Progressive Web App capabilities

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **TailwindCSS** - Utility-first CSS framework
- **Framer Motion** - Animation library
- **shadcn/ui** - Reusable component library
- **React DatePicker** - Date selection component
- **Axios** - HTTP client

### Backend
- **Supabase** - Backend-as-a-Service
  - PostgreSQL database
  - Edge Functions (Deno/TypeScript)
  - Authentication & Authorization
- **SendGrid** - Email delivery service (100 free emails/day)
- **Google Calendar API** - Calendar event management

### DevOps & Tools
- **Git & GitHub** - Version control
- **Supabase CLI** - Function deployment
- **npm** - Package management

## 📁 Project Structure

```
carwebitebooking/
├── frontend/                      # React application
│   ├── public/
│   │   └── index.html            # HTML with SEO meta tags
│   ├── src/
│   │   ├── components/
│   │   │   ├── BookingWidget.jsx         # Main booking component
│   │   │   ├── AdminLogin.jsx            # Admin authentication
│   │   │   ├── AdminDashboard.jsx        # Admin control panel
│   │   │   ├── BookingDetailModal.jsx    # Booking details popup
│   │   │   ├── CalendarView.jsx          # Weekly calendar view
│   │   │   ├── sections/                 # Page sections
│   │   │   │   ├── Hero.jsx
│   │   │   │   ├── Services.jsx
│   │   │   │   ├── WhyChooseUs.jsx
│   │   │   │   ├── Gallery.jsx
│   │   │   │   ├── MeetTheOwner.jsx
│   │   │   │   ├── FAQ.jsx
│   │   │   │   └── Footer.jsx
│   │   │   └── ui/                       # shadcn/ui components
│   │   ├── pages/
│   │   │   └── AdminPage.jsx             # Admin route wrapper
│   │   ├── hooks/
│   │   │   └── use-toast.js
│   │   ├── lib/
│   │   │   ├── supabase.js              # Supabase client
│   │   │   └── utils.js
│   │   ├── App.js                        # Main app component
│   │   ├── index.css                     # Global styles + design tokens
│   │   └── index.js                      # Entry point
│   ├── package.json
│   └── vite.config.js
│
├── supabase/                      # Backend functions
│   ├── migrations/
│   │   └── add_admin_notes.sql          # Database migration for admin notes
│   └── functions/
│       ├── available-slots/              # Check time slot availability
│       │   └── index.ts
│       ├── calculate-booking/            # Calculate price & duration
│       │   └── index.ts
│       ├── create-booking/               # Create booking + send emails
│       │   └── index.ts
│       ├── create-calendar-event/        # Google Calendar integration
│       │   └── index.ts
│       ├── send-email/                   # SendGrid email sender
│       │   └── index.ts
│       ├── get-packages/                 # Fetch service packages
│       │   └── index.ts
│       ├── get-services/                 # Fetch services
│       │   └── index.ts
│       ├── get-bookings/                 # Fetch all bookings (admin)
│       │   └── index.ts
│       ├── update-booking/               # Update booking status & notes (admin)
│       │   └── index.ts
│       ├── verify-admin/                 # Admin authentication
│       │   └── index.ts
│       ├── cancel-booking/               # Cancel appointments
│       │   └── index.ts
│       └── reschedule-booking/           # Reschedule appointments
│           └── index.ts
│
├── memory/                        # Project documentation
│   └── PRD.md                    # Product Requirements Document
│
├── ADMIN_SETUP.md                # Admin dashboard setup guide
└── README.md                      # This file
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account ([supabase.com](https://supabase.com))
- SendGrid account ([sendgrid.com](https://sendgrid.com))
- Google Cloud account (for Calendar API)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/random12one0/carwebitebooking.git
cd carwebitebooking
```

2. **Install frontend dependencies**
```bash
cd frontend
npm install --legacy-peer-deps
```

3. **Install Supabase CLI**
```bash
brew install supabase/tap/supabase
# or
npm install -g supabase
```

4. **Set up environment variables**

Create `.env` file in `frontend/`:
```env
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

5. **Set up Supabase secrets**
```bash
supabase secrets set SUPABASE_URL=your_supabase_url
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
supabase secrets set SENDGRID_API_KEY=your_sendgrid_api_key
supabase secrets set GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
supabase secrets set GOOGLE_CALENDAR_ID=your_calendar_id
supabase secrets set ADMIN_PASSCODE=your_secure_admin_passcode
```

6. **Set up the database**

Run the following SQL in your Supabase SQL editor:

```sql
-- Create packages table
CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  base_price NUMERIC NOT NULL,
  base_duration_minutes INTEGER NOT NULL,
  package_type TEXT NOT NULL CHECK (package_type IN ('interior', 'exterior')),
  tier TEXT NOT NULL CHECK (tier IN ('standard', 'deluxe', 'ultimate')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create bookings table
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT,
  service_type TEXT NOT NULL CHECK (service_type IN ('mobile', 'dropoff')),
  vehicle_size TEXT NOT NULL CHECK (vehicle_size IN ('small', 'med', 'large')),
  interior_package_id UUID REFERENCES packages(id),
  exterior_package_id UUID REFERENCES packages(id),
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  total_duration_minutes INTEGER NOT NULL,
  subtotal NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  has_water_electric BOOLEAN DEFAULT false,
  customer_notes TEXT,
  admin_notes TEXT,
  calendar_event_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT at_least_one_package CHECK (
    interior_package_id IS NOT NULL OR exterior_package_id IS NOT NULL
  )
);

-- Insert sample packages
INSERT INTO packages (name, description, base_price, base_duration_minutes, package_type, tier) VALUES
('Standard Interior', 'Basic interior vacuum and wipe down', 75, 60, 'interior', 'standard'),
('Deluxe Interior', 'Deep interior cleaning with conditioning', 125, 90, 'interior', 'deluxe'),
('Ultimate Interior', 'Complete interior detailing with steam cleaning', 200, 120, 'interior', 'ultimate'),
('Standard Exterior', 'Hand wash and basic wax', 50, 45, 'exterior', 'standard'),
('Deluxe Exterior', 'Premium wash with tire shine and wax', 90, 75, 'exterior', 'deluxe'),
('Ultimate Exterior', 'Full exterior detail with ceramic coating', 150, 120, 'exterior', 'ultimate');

-- Create indexes for performance
CREATE INDEX idx_bookings_date ON bookings(booking_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_packages_type ON packages(package_type);
```

7. **Deploy Edge Functions**
```bash
cd supabase
supabase functions deploy available-slots --no-verify-jwt
supabase functions deploy calculate-booking --no-verify-jwt
supabase functions deploy create-booking --no-verify-jwt
supabase functions deploy send-email --no-verify-jwt
supabase functions deploy create-calendar-event --no-verify-jwt
supabase functions deploy get-packages --no-verify-jwt
supabase functions deploy get-services --no-verify-jwt

# Admin functions
supabase functions deploy verify-admin --no-verify-jwt
supabase functions deploy get-bookings --no-verify-jwt
supabase functions deploy update-booking --no-verify-jwt
```

8. **Start the development server**
```bash
cd frontend
npm start
```

The app will open at [http://localhost:3000](http://localhost:3000)

## 🔐 Environment Variables

### Frontend (.env)
```env
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_anon_key_here
```

### Supabase Secrets (Backend)
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SENDGRID_API_KEY=SG.xxx...
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
GOOGLE_CALENDAR_ID=andrewswashing@gmail.com
ADMIN_PASSCODE=your_secure_admin_passcode
```

## 🗄️ Database Schema

### packages
```sql
id                      UUID PRIMARY KEY
name                    TEXT NOT NULL
description             TEXT
base_price              NUMERIC NOT NULL
base_duration_minutes   INTEGER NOT NULL
package_type            TEXT NOT NULL (interior/exterior)
tier                    TEXT NOT NULL (standard/deluxe/ultimate)
is_active               BOOLEAN DEFAULT true
created_at              TIMESTAMPTZ
updated_at              TIMESTAMPTZ
```

### bookings
```sql
id                      UUID PRIMARY KEY
customer_name           TEXT NOT NULL
customer_email          TEXT NOT NULL
customer_phone          TEXT NOT NULL
customer_address        TEXT (required for mobile service)
service_type            TEXT NOT NULL (mobile/dropoff)
vehicle_size            TEXT NOT NULL (small/med/large)
interior_package_id     UUID REFERENCES packages(id)
exterior_package_id     UUID REFERENCES packages(id)
booking_date            DATE NOT NULL
start_time              TIME NOT NULL
end_time                TIME NOT NULL
total_duration_minutes  INTEGER NOT NULL
subtotal                NUMERIC NOT NULL
total_price             NUMERIC NOT NULL
status                  TEXT NOT NULL (confirmed/cancelled/completed)
has_water_electric      BOOLEAN
customer_notes          TEXT
admin_notes             TEXT (internal admin notes, not visible to customers)
calendar_event_id       TEXT
created_at              TIMESTAMPTZ
updated_at              TIMESTAMPTZ

CONSTRAINT: At least one package required (interior OR exterior)
```

## 📡 API Documentation

### Edge Functions

#### 1. available-slots
**POST** `/functions/v1/available-slots`

Get available time slots for a given date and duration.

**Request:**
```json
{
  "booking_date": "2026-02-15",
  "duration_minutes": 90
}
```

**Response:**
```json
{
  "success": true,
  "slots": ["15:00", "15:30", "16:00", "16:30"]
}
```

**Logic:**
- Checks business hours for the day
- Generates 30-minute interval slots
- Excludes booked slots with 30-minute buffer
- Returns available slots

---

#### 2. calculate-booking
**POST** `/functions/v1/calculate-booking`

Calculate total price and duration for selected services.

**Request:**
```json
{
  "interior_package_id": "uuid-here",
  "exterior_package_id": "uuid-here",
  "vehicle_size": "med",
  "booking_date": "2026-02-15"
}
```

**Response:**
```json
{
  "success": true,
  "total_price": 234.00,
  "subtotal": 195.00,
  "total_duration": 150,
  "interior_price": 90.00,
  "exterior_price": 54.00,
  "vehicle_size_fee": 5
}
```

**Pricing Logic:**
* Small: $0 fee
* Med: $5 fee
* Large: $10 fee
* Formula: `interior_price + exterior_price + vehicle_size_fee`

---

#### 3. create-booking
**POST** `/functions/v1/create-booking`

Create a new booking with email and calendar integration.

**Request:**
```json
{
  "customer_name": "John Doe",
  "customer_email": "john@example.com",
  "customer_phone": "(555) 123-4567",
  "customer_address": "123 Main St, Lakewood, CA",
  "service_type": "mobile",
  "vehicle_size": "med",
  "interior_package_id": "uuid-here",
  "exterior_package_id": null,
  "booking_date": "2026-02-15",
  "start_time": "15:00",
  "has_water_electric": true,
  "customer_notes": "Please call when arriving"
}
```

**Response:**
```json
{
  "success": true,
  "booking_id": "uuid-here",
  "message": "Booking created successfully"
}
```

**Process:**
1. Calculates end_time from start_time + duration
2. Calculates pricing
3. Creates booking record
4. Sends customer email (purple theme)
5. Sends owner email (green theme)
6. Creates Google Calendar event
7. Returns confirmation

---

#### 4. send-email
**POST** `/functions/v1/send-email`

Send emails via SendGrid API.

**Request:**
```json
{
  "to": "customer@example.com",
  "subject": "Booking Confirmation",
  "html": "<html>...</html>"
}
```

**Configuration:**
- Provider: SendGrid REST API
- Free tier: 100 emails/day
- Verified sender: andrewswashing@gmail.com

---

#### 5. create-calendar-event
**POST** `/functions/v1/create-calendar-event`

Create Google Calendar event.

**Request:**
```json
{
  "summary": "Car Detail - John Doe",
  "description": "Booking details...",
  "start_time": "2026-02-15T15:00:00",
  "end_time": "2026-02-15T16:30:00"
}
```

**Authentication:**
- Service account: booking-calendar-bot@metal-zodiac-485703-n6.iam.gserviceaccount.com
- Calendar: andrewswashing@gmail.com

---

#### 6. get-packages
**GET** `/functions/v1/get-packages`

Retrieve all active service packages.

**Response:**
```json
{
  "success": true,
  "packages": [
    {
      "id": "uuid",
      "name": "Standard Interior",
      "description": "Basic cleaning",
      "base_price": 75,
      "base_duration_minutes": 60,
      "package_type": "interior",
      "tier": "standard"
    }
  ]
}
```

---

### Admin API Functions

#### 7. verify-admin
**POST** `/functions/v1/verify-admin`

Verify admin passcode for authentication.

**Request:**
```json
{
  "passcode": "your_admin_passcode"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Authentication successful"
}
```

---

#### 8. get-bookings
**POST** `/functions/v1/get-bookings`

Retrieve all bookings with package details (admin only).

**Response:**
```json
{
  "success": true,
  "bookings": [
    {
      "id": "uuid",
      "customer_name": "John Doe",
      "booking_date": "2026-02-15",
      "start_time": "15:00:00",
      "status": "confirmed",
      "interior_package": {...},
      "exterior_package": {...},
      ...
    }
  ]
}
```

---

#### 9. update-booking
**POST** `/functions/v1/update-booking`

Update booking status or admin notes (admin only).

**Request:**
```json
{
  "booking_id": "uuid",
  "status": "completed",
  "admin_notes": "Customer was very satisfied"
}
```

**Response:**
```json
{
  "success": true,
  "booking": {...},
  "message": "Booking updated successfully"
}
```

## 🚀 Deployment

### Frontend (Vercel/Netlify)

**Vercel:**
```bash
npm install -g vercel
cd frontend
vercel --prod
```

**Netlify:**
```bash
npm install -g netlify-cli
cd frontend
npm run build
netlify deploy --prod --dir=build
```

### Backend (Supabase)

Edge Functions are deployed via CLI:
```bash
supabase functions deploy [function-name] --no-verify-jwt
```

**Note:** `--no-verify-jwt` flag is used for internal function-to-function calls.

### Admin Dashboard Setup

For detailed admin dashboard setup instructions, see [ADMIN_SETUP.md](ADMIN_SETUP.md).

Quick setup:
1. Run database migration to add `admin_notes` column
2. Set `ADMIN_PASSCODE` secret in Supabase
3. Deploy admin Edge Functions (verify-admin, get-bookings, update-booking)
4. Access at `https://yourdomain.com/admin`

## 🔍 SEO Optimization

### Meta Tags Implemented
- ✅ Primary meta tags (title, description, keywords)
- ✅ Open Graph tags (Facebook sharing)
- ✅ Twitter Card tags
- ✅ Geo tags (Lakewood, CA coordinates)
- ✅ Mobile optimization tags
- ✅ Business contact information
- ✅ Canonical URL

### Structured Data (JSON-LD)
- ✅ LocalBusiness schema
- ✅ Opening hours specification
- ✅ Service offerings
- ✅ Geographic coordinates
- ✅ Price range indication
- ✅ Contact information

### SEO Best Practices
- ✅ Semantic HTML5 elements
- ✅ Alt text on images
- ✅ Descriptive anchor text
- ✅ Mobile-first responsive design
- ✅ Fast load times (Vite optimization)
- ✅ Clean URL structure

## 📧 Email Templates

### Customer Email (Purple Theme)
- Gradient purple header
- Booking confirmation details
- Service information
- Pricing breakdown
- Contact information
- Professional HTML design
- 12-hour time format

### Owner Email (Green Theme)
- Gradient green header
- Customer contact details
- Service requirements
- Address (for mobile bookings)
- Booking ID for reference
- Professional HTML design

**Important:** All emails use 12-hour time format (e.g., 3:00 PM) with NO emojis.

## 💼 Business Logic

### Booking Rules
1. **Minimum Selection:** At least one package (interior OR exterior) required
2. **Buffer Time:** 30-minute buffer between bookings
3. **Time Slots:** 30-minute intervals within business hours
4. **Vehicle Size Fees:**
  - Small: $0
  - Med: $5
  - Large: $10
   - Large: 1.5x (+$10)

### Status Workflow
- **confirmed** → Initial booking state
- **cancelled** → Customer/admin cancellation
- **completed** → Service finished

### Mobile Service Requirements
- Address is REQUIRED
- Water access confirmation checkbox
- Electric outlet confirmation checkbox

### Time Format Conventions
- **Backend (PostgreSQL):** 24-hour format (HH:MM:SS)
- **Frontend Display:** 12-hour format (h:MM AM/PM)
- **Calendar Events:** ISO 8601 format

## 🎨 Design System

### Color Palette
```css
--background: 220 10% 85%  /* Light gray background */
--card: 210 12% 82%        /* Light gray cards */
--foreground: 220 14% 5%   /* Dark text */
--muted-foreground: 220 10% 28%  /* Muted text */
--accent: purple/blue gradient    /* Brand color */
--primary: dark background        /* Input fields */
```

### Typography
- **Font Family:** Inter, system-ui, sans-serif
- **Headings:** Bold, gradient accent on keywords
- **Body:** Regular weight, high readability

### Components
- **Buttons:** Hover scale (1.02) with shadow
- **Cards:** Rounded corners, subtle shadows
- **Inputs:** Dark background, white text
- **Animations:** Framer Motion for smooth transitions

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Code Style
- Use TypeScript for backend functions
- Follow React best practices
- Use TailwindCSS utility classes
- Write descriptive commit messages

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Contact

**Andrew's Auto Detail & Car Wash**  
Email: andrewswashing@gmail.com  
Location: Lakewood, California  
Website: [andrewsautodetail.com](https://andrewsautodetail.com)

## 🙏 Acknowledgments

- [Supabase](https://supabase.com) - Backend infrastructure
- [SendGrid](https://sendgrid.com) - Email delivery
- [shadcn/ui](https://ui.shadcn.com) - UI components
- [TailwindCSS](https://tailwindcss.com) - Styling framework
- [Framer Motion](https://www.framer.com/motion/) - Animations

---

**Built with ❤️ by Andrew's Auto Detail & Car Wash**

*Last Updated: February 2026*
