# VISUAL CHANGES — the review list

**What this is:** every change a person can SEE, one entry each, written so
Andrew can walk them one at a time and tick them off. Started 2026-09-13.

## THE STANDING RULE — every lane B session, every visual change, before you finish

**A visual change is not finished until it has an entry here.** Five lines:

1. **The screen**, in plain English. What a person would call it, not a filename.
2. **Where to open it** on `localhost:5173` — the full address, and if it is not
   a bare address, the taps that get you to that step or tab.
3. **WAS** — one sentence on what it was like before.
4. **NOW** — one sentence on what it is like today.
5. **Visual: yes / no** — yes means Andrew reviews it.

**THE TWO SENTENCES ARE THE WHOLE POINT AND THEY HAVE A REGISTER.** Write them
the way you would describe the change to a friend who has never seen this
product. **No jargon, no pixel counts, no class names, no commit numbers,
nothing that needs the code to understand.** This is the bar:

> *"Your licence and insurance details were six empty boxes; now they are a list
> of your own words that opens when you tap it."*

Andrew has said before that a plain-language rewrite was *way better and much
more understandable*. That is the standard for every line in this file.

**There are no before-and-after pictures**, so no commit is needed to take one.
The `changed in` column is bookkeeping for the next session, not something to
read.

**A bug fix, a server change or a check is NOT visual** — mark it `no` and keep
it short. He only reviews things he can look at.

**FIRST, SIGN IN.** Everything under `/app` needs
`demo@detailplatform.com` / `demo123`. The booking pages need no sign-in.

---

## 1 · The questionnaire that builds your website

**Open:** `localhost:5173/website`

**WAS:** You answered twenty-one questions about the website you wanted and
there was nothing on the screen to look at — you got to the end without ever
seeing the thing you were describing.

**NOW:** A small picture of your actual website sits beside the questions on
fourteen of the steps and fills itself in as you answer — your business name,
your headline, your list of prices, your phone number in the spot you asked for
it, and your own color.

**Visual: yes.** · changed in `b70836c`

---

## 2 · Business info, in your settings

**Open:** `localhost:5173/app?settings=info`

**WAS:** Nineteen text boxes in one long stack, all exactly the same shape, with
four sentences scattered down the page explaining who each one was for — and
your licence and insurance details were six empty boxes sitting open.

**NOW:** The page is four titled sections instead of one flat list; your
credentials are a short list of your own words that opens one at a time when you
tap it; your logo and cover photo are picture tiles you tap rather than grey
"Choose file" buttons; and the year and phone boxes are small instead of running
the whole width of the screen.

**Visual: yes.** · changed in `78ec4af`

---

## 3 · Promo codes and the sale

**Open:** `localhost:5173/app?settings=promos`

**WAS:** The sale at the top of the page had proper switches and sliders, and
the codes underneath were four bare boxes and a tick box — the box marked
"Value" never told you whether typing 20 meant twenty percent off or twenty
dollars off, and the two limits sat out in the open with their rule written in
brackets after the label.

**NOW:** You choose "% off" or "$ off" and the box changes to match so the
question cannot be got wrong, a sentence under it says in plain words what a
customer typing that code will pay, the two limits fold away behind a single row
that tells you what they are set to, and typing a code you have already used no
longer wipes everything you just typed. Five things that were still coming out
in English on the Spanish dashboard now read Spanish.

**Visual: yes.** · changed in `7ce8b60`

---

## 4 · The booking page, step 3 — which car

**Open:** `localhost:5173/book/demo-detail`, then answer step 1 and step 2 and
you are on it.

**WAS:** "What are you bringing?" was an empty box that did nothing. Typing
"Outback", "toyot" or "f150" offered you nothing at all.

**NOW:** It suggests real cars as you type — about eleven hundred of them — and
you can still ignore the list and type whatever you like, in any language.

**Visual: yes.** · changed in `da4f8d1`

---

## 5 · The booking page, step 4 — the address

**Open:** `localhost:5173/book/demo-detail`, then on to step 4. Pick the mobile
option on that step so the address box appears.

**WAS:** You typed your address into a plain box and nothing helped you or
checked it.

**NOW:** There is a Find button beside it. Press it and real addresses come back
to pick from, with a small credit line under the field saying where they came
from. It never gets in your way — no answer, a slow answer or ignoring it
entirely all leave what you typed alone and let you carry on.

**Visual: yes.** · changed in `55503d7`

