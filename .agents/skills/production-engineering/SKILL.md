---
name: production-engineering
description: Production-grade architectural standards, domain store patterns, reusable UI kit specs, and DevOps configurations for Porbido Trucking TMS.
---

# Production Engineering Standards & Technical Reference

## 1. Domain Store Pattern (Angular Signals)
- Every domain has its own dedicated Store (`@Injectable({ providedIn: 'root' })`).
- Store exposes read-only signals: `readonly state = signal<T[]>(...)` and `readonly computedState = computed(...)`.
- Mutations are internal methods with optimistic UI update and background Firestore sync.
- Use indexed maps (`Map<string, T>`) for $O(1)$ lookups instead of repeated $O(N \times M)$ nested array scans.

## 2. Reusable UI Component Standards
- **Props**: Use Angular Signals `input.required<T>()` and `input<T>()`.
- **Events**: Use Angular Signals `output<T>()`.
- **States**: Every data table or list view MUST explicitly support:
  - `Loading`: Skeleton shimmers (never blocking blank screens).
  - `Empty`: Distinct icon + helpful title + action recovery CTA button.
  - `Error`: Inline retry banner.
- **Accessibility**: Native semantic HTML + ARIA attributes (`aria-expanded`, `aria-label`, focus management).

## 3. Financial & Domain Math Invariants
- Never calculate freight charges, crew salaries, or liquidation balances inline inside template bindings or ad-hoc component methods.
- Always route through pure static methods in `FinanceCalculator` (`src/app/core/domain/finance-calculator.ts`).

## 4. DevOps & Cloud Infrastructure Guidelines
- **Firestore Security Rules**: Field-level validation, authenticated role verification, and rate limits.
- **Multi-Stage Build**: Minified production bundles targeting Cloud CDN with immutable hashed asset caching.
- **Error Observability**: Centralized error interceptor capturing runtime exceptions with breadcrumbs.

## 5. Modal Viewport Teleportation Architecture (`[appModalTeleport]`)
- **Root Problem**: Modals placed in component templates whose parents feature animations (e.g. `.animate-fade-in-up`) or CSS transforms become trapped in the ancestor's containing block. On scroll, `position: fixed` modals are pulled off-center and clipped.
- **Implementation**: Apply `[appModalTeleport]` from `src/app/shared/directives/modal-teleport.directive.ts` to any modal container:
  - Appends to `document.body` on `ngOnInit`.
  - Sets `document.body.style.overflow = 'hidden'` while modal is open.
  - Cleans up with `this.el.remove()` on `ngOnDestroy` (never re-inserts to component DOM tree).

