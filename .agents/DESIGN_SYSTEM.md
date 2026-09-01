# Porbido TMS — Design System v2.0
## Enterprise Design Rules & UI Contract

> **Purpose**: This document is the **single source of truth** for every UI decision in the Porbido Trucking Management System. Any AI agent, developer, or designer working on this project MUST follow these rules exactly — no exceptions. The goal is a consistent, premium, enterprise-grade interface that is easy on the eyes and user-friendly for non-technical trucking operations staff.

---

## 1. Core Design Philosophy

| Principle | Rule |
|---|---|
| **Eye-friendly** | Never use pure bright red, high-saturation green, or harsh neons. Every color must be gentle and professional. |
| **Dark mode** | ❌ NEVER implement dark mode. The system is permanently in Light Mode. |
| **Typography-first** | Text must always be readable at a glance. No decorative fonts. |
| **Density balance** | Data-rich but not cluttered. Use whitespace generously inside cards. |
| **Mobile** | Tablets and desktop only. Mobile is deferred (separate Driver PWA project). |

---

## 2. Color Palette — SaaS Modern Clean Palette

### Core Brand & Surface Colors
```
Primary Brand:  #3361FF   (Vibrant SaaS Blue — buttons, active links, primary accents)
Dark Neutral:   #262B35   (Soft Matte Charcoal — headings, deep accents, primary text, eye-friendly)
Surface White:  #FFFFFF   (Cards, dialogs, inputs)
Neutral Light:  #EDEFF2   (Borders, light gray dividers, neutral tags)
Canvas BG:      #F1F4FF   (Soft Blue-Tint White — page canvas background & subtle card hovers)
```

### Semantic Colors
```
success   #29CC6A / bg: #EAFBF1 / border: #A3F2C3   (Vibrant Emerald — available, completed, active)
danger    #FC5555 / bg: #FFF0F0 / border: #FFC2C2   (Coral Red — discrepancies, shortages, errors, inactive)
warning   #D97706 / bg: #FFFBEB / border: #FDE68A   (Vibrant Orange — maintenance, in-review, pending)
info      #3361FF / bg: #F1F4FF / border: #C2D1FF   (SaaS Blue — in-transit, information)
neutral   #262B35 / bg: #EDEFF2 / border: #D1D5DB   (Soft Matte Dark — general status)
```

### Text Hierarchy
```
Primary:    #262B35   (Soft Matte Dark — titles, headings, body emphasis, never harsh)
Secondary:  #5A6376   (Soft Matte Slate — body text, descriptions)
Muted:      #9CA3AF   (Slate-400 — captions, placeholders)
Border:     #EDEFF2   (Neutral light border)
```

---

## 3. Typography — Inter Clean Enterprise System

- **Font Family**: `Inter` (Google Fonts: 300, 400, 500, 600, 700)
- **Weight Rule**: Strictly avoid extra-bold (800) or black (900) to maintain sleek, ultra-clean density without heavy text bulk. Maximum ceiling is `font-bold` (700). Standard headings use `font-semibold` (600).
- **Monospace numbers**: Use `font-mono tabular-nums` for all Philippine Peso amounts, TLO numbers, weights, and rates

