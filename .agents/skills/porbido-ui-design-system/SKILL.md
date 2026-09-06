---
name: porbido-ui-design-system
description: >-
  Strict UI/UX design specifications, Enterprise Light Mode palette, typography hierarchy,
  data table states, modal viewport teleportation, and status badge matrices for Porbido Trucking TMS.
  Use when building or modifying Angular presentation components, dialogs, forms, data tables, or cards.
---

# Porbido Trucking TMS — UI/UX Design System Specification

> **Persona & Standard**: Senior Frontend UI/UX Engineer & Enterprise Design System Specialist.  
> **Core Mandate**: Deliver consistent, accessible, enterprise-grade user interfaces strictly adhering to Porbido's light-mode visual identity, typography ceilings, and modal viewport rules.

---

## 🎨 1. Enterprise Light Mode Color Palette

Dark mode is **permanently prohibited** across Porbido TMS. All interfaces must render with crisp, high-contrast light enterprise styling:

| Token / Usage | CSS Variable / Tailwind | Hex Value | Semantic Purpose |
| :--- | :--- | :--- | :--- |
| **Canvas Background** | `bg-[#F8FAFC]` or `bg-slate-50` | `#F8FAFC` | Global page background |
| **Surface (Cards/Modals)**| `bg-white` / `var(--color-surface)` | `#FFFFFF` | Card surfaces, modal sheets, popovers |
| **Primary Brand Blue** | `bg-[#3361FF]` or `bg-blue-600` | `#3361FF` | Primary actions, CTA buttons, active tabs |
| **Primary Brand Dark** | `var(--color-brand-dark)` | `#172E8A` | High-contrast headers, active selection states |
| **Text Primary** | `text-[#262B35]` or `text-slate-900` | `#262B35` | Body text, table rows, primary headings |
| **Text Muted / Subtitle**| `text-slate-500` / `text-gray-500` | `#64748B` | Labels, secondary info, table column headers |
| **Borders & Dividers** | `border-[#EDEFF2]` / `border-slate-200` | `#EDEFF2` | Card borders, table grid lines, input outlines |
| **Success / Emerald** | `text-emerald-700 bg-emerald-50 border-emerald-200` | `#16A34A` | Completed trips, balanced liquidation, paid SOAs |
| **Warning / Amber** | `text-amber-700 bg-amber-50 border-amber-200` | `#D97706` | In-transit trips, carryover shortages, pending audits |
| **Danger / Red** | `text-rose-700 bg-rose-50 border-rose-200` | `#E11D48` | Discrepancies, unbilled Cargill, cancelled dispatches |

---

## ✍️ 2. Typography Rules & Strict Ceiling

Porbido TMS uses **Inter** across all components.

```
┌────────────────────────────────────────────────────────────────────────┐
│                      FONT WEIGHT CEILING RULES                         │
├────────────────────────────────┬───────────────────────────────────────┤
│ ✅ Regular (400)               │ Body text, descriptions, table cells  │
│ ✅ Medium (500)                │ Navigation links, button labels       │
│ ✅ Semibold (600)              │ Headings (h1, h2, h3), card headers   │
│ ✅ Bold (700) [MAX CEILING]    │ Metric values, high-priority totals   │
│ ❌ Extrabold (800)             │ STRICTLY PROHIBITED                   │
│ ❌ Black (900)                 │ STRICTLY PROHIBITED                   │
└────────────────────────────────┴───────────────────────────────────────┘
```

- **Rule**: Never use `font-extrabold` (800) or `font-black` (900). Maximum font weight is strictly capped at **`font-bold` (700)**.
- **Headings**: Standard headings must default to `font-semibold` (600).

---

## 💰 3. Financial & Currency Formatting Invariant

All Philippine Peso (₱) amounts and numerical metrics must adhere to strict financial styling:

```html
<!-- ALWAYS use tabular-nums, mono or semi-mono, and Angular 2-decimal number pipe -->
<span class="font-mono tabular-nums font-semibold text-slate-900">
  ₱{{ amount | number:'1.2-2' }}
</span>
```

- **Never display raw unformatted floats** (e.g. `₱144000` or `₱1100.5`).
- **Never calculate financial balances inline** in HTML templates. Always pass through `FinanceCalculator` or computed store signals.

