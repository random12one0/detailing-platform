# Making it legal, and making the tax automatic — 2026-09-04

He asked three things at once:

> *"Is there any states that I should just ignore? … my main way of getting
> customers is cold calling… maybe we could figure out which states I should
> ignore, which I should target, whatever's easiest for me."*

> *"Can I just have it auto do it or something? It feels like I have to keep
> track — oh, this customer's from this state, I have to turn it on, blah blah
> blah to file it. Is there any way I could just track it automatically?"*

> *"I gotta figure out everything legally. Do I have to register this anywhere —
> business, California, whatever? How do I make everything legal and sound?"*

> **THE FOLLOWABLE VERSION OF THIS FILE IS `docs/setup-steps-2026-09-04.md`**,
> written 2026-09-04 when he asked for *"a plan that's easy for me to follow —
> go here, click these links, this is what I have to do, this is why."* **Two
> things in this file were REVISED there and the newer one wins:**
> **(1) Lakewood's municipal code requires a business-licence applicant, and the
> person principally in charge, to be over 18** — so his dad applies, which is
> exactly what he was told when he tried for his detailing business.
> **(2) The LLC recommendation was made on cost alone and cost alone was the
> wrong basis** — a **Stripe account cannot move between legal entities**, so a
> sole proprietorship in his dad's name means every subscriber re-enters a card
> on his 18th birthday, while an LLC hands over in one document.

**One caveat, said once and not repeated: this is a checklist, not legal
advice.** Every item below is a real, checkable requirement with a source, and
none of it replaces **one hour with a CPA and a conversation with his parents**
— which is cheap, and is the single highest-value thing on this page. **He is
seventeen, so his parents are involved in most of it whether or not he wants
them to be.**

---

## Part 1 — which states to call, and which to skip

**There is a genuinely useful answer here, and it exists only because he chooses
who to cold-call.** Most businesses cannot pick which states their customers
come from. He can.

**Software is taxable in 26 states and not taxable in about 25.** If his
customers are in states that do not tax SaaS, **he never has to calculate,
collect, register or file sales tax anywhere.** Not "less paperwork" — none.

### The states that do NOT tax SaaS — the ones to call

Alabama · Arkansas · Delaware · Florida · Georgia · Idaho · Indiana · Kansas ·
Maine · Michigan · Minnesota · Mississippi · Missouri · Montana · Nebraska ·
Nevada · New Hampshire · New Jersey · North Carolina · North Dakota ·
Oklahoma · Oregon · Virginia · Wisconsin · Wyoming

**Florida, Georgia, North Carolina, Michigan, Missouri, Virginia, New Jersey and
Nevada** are the ones with real population and a lot of detailers. **That is a
big enough market that nothing about this strategy is limiting.**

### The states that DO tax SaaS — the ones to leave for later

Arizona · Connecticut · DC · Hawaii · Kentucky · Louisiana · Maryland ·
Massachusetts · New Mexico · New York · Pennsylvania · Rhode Island ·
South Carolina · South Dakota · Tennessee · Texas · Utah · Vermont ·
Washington · West Virginia — plus **Alaska (local only)**, **Colorado (local
now, statewide from 1 Jan 2027)**, **Illinois (local, and Chicago has its own
lease tax)**, **Iowa and Ohio (depends on business vs consumer)**.

**Texas and New York are the painful ones to skip** because they are large. That
is a real cost of this strategy and he should know he is paying it.

### California

**Skip it, and he already had the better reason than tax.** A California
detailer is a competitor. **Sales tax agrees with him from 1 January 2027**,
when SB 122 makes SaaS taxable there — and since he lives in California he has
nexus there automatically, so **a California customer is the one customer that
creates a filing obligation immediately.**

**His *"Northern California is fine"* is the exception to watch.** One customer
in Sacramento in 2027 means registering with CDTFA and filing California returns
forever. **Worth it for a great customer; not worth it by accident.**

