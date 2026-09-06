# Porbido Trucking TMS - Enterprise System Design & Operational Flow

> **Official Blueprint**: This document codifies the 12-stage end-to-end operational and financial lifecycle of the **Porbido Trucking Transportation Management System (TMS)**. All features, data transitions, components, and signal stores must adhere to this flow.

---

## 🗺️ 1. Master 12-Stage Lifecycle Diagram

```text
[START]
   │
   ▼
1. FLEET ASSET & CREW SETUP (/fleet)
   - Heavy 10-Wheelers (CCK 5273, NAK 2202, CAK 2693, CAO 3510, RHA 965)
   - Crew Roster (Drivers & Helpers)
   │
   ▼
2. SMART DISPATCH REGISTRATION (/dispatch)
   - Client Combobox Selection & Validation (Row 1 of Shipment & Assignment)
   - Strict TLO# Entry & Duplicate Validation
   - Route Auto-fill (Subic → Pulilan, Pulilan → Iloilo, Iloilo → Manila)
   - Truck Plate Selection → Auto-assigned Driver & Helper
   - Real-time Freight Automath (FinanceCalculator)
   - Pre-Dispatch Crew Salary Defaults to ₱0.00 (Configured/inputted in Trip Details Overview)
   - Saves to Firestore `/dispatches` → Sets Truck/Driver to "In Transit"
   │
   ▼
3. ONGOING TRIPS & OPERATIONS HUB (/trips)
   - Operational Monitoring (Dispatch Date, Client, TLO#, Route, Truck, Driver, Cargo/Weight, Cash On Hand, Expenses, Status, Action)
   - Multi-parameter Filtering & Real-time KPI Stat Cards
   - Canonical Completion Transition: Marked `COMPLETED` transitions to `READY_TO_BILL`
   │
   ▼
4. CASH-ON-HAND (COH) LEDGER & EXPENSES (/trips/:id -> Cash Ledger)
   - Driver Cash Allowance / Advances Sent (Credit Inflows)
   - Fuel/Diesel, Tolls (RFID), Food, Repairs, Incidentals (Debit Outflows)
   - Smart Description Combobox with Real-Time Database Suggestions (Top-5 Capped)
   - Three-Box Box 1: Short/Over Balance Calculation
   │
   ▼
5. SUCCESSFUL TRIP & POD VERIFICATION (/trips/:id -> Documents & /completed-trips)
   - Delivery Completed & Cargo Inspected
   - Completed Trips Hub (/completed-trips): Financial & Cash Liquidation Audit
   - Driver Submits Signed Proof of Delivery (POD)
   - Dispatcher Approves POD → Status updates to `READY_TO_BILL` (Unbilled Freight)
   │
   ▼
6. BILLING QUEUE BATCHING (/billing-queue)
   - Filter & Aggregate all Verified Unbilled Trips (`READY_TO_BILL`)
   - Dispatcher/Accountant selects trips and clicks "Create Draft Billing"
   │
   ▼
7. DRAFT STATEMENT OF ACCOUNT (/draft-billing -> /draft-billing/:id)
   - Grouped Statement Batch (`BILL-2026-XXXX`)
   - A4 Landscape Document Preview matching Cargill Invoice standards
   - Tonnage & Freight Aggregation + Optional Adjustments
   │
   ▼
8. SUBMITTED BILLING STATEMENT / BILLED (/printed-billing -> /printed-billing/:id)
   - Accountant clicks "Submit Billing Statement" → Locked & Immutable
   - Trip Status transitions from `READY_TO_BILL` to `SUBMITTED` / `BILLED`
   - Formal Document Printout via `@media print`
   │
   ▼
9. CLIENT PAYMENT & REMITTANCE (/printed-billing/:id -> Record Payment)
   - Cargill Remits Payment according to 30-day terms
   - Payment Recorded (Bank Deposit, Check, Cash, Reference #, Receipt Attachment)
   - Payment Status: `UNPAID` → `UNDERPAID` → `PAID`
   │
   ▼
10. BI-DIRECTIONAL RECONCILIATION (/reconciliation-workspace -> /reconciliation-workspace/:id)
    - Porbido Internal SOA vs Cargill Official Statement (`docs/29-50 (1).pdf`)
    - Deterministic 5-Pass Cross-Matching Engine using `TLO#`
    - Identifies: `RECONCILED`, `AMOUNT_DISCREPANCY`, `UNBILLED_CARGILL`, `UNRECORDED_PORBIDO`
    │
    ▼