---

## 6 · Lists that were drawing underneath the next question

**Open:** n/a

**WAS:** On the car step, the list of suggested cars appeared behind the block
below it, so tapping a car could hit the next question instead.

**NOW:** It appears in front, everywhere in the product that has a list like
this.

**Visual: no** — a fix, not a new thing to look at. · changed in `55503d7`

---

## 7 · Small buttons that were hard to hit

**Open:** n/a

**WAS:** Several small controls — the sort chips on Clients, the range chips on
Money, the "Waiting on payment" rows — were a few pixels short of a comfortable
thumb.

**NOW:** They are all comfortably tappable. **They look exactly the same on
purpose**; only the invisible area your thumb can land on grew.

**Visual: no** — nothing on the screen changed. · changed in `7aacb02`

---

## 8 · The booking page in Spanish, showing the detailer's own words

**Open:** `localhost:5173/book/demo-detail?lang=es` and walk it through to the
end. Compare it with `localhost:5173/book/demo-detail?lang=en`.

**WAS:** Switching the booking page to Spanish translated everything WE wrote —
the buttons, the headings, the prompts — and left everything the DETAILER wrote
in English. A Spanish-speaking customer read "Elige tus servicios" over a list
that said "Express Wash", "Wash & Wax" and "Ceramic Coating", and the travel
area on the address step still said "Beyond 15 miles". The Spanish had already
been written and paid for; nothing on any page had ever asked for it.

**NOW:** The detailer's own words come through in Spanish too — service names
and what each one includes, the add-ons, the category headings, the plan names,
the tagline under the business name, the service area and the travel areas. The
business NAME is deliberately untouched and reads exactly the same in both
languages, and so do customer reviews, because those are a named person's own
words. Nothing changes for anyone reading the page in English.

**Visual: yes.** · changed in the commit this file ships with

---

## 9 · Today — the screen you open every morning

**Open:** `localhost:5173/app` (it is the screen you land on after signing in).

**WAS:** The day's jobs were five identical lines, so the one you were about to
drive to looked exactly like the one at five o'clock, and nothing on the screen
said which. Above them sat two big cards for jobs people had requested for
dates two weeks away — on a phone those two cards filled the whole first screen,
so today's money and today's first job were both below the fold. The money strip
underneath had three boxes and two of them repeated the line above it word for
word, while the third quietly changed its mind during the day: in the morning it
showed what the day was worth and by the afternoon it showed what had been paid,
with only a small word underneath to tell you which one you were looking at.

**NOW:** Your money is the first thing under the date — two numbers that always
mean the same thing, what today is worth and what has come in. Then the job that
matters right now stands out as a card with the words **Happening now** on it in
your own color, or **Up next** if it has not started, while the rest of the day
stays a quiet list. The requests for other weeks moved below your day and now
show one card to answer plus a one-line row for each of the others, so they are
still one flick away and no longer in front of the work. Five things that were
coming out in English on the Spanish dashboard now read Spanish.

**Visual: yes.** · changed in the commit this file ships with

---

## 10 · Calendar — the month

**Open:** `localhost:5173/app`, then tap **Calendar** at the bottom.

**WAS:** On a phone the month ended about two thirds of the way down the
screen and the rest was empty — nothing at all under it. Every date looked the
same whether it had gone or was still to come, so you had to read the numbers
to work out what was left of the month. The little key underneath took two
lines to explain four marks. And if you flicked forward to look at October or
November, the only way back to today was to press the arrow once for every
month you had moved.

**NOW:** Today's jobs are already open underneath the month when you arrive,
with the times, the names and what each one is worth, and today's square is
ringed to show which day you are looking at. Dates that have already passed
are printed softer, so what is still to come is what your eye lands on. The
key is one line. And the moment you move off this month a small **Today**
button appears at the top; pressing it brings you straight back with today's
jobs open again. At a desk nothing about the month changes — it still writes
every job out in the squares — and on a very wide screen the day now opens
beside the month instead of leaving that space blank.

**Visual: yes.** · changed in the commit this file ships with

---

## 11 · Calendar in Spanish

**Open:** `localhost:5173/app` in Spanish, then tap **Calendario**.

**WAS:** The seven letters across the top of the month were the English ones —
a Spanish month was headed S M T W T F S. The word for a day nobody turned up
on was still in English in the key underneath.

