# Turning on "Continue with Google" — your ten minutes

Roadmap 2.25. **The code is already written and has been since before you
asked.** `app/src/screens/Auth.jsx` has the whole thing: the Google button in
their own brand colours, the sign-in call, and a check that asks Supabase which
providers are switched on — **so the button appears the moment Google is
enabled and never before.** No rebuild, no deploy, and no button that leads to
*"provider is not enabled"*.

Measured on 2026-09-05 and again on 2026-09-06: that check answers
`google: false`. Email is the only way in.

**What is missing is an account only you can make.** This is the click-by-click.

---

## Before you start

You need to be signed in to a Google account (any of yours) and to Supabase.
Nothing here touches the live business project — it is all on the platform's
own project.

Keep two tabs open: **Google Cloud Console** and **Supabase**.

---

## 1. Get the callback address out of Supabase (30 seconds)

1. Supabase → your project → **Authentication** → **Providers** → **Google**.
2. Do not switch it on yet. Copy the **Callback URL (for OAuth)** it shows you.
   It looks like `https://<project>.supabase.co/auth/v1/callback`.

Leave the tab open.

---

## 2. Make the Google credential (about five minutes)

1. Go to <https://console.cloud.google.com/>.
2. Top left, next to the Google Cloud logo, click the project picker →
   **New project**. Call it something you will recognise — *Detailing
   Platform* — and create it. Wait for it to switch to that project.
3. In the search bar, type **OAuth consent screen** and open it.
   - **External**, then Create.
   - App name: **Detailing Platform**. User support email: yours. Developer
     contact: yours. Save and continue through the next screens; you do not
     need to add scopes or test users.
   - **You do not need to submit it for verification.** Google shows an
     "unverified app" notice only for sensitive scopes; a plain sign-in is
     not one.
4. Search for **Credentials** → **Create credentials** → **OAuth client ID**.
   - Application type: **Web application**.
   - Name: anything.
   - **Authorised redirect URIs** → Add URI → paste the callback URL you
     copied from Supabase.
   - Create.
5. Google shows you a **Client ID** and a **Client secret**. Copy both.

---

## 3. Paste them into Supabase (30 seconds)

1. Back in Supabase → Authentication → Providers → Google.
2. Switch it **on**, paste the Client ID and Client secret, Save.

---

## 4. Check it (one minute, and it is not optional)

Open the sign-in page. **The Google button should now be there** — it appears
on its own, because the page asks Supabase what is switched on.

Then do the one thing nothing in this product has ever exercised:

**Sign up with a Google account that has never used the platform.** A Google
sign-up lands a session with no business, and the app is supposed to send that
to business creation — the email path does this and is tested, the Google path
has never been walked by anybody. **If it lands anywhere else, that is the one
bug this feature can have, and it is worth finding on a Tuesday rather than in
front of a detailer.**

---

## What it changes for a detailer

One button instead of typing a password, and one fewer password to forget —
which matters more now that forgetting one is recoverable but still annoying.
Nothing else moves: the same account, the same business, the same everything
after the first screen.

## What to do if you would rather not

Nothing breaks. Email and password is the only way in today and it works,
including the reset flow. **This is a convenience, not a gap** — the button
simply stays hidden until the day you do it.
