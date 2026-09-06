# Findings

The catalogue. `docs/testing/LOOP.md` is the protocol that fills it.

**Appended, never rewritten.** A finding that turns out not to be a defect is
marked `not-a-defect` with the reasoning and kept — the reasoning is the
valuable part, and the next lap should not rediscover it.

**Numbering is continuous** (`F-001` onwards) across every pass and every
session, so a finding can be cited from a commit message years later.

---

## Status key

| | |
|---|---|
| `blocks-launch` | a detailer or their customer gets stuck, or loses something |
| `embarrassing` | it works and makes us look unfinished |
| `cosmetic` | only we would notice |
| `risk` | not broken today; breaks under a condition that will arrive |
| `trap` | correct, and will be misread by a person |
| `needs-owner` | parked: needs a key, a credential, or his taste |
| `not-a-defect` | investigated, kept for the reasoning |

---

## NEEDS THE OWNER

The running list, so it never has to be reassembled from passes. Anything
parked goes here as well as in its pass.

*(Carried in from `docs/CHECKPOINT.md` at the loop's start — these predate
pass 001.)*

| | What is needed | Unblocks |
|---|---|---|
| **P-01** | `LEGACY_SUPABASE_URL` + `LEGACY_SERVICE_KEY` in `.env` | Roadmap 5.1, the migration of his real business |
| **P-02** | Cloudflare R2: account id, bucket, key id, secret | Job photos get 100 MB each instead of 10 |
| **P-03** | `RESEND_API_KEY` for Supabase SMTP, or he sets it himself | **Password reset probably does not reach any real customer today** |
| **P-04** | Stripe Connect switched on | Roadmap 2.20 stage 3, taking money |
| **P-05** | Two GitHub secrets | Nightly backups start running |
| **P-06** | Two or three detailer sites whose look he likes | Roadmap 6.1 and 2.25's screen |
| **P-07** | A Sentry DSN | Roadmap 7.2 |
| **P-08** | Does he want individual customer names and numbers on the back office? | The disclosure already covers it; the screen deliberately stops at counts |

---

## Passes

*(none yet — the loop has not run)*
