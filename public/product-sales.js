// Client-side rendering for Sunday–Saturday product-sales weeks.

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Full-range label, e.g. "Sun 28 Nov – Sat 4 Dec".
export function weekLabel(weekStart) {
  const start = new Date(weekStart + 'T00:00:00Z');
  const end = new Date(start.getTime() + 6 * DAY_MS);
  return `Sun ${start.getUTCDate()} ${MONTHS_SHORT[start.getUTCMonth()]} – Sat ${end.getUTCDate()} ${MONTHS_SHORT[end.getUTCMonth()]}`;
}

// Returns the Sunday–Saturday weekly buckets with guaranteed labels.
export function renderProductSales(payload) {
  const weeks = (payload && payload.weeks) || [];
  return weeks.map((w) => ({
    week_start: w.week_start,
    week_end: w.week_end,
    label: w.label || weekLabel(w.week_start),
    units: w.units,
    revenue: w.revenue,
    orders: w.orders,
    rows: w.rows,
  }));
}

// Size presentation rule: a size label is returned only when the API kept it
// (i.e. it came from source-provided size metadata). Otherwise null — renderers
// must show nothing, not "N/A" noise. Dimensions inside product names (e.g.
// "60CM") are labels, never size metadata. Availability is communicated once
// via payload.size_status.
export function sizeLabel(stockCode, payload) {
  const sizes = (payload && payload.sizes) || {};
  return sizes[stockCode] || null;
}

// One-line availability note for sizes, or null when sizes are in use.
export function sizeStatusNote(payload) {
  return (payload && payload.size_status) || null;
}
