/**
 * Formats a numeric value into Indian Rupees (INR) with standard comma grouping.
 * e.g., 69999 -> ₹69,999 or 159990.5 -> ₹1,59,990.50
 */
export function formatINR(amount, options = {}) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₹0';
  }

  const { maximumFractionDigits = 0, minimumFractionDigits = 0 } = options;

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits,
    minimumFractionDigits,
  }).format(amount);
}

/**
 * Calculates percentage discount between reference MRP and current price.
 */
export function calculateDiscountPct(mrp, currentPrice) {
  if (!mrp || mrp <= 0 || !currentPrice || currentPrice >= mrp) {
    return 0;
  }
  return Math.round(((mrp - currentPrice) / mrp) * 100);
}