11. EXCEPTION RESOLUTION & SESSION CLOSURE (/reconciliation-workspace/:id -> Exceptions)
    - Resolve Discrepancies (`ACCEPT_PORBIDO`, `ACCEPT_CLIENT`, `ADJUSTMENT`, `DISPUTED`)
    - Generates Immutable Audit Trail → Locks Session to `CLOSED`
    │
    ▼
12. CREW PAYROLL & SALARY SETTLEMENT (/payroll & /reports)
    - Calculates Driver & Helper Trip Commission (`Box 2`)
    - Deducts Cash Advances (CA) & Shortage Deficits
    - Generates Printable Payslips & Liquidates Driver Ledger
    │
    ▼
[END OF TRIP LIFECYCLE]
```

---

## 🗂️ 2. Detailed Stage Breakdown & Data Model Transitions

### Stage 1: Fleet & Crew Setup (`/fleet`)

- **Store**: `FleetStore`
- **Collections**: `/fleet` (or `/trucks`), `/crew`
- **Data Models**: `Truck`, `CrewMember`
- **Structure**:
  - `Truck`: `plateNumber`, `status`, `tonsCapacity`, `assignedCrew: { driver, helper }`, `maintenanceLogs: MaintenanceRecord[]`.
  - `CrewMember`: `name`, `role`, `type`, `status`, `contactNumber`, `email`, `password`, `cashAdvances: CashAdvanceRecord[]`, `salaries: CrewSalaryRecord[]`.
- **Key Actions**: Register 10-wheeler trucks and crew members (Drivers & Helpers) with active status.

### Stage 2: Smart Dispatch Registration (`/dispatch`)

- **Store**: `DispatchStore`, `FleetStore`
- **Pure Engine**: `FinanceCalculator.calculateFreight(...)`, `RouteRegistry.MASTER_CARGILL_ROUTES`
- **Data Model**: `Trip`, `COHEntry`
- **Pre-Dispatch Flow**:
  - High-speed 3-section modal (< 20 seconds encoding).
  - Numerical `TLO #` format validation & real-time duplicate check against Firestore.
  - 1-Click Master Route Presets from `RouteRegistry` (`Subic → Pulilan`, `Pulilan → Iloilo`, `Iloilo → Manila`).
  - Driver & Helper auto-locked from Truck assignment.
  - 2-Tier Cash Custodianship: Driver **`Previous Carryover`** awareness & **`Dispatch Allowance`** credit issuance.
- **Post-Dispatch Flow**:
  - Full 5-step wizard for completed backlogged trips with comprehensive 3-box liquidation.
- **Status Set**: `trip.status = 'DISPATCHED'`, `trip.billingStatus = 'READY_TO_BILL'`, `trip.podStatus = 'PENDING'`.
- **Side Effect**: Marks selected truck and crew member as `In Transit`.

### Stage 3: Ongoing Trip Operations & Tracking (`/trips`)

- **Store**: `DispatchStore`
- **Data Model**: `Trip` (`id`, `tripNumber`, `tloNumber`, `client`, `originFrom`, `destinationTo`, `routeTag`, `truck: { plateNumber, driver, helper }`, `commodity`, `weightTons`, `dispatchedDate`, `deliveredDate`, `status`)
- **8 Consolidated Operation Columns (UI View)**: `Dispatch Date`, `Client`, `TLO # (Pure TLO & 'Trip# X')`, `Route (Tag & Origin ➔ Destination)`, `Fleet (Plate, Driver, Helper)`, `Truck Rate (Rate & Cargo Weight)`, `Cash on Hand (Isolated Red COH)`, `Status`.
- **Report Generation (PDF & Excel)**:
  - Decouples composite fields into 20 atomic data columns under 7 categorical super-headers (`IDENTIFIERS`, `ROUTE`, `FLEET`, `FINANCIALS`, `TRANSACTIONS (COH)`, `PAYROLL`, `PROFITABILITY`).
  - PDF formatted on 8.5" x 13" Landscape Philippine Long Bond Paper (Folio) with custom 279mm column budget, 6.8pt typography, and column-level numeric alignment.
  - Excel formatted with 2 worksheets (`Company Info` and `Data`), Row 1 merged super-headers, Row 2 sub-headers, frozen panes (`ySplit: 2`), and native `#,#00.00` numeric cells.
