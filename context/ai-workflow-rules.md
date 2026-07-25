# Development Workflow

## Approach

Build this project incrementally using a spec-driven workflow. Context files define what to build, how to build it, and the current state. Always implement against these specs and the context docs (`feature-catalog.md`, `architecture-context.md`, `../docs/market-research/`) — do not infer or invent product behavior. Build the **complete core before selling** (`build-approach.md`), one unit at a time.

## Scoping Rules

- Work on one build unit (from `progress-tracker.md`) at a time.
- Prefer small, verifiable increments over large speculative changes.
- Do not combine unrelated system boundaries in one step.

## When To Split Work

Split a step if it combines:

- UI changes and background-job (BullMQ worker) changes
- Mobile offline state and API/persistence changes
- Multiple unrelated API modules
- Behavior not clearly defined in the specs

If a change can't be verified end to end quickly, the scope is too broad — split it.

## Handling Missing Requirements

- Do not invent product behavior not in the specs/docs.
- If a requirement is ambiguous, resolve it in the relevant context/spec file before implementing.
- If a requirement is missing, add it as an Open Question in `progress-tracker.md` before continuing.

## Multi-Tenancy & Security Gate (every unit)

Before marking a unit done, confirm:

- All DB access goes through `withTenant()`; new tenant tables have `tenant_id` + RLS policy.
- Auth + RBAC enforced on every new mutation.
- Input validated with Zod at the boundary.
- Money as integer paise; fee/marks changes audited.
- User-facing strings via i18n (Hindi/English), not hardcoded.
- Long-running/fan-out work is a background job (BullMQ), not inline.

## Protected Foundation Components

Do not modify generated third-party foundation components unless a task explicitly requires it:

- `components/ui/*` (shadcn/ui)
- third-party library internals

Keep them default and reusable; put project-specific logic in app-level components.

## Keeping Docs In Sync

Update the relevant context file whenever implementation changes: architecture/boundaries, storage model, tenancy, code conventions, or feature scope. `progress-tracker.md` must reflect the **actual** state, not the intended state.

## Before Moving To The Next Unit

1. The current unit works end to end within its defined scope.
2. No invariant in `architecture-context.md` was violated (tenant isolation especially).
3. Lint + typecheck + tests pass (including tenant-isolation tests).
4. `progress-tracker.md` reflects the completed work.
