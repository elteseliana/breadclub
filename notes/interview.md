# The Bread Club: interview notes

Business: **The Bread Club** (EST. 2025), sourdough bakery in Ra'anana. Instagram: @thebreadclub.il.
Run by two partners: **Eliana Eltes** and **Shayna Lightstone**. Both need to see and manage orders.

## Answers so far (Nov 5, 2026)

### Menu (from the Instagram menu post)
| Item | Price |
|---|---|
| Plain sourdough ("The Original") | ₪35 |
| Garlic | ₪42 |
| Rosemary garlic | ₪44 |
| Cinnamon sugar | ₪42 |
| Olive | ₪44 |
| Chocolate chip | ₪44 |
| Pesto | ₪50 |
| Flavor of the season | "ask us" |
| Delivery (Tue & Fri) | +₪5 |

### Schedule
- Two delivery days: **Tuesday** and **Friday**.
- Order cutoff: **Sunday** for Tuesday, **Wednesday** for Friday. (Exact time of day still unknown.)

### How customers order today
- A Google Form, sent each week privately and to group chats. It's also linked in the Instagram bio.
- Responses go to a Google Sheet.
- Instagram DMs and WhatsApp for questions.

### Payment
- Customers pay by Bit or cash at the door. The menu says "Payment via Bit confirms your order."
- Eliana texts customers who haven't paid yet. **Pain point: this is inefficient.**

### Brand (from screenshots)
- High-contrast serif wordmark "The Bread Club" in warm brown, with "EST. 2025" in letterspaced caps.
- Letterspaced small-caps section labels ("THE ORIGINAL", "THE COLLECTION", "EXTRAS").
- Italic serif for taglines ("coming soon", "ordering opens saturday night").
- Palette: cream (menu card), beige/sand, pale blue-grey (logo circle), warm brown text, muted slate-blue accents.
- Food photos: rustic loaves in Dutch ovens, on parchment and cooling racks.
- Eliana wants the website to match this look so everything is professional and consistent.

## Second round of answers (Nov 5, 2026)
- Shayna is a business partner.
- **Pickup** is offered too. The pickup address is sent only after an order is placed (never shown on the site).
- **Delivery area:** Ra'anana, Herzliya and places close by. Will drive further for bigger orders.
- **Capacity:** 12–18 loaves per bake day.
- **Cutoff time:** 4pm.
- **Language:** both English and Hebrew.
- **Website sections wanted:** about us, photo gallery, Instagram, contact, and the usual things sourdough sites have.
- **Domain:** Eliana will decide later.

### Current Google Form (from screenshots)
1. Intro text: payment policy, menu, delivery (+₪5, free on ₪100+), pickup (address texted after ordering), deadlines.
2. Full name (required), phone (required).
3. "Order: how many of each?" grid with 8 rows (Plain, Garlic, Rosemary garlic, Cinnamon, Olive, Chocolate chip, Pesto & sundried tomato, Flavor of the season) and quantity columns 0–3.
4. Pickup or delivery (required). Payment: Bit 054-911-2175 with full name in the note, or cash at door (required).
5. Delivery address (required, delivery branch only).
6. Pickup / delivery day: "Tuesday (order by Sunday)" / "Friday (order by Tuesday)" (required). Notes or allergies (optional).

### Brand kit (uploaded zips + design direction PDF)
- `DESIGN-DIRECTION-prompt-for-Claude` and `WEBSITE-PROMPT-for-Claude-Code.md` give exact tokens, type, layout, components, voice and "do not" rules. Follow them.
- Logos (transparent PNGs), stickers, fonts (Bodoni Moda, Cormorant), 5 loaf photos, Instagram menus and posts, docs (handoff, form brief, tracker page, customer messages).
- Missing from the zips: `backgrounds/` and `instagram/bread-on-brand-backgrounds/`. The brand README says the diagonal watercolor checks were not made by them, so their source must be checked before use.

## Discrepancies to confirm
- Friday cutoff: the form option says "order by **Tuesday**", but the form intro, menu, weekly message and Eliana all say **Wednesday**.
- Capacity: is 18 a hard cap per day? Should the site show "sold out" for that day once it's reached?
- Shayna's number: 058-678-6600 vs 058-678-6900 (flagged in the website prompt).
- Names: "Pesto" vs "Pesto & sundried tomato", and "Cinnamon sugar" vs "Cinnamon".
- Max quantity per flavor: 3 on the live form, "5+" in the form brief.
- Flavor of the season has no fixed price, so how is the order total shown?

## Still unknown
- Holidays / weeks off: how ordering is paused.
- Exact delivery boundary and the minimum order for "further away".
- Domain name / hosting.
