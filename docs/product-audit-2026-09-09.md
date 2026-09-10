# The owner's walk-through of every page — 2026-09-09

**This is his own audit, taken verbatim from one long pass through
`localhost:5173/map.html`, sorted by screen.** His instruction with it:

> *"Log everything into an organised doc of everything that I said about every
> single page. And don't try to fix everything at once because it's just not
> gonna go well. We're gonna start fixing one screen at a time. But I just
> wanna do an initial audit of basically almost everything."*

**So nothing here is scheduled and nothing here is started.** It is the queue.
Take ONE item, fix it, show him, move on. A session that opens four of these at
once will produce four half-finished screens and no way to tell which change
caused which regression.

**Status key:** ☐ not started · ◐ in progress · ☑ done and shown to him

---

## 0 · What he signed off

| Screen | Verdict |
|---|---|
| **Landing page** | *"Looking good. I think we finished everything that we wanted to do here."* Scrolling images, the wall, the phone. **Done** — but see 2.1, the copy pass still applies to it. |
| **The map** (`/map.html`) | *"That's fine."* |
| **Booking · add-ons step** | *"Pretty simple… I don't think we need to add anything here."* |
| **Booking · reserve mode** | *"Almost the exact same. Confirm booking — yeah, that's good."* |
| **Plan member page** (`/plan/:id`) | *"Seems good."* |
| **Unsubscribe** | *"That's all good."* |
| **Sign-in page** | Could not test (already signed in). *"From what I've seen before, I think it's good."* |
| **Platform admin — the login screen** | *"It looks good. I like the login page."* |
| **The three example sites** (ex1/ex2/ex3) | *"All the websites are good. You don't need to go over that."* |

---

## 1 · Bugs — things that are actually broken

These are defects, not opinions. They come first.

### ☐ 1.1 Pricing page: "the terms in full" is jammed against the screen edge
> *"There's this thing where it's like the terms in full, and it's for some
> reason sticking all the way to the left side of the screen, like literally
> the exact edge, which obviously looks really weird because there's no padding
> between the edge of the screen and what the text is."*

`/pricing`. A block is escaping the page gutter. **Small and self-contained —
a good first fix.**

### ☐ 1.2 First-run setup: the progress count is wrong and sticky
> *"For some reason this, like, finish your thing and you choose all your
> colours, it still doesn't like to update and says think that four of seven
> are done or six of seven are done… even when someone fills it out, it still
> doesn't fully do it."*

And the second half, which is a different bug in the same place:

> *"We need to make sure that even if, let's say, someone skips one of them but
> then does the rest, that it still logs it — it doesn't think that all of the
> ones after the one you skipped are also undone."*

So: (a) completing a step does not always mark it complete, and (b) skipping a
step appears to poison every step after it. **Two bugs, one screen.**

### ☐ 1.3 The Today guide walks onto the Business page
> *"For some reason, the today guide goes to the business page. The today guide
> should only do guides on the today page. So that's already a problem."*

### ☐ 1.4 "Show me around" ends after one step
> *"It instantly ends after the first one, and then when I click on Calendar,
> Money, Clients and Business, I can't view the guides through all of them."*

### ☐ 1.5 The language buttons on the manage-booking page are badly placed
> *"The English and Spanish versions are weirdly placed… fix that on the cancel
> page, the English and Spanish buttons are really kind of weirdly placed and
> look really bad. So we need to figure out how to place those better."*

`/booking/:id`.

---

## 2 · The words — a full copy pass

**His single biggest theme, and it applies to more than one page.** The root
cause, in his words:

> *"Almost this entire website was just built with you throwing up text onto
> the screen. And obviously that's gonna come with some pretty AI-looking
> results that probably are too lengthy and are, like, weird at getting the
> point across."*

### ☐ 2.1 Terms — rewrite nearly all of it
> *"Go over every single word and actually completely scrap everything that's
> here almost, and just make sure that it's straight to the point. Not trying to
> be like a startup, you know, wording, super creative AI kind of saying it. It
> should be very straightforward, and the wording should be very good for what
> it's trying to get across."*

He has **not read the terms yet** — he assumes it is the page most likely to
already be right, because terms are terms. Treat that as a guess, not a finding.

### ☐ 2.2 Privacy — same treatment
> *"What we hold, and who sees it. Same thing with the terms. And then it's just
> words — there's nothing creative that has to be here."*

That sentence is close to a brief in itself: **the page answers two questions,
what we hold and who sees it.**

### ☐ 2.3 The landing page's copy
> *"I think the landing page should definitely get a look over in terms of the
> wording and have actually some good marketing there."*

**Note the tension and do not resolve it silently:** he signed the landing page
off visually in the same breath. This is a copy pass, not a redesign. The wall
section's rewrite (2026-09-09) is the shape he approved — a claim about the
reader, evidence underneath.

---