### The rule that keeps this from becoming a trap

**Do not turn away a good customer over sales tax.** The tax is collected FROM
the customer — it costs him nothing but paperwork, and one excellent customer in
Texas is worth more than the annoyance. **Prefer the non-taxing states when
choosing who to call; accept anyone who says yes.**

**And this list changes.** Two states move in January 2027 already. **Re-check
before relying on it**, and treat it as a calling list rather than a rule.

---

## Part 2 — making the tax automatic

**With the calling strategy above, the honest answer is that there is nothing to
automate yet, and the safety net is free.**

Three layers, cheapest first:

1. **Sell into non-taxing states → nothing to calculate, nothing to file, no
   registrations.** This is the whole answer for as long as it lasts.
2. **A free threshold monitor as the safety net.** **Numeral offers free nexus
   monitoring with no time limit** — it watches sales per state and warns when a
   registration threshold is approaching. **That is exactly the thing he asked
   for** — *"is there any way I could just track it automatically"* — and it
   costs nothing.
3. **When a state actually needs it:** turn on **Stripe Tax** (0.5% per
   transaction, ~20¢ on $40) so the right amount is added automatically at
   checkout, and pay a filing service per return — **Numeral is $150 per state
   registration and $75 per filing.** TaxJar is $39/month plus $50–55 a filing;
   Anrok is $70 per state per month and is built for much bigger companies.

**So: free until it isn't, then about $75 a return.** He never has to remember
to turn anything on, because the monitor is what remembers.

**What is genuinely NOT automatic, in any version:** registering with a state
the first time. That is a form, once per state, and it is unavoidable short of
letting someone else be the seller — which he has decided against.

---

## Part 3 — registering the business

### Start as a sole proprietorship. Do not form a California LLC yet.

**A sole proprietorship costs $0 to start.** He is one already, technically, the
moment he takes money.

**A California LLC costs $70 to file and then $800 every single year in
franchise tax, regardless of revenue or activity — and the first-year exemption
expired in 2024.** With three founding customers at $40/month, revenue is about
$1,440 a year. **An $800 fee would eat more than half of it.**

**What the LLC buys is separation:** if the business is sued or owes money,
personal assets are protected. **What makes that decision non-obvious here is
that the business is effectively his dad's already** — his dad owns the Stripe
account, so his dad's name carries the liability today either way.

**Recommendation: sole proprietorship now, and put the LLC question to his dad
before the first paying customer, not after.** It is his dad's exposure, so it
is his dad's call. **The moment it becomes clearly worth $800/year is when there
are enough customers that a dispute is plausible** — call it five, or the first
time somebody prepays for a year.

### If they do form one, the under-18 part has a standard answer

**California's LLC law says nothing about how old an organizer or member must
be** — unlike Texas, which sets a minimum. **The problem is not the LLC, it is
contracts:** a minor cannot reliably be bound by one, so a minor signing on the
company's behalf creates agreements the other side cannot rely on.

**The three standard fixes, any of which works:**

- **A multi-member LLC with an adult** — his dad as a member — **and the adult
  signs everything.**
- **A manager-managed LLC** where his dad is the manager and he is a member who
  does not sign contracts.
- **A statement of authority** filed with the Secretary of State naming which
  members can bind the company.

### The rest of the registration list

| | What | Cost | When |
|---|---|---|---|
| **EIN** | Federal tax ID from the IRS, online | **free** | Before opening a business bank account |
| **City / county business licence** | Most California cities require one | **$25–$100** | Usually within weeks of starting |
| **Fictitious business name (DBA)** | Needed if trading as a name that is not a person's own — "Detailing Platform" is one. County filing **plus newspaper publication** in California | ~$50–$100 | Before using the name commercially |
| **Seller's permit (CDTFA)** | Only needed once he sells something taxable in California | free | **1 January 2027, and only if he has California customers** |
| **Business bank account** | A minor generally needs a joint or custodial account with a parent | free–$15/mo | Before the first payout |

