// Business identity + branding. Every value here feeds the public site and
// the emails — nothing about the business is hardcoded anywhere. Logo and
// hero are REAL file uploads to Supabase Storage (no more pasting URLs).

import { useState } from "react";
import { ImagePlus, X } from "lucide-react";
// The one phone shape, applied where a phone number is typed.
import { phone, phoneAsTyped } from "../../lib/format.js";
import { supabase } from "../../lib/supabase.js";
import { useBusiness } from "../../context/BusinessContext.jsx";
import { uploadBusinessPhoto } from "../../lib/upload.js";
import { Group, Setting } from "../../components/controls.jsx";
import TimezonePicker from "../../components/TimezonePicker.jsx";
import TimezoneChangeGuard from "../../components/TimezoneChangeGuard.jsx";
import { localTime } from "../../lib/format.js";
// ROADMAP 8.17 STAGE 2B — the DASHBOARD's language (`dp.lang.app`), never
// the booking page's. `useAppLocale()` goes in every component that renders
// translated text: once at the root works only until something is memoised.
import { t } from "../../lib/appI18n.js";
import { useAppLocale } from "../../hooks/useAppLocale.js";

export default function BusinessInfo() {
  useAppLocale();
  const { business, branding, settings, reload } = useBusiness();
  const [biz, setBiz] = useState({
    name: business.name,
    contact_email: business.contact_email || "",
    // Shown in the one shape the whole product uses, not in whatever shape it
    // happened to be typed in years ago. `phone()` returns anything it cannot
    // parse untouched, so a number it does not recognise is not mangled.
    contact_phone: phone(business.contact_phone || ""),
    dropoff_address: business.dropoff_address || "",
    mailing_address: business.mailing_address || "",
    service_area: business.service_area || "",
    timezone: business.timezone,
    // ROADMAP 3.2(b). Its own column rather than a credential entry, because
    // "since 2016" is a fact a site puts in a masthead, an about paragraph
    // AND a footer — reading it out of a list means three places agreeing on
    // which entry it is.
    established_year: business.established_year ?? "",
  });
  // THE TWO COLOUR PICKERS ARE GONE (roadmap 2.11 step 6, stage 6). A tenant
  // has ONE accent — law 11 — and it is set on "Your colour", which is the
  // only screen that shows what the choice does. Two pickers on two screens
  // writing two columns was a schema accident, not a choice the product
  // offers, and the second colour is what drew a 3px rule the same colour as
  // the band under it on every email (D1). Neither column is written from
  // here any more; `Appearance` writes both.
  const [brand, setBrand] = useState({
    tagline: branding?.tagline || "",
    about_copy: branding?.about_copy || "",
    logo_url: branding?.logo_url || "",
    hero_image_url: branding?.hero_image_url || "",
    social_instagram: branding?.social_instagram || "",
    social_facebook: branding?.social_facebook || "",
    social_tiktok: branding?.social_tiktok || "",
    social_youtube: branding?.social_youtube || "",
  });
  // ROADMAP 3.2(b), contract §6h. Five of the six real detailers studied lead
  // with *licensed and insured*, *certified Ceramic Pro installer*, *IDA
  // certified*, *est. 1993*. The schema held none of it, so every bespoke
  // site would have hard-coded it — and a lapsed certification would then
  // live in a client's HTML where nothing in this repo can see it.
  const [creds, setCreds] = useState(() =>
    (Array.isArray(branding?.credentials) ? branding.credentials : [])
      .map((c) => ({ label: c?.label ?? "", detail: c?.detail ?? "" })));
  const [reviews, setReviews] = useState({
    google_review_url: settings?.google_review_url || "",
    yelp_review_url: settings?.yelp_review_url || "",
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // {ok, text}
  const [tzGuard, setTzGuard] = useState(null); // {from,to,sample,count} when confirmation is needed

  // Changing timezone is silent unless there are future bookings whose
  // displayed times would move; then we show exactly what will change,
  // using a real job from their calendar.
  // ROADMAP 8 AUDIT, 2026-09-07 — A REVIEW LINK HAS TO BE A LINK.
  //
  // Both of these become an `href`: in the thank-you email, and on the
  // detailer's own website through `get_public_business_profile`. A pasted
  // `javascript:` or a value with a quote in it is a link a detailer can point
  // anywhere inside mail their own customers trust.
  //
  // **THE DATABASE IS THE ENFORCEMENT** — a check constraint on both columns,
  // `20260907009000_review_links_are_links.sql` — and this is the COURTESY, the
  // same division the emailable predicate uses. Without it the constraint's own
  // message reaches the screen, and *"new row violates check constraint
  // business_settings_google_review_url_is_https"* is not something to show
  // somebody who pasted a link with `http` on the front.
  // The character class is the CONSTRAINT'S OWN, character for character. A
  // looser one here is worse than none: it waves a value through and the
  // database then refuses it with its own wording, which is the exact thing
  // this guard exists to prevent. `tests/payments.test.mjs` § 7 runs a corpus
  // through both and fails on any value the two disagree about.
  const badLink = (v) => {
    const url = String(v ?? "").trim();
    return url !== "" && !/^https:\/\/[A-Za-z0-9._~:/?#@!$&*+,;=%()[\]-]{3,180}$/.test(url);
  };

  const save = async () => {
    for (const [label, value] of [
      ["Google", reviews.google_review_url],
      ["Yelp", reviews.yelp_review_url],
    ]) {
      if (badLink(value)) {
        setMsg({
          ok: false,
          text: `That ${label} review link doesn't look like a web address. `
            + `Paste the whole thing, starting with https://`,
        });
        return;
      }
    }
    if (biz.timezone !== business.timezone) {
      const { data: upcoming } = await supabase
        .from("bookings")
        .select("customer_name, start_at")
        .eq("business_id", business.id)
        .is("deleted_at", null)
        .neq("status", "cancelled")
        .gte("start_at", new Date().toISOString())
        .order("start_at", { ascending: true })
        .limit(50);
      if (upcoming?.length) {
        const first = upcoming[0];
        setTzGuard({
          from: business.timezone,
          to: biz.timezone,
          count: upcoming.length,
          sample: {
            customerName: first.customer_name,
            date: new Intl.DateTimeFormat("en-CA", { timeZone: biz.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(first.start_at)),
            oldTime: localTime(first.start_at, business.timezone),
            newTime: localTime(first.start_at, biz.timezone),
          },
        });
        return;
      }
    }
    await persist();
  };

  const persist = async () => {
    setTzGuard(null);
    setBusy(true);
    setMsg(null);
    const nn = (v) => (v.trim() === "" ? null : v.trim());
    const [r1, r2, r3] = await Promise.all([
      supabase.from("businesses").update({
        name: biz.name.trim(),
        contact_email: nn(biz.contact_email),
        contact_phone: nn(biz.contact_phone),
        dropoff_address: nn(biz.dropoff_address),
        mailing_address: nn(biz.mailing_address),
        service_area: nn(biz.service_area),
        timezone: biz.timezone.trim(),
        established_year: /^\d{4}$/.test(String(biz.established_year).trim())
          ? Number(biz.established_year) : null,
      }).eq("id", business.id),
      supabase.from("business_branding").upsert({
        business_id: business.id,
        tagline: nn(brand.tagline),
        about_copy: nn(brand.about_copy),
        logo_url: nn(brand.logo_url),
        hero_image_url: nn(brand.hero_image_url),
        social_instagram: nn(brand.social_instagram),
        social_facebook: nn(brand.social_facebook),
        social_tiktok: nn(brand.social_tiktok),
        social_youtube: nn(brand.social_youtube),
        // ROADMAP 3.2(b). `social_google` and `social_yelp` are GONE — dead
        // columns that shadowed `business_settings.google_review_url` /
        // `yelp_review_url` five lines below, saved from here with no input
        // and therefore always empty. A shadowing column is worse than a
        // missing one: the next reader takes whichever they find first.
        // Rows with an empty label are dropped rather than stored: a blank
        // badge on a website is a gap where a claim should be.
        credentials: creds
          .filter((c) => c.label.trim())
          .map((c) => ({
            label: c.label.trim(),
            ...(c.detail.trim() ? { detail: c.detail.trim() } : {}),
          })),
      }),
      supabase.from("business_settings").update({
        google_review_url: nn(reviews.google_review_url),
        yelp_review_url: nn(reviews.yelp_review_url),
      }).eq("business_id", business.id),
    ]);
    const err = r1.error || r2.error || r3.error;
    setMsg(err ? { ok: false, text: err.message } : { ok: true, text: "Saved." });
    if (!err) reload();
    setBusy(false);
  };

  const upload = async (e, field, folder) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setMsg(null);
    try {
      const url = await uploadBusinessPhoto(business.id, file, folder);
      setBrand((b) => ({ ...b, [field]: url }));
      setMsg({ ok: true, text: "Photo uploaded. Press Save to keep it." });
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    }
    setBusy(false);
  };

  // Whether the links section starts open. Read ONCE per mount: computing it
  // from the live values would collapse the section the moment somebody
  // cleared the last one while editing.
  const [hasLinks] = useState(() => Boolean(
    brand.social_instagram || brand.social_facebook || brand.social_tiktok
    || brand.social_youtube || reviews.google_review_url || reviews.yelp_review_url,
  ));

  // WHICH CREDENTIAL IS OPEN, AND AT MOST ONE. See the note on the list
  // below: every other one is a read-only row, so there is never more than
  // one pair of empty boxes on this screen.
  const [editing, setEditing] = useState(null);
  const setCred = (i, patch) =>
    setCreds(creds.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const dropCred = (i) => {
    setCreds(creds.filter((_, j) => j !== i));
    setEditing(null);
  };

  return (
    <>
      {/* **THIS SCREEN WAS NINETEEN TEXT BOXES AND NOTHING ELSE — rebuilt
          2026-09-13, on Andrew's note that the editing screens feel like a
          thousand text boxes.** It was the only screen in the dashboard with
          no structured control of any kind: no `Group`, no `Setting`, no
          list, one flat `.card` with thirteen visible inputs down it and six
          more behind a fold. `BookingRules` has 24 structured controls and
          `Notifications` has five; this one had zero.
          **THE FAULT WAS MONOTONY, NOT LENGTH** (CLAUDE.md § SCREEN RULES),
          so no field is dropped and nothing is hidden that was not hidden
          before. What changed is that the page now has four shapes in it
          rather than one: settings rows, a pair of picture tiles, a list you
          open, and a fold.
          **AND THE GROUPS ARE NOT DECORATION — THEY ARE THE FOUR SENTENCES
          THIS SCREEN USED TO SPEND ON EXPLAINING ITSELF.** It said "(gets
          notifications)", "(shown on your site)", "Only ever printed at the
          bottom of an email you send your old customers" and a paragraph
          about the website, and every one of those was answering the same
          question: who reads this value. A heading answers it once for a
          whole block, which is the relationship made structural instead of
          described. */}

      <Group title={t("Your business")}>
        <Setting stacked label={t("Business name")}>
          <input value={biz.name} onChange={(e) => setBiz({ ...biz, name: e.target.value })} />
        </Setting>
        <Setting stacked label={t("Tagline")}>
          <input value={brand.tagline} onChange={(e) => setBrand({ ...brand, tagline: e.target.value })} />
        </Setting>
        <Setting stacked label={t("About you")}>
          <textarea value={brand.about_copy} onChange={(e) => setBrand({ ...brand, about_copy: e.target.value })} />
        </Setting>
        <Setting stacked label={t("Service area")} help={t("Shown on your site.")}>
          <input value={biz.service_area} onChange={(e) => setBiz({ ...biz, service_area: e.target.value })}
            placeholder={t("e.g. Lakewood, California")} />
        </Setting>
        {/* ROADMAP 3.2(b). Four digits, and the save drops anything else
            rather than arguing with it — the column's own check constraint is
            the half that holds.
            SIZED TO ITS CONTENT, which is the other half of the anti-monotony
            answer and is CLAUDE.md's own rule: a year is 6ch. A four-digit
            number in a full-width box is part of what made every row on this
            screen the same shape.
            **AND IT IS NOT `stacked`, WHICH IS THE POINT.** A 6ch box does not
            need a line of its own, so this row is the label on the left and
            the control on the right — the shape every settings row in the
            product already has. Four stacked rows and then a short inline one
            is a different rhythm; four stacked rows and a fifth stacked row
            holding a small box is the same rhythm with a gap in it.
            **THE WRAPPER IS A `<label>` AND NOT A `<span>`.** The sizing rule
            is `label.field.w-year > input`, so a span looked correct in the
            file and rendered full width — caught at 1440 by looking, where
            "2019" sat in a 690px box. The same mistake was under Phone. */}
        <Setting label={t("Detailing since")}>
          <label className="field w-year">
            <input value={biz.established_year} inputMode="numeric" maxLength={4} placeholder="e.g. 2016"
              onChange={(e) => setBiz({ ...biz, established_year: e.target.value })} />
          </label>
        </Setting>
        {/* **A BARE `<input type="file">` IS THE ONE CONTROL IN THIS PRODUCT
            WITH NO DESIGN AT ALL** — the operating system draws it, it ignores
            every token in the stylesheet, and there were two of them side by
            side here with a 48px thumbnail floating above each. The product
            already answers this twice (`Gallery`, `SiteIntake`): a `<label>`
            wrapping a hidden input, so the picker is whatever we draw. The
            tile IS the preview, so the floating thumbnail is gone with it. */}
        <Setting stacked label={t("Logo and cover photo")}>
          <div className="grid2">
            <PhotoTile name={t("Logo")} url={brand.logo_url} fit="contain" busy={busy}
              onPick={(e) => upload(e, "logo_url", "branding")} />
            <PhotoTile name={t("Cover photo")} url={brand.hero_image_url} fit="cover" busy={busy}
              onPick={(e) => upload(e, "hero_image_url", "branding")} />
          </div>
        </Setting>
      </Group>

      <Group title={t("How customers reach you")}>
        <Setting label={t("Phone")}>
          <label className="field w-phone">
            <input value={biz.contact_phone}
              onChange={(e) => setBiz({ ...biz, contact_phone: phoneAsTyped(e.target.value) })} />
          </label>
        </Setting>
        <Setting stacked label={t("Drop-off address")}>
          <input value={biz.dropoff_address} onChange={(e) => setBiz({ ...biz, dropoff_address: e.target.value })} />
        </Setting>
        {/* Every booking time, reminder and calendar date is computed in this
            zone. Picked from the real IANA list — never typed free-hand. */}
        <Setting stacked label={t("Timezone")}
          help={t("Every time on your booking page means this zone.")}>
          <TimezonePicker value={biz.timezone} onChange={(tz) => setBiz({ ...biz, timezone: tz })} />
        </Setting>
      </Group>

      {/* ROADMAP 3.2(b), contract §6h. THE DESTINATION IS THE NON-OBVIOUS
          FACT, so it keeps its sentence — the same call Reviews made. These
          appear nowhere in this product: they are for the website, which is
          still being built, and a detailer who types in three badges and goes
          looking for them has been misled by a missing clause.
          **THEY ARE A LIST YOU OPEN, NOT A GRID OF BOXES — 2026-09-13.** Three
          credentials used to be six text inputs stacked in three rows, which
          on a phone is a third of this screen spent on the least-filled part
          of it. This is `Catalog`'s own shape, the screen Andrew named as the
          reference: read-only rows you tap to open, `.menu-row` for both, and
          an Add that appends one and opens it. At most one pair of boxes is on
          screen at a time, and a detailer with two badges reads two lines of
          their own words instead of four empty fields. */}
      <Group title={t("What customers should know")}
        blurb={t("Licenses, certifications, warranties. They go on your website. That part is still being built.")}>
        <div className="setting stacked">
          <div className="credlist">
            {creds.map((c, i) => (editing === i ? (
              <div className="menu-row credrow open" key={i}>
                <div className="grid2">
                  <label className="field"><span>{t("What it is")}</span>
                    <input autoFocus value={c.label} placeholder={t("e.g. Licensed & insured")}
                      onChange={(e) => setCred(i, { label: e.target.value })} /></label>
                  {/* NOT "A line about it (optional)". Measured at 392: the
                      pair's columns are about 150px, that label wraps to two
                      lines and the LEFT one does not — so the first row's two
                      inputs sat a line apart while every row under it lined
                      up. The word was carrying nothing the empty field does
                      not already say. */}
                  <label className="field"><span>{t("A line about it")}</span>
                    <input value={c.detail} placeholder={t("e.g. Fully covered on your property")}
                      onChange={(e) => setCred(i, { detail: e.target.value })} /></label>
                </div>
                <div className="credtools">
                  <button className="btn sm inline" onClick={() => setEditing(null)}>{t("Done")}</button>
                  <button className="btn sm inline icon ghost" onClick={() => dropCred(i)}
                    aria-label={`${t("Remove")} ${c.label || t("this line")}`}><X strokeWidth={2} /></button>
                </div>
              </div>
            ) : (
              <div className="menu-row credrow" key={i}>
                <button className="menu-name" onClick={() => setEditing(i)}>
                  <span className="n">{c.label.trim() || t("Not filled in")}</span>
                  {c.detail.trim() ? <span className="m">{c.detail}</span> : null}
                </button>
                <button className="btn sm inline icon ghost" onClick={() => dropCred(i)}
                  aria-label={`${t("Remove")} ${c.label || t("this line")}`}><X strokeWidth={2} /></button>
              </div>
            )))}
          </div>
          {/* A ROW WITH AN EMPTY LABEL IS DROPPED BY `persist`, so an Add that
              is pressed and then abandoned costs nothing and needs no guard. */}
          <div className="btnrow">
            <button className="btn" onClick={() => {
              setCreds([...creds, { label: "", detail: "" }]);
              setEditing(creds.length);
            }}>{t("Add a line")}</button>
          </div>
        </div>
      </Group>

      {/* FOUR SOCIAL FIELDS, NOT ONE. The columns for Facebook, TikTok and
          YouTube have been on `business_branding` since the first tenant
          migration and no screen ever offered them (inventory row 92), so a
          detailer whose customers are all on TikTok had nowhere to say so.
          Paired, because a phone stacks them at 320 anyway.

          **SIX OPTIONAL FIELDS ARE ONE DISCLOSURE — 2026-09-12.** Every one of
          them is optional and most detailers fill in none or one, so as six
          open boxes they were a third of this screen's height spent on the
          least likely answer. `.disclose` is the product's own pattern for
          exactly this (native `<details>`/`<summary>`, no script, no ARIA to
          get wrong).
          **IT OPENS ITSELF WHEN ANY OF THEM IS FILLED IN.** A detailer who has
          typed a link must never have to remember it is behind a control to
          find it again — a collapsed section hiding a value the person set is
          the same defect as a missing field. `open` is computed once at the
          first render, so it does not snap shut while somebody is typing. */}
      {/* **IT NEEDS A CARD OF ITS OWN NOW, AND IT DID NOT BEFORE — 2026-09-13.**
          This fold used to sit inside the one big card every other field was
          in, so it was housed by accident. With the screen split into four
          groups it was the only thing left standing on the bare ground, six
          labelled boxes floating between two cards. Found by looking at a 392
          crop, not by any check here.
          A PLAIN `.card` RATHER THAN A `Group`: `Group` draws a `.label`
          eyebrow above a `.setting-card`, and the summary already IS this
          block's heading — an eyebrow over it would say the same thing twice,
          which is the one-eyebrow-per-section rule in CLAUDE.md. */}
      <section className="tight" style={{ marginBottom: "var(--sp-5)" }}>
        <div className="card">
      <details className="disclose" open={hasLinks} style={{ marginTop: 0 }}>
        <summary>{t("Social and review links")}</summary>
        {/* `.fields` IS THE GAP. Three `.grid2` rows stacked directly on each
            other put "TikTok" hard against the Instagram box above it —
            `label.field` carries no bottom margin, and theme.css already says
            every other form in the product wraps them in `.fields` for exactly
            this. It was true before this rebuild too; putting the fold in a
            card is what made it visible. */}
        <div className="fields">
        <div className="grid2">
          <label className="field"><span>{"Instagram"}</span>
            <input value={brand.social_instagram} onChange={(e) => setBrand({ ...brand, social_instagram: e.target.value })} /></label>
          <label className="field"><span>{"Facebook"}</span>
            <input value={brand.social_facebook} onChange={(e) => setBrand({ ...brand, social_facebook: e.target.value })} /></label>
        </div>
        <div className="grid2">
          <label className="field"><span>{"TikTok"}</span>
            <input value={brand.social_tiktok} onChange={(e) => setBrand({ ...brand, social_tiktok: e.target.value })} /></label>
          <label className="field"><span>{"YouTube"}</span>
            <input value={brand.social_youtube} onChange={(e) => setBrand({ ...brand, social_youtube: e.target.value })} /></label>
        </div>
        <div className="grid2">
          <label className="field"><span>{t("Google review link")}</span>
            <input value={reviews.google_review_url} onChange={(e) => setReviews({ ...reviews, google_review_url: e.target.value })} /></label>
          <label className="field"><span>{t("Yelp review link")}</span>
            <input value={reviews.yelp_review_url} onChange={(e) => setReviews({ ...reviews, yelp_review_url: e.target.value })} /></label>
        </div>
        </div>
      </details>
        </div>
      </section>

      {/* THE TWO VALUES NOBODY BROWSING YOUR SITE EVER SEES. Both used to
          carry their own explanation inline, because with one flat card there
          was nothing else that could say who they were for. */}
      <Group title={t("Only you see these")}>
        <Setting stacked label={t("Contact email")}
          help={t("Where we email you about new bookings.")}>
          <input value={biz.contact_email} onChange={(e) => setBiz({ ...biz, contact_email: e.target.value })} />
        </Setting>
        {/* ROADMAP 2.19. NOT the drop-off address, and not decoration: a
            marketing email has to carry a postal address by law, and
            `send-campaign` refuses to send without one. A mobile detailer has
            no unit, so this is often a PO box — which is why it cannot borrow
            the drop-off address. It is printed on nothing else. */}
        <Setting stacked label={t("Mailing address")}
          help={t("Printed at the bottom of marketing email you send. The law asks for it.")}>
          <input value={biz.mailing_address} onChange={(e) => setBiz({ ...biz, mailing_address: e.target.value })}
            placeholder={t("e.g. PO Box 214, Lakewood CA 90713")} />
        </Setting>
      </Group>

      {msg && <div className={msg.ok ? "ok-box" : "error-box"}>{msg.text}</div>}
      <button className="btn primary" disabled={busy} onClick={save}>{busy ? t("Saving") : t("Save")}</button>

      {tzGuard && (
        <TimezoneChangeGuard
          {...tzGuard}
          onCancel={() => { setBiz({ ...biz, timezone: business.timezone }); setTzGuard(null); }}
          onConfirm={persist}
        />
      )}
    </>
  );
}

// THE TILE IS THE PREVIEW AND THE PICKER, which is why it is a `<label>` — the
// whole thing is the target, so there is no second control to size and no way
// to press the wrong half. `fit` is the only real difference between the two
// callers: a logo is a shape on a ground and must not be cropped, a cover
// photo is a scene and must fill.
function PhotoTile({ name, url, fit, busy, onPick }) {
  return (
    <label className={`phototile${url ? " has" : ""}`}>
      <span className="phototile-shot">
        {url
          ? <img src={url} alt="" style={{ objectFit: fit }} />
          : <ImagePlus strokeWidth={1.5} aria-hidden="true" />}
      </span>
      <span className="phototile-txt">
        <span className="n">{name}</span>
        <span className="m">{url ? t("Change") : t("Choose a file")}</span>
      </span>
      <input type="file" accept="image/*" hidden disabled={busy} onChange={onPick} />
    </label>
  );
}
