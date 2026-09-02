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
- **Pure Engine**: `FinanceCalculator.calculateFreight(...)`
- **Data Model**: `Trip`, `COHEntry`
- **Pre-Dispatch Flow**:
  - High-speed 3-section modal (< 20 seconds encoding).
  - Numerical `TLO #` format validation & real-time duplicate check against Firestore.
  - 1-Click Master Route Presets (`Subic → Pulilan`, `Pulilan → Iloilo`, `Iloilo → Manila`).
  - Driver & Helper auto-locked from Truck assignment.
  - 2-Tier Cash Custodianship: Driver **`Previous Carryover`** awareness & **`Dispatch Allowance`** credit issuance.
- **Post-Dispatch Flow**:
  - Full 5-step wizard for completed backlogged trips with comprehensive 3-box liquidation.
- **Status Set**: `trip.status = 'DISPATCHED'`, `trip.billingStatus = 'READY_TO_BILL'`, `trip.podStatus = 'PENDING'`.
- **Side Effect**: Marks selected truck and crew member as `In Transit`.

### Stage 3: Ongoing Trip Operations & Tracking (`/trips`)

- **Store**: `DispatchStore`
- **Data Model**: `Trip` (`id`, `tripNumber`, `tloNumber`, `client`, `originFrom`, `destinationTo`, `routeTag`, `truck: { plateNumber, driver, helper }`, `commodity`, `weightTons`, `dispatchedDate`, `deliveredDate`, `status`)
- **8 Consolidated Operation Columns**: `Dispatch Date`, `Client`, `TLO # (Pure TLO & 'Trip# X')`, `Route (Tag & Origin ➔ Destination)`, `Fleet (Plate, Driver, Helper)`, `Truck Rate (Rate & Cargo Weight)`, `Cash on Hand (Isolated Red COH)`, `Status`.
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
- **Context-Aware Categories**:
  - *Credit*: `Dispatch Allowance`, `Additional Allowance`, `ATM / Cash Reload`, `Others`.
  - *Debit*: `Diesel / Fuel`, `Toll Fees`, `Meals / Per Diem`, `Repairs & Maintenance`, `Others`.

### Stage 5: Successful Trip & POD Verification (`/trips/:id`)

- **Store**: `DispatchStore`
- **Data Model**: `trip.podImageUrl`, `trip.podStatus`, `trip.deliveredDate`, `trip.deliveredAt`, `trip.status`
- **Workflow**:
  - Driver submits delivery receipt / POD photo.
  - Dispatcher marks POD as `APPROVED` via `DispatchStore.approvePOD(tripId, url)` (or `FLAGGED_BLURRY`).
  - Dispatcher marks trip as `COMPLETED` via `DispatchStore.completeTrip(tripId)`.
  - Upon completion, trip is stamped with `deliveredDate` timestamp, officially verified, removed from Ongoing Trips, and eligible for billing.

### Stage 6: Billing Queue (`/billing-queue`)

- **Store**: `BillingStore`, `DispatchStore`
- **Criteria**: Displays trips where `billingStatus === 'READY_TO_BILL'` and not already assigned to an active billing batch.
- **Action**: Accountant selects 1 or more trips to bundle into an invoice batch.

### Stage 7: Draft Statement of Account (`/draft-billing/:id`)

- **Store**: `BillingStore`
- **Data Model**: `BillingBatch` (status: `DRAFT`)
- **Features**: Aggregates total tonnage, itemized TLO lines, base freight, re-route fees, and billing adjustments.

### Stage 8: Submitted Billing Statement / Billed (`/printed-billing/:id`)

- **Store**: `BillingStore`, `DispatchStore`
- **State Transition**: Batch status moves from `DRAFT` $\rightarrow$ `SUBMITTED`.
- **Trip Status**: Associated trips are marked `SUBMITTED` / `BILLED` and locked from modification.
- **Output**: Clean A4 print layout via browser `@media print`.

### Stage 9: Client Payment & Remittance (`/printed-billing/:id`)

- **Store**: `BillingStore`
- **Data Model**: `PaymentRecord`
- **Statuses**: `UNPAID` $\rightarrow$ `UNDERPAID` $\rightarrow$ `PAID` (dynamically computed from payments sum vs batch total).

### Stage 10: Bi-Directional Reconciliation (`/reconciliation-workspace/:id`)

- **Store**: `ReconciliationStore`
- **Pure Engine**: `ReconciliationMatchingEngine`
- **Workflow**: 5-pass cross-matching between Porbido SOA and Cargill Statement (`29-50 (1).pdf`).
- **Detected Outcomes**:
  - `RECONCILED` (Exact match)
  - `AMOUNT_MISMATCH` (Weight or rate difference)
  - `UNBILLED_CARGILL` (Recorded by Porbido, omitted by Cargill)
  - `UNRECORDED_PORBIDO` (Present in Cargill statement, missing from Porbido)

### Stage 11: Exception Resolution & Session Closure (`/reconciliation-workspace/:id`)

- **Store**: `ReconciliationStore`, `AuditStore`
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
