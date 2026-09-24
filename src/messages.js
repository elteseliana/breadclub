// One-tap WhatsApp drafts. A link only opens WhatsApp with the text filled in;
// nothing is sent until Eliana or Shayna presses send.

// Israeli numbers: 05X-XXX-XXXX -> 9725XXXXXXXX. Anything else returns null (no link, flagged).
export function whatsappNumber(phone) {
  const digits = String(phone ?? '').replace(/\D/g, '');
  if (/^9725\d{8}$/.test(digits)) return digits;
  if (/^05\d{8}$/.test(digits)) return `972${digits.slice(1)}`;
  return null;
}

export function firstName(name) {
  const first = String(name ?? '').trim().split(/\s+/)[0];
  return first ? first[0].toUpperCase() + first.slice(1) : 'there';
}

function payHow(settings) {
  return `You can Bit ${settings.bitNumber} (please write your name in the note) or pay cash.`;
}

export function readyMessage({ name, method, pickupAddress, total, paid }, settings) {
  const where = method === 'delivery'
    ? 'Your sourdough is on its way 🍞'
    : `Your sourdough is ready for pickup at ${pickupAddress} 🍞`;
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
