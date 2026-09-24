// One-tap WhatsApp drafts. A link only opens WhatsApp with the text filled in;
// nothing is sent until Eliana or Shayna presses send.

// Israeli mobiles -> 9725XXXXXXXX. Accepts 05X-XXX-XXXX, +972 5X..., +972 05X..., and 5XXXXXXXX
// (Sheets drops the leading 0 when a phone is stored as a number). Anything else returns null (flagged).
export function whatsappNumber(phone) {
  const digits = String(phone ?? '').replace(/\D/g, '').replace(/^9720?(?=5)/, '').replace(/^0(?=5)/, '');
  return /^5\d{8}$/.test(digits) ? `972${digits}` : null;
}

export function firstName(name) {
  const first = String(name ?? '').trim().split(/\s+/)[0];
  return first ? first[0].toUpperCase() + first.slice(1) : 'there';
}

// Wording approved by Eliana (docs/first-slice.md).
function payHow(settings) {
  return `You can Bit ${settings.bitNumber} or pay cash.`;
}

export function readyMessage({ name, method, pickupAddress, total, paid }, settings) {
  const where = method === 'delivery'
    ? 'Your sourdough is on its way 🍞'
    : `Your sourdough is ready for pickup at ${pickupAddress} 🍞`;
  if (total <= 0) return `Hi ${firstName(name)}! ${where}`;
  const money = paid ? `Total ₪${total}, paid. Thank you!` : `Total ₪${total}. ${payHow(settings)}`;
  return `Hi ${firstName(name)}! ${where} ${money}`;
}

export function reminderMessage({ name, total }, settings) {
  return `Hi ${firstName(name)}! Just a reminder that your total is ₪${total}. ${payHow(settings)} Thank you!`;
}

export function whatsappLink(phone, text) {
  const number = whatsappNumber(phone);
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(text)}` : null;
}

// A Sheets formula showing a short label that opens the link.
export function linkFormula(url, label) {
  return `=HYPERLINK("${url}", "${label}")`; // encodeURIComponent leaves no " in url
}
