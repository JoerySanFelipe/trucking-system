# Porbido Trucking TMS - Project Rules & Technical Architecture

## 1. Tech Stack & Framework Standards
- **Framework**: Angular v21+ using **Standalone Components** and **Angular Signals** (`signal()`, `computed()`) for reactive state management.
- **Styling**: Tailwind CSS v3 with Enterprise Light Mode palette ONLY (White `#FFFFFF`, Soft Slate `#F8FAFC`, Primary Blue `#2563EB`, Accent Green `#16A34A`). Never generate dark mode styles.
- **Backend & Database**: Firebase Direct integration (`firebase` v10 SDK with Firestore, Firebase Auth, and Storage).

## 2. Core Business Rules & Math Invariants
- **Travel Load Order (TLO#)**: Must be a strict, non-empty, unique numerical string (e.g., `904816`).
- **Fleet Assets**: 10-Wheeler Heavy Trucks (`CCK 5273`, `NAK 2202`, `CAK 2693`, `CAO 3510`, `RHA 965`).
- **Freight Rate Calculation**:
  $$\text{Freight Charge} = (\text{Tonnage} \times \text{Base Rate}) + \text{Re-route Fee } (₱3,600) + \text{Extra Fees} \quad (\text{for PER\_TON})$$
  $$\text{Freight Charge} = \text{Base Rate} + \text{Re-route Fee } (₱3,600) + \text{Extra Fees} \quad (\text{for FLAT\_RATE})$$
- **Master Cargill Routes**:
  - `Subic Port → Cargill Pulilan Feeds Mill`: ₱1,100.00 / ton (Short-haul, 10.00–40.00 tons boundary)
  - `Cargill Pulilan Feeds Mill → Cargill Iloilo Facility`: ₱144,000.00 Flat rate
  - `Cargill Iloilo Facility → Manila Container Terminal`: ₱95,500.00 Flat rate
  - Re-route Fee Toggle: Fixed ₱3,600.00

## 3. Scope & Form Factor
- **Primary Focus**: Responsive Admin Web Application (Desktop & Tablet). Mobile Driver PWA is deferred for separate design.

## 4. Encoding Safeguards & Error Prevention Invariants
- **Strict TLO Encoding**: Input fields for TLO# must validate numerical format, perform duplicate detection against Firestore in real-time, and prevent submitting invalid format strings.
- **Automated Route Auto-Fill**: Origin & Destination selection must automatically set Base Rates and calculate Freight Charges to prevent encoding typos.
- **Fleet Plate Guardrails**: Plate numbers are strictly restricted to registered fleet assets (`CCK 5273`, `NAK 2202`, `CAK 2693`, `CAO 3510`, `RHA 965`).

## 5. Bi-Directional Billing Reconciliation Rules (Porbido vs. Cargill)
- **TLO Cross-Matching Engine**: System must bi-directionally cross-match trips between Porbido Internal Driver Billing (`docs/CCKBILLING2026.pdf`) and Cargill Client Billing Summaries (`docs/29-50 (1).pdf`) using `TLO #` as the unique key.
- **Three-Box Liquidation Invariants (Porbido Internal Ledger)**:
  1. **Cash-on-Hand Liquidation**:
     $$\text{Short/Over Balance} = \text{Total Cash Allowances} - (\text{Travel Expenses} + \text{Diesel})$$
  2. **Driver & Helper Payroll Liquidation**:
     $$\text{Net Salary Payable} = \text{Trip Base Pay} - \text{Cash Advance Deductions}$$
  3. **Company Trip Profitability**:
     $$\text{Net Company Income} = \text{Gross Cargill Freight Charge} - (\text{Travel Expenses} + \text{Diesel} + \text{Driver Salary} + \text{Helper Salary})$$
- **Four-State Reconciliation Statuses**:
  1. ✅ `RECONCILED`: Present in both Porbido & Cargill reports with matching amounts.
  2. ⚠️ `AMOUNT_DISCREPANCY`: Present in both reports, but freight charge or tonnage differs.
  3. 🔴 `UNBILLED_CARGILL`: Recorded in Porbido internal logs, missing from Cargill statement (Unclaimed Revenue).
  4. 🟠 `UNRECORDED_PORBIDO`: Present in Cargill statement, missing from Porbido internal logs (Unrecorded Trip).

## 6. Mandatory Project Progress & System Flow Logging Rule
- **STRICT MANDATE**: The AI agent MUST update both [PROJECT_PROGRESS.md](file:///c:/kudecode/porbido-trucking/PROJECT_PROGRESS.md) AND [ENTERPRISE_SYSTEM_FLOW.md](file:///c:/kudecode/porbido-trucking/docs/ENTERPRISE_SYSTEM_FLOW.md) after **EVERY SINGLE CHANGE OR SUCCESSFUL IMPLEMENTATION** made during development (including feature implementations, bug fixes, refactoring, schema updates, or configuration changes).
- **Log Requirements**:
  1. Add a timestamped entry under `## 📝 Change Log & Activity History` in `PROJECT_PROGRESS.md`.
  2. Verify and synchronize [ENTERPRISE_SYSTEM_FLOW.md](file:///c:/kudecode/porbido-trucking/docs/ENTERPRISE_SYSTEM_FLOW.md) to ensure all 12 stages remain strictly aligned with the latest architecture.
  3. Update module status tables or feature descriptions if relevant.
  4. Keep `## 🎯 Next Steps / Immediate Priorities` aligned with current project state.

## 7. UI Design System Rules
- **STRICT MANDATE**: All UI work MUST follow the [DESIGN_SYSTEM.md](file:///c:/kudecode/porbido-trucking/.agents/DESIGN_SYSTEM.md) specification without exception.
- **Key Rules Summary**:
  - Color palette: Deep Blue Indigo (`#1E3A5F / #2563EB`) — see design system for full token list
  - Always use `.card`, `.btn-primary`, `.btn-secondary`, `.badge-*`, `.form-input`, `.data-table` CSS utility classes (defined in `src/styles.css`)
  - Every module root `<div>` gets `class="w-full space-y-6 animate-fade-in-up"`
  - All ₱ amounts: `font-mono tabular-nums` and `| number:'1.2-2'` pipe
  - All status chips: use `.badge` + modifier — NEVER raw `[ngClass]` color pairs for badges
  - Light mode ONLY — dark mode is permanently disabled
  - Page title pattern: `<h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">`

## 8. UI Copy, Non-Redundancy & Financial Terminology Rules
- **No Subtitle Redundancy**: Subtitle paragraphs under card section headers MUST NEVER repeat the card title, repeat child card titles, or enumerate child box contents. If a section header (e.g., "Cash Position Summary") is clear, omit the subtitle paragraph entirely.
- **Strict Cash Terminology Separation**:
  - Operating cash allocated for a trip must be labeled **`Total Cash on Hand`** (or `Driver Cash Allowance`), NEVER "Trip Cash Advance".
  - The term **`Cash Advance`** is strictly reserved for driver payroll deductions in the Payroll module.
- **Decoupled Financial Consoles**:
  - *Trip Profitability* (`Gross Freight Revenue − Total Trip Expenses = Net Trip Income`) MUST NEVER include Cash Accountability metrics like `Ending Cash Balance`.
  - *Cash Accountability* (`Previous Carryover + Total Cash on Hand − Expenses Spent = Ending Cash Balance`) MUST NEVER include Profitability metrics.
- **Overview Tab Content Invariant**:
  - Overview tab root container MUST only feature:
    1. **Cash Position Summary** (`Total Cash on Hand`, `Expenses Spent`, `Ending Cash Balance`) with `See Breakdown` redirect button.
    2. **Crew Salary Breakdown** (`Driver Salary`, `Helper Salary`, `Total Crew Payroll`).
    3. **Hauling Route** (`Origin ➔ Destination`, Plate Number, Tonnage Capacity).
  - DO NOT insert redundant performance flow cards, duplicate expense lists, or badge pills inside total allowance cards.

## 9. Enterprise Production System Mandate (Official Production Grade)
- **Official Production System**: The application is an official enterprise-grade TMS for live trucking operations (prototype phase is complete).
- **Zero-Regression Invariant**: All refactoring, modularization, and architectural upgrades MUST preserve 100% of existing functional capabilities and visual styling.
- **Clean Architecture & Domain-Driven Design**:
  1. **Domain Layer**: Pure mathematical invariants (`FinanceCalculator`, `LiquidationEngine`, `MatchingEngine`) completely decoupled from Angular UI.
  2. **Application Layer**: Domain-isolated Signal Stores (`DispatchStore`, `BillingStore`, `ReconciliationStore`, `FleetStore`, `AuditStore`) replacing the monolithic `TmsService` God service.
  3. **Infrastructure Layer**: Cloud Firestore persistence, Cloud Storage adapters, resilient offline fallback.
  4. **Presentation Layer**: Thin, accessible UI components consuming strongly typed signal stores.

## 10. The 4 Senior Engineering Pillars & Operating Mandates
1. **Senior Software Architect**: Enforce strict Separation of Concerns (SoC), high cohesion, low coupling, and scalable modularity.
2. **Senior Frontend Systems Engineer**: Build accessible (WAI-ARIA), production-grade UI components with typed Signal APIs (`input()`, `output()`), handling Loading (shimmer), Empty, Error, and Responsive edge-cases.
3. **Senior Technical Lead**: Act as lead engineer with a 5+ year maintenance horizon. Before coding: ask clarifying questions, challenge fragile decisions, analyze tradeoffs, and prioritize simplicity.
4. **Senior DevOps & SRE Engineer**: Production-ready deployment architecture, CI/CD, Firestore security rules, observability, error monitoring, and zero-downtime reliability.

## 11. The 7-Step Task Process
For every major task, the AI MUST follow this strict sequence:
1. **Inspect**: Look at the existing codebase before changing anything.
2. **Explain**: State what exists, what is wrong, what is missing, and what remains unchanged.
3. **Challenge Assumptions**: Critique the proposed workflow if it is logically questionable.
4. **Propose**: Suggest the clean architectural solution with tradeoffs analyzed.
5. **Implement**: Only write code after understanding the structure and gaining agreement.
6. **Verify**: Ensure the app builds, no TS/template errors exist, and UI/navigation actually works.
7. **Report**: Summarize exactly what changed.

## 12. Strict Separation of Operations and Billing
- **Operational Status ≠ Billing Status**: Never use operational statuses (`BILLED`, `UNBILLED`, `FOR_CHECKING`) as replacements for the billing lifecycle (`READY_TO_BILL`, `IN_BILLING`, `SUBMITTED`, `FOR_REVIEW`).
- **Decoupled Workflows**: Ensure the UI reflects the distinction between operational trip verification (Dispatch/Ops) and customer Statement of Account batching (Accounting/Billing).

## 13. Master 12-Stage Enterprise Operational & Financial Flow
- **STRICT MANDATE**: All development, data models, state transitions, and component linkages MUST strictly adhere to the 12-stage enterprise lifecycle documented in [ENTERPRISE_SYSTEM_FLOW.md](file:///c:/kudecode/porbido-trucking/docs/ENTERPRISE_SYSTEM_FLOW.md):
  1. `FLEET` (Truck & Crew Roster Setup)
  2. `DISPATCH` (TLO# Entry, Route Auto-fill, Rate Calc, "In Transit" status)
  3. `TRIP OPERATIONS` (Live Trip Execution on Road)
  4. `TRIP EXPENSES & COH LEDGER` (Diesel, Toll, Food, Cash-on-Hand Liquidation)
  5. `SUCCESSFUL TRIP & POD VERIFICATION` (POD Approved $\rightarrow$ `READY_TO_BILL` / Unbilled Freight)
  6. `BILLING QUEUE` (Batching of Verified Unbilled Trips)
  7. `DRAFT BILLING` (SOA Batch Creation & Adjustments)
  8. `SUBMITTED BILLING / BILLED` (Locked Statement, A4 Printing, Sent to Cargill)
  9. `CLIENT PAYMENT & REMITTANCE` (Payment Received & Recorded)
  10. `BI-DIRECTIONAL RECONCILIATION` (Porbido SOA vs Cargill Statement by `TLO#`)
  11. `EXCEPTION RESOLUTION & CLOSURE` (Discrepancy Resolution & Audit Lock)
  12. `CREW PAYROLL & SALARY SETTLEMENT` (CA Deductions & Net Salary Payslips)

## 14. Enterprise PDF & ExcelJS Report Generation Invariants

### A. PDF Generation Standards (`jsPDF` + `jspdf-autotable`)
1. **Paper Size & Orientation**: Strictly **8.5" x 13" (Philippine Long Bond Paper / Folio = 330.2mm x 215.9mm)** in **Landscape**, with exactly **1-inch (25.4mm)** margins on all 4 sides.
2. **Unified Header**:
   - **Logo**: Positioned on Left Margin (`x = 25.4mm`, width ~64mm, height ~18mm from `docs/TMS.png`).
   - **Company Title & Address**: Horizontally center-aligned across page center (`PORBIDO TRUCKING & HAULING SERVICE` 12pt Bold `#1E3A5F` on Line 1; `ZONE 1 SAN VICENTE EAST, URDANETA CITY` 10pt Regular `#64748B` on Line 2).
   - **Divider Rule**: Solid Deep Blue `#2563EB` rule placed snugly 2mm below the logo, with **8mm top clearance** before the Document Title to prevent text collision.
3. **Stacked Left Metadata**:
   - Line 1: `DOCUMENT TITLE` in 12pt Bold uppercase (only title is bold).
   - Line 2: `Generation Date: [Month Day, Year • HH:mm AM/PM]` in 10pt Regular.
   - Line 3: `Generated By: [User Role / Name]` in 10pt Regular.
4. **Data Table Layout (Cargill 29-50 Benchmark)**:
   - Header: Soft Slate fill (`#F1F5F9`), Deep Blue `#1E3A5F` bold text, **center-aligned**.
   - Body Cells: **Left-aligned** (or right-aligned for numbers), thin `#CBD5E1` gridlines.
   - Bottom Row: Bold `#1E3A5F` `TOTAL` row with `#F1F5F9` fill and reinforced border.
5. **Sign-Off & Footer**:
   - Right-aligned `Approved by: MANAGEMENT / OWNER` signature line.
   - Footer: `PORBIDO TMS — CONFIDENTIAL & PROPRIETARY | FOR AUTHORIZED OFFICIAL USE ONLY`, `System-generated document`, and dynamic `Page X of Y`.
6. **Timestamped Filenames**: Always formatted as `[Doc_Name]_[YYYY-MM-DD_HH-mm-ss].[pdf/xlsx]`.

### B. Excel Generation Standards (`exceljs`)
1. **Two-Worksheet Architecture**: Every generated spreadsheet MUST have exactly 2 worksheets:
   - **Worksheet 1 (`Company Info`)**: Embedded PNG brand logo banner, Company Name/Address, Document Audit Profile Card, and Legal & Confidentiality notes.
   - **Worksheet 2 (`Data`)**: Pure formatted table starting at **Row 1** with styled headers (`#F1F5F9` fill, `#1E3A5F` bold text, center-aligned), alternating zebra data rows (`#FFFFFF` / `#F8FAFC`), thin `#CBD5E1` grid borders, bold `TOTAL` summary row with double bottom border, and dynamic auto-fit column widths. NO top titles or metadata clutter in the `Data` worksheet.

## 15. Enterprise UI Kit & Component Invariants

### A. KPI Filter Cards (`<app-filter-card>`)
- **Icon Container**: Modern **rounded square (`rounded-xl`, `w-10 h-10`, `shadow-2xs`)**, NEVER circular (`rounded-full`).
- **Icon Size**: Prominent **`22px`** material icon.
- **Metric Value & Ratio**:
  - Primary number: `text-3xl font-medium text-[#262B35] font-mono`.
  - Ratio Suffix: When `[total]` is provided, display `text-sm font-normal text-slate-400 font-mono ml-1.5` (e.g., `1 / 3` or `2 / 2`).
  - Scoping rule: Role cards (e.g. Drivers, Helpers) must show active count out of total role count (`activeDrivers / totalDrivers`), never overall crew total.
- **Palette Themes**: `blue`, `emerald`, `amber`, `orange`, `violet`, `coral`, `slate`, `neutral`.

### B. Universal Toolbar (`<app-toolbar>`)
- **Grid Layout**: 3-Column Responsive Grid (`md:grid-cols-[auto_1fr_auto]`) to guarantee exact mathematical horizontal centering of the search bar between the left filters and right action buttons.
- **Search Bar**: Explicit `!pl-9` (36px left padding) with `left-2.5` `z-10` icon to prevent text collision.
- **Export Action Dropdown**: Clean, monochrome neutral slate icons (`text-slate-500`) with streamlined labels: **`PDF`** and **`Xlsx`**.

### C. Page Header Typography
- Standard: `<h1 class="text-2xl font-semibold text-[#262B35] tracking-tight">` (using `font-semibold` / 600 weight).

### D. Compact Financial & Allowance Input Cards
- **Uniform Dimensions & Padding**: All 1-row financial cards (e.g., Previous Carryover, Dispatch Allowance, Total Cash on Hand, Driver Salary, Helper Salary) MUST use identical `p-3.5 rounded-xl border` styling with `flex flex-col justify-between shadow-2xs`.
- **Header Alignment**: Header layout MUST be `flex items-center justify-between` with the label on the left and status badge on the right.
- **Input / Metric Placement**: Bottom content container MUST use `mt-2` with `text-xs font-mono font-bold` currency fields or `text-xl font-mono font-bold leading-none` numbers.

### E. Transactions Table & Proof Attachment UX (`<app-transactions-table>`)
- **Full Cell Text Wrapping**: Description cells MUST use `break-words whitespace-normal font-medium text-slate-800 text-xs` to guarantee full text readability without truncation.
- **Color-Coded Financial Columns**:
  - `Credit`: `text-emerald-600 font-bold font-mono` (`+₱...`)
  - `Debit`: `text-rose-600 font-bold font-mono` (`-₱...`)
  - `Balance`: `text-slate-900 font-bold font-mono` (Rose red if negative)
- **Inline Proof & Delete Actions**:
  - Attached proofs show a compact `w-7 h-7 rounded-lg` thumbnail with hover zoom.
  - Unattached rows show a sleek `w-7 h-7` dashed icon button (`add_photo_alternate`).
  - Delete trash button is placed in its own dedicated far-right `Action` column (`w-[50px]`).
- **Reusable Proof Modal**: Proof uploads and views MUST use `<app-proof-modal>` supporting Drag & Drop, File Explorer browsing, and native `Ctrl + V` clipboard paste.

### F. Global Typography Ceiling & Inter Standard
- **Font Family**: Global font is **`Inter`**.
- **Weight Ceiling**: Maximum font weight is strictly capped at **`700` (`font-bold`)**. Standard headings use **`600` (`font-semibold`)**.
- **Weight Prohibition**: Using `font-extrabold` (800) or `font-black` (900) is strictly prohibited across all templates and styles to prevent bulky text.

## 16. Strict Command Fidelity & "Replicate As-Is" Invariant (Gayahin As-Is Rule)
- **Exact Replication Mandate**: When the user instructs to copy, replicate, or match an existing component, input, or pattern (e.g., *"gayahin mo"*, *"same sa..."*, *"mirror..."*, *"kopyahin mo"*), the AI MUST replicate it strictly **AS-IS: nothing more, nothing less**.
- **Thorough Pre-Inspection**: Inspect and assess the reference code first to understand its exact behavior, data structures, and edge cases.
- **Zero Unrequested "Enhancements"**: 
  - NEVER introduce secondary data sources (e.g., merging static store lists into pure database queries).
  - NEVER add unrequested validation errors, alerts, or extra visual indicators.
  - NEVER alter the logic or add "smart" fallbacks unless the user explicitly asks to add or adjust them.
- **Strict Command Compliance**: Follow the user's specific command without guessing missing requirements. If an edge case or detail is omitted by the user, the AI must NOT unilaterally invent additions; user-specified additions/removals are the only allowed modifications.

## 17. Browser Subagent Explicit Approval Mandate
- **Strict Permission Guardrail**: The AI MUST NEVER invoke the `browser_subagent` tool without first explicitly asking for and receiving the USER'S approval.
- **Alternative Verification**: Always default to CLI build validation (`ng build`), unit tests, and source inspections. Only propose using the browser agent when visual layout or browser-specific rendering cannot be verified otherwise, and await the user's explicit go-ahead before executing.

## 18. Modal Viewport Architecture & Teleportation Invariant (`[appModalTeleport]`)
- **The Containing Block Problem**: Any ancestor element with CSS keyframe animation or `transform` (such as `.animate-fade-in-up`) establishes a permanent CSS containing block for `position: fixed` descendants. When the page is scrolled, modals declared inside component templates are displaced upwards by the scroll distance.
- **Mandatory Teleportation**: ALL modal overlays across Porbido TMS (reusable or inline) MUST use `[appModalTeleport]` from `src/app/shared/directives/modal-teleport.directive.ts`:
  - On `ngOnInit`, it appends the modal element directly to `document.body` to guarantee 100% viewport locking and applies `document.body.style.overflow = 'hidden'`.
  - On `ngOnDestroy`, it cleanly removes the element via `this.el.remove()` and restores scrolling.
- **Zero Zombie Resurrection Invariant**: NEVER attempt to re-insert the teleported DOM element back into the component DOM tree during `ngOnDestroy`. Doing so leaves a dead unclickable ghost element in the layout.
