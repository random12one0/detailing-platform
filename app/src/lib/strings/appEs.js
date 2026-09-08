// ROADMAP 8.17 STAGE 2B — SPANISH FOR THE DETAILER'S OWN DASHBOARD.
//
// The twin of `es.js`, which is the CUSTOMER's booking surface. Same three
// decisions, and they are kept identical on purpose so the two never read as
// two different products:
//
// **1 · `tú`, NEVER `usted`.** Chosen once and kept. Which one matters less
// than the consistency: a product that switches between them mid-flow reads as
// two people wrote it, which is the exact impression this item exists to
// avoid. `tests/spanish.test.mjs` fails on `usted`.
//
// **2 · UNITED STATES SPANISH.** `carro`/`vehículo` rather than `coche`,
// `cita` rather than `hora`. The audience is Spanish speakers in the US, and
// `appI18n.js` formats at `es-US` for the same reason.
//
// **3 · A PLACEHOLDER IS A WHOLE SENTENCE'S WORTH OF FREEDOM.** Every
// interpolated sentence is ONE key with `{placeholder}` in it, never English
// glued together around a value, because Spanish puts the preposition
// somewhere else. A dropped placeholder is a fact that vanishes from the
// sentence, so the test compares the placeholder sets of every pair.
//
// ---------------------------------------------------------------------------
// AND ONE DECISION THAT IS THIS FILE'S ALONE
// ---------------------------------------------------------------------------
// **THE VOCABULARY IS A WORKING DETAILER'S, NOT A SOFTWARE PRODUCT'S.** The
// audience here is somebody running a business from a phone between jobs, so
// the register is the trade rather than the SaaS: *"Trabajos de hoy"*, not
// *"Panel de control"*. Where English uses a plain word this uses a plain
// word.
//
// ---------------------------------------------------------------------------
// WHAT IS DELIBERATELY ABSENT
// ---------------------------------------------------------------------------
// **THE DETAILER'S OWN WORDS.** Service names, plan names, vehicle-size labels
// they renamed, the message templates they typed, a customer's own notes and
// every business name pass through exactly as written. Nothing here can
// translate what it has never seen.
//
// **AND EVERY MONEY FIGURE, DATE AND TIME**, which come from `Intl` at
// `es-US` rather than from a string in this file.

