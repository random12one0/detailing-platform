# Andrew's Auto Detail & Car Wash - Product Requirements Document

## Overview
A full-stack booking system for Andrew's Auto Detail & Car Wash, allowing customers to book car detailing services online with automated calendar integration and email notifications.

## Core Features

### 1. Multi-Step Booking Widget (Embedded on Homepage)
- **Step 1: Service Selection**
  - Interior packages: Standard ($20), Deluxe ($40), Ultimate ($60)
  - Exterior packages: Standard ($20), Deluxe ($35), Ultimate ($50)
  - Static colored borders: Blue for Deluxe, Amber for Ultimate
  - Users can select one interior AND/OR one exterior package

- **Step 2: Service Type & Vehicle Size**
  - Mobile Service (we come to you) or Drop-Off
  - Vehicle sizes: Small (free), Medium (+$5), Large (+$10)

- **Step 3: Date & Time Selection**
  - Calendar with proper day name abbreviations (SU, MO, TU, WE, TH, FR, SA)
  - Time slots displayed in 30-minute intervals
  - Business hours enforced:
    - Mon-Fri: 3:00 PM - 6:00 PM
    - Saturday: 10:00 AM - 6:00 PM  
    - Sunday: 1:00 PM - 6:00 PM

- **Step 4: Customer Information**
  - Name, Phone, Email (required)
  - Address (required for mobile service)
  - Water/Electric access confirmation (for mobile)
  - Additional notes

### 2. Floating Island Header
- Sticky header with logo and navigation
- Yelp and Google review buttons
- Book Now button scrolls to widget

### 3. Backend Features
- Supabase PostgreSQL database
- Price calculation with vehicle size modifiers
- Time slot availability checking with 30-min buffer
- Double-booking prevention
- Email notifications via Resend
- ICS calendar file generation

## Technical Architecture

### Frontend
- React with Tailwind CSS
- Framer Motion for animations
- react-datepicker for calendar
- Shadcn/UI components

### Backend
- FastAPI (Python)
- Supabase client for database operations
- Resend for email delivery

### Database Schema (Supabase)
- **packages**: id, name, category, tier, base_price, duration_minutes, description, features
- **bookings**: id, customer_*, booking_date, start_time, end_time, total_price, status

## API Endpoints
- `GET /api/packages` - Fetch all service packages
- `POST /api/bookings/calculate` - Calculate price and duration
- `POST /api/bookings/available-slots` - Get available time slots
- `POST /api/bookings/create` - Create new booking
- `GET /api/bookings/list` - List all bookings (admin)

## What's Been Implemented ✅

### December 2025
- [x] Full booking widget with 4-step flow
- [x] Service package selection with colored borders
- [x] Live price calculation
- [x] Time slot selection (fixed - now working)
- [x] Mobile responsive calendar
- [x] Floating island header
- [x] Removed /booking page (widget only)
- [x] Backend APIs for packages, calculate, slots, create
- [x] Supabase integration
- [x] Email notification setup (Resend)

## Configuration Files
- Backend secrets: `/app/backend/.env`
- Frontend config: `/app/frontend/.env`

## Testing
- Backend tests: `/app/backend/tests/test_booking_api.py`
- All tests passing (15/15)
