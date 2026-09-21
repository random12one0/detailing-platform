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
  "About you": "Sobre ti",
  "Allowed once per device. Your browser will ask you first.": "Se permite una vez por dispositivo. Tu navegador te preguntará primero.",
  "Ask whoever invited you to send a new link.":
    "Pídele a quien te invitó que te envíe un enlace nuevo.",
  "Blocked for this site": "Bloqueado para este sitio",
  "Choose a file": "Elegir un archivo",
  "Contact email": "Correo de contacto",
  "Cover photo": "Foto de portada",
  "Currently {zone} ({offset})": "Actualmente {zone} ({offset})",
  "Customers can only pick times inside these hours. If you close a day here, nobody can book it.":
    "Los clientes solo pueden elegir horas dentro de este horario. Si cierras un día aquí, nadie puede reservarlo.",
  "Every time on your booking page means this zone.": "Cada hora de tu página de reservas está en esta zona.",
  "Get an alert on your phone when a booking comes in. It works when the dashboard is closed.":
    "Recibe un aviso en tu teléfono cuando entre una cita. Funciona aunque el panel esté cerrado.",
  "Go to sign in": "Ir a iniciar sesión",
  "How customers reach you": "Cómo te contactan los clientes",
  "Logo and cover photo": "Logo y foto de portada",
  // ROADMAP 4.2, 2026-09-13 — the blurb leads with the answer now, and the
  // discount moved down beside its own field. The old sentence is gone.
  "Each link counts how many people opened it and how many of them booked. Make one for every place you advertise, then post that link instead of your normal booking link.":
    "Cada enlace cuenta cuántas personas lo abrieron y cuántas de ellas reservaron. Crea uno para cada lugar donde te anuncies y publica ese enlace en vez de tu enlace de reservas normal.",
  "Make a link": "Crear un enlace",
  "Discount to apply (optional)": "Descuento a aplicar (opcional)",
  "You have no active discount codes yet. Make one on Promo codes and sale and it will show up here.":
    "Todavía no tienes códigos de descuento activos. Crea uno en Códigos y descuentos y aparecerá aquí.",
  "Mobile means you drive to the customer. Drop-off means they come to you. You can offer both. This is the first question your booking page asks.":
    "A domicilio significa que tú vas al cliente. En tu taller significa que el cliente viene a ti. Puedes ofrecer ambos. Esta es la primera pregunta de tu página de reservas.",
  "None": "Ninguno",
  "Never": "Nunca",
  "Any time": "Cualquier momento",
  "Custom": "Personalizado",
  "Less": "Menos",
  "More": "Más",
  "Custom value in {unit}": "Valor personalizado en {unit}",
  "Not filled in": "Sin completar",
  "Off for this device": "Apagado en este dispositivo",
  "On for this device": "Encendido en este dispositivo",
  "Only you see these": "Solo tú ves esto",
  "Pick one color. It is used on your booking page and in this dashboard. Most detailers use the color already on their van or their cards.":
    "Elige un color. Se usa en tu página de reservas y en este panel. La mayoría usa el color que ya está en su camioneta o en sus tarjetas.",
  "Printed at the bottom of marketing email you send. The law asks for it.": "Se imprime al pie del correo de marketing que envías. La ley lo exige.",
  "Service area": "Zona de servicio",
  "Shown on your site.": "Se muestra en tu sitio.",
  "That is not your current password.": "Esa no es tu contraseña actual.",
  "The questions customers ask you most often. Answer them here and you get fewer texts asking the same thing.":
    "Las preguntas que más te hacen los clientes. Respóndelas aquí y recibirás menos mensajes preguntando lo mismo.",
  "The services you add here show on your booking page at the price you set. Add-ons are extras a customer can add to a service.":
    "Los servicios que agregues aquí aparecen en tu página de reservas al precio que pongas. Los extras son adicionales que un cliente puede sumar a un servicio.",
  "These are the texts you send from a job, like on my way or all done. Write them once here. On the day, you just choose one.":
    "Estos son los mensajes que envías desde un trabajo, como voy en camino o ya terminé. Escríbelos una vez aquí. El día del trabajo es un solo toque.",
  "Turn it on again on any other phone or computer you want the alerts on.": "Actívalo de nuevo en cualquier otro teléfono o computadora donde quieras los avisos.",
  "Turn notifications back on for this site in your browser settings, then come back here.": "Vuelve a activar las notificaciones para este sitio en la configuración de tu navegador y regresa aquí.",
  "Turn off on this device": "Apagar en este dispositivo",
  "Turn on push notifications": "Activar notificaciones push",
  "Turn on the ways you take money. A customer sees these on their booking so they know what to bring.":
    "Activa las formas en que cobras. Un cliente las ve en su reserva para saber qué llevar.",
  "Type in reviews customers have already given you somewhere else. Nothing is imported automatically. You decide which ones to show.":
    "Escribe las reseñas que los clientes ya te dieron en otro lugar. No se importa nada automáticamente. Tú decides cuáles mostrar.",
  "Where we email you about new bookings.": "Adonde te escribimos sobre reservas nuevas.",
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
  // The surcharge rules read back as sentences. Each is ONE key with
  // placeholders, never English glued around a value — Spanish puts "on" and
  // "within" somewhere else, so the pieces cannot be translated separately.
  "{amount} when booked within the hour": "{amount} si se agenda dentro de la hora",
  "{amount} when booked within {hours} hours": "{amount} si se agenda dentro de {hours} horas",
  "{amount} on {days}": "{amount} los {days}",
  "{amount} on {days}, {from}–{to}": "{amount} los {days}, {from}–{to}",
  "You take bookings {notice} ahead but close changes {change} ahead, so every new booking is locked as soon as it's made.":
    "Tomas citas con {notice} de anticipación pero cierras los cambios con {change}, así que cada cita nueva queda bloqueada en cuanto se hace.",
  // ROADMAP 9.11 — the example and the one-click fix for the warning above.
  "For example: the earliest a customer can book — {notice} from now — already falls inside your {change} change window, so they would have to call you the moment they book.":
    "Por ejemplo: la cita más próxima que un cliente puede agendar — dentro de {notice} — ya queda dentro de tu ventana de cambios de {change}, así que tendría que llamarte en cuanto agende.",
  "Allow changes until {hours} instead": "Permitir cambios hasta {hours} en su lugar",
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
  "Platform view · signed in as {who}. Anything you change is theirs.":
    "Vista de plataforma · sesión iniciada como {who}. Todo lo que cambies es de ellos.",

  // ── TODAY ────────────────────────────────────────────────────────────────
  // The screen a detailer opens first and looks at most. `{when}, {name}` is
  // one key rather than `greeting + ", " + name` because the comma is
  // English's idea of where it goes.
  "Morning": "Buenos días",
  "Afternoon": "Buenas tardes",
  "Evening": "Buenas noches",
  "{n} booked": "{n} reservaron",
  "{n} opened": "{n} lo abrieron",
  "{when}, {name}": "{when}, {name}",
  "nothing booked": "nada agendado",
  "{left} of {total} still to do": "{left} de {total} por hacer",
  "Jobs today": "Trabajos de hoy",
  // WEATHER PER BOOKING — 2026-09-13. The NWS's own words for the sky are NOT
  // in here on purpose — they arrive in English from a US government service
  // and a catalogue entry for them would be us inventing a forecast.
  // (The old "Show today’s weather" and "{pct}% rain" went with the line under
  // the date; Andrew asked for weather ON A BOOKING instead.)
  "{pct}% chance of rain": "{pct}% de probabilidad de lluvia",
  // The six kinds, their shipped wording, and the settings screen.
  "Thunderstorms": "Tormentas eléctricas",
  "Rain": "Lluvia",
  "Snow or ice": "Nieve o hielo",
  "High wind": "Viento fuerte",
  "Too hot": "Demasiado calor",
  "Too cold": "Demasiado frío",
  "Weather warnings": "Avisos del clima",
  "{count} of {total} on": "{count} de {total} activados",
  "Nothing": "Nada",
  "Each booking shows the forecast for its own date and address. These decide when it also gets a warning.":
    "Cada reserva muestra el pronóstico de su propia fecha y dirección. Esto decide cuándo además recibe un aviso.",
  "The sky": "El cielo",
  "Only when the chance is at least this high.": "Solo cuando la probabilidad llegue a esto.",
  "Chance of rain": "Probabilidad de lluvia",
  "Wind speed": "Velocidad del viento",
  "Temperature": "Temperatura",
  "Both are in Fahrenheit, and both are about the person doing the work rather than the car.":
    "Ambos están en Fahrenheit y ambos tratan de la persona que hace el trabajo, no del carro.",
  "Warn when it is hotter than": "Avisar cuando haga más calor que",
  "Warn when it is hot": "Avisar cuando haga calor",
  "Hot above": "Calor por encima de",
  "Warn when it is colder than": "Avisar cuando haga más frío que",
  "Warn when it is cold": "Avisar cuando haga frío",
  "Cold below": "Frío por debajo de",
  "Your own wording": "Sus propias palabras",
  "{count} changed": "{count} cambiadas",
  "The wording we ship": "Las palabras que traemos",
  "Leave a box empty to use ours. {temp} becomes the temperature.":
    "Deje una casilla vacía para usar las nuestras. {temp} se convierte en la temperatura.",
  "Save weather warnings": "Guardar avisos del clima",
  "Expected": "Esperado",
  "{amount} collected": "{amount} cobrado",
  "Nothing collected yet": "Aún no has cobrado nada",
  // The phone's two money cells. Lower case on purpose — they sit under a
  // figure as `.lbl`, not as a section eyebrow, and Spanish does not
  // capitalise a common noun mid-phrase any more than this English does.
  "expected": "esperado",
  "collected": "cobrado",
  "Still to do": "Por hacer",
  // The day's three run labels. "Needs payment · N" was raw JSX text until
  // 2026-09-13 and printed English on a Spanish dashboard with both i18n
  // checks clean, which is the failure the desk ledger's own comment warns
  // about one screen away.
  "Needs payment · {count}": "Falta cobrar · {count}",
  // The lit job's state, and the only two it has. Read off the booking's own
  // clock, never off its position in a list.
  "Happening now": "Ahora mismo",
  "Up next": "Sigue",
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
  "Nobody can book yet. Your page has no services on it.":
    "Nadie puede agendar todavía. Tu página no tiene servicios.",
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
  // **THEY SAID "Neto" AND SO DID THE ENGLISH, AND BOTH WERE READ AS "KEPT"
  // — ROADMAP 5.1, settled by 14.7.** The figure is everything finished in the
  // period less expenses, paid for or not; on the demo business it read $295
  // more than the cash. "Ganado menos gastos" is what it is and cannot be read
  // as money in a bank account. The demonstrative still agrees with the noun's
  // gender, which is why these are nine keys and not one with a placeholder.
  "Earned less expenses this week": "Ganado menos gastos, esta semana",
  "Earned less expenses this month": "Ganado menos gastos, este mes",
  "Earned less expenses, these 6 months": "Ganado menos gastos, estos 6 meses",
  "Earned less expenses this year": "Ganado menos gastos, este año",
  "Earned less expenses that week": "Ganado menos gastos, esa semana",
  "Earned less expenses that month": "Ganado menos gastos, ese mes",
  "Earned less expenses, those 6 months": "Ganado menos gastos, esos 6 meses",
  "Earned less expenses that year": "Ganado menos gastos, ese año",
  "Earned less expenses, all time": "Ganado menos gastos, desde siempre",
  "Same as last week": "Igual que la semana pasada",
  "Same as last month": "Igual que el mes pasado",
  "Same as the 6 months before": "Igual que los 6 meses anteriores",
  "Same as last year": "Igual que el año pasado",
  "vs {amount} last week": "vs {amount} la semana pasada",
  "vs {amount} last month": "vs {amount} el mes pasado",
  "vs {amount} the 6 months before": "vs {amount} los 6 meses anteriores",
  "vs {amount} last year": "vs {amount} el año pasado",
  // ROADMAP 5.2 — the same eight sentences again, for a period that has not
  // finished. Trimming the comparison to the same point is what makes the
  // number honest; these are what make it READ honest.
  "Same as this point last week": "Igual que en este punto de la semana pasada",
  "Same as this point last month": "Igual que en este punto del mes pasado",
  "Same as this point in the 6 months before": "Igual que en este punto de los 6 meses anteriores",
  "Same as this point last year": "Igual que en este punto del año pasado",
  "vs {amount} at this point last week": "vs {amount} en este punto de la semana pasada",
  "vs {amount} at this point last month": "vs {amount} en este punto del mes pasado",
  "vs {amount} at this point in the 6 months before": "vs {amount} en este punto de los 6 meses anteriores",
  "vs {amount} at this point last year": "vs {amount} en este punto del año pasado",
  "Changes are against the same point in the period before.":
    "Los cambios se comparan con el mismo punto del periodo anterior.",
  "No comparison yet": "Aún no hay con qué comparar",
  "Time range": "Periodo",
  "Previous period": "Periodo anterior",
  "Next period": "Periodo siguiente",
  // **"Cobrado" MEANS MONEY RECEIVED, AND NOW THERE IS A FIGURE THAT IS
  // ACTUALLY THAT** — ROADMAP 14.7. The note that stood here said the key had
  // gone with its last call site because no figure on the screen deserved the
  // word. One does now: `Collected` is the paid-only total, and it sits beside
  // `Still owed` under `Earned`, which is the accrual one. So three keys where
  // there was one, and they are three different amounts on purpose.
  // `"Charged": "Cobrado"` further down is a different word for a different
  // thing and is untouched.
  "Earned": "Ganado",
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
  "Add a fleet job": "Agregar trabajo de flotilla",
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
  // THE ANSWER STRIP. "gone quiet" is lower case on purpose — it is a `.lbl`
  // under a figure, the same register as "visits" and "lifetime", and Spanish
  // does not capitalise a common noun phrase either.
  "gone quiet": "sin venir",
  "Show the {count} who have gone quiet": "Ver los {count} que no han vuelto",
  "Sort by most spent": "Ordenar por más gastado",
  "{name} spends most": "{name} es quien más gasta",
  "Everyone has been in within three months.": "Todos han venido en los últimos tres meses.",
  "No customers yet. They appear on their own when bookings come in.":
    "Aún no hay clientes. Aparecen solos cuando entran las citas.",
  "Last visit": "Última visita",
  // ROADMAP 9.7 — the most recent visit's vehicle and address, drawn from
  // history already in state. "Last", not bare "Vehicle"/"Address": a
  // customer can have more than one car across their history.
  "Last vehicle": "Último vehículo",
  "Last address": "Última dirección",
  "No completed visits yet": "Aún no hay visitas terminadas",
  "lifetime": "en total",
  // ROADMAP 9.6 — the list row's own figure caption, same two words the
  // record's ledger already uses two taps away ("visit" / "visits" there
  // is bare English with no t() wrapper, a separate pre-existing gap not
  // touched by this edit).
  "visit": "visita",
  "visits": "visitas",
  "Plan": "Plan",
  "On a plan": "En un plan",
  "Notes": "Notas",
  "Gate code, dog's name, preferences…": "Código del portón, nombre del perro, preferencias…",
  "Nothing booked yet.": "Nada agendado todavía.",

  // ROADMAP 14.3 — the emails we sent this customer, and what became of them.
  "Emails": "Correos",
  "No emails sent to this address yet.": "Todavía no se han enviado correos a esta dirección.",
  "most recent.": "más recientes.",
  "Delivered": "Entregado",
  "On its way": "En camino",
  "Bounced": "Rebotó",
  "Marked as spam": "Marcado como spam",
  "Refused": "Rechazado",
  // "Our" is the PLATFORM's limit, not the detailer's — the Spanish has to keep
  // that, or a detailer reads it as a limit they set themselves.
  "Not sent — our daily limit": "No se envió — límite diario nuestro",
  "Not sent": "No se envió",
  "Call": "Llamar",
  "Send this to the next person who asks.": "Manda esto a la próxima persona que pregunte.",
  "This address bounced. The last email to it was refused, so check it with them or call instead.":
    "Este correo rebotó. El último mensaje fue rechazado. Confírmalo con ellos, o mejor llama.",
  // ROADMAP 14.4 — the refund instruction on a cancelled job that was paid.
  // **"tu propio Stripe" carries the whole point**: the money is in the
  // detailer's account and not in ours, which is why the product is asking
  // rather than doing it. A translation that said only *"devuelve el dinero"*
  // would read as an instruction with no explanation of why it falls to them.
  // `{amount}` is formatted by `money()` before it arrives, so the figure is
  // already `$195.00` and the placeholder must survive — spanish.test.mjs
  // compares the placeholder sets.
  "This was paid. Refund {amount} from your own Stripe. The money went straight into your account, so we cannot send it back for you.":
    "Esto ya estaba pagado. Devuelve {amount} desde tu propio Stripe. El dinero entró directo a tu cuenta, así que nosotros no podemos devolverlo por ti.",
  "Part of this was paid. Refund what they paid from your own Stripe. The money went straight into your account, so we cannot send it back for you.":
    "Una parte de esto ya estaba pagada. Devuelve lo que pagaron desde tu propio Stripe. El dinero entró directo a tu cuenta, así que nosotros no podemos devolverlo por ti.",
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
  "Visits due": "Visitas pendientes",
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
  // Its group headings and the live summary under every row.
  // REGROUPED 2026-09-13 — four jobs rather than three categories. The two
  // retired headings stay keyed: nothing renders them today, but a key nobody
  // asks for costs nothing and a MISSING one shows English with no error.
  "What customers see": "Lo que ven los clientes",
  "What you charge for": "Lo que cobras",
  "Where customers come from": "De dónde vienen los clientes",
  "Your page": "Tu página",
  "What you sell": "Lo que vendes",
  "When you can be booked": "Cuándo te pueden agendar",
  // The "Finish setting up" row names the next unfinished step.
  "Next: {name}": "Siguiente: {name}",
  "Used everywhere, including here": "Se usa en todos lados, incluso aquí",
  "Nothing from a customer yet": "Nada de un cliente todavía",
  "Nothing tracked yet": "Nada rastreado todavía",
  "Nothing to sell · your booking page is empty":
    "Nada que vender · tu página de citas está vacía",
  "Not offering one": "No ofreces ninguno",
  "Nothing scheduled": "Nada programado",
  "No days set · nobody can book": "Sin días abiertos · nadie puede agendar",
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
  "{visits}, none due": "{visits}, ninguna pendiente",
  "{visits} coming up": "{visits} por venir",
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
  // ROADMAP 5.4. "{count} open(s)" above is no longer drawn anywhere — the
  // Tracking links row counts PEOPLE on live links now. Kept rather than
  // deleted: a key nobody reads costs nothing, and a missing one falls back
  // to English with no error anywhere.
  "{count} person": "{count} persona",
  "{count} people": "{count} personas",
  "{links} · {people} so far": "{links} · {people} hasta ahora",
  "{links} · not opened yet": "{links} · sin aperturas todavía",
  "{count} service": "{count} servicio",
  "{count} services": "{count} servicios",
  "{count} add-on": "{count} extra",
  "{count} add-ons": "{count} extras",
  "{count} member": "{count} miembro",
  "{count} members": "{count} miembros",
  "{count} plan": "{count} plan",
  "{count} plans": "{count} planes",
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
  "Unpaid · your page is offline": "Sin pagar · tu página está fuera de línea",
  "A payment did not go through": "Un pago no se completó",
  "Ending · no further charges": "Terminando · no habrá más cargos",
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
  "If you can be flexible on the day, message us. We often have cancellations.":
    "Si puedes ser flexible con el día, escríbenos. Seguido tenemos cancelaciones.",
  "Appointment reminder": "Recordatorio de cita",
  "Before the job. Timing is set in Booking rules.":
    "Antes del trabajo. El tiempo se ajusta en Reglas de citas.",
  "Please leave the car unlocked and move it out of the garage if you can.":
    "Por favor deja el carro abierto y sácalo del garaje si puedes.",
  "We'll need access to a faucet and an outlet. If that's a problem, let us know and we'll bring our own.":
    "Vamos a necesitar una llave de agua y un tomacorriente. Si eso es problema, avísanos y llevamos los nuestros.",
  "Second reminder": "Segundo recordatorio",
  "Only if you've switched the second one on.": "Solo si activaste el segundo.",
  "See you shortly. We're on schedule.": "Nos vemos pronto. Vamos a tiempo.",
  "Rescheduled": "Reagendada",
  "When a booking moves.": "Cuando una cita se mueve.",
  "Sorry for the change. Everything else about the job stays the same.":
    "Perdón por el cambio. Todo lo demás del trabajo sigue igual.",
  "When a booking is called off.": "Cuando se cancela una cita.",
  "No hard feelings. Book again any time and we'll fit you in.":
    "Sin problema. Agenda otra vez cuando quieras y te acomodamos.",
  "Receipt": "Recibo",
  "After the job is paid.": "Después de que se paga el trabajo.",
  "Thanks for your business. Keep this for your records.":
    "Gracias por tu preferencia. Guarda esto para tus registros.",
  "Invoice": "Factura",
  "When there's still something owed.": "Cuando todavía se debe algo.",
  "Payment can be cash, card or Zelle, whichever is easiest.":
    "El pago puede ser en efectivo, tarjeta o Zelle, lo que te sea más fácil.",
  "Thank-you and review request": "Agradecimiento y reseña",
  "After you record payment.": "Después de que registras el pago.",
  "If anything isn't right, tell us first. We'd rather fix it than read about it.":
    "Si algo no está bien, dinos primero. Preferimos arreglarlo a leerlo después.",
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
  "You carry your own, so the customer is never asked about {what}.":
    "Tú llevas el tuyo, así que nunca se le pregunta al cliente por {what}.",
  "The booking page asks about {what} and records the answer, so you know what to load.":
    "La página de citas pregunta por {what} y guarda la respuesta, para que sepas qué cargar.",
  "The booking page asks about {what}, and a customer who can't provide it is blocked from booking.":
    "La página de citas pregunta por {what}, y un cliente que no lo tenga no puede agendar.",
  "a power outlet": "un tomacorriente",
  // The other half of the pair above. It rendered as the bare English word
  // inside a Spanish sentence — "La página de citas pregunta por water" —
  // because only one of the two `HELP()` callers had a key.
  "water": "el agua",
  "Add an area": "Agregar una zona",
  "Add a surcharge": "Agregar un recargo",
  "car": "carro",
  "cars": "carros",
  "the calendar": "el calendario",
  "A {hours}-hour gap between jobs means very few slots each day.":
    "Un espacio de {hours} horas entre trabajos deja muy pocos horarios al día.",
  "Nobody will be able to book sooner than {days} days out.":
    "Nadie podrá agendar con menos de {days} días.",
  "Customers can only book a few days ahead.":
    "Los clientes solo pueden agendar con pocos días de anticipación.",
  "Very fine slot grid · the time picker will be crowded.":
    "Intervalos muy chicos · el selector de hora se va a ver saturado.",
  "Very coarse slot grid · few start times will be offered.":
    "Intervalos muy grandes · se van a ofrecer pocas horas de inicio.",
  "That cap is unusual. Double-check it's what you want.":
    "Ese tope es poco común. Revisa que sea lo que quieres.",
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
  "Booked on its own · nothing else can be added":
    "Se agenda solo · no se le puede agregar nada más",
  "Customers pick one": "Los clientes escogen uno",
  "Customers pick any number": "Los clientes escogen los que quieran",
  "You already have a category with that name.":
    "Ya tienes una categoría con ese nombre.",
  "Category deleted.": "Categoría eliminada.",
  "Vehicle sizes saved.": "Tamaños de vehículo guardados.",
  "Saved.": "Guardado.",
  "{count} service is in this category. Deleting it keeps them. They just stop being grouped. Continue?":
    "{count} servicio está en esta categoría. Al eliminarla se quedan. Solo dejan de estar agrupados. ¿Continuar?",
  "{count} services are in this category. Deleting it keeps them. They just stop being grouped. Continue?":
    "{count} servicios están en esta categoría. Al eliminarla se quedan. Solo dejan de estar agrupados. ¿Continuar?",
  "This is your base size. Every price you set is the price for this one.":
    "Este es tu tamaño base. Cada precio que pongas es el precio para este.",
  "You set what this size adds, per service, in each service's own screen.":
    "Lo que este tamaño agrega lo pones, por servicio, en la pantalla de cada servicio.",
  "Choosing anything in here clears everything else. Use it for a complete package that already includes your other services.":
    "Escoger algo de aquí borra todo lo demás. Úsalo para un paquete completo que ya incluye tus otros servicios.",
  "Customers can combine these with services from your other categories.":
    "Los clientes pueden combinar estos con servicios de tus otras categorías.",
  "Customers see \"from {amount}\".": "Los clientes ven \"desde {amount}\".",
  "Customers read this as a firm quote.":
    "Los clientes leen esto como un precio en firme.",
  "What's included (one per line)": "Qué incluye (uno por línea)",
  "Hand wash and dry\nClay bar decontamination\nMachine polish\nSix-month sealant":
    "Lavado y secado a mano\nDescontaminación con barra de arcilla\nPulido a máquina\nSellador de seis meses",
  "Wherever you work · the customer chooses.":
    "Donde sea que trabajes · el cliente escoge.",
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
  "Somebody asked for a time. Nothing is confirmed until you answer.":
    "Alguien pidió una hora. Nada queda confirmado hasta que respondas.",
  "When a job is done, this is where the money gets written down.":
    "Cuando se termina un trabajo, aquí es donde se anota el dinero.",
  "Week, month, year: every figure on this screen follows this.":
    "Semana, mes, año: cada cifra de esta pantalla sigue esto.",
  "What is left after expenses, not what came in.":
    "Lo que queda después de gastos, no lo que entró.",
  "One file for your accountant, for whatever period you are looking at.":
    "Un archivo para tu contador, del periodo que estés viendo.",
  "Open somebody to see everything they have ever booked.":
    "Abre a alguien para ver todo lo que ha agendado.",
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
  // ── THE FOUR EXPENSE CATEGORIES — 2026-09-12 ─────────────────────────────
  // **THE PRODUCT CASES THESE FOR DISPLAY, WHICH IS WHAT PROVES THEY ARE
  // OURS.** The reviewer's own reasoning: the same four render lowercase in
  // the Money list and title-cased under A DÓNDE SE FUE, so a stylesheet is
  // deciding how they look. A detailer's own typing would not be cased by
  // anybody. `ExpenseModal.jsx` holds the list and it is a fixed five.
  //
  // **LOWERCASE KEYS, BECAUSE THE STORED VALUE IS LOWERCASE.** The capital
  // letters on the advanced screen come from `.advmeter.cap`, not from the
  // data, so translating the stored token is the only place this belongs.
  //
  // AND "other" IS A DOOR TO THE DETAILER'S OWN WORDS: choosing it stores
  // whatever he typed as the category. `t()` returns a string it has never
  // seen unchanged, so his typing passes through untranslated, which is the
  // rule — our copy is ours, his is his.
  // The five expense categories are NOT here. They are a token table in
  // `ExpenseModal.jsx` carrying both languages, because this catalogue is keyed
  // on the English and the word *Other* is already spoken for by the website
  // intake form, which needs it capitalised. That file's header has the whole
  // reasoning; `FOUND.md` records that an audit of this file cannot see them.
  // ── WHAT A BROWSER WALK IN SPANISH FOUND, 2026-09-12 ─────────────────────
  // Every one of these rendered in English with the toggle set to Spanish,
  // and every one is invisible to `i18n-coverage.mjs`: a bare literal, or a
  // `t()` whose argument is a variable. Only looking found them.
  "Report a problem": "Reportar un problema",
  "Something broken, confusing or missing": "Algo roto, confuso o que falta",
  "a month": "al mes",
  "a year": "al año",
  "Something not right with a charge?": "¿Algo no está bien con un cargo?",
  "Waiting on payment": "Esperando el pago",
  "{n} have not been in for 3 months": "{n} no han venido en 3 meses",
  "1 has not been in for 3 months": "1 no ha venido en 3 meses",
  // **FIVE INVOICE WORDS `t()` COULD NOT BE SEEN HOLDING.** `Billing.jsx` calls
  // `t(INVOICE_WORDS[inv.status])`, so the argument is a variable and the
  // coverage script says so about itself: it reads a literal first argument
  // and nothing else. Two of the five carried a label-separator em dash.
  "Not paid yet": "Sin pagar todavía",
  "Cancelled · nothing owed": "Cancelada · no se debe nada",
  "Written off · nothing owed": "Cancelada por incobrable · no se debe nada",
  "Not sent yet": "Sin enviar todavía",
  "Not paid": "Sin pagar",
  "A member rate with no set visits. They book when they like.":
    "Una tarifa de socio sin visitas fijas. Reservan cuando quieren.",
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
  "Drop-offs only · no mobile jobs": "Solo en el taller · nada a domicilio",
  "Mobile only · no drop-offs": "Solo a domicilio · nada en el taller",
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
  "Invite sent to {email}. It expires in 7 days.":
    "Invitación enviada a {email}. Vence en 7 días.",
  "Invite created for {email}. Email is not configured yet, so send them the link below.":
    "Invitación creada para {email}. El correo todavía no está configurado, así que mándales el enlace de abajo.",
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
  "Hi {{customer_name}}, this is {{business_name}}. I'm on my way and should be with you shortly.":
    "Hola {{customer_name}}, habla {{business_name}}. Voy en camino y llego contigo en un rato.",
  "Running late": "Voy retrasado",
  "Hi {{customer_name}}, running about 15 minutes behind on my way to you. Sorry for the wait. See you at {{address}} shortly.":
    "Hola {{customer_name}}, voy unos 15 minutos retrasado camino a ti. Perdón por la espera. Nos vemos en {{address}} en un rato.",
  "Confirm tomorrow": "Confirmar mañana",
  "Hi {{customer_name}}, confirming your detail on {{date}} at {{time}}. Reply here if anything's changed.":
    "Hola {{customer_name}}, confirmo tu detallado el {{date}} a las {{time}}. Responde aquí si algo cambió.",
  "Job finished": "Trabajo terminado",
  "All finished, {{customer_name}}. Thanks for choosing {{business_name}}. Total is {{total}}.":
    "Todo listo, {{customer_name}}. Gracias por elegir a {{business_name}}. El total es {{total}}.",
  "Ask about access": "Preguntar por el acceso",
  "Hi {{customer_name}}, quick check before {{date}}. Will I have access to water and an outlet at {{address}}?":
    "Hola {{customer_name}}, una pregunta antes del {{date}}. ¿Voy a tener agua y un tomacorriente en {{address}}?",
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
  "Your own sentence at the bottom of one of these emails, in a panel of its own under everything we write. The customer reads it exactly as you type it: a gate code, where to park, that you will text when you are on the way. Leave one blank and that email goes out as it always did.":
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
  "Push isn't set up on this account yet. Email still works.":
    "Los avisos push aún no están configurados en esta cuenta. El correo sí funciona.",
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
  // ROADMAP 2.12 — the Today setup banner. "Your page isn't fully set up"
  // renders both with and without a trailing period, collapsed vs open.
  "Your page isn't fully set up.": "Tu página no está completamente configurada.",
  "Your page isn't fully set up": "Tu página no está completamente configurada",
  "and {count} more": "y {count} más",
  "Used by every Navigate button.": "Lo usa cada botón de Navegar.",
  "Used by “Add to calendar” on a booking.":
    "Lo usa “Agregar al calendario” en una cita.",
  // ROADMAP 14.2 — the owner's calendar file is fetched with their session
  // now, so it can fail the way a fetch fails.
  "Could not build the calendar file.": "No se pudo generar el archivo del calendario.",
  "Used by “Add to contacts” on a job.":
    "Lo usa “Agregar a contactos” en un trabajo.",
  "Sample Customer": "Cliente de ejemplo",

  // Promo codes and the site sale.
  "Code added.": "Código agregado.",
  "Sale settings saved.": "Ajustes del descuento guardados.",
  "Comes off every booking automatically. No code for the customer to enter.":
    "Se descuenta de cada cita automáticamente. El cliente no escribe ningún código.",
  "Activate": "Activar",
  "Deactivate": "Desactivar",
  "· once per customer": "· una vez por cliente",

  // ROADMAP — THE PROMO COMPOSER REBUILD, 2026-09-13. Five of the keys above
  // this block already existed and the screen rendered English anyway, because
  // the JSX passed bare strings. These are the new ones the rebuilt controls
  // ask for.
  "A word the customer types when booking. The sale above comes off first.":
    "Una palabra que el cliente escribe al reservar. El descuento de arriba se aplica primero.",
  "Every booking is {n}% cheaper right now.":
    "Ahora mismo cada cita cuesta {n}% menos.",
  "Type of discount": "Tipo de descuento",
  "A set number": "Un número fijo",
  "How many times it can be used": "Cuántas veces se puede usar",
  "Limits": "Límites",
  "uses": "usos",
  "{n} uses in total": "{n} usos en total",
  "once per customer": "una vez por cliente",
  "reusable by the same customer": "el mismo cliente lo puede volver a usar",
  "Each customer can use it once, however many uses are left.":
    "Cada cliente lo puede usar una vez, sin importar cuántos usos queden.",
  "A percentage scales with the size of the job. A dollar amount is the same on every job.":
    "Un porcentaje sube o baja con el tamaño del trabajo. Una cantidad en dólares es la misma en todos.",
  "A customer who types the code gets {off}.":
    "Un cliente que escribe el código recibe {off}.",
  "A customer who types {code} gets {off}.":
    "Un cliente que escribe {code} recibe {off}.",
  "{n}% off": "{n}% de descuento",
  "{amount} off": "{amount} de descuento",
  "{used} of {limit} used": "{used} de {limit} usados",
  "used {n} times": "usado {n} veces",
  "Your codes · {n} live": "Tus códigos · {n} activos",

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
  "Accepted. They've been emailed.": "Aceptada. Ya se les mandó correo.",
  "Declined. They've been emailed.": "Rechazada. Ya se les mandó correo.",
  "Reminder sent to customer.": "Recordatorio enviado al cliente.",
  "Invoice + thank-you sent.": "Factura y agradecimiento enviados.",
  // ROADMAP 4.1 — the status-change notice, on screen for the first time.
  "Marked as confirmed.": "Marcada como confirmada.",
  "Marked as completed.": "Marcada como completada.",
  "Marked as not shown.": "Marcada como no presentada.",
  "Marked as canceled.": "Marcada como cancelada.",
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
  "Photo uploaded. Press Save to keep it.":
    "Foto subida. Presiona Guardar para conservarla.",
  "Photo storage is full. Remove some photos to add more.":
    "El almacenamiento de fotos está lleno. Quita algunas fotos para agregar más.",

  // Reviews, questions and campaign links.
  "Add review": "Agregar reseña",
  "Add question": "Agregar pregunta",
  "Your answer": "Tu respuesta",
  "Could not load your reviews.": "No se pudieron cargar tus reseñas.",
  "Could not save your questions.": "No se pudieron guardar tus preguntas.",
  "Could not load your campaign links.": "No se pudieron cargar tus enlaces de campaña.",
  "Delete the review from {author}": "Eliminar la reseña de {author}",
  "You already have a link called {slug}.": "Ya tienes un enlace que se llama {slug}.",
  "Delete this review from {author} for good? Hiding it keeps the words.":
    "¿Eliminar para siempre esta reseña de {author}? Si la ocultas, las palabras se quedan.",
  "Delete {name} for good? Its scans and bookings stop being counted against it. Turning it off keeps the numbers.":
    "¿Eliminar {name} para siempre? Sus escaneos y citas dejan de contarse en su total. Si lo apagas, los números se quedan.",
  "Nobody has opened it yet": "Nadie lo ha abierto todavía",
  "Live": "Activo",
  "Your booking page": "Tu página de citas",
  "Put this in your bio, on your cards and in your texts. Customers book themselves from here.":
    "Pon esto en tu bio, en tus tarjetas y en tus mensajes. Los clientes agendan solos desde aquí.",
  "Book with us": "Agenda con nosotros",

  // The web address screen.
  "Check it": "Revisar",
  "Not answering yet · the three steps below":
    "Aún no responde · los tres pasos de abajo",
  "That address isn't answering yet.": "Esa dirección aún no responde.",
  "Could not load your addresses.": "No se pudieron cargar tus direcciones.",
  "Stop using {domain}? Your links go back to detailingplatform.com.":
    "¿Dejar de usar {domain}? Tus enlaces vuelven a detailingplatform.com.",
  "Your booking page and every link in your customers' emails use {domain}.":
    "Tu página de citas y cada enlace en los correos de tus clientes usan {domain}.",
  "Your booking page is detailingplatform.com/book/{slug}, and that is what your customers' emails link to. Put your own address here and they use yours instead.":
    "Tu página de citas es detailingplatform.com/book/{slug}, y eso es a lo que apuntan los correos de tus clientes. Pon tu propia dirección aquí y usarán la tuya.",
  "You are here": "Estás aquí",

  // Maintenance deadlines.
  "Due today": "Vence hoy",
  "Due in {days} days": "Vence en {days} días",
  "Delete \"{question}\"?": "¿Eliminar \"{question}\"?",
  "Missed {days} days ago": "Se pasó hace {days} días",
  "Done {date}": "Hecho el {date}",
  "Which car (optional)": "Cuál carro (opcional)",
  "Then every (months)": "Luego cada (meses)",
  "Your week · 1 day open": "Tu semana · 1 día abierto",
  "Your week · {days} days open": "Tu semana · {days} días abiertos",
  "Owed a visit · {count}": "Les debes una visita · {count}",
  "{count} cars": "{count} carros",
  "Bring {what}": "Llevar {what}",
  "and": "y",
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
  "If you'd like it back to how it looked when you drove it away, booking takes about a minute.":
    "Si lo quieres como se veía cuando te lo llevaste, agendar toma como un minuto.",
  "Just use the button below and pick a time that suits you.":
    "Usa el botón de abajo y escoge la hora que te acomode.",
  ". Text those ones instead.": ". A esos mándales un mensaje.",

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
  "No phone or email · customers can't reach you":
    "Sin teléfono ni correo · los clientes no te pueden contactar",
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
  "Add your mailing address under Business info first. An email like this has to carry one at the bottom. That is the law, not our rule.":
    "Primero agrega tu dirección postal en Datos del negocio. Un correo así tiene que llevarla abajo. Es la ley, no una regla nuestra.",
  "Add-ons": "Extras",
  "Added to every mobile booking, and included in the price the customer is quoted. Leave blank for none.":
    "Se agrega a cada cita a domicilio, e incluido en el precio que se le cotiza al cliente. Déjalo en blanco si no cobras.",
  "Added to the customer's total when they pick it.":
    "Se agrega al total del cliente cuando lo escoge.",
  "Adding a job to your calendar": "Agregar un trabajo a tu calendario",
  "Address": "Dirección",
  "After a job is marked complete, if you haven't finalized it yet.":
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
  "Back on the 14th · call for anything urgent":
    "Regreso el 14 · llama si es urgente",
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
  "Canceling frees the slot and keeps the job in your history. Removing takes it out of your records and your totals as well. It cannot be undone.":
    "Cancelar libera el horario y deja el trabajo en tu historial. Eliminar lo saca de tus registros y de tus totales también. No se puede deshacer.",
  "Canceling": "Cancelando",
  "Card details": "Datos de la tarjeta",
  "Card payments": "Pagos con tarjeta",
  "Card payments are not switched on yet. Nothing for you to do; we will tell you when they are.":
    "Los pagos con tarjeta todavía no están activos. No tienes que hacer nada; te avisamos cuando lo estén.",
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
  "Done · you are signed in.": "Listo · ya entraste.",
  "Drop-off address": "Dirección del taller",
  "Due by": "Vence el",
  "Each area below sets its own, so this one is not charged while you have areas.":
    "Cada zona de abajo pone la suya, así que esta no se cobra mientras tengas zonas.",
  "Edit": "Editar",
  "Ten characters or more.": "Diez caracteres o más.",
  "You will be signed in straight after.": "Iniciarás sesión inmediatamente después.",
  "Eight characters or more. You will be signed in straight after.":
    "Ocho caracteres o más. Vas a entrar justo después.",
  // ROADMAP 5.3 — the receipt block on the job record. "Email invoice" is
  // gone: the document this sends calls itself a receipt in its own subject
  // line, and the record said one word while the email said another.
  // "Receipt" ITSELF IS NOT REPEATED HERE — the email template already has it
  // (§ the customer's receipt, above), and `spanish.test.mjs` § 9f fails on a
  // duplicate key: the second copy silently wins and the first becomes a lie
  // nobody can see.
  "Open the customer's receipt page": "Abrir la página del recibo del cliente",
  "Email the receipt": "Mandar el recibo",
  "Email it again": "Mandarlo otra vez",
  "It goes to": "Se manda a",
  "Emails to this address": "Correos a esta dirección",
  "Nothing has been emailed to this address yet.": "Todavía no se ha mandado nada a esta dirección.",
  "No email address on this job, so the receipt cannot be emailed. Add one with Edit above.":
    "Este trabajo no tiene correo, así que no se puede mandar el recibo. Agrega uno con Editar arriba.",
  "Receipt sent again.": "Recibo mandado otra vez.",
  "Receipt + thank-you sent.": "Recibo y agradecimiento mandados.",
  "Paid by card on {date}": "Pagado con tarjeta el {date}",
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
  "For work that has a deadline rather than a rhythm: a coating warranty that voids if the yearly inspection is missed. Your customer gets a reminder at 60, 30 and 14 days, and again the day before.":
    "Para trabajos con fecha límite en vez de ritmo: una garantía de recubrimiento que se pierde si no se hace la revisión anual. Tu cliente recibe un recordatorio a los 60, 30 y 14 días, y otra vez el día antes.",
  "Founding price": "Precio de fundador",
  "From your business info. Always receives.":
    "De los datos de tu negocio. Siempre recibe.",
  "From": "Desde",
  "Gap between jobs": "Espacio entre trabajos",
  "Generate QR code": "Generar código QR",
  "Getting started": "Empezando",
  "Getting there": "Ya casi",
  // ROADMAP 2.12 — the setup wizard's own step questions (SetupForm.jsx's
  // heading) and the one short step name it was missing.
  "What do you charge for?": "¿Qué cobras?",
  "What sizes are your vehicles?": "¿De qué tamaño son tus vehículos?",
  "When are you open?": "¿Cuándo estás abierto?",
  "Where does the work happen?": "¿Dónde se hace el trabajo?",
  "Who are you?": "¿Quién eres?",
  "What color is yours?": "¿De qué color es el tuyo?",
  "Running a discount?": "¿Tienes un descuento?",
  "Vehicle types": "Tipos de vehículo",
  "Go back": "Regresar",
  "Go to dashboard": "Ir al panel",
  "Going to": "Yendo a",
  "Google review link": "Enlace de reseña de Google",
  "That {label} review link doesn't look like a web address. Paste the whole thing, starting with https://":
    "Ese enlace de reseña de {label} no parece una dirección web. Pega la dirección completa, empezando con https://",
  "Sent to {to} · two emails: the one your customer gets, and the one you get.":
    "Enviado a {to} · dos correos: el que recibe tu cliente y el que recibes tú.",
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
  // **A DATA TABLE THE TOGGLE COULD NOT REACH.** `Payments.jsx` holds the help
  // and the placeholder for every payment handle as plain object values and
  // rendered them unwrapped, so no `t()` sweep and no coverage count could see
  // them. The brand names stay English on purpose: Venmo is Venmo.
  "Just the username. We add the @ and make it a link they can open.":
    "Solo el usuario. Nosotros ponemos el @ y lo hacemos un enlace que puedan abrir.",
  "Just the tag. We add the $ and make it a link.":
    "Solo la etiqueta. Nosotros ponemos el $ y lo hacemos un enlace.",
  "Your username, or paste your PayPal.Me link.":
    "Tu usuario, o pega tu enlace de PayPal.Me.",
  "Zelle lives in your bank's app, so this is the phone number or email it is on.":
    "Zelle vive en la app de tu banco, así que aquí va el número de teléfono o el correo donde lo tienes.",
  "your-handle": "tu-usuario",
  "your-handle, or a PayPal.Me link": "tu-usuario, o un enlace de PayPal.Me",
  "Keep my subscription": "Quedarme con mi suscripción",
  "Label": "Etiqueta",
  "Language": "Idioma",
  "Leave blank for none. Most detailers advertise cancel-anytime as a selling point.":
    "Déjalo en blanco si no hay. La mayoría de los detailers anuncian cancelar cuando quieras como argumento de venta.",
  "Leave both blank to be closed.": "Deja las dos en blanco para estar cerrado.",
  "Leave off to charge it all day on those days.":
    "Déjalo apagado para cobrarlo todo el día esos días.",
  "Licenses, certifications, warranties. They go on your website. That part is still being built.":
    "Licencias, certificaciones, garantías. Van en tu sitio web. Esa parte todavía se está construyendo.",
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
  "More than one is a bundle: two washes a month, say.":
    "Más de uno es un paquete: dos lavados al mes, por ejemplo.",
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
  "No plans yet. Most detailers start with one: a wash every other week, or a monthly rate.":
    "Aún no hay planes. La mayoría de los detailers empiezan con uno: un lavado cada dos semanas, o una tarifa mensual.",
  "No reviews yet. Your website has nothing from a customer on it.":
    "Aún no hay reseñas. Tu sitio web no tiene nada de un cliente.",
  "No services yet. Customers can't book until you add one.":
    "Aún no hay servicios. Los clientes no pueden agendar hasta que agregues uno.",
  "No templates yet · the gear, then Message templates.":
    "Aún no hay mensajes guardados · el engrane, y luego Mensajes guardados.",
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
  "Nothing has a deadline yet. This is for coatings and warranties.":
    "Aún nada tiene fecha límite. Esto es para recubrimientos y garantías.",
  "Nothing here yet. Every booking you get is counted as somebody who just found you.":
    "Aún no hay nada. Cada cita que recibes se cuenta como alguien que acaba de encontrarte.",
  "Nothing here yet · you are on detailingplatform.com.":
    "Aún no hay nada · estás en detailingplatform.com.",
  "Nothing here yet. Your website has no questions section.":
    "Aún no hay nada. Tu sitio web no tiene sección de preguntas.",
  "Nothing in this one yet.": "Aún no hay nada en este.",

  // ── Services & add-ons, rebuilt as a price table 2026-09-13 ──────────────
  // The screen is a grid now: services down, the detailer's own vehicle sizes
  // across, the real price in every cell. These are its words.
  "What a customer pays": "Lo que paga un cliente",
  "Hidden": "Oculto",
  "These are the columns above. The first one is your base price; each of the others adds money and time, per service.":
    "Estas son las columnas de arriba. La primera es tu precio base; cada una de las demás suma dinero y tiempo, por servicio.",
  "Adds on top": "Suma al precio base",
  "No examples yet": "Sin ejemplos todavía",
  "Move earlier": "Mover antes",
  "Move later": "Mover después",
  "Past {n} sizes your booking page shows them as a drop-down instead of boxes, because {m} boxes do not fit on one screen. Everything still works; it just looks like a list.":
    "Con más de {n} tamaños tu página de reservas los muestra en una lista desplegable en vez de cajas, porque {m} cajas no caben en una pantalla. Todo sigue funcionando; solo se ve como una lista.",
  "Examples (optional)": "Ejemplos (opcional)",
  "Description (optional)": "Descripción (opcional)",
  "Price ($)": "Precio ($)",
  "Time it adds (min)": "Tiempo que añade (min)",
  "Category (optional)": "Categoría (opcional)",
  "Every vehicle": "Todos los vehículos",
  "Your base price": "Tu precio base",
  "What {name} pays": "Lo que paga {name}",
  "How long {name} takes": "Cuánto tarda {name}",
  "A bigger vehicle also takes longer": "Un vehículo más grande también tarda más",
  "You have one vehicle size, so one price. Add sizes on this screen to charge more for bigger vehicles.":
    "Tienes un solo tamaño de vehículo, así que un solo precio. Añade tamaños en esta pantalla para cobrar más por vehículos más grandes.",
  "Nothing to send yet.": "Aún no hay nada que mandar.",
  "Nothing": "Nada",
  "Nudge you before a job starts": "Avisarte antes de que empiece un trabajo",
  "Of that, the build": "De eso, la construcción",
  "Off keeps what you have written, and just hides the section.":
    "Apagado conserva lo que escribiste, solo esconde la sección.",
  "Offered on your booking page": "Se ofrece en tu página de citas",
  "On an iPhone, add this dashboard to your home screen first. Safari only allows it there.":
    "En un iPhone, primero agrega este panel a tu pantalla de inicio. Safari solo lo permite ahí.",
  "On the hour only, or every fifteen minutes. This is how the time picker is spaced.":
    "Solo en punto, o cada quince minutos. Así se espacia el selector de hora.",
  "On your booking page": "En tu página de citas",
  "On your website": "En tu sitio web",
  "Once you hit this, the rest of that day stops being offered.":
    "En cuanto llegues a esto, el resto de ese día deja de ofrecerse.",
  "One line under the heading on your booking page. Leave it blank unless it earns its space, because that screen is tight on a phone.":
    "Una línea debajo del título en tu página de citas. Déjala en blanco si no vale el espacio, porque esa pantalla va apretada en un teléfono.",
  "One moment": "Un momento",
  "One size, so one price.": "Un solo tamaño, así que un solo precio.",
  "One use per customer": "Un uso por cliente",
  "One-off changes — a day off, different hours for a single date, or a drop-off-only stretch — are set on the Calendar by choosing that date.":
    "Los cambios de una vez — un día libre, otro horario para una sola fecha, o un tramo solo de taller — se ponen tocando esa fecha en el Calendario.",
  "None on file": "Ninguna registrada",
  "Nothing to commit to. You choose again next year.":
    "Sin compromiso. Vuelves a escoger el año que viene.",
  "Nothing to pay to leave.": "No pagas nada por irte.",
  "Only between certain hours": "Solo entre ciertas horas",
  "Only ever printed at the bottom of an email you send your old customers. The law asks for it.":
    "Solo se imprime al final de un correo que le mandas a tus clientes viejos. La ley lo pide.",
  "Only take": "Solo tomar",
  "Open now": "Abierto ahora",
  "Open slots in the next 7 days": "Horarios libres en los próximos 7 días",
  "Open": "Abre",
  // ROADMAP 2.12/9.20 — the day-row BUTTON that used to share the field
  // label's key above ("Open": "Abre"), wrong register for a button in a
  // catalogue that otherwise uses the infinitive (Guardar, Cancelar,
  // Cerrar). `screens/more/Hours.jsx`.
  "Reopen": "Reabrir",
  "Opening Stripe": "Abriendo Stripe",
  "Opens a sample.": "Abre una muestra.",
  "Opens": "Abre",
  "Optional · check number, split payment…":
    "Opcional · número de cheque, pago dividido…",
  "Optional · they'll read this in the email":
    "Opcional · lo van a leer en el correo",
  "Optional": "Opcional",
  "Or email": "O correo",
  "Or just the booking page": "O solo la página de citas",
  "Other ways to pay you": "Otras formas de pagarte",
  "Password": "Contraseña",
  "Pausing stops the visits counting up. Coming back starts again from today, and the paused ones are not owed.":
    "Pausar detiene la cuenta de visitas. Al regresar empieza otra vez desde hoy, y las pausadas no se deben.",
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
  "Removing it from your records": "Quitar esto de mis registros también",
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
  "Something on this screen broke. Nothing you were doing was lost, and your bookings and settings are safe.":
    "Algo de esta pantalla falló. No se perdió nada de lo que estabas haciendo, y tus citas y tus ajustes están a salvo.",
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
  "Choose a detail to add it. Drag one to move it.":
    "Toca para agregar un dato. Arrastra uno para moverlo.",
  "Technical detail": "Detalle técnico",
  "Tell us the address and we do it. It takes a couple of minutes and it cannot be done from here.":
    "Dinos la dirección y nosotros lo hacemos. Toma un par de minutos y no se puede hacer desde aquí.",
  "Test": "Prueba",
  "Text message": "Mensaje de texto",
  "Text": "Mensaje",
  "That card was refused.": "Esa tarjeta fue rechazada.",
  "That didn't load": "Eso no cargó",
  "The bit on the end of the link": "La parte del final del enlace",
  "The card fields above are Stripe's own. Your number is sent straight to them and never reaches us.":
    "Los campos de la tarjeta de arriba son de Stripe. Tu número se les manda directo a ellos y nunca llega a nosotros.",
  "The job": "El trabajo",
  "The last subscription ended after the payments stopped going through. Picking a plan below turns the page back on straight away, and nothing was deleted or is owed from before.":
    "La suscripción anterior terminó después de que los pagos dejaron de pasar. Escoger un plan abajo enciende la página de inmediato, y no se borró nada y no se debe nada de antes.",
  "The money": "El dinero",
  "The month you have not paid for is still owed. Canceling stops us trying the card for anything after it.":
    "El mes que no has pagado se sigue debiendo. Cancelar hace que dejemos de intentar la tarjeta por lo que venga después.",
  "The password for": "La contraseña de",
  "The phone number or email your Zelle is on":
    "El teléfono o correo donde tienes tu Zelle",
  "The question": "La pregunta",
  "The questions customers actually ask you. They go on your website. That part is still being built.":
    "Las preguntas que los clientes de verdad te hacen. Van en tu sitio web. Esa parte todavía se está construyendo.",
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
  "Up front is a prepaid block: a year, or a set number of visits, paid in one go.":
    "Por adelantado es un bloque prepagado: un año, o un número fijo de visitas, pagado de una vez.",
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
  "What customers have said about your work. They go on your website. That part is still being built, so collect them now and they will be there when it lands.":
    "Lo que los clientes han dicho de tu trabajo. Van en tu sitio web. Esa parte todavía se está construyendo, así que júntalas desde ahora y van a estar ahí cuando salga.",
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
  "Your customers pay by card from their booking page, and the money goes straight to your own Stripe account. We never hold it. Stripe takes 2.9% + 30¢ of each payment.":
    "Tus clientes pagan con tarjeta desde su página de cita, y el dinero va directo a tu propia cuenta de Stripe. Nosotros nunca lo tenemos. Stripe se queda con 2.9% + 30¢ de cada pago.",
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
  "in your setup. Until then anyone who opens it is told you are still setting up.":
    "en tu configuración. Hasta entonces, a quien lo abra se le dice que sigues configurando.",
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
  "· not charged until they accept it.": "· no se cobra hasta que la acepten.",
  // The three default vehicle sizes and their examples. These are OFFERED as
  // a starting point and become the detailer's own words the moment they are
  // saved, so they arrive in the language the detailer is reading and are
  // never translated again afterwards.
  "Small": "Chico",
  "Medium": "Mediano",
  "Large": "Grande",
  "Coupe, sedan, hatchback": "Coupé, sedán, hatchback",
  // ROADMAP 2.12 — "SUV chica" and "Troca" are DELIBERATELY LEFT AS THEY
  // ARE, not a fix skipped. VEHICLE_BODY_TYPES below follows `es.js`, the
  // booking page's own catalogue, which says "SUV pequeña" and "Camioneta"
  // for the same two concepts — so this app now ships both words for both
  // ideas at once, on purpose, pending Andrew's ruling in FOR-ANDREW.md on
  // which side the two lines below should move to. Do not quietly bring
  // them into line with the words below; that is his call, not a session's.
  "Small SUV, crossover, wagon": "SUV chica, crossover, camioneta",
  "Truck, large SUV, van": "Troca, SUV grande, van",
  "Remove \"{name}\"? Bookings already taken keep the size they were booked at.":
    "¿Quitar \"{name}\"? Las citas ya tomadas conservan el tamaño con el que se agendaron.",
  // ROADMAP 2.12/9.20 — `book/core.js`'s VEHICLE_BODY_TYPES, the fourteen
  // body types a detailer maps onto their own Small/Medium/Large tiers in
  // Catalog.jsx. Checked against `es.js` before writing any of these, the
  // same method that produced "Ligera": where the booking page already had
  // a word for the concept, these follow it rather than either inventing a
  // second one or matching this catalogue's own (different) word for the
  // same thing two lines up. Three groups, so the next reader can tell
  // evidence from judgement without opening anything else:
  //   MATCHED — the whole key or a word inside it already agreed in both
  //   catalogues: Coupé, Sedán, Hatchback (unchanged loanword), "crossover"
  //   inside "Small SUV / crossover" (unchanged loanword), "SUV grande"
  //   inside "Large SUV (3 rows)".
  //   FROM ES.JS, BY RULING — the booking page's word, not this catalogue's
  //   own: "SUV pequeña" inside "Small SUV / crossover" (not "SUV chica"),
  //   "Camioneta" for Wagon and both Pickup keys (not "Troca").
  //   NEW, NEUTRAL STANDARD SPANISH — no precedent anywhere in either
  //   catalogue, so no regional dialect was guessed at: Convertible,
  //   Minivan, "cabina sencilla"/"cabina doble" (pickup cabs — standard
  //   automotive terms, not slang), "mediana" (mid-size, matching the
  //   grammatical pattern "pequeña"/"grande" already set by the two SUV
  //   sizes with real precedent), "Deportivo o exótico", "Sobredimensionado
  //   — elevado, doble rodada, limusina" ("doble rodada" is the standard
  //   term for a dually, not a regionalism).
  "Coupe (2-door)": "Coupé (2 puertas)",
  "Sedan": "Sedán",
  "Hatchback": "Hatchback",
  "Convertible": "Convertible",
  "Wagon": "Camioneta",
  "Small SUV / crossover": "SUV pequeña / crossover",
  "Mid-size SUV (2 rows)": "SUV mediana (2 filas)",
  "Large SUV (3 rows)": "SUV grande (3 filas)",
  "Pickup — standard cab": "Camioneta — cabina sencilla",
  "Pickup — crew cab": "Camioneta — cabina doble",
  "Minivan": "Minivan",
  "Full-size / cargo van": "Van grande / de carga",
  "Sports or exotic": "Deportivo o exótico",
  "Oversized — lifted, dually, limo": "Sobredimensionado — elevado, doble rodada, limusina",
  // Where a job happens, on every card and record in the product.
  "Mobile": "A domicilio",
  "Drop-off": "En el taller",
  // ROADMAP 9.5 — the flag on a confirmed job whose end time has passed on
  // Today's own "Still to do" list. `components/JobRow.jsx`.
  "Late": "Atrasada",
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
  "{count} visit": "{count} visita",
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
  // The four bulk-action labels: `{n}` became `{count}` when both buttons
  // moved onto the plural helper, and each gained its singular. 2026-09-12.
  "Email this one": "Enviar correo a este",
  "Email these {count}": "Enviar correo a estos {count}",
  "Text these {count}": "Enviar mensaje a estos {count}",
  "Showing the {n} most recent. Search for anyone older.": "Mostrando los {n} más recientes. Busca a alguien de antes.",
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
  // W27's four-word dirtiness scale, all four now here. ROADMAP 2.12/9.20:
  // "Light" used to share a key with an unrelated dark/light THEME toggle
  // elsewhere in this catalogue and read as "Claro" (brightness) on a
  // filthy-car control. The theme picker's own two words moved to "Dark
  // background"/"Light background" (see that pair further down), which
  // freed this word for the sense it actually has here. All four match the
  // same scale's already-shipped translation in the booking page's own
  // catalogue, lib/strings/es.js — Moderada/Fuerte/Extrema and, now, Ligera
  // — so a detailer and a customer read the same word for the same car.
  "Light": "Ligera",
  "Moderate": "Moderada",
  "Heavy": "Fuerte",
  "Extreme": "Extrema",
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
  "Travel · {zone}": "Viaje · {zone}",
  "Travel": "Viaje",
  "Promo {code}": "Descuento {code}",
  "Total": "Total",
  "Booking…": "Reservando…",
  // The plain-language pass, 2026-09-11 — his second rejection of the same
  // blurb. Voice, not content: short declarative sentences, no em dash, no
  // opening flourish. docs/sessions/product.md has the rule.
  "Set up the plans you sell. This page tracks who is on each one and how many visits they still have coming. You collect payment yourself.": "Configura los planes que vendes. Esta página lleva la cuenta de quién está en cada uno y cuántas visitas le faltan. Tú cobras el pago por tu cuenta.",
  "New plan": "Plan nuevo",
  "Edit plan": "Editar plan",
  // REVIEW ITEM 11, 2026-09-11 — the pill editor. Four new details a
  // detailer can drop into a text, their chip labels, and the plain-English
  // meaning each chip carries as its title.
  "These are the texts you send from a job. Choose a detail to add it. Each one fills itself in from the booking when you send the message.": "Estos son los mensajes que envías desde un trabajo. Toca un dato para agregarlo. Cada uno se completa solo con la reserva cuando envías el mensaje.",
  "What they booked": "Lo que reservó",
  "Their car": "Su carro",
  "Your phone": "Tu teléfono",
  "Link to their booking": "Enlace a su reserva",
  "what they booked": "lo que reservó",
  "the car": "el carro",
  "your phone number": "tu número de teléfono",
  "a link to their booking": "un enlace a su reserva",
  // ── Wave D, 2026-09-12: honest figures ──────────────────────────────────
  // A change against last period, in words, wherever a percentage would be
  // arithmetic with no meaning — see AdvancedMoney's `changeWords`.
  "up from {n}": "sube desde {n}",
  "down from {n}": "baja desde {n}",
  "up {amount}": "sube {amount}",
  "down {amount}": "baja {amount}",
  // The data floor. Under eight finished jobs every rate on the advanced
  // money screen is replaced by this one panel.
  "Too few jobs to read rates": "Muy pocos trabajos para calcular tasas",
  "Too few finished jobs to name a most-booked service.":
    "Muy pocos trabajos terminados para nombrar el servicio más reservado.",
  "Rates, percentages and best-of-the-week need more finished jobs behind them than this period has. These four are counted, not worked out, so they are the ones worth reading.":
    "Las tasas, los porcentajes y el mejor día necesitan más trabajos terminados de los que tiene este periodo. Estos cuatro se cuentan, no se calculan, así que son los que vale la pena leer.",
  "{count} more finished job and the rest of this screen fills in.":
    "{count} trabajo terminado más y el resto de esta pantalla se completa.",
  "{count} more finished jobs and the rest of this screen fills in.":
    "{count} trabajos terminados más y el resto de esta pantalla se completa.",
  // The month chart's scale.
  "Tallest bar {peak}.": "La barra más alta es {peak}.",
  "Tallest bar {peak}. The line across is zero.":
    "La barra más alta es {peak}. La línea horizontal es cero.",
  // Today's open slots, with the denominator that makes the count mean
  // something.
  "Days with room": "Días con espacio",
  "{open} of {total}": "{open} de {total}",
  // The history window runs from a start date with no end, so its chips no
  // longer claim to be only the past.
  "Last 30 days & ahead": "Últimos 30 días y lo que viene",
  "Last 90 days & ahead": "Últimos 90 días y lo que viene",
  "Last year & ahead": "Último año y lo que viene",
  "the last 30 days or booked ahead": "los últimos 30 días o lo que viene",
  "the last 90 days or booked ahead": "los últimos 90 días o lo que viene",
  "the last year or booked ahead": "el último año o lo que viene",
  // The one Money sentence that was never wrapped. FOUND.md, 2026-09-12.
  // Reworded 2026-09-13 with the cell above it: "cobraste" is money RECEIVED
  // and this figure counts work done, paid for or not.
  "{percent}% of what you earned was sold at the job.":
    "{percent}% de lo que entró se vendió en el trabajo.",
  // The folded settings rows say what they have put away.
  "How far ahead, and how many": "Con cuánta anticipación, y cuántos",
  // ROADMAP 2.8 — on the job record, under the address and above Navigate.
  "Typed by hand. The address lookup found no match for it.":
    "Escrita a mano. El buscador de direcciones no encontró ninguna coincidencia.",
  // ROADMAP 2.3 — the crude zone-versus-address flag, same job record row.
  "This address doesn't mention the travel area they picked. Worth a quick check before you drive out.":
    "Esta dirección no menciona la zona de viaje que eligieron. Vale la pena revisarlo antes de salir.",
  // ROADMAP 4.1 — the question a consequential tap asks before it acts, and
  // the way back afterwards. Both screens that can complete a job share them.
  "Mark {name}’s {service} at {time} as done?":
    "¿Marcar como terminado el {service} de {name} de las {time}?",
  "Mark {name}’s job at {time} as done?":
    "¿Marcar como terminado el trabajo de {name} de las {time}?",
  "Yes, it’s done": "Sí, ya está",
  // NO "Not yet" ENTRY HERE — the catalogue already had one and a second copy
  // is a duplicate key, which `tests/spanish` § 9f fails on. Caught by running
  // it: the second definition would have won silently and the first would have
  // looked maintained while doing nothing.
  "Not completed after all": "No estaba terminado",
  "Reminders and cancellations": "Recordatorios y cancelaciones",
  "When these reach you": "Cuándo te llegan",
  "{count} days ahead": "{count} días de anticipación",
  "no limit on how far ahead": "sin límite de anticipación",
  "on the hour": "en punto",
  "every {count} min": "cada {count} min",
  "up to {count} a day": "hasta {count} al día",
  "no daily limit": "sin límite diario",
  "the day before": "el día anterior",
  "{count} days before": "{count} días antes",
  "an hour before": "una hora antes",
  "{count} hours before": "{count} horas antes",
  "{count} minutes before": "{count} minutos antes",
  "{first}, then {second}": "{first}, luego {second}",
  "one reminder, {when}": "un recordatorio, {when}",
  "changes up to {hours}h before": "cambios hasta {hours}h antes",
  "nudge {mins}": "aviso {mins}",
  "payment reminder after {mins}": "recordatorio de pago tras {mins}",
  "summary at {time}": "resumen a las {time}",
  // The gallery's empty shelf, split from the sentence that told you to tap a
  // photo when there were none. 2026-09-12.
  "No photos yet.": "Todavía no hay fotos.",
  "Choose a photo to hide it from your site.":
    "Elige una foto para ocultarla de tu sitio.",
  "Show this payment method": "Mostrar este método de pago",
  "Removing them from your records": "Quitarlos de tus registros",
  "Deleting their information": "Eliminar su información",
  "Delete for good": "Eliminar definitivamente",
  "The {count} job stays as an anonymous entry, so your takings and your accountant export do not change.":
    "El {count} trabajo queda como una entrada anónima, así que tus ingresos y tu exportación contable no cambian.",
  "The {count} jobs stay as anonymous entries, so your takings and your accountant export do not change.":
    "Los {count} trabajos quedan como entradas anónimas, así que tus ingresos y tu exportación contable no cambian.",
  "Quick tours. Stop any time.":
    "Recorridos rápidos. Para cuando quieras.",
  // Re-opening a blocked day asks with the reason the detailer typed.
  "This day is closed for {reason}. Re-open it and customers can book.":
    "Este día está cerrado por {reason}. Si lo reabres, los clientes podrán reservar.",
  "This day is closed. Re-open it and customers can book.":
    "Este día está cerrado. Si lo reabres, los clientes podrán reservar.",
  "In your own words": "En tus propias palabras",
  "Change it": "Cámbiala",
  // /reset's signed-in branch is the CHANGE-password form and says so now.
  "Change your password": "Cambia tu contraseña",
  "You will stay signed in.": "Seguirás con la sesión iniciada.",
  // Wave B, 2026-09-12: the two disclosures.
  "Social and review links": "Enlaces de redes y reseñas",
  "{count} other email you can add a line to":
    "{count} correo más al que puedes agregarle una línea",
  "{count} other emails you can add a line to":
    "{count} correos más a los que puedes agregarles una línea",
  // One filtered client is still one.
  "Text this one": "Mandar mensaje a este",
  // ── WAVE: THE 139 THAT THE TOGGLE NEVER DELIVERED — 2026-09-12 ───────────
  // `scripts/i18n-coverage.mjs` found 139 `t()` call sites on the detailer's
  // own screens with no entry here at all. `t()` returns an unknown string
  // unchanged, so every one of them rendered in English on a Spanish dashboard
  // with nothing anywhere reporting it. Grouped by the screen a detailer meets
  // them on, worst first.

  // ── THE ADVANCED MONEY SCREEN ────────────────────────────────────────────
  // The longest single screen in the product and the one most made of labels.
  // `Left after expenses` and `Spent` name the two halves of one bar, so they
  // are amounts rather than verbs: "Queda tras gastos" and "Gastado".
  //
  // **EVERY "te quedaste / te quedó" ON THIS SCREEN WAS A CASH CLAIM —
  // ROADMAP 14.7.** *Quedarse con algo* is to keep it, and a third of what the
  // bar was drawing had not been paid for. The Spanish follows the English
  // into the accrual vocabulary: *ganado* for the work, *cobrado* for the
  // money, *te deben* for the rest.
  "Nothing came in this period.": "No entró nada en este periodo.",
  "You earned {in} and {net} is left after expenses.":
    "Ganaste {in} y quedan {net} después de gastos.",
  "You earned {in} and spent {out}, so you are {down} down.":
    "Ganaste {in} y gastaste {out}, así que estás {down} abajo.",
  "Back to Money": "Volver a Dinero",
  "Left after expenses": "Queda tras gastos",
  "Spent": "Gastado",
  "Earned less expenses": "Ganado menos gastos",
  "What it was worth": "Lo que valió",
  "What is left of what you earned after everything you spent.":
    "Lo que queda de lo que ganaste después de todo lo que gastaste.",
  "Per hour, after expenses": "Por hora, después de gastos",
  "{net} over {hours} hours booked": "{net} en {hours} horas reservadas",
  "No job in this period has a length on it.":
    "Ningún trabajo de este periodo tiene una duración anotada.",
  "Margin": "Margen",
  "of every dollar earned": "de cada dólar ganado",
  "Average job": "Trabajo promedio",
  "Still to collect": "Por cobrar",
  "Work you have finished and not been paid for yet.":
    "Trabajo que ya terminaste y que todavía no te han pagado.",
  "Everything finished in this period has been paid for.":
    "Todo lo que terminaste en este periodo ya está pagado.",
  "Still owed": "Te deben",
  "work finished, not paid for": "trabajo terminado, sin pagar",
  "What came in": "Lo que entró",
  "Where the money came from: what you quoted, and what you sold once you were there.":
    "De dónde vino el dinero: lo que cotizaste y lo que vendiste ya estando ahí.",
  "Sold at the job": "Vendido en el trabajo",
  "on {count} of {total}": "en {count} de {total}",
  "Sells an extra": "Vende un extra",
  "{avg} each": "{avg} cada uno",
  "only the ones you wrote down": "solo las que anotaste",
  "Left a tip": "Dejó propina",
  "Where it went": "A dónde se fue",
  "Nothing written down as an expense in this period.":
    "No anotaste ningún gasto en este periodo.",
  "Everything out": "Todo lo que salió",
  "What sells": "Lo que se vende",
  "No finished job in this period has a service on it.":
    "Ningún trabajo terminado de este periodo tiene un servicio anotado.",
  "Your week": "Tu semana",
  "No finished jobs in this period.": "No hay trabajos terminados en este periodo.",
  "Busiest day": "Día más ocupado",
  "Best-paying day": "Día que paga mejor",
  "Who came": "Quién vino",
  "Whether this period was new faces or people coming back.":
    "Si este periodo fue de caras nuevas o de gente que vuelve.",
  "Could not check who had been before, so everyone below counts as new.":
    "No se pudo revisar quién ya había venido, así que todos los de abajo cuentan como nuevos.",
  "People": "Personas",
  "somebody who came twice is one person": "alguien que vino dos veces es una persona",
  "Came back": "Volvieron",
  "First time": "Primera vez",
  "Been before": "Ya habían venido",
  "Spent the most": "Quien más gastó",

  // ── THE MONEY SCREEN'S OWN FIVE ──────────────────────────────────────────
  "Most booked": "Más reservado",
  "Times booked": "Veces reservado",
  "The full picture": "El panorama completo",
  "Where the money went, what each service earns, and what is still owed.":
    "Adónde se fue el dinero, cuánto genera cada servicio y qué falta por cobrar.",
  // ── BOOKING SOURCES ──────────────────────────────────────────────────────
  // ROADMAP 4.2, 2026-09-13. The one-line door became a block of real figures;
  // "Where your money comes from" and its sentence went with it.
  "Booking sources": "De dónde vienen las reservas",
  "You have no links yet. Make one for each place you advertise and this shows which of them brings in work.":
    "Todavía no tienes enlaces. Crea uno para cada lugar donde te anuncies y aquí verás cuál te trae trabajo.",
  "None of your links were opened in this period.":
    "Nadie abrió tus enlaces en este periodo.",
  "{percent}% booked": "{percent}% reservaron",
  "{amount} earned": "{amount} ganados",
  "{n} of {m} bookings came through a link. “Earned” only counts jobs you have finished.":
    "{n} de {m} reservas llegaron por un enlace. “Ganado” solo cuenta los trabajos que ya terminaste.",
  "Make a link for a flyer, a post or an ad, get its QR code, and see every link you have.":
    "Crea un enlace para un volante, una publicación o un anuncio, obtén su código QR y mira todos tus enlaces.",

  // ── HOW YOU GET PAID ─────────────────────────────────────────────────────
  "Something else": "Otra cosa",
  "Your {name}": "Tu {name}",
  "Anything else you take": "Cualquier otra forma que aceptes",
  "What they need": "Lo que necesitan",
  "A username, a number, or a link": "Un usuario, un número o un enlace",
  "Add a way to be paid": "Agregar una forma de cobro",
  "What it is called": "Cómo se llama",
  "e.g. Apple Pay": "p. ej. Apple Pay",
  "Paste a link and your customer can open it directly. Anything else we print exactly as you type it.":
    "Pega un enlace y tu cliente puede abrirlo directo. Cualquier otra cosa la mostramos tal como la escribas.",
  "Add it": "Agregarlo",

  // ── YOUR WEB ADDRESS ─────────────────────────────────────────────────────
  // Three of these are FRAGMENTS, because the screen puts a bold word or the
  // detailer's own subdomain in the middle of a sentence. Each one survives in
  // order: Spanish puts the pressed button and the record's name in the same
  // place English does, which is the only reason the split is safe here.
  // `Name` stays `Name` — it is the field's label in the domain company's own
  // interface, and translating it sends somebody looking for a field that is
  // not there.
  "You point the address at us, where you bought it. Then press":
    "Apuntas la dirección hacia nosotros, donde la compraste. Luego presiona",
  "At the company you bought the address from — GoDaddy, Namecheap, Squarespace, Cloudflare, whoever it was — find DNS records and add one:":
    "En la compañía donde compraste la dirección — GoDaddy, Namecheap, Squarespace, Cloudflare, la que haya sido — busca los registros DNS y agrega uno:",
  "the one we send you": "el que te enviamos",
  "Name is just": "Name es solo",
  ", not the whole address. The company adds the rest, and if it asks for a TTL, leave it alone.":
    ", no la dirección completa. La compañía agrega el resto, y si te pide un TTL, déjalo como está.",
  "This is a bare domain with no subdomain in front of it, and most domain companies will not point one of those at another site. Ask them for an ALIAS or ANAME record, or add a subdomain address instead — book.{domain} — which always works.":
    "Este es un dominio pelado, sin subdominio delante, y la mayoría de las compañías de dominios no apuntan uno de esos a otro sitio. Pídeles un registro ALIAS o ANAME, o agrega una dirección con subdominio — book.{domain} — que siempre funciona.",
  "It can take a few minutes or a few hours to spread. A check that fails is almost always \"not yet\" rather than \"wrong\", so press it again later.":
    "Puede tardar unos minutos o unas horas en propagarse. Una revisión que falla casi siempre quiere decir \"todavía no\" y no \"está mal\", así que vuelve a presionarla más tarde.",

  // ── TELL ME WHAT IS WRONG ────────────────────────────────────────────────
  "Sent. You will get an answer the same working day.":
    "Enviado. Recibirás una respuesta el mismo día hábil.",
  "That did not send. Email {address} instead. Your words are still in the box.":
    "Eso no se envió. Escribe a {address} en su lugar. Tus palabras siguen en la caja.",
  "Anything at all: something broken, something confusing, something missing, or a thing you want the dashboard to do. It goes straight to one person.":
    "Lo que sea: algo roto, algo confuso, algo que falta, o algo que quieres que el panel haga. Le llega directo a una persona.",
  "The more you tell me the faster I can fix it. If something went wrong, what you were doing when it did is the most useful part.":
    "Cuanto más me cuentes, más rápido lo puedo arreglar. Si algo salió mal, lo más útil es qué estabas haciendo cuando pasó.",
  "{n} characters left": "Quedan {n} caracteres",
  "Send it": "Enviarlo",

  // ── A PAGE THAT IS NOT THERE ─────────────────────────────────────────────
  "That page does not exist.": "Esa página no existe.",
  "The address may have a typo in it, or the link you followed is out of date.":
    "La dirección puede tener un error de escritura, o el enlace que seguiste ya no sirve.",
  "Go to the home page": "Ir a la página principal",
  "Your dashboard": "Tu panel",

  // ── THE KIT, AND ONE SETUP FALLBACK ──────────────────────────────────────
  // `PasswordInput`'s toggle is the accessible name of a button with no words
  // in it, so it is the only thing a screen reader has to go on.
  "Hide password": "Ocultar contraseña",
  "Show password": "Mostrar contraseña",
  "This part is not ready yet.": "Esta parte todavía no está lista.",

  // ── THE WEBSITE INTAKE FORM ──────────────────────────────────────────────
  // The longest form in the product, and the one a detailer meets before they
  // have a site at all. `Color {n}` is identical in both languages and stays
  // that way.
  "Stop": "Detener",
  "Say it instead": "Dilo en voz alta",
  "Listening… stop when you are done": "Escuchando… detén cuando termines",
  "Start from one of these, then change it": "Empieza con una de estas y luego cámbiala",
  "Not on the site at all": "Que no aparezca en el sitio",
  "Other": "Otro",
  "Needed": "Obligatorio",
  "Filled in from your setup. Change it if the site should say something else.":
    "Tomado de tu configuración. Cámbialo si el sitio debe decir otra cosa.",
  "Type it here": "Escríbelo aquí",
  "On your site:": "En tu sitio:",
  "It is on my website": "Está en mi sitio web",
  "Color {n}": "Color {n}",
  "Hex code": "Código hex",
  "Another color": "Otro color",
  "Add a color": "Agregar un color",
  "Uploading…": "Subiendo…",
  "Choose photos": "Elegir fotos",
  "{n} added": "{n} agregadas",
  "Sign in to upload for real": "Inicia sesión para subirlas de verdad",
  "A site we built. Open it, scroll it, click around. Then say what you liked and what you did not.":
    "Un sitio que construimos. Ábrelo, desplázalo, haz clic por ahí. Después dinos qué te gustó y qué no.",
  "Open it": "Ábrelo",
  "I like it": "Me gusta",
  "Not for me": "No es para mí",
  "No strong feeling": "Me da igual",
  "What did you like?": "¿Qué te gustó?",
  "What put you off?": "¿Qué no te gustó?",
  "Anything specific · a feature, a section, the way something works":
    "Algo en concreto · una función, una sección, la forma en que algo funciona",
  "Anything specific": "Algo en concreto",
  "Your thoughts": "Lo que piensas",
  "Web address": "Dirección web",
  "I don't": "No tengo",
  "What's wrong with it?": "¿Qué tiene de malo?",
  "What do you like about it?": "¿Qué te gusta de él?",
  "Another one": "Otro más",
  "Add a website": "Agregar un sitio web",
  "Your website": "Tu sitio web",
  "Sent. We will start building.": "Enviado. Vamos a empezar a construir.",
  "{done} of {total} answered. Come back any time to change something.":
    "{done} de {total} respondidas. Vuelve cuando quieras para cambiar algo.",
  "Go back through it": "Repasarlo de nuevo",
  "Say whether you like it.": "Dinos si te gusta.",
  "Add at least one website.": "Agrega al menos un sitio web.",
  "Preview. This is the form a detailer fills in, and nothing here is saved.":
    "Vista previa. Este es el formulario que llena un detailer, y aquí nada se guarda.",
  "About fifteen minutes.": "Unos quince minutos.",
  "It saves as you go. Close it whenever you like and come back to the same place.":
    "Se guarda mientras avanzas. Ciérralo cuando quieras y vuelve al mismo punto.",
  "We start building once it is finished.": "Empezamos a construir cuando lo termines.",
  "Got a website already?": "¿Ya tienes un sitio web?",
  "Your current website": "Tu sitio web actual",
  "Then skip any question it already answers. We will take that from your site.":
    "Entonces sáltate las preguntas que ya responde. Eso lo tomamos de tu sitio.",
  "No preference": "Sin preferencia",
  "Only the owner can answer this, so nothing here will save.":
    "Solo el dueño puede responder esto, así que aquí nada se guarda.",
  "{n} still needed on this page.": "Faltan {n} en esta página.",
  "Nothing gets built until you send this. You can still change anything afterwards.":
    "No se construye nada hasta que envíes esto. Después puedes cambiar lo que quieras.",
  "Finish later": "Terminar después",
  "Skip": "Saltar",
  "I do not want a website": "No quiero un sitio web",
  "{done} of {total} answered · nothing is saved in a preview":
    "{done} de {total} respondidas · en una vista previa nada se guarda",
  "{done} of {total} answered · saved automatically":
    "{done} de {total} respondidas · se guarda automáticamente",
  // ── THE GUIDED TOUR, ALL 36 STEPS — 2026-09-12 ───────────────────────────
  // **THE TOUR RENDERED IN ENGLISH ON A SPANISH DASHBOARD AND NOTHING COULD
  // SEE IT.** `Walkthrough.jsx` holds every step as `["target", "sentence"]`
  // in a `TOURS` table and draws it with `t(sentence)` — a variable, so the
  // coverage script is blind to it by its own stated limit, and `t()` returns
  // an unknown string unchanged. 34 of the 43 entries had no entry here.
  // It is the FIRST thing a new detailer meets, which makes it the worst
  // place in the product for the toggle to quietly do nothing.
  // The words are not touched. This repo records the tour copy as the best
  // writing in the product; translating it is not editing it.
  "Today's date. Everything on this screen is about this one day.": "La fecha de hoy. Todo en esta pantalla es de este día.",
  "A job you booked over the phone goes in here.": "Un trabajo que agendaste por teléfono va aquí.",
  "Somebody asked for a time. Nothing is booked until you answer.":
    "Alguien pidió una hora. Nada queda agendado hasta que respondas.",
  "How many jobs you have today, and what they should bring in.": "Cuántos trabajos tienes hoy, y cuánto deberían dejarte.",
  "Open a job to see the car, the price and the notes, and to take payment.":
    "Abre un trabajo para ver el carro, el precio y las notas, y para cobrar.",
  "A job you have finished. This is where the money gets written down.":
    "Un trabajo que ya terminaste. Aquí es donde se anota el dinero.",
  "How much of the next seven days is still free.": "Cuánto de los próximos siete días sigue libre.",
  "People who have not been back in three months. One press writes to all of them.":
    "Gente que no ha regresado en tres meses. Un toque les escribe a todos.",
  "Two ways to look at the same bookings: a month, or a list you can search.":
    "Dos formas de ver las mismas citas: un mes, o una lista que puedes buscar.",
  "Move through the months. Next month and last month are both here.":
    "Muévete por los meses. El mes que viene y el pasado están aquí.",
  "Each dot is a job. A day with a line through it is blocked off.": "Cada punto es un trabajo. Un día tachado está cerrado.",
  "A day with work on it. Open one and the day appears beside the month.":
    "Un día con trabajo. Abre uno y el día aparece junto al mes.",
  "Everything booked that day, in order, and a button to add another.":
    "Todo lo agendado ese día, en orden, y un botón para agregar otro.",
  "Block the whole day off here, or change your hours for that one day.":
    "Cierra el día completo aquí, o cambia tu horario solo para ese día.",
  "The same period broken down: what you brought in, what you spent, your average job.":
    "El mismo periodo desglosado: lo que entró, lo que gastaste, tu trabajo promedio.",
  "One file for your accountant, covering whatever period you are looking at.":
    "Un archivo para tu contador, del periodo que estés viendo.",
  "Work you have finished and not been paid for. Mark one paid here.":
    "Trabajo que terminaste y que no te han pagado. Marca uno como pagado aquí.",
  "Everything you spend. Write it down here and it comes off your net.":
    "Todo lo que gastas. Anótalo aquí y se resta de tu neto.",
  "Everybody who has ever booked you. Search by name or phone.":
    "Todos los que te han agendado alguna vez. Busca por nombre o teléfono.",
  "Sort by who comes most, who spends most, or who has not been back.":
    "Ordena por quién viene más, quién gasta más, o quién no ha regresado.",
  "Show only the people who have not been in for three months.": "Muestra solo a la gente que no ha venido en tres meses.",
  "Open somebody to see every job they have booked and what they spent.":
    "Abre a alguien para ver cada trabajo que ha agendado y cuánto gastó.",
  "Your own settings live behind here: not the business's, yours.":
    "Tus propios ajustes están aquí detrás: no los del negocio, los tuyos.",
  "Which emails go out on their own, to you and to your customers.": "Qué correos salen solos, a ti y a tus clientes.",
  "What you pay for this, and when the next one goes out.": "Lo que pagas por esto, y cuándo sale el siguiente.",
  "Change the password you sign in with.": "Cambia la contraseña con la que entras.",
  "What this phone or computer remembers, and the language you read.":
    "Lo que recuerda este teléfono o computadora, y el idioma en que lees.",
  "And this is where you start this tour again, any time.": "Y aquí es donde empiezas este recorrido otra vez, cuando quieras.",
  "What is left to finish, and which one to do next. Everything already done is live on your booking page.":
    "Lo que falta terminar, y cuál sigue. Todo lo ya hecho está activo en tu página de citas.",
  "The web address customers use. It works before you own a domain of your own.":
    "La dirección web que usan los clientes. Funciona antes de que tengas un dominio propio.",
  "What you charge for. Nothing can be booked until there is something in here.":
    "Lo que cobras. No se puede agendar nada hasta que haya algo aquí.",
  "Cash, card, Venmo: how you want customers to pay you.": "Efectivo, tarjeta, Venmo: cómo quieres que te paguen los clientes.",
  "The days and times you work, and the days you are off.": "Los días y las horas que trabajas, y los días que descansas.",
  "Send this link to a customer and they book themselves in.": "Manda este enlace a un cliente y se agenda solo.",

  // ── The website brief's live preview (`screens/SiteIntake.jsx`) ────────
  // The panel's own two strings. **The drawn page inside it is deliberately
  // not translated and must not be added here**: every word in it stands in
  // for something the DETAILER will write on their own site — a headline, a
  // service name, a call to action — and the fourth axis is that we do not
  // rewrite somebody else's words. It has read that way since the sample was
  // built.
  "Your site so far": "Tu sitio hasta ahora",
  "Every answer changes this page.": "Cada respuesta cambia esta página.",

  // ── The website brief (`lib/siteIntake.js`) ───────────────────────────
  // **THESE ARE DATA-TABLE VALUES, NOT `t("literal")` CALL SITES**, which is
  // exactly why the coverage ratchet read zero while this screen rendered an
  // English sentence between two Spanish ones. `SiteIntake.jsx` calls
  // `t(q.question)` and `t(step.title)`; a scanner that counts literals cannot
  // see a variable. Same class as `lib/setup.js` and `lib/templates.js`.
  "Let's build your website.": "Vamos a crear tu sitio web.",
  // `SPOTS` in `screens/SiteIntake.jsx` — a data table inside a COMPONENT file,
  // drawn with `t(label)`. Invisible to BOTH passes of the coverage scanner:
  // the literal grep sees a variable, and the data-table walk only reaches
  // `lib/`. Found by walking the brief in Spanish, not by any check.
  "Top of every page": "Arriba en todas las páginas",
  // Catalog's bare JSX text — invisible to the ratchet, English on a Spanish
  // screen until a Spanish walk found it, 2026-09-12.
  "Service": "Servicio",
  "from": "desde",
  "The first one is your base price; each of the others can add money and time, per service.":
    "El primero es tu precio base; cada uno de los demás puede sumar dinero y tiempo, por servicio.",
  "Under the headline": "Debajo del título",
  "Footer only": "Solo en el pie de página",
  "Other sites": "Otros sitios",
  "Any other sites you want to show us?": "¿Hay otros sitios que quieras mostrarnos?",
  "You": "Tú",
  "Your work": "Tu trabajo",
  "What you do, and where": "Qué haces y dónde",
  "Promises": "Promesas",
  "What the site can promise": "Lo que el sitio puede prometer",
  "Photos and prices": "Fotos y precios",
  "Look": "Estilo",
  "How it should look": "Cómo se debe ver",
  "Where": "Dónde",
  "The jobs": "Los trabajos",
  "The work itself": "El trabajo en sí",
  "Proof": "Pruebas",
  "Google, Yelp, Facebook, anywhere else. Paste one per line. The counts from all of them get added together on your site.":
    "Google, Yelp, Facebook o donde sea. Pega uno por línea. Los totales de todos se suman en tu sitio.",
  "One per line. These are the ones your site shows as quotes.":
    "Uno por línea. Estos son los que tu sitio muestra como citas.",
  "Policies": "Políticas",
  "The awkward ones": "Las incómodas",
  "Contact": "Contacto",
  "How people reach you": "Cómo te contactan",
  "Launch": "Lanzamiento",
  "Things that hold a launch up": "Cosas que retrasan un lanzamiento",
  "Growth": "Crecimiento",
  "Where the work comes from": "De dónde viene el trabajo",

  // ── The website brief's questions and options (`lib/siteIntake.js`) ───
  // Every one of these is rendered as `t(q.question)` or `t(o)` — `t()` with a
  // VARIABLE — so none of them was ever counted until `i18n-coverage.mjs`
  // learned to walk the data tables. The example businesses' own NAMES are
  // deliberately absent: they are somebody's name, not our copy.
  "The name as it should appear on the site, punctuation and all":
    "El nombre tal como debe aparecer en el sitio, con puntuación y todo",
  "For the About page: how you started, and how long you have been at it":
    "Para la página Acerca de: cómo empezaste y cuánto tiempo llevas en esto",
  "Your face and name on the site?": "¿Tu cara y tu nombre en el sitio?",
  "Face and name": "Cara y nombre",
  "Name only": "Solo el nombre",
  "Neither": "Ninguno",
  "What should the site say makes you different from the detailer three towns over?":
    "¿Qué debe decir el sitio que te hace diferente del detallador de tres pueblos más allá?",
  "Which towns should the site say you cover?": "¿Qué ciudades debe decir el sitio que cubres?",
  "What should someone be able to do on the first screen?":
    "¿Qué debe poder hacer alguien en la primera pantalla?",
  "Book": "Reservar",
  "Ring you": "Llamarte",
  "Get a quote": "Pedir una cotización",
  "See prices": "Ver precios",
  "See your work": "Ver tu trabajo",
  "Can the site say you are insured?": "¿Puede el sitio decir que tienes seguro?",
  "Yes": "Sí",
  "In progress": "En trámite",
  "What guarantee should the site make?": "¿Qué garantía debe dar el sitio?",
  "If you're not happy with any part of it, we come back and redo it free.":
    "Si no quedas contento con alguna parte, volvemos y lo hacemos de nuevo gratis.",
  "Every job is checked before we leave. Anything missed, we're back within 7 days.":
    "Revisamos cada trabajo antes de irnos. Si se nos pasa algo, volvemos en 7 días.",
  "Coatings carry a written warranty. Everything else is covered by our redo promise.":
    "Los recubrimientos llevan garantía por escrito. Todo lo demás queda cubierto por nuestra promesa de repetirlo.",
  "Anything the site must never say?": "¿Algo que el sitio nunca debe decir?",
  "Photos of your work, for the site": "Fotos de tu trabajo, para el sitio",
  "Should prices be on the site?": "¿Los precios deben estar en el sitio?",
  "Yes, all of them": "Sí, todos",
  "A “from” price": "Un precio «desde»",
  "No, quote on request": "No, cotización a pedido",
  "Should the site read serious and premium, or friendly and local?":
    "¿El sitio debe sonar serio y premium, o cercano y local?",
  "Serious and premium": "Serio y premium",
  "Friendly and local": "Cercano y local",
  "Somewhere between": "Algo intermedio",
  "Colors for the site": "Colores para el sitio",
  "Any wording the site has to use word for word?":
    "¿Hay texto que el sitio deba usar palabra por palabra?",
  "Does the site need an address people can drive to?":
    "¿El sitio necesita una dirección a la que la gente pueda llegar en carro?",
  "No, I go to them": "No, yo voy a ellos",
  "What should the site tell people to have ready?":
    "¿Qué debe pedir el sitio que la gente tenga listo?",
  "Outdoor faucet": "Llave de agua afuera",
  "Power socket": "Toma de corriente",
  "A driveway": "Una entrada de carros",
  "Shade": "Sombra",
  "A parking space": "Un espacio de estacionamiento",
  "Nothing, I carry it all": "Nada, yo lo llevo todo",
  "What should the site say about travel charges?":
    "¿Qué debe decir el sitio sobre los cargos por traslado?",
  "What should the site rule out?": "¿Qué debe descartar el sitio?",
  "Apartment or condo lots": "Estacionamientos de apartamentos o condominios",
  "Public streets": "Calles públicas",
  "Parking garages": "Estacionamientos techados",
  "None of these are a problem": "Ninguno de estos es problema",
  "Any local rules the site should mention?": "¿Alguna regla local que el sitio deba mencionar?",
  "How soon should the site suggest you can come out?":
    "¿Qué tan pronto debe sugerir el sitio que puedes ir?",
  "Same day": "El mismo día",
  "A few days": "En unos días",
  "A week or two": "En una o dos semanas",
  "A month or more": "Un mes o más",
  "It swings": "Varía mucho",
  "Should the site have a section for businesses: dealerships, fleets, offices?":
    "¿El sitio debe tener una sección para empresas: concesionarios, flotas, oficinas?",
  "No": "No",
  "I'd like to": "Me gustaría",
  "Which job should the site push hardest?": "¿Qué trabajo debe promover más el sitio?",
  "Which job should the site quietly steer people away from?":
    "¿De qué trabajo debe alejar el sitio a la gente, sin decirlo de frente?",
  "Which of these should the site give its own section?":
    "¿A cuál de estos debe darle el sitio su propia sección?",
  "Ceramic coating": "Recubrimiento cerámico",
  "Paint correction": "Corrección de pintura",
  "None of these": "Ninguno de estos",
  "Anything unusual the site should list?": "¿Algo fuera de lo común que el sitio deba listar?",
  "Boats": "Botes",
  "Motorcycles": "Motocicletas",
  "RVs": "Casas rodantes",
  "Engine bays": "Compartimentos del motor",
  "Headlight restoration": "Restauración de faros",
  "Pet hair": "Pelo de mascota",
  "Smoke odor": "Olor a humo",
  "Should the site offer a quote as well as a price?":
    "¿El sitio debe ofrecer una cotización además de un precio?",
  "Should the site name the products you use?": "¿El sitio debe nombrar los productos que usas?",
  "How loud should your monthly plans be?": "¿Qué tanto deben destacar tus planes mensuales?",
  "Front and center": "Bien al frente",
  "Mentioned": "Mencionados",
  "Quiet": "Discretos",
  "I don't offer them": "No los ofrezco",
  "So the site does not over-promise: full-time, or alongside another job?":
    "Para que el sitio no prometa de más: ¿tiempo completo, o junto a otro trabajo?",
  "Full-time": "Tiempo completo",
  "Part-time": "Medio tiempo",
  "Will the photos on the site be yours?": "¿Las fotos del sitio serán tuyas?",
  "All mine": "Todas mías",
  "Mostly mine": "Casi todas mías",
  "Some are stock": "Algunas son de banco de imágenes",
  "A wrapped van or signed truck the site could show?":
    "¿Una camioneta rotulada o un camión con tu logo que el sitio pueda mostrar?",
  "Links to where people already review you": "Enlaces a donde la gente ya te reseña",
  "Any reviews you want quoted word for word?":
    "¿Alguna reseña que quieras citar palabra por palabra?",
  "How should the site credit a review?": "¿Cómo debe acreditar el sitio una reseña?",
  "First name and initial": "Nombre y inicial del apellido",
  "First name only": "Solo el nombre",
  "Anonymous": "Anónimo",
  "Don't use them": "No las uses",
  "Certifications the site should show?": "¿Certificaciones que el sitio deba mostrar?",
  "Video for the site?": "¿Video para el sitio?",
  "Yes, plenty": "Sí, bastante",
  "A bit": "Un poco",
  "Any press or local mentions the site should carry?":
    "¿Alguna nota de prensa o mención local que el sitio deba incluir?",
  "What should the site say happens if something gets damaged?":
    "¿Qué debe decir el sitio que pasa si algo se daña?",
  "We're fully insured. Anything we damage, we put right at our cost.":
    "Tenemos seguro completo. Lo que dañemos, lo arreglamos por nuestra cuenta.",
  "Tell us straight away and we'll sort it: repair, replace or refund.":
    "Avísanos de inmediato y lo resolvemos: reparación, reemplazo o reembolso.",
  "What should the site promise if someone is not happy?":
    "¿Qué debe prometer el sitio si alguien no queda contento?",
  "I redo it": "Lo hago de nuevo",
  "Partial refund": "Reembolso parcial",
  "Full refund": "Reembolso completo",
  "Case by case": "Caso por caso",
  "What should the site say about rain?": "¿Qué debe decir el sitio sobre la lluvia?",
  "We work through light rain. Heavy rain and we move you to the next dry slot, free.":
    "Trabajamos con lluvia ligera. Si llueve fuerte, te pasamos al siguiente horario seco, sin costo.",
  "We'll ring the morning of if the weather looks bad and rebook you at no charge.":
    "Te llamamos esa mañana si el clima se ve mal y te reprogramamos sin cargo.",
  "Interior work goes ahead whatever the weather. Exterior we reschedule.":
    "El trabajo de interiores sigue con cualquier clima. El de exteriores lo reprogramamos.",
  "What should the site say if a car is much worse than described?":
    "¿Qué debe decir el sitio si un carro está mucho peor de lo descrito?",
  "If it needs more work than described we'll show you before we start and agree a price.":
    "Si necesita más trabajo del descrito, te lo mostramos antes de empezar y acordamos un precio.",
  "We'll ring you with a revised quote before touching it.":
    "Te llamamos con una cotización ajustada antes de tocarlo.",
  "Heavy pet hair, smoke or sand adds time. We tell you on arrival, never after.":
    "Mucho pelo de mascota, humo o arena toma más tiempo. Te avisamos al llegar, nunca después.",
  "Which of these should the site say you will work on?":
    "¿Sobre cuáles de estos debe decir el sitio que trabajas?",
  "Brand-new": "Nuevos de agencia",
  "Leases": "Carros arrendados",
  "Wraps": "Vinilos",
  "Matte paint": "Pintura mate",
  "Minimum charge, if the site should show one": "Cargo mínimo, si el sitio debe mostrar uno",
  "A license or permit number the site has to display?":
    "¿Un número de licencia o permiso que el sitio deba mostrar?",
  "What should the site say your cancellation policy is?":
    "¿Qué debe decir el sitio que es tu política de cancelación?",
  "Cancel more than 24 hours ahead and there's no charge.":
    "Si cancelas con más de 24 horas de anticipación, no hay cargo.",
  "48 hours' notice please. Less than that and the deposit is kept.":
    "Avisa con 48 horas de anticipación. Con menos, se retiene el depósito.",
  "Just let us know as early as you can and we'll move you.":
    "Solo avísanos lo antes que puedas y te cambiamos la cita.",
  "And what it says about a no-show": "Y qué dice sobre no presentarse",
  "A no-show is charged in full.": "Si no te presentas, se cobra completo.",
  "We wait 15 minutes, then it counts as a cancellation.":
    "Esperamos 15 minutos y después cuenta como cancelación.",
  "First one's free. After that we ask for a deposit.":
    "La primera vez no se cobra. Después pedimos un depósito.",
  "Which ways to pay should the site list?": "¿Qué formas de pago debe listar el sitio?",
  "Venmo": "Venmo",
  "Zelle": "Zelle",
  "Cash App": "Cash App",
  "PayPal": "PayPal",
  "Which discounts should the site advertise?": "¿Qué descuentos debe anunciar el sitio?",
  "Military": "Militares",
  "First responder": "Personal de emergencias",
  "Senior": "Adultos mayores",
  "Student": "Estudiantes",
  "Repeat customer": "Clientes que repiten",
  "Should the site sell gift cards?": "¿El sitio debe vender tarjetas de regalo?",
  "At Christmas": "En Navidad",
  "Which number should the site use?": "¿Qué número debe usar el sitio?",
  "Where on the page should the number go?": "¿En qué parte de la página debe ir el número?",
  "Should the site invite text messages?": "¿El sitio debe invitar a mandar mensajes de texto?",
  "Only after booking": "Solo después de reservar",
  "What should the site promise about how fast you reply?":
    "¿Qué debe prometer el sitio sobre qué tan rápido respondes?",
  "Within the hour": "Dentro de la hora",
  "Within a day": "Dentro del día",
  "When I can": "Cuando pueda",
  "Should the site show your email?": "¿El sitio debe mostrar tu correo?",
  "Should the site have a contact form as well as booking?":
    "¿El sitio debe tener un formulario de contacto además de la reserva?",
  "Which socials should the site link, and which should it leave off?":
    "¿Qué redes debe enlazar el sitio y cuáles debe dejar fuera?",
  "Should the site be in Spanish too?": "¿El sitio también debe estar en español?",
  "Whole site": "Todo el sitio",
  "Booking part only": "Solo la parte de reservas",
  "Do you own a web address for it? Which registrar, and have you got the login?":
    "¿Ya tienes una dirección web? ¿Con qué proveedor, y tienes el acceso?",
  "If not, what should the address be?": "Si no, ¿cuál debería ser la dirección?",
  "Is there a site now? What is wrong with it, and who controls it?":
    "¿Hay un sitio ahora? ¿Qué tiene de malo y quién lo controla?",
  "Have you got a logo for it?": "¿Tienes un logo para el sitio?",
  "A vector file (.ai .svg .eps)": "Un archivo vectorial (.ai .svg .eps)",
  "A PNG or JPG": "Un PNG o JPG",
  "A photo of one": "Una foto de uno",
  "No logo": "Sin logo",
  "Is there a business email on that address?": "¿Hay un correo de la empresa en esa dirección?",
  "Don't know": "No sé",
  "Is your Google Business Profile claimed and verified?":
    "¿Tu Perfil de Empresa de Google está reclamado y verificado?",
  "Anything already written the site could use? Flyer text, an Instagram bio.":
    "¿Algo ya escrito que el sitio pueda usar? Texto de un volante, una biografía de Instagram.",
  "Anyone else who has to approve the site?": "¿Alguien más tiene que aprobar el sitio?",
  "Where do people find you today?": "¿Dónde te encuentra la gente hoy?",
  "Word of mouth": "De boca en boca",
  "Instagram": "Instagram",
  "Google": "Google",
  "Facebook": "Facebook",
  "A sign on the van": "Un rótulo en la camioneta",
  "Ads": "Anuncios",
  "What should the site bring you more of?": "¿De qué debe traerte más el sitio?",
  "Any season the site should push?": "¿Alguna temporada que el sitio deba promover?",
  "Will you send ads to the site?": "¿Vas a mandar anuncios al sitio?",
  "I've tried": "Lo he intentado",
  "Should the site ask people to sign up for offers and reminders?":
    "¿El sitio debe pedirle a la gente que se suscriba para recibir ofertas y recordatorios?",
  "Maybe later": "Quizá después",
  "Must have on the site": "Indispensable en el sitio",
  "Must not have": "Que no debe tener",
  "Anything about your business the site should say that we did not ask?":
    "¿Algo de tu negocio que el sitio deba decir y que no te preguntamos?",
  "Anything on this form you weren't sure how to answer?":
    "¿Algo de este formulario que no supiste cómo responder?",
  "Too busy": "Muy cargado",
  "Too plain": "Muy simple",
  "Too dark": "Muy oscuro",
  "Too much movement": "Demasiado movimiento",
  "Not enough movement": "Poco movimiento",
  "Hard to read": "Difícil de leer",
  "Too much text": "Demasiado texto",
  "Couldn't find the price": "No encontré el precio",
  "Not my kind of business": "No es el estilo de mi negocio",
  "Movement, or still?": "¿Con movimiento o quieto?",
  "Moves as you scroll": "Se mueve al desplazar",
  "Sits still": "Se queda quieto",
  "Photos big, or facts big?": "¿Fotos grandes o datos grandes?",
  "The car fills the screen": "El carro llena la pantalla",
  "Words and numbers lead": "Mandan las palabras y los números",
  "Dark, or light?": "¿Oscuro o claro?",
  "Dark background": "Fondo oscuro",
  "Light background": "Fondo claro",
  "A big photo up top. Three pages.": "Una foto grande arriba. Tres páginas.",
  "Dark, with the work drawn out step by step.": "Oscuro, con el trabajo explicado paso a paso.",
  "The whole price list on the page. Three colors to pick from.":
    "Toda la lista de precios en la página. Tres colores para elegir.",
  "Light and papery. A real before-and-after slider.":
    "Claro y con textura de papel. Un control real de antes y después.",
  "One huge photo and one loud red.": "Una foto enorme y un rojo fuerte.",
  "The whole look": "El aspecto general",
  "The colors": "Los colores",
  "The photos": "Las fotos",
  "The layout": "La distribución",
  "The wording": "El texto",
  "How it moves": "Cómo se mueve",
  "Easy to read": "Fácil de leer",
  "Looks expensive": "Se ve caro",
  "Feels local": "Se siente local",
  "Straight to the point": "Directo al grano",
  "Site 1": "Sitio 1",
  "Site 2": "Sitio 2",
  "Site 3": "Sitio 3",
  "Site 4": "Sitio 4",
  "Site 5": "Sitio 5",
  "Paste anything, detailing or not. Say what you like or hate about each one.":
    "Pega lo que sea, de detallado o no. Di qué te gusta o qué odias de cada uno.",
  "Leave one blank and the site says nothing about it.":
    "Deja uno en blanco y el sitio no dice nada al respecto.",
  "These go on the site as your policy. One site in fifty-two has a rain policy. It is free to be the one that does.":
    "Esto va en el sitio como tu política. Un sitio de cada cincuenta y dos tiene política de lluvia. No cuesta nada ser ese.",
  "Who are you?": "¿Quién eres?",
  "What people say about you": "Lo que dice la gente de ti",
  "Questions customers ask": "Preguntas que hacen los clientes",
  "Getting paid": "Cobrar",
  "Plans": "Planes",
  "Messages you send": "Mensajes que envías",
  "Messages": "Mensajes",
};
