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
// ~~**NOT THE DETAILER'S.** The owner's booking alert, the stale-request nudge,
// the staff invite, the plan-ended notice and the platform's own billing mail
// all go to somebody who runs a business on this product, and their language
// is the DASHBOARD's question — stage 2b. Translating half of that audience
// would give a Spanish-speaking detailer an English dashboard and Spanish
// alerts, which is worse than either.~~
// **SUPERSEDED 2026-10-06 (ROADMAP 3.4 FAULT 4, DECISIONS.md):** the detailer's,
// staff's and platform's emails now follow the language THAT PERSON chose for
// the dashboard (`business_users.lang`, read by `recipientLang`), English when
// unknown — which is exactly the "worse than either" case avoided: the email
// follows the dashboard, never the customer's booking. Their section is at the
// end of this file, worded like the DASHBOARD (`app/src/lib/strings/appEs.js`:
// "cita", "panel") rather than like the customer emails, except where a key is
// shared with them ("Rescheduled" is "Reprogramada" in both).
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
  // ROADMAP 3.4d — the three size names every business starts with. The same
  // words the booking page uses (app/src/lib/strings/es.js), so the page and
  // the email name a car the same way. A size the detailer renamed is theirs.
  "Small": "Pequeño",
  "Medium": "Mediano",
  "Large": "Grande",
  "Service": "Servicio",
  "Mobile": "A domicilio",
  "How to pay": "Cómo pagar",
  // The two payment rows this product writes. Venmo, Cash App, PayPal and
  // Zelle are brand names and are deliberately absent, so they pass through.
  "Other": "Otro",
  "Cash": "Efectivo",
  "On the day": "El día del servicio",
  "Nothing to pay now. This is for when the work is done.":
    "No hay nada que pagar ahora. Esto es para cuando el trabajo esté hecho.",
  "For when the work is done.": "Para cuando el trabajo esté hecho.",
  "Need to change or cancel? Use the button above. No call needed.":
    "¿Necesitas cambiar o cancelar? Usa el botón de arriba. No hace falta llamar.",
  // `reconcile`'s two labels: the line it draws when an itemised column does
  // not reach its own total.
  "Discount applied": "Descuento aplicado",
  "Adjustment": "Ajuste",
  "Travel": "Traslado",
  "Travel · {zone}": "Traslado · {zone}",
  "{percent}% sale": "{percent}% de oferta",
  // ROADMAP 3.4 — the extra-car and plan lines in a Spanish email, spelled from
  // the line's `parts` (pricing.ts, 2.1c). Same words as the booking page's
  // app/src/lib/strings/es.js, so the page and the email agree.
  "{ord} vehicle": "{ord} vehículo",
  "plan rate": "precio del plan",
  "included": "incluido",
  "{percent}% off": "{percent}% de descuento",
  "Sale": "Oferta",
  "Promo {code}": "Promoción {code}",
  "{name} (add-on)": "{name} (extra)",
  // The footer. `Automated message` is what an email says when nobody is
  // waiting for a reply on it.
  "Automated message": "Mensaje automático",
  "You booked with us before": "Ya reservaste con nosotros antes",
  "{prefix} · reply to reach us.": "{prefix} · responde para comunicarte con nosotros.",
  "{prefix} · call or text {phone} to reach a person.":
    "{prefix} · llama o manda un mensaje al {phone} para hablar con una persona.",
  "Stop getting emails like this": "Dejar de recibir correos como este",

  // ── 1 · The confirmation, and the request that is not one yet ──────────
  "Booking confirmed": "Reserva confirmada",
  "Request received": "Solicitud recibida",
  "You're all set": "Todo listo",
  "We're holding this time for you":
    "Te estamos guardando este horario",
  "Thanks, {first}. Here's everything for {day}.":
    "Gracias, {first}. Aquí está todo para {day}.",
  "Thanks, {first}. We're checking the schedule and will get back to you soon. Nothing is charged yet.":
    "Gracias, {first}. Estamos revisando la agenda y te respondemos pronto. Todavía no se cobra nada.",
  "What we're doing": "Lo que vamos a hacer",
  "Estimated total": "Total estimado",
  "An estimate. If the vehicle's condition needs more time than expected we'll tell you before we start, never after.":
    "Es un estimado. Si el estado del vehículo necesita más tiempo del esperado te avisamos antes de empezar, nunca después.",
  "View your booking": "Ver tu reserva",
  "View or change your request": "Ver o cambiar tu solicitud",
  "Nothing is charged now. We'll email you the moment we've accepted.":
    "No se cobra nada ahora. Te escribimos en cuanto la aceptemos.",
  "Your notes": "Tus notas",
  "You're booked for {when}":
    "Tu cita quedó reservada para {when}",
  "Got your request for {when}":
    "Recibimos tu solicitud para {when}",
  "We're holding your time while we look at it.":
    "Te estamos guardando el horario mientras la revisamos.",
  "{date} at {time}.": "{date} a las {time}.",
  // ROADMAP 3.4 finding 3. The joint between a date and a time, WITHOUT the
  // full stop, because it is interpolated into the middle of four sentences
  // rather than ending one: the three request-decision emails build their
  // `when` from it, and the reschedule strikes the old time through with it.
  // Until 2026-09-20 that joint was the literal English word `at`, sitting
  // outside the lookup in a template literal, so the sentence around it
  // translated and the two words in the middle did not.
  "{date} at {time}": "{date} a las {time}",
  // ROADMAP 3.4 FAULT 1. The reschedule email's struck-through OLD time. Its
  // own key, not a prefix on the line above: that one is shared with the quote.
  "Was {date} at {time}": "Antes: {date} a las {time}",

  // ── 3 · The answer to a request ────────────────────────────────────────
  "Quote": "Presupuesto",
  "Here's your price": "Este es tu precio",
  "We've had a look at what you asked for on {when}, and here's what we can do it for.":
    "Ya vimos lo que pediste para el {when}, y esto es lo que te podemos cobrar.",
  "Our price for this job": "Nuestro precio por este trabajo",
  "We're still holding {date} at {time} for you.":
    "Te seguimos guardando el {date} a las {time}.",
  "Nothing is charged until you say yes.": "No se cobra nada hasta que digas que sí.",
  "Look it over":
    "Revisarlo",
  "Request accepted": "Solicitud aceptada",
  "You're confirmed":
    "Tu cita está confirmada",
  "Good news. We've accepted your request for {when}. It's on the calendar.":
    "Buenas noticias. Aceptamos tu solicitud para el {when}. Ya está en la agenda.",
  "View or change your booking": "Ver o cambiar tu reserva",
  "Request declined": "Solicitud rechazada",
  "We can't make that one": "Ese horario no lo podemos tomar",
  "Sorry, we can't make {when} work.":
    "Lo sentimos, no podemos atenderte {when}.",
  "Pick another time":
    "Elegir otro horario",
  "Confirmed: {when}":
    "Confirmada: {when}",
  "About your request for {day}":
    "Sobre tu solicitud para {day}",
  "Your price is ready: {amount}":
    "Tu precio está listo: {amount}",

  // ── 4 · The receipt, and the invoice that is not one ───────────────────
  "Receipt": "Recibo",
  "Invoice": "Factura",
  "Paid in full, thank you": "Pagado por completo, gracias",
  "Here's your invoice": "Aquí está tu factura",
  "Amount due": "Monto a pagar",
  "Thanks, {first}. Here's your receipt for {date}.":
    "Gracias, {first}. Aquí está tu recibo del {date}.",
  "Hi {first}, here's the bill for {date}.":
    "Hola {first}, aquí está la cuenta del {date}.",
  "Reference": "Referencia",
  "The work": "El trabajo",
  "What you paid": "Lo que pagaste",
  // ROADMAP 3.4, findings 4 and 5 — THE MONEY COLUMN'S OWN LABELS.
  //
  // These eight are written by `send-invoice/index.ts`, not by a detailer, and
  // they are prefixed onto the line items on every invoice and every receipt.
  // Until 2026-09-20 they were English on a Spanish invoice, which put
  // `Booking total` on the largest line of a document whose whole job is to be
  // checked against a card statement, and made every other line read
  // `Add-on: Limpieza de motor`.
  //
  // **`Service` is already above, at its own entry, and is NOT repeated here**
  // — one key, one translation, and a second copy is how two spellings of one
  // word start disagreeing. The other seven are new.
  "Booking total": "Total de la reserva",
  "Upgrade": "Mejora",
  "Add-on": "Extra",
  "Custom charge": "Cargo personalizado",
  // The detailer's travel charge. "Traslado" is the word `quoteLines` already
  // uses for the same fee on the confirmation, and the two documents describe
  // the same money — so they must not invent two names for it.
  "Travel / Mobile fee": "Traslado / servicio a domicilio",
  "Tip": "Propina",
  "Discount": "Descuento",
  "What is due": "Lo que se debe",
  "Total paid": "Total pagado",
  "Notes": "Notas",
  // ROADMAP 2.20 STAGE 3 — the same button, relabelled on an unpaid
  // invoice from a business that takes cards. It goes to the booking page,
  // where the card button lives; an email cannot create a payment.
  "Pay {amount} by card": "Pagar {amount} con tarjeta",
  "View online": "Verlo en línea",
  "Keep this for your records. Reply to this email if anything looks wrong.":
    "Guárdalo para tus registros. Responde a este correo si algo no cuadra.",
  "Your receipt from {brand}: {amount}": "Tu recibo de {brand}: {amount}",
  "Invoice from {brand}: {amount} due": "Factura de {brand}: {amount} a pagar",
  "Paid in full · {amount}.": "Pagado por completo · {amount}.",
  "{amount} due.": "{amount} a pagar.",

  // ── 5 · The thank-you ──────────────────────────────────────────────────
  "Thank you": "Gracias",
  "Thanks for trusting us with it": "Gracias por confiarnos tu vehículo",
  "Hi {first}, thanks for choosing {brand}. If you were happy with the work, a quick review really helps a small business like ours.":
    "Hola {first}, gracias por elegir a {brand}. Si quedaste contento con el trabajo, una reseña rápida le ayuda mucho a un negocio pequeño como el nuestro.",
  "Hi {first}, thanks for choosing {brand}. We appreciate the chance to take care of your vehicle.":
    "Hola {first}, gracias por elegir a {brand}. Agradecemos la oportunidad de cuidar tu vehículo.",
  "Leave a Google review": "Dejar una reseña en Google",
  "Leave a Yelp review": "Dejar una reseña en Yelp",
  "Thanks from {brand}": "Gracias de parte de {brand}",
  // ROADMAP 99.2d — the sign-off under every customer email.
  "Thanks again, {name} · {brand} · {site}": "Gracias de nuevo, {name} · {brand} · {site}",
  "Thanks again, {brand} · {site}": "Gracias de nuevo, {brand} · {site}",
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
  // ROADMAP 3.4 FOLLOW-UP — the customer's half of a cancellation now says
  // whether their money is an open question, the same fact the detailer's
  // half already got. No figure and no mention of Stripe — see the column
  // comment on `BookingEmailData.refundOwed`.
  "You paid for this booking. {brand} will arrange your refund directly.":
    "Pagaste por esta reserva. {brand} se encargará de tu reembolso directamente.",
  "Call {phone} if you have not heard from them.":
    "Llama al {phone} si no has sabido de ellos.",
  "This one's off the calendar. Whenever you're ready, booking again takes a minute.":
    "Esta cita ya no está en la agenda. Cuando quieras, reservar otra vez toma un minuto.",
  "Your {day} appointment is cancelled":
    "Tu cita para {day} está cancelada",
  "Your appointment {day} is cancelled":
    "Tu cita de {day} está cancelada",
  "Cancelled: {date}": "Cancelada: {date}",

  // ── 8 · Moved ──────────────────────────────────────────────────────────
  "Rescheduled": "Reprogramada",
  "Your booking has moved": "Tu reserva cambió de horario",
  "Your appointment moved. Here's the new time.":
    "Tu cita cambió de horario. Este es el nuevo.",
  "New time: {when}":
    "Nuevo horario: {when}",
  "Rescheduled to {date}": "Reprogramada para el {date}",

  // ── 11 · The plan link ─────────────────────────────────────────────────
  "Your plan": "Tu plan",
  "Here's your link": "Aquí está tu enlace",
  "Hi {first}. You're on {plan} with {brand}.":
    "Hola {first}. Estás en {plan} con {brand}.",
  "The button below opens your plan: what you're on, when your next visit is due, and how to book it.":
    "El botón de abajo abre tu plan: en cuál estás, cuándo toca tu próxima visita y cómo reservarla.",
  "Open your plan": "Abrir mi plan",
  "Keep this email. That link is the only way back to your plan. To book any time: {url}":
    "Guarda este correo. Ese enlace es la única forma de volver a tu plan. Para reservar cuando quieras: {url}",
  "Your plan with {brand}": "Tu plan con {brand}",
  "{plan} · your link is inside.": "{plan} · tu enlace va adentro.",

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
  "Hi {first}. Your {what} is due by {date}.":
    "Hola {first}. Tu {what} vence el {date}.",
  "Want to get on the calendar?": "¿Quieres apartar un horario?",
  "Pick a time": "Elegir un horario",
  "If you have already had this done elsewhere, let us know and we will mark it off.":
    "Si ya te lo hicieron en otro lado, avísanos y lo marcamos como hecho.",
  "Your car's about due, {first}": "{first}, ya casi le toca servicio a tu auto",
  "{lead} to book your {label}.": "{lead} para reservar tu {label}.",

  // ══ THE DETAILER'S, STAFF'S AND PLATFORM'S EMAILS — ROADMAP 3.4 FAULT 4 ══
  // Sent in Spanish only to somebody whose DASHBOARD is Spanish. Worded like
  // the dashboard they chose it in: a booking is a "cita" there, the dashboard
  // is the "panel". Customer names, service names, plan names, a role's label
  // and the customer's notes are other people's words and are never here.
  // ── 2 · New booking / request / the evening-before reminder ────────────
  "Waiting for you to accept": "Esperando a que la aceptes",
  "New booking": "Nueva cita",
  "Phone": "Teléfono",
  "Email": "Correo",
  "Typed by hand. The address lookup found no match for it.":
    "Escrita a mano. La búsqueda de direcciones no la encontró.",
  "Doesn't mention the travel area they picked. Worth a quick check before you drive out.":
    "No menciona la zona de traslado que eligieron. Vale la pena revisarla antes de salir.",
  "Type": "Tipo",
  // Its own key: "Drop-off" above is worded for the customer ("Lo dejas tú").
  "The customer brings it in": "El cliente lo trae",
  "Bring": "Lleva",
  "water and power": "agua y electricidad",
  "water": "agua",
  "power": "electricidad",
  "Customer notes": "Notas del cliente",
  "None.": "Ninguna.",
  "Answer this request": "Responder esta solicitud",
  "Open the job": "Abrir el trabajo",
  "{name} wants {when}": "{name} quiere {when}",
  "New booking: {name}, {when} ({total})": "Nueva cita: {name}, {when} ({total})",
  "{when}: {name}, {street}": "{when}: {name}, {street}",
  "{when}: {name}": "{when}: {name}",
  // ── 7 · A booking cancelled ────────────────────────────────────────────
  "{date} at {time} is cancelled. That time is open again.": "La cita del {date} a las {time} se canceló. Ese horario quedó libre otra vez.",
  "Was worth": "Valía",
  "{name} cancelled {when}": "{name} canceló {when}",
  // `refundInstruction` in `_shared/connect.ts`. Same Spanish as the job
  // screen's (appEs.js), so the email and the dashboard say it one way.
  "what they paid": "lo que pagaron",
  "This was paid. Refund {amount} from your own Stripe. The money went straight into your account, so we cannot send it back for you.":
    "Esto ya estaba pagado. Devuelve {amount} desde tu propio Stripe. El dinero entró directo a tu cuenta, así que nosotros no podemos devolverlo por ti.",
  // ── 8 · A booking moved ────────────────────────────────────────────────
  "{name} moved their booking.": "{name} cambió su cita.",
  "{name} moved to {when}": "{name} cambió su cita a {when}",
  // ── 9 · A request nobody answered ──────────────────────────────────────
  "Still waiting on you": "Todavía te está esperando",
  "asked for {date} at {time}. That was {hours} hour ago, and it is still waiting for an answer.":
    "pidió el {date} a las {time}. Eso fue hace {hours} hora y todavía espera respuesta.",
  "asked for {date} at {time}. That was {hours} hours ago, and it is still waiting for an answer.":
    "pidió el {date} a las {time}. Eso fue hace {hours} horas y todavía espera respuesta.",
  "That time is held until you answer.": "Ese horario queda apartado hasta que respondas.",
  "Asking": "Pide",
  "Still waiting: {first} asked {hours} hour ago": "Todavía esperando: {first} pidió hace {hours} hora",
  "Still waiting: {first} asked {hours} hours ago": "Todavía esperando: {first} pidió hace {hours} horas",
  "{name} asked for {date} and has not heard back.":
    "{name} pidió el {date} y todavía no tiene respuesta.",
  // ── 10 · The staff invite ──────────────────────────────────────────────
  "Invitation": "Invitación",
  "You've been added to the team": "Te agregaron al equipo",
  "an owner": "propietario",
  "a staff member": "miembro del equipo",
  "{brand} has invited you to join their booking dashboard as {role}.":
    "{brand} te invitó a su panel de reservas como {role}.",
  "Use the button below to set your password and sign in.":
    "Usa el botón de abajo para crear tu contraseña e iniciar sesión.",
  "Set up your account": "Configurar tu cuenta",
  "This link works until {date}. If the button doesn't work, open: {url}":
    "Este enlace funciona hasta el {date}. Si el botón no funciona, abre: {url}",
  "{inviter} added you to {brand}": "{inviter} te agregó a {brand}",
  "You've been added to {brand}": "Te agregaron a {brand}",
  "{brand} invited you to their dashboard.": "{brand} te invitó a su panel.",
  // ── 12 · Somebody left a plan ──────────────────────────────────────────
  "Plan ended": "Plan terminado",
  "ended their {plan} from their own plan page. Nothing else has changed. Any booking already on your calendar is still there.":
    "terminó su {plan} desde su propia página del plan. Nada más cambió. Cualquier cita que ya esté en la agenda sigue ahí.",
  "Plan": "Plan",
  "Member since": "Miembro desde",
  "Ended": "Terminado",
  "They can join again whenever they like; the record of what they were owed is kept either way.":
    "Puede volver a unirse cuando quiera; el registro de lo que se le debía se guarda de todas formas.",
  "{name} left your {plan}": "{name} dejó tu {plan}",
  "{name} left your {plan} plan": "{name} dejó tu plan {plan}",
  "{name} ended {plan}.": "{name} terminó {plan}.",
  // ── 14 · The platform's own billing ────────────────────────────────────
  "Your site is offline": "Tu sitio está fuera de línea",
  "Payment problem": "Problema con el pago",
  "Your booking page is offline until this is paid":
    "Tu página de reservas está fuera de línea hasta que esto se pague",
  "We couldn't take this month's payment": "No pudimos cobrar el pago de este mes",
  "We tried your card several times over the last two weeks and it did not go through, so {business}'s booking page is no longer accepting new bookings.":
    "Intentamos cobrar tu tarjeta varias veces en las últimas dos semanas y no pasó, así que la página de reservas de {business} ya no acepta reservas nuevas.",
  "The {amount} payment for {business} was declined. We will try the same card again over the next two weeks and email you each time.":
    "El pago de {amount} de {business} fue rechazado. Vamos a intentar con la misma tarjeta otra vez durante las próximas dos semanas y te escribiremos cada vez.",
  "Nothing has been deleted. Your jobs, your customers, your settings and your photos are all exactly where you left them, and the page comes back as soon as this is sorted out.":
    "No se borró nada. Tus trabajos, tus clientes, tu configuración y tus fotos están exactamente donde los dejaste, y la página vuelve en cuanto esto se resuelva.",
  "Nothing is at risk yet, and nothing gets deleted at any point. If it still has not gone through after two weeks, your booking page goes offline until it is paid.":
    "Todavía no hay nada en riesgo, y nunca se borra nada. Si después de dos semanas todavía no pasa, tu página de reservas queda fuera de línea hasta que se pague.",
  "Your bank said: {reason}": "Tu banco dijo: {reason}",
  // `declineText` — Stripe's common decline codes, in our words.
  "The card did not have enough funds.": "La tarjeta no tenía fondos suficientes.",
  "The card has expired.": "La tarjeta está vencida.",
  "The card's security code did not match.": "El código de seguridad de la tarjeta no coincidió.",
  "The card number is not valid.": "El número de la tarjeta no es válido.",
  "The card has reached its limit.": "La tarjeta llegó a su límite.",
  "There was a problem processing the card. It may work on the next try.":
    "Hubo un problema al procesar la tarjeta. Puede que funcione en el próximo intento.",
  "The bank needs you to approve this payment.": "El banco necesita que apruebes este pago.",
  "The card was declined. Your bank can tell you why.":
    "La tarjeta fue rechazada. Tu banco te puede decir por qué.",
  "Put your page back online": "Volver a poner tu página en línea",
  "Update your card": "Actualizar tu tarjeta",
  "Customers who have already booked can still see, change and cancel their appointments. Only new bookings have stopped.":
    "Los clientes que ya reservaron todavía pueden ver, cambiar y cancelar sus citas. Solo se detuvieron las reservas nuevas.",
  "{business}'s booking page is offline": "La página de reservas de {business} está fuera de línea",
  "Your card didn't go through": "Tu tarjeta no pasó",
  "Nothing has been deleted. Open your billing page to bring it back.":
    "No se borró nada. Abre tu página de facturación para recuperarla.",
  "We'll try again over the next two weeks.": "Lo volveremos a intentar durante las próximas dos semanas.",
  // ── 15b · The platform telling a detailer their build has started (0.4) ─
  "Your website": "Tu sitio web",
  "We have started building your website": "Empezamos a construir tu sitio web",
  "Work on {business}'s website began today, {date}. There is nothing for you to do — we will email you again when there is something to look at.":
    "El trabajo en el sitio web de {business} empezó hoy, {date}. No tienes que hacer nada: te escribiremos otra vez cuando haya algo que ver.",
  "Nothing for you to do — we will email you again when there is something to look at.":
    "No tienes que hacer nada: te escribiremos otra vez cuando haya algo que ver.",
  "From today the {amount} fee to build your site is no longer refundable. That is the only thing that changes.":
    "A partir de hoy, la tarifa de {amount} para construir tu sitio ya no es reembolsable. Eso es lo único que cambia.",
  "Your subscription is untouched: the same price, the same renewal date, and the same one button to cancel in your own account whenever you want.":
    "Tu suscripción no cambia: el mismo precio, la misma fecha de renovación y el mismo botón para cancelar en tu cuenta cuando quieras.",
  "Work started": "El trabajo empezó",
  "Build fee": "Tarifa de construcción",
  "See it on your billing page": "Verlo en tu página de facturación",
  "We've started building your site": "Empezamos a construir tu sitio",
  "The build fee is no longer refundable from today. Nothing else changes.":
    "La tarifa de construcción ya no es reembolsable a partir de hoy. Nada más cambia.",
  // ── 16 · The platform telling its owner somebody signed up ─────────────
  "New detailer": "Nuevo detallador",
  "{business} just signed up": "{business} se acaba de registrar",
  "Somebody created an account and a business. Nothing has been paid yet. You will get a second email when they subscribe.":
    "Alguien creó una cuenta y un negocio. Todavía no se ha pagado nada. Te llegará un segundo correo cuando se suscriban.",
  "Business": "Negocio",
  "Booking page": "Página de reservas",
  "Signed up by": "Registrado por",
  "Open the back office": "Abrir la administración",
};
