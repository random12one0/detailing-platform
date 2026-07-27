# Admin Dashboard Setup Guide

## Overview
The admin dashboard provides a secure, password-protected interface for managing all car detailing bookings. It replaces manual Supabase spreadsheet management with a professional control panel.

## Features Implemented

### Authentication & Security
- ✅ Passcode-protected login at `/admin`
- ✅ Session-based authentication (persists until logout)
- ✅ Secure passcode storage (environment variable, not in frontend code)
- ✅ No public access without valid passcode

### Dashboard Metrics
- ✅ Today's bookings count
- ✅ Today's revenue
- ✅ This week's revenue
- ✅ Next upcoming appointment display

### Booking Management
- ✅ List view with booking cards
- ✅ Weekly calendar view with color-coded time blocks
- ✅ Mark bookings as Completed or Cancelled
- ✅ Add/edit internal admin notes (not visible to customers)
- ✅ View full booking details in modal
- ✅ Real-time updates when bookings change

### Filters & Search
- ✅ Search by customer name, phone, or email
- ✅ Filter by date range (today, this week, upcoming, custom)
- ✅ Filter by status (confirmed, completed, cancelled)
- ✅ Filter by service type (mobile, drop-off)
- ✅ Toggle to show/hide past bookings
- ✅ Toggle to show/hide cancelled bookings

### Calendar View
- ✅ Weekly calendar with time slots (24-hour view)
- ✅ Time blocks sized by booking duration
- ✅ Color coding: Purple (Confirmed), Green (Completed), Red (Cancelled)
- ✅ Click blocks to view details
- ✅ Week navigation (previous, today, next)

### Design
- ✅ Dark theme matching booking widget
- ✅ Fully responsive (mobile-friendly)
- ✅ Professional UI with smooth animations
- ✅ Fast loading with real-time updates

## Setup Instructions

### 1. Database Migration

Run this SQL in your Supabase SQL Editor to add the `admin_notes` column:

```sql
-- Add admin_notes column to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_bookings_admin_notes ON bookings(admin_notes)
WHERE admin_notes IS NOT NULL;
```

### 2. Set Admin Passcode

Set the admin passcode as a Supabase secret:

```bash
supabase secrets set ADMIN_PASSCODE="your_secure_passcode_here"
```

**Important:** Choose a strong passcode. This is the only protection for the admin panel.

### 3. Deploy Edge Functions

Deploy the three new admin-related Edge Functions:

```bash
cd supabase

# Deploy verify-admin function (authentication)
supabase functions deploy verify-admin --no-verify-jwt

# Deploy update-booking function (status updates & notes)
supabase functions deploy update-booking --no-verify-jwt

# Deploy get-bookings function (fetch all bookings with package details)
supabase functions deploy get-bookings --no-verify-jwt
```

### 4. Install Frontend Dependencies

All required dependencies should already be installed. If you encounter issues:

```bash
cd frontend
npm install --legacy-peer-deps
```

### 5. Deploy Frontend

Deploy the updated frontend with the new `/admin` route:

**Vercel:**
```bash
cd frontend
vercel --prod
```

**Netlify:**
```bash
cd frontend
npm run build
netlify deploy --prod --dir=build
```

### 6. Access Admin Dashboard

Navigate to: `https://yourdomain.com/admin`

Enter your admin passcode to access the dashboard.

## Usage Guide

### Logging In
1. Go to `/admin`
2. Enter admin passcode
3. Click "Access Dashboard"
4. Session persists until logout

### Managing Bookings

#### List View
- Click any booking card to view full details
- Use "Mark Completed" button for finished services
- Use "Cancel Booking" button to cancel appointments
- Bookings are sorted by date and time (earliest first)

#### Calendar View
- Switch to calendar view using the toggle
- Navigate weeks using ← Today → buttons
- Click any colored time block to view booking details
- Color coding:
  - **Purple**: Confirmed (pending service)
  - **Green**: Completed
  - **Red**: Cancelled

#### Booking Details Modal
- Shows complete customer information
- Displays all booking details
- Shows services and pricing breakdown
- View customer notes
- Add/edit admin notes (internal only)
- Quick action buttons for status updates

#### Filters & Search
- **Search**: Find by name, phone, or email (real-time)
- **Date Range**: Filter by today, this week, or upcoming
- **Status**: Filter by confirmed, completed, cancelled, or all
- **Service Type**: Filter by mobile or drop-off
- **Toggles**: 
  - "Past" - Include bookings before today
  - "Cancelled" - Show cancelled bookings

### Admin Notes
- Internal notes not visible to customers
- Useful for tracking special requests, issues, or follow-ups
- Edit anytime from booking detail modal
- Persists to database immediately

### Real-Time Updates
- Dashboard automatically updates when bookings change
- No need to refresh page
- Uses Supabase real-time subscriptions

## Security Notes

1. **Passcode Storage**: Admin passcode stored securely in Supabase environment variables (not in frontend code)
2. **Session Management**: Authentication stored in sessionStorage (cleared on browser close)
3. **No Public API**: All admin functions require authentication
4. **Rate Limiting**: Consider adding rate limiting to prevent brute-force attacks on login

## API Endpoints

### verify-admin
- **URL**: `/functions/v1/verify-admin`
- **Method**: POST
- **Body**: `{ "passcode": "string" }`
- **Response**: `{ "success": boolean, "message": string }`

### get-bookings
- **URL**: `/functions/v1/get-bookings`
- **Method**: POST
- **Response**: `{ "success": boolean, "bookings": [] }`
- **Includes**: Package details (interior/exterior)

### update-booking
- **URL**: `/functions/v1/update-booking`
- **Method**: POST
- **Body**: `{ "booking_id": "uuid", "status": "confirmed|completed|cancelled", "admin_notes": "string" }`
- **Response**: `{ "success": boolean, "booking": {} }`

## Database Schema Changes

### New Column: admin_notes
```sql
admin_notes TEXT  -- Internal notes, not visible to customers
```

## Troubleshooting

### "Access token not provided" during deployment
Run `supabase login` before deploying functions:
```bash
supabase login
```

### "Invalid passcode" error
Verify the passcode is set correctly:
```bash
supabase secrets list
```

### Real-time updates not working
Check Supabase project settings → API → Realtime is enabled for the `bookings` table.

### Calendar time blocks not showing
Verify booking times are stored in 24-hour format (HH:MM:SS) in the database.

## Future Enhancements

Potential features for future development:
- [ ] Export bookings to CSV
- [ ] Send reminder emails to customers
- [ ] Revenue reports and analytics
- [ ] Multi-user admin accounts with role-based access
- [ ] Email templates editor
- [ ] Booking reschedule from admin panel
- [ ] Customer notes history
- [ ] Automated status changes (e.g., auto-complete after appointment time)
- [ ] SMS notifications integration
- [ ] Service duration tracking

## Support

For questions or issues:
- Email: andrewswashing@gmail.com
- Check Supabase logs for backend errors
- Check browser console for frontend errors

---

**Last Updated**: February 2026
