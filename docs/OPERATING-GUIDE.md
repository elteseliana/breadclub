# Running The Bread Club orders: a short guide for Eliana and Shayna

## Where orders are
Every website order is one row in the **Website orders** tab of your Google Sheet. That tab is the one order list. The website never keeps its own copy.

| Column | What it means |
|---|---|
| Order # | Starts at 1001. The customer sees the same number. |
| Delivery date / Day | The bake day they chose. |
| Pickup / delivery, Address | Address only for delivery. |
| Pays by | What they *said* they'll use: **Bit** or **Cash at door**. It doesn't mean they've paid. |
| One column per loaf | How many of each. |
| Loaves, Subtotal, Delivery, Total | Calculated by the sheet from the loaf columns (+5 ₪ delivery under 100 ₪). Change a quantity and these update themselves. |
| **Paid** | Tick it **yourself** once you see the Bit payment or get the cash. Nothing ticks it automatically. |
| **Status** | `new` → `delivered` when it's done, or `canceled`. |
| Payment reminder | Bit orders only. Tap it to open WhatsApp with a ready-made reminder using the current total. You still press send. It disappears once Paid is ticked. |

Unpaid **Bit** orders are highlighted. Cash orders are not flagged; tick Paid when you collect the cash if you like. Canceled rows turn grey.

## Every day
- **Bake summary** tab: how many of each loaf to bake for each day, plus how many Bit orders are still unpaid and how much money is outstanding.
- Customers write their full name in the Bit note. Match it to the row and tick **Paid**.
- Need to remind someone? Tap **Send reminder** in their row.

## Changes and cancellations
- To cancel: set **Status** to `canceled`. Those loaves go back on sale right away.
- To change an order: edit the loaf quantities in the row. Loaves, Total and the reminder update by themselves, and the day's count on the website follows.
- Phone or WhatsApp orders can be typed into the sheet by hand. Fill in Delivery date (like `2026-11-10`), the loaf quantities, Pays by and Status `new`. Then copy the Loaves, Subtotal, Delivery and Total cells from the row above (select them, Ctrl/Cmd+C, select the same cells in your row, Ctrl/Cmd+V) so the totals and the Bake summary include it.

## The 18-loaf limit and closed days (Settings tab)
- **Loaves per bake day** (cell B2): the website stops taking orders for a day once this many loaves are booked. Customers then see "fully booked" and a button to WhatsApp you.
- **Closed days**: type a date in column A from row 6 down (for holidays or weeks away). That day disappears from the order page.

## Rules the website follows
- After launch, the website is the only way to order (the Google Form is retired).
- Bake days: Tuesday and Friday.
- Ordering closes **4pm Sunday** for Tuesday and **4pm Wednesday** for Friday (Israel time).
- The order page shows the next two open bake days.
- Delivery +5 ₪, free when the loaves come to 100 ₪ or more.
- There is no limit on orders per phone number. If you ever see fake orders, set their Status to `canceled`: the loaves go straight back on sale.
- Anything a customer types (name, address, notes) is stored as plain text, never as a formula.
- The pickup address is never on the website. Customers are told you'll send it on WhatsApp.

## Changing prices or the menu
Prices and loaf names live in one place: `site/assets/js/logic.js`. Ask Claude to change them. Both the website and the sheet script are updated from that file, and the tests check the new prices.

## If something goes wrong
- If a customer says the site showed "we couldn't confirm your order", check the sheet. If the order is there, it went through. If they tapped "Place order" again on the same page, it still appears only once.
- If the order page can't reach Google, it says so and offers WhatsApp.
- Before retiring the Google Form, make sure the website is connected (see SETUP-google-sheet.md, step 4). Until then the order page sends people to the Form.
