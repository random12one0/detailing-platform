import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { FadeUp, StaggerContainer, StaggerItem } from '@/components/animations/AnimationWrappers';
import { Check, Sparkles, AlertCircle, ChevronDown } from 'lucide-react';

const ServiceCard = ({ title, tier, price, features, optional, tierLevel = 1, notes = [], priceLabel = null, saleActive = false, salePercent = 0, saleLabel = '' }) => {
  // Detect Add-On and type
  const isAddon = tier && tier.toUpperCase().includes('ADD-ON');
  const isExteriorAddon = isAddon && tier.toUpperCase().includes('EXTERIOR');
  const isInteriorAddon = isAddon && tier.toUpperCase().includes('INTERIOR');
  const isPremium = tierLevel >= 2;
  const isAdvanced = tierLevel >= 3;
  const [open, setOpen] = React.useState(false);

  // Determine price line
  let priceLine;
  if (priceLabel && typeof priceLabel === 'string') {
    priceLine = priceLabel;
  } else {
    priceLine = `Starting at $${price}`;
  }
  // "Starting at $X" gets a prominent number; custom labels render as-is
  const isStartingAt = /^Starting at \$/.test(priceLine);

  // Site-wide sale: strike through the original and show an indicative discounted
  // price (rounded to the nearest dollar, not $5). Only applies to numeric "Starting at" prices.
  const numericPrice = typeof price === 'number'
    ? price
    : (price !== null && price !== undefined && !isNaN(Number(price)) ? Number(price) : null);
  const showSale = saleActive && isStartingAt && numericPrice !== null && salePercent > 0;
  const salePrice = showSale ? Math.round(numericPrice * (1 - salePercent / 100)) : null;
  const saleBadge = saleLabel && saleLabel.trim() ? saleLabel.trim() : `${salePercent}% OFF`;

  // Show the top inclusions on the card face; hide the rest behind the expander
  const VISIBLE_FEATURES = 4;
  const featureList = Array.isArray(features) ? features : [];
  const visibleFeatures = featureList.slice(0, VISIBLE_FEATURES);
  const hiddenFeatures = featureList.slice(VISIBLE_FEATURES);
  const hasNotes = Array.isArray(notes) && notes.length > 0;
  const moreCount = hiddenFeatures.length + (optional ? 1 : 0);
  const hasMore = moreCount > 0 || hasNotes;
  const moreLabel = moreCount > 0 ? `+${moreCount} more` : 'See notes';

  const renderFeature = (feature, index) => (
    <li key={index} className="flex items-start gap-3">
      <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
        isAdvanced ? 'bg-amber-500/10' : 'bg-success/10'
      }`}>
        <Check className={`w-3 h-3 ${isAdvanced ? 'text-amber-500' : 'text-success'}`} />
      </div>
      <span className="text-sm text-muted-foreground">{feature}</span>
    </li>
  );

  return (
    <div className="relative">
      <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-accent/10 to-accent/5 pointer-events-none" style={{ zIndex: 0 }} />
      {/* Deluxe (Tier 2) — tokenized blue shine */}
      {isPremium && !isAdvanced && (
        <div className="absolute -inset-[1px] rounded-xl overflow-hidden" style={{ zIndex: 2 }}>
          <div className="shine-premium absolute inset-0" />
        </div>
      )}
      {/* Ultimate (Tier 3) — gold+blue shine (distinct from Deluxe's pure blue) */}
      {isAdvanced && !isAddon && (
        <div className="absolute -inset-[2px] rounded-xl overflow-hidden" style={{ zIndex: 2 }}>
          <div className="shine-gold absolute inset-0" />
        </div>
      )}
      {/* Animated border for Add-Ons */}
      {isAddon && (
        <div className="absolute -inset-[2px] rounded-xl overflow-hidden" style={{ zIndex: 2 }}>
          <motion.div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, rgba(16,185,129,0.15), rgba(59,130,246,0.15), rgba(16,185,129,0.15), rgba(59,130,246,0.15))', // lighter, more transparent green and blue
              backgroundSize: '200% 100%',
            }}
            animate={{
              backgroundPosition: ['0% 0%', '200% 0%'],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        </div>
      )}
      <Card
        className={`relative h-full overflow-hidden transition-all duration-300 hover:shadow-elegant hover:-translate-y-1 bg-white/90 ${isPremium ? 'border-0' : ''}`}
        style={{ zIndex: 3, cursor: 'pointer' }}
        onClick={e => {
          // Only toggle if not clicking inside the expanded details list
          if (e.target.closest('.service-details-list')) return;
          setOpen(v => !v);
        }}
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(v => !v); } }}
        aria-expanded={open}
      >
        <CardHeader className="pb-4 relative z-10">
          <div className="flex items-center justify-between mb-1">
            <span className={`text-xs font-medium uppercase tracking-wider ${
              isAddon
                ? isExteriorAddon
                  ? 'text-green-600'
                  : isInteriorAddon
                    ? 'text-accent'
                    : 'text-accent'
                : isAdvanced
                  ? 'text-amber-500'
                  : isPremium
                    ? 'text-accent'
                    : 'text-muted-foreground'
            }`}>
              {tier}
            </span>
            {/* Most Popular flag on Deluxe (Tier 2) */}
            {isPremium && !isAdvanced && !isAddon && (
              <span className="text-[10px] font-semibold uppercase tracking-wide bg-accent/15 text-accent border border-accent/40 rounded-full px-2 py-0.5">
                Most Popular
              </span>
            )}
            {isAdvanced && (
              <motion.div
                animate={{
                  opacity: [0.6, 1, 0.6],
                  scale: [1, 1.1, 1],
                }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
              </motion.div>
            )}
          </div>
          <CardTitle className="text-lg font-semibold text-foreground">{title}</CardTitle>
          <div className="mt-2">
            {isStartingAt ? (
              showSale ? (
                <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Starting at</span>
                  <span className="text-base font-semibold text-muted-foreground line-through">${price}</span>
                  <span className="text-2xl font-bold text-success">${salePrice}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide bg-success/15 text-success border border-success/40 rounded-full px-2 py-0.5">
                    {saleBadge}
                  </span>
                </div>
              ) : (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Starting at</span>
                  <span className="text-2xl font-bold text-foreground">${price}</span>
                </div>
              )
            ) : (
              <span className="text-xl font-bold text-accent">{priceLine}</span>
            )}
          </div>
        </CardHeader>
        <CardContent className="relative z-10 service-details-content">
          {/* Top inclusions — always visible on the card face */}
          <ul className="space-y-2.5">
            {visibleFeatures.map(renderFeature)}
          </ul>

          {hasMore && (
            <>
              <div
                className="w-full flex items-center justify-between cursor-pointer outline-none focus:ring-2 focus:ring-accent rounded-lg py-2 px-3 text-sm font-semibold text-accent bg-white/10 hover:bg-accent/10 transition-colors duration-200 mt-3 select-none"
                tabIndex={0}
                aria-label={open ? 'Show fewer details' : 'Show more details'}
              >
                <span>{open ? 'Show less' : moreLabel}</span>
                <ChevronDown className={`ml-2 w-5 h-5 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
              </div>
              <ul className={`service-details-list mt-2 space-y-2.5 ${open ? 'opacity-100 max-h-[500px]' : 'opacity-0 max-h-0'} transition-all duration-300 bg-gradient-to-br from-accent/10 to-accent/5 rounded-xl p-4`} style={{ overflow: 'hidden' }}>
                {/* Remaining features */}
                {hiddenFeatures.map((feature, index) => renderFeature(feature, index))}
                {optional && (
                  <li className="flex items-start gap-3 pt-1">
                    <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isAdvanced ? 'bg-amber-500/10' : 'bg-accent/10'
                    }`}>
                      <Sparkles className={`w-3 h-3 ${isAdvanced ? 'text-amber-500' : 'text-accent'}`} />
                    </div>
                    <span className="text-sm text-muted-foreground italic">{optional}</span>
                  </li>
                )}
                {/* Notes/Disclaimers for Add-Ons */}
                {hasNotes && (
                  <li className="mt-4">
                    <div className="text-xs font-semibold text-accent mb-2">Notes & Disclaimers:</div>
                    <ul className="space-y-2">
                      {notes.map((note, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <div className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 bg-red-500/10">
                            <AlertCircle className="w-3 h-3 text-red-500" />
                          </div>
                          <span className="text-xs text-red-700 italic">{note}</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                )}
              </ul>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};



export const Services = () => {
  // Helper to diff features and add 'Everything from previous tier'
  function buildTieredFeatures(services) {
    return services.map((service, idx, arr) => {
      if (idx === 0) return { ...service };
      const prev = arr[idx - 1];
      // Only show features that are new compared to previous tier
      const newFeatures = service.features.filter(f => !prev.features.includes(f));
      return {
        ...service,
        features: [
          `Everything from ${arr[idx - 1].tierLabel}`,
          ...newFeatures
        ]
      };
    });
  }

  // Convert a free-text notes field (possibly multi-line) into an array of bullets
  function toNotesArray(text) {
    if (!text || typeof text !== 'string') return [];
    return text.split('\n').map(s => s.trim()).filter(Boolean);
  }

  // Build a "15% Off" style label from a discount_type/discount_value pair
  function formatDiscount(type, value) {
    const n = Number(value);
    if (!isFinite(n) || n === 0) return 'Members Discount';
    const num = Number.isInteger(n) ? n : Number(n.toFixed(2));
    return type === 'percentage'
      ? `${num}% Off Each Detail`
      : `$${num} Off Each Detail`;
  }

  // --- Dynamic Packages (all) ---
  const [allPackages, setAllPackages] = useState([]);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [packagesError, setPackagesError] = useState(null);

  // --- Dynamic Add-Ons ---
  const [addOnsData, setAddOnsData] = useState([]);

  // --- Dynamic Monthly Plan ---
  const [monthlyPlan, setMonthlyPlan] = useState(null);

  // --- Site-wide discount (from business_info, single row id=1) ---
  const [siteDiscount, setSiteDiscount] = useState({ active: false, percent: 0, label: '' });

  useEffect(() => {
    async function fetchSiteDiscount() {
      try {
        const { data, error } = await supabase
          .from('business_info')
          .select('site_discount_active, site_discount_percent, site_discount_label')
          .eq('id', 1)
          .single();
        if (error) throw error;
        setSiteDiscount({
          active: !!data?.site_discount_active,
          percent: Number(data?.site_discount_percent) || 0,
          label: data?.site_discount_label || '',
        });
      } catch (err) {
        setSiteDiscount({ active: false, percent: 0, label: '' });
      }
    }
    fetchSiteDiscount();
  }, []);

  useEffect(() => {
    async function fetchAllPackages() {
      setLoadingPackages(true);
      setPackagesError(null);
      try {
        const { data, error } = await supabase
          .from('packages')
          .select('*')
          .eq('is_active', true)
          .order('category', { ascending: true })
          .order('tier', { ascending: true });
        if (error) throw error;
        setAllPackages(Array.isArray(data) ? data : []);
      } catch (err) {
        setPackagesError('Failed to load packages');
        setAllPackages([]);
      } finally {
        setLoadingPackages(false);
      }
    }
    fetchAllPackages();
  }, []);

  useEffect(() => {
    async function fetchAddOns() {
      try {
        const { data, error } = await supabase
          .from('add_ons')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true })
          .order('name', { ascending: true });
        if (error) throw error;
        setAddOnsData(Array.isArray(data) ? data : []);
      } catch (err) {
        setAddOnsData([]);
      }
    }
    fetchAddOns();
  }, []);

  useEffect(() => {
    async function fetchMonthlyPlan() {
      try {
        const { data, error } = await supabase
          .from('monthly_plans')
          .select('*')
          .eq('is_active', true)
          .order('id', { ascending: true })
          .limit(1);
        if (error) throw error;
        setMonthlyPlan(Array.isArray(data) && data.length > 0 ? data[0] : null);
      } catch (err) {
        setMonthlyPlan(null);
      }
    }
    fetchMonthlyPlan();
  }, []);

  // Map DB rows to card props. Feature bullets, prices and notes all come from
  // the `packages` table so the marketing page never diverges from the booking widget.
  const tierOrder = ['standard', 'deluxe', 'ultimate'];

  function mapPackageTier({ category, tier, idx, fallbackTitle, tierPrefix }) {
    const pkg = allPackages.find(p => p.category === category && p.tier === tier);
    const title = pkg?.name || fallbackTitle;
    let price = 'N/A';
    if (pkg?.base_price !== undefined && pkg?.base_price !== null) {
      if (typeof pkg.base_price === 'number') {
        price = pkg.base_price;
      } else if (!isNaN(Number(pkg.base_price))) {
        price = Number(pkg.base_price);
      }
    }
    const features = Array.isArray(pkg?.features) ? pkg.features : [];
    const notes = toNotesArray(pkg?.notes);
    return {
      title,
      tier: `${tierPrefix} Tier ${idx + 1}`,
      tierLabel: `${tierPrefix} Tier ${idx + 1}`,
      price,
      tierLevel: idx + 1,
      features,
      notes,
    };
  }

  // Always render 3 cards, one for each tier, using DB data if available
  const exteriorServices = buildTieredFeatures(
    tierOrder.map((tier, idx) => mapPackageTier({
      category: 'exterior',
      tier,
      idx,
      fallbackTitle: `${tier.charAt(0).toUpperCase() + tier.slice(1)} Exterior Detail`,
      tierPrefix: 'Exterior',
    }))
  );

  const interiorServices = buildTieredFeatures(
    tierOrder.map((tier, idx) => ({
      ...mapPackageTier({
        category: 'interior',
        tier,
        idx,
        fallbackTitle: `${tier.charAt(0).toUpperCase() + tier.slice(1)} Interior Clean`,
        tierPrefix: 'Interior',
      }),
      optional: "Complimentary interior scent",
    }))
  );

  // Add-Ons data — rendered from the add_ons table
  const addOns = addOnsData.map((a) => {
    let price = 'N/A';
    if (a?.price !== undefined && a?.price !== null && !isNaN(Number(a.price))) {
      price = Number(a.price);
    }
    const typeLabel = (a?.type || '').toUpperCase();
    const features = Array.isArray(a?.features) && a.features.length > 0
      ? a.features
      : (a?.description ? [a.description] : []);
    return {
      title: (a?.name || '').trim(),
      tier: typeLabel ? `${typeLabel} ADD-ON` : 'ADD-ON',
      price,
      tierLevel: 1,
      features,
      optional: null,
      notes: toNotesArray(a?.notes),
    };
  });

  // Monthly Maintenance Plan data — rendered from the monthly_plans table
  const maintenancePlan = monthlyPlan
    ? [
        {
          title: monthlyPlan.name || 'Monthly Maintenance Plan',
          tier: "Monthly Maintenance Plan",
          price: null,
          priceLabel: formatDiscount(monthlyPlan.discount_type, monthlyPlan.discount_value),
          features: monthlyPlan.description ? [monthlyPlan.description] : [],
          optional: null,
          tierLevel: 1,
          notes: [],
        },
      ]
    : [];

  return (
    <section id="services" className="py-24 lg:py-32 bg-gradient-to-b from-background to-secondary/40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <FadeUp>
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              Our Services
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-foreground mb-4">
              Professional Detailing Packages
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Quality care for every need and budget. Choose the service that fits your vehicle best.
            </p>
          </div>
        </FadeUp>

        {/* Exterior Services */}
        <FadeUp delay={0.1}>
          <div className="mb-16">
            <h3 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
              <div className="w-1 h-6 bg-accent rounded-full" />
              Exterior Detailing
            </h3>
            <StaggerContainer className="grid md:grid-cols-3 gap-6" staggerDelay={0.1}>
              {exteriorServices.map((service, index) => (
                <StaggerItem key={index}>
                  <ServiceCard {...service} saleActive={siteDiscount.active} salePercent={siteDiscount.percent} saleLabel={siteDiscount.label} />
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </FadeUp>

        {/* Interior Services */}
        <FadeUp delay={0.2}>
          <div className="mb-16">
            <h3 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
              <div className="w-1 h-6 bg-accent rounded-full" />
              Interior Detailing
            </h3>
            <StaggerContainer className="grid md:grid-cols-3 gap-6" staggerDelay={0.1}>
              {interiorServices.map((service, index) => (
                <StaggerItem key={index}>
                  <ServiceCard {...service} saleActive={siteDiscount.active} salePercent={siteDiscount.percent} saleLabel={siteDiscount.label} />
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </FadeUp>

        {/* Add-Ons Section */}
        {addOns.length > 0 && (
        <FadeUp delay={0.3}>
          <div className="mb-16">
            <h3 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
              <div className="w-1 h-6 bg-accent rounded-full" />
              Add-Ons
            </h3>
            <StaggerContainer className="grid md:grid-cols-3 gap-6" staggerDelay={0.1}>
              {addOns.map((service, index) => (
                <StaggerItem key={index}>
                  <ServiceCard
                    title={service.title}
                    tier={service.tier}
                    price={service.price}
                    priceLabel={service.priceLabel}
                    features={service.features}
                    optional={service.optional}
                    tierLevel={service.tierLevel}
                    notes={service.notes}
                    saleActive={siteDiscount.active}
                    salePercent={siteDiscount.percent}
                    saleLabel={siteDiscount.label}
                  />
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </FadeUp>
        )}

        {/* Monthly Maintenance Plan Section */}
        {maintenancePlan.length > 0 && (
        <FadeUp delay={0.4}>
          <div>
            <h3 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
              <div className="w-1 h-6 bg-accent rounded-full" />
              Monthly Maintenance Plan
            </h3>
            <StaggerContainer className="grid md:grid-cols-3 gap-6" staggerDelay={0.1}>
              {maintenancePlan.map((service, index) => (
                <StaggerItem key={index}>
                  <ServiceCard
                    title={service.title}
                    tier={service.tier}
                    price={service.price}
                    priceLabel={service.priceLabel}
                    features={service.features}
                    optional={service.optional}
                    tierLevel={service.tierLevel}
                    notes={service.notes}
                  />
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </FadeUp>
        )}
      </div>
    </section>
  );
};

export default Services;