**NOW:** The letters read D L M X J V S, which is how a Spanish calendar
writes them, and the key reads Spanish all the way across. Three things the
screen says out loud for anyone using a screen reader — how many jobs a day
has, that a day is blocked, and that a day takes only one kind of work — were
also still English and now are not. Nothing changes in English.

**Visual: yes.**

---

## 12 · Presses that used to land in the gap between two dates

**Open:** n/a

**WAS:** On a narrow phone each date in the month was a small square with a
few pixels of nothing between it and the next one. A thumb that landed in
between hit neither date and nothing happened at all.

**NOW:** The squares look exactly the same, but the area your thumb can land
on now runs right up to the next one, so there is no gap left to miss into. On
the narrowest phones a seven-day month cannot give each date a full-size
target — that is arithmetic, not a choice — but no press is thrown away.

**Visual: no** — nothing on the screen changed. Recorded so it is not
re-reported as an unfixed small-target problem.

---

## 13 · The side menu was sitting on top of the month

**Open:** `localhost:5173/app` → Calendar, on a screen wider than about 1500
pixels, with a day open.

**WAS:** On a wide monitor, opening a day made the calendar spread out to use
the extra room — and the little Today/Calendar/Money strip down the left-hand
side stayed where it was, ending up on top of four columns of the month. Four
dates a week could not be clicked at all.

**NOW:** The strip moves out of the way with the rest of the page. It is older
than anything in this batch — any click on any date on a wide screen did it —
but it now shows up the moment the screen opens, so it is fixed.

**Visual: yes** — only if you have a monitor wider than about 1500 pixels.

---

## 14 · Money — the money you are still waiting for

**Open:** `localhost:5173/app` → Money, on a phone-sized window. You only see
this block when somebody has finished work they have not paid you for.

**WAS:** The list of people who owe you money was near the bottom of the page.
You had to scroll past the chart, the four figures, the most-booked service,
the tips and two buttons before you found out whether anyone was late paying
you.

**NOW:** It sits right under the chart, so the total and the first name are
both on screen the moment the page opens. On a wide monitor nothing moves —
it was already in the right-hand column, in plain sight.

**Visual: yes.**

---

## 15 · Money — the figure that said you had been paid when you had not

**Open:** `localhost:5173/app` → Money, and again under "The full picture".

**WAS:** The first figure in the grey box was headed "Collected", and it added
up every job you had finished whether the customer had paid or not. So the
page could say you had collected $410 with "Waiting on payment · $175" an inch
below it, and the Today screen would say you had collected nothing from the
same two jobs.

**NOW:** It says "Brought in", which is what it has always counted — the work
you did, paid for or not. The amount has not changed. What has actually landed
in your bank is the "Waiting on payment" list's job, and "The full picture"
still spells it out as in the bank and still owed.

**Visual: yes.**

---

## 16 · Money — two orange buttons that were shouting

**Open:** `localhost:5173/app` → Money, with somebody owing you money.

**WAS:** Each person who owed you money had a full-width orange "Mark paid"
button under their name. Once that list moved up the page, two or three of
them were the loudest thing on a screen whose whole job is one big number.

**NOW:** Mark paid is a small outlined button. It is still one tap and still
in the same place; it just stops competing with the figure at the top.

**Visual: yes.**

---

## 17 · Money — a sentence that had glued itself to the wrong heading

**Open:** `localhost:5173/app` → Money, in a month with only a job or two in
it.

**WAS:** "Too few finished jobs to name a most-booked service." sat hard
against the words "QUOTED UP FRONT" directly beneath it, so it read as an
explanation of that figure rather than as the line standing in for the
most-booked service.

**NOW:** There is a small gap under it and it reads as its own sentence.

**Visual: yes.**

---

## 18 · Clients — who is worth ringing, without scrolling for it

**Open:** `localhost:5173/app` → Clients.

**WAS:** The page opened on a search box and a list of everybody, most
recently seen first. The people who had stopped coming — the whole reason a
detailer opens this screen — were therefore at the very bottom, under
everyone who had just been in, and you only found them by pressing a button
and scrolling. Who spends the most with you took another press and then a
read of the top row.

**NOW:** Two answers sit above everything else the moment the page opens: how
many people have gone quiet, and who spends the most with you and how much.
Each one is also a button — press the count and the list becomes exactly those
people, with "Text these 8" sitting beside it ready to go; press the amount
and the list reorders by who spends the most. A member of staff who is not
allowed to see money sees only the first of the two.

**Visual: yes.**

---

