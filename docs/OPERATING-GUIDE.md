# Running The Bread Club orders: a short guide for Eliana and Shayna

## Where orders are
Every website order is one row in the **Website orders** tab of your Google Sheet. That tab is the one order list. The website never keeps its own copy.

| Column | What it means |
|---|---|
| Order # | Starts at 1001. The customer sees the same number. |
| Delivery date / Day | The bake day they chose. |
| Pickup / delivery, Address | Address only for delivery. |
| Pays by | What they *said* they'll use: Bit or Cash. It doesn't mean they've paid. |
| One column per loaf | How many of each. |
| Total ₪ | Worked out by the system: prices from the menu, +5 ₪ delivery under 100 ₪. |
| **Paid** | Tick it **yourself** once you see the Bit payment or get the cash. Nothing ticks it automatically. |
| **Status** | `new` → `delivered` when it's done, or `canceled`. |
| Payment reminder | Tap it to open WhatsApp with a ready-made reminder to that customer. You still press send. |

Rows that aren't paid yet are highlighted. Canceled rows turn grey.

## Every day
- **Bake summary** tab: how many of each loaf to bake for each day, plus how many orders are still unpaid and how much money is outstanding.
- Customers write their full name in the Bit note. Match it to the row and tick **Paid**.
- Need to remind someone? Tap **Send reminder** in their row.

## Changes and cancellations
- To cancel: set **Status** to `canceled`. Those loaves go back on sale right away.
- To change an order: just edit the row (quantities, Total). The website uses the **Loaves** column to count how full the day is, so update that too.
- Phone or WhatsApp orders can be typed into the sheet by hand. Fill in at least Delivery date (like `2026-11-10`), Loaves and Status, so the day's count stays right.

## The 18-loaf limit and closed days (Settings tab)
- **Loaves per bake day** (cell B2): the website stops taking orders for a day once this many loaves are booked. Customers then see "fully booked" and a button to WhatsApp you.
- **Closed days**: type a date in column A from row 6 down (for holidays or weeks away). That day disappears from the order page.

## Rules the website follows
- Bake days: Tuesday and Friday.
- Ordering closes **4pm Sunday** for Tuesday and **4pm Wednesday** for Friday (Israel time).
- The order page shows the next two open bake days.
- Delivery +5 ₪, free when the loaves come to 100 ₪ or more.
- The pickup address is never on the website. Customers are told you'll send it on WhatsApp.

## Changing prices or the menu
Prices and loaf names live in one place: `site/assets/js/logic.js`. Ask Claude to change them. Both the website and the sheet script are updated from that file, and the tests check the new prices.

## If something goes wrong
- If a customer says the site showed "we couldn't confirm your order", check the sheet. If the order is there, it went through. If they tapped "try again", it still appears only once.
- If the order page can't reach Google, it says so and offers WhatsApp. Your current Google Form keeps working the whole time.