### Type Scale & Hierarchy Guide (Inter)
| Name | Specification | Usage |
|---|---|---|
| **Headline Large** | Inter Bold 32px / 40px (letter-spacing: 0) | Main Hero Titles & Major KPI values |
| **Headline Medium** | Inter Regular 28px / 36px (letter-spacing: 0) | Major Section Headings |
| **Headline Small** | Inter Semibold 24px / 32px (letter-spacing: 0) | Page H1 & Modal Titles |
| **Title Extra Large**| Poppins SemiBold 22px / 28px (letter-spacing: 0) | Card H2 & Summary Metric Groups |
| **Title Large** | Poppins SemiBold 20px / 26px (letter-spacing: 0) | Section Subheadings |
| **Title Medium** | Poppins Regular 18px / 20px (letter-spacing: +0.15px)| Card Titles & Primary Links |
| **Title Small** | Poppins Medium 16px / 24px (letter-spacing: +0.15px)| Table Row Titles & List Headers |
| **Title Extra Small**| Poppins Medium 14px / 20px (letter-spacing: +0.1px) | Standard Body & Input Fields |
| **Label Large** | Poppins Medium 14px / 20px (letter-spacing: +0.1px) | Primary Action Buttons |
| **Label Medium** | Poppins SemiBold 12px / 18px (letter-spacing: +0.5px)| Filter Buttons & Badges |
| **Label Small** | Poppins Medium 11px / 16px (letter-spacing: +0.5px) | Micro Badges & Secondary Tags |
| **Label Extra Small**| Poppins Regular 10px / 12px (letter-spacing: +0.5px) | Captions, Timestamps, Helper text |

---

## 4. Spacing & Layout Rules

- **Page padding**: `px-6 py-6` — defined once in `app.component.ts` main tag — DO NOT override per-module
- **Section gaps**: `space-y-6` between major sections on a page; `space-y-4` inside a card
- **Card padding**: `p-6` (default), `p-5` (medium), `p-4` (compact widget)
- **Grid gaps**: `gap-4` (standard), `gap-5` (comfortable), `gap-6` (generous)
- **Max width**: NEVER constrain module content below `w-full`. Exception: Dispatch wizard uses `max-w-5xl` only

---

## 5. Component Classes — ALWAYS USE THESE

All components below are defined in `src/styles.css`. **Always use these utility classes instead of repeating Tailwind chains.**

### Card
```html
<!-- Standard card -->
<div class="card p-6"> ... </div>

<!-- Hero dark gradient card (for main KPI) -->
<div class="card-hero p-6"> ... </div>

<!-- Card with hover lift effect -->
<div class="card p-5 card-interactive"> ... </div>
```

### Buttons
```html
<button class="btn-primary">Save Trip</button>
<button class="btn-secondary">Cancel</button>
<button class="btn-ghost">View History →</button>
```
- Disabled state: always `disabled:opacity-40 disabled:cursor-not-allowed` — NEVER `disabled:bg-slate-300`
- Submit (save) buttons: override background to green `style="background:linear-gradient(135deg,#15803D,#16A34A)"`

### Badges
```html
<span class="badge badge-success">Billed</span>
<span class="badge badge-warning">For Checking</span>
<span class="badge badge-danger">Unbilled</span>
<span class="badge badge-neutral">Draft</span>
<span class="badge badge-brand">On Route</span>
```

### Forms
```html
<label class="form-label">TLO Number <span class="text-rose-500">*</span></label>
<input class="form-input" placeholder="e.g. 904816" />
```

### Tables
```html
<table class="data-table">
  <thead><tr><th>Column</th></tr></thead>
  <tbody><tr><td>Value</td></tr></tbody>
</table>
```

---

## 6. Badge → Status Mapping (STRICT)

| Business Status | Badge Class |
|---|---|
| `BILLED` | `badge-success` |
| `FOR_CHECKING` | `badge-warning` |
| `UNBILLED` | `badge-neutral` |
| `RECONCILED` | `badge-success` |
| `AMOUNT_DISCREPANCY` | `badge-warning` |
| `UNBILLED_CARGILL` | `badge-danger` |
| `UNRECORDED_PORBIDO` | `badge-warning` |
| `ON_ROUTE` | `badge-brand` |
| `AVAILABLE` | `badge-success` |
| `MAINTENANCE` | `badge-warning` |
| `POD: APPROVED` | `badge-success` |
| `POD: PENDING` | `badge-neutral` |
| `POD: FLAGGED_BLURRY` | `badge-danger` |

---

## 7. Animation Rules

Add to every module root `<div>`:
```html
<div class="w-full space-y-6 animate-fade-in-up">
```

