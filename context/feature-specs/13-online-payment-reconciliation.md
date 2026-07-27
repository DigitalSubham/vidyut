# Unit 13 — Online Payment + Reconciliation

Read `AGENTS.md`, `data-model.md` (§10), `rbac.md`, `api-conventions.md`, `code-standards.md`, `architecture-context.md` (Razorpay/payments notes), `plans-entitlements.md` (`online_payment` module) first.

## Decisions (confirmed with the user before implementation)

- **Gateway integration:** this sandbox has no live Razorpay credentials and there's no local emulator (unlike MinIO for S3). Confirmed: **stub order creation** (a fake `gatewayOrderId`, no live API call — same pattern as Unit 12's `receipt.generate`), but the **webhook's HMAC-SHA256 signature verification is real** and genuinely testable (a valid signature can be computed with a test secret, no live account needed). All state-transition logic on webhook receipt (`Payment`/`Invoice`/`Receipt`/`AuditLog`) is real, reusing Unit 12's payment-completion logic — only the outbound "create an order at Razorpay" call is faked.
- **Platform fee:** no document gives an actual rate. Confirmed: add `Payment.platformFeeAmount` (integer paise), computed from a configurable rate (`PAYMENT_PLATFORM_FEE_BPS` env var, basis points) that **defaults to 0** until real pricing is decided. The tracking mechanism exists; the business rate is deferred.
- **Reconciliation reporting:** skipped this unit — there's no bank-statement import and no live gateway to poll against. Deferred until a real gateway connection exists to reconcile against (the unit's own name keeps "Reconciliation" for historical/progress-tracker reasons, but nothing under that heading ships this unit).
- **Refunds:** Unit 12 deferred `fee.refund` ("on-demand once a real refund flow is designed"), but this unit's own scope line in `progress-tracker.md` lists "refunds" explicitly. Confirmed: **implement now** — request + approval workflow, gated by `fee.refund` (the same single permission covers both steps, since `rbac.md` defines only one string, not separate request/approve permissions like `fee.setup`/`fee.concession.approve`).

## Goal

Let parents pay online (order creation stubbed, real webhook-driven confirmation), and let accountants process refunds with an approval trail.

## Scope

1. **Models:** `RefundRequest` (a Unit 13 addition — `data-model.md` has no entity for the request/approval step, only `PaymentStatus.REFUNDED` as a terminal state on `Payment` itself) + enum `RefundStatus{PENDING, APPROVED, REJECTED}`. `Payment` gains `platformFeeAmount` (integer paise, default 0 — see Decisions). Branch-scoped; RLS per the established pattern.
2. `POST /api/v1/payments/online/initiate` (`{ branchId, studentId, invoiceId?, amount, mode }`, mode restricted to `UPI`/`CARD`/`NETBANKING`/`WALLET`) — creates a `Payment` with `status = PENDING` and a stubbed `gatewayOrderId`, computes `platformFeeAmount` from the configured rate, and returns the order details a client SDK would need. Gated by the `online_payment` module being enabled (`requireModuleEnabled`, `core/entitlements.ts`) **and** either: the caller is a `PARENT` paying for their own linked child (`resolveGuardianStudentIds`, Unit 08) or a staff member with `fees.collect` (counter-assisted online payment).
3. `POST /api/v1/webhooks/razorpay` — **public, unauthenticated** (no `authGuard`/`tenantContext` — Razorpay doesn't send our JWTs). Verifies the `X-Razorpay-Signature` header (HMAC-SHA256 over the raw body, a shared secret) before touching anything; `400` on a bad signature. The (stubbed) order's `notes` carry `{ tenantId, paymentId }` so the handler can resolve tenant context without an RLS-bypassing lookup. On a `payment.captured` event: reuses Unit 12's payment-completion logic (invoice status update, `Receipt` + `AuditLog` + `receipt.generate` enqueue) against the matched `Payment`. On `payment.failed`: sets `Payment.status = FAILED`.
4. `POST /api/v1/payments/:id/refund-request` (`{ amount, reason }`) — creates a `RefundRequest` (`PENDING`). `PATCH /api/v1/refund-requests/:id/decide` (`{ status: APPROVED|REJECTED }`) — on `APPROVED`: a stubbed gateway refund call, `Payment.status = REFUNDED`, the linked `Invoice`'s status recalculated (the refunded payment no longer counts toward its paid total), and an `AuditLog` entry. Both gated by `fee.refund`. `GET /api/v1/refund-requests` (filters: paymentId, status) gated by `fee.view`.
5. **Config:** `PAYMENT_PLATFORM_FEE_BPS` (optional, default `0`) and `RAZORPAY_WEBHOOK_SECRET` (required — the webhook can't verify signatures without it) added to `core/config.ts`.
6. **i18n:** all validation/error strings via i18n keys.

## Out of scope

Real Razorpay SDK integration (order creation stays stubbed — see Decisions), reconciliation reporting (see Decisions), a real platform-fee business rate (tracking mechanism only), refund's actual gateway call (stubbed, same as order creation), payment-gateway dashboards for the super-admin surface (feature-catalog's "Payment-gateway platform fee | SA" note — a later super-admin-console pass, not this unit).

## Definition of done / checks

- A `PARENT` can initiate an online payment for their own linked child; initiating for a non-linked child is denied (self-scope).
- The `online_payment` module gate actually blocks initiation when disabled for a tenant (`403 MODULE_DISABLED`).
- A genuinely-signed webhook payload (`payment.captured`) is verified and completes the payment exactly like Unit 12's counter-payment path (`Invoice` status, `Receipt`, `AuditLog`, `receipt.generate` enqueued) — a real HMAC computation, not a mocked signature check. An invalid signature is rejected with `400` and touches no data.
- `payment.failed` sets `Payment.status = FAILED` without touching the invoice.
- Refund request → approve reduces the invoice's effective paid total and sets `Payment.status = REFUNDED`; a rejected refund request leaves the payment untouched.
- Tenant-isolation test: cross-tenant refund-request/payment queries return zero rows both via RLS and via a deliberately unscoped query.
- RBAC test: `fee.refund` roles (OWNER/ACCOUNTANT per `rbac.md`) pass; PRINCIPAL/ADMIN/TEACHER denied.
- Branch-scope test: an ACCOUNTANT on Branch A denied Branch B's refund requests.
- Lint + typecheck + tests pass; `progress-tracker.md` updated (13 → done, 14 current).

## Next unit

**14 — Fee Reminders** (Milestone 2's final unit).