## 19 · The bar at the bottom of the phone, and the page underneath it

**Open:** `localhost:5173/app` on a phone, then **Clients** or **Business**, and
scroll until a row reaches the bottom of the screen.

**WAS:** The bar with Today, Calendar, Money, Clients and Business floats over
the page, and it is made of frosted glass — so a customer's whole row, their
name, what they spent and their phone number, stayed readable straight through
it. The page just carried on behind the glass, which made the bottom of every
screen look cut off rather than finished.

**NOW:** The page fades into the background before it reaches the bar, so the
bar sits on clean ground and nothing shows through it. The bar itself looks
exactly the same.

**Visual: yes.**

---

## 20 · The bottom bar on an iPhone, in Safari

**Open:** `localhost:5173/app` on a phone. **This one really needs your own
phone**, because a computer has no Safari address bar to slide away.

**WAS:** The bar was pinned to the bottom of the page rather than to the bottom
of what you can actually see. Safari's address bar slides away as you scroll
down and comes back as you scroll up, and the bar jumped about 34 pixels each
time it did — and while the address bar was showing, part of the tab bar was
behind it.

**NOW:** The bar is pinned to the bottom of what you can see, so it stays put
whichever way the address bar is and never goes behind it. Nothing changes on a
computer, or when the app is opened from the home screen.

**Visual: yes** — and it is the one on this list that can only be checked on
your own phone.

---

## 21 · Presses that landed in the gap around the tab buttons

**Open:** n/a

**WAS:** The bar has five pixels of padding around the row of buttons and two
between them. A thumb landing in that edge hit the bar itself, which does
nothing, so about one press in ten near an edge was thrown away.

**NOW:** Every part of the bar belongs to the button nearest it. The buttons
look exactly the same; only the invisible area your thumb can land on grew.

**Visual: no** — nothing on the screen changed.

---

## 22 · Adding the dashboard to your home screen

**Open:** n/a — it is what happens when you add the site to your iPhone home
screen and open it from there.

**WAS:** There was no file telling the phone what belongs to the app. iOS then
guesses from whichever page you were on when you pressed Add to Home Screen,
and anything it decides is outside the app opens with an address bar and a back
button on top — which is what you saw every time you pressed a tab.

**NOW:** There is one, and it says the whole site is the app, that it opens on
your dashboard, and that it opens without browser furniture.

**Visual: no** — nothing on any screen changed, and **it needs you to delete the
old home-screen icon and add it again** before the phone reads the new file.

---

## 23 · Your booking address, broken across two lines mid-word

**Open:** `localhost:5173/app` → **Business**, at the top under **Your booking
page**.

**WAS:** On a narrow phone the address broke wherever it ran out of room:
"detailingplatform.com/book/demo-deta" on one line and "il" alone on the next.
It is the one thing on that screen you copy and send to customers, so it read as
broken.

**NOW:** If it has to go onto two lines it breaks after the ".com", so it reads
as an address on two lines rather than a word snapped in half. Copy still copies
the whole thing on one line.

**Visual: yes.**

---

## 24 · Money — "The full picture" floating in an empty gap

**Open:** `localhost:5173/app` → **Money**, and scroll to just under the box of
four figures.

**WAS:** "The full picture" was four words on their own in the middle of a lot
of empty space, with no outline and nothing around them, so it read as a heading
over a gap where something had failed to load. It was a button all along.

**NOW:** It is a row like the one under it — a small chart mark, the words "The
full picture", a line saying what is behind it, and an arrow on the right. The
two doors on that screen now match.

**Visual: yes.**

---

## 25 · The tour that kept coming back

**Open:** `localhost:5173/app` → press any tab you have not opened before, wait
a second, and press **Skip the tour**. Then press the other tabs.

**WAS:** There were six separate guides, one behind each tab, and pressing Skip
only silenced the one in front of you — so saying "skip" once still left five
more waiting to ambush you, one per tab. Worse, saying skip on the laptop was
worth nothing on the phone, because the product only remembered it in that one
browser.

**NOW:** One Skip is the end of it. Whichever guide you dismiss, and whether you
skip it or reach the last step, the product writes down that you are done — on
your account, not just on that browser — so it stays quiet on your phone too.
The gear menu's "Show me around" still runs the whole tour whenever you want it.

**Visual: yes.**

---

## 26 · The back office — changing what we charge

**Open:** `localhost:5173/admin` (your own master login, not the demo
detailer) → the **Money** tab → the **What we charge** box.