## 3 · Screens that need design work

### ☐ 3.1 Pricing page is plain
> *"I think it's a little plain. Even my mom said, like, oh, it's kind of a
> little plain."*

What he asked for:

> *"Maybe we could spice up this pricing area, and maybe take inspiration from
> some of the websites I sent you and how they have their pricing laid out.
> Obviously we have to adapt to our exact pricing and our monthly stuff. But
> maybe we get some images here or something — you could kind of think of a
> plan."*

**Inputs already in the repo:** the five reference sites are in
`docs/design-knowledge.md` and `docs/TASTE-NOTES.md`. Primefold, Voiceflow,
Giga, Pryzm and Octolane all have pricing sections. **Every figure on that page
must keep coming from `pricing.js` through `P`** —
`tests/landing-pricing.test.mjs` fails on a hard-coded number.

### ☐ 3.2 Monthly plans all look the same
> *"Every single monthly plan kind of looks very similar. There's no distinction
> between each one — besides just the words and how much it is. So it kind of
> could feel like just a blob of text on the page, just a ton of text one after
> another. So we gotta find some way to make it more appealing for someone to
> read through each plan. I don't really know how to do that."*

**He explicitly does not have a solution here**, so this is a "show him two
versions" item rather than a "ask him what he means" one.

### ☐ 3.3 The customer's own booking page looks too thin
> *"There's like a cancelled detail, we come to you, an estimated total. It
> doesn't really look like there's a lot of information on here, which I'm
> confused on. Why is it very simple? Shouldn't there be, like, all the
> information on there?"*

`/booking/:id`. **Check first whether information is missing or merely
unemphasised** — the receipt may be showing everything it has for a CANCELLED
booking, in which case the answer is a different fixture, not a redesign.

---

## 4 · Features and behaviour

### ☐ 4.1 The guides are far too short, and should open things
His longest single note, and the most specific:

> *"From what I remember the guides were only, like, one to three steps long,
> which is definitely not long enough to go over everything within all of these
> things. And they should open up pages — like, even the calendar, for example,
> should show 'here's your calendar, see how it says stuff in here', and then it
> opens up, like, an example day. It opens up a random day, and then it shows
> 'this is where you could do stuff about the day.' So do that for every single
> one of them. Have the guide open GUIs, kind of show stuff around."*

And the instruction about length, which contains its own trap:

> *"It should be like six steps minimum for all of them. Now don't hard-code
> this number anywhere. Just actually analyse and figure out how many steps
> should be in each one that covers everything within that tab."*

**Read that twice. "Six minimum" is a floor, not a target, and he has forbidden
picking a number and building to it.** The work is to enumerate what each tab
actually contains and let the step count fall out of that.

### ☐ 4.2 Spanish only translates what we wrote, not what the detailer typed
> *"Only the text that was predetermined is translated into Spanish. And we need
> to figure out how to translate everything into Spanish — you know, it updates
> and adapts to the fact that detailers type in the names specifically. So
> obviously we need a live translator somehow. I don't know how to do that,
> honestly."*

Service names, descriptions, business info — everything a tenant types — stays
in English. **He does not speak Spanish and cannot review the result**, which
makes this one where correctness has to be argued from mechanism rather than
shown to him.

He also spotted the hours were translated, worked out why himself, and withdrew
the point: *"Well, I guess never mind. I realise why the hours are translated."*

### ☐ 4.3 A detailer with a very long service list
> *"I think we just might have to have a plan for when people have like a ton of
> different options. Like they do paint correction, wrapping, tinting, regular
> car, interior, exterior. We need to have a plan if someone has just a ton of
> things and just how to show that nicely."*

**Explicitly parked by him**, and this is the whole of his reasoning:

> *"Now we do have a pretty good plan of how to do it and how to set it up, but
> we'll see when I get a detailer and how they set up their booking thing."*

**Do not build this yet.** It is waiting on a real detailer's real catalogue.

---

## 5 · Open questions he raised

### ☐ 5.1 How does anyone reach the monthly plans page?
> *"I even get to the monthly plans from — like, how does someone even get to
> the monthly plans area? I don't know. This is just separate."*

**This is a real question about the product, not about the page.** If
`/book/:slug/plans` has no entry point from the booking page, the feature
reaches nobody — which is exactly the failure mode
`docs/tenant-site-contract.md` § 2 is built around: the screen works, the
setting saves, and nothing reports that it is unreachable. **Answer it by
tracing the links before designing anything.**

---

## 6 · Done in this pass

### ☑ 6.1 The platform admin password
> *"I don't remember my password for the admin… If you could give me just a
> simple login, like, we could use the same email and just have the password be
> like demo123 or admin123 for now."*

**Done 2026-09-09. `demo@demo.com` / `demoadmin123`.**

