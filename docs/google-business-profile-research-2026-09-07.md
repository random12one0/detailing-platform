# Google Business Profile — is the WRITE half achievable?

**Researched 2026-09-07 from Google's own developer documentation and from
developers reporting live behaviour.** Roadmap 8.16 says *"research whether the
WRITE half is achievable before designing anything"*, and that is his own
question 16.

**The short answer: YES, and almost none of the cost is code.** It is two
separate Google reviews, in a fixed order, and both of them need
`detailingplatform.com` to be a live site with a mailbox on its own domain. A
session that starts building the sync first will finish it and then discover it
cannot be switched on for anybody.

---

## What he asked for

> Two-way sync, so photos uploaded to the platform appear on GBP and hours
> changed here change there.

Both halves are real API surfaces. `business.manage` covers locations, hours,
photos (`media`), posts and reviews, and a third-party application can hold
them for many separate businesses, each authorising through OAuth. Google
documents this partner shape explicitly — a "Business Profile Organization
account", with businesses either granting access at an OAuth consent screen or
adding the partner as an account manager.

**So the architecture is the ordinary one**: a per-tenant OAuth token store,
the same shape the Google Calendar item (roadmap 4.2, item O) was blocked on —
which means **doing this makes that one cheaper**, and the two should be
decided together rather than twice.

---

## The four gates, in the order they actually bite

**1 · A NEW GOOGLE CLOUD PROJECT HAS ZERO QUOTA FOR THESE APIS.** Not a low
quota — none. The APIs are not open by default.

**2 · AN API ACCESS REQUEST, REVIEWED BY A HUMAN, "within 14 days".** It wants
a described use case, an expected call volume, and which accounts will be
managed. Google's own guidance says to apply from **a business email address on
the business's own domain** and to make sure the business website is current.
Approval grants "a standard default quota" for all seven APIs, with increases
requested separately once usage passes 70%.

**3 · `business.manage` IS A SENSITIVE SCOPE, SO THE OAUTH APP NEEDS
VERIFICATION TOO.** This is the gate the item's own wording did not anticipate:
it is a SECOND review, separate from the API access request, and it is the one
that decides whether anybody other than the developer can grant consent.
Reported turnaround is 3–5 business days once submitted, and it includes
proving ownership of the domain the redirect URL lives on.

**4 · EACH DETAILER'S OWN PROFILE HAS TO BE VERIFIED AND ~60 DAYS OLD.** That
is a fact about the detailer, not about us, and it is the one to say out loud on
the settings screen — otherwise the first detailer to try it gets a failure that
looks like our bug.

---

## The thing worth knowing before anybody debugs this

**Google's own console currently shows `business.manage` as NON-sensitive while
the backend hard-blocks every external user at consent with
`Error 403: access_denied`** — a reported and, at the time of writing,
unresolved classification inconsistency on Google's platform.

**That failure looks exactly like a broken integration.** Consent screen loads,
user presses Allow, 403. A session that meets it will go looking at scopes,
redirect URIs and client IDs, all of which are correct. The answer is that the
app is unverified and the console is lying about whether it needs to be.

---

## What this means for roadmap 8.16

**It is not a build question, it is a queue question**, and the queue is:

1. `detailingplatform.com` live, with a mailbox on that domain
   (`support@detailingplatform.com` is already the intended address —
   `_shared/platformBrand.ts` — and is waiting on the same iCloud+ domain
   verification the support inbox needs).
2. Google Cloud project → **request Business Profile API access** (~14 days).
3. OAuth consent screen → **submit for verification** (3–5 business days).
4. Only then is there anything to build, and what there is to build is a token
   store and two sync paths.

**Two of those four are already blocked on the same thing as three other items
in this repo** — the mailbox — so the honest sequencing is: the mailbox
unblocks the applications, the applications take about three weeks of waiting,
and the code is a week that can happen while they are in flight only if
somebody is prepared to test against a single account.

**The recommendation is to START THE TWO APPLICATIONS NOW** and build nothing
until at least the API access one is answered. They cost an hour of his time
between them, they expire nothing, and the waiting is the long pole. Building
first means a finished feature nobody can switch on.

---

## Sources

- [Business Profile APIs — FAQ](https://developers.google.com/my-business/content/faq)
- [Business Profile APIs — overview](https://developers.google.com/my-business/content/overview)
- [Implement OAuth with Business Profile APIs](https://developers.google.com/my-business/content/implement-oauth)
- [Sensitive scope verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification)
- [OAuth 2.0 scopes for Google APIs](https://developers.google.com/identity/protocols/oauth2/scopes)
- [The reported `business.manage` classification inconsistency](https://discuss.google.dev/t/oauth-business-manage-shown-as-non-sensitive-in-auth-platform-but-backend-blocks-all-external-users-with-error-403-access-denied-no-submit-for-verification-path-exists/384175)
