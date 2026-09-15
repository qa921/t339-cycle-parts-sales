import part1 from '../../../data/product-sales/seed/part-1.json';
import part2 from '../../../data/product-sales/seed/part-2.json';
import part3 from '../../../data/product-sales/seed/part-3.json';
import part4 from '../../../data/product-sales/seed/part-4.json';
import part5 from '../../../data/product-sales/seed/part-5.json';
import names from '../../../data/product-sales/names.json';
import accountsFile from '../../../data/product-sales/accounts.json';
import bundlesFile from '../../../data/product-sales/bundles.json';
import vendorsFile from '../../../data/product-sales/vendors.json';
import catalog from '../../../data/product-sales/catalog-source.json';
import {
  WEEK_START,
  WEEK_END,
  aggregateWeekly,
  countWeekStartMismatches,
  resolveSizes,
  validateAccountLinks,
  type AccountEntry,
  type SeedRow,
} from '../../../lib/product-sales-db';

// Preserved history: only genuine UCI Online Retail rows (CC BY 4.0),
// including cancellations/returns and rows without a CustomerID.
const rows: SeedRow[] = [
  ...(part1.rows as SeedRow[]),
  ...(part2.rows as SeedRow[]),
  ...(part3.rows as SeedRow[]),
  ...(part4.rows as SeedRow[]),
  ...(part5.rows as SeedRow[]),
];

export async function GET() {
  const weeks = aggregateWeekly(rows);
  // The source has no size metadata: sizes stay omitted with a status, and
  // dimensions inside product names are never extracted as sizes.
  const { sizes, status: sizeStatus } = resolveSizes(
    catalog.size_metadata as Record<string, string | null> | null,
  );
  // Accounts are linked only where the referenced source rows exist and
  // carry the same CustomerID.
  const { accounts, mismatches: accountLinkMismatches } = validateAccountLinks(
    accountsFile.accounts as AccountEntry[],
    rows,
  );
  return Response.json({
    week_start: WEEK_START, // 'sunday'
    week_end: WEEK_END,     // 'saturday'
    weeks,                  // Sunday–Saturday buckets with full-range labels
    sales: rows,            // preserved per-row history with week_start_sunday
    names,
    accounts,               // validated links only; notes stay as stored (empty)
    accounts_provenance: accountsFile.provenance,
    sizes,                  // empty when the source has none; never derived from names
    size_status: sizeStatus,
    vendors: vendorsFile.vendors, // preserved as-is (unavailable in UCI source)
    bundles: bundlesFile.bundles, // preserved as-is (unavailable in UCI source)
    size_metadata: catalog.size_metadata, // null: unavailable in UCI source; not invented
    size_metadata_status: catalog.size_metadata_status,
    provenance: catalog.source,
    integrity: {
      rows: rows.length,
      weekstart_mismatches: countWeekStartMismatches(rows),
      account_link_mismatches: accountLinkMismatches,
    },
  });
}
