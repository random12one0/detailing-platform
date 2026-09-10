// ROADMAP 8.17 STAGE 2A — SPANISH FOR THE CUSTOMER'S EMAILS.
//
// **THE ENGLISH IS THE KEY.** `_shared/i18n.ts` has why; the short version is
// that a string nobody translated renders correct English rather than a debug
// identifier, so the worst case is an email in two languages rather than an
// email that looks broken. That matters more here than anywhere else in the
// product: nobody who can approve this can read the output, and **an email
// cannot be corrected after it is sent.**
//
// ---------------------------------------------------------------------------
// WHAT IS IN HERE AND WHAT IS DELIBERATELY NOT
// ---------------------------------------------------------------------------
// **THE CUSTOMER'S EMAILS, AND ONLY THOSE.** The confirmation, the accepted or
// declined request, the quote, the reminder, the receipt or invoice, the
// cancellation, the reschedule, the thank-you, the plan link and the
// maintenance nudge. That is the same journey stages 1 and 1b translated, one
// medium later.
//
// **NOT THE DETAILER'S.** The owner's booking alert, the stale-request nudge,
// the staff invite, the plan-ended notice and the platform's own billing mail
// all go to somebody who runs a business on this product, and their language
// is the DASHBOARD's question — stage 2b. Translating half of that audience
// would give a Spanish-speaking detailer an English dashboard and Spanish
// alerts, which is worse than either.
//
// **AND NOT THE DETAILER'S OWN WORDS.** Service names, plan names,
// descriptions, their message templates, the campaign body they typed and the
// note they attach to an email all pass through untouched. They are not ours
// to translate, and a machine translation of a business's own name for its
// work is the single most embarrassing thing this feature could do.
//
// ---------------------------------------------------------------------------
// THE SAME THREE DECISIONS AS THE PAGE CATALOGUE, KEPT ON PURPOSE
// ---------------------------------------------------------------------------
// **1 · `tú`, NEVER `usted`.** A local business talking to somebody about
// their own car is not a bank. `app/src/lib/strings/es.js` chose it and an
// email that switches register from the page the customer just used reads as
// two different companies.
//
// **2 · UNITED STATES SPANISH** — `vehículo`/`carro`, not `coche`. `es-US`
// formatting keeps `$1,234.50`, the 12-hour clock and month-before-day.
//
// **3 · AN INTERPOLATED SENTENCE IS ONE KEY.** English glues `"on " + date`;
// Spanish puts that preposition somewhere else. Every `{placeholder}` sentence
// is a single entry, and `tests/spanish.test.mjs` fails if a translation drops
// one — a lost `{amount}` is a price that disappears from an invoice.