For grids of cards (staggered):
```html
<div class="grid grid-cols-3 gap-4 stagger-children">
  <div class="card animate-fade-in-up"> ... </div>
</div>
```

- ✅ Use `animate-fade-in-up` on page load, card grids
- ✅ Use `animate-scale-in` on modals and dialogs
- ❌ NEVER use `animate-bounce`, `animate-spin`, or `animate-ping` on data elements
- ❌ NEVER skip animations to make the UI feel alive and premium

---

## 8. Philippine Business Display & Terminology Rules

| Data Type / Term | Format & Terminology Rule |
|---|---|
| Currency (large KPI) | `₱{{ value \| number:'1.0-0' }}` with `font-mono font-black tabular-nums` |
| Currency (exact ledger) | `₱{{ value \| number:'1.2-2' }}` with `font-mono font-bold` |
| Currency symbol | Always `₱` — NEVER `PHP`, `P`, or plain number |
| Trip Operating Budget | **`Total Cash on Hand`** — NEVER use "Trip Cash Advance" |
| Payroll Advance Deduction | **`Cash Advance Recovery`** — reserved strictly for Payroll module |
| Billed Freight | **`Gross Freight Revenue`** |
| Total Operating Outflow | **`Total Trip Expenses`** |
| Net Operating Profit | **`Net Trip Income`** |
| TLO Number (display) | `TLO #904816` — with hash + space |
| TLO Number (input field) | Numeric only, no prefix |
| Tonnage | `26.80T` or `26.80 Tons` — always 2 decimal places |
| Dates | `mediumDate` pipe → "Aug 5, 2026" |
| Rate (per-ton) | `₱1,100.00/ton` |
| Rate (flat) | `₱144,000.00 Flat` |

### Real Fleet Data (NEVER fabricate)
```
Trucks: CCK 5273, NAK 2202, CAK 2693, CAO 3510, RHA 965
Drivers: Jojo Macaraig, Marvin Santos, Roldan Flores, Edwin Reyes, Dante Cruz
Routes:
  Subic Port → Cargill Pulilan Feeds Mill      (₱1,100/ton, PER_TON)
  Cargill Pulilan → Cargill Iloilo Facility    (₱144,000, FLAT_RATE)
  Cargill Iloilo → Manila Container Terminal   (₱95,500,  FLAT_RATE)
  Re-route fee: ₱3,600 (toggle)
```

---

## 9. Financial Color & Card Styling Rules

| Financial Concept | Text Color | Background |
|---|---|---|
| Gross Freight Revenue | `text-brand-500` (blue) | `bg-blue-50` |
| Total Expenses / Costs | `text-danger` = `#B91C1C` | `bg-rose-50` |
| Net Company Income | `text-success` = `#15803D` | `bg-emerald-50` |
| Total Cash on Hand (Credit) | `text-amber-600` | `bg-amber-50` |
| Expenses Spent (Debit) | `text-rose-600` | `bg-rose-50` |
| Ending Cash Balance | `text-emerald-600` (Surplus) / `text-rose-600` (Deficit) | `bg-white` card |

### Card Styling & Non-Redundancy Rules
- **Clean Card Interior**: Use clean white background card boxes (`.card bg-white border border-slate-200 shadow-xs`) with color-coded text numbers (`text-amber-600`, `text-rose-600`, `text-emerald-600`).
- **No Badge Pill Clutter**: Avoid inserting badge pills inside allowance or expense summary metric cards unless displaying explicit business status chips (e.g. `✓ Cash Surplus` or `⚠️ Deficit`).
- **No Subtitle Redundancy**: Omit subtitle paragraphs if the section heading is self-explanatory. Never repeat section titles or list child card labels in subtitle text.

---

## 10. Module Layout Patterns

