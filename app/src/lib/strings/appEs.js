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
  "A plan is a set price each month for a customer who books you regularly. Create them here. Leave this empty if you only do one-off jobs.":
    "Un plan es un precio fijo cada mes para un cliente que te reserva con regularidad. Créalos aquí. Deja esto vacío si solo haces trabajos sueltos.",
  "A promo code is a word a customer types when booking to get money off. Skip this if you do not have one. You can add one later.":
    "Un código promocional es una palabra que un cliente escribe al reservar para obtener un descuento. Sáltalo si no tienes uno. Puedes agregarlo después.",
  "Allowed once per device. Your browser will ask you first.": "Se permite una vez por dispositivo. Tu navegador te preguntará primero.",
  "Blocked for this site": "Bloqueado para este sitio",
  "Customers can only pick times inside these hours. If you close a day here, nobody can book it.":
    "Los clientes solo pueden elegir horas dentro de este horario. Si cierras un día aquí, nadie puede reservarlo.",
  "Get an alert on your phone when a booking comes in. It works when the dashboard is closed.":
    "Recibe un aviso en tu teléfono cuando entre una cita. Funciona aunque el panel esté cerrado.",
  "Mobile means you drive to the customer. Drop-off means they come to you. You can offer both. This is the first question your booking page asks.":
    "A domicilio significa que tú vas al cliente. En tu taller significa que el cliente viene a ti. Puedes ofrecer ambos. Esta es la primera pregunta de tu página de reservas.",
  "None": "Ninguno",
  "Never": "Nunca",
  "Any time": "Cualquier momento",
  "Custom": "Personalizado",
  "Less": "Menos",
  "More": "Más",
  "Custom value in {unit}": "Valor personalizado en {unit}",
  "Off for this device": "Apagado en este dispositivo",
  "On for this device": "Encendido en este dispositivo",
  "Pick one color. It is used on your booking page and in this dashboard. Most detailers use the color already on their van or their cards.":
    "Elige un color. Se usa en tu página de reservas y en este panel. La mayoría usa el color que ya está en su camioneta o en sus tarjetas.",
  "That is not your current password.": "Esa no es tu contraseña actual.",
  "The questions customers ask you most often. Answer them here and you get fewer texts asking the same thing.":
    "Las preguntas que más te hacen los clientes. Respóndelas aquí y recibirás menos mensajes preguntando lo mismo.",
  "The services you add here show on your booking page at the price you set. Add-ons are extras a customer can add to a service.":
    "Los servicios que agregues aquí aparecen en tu página de reservas al precio que pongas. Los extras son adicionales que un cliente puede sumar a un servicio.",
  "These are the texts you send from a job, like on my way or all done. Write them once here. On the day it takes one tap.":
    "Estos son los mensajes que envías desde un trabajo, como voy en camino o ya terminé. Escríbelos una vez aquí. El día del trabajo es un solo toque.",
  "Turn it on again on any other phone or computer you want the alerts on.": "Actívalo de nuevo en cualquier otro teléfono o computadora donde quieras los avisos.",
  "Turn notifications back on for this site in your browser settings, then come back here.": "Vuelve a activar las notificaciones para este sitio en la configuración de tu navegador y regresa aquí.",
  "Turn off on this device": "Apagar en este dispositivo",
  "Turn on push notifications": "Activar notificaciones push",
  "Turn on the ways you take money. A customer sees these on their booking so they know what to bring.":
    "Activa las formas en que cobras. Un cliente las ve en su reserva para saber qué llevar.",
  "Type in reviews customers have already given you somewhere else. Nothing is imported automatically. You decide which ones to show.":
    "Escribe las reseñas que los clientes ya te dieron en otro lugar. No se importa nada automáticamente. Tú decides cuáles mostrar.",
  "Your business name, phone number and email address. This shows at the top of your booking page and at the bottom of every email a customer gets.":
    "El nombre de tu negocio, tu teléfono y tu correo. Esto aparece arriba en tu página de reservas y al final de cada correo que recibe un cliente.",
  "e.g. car wash membership":
    "ej. membresía de lavado de autos",
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
  "Your color": "Tu color",
  "Photo gallery": "Galería de fotos",
  "Reviews": "Reseñas",
  "FAQ": "Preguntas frecuentes",
  "Your web address": "Tu dirección web",
  "Tracking links": "Enlaces de seguimiento",
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
  // ── THE REST OF THE DASHBOARD ────────────────────────────────────────────
  // Everything from here down is grouped by where a detailer meets it rather
  // than by which file holds it, because the files are not what anybody is
  // looking at.

  // Plans — the four ways a plan can be priced, and the member ledger.
  "$ / month": "$ / mes",
  "$ / visit": "$ / visita",
  "$ up front": "$ por adelantado",
  "% off": "% de descuento",
  "$ off": "$ de descuento",
  "Ended": "Terminado",
  "Lifetime": "De por vida",
  "Log this member": "Registrar este miembro",
  "nobody on it": "nadie en él",
  " · hidden": " · oculto",
  "{count} visit owed": "{count} visita pendiente",
  "{count} visits owed": "{count} visitas pendientes",
  "Next due {date}": "Siguiente el {date}",
  "No set schedule": "Sin horario fijo",
  "Customer": "Cliente",
  "Add a plan first, then log the customers who are on it.":
    "Agrega un plan primero, y luego registra a los clientes que están en él.",
  "Nobody logged yet.": "Nadie registrado todavía.",
  "Could not load your plans.": "No se pudieron cargar tus planes.",
  "Plan saved.": "Plan guardado.",
  "Member logged.": "Miembro registrado.",
  "That customer is already on a plan. End the old one first.":
    "Ese cliente ya está en un plan. Termina el anterior primero.",
  "Visit skipped.": "Visita saltada.",
  "Visit added.": "Visita agregada.",
  "Put this in your bio and in your texts. It lists what you offer and lets people ask to join.":
    "Pon esto en tu bio y en tus mensajes. Enseña lo que ofreces y deja que la gente pida entrar.",
  "Our plans": "Nuestros planes",
  "{visits} each time": "{visits} cada vez",

  // Booking rules — the surcharge sheet, the travel areas and the warnings.
  "I bring it": "Yo lo llevo",
  "Just ask": "Solo pregunta",
  "Must have": "Es necesario",
  "I go to them": "Yo voy a ellos",
  "They come to me": "Ellos vienen a mí",
  "Both": "Ambos",
  "They're booked": "Quedan agendados",
  "They've asked": "Han pedido",
  "Certain days": "Ciertos días",
  "Short notice": "Poco aviso",
  "Dollars": "Dólares",
  "Percent": "Porcentaje",
  "Percent (%)": "Porcentaje (%)",
  "Amount ($)": "Cantidad ($)",
  "Not set": "Sin definir",
  "No extra charge": "Sin cargo extra",
  "No limit": "Sin límite",
  "Save booking rules": "Guardar reglas de citas",
  "Edit travel area": "Editar zona de viaje",
  "New travel area": "Nueva zona de viaje",
  "Edit surcharge": "Editar recargo",
  "New surcharge": "Nuevo recargo",
  "Remove {name}": "Quitar {name}",
  "{amount}, not charged": "{amount}, no se cobra",
  "The time is theirs the moment they book it. Nothing waits on you.":
    "La hora es suya desde que la agendan. Nada espera por ti.",
  "The time is held for them and nobody else can take it, but they're told it's a request until you accept it. Requests wait on your Today screen.":
    "La hora queda apartada y nadie más la puede tomar, pero se les dice que es una solicitud hasta que la aceptes. Las solicitudes esperan en tu pantalla de Hoy.",
  "The customer picks one on your booking page and its fee is added.":
    "El cliente escoge una en tu página de citas y se agrega su costo.",
  "Optional. Add areas if you charge different amounts for different distances.":
    "Opcional. Agrega zonas si cobras distinto según la distancia.",
  "Optional. Extra charged on top for jobs that cost you more to take.":
    "Opcional. Un cargo extra para trabajos que te cuestan más.",
  "Charged when a job is booked with less notice than you set below.":
    "Se cobra cuando agendan con menos aviso del que pongas abajo.",
  "Charged on the days — and, if you set them, the hours — you choose below.":
    "Se cobra los días — y, si los pones, las horas — que escojas abajo.",
  "Only the days you pick.": "Solo los días que escojas.",
  "Every day.": "Todos los días.",
  "A percentage of the job's price before any discount.":
    "Un porcentaje del precio del trabajo antes de cualquier descuento.",
  "A flat amount added to the job.": "Una cantidad fija agregada al trabajo.",
  "You carry your own — the customer is never asked about {what}.":
    "Tú llevas el tuyo — nunca se le pregunta al cliente por {what}.",
  "The booking page asks about {what} and records the answer, so you know what to load.":
    "La página de citas pregunta por {what} y guarda la respuesta, para que sepas qué cargar.",
  "The booking page asks about {what}, and a customer who can't provide it is blocked from booking.":
    "La página de citas pregunta por {what}, y un cliente que no lo tenga no puede agendar.",
  "a power outlet": "un tomacorriente",
  "the calendar": "el calendario",
  "A {hours}-hour gap between jobs means very few slots each day.":
    "Un espacio de {hours} horas entre trabajos deja muy pocos horarios al día.",
  "Nobody will be able to book sooner than {days} days out.":
    "Nadie podrá agendar con menos de {days} días.",
  "Customers can only book a few days ahead.":
    "Los clientes solo pueden agendar con pocos días de anticipación.",
  "Very fine slot grid — the time picker will be crowded.":
    "Intervalos muy chicos — el selector de hora se va a ver saturado.",
  "Very coarse slot grid — few start times will be offered.":
    "Intervalos muy grandes — se van a ofrecer pocas horas de inicio.",
  "That cap is unusual — double-check it's what you want.":
    "Ese tope es poco común — revisa que sea lo que quieres.",
  "Anything inside {days} days needs a phone call to change.":
    "Cualquier cosa dentro de {days} días necesita una llamada para cambiarse.",
  "Going away? Pick the day you're back and the page says so instead of taking bookings.":
    "¿Te vas? Escoge el día que regresas y la página lo dice en vez de tomar citas.",
  "Your page stays up and tells customers when you're back. It reopens itself on the day.":
    "Tu página sigue arriba y les dice a los clientes cuándo regresas. Se reabre sola ese día.",

  // The catalogue — services, add-ons, categories and vehicle sizes.
  "Edit service": "Editar servicio",
  "New service": "Nuevo servicio",
  "Edit add-on": "Editar extra",
  "New add-on": "Nuevo extra",
  "Edit category": "Editar categoría",
  "New category": "Nueva categoría",
  "Edit vehicle size": "Editar tamaño de vehículo",
  "New vehicle size": "Nuevo tamaño de vehículo",
  "Just one": "Solo uno",
  "Any number": "Cualquier cantidad",
  "Either": "Cualquiera",
  "Base price": "Precio base",
  "Costs extra": "Cuesta extra",
  "Booked on its own — nothing else can be added":
    "Se agenda solo — no se le puede agregar nada más",
  "Customers pick one": "Los clientes escogen uno",
  "Customers pick any number": "Los clientes escogen los que quieran",
  "You already have a category with that name.":
    "Ya tienes una categoría con ese nombre.",
  "Category deleted.": "Categoría eliminada.",
  "Vehicle sizes saved.": "Tamaños de vehículo guardados.",
  "Saved.": "Guardado.",
  "{count} service is in this category. Deleting it keeps them — they just stop being grouped. Continue?":
    "{count} servicio está en esta categoría. Al eliminarla se quedan — solo dejan de estar agrupados. ¿Continuar?",
  "{count} services are in this category. Deleting it keeps them — they just stop being grouped. Continue?":
    "{count} servicios están en esta categoría. Al eliminarla se quedan — solo dejan de estar agrupados. ¿Continuar?",
  "This is your base size — every price you set is the price for this one.":
    "Este es tu tamaño base — cada precio que pongas es el precio para este.",
  "You set what this size adds, per service, in each service's own screen.":
    "Lo que este tamaño agrega lo pones, por servicio, en la pantalla de cada servicio.",
  "Choosing anything in here clears everything else — for a complete package that already includes your other services.":
    "Escoger algo de aquí borra todo lo demás — para un paquete completo que ya incluye tus otros servicios.",
  "Customers can combine these with services from your other categories.":
    "Los clientes pueden combinar estos con servicios de tus otras categorías.",
  "Customers see \"from {amount}\".": "Los clientes ven \"desde {amount}\".",
  "Customers read this as a firm quote.":
    "Los clientes leen esto como un precio en firme.",
  "What's included (one per line)": "Qué incluye (uno por línea)",
  "Hand wash and dry\nClay bar decontamination\nMachine polish\nSix-month sealant":
    "Lavado y secado a mano\nDescontaminación con barra de arcilla\nPulido a máquina\nSellador de seis meses",
  "Wherever you work — the customer chooses.":
    "Donde sea que trabajes — el cliente escoge.",
  "Drop-off only. A customer who picks this can't choose mobile.":
    "Solo en el taller. Un cliente que escoja esto no puede escoger a domicilio.",
  "Mobile only. A customer who picks this can't choose drop-off.":
    "Solo a domicilio. Un cliente que escoja esto no puede escoger el taller.",
  // The twelve colour presets. Named for what the colour IS, the way the trade
  // names them, so each one is translated rather than transliterated.
  "Crimson": "Carmesí",
  "Rose": "Rosa",
  "Ember": "Brasa",
  "Sunflower": "Girasol",
  "Gold": "Oro",
  "Forest": "Bosque",
  "Teal": "Verde azulado",
  "Sky": "Cielo",
  "Ocean": "Océano",
  "Violet": "Violeta",
  "Slate": "Pizarra",
  "Silver": "Plata",
  "a color": "un color",
  "a near-white": "un casi blanco",
  "a near-black": "un casi negro",
  "a gray": "un gris",

  // The seven first-run questions, and the name each step goes by afterwards.
  "What do you charge for?": "¿Por qué cobras?",
  "Your services": "Tus servicios",
  "Running a discount?": "¿Tienes un descuento?",
  "Promo code": "Código promocional",
  "When are you open?": "¿Cuándo estás abierto?",
  "Your hours": "Tu horario",
  "Where does the work happen?": "¿Dónde se hace el trabajo?",
  "Where you work": "Dónde trabajas",
  "How does a customer reach you?": "¿Cómo te contacta un cliente?",
  "Your details": "Tus datos",
  "What color is yours?": "¿Cuál es tu color?",
  "Step {n} of {total} · {name}": "Paso {n} de {total} · {name}",
  "Full detail": "Detallado completo",
  "Pet hair removal": "Quitar pelo de mascota",
  "Minutes": "Minutos",
  "Extra minutes": "Minutos extra",
  "Finish": "Terminar",
  "Continue": "Continuar",
  "Setting up…": "Configurando…",
  "Open my dashboard": "Abrir mi panel",
  "Your business": "Tu negocio",
  "What is the business called?": "¿Cómo se llama el negocio?",
  "That name needs a couple of letters or numbers for the web address.":
    "Ese nombre necesita un par de letras o números para la dirección web.",
  "That web address is taken. Try another below.":
    "Esa dirección web ya está ocupada. Prueba otra abajo.",

  // The guided tour — one sentence a step.
  "Every morning starts here.": "Cada mañana empieza aquí.",
  "A job booked over the phone goes in here.":
    "Un trabajo agendado por teléfono se mete aquí.",
  "Everything a customer sees is set here.":
    "Todo lo que ve un cliente se ajusta aquí.",
  "Send this link to a customer.": "Manda este enlace a un cliente.",
  "Open a job to see everything about it — the car, the price, the notes.":
    "Abre un trabajo para ver todo — el carro, el precio, las notas.",
  "Somebody asked for a time. Nothing is confirmed until you answer.":
    "Alguien pidió una hora. Nada queda confirmado hasta que respondas.",
  "When a job is done, this is where the money gets written down.":
    "Cuando se termina un trabajo, aquí es donde se anota el dinero.",
  "Week, month, year — every figure on this screen follows this.":
    "Semana, mes, año — cada cifra de esta pantalla sigue esto.",
  "What is left after expenses, not what came in.":
    "Lo que queda después de gastos, no lo que entró.",
  "One file for your accountant, for whatever period you are looking at.":
    "Un archivo para tu contador, del periodo que estés viendo.",
  "Open somebody to see everything they have ever booked.":
    "Abre a alguien para ver todo lo que ha agendado.",
  "Sort by who has not been back — that is the list worth a text message.":
    "Ordena por quién no ha regresado — esa es la lista que vale un mensaje.",
  "Write to everybody on the list you are looking at, in one go.":
    "Escríbeles a todos los de la lista que estás viendo, de una vez.",
  "Everything with a number beside it is something a customer can already see.":
    "Todo lo que tiene un número al lado es algo que un cliente ya puede ver.",
  "What you charge for, and what it costs. This is the one that decides whether the booking page works.":
    "Por qué cobras, y cuánto cuesta. Este es el que decide si la página de citas sirve.",
  "Next": "Siguiente",
  "{n} of {total}": "{n} de {total}",

  // The finalize sheet — how a job got paid, and what was added on site.
  "Cash": "Efectivo",
  "Card": "Tarjeta",
  "Check": "Cheque",
  "Upgrade": "Mejora",
  "Add-on": "Extra",
  "Custom charge": "Cargo personalizado",
  "Travel fee": "Costo de viaje",
  "Tip": "Propina",
  "Discount": "Descuento",
  "Paid": "Pagado",
  "Part paid": "Pagado en parte",
  "Not yet": "Todavía no",
  "Waived": "Perdonado",
  "paid": "pagado",
  "partially paid": "pagado en parte",
  "not paid yet": "sin pagar todavía",
  "waived": "perdonado",
  "Yes, finalize": "Sí, finalizar",

  // The day sheet — blocking a day, changing its hours, limiting its mode.
  "No jobs": "Sin trabajos",
  "{count} job": "{count} trabajo",
  "{count} jobs": "{count} trabajos",
  "Bookings allowed as normal": "Se agenda con normalidad",
  "Block this day": "Bloquear este día",
  "Block these {count} days": "Bloquear estos {count} días",
  "through {date}": "hasta {date}",
  "Closed just for this day": "Cerrado solo por este día",
  "{from}–{to} just for this day": "{from}–{to} solo por este día",
  "Your normal hours for this weekday": "Tu horario normal para este día",
  "Mobile and drop-off both bookable": "Se puede agendar a domicilio y en taller",
  "Drop-offs only — no mobile jobs": "Solo en el taller — nada a domicilio",
  "Mobile only — no drop-offs": "Solo a domicilio — nada en el taller",
  "Drop-offs only": "Solo en el taller",
  "Drop-offs": "En el taller",
  "Mobile jobs": "Trabajos a domicilio",
  "{mode} for this day": "{mode} por este día",
  "{mode} for these {count} days": "{mode} por estos {count} días",
  "Through (inclusive)": "Hasta (inclusive)",
  "Change": "Cambiar",
  "Set": "Poner",
  "Remove": "Quitar",
  "Closed": "Cerrado",

  // The hours grid.
  "All days": "Todos los días",
  "Weekdays": "Entre semana",
  "Weekends": "Fin de semana",
  "Hours saved.": "Horario guardado.",
  "Save hours": "Guardar horario",
  "{day} needs both an open and a close time, or neither.":
    "{day} necesita hora de apertura y de cierre, o ninguna de las dos.",
  "Any day you're open.": "Cualquier día que estés abierto.",
  "Only the days you've picked. Other days close on your booking page.":
    "Solo los días que escogiste. Los demás se cierran en tu página de citas.",

  // Signing in, the invite and the password screens.
  "Welcome back": "Qué bueno verte",
  "Create your account": "Crea tu cuenta",
  "Reset your password": "Restablece tu contraseña",
  "Sign in to your dashboard.": "Entra a tu panel.",
  "Your business details come next.": "Los datos de tu negocio van después.",
  "We'll email you a link. It works once and lasts an hour.":
    "Te mandamos un enlace por correo. Sirve una vez y dura una hora.",
  "Signing in…": "Entrando…",
  "Creating…": "Creando…",
  "Sending…": "Enviando…",
  "Link sent": "Enlace enviado",
  "Email me a link": "Mándame un enlace",
  "Create account": "Crear cuenta",
  "Sign in": "Entrar",
  "Create an account": "Crear una cuenta",
  "I already have an account": "Ya tengo una cuenta",
  "Or go back to": "O regresa a",
  "Already signed in here": "Ya hay sesión aquí",
  "That account": "Esa cuenta",
  "That account is no longer signed in on this device.":
    "Esa cuenta ya no tiene sesión en este dispositivo.",
  "This business": "Este negocio",
  "Choose a new password": "Escoge una contraseña nueva",
  "That link has expired": "Ese enlace ya venció",
  "Those two do not match.": "Esas dos no coinciden.",
  "Changed. This device stays signed in.":
    "Cambiada. Este dispositivo sigue con la sesión abierta.",
  "Save it and sign me in": "Guardarla y entrar",
  "Set up my account": "Configurar mi cuenta",
  "Could not accept the invite.": "No se pudo aceptar la invitación.",
  "Could not check that invite link.": "No se pudo revisar ese enlace de invitación.",
  "Your sign-in password.": "Tu contraseña de acceso.",

  // The team screen.
  "Remove this person? They lose access to the dashboard immediately.":
    "¿Quitar a esta persona? Pierde el acceso al panel de inmediato.",
  "You can't remove the last owner.": "No puedes quitar al último dueño.",
  "You can't demote the last owner.": "No puedes bajarle el rango al último dueño.",
  "Name saved.": "Nombre guardado.",
  "First name": "Nombre",
  "This is you.": "Este eres tú.",
  "Owner": "Dueño",
  "Make them an owner": "Hacerlo dueño",
  "Owners can do everything, including invite people and set what everyone else can do.":
    "Los dueños pueden hacer todo, incluyendo invitar gente y decidir qué puede hacer cada quien.",
  "Gives them everything, permanently, including this screen.":
    "Le da todo, permanentemente, incluyendo esta pantalla.",
  "Custom role": "Rol personalizado",
  "Sending": "Enviando",
  "Send invite": "Mandar invitación",
  // The four permission ticks.
  "Answer requests": "Responder solicitudes",
  "Accept, decline or quote a booking someone has asked for.":
    "Aceptar, rechazar o cotizar una cita que alguien pidió.",
  "Promotions": "Promociones",
  "Promo codes and campaign links.": "Códigos promocionales y enlaces de campaña.",
  "The Money tab, expenses, and what each customer has spent.":
    "La pestaña de Dinero, los gastos, y lo que ha gastado cada cliente.",
  "Prices, hours, booking rules, branding, how you get paid, and the business's own details.":
    "Precios, horario, reglas de citas, marca, cómo te pagan, y los datos del negocio.",
  // The five prewritten texts a detailer sends from a job, and the six values
  // that get filled into them. **THE `{{token}}` MUST SURVIVE THE TRANSLATION**
  // — it is what `findBadTokens` validates and what `fillTemplate` replaces, so
  // a dropped or renamed one is a customer's name that never appears.
  "On my way": "Voy en camino",
  "Hi {{customer_name}}, this is {{business_name}} — I'm on my way and should be with you shortly.":
    "Hola {{customer_name}}, habla {{business_name}} — voy en camino y llego contigo en un rato.",
  "Running late": "Voy retrasado",
  "Hi {{customer_name}}, running about 15 minutes behind on my way to you. Sorry for the wait — see you at {{address}} shortly.":
    "Hola {{customer_name}}, voy unos 15 minutos retrasado camino a ti. Perdón por la espera — nos vemos en {{address}} en un rato.",
  "Confirm tomorrow": "Confirmar mañana",
  "Hi {{customer_name}}, confirming your detail on {{date}} at {{time}}. Reply here if anything's changed.":
    "Hola {{customer_name}}, confirmo tu detallado el {{date}} a las {{time}}. Responde aquí si algo cambió.",
  "Job finished": "Trabajo terminado",
  "All finished, {{customer_name}} — thanks for choosing {{business_name}}. Total is {{total}}.":
    "Todo listo, {{customer_name}} — gracias por elegir a {{business_name}}. El total es {{total}}.",
  "Ask about access": "Preguntar por el acceso",
  "Hi {{customer_name}}, quick check before {{date}} — will I have access to water and an outlet at {{address}}?":
    "Hola {{customer_name}}, una pregunta antes del {{date}} — ¿voy a tener agua y un tomacorriente en {{address}}?",
  "There is an empty {{ }} with nothing in it.": "Hay un {{ }} vacío, sin nada adentro.",
  "“{token}” isn’t one of the details we can fill in.":
    "“{token}” no es uno de los datos que podemos llenar.",
  "“{name}” not saved. {problems}": "“{name}” no se guardó. {problems}",
  "Inserts {meaning}": "Inserta {meaning}",
  "the customer's first name": "el nombre del cliente",
  "your business name": "el nombre de tu negocio",
  "the job's date": "la fecha del trabajo",
  "the job's start time": "la hora de inicio del trabajo",
  "where the job happens": "dónde se hace el trabajo",
  "the job's total": "el total del trabajo",
  "Their name": "Su nombre",
  "The date": "La fecha",
  "The time": "La hora",
  "The address": "La dirección",
  "The total": "El total",

  // The notification switches.
  "Booking confirmation": "Confirmación de cita",
  "Sent the moment they book, with their receipt and a link to change it.":
    "Se manda en cuanto agendan, con su recibo y un enlace para cambiarla.",
  "Timing, and whether there is a second one, are set in Booking rules.":
    "El tiempo, y si hay un segundo, se ajustan en Reglas de citas.",
  "Goes out after you record payment.": "Sale después de que registras el pago.",
  "A new booking comes in": "Entra una cita nueva",
  "A job is coming up": "Se acerca un trabajo",
  "The day before.": "El día anterior.",
  "Turning one off stops the email, not the booking.":
    "Apagar uno detiene el correo, no la cita.",
  "Email you when…": "Escribirte cuando…",
  "Send me a sample": "Mándame una muestra",
  "Only affects nudges to you, not your customers.":
    "Solo afecta los avisos para ti, no para tus clientes.",
  "Your own sentence at the bottom of one of these emails, in a panel of its own under everything we write. The customer reads it exactly as you type it — a gate code, where to park, that you will text when you are on the way. Leave one blank and that email goes out as it always did.":
    "Tu propia frase al final de uno de estos correos, en su propio recuadro debajo de todo lo que escribimos nosotros. El cliente la lee tal cual la escribes: un código de entrada, dónde estacionar, que le vas a escribir cuando vayas en camino. Deja uno en blanco y ese correo sale como siempre.",
  "Edit your line": "Editar tu línea",
  "Add a line": "Agregar una línea",
  "Save notifications": "Guardar avisos",
  "Could not change that.": "No se pudo cambiar eso.",
  "Blocked for this site. Turn notifications back on in your browser settings, then try again.":
    "Bloqueado para este sitio. Vuelve a activar los avisos en la configuración de tu navegador e inténtalo otra vez.",
  "Allowed once per device, on the phone or computer you want the alerts on.":
    "Se permite una vez por dispositivo, en el teléfono o la computadora donde quieras los avisos.",
  "This browser cannot show push notifications.":
    "Este navegador no puede mostrar avisos push.",
  "Your browser blocked notifications for this site.":
    "Tu navegador bloqueó los avisos para este sitio.",
  "Push isn't set up on this account yet — email still works.":
    "Los avisos push aún no están configurados en esta cuenta — el correo sí funciona.",
  "Turn on": "Activar",
  "Turn off": "Desactivar",
  "Notification": "Aviso",
  "A line about it": "Una línea al respecto",

  // This device — the three per-device choices.
  "iPhone or iPad": "iPhone o iPad",
  "Apple": "Apple",
  "Apple / file": "Apple / archivo",
  "Contact card": "Tarjeta de contacto",
  "Don’t show": "No mostrar",
  "Show": "Mostrar",
  "Hide": "Ocultar",
  "Used by every Navigate button.": "Lo usa cada botón de Navegar.",
  "Used by “Add to calendar” on a booking.":
    "Lo usa “Agregar al calendario” en una cita.",
  "Used by “Add to contacts” on a job.":
    "Lo usa “Agregar a contactos” en un trabajo.",
  "Sample Customer": "Cliente de ejemplo",

  // Promo codes and the site sale.
  "Code added.": "Código agregado.",
  "Sale settings saved.": "Ajustes del descuento guardados.",
  "Comes off every booking automatically — no code for the customer to enter.":
    "Se descuenta de cada cita automáticamente — el cliente no escribe ningún código.",
  "Activate": "Activar",
  "Deactivate": "Desactivar",
  "· once per customer": "· una vez por cliente",

  // The job record and the booking sheet.
  "Create booking": "Crear cita",
  "Save job": "Guardar trabajo",
  "Save changes": "Guardar cambios",
  "Save expense": "Guardar gasto",
  "Saving": "Guardando",
  "Setting up": "Configurando",
  "Checking": "Revisando",
  "Send a quote": "Mandar cotización",
  "Send a new quote": "Mandar una cotización nueva",
  "Yes, send it": "Sí, mándala",
  "Accepted — they've been emailed.": "Aceptada — ya se les mandó correo.",
  "Declined — they've been emailed.": "Rechazada — ya se les mandó correo.",
  "Reminder sent to customer.": "Recordatorio enviado al cliente.",
  "Invoice + thank-you sent.": "Factura y agradecimiento enviados.",
  "They asked for": "Pidieron",
  "Delete this booking? It is hidden, not destroyed, and can be restored by support.":
    "¿Eliminar esta cita? Se oculta, no se destruye, y soporte la puede restaurar.",
  "Could not load bookings.": "No se pudieron cargar las citas.",
  "Could not load requests.": "No se pudieron cargar las solicitudes.",
  "a customer": "un cliente",

  // Job photos and the gallery.
  "Damage": "Daño",
  "What happened": "Qué pasó",
  "Description": "Descripción",
  "Delete this photo? A before-photo is what settles an argument about a scratch.":
    "¿Eliminar esta foto? Una foto de antes es lo que resuelve un pleito por un rayón.",
  "Remove this photo from the gallery?": "¿Quitar esta foto de la galería?",
  "Photo uploaded — press Save to keep it.":
    "Foto subida — presiona Guardar para conservarla.",
  "Photo storage is full — remove some to add more.":
    "El almacenamiento de fotos está lleno — quita algunas para agregar más.",
  "Photo storage is full. Remove some photos to add more.":
    "El almacenamiento de fotos está lleno. Quita algunas fotos para agregar más.",

  // Reviews, questions and campaign links.
  "Add review": "Agregar reseña",
  "Add question": "Agregar pregunta",
  "Your answer": "Tu respuesta",
  "Could not load your reviews.": "No se pudieron cargar tus reseñas.",
  "Could not save your questions.": "No se pudieron guardar tus preguntas.",
  "Could not load your campaign links.": "No se pudieron cargar tus enlaces de campaña.",
  "Nobody has opened it yet": "Nadie lo ha abierto todavía",
  "Live": "Activo",
  "Your booking page": "Tu página de citas",
  "Put this in your bio, on your cards and in your texts. Customers book themselves from here.":
    "Pon esto en tu bio, en tus tarjetas y en tus mensajes. Los clientes agendan solos desde aquí.",
  "Book with us": "Agenda con nosotros",

  // The web address screen.
  "Check it": "Revisar",
  "Change it": "Cambiarla",
  "Not answering yet — the three steps below":
    "Aún no responde — los tres pasos de abajo",
  "That address isn't answering yet.": "Esa dirección aún no responde.",
  "Could not load your addresses.": "No se pudieron cargar tus direcciones.",
  "You are here": "Estás aquí",

  // Maintenance deadlines.
  "Due today": "Vence hoy",
  "Due tomorrow": "Vence mañana",
  "Missed yesterday": "Se pasó ayer",
  "Yesterday": "Ayer",
  "No longer applies": "Ya no aplica",
  "Before": "Antes",
  "After": "Después",
  "this line": "esta línea",
  "It's been a few months since we last took care of your car.":
    "Ya pasaron unos meses desde la última vez que cuidamos tu carro.",
  "Time to get it looking right again?": "¿Ya toca dejarlo bien otra vez?",
  "If you'd like it back to how it looked when you drove it away, booking takes about a minute —":
    "Si lo quieres como se veía cuando te lo llevaste, agendar toma como un minuto —",
  "just use the button below and pick a time that suits you.":
    "usa el botón de abajo y escoge la hora que te acomode.",
  "— text those ones instead.": "— a esos mándales un mensaje.",

  // Money's periods, the subscription rungs, and the rest.
  "Week": "Semana",
  "Year": "Año",
  "All time": "Desde siempre",
  "Booking": "Citas",
  "Pay for the year": "Pagar el año",
  "Pay monthly, for a year": "Pagar mensual, por un año",
  "Month to month": "Mes a mes",
  "Could not reach Stripe. Check the connection and try again.":
    "No se pudo conectar con Stripe. Revisa la conexión e inténtalo otra vez.",
  "Questions and problems go to one person, and you get an answer the same working day.":
    "Las dudas y los problemas van a una sola persona, y tienes respuesta el mismo día hábil.",
  "Stuck on something? One person answers, same working day.":
    "¿Atorado en algo? Una persona responde, el mismo día hábil.",
  "so every new booking is locked as soon as it's made.":
    "así cada cita nueva queda apartada en cuanto se hace.",
  "No phone or email — customers can't reach you":
    "Sin teléfono ni correo — los clientes no te pueden contactar",
  "What it is": "Qué es",
  // ── EVERYTHING THE CODEMOD WRAPPED ───────────────────────────────────────
  // The 501 keys `--untranslated` found. They were wrapped in one pass and
  // catalogued screen by screen afterwards, so the screens not yet reached
  // rendered correct English inside a Spanish dashboard — which is the whole
  // reason that flag exists. Alphabetical, because that is the order the check
  // reports them in and the order somebody will re-read them in.
  " · founding price": " · precio de fundador",
  ", and ": ", y ",
  "A booking link of its own for a flyer, a QR code or a post. Whoever opens it gets your discount applied already, and you can see how many came that way.":
    "Un enlace de citas propio para un volante, un código QR o una publicación. Quien lo abra ya trae tu descuento aplicado, y puedes ver cuántos llegaron por ahí.",
  "A job booked closer than this gets the surcharge.":
    "Un trabajo agendado con menos tiempo que esto lleva el recargo.",
  "A made-up booking, priced from your own services, sent to you and nobody else. Nothing is saved and no time is taken.":
    "Una cita inventada, con precios de tus propios servicios, que se manda solo a ti. No se guarda nada y no se aparta ningún horario.",
  "A partner, a second inbox, whoever else needs to know.":
    "Un socio, un segundo correo, quien más necesite enterarse.",
  "A reset link works once and lasts an hour. Ask for a new one and it will be in your inbox in a minute.":
    "Un enlace de restablecimiento sirve una vez y dura una hora. Pide otro y te llega al correo en un minuto.",
  "Above ten is a phone call, not a booking form.":
    "Más de diez es una llamada, no un formulario.",
  "Accept": "Aceptar",
  "Access": "Acceso",
  "Account": "Cuenta",
  "Add a job": "Agregar un trabajo",
  "Add a note or change the date": "Agregar una nota o cambiar la fecha",
  "Add a plan": "Agregar un plan",
  "Add a visit": "Agregar una visita",
  "Add an extra charge or discount": "Agregar un cargo extra o un descuento",
  "Add another account": "Agregar otra cuenta",
  "Add code": "Agregar código",
  "Add deadline": "Agregar fecha límite",
  "Add expense": "Agregar gasto",
  "Add item": "Agregar concepto",
  "Add photos": "Agregar fotos",
  "Add this address": "Agregar esta dirección",
  "Add your mailing address under Business info first. An email like this has to carry one at the bottom — that is the law, not our rule.":
    "Primero agrega tu dirección postal en Datos del negocio. Un correo así tiene que llevarla abajo — es la ley, no una regla nuestra.",
  "Add-ons": "Extras",
  "Added to every mobile booking, and included in the price the customer is quoted. Leave blank for none.":
    "Se agrega a cada cita a domicilio, e incluido en el precio que se le cotiza al cliente. Déjalo en blanco si no cobras.",
  "Added to the customer's total when they pick it.":
    "Se agrega al total del cliente cuando lo escoge.",
  "Adding a job to your calendar": "Agregar un trabajo a tu calendario",
  "Address": "Dirección",
  "After a job is marked complete, if you haven't finalised it yet.":
    "Después de marcar un trabajo como terminado, si aún no lo has finalizado.",
  "Agreed on the phone, first Tuesday of the month.":
    "Acordado por teléfono, el primer martes del mes.",
  "All day": "Todo el día",
  "Also send to": "Mandar también a",
  "Also signed in here": "También con sesión aquí",
  "Amount": "Cantidad",
  "Pick a custom color": "Elige un color personalizado",
  "Anything else": "Algo más",
  "Anything to note": "Algo que anotar",
  "Anything to tell them": "Algo que decirles",
  "Anything you want them to know.": "Lo que quieras que sepan.",
  "Applied before any promo code the customer enters.":
    "Se aplica antes de cualquier código que escriba el cliente.",
  "Apply": "Aplicar",
  "Apps": "Aplicaciones",
  "Area name": "Nombre de la zona",
  "Ask how dirty the vehicle is": "Preguntar qué tan sucio está el vehículo",
  "Back on the 14th — call for anything urgent":
    "Regreso el 14 — llama si es urgente",
  "Back to normal": "Volver a lo normal",
  "Back to sign in": "Volver a entrar",
  "Back to the dashboard": "Volver al panel",
  "Back": "Atrás",
  "Bank and anything else": "Banco y lo demás",
  "Before you pay": "Antes de pagar",
  "Book again": "Agendar otra vez",
  "Book it": "Agendarlo",
  "Booked on its own": "Se agenda solo",
  "Booked with less notice than": "Agendado con menos aviso que",
  "Booking link": "Enlace de citas",
  "Booking not found.": "No se encontró la cita.",
  "Booking page only": "Solo página de citas",
  "Branding": "Marca",
  "Business name": "Nombre del negocio",
  "Call or text": "Llamar o mandar mensaje",
  "Cancel my subscription": "Cancelar mi suscripción",
  "Cancel the job": "Cancelar el trabajo",
  "Cancelling frees the slot and keeps the job in your history. Removing takes it out of your records and your totals as well. It cannot be undone.":
    "Cancelar libera el horario y deja el trabajo en tu historial. Eliminar lo saca de tus registros y de tus totales también. No se puede deshacer.",
  "Cancelling": "Cancelando",
  "Card details": "Datos de la tarjeta",
  "Card payments": "Pagos con tarjeta",
  "Card payments are not switched on yet. Nothing for you to do — we will tell you when they are.":
    "Los pagos con tarjeta todavía no están activos. No tienes que hacer nada — te avisamos cuando lo estén.",
  "Card payments are not switched on yet. Nothing here will charge you.":
    "Los pagos con tarjeta aún no están activos. Nada de aquí te va a cobrar.",
  "Card payments are switched off. Your customers pay the ways you list instead.":
    "Los pagos con tarjeta están apagados. Tus clientes pagan por las formas que pusiste.",
  "Cars in one booking": "Carros en una cita",
  "Cars": "Carros",
  "Category": "Categoría",
  "Change several days at once": "Cambiar varios días a la vez",
  "Change the time or details": "Cambiar la hora o los datos",
  "Change timezone": "Cambiar zona horaria",
  "Changes and reminders": "Cambios y recordatorios",
  "Charged": "Cobrado",
  "Chase me about a request I haven't answered":
    "Recordarme una solicitud que no he respondido",
  "Check again": "Revisar otra vez",
  "Check your booked jobs": "Revisa tus trabajos agendados",
  "Checking your link…": "Revisando tu enlace…",
  "Checking your subscription…": "Revisando tu suscripción…",
  "Choose a customer…": "Escoge un cliente…",
  "Choose a password": "Escoge una contraseña",
  "Choose a plan…": "Escoge un plan…",
  "Choose someone…": "Escoge a alguien…",
  "Clear": "Limpiar",
  "Close settings": "Cerrar ajustes",
  "Close setup": "Cerrar configuración",
  "Close the day": "Cerrar el día",
  "Close": "Cerrar",
  "Closed until": "Cerrado hasta",
  "Closer than this and they have to call you.":
    "Más cerca que esto y tienen que llamarte.",
  "Closes": "Cierra",
  "Code": "Código",
  "Committed until": "Comprometido hasta",
  "Connect Stripe": "Conectar Stripe",
  "Connect a Stripe account to take card payments.":
    "Conecta una cuenta de Stripe para aceptar pagos con tarjeta.",
  "Contacts": "Contactos",
  "Continue to payment": "Continuar al pago",
  "Continue with Google": "Continuar con Google",
  "Copied": "Copiado",
  "Copy image": "Copiar imagen",
  "Copy link": "Copiar enlace",
  "Copy": "Copiar",
  "Could not disconnect. Try again.": "No se pudo desconectar. Inténtalo de nuevo.",
  "Could not reach Stripe. Try again in a minute.":
    "No pudimos comunicarnos con Stripe. Inténtalo en un minuto.",
  "Could not save that. Try again.": "No se pudo guardar. Inténtalo de nuevo.",
  "Counted from the day each member joined.":
    "Se cuenta desde el día que entró cada miembro.",
  "Customer name": "Nombre del cliente",
  "Customer:": "Cliente:",
  "Customers can pay by card from their booking page.":
    "Tus clientes pueden pagar con tarjeta desde su recibo.",
  "Customers see these behind the eye on your booking page, so the list can be as long as it needs to be.":
    "Los clientes ven esto detrás del ojo en tu página de citas, así que la lista puede ser tan larga como haga falta.",
  "Dashboard": "Panel",
  "Date": "Fecha",
  "Day": "Día",
  "Days you offer it": "Días que lo ofreces",
  "Days": "Días",
  "Decline": "Rechazar",
  "Delete category": "Eliminar categoría",
  "Detailing Platform": "Detailing Platform",
  "Detailing since": "Detallando desde",
  "Didn’t show up": "No se presentó",
  "Disconnect Stripe": "Desconectar Stripe",
  "Disconnect Stripe? Your customers will not be able to pay by card, and any receipt they are holding loses its Pay button.":
    "¿Desconectar Stripe? Tus clientes no podrán pagar con tarjeta, y cualquier recibo que tengan pierde su botón de Pagar.",
  "Disconnecting": "Desconectando",
  "Discount type": "Tipo de descuento",
  "Dismiss": "Descartar",
  "Don't remind me again": "No me lo recuerdes otra vez",
  "Done — you are signed in.": "Listo — ya entraste.",
  "Drop-off address": "Dirección del taller",
  "Due by": "Vence el",
  "Each area below sets its own, so this one is not charged while you have areas.":
    "Cada zona de abajo pone la suya, así que esta no se cobra mientras tengas zonas.",
  "Edit": "Editar",
  "Ten characters or more.": "Diez caracteres o más.",
  "You will be signed in straight after.": "Iniciarás sesión inmediatamente después.",
  "Eight characters or more. You will be signed in straight after.":
    "Ocho caracteres o más. Vas a entrar justo después.",
  "Email invoice": "Mandar factura",
  "Email your customers": "Escríbeles a tus clientes",
  "Email": "Correo",
  "Ends": "Termina",
  "Estimated total": "Total estimado",
  "Every booking time depends on this.": "Cada hora de cita depende de esto.",
  "Every-other-week wash": "Lavado cada dos semanas",
  "Exterior wash, wheels, glass and a quick interior wipe-down.":
    "Lavado exterior, rines, vidrios y una limpiada rápida por dentro.",
  "Extra for this area": "Extra por esta zona",
  "Final total": "Total final",
  "Finalize payment": "Finalizar pago",
  "First name and last initial": "Nombre e inicial del apellido",
  "For the pair that works: one the day before, one a couple of hours out.":
    "Para la pareja que funciona: uno el día antes, otro un par de horas antes.",
  "For work that has a deadline rather than a rhythm — a coating warranty that voids if the yearly inspection is missed. Your customer gets a reminder at 60, 30 and 14 days, and again the day before.":
    "Para trabajos con fecha límite en vez de ritmo — una garantía de recubrimiento que se pierde si no se hace la revisión anual. Tu cliente recibe un recordatorio a los 60, 30 y 14 días, y otra vez el día antes.",
  "Founding price": "Precio de fundador",
  "From your business info. Always receives.":
    "De los datos de tu negocio. Siempre recibe.",
  "From": "Desde",
  "Gap between jobs": "Espacio entre trabajos",
  "Generate QR code": "Generar código QR",
  "Getting started": "Empezando",
  "Getting there": "Ya casi",
  "Go back": "Regresar",
  "Go to dashboard": "Ir al panel",
  "Going to": "Yendo a",
  "Google review link": "Enlace de reseña de Google",
  "Google, in person, a text…": "Google, en persona, un mensaje…",
  "Guided tour": "Recorrido guiado",
  "Held after every booking, to pack up and drive.":
    "Se aparta después de cada cita, para recoger y manejar.",
  "Hours": "Horas",
  "How far ahead they can book": "Con cuánta anticipación pueden agendar",
  "How it's priced": "Cómo se cobra",
  "How many can they choose?": "¿Cuántos pueden escoger?",
  "How many": "Cuántos",
  "How much notice you need": "Cuánto aviso necesitas",
  "How much off": "Cuánto de descuento",
  "How much": "Cuánto",
  "How often": "Cada cuánto",
  "How they paid": "Cómo pagaron",
  "How this day works": "Cómo funciona este día",
  "I forgot my password": "Olvidé mi contraseña",
  "I'll do this later": "Lo hago después",
  "If you were given one": "Si te dieron uno",
  "In your own words. Nothing here is written for you.":
    "En tus propias palabras. Nada de aquí está escrito por nosotros.",
  "Invite someone": "Invitar a alguien",
  "Invite unavailable": "Invitación no disponible",
  "It marks the buttons and highlights on your booking page, on your website, and on this dashboard. If a color is too faint to read, it is adjusted just enough to stay legible.":
    "Marca los botones y los resaltados en tu página de citas, en tu sitio web y en este panel. Si un color queda muy tenue para leerse, se ajusta lo justo para que se siga leyendo.",
  "Just the username — we add the @ or $ and make it a link they can tap. Anything else still shows, but they will have to type it in themselves.":
    "Solo el usuario — nosotros ponemos el @ o el $ y lo hacemos un enlace que puedan tocar. Cualquier otra cosa se sigue viendo, pero la van a tener que escribir ellos.",
  "Keep my subscription": "Quedarme con mi suscripción",
  "Label": "Etiqueta",
  "Language": "Idioma",
  "Leave blank for none. Most detailers advertise cancel-anytime as a selling point.":
    "Déjalo en blanco si no hay. La mayoría de los detailers anuncian cancelar cuando quieras como argumento de venta.",
  "Leave both blank to be closed.": "Deja las dos en blanco para estar cerrado.",
  "Leave off to charge it all day on those days.":
    "Déjalo apagado para cobrarlo todo el día esos días.",
  "Licences, certifications, warranties. They go on your website — that part is still being built.":
    "Licencias, certificaciones, garantías. Van en tu sitio web — esa parte todavía se está construyendo.",
  "Light, moderate, heavy or extreme. Never changes the price.":
    "Ligero, moderado, pesado o extremo. Nunca cambia el precio.",
  "Links": "Enlaces",
  "Loading…": "Cargando…",
  "Locked for as long as you stay": "Fijo mientras te quedes",
  "Log a member": "Registrar un miembro",
  "Logo": "Logo",
  "Mailing address": "Dirección postal",
  "Main address": "Dirección principal",
  "Make the link": "Crear el enlace",
  "Mark closed": "Marcar cerrado",
  "Mark complete": "Marcar terminado",
  "Mark completed": "Marcar terminado",
  "Mark this job complete and record": "Marcar este trabajo terminado y registrar",
  "Member since": "Miembro desde",
  "Members": "Miembros",
  "Miles driven:": "Millas manejadas:",
  "Minimum term": "Plazo mínimo",
  "Missed": "Se pasó",
  "More than one is a bundle — two washes a month, say.":
    "Más de uno es un paquete — dos lavados al mes, por ejemplo.",
  "Morning summary": "Resumen de la mañana",
  "Most jobs in a day": "Máximo de trabajos al día",
  "Move down": "Mover abajo",
  "Move up": "Mover arriba",
  "Name": "Nombre",
  "Navigate": "Navegar",
  "Never mind": "Mejor no",
  "Never sends before the first one.": "Nunca se manda antes que el primero.",
  "Current password": "Contraseña actual",
  "New password": "Contraseña nueva",
  "Next charge": "Siguiente cargo",
  "No active services yet. Add them in the More tab under Services.":
    "Aún no hay servicios activos. Agrégalos en la pestaña Más, en Servicios.",
  "No build fee and no term. Keep the website you have.":
    "Sin costo de construcción y sin plazo. Quédate con el sitio web que tienes.",
  "No category": "Sin categoría",
  "No discount": "Sin descuento",
  "No matching timezone": "No hay zona horaria que coincida",
  "No open slots that day.": "No hay horarios libres ese día.",
  "No plans yet. Most detailers start with one — a wash every other week, or a monthly rate.":
    "Aún no hay planes. La mayoría de los detailers empiezan con uno — un lavado cada dos semanas, o una tarifa mensual.",
  "No reviews yet — your website has nothing from a customer on it.":
    "Aún no hay reseñas — tu sitio web no tiene nada de un cliente.",
  "No services yet — customers can't book until you add one.":
    "Aún no hay servicios — los clientes no pueden agendar hasta que agregues uno.",
  "No templates yet — the gear, then Message templates.":
    "Aún no hay mensajes guardados — el engrane, y luego Mensajes guardados.",
  "No term": "Sin plazo",
  "Nobody else.": "Nadie más.",
  "Nobody is waiting on a visit.": "Nadie está esperando una visita.",
  "None. Every job is priced the same whenever it is booked.":
    "Ninguno. Cada trabajo cuesta lo mismo sin importar cuándo se agende.",
  "Not available in this browser": "No disponible en este navegador",
  "Not changed yet": "Aún sin cambiar",
  "Not in a category": "Sin categoría",
  "Note": "Nota",
  "Nothing booked.": "Nada agendado.",
  "Nothing has a deadline yet — this is for coatings and warranties.":
    "Aún nada tiene fecha límite — esto es para recubrimientos y garantías.",
  "Nothing here yet — every booking you get is counted as somebody who just found you.":
    "Aún no hay nada — cada cita que recibes se cuenta como alguien que acaba de encontrarte.",
  "Nothing here yet — you are on detailingplatform.com.":
    "Aún no hay nada — estás en detailingplatform.com.",
  "Nothing here yet — your website has no questions section.":
    "Aún no hay nada — tu sitio web no tiene sección de preguntas.",
  "Nothing in this one yet.": "Aún no hay nada en este.",
  "Nothing to send yet.": "Aún no hay nada que mandar.",
  "Nothing": "Nada",
  "Nudge you before a job starts": "Avisarte antes de que empiece un trabajo",
  "Of that, the build": "De eso, la construcción",
  "Off keeps what you have written, and just hides the section.":
    "Apagado conserva lo que escribiste, solo esconde la sección.",
  "Offered on your booking page": "Se ofrece en tu página de citas",
  "On an iPhone, add this dashboard to your home screen first — Safari only allows it there.":
    "En un iPhone, primero agrega este panel a tu pantalla de inicio — Safari solo lo permite ahí.",
  "On the hour only, or every fifteen minutes — how the time picker is spaced.":
    "Solo en punto, o cada quince minutos — cómo se espacia el selector de hora.",
  "On your booking page": "En tu página de citas",
  "On your website": "En tu sitio web",
  "Once you hit this, the rest of that day stops being offered.":
    "En cuanto llegues a esto, el resto de ese día deja de ofrecerse.",
  "One line under the heading on your booking page. Leave it blank unless it earns its space — that screen is tight on a phone.":
    "Una línea debajo del título en tu página de citas. Déjala en blanco si no vale el espacio — esa pantalla va apretada en un teléfono.",
  "One moment": "Un momento",
  "One size, so one price.": "Un solo tamaño, así que un solo precio.",
  "One use per customer": "Un uso por cliente",
  "One-off changes — a day off, different hours for a single date, or a drop-off-only stretch — are set by tapping that date on the Calendar.":
    "Los cambios de una vez — un día libre, otro horario para una sola fecha, o un tramo solo de taller — se ponen tocando esa fecha en el Calendario.",
  "None on file": "Ninguna registrada",
  "Nothing to commit to — you choose again next year.":
    "Sin compromiso — vuelves a escoger el año que viene.",
  "Nothing to pay to leave.": "No pagas nada por irte.",
  "Only between certain hours": "Solo entre ciertas horas",
  "Only ever printed at the bottom of an email you send your old customers. The law asks for it.":
    "Solo se imprime al final de un correo que le mandas a tus clientes viejos. La ley lo pide.",
  "Only take": "Solo tomar",
  "Open now": "Abierto ahora",
  "Open slots in the next 7 days": "Horarios libres en los próximos 7 días",
  "Open": "Abre",
  "Opening Stripe": "Abriendo Stripe",
  "Opens a sample.": "Abre una muestra.",
  "Opens": "Abre",
  "Optional — check number, split payment…":
    "Opcional — número de cheque, pago dividido…",
  "Optional — they'll read this in the email":
    "Opcional — lo van a leer en el correo",
  "Optional": "Opcional",
  "Or email": "O correo",
  "Or just the booking page": "O solo la página de citas",
  "Other ways to pay you": "Otras formas de pagarte",
  "Password": "Contraseña",
  "Pausing stops the visits counting up. Coming back starts again from today — the paused ones are not owed.":
    "Pausar detiene la cuenta de visitas. Al regresar empieza otra vez desde hoy — las pausadas no se deben.",
  "Pay {amount}": "Pagar {amount}",
  "Payments": "Pagos",
  "Pending invites": "Invitaciones pendientes",
  "Percent off": "Porcentaje de descuento",
  "Phone": "Teléfono",
  "Photos": "Fotos",
  "Pick the days, set the times, then apply. Adjust any single day below. Nothing saves until you press Save hours.":
    "Escoge los días, pon las horas, y aplica. Ajusta cualquier día abajo. Nada se guarda hasta que presiones Guardar horario.",
  "Power at the customer's address": "Corriente en la dirección del cliente",
  "Price shape": "Forma del precio",
  "Price": "Precio",
  "Private notes": "Notas privadas",
  "Private:": "Privado:",
  "Promo codes": "Códigos promocionales",
  "Push notifications": "Avisos push",
  "Put on my website": "Poner en mi sitio web",
  "Quote sent for": "Cotización enviada por",
  "Quoted": "Cotizado",
  "Ready": "Listo",
  "Reason": "Motivo",
  "Remind the night before for early jobs":
    "Recordar la noche antes para trabajos temprano",
  "Remind them before the job": "Recordarles antes del trabajo",
  "Remind you to record payment": "Recordarte que registres el pago",
  "Reminder": "Recordatorio",
  "Remove from records": "Quitar de los registros",
  "Remove from the team": "Quitar del equipo",
  "Remove this from my records too": "Quitar esto de mis registros también",
  "Repeats on a schedule": "Se repite en un horario",
  "Replies come to your own inbox, not to us.":
    "Las respuestas llegan a tu propio correo, no a nosotros.",
  "Reset to what this device suggests":
    "Volver a lo que sugiere este dispositivo",
  "Reset": "Restablecer",
  "Revoke": "Revocar",
  "Riverside Mobile Detail": "Riverside Mobile Detail",
  "Round trip, for your mileage deduction":
    "Viaje redondo, para tu deducción de millaje",
  "SUMMER10": "VERANO10",
  "Sale is running": "El descuento está activo",
  "Save area": "Guardar zona",
  "Save plan": "Guardar plan",
  "Save sale": "Guardar descuento",
  "Save surcharge": "Guardar recargo",
  "Saves a sample card. Delete it after.":
    "Guarda una tarjeta de ejemplo. Bórrala después.",
  "Saving a customer to your phone": "Guardar un cliente en tu teléfono",
  "Search for your city or region": "Busca tu ciudad o región",
  "Send a second reminder": "Mandar un segundo recordatorio",
  "Send a text": "Mandar un mensaje",
  "Send this to": "Mandar esto a",
  "Sent the evening before instead.": "Se manda la noche antes en su lugar.",
  "Sent": "Enviado",
  "Services, hours and the rest are in Settings.":
    "Los servicios, el horario y lo demás están en Ajustes.",
  "Services": "Servicios",
  "Settings": "Ajustes",
  "Setup you only do once": "Preparación que haces una sola vez",
  "Share": "Compartir",
  "Show on your booking page": "Mostrar en tu página de citas",
  "Show this as a starting price": "Mostrar esto como precio inicial",
  "Show this on your website": "Mostrar esto en tu sitio web",
  "Shown on the booking page beside the discount. Leave blank for just the percentage.":
    "Se muestra en la página de citas junto al descuento. Déjalo en blanco para solo el porcentaje.",
  "Shows now": "Se ve ahora",
  "Sign out": "Cerrar sesión",
  "Site-wide sale": "Descuento en todo el sitio",
  "Skip a visit": "Saltar una visita",
  "Skip the tour": "Saltar el recorrido",
  "Something on this screen broke. Nothing you were doing was lost — your bookings and settings are safe.":
    "Algo de esta pantalla falló. No se perdió nada de lo que estabas haciendo — tus citas y tus ajustes están a salvo.",
  "Staff": "Personal",
  "Stars": "Estrellas",
  "Start times you offer": "Horas de inicio que ofreces",
  "Start": "Inicio",
  "Stripe account ending {last4}": "Cuenta de Stripe que termina en {last4}",
  "Stripe did not finish connecting. Try again.":
    "Stripe no terminó de conectarse. Inténtalo de nuevo.",
  "Stripe has not finished checking your account yet, so card payments are not live. Finish the details Stripe asked for.":
    "Stripe todavía no termina de revisar tu cuenta, así que los pagos con tarjeta no están activos. Completa los datos que Stripe te pidió.",
  "Stripe is connected.": "Stripe está conectado.",
  "Subject": "Asunto",
  "Surcharges": "Recargos",
  "Tagline": "Lema",
  "Take card payments": "Aceptar pagos con tarjeta",
  "Taken off every car after the first, because you unpack once. It never changes the price.":
    "Se le quita a cada carro después del primero, porque desempacas una sola vez. Nunca cambia el precio.",
  "Taking you to your dashboard…": "Llevándote a tu panel…",
  "Tap to add a detail": "Toca para agregar un dato",
  "Technical detail": "Detalle técnico",
  "Tell us the address and we do it — it takes a couple of minutes and it cannot be done from here.":
    "Dinos la dirección y nosotros lo hacemos — toma un par de minutos y no se puede hacer desde aquí.",
  "Test": "Prueba",
  "Text message": "Mensaje de texto",
  "Text": "Mensaje",
  "That card was refused.": "Esa tarjeta fue rechazada.",
  "That didn't load": "Eso no cargó",
  "The bit on the end of the link": "La parte del final del enlace",
  "The card fields above are Stripe's own — your number is sent straight to them and never reaches us.":
    "Los campos de la tarjeta de arriba son de Stripe — tu número se les manda directo a ellos y nunca llega a nosotros.",
  "The job": "El trabajo",
  "The last subscription ended after the payments stopped going through. Picking a plan below turns the page back on straight away — nothing was deleted and nothing is owed from before.":
    "La suscripción anterior terminó después de que los pagos dejaron de pasar. Escoger un plan abajo enciende la página de inmediato — no se borró nada y no se debe nada de antes.",
  "The money": "El dinero",
  "The month you have not paid for is still owed. Cancelling stops us trying the card for anything after it.":
    "El mes que no has pagado se sigue debiendo. Cancelar hace que dejemos de intentar la tarjeta por lo que venga después.",
  "The password for": "La contraseña de",
  "The phone number or email your Zelle is on":
    "El teléfono o correo donde tienes tu Zelle",
  "The question": "La pregunta",
  "The questions customers actually ask you. They go on your website — that part is still being built.":
    "Las preguntas que los clientes de verdad te hacen. Van en tu sitio web — esa parte todavía se está construyendo.",
  "The soonest a customer can book from right now.":
    "Lo más pronto que un cliente puede agendar desde ahorita.",
  "Their name, your logo, a": "Su nombre, tu logo, un",
  "Their own title in your business. Shown to them and in their invite.":
    "Su propio título en tu negocio. Se lo muestran a ellos y va en su invitación.",
  "Their time stays held until you answer, so a forgotten request holds a slot too.":
    "Su horario queda apartado hasta que respondas, así que una solicitud olvidada también aparta un espacio.",
  "Their time stays held while they decide, and nothing changes on the job until they accept.":
    "Su horario queda apartado mientras deciden, y nada cambia en el trabajo hasta que acepten.",
  "Their words, not yours.": "Sus palabras, no las tuyas.",
  "Then": "Después",
  "These go on a customer's booking confirmation, their reminder, and any invoice still owed. Never on a receipt for money already paid.":
    "Estos van en la confirmación de cita del cliente, en su recordatorio, y en cualquier factura pendiente. Nunca en un recibo de dinero ya pagado.",
  "They can change or cancel until": "Pueden cambiar o cancelar hasta",
  "This day": "Este día",
  "This far ahead of the appointment.": "Con esta anticipación a la cita.",
  "This link can’t take a booking yet.": "Este enlace todavía no puede tomar citas.",
  "Tick the box to continue": "Marca la casilla para continuar",
  "Timezone": "Zona horaria",
  "Timing": "Tiempos",
  "To pay now": "A pagar ahora",
  "To": "Hasta",
  "Travel areas": "Zonas de viaje",
  "Try again": "Inténtalo otra vez",
  "Try it": "Pruébalo",
  "Turn it off to stop new sign-ups. Anyone already on it stays on it.":
    "Apágalo para que nadie más se anote. Quien ya esté, se queda.",
  "Type it again": "Escríbela otra vez",
  "Type": "Tipo",
  "Un-cancel": "Descancelar",
  "Undo": "Deshacer",
  "Unpaid since": "Sin pagar desde",
  "Until": "Hasta",
  "Up front is a prepaid block — a year, or a set number of visits, paid in one go.":
    "Por adelantado es un bloque prepagado — un año, o un número fijo de visitas, pagado de una vez.",
  "Update card": "Actualizar tarjeta",
  "Use this color": "Usar este color",
  "Used to greet you on the Today screen.":
    "Se usa para saludarte en la pantalla de Hoy.",
  "Usually a subdomain like": "Normalmente un subdominio como",
  "Vacation, appointment…": "Vacaciones, cita…",
  "Value": "Valor",
  "Van in the shop…": "La camioneta en el taller…",
  "Vehicle size": "Tamaño de vehículo",
  "Vehicle sizes": "Tamaños de vehículo",
  "Visits each time": "Visitas cada vez",
  "Visits": "Visitas",
  "Water at the customer's address": "Agua en la dirección del cliente",
  "Ways to pay": "Formas de pago",
  "We could not use that code.": "No pudimos usar ese código.",
  "We switch it on at our end.": "Nosotros lo activamos de nuestro lado.",
  "Weeks, months or years": "Semanas, meses o años",
  "What Dana gets": "Lo que recibe Dana",
  "What a booking means": "Qué significa una cita",
  "What customers have said about your work. They go on your website — that part is still being built, so collect them now and they will be there when it lands.":
    "Lo que los clientes han dicho de tu trabajo. Van en tu sitio web — esa parte todavía se está construyendo, así que júntalas desde ahora y van a estar ahí cuando salga.",
  "What customers should know": "Lo que los clientes deben saber",
  "What has to happen": "Qué tiene que pasar",
  "What is it for": "Para qué es",
  "What is owed": "Qué se debe",
  "What kind": "De qué tipo",
  "What the customer sees": "Lo que ve el cliente",
  "What they pay": "Lo que pagan",
  "What they said": "Lo que dijeron",
  "What to call it": "Cómo llamarlo",
  "What was included": "Qué incluía",
  "What you call this role": "Cómo le llamas a este rol",
  "What you get": "Lo que recibes",
  "What you offer on a rhythm. You agree the price and the dates with the customer yourself — this remembers them and tells you who is owed a visit.":
    "Lo que ofreces con una periodicidad. El precio y las fechas los acuerdas tú con el cliente — esto los recuerda y te dice a quién le debes una visita.",
  "What you offer": "Lo que ofreces",
  "What you pay us": "Lo que nos pagas",
  "What you want to say": "Lo que quieres decir",
  "What you write": "Lo que escribes",
  "What your customers get": "Lo que reciben tus clientes",
  "What's included": "Qué incluye",
  "When it applies": "Cuándo aplica",
  "When someone books": "Cuando alguien agenda",
  "Where it came from": "De dónde vino",
  "Where the work happens": "Dónde se hace el trabajo",
  "Where this one can be done": "Dónde se puede hacer este",
  "Where your alerts go": "A dónde llegan tus avisos",
  "Who for": "Para quién",
  "Who is on a plan, and who is owed a visit nobody has booked yet.":
    "Quién está en un plan, y a quién le debes una visita que nadie ha agendado.",
  "Who said it": "Quién lo dijo",
  "Whose car": "De quién es el carro",
  "Why, in a sentence": "Por qué, en una frase",
  "Why": "Por qué",
  "Will show as": "Se va a ver como",
  "Write my own": "Escribir el mío",
  "Yelp review link": "Enlace de reseña de Yelp",
  "Yes, cancel it": "Sí, cancélala",
  "You add the address above. Done.": "Tú agregas la dirección de arriba. Listo.",
  "You declined this request.": "Rechazaste esta solicitud.",
  "You keep everything until {date}, and this month is not refunded.":
    "Conservas todo hasta el {date}, y este mes no se reembolsa.",
  "You pay": "Pagas",
  "You take cash on the day.": "Cobras en efectivo el mismo día.",
  "You will need a Stripe account. If you do not have one, Stripe makes it during this.":
    "Vas a necesitar una cuenta de Stripe. Si no tienes una, Stripe la crea en este mismo paso.",
  "Your address": "Tu dirección",
  "Your booking page is offline.": "Tu página de citas está fuera de línea.",
  "Your customers pay by card from their booking page, and the money goes straight to your own Stripe account — we never hold it. Stripe takes 2.9% + 30¢ of each payment.":
    "Tus clientes pagan con tarjeta desde su página de cita, y el dinero va directo a tu propia cuenta de Stripe — nosotros nunca lo tenemos. Stripe se queda con 2.9% + 30¢ de cada pago.",
  "Your day's jobs, sent once each morning.":
    "Los trabajos de tu día, una vez cada mañana.",
  "Your messages": "Tus mensajes",
  "Your name": "Tu nombre",
  "Your own words": "Tus propias palabras",
  "Your plans page": "Tu página de planes",
  "Your plans": "Tus planes",
  "Your price": "Tu precio",
  "Your working hours, buffers and future availability all follow the new timezone.":
    "Tu horario, tus espacios y tu disponibilidad futura siguen la nueva zona horaria.",
  // The placeholders. Every one is an EXAMPLE somebody types over, so each is
  // re-imagined for a Spanish-speaking detailer rather than transliterated —
  // a place name, a truck, a service. `e.g.` becomes `ej.`.
  "blank = one-off": "en blanco = una sola vez",
  "book.": "reserva.",
  "build.": "construcción.",
  "button and a way to stop getting these are added for you.":
    "y una forma de dejar de recibirlos se agregan solos.",
  "e.g. 2021 Tacoma": "ej. Tacoma 2021",
  "e.g. Apple Pay, or a check": "ej. Apple Pay, o un cheque",
  "e.g. Ceramic Pro annual inspection": "ej. Revisión anual de Ceramic Pro",
  "e.g. Do you need my water?": "ej. ¿Necesitas mi agua?",
  "e.g. Everything inside the car": "ej. Todo por dentro del carro",
  "e.g. F-150, Silverado, Ram": "ej. F-150, Silverado, Ram",
  "e.g. Fully covered on your property": "ej. Totalmente cubierto en tu propiedad",
  "e.g. Golf course flyer": "ej. Volante del campo de golf",
  "e.g. Interior": "ej. Interior",
  "e.g. Lakewood, California": "ej. Lakewood, California",
  "e.g. Licensed & insured": "ej. Con licencia y asegurado",
  "e.g. PO Box 214, Lakewood CA 90713": "ej. PO Box 214, Lakewood CA 90713",
  "e.g. Pet hair": "ej. Pelo de mascota",
  "e.g. Pickup truck": "ej. Camioneta",
  "e.g. Ridgeline Motors": "ej. Ridgeline Motors",
  "e.g. Spring Sale": "ej. Descuento de primavera",
  "e.g. Weekend rate": "ej. Tarifa de fin de semana",
  "e.g. Within 10 miles": "ej. Dentro de 10 millas",
  "e.g. book.yourdetailing.com": "ej. reserva.tudetallado.com",
  "iPhone opens it in Contacts; Android saves the file first.":
    "El iPhone lo abre en Contactos; Android guarda el archivo primero.",
  "in your setup — until then anyone who opens it is told you are still setting up.":
    "en tu configuración — hasta entonces, a quien lo abra se le dice que sigues configurando.",
  "logo": "logo",
  "name@example.com": "nombre@ejemplo.com",
  "off today": "de descuento hoy",
  "once": "una vez",
  "or": "o",
  "owed": "pendientes",
  "taken": "usadas",
  "to": "a",
  "where you work": "dónde trabajas",
  "your-handle, or paste your PayPal.Me link":
    "tu-usuario, o pega tu enlace de PayPal.Me",
  "yourdetailing.com. It has to be one you are not already using for something else.":
    "tudetallado.com. Tiene que ser uno que no estés usando ya para otra cosa.",
  "yourhandle": "tuusuario",
  "{months} months. Leaving early costs {percent}% of what is left.":
    "{months} meses. Salirte antes cuesta {percent}% de lo que queda.",
  "· charged": "· cobrado",
  "— not charged until they accept it.": "— no se cobra hasta que la acepten.",
  // The three default vehicle sizes and their examples. These are OFFERED as
  // a starting point and become the detailer's own words the moment they are
  // saved, so they arrive in the language the detailer is reading and are
  // never translated again afterwards.
  "Small": "Chico",
  "Medium": "Mediano",
  "Large": "Grande",
  "Coupe, sedan, hatchback": "Coupé, sedán, hatchback",
  "Small SUV, crossover, wagon": "SUV chica, crossover, camioneta",
  "Truck, large SUV, van": "Troca, SUV grande, van",
  "Remove \"{name}\"? Bookings already taken keep the size they were booked at.":
    "¿Quitar \"{name}\"? Las citas ya tomadas conservan el tamaño con el que se agendaron.",
  // Where a job happens, on every card and record in the product.
  "Mobile": "A domicilio",
  "Drop-off": "En el taller",
  // The three plan statuses.
  "Active": "Activo",
  "Paused": "En pausa",
  // Who somebody is, and what they can reach. `permissions.js` builds these
  // as sentences and takes `t` rather than reading the locale — it is shared
  // with the back office.
  "Everything.": "Todo.",
  "{list} and {last}.": "{list} y {last}.",
  "bookings": "las citas",
  "customers": "los clientes",
  "Signed in as {role}.": "Sesión iniciada como {role}.",
  "Sign in as {role}": "Entrar como {role}",
  "Switching…": "Cambiando…",
  "expires {date}": "vence el {date}",
  "Quoted {amount}": "Cotizado en {amount}",
  "Re-quote": "Volver a cotizar",
  // The four permission NOUNS, as they read inside that sentence.
  "the money": "el dinero",
  "booking requests": "las solicitudes de cita",
  "the settings": "los ajustes",
  "promotions": "las promociones",
  "These apply to {device} only. Sign in somewhere else and you can pick differently there.":
    "Estos aplican solo a {device}. Entra en otro lado y ahí puedes escoger distinto.",
  // How long since a customer was last in. Every plural is two keys.
  "{count} days ago": "hace {count} días",
  "{count} week ago": "hace {count} semana",
  "{count} weeks ago": "hace {count} semanas",
  "{count} month ago": "hace {count} mes",
  "{count} months ago": "hace {count} meses",
  "{count} year ago": "hace {count} año",
  "{count} years ago": "hace {count} años",
  "last visit {when}": "última visita {when}",
  "{count} visits": "{count} visitas",
  "{count} of {total} done": "{count} de {total} hechos",
  "Pending": "Pendiente",

  // ── ENGLISH THAT LIVED BETWEEN JSX EXPRESSIONS ──────────────────────────
  // Added 2026-09-08. Found by LOOKING at a Spanish dashboard, not by either
  // instrument: Today printed "1 done · 4 to go" in English while
  // `i18n-survey` (which reads string LITERALS) and `spanish-dom` (which
  // compares visible text against catalogue KEYS) both reported clean.
  // The shape is English broken into short fragments by `{...}` holes, and it
  // is invisible in English by construction. `scripts/i18n-fragments.mjs`
  // finds it now.
  "{done} done · {left} to go": "{done} hechos · faltan {left}",
  "Email these {n}": "Enviar correo a estos {n}",
  "Text these {n}": "Enviar mensaje a estos {n}",
  "Showing the {n} most recent — search for anyone older.": "Mostrando los {n} más recientes — busca a alguien de antes.",
  "You have {n} booked job coming up. Moving from {from} to {to} does not move any appointment — it still happens at the same moment — but the times shown will change.": "Tienes {n} cita agendada. Cambiar de {from} a {to} no mueve ninguna cita — sigue ocurriendo en el mismo momento — pero las horas que se muestran cambiarán.",
  "You have {n} booked jobs coming up. Moving from {from} to {to} does not move any appointment — each one still happens at the same moment — but the times shown will change.": "Tienes {n} citas agendadas. Cambiar de {from} a {to} no mueve ninguna cita — cada una sigue ocurriendo en el mismo momento — pero las horas que se muestran cambiarán.",
  "Bring your own water and power": "Trae tu propia agua y electricidad",
  "Bring your own water": "Trae tu propia agua",
  "Bring your own power": "Trae tu propia electricidad",
  "Send to {n}": "Enviar a {n}",
  ", including {n} extra item": ", incluyendo {n} artículo extra",
  ", including {n} extra items": ", incluyendo {n} artículos extra",
  "If we have an account for {email}, the link is on its way. Check spam if it is not there in a minute.": "Si tenemos una cuenta para {email}, el enlace va en camino. Revisa el spam si no llega en un minuto.",
  "Nothing recorded yet.": "Aún no hay nada registrado.",
  "Nothing recorded in {period}.": "No hay nada registrado en {period}.",
  "Apply to {n} day": "Aplicar a {n} día",
  "Apply to {n} days": "Aplicar a {n} días",
  "Your subscription ends on {date}. Until then nothing changes.": "Tu suscripción termina el {date}. Hasta entonces no cambia nada.",
  "The {amount} early-exit fee has already been charged and is not refunded if you restart.": "El cargo de {amount} por salida anticipada ya se cobró y no se reembolsa si vuelves a empezar.",

  // --- REVIEW 2026-09-11, ITEMS 7 AND 9 -------------------------------------
  // The by-hand booking sheet grew from eleven fields to twenty-one, and
  // Tracking links grew a per-row stats panel. Every string added in the same
  // change as its Spanish, because this catalogue is keyed on the ENGLISH text
  // and a missing key shows English on a Spanish screen with no error
  // anywhere.

  // Tracking links — the screen's own name and the four figures in the panel.
  "opened": "lo abrieron",
  "booked": "reservaron",
  "booking rate": "tasa de reserva",
  "earned": "ganado",
  "Last opened {when}. Earned counts finished jobs only.": "Se abrió por última vez el {when}. Lo ganado cuenta solo los trabajos terminados.",
  "Nobody has opened this link yet.": "Nadie ha abierto este enlace todavía.",
  "Everyone who opens it gets {code}.": "Quien lo abre recibe {code}.",

  // New booking, by hand.
  "Search a customer who has booked before, or type in a new one.": "Busca un cliente que ya haya reservado, o escribe uno nuevo.",
  "Use a different customer": "Usar otro cliente",
  "Name or phone": "Nombre o teléfono",
  "Search": "Buscar",
  "Nobody by that name yet.": "Todavía no hay nadie con ese nombre.",
  "On {plan}. The plan price is applied automatically.": "En {plan}. El precio del plan se aplica automáticamente.",
  "a monthly plan": "un plan mensual",
  "Email (optional)": "Correo (opcional)",
  "Send their emails in": "Enviar sus correos en",
  "Vehicle": "Vehículo",
  "Make and model (optional)": "Marca y modelo (opcional)",
  "How many cars": "Cuántos carros",
  "Car {n} size": "Tamaño del carro {n}",
  "Car {n} model": "Modelo del carro {n}",
  "Condition": "Condición",
  "Location": "Ubicación",
  "Travel zone": "Zona de viaje",
  "Water on site": "Agua en el lugar",
  "Power on site": "Electricidad en el lugar",
  "Pick a service and the open times appear.": "Elige un servicio y aparecen las horas libres.",
  "Price and notes": "Precio y notas",
  "Promo code (optional)": "Código de descuento (opcional)",
  "Checking…": "Comprobando…",
  "Applied.": "Aplicado.",
  "That code cannot be used.": "Ese código no se puede usar.",
  "Note from the customer (optional)": "Nota del cliente (opcional)",
  "Private note": "Nota privada",
  "Travel — {zone}": "Viaje — {zone}",
  "Travel": "Viaje",
  "Promo {code}": "Descuento {code}",
  "Total": "Total",
  "Booking…": "Reservando…",
  // The plain-language pass, 2026-09-11 — his second rejection of the same
  // blurb. Voice, not content: short declarative sentences, no em dash, no
  // opening flourish. docs/sessions/product.md has the rule.
  "Set up the plans you sell. This page tracks who is on each one and how many visits they still have coming. You collect payment yourself.": "Configura los planes que vendes. Esta página lleva la cuenta de quién está en cada uno y cuántas visitas le faltan. Tú cobras el pago por tu cuenta.",
  "Make a separate booking link for a flyer, a QR code or a post. Anyone who uses it gets the discount applied automatically. This page shows how many bookings each link brought in.": "Crea un enlace de reserva aparte para un volante, un código QR o una publicación. A quien lo use se le aplica el descuento automáticamente. Esta página muestra cuántas reservas trajo cada enlace.",
  "New plan": "Plan nuevo",
  "Edit plan": "Editar plan",
  // REVIEW ITEM 11, 2026-09-11 — the pill editor. Four new details a
  // detailer can drop into a text, their chip labels, and the plain-English
  // meaning each chip carries as its title.
  "These are the texts you send from a job. Tap a detail to add it. Each one fills itself in from the booking when you send the message.": "Estos son los mensajes que envías desde un trabajo. Toca un dato para agregarlo. Cada uno se completa solo con la reserva cuando envías el mensaje.",
  "What they booked": "Lo que reservó",
  "Their car": "Su carro",
  "Your phone": "Tu teléfono",
  "Link to their booking": "Enlace a su reserva",
  "what they booked": "lo que reservó",
  "the car": "el carro",
  "your phone number": "tu número de teléfono",
  "a link to their booking": "un enlace a su reserva",
};
