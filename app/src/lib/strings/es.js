// ROADMAP 8.17 — SPANISH, for the customer-facing booking surface.
//
// **THE ENGLISH IS THE KEY.** See `lib/i18n.js` for why: a string nobody has
// translated renders correct English rather than a debug identifier, so the
// worst case is a page in two languages instead of a page that looks broken.
//
// ---------------------------------------------------------------------------
// THREE DECISIONS THAT HAD TO BE MADE ONCE AND KEPT.
// ---------------------------------------------------------------------------
// **1 · `tú`, NEVER `usted`.** A small local business talking to somebody
// about their own car is not a bank. Which one is chosen matters less than
// choosing once: a form that switches between them mid-flow reads as two
// people wrote it, and that is the exact impression this whole item exists to
// avoid.
//
// **2 · UNITED STATES SPANISH.** `tomacorriente` rather than `enchufe`,
// `vehículo`/`carro` rather than `coche`. The audience is Spanish speakers in
// the US; `lib/i18n.js` formats numbers and dates as `es-US` for the same
// reason, which keeps `$1,234.50` and the 12-hour clock.
//
// **3 · A PLACEHOLDER IS A WHOLE SENTENCE'S WORTH OF FREEDOM.** English glues
// `"…your home or work" + " in " + area`; Spanish puts that preposition
// somewhere else. Every interpolated sentence is therefore ONE key with a
// `{placeholder}` in it, and `tests/spanish.test.mjs` fails if a translation
// drops one — a lost `{phone}` is a number that disappears from a sentence.
//
// ---------------------------------------------------------------------------
// WHAT IS DELIBERATELY NOT IN HERE, AND HE SHOULD KNOW IT.
// ---------------------------------------------------------------------------
// **THE DETAILER'S OWN WORDS.** Service names, descriptions, add-ons, travel
// area names, vehicle-size labels they renamed, their business name and
// anything they typed into a message template stay exactly as they wrote them,
// because nothing here can translate what it has never seen. So a Spanish
// customer meets a Spanish FORM around an English MENU.
//
// That is the honest limit of this item and it is still worth having: the
// confusing part of a booking form is never the noun you are choosing between,
// it is knowing what step you are on and what goes in the box.
//
// **AND FOUR KEYS BELOW ARE INVISIBLE TO THE CHECK.** `VEHICLE_CONDITIONS`
// lives in `book/core.js`, which may not import anything, so the render site
// calls `t(label)` — a variable, which no extractor can follow.
// `tests/spanish.test.mjs` says so out loud rather than letting a reader
// believe every key here is discovered.