### Every Module Page Structure
```html
<div class="w-full space-y-6 animate-fade-in-up">

  <!-- 1. Page Header (always present) -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">Module Title</h1>
      <p class="text-sm text-slate-400 mt-0.5 font-medium">Subtitle description</p>
    </div>
    <!-- Right: action buttons or selectors -->
  </div>

  <!-- 2. Summary / KPI row (optional) -->
  <div class="grid grid-cols-4 gap-4 stagger-children">
    <div class="card p-5 animate-fade-in-up"> ... </div>
  </div>

  <!-- 3. Main content (table, kanban, form, etc.) -->
  <div class="card overflow-hidden animate-fade-in-up">
    ...
  </div>

</div>
```

### Trip Details Page Specific Pattern
```
- Top: Back button (left) + Status selector (right)
- Box 1: TLO header + 3-box financial grid + Route visualizer
- Box 2: COH ledger (4 summary boxes + thermal receipt)
- Box 3: 2-col grid (Fleet/Driver info | Rate Breakdown)
- Box 4: POD receipt verification section
```

---

## 11. Sidebar Navigation Groups

```
MAIN:        Dashboard, Dispatch
FINANCE:     Trips, Billing
MANAGEMENT:  Fleet, Payroll
SYSTEM:      Reports, Audit
```

- Active item: gradient pill `from-brand-700 to-brand-600` white text
- Collapsed width: 72px (icon only + tooltip on hover)
- Expanded width: 224px

---

## 12. Do's and Don'ts

| ✅ DO | ❌ DON'T |
|---|---|
| Use `.card` class for all containers | Hardcode `bg-white rounded-2xl border border-slate-200` |
| Use `.badge` + modifier for all status chips | Inline `[ngClass]` with bg/text color pairs for badges |
| Use `.btn-primary` for all blue CTAs | Hardcode `bg-blue-600` or `class="bg-brand-blue"` on buttons |
| Use `font-mono tabular-nums` on ₱ amounts | Display money without `font-mono` |
| Add `animate-fade-in-up` to every module root | Leave modules unanimated |
| Use `text-[10px] font-bold uppercase tracking-wider` for section labels | Use `h3 text-sm` for section divider labels |
| Use `₱` for all peso amounts | Use `PHP`, `P`, or no symbol |
| Use `.form-input` on all inputs and selects | Hardcode the full Tailwind input chain each time |
| Use `data-table` on all `<table>` elements | Style tables ad-hoc per-row |
| Show empty state with emoji + `text-slate-400 text-sm py-8 text-center` | Show raw "No data" text without styling |
| Update `PROJECT_PROGRESS.md` after EVERY change | Skip the progress log |

---

## 13. Reusable UI Kit Specifications

### A. `<app-filter-card>` (KPI & Metric Cards)
- **Container**: `rounded-xl` (`w-10 h-10` with soft elevation `shadow-2xs`), NEVER circular `rounded-full`.
- **Icon**: Prominent `22px` Material Symbol icon.
- **Metric Count**: Primary `text-3xl font-medium text-[#262B35] font-mono`.
- **Ratio Suffix**: Display subtle `/ <total>` (`text-sm font-normal text-slate-400 font-mono`) when `[total]` is provided.
- **Scoped Math**: Role-specific cards must show active count out of total role count (`activeDrivers / totalDrivers`), never overall total.
- **Themes**: `blue`, `emerald`, `amber`, `orange`, `violet`, `coral`, `slate`, `neutral`.

### B. `<app-toolbar>` (Unified Toolbar)
- **Grid Layout**: 3-Column Responsive Grid (`md:grid-cols-[auto_1fr_auto]`) to guarantee mathematical horizontal centering of search bar.
- **Search Bar**: Explicit `!pl-9` (36px left padding) with `left-2.5` `z-10` icon to prevent text collision.
- **Export Dropdown**: Monochrome neutral slate icons (`text-slate-500`) with streamlined labels: **`PDF`** and **`Xlsx`**.

### C. Page Headings
- Standard: `<h1 class="text-2xl font-semibold text-[#262B35] tracking-tight">` (using `font-semibold` / 600 weight).

