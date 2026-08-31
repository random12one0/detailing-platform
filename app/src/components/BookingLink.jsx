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

import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink, Share2 } from "lucide-react";

export default function BookingLink({ slug }) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  // navigator.share only exists in a secure context and mostly on mobile.
  useEffect(() => { setCanShare(typeof navigator !== "undefined" && !!navigator.share); }, []);

  const url = `${window.location.origin}/book/${slug}`;
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
      await navigator.share({ title: "Book with us", url });
    } catch { /* the person dismissed the sheet */ }
  };

  return (
    <div className="tight">
      <span className="label">Your booking page</span>
      <div className="card">
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
            <Share2 size={18} strokeWidth={2} /> Share
          </button>
        )}
        <div className="btnrow" style={{ marginTop: canShare ? 8 : 12 }}>
          <button className={`btn${canShare ? "" : " primary"}`} onClick={copy}>
            {copied
              ? <><Check size={18} strokeWidth={2} /> Copied</>
              : <><Copy size={18} strokeWidth={2} /> Copy</>}
          </button>
          <a className="btn" href={`/book/${slug}`} target="_blank" rel="noreferrer">
            <ExternalLink size={18} strokeWidth={2} /> Open
          </a>
        </div>
        <p className="quiet" style={{ marginTop: 10 }}>
          Put this in your bio, on your cards and in your texts. Customers book
          themselves from here.
        </p>
      </div>
    </div>
  );
}
