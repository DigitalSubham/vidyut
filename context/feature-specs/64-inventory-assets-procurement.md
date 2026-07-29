# Unit 64 — Inventory, Assets & Procurement (B4, full On-Demand module)

Same On-Demand caveat as Unit 57. Lowest-priority remaining catalog module alongside Hostel.

## Open Questions

1. **Scope check** — does the school actually want to sell uniforms/books to parents through this system (a real POS + fee-ledger integration), or just track internal stationery/asset inventory (no parent-facing sales)? These are different-sized asks. **Recommendation:** confirm which (or both) before scoping — internal-only inventory is much smaller than a parent-facing store.

## Goal

Item/stock tracking, purchase orders, an asset register, and (if confirmed) a parent-facing uniform/book store.

## Scope

1. `InventoryItem`/`Store` (multiple locations), `StockMovement` (`itemId`, `direction: IN|OUT`, `quantity`, `reason`).
2. `PurchaseOrder`/`GRN` (goods-received note) — a simple two-step procurement flow, no vendor-portal/RFQ process.
3. `Asset` (`item`, `purchaseDate`, `depreciationMethod?`) — a register, not a full depreciation-accounting engine (that's Unit 62's territory if ever built natively).
4. Parent-facing store (Open Question 1, if confirmed): a `StoreItem` (price) + `StoreOrder` linked to a `FeeHead(type: MISC)` invoice, reusing the existing fee engine rather than a separate payment path.
5. Low-stock alerts via Unit 14's existing cron-scan pattern.

## Out of scope

Full depreciation accounting (Unit 62's territory); vendor RFQ/bidding workflows.

## Definition of done / checks

- Stock in/out correctly updates item quantities; low-stock alerts fire on threshold; (if built) a parent store order correctly creates a fee-engine invoice.
- Tenant-isolation tests.
- `progress-tracker.md` updated.

## Next unit

**65 — Misc Engagement & Productivity Tools** (final unit of this batch).
