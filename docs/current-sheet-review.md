# Review of the current "The Bread Club — Orders" Sheet (2026-09-24)

Read-only review of the real Sheet that Eliana shared. **No customer names, phones or addresses are copied here.**

## What's there
- A Google Form feeds one Orders tab. Columns: timestamp, name, phone, a quantity for each flavor (still includes
  "Flavor of the season"), pickup/delivery, address, day, notes, payment method, a **Paid?** checkbox, and **Order total (₪)**.
- A "Bake Day Summary" tab, updated by an existing script (menu: *Bread Club > Refresh Summary Now*),
  that counts loaves per flavor for Tuesday and Friday.
- ~25 real orders from 6 Sep to 23 Sep. One order was typed in by hand (no timestamp).

## Problems found (these are what the first slice has to fix)
| # | Finding | Evidence (anonymised) | Effect |
|---|---|---|---|
| 1 | **Menu and form say delivery is +₪5, but it's ₪10** (Eliana confirmed ₪10). | Sheet totals use ₪10; the form option and WhatsApp menu say "+5₪" | Customers see the wrong fee; last week one customer paid ₪5 less |
| 2 | **Spelt surcharge is not added.** | 4 spelt plain + delivery shows 140; the customer actually paid 175 | Totals don't match what you really charge |
| 3 | **Seasonal flavor counts as ₪0.** | Orders with a seasonal loaf are short by that loaf's price | Undercharging; being removed anyway |
| 4 | **No week or bake date.** The summary adds up every Tuesday since the start. | Tuesday summary = 13 loaves across two different weeks | The bake list is wrong for any single week |
| 5 | **Day answer text changed over time** ("Tuesday", "Tuesday ( order by Sunday)", "Friday ( order byTuesday)") | Mixed values in one column | Summaries and filters can miss orders |
| 6 | **The form says Friday orders close Tuesday**, but you told me Wednesday. | "Friday ( order byTuesday)" | Customers get a different cutoff from the real one |
| 7 | **The Bit number in the form changed** (your mom's → Shayna's mom's → your mom's), and you now have your own Bit. | Payment column | Money goes to different people; harder to settle up |
| 8 | **Paid? isn't kept up to date.** Most rows say FALSE, but last week's settle-up shows many of those orders were paid. | Paid column vs. settle-up chat | You can't tell who owes money from the Sheet |
| 9 | **No baker, handoff spot, or "money went to" column.** | — | Who bakes what and who holds the money live only in chat |
| 10 | **Weak duplicate detection.** The same customer appears with two different phone spellings. | Phone typo on a repeat customer | Matching only by phone would miss duplicates |
| 11 | **Orders placed outside the form don't match the form's total.** | One cash order shows ₪10 (0 loaves + delivery) but was paid ₪50 | Orders from WhatsApp aren't recorded properly |
