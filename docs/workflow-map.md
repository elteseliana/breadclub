# Current workflow map (as of 2026-09-24)

Built from Eliana's interview answers, WhatsApp screenshots and last week's settle-up chat.
Customer names are removed. **UNKNOWN** marks things still to confirm.

## The weekly loop today

| # | Step | Trigger | Who | Tool | Data entered | Where it goes wrong | Time (est.) |
|---|---|---|---|---|---|---|---|
| 1 | Announce the week | Start of week / holiday | Eliana | WhatsApp broadcast with menu + form link | Menu, prices, which bake days run this week | Schedule changes (e.g. Sukkot: Friday only) are retyped each time | 10 min |
| 2 | Take orders | Customer sends WhatsApp **or** fills the Google Form | Eliana or Shayna, whoever got it | WhatsApp on two phones + Google Form → Sheet | Name, flavors, qty, day, pickup/delivery | Orders split across two phones and two channels | a few min per order |
| 3 | Copy into the shared Doc | New WhatsApp order | Whoever received it | Google Doc, by hand | Same as above, retyped | Missed or duplicated orders; no one place with everything | 2–3 min per order |
| 4 | Cutoff (~2pm Sun / Wed) | Clock | Both | Judgment | — | Late orders: offer the next bake day, unless the loaf fills the empty slot in a half-used batch | — |
| 5 | Plan baking & shopping | After cutoff | Each baker | Head / paper | Batches (2 loaves, 1 kg flour, 110 g + 110 g starter), flavors pair up, spelt in pairs | Who bakes which loaf is sometimes unclear; max 6 loaves per bake per baker (bannetons), extra batches Thursday night | 15–30 min |
| 6 | Buy ingredients | Plan | Each baker / Shayna's mom | Pepper card, moms' money, Temu | Receipts | Costs sit in 3+ places and get tallied later from memory | — |
| 7 | Bake | Tue / Fri (Friday loaves often ready Thursday) | Default split: Eliana plain, pesto, olive, choc chip, seasonal, all spelt; Shayna garlic, rosemary garlic, cinnamon | — | — | Mixed orders need a handoff; location decided per order | — |
| 8 | "Ready" / delivery messages | Loaf ready | Baker | WhatsApp, typed by hand | — | Every message is typed by hand; back-and-forth about drop-off at the door | 1–5 min per order |
| 9 | Collect payment | At order (ideally) or after | Customer → Eliana's Bit, Eliana cash, **Shayna's mom's Bit**, or Eliana's mom | Bit, cash | Amount + name in note | Money lands in 4 places. Menu says "confirmed once payment is received" but some pay the week after | — |
| 10 | Payment reminder | ~2 days unpaid | Whoever notices | WhatsApp, by hand | Amount owed | Hard to know who paid; a Bit screenshot said "Pending" (a screenshot isn't proof of payment) | 5–15 min/week |
| 11 | Weekly settle-up | End of week | Both, late at night | WhatsApp chat + calculator + Claude | Money each person holds, what each mom spent, what each mom owes for her own bread | First attempt was wrong (1767 / 1183 confusion); took ~45 min; answer: each ₪749.20 | 45+ min |

## How last week's settle-up worked (the rule we reverse-engineered)
1. Add up the money each partner's side received: Eliana ₪1,023 (Bit + cash); Shayna's side ₪600 (via her mom's Bit). Total ₪1,623.
2. For each mom: what we owe her (money she fronted) minus what she owes us (her own bread). Eliana's mom: 329.60 − 210 = ₪119.60. Shayna's mom: 49 − 44 = ₪5.
3. Profit = 1,623 − 124.60 = ₪1,498.40. Each partner gets ₪749.20.
4. Each partner pays her own mom back, then one transfer evens things out (Eliana → Shayna ₪154.20).

**Needs checking:** are these the right rules every week? When a partner is away, the other gets 100% of that week's profit.

## Business rules confirmed so far
- Prices as in `interview-notes.md`. Spelt is +₪17 per batch of 2, only if the customer asks.
- Delivery ₪10 (menu and form wrongly say ₪5), free when the order total (everything, including spelt) is ≥ ₪100. Pickup is always free.
  (The menu message says "over 100"; the rule is "100 or more".)
- Bake days can be cancelled for a week (holidays), so the schedule changes week to week.
- A promised free loaf (e.g. "one rosemary garlic on us") is an order worth ₪0 and must not be forgotten. One nearly was last week.

## Unknowns
- **UNKNOWN:** Can I see the order Doc, the Form and the Sheet? The Google account I can reach is `theeltesfamily@gmail.com`,
  not `elteseliana@gmail.com`, and I didn't find the bread files there.
- **UNKNOWN:** Is payment really before baking, or is paying the week after normal for regulars?
- **UNKNOWN:** Which costs count (flour, flavor ingredients, bags, Temu supplies)? Is a partner's own time or starter ever counted?
- **UNKNOWN:** Is the seasonal flavor's price set once per month?

## Automation opportunities, ranked

| Rank | Idea | Fixes | Time saved | Errors prevented | Effort | Risk |
|---|---|---|---|---|---|---|
| 1 | **One order list.** Every order, whether from the form or WhatsApp, goes into one Google Sheet. The Sheet works out the total and delivery fee, sets the default baker for each loaf, and tracks the handoff, paid status and where the money went | Problems 1, 2, 4 | High | Lost/duplicate orders, wrong totals, "who paid?" | Medium | Low. Nothing is sent to customers |
| 2 | **Settle-up calculator** built on that list plus a cost log: prints who pays whom | Problem 5 | ~45 min/week | Math mistakes | Low–medium | Low |
| 3 | **Bake & shop sheet** per baker per day: loaves, batches, flour bags, starter grams, pairing loaves into batches | Problem 2 | 15–30 min | Missed loaves | Low | Low |
| 4 | **One-tap message drafts** ("ready", "running late", payment reminder) that open WhatsApp already filled in. You still press send | Problem 3 | 10–20 min | Typos, forgotten reminders | Low | Low. A human always sends |
| 5 | Automatic WhatsApp sending / reading Bit payments | 3, 4 | More | — | High | High. Needs a WhatsApp Business account and checks on what Bit actually allows. Later, only if you want it |

## Recommended first slice
**#1, the one order list**, plus **#4's one-tap "ready" and reminder drafts**, because every other fix
(settle-up, bake sheet) needs trustworthy order records first. Your current form and Doc keep working until you choose to switch.