---

## 🪟 4. Modal Viewport Architecture (`[appModalTeleport]`)

Every modal overlay (dialogs, confirmation drawers, form popups) **MUST** implement the teleport directive to prevent containing-block clipping during scroll:

```html
<!-- CORRECT MODAL PATTERN -->
@if (isOpen()) {
  <div appModalTeleport 
       class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto"
       (click)="onBackdropClick($event)">
    <div class="card w-full max-w-2xl bg-white shadow-2xl rounded-2xl border border-slate-200 p-6 relative animate-fade-in-up"
         (click)="$event.stopPropagation()">
      <!-- Modal Content -->
    </div>
  </div>
}
```

- **Mandatory Directive**: `appModalTeleport` from `src/app/shared/directives/modal-teleport.directive.ts`.
- **Keyboard Handling**: Listen to `@HostListener('document:keydown.escape')` to close top-level dialogs cleanly.

---

## 📊 5. Data Table 3-State Requirements

Every data table or list view across Porbido TMS must explicitly implement three states:

### 1. Loading State (Skeleton Shimmer)
```html
@if (isLoading()) {
  <div class="space-y-3 p-4">
    @for (i of [1, 2, 3, 4]; track i) {
      <div class="h-12 bg-slate-100 rounded-lg animate-pulse"></div>
    }
  </div>
}
```
*Never display empty blank areas or blocking modal spinners that freeze the entire layout.*

### 2. Empty State (Helpful Context & CTA)
```html
@if (!isLoading() && items().length === 0) {
  <div class="flex flex-col items-center justify-center py-12 px-4 text-center">
    <span class="material-symbols-outlined text-4xl text-slate-400 mb-2">inbox</span>
    <h4 class="text-base font-semibold text-slate-800">No Records Found</h4>
    <p class="text-sm text-slate-500 max-w-sm mb-4">No dispatches match the selected filter criteria.</p>
    <button class="btn-primary" (click)="resetFilter()">Clear Filters</button>
  </div>
}
```

### 3. Error State (Inline Recovery Banner)
```html
@if (errorMessage()) {
  <div class="rounded-lg bg-rose-50 border border-rose-200 p-4 flex items-center justify-between text-rose-800 mb-4">
    <div class="flex items-center gap-2">
      <span class="material-symbols-outlined text-rose-600">error</span>
      <span class="text-sm font-medium">{{ errorMessage() }}</span>
    </div>
    <button class="text-sm font-semibold underline hover:text-rose-900" (click)="retryLoad()">Retry</button>
  </div>
}
```

---

## 🏷️ 6. Status Badge Design Matrix

Always use standardized badge classes from `src/styles.css`:

| Status Type | Badge Class / Inline Utility | Example Usages |
| :--- | :--- | :--- |
| **Success** | `badge-success` or `bg-emerald-50 text-emerald-700 border-emerald-200` | `COMPLETED`, `RECONCILED`, `PAID` |
| **Warning / Active** | `badge-warning` or `bg-amber-50 text-amber-700 border-amber-200` | `DISPATCHED`, `IN_TRANSIT`, `SHORTAGE` |
| **Danger / Disputed** | `badge-danger` or `bg-rose-50 text-rose-700 border-rose-200` | `MISMATCH`, `CANCELLED`, `UNRECORDED` |
| **Info / Scheduled** | `badge-info` or `bg-blue-50 text-blue-700 border-blue-200` | `SCHEDULED`, `BILLED`, `SUBMITTED` |
| **Neutral / Draft** | `badge-neutral` or `bg-slate-100 text-slate-700 border-slate-200` | `DRAFT`, `PENDING_REVIEW`, `BALANCED` |

---

## 🎯 7. Command Fidelity: "Gayahin As-Is" (Replicate Exactly)

When the user instructs to replicate or match an existing component (*"gayahin mo"*, *"kopyahin mo"*):
1. Inspect the source component line-by-line first.
2. Copy the exact DOM hierarchy, padding, gap, typography weight, colors, and button layout.
3. **Strict Invariant**: Do NOT introduce unrequested secondary alerts, extra borders, modified button colors, or layout rearrangements. Replicate **AS-IS: nothing more, nothing less**.
