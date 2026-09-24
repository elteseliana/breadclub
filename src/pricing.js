// Order totals. Delivery is free when everything in the order (spelt extra included) is ₪100 or more.

export function countLoaves(items) {
  let white = 0;
  let spelt = 0;
  for (const qty of Object.values(items)) {
    white += qty.white;
    spelt += qty.spelt;
  }
  return { white, spelt, total: white + spelt };
}

export function priceOrder(order, settings) {
  const problems = [];
  let loavesSubtotal = 0;
  for (const flavor of settings.flavors) {
    const qty = order.items[flavor.key];
    loavesSubtotal += (qty.white + qty.spelt) * flavor.price;
  }
  const loaves = countLoaves(order.items);
  if (loaves.spelt % 2 === 1) problems.push('Spelt comes in pairs: odd number of spelt loaves');
  if (loaves.total === 0 && order.staff.adjustment === 0) problems.push('No loaves ordered');
  const speltExtra = Math.ceil(loaves.spelt / 2) * settings.speltExtraPerPair;
  const subtotal = loavesSubtotal + speltExtra;
  const deliveryFee = order.method === 'delivery' && subtotal < settings.freeDeliveryFrom ? settings.deliveryFee : 0;
  if (order.method === 'delivery' && !order.address) problems.push('Delivery with no address');
  const total = subtotal + deliveryFee + order.staff.adjustment;
  if (total < 0) problems.push('Total is below ₪0: check Adjustment ₪');
  return { loavesSubtotal, speltExtra, subtotal, deliveryFee, total, loaves, problems };
}
