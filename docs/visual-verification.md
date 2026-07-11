# Visual Verification Notes

## Desktop, 1440 × 900

| Route | Result | Key observations |
|---|---|---|
| `/dashboard` | Pass | tRPC demo data hydrates correctly; six KPI cards, recent orders, Foxway credit, latest synchronization, and synchronization activity render with the black/orange system. Semantic order and sync badges are visible and tabular values use monospace styling. |
| `/catalog` | Pass | Catalog data, search, grade and EAN-state filters, grade badges, mapping states, SKU/EAN values, and action buttons render without client errors. Table density and orange headers match the design tokens. |
| `/offers` | Pass | Offer rows, four filter groups, semantic grade/status/buy-box badges, monospace pricing, MANUAL tag with reset action, and orange losing-price suggestion render correctly. Clicking a price replaces the dashed-underlined value with a prefilled `995.00` input using the orange active border, without submitting a mutation. |
| `/orders` | Pass | Search, status filtering, ten demo orders, monetary columns, Foxway references, stage metadata, and semantic statuses render correctly. Selecting an order opens the right-side drawer with revenue, supplier cost, gross profit, five-stage Foxway progress, item EAN/SKU, customer, and shipping address. |
| `/sync-log` | Pass | Manual sync controls, type/status filters, duration and counter columns, and semantic success/partial states render correctly. Expanding the partial Catalog Sync row exposes the affected EAN and the actionable approved-mapping error message beneath the audit row. |
| `/settings` | Pass | Margin rules display stored fractions correctly as 25%, 22%, and 20%; rounding selects, save controls, grade mapping, stock buffer, minimum listing threshold, delivery promise, masked channel credentials, and connection states render correctly. The Foxway demo connection mutation returns visible success feedback: `Foxway: 1 catalog available.` |

The earlier skeleton-only captures were caused by Tailwind CSS 4 auto-source discovery scanning generated `.next` hot-update output. Restricting source discovery to `app` and `components` stopped the recursive root-layout compilation loop; the interactive browser confirms normal hydration.

## Mobile, 390 × 844

All six routes passed full-page mobile capture. The sidebar collapses into the top-left menu control, the 60px topbar retains the primary Sync Now action, page controls stack vertically, dashboard KPI cards become a single column, and settings panels collapse cleanly without clipped form controls. Catalog, Offers, Orders, and Sync Log preserve their operational table density through deliberate horizontal scrolling rather than compressing identifiers and monetary values into unreadable columns.
