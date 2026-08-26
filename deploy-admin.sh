#!/bin/bash

# Admin Dashboard Deployment Script
# This script helps deploy all admin dashboard components

set -e  # Exit on error

echo "🚀 Admin Dashboard Deployment"
echo "=============================="
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   brew install supabase/tap/supabase"
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Check if logged in
echo "Checking Supabase authentication..."
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase. Please run:"
    echo "   supabase login"
    exit 1
fi

echo "✅ Authenticated with Supabase"
echo ""

# Prompt for admin passcode
echo "🔐 Admin Passcode Setup"
echo "----------------------"
read -sp "Enter admin passcode (will be set as ADMIN_PASSCODE): " ADMIN_PASSCODE
echo ""

if [ -z "$ADMIN_PASSCODE" ]; then
    echo "❌ Passcode cannot be empty"
    exit 1
fi

# Set admin passcode
echo "Setting ADMIN_PASSCODE secret..."
supabase secrets set ADMIN_PASSCODE="$ADMIN_PASSCODE"
echo "✅ Admin passcode set"
echo ""

# Deploy Edge Functions
echo "📦 Deploying Edge Functions"
echo "---------------------------"

cd supabase

echo "Deploying verify-admin..."
supabase functions deploy verify-admin --no-verify-jwt

echo "Deploying get-bookings..."
supabase functions deploy get-bookings --no-verify-jwt

echo "Deploying update-booking..."
supabase functions deploy update-booking --no-verify-jwt

cd ..

echo "✅ All admin Edge Functions deployed"
echo ""

# Database migration reminder
echo "📊 Database Migration Required"
echo "------------------------------"
echo "Please run the following SQL in your Supabase SQL Editor:"
echo ""
echo "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS admin_notes TEXT;"
echo "CREATE INDEX IF NOT EXISTS idx_bookings_admin_notes ON bookings(admin_notes) WHERE admin_notes IS NOT NULL;"
echo ""
read -p "Press Enter after running the migration..."
echo ""

# Frontend deployment reminder
echo "🌐 Frontend Deployment"
echo "----------------------"
echo "Deploy your frontend with the updated /admin route:"
echo ""
echo "For Vercel:"
echo "  cd frontend"
echo "  vercel --prod"
echo ""
echo "For Netlify:"
echo "  cd frontend"
echo "  npm run build"
echo "  netlify deploy --prod --dir=build"
echo ""

echo "✅ Admin Dashboard Deployment Complete!"
echo ""
echo "Access your admin dashboard at: https://yourdomain.com/admin"
echo "Login with the passcode you just set."
echo ""
echo "📖 For detailed documentation, see ADMIN_SETUP.md"