- **Row Interaction**: Whole row is clickable (`(click)="navigateToTrip(trip.id)"`) redirecting seamlessly to Trip Details (`/trips/:id`). Delete trip action is permanently relocated into Trip Details View.
- **Status Options**: `DISPATCHED` $\rightarrow$ `IN_TRANSIT` $\rightarrow$ `ARRIVED` $\rightarrow$ `FOR_REVIEW`.
- **Completion Transition**: Marking a trip as `COMPLETED` automatically drops it from the Ongoing Trips view and promotes it to Completed / Billing eligibility.

### Stage 4: Cash-on-Hand (COH) Ledger & Driver Carryover Engine (`/trips/:id` & `/dispatch/post-dispatch`)

- **Stores**: `DispatchStore`, `FleetStore`
- **Pure Engine**: `FinanceCalculator.calculateCashAccountability(...)`, `FinanceCalculator.calculateTripPnl(...)`
- **Data Models**: `TripCostItem[]`, `COHEntry[]`, `CrewMember.currentCOHBalance`, `Trip.previousCarryover`, `Trip.endingCOHBalance`
- **2-Tier Architecture**:
  - **Tier 1 (Driver Running Balance in `/crew`)**: Tracks continuous driver cash accountability (`currentCOHBalance`, `cohBalanceType`, `lastTripId`, `lastTloNumber`).
  - **Tier 2 (Trip Historical Snapshot in `/dispatches`)**: Stores immutable snapshot (`previousCarryover: { amount, type, fromTripId, fromTloNumber }`) preventing historical tampering.
- **Three-Box Liquidation Invariant (Box 1)**:
  $$\text{Ending Cash Balance} = (\text{Starting Cash Advance} + \text{Previous Carryover} + \text{Additional Cash}) - \text{Operating Expenses Spent}$$
- **Context-Aware Categories & Optional Selection**:
  - *Credit*: `Dispatch Allowance`, `Additional Cash`, `Others`.
  - *Debit*: `Fuel`, `Toll Fees`, `Meals / Foods`, `Maintenance`, `Others`.
  - *Optional Category Selection*: Add Cash Entry modal features an optional Category dropdown alongside Description (default/fallback: `None` $\rightarrow$ `Others`), persisting `category` in `COHEntry` to cleanly drive the Financials Crew Expenses card (`Fuel`, `Toll Fees`, `Meals / Foods`, `Maintenance`, `Others`, and `Total Crew Expenses`).
  - *Automatic Trip Progression Trigger*: Recording any crew expense / Debit transaction (Fuel, Toll, Meals, Maintenance, etc.) on a `DISPATCHED` trip automatically transitions its status to `IN_TRANSIT` across Firestore dispatches, `DispatchStore`, and `TmsService`.
- **Freight Revenue Controls (Post-Dispatch & Edit Trip Forms)**:
  - Step 4 allows inputting both **`Re-route Fee`** (Standard ₱3,600) and **`Extra / Demurrage Fees`**, dynamically recalculating gross freight revenue and persisting them cleanly into `Trip.pricing`.
- **Interactive Receipt Proof Inspection & Safeguards**:
  - Centralized `<app-proof-modal>` provides unified inspection across `<app-transactions-table>` and Tab 3 Image Proofs gallery with click-to-fullscreen lightbox, smooth pan & zoom (0.5x–3.5x), 90° clockwise rotation cycling, and keyboard shortcuts (`ESC`, `+`/`-`, `R`, `0`).
  - Streamlined Single-Row Action Bar: Left-aligned "Flag Blurry / Issue" / "Clear Flag" button, with right-aligned icon-only Replace (`swap_horiz`) and Remove (`delete`) action buttons.
  - Cash Ledger Entry Deletion Safeguard: Deleting transaction rows triggers a dedicated confirmation modal displaying description, type (Credit/Debit), and amount before balance recalculation.
  - Proof Removal Safeguard: Detaching a receipt photo from a record is protected by an explicit confirmation modal.

