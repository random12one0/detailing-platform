# The setup checklist — do these, in this order

> *"Make sure this all could kinda turn into a plan that's easy for me to
> follow. Kinda like: okay, go here, click these links, this is what I have to
> do, this is why. Because I've never done this and I don't know any of it."*

**This is that plan.** Every step says what it is, why it exists, what it costs,
who has to do it, and where to go. **Nothing here is legal or tax advice** —
it is a list to work through, and step 3 is an hour with a professional who can
give actual advice.

**Two facts shape the whole list and are worth knowing up front:**

1. **He is under 18, and Lakewood's municipal code requires a business licence
   applicant to be over 18.** So his dad is on the paperwork. That is not a
   workaround, it is the rule.
2. **A Stripe account cannot move between legal entities.** If the business
   starts in his dad's name and later becomes his, **that is a new Stripe
   account and every subscriber has to enter their card again.** That one fact
   changes what structure to pick — see step 4.

---

## STEP 0 — ANSWERED 2026-09-04: he turns 18 on 2 DECEMBER 2026

**That is three months away, and it collapses most of this document.**

**The whole plan is: build now, set everything up in the first week of December,
in his own name.**

- **No LLC.** The $800/year was only ever buying a clean handover, and there is
  no handover.
- **No dad on the Stripe account.** He opens it himself at 18. **The support
  question this file used to open with is now moot** — there is no guardian, so
  there is nothing to transfer and nothing to ask.
- **No business licence in his dad's name.** He applies himself in December.
- **No EIN with his dad as responsible party**, and no form later to change it.
  He is the responsible party from the start.

**His own reasoning, and it is right:** *"I could be a sole proprietor by
myself. I can have an EIN by myself. I would just get a business licence once I
turn eighteen… I'm sure they make bank accounts where I could have a temporary
one joined to my dad, and it won't be hard to create a new bank account when I'm
eighteen — I just set it up on my Stripe account as a new bank account and set
it to go there."*

**Correct on every count**, and the bank detail especially: **changing the payout
account on a Stripe account is a settings change.** It does not touch customers,
subscriptions or stored cards. Nothing gets re-entered.

**The one thing NOT to wait for: the software.** Stripe's **test mode** needs no
activated account and no verified identity, so the entire payments integration
can be built and tested before December. **Activation — identity, bank details,
going live — happens the week of the 2nd.**

**And the risk of waiting is close to nil:** he cannot legally be selling before
then anyway, the product is not finished, and a city is not going to notice a
17-year-old with no customers. **The only cost of this plan is not charging
anyone for three months, and there is nobody to charge.**

---

## STEP 1 — The sole proprietorship (there is almost nothing to do)

**What it is:** the default. **The moment somebody pays you for work and you did
not form anything else, you are a sole proprietor.** There is no form, no fee
and no registration for the structure itself.

**So the honest answer to *"is there anything I have to do, or does it just
happen?"*: the structure happens by itself. The three things attached to it do
not.** Those are steps 2, 5 and 6.

**Cost:** $0. **Who:** nobody, it already happened.

**One thing worth saying plainly, because it is true today and not in the
future:** he is already making around $2,000 a month detailing. **That is
self-employed income and it has a filing obligation** — self-employment tax
starts at **$400 of net earnings for the year**, and he is far past that. **Being
under 18 does not exempt anyone from income tax.** This is the top item for
step 3, and it is about the detailing business he already runs, not this one.

---

## STEP 2 — The Lakewood business licence (his dad applies)

**What it is:** permission from the city to run a business from an address in
Lakewood. **A home-based online business still needs one** — the test is whether
a business operates in the city, not whether customers come to the door.

**Why it matters:** it is the cheapest thing on this list and the easiest to
forget, and it is the one a city can notice on its own.

**The under-18 part, and it explains what happened with the detailing
business.** Lakewood's code says the applicant — and *"the manager or other
person principally in charge of the operation of the business"* — **must be over
eighteen.** So he was told correctly. **It is not different for this business**,
and the answer is the same: **his dad applies and is named as the person in
charge.**

**Where to go:**

- Apply: **https://www.lakewoodca.gov/Business/Start-and-Grow-a-Business/Apply-for-a-business-license**
- **Call first: (562) 866-9771, extension 2622.** The city asks you to phone and
  describe the business before they hand over the application, and **five
  minutes on the phone is the fastest way to confirm every assumption on this
  page.** Ask specifically: a home-based online software business, no customers
  visiting, owner under 18 with a parent as applicant.
