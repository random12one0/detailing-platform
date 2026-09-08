// The booking link, made reachable.
//
// This was rendered as dead text — "Your booking page: /book/coastline" —
// which is a strange thing to do to the single most-shared asset a detailer
// owns. It goes in the Instagram bio, on the van, in every text to a
// customer who asks "how do I book?". You could read it and not copy it.
//
// Three ways out, in the order people actually want them: share (the native
// sheet, which is how a link gets into Instagram or a text), copy (for
// pasting into a website or an email), and open (to check it looks right).
// Share only appears where the browser has it — on a desktop it usually
// does not, and a button that silently does nothing is worse than no button.
//
// AND A FOURTH, ON ITS OWN LINE: the QR code (the owner, 2026-09-02 — *“you
// click generate QR code and it just pops up with the one that you could
// copy, save to your files”*). It is GENERATED ON DEMAND rather than always
// drawn, which is his own shape and also the cheaper one: most visits to this
// block are to copy the link.
//
// **IT IS DRAWN BLACK ON WHITE WITH A QUIET ZONE, ON A NEAR-BLACK PAGE, AND
// THAT IS THE WHOLE OF WHETHER IT WORKS.** A scanner needs the dark modules
// darker than the light ones and needs four modules of clear margin around
// the code. Painting it in the tenant’s accent on the dashboard ground would
// match the product and fail to scan, which is the one outcome worse than not
// building it. Law 11 does not reach here: this is not a surface, it is a
// machine-readable object that happens to be on one.
//
// Its NEW line, not a third button beside Copy and Open: walkthrough W14 is
// the measured ceiling here — three buttons across at 392 put Open 24px past
// the edge, which is why Share already takes its own line.

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Download, ExternalLink, QrCode, Share2, TriangleAlert } from "lucide-react";
// Zero dependencies of its own, and the reason it is a library rather than
// 250 lines here: a QR is Reed-Solomon over GF(256) plus mask selection, and
// I have no way to check that a hand-rolled one SCANS. A code that looks
// right and does not scan is the “printed but not charged” family of defect
// this repo already has a rule about. The owner asked for it 2026-09-02.
import qrcode from "qrcode-generator";
import { useBusiness } from "../context/BusinessContext.jsx";
import { bookable } from "../book/core.js";
// ROADMAP 8.17 STAGE 2B — the DASHBOARD's language (`dp.lang.app`), never
// the booking page's. `useAppLocale()` goes in every component that renders
// translated text: once at the root works only until something is memoised.
import { t } from "../lib/appI18n.js";
import { useAppLocale } from "../hooks/useAppLocale.js";

// 4 modules of clear margin is the spec’s own figure, not a taste choice —
// below it a scanner cannot find the code’s edge against whatever it is
// printed on.
const QUIET = 4;
// Each module is drawn this many device pixels, so a 33-module code saves as
// a ~1,230px PNG — big enough to print on a card or a van panel without
// blurring. The canvas is scaled DOWN by CSS for the screen; saving the small
// version is the mistake that makes a QR unusable at the one size it matters.
const PX = 30;