### Stage 5: Successful Trip & POD Verification (`/trips/:id`)

- **Store**: `DispatchStore`
- **Data Model**: `trip.podImageUrl`, `trip.podStatus`, `trip.deliveredDate`, `trip.deliveredAt`, `trip.status`
- **Workflow**:
  - Driver submits delivery receipt / POD photo.
  - Dispatcher verifies document in Tab 3 Image Proofs gallery with full-viewport interactive lightbox inspection (`ImageLightboxComponent`) to check client stamps, cargo scale weights, and signatures.
  - Dispatcher inspects expense receipt proofs with dual Credit (emerald) / Debit (red) badge classification, monetary amount visibility, and multi-criteria dropdown filtering (`Credit Only`, `Debit Only`, `Flagged Issues Only`).
  - Dispatcher flags issue via "Flag Blurry / Issue" protected by an enterprise confirmation modal, updating status to `FLAGGED_BLURRY` for audit review across dispatch and billing ledgers.
  - Dispatcher clears flags via "Clear Flag" protected by a dedicated confirmation modal, restoring status to `APPROVED` and clearing flagged audit notes.
  - Operational Status Safeguards: Changing live trip status triggers a dedicated confirmation modal referencing TLO # and displaying Current Status ➔ New Status.
  - Delete Trip Safeguard: Permanent deletion modal references primary TLO # followed by `(Trip #...)` and fleet plate number.
  - Upon completion, trip is stamped with `deliveredDate` timestamp, officially verified, removed from Ongoing Trips, and eligible for billing.
