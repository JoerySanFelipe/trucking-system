# Porbido Trucking TMS - Project Operating Rules & Architectural Guardrails

## 1. Strict Scope Boundary & Blast-Radius Control (Single-Feature Mandate)

- **Hyper-Focused Execution**: Focus STRICTLY on the specific file, feature, or component requested by the user.
- **Zero Collateral Drift**: NEVER modify, touch, refactor, or "clean up" unrelated files, sibling components, or other pages unless explicitly commanded by the user.
- **No Unsolicited Pre-emptive Changes**: Do not make secondary modifications or anticipatory edits outside the immediate user request.

## 2. Tech Stack & Clean Architecture Standards

- **Framework**: Angular v21+ using **Standalone Components** and **Angular Signals** (`signal()`, `computed()`) for reactive state.
- **Clean Architecture Boundaries**:
  - **Domain Layer**: Pure mathematical invariants (`FinanceCalculator`, `RouteRegistry`, `ReconciliationMatchingEngine`) completely decoupled from Angular UI.
  - **Application Layer**: Domain-isolated Signal Stores (`DispatchStore`, `BillingStore`, `ReconciliationStore`, `FleetStore`, `AuditStore`). Presentation components inject stores directly.
  - **Infrastructure Layer**: Cloud Firestore adapters, Cloud Storage, and discrete report builders (`PdfTableBuilder`, `ExcelWorkbookBuilder`).
  - **Presentation Layer**: Thin, accessible UI components consuming reactive store signals.

## 3. Cloud Firestore & State Persistence Invariants (Anti-Bug Guardrails)

- **Dual-Track Persistence**: Every state mutation (Create, Update, Delete) MUST be twin-tracked: update the Signal store optimistically AND immediately persist to Cloud Firestore (`saveDocument`, `updateDocument`, `deleteDocument`). NEVER maintain state in in-memory signals only.
- **Complete Entity Serialization**: All serializer methods (e.g. `serializeCleanTripForFirestore`) must preserve all relational attributes (including `billingBatchId`, `billingStatus`, timestamps). Never drop fields during serialization.
- **RxJS Subscription Leak Prevention**: Any Observable subscription (e.g. `ActivatedRoute.paramMap`) MUST be bounded with `takeUntilDestroyed(this.destroyRef)` to eliminate memory leaks on navigation.

## 4. Porbido-Cargill Business Rules & Math Invariants

- **Travel Load Order (TLO#)**: Must be a strict, non-empty, unique numerical string (e.g., `904816`).
- **Fleet Assets**: 10-Wheeler Heavy Trucks strictly restricted to registered fleet assets (`CCK 5273`, `NAK 2202`, `CAK 2693`, `CAO 3510`, `RHA 965`).
- **Freight & Rate Formulas**:
  $$\text{PER\_TON}: \text{Freight Charge} = (\text{Tonnage} \times \text{Base Rate}) + \text{Re-route Fee } (₱3,600) + \text{Extra Fees}$$
  $$\text{FLAT\_RATE}: \text{Freight Charge} = \text{Base Rate} + \text{Re-route Fee } (₱3,600) + \text{Extra Fees}$$
  - Master Routes: `Subic Port → Pulilan` (₱1,100/ton, 10-40T), `Pulilan → Iloilo` (₱144k Flat), `Iloilo → Manila Container Terminal` (₱95.5k Flat), Re-route fee (₱3,600).
- **Zero Inline Math Invariant**: Never compute freight charges, crew salaries, or liquidation balances inline in HTML templates. Always route through `FinanceCalculator` or `RouteRegistry`.
- **Three-Box Liquidation Invariants**:
  1. $\text{Cash-on-Hand Balance} = \text{Total Cash on Hand} - (\text{Expenses} + \text{Diesel})$
  2. $\text{Net Salary Payable} = \text{Base Pay} - \text{Cash Advance Deductions}$
  3. $\text{Net Trip Income} = \text{Gross Freight} - (\text{Expenses} + \text{Diesel} + \text{Crew Salaries})$
- **Strict Financial Terminology**:
  - Operating cash for trips = **`Total Cash on Hand`** (or `Driver Cash Allowance`), NEVER "Trip Cash Advance".
  - Salary deductions = **`Cash Advance`**.
- **Four-State Reconciliation**: `RECONCILED`, `AMOUNT_MISMATCH`, `UNBILLED_CARGILL`, `UNRECORDED_PORBIDO`.

## 5. UI Design System & Typography Ceiling

- **STRICT Light Mode ONLY**: Enterprise Light Mode palette (`#FFFFFF`, `#F8FAFC`, `#1E3A5F / #2563EB`, `#16A34A`). Dark mode is permanently prohibited.
- **Design System CSS Classes**: Always use `.card`, `.btn-primary`, `.btn-secondary`, `.badge-*`, `.form-input`, `.data-table` from `src/styles.css`.
- **Typography Ceiling**: Global font is **`Inter`**. Maximum font weight is strictly capped at **`700` (`font-bold`)**. Standard headings use **`600` (`font-semibold`)**. `font-extrabold` (800) and `font-black` (900) are strictly prohibited across all templates.
- **Currency Format**: All ₱ amounts must use `font-mono tabular-nums` and `| number:'1.2-2'`.

## 6. Modal Viewport Architecture (`[appModalTeleport]`)

- **Mandatory Teleportation**: ALL modal overlays across Porbido TMS (reusable or inline) MUST use `[appModalTeleport]` from `src/app/shared/directives/modal-teleport.directive.ts` to prevent CSS containing block displacement during page scroll.
- **Zero Zombie Resurrection**: Clean up on unmount via `this.el.remove()`; never re-insert teleported elements into the component DOM tree.

## 7. Command Fidelity & "Replicate As-Is" Invariant (Gayahin As-Is Rule)

- **Exact Replication Mandate**: When the user instructs to copy, replicate, or match an existing component or pattern (_"gayahin mo"_, _"same sa..."_, _"kopyahin mo"_), replicate it strictly **AS-IS: nothing more, nothing less**.
- **Zero Unrequested "Enhancements"**: NEVER introduce secondary data sources, extra validation errors, alert boxes, or layout alterations unless explicitly requested. Follow specific user commands without guessing missing details.

## 8. Verification & Subagent Guardrails

- **Browser Subagent Explicit Approval Mandate**: NEVER invoke `browser_subagent` without first receiving explicit user approval.
- **Compiler Proof Verification**: Always validate changes via CLI compilation (`npx ng build --configuration=development` = Exit Code 0) before reporting completion. Never assume code works without compiler proof.
- **Lifecycle & Progress Logging**: Update `PROJECT_PROGRESS.md` and verify `docs/ENTERPRISE_SYSTEM_FLOW.md` upon completing feature implementations, bug fixes, or schema changes.