export default function BookingLink({
  slug,
  // ROADMAP 2.14 STEP 3 — FOUR OPTIONAL PROPS, ONE JOB: point this block at
  // another public page of the same business. The plans page (`/plans`) needs
  // every affordance this one already has — it goes in an Instagram bio and on
  // a card exactly as the booking link does, and a page a detailer cannot
  // share is a page nobody visits.
  // **The LABEL and the FOOTNOTE are props and not just the URL**, because a
  // block headed "Your booking page" printing a /plans address is a control
  // lying about itself, and "Customers book themselves from here" is not what
  // happens on the plans page. Every default is exactly what the three
  // existing callers already rendered.
  path = "",
  // ROADMAP 3.3 — the detailer's own verified address, or nothing. Passed in
  // rather than looked up here, because this component is rendered in four
  // places and a lookup in each of them is four round trips for one fact the
  // screen above already has.
  origin = "",
  label = "Your booking page",
  footnote = "Put this in your bio, on your cards and in your texts. Customers book themselves from here.",
  shareTitle = "Book with us",
}) {
  useAppLocale();
  // Roadmap 8.4 — whether this link can actually take a booking. `settings`
  // is null for the moment before the context resolves, and `bookable` says
  // no to that; the warning would flash on every load. Absent settings is not
  // an answer, so it draws nothing until there is one.
  const { settings } = useBusiness();
  const linkWorks = !settings || bookable(settings);

  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrCopied, setQrCopied] = useState(false);
  const canvas = useRef(null);

  // navigator.share only exists in a secure context and mostly on mobile.
  useEffect(() => { setCanShare(typeof navigator !== "undefined" && !!navigator.share); }, []);

  // ROADMAP 2.14 STEP 3 — `path` generalises this ONE line and nothing else.
  // The plans page (`/book/:slug/plans`) needs every affordance this block
  // already has: it goes in an Instagram bio and on a card exactly as the
  // booking link does, and a page a detailer cannot share is a page nobody
  // visits. Defaults to the booking page, so the three existing callers are
  // untouched.
  // ROADMAP 3.3 — THE ORIGIN IS THE DETAILER'S WHERE THEY HAVE ONE. The
  // dashboard is always on detailingplatform.com (that is where they sign
  // in), so `window.location.origin` would hand somebody with their own
  // verified address a link on OUR domain to print on a card — while every
  // email the platform sends them uses theirs. The two disagreeing is worse
  // than neither being custom.
  const url = `${origin || window.location.origin}/book/${slug}${path}`;
  // What a person reads on a card or types into a phone — no scheme noise.
  const pretty = url.replace(/^https?:\/\//, "");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard can be blocked; the old trick still works everywhere.
      const ta = document.createElement("textarea");
      ta.value = url; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const share = async () => {
    try {
      await navigator.share({ title: shareTitle, url });
    } catch { /* the person dismissed the sheet */ }
  };

  // Drawn once the canvas exists, not on the click: the element is only in
  // the DOM after the state flips, so painting in the handler would paint
  // nothing on a canvas that is not there yet.
  useEffect(() => {
    if (!qrOpen || !canvas.current) return;
    // 0 = pick the smallest version that fits; “M” is the standard error
    // correction and survives 15% of the code being damaged, which is what a
    // sticker on a van needs.
    const q = qrcode(0, "M");
    q.addData(url);
    q.make();
    const n = q.getModuleCount();
    const size = (n + QUIET * 2) * PX;
    const el = canvas.current;
    el.width = size; el.height = size;
    const g = el.getContext("2d");
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, size, size);
    g.fillStyle = "#000000";
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (q.isDark(r, c)) g.fillRect((c + QUIET) * PX, (r + QUIET) * PX, PX, PX);
      }
    }
  }, [qrOpen, url]);

  const saveQr = () => {
    canvas.current?.toBlob((blob) => {
      if (!blob) return;
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      // The path in the name too, or a detailer with both codes in their
      // downloads folder has two files called the same thing and no way to
      // tell which one goes on the card.
      // ROADMAP 4.2 — and `path` is a QUERY STRING now, not just a sub-page.
      // `?c=golf-flyer` in a filename is a file Windows refuses to save and
      // macOS quietly renames, so everything but a word character becomes a
      // hyphen rather than only the slashes.
      a.download = `${slug}${path.replace(/[^\w-]+/g, "-").replace(/-+$/, "")}-qr.png`;
      a.click();
      // Revoked on the next tick rather than immediately: Safari has not
      // finished reading the URL when click() returns.
      setTimeout(() => URL.revokeObjectURL(href), 1000);
    }, "image/png");
  };

  const copyQr = () => {
    canvas.current?.toBlob(async (blob) => {
      if (!blob) return;
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setQrCopied(true);
        setTimeout(() => setQrCopied(false), 1800);
      } catch { /* the browser refused; Save is the way out and is always there */ }
    }, "image/png");
  };

  // Copying an IMAGE is not the same permission as copying text and half the
  // browsers in use do not have it. Offered where it exists; Save is the
  // path that always works, which is why it is the primary of the two.
  const canCopyImage = typeof window !== "undefined" && typeof window.ClipboardItem === "function";

  return (
    /* data-tour — the walkthrough's LAST step (§13b), because the link is the
       thing they have to go and use. */
    <div className="tight" data-tour="link">
      <span className="label">{label}</span>
      <div className="card">
        {/* **THE WARNING GOES HERE AND NOWHERE ELSE — roadmap 8.4, and this
            is the half he called load-bearing.** A detailer who has not
            answered *where do you work* has a link that cannot take a
            booking: the server refuses every service type and the page tells
            the customer they are still setting up. Sharing it before then
            sends people to a dead end, **which is worse than the default it
            replaces** — the old `not null default true` at least kept the
            page working, by guessing.

            **ONE GUARD IN THE SHARED COMPONENT, not one per caller.** This
            block is rendered in six places — Today, Business twice, Campaigns, Clients
            and Plans — and a warning added to the screen somebody happened to
            be looking at is four screens still handing out a dead link. The
            question is a property of the LINK, so it belongs to the thing
            that draws the link.

            It reads the context rather than taking a prop: every caller is
            inside `BusinessProvider`, and a sixth would have to remember. */}
        {!linkWorks && (
          <div className="error-box" style={{ marginBottom: "var(--sp-3)" }}>
            <TriangleAlert size={18} strokeWidth={2} />
            <span>
              <strong>{t("This link can’t take a booking yet.")}</strong> Answer{" "}
              <em>{t("where you work")}</em> {t("in your setup — until then anyone who opens it is told you are still setting up.")}
            </span>
          </div>
        )}
        {/* The address itself, selectable, in the figure face — it is a
            value to be read and checked, not a sentence. */}
        <div className="booking-link">{pretty}</div>
        {/* Three across does not fit a phone — owner walkthrough W14, "the
            Open button stretches off screen". It only appeared on his machine
            because Chrome on Windows HAS navigator.share, so he had three
            buttons where a headless browser has two: measured at 392, Open
            ended 24px past the edge. Share is the primary and takes its own
            full-width line; the two secondary actions share the one below,
            which fits at every width and never depends on how many there are. */}
        {canShare && (
          <button className="btn primary" style={{ marginTop: 12 }} onClick={share}>
            <Share2 size={18} strokeWidth={2} /> {t("Share")}
          </button>
        )}
        <div className="btnrow" style={{ marginTop: canShare ? 8 : 12 }}>
          <button className={`btn${canShare ? "" : " primary"}`} onClick={copy}>
            {copied
              ? <><Check size={18} strokeWidth={2} /> {t("Copied")}</>
              : <><Copy size={18} strokeWidth={2} /> {t("Copy")}</>}
          </button>
          <a className="btn" href={`/book/${slug}${path}`} target="_blank" rel="noreferrer">
            <ExternalLink size={18} strokeWidth={2} /> {t("Open")}
          </a>
        </div>
        {/* ITS OWN LINE, never a third button beside Copy and Open — W14.
            The button is REPLACED by what it makes rather than sitting above
            it: once the code is on the screen, “Generate QR code” is a control
            that would do nothing, and the two actions under the image are the
            things there is left to do with it. */}
        {!qrOpen ? (
          <button className="btn" style={{ marginTop: 8, width: "100%" }}
            onClick={() => setQrOpen(true)}>
            <QrCode size={18} strokeWidth={2} /> {t("Generate QR code")}
          </button>
        ) : (
          <div className="tight" style={{ marginTop: 10 }}>
            {/* On WHITE, with its own padding, because the page it sits on is
                near-black and a scanner needs the quiet zone to be light.
                The canvas is ~1,230px and is drawn small; what SAVES is the
                full-size one. */}
            <div className="qr-plate">
              <canvas ref={canvas} aria-label={`QR code for ${pretty}`} role="img" />
            </div>
            <div className="btnrow">
              <button className="btn primary" onClick={saveQr}>
                <Download size={18} strokeWidth={2} /> {t("Save")}
              </button>
              {canCopyImage && (
                <button className="btn" onClick={copyQr}>
                  {/* “Copy IMAGE”, because the button eight lines above this
                      one also says Copy and copies the LINK. Two controls
                      with one label on one card, doing different things, is
                      the label failing at its only job. */}
                  {qrCopied
                    ? <><Check size={18} strokeWidth={2} /> {t("Copied")}</>
                    : <><Copy size={18} strokeWidth={2} /> {t("Copy image")}</>}
                </button>
              )}
            </div>
            {/* NO SENTENCE HERE. “Point a phone at it and it opens your
                booking page” was written first and deleted: the block is
                headed *Your booking page*, the address is printed two rows
                above, and everybody already knows what a QR code is. It adds
                no fact the controls do not carry — the owner’s rule,
                2026-09-01. */}
          </div>
        )}

        <p className="quiet" style={{ marginTop: 10 }}>{footnote}</p>
      </div>
    </div>
  );
}