**Not `demo123`, and the reason matters:** the Supabase project rejects any
password under ten characters (`weak_password`, 422). `demo123` and `admin123`
are both refused by the server, so neither was ever available. `demoadmin123`
is the nearest memorable thing that the project will accept. Verified by
signing in through the real token endpoint, not merely by setting it.

The `platform_admins` note row was rewritten to say so, because it still
claimed the password was `demo`.

**It is still a launch blocker and the row still says so.** That account reads
every business on the platform. It is safe only while every business in the
database is a fixture — which is the state today, and his own stated plan.

---

## What to do first

If nobody has a better reason, this order:

1. **1.1** the pricing page's escaped block — smallest, and it is on a page he
   is about to look at again anyway.
2. **1.2** the setup progress count — a real bug on the first screen a new
   detailer ever meets.
3. **1.3 + 1.4** the guides' two bugs, which are probably one cause.
4. **5.1** trace how anyone reaches monthly plans — an answer, not a build.
5. **3.1** the pricing page redesign, which is the biggest piece here.

**2.1 and 2.2 (terms and privacy) can run in parallel with any of these**,
because they touch no layout and no shared code.

---

## 7 · Screens he has still never seen — added 2026-09-09

> *"There was a few things I wasn't able to view… I remember I talked about a
> survey for the detailers that goes over basically what they want for their
> website. I wasn't able to view that. And I think there's some other things
> we've made that detailers see that I've never looked at, and it wasn't on
> that map area."*

**THE WEBSITE SURVEY DOES NOT EXIST.** Checked 2026-09-09: the word appears
only in research notes (`detailer-research-2026-08-31.md`,
`design-knowledge.md`) — there is no screen, no route and no spec. He is
remembering a conversation, not a build. **If he wants it, it is new work**,
and it belongs beside `docs/tenant-site-kit.md`, which is the brief a fresh
agent is handed to build a client's site — a survey is how that brief would
get filled in by the detailer rather than by us.

**THE MAP WAS GENUINELY INCOMPLETE and now is not.** Three real routes were
missing (`/job/:id`, `/reset`, and the first-run setup), and — the bigger half —
**about a dozen screens have no address at all** and therefore could never
appear on a list of links: the settings screens behind two doors, the four tab
guides, the job record, the request queue and quote sheet, the day panel, the
payment sheet, the manual booking sheet, the expense sheet, the campaign
sheet, job photos and parked accounts.

`app/public/map.html` now carries all of them — the linkable ones as links, the
rest as a list saying **exactly which door each is behind**, so he can see what
he has not looked at yet. **`/invite/:token` is the one that cannot be listed
at all**: the token is generated per invite and dies on use, so seeing that
screen means sending himself an invite from Business › Team.

---

## 8 · Two new features for DETAILERS — his idea, 2026-09-09

**These are not back-office items.** They are things a detailer would see, and
he raised them while talking about something else, so they are recorded here
before they get lost — his words: *"I just don't want that to get lost."*

### ☐ 8.1 Show a detailer how they are doing
> *"Maybe we can have a page, or maybe add to the Money page, where you kind of
> track how you're doing. Like how many people visit your website versus how
> many people booked. As well as maybe their most common package, or which ones
> are chosen the most. You could do more research in doing this properly. Other
> cool stuff like that that kind of helps the detailer look and go, oh okay,
> cool."*

**Half the data is already being collected and nothing reads it.**
`track-visit` records visits to a booking page; bookings are obviously
recorded. **Visits against bookings is the conversion rate**, and it is the
same number § 8.2 of the back-office plan wants platform-wide — one
calculation, two audiences, which is a strong argument for building it once and
well.

Also available with no new collection: which services are chosen most, average
job value, busiest day and hour, repeat-customer rate.

**Note for whoever builds it:** he explicitly asked for research first —
*"you could do more research in doing this properly"* — so the shape of the
page is not settled by this note.

### ☐ 8.2 Where the booking actually came from — trackable links
> *"Basically we have custom links for where you put it. So you could have a
> custom /google or /yelp or /this, where they could track how many people
> visit their website based off of what link. And then that way they also track
> if someone booked from what platform — if someone booked through Yelp, someone
> booked through referrals, someone booked through Google, someone booked
> through just searching it up. I think that'd be a cool feature."*

**Two halves, and the second is the valuable one.** Counting visits per source
is ordinary. **Carrying the source all the way through to the BOOKING** — so a
detailer can say *"Yelp sent me eleven visits and two jobs; Google sent me
forty and one"* — is what turns it into a decision about where to spend money.

**What exists:** `track-visit` already records a visit. **What does not:** any
notion of a source, and any link between a visit and the booking it became.

**A trap worth writing down now:** the source has to survive the whole booking
flow — seven steps, a possible language switch, and a page reload — or it will
be recorded for visits and lost for bookings, which is the half that matters.

**He parked it himself:** *"save that for later."* It is here so it survives
the clear.