export const es: Record<string, string> = {
  // ── The furniture every email shares ───────────────────────────────────
  "Where": "Dónde",
  "We come to you": "Vamos a ti",
  "Drop-off": "Lo dejas tú",
  "Yes": "Sí",
  "At our unit": "En nuestro local",
  "Vehicle": "Vehículo",
  "Vehicles ({count})": "Vehículos ({count})",
  "Service": "Servicio",
  "Mobile": "A domicilio",
  "How to pay": "Cómo pagar",
  // The two payment rows this product writes. Venmo, Cash App, PayPal and
  // Zelle are brand names and are deliberately absent, so they pass through.
  "Other": "Otro",
  "Cash": "Efectivo",
  "On the day": "El día del servicio",
  "Nothing to pay now — this is for when the work is done.":
    "No hay nada que pagar ahora — esto es para cuando el trabajo esté hecho.",
  "For when the work is done.": "Para cuando el trabajo esté hecho.",
  "Keep this email — the link above is how you change or cancel without ringing anyone. To book again any time: {url}":
    "Guarda este correo — el enlace de arriba es como cambias o cancelas sin llamar a nadie. Para reservar otra vez cuando quieras: {url}",
  // `reconcile`'s two labels: the line it draws when an itemised column does
  // not reach its own total.
  "Discount applied": "Descuento aplicado",
  "Adjustment": "Ajuste",
  "Travel": "Traslado",
  "Travel — {zone}": "Traslado — {zone}",
  "{percent}% sale": "{percent}% de oferta",
  "Sale": "Oferta",
  "Promo {code}": "Promoción {code}",
  "{name} (add-on)": "{name} (extra)",
  // The footer. `Automated message` is what an email says when nobody is
  // waiting for a reply on it.
  "Automated message": "Mensaje automático",
  "You booked with us before": "Ya reservaste con nosotros antes",
  "{prefix} — reply to reach us.": "{prefix} — responde para comunicarte con nosotros.",
  "{prefix} — call or text {phone} to reach a person.":
    "{prefix} — llama o manda un mensaje al {phone} para hablar con una persona.",
  "Stop getting emails like this": "Dejar de recibir correos como este",

  // ── 1 · The confirmation, and the request that is not one yet ──────────
  "Booking confirmed": "Reserva confirmada",
  "Request received": "Solicitud recibida",
  "You're all set": "Todo listo",
  "We're holding your time": "Te estamos guardando el horario",
  "Thanks, {first}. Here's everything for your appointment.":
    "Gracias, {first}. Aquí está todo sobre tu cita.",
  "Thanks, {first} — we've got your request and nobody else can take this time while we look at it. You'll hear from us shortly.":
    "Gracias, {first} — ya tenemos tu solicitud y nadie más puede tomar este horario mientras la revisamos. Te avisamos pronto.",
  "What we're doing": "Lo que vamos a hacer",
  "Estimated total": "Total estimado",
  "An estimate. If the vehicle's condition needs more time than expected we'll tell you before we start, never after.":
    "Es un estimado. Si el estado del vehículo necesita más tiempo del esperado te avisamos antes de empezar, nunca después.",
  "View your booking": "Ver tu reserva",
  "View or change your request": "Ver o cambiar tu solicitud",
  "Nothing is charged now. We'll email you the moment we've accepted.":
    "No se cobra nada ahora. Te escribimos en cuanto la aceptemos.",
  "Your notes": "Tus notas",
  "Booking confirmed — {date}": "Reserva confirmada — {date}",
  "Request received — {date}": "Solicitud recibida — {date}",
  "We're holding your time while we look at it.":
    "Te estamos guardando el horario mientras la revisamos.",
  "{date} at {time}.": "{date} a las {time}.",

  // ── 3 · The answer to a request ────────────────────────────────────────
  "Quote": "Presupuesto",
  "Here's your price": "Este es tu precio",
  "We've had a look at what you asked for on {when}, and here's what we can do it for.":
    "Ya vimos lo que pediste para el {when}, y esto es lo que te podemos cobrar.",
  "Our price for this job": "Nuestro precio por este trabajo",
  "We're still holding {date} at {time} for you.":
    "Te seguimos guardando el {date} a las {time}.",
  "Nothing is charged until you say yes.": "No se cobra nada hasta que digas que sí.",
  "See it and say yes": "Verlo y aceptar",
  "Request accepted": "Solicitud aceptada",
  "You're booked in": "Ya quedaste apartado",
  "Good news — we've accepted your request for {when}. It's in the diary.":
    "Buenas noticias — aceptamos tu solicitud para el {when}. Ya está en la agenda.",
  "View or change your booking": "Ver o cambiar tu reserva",
  "Request declined": "Solicitud rechazada",
  "We can't make that one": "Ese horario no lo podemos tomar",
  "We're sorry — we can't take {when}, so we've let that time go.":
    "Lo sentimos — no podemos tomar el {when}, así que liberamos ese horario.",
  "If another day works, we'd still love to see you — {link}.":
    "Si te sirve otro día, nos encantaría atenderte — {link}.",
  "You're booked in — {date}": "Ya quedaste apartado — {date}",
  "About your request for {date}": "Sobre tu solicitud para el {date}",
  "Your price: {amount} for {date}": "Tu precio: {amount} para el {date}",

  // ── 4 · The receipt, and the invoice that is not one ───────────────────
  "Receipt": "Recibo",
  "Invoice": "Factura",
  "Paid in full": "Pagado por completo",
  "Amount due": "Monto a pagar",
  "Thanks, {first} — here's your receipt for the work on {date}.":
    "Gracias, {first} — aquí está tu recibo por el trabajo del {date}.",
  "Hi {first}, here's the invoice for the work on {date}.":
    "Hola {first}, aquí está la factura por el trabajo del {date}.",
  "Reference": "Referencia",
  "The work": "El trabajo",
  "What you paid": "Lo que pagaste",
  "What is due": "Lo que se debe",
  "Total paid": "Total pagado",
  "Notes": "Notas",
  // ROADMAP 2.20 STAGE 3 — the same button, relabelled on an unpaid
  // invoice from a business that takes cards. It goes to the booking page,
  // where the card button lives; an email cannot create a payment.
  "Pay {amount} by card": "Pagar {amount} con tarjeta",
  "View this online": "Verlo en línea",
  "Keep this for your records. Reply to this email if anything looks wrong.":
    "Guárdalo para tus registros. Responde a este correo si algo no cuadra.",
  "Receipt — {amount} — {brand}": "Recibo — {amount} — {brand}",
  "Invoice — {amount} due — {brand}": "Factura — {amount} a pagar — {brand}",
  "Paid in full — {amount}.": "Pagado por completo — {amount}.",
  "{amount} due.": "{amount} a pagar.",

  // ── 5 · The thank-you ──────────────────────────────────────────────────
  "Thank you": "Gracias",
  "Thanks for trusting us with it": "Gracias por confiarnos tu vehículo",
  "Hello {first}, thank you for choosing {brand}. We appreciate the opportunity to take care of your vehicle.":
    "Hola {first}, gracias por elegir a {brand}. Agradecemos la oportunidad de cuidar tu vehículo.",
  "If you were happy with the work, a quick review genuinely helps us.":
    "Si quedaste contento con el trabajo, una reseña rápida nos ayuda de verdad.",
  "Leave a Google review": "Dejar una reseña en Google",
  "Leave a Yelp review": "Dejar una reseña en Yelp",
  "It takes about a minute, and it is the single biggest thing that helps a small business like ours.":
    "Toma como un minuto, y es lo que más ayuda a un negocio pequeño como el nuestro.",
  "Thank you for choosing {brand}": "Gracias por elegir a {brand}",
  "Thank you from {brand}": "Gracias de parte de {brand}",

  // ── 6 · The reminder ───────────────────────────────────────────────────
  "Reminder": "Recordatorio",
  "See you soon": "Nos vemos pronto",
  "Hi {first}, a quick reminder about your appointment with {brand}.":
    "Hola {first}, un recordatorio rápido sobre tu cita con {brand}.",
  "Reminder: your appointment {date}": "Recordatorio: tu cita el {date}",
  "Reminder: {date} at {time}": "Recordatorio: {date} a las {time}",

  // ── 7 · Cancelled ──────────────────────────────────────────────────────
  "Cancelled": "Cancelada",
  "Your booking is cancelled": "Tu reserva quedó cancelada",
  "Hi {first}, your booking with {brand} for {date} at {time} has been cancelled.":
    "Hola {first}, tu reserva con {brand} para el {date} a las {time} quedó cancelada.",
  "We'd love to see you another time — you can book again at {link}.":
    "Nos encantaría atenderte en otra ocasión — puedes reservar otra vez en {link}.",
  "Your booking has been cancelled": "Tu reserva fue cancelada",
  "Cancelled: {date}": "Cancelada: {date}",

  // ── 8 · Moved ──────────────────────────────────────────────────────────
  "Rescheduled": "Reprogramada",
  "Your booking has moved": "Tu reserva cambió de horario",
  "Hi {first}, your booking with {brand} has been moved.":
    "Hola {first}, tu reserva con {brand} cambió de horario.",
  "Your booking has been rescheduled": "Tu reserva fue reprogramada",
  "Rescheduled to {date}": "Reprogramada para el {date}",

  // ── 11 · The plan link ─────────────────────────────────────────────────
  "Your plan": "Tu plan",
  "Here's your link": "Aquí está tu enlace",
  "Hi {first} — you're on {plan} with {brand}.":
    "Hola {first} — estás en {plan} con {brand}.",
  "The button below opens your plan: what you're on, when your next visit is due, and how to book it.":
    "El botón de abajo abre tu plan: en cuál estás, cuándo toca tu próxima visita y cómo reservarla.",
  "Open your plan": "Abrir mi plan",
  "Keep this email — that link is the only way back to your plan. To book any time: {url}":
    "Guarda este correo — ese enlace es la única forma de volver a tu plan. Para reservar cuando quieras: {url}",
  "Your plan with {brand}": "Tu plan con {brand}",
  "{plan} — your link is inside.": "{plan} — tu enlace va adentro.",

  // ── 13 · The one the detailer types themselves ─────────────────────────
  // ONLY THE CHROME. The subject, the headline and the body are the
  // detailer's own words, in whatever language they wrote them.
  "Checking in": "Saludos",
  "Hello {first},": "Hola {first},",
  "Book again": "Reservar otra vez",

  // ── 15 · The maintenance deadline ──────────────────────────────────────
  "Maintenance due": "Mantenimiento pendiente",
  "Tomorrow is the last day": "Mañana es el último día",
  "{days} days left": "Quedan {days} días",
  "Due {date}": "Vence el {date}",
  "{label} on your {vehicle}": "{label} de tu {vehicle}",
  "Hi {first} — your {what} is due by {date}.":
    "Hola {first} — tu {what} vence el {date}.",
  "Book it below and we'll take care of it.":
    "Resérvalo abajo y nosotros nos encargamos.",
  "Book it in": "Reservarlo",
  "If you have already had this done elsewhere, let us know and we will mark it off.":
    "Si ya te lo hicieron en otro lado, avísanos y lo marcamos como hecho.",
  "Last day: {label}": "Último día: {label}",
  "{label} is due {date}": "{label} vence el {date}",
  "{lead} to book your {label}.": "{lead} para reservar tu {label}.",
};