- In person if easier: City Hall, 5050 Clark Ave, Lakewood.

**Cost:** typically $25–$100. **Who:** his dad, with him on the call.

---

## STEP 3 — One hour with a CPA (do this before taking money)

**What it is:** a paid appointment with an accountant. **This is the highest-value
item on the page and the only one that produces actual advice.**

**What to bring — five questions, in this order:**

1. **"I'm 17 and made about $24,000 last year detailing cars. What do I owe and
   what should I have filed?"** This is the urgent one and it is about the
   existing business.
2. **"I'm starting a software business that charges monthly subscriptions. Sole
   proprietorship or LLC?"** — mention the **$800 California franchise tax**
   and that his dad would be on it.
3. **"My dad will own it until I turn 18. What is the cleanest way to hand it
   over?"** — and mention that **the payment processor cannot transfer between
   legal entities.**
4. **"Is a $999 website setup fee taxable in California? What about a $60/month
   subscription after January 2027?"**
5. **"Do I need to charge sales tax to customers in other states?"** — the
   answer today is no, and step 6 is how it stays no.

**Cost:** $150–$400 for an hour, typically. **Who:** him and his dad together.

---

## STEP 4 — Decide the structure (and this got harder since the last answer)

**The earlier recommendation was "sole proprietorship, skip the LLC" and it was
based on cost alone. Cost alone is not the whole picture, and the missing piece
is the handover.**

| | Sole proprietorship in dad's name | LLC with both of them |
|---|---|---|
| **Cost to start** | $0 | $70 |
| **Cost every year** | $0 | **$800**, regardless of revenue, no first-year exemption since 2024 |
| **If the business is sued** | dad's personal assets are exposed | the company's assets, not his |
| **Handing it over at 18** | **A different legal entity. New EIN, new bank account, NEW STRIPE ACCOUNT — every subscriber re-enters their card — new licence, and customer agreements re-signed.** | **One document.** Same entity, same EIN, same Stripe account, same subscribers, nothing re-signed. |

**So the $800 a year is not only buying liability protection. It is buying a
handover that is a signature instead of a migration.**

### But there is a third option, and it may cost nothing — HIS idea, and it is a good one

> *"I feel like there's gotta be a way that I don't need an LLC but I could
> transfer stuff over to me. I just have to set it up right — like, I don't set
> it up as my dad being there, but for the things that need his age, I do it."*

**That is the right instinct, and most of it works.** The trick is to be precise
about *which* things actually require an adult, because it is fewer than it
looks:

| | Whose name can it be in? | Is an adult required? |
|---|---|---|
| **Being a sole proprietor** | **His.** There is no minimum age to be one | no |
| **EIN** | **The business's** — and **the IRS sets no minimum age for an EIN** | **the parent is named as "responsible party"**, which is a role on the form, not ownership. It can be changed later with a form rather than a new EIN |
| **Lakewood business licence** | **Dad's.** The city code requires it | **yes** |
| **Bank account** | joint or custodial | **yes** |
| **Stripe** | **This is the one that decides everything** — see below | **yes** |

**So the shape he described is: the business is HIS sole proprietorship, and his
dad appears only as guardian, co-signer or responsible party where the rules
demand an adult.** At 18, those three roles come off and nothing else moves.

### The one question that decides whether that works — and it is free to ask

**Stripe's published wording is *"a legal guardian must assume the role of owner
of your account"*, and their documentation does not say what happens at 18.**
That is the whole question, because:

- **If the account's legal entity is HIM** (his name, his sole proprietorship,
  with his dad added as guardian for consent), then **turning 18 removes a
  guardian and changes nothing else.** Same account, same subscribers, **free.**
- **If Stripe treats the guardian as the account's legal entity**, then it is
  his dad's account, and 18 means a new one — every subscriber re-enters a card.

**Nobody should guess this, and nobody has to.** **Ask Stripe support directly,
before opening the account:**

> *"I am 17 and starting a sole proprietorship. My parent will be added as the
> guardian on the account. When I turn 18, can the guardian be removed and the
> account continue as mine — or does Stripe treat this as a change of legal
> entity requiring a new account?"*

