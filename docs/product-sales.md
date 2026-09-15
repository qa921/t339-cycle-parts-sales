# Product-sales weekly flow

The fixture now uses Sunday-start (Sunday–Saturday) weeks end to end:

- **History**: retained UCI Online Retail rows keep their preserved
  `week_start_sunday`, re-derived from each genuine `InvoiceDate` at read time
  (integrity check: `integrity.weekstart_mismatches` must be 0).
  Cancellations/returns (`C`-prefixed invoices with negative quantities) and
  rows without a `CustomerID` are preserved.
- **API**: `GET /api/product-sales` aggregates rows into Sunday–Saturday
  buckets (`weeks[]` with `week_start`, `week_end`, `label`, `units`,
  `revenue`, `orders`, `rows`) and reports `week_start: "sunday"` /
  `week_end: "saturday"`. Labels show the full range, e.g. "Sun 28 Nov – Sat 4 Dec".
- **Accounts**: `accounts.json` links are validated at read time — a linked
  source row is kept only when it exists in the preserved history and carries
  the same `CustomerID` (`integrity.account_link_mismatches` must be 0).
- **UI**: `public/index.html` + `public/product-sales.js` render the weekly
  table with the same full-range labels.

## Size presentation rule

The UCI source provides no size metadata, so the API returns an empty `sizes`
map plus a single `size_status` ("unavailable in source; sizes omitted") and
the UI shows one note — never per-cell "N/A" noise. Dimensions inside product
names (e.g. "60CM", "120CM", "15CM") are part of the label, not size
metadata, and are never extracted as such.

Preservation rules (no invented data): bundle rollups stay as stored
(`bundles.json` is empty — unavailable in the UCI source), vendors stay empty,
account notes stay empty with their documented status, and SKU size metadata
remains `null` with its documented status. Deployment verification should
confirm the exact deployed commit matches the migration commit on `main`.