export const es = {
  // ── The four `t(label)` keys the extractor cannot see ───────────────────
  "Light": "Ligera",
  "Moderate": "Moderada",
  "Heavy": "Fuerte",
  "Extreme": "Extrema",

  // ── The flow: headings, the rail, the price bar, the buttons ────────────
  "Step {n} of {total}": "Paso {n} de {total}",
  "What can we do for you?": "¿Qué podemos hacer por ti?",
  "Anything to add?": "¿Quieres agregar algo?",
  "Tell us about the vehicle": "Cuéntanos del vehículo",
  "Where should we do it?": "¿Dónde lo hacemos?",
  "Where are you?": "¿Dónde estás?",
  "Drop-off details": "Datos de la entrega",
  "Pick a time": "Elige una hora",
  "How do we reach you?": "¿Cómo te contactamos?",
  "Check everything over": "Revisa todo",
  "Let’s set up your {plan}": "Vamos a configurar tu {plan}",
  "Welcome back, {name}": "Qué gusto verte de nuevo, {name}",
  "Continue": "Continuar",
  "Back a step": "Un paso atrás",
  "Estimated total": "Total estimado",
  "{plan} applied": "{plan} aplicado",
  "Working out your price…": "Calculando tu precio…",
  "Choose a service to start": "Elige un servicio para empezar",
  "Sending…": "Enviando…",
  "Request this time": "Solicitar esta hora",
  "Booking…": "Reservando…",
  "Confirm booking": "Confirmar la reserva",
  "See the plan": "Ver el plan",
  // The step-1 door became a filled chip carrying the cheapest price
  // (2026-09-11). "Plan"/"Plans" is the chip's own word; the price is
  // built by `priceParts`, which already speaks both languages.
  // NO "Plan" ENTRY: the word is identical in Spanish, and the catalogue check
  // cannot tell a cognate from a lazy copy — so an entry that says nothing is an
  // entry that fails the check for being right. `t()` returns an unknown string
  // unchanged, which gives "Plan" either way.
  "from {price}": "desde {price}",
  "Plan from {price}": "Plan desde {price}",
  "Plans from {price}": "Planes desde {price}",
  // The plans page: one per row, and the words that say the row acts.
  "Choose this": "Elegir este",
  "See the plans": "Ver los planes",

  // ── Step: services ─────────────────────────────────────────────────────
  "Choose one or more. You can add extras next.":
    "Elige uno o más. Después puedes agregar extras.",
  "complete on its own": "completo por sí solo",
  "choose one": "elige uno",
  "from": "desde",
  "about {time}": "unos {time}",
  "What's included in {service}": "Qué incluye {service}",
  "{business} hasn’t listed any services online yet.":
    "{business} todavía no tiene servicios publicados en línea.",
  "Please call {phone} to book.": "Llama al {phone} para reservar.",

  // ── Step: extras ───────────────────────────────────────────────────────
  "Optional. Skip it if you don’t need any.":
    "Opcional. Sáltalo si no necesitas ninguno.",

  // ── Step: the vehicle ──────────────────────────────────────────────────
  "How many vehicles?": "¿Cuántos vehículos?",
  "All on one day?": "¿Todos el mismo día?",
  "Same day": "El mismo día",
  "Different days": "Días distintos",
  "Vehicle {n}": "Vehículo {n}",
  "Vehicle {n} size": "Tamaño del vehículo {n}",
  "Vehicle {n}, what it is": "Vehículo {n}, cuál es",
  "Make and model": "Marca y modelo",
  "Vehicle size": "Tamaño del vehículo",
  "Bigger vehicles take longer, so pricing varies.":
    "Los vehículos más grandes toman más tiempo, así que el precio varía.",
  "Included": "Incluido",
  "One price for every vehicle.": "Un solo precio para cualquier vehículo.",
  "What are you bringing? (optional)": "¿Qué vehículo traes? (opcional)",
  "e.g. 2019 Honda Civic": "por ejemplo, Honda Civic 2019",
  "How dirty is the inside?": "¿Qué tan sucio está por dentro?",
  "It doesn’t change your price — it tells us what to bring.":
    "No cambia tu precio — nos dice qué llevar.",

  // ── Step: mobile or drop-off, and where ────────────────────────────────
  "We come to you": "Vamos a ti",
  "We bring everything to your home or work in {area}.":
    "Llevamos todo a tu casa o trabajo en {area}.",
  "We bring everything to your home or work.": "Llevamos todo a tu casa o trabajo.",
  "Drop it off": "Déjalo con nosotros",
  "Bring your vehicle to {address}.": "Trae tu vehículo a {address}.",
  "Bring your vehicle to us — we’ll confirm the address.":
    "Trae tu vehículo con nosotros — te confirmamos la dirección.",
  "{service} has to be done at our place.": "{service} se hace en nuestro local.",
  "{service} is only done at your address.": "{service} solo se hace en tu dirección.",
  "{business} comes to you — serving {area}.":
    "{business} va a ti — damos servicio en {area}.",
  "{business} comes to you.": "{business} va a ti.",
  "Drop your vehicle at {address}.": "Deja tu vehículo en {address}.",
  "Drop-off only — we’ll confirm the address with you.":
    "Solo entrega en nuestro local — te confirmamos la dirección.",
  "Which area are you in?": "¿En qué zona estás?",
  "Where should we come?": "¿A dónde vamos?",
  "Street address, city": "Calle y número, ciudad",
  "I can provide access to a water tap": "Puedo dar acceso a una llave de agua",
  "Without it we can't do this job at your address.":
    "Sin eso no podemos hacer este trabajo en tu dirección.",
  "I can provide access to a power outlet": "Puedo dar acceso a un tomacorriente",
  "Let us know either way — it just changes what we bring.":
    "Dinos de cualquier forma — solo cambia lo que llevamos.",

  // ── Step: when ─────────────────────────────────────────────────────────
  "Could not load available times.": "No pudimos cargar los horarios disponibles.",
  "Pick a time for each car": "Elige una hora para cada carro",
  "Car {n}": "Carro {n}",
  "Previous month": "Mes anterior",
  "Next month": "Mes siguiente",
  "Times on {date}": "Horarios del {date}",
  "Nothing open that day.": "No hay nada disponible ese día.",
  "No open times this month. Try the next month.":
    "No hay horarios este mes. Prueba el mes siguiente.",
  "No open times this month. Try the next month, or call {phone}.":
    "No hay horarios este mes. Prueba el mes siguiente o llama al {phone}.",
  "{business} is taking drop-offs only that day — go back a step to change how it’s done, or pick another day.":
    "Ese día {business} solo recibe vehículos en su local — regresa un paso para cambiar cómo se hace, o elige otro día.",
  "{business} is coming to customers that day rather than taking drop-offs — go back a step, or pick another day.":
    "Ese día {business} va a donde están los clientes en vez de recibir vehículos — regresa un paso o elige otro día.",

  // ── Step: who we're detailing for ──────────────────────────────────────
  "Your name": "Tu nombre",
  "Phone": "Teléfono",
  "Email": "Correo electrónico",
  "We’ll send your confirmation here, with a link to change or cancel.":
    "Aquí te enviamos la confirmación, con un enlace para cambiar o cancelar.",
  "Anything we should know? (optional)": "¿Algo que debamos saber? (opcional)",
  "Gate codes, pet hair, problem areas…":
    "Códigos de portón, pelo de mascota, zonas con problemas…",

  // ── Step: review, and the receipt ──────────────────────────────────────
  "Your appointments": "Tus citas",
  "When": "Cuándo",
  "We come to you — {address}": "Vamos a ti — {address}",
  "Drop-off": "Entrega en el local",
  "Drop-off — {address}": "Entrega en el local — {address}",
  "Travel": "Traslado",
  "Travel — {zone}": "Traslado — {zone}",
  "{percent}% off": "{percent}% de descuento",
  "Promo {code}": "Código {code}",
  "Rounding": "Redondeo",
  "Some of this is priced from — we’ll confirm once we’ve seen the vehicle, and we’ll ask before doing anything extra.":
    "Parte de esto es un precio desde — lo confirmamos cuando veamos el vehículo, y te preguntamos antes de hacer algo extra.",
  "An estimate. If the vehicle needs more work, we’ll ask before doing anything extra.":
    "Es un estimado. Si el vehículo necesita más trabajo, te preguntamos antes de hacer algo extra.",
  "Promo code": "Código de descuento",
  "Have a code?": "¿Tienes un código?",
  "Checking": "Revisando",
  "Apply": "Aplicar",
  "{code} applied.": "{code} aplicado.",

  // ── After booking ──────────────────────────────────────────────────────
  "Request received": "Solicitud recibida",
  "Booking confirmed": "Reserva confirmada",
  "We’re holding your time": "Te estamos guardando la hora",
  "You’re booked": "Ya está reservado",
  "Nobody else can take it while we look at your request. We’ll email {email} as soon as it’s accepted.":
    "Nadie más puede tomarla mientras revisamos tu solicitud. Te escribimos a {email} en cuanto se acepte.",
  "We’ve emailed your confirmation to {email}.":
    "Te enviamos la confirmación a {email}.",
  "What you asked for": "Lo que pediste",
  "Your appointment": "Tu cita",
  "We’ll come to {address}": "Vamos a {address}",
  "Drop off at {address}": "Entrega en {address}",
  "Drop-off — we’ll confirm the address": "Entrega en el local — te confirmamos la dirección",
  "Add to my calendar": "Agregar a mi calendario",
  "View, change or cancel this request": "Ver, cambiar o cancelar esta solicitud",
  "View, change or cancel this booking": "Ver, cambiar o cancelar esta reserva",
  "Questions? Call": "¿Preguntas? Llama al",

  // ── When something goes wrong ──────────────────────────────────────────
  "Page not found": "Página no encontrada",
  "This booking link doesn’t match a business.":
    "Este enlace de reserva no corresponde a ningún negocio.",
  "Something went wrong": "Algo salió mal",
  "Please refresh and try again.": "Recarga la página e inténtalo de nuevo.",
  "We couldn't work out a price for that selection.":
    "No pudimos calcular un precio para esa selección.",
  "We couldn't work out a price just now.":
    "No pudimos calcular el precio en este momento.",
  "That code isn't valid.": "Ese código no es válido.",
  "We couldn't confirm the price. Please go back a step and try again.":
    "No pudimos confirmar el precio. Regresa un paso e inténtalo de nuevo.",
  "We couldn't complete that booking.": "No pudimos completar esa reserva.",

  // ── The picker itself ──────────────────────────────────────────────────
  "Language": "Idioma",

  // ── The receipt page, reached from the confirmation email ──────────────
  "Booking not found": "No encontramos esa reserva",
  "This link may be out of date, or the booking was removed.":
    "Puede que el enlace ya no sirva, o que la reserva se haya eliminado.",
  "Your request": "Tu solicitud",
  "Your booking": "Tu reserva",
  "Cancelled": "Cancelada",
  "Waiting to be accepted": "Esperando aprobación",
  "Confirmed": "Confirmada",
  "{n} vehicles": "{n} vehículos",
  "We come to {address}": "Vamos a {address}",
  "Drop-off at {address}": "Entrega en {address}",
  "This time is held for you while {business} looks at it.":
    "Te guardamos esta hora mientras {business} la revisa.",
  "Also booked — 1 more car": "También reservado — 1 carro más",
  "Also booked — {n} more cars": "También reservado — {n} carros más",
  "Vehicle": "Vehículo",
  "Each one can be changed or cancelled on its own.":
    "Cada una se puede cambiar o cancelar por separado.",
  "A price from {business}": "Un precio de {business}",
  "Their price": "Su precio",
  "Saving…": "Guardando…",
  "Accept {amount}": "Aceptar {amount}",
  "Not for you? Cancel below and the time goes back.":
    "¿No te sirve? Cancela abajo y la hora queda libre otra vez.",
  "This booking is cancelled. You’re welcome to book again any time.":
    "Esta reserva está cancelada. Puedes reservar de nuevo cuando quieras.",
  "Book again": "Reservar de nuevo",
  "This appointment has already happened.": "Esta cita ya pasó.",
  "Pick a new time": "Elige otra hora",
  "No open times in the next few weeks.":
    "No hay horarios disponibles en las próximas semanas.",
  "Moving…": "Cambiando…",
  "Move my booking": "Cambiar mi reserva",
  "Never mind": "Mejor no",
  "Cancel your appointment on {date} at {time}? The time goes back to whoever wants it, so we may not be able to give it back.":
    "¿Cancelar tu cita del {date} a las {time}? La hora queda libre para quien la quiera, así que puede que no podamos devolvértela.",
  "Cancelling…": "Cancelando…",
  "Yes, cancel it": "Sí, cancélala",
  "Keep my booking": "Mejor la dejo así",
  "Changes and cancellations close {hours} hours before your appointment, so this one is now locked in.":
    "Los cambios y cancelaciones se cierran {hours} horas antes de la cita, así que esta ya quedó fija.",
  "Get in touch and we'll sort it out:": "Contáctanos y lo resolvemos:",
  "Please get in touch and we'll sort it out.": "Contáctanos y lo resolvemos.",
  "Loading…": "Cargando…",
  "Change the time": "Cambiar la hora",
  "Cancel this request": "Cancelar esta solicitud",
  "Cancel this booking": "Cancelar esta reserva",
  "Call": "Llama al",

  // ROADMAP 2.20 STAGE 3 — paying by card, on the page the customer reaches
  // from their own email. "Tarjeta" is the word every Spanish-language
  // checkout in the US uses, and "pagar con tarjeta" is the whole phrase.
  "Pay online": "Pagar en línea",
  "You can pay by card now if you like, or settle it with {business} on the day.":
    "Si quieres, puedes pagar con tarjeta ahora, o pagarle a {business} el mismo día.",
  "Pay {amount} by card": "Pagar {amount} con tarjeta",
  "Opening…": "Abriendo…",
  "Card details are handled by Stripe. We never see them.":
    "Los datos de tu tarjeta los maneja Stripe. Nosotros nunca los vemos.",
  "We could not start the payment. Please try again.":
    "No pudimos iniciar el pago. Inténtalo de nuevo.",
  "Paid": "Pagado",
  "Thank you — your card payment went through. Your receipt is on its way by email.":
    "Gracias — tu pago con tarjeta se realizó. Tu recibo va en camino por correo.",

  // ── The opt-out, reached from an email ─────────────────────────────────
  "This link has expired": "Este enlace ya venció",
  "Reply to the email you got instead — it reaches the business directly.":
    "Responde al correo que recibiste — le llega directo al negocio.",
  "Done": "Listo",
  "{business} won't email you about coming back again. If you book with them, you'll still get the confirmation and reminder for that booking.":
    "{business} ya no te va a escribir para invitarte a volver. Si reservas con ellos, igual recibes la confirmación y el recordatorio de esa reserva.",
  "Stop these emails?": "¿Detener estos correos?",
  "{name}, this stops {business} emailing you about coming back. Anything to do with a booking you make — the confirmation, the reminder, the receipt — still reaches you.":
    "{name}, esto hace que {business} deje de escribirte para invitarte a volver. Todo lo relacionado con una reserva que hagas — la confirmación, el recordatorio, el recibo — te sigue llegando.",
  "This stops {business} emailing you about coming back. Anything to do with a booking you make — the confirmation, the reminder, the receipt — still reaches you.":
    "Esto hace que {business} deje de escribirte para invitarte a volver. Todo lo relacionado con una reserva que hagas — la confirmación, el recordatorio, el recibo — te sigue llegando.",
  "One moment…": "Un momento…",
  "Yes, stop them": "Sí, deténlos",
  // ── ROADMAP 8.17 STAGE 1B — THE MONTHLY-PLAN PAGES ─────────────────────
  // `/book/:slug/plans` and `/plan/:memberId`. They are the rest of the same
  // customer journey stage 1 translated: a person who books in Spanish and is
  // then handed a plan link should not meet an English page at the end of it.
  //
  // THE PICKER IS ON BOTH OF THEM NOW. It was deliberately absent while they
  // were English-only — a control promising a language the page cannot speak
  // is worse than no control — and it arrives in the same change that makes
  // the promise true.
  //
  // WHAT IS *NOT* HERE: the cadence, the price shape, the term and the visit
  // count. Those are COMPUTED — a number in the middle of a sentence — so they
  // live in `lib/plans.js` beside their English, exactly as `duration()` does
  // in `format.js`. A catalogue keyed on English cannot hold a template.
  "This link doesn’t match a business.": "Este enlace no corresponde a ningún negocio.",
  "Plans": "Planes",
  // "Regulars get looked after" is an idiom, not a sentence to carry across
  // word for word: what it MEANS is that coming back regularly is rewarded.
  "Regulars get looked after": "Cuidamos a los clientes de siempre",
  "No plans just now": "Por ahora no hay planes",
  "{name} isn’t running any plans at the moment.":
    "{name} no tiene planes disponibles en este momento.",
  "Call {phone} if you’d like a regular slot.":
    "Llama al {phone} si quieres un espacio fijo.",
  "{visits} each time": "{visits} cada vez",
  "Already on a plan?": "¿Ya tienes un plan?",
  // An EXAMPLE address, so the example itself changes with the language —
  // "you@example.com" reads as a real address somebody typed to a Spanish
  // speaker, not as a hint.
  "you@example.com": "tu@ejemplo.com",
  "If that address is on a plan with us, your link is on its way. Check your inbox.":
    "Si ese correo tiene un plan con nosotros, tu enlace ya va en camino. Revisa tu bandeja de entrada.",
  "Sending": "Enviando",
  "Send it": "Enviar",
  "We’ll email your plan link rather than showing it here.":
    "Te enviamos el enlace de tu plan por correo en vez de mostrarlo aquí.",
  "Book a one-off instead": "Mejor reservar una sola vez",

  // ── The member's own page ──────────────────────────────────────────────
  "Plan not found": "No encontramos el plan",
  "This link may be out of date. Ask your detailer to send it again.":
    "Puede que este enlace ya no sirva. Pídele a tu detallador que te lo mande otra vez.",
  "We couldn’t end that just now.": "No pudimos terminarlo en este momento.",
  "Your plan": "Tu plan",
  "Visits waiting for you": "Visitas que te esperan",
  "Book whenever suits — these don’t expire while your plan is running.":
    "Reserva cuando te acomode — no vencen mientras tu plan siga activo.",
  "You paid": "Pagaste",
  "You pay": "Pagas",
  "Member since": "Miembro desde",
  "Next visit due": "Próxima visita",
  "Ended": "Terminado",
  "Visits used": "Visitas usadas",
  "This plan has ended, {first}.": "Este plan ya terminó, {first}.",
  "This plan has ended.": "Este plan ya terminó.",
  "You can still book any time, and {name} can put you back on a plan whenever you like.":
    "Puedes reservar cuando quieras, y {name} te puede volver a poner en un plan cuando gustes.",
  "Book my next visit": "Reservar mi próxima visita",
  "Ending…": "Terminando…",
  "Yes, end {name}": "Sí, terminar {name}",
  "Keep it": "Conservarlo",
  "End this plan": "Terminar este plan",

  // REVIEW 2026-09-11 — `spanish` 4a was red on a clean tree: the "not taking
  // bookings yet" screen was three English sentences, on the one page whose
  // whole job is to explain that something is wrong.
  "{business} isn’t taking bookings online yet": "{business} todavía no acepta reservas en línea",
  "They’re still setting this page up. Check back shortly — or get in touch with them directly.": "Todavía están configurando esta página. Vuelve pronto — o comunícate con ellos directamente.",
  "Try again": "Intentar de nuevo",

  // REVIEW ITEM 15, 2026-09-11 — the customer's own booking page now itemises
  // everything they ordered instead of printing one total, so the receipt's
  // own labels need Spanish. The rest ("Travel", "Promo {code}", "Vehicle
  // size", the four conditions) were already here from StepReview.
  "Discount": "Descuento",
  // NOT "Total": that word is identical in both languages, and the two
  // Spanish checks cannot both be satisfied by such a string — 1b wants an
  // entry for every call site, 2a rejects an entry that equals its English.
  // "Final total" resolves it and says more: the figure after the job
  // changed on the day, as against the estimate above it.
  "Final total": "Total final",
  "Name": "Nombre",
  "Your note": "Tu nota",
  "Add-on": "Extra",
};