**Their answer decides step 4, and it costs one support ticket.** If the answer
is "the account continues as yours", **the LLC stops being necessary and the
$800 a year is saved** — which is exactly what he was reaching for.

**Until that answer arrives, this stays a fork rather than a decision.** Do not
open the Stripe account first and find out afterwards; that is the one order
that cannot be undone cheaply.

**The recommendation, split by step 0:**

- **Turning 18 within ~6 months → sole proprietorship, and wait to launch
  billing.** There is never a handover, so the LLC's main advantage does not
  apply and the $800 is pure cost.
- **Longer than that → the LLC is probably worth it**, and it is a genuine
  question for the CPA rather than something to decide from a table. **The
  number to weigh it against is not $1,440 of founding revenue — it is what it
  costs to ask fifty subscribers to re-enter a card**, which is some of them
  leaving.

**If they form the LLC:** California sets **no minimum age** for an LLC member
or organizer (Texas does; California does not). The obstacle is that a minor's
signature does not reliably bind, so use one of the standard shapes — **his dad
as a member who signs everything**, or a **manager-managed LLC with his dad as
manager**. File at **https://bizfileonline.sos.ca.gov**.

---

## STEP 5 — EIN, bank account, DBA

### EIN — do it, it is free and takes ten minutes

**What it is:** a tax ID number for a business, like a Social Security number
for the company.