**WAS:** The box listed the eleven prices and that was all you could do with
them — look. The ability to set your own prices was still in the product, but
the only way to reach it was to send the command by hand, so in practice the
figures were fixed wherever they happened to be.

**NOW:** There is a **Change these prices** button under the list. It turns each
figure into a box you can type in, with what that figure will read as shown
beside it — so a contract length says "12 months" and the exit fee says "50% of
what is left" as you type, and a wrong number looks wrong immediately. Save
sends the whole table, and a second button puts it back to the built-in prices.

**Visual: yes.**

---

## 27 · Business — your link, what to do next, and what everything is filed under

**Open:** `localhost:5173/app` → **Business** at the bottom.

**WAS:** The page opened on the title, then a reminder box, and your booking
link — the one thing on this screen you actually send to customers — was the
third thing down. The reminder said "Finish setting up · 3 of 11 done" and
nothing else: it did not say which of the eight was next, and pressing it
dropped you at question one of eleven whatever you had already answered, so you
tapped "I'll do this later" two or three times to get to the one you needed.
Underneath, everything you can change sat in three lists, and the first of them
held seven unrelated things — your name and phone, your color, your photos, your
reviews, your questions, your web address, and a count of who clicked your
flyer — all under one heading.

**NOW:** Your booking link is the first thing on the page, with Copy, Open and
the QR code, and Share above them on a phone. The reminder sits under it and
names the next thing to do — "Next: Hours" — with "3 of 11 done" as the smaller
line, and pressing it opens setup at that question rather than at the first one.
Everything below is filed under four headings that say what you are trying to
do: what customers see, what you charge for, when you can be booked, and where
customers come from. Two rows moved as part of that — your web address now sits
beside your tracking links, because those are the only two rows that change or
measure the link at the top of the page, and maintenance deadlines moved next to
your hours, because a deadline is a customer who should be on your calendar and
is not.

**Visual: yes.**

---

## 28 · Booking step 4, "Pick a place", on a phone

**Open:** `localhost:5173/book/demo-detail` → pick any service → Continue →
Continue → Continue. That is step 4 of 7.

**WAS:** On a phone the page ran ten pixels off the bottom of the screen, so the
last question was cut and you had to scroll a step that is meant to fit. The two
choices at the top — "We come to you" and "Drop it off" — were spaced as far
apart as two separate sections of the page, even though they are one question
with two answers.

**NOW:** The two choices sit close together, the way the service list and the
car sizes already do everywhere else in the booking flow, and the whole step now
fits on a phone with room to spare. Nothing was removed and no wording changed.

**Visual: yes.**

---

## 29 · The back office, at `/admin` — three things it could not do

**Open:** `localhost:5173/admin`, then open any detailer. **Only Andrew can see
this one** — the sign-in needs the platform admin account.

**WAS:** Three things the server had been able to do for a week had no button
anywhere. You could not take a copy of a detailer's own data, which is what our
own terms promise them on request. A business with nobody signed up as its owner
said so and offered no way to fix it, so the only route was opening the database
by hand. And the photo storage line said a percentage and nothing else, so there
was no way to see that more space had been promised to detailers than actually
exists.

**NOW:** An open detailer has "Download everything they own", which saves a file
of their customers, bookings and prices, and "Send an owner invite", which emails
somebody a link that makes them the owner — and shows you the link to send by
hand if the email does not go out. The photo storage line reads as real amounts
rather than a percentage, says how much has been promised to each detailer, and
says out loud when more has been promised than exists.

**Visual: yes.**

---

## 30 · Every button and box in the back office got bigger to press

**Open:** `localhost:5173/admin` — the sign-in page shows it without an account.

**WAS:** Every button in the back office was about thirty pixels tall and the
text boxes about thirty-nine, which is under the size a thumb can reliably hit.
The eye that shows your password was thirty-four pixels square.

**NOW:** All of them are forty-four, which is the size this product uses
everywhere else. The eye looks exactly the same size as before; only the area
around it that responds to a press got bigger.

**Visual: yes.**

---

## 31 · Booking step 5, "Pick a time" — the price stopped moving in silence

**Open:** `localhost:5173/book/demo-detail` → pick any service → Continue →
Continue → Continue → choose "Drop it off" → Continue. That is step 5 of 7.
Then pick a **Saturday** and any time.

