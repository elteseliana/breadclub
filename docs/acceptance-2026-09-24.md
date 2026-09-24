# Acceptance receipt: first slice (one order list)

**Revision:** `952c0dc` on `claude/sourdough-bakery-ops-1fah0q` · **Date:** 2026-09-24
**Environment:** in-memory fake Google Sheet (test/fakes.js) and the built `apps-script/Code.js` run in a sandbox.
Synthetic customers only. No real message, payment or Google account was touched.

## Release gate status
| Gate | Status |
|---|---|
| 1. Eliana approved the workflow and criteria | ✅ 2026-09-24 (`first-slice.md`) |
| 2. Checks and coverage | ✅ lint clean · 125/125 tests · 100% statements/branches/functions/lines · build matches source |
| 3. Business, UI/UX and code-quality reviewers each PASS on the same revision | ✅ all three PASS on `952c0dc` (after 3 rounds of fixes) |
| 4. Synthetic order end to end in a real, isolated Google test copy; found after reload; duplicate and failure visible | ✅ mostly, on a real Google Sheet (see below). ⏳ Still to do: a real **form** submission |
| 5. Eliana approves going live (real Sheet/form) | ⏳ not yet |

## What reviewers found and what was fixed
- **Round 1 (3 × FAIL):**
  - an accepted holiday order or a typed off-day date fell off the Bake Plan
  - flagged orders (single spelt, garbled quantity, no pickup/delivery answer) were still baked and messaged
  - a draft could have a blank pickup address
  - no red for unpaid
  - no "Order taken by"
  - false reminders to old orders at switch-over
  - message wording drifted from the approved text
  - free orders asked for money
  - setup would fail on a form tab with no spare columns
  - same-name different people were merged as duplicates
  - Settings dates stored as dates were not read
  - **three real customer phone numbers had been copied into tests** (replaced in the current tree; still in the history of `dfdc097`, pending Eliana's decision)
- **Round 2:**
  - link columns set to plain text would break the buttons
  - a past typed bake date was unflagged
  - orders placed just before switch-over were ignored
  - phone layout and column widths
- **Round 3:** a mistyped bake date could hide as "Before tracking".

## Representative synthetic orders checked (examples)
| Order | Result |
|---|---|
| 2 garlic, delivery | ₪89, Shayna |
| 2 plain, delivery | ₪75 |
| pesto ×2, delivery | ₪100, free delivery |
| spelt plain + garlic, delivery | ₪99 |
| spelt pesto + olive, delivery | ₪111, free delivery |
| free rosemary garlic | ₪0 "Free", no reminder |
| double submit | "Possible duplicate of row N", counted once |
| late Tuesday order | held until Accept / Move (moves to Fri) |
| mixed plain + garlic | baked, no message until a handoff place is chosen |
| paid without "Money went to" | Needs attention |
| unpaid 2+ days | red, "send reminder" |

## Not verified yet (needs the real Google test copy)
- Adding columns to a form-linked tab
- Triggers firing on form submit and edit, and the lock inside the simple edit trigger
- Ready ▶ / Remind ▶ showing as working links, and tapping them on a phone
- How colours and widths look in the Sheets phone app
- How the Sheet's locale reads typed dates
- The form's summary-privacy setting
- Authorization screens

## Answered by Eliana (2026-09-24, after the reviews)
1. Delivered free loaf: **no delivery fee**. Changed in `src/pricing.js` with two tests; lint, 127 tests and 100% coverage re-run clean.
2. Order at exactly 2:00pm: **late** (already the behavior).
3. Real phone numbers in the history of `dfdc097`: **leave as is**.

## Real Google Sheet test (2026-09-24)
Test Sheet "Bread Club TEST (fake orders only)" in the family Drive. It has 7 fake orders and **no linked form**.
Eliana installed `apps-script/Code.js` and ran Set up. Claude read the Sheet back through Drive.

| Check | Result |
|---|---|
| Setup adds the columns, Settings tab and Bake Plan on a full form-style tab | ✅ |
| Totals: ₪89, ₪77, ₪99 (spelt), ₪100 (free delivery), ₪35, ₪49 | ✅ |
| Unpaid 2 days → "send reminder" | ✅ |
| Duplicate → "Possible duplicate of row 2", not counted | ✅ |
| Mixed order → needs a handoff; after "Eliana's", handoff line on Bake Plan | ✅ |
| Late order → held; "Move to next bake day" → Tue 29 Sep | ✅ |
| Paid? + Money went to = Bit → "Paid", no Remind | ✅ |
| Adjustment -44 on a delivery → ₪0 "Free", no Remind | ✅ |
| Close and reopen → everything kept | ✅ |
| Ready ▶ on a phone opens WhatsApp with the text typed (not sent) | ✅ (Eliana) |
| Bake Plan (flour bags, starter, handoffs, deliveries, pickups) | ✅ |
| A customer submitting the Google Form | ⏳ not tested yet (no form linked) |
