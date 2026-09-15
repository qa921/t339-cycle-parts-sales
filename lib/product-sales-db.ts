// Weekly product-sales utilities.
// Weeks run Sunday through Saturday (migrated from Monday-start).

export const WEEK_START = 'sunday' as const;
export const WEEK_END = 'saturday' as const;

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface SeedRow {
  source_row: number;
  InvoiceNo: string;
  StockCode: string;
  Description: string;
  Quantity: number;
  InvoiceDate: string; // "YYYY-MM-DD HH:mm:ss" (UTC)
  UnitPrice: number;
  CustomerID: string | null;
  Country: string;
  week_start_sunday: string; // derived from InvoiceDate in the preserved history
}

export interface AccountEntry {
  CustomerID: string;
  linked_source_rows: number[];
  notes: string[];
  notes_status: string;
}

export interface WeekBucket {
  week_start: string; // Sunday, ISO date
  week_end: string;   // Saturday, ISO date
  label: string;      // "Sun 28 Nov – Sat 4 Dec"
  units: number;
  revenue: number;
  orders: number;
  rows: number;
}

export function parseInvoiceDate(value: string): Date {
  return new Date(value.replace(' ', 'T') + 'Z');
}

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Sunday-start: getUTCDay() is 0 on Sunday, so subtracting it lands on the week's Sunday.
export function weekStartSunday(value: string | Date): string {
  const d = typeof value === 'string' ? parseInvoiceDate(value) : value;
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());
  return toISODate(start);
}

export function weekEndSaturday(weekStart: string): string {
  const start = new Date(weekStart + 'T00:00:00Z');
  return toISODate(new Date(start.getTime() + 6 * DAY_MS));
}

// Full-range label, e.g. "Sun 28 Nov – Sat 4 Dec".
export function weekLabel(weekStart: string): string {
  const start = new Date(weekStart + 'T00:00:00Z');
  const end = new Date(start.getTime() + 6 * DAY_MS);
  return `Sun ${start.getUTCDate()} ${MONTHS_SHORT[start.getUTCMonth()]} – Sat ${end.getUTCDate()} ${MONTHS_SHORT[end.getUTCMonth()]}`;
}

// Aggregate preserved history rows into Sunday–Saturday weekly buckets.
// Only existing source rows are aggregated; nothing is synthesized.
export function aggregateWeekly(rows: SeedRow[]): WeekBucket[] {
  const buckets = new Map<string, { units: number; revenue: number; invoices: Set<string>; rows: number }>();
  for (const row of rows) {
    const start = weekStartSunday(row.InvoiceDate);
    let b = buckets.get(start);
    if (!b) {
      b = { units: 0, revenue: 0, invoices: new Set<string>(), rows: 0 };
      buckets.set(start, b);
    }
    b.units += row.Quantity;
    b.revenue += row.Quantity * row.UnitPrice;
    b.invoices.add(row.InvoiceNo);
    b.rows += 1;
  }
  return [...buckets.entries()]
    .sort(([a], [z]) => (a < z ? -1 : 1))
    .map(([start, b]) => ({
      week_start: start,
      week_end: weekEndSaturday(start),
      label: weekLabel(start),
      units: b.units,
      revenue: Math.round(b.revenue * 100) / 100,
      orders: b.invoices.size,
      rows: b.rows,
    }));
}

// Integrity guard: re-derive each row's Sunday week start from its genuine
// InvoiceDate and count mismatches against the preserved week_start_sunday.
export function countWeekStartMismatches(rows: SeedRow[]): number {
  return rows.filter((r) => r.week_start_sunday !== weekStartSunday(r.InvoiceDate)).length;
}

// --- Account linkage rule ---------------------------------------------------
// accounts.json links CustomerIDs to source rows. A link is kept only when the
// referenced source row exists in the preserved history AND carries the same
// CustomerID. Nothing is linked by inference.
export function validateAccountLinks(
  accounts: AccountEntry[],
  rows: SeedRow[],
): { accounts: AccountEntry[]; mismatches: number } {
  const bySourceRow = new Map(rows.map((r) => [r.source_row, r]));
  let mismatches = 0;
  const validated = accounts.map((account) => {
    const linked_source_rows = account.linked_source_rows.filter((sourceRow) => {
      const row = bySourceRow.get(sourceRow);
      const ok = !!row && row.CustomerID === account.CustomerID;
      if (!ok) mismatches += 1;
      return ok;
    });
    return { ...account, linked_source_rows };
  });
  return { accounts: validated, mismatches };
}

// --- Size presentation rule --------------------------------------------------
// The UCI source provides no size metadata. Dimensions appearing inside product
// names (e.g. "60CM", "120CM", "15CM") are part of the label, NOT size
// metadata, and must never be extracted as such. When the source has no size
// metadata, sizes stay omitted and a single status explains it.
export const SIZE_UNAVAILABLE_STATUS = 'unavailable in source; sizes omitted';

export function resolveSizes(
  sizeMetadata: Record<string, string | null> | null,
): { sizes: Record<string, string>; status: string } {
  if (!sizeMetadata) {
    return { sizes: {}, status: SIZE_UNAVAILABLE_STATUS };
  }
  const sizes: Record<string, string> = {};
  for (const [code, size] of Object.entries(sizeMetadata)) {
    if (size) sizes[code] = size;
  }
  return { sizes, status: 'shown only from source-provided size metadata' };
}

export function seedOnFirstRead() {
  return { seeded: true, guard: 'v2-sunday-start' };
}