**WAS:** Picking a Saturday quietly put the total up by thirty dollars. Nothing
on the screen said so. The words "Weekend rate" did not appear until two steps
later, on the final receipt, and by then the customer had typed their name,
their phone and their email. Every other step in the flow already says what it
costs: a bigger car reads "+$15", a further-out area reads "· +$40", and every
service and add-on carries its own price. This was the only step that changed
the number and said nothing.

**NOW:** The moment a time is chosen, the reason for any extra sits in plain
words right under the times — "Weekend rate · +$30" — using the detailer's own
name for the rule, which is the same name that appears on the receipt at the
end. On an ordinary weekday nothing shows, because nothing was added.

**Visual: yes.**

---

## 32 · Booking step 5 — a customer now learns it is a request before they fill the form

**Open:** the same step 5 as above, on `demo-detail`, which is a business that
accepts requests rather than confirming instantly. Pick a day and a time.

**WAS:** A business that checks each booking by hand draws exactly the same
calendar as one that confirms on the spot. Nowhere in seven steps did the flow
say which kind it was. The only clue was the three words on the very last
button, "Request this time" — after the customer had given their name, their
phone number, their email and their address.

**NOW:** As soon as a time is picked, one line under the times says "We confirm
each booking ourselves. You will get an email once this time is accepted." A
business that confirms instantly shows nothing, because nothing needs saying.

**Visual: yes.**

---

## 33 · Money — the top of the page now says where your bookings came from

**Open:** `localhost:5173/app`, sign in, tap **Money**, and scroll past the
chart and the expenses summary. It sits under "The full picture".

**WAS:** One line of grey text, "Where your money comes from", with a sentence
under it offering to make a link for a flyer. Nothing else. Every number was
two taps away on another screen, so there was no way to look at Money and tell
whether the flyer or the Instagram post was worth the trouble.

**NOW:** A block called "Booking sources" listing each place you advertise, one
line each, with a green bar so the best one is obvious at a glance. Under every
name are the three numbers: how many people opened that link, what share of
them booked, and how much finished work it has earned you. Below the block one
sentence says how many of this month's bookings came through a link at all. The
door to the links themselves is still there, under it, for making a new one.

**Visual: yes.**

---

## 34 · Tracking links — the answer first, the form last

**Open:** `localhost:5173/app` → **Business** → **Tracking links**.

**WAS:** The page opened with a three-box form for making a new link, so the
first thing you met was work. The sentence at the top led with "Make a separate
booking link", and the second thing it said was that a discount gets applied.
Your existing links and their numbers were below all of that.

**NOW:** The page opens with your links and what each one did. The sentence at
the top leads with what the page answers — each link counts who opened it and
who booked. Making a new one is a "Make a link" fold at the bottom, the same
kind of fold the job page uses, and the discount is explained beside its own
box inside that fold rather than in the opening line.

**Also:** the money on each row now says "$850 earned" instead of just "$850",
and the discount code no longer rides on the row — it is in the panel that
opens when you tap the link, which already explained it in a sentence.

**Visual: yes.**

---

## 35 · The two screens can no longer disagree about the same flyer

**Open:** compare a link's numbers on Money with the same link on Tracking
links.

**WAS:** Each screen counted for itself. Tracking links counted page opens, so
one person deciding over three visits counted as three; Money's block did not
exist yet.

**NOW:** Both read the same piece of arithmetic, and it counts people rather
than page loads, which is what the sentence at the top of Tracking links always
claimed it was showing. Money shows the period you have chosen at the top of
that screen; Tracking links shows all time.

**Visual: no.** Numbers on Tracking links may read slightly lower than before,
because a repeat visitor is now one person.

---

## 36 · Today — the weather for the day you are about to work

**Open:** `localhost:5173/app`, the Today tab. It sits under the date.

**WAS:** Nothing. The weather service was built on the server side and no screen
ever showed it, so it may as well not have existed.

**NOW:** One quiet line under the date — the part of the day, the temperature,
what the sky is doing and the chance of rain, like *"Tonight · 68° · Patchy Fog
· 5% rain"*. It is free and it comes from the US National Weather Service.

The first time you open Today it does **not** pop up a location request. It
shows a small "Show today's weather" you can press, and only then does your
phone ask. After that it just draws every morning. If you say no, it never asks
again and the line is simply not there. If anything at all goes wrong — no
signal, the service is down, you are outside the United States — you get
nothing rather than an error, and nothing about the day waits for it.