export const appEs = {
  // ── SHARED VOCABULARY ────────────────────────────────────────────────────
  // **THE DURATION PRESETS ARE HERE ONCE AND THEY REACH NINE SETTINGS SCREENS,
  // because `controls.jsx` translates its own labels.** Every one of those
  // screens holds its presets as English KEYS in a module constant —
  // `[[30, "30 min"], [60, "1 hour"]]` — and `Segmented`, `DurationChoice` and
  // `Stepper` call `t(label)` where they draw them. One place to translate a
  // word that appears forty times, and no screen has to remember.
  //
  // `min` stays `min` and `hora` is not abbreviated: Spanish shortens minutes
  // the same way and does not shorten hours the same way, so following the
  // English abbreviation pattern exactly would produce something nobody says.
  "None": "Ninguno",
  "Never": "Nunca",
  "Any time": "Cualquier momento",
  "Custom": "Personalizado",
  "Less": "Menos",
  "More": "Más",
  "Custom value in {unit}": "Valor personalizado en {unit}",
  "minutes": "minutos",
  "hours": "horas",
  "days": "días",
  "10 min": "10 min",
  "15 min": "15 min",
  "20 min": "20 min",
  "30 min": "30 min",
  "45 min": "45 min",
  "1 hour": "1 hora",
  "2 hours": "2 horas",
  "3 hours": "3 horas",
  "4 hours": "4 horas",
  "6 hours": "6 horas",
  "12 hours": "12 horas",
  "1 day": "1 día",
  "2 days": "2 días",
  "1 month": "1 mes",
  "2 months": "2 meses",
  "3 months": "3 meses",
  "6 months": "6 meses",
  "1 year": "1 año",
  "every day": "todos los días",
  // The three words every settings screen ends with.
  "Save": "Guardar",
  "Saving…": "Guardando…",
  "Saved": "Guardado",
  "Cancel": "Cancelar",

  // ── THE SHELL: the five rail buttons and the header ──────────────────────
  // These five are the only words on screen at every moment of every day, so
  // they are the ones a wrong choice would grate against most. Each is the
  // trade's plain word: `Hoy` not `Panel`, `Dinero` not `Finanzas`.
  "Today": "Hoy",
  "Calendar": "Calendario",
  "Money": "Dinero",
  "Clients": "Clientes",
  "Business": "Negocio",
  "New booking": "Nueva cita",
  "Leave": "Salir",
  "Platform view — signed in as {who}. Anything you change is theirs.":
    "Vista de plataforma — sesión iniciada como {who}. Todo lo que cambies es de ellos.",

  // ── TODAY ────────────────────────────────────────────────────────────────
  // The screen a detailer opens first and looks at most. `{when}, {name}` is
  // one key rather than `greeting + ", " + name` because the comma is
  // English's idea of where it goes.
  "Morning": "Buenos días",
  "Afternoon": "Buenas tardes",
  "Evening": "Buenas noches",
  "{when}, {name}": "{when}, {name}",
  "nothing booked": "nada agendado",
  "{left} of {total} still to do": "{left} de {total} por hacer",
  "Jobs today": "Trabajos de hoy",
  "Expected": "Esperado",
  "{amount} collected": "{amount} cobrado",
  "Nothing collected yet": "Aún no has cobrado nada",
  "Still to do": "Por hacer",
  "done": "hechos",
  "Done": "Terminados",
  "Tomorrow": "Mañana",
  "The next 7 days": "Los próximos 7 días",
  "Open slots": "Horarios libres",
  "Write to them": "Escríbeles",
  "Waiting on you": "Esperando por ti",
  "Waiting on you · {count}": "Esperando por ti · {count}",
  "Fix this": "Arreglar esto",
  "Finish setting up": "Termina de configurar",
  "Your services come first": "Tus servicios van primero",
  "Nobody can book yet — your page has no services on it.":
    "Nadie puede agendar todavía — tu página no tiene servicios.",
  "Your booking link is how a day gets filled.":
    "Tu enlace de citas es lo que llena el día.",
  "Your booking page is offline because a payment did not go through. Nothing has been deleted.":
    "Tu página de citas está fuera de línea porque un pago no se completó. No se ha borrado nada.",
  "Your last payment did not go through. We will keep trying for two weeks.":
    "Tu último pago no se completó. Seguiremos intentando por dos semanas.",

  // ── CALENDAR ─────────────────────────────────────────────────────────────
  // The month, the history and the nine filter chips. Most of these live in
  // module constants as English KEYS and are translated where they are drawn —
  // a `t()` in the constant would run once at import and never change again.
  "Month": "Mes",
  "History": "Historial",
  "Previous month": "Mes anterior",
  "Next month": "Mes siguiente",
  "When": "Cuándo",
  "Status": "Estado",
  "Filter": "Filtrar",
  "Search bookings": "Buscar citas",
  "Search name, phone or service": "Busca por nombre, teléfono o servicio",
  "Clear search": "Borrar búsqueda",
  "Blocked out": "Bloqueado",
  "Blocked": "Bloqueado",
  "Remove filter: {label}": "Quitar filtro: {label}",
  "Nothing matches that.": "Nada coincide con eso.",
  "No bookings in {range}.": "No hay citas en {range}.",
  // The filter chips.
  "All": "Todos",
  "Confirmed": "Confirmadas",
  "Completed": "Terminadas",
  "Cancelled": "Canceladas",
  "No show": "No se presentó",
  "Waiting": "Esperando",
  "Last 30 days": "Últimos 30 días",
  "Last 90 days": "Últimos 90 días",
  "Last year": "Último año",
  "Everything": "Todo",
  // The same ranges again, INSIDE a sentence — *"No hay citas en los últimos
  // 30 días."* Spanish needs the article here and not on the chip, which is
  // exactly why English keeps two forms of these too.
  "the last 30 days": "los últimos 30 días",
  "the last 90 days": "los últimos 90 días",
  "the last year": "el último año",
  "your history": "tu historial",
  // The month grid's legend and its day marks.
  "Booked": "Agendado",
  "One type only": "Solo un tipo",
  "Mobile only": "Solo a domicilio",
  "Drop-off only": "Solo en el taller",

  // ── MONEY ────────────────────────────────────────────────────────────────
  // **THE PERIOD SENTENCES ARE FOUR KEYS EACH RATHER THAN ONE WITH A NOUN IN
  // IT, AND THIS IS WHERE THAT RULE EARNS ITS KEEP.** Spanish agrees the
  // demonstrative with the noun's gender — *esta semana*, *este mes* — so
  // `"Net this " + noun` cannot be translated correctly at all. `Money.jsx`
  // carries the four maps; these are their values.
  "Net this week": "Neto de esta semana",
  "Net this month": "Neto de este mes",
  "Net these 6 months": "Neto de estos 6 meses",
  "Net this year": "Neto de este año",
  "Net that week": "Neto de esa semana",
  "Net that month": "Neto de ese mes",
  "Net those 6 months": "Neto de esos 6 meses",
  "Net that year": "Neto de ese año",
  "Net, all time": "Neto, desde siempre",
  "Same as last week": "Igual que la semana pasada",
  "Same as last month": "Igual que el mes pasado",
  "Same as the 6 months before": "Igual que los 6 meses anteriores",
  "Same as last year": "Igual que el año pasado",
  "vs {amount} last week": "vs {amount} la semana pasada",
  "vs {amount} last month": "vs {amount} el mes pasado",
  "vs {amount} the 6 months before": "vs {amount} los 6 meses anteriores",
  "vs {amount} last year": "vs {amount} el año pasado",
  "No comparison yet": "Aún no hay con qué comparar",
  "Time range": "Periodo",
  "Previous period": "Periodo anterior",
  "Next period": "Periodo siguiente",
  "Collected": "Cobrado",
  "Expenses": "Gastos",
  "Avg job": "Trabajo prom.",
  "Jobs done": "Trabajos hechos",
  "Quoted up front": "Cotizado antes",
  "Added on site": "Agregado en sitio",
  "Tips": "Propinas",
  "Avg tip": "Propina prom.",
  "Tipped": "Con propina",
  "Mark paid": "Marcar pagado",
  "Marking paid…": "Marcando pagado…",
  "Show fewer": "Mostrar menos",
  "+{count} more in {period}": "+{count} más en {period}",
  "Could not load your expenses.": "No se pudieron cargar tus gastos.",
  "Log a bulk job": "Registrar trabajo en lote",
  "Export": "Exportar",
  "Add": "Agregar",

  // ── CLIENTS ──────────────────────────────────────────────────────────────
  // **`1 person` AND `{count} people` ARE TWO KEYS, NOT ONE WITH A PLURAL
  // SUFFIX.** English pluralises by adding an `s` at the end; nothing else
  // does, and a `{n} person(s)` shape is how a product ends up saying
  // *"1 personas"*. Two keys is the version that can be right in both.
  "Nobody yet": "Nadie todavía",
  "1 person": "1 persona",
  "{count} people": "{count} personas",
  "{shown} of {total}": "{shown} de {total}",
  "Sort by": "Ordenar por",
  "Recent": "Recientes",
  "Most spent": "Más gastado",
  "Longest away": "Más tiempo sin venir",
  "Search customers": "Buscar clientes",
  "Search name or phone…": "Busca por nombre o teléfono…",
  "Not seen in 3 months": "Sin venir en 3 meses",
  "Everyone has been in within three months.": "Todos han venido en los últimos tres meses.",
  "No customers yet — they appear on their own when bookings come in.":
    "Aún no hay clientes — aparecen solos cuando entran las citas.",
  "Last visit": "Última visita",
  "No completed visits yet": "Aún no hay visitas terminadas",
  "lifetime": "en total",
  "Plan": "Plan",
  "On a plan": "En un plan",
  "Notes": "Notas",
  "Gate code, dog's name, preferences…": "Código del portón, nombre del perro, preferencias…",
  "Nothing booked yet.": "Nada agendado todavía.",
  "Call": "Llamar",
  "Send this to the next person who asks.": "Manda esto a la próxima persona que pregunte.",
  "This address bounced — the last email to it was refused. Check it with them, or call instead.":
    "Este correo rebotó — el último mensaje fue rechazado. Confírmalo con ellos, o mejor llama.",
  // Forgetting a customer. The consequence is spelled out because it cannot be
  // undone, and *"Eliminar"* beside *"Mejor no"* is an unambiguous pair.
  "Delete": "Eliminar",
  "Deleting…": "Eliminando…",
  "Keep them": "Mejor no",
  "Their name, number, address and any notes come off every job, and their photos are deleted. This cannot be undone.":
    "Su nombre, teléfono, dirección y notas se quitan de cada trabajo, y sus fotos se borran. Esto no se puede deshacer.",
  "Could not load your customers.": "No se pudieron cargar tus clientes.",
  "We could not delete that. Please try again.": "No pudimos eliminar eso. Inténtalo de nuevo.",

  // ── THE NINETEEN SETTINGS SCREENS, BY NAME ───────────────────────────────
  // These live once in `screens/more/index.js` and are drawn in THREE places —
  // the Business tab's rows, the gear's rows, and the settings header — so
  // translating the key is all three at once.
  "Business info": "Datos del negocio",
  "Your colour": "Tu color",
  "Photo gallery": "Galería de fotos",
  "Reviews": "Reseñas",
  "Common questions": "Preguntas frecuentes",
  "Your web address": "Tu dirección web",
  "Campaign links": "Enlaces de campaña",
  "Services & add-ons": "Servicios y extras",
  "Promo codes & sale": "Códigos y descuentos",
  "Monthly plans": "Planes mensuales",
  "Maintenance deadlines": "Fechas de mantenimiento",
  "How you get paid": "Cómo te pagan",
  "Hours & days off": "Horario y días libres",
  "Booking rules": "Reglas de citas",
  "Notifications": "Avisos",
  "Message templates": "Mensajes guardados",
  "Team": "Equipo",
  "Your subscription": "Tu suscripción",
  "Your password": "Tu contraseña",
  "This device": "Este dispositivo",
  "Switch business": "Cambiar de negocio",

  // ── THE BUSINESS TAB ─────────────────────────────────────────────────────
  // Its four group headings and the live summary under every row.
  "Your page": "Tu página",
  "What you sell": "Lo que vendes",
  "When you can be booked": "Cuándo te pueden agendar",
  "Used everywhere, including here": "Se usa en todos lados, incluso aquí",
  "Nothing from a customer yet": "Nada de un cliente todavía",
  "Nothing tracked yet": "Nada rastreado todavía",
  "Nothing to sell — your booking page is empty":
    "Nada que vender — tu página de citas está vacía",
  "Not offering one": "No ofreces ninguno",
  "Nothing has a deadline": "Nada tiene fecha límite",
  "No days set — nobody can book": "Sin días abiertos — nadie puede agendar",
  "Nothing on your emails yet": "Nada en tus correos todavía",
  "Nothing on your website yet": "Nada en tu sitio todavía",
  "Nothing offered": "No ofreces nada",
  "Mobile & drop-off": "A domicilio y en el taller",
  "something else": "algo más",
  "cash": "efectivo",
  "{a} & {b}": "{a} y {b}",
  "{a}, {b} & {count} more": "{a}, {b} y {count} más",
  "{summary} · hidden": "{summary} · oculto",
  "{members} on {plans}": "{members} en {plans}",
  "{deadlines}, none due": "{deadlines}, ninguna vence",
  "{deadlines} coming up": "{deadlines} por vencer",
  "Site sale on · {codes}": "Descuento del sitio activo · {codes}",
  "no notice needed": "sin aviso previo",
  "{count} min notice": "{count} min de aviso",
  "{count} hour notice": "{count} hora de aviso",
  "{count} hours notice": "{count} horas de aviso",
  "{count} day notice": "{count} día de aviso",
  "{count} days notice": "{count} días de aviso",

  // **EVERY COUNTED NOUN IS TWO KEYS.** English adds an `s`; Spanish changes
  // the noun and sometimes the article with it. `Business.jsx`'s `n()` takes
  // the two KEYS rather than the two nouns for exactly this reason.
  "{count} photo": "{count} foto",
  "{count} photos": "{count} fotos",
  "{count} review": "{count} reseña",
  "{count} reviews": "{count} reseñas",
  "{count} question": "{count} pregunta",
  "{count} questions": "{count} preguntas",
  "{count} link": "{count} enlace",
  "{count} links": "{count} enlaces",
  "{count} open": "{count} apertura",
  "{count} opens": "{count} aperturas",
  "{count} service": "{count} servicio",
  "{count} services": "{count} servicios",
  "{count} add-on": "{count} extra",
  "{count} add-ons": "{count} extras",
  "{count} member": "{count} miembro",
  "{count} members": "{count} miembros",
  "{count} plan": "{count} plan",
  "{count} plans": "{count} planes",
  "{count} deadline": "{count} fecha límite",
  "{count} deadlines": "{count} fechas límite",
  "{count} code": "{count} código",
  "{count} codes": "{count} códigos",
  "{count} active code": "{count} código activo",
  "{count} active codes": "{count} códigos activos",

  // ── THE GEAR ─────────────────────────────────────────────────────────────
  "Texts you send from a job": "Mensajes que mandas desde un trabajo",
  "Change your sign-in password": "Cambia tu contraseña de acceso",
  "Show me around": "Muéstrame el lugar",
  "The guided tour of this dashboard": "El recorrido guiado de este panel",
  "The website business": "El negocio del sitio web",
  "Every detailer, and what they pay": "Cada detailer, y lo que paga",
  "Another account": "Otra cuenta",
  "this computer": "esta computadora",
  "Maps": "Mapas",
  "{count} of 5 emails on": "{count} de 5 correos activos",
  "Not set up yet": "Aún sin configurar",
  "Unpaid — your page is offline": "Sin pagar — tu página está fuera de línea",
  "A payment did not go through": "Un pago no se completó",
  "Ending — no further charges": "Terminando — no habrá más cargos",
  "{amount} a month": "{amount} al mes",
  "{amount} a year": "{amount} al año",
  "{amount} a month · next {date}": "{amount} al mes · siguiente {date}",
  "{amount} a year · next {date}": "{amount} al año · siguiente {date}",

  // ── THE DETAILER'S OWN WORDS ON EACH EMAIL ───────────────────────────────
  // `lib/emailMessages.js`: which email, when it goes out, and the prewritten
  // sentences a detailer can adopt.
  //
  // **THE PRESETS ARE TRANSLATED AND THAT IS A DECISION.** A detailer reading
  // a Spanish dashboard is choosing words to say to their OWN customers, so
  // they should be offered them in the language they are reading — and what
  // gets stored is whatever they picked, which is their words either way.
  // `plan_visits.note` is the opposite case: the system writes it, so it stays
  // one language for ever. The test is who is choosing.
  "Booking confirmed": "Cita confirmada",
  "The moment a customer books.": "En cuanto un cliente agenda.",
  "Please have the car somewhere we can reach all four sides, and clear anything valuable out of the cabin before we arrive.":
    "Por favor deja el carro donde podamos llegar a los cuatro lados, y saca cualquier cosa de valor de la cabina antes de que lleguemos.",
  "We'll text you when we're on the way. If anything changes, just reply to this email.":
    "Te mandamos un mensaje cuando vayamos en camino. Si algo cambia, solo responde a este correo.",
  "Request received": "Solicitud recibida",
  "When a customer asks for a time and you haven't answered yet.":
    "Cuando un cliente pide una hora y aún no has respondido.",
  "We usually answer the same day. Your time is held until we do.":
    "Normalmente respondemos el mismo día. Tu horario queda apartado hasta entonces.",
  "If you need it sooner than that, give us a call and we'll see what we can move.":
    "Si lo necesitas antes, llámanos y vemos qué podemos mover.",
  "Quote": "Cotización",
  "When you send a price back.": "Cuando mandas un precio de vuelta.",
  "This price holds for seven days. If the car is in better shape than the photos suggested, we'll charge less, not more.":
    "Este precio se mantiene por siete días. Si el carro está mejor de lo que se veía en las fotos, cobramos menos, no más.",
  "Request accepted": "Solicitud aceptada",
  "When you say yes to a request.": "Cuando aceptas una solicitud.",
  "Looking forward to it. We'll be in touch the day before.":
    "Con gusto te esperamos. Te contactamos el día anterior.",
  "Request declined": "Solicitud rechazada",
  "When you can't take one.": "Cuando no puedes tomarla.",
  "If you can be flexible on the day, message us — we often have cancellations.":
    "Si puedes ser flexible con el día, escríbenos — seguido tenemos cancelaciones.",
  "Appointment reminder": "Recordatorio de cita",
  "Before the job. Timing is set in Booking rules.":
    "Antes del trabajo. El tiempo se ajusta en Reglas de citas.",
  "Please leave the car unlocked and move it out of the garage if you can.":
    "Por favor deja el carro abierto y sácalo del garaje si puedes.",
  "We'll need access to a tap and an outlet. If that's a problem, let us know and we'll bring our own.":
    "Vamos a necesitar una llave de agua y un tomacorriente. Si eso es problema, avísanos y llevamos los nuestros.",
  "Second reminder": "Segundo recordatorio",
  "Only if you've switched the second one on.": "Solo si activaste el segundo.",
  "See you shortly — we're on schedule.": "Nos vemos pronto — vamos a tiempo.",
  "Rescheduled": "Reagendada",
  "When a booking moves.": "Cuando una cita se mueve.",
  "Sorry for the change. Everything else about the job stays the same.":
    "Perdón por el cambio. Todo lo demás del trabajo sigue igual.",
  "When a booking is called off.": "Cuando se cancela una cita.",
  "No hard feelings — book again any time and we'll fit you in.":
    "Sin problema — agenda otra vez cuando quieras y te acomodamos.",
  "Receipt": "Recibo",
  "After the job is paid.": "Después de que se paga el trabajo.",
  "Thanks for your business. Keep this for your records.":
    "Gracias por tu preferencia. Guarda esto para tus registros.",
  "Invoice": "Factura",
  "When there's still something owed.": "Cuando todavía se debe algo.",
  "Payment can be cash, card or Zelle — whatever is easiest.":
    "El pago puede ser en efectivo, tarjeta o Zelle — lo que te sea más fácil.",
  "Thank-you and review request": "Agradecimiento y reseña",
  "After you record payment.": "Después de que registras el pago.",
  "If anything isn't right, tell us first — we'd rather fix it than read about it.":
    "Si algo no está bien, dinos primero — preferimos arreglarlo a leerlo después.",
  "Reviews genuinely help a small business like ours. It takes about a minute.":
    "Las reseñas de verdad ayudan a un negocio pequeño como el nuestro. Toma como un minuto.",
};
