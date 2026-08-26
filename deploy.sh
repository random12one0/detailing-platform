#!/bin/bash

# =============================================================================
# Production-Ready Booking System - Deployment Script
# =============================================================================

set -e  # Exit on error

echo "🚀 Starting deployment of Production-Ready Booking System..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# =============================================================================
# STEP 1: Check prerequisites
# =============================================================================

echo "📋 Step 1: Checking prerequisites..."

if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found. Install: https://supabase.com/docs/guides/cli${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found. Install Node.js: https://nodejs.org${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites satisfied${NC}"
echo ""

# =============================================================================
# STEP 2: Run database migration
# =============================================================================

echo "📀 Step 2: Running database migration..."

read -p "Have you logged in to Supabase CLI? (supabase login) [y/N]: " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⚠️  Please run: supabase login${NC}"
    exit 1
fi

read -p "Enter your Supabase project ID: " PROJECT_ID

if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}❌ Project ID required${NC}"
    exit 1
fi

echo "🔗 Linking to project: $PROJECT_ID..."
supabase link --project-ref "$PROJECT_ID"

echo "📤 Pushing database migration..."
supabase db push

echo -e "${GREEN}✅ Database migration complete${NC}"
echo ""

# =============================================================================
# STEP 3: Deploy Edge Function
# =============================================================================

echo "⚡ Step 3: Deploying Edge Function..."

cd supabase/functions
supabase functions deploy create-booking

echo -e "${GREEN}✅ Edge Function deployed${NC}"
cd ../..
echo ""

# =============================================================================
# STEP 4: Update Frontend Environment
# =============================================================================

echo "🔧 Step 4: Updating frontend environment..."

if [ ! -f "frontend/.env" ]; then
    echo -e "${YELLOW}⚠️  frontend/.env not found, creating from template...${NC}"
    cat > frontend/.env << EOF
REACT_APP_SUPABASE_URL=https://${PROJECT_ID}.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_anon_key_here
REACT_APP_OWNER_EMAIL=andrewswashing@gmail.com
EOF
    echo -e "${YELLOW}⚠️  Please update frontend/.env with your actual anon key${NC}"
else
    # Check if SERVICE_KEY exists and warn
    if grep -q "VITE_SUPABASE_SERVICE_KEY\|SERVICE_ROLE_KEY" frontend/.env; then
        echo -e "${RED}❌ WARNING: Service role key found in frontend/.env${NC}"
        echo -e "${RED}   This is a SECURITY RISK. Remove it immediately!${NC}"
        read -p "Remove service role key from .env? [y/N]: " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            sed -i '/SERVICE_ROLE_KEY/d' frontend/.env
            echo -e "${GREEN}✅ Service role key removed${NC}"
        fi
    fi
fi

echo -e "${GREEN}✅ Frontend environment configured${NC}"
echo ""

# =============================================================================
# STEP 5: Build Frontend
# =============================================================================

echo "🏗️  Step 5: Building frontend..."

cd frontend

echo "📦 Installing dependencies..."
npm install

echo "🔨 Building production bundle..."
npm run build

echo -e "${GREEN}✅ Frontend built successfully${NC}"
cd ..
echo ""

# =============================================================================
# STEP 6: Admin User Setup Instructions
# =============================================================================

echo "👤 Step 6: Admin User Setup"
echo ""
echo -e "${YELLOW}⚠️  Important: You need to create an admin user manually${NC}"
echo ""
echo "Instructions:"
echo "1. Go to: https://supabase.com/dashboard/project/$PROJECT_ID/auth/users"
echo "2. Click 'Add user'"
echo "3. Enter email and password"
echo "4. Copy the user's UUID"
echo "5. Go to: https://supabase.com/dashboard/project/$PROJECT_ID/sql"
echo "6. Run this query (replace [UUID] and [email]):"
echo ""
echo "   INSERT INTO admin_users (id, email, full_name, role, is_active)"
echo "   VALUES ('[UUID]', '[email]', 'Admin Name', 'super_admin', true);"
echo ""
read -p "Press Enter when you've created the admin user..." -r
echo ""

# =============================================================================
# STEP 7: Deploy to Netlify (Optional)
# =============================================================================

echo "🌐 Step 7: Deploy to Netlify (Optional)"
echo ""
read -p "Deploy to Netlify? [y/N]: " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    if ! command -v netlify &> /dev/null; then
        echo "📦 Installing Netlify CLI..."
        npm install -g netlify-cli
    fi

    echo "🚀 Deploying to Netlify..."
    cd frontend
    netlify deploy --prod --dir=build

    echo -e "${GREEN}✅ Deployed to Netlify${NC}"
    echo ""
    echo "⚠️  Don't forget to set environment variables in Netlify dashboard:"
    echo "   - REACT_APP_SUPABASE_URL"
    echo "   - REACT_APP_SUPABASE_ANON_KEY"
    echo "   - REACT_APP_OWNER_EMAIL"
    cd ..
else
    echo "📁 Frontend build is in: frontend/build/"
    echo "   You can deploy manually or use: netlify deploy --prod --dir=frontend/build"
fi

echo ""

# =============================================================================
# SUMMARY
# =============================================================================

echo "═══════════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ DEPLOYMENT COMPLETE!${NC}"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "📚 Documentation: PRODUCTION_BOOKING_SYSTEM.md"
echo ""
echo "🧪 Testing:"
echo "   1. Test booking widget (public): https://your-site.com"
echo "   2. Test admin login: https://your-site.com/admin"
echo ""
echo "🔐 Security Checklist:"
echo "   ✅ Database migration applied"
echo "   ✅ RLS policies enabled"
echo "   ✅ Edge Function deployed"
echo "   ⚠️  Verify NO service_role_key in frontend/.env"
echo "   ⚠️  Admin user created in Supabase"
echo "   ⚠️  Environment variables set in Netlify"
echo ""
echo "📖 For detailed information, see: PRODUCTION_BOOKING_SYSTEM.md"
echo ""