**Why:** a bank will ask for one, and **it keeps his (or his dad's) actual SSN
off forms that go to other companies.**

**Where:** **https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online** — free, issued immediately.
**Never pay a site that offers to get one for you.**

**Who:** whoever owns the business. Under 18 that is his dad.

### A business bank account — yes, and it matters more than it sounds

He currently runs everything through his personal account *"because it's
easiest"*. **That is legal for a sole proprietor and it is the thing that makes
step 3 expensive** — an accountant separating business from personal
transactions after the fact bills for that time.

**A minor generally needs a parent as joint owner on a business account.** Since
his dad is already going to be on the Stripe account, this is the same
conversation.

**Do it before the first subscription payment**, not after.

### DBA — only if the name is not a person's name

**What it is:** *"doing business as"*. If the business trades as **"Detailing
Platform"** rather than his dad's own legal name, California requires a
fictitious business name filing.

**The part that surprises people:** in California it is **a county filing plus a
notice published in a newspaper** for four weeks.

**Where:** Los Angeles County Registrar-Recorder —
**https://lavote.gov/home/records/business-filings/fictitious-business-names**

**Cost:** roughly $26 filing plus $40–$80 for the newspaper notice.
**When:** before using the name on invoices and contracts.

---

## STEP 6 — Sales tax: set the monitor, then forget it

**This is the step he asked to have written down so he would not forget it.**

### What is true today

**Nothing to do.** Selling to detailers in states that do not tax software means
there is no tax to calculate, collect, register or file. **Anywhere.**

### The free safety net — set this up and leave it

**Numeral offers free nexus monitoring with no time limit.** It watches sales per
state and emails when a threshold is getting close. **https://www.numeral.com**

**Set it up the same week the first customer pays.** It is the thing that
remembers, so he does not have to.

### Turn Stripe Tax on from day one — it is free until it does something

He asked *"should I turn on Stripe Tax then from the start? There's no point in
not having it on."* **Correct, and it is confirmed by Stripe's own pricing
page:** *"You only incur fees for transactions in jurisdictions where you have
an active tax registration."*

**With no registrations, Stripe Tax costs nothing.** There is no monthly minimum
and no charge for simply having it enabled. **So switch it on with the first
subscription and never think about it again** — the day a registration is
finally added, it starts collecting correctly on its own, and only then does the
0.5% begin.

**That is one fewer thing to remember**, which was the whole point of the
question.

### How Stripe Tax actually behaves — this answers the question exactly

> *"Does it just automatically detect, oh, this person's from a state that taxes
> it, and switch it on for them?"*

**Half yes, and the other half is the important half.**

- **Stripe Tax is one switch, turned on once for the account.** It is not
  flipped per customer.
- **Once on, it reads each customer's address automatically** and works out what
  they owe. Nothing manual per person.
- **But it only charges tax in places where a REGISTRATION has been added.**
  Without one, **the calculation returns zero.**

**So concretely: if a detailer in Texas signs up tomorrow, Stripe Tax charges
them $0 in tax and that is correct** — he is not registered in Texas and is
nowhere near Texas's threshold, so he does not owe Texas anything. **Registering
is the manual step, and it only happens after a threshold is crossed, which the
free monitor warns about first.**

**Take the customer.** One out-of-state customer from a taxing state creates no
obligation at all.

### When a state does eventually need it

1. The monitor emails a warning.
2. Register with that state (a form, once).
3. Add the registration in Stripe's dashboard under **Tax → Locations**. From
   then on it collects automatically.
4. File returns — roughly **$75 each** through a filing service.

---

## STEP 7 — When he turns 18

**If they waited (step 0):** everything gets set up in his own name — EIN, bank,
Stripe, licence. **Nothing to undo.**

**If it started in his dad's name as a sole proprietorship:** this is a
migration, not a signature. New EIN, new bank account, **a new Stripe account
with every subscriber re-entering their card**, a new city licence, and customer
agreements re-signed.

**If it is an LLC:** his dad assigns his membership interest to him, the
operating agreement is updated, and **the entity, the EIN, the bank account and
the Stripe account all stay exactly where they are.** Stripe's own rule is that
ownership can move to a new individual **within the same legal entity** — invite
him as an Administrator, then transfer ownership in Business settings → Team
settings — but an account **cannot** usually move to a different entity.

**Ask the CPA about gift tax at step 3** if the handover is a gift rather than a
sale. There are annual limits, and a business worth less than the annual
exclusion is almost certainly fine — but "almost certainly" is what an hour with
a professional turns into "yes".

---

## The order, on one line each

**REWRITTEN 2026-09-04 once the birthday was known. Everything legal happens in
one week in December; everything before then is software.**

### Now → 1 December

1. **Build.** Nothing on the legal list blocks any of it.
2. **Stripe in TEST MODE** for the payments work — no activation, no identity
   check, no guardian.
3. **One hour with a CPA — the one thing worth doing NOW, and it is about the
   OTHER business.** He is already earning ~$2,000 a month detailing, which is
   long past the $400 self-employment threshold. **That question does not
   improve by waiting three months.**

### Week of 2 December — all of it, in his own name

4. **EIN** — free, ten minutes, he is his own responsible party:
   https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online
5. **Business bank account** — his own, no joint owner needed.
6. **Activate Stripe** — identity, bank details, live keys.
7. **Lakewood business licence** — his own application now that he is 18.
   **Call first: (562) 866-9771 x2622.** ~$50.
8. **DBA** if trading as a business name — LA County filing plus the newspaper
   notice. ~$70–105.
9. **Turn Stripe Tax ON** (free with no registrations) and **set up the free
   nexus monitor.**

### Then

10. **First sales calls.** Realistically the week of **8 December**.

---

## Sources

- Lakewood municipal code — business permit applicants and the person in charge must be over 18: https://ecode360.com/45609388
- Lakewood business licence application and process: https://www.lakewoodca.gov/Business/Start-and-Grow-a-Business/Apply-for-a-business-license
- Lakewood home-occupation licence form: https://www.lakewoodcity.org/files/assets/public/v/1/business/documents/business-licenses/homeoccupationbusinesslicenseapplicationfif.pdf
- Stripe Tax — it only calculates where an active registration exists: https://docs.stripe.com/tax/set-up
- Stripe Tax — adding registrations under Tax → Locations: https://docs.stripe.com/tax/registering
- Stripe — changing the owner of an account (same legal entity): https://support.stripe.com/questions/change-the-owner-of-a-stripe-account
- Stripe — an account usually cannot transfer to a different legal entity: https://support.stripe.com/questions/transfer-a-stripe-account-to-a-different-entity-due-to-a-business-sale-or-acquisition
- LLC ownership transfer vs selling a sole proprietorship's assets: https://www.corpnet.com/blog/can-you-transfer-llc-ownership/
- California LLC $800 annual franchise tax, first-year exemption expired: https://www.llcuniversity.com/california-llc/annual-llc-tax-exemption-ab-85/
- Minors as LLC members; California sets no age minimum: https://www.nolo.com/legal-encyclopedia/do-llc-members-need-18-years-old-older.html
- IRS — apply for an EIN online, free: https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online
- LA County fictitious business name filing: https://lavote.gov/home/records/business-filings/fictitious-business-names
- Numeral — free nexus monitoring: https://www.numeral.com/blog/anrok-alternatives
