# First slice: one order list. Draft for Eliana's approval

Status: **waiting for Eliana's approval.** Nothing is built yet.

## Decisions so far (2026-09-24)
- First slice: one order list, plus one-tap "ready" and payment-reminder drafts.
- **Automatic:** form orders go into the list; each loaf gets its default baker; late orders are flagged;
  orders unpaid after 2 days are flagged and get a reminder draft.
- **Always manual:** sending any WhatsApp; marking an order paid; accepting a late order.
- Prices and bake days live in a Settings tab that only Eliana and Shayna edit. Nothing changes them automatically.
- **Seasonal flavor removed** from the menu.
- Eliana shared "The Bread Club — Orders" Sheet read-only.
- WhatsApp Business account: **not doing it** (Eliana, 2026-09-24).
- **Delivery fee is ₪10** (free when the order is ₪100 or more). The Sheet was right; the menu message and the
  form's "+5₪" text are wrong and will be corrected (customer-facing wording, so Eliana approves it).
- **Customers pay Bit to 054-911-2175** (Eliana's mom's Bit). The settle-up counts that money as held by Eliana's side.

## What it will be
**Update:** Eliana shared the real Sheet (see `current-sheet-review.md`). The plan is to **upgrade that Sheet and its form**,
not start a new one. Every change is built and tested first on a copy with fake customers.

A Google Sheet that you both already know how to use, fed by a Google Form. Small scripts inside the Sheet
(Google Apps Script) do the math and the flags. The math is also kept as plain code with automated tests.
Customers keep ordering by WhatsApp or the form. WhatsApp orders are typed into the same form by
whoever got them, so everything ends up in one list.

## Acceptance criteria (how we'll know it works)
Every check uses fake test customers in a separate test copy of the Sheet.

1. **One list.** A form order shows up in the Orders tab once, within about a minute. A WhatsApp order that you enter
   shows up in the same list, marked with who took it.
2. **Right totals.** Examples the tests must get right:
   - 1 plain, pickup → ₪35
   - 2 garlic, delivery → ₪84 + ₪10 = ₪94
   - pesto + pesto, delivery → ₪100, delivery free
   - 2 plain, delivery → ₪70 + ₪10 = ₪80
   - spelt pair (plain + garlic), delivery → 35 + 42 + 17 = ₪94 + ₪10 = ₪104
   - spelt pair (pesto + olive), delivery → 50 + 44 + 17 = ₪111, delivery free
   - a promised free loaf → ₪0, still on the bake list
   - spelt ordered as one loaf → rejected with a clear message ("spelt comes in pairs")
3. **No duplicates.** Sending the same order twice gets flagged "possible duplicate" and is not counted twice.
   Nothing gets deleted.
4. **Who bakes what.** Each loaf shows its default baker (garlic, rosemary garlic, cinnamon → Shayna; the rest and
   all spelt → Eliana). You can change it. A mixed order has a "handoff at" field (Achi Dakar 62 / Hakdoshim 4),
   which you choose.
5. **Cutoff.** An order after 2pm Sunday (for Tuesday) or 2pm Wednesday (for Friday) is marked **late**.
   It isn't accepted or refused on its own; you decide. A bake day switched off in Settings (e.g. a holiday week)
   can't be chosen.
6. **Paid.** Only a person can mark an order paid, and they have to pick where the money went: Bit 054-911-2175 (Eliana's mom) /
   Eliana cash / Shayna cash / Shayna's mom's Bit / other. An order still unpaid 2 days after it was placed turns red.
7. **Message drafts.** Every order has a "Ready" button and, when unpaid, a "Reminder" button. Each opens
   WhatsApp to that customer with the message already typed. Nothing sends until you press send.
8. **Bake-day view.** For each bake day and each baker: the list of loaves, number of batches, flour bags and starter
   grams. Spelt always counts in pairs.
9. **One week at a time.** Every order is tied to a bake date (e.g. Fri 2 Oct), so the bake list shows only that
   week and never adds in earlier weeks. Day choices use one fixed wording.
10. **Survives reloads.** Close and reopen the Sheet and every order and status is still there.
11. **Your old setup keeps working.** Your current form and Doc stay as they are until you choose to switch.

## Wording to approve (drafts)
- Ready (pickup): "Hi {name}! Your sourdough is ready for pickup at {address} 🍞 Total ₪{total}{unpaid note}"
- Ready (delivery): "Hi {name}! Your sourdough is on its way 🍞 Total ₪{total}{unpaid note}"
- Reminder: "Hi {name}! Just a reminder that your total is ₪{total}. You can Bit {number} or pay cash. Thank you!"

## Still needed from Eliana
- Do Friday orders close Tuesday or Wednesday? (The form says Tuesday.)
- Optional: the code of the current script (Sheet → Extensions → Apps Script → copy everything).
- Approve or edit the criteria and wording above.