---

## Part 4 — the legal pieces that are not registration

**These are the ones that bite a subscription business specifically, and three
of them are already on the roadmap.**

- **Terms of Service and a Privacy Policy.** Roadmap 7.1 has them as
  placeholders. **They are now load-bearing rather than cosmetic**, because they
  are where the auto-renewal disclosure, the twelve-month term, the early-exit
  fee and the refund policy live — and those are what he would point at in a
  chargeback dispute.
- **The auto-renewal disclosure itself** (California AB 2863): clear disclosure
  before billing details are taken, an explicit tick, and cancellation in the
  same place they signed up. **Covered in the payments research; it is a build
  requirement, not just a document.**
- **The refund policy**, written before the first sale rather than after the
  first argument: setup fee non-refundable once work begins, current month not
  refunded.
- **Income tax.** A minor still owes it. **Self-employment tax starts at $400 of
  net earnings**, which he will pass in the first month or two. This is the part
  a CPA earns their fee on.
- **Customer data.** California's privacy law (CCPA/CPRA) applies to businesses
  well above his size, so **he is almost certainly outside it** — but he will be
  holding real people's names, phone numbers and home addresses on behalf of his
  customers, and *"we lost your customer list"* is a business-ending event
  regardless of which law applies. **That is why roadmap 2.22 (backups) exists.**
- **Insurance** — general liability and errors-and-omissions. **Not yet.** Worth
  asking about when there are paying customers and a written contract.

---

## What is already handled in the plan

| | Where |
|---|---|
| Auto-renewal disclosure, cancel button, exit fee | Roadmap 2.20, `docs/payments-research-2026-09-04.md` |
| Terms and privacy | Roadmap 7.1 |
| Backups of customer data | Roadmap 2.22 |
| A parent on the payment account | Roadmap 2.20, settled |
| Sales tax mechanics and thresholds | `docs/payments-research-2026-09-04.md` rounds 2 and 4 |

## What only a human can do

1. **One hour with a CPA**, before the first sale. Bring: sole proprietor vs
   LLC, the $800 franchise tax, income and self-employment tax for a minor, and
   whether the $999 setup fee is taxable in California from 2027.
2. **A conversation with his dad** about the Stripe account and the LLC
   question, because both land on his dad's name.
3. **The city business licence**, which is a form and a small fee and is the
   easiest thing on this page to forget.

---

## Sources

- SaaS taxability by state, with the taxing and non-taxing lists: https://www.anrok.com/saas-sales-tax-by-state
- The same, second source: https://taxcloud.com/blog/saas-sales-tax-by-state/
- California SB 122 — SaaS taxable from 1 January 2027: https://www.pwc.com/us/en/services/tax/library/california-imposes-sales-and-use-tax-on-digital-products-and-saas.html
- California LLC $800 annual franchise tax, and the expiry of the first-year exemption: https://www.llcuniversity.com/california-llc/annual-llc-tax-exemption-ab-85/
- California LLC filing fee and ongoing costs: https://www.llcuniversity.com/california-llc/annual-llc-tax/
- Minors as LLC members and organizers, and the manager-managed workaround: https://www.nolo.com/legal-encyclopedia/do-llc-members-need-18-years-old-older.html
- California's silence on organizer age: https://answers.justia.com/question/2024/10/09/can-minor-form-llc-all-by-himself-withou-1033566
- Sole proprietor vs LLC cost comparison: https://www.wolterskluwer.com/en/expert-insights/singlemember-llc-vs-sole-proprietorship
- Numeral — free nexus monitoring, $150/registration, $75/filing: https://www.numeral.com/blog/anrok-alternatives
- Sales-tax compliance pricing across vendors: https://www.stackscored.com/pricing/sales-tax-compliance/
- Stripe Tax pricing: https://stripe.com/tax/pricing
