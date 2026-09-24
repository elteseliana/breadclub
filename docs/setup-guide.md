# Bread Club order list: setup and daily use

## Step 1: try it on a TEST copy first (about 15 minutes)
Your real Sheet and form stay untouched until you decide to switch. Do all of this signed in as
**elteseliana@gmail.com**, the account that owns the order Sheet.

1. **Make a test form.** In Google Forms, open your order form → ⋮ → **Make a copy**. Name it "Bread Club TEST".
2. **Edit the test form** (these are the changes you approved):
   - Delete the **Flavor of the season** row from the flavor grid.
   - Change the day choices to exactly: **`Tuesday (order by Sunday 2pm)`** and **`Friday (order by Wednesday 2pm)`**.
   - Keep the delivery choice starting with **Delivery** (e.g. `Delivery (+5₪, free from 100₪)`) and pickup starting with **Pickup**.
   - Add a grid question titled exactly **`Spelt — how many of each?`** with the same flavor rows as the main grid
     (you can say in its description "only if we agreed on spelt"). This is how spelt gets priced (+₪17 per pair).
   - **Privacy check:** open Settings → Responses and make sure **"See summary charts and text responses"** is OFF.
     If it's on, every customer can see everyone's names, phones and addresses.
3. **Link the test form to a new Sheet:** Responses tab → **Link to Sheets** → *Create a new spreadsheet*.
4. **Add the script:** in that new Sheet, **Extensions → Apps Script**. Paste the whole of `apps-script/Code.js`
   from this project over what's there, and save. Then open ⚙ Project Settings and set the time zone to **Jerusalem**.
5. Reload the Sheet. A **Bread Club** menu appears. Click **Bread Club → Set up (first time only)**.
   Google will warn "Google hasn't verified this app". That's normal for a script you added yourself:
   click **Advanced → Go to (project name) (unsafe) → Allow**. The script only works inside this Sheet.
6. **Test it with fake customers only** (e.g. "Test One", phone 050-000-0001):
   - an ordinary order → it appears once, with the right **Total ₪** and **Bake date**
   - the same order sent twice → the second says **Possible duplicate of row …**
   - a mixed order (plain + garlic) → **Needs attention: choose Handoff at**
   - tick **Paid?** → Needs attention until you pick **Money went to**
   - an order more than 2 days old and unpaid → Status turns **red**
   - check the **Bake Plan** tab
   - close and reopen the Sheet → everything is still there
   - tap **Ready ▶** on your phone → WhatsApp opens with the message typed. **Don't send it** to a real customer.

## Step 2: switch the real Sheet (only when you decide)
1. **Back up the old script first:** in the real Sheet, Extensions → Apps Script, select everything, copy it into a
   Google Doc named "Old Bread Club script". (This is what updates your old "Bake Day Summary" tab.)
2. Do steps 2 (form edits, on the real form), 4 and 5 on the real Sheet.
3. Setup sets **Track orders baked from** in Settings to today. Orders for bakes that already happened show
   **Before tracking**, get no reminders, and aren't counted, so nobody who already paid gets a reminder.
   Orders for the coming Tuesday/Friday are tracked as normal. Tick **Paid?** on the ones already paid.
   Nothing in the old rows is changed.
   One-time cleanup: an old row where someone typed a bake date by hand shows **Needs attention** ("has already
   passed") until you tick **Paid?** or **Cancelled?** on it. This is on purpose, so a mistyped date is never hidden.
4. Delete the old **Order total (₪)** column, because it uses the wrong ₪10 delivery fee. The new **Total ₪** replaces it.
   Delete the old **Bake Day Summary** tab too, because it adds up every week together. The new **Bake Plan** replaces it.

**To undo:** paste the old script back from your Doc and delete the added columns and tabs. Your form answers are never changed.

## Daily use
The most useful columns are **Status, Needs attention, Ready msg, Reminder msg**. The name column stays frozen on
the left, so on a phone scroll right until you reach them. The **Bake Plan** tab is the quickest view for baking day.

| Column | Who fills it | What it's for |
|---|---|---|
| **Paid?** | you | Tick only after you see the money in Bit or get cash. Never because someone says "sent". |
| **Money went to** | you | Bit (054-911-2175) / Eliana cash / Shayna cash / Shayna's mom Bit / Other. This feeds the settle-up later. |
| **Handoff at** | you | For mixed orders: whose house the loaves meet at. The customer picks up there, or that person delivers. |
| **Baked by (change)** | you | Leave empty for the usual split. `Shayna` = she bakes the whole order. `garlic=Eliana` = only the garlic moves (use **=**, not :). |
| **Adjustment ₪** | you | `-44` for a free rosemary garlic (a fully free order is delivered free too), `5` for something extra. |
| **Late/holiday decision** | you | For late orders or a no-baking day: **Accept** or **Move to next bake day** (always a later day). |
| **Bake date (change)** | you | Type the date as year-month-day, e.g. `2026-10-02`, to put an order on a specific day. |
| **Cancelled?** | you | The order stays in the list but isn't counted. |
| **Not a duplicate** | you | Tick when the same person really did order the same thing twice. |
| **Order taken by** | you | Eliana or Shayna, for orders you took on WhatsApp. |
| Status, Needs attention, Ready msg, Reminder msg, Bake date, Who bakes, Total ₪ | **automatic** | Don't type here. They're rewritten every time something changes. |

**Status** is one of:
- **Unpaid**
- **Unpaid N days: send reminder** (red)
- **Paid**
- **Free** (₪0, e.g. a gift)
- **Needs attention** (amber; read the next column)
- **Possible duplicate of row N** (amber)
- **Cancelled**
- **Before tracking**

**Needs attention.** Some problems hold an order back. It isn't counted on the Bake Plan and has no message buttons
until you fix it:
- a late order, or an order for a no-baking day
- a quantity the Sheet can't read
- a single spelt loaf
- a missing bake day
Other problems still count the order for baking but hide the message buttons until fixed, so a customer never gets a
wrong message:
- no handoff place chosen
- Paid? ticked with no "Money went to"
- a phone number that can't be read

**Ready ▶ / Remind ▶** open WhatsApp with the message typed. Nothing is sent until you press send.
Free orders never ask for money.

The **Bake Plan** tab shows the next two bake days, plus any other day that has orders. For each baker it lists loaves,
batches, flour bags and starter, then the handoffs, deliveries and pickups. The top lines list any orders that are waiting on you.

The **Settings** tab holds:
- prices, the delivery fee and the cutoff hour
- the Bit number and your addresses
- **No baking on** dates (e.g. `2026-10-06` for a holiday)
- **Track orders baked from**

Only you and Shayna change these. If something you type there can't be read, a ⚠ line appears at the top of the Bake Plan.

**WhatsApp orders:** fill in the form for the customer so the order gets a time. That's what makes the late check
and the unpaid reminder work. If you add a row by hand instead, fill in **Bake date (change)**.

**Spelt:** always in pairs; Eliana bakes it. For a spelt order that came by WhatsApp, fill in the form for the
customer and put the loaves in the **Spelt** grid. A single spelt loaf is held with "Spelt comes in pairs" until fixed.

## What stays manual
Sending any message · marking paid · accepting late orders · choosing handoff places · changing prices and bake days.
