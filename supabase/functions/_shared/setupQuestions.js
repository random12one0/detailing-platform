// The form, review and extraction service share this list of supported settings.
export const chapters = [
  {
    key: "identity",
    section: "Your shop",
    title: "Business details",
    help: "Enter the details customers use to reach you.",
    fields: [
      { key: "name", label: "Business name", type: "text" },
      { key: "contact_phone", label: "Business phone", type: "tel" },
      { key: "contact_email", label: "Business email", type: "email" },
      { key: "mailing_address", label: "Mailing address", type: "text" },
      {
        key: "established_year",
        label: "Year you started",
        type: "integer",
        min: 1900,
        max: 2100,
      },
    ],
  },
  {
    key: "website",
    section: "Your shop",
    title: "Existing website",
    help: "Save your current website address for your website form.",
    fields: [
      { key: "website", label: "Website address", type: "url" },
      {
        key: "source",
        label: "Text from your website or business notes",
        type: "long",
      },
    ],
  },
  {
    key: "menu",
    section: "Your menu",
    title: "Services and packages",
    help: "List what each service includes, its price and how long it takes. Include any add-ons or package options.",
    fields: [
      {
        key: "menu_notes",
        label: "Describe your services and packages",
        type: "long",
      },
      { key: "service_groups", label: "Service categories", type: "rows" },
      { key: "services", label: "Services", type: "rows" },
      { key: "addons", label: "Add-ons", type: "rows" },
    ],
  },
  {
    key: "size",
    section: "Your menu",
    title: "Vehicle sizes and pricing",
    help: "List your sizes from smallest to largest. Include the vehicles in each size and any extra price or time.",
    fields: [
      {
        key: "size_details",
        label: "Describe your vehicle sizes and prices",
        type: "long",
      },
      {
        key: "size_mode",
        label: "When do you charge extra for size?",
        type: "choice",
        options: [
          ["flat", "Same price for every size"],
          ["purchase", "Once per purchase"],
          ["service", "For each service"],
        ],
      },
      { key: "vehicle_sizes", label: "Your vehicle sizes", type: "rows" },
    ],
  },
  {
    key: "location",
    section: "Appointments",
    title: "Service locations",
    help: "Include where you work, travel fees and what customers need to provide.",
    fields: [
      {
        key: "location_notes",
        label: "Describe your service area and travel fees",
        type: "long",
      },
      {
        key: "location",
        label: "Where you work",
        type: "choice",
        options: [
          ["mobile", "At the customer's address"],
          ["shop", "At my shop"],
          ["both", "Both"],
        ],
      },
      { key: "dropoff_address", label: "Shop address", type: "text" },
      { key: "service_area", label: "Cities or service area", type: "text" },
      { key: "travel_fee", label: "Flat travel fee ($)", type: "money" },
      {
        key: "travel_radius_miles",
        label: "Maximum travel distance (miles)",
        type: "integer",
      },
      { key: "travel_zones", label: "Travel fees by area", type: "rows" },
      {
        key: "water_requirement",
        label: "Water for mobile jobs",
        type: "choice",
        options: [
          ["not_needed", "I bring my own"],
          ["ask", "Ask the customer"],
          ["required", "Customer must provide it"],
        ],
      },
      {
        key: "power_requirement",
        label: "Electricity for mobile jobs",
        type: "choice",
        options: [
          ["not_needed", "I bring my own"],
          ["ask", "Ask the customer"],
          ["required", "Customer must provide it"],
        ],
      },
    ],
  },
  {
    key: "schedule",
    section: "Appointments",
    title: "Hours and availability",
    help: "List your workdays, opening hours and any time you need between jobs.",
    fields: [
      {
        key: "schedule_notes",
        label: "Describe your work schedule",
        type: "long",
      },
      { key: "timezone", label: "Time zone", type: "timezone" },
      { key: "hours", label: "Weekly hours", type: "hours" },
      {
        key: "buffer_minutes",
        label: "Time between appointments (minutes)",
        type: "integer",
        max: 480,
      },
      {
        key: "min_advance_minutes",
        label: "Minimum notice to book an appointment (minutes)",
        type: "integer",
        max: 20160,
      },
      {
        key: "slot_interval_minutes",
        label: "Time between available start times (minutes)",
        type: "integer",
        min: 1,
        max: 1440,
      },
      { key: "days_off", label: "Days off and partial closures", type: "rows" },
      { key: "special_hours", label: "Hours on specific dates", type: "rows" },
      {
        key: "service_periods",
        label: "Dates for shop-only or mobile-only service",
        type: "rows",
      },
      {
        key: "closed_until",
        label: "Date you reopen for bookings",
        type: "date",
      },
      {
        key: "closed_note",
        label: "Message customers see while you are closed",
        type: "text",
      },
    ],
  },
  {
    key: "booking",
    section: "Appointments",
    title: "Booking rules",
    help: "Describe how customers book and any limits on appointments or vehicles.",
    fields: [
      {
        key: "booking_notes",
        label: "Describe your booking rules",
        type: "long",
      },
      {
        key: "booking_mode",
        label: "How are bookings confirmed?",
        type: "choice",
        options: [
          ["reserve", "Confirm automatically"],
          ["request", "I approve each request"],
        ],
      },
      {
        key: "max_bookings_per_day",
        label: "Maximum appointments per day",
        type: "integer",
        min: 1,
      },
      {
        key: "max_advance_days",
        label: "How many days in advance can a customer book?",
        type: "integer",
        min: 1,
        max: 1095,
      },
      {
        key: "max_vehicles_per_booking",
        label: "Maximum vehicles per booking",
        type: "integer",
        min: 1,
        max: 10,
      },
      {
        key: "extra_vehicle_minutes_saved",
        label: "Minutes saved on each additional vehicle",
        type: "integer",
        max: 480,
      },
      {
        key: "ask_vehicle_condition",
        label: "Ask customers about vehicle condition?",
        type: "choice",
        options: [
          ["yes", "Yes"],
          ["no", "No"],
        ],
      },
      {
        key: "price_rules",
        label: "Weekend, evening or short-notice fees",
        type: "rows",
      },
    ],
  },
  {
    key: "changes",
    section: "Appointments",
    title: "Cancellations and rescheduling",
    help: "Describe your deadlines, fees and exceptions.",
    fields: [
      {
        key: "policy_notes",
        label: "Describe your cancellation and rescheduling policy",
        type: "long",
      },
      {
        key: "cancellation_window_hours",
        label:
          "How many hours before the appointment must customers cancel or reschedule online?",
        type: "integer",
        max: 720,
      },
    ],
  },
  {
    key: "payments",
    section: "Your business",
    title: "Payment methods",
    help: "List how customers can pay and the payment details they need.",
    fields: [
      {
        key: "payment_notes",
        label: "Describe how you accept payments",
        type: "long",
      },
      {
        key: "cash",
        label: "Do you take cash?",
        type: "choice",
        options: [
          ["yes", "Yes"],
          ["no", "No"],
        ],
      },
      { key: "pay_venmo", label: "Venmo handle", type: "text" },
      { key: "pay_cashapp", label: "Cash App handle", type: "text" },
      { key: "pay_zelle", label: "Zelle contact", type: "text" },
      { key: "pay_paypal", label: "PayPal contact", type: "text" },
      { key: "pay_custom", label: "Other payment methods", type: "rows" },
    ],
  },
  {
    key: "brand",
    section: "Your business",
    title: "Business profile",
    help: "Add the description, color and links you want customers to see.",
    fields: [
      { key: "about_copy", label: "About your business", type: "long" },
      { key: "tagline", label: "Tagline", type: "text" },
      { key: "primary_color", label: "Brand color", type: "color" },
      { key: "social_instagram", label: "Instagram URL", type: "url" },
      { key: "social_facebook", label: "Facebook URL", type: "url" },
      { key: "social_tiktok", label: "TikTok URL", type: "url" },
      { key: "social_youtube", label: "YouTube URL", type: "url" },
      { key: "google_review_url", label: "Google review link", type: "url" },
      { key: "yelp_review_url", label: "Yelp review link", type: "url" },
      { key: "credentials", label: "Business qualifications", type: "rows" },
    ],
  },
  {
    key: "faq",
    section: "Your business",
    title: "Customer questions",
    help: "Add the questions and answers customers should see on your site.",
    fields: [
      {
        key: "faq_notes",
        label: "List common questions and your answers",
        type: "long",
      },
      { key: "faqs", label: "Common questions", type: "faqs" },
    ],
  },
  {
    key: "extras",
    section: "Your business",
    title: "Memberships and discounts",
    help: "Include the price, how often members visit and any limits on discounts.",
    fields: [
      {
        key: "plan_notes",
        label: "Describe your memberships, packages or discounts",
        type: "long",
      },
      { key: "plans", label: "Membership plans", type: "rows" },
      { key: "promos", label: "Discount codes", type: "rows" },
      {
        key: "site_discount_active",
        label: "Run a storewide sale?",
        type: "choice",
        options: [
          ["yes", "Yes"],
          ["no", "No"],
        ],
      },
      {
        key: "site_discount_percent",
        label: "Storewide discount (%)",
        type: "integer",
        min: 1,
        max: 100,
      },
      { key: "site_discount_label", label: "Sale name", type: "text" },
    ],
  },
  {
    key: "messages",
    section: "Your business",
    title: "Messages and reminders",
    help: "List the messages you send, who receives them and when.",
    fields: [
      {
        key: "message_notes",
        label: "Describe your messages and reminders",
        type: "long",
      },
      {
        key: "on_my_way",
        label: "Message you send when you are on your way",
        type: "long",
      },
      {
        key: "customer_reminder_lead_minutes",
        label:
          "How many minutes before the appointment should the customer get a reminder?",
        type: "integer",
        max: 10080,
      },
      {
        key: "customer_reminder_2_enabled",
        label: "Send a second reminder?",
        type: "choice",
        options: [
          ["yes", "Yes"],
          ["no", "No"],
        ],
      },
      {
        key: "customer_reminder_2_lead_minutes",
        label: "Minutes before the appointment for the second reminder",
        type: "integer",
        max: 10080,
      },
      {
        key: "evening_before_enabled",
        label: "Remind customers the night before early appointments?",
        type: "choice",
        options: [
          ["yes", "Yes"],
          ["no", "No"],
        ],
      },
      {
        key: "request_nudge_hours",
        label: "Hours to wait before reminding you to approve a request",
        type: "integer",
        max: 168,
      },
      {
        key: "email_customer_confirmation",
        label: "Email customers a booking confirmation?",
        type: "choice",
        options: [
          ["yes", "Yes"],
          ["no", "No"],
        ],
      },
      {
        key: "email_customer_reminder",
        label: "Email customers an appointment reminder?",
        type: "choice",
        options: [
          ["yes", "Yes"],
          ["no", "No"],
        ],
      },
      {
        key: "email_customer_followup",
        label: "Email customers after their appointment?",
        type: "choice",
        options: [
          ["yes", "Yes"],
          ["no", "No"],
        ],
      },
      {
        key: "email_owner_new_booking",
        label: "Email you about new bookings?",
        type: "choice",
        options: [
          ["yes", "Yes"],
          ["no", "No"],
        ],
      },
      {
        key: "email_owner_reminder",
        label: "Email you before a job?",
        type: "choice",
        options: [
          ["yes", "Yes"],
          ["no", "No"],
        ],
      },
      { key: "templates", label: "Saved text messages", type: "rows" },
      {
        key: "email_footers",
        label: "Notes at the bottom of customer emails",
        type: "rows",
      },
      {
        key: "daily_digest_hour",
        label: "Hour for your daily summary (0–23)",
        type: "integer",
        max: 23,
      },
      {
        key: "owner_nudge_lead_minutes",
        label: "Minutes before a job to remind you",
        type: "integer",
        max: 720,
      },
      {
        key: "finalize_nudge_delay_minutes",
        label: "Minutes after a job to remind you to record payment",
        type: "integer",
        max: 1440,
      },
      {
        key: "email_sign_as_business",
        label: "Sign emails with the business name?",
        type: "choice",
        options: [
          ["yes", "Yes"],
          ["no", "No"],
        ],
      },
    ],
  },
  {
    key: "other",
    section: "Your business",
    title: "Other business rules",
    help: "Describe anything else your dashboard needs to handle. You can review saved requests later.",
    fields: [
      {
        key: "team_notes",
        label: "What else does your business need?",
        type: "long",
      },
      {
        key: "finish_in_dashboard",
        label: "Choose more setup tasks",
        type: "tasks",
        options: [
          ["payments", "Connect card payments"],
          ["gallery", "Add photos"],
          ["reviews", "Add customer reviews"],
          ["team", "Invite your team"],
          ["google", "Connect Google Business"],
          ["domain", "Set up a domain"],
          ["notifications", "Set notification recipients"],
          ["preferences", "Set device preferences"],
          ["campaigns", "Set up tracking links"],
          ["maintenance", "Set up visits due"],
          ["billing", "Billing and subscription"],
        ],
      },
      {
        key: "follow_up",
        label: "Rules that still need setup or a new feature",
        type: "long",
      },
      { key: "weather_alerts", label: "Weather warnings", type: "rows" },
      {
        key: "weather_hot",
        label: "Heat warning above (°F)",
        type: "integer",
        min: 70,
        max: 125,
      },
      {
        key: "weather_cold",
        label: "Cold warning below (°F)",
        type: "integer",
        min: 0,
        max: 60,
      },
      {
        key: "weather_rain",
        label: "Rain warning at this chance of rain (%)",
        type: "integer",
        min: 10,
        max: 90,
      },
      {
        key: "weather_wind",
        label: "High wind warning at (mph)",
        type: "integer",
        min: 5,
        max: 60,
      },
    ],
  },
  {
    key: "clients",
    section: "Customers",
    title: "Import customers",
    help: "Upload a CSV file with Name and Phone columns. Review the matches before importing.",
    fields: [],
  },
];
export const rowSchemas = {
  vehicle_sizes: [
    { key: "label", label: "Size name", type: "text" },
    {
      key: "examples",
      label: "Example vehicles",
      type: "text",
      optional: true,
    },
    {
      key: "bodyTypes",
      label: "Vehicle types in this size",
      type: "bodyTypes",
      optional: true,
    },
    {
      key: "fee",
      label: "Extra price for this size ($)",
      type: "money",
      optional: true,
    },
    {
      key: "extra_minutes",
      label: "Extra time per service for this size (minutes)",
      type: "integer",
      optional: true,
      max: 1440,
    },
  ],
  service_groups: [
    { key: "name", label: "Name", type: "text" },
    { key: "description", label: "Description", type: "text", optional: true },
    {
      key: "selection",
      label: "What can customers choose?",
      type: "choice",
      options: [
        ["one", "One service in this category"],
        ["any", "Multiple services in this category"],
        ["exclusive", "One service for the whole booking"],
      ],
    },
  ],
  services: [
    { key: "name", label: "Name", type: "text" },
    { key: "price", label: "Base price ($)", type: "money" },
    {
      key: "minutes",
      label: "Base duration (minutes)",
      type: "integer",
      max: 1440,
      min: 1,
    },
    { key: "description", label: "Description", type: "text", optional: true },
    {
      key: "features",
      label: "What is included?",
      type: "lines",
      optional: true,
    },
    {
      key: "price_is_from",
      label: "Starting price",
      type: "bool",
      optional: true,
    },
    { key: "group", label: "Category name", type: "text", optional: true },
    {
      key: "location",
      label: "Service location",
      type: "choice",
      optional: true,
      options: [
        ["either", "Shop or mobile"],
        ["mobile", "Mobile only"],
        ["dropoff", "Shop only"],
      ],
    },
    {
      key: "weekdays",
      label: "Days this service is available",
      type: "weekdays",
      optional: true,
    },
    {
      key: "size_prices",
      label: "Exact prices and times by size",
      type: "rows",
      optional: true,
    },
  ],
  size_prices: [
    { key: "size", label: "Size name", type: "text" },
    {
      key: "price",
      label: "Total service price for this size ($)",
      type: "money",
      optional: true,
    },
    {
      key: "minutes",
      label: "Total service time for this size (minutes)",
      type: "integer",
      optional: true,
      min: 1,
      max: 1440,
    },
  ],
  addons: [
    { key: "name", label: "Name", type: "text" },
    { key: "price", label: "Base price ($)", type: "money" },
    {
      key: "minutes",
      label: "Base duration (minutes)",
      type: "integer",
      max: 1440,
    },
    { key: "description", label: "Description", type: "text", optional: true },
  ],
  travel_zones: [
    { key: "name", label: "Name", type: "text" },
    { key: "fee", label: "Travel fee ($)", type: "money" },
  ],
  price_rules: [
    { key: "label", label: "Fee name", type: "text" },
    {
      key: "kind",
      label: "When does the fee apply?",
      type: "choice",
      options: [
        ["time", "Specific days or hours"],
        ["lead_time", "Short notice"],
      ],
    },
    { key: "amount", label: "Fee amount", type: "money" },
    { key: "is_percent", label: "Charge as a percentage?", type: "bool" },
    { key: "weekdays", label: "Days", type: "weekdays", optional: true },
    { key: "start_time", label: "Start time", type: "time", optional: true },
    { key: "end_time", label: "End time", type: "time", optional: true },
    {
      key: "within_hours",
      label: "Hours of notice or less",
      type: "integer",
      optional: true,
      min: 1,
      max: 720,
    },
  ],
  pay_custom: [
    { key: "label", label: "Payment method", type: "text" },
    { key: "handle", label: "Payment instructions", type: "text" },
  ],
  plans: [
    { key: "name", label: "Name", type: "text" },
    { key: "price", label: "Price or percentage", type: "money" },
    {
      key: "price_kind",
      label: "How members pay",
      type: "choice",
      options: [
        ["monthly", "Per month"],
        ["per_visit", "Per visit"],
        ["total", "Up front"],
        ["percent_off", "Percent off"],
      ],
    },
    {
      key: "visits",
      label: "Visits per period",
      type: "integer",
      min: 1,
      max: 365,
    },
    {
      key: "cadence_unit",
      label: "Membership schedule",
      type: "choice",
      options: [
        ["week", "Weeks"],
        ["month", "Months"],
        ["year", "Years"],
        ["once", "One time"],
      ],
    },
    {
      key: "cadence_count",
      label: "Number of weeks, months or years between visits",
      type: "integer",
      optional: true,
      min: 1,
      max: 365,
    },
    {
      key: "term_months",
      label: "Membership length (months)",
      type: "integer",
      optional: true,
      min: 1,
      max: 600,
    },
    { key: "includes", label: "What is included?", type: "text" },
  ],
  promos: [
    { key: "code", label: "Code", type: "text" },
    {
      key: "type",
      label: "Discount type",
      type: "choice",
      options: [
        ["percentage", "Percent off"],
        ["amount", "Dollars off"],
      ],
    },
    { key: "value", label: "Discount amount", type: "money" },
    {
      key: "usage_limit",
      label: "Maximum total uses",
      type: "integer",
      optional: true,
      min: 1,
      max: 100000,
    },
    {
      key: "once_per_customer",
      label: "Limit to one use per customer?",
      type: "bool",
      optional: true,
    },
  ],
  days_off: [
    { key: "name", label: "Reason for closure", type: "text" },
    { key: "start_date", label: "First date", type: "date" },
    { key: "end_date", label: "Last date", type: "date" },
    { key: "start_time", label: "Start time", type: "time", optional: true },
    { key: "end_time", label: "End time", type: "time", optional: true },
  ],
  special_hours: [
    { key: "date", label: "Date", type: "date" },
    { key: "open", label: "Opens", type: "time" },
    { key: "close", label: "Closes", type: "time" },
  ],
  service_periods: [
    { key: "start_date", label: "First date", type: "date" },
    { key: "end_date", label: "Last date", type: "date" },
    {
      key: "mode",
      label: "Available service location",
      type: "choice",
      options: [
        ["mobile", "Mobile only"],
        ["dropoff", "Shop only"],
      ],
    },
    { key: "reason", label: "Reason", type: "text", optional: true },
  ],
  credentials: [
    { key: "label", label: "Qualification", type: "text" },
    { key: "detail", label: "Details", type: "text", optional: true },
  ],
  templates: [
    {
      key: "kind",
      label: "Text message",
      type: "choice",
      options: [
        ["running_late", "Running late"],
        ["confirm_tomorrow", "Confirm tomorrow"],
        ["job_done", "Job finished"],
        ["arrival_access", "Ask about access"],
        ["booking_confirmed", "Booking confirmed"],
      ],
    },
    { key: "body", label: "Message", type: "text", maxLength: 500 },
  ],
  email_footers: [
    {
      key: "kind",
      label: "Email",
      type: "choice",
      options: [
        ["confirmation", "Booking confirmed"],
        ["request_received", "Request received"],
        ["quote", "Quote"],
        ["accepted", "Request accepted"],
        ["declined", "Request declined"],
        ["reminder", "Appointment reminder"],
        ["reminder_2", "Second reminder"],
        ["rescheduled", "Rescheduled"],
        ["cancelled", "Cancelled"],
        ["receipt", "Receipt"],
        ["invoice", "Invoice"],
        ["followup", "Thank-you and review request"],
      ],
    },
    {
      key: "body",
      label: "Text to add to this email",
      type: "text",
      maxLength: 400,
    },
  ],
  weather_alerts: [
    {
      key: "kind",
      label: "Weather condition",
      type: "choice",
      options: [
        ["rain", "Rain"],
        ["snow", "Snow or ice"],
        ["storm", "Thunderstorms"],
        ["wind", "High wind"],
        ["hot", "Heat"],
        ["cold", "Cold"],
      ],
    },
    { key: "enabled", label: "Show this warning?", type: "bool" },
    {
      key: "message",
      label: "Custom warning text",
      type: "text",
      optional: true,
      maxLength: 120,
    },
  ],
};
export const fields = Object.fromEntries(
  chapters.flatMap((c) => c.fields.map((f) => [f.key, f])),
);
// Accept receipts written before sizes were editable. The form migrates these on resume.
for (const key of ["medium_fee", "large_fee"])
  fields[key] = {
    key,
    type: "money",
    label:
      key === "medium_fee"
        ? "Extra for a medium vehicle ($)"
        : "Extra for a large vehicle ($)",
  };

