// What search engines and share cards say about each marketing page.
// Every price is read from the price table handed in (pricing.js, or the
// owner's override); nothing here types a number.
import { SITE } from "../lib/useHead.js";

const ORG = { "@type": "Organization", "@id": `${SITE}/#org`, name: "Detailing Platform", url: SITE, logo: `${SITE}/icon-512.png` };

const offer = (name, price, unit, url) => ({
  "@type": "Offer", name, url, priceCurrency: "USD", availability: "https://schema.org/InStock",
  priceSpecification: { "@type": "UnitPriceSpecification", price: String(price), priceCurrency: "USD", unitText: unit },
});

export function homeHead(P) {
  return {
    title: "Detailer website and booking software | Detailing Platform",
    description: "A custom website for your detailing business and the dashboard that runs it. Customers book online. You change prices and hours from your phone.",
    path: "/",
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [
        ORG,
        {
          "@type": "SoftwareApplication", name: "Detailing Platform", applicationCategory: "BusinessApplication",
          operatingSystem: "Web", url: SITE, publisher: { "@id": `${SITE}/#org` },
          description: "A custom website, online booking and a dashboard for one auto detailing business.",
          offers: [
            offer("Website and dashboard, monthly", P.website.monthly, "month", `${SITE}/pricing`),
            offer("Booking only, monthly", P.bookingOnly.monthly, "month", `${SITE}/pricing`),
          ],
        },
      ],
    },
  };
}

export function pricingHead(P) {
  return {
    title: "Pricing: detailer website and booking | Detailing Platform",
    description: `The website and dashboard are $${P.website.setup} to set up and $${P.website.monthly} a month. Booking only is $${P.bookingOnly.monthly} a month. Terms are printed before you pay.`,
    path: "/pricing",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Product", name: "Detailing Platform", url: `${SITE}/pricing`, brand: { "@id": `${SITE}/#org` },
      description: "A custom website, online booking and a dashboard for one auto detailing business.",
      offers: [
        offer("Website and dashboard, monthly", P.website.monthly, "month", `${SITE}/pricing`),
        offer("Booking only, monthly", P.bookingOnly.monthly, "month", `${SITE}/pricing`),
      ],
    },
  };
}

export const legalHead = {
  terms: { title: "Terms of service | Detailing Platform", description: "What you agree to when you use Detailing Platform: the plans, the term, billing and how to cancel.", path: "/terms" },
  privacy: { title: "Privacy policy | Detailing Platform", description: "What Detailing Platform collects, why, who sees it and how to ask for it to be deleted.", path: "/privacy" },
};