- **Trip Details Multi-Page Report Generation Architecture (PDF & Excel)**:
  - **Executive 3-Page Audit Dossier (PDF)**: Formatted strictly on 8.5" x 13" Philippine Long Bond Paper in **LANDSCAPE** (Folio: 330.2mm × 215.9mm) with 25.4mm margins (279.4mm printable width canvas) per Rule 14.A & Rule 16 ("Gayahin As-Is"):
    - `Page 1: Trip Overview, Operations, Billing, & Financial Statement`:
      - Official Unified Header: Porbido brand logo (left), center-aligned Company Name (`PORBIDO TRUCKING & HAULING SERVICE`) & Address (`ZONE 1 SAN VICENTE EAST, URDANETA CITY`), solid `#2563EB` rule, Document Title (`TRIP DETAILS REPORT`), timestamp, and `Generated By: Operations Administrator`.
      - 3 side-by-side upper tables: `OVERVIEW` (TLO#, Trip#, Client, Dispatched, Status, Completed), `OPERATIONS` (Route Tag, Fleet Plate, Driver, Helper, Commodity, Bags), and `BILLING DETAILS` (Billing Status, SA Number, Billing Date, Amount, Reconciliation Ref/Status placeholders).
      - 3 side-by-side middle financial tables: `GROSS FREIGHT REVENUE` (Base Rate, Scale Weight, Subtotal, Re-route Fee, Extra, Total Gross Freight), `CREW EXPENSES` (Fuel, Toll Fees, Meals / Foods, Maintenance, Others, Total Crew Expenses), and `CREW COMPENSATION` (Driver Salary, Helper Salary, Total Crew Payroll).
      - `Trip Financial Statement` table: Emphasized summary statement with +9.5mm breathing room, centered headers (`ITEM`, `CATEGORY`, `SUBTOTAL (P)`, `NET IMPACT`), and Net Trip Income & Profitability with Net Margin %.
      - Official Sign-Off: `Approved by: MANAGEMENT / OWNER` strictly on Page 1 only (no signature lines on subsequent pages).
    - `Page 2: Cash Flow Summary & Transactions`:
      - Official Corporate Header on all pages: Brand logo, center-aligned Company Name & Address, solid Deep Blue `#2563EB` rule.
      - Simplified Trip Details below header: `TLO Number: [tloNum]` as bold title, followed by data-only lines (`Trip Number: [tripNum] • [dispatchDate]`, `[ROUTETAG] • [origin] >  [destination]`, `[STATUS] • [completedDate]`), with horizontal divider rule for standalone page printing.
      - 4-column `Cash Flow Summary` table (`PREVIOUS CARRYOVER`, `CASH ON HAND`, `CREW EXPENSES`, `ENDING CASH ON HAND` with secondary status captions).
      - 5-column `Transactions` table: Centered headers (`DATE`, `DESCRIPTION`, `CREDIT`, `DEBIT`, `BALANCE`), streamlined section title, and transaction counter embedded in the footer `DESCRIPTION` column (`[Count] Transactions`). Supports automatic pagination for larger datasets with `didDrawPage` hook for Corporate Header and simplified details repetition (`margin.top: 55`).
    - `Last Page: Proof / Receipt Images`:
      - Clean dedicated page(s) with Corporate Header & Simplified Trip Details, titled `"Proof / Receipt Images"`, with 3x2 image grid (maximum 6 images per page: 89mm × 65mm) featuring rounded border framing, padding, and zero individual text descriptions. Multi-page pagination when receipts exceed 6.
      - Proof assets are retrieved via Firebase Storage SDK byte streaming (`getBytes` + `FileReader` on `Blob`), bypassing browser CORS limitations when running locally or on custom domains, with defensive multi-source aggregation across `trip.podImageUrl`, `proofs[]`, and `cashLedger.entries[].proofUrl`. Multi-format support handles PNG, JPEG, and WEBP.
    - `Universal Multi-Page Footer`:
      - Page 1: `PORBIDO TMS — CONFIDENTIAL & PROPRIETARY | FOR AUTHORIZED OFFICIAL USE ONLY` + dynamic `Page X of Y`.
      - Page 2+: `PORBIDO TMS — CONFIDENTIAL & PROPRIETARY | FOR AUTHORIZED OFFICIAL USE ONLY | [Generation Date • Timestamp]` + dynamic `Page X of Y` (applied universally across all enterprise PDF exports).
  - **Multi-Tab Excel Workbook Export (`exportTripDetailsToExcel`)**:
    - Tab 1: `Company Info` (Official brand logo banner, company name, address, generation timestamp, document audit profile card, and confidentiality notice).
    - Tab 2: `Overview & Financials` (Pure data with dedicated spacer columns and vertical breathing rows; 3 operational cards, 3 financial breakdown cards, and definitive `TRIP FINANCIAL STATEMENT` with native `#,##0.00` formatting and zero unpopulated field defaulting).
    - Tab 3: `Cash Flow & Transactions` (4-Column Cash Flow summary with previous carryover and ending balance, full chronological transactions journal with `+#,##0.00` and `-#,##0.00` number formatting, running balance, and double-bottom-border TOTAL summary row).
    - Tab 4: `Proof Images` (Streamlined 2-column manifest: `Description` and `Image link` with interactive `Open Document` button pointing strictly to the actual image URL from the database / Firebase Storage, with zero local system redirects and 100% OpenXML-safe 2,000-char relationship bounds).

### Stage 6: Billing Queue (`/billing-queue`)

- **Store**: `BillingStore`, `DispatchStore`
- **Collection**: `/dispatches`
- **Criteria**: Displays trips where `billingStatus === 'READY_TO_BILL'` and not already assigned to an active billing batch (`billingBatchId === null || undefined`).
- **Action**: Accountant selects 1 or more trips to bundle into an invoice batch.

### Stage 7: Draft Statement of Account (`/draft-billing/:id`)

- **Store**: `BillingStore`
- **Collection**: `/billingBatches`
- **Data Model**: `BillingBatch` (status: `DRAFT`)
- **Features**: Aggregates total tonnage, itemized TLO lines, base freight, re-route fees, and billing adjustments. Real-time Cloud Firestore persistence guarantees draft batches survive page reloads.
- **Trip Matching Invariant**: Resilient dual lookup matching by either `t.billingBatchId === currentBatch.id` OR `currentBatch.tripIds.includes(t.id)`.

### Stage 8: Submitted Billing Statement / Billed (`/printed-billing/:id`)

- **Store**: `BillingStore`, `DispatchStore`
- **Collections**: `/billingBatches`, `/dispatches`
- **State Transition**: Batch status moves from `DRAFT` $\rightarrow$ `SUBMITTED`.
- **Trip Status**: Associated trips are marked `billingStatus = 'SUBMITTED'` in Cloud Firestore and locked from modification.
- **Output**: Clean A4 print layout via browser `@media print`.

### Stage 9: Client Payment & Remittance (`/printed-billing/:id`)

- **Store**: `BillingStore`
- **Collection**: `/payments`
- **Data Model**: `PaymentRecord`
- **Statuses**: `UNPAID` $\rightarrow$ `UNDERPAID` $\rightarrow$ `PAID` (dynamically computed from payments sum vs batch total).
- **Cloud Sync**: Every recorded payment is persisted to `/payments` and dynamically updates the balance due.

### Stage 10: Bi-Directional Reconciliation (`/reconciliation-workspace/:id`)

- **Store**: `ReconciliationStore`
- **Collections**: `/reconciliationSessions`, `/reconciliationExceptions`
- **Pure Engine**: `ReconciliationMatchingEngine` (High-performance $O(1)$ composite bucket pre-indexing & epsilon-safe currency variance detection)
- **Workflow**: 5-pass cross-matching between Porbido SOA and Cargill Statement (`29-50 (1).pdf`).
- **Detected Outcomes**:
  - `RECONCILED` (Exact match within ₱0.01 epsilon)
  - `AMOUNT_MISMATCH` (Weight or rate difference)
  - `UNBILLED_CARGILL` (Recorded by Porbido, omitted by Cargill)
  - `UNRECORDED_PORBIDO` (Present in Cargill statement, missing from Porbido)

### Stage 11: Exception Resolution & Session Closure (`/reconciliation-workspace/:id`)

- **Store**: `ReconciliationStore`, `AuditStore`
- **Collections**: `/reconciliationExceptions`, `/reconciliationAdjustments`, `/reconciliationSessions`
- **Actions**: `ACCEPT_PORBIDO`, `ACCEPT_CLIENT`, `ADJUSTMENT`, `DISPUTED`.
- **Lock**: Generates `ReconciliationSnapshot` and sets status to `CLOSED`.

### Stage 12: Crew Payroll & Settlement (`/payroll`, `/reports`)

- **Pure Engine**: `FinanceCalculator.calculateCrewNetPay(...)`
- **Data Models**: `CrewSalaryRecord[]`, `CashAdvanceRecord[]`
- **Three-Box Liquidation Invariant (Box 2 & 3)**:
  $$\text{Net Salary Payable} = \text{Gross Base Pay} - \text{Cash Advance Deductions}$$
  $$\text{Net Company Income} = \text{Gross Freight Revenue} - (\text{Total Trip Cost} + \text{Crew Payroll})$$
- **Output**: Individual payslips with optional remittance proof image (CASH as default) and 3-Box settlement reports.

---

## 🔒 3. System Invariants & Guardrails Summary

1. **Strict TLO Key**: The numerical `TLO#` is the immutable primary cross-referencing key across Dispatch, Billing, and Reconciliation.
2. **Decoupled Financial Consoles**:
   - Profitability (`Gross Freight - Total Trip Cost = Net Income`) NEVER mixes with Cash Accountability (`Cash on Hand - Spent = Ending Balance`).
3. **Immutability of Submitted SOA**: Once a Billing Batch is `SUBMITTED`, its trips and financial figures are permanently locked.
4. **Pure Mathematical Delegation**: Zero inline financial calculations in Angular templates or components; all math is routed through `FinanceCalculator`.
5. **Clean Grouped Firestore Schema**: All documents saved to `/dispatches` strictly adhere to the 7-section grouped hierarchy (`route`, `cargo`, `truck`, `pricing`, `payroll`, `cashLedger`, plus core identifiers & timestamps), eliminating legacy duplicate fields (`originFrom`, `destinationTo`, `costItems`, `baseRate`, `freightRevenue`, and root crew strings).