export const bodyTypeKeys = [
  "coupe",
  "sedan",
  "hatchback",
  "convertible",
  "wagon",
  "small_suv",
  "mid_suv",
  "large_suv",
  "pickup_standard",
  "pickup_crew",
  "minivan",
  "cargo_van",
  "sports_exotic",
  "oversized",
];
export const noteKeys = chapters.flatMap((c) =>
  c.fields
    .filter(
      (f) =>
        f.key.endsWith("_notes") ||
        ["source", "size_details", "follow_up"].includes(f.key),
    )
    .map((f) => f.key),
);

function validDate(v) {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const date = new Date(v + "T00:00:00Z");
  return (
    Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === v
  );
}
function validTemplate(text) {
  return !/[{}]/.test(
    text.replace(
      /\{\{\s*(customer_name|business_name|date|time|address|total|service|vehicle|business_phone|booking_link)\s*\}\}/g,
      "",
    ),
  );
}
function canonicalRows(key, input) {
  if (!Array.isArray(input)) throw Error("rows");
  const seen = new Set(),
    assigned = new Set();
  return input.map((original, i) => {
    let row = original;
    if (key === "plans" && !row.price_kind && !row.cadence_unit)
      row = {
        ...row,
        price_kind: "monthly",
        cadence_unit: "month",
        cadence_count: 1,
      };
    if (key === "promos" && row.percent != null && !row.type) {
      const { percent, ...rest } = row;
      row = { ...rest, type: "percentage", value: percent };
    }
    const schema = rowSchemas[key];
    if (Object.keys(row).some((k) => !schema.some((f) => f.key === k)))
      throw Error("field");
    const output = {};
    for (const f of schema) {
      const v = row[f.key];
      if (!f.optional && (v == null || v === "")) {
        const error = Error("required");
        error.label = f.label;
        error.item = row.name || row.label || row.code || String(i + 1);
        throw error;
      }
      if (
        f.optional &&
        (v == null ||
          v === "" ||
          (Array.isArray(v) && !v.length && f.type !== "bodyTypes"))
      )
        continue;
      if (f.type === "bool") {
        if (typeof v !== "boolean") throw Error("choice");
        output[f.key] = v;
      } else if (f.type === "integer" || f.type === "money") {
        const n = numeric(v, f.max ?? 100000, f.type === "integer", f.min ?? 0);
        if (Math.abs(n * 100 - Math.round(n * 100)) > 0.000001)
          throw Error("cents");
        output[f.key] = n;
      } else if (f.type === "rows") output[f.key] = canonicalRows(f.key, v);
      else if (["bodyTypes", "weekdays", "lines"].includes(f.type)) {
        if (!Array.isArray(v) || v.length > 100) throw Error("list");
        output[f.key] = v.map((x) =>
          f.type === "weekdays" ? numeric(x, 6, true) : str(x, 500),
        );
        if (new Set(output[f.key]).size !== v.length) throw Error("duplicate");
        if (f.type === "bodyTypes")
          for (const x of v) {
            if (!bodyTypeKeys.includes(x) || assigned.has(x))
              throw Error("body_type");
            assigned.add(x);
          }
      } else if (f.type === "choice") {
        if (!f.options.some(([k]) => k === v)) throw Error("choice");
        output[f.key] = v;
      } else {
        output[f.key] = str(
          v,
          f.maxLength ??
            (["description", "includes"].includes(f.key) ? 1000 : 250),
        );
        if (f.type === "date" && !validDate(v)) throw Error("date");
        if (f.type === "time" && !/^([01]\d|2[0-3]):[0-5]\d$/.test(v))
          throw Error("time");
      }
    }
    if (key === "promos") {
      output.code = output.code.toUpperCase();
      if (
        !/^[A-Z0-9_-]{1,30}$/.test(output.code) ||
        output.value <= 0 ||
        (output.type === "percentage" && output.value > 100)
      )
        throw Error("discount");
    }
    if (
      key === "plans" &&
      ((output.price_kind === "percent_off" && output.price > 100) ||
        (output.cadence_unit !== "once" && !output.cadence_count))
    )
      throw Error("plan");
    if (key === "price_rules") {
      if (!output.amount || (output.is_percent && output.amount > 100))
        throw Error("amount");
      if (
        output.kind === "lead_time"
          ? !output.within_hours ||
            output.weekdays ||
            output.start_time ||
            output.end_time
          : output.within_hours ||
            (!output.weekdays && !output.start_time) ||
            !!output.start_time !== !!output.end_time ||
            (output.start_time && output.start_time >= output.end_time)
      )
        throw Error("rule");
    }
    if (key === "size_prices" && output.price == null && output.minutes == null)
      throw Error("size_price");
    if (
      ["days_off", "service_periods"].includes(key) &&
      output.start_date > output.end_date
    )
      throw Error("dates");
    if (
      key === "days_off" &&
      (!!output.start_time !== !!output.end_time ||
        (output.start_time && output.start_time >= output.end_time))
    )
      throw Error("time");
    if (key === "special_hours" && output.open >= output.close)
      throw Error("time");
    if (key === "templates" && !validTemplate(output.body))
      throw Error("message");
    if (
      key === "plans" &&
      output.cadence_unit === "once" &&
      (output.visits !== 1 || output.cadence_count != null)
    )
      throw Error("plan");
    const id = (
      output.label ??
      output.code ??
      output.size ??
      output.kind ??
      output.date ??
      (output.start_date
        ? [
            output.start_date,
            output.end_date,
            output.start_time,
            output.mode,
          ].join("/")
        : output.name)
    ).toLowerCase();
    if (seen.has(id)) throw Error("duplicate");
    seen.add(id);
    return output;
  });
}
export function publicUrl(value) {
  try {
    const u = new URL(value);
    if (
      u.protocol !== "https:" ||
      u.username ||
      u.password ||
      u.port ||
      !/^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}$/i.test(u.hostname) ||
      /\.(?:local|internal|localhost|invalid)$/i.test(u.hostname)
    )
      return null;
    u.hash = "";
    // A query can identify the shop's actual review or menu page.
    return u.href;
  } catch {
    return null;
  }
}
function numeric(v, max, integer, min = 0) {
  if (!["number", "string"].includes(typeof v) || String(v).trim() === "")
    throw Error("amount");
  const n = Number(v);
  if (
    !Number.isFinite(n) ||
    n < min ||
    n > max ||
    (integer && !Number.isInteger(n))
  )
    throw Error("amount");
  return n;
}
function str(v, max) {
  if (typeof v !== "string" || !v.trim() || v.trim().length > max)
    throw Error("text");
  return v.trim();
}
export function normalize(key, value) {
  const f = fields[key];
  if (!f || !Object.hasOwn(fields, key)) throw Error("field");
  if (f.type === "tasks") {
    if (
      !Array.isArray(value) ||
      value.some((k) => !f.options.some(([opt]) => opt === k))
    )
      throw Error("tasks");
    return [...new Set(value)];
  }
  if (f.type === "rows") return canonicalRows(key, value);
  if (key === "hours" || key === "faqs") {
    if (!Array.isArray(value) || value.length > (key === "hours" ? 7 : 100))
      throw Error("rows");
    const seen = new Set();
    return value.map((row) => {
      const id =
        key === "hours"
          ? numeric(row.weekday, 6, true)
          : str(row.q, 200).toLowerCase();
      if (seen.has(id)) throw Error("duplicate");
      seen.add(id);
      if (key === "faqs") return { q: str(row.q, 200), a: str(row.a, 2000) };
      if (typeof row.closed !== "boolean") throw Error("day");
      if (row.closed) return { weekday: id, closed: true };
      if (
        ![row.open, row.close].every((time) =>
          /^([01]\d|2[0-3]):[0-5]\d$/.test(time),
        ) ||
        row.open >= row.close
      )
        throw Error("hours");
      return { weekday: id, closed: false, open: row.open, close: row.close };
    });
  }
  if (["integer", "positive", "money"].includes(f.type))
    return numeric(
      value,
      f.max ?? (f.type === "money" ? 100000 : 525600),
      f.type !== "money",
      f.min ?? (f.type === "positive" ? 1 : 0),
    );
  const v = str(value, f.type === "long" ? 4000 : 500);
  if (f.type === "date" && !validDate(v)) throw Error("date");
  if (key === "on_my_way" && (!validTemplate(v) || v.length > 500))
    throw Error("message");
  if (f.type === "url") {
    const url = publicUrl(v);
    if (!url) throw Error("url");
    return url;
  }
  if (f.type === "choice" && !f.options.some(([k]) => k === v))
    throw Error("choice");
  if (f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
    throw Error("email");
  if (f.type === "color" && !/^#[a-f0-9]{6}$/i.test(v)) throw Error("color");
  if (f.type === "timezone") new Intl.DateTimeFormat("en", { timeZone: v });
  return v;
}
export function cleanAnswers(answers) {
  if (!answers || Array.isArray(answers) || typeof answers !== "object")
    throw Error("answers");
  const out = {};
  for (const [key, value] of Object.entries(answers)) {
    if (
      value == null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0)
    )
      continue;
    try {
      out[key] = normalize(key, value);
    } catch (cause) {
      throw Error(key, { cause });
    }
  }
  if (out.size_mode === "flat" && out.vehicle_sizes?.some((s) => s.fee > 0))
    throw Error("size_mode");
  if (
    (out.size_mode === "service" && out.vehicle_sizes?.[0]?.fee > 0) ||
    out.vehicle_sizes?.[0]?.extra_minutes > 0
  )
    throw Error("vehicle_sizes");
  if (out.size_mode === "flat" || out.size_mode === "purchase") {
    if (out.services?.some((s) => s.size_prices?.some((p) => p.price != null)))
      throw Error("size_mode");
  }
  return out;
}