It does not block a time, move a job, warn a customer or cancel anything. It
only tells you what the sky is going to do.

**Visual: yes.**

---

## 37 · Booking — the monthly-plans offer moved off the first screen

**Open:** `localhost:5173/book/demo-detail`. Look at step 1, then pick a service
and press Continue to reach step 2.

**WAS:** A bright orange "Plans from $120 a month" button sat at the very top of
step 1, above the list of services — the loudest thing on the screen, offering a
stranger a monthly commitment before they had seen a single price.

**NOW:** It is on the Add-ons step instead, which is where a customer is already
being shown things to add, so "or get it every month" reads as one more option
rather than an interruption. Step 1 is just the services now. Add-ons keep their
own step, as you asked.

**Visual: yes.**

---

## 38 · Booking — typing your car picks your vehicle size for you

**Open:** `localhost:5173/book/demo-detail`, pick a service, Continue, Continue
to reach step 3. Type "Suburban" into "What are you bringing?".

**WAS:** You chose Small, Medium or Large yourself with nothing to help you, and
a lot of people guess wrong.

**NOW:** Type your car and the right size lights up, with a line under the box
saying which one and why — *"Suburban · set to Large"*. Tap a different size and
it takes yours and stops suggesting for the rest of the booking.

It reads the detailer's **own** words for their sizes — "Coupe, sedan,
hatchback", "Truck, large SUV, van" — so it works whether a business has three
sizes or five, whatever they have called them. If their wording is too vague to
be sure, or the car is one it does not recognise, it picks nothing at all and
you choose as before. **A wrong guess would quote somebody the wrong price, so
it would rather say nothing.**

**Visual: yes.**

---

## 39 · Money — the "6 months" button stopped going onto two lines

**Open:** `localhost:5173/app`, the Money tab, on a phone.

**WAS:** The words "6 months" broke across two lines inside their own button,
which made the whole row of Week / Month / 6 months / Year / Lifetime taller
than it needed to be.

**NOW:** One line, on every phone from 361 pixels wide up. On the very narrowest
phones it still wraps, because the word genuinely does not fit there.

**Visual: yes.**

---

## 40 · The back office — pressing Suspend now visibly does something

**Open:** `localhost:5173/admin`, sign in as `demo@demo.com`, the Detailers tab,
tap any detailer to open their panel.

**WAS:** You pressed Suspend, confirmed it, and the panel carried on saying the
detailer was live and still offered you the Suspend button. Nothing anywhere
said it had worked, so the natural thing was to press it again.

**NOW:** The panel re-reads that detailer the moment an action finishes, so it
says "suspended" and offers to put them back. Every button in that panel behaves
the same way.

**Visual: yes.**

---

## 41 · The back office — "1 hours ago"

**Open:** `localhost:5173/admin`, the Plumbing tab, the "Jobs that run on their
own" block. Also the Detailers list.

**WAS:** Anything that had happened about an hour ago read *"1 hours ago"*, and
older things read *"1 months ago"* and *"1 years ago"*.

**NOW:** *"1 hour ago"*, *"1 month ago"*, *"1 year ago"*. It matters most on the
Plumbing tab, because a scheduled job that has stopped is usually about an hour
stale the first time you look at it, so the broken-looking sentence was the one
you were most likely to read.

**Visual: yes.**

---

## 42 · The back office — a detailer's job count says which jobs it means

**Open:** `localhost:5173/admin`, the Detailers tab, the list of businesses.

**WAS:** A row could say *"Booking · last one today"* and, an inch underneath,
*"0 jobs this month"*. Both were true — the count only ever meant FINISHED jobs
— but together they read as a broken screen.

**NOW:** The row says *"0 finished jobs this month"*, which is what the number
has always been, and what the open panel already called it.

**Visual: yes.**

---

## 43 · The back office — two things too small to press on a phone

**Open:** `localhost:5173/admin`, the Detailers tab: the row of filter buttons
(Everyone, Real detailers, Past due…), and the round × that closes a detailer's
panel.

**WAS:** Both were about 30 pixels of reachable area, where the standard for
this product is 44. The × is the only way out of that panel a thumb can find.

**NOW:** Both look exactly the same and both are 44 pixels to press. The filter
buttons sit a little further apart when they wrap onto a second line, because
two 44-pixel targets 6 pixels apart would have overlapped and stolen each
other's taps.

**Visual: yes** — the only thing to look at is the extra breathing room between
rows of filter buttons.
