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
