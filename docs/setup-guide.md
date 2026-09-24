# Bread Club order list: setup and daily use

## Step 1: try it on a TEST copy first (about 15 minutes)
Your real Sheet and form stay untouched until you decide to switch.

1. **Make a test form.** In Google Forms, open your order form → ⋮ → **Make a copy**. Name it "Bread Club TEST".
2. **Edit the test form** (these are the changes you approved):
   - Delete the **Flavor of the season** row from the flavor grid.
   - Add a new grid question titled **`Spelt — how many of each?`**, with the same flavor rows as the main grid
     (only if you want spelt on the form. It's okay to leave spelt as something you add yourself: see "Spelt" below).
   - Change the day choices to exactly: **`Tuesday (order by Sunday 2pm)`** and **`Friday (order by Wednesday 2pm)`**.
   - Keep the delivery choice text starting with **Delivery** (e.g. `Delivery (+5₪, free from 100₪)`) and pickup starting with **Pickup**.
3. **Link the test form to a new Sheet:** Responses tab → **Link to Sheets** → *Create a new spreadsheet*.
4. **Add the script:** in that new Sheet, **Extensions → Apps Script**. Delete what's there, paste the whole of
   `apps-script/Code.js` from this project, and save. Then open ⚙ Project Settings and make sure the time zone is
   **Jerusalem**.
5. Reload the Sheet. A **Bread Club** menu appears. Click **Bread Club → Set up (first time only)** and allow access.
   Google shows a warning because you wrote the script yourself. Click *Advanced → Go to project* to continue.
6. **Test it with fake customers only** (e.g. "Test One", phone 050-000-0001):
   - an ordinary order → it appears once, with the right **Total ₪** and **Bake date**
   - the same order sent twice → the second says **Possible duplicate**
   - a mixed order (plain + garlic) → **Needs attention: choose Handoff at**
   - tick **Paid?** → Needs attention until you pick **Money went to**
   - check the **Bake Plan** tab
   - close and reopen the Sheet → everything is still there
   - tap **Ready ▶** on your phone → WhatsApp opens with the message typed. **Don't send it** to a real customer.

## Step 2: switch the real Sheet (only when you decide)
Same steps 4–5 on the real Sheet, plus the form edits from step 2 on the real form.
Then delete the old **Order total (₪)** column, because it uses the wrong ₪10 delivery fee. The new **Total ₪** column replaces it.
To undo, delete the script (Extensions → Apps Script) and the added columns. Your form answers are never changed.

## Daily use
| Column | Who fills it | What it's for |
|---|---|---|
| **Paid?** | you | Tick only after you see the money in Bit or get cash. Never because someone says "sent". |
| **Money went to** | you | Bit 054-911-2175 / Eliana cash / Shayna cash / Shayna's mom Bit / Other. This feeds the settle-up later. |
| **Handoff at** | you | For mixed orders: whose house the loaves meet at. The customer picks up there, or that person delivers. |
| **Baked by (change)** | you | Empty = usual split. `Shayna` = whole order. `garlic=Eliana` = one flavor. |
| **Adjustment ₪** | you | `-44` for a free rosemary garlic, `+5` for something extra. |
| **Late/holiday decision** | you | For late orders or a day with no baking: **Accept** or **Move to next bake day**. |
| **Bake date (change)** | you | Type a date like `2026-10-02` to put an order on a specific day (also for orders you type in by hand). |
| **Cancelled?** | you | The order stays in the list but isn't counted. |
| **Not a duplicate** | you | Tick when the same person really did order the same thing twice. |
| Bake date, Who bakes, Total ₪, Status, Needs attention, Ready msg, Reminder msg | **automatic** | Don't type here. They're rewritten every time something changes. |

- **Status** is one of: Unpaid · Unpaid N days: send reminder · Paid · Needs attention · Possible duplicate · Cancelled.
- **Ready ▶ / Remind ▶** open WhatsApp with the message typed. Nothing is sent until you press send.
- **Bake Plan** tab shows the next two bake days: loaves for each baker, batches, flour bags, starter, handoffs, deliveries and pickups.
- **Settings** tab holds prices, delivery fee, cutoff hour, Bit number, addresses, and **No baking on** dates
  (e.g. `2026-10-06` for a holiday). Only you and Shayna change these.
- **WhatsApp orders:** fill in the form for the customer (or add a row by hand and fill in **Bake date (change)**).
- **Spelt:** if the form has no spelt question, add spelt orders by hand. Spelt is always in pairs; Eliana bakes it.

## What stays manual
Sending any message · marking paid · accepting late orders · choosing handoff places · changing prices and bake days.
