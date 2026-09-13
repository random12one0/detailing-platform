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
