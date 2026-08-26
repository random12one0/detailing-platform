import { useEffect } from "react";
import YouTubeVideos from "@/components/sections/YouTubeVideos";
import "@/App.css";
import "@/components/sections/aspect-ratio.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

// Section Components
import Header from "@/components/sections/Header";
import Hero from "@/components/sections/Hero";
import TrustBar from "@/components/sections/TrustBar";
import Services from "@/components/sections/Services";
import BookingWidget from "@/components/BookingWidget";
import ServiceOptions from "@/components/sections/ServiceOptions";
import Gallery from "@/components/sections/Gallery";
import Reviews from "@/components/sections/Reviews";
import WhyChooseDetail from "@/components/sections/WhyChooseDetail";
import MeetTheOwner from "@/components/sections/MeetTheOwner";
import FAQ from "@/components/sections/FAQ";
import DiscountBanner from "@/components/sections/DiscountBanner";
import CampaignBanner from "@/components/sections/CampaignBanner";
import Footer from "@/components/sections/Footer";
import StickyBookNow from "@/components/StickyBookNow";

// Admin Page

import ResetPasswordPage from "@/pages/ResetPasswordPage";
import BookingReceipt from "@/pages/BookingReceipt";
import CampaignLink from "@/pages/CampaignLink";
import { trackVisit } from "@/lib/campaign";

// New admin — ground-up rebuild, now the primary /admin, gated by RequireAdmin.
import RequireAdmin from "@/admin/RequireAdmin";
import AdminShell from "@/admin/AdminShell";
import OwnerBookingDetailPage from "@/admin/OwnerBookingDetailPage";
import Toaster from "@/components/Toaster";


const HomePage = () => {
  // Scroll to packages/services section
  const handleCTAClick = () => {
    const el = document.getElementById("booking-widget");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Site-wide traffic tracking (organic — no campaign slug) so the admin
  // campaigns dashboard can show overall site visits alongside campaign links.
  // We intentionally do NOT auto-scroll to the booking widget on load — every
  // visitor (including those arriving via a campaign link like /golf) should
  // land on the hero and see the services first. The "Book now" buttons at the
  // top, bottom, and sticky bar all still scroll to the widget on demand.
  useEffect(() => {
    trackVisit();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <DiscountBanner />
      <CampaignBanner />
      <Header />
      <main>
        <Hero />
        <TrustBar />
        <Services />
        <Reviews />
        <Gallery />
        <WhyChooseDetail onCTAClick={handleCTAClick} />
        <ServiceOptions />
        <MeetTheOwner />
        <YouTubeVideos />
        <FAQ />
        <BookingWidget />
      </main>
      <Footer />
      <StickyBookNow />
    </div>
  );
}

// Redirect legacy /admin-beta[/sub] bookmarks to the equivalent /admin[/sub] path,
// preserving the sub-path (today/calendar/money/clients/more) and query string.
function RedirectAdminBeta() {
  const location = useLocation();
  const rest = location.pathname.replace(/^\/admin-beta/, "");
  return <Navigate to={`/admin${rest}${location.search}`} replace />;
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          {/* Dedicated single-booking owner page — what a push notification tap
              opens, so it lands on one clean job page instead of the crowded
              dashboard. Registered before the /admin/* catch-all so this specific
              path wins the match. */}
          <Route
            path="/admin/job/:id"
            element={
              <RequireAdmin>
                <OwnerBookingDetailPage />
              </RequireAdmin>
            }
          />
          {/* Primary admin — single URL. AdminShell renders every tab via internal
              state (no per-tab routes), so navigating never changes the URL. The `/*`
              keeps old /admin/<tab> bookmarks rendering the shell instead of 404ing. */}
          <Route
            path="/admin/*"
            element={
              <RequireAdmin>
                <AdminShell />
              </RequireAdmin>
            }
          />
          {/* Old bookmarks: /admin-beta[/...] → equivalent /admin[/...] path. */}
          <Route path="/admin-beta/*" element={<RedirectAdminBeta />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          {/* Public, shareable booking confirmation / receipt page. */}
          <Route path="/booking/:id" element={<BookingReceipt />} />
          {/* Trackable short links (QR codes, print ads) — e.g. /golf. Kept last so
              it only ever catches an otherwise-unmatched single path segment. */}
          <Route path="/:slug" element={<CampaignLink />} />
        </Routes>
      </BrowserRouter>
      {/* Global toast renderer — mounted once so use-toast dispatches are visible
          across the public site and the admin (previously nothing rendered them). */}
      <Toaster />
    </div>
  );
}

export default App;
