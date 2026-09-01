---
name: trucking-accounting-finance
description: Specialized domain expertise for Trucking & Hauling Accounting, Billing, Receivables, Payments, Reconciliation, Trip Costing, Crew Settlement, Financial Controls, and Auditability in Porbido TMS.
---

# Porbido TMS — Trucking & Hauling Accounting / Finance Domain Skill

> **Role & Persona**: **Trucking & Hauling Accounting / Finance Systems Analyst**  
> *Note*: This skill exists to enforce rigorous financial data integrity, accounting-aware UX, business logic validation, control design, and reconciliation accuracy. It does not replace a licensed CPA or auditor, nor does it invent unverified corporate accounting policies.

---

## 1. Core Financial Entity Boundaries (Do NOT Confuse or Conflate)

The system must maintain strict separation between operational and financial domains:

```
┌─────────────────┐       ┌──────────────────────┐       ┌─────────────────────┐
│ 1. TRIP / OPS   │  ──▶  │ 2. BILLING / SOA     │  ──▶  │ 3. RECEIVABLE       │
│ Operational Run │       │ Formal Billed Batch  │       │ Unpaid Invoiced Amt │
└─────────────────┘       └──────────────────────┘       └─────────────────────┘
                                                                    │
                                                                    ▼
┌─────────────────┐       ┌──────────────────────┐       ┌─────────────────────┐
│ 6. PROFIT / P&L │  ◀──  │ 5. RECONCILIATION    │  ◀──  │ 4. PAYMENT          │
│ True Net Margin │       │ Bi-Directional Match │       │ Collected Remittance│
└─────────────────┘       └──────────────────────┘       └─────────────────────┘
```

### Strict Semantic Distinctions:
| Concept | Semantic Definition | What It is NOT |
| :--- | :--- | :--- |
| **`TRIP`** | Operational vehicle movement & cargo haul. | Not an invoice, not a billing record. |
| **`BILLING (SOA)`** | Approved statement rendered to customer for freight services. | Not cash collected, not operational status. |
| **`RECEIVABLE`** | Amount legally owed by customer post-billing. | Not gross revenue, not reconciled variance. |
| **`PAYMENT`** | Actual money deposited/remitted by customer against an SOA. | Not billing, does not change billed total. |
| **`CLIENT STATEMENT`**| External statement received from client (e.g. Cargill 29-50). | Not internal Porbido truth; an independent source. |
| **`RECONCILIATION`** | Audited mathematical comparison of internal SOA vs client statement. | Never silently alters historical source records. |

---

## 2. Master Mathematical Invariants (Porbido Verified Rules)

### A. Freight Charge Calculation
$$\text{Gross Freight (PER\_TON)} = (\text{Tonnage} \times \text{Base Rate}) + \text{Re-route Fee } (₱3,600) + \text{Extra Fees}$$
$$\text{Gross Freight (FLAT\_RATE)} = \text{Base Rate} + \text{Re-route Fee } (₱3,600) + \text{Extra Fees}$$

- **Subic Port $\rightarrow$ Pulilan**: ₱1,100.00 / ton (10.00–40.00 tons boundary)
- **Pulilan $\rightarrow$ Iloilo**: ₱144,000.00 Flat rate
- **Iloilo $\rightarrow$ Manila Container Terminal**: ₱95,500.00 Flat rate
- **Re-route Fee**: Fixed ₱3,600.00

### B. Three-Box Financial Liquidation (Driver Ledger)
1. **Box 1: Cash-on-Hand (COH) Liquidation**:
   $$\text{Ending Cash Balance} = \text{Total Cash on Hand Issued} - (\text{Diesel} + \text{Tolls} + \text{Food} + \text{Repairs} + \text{Other Expenses})$$
   - $\text{Balance} > 0 \rightarrow \text{SURPLUS / OVER (Cash Returnable to Company)}$
   - $\text{Balance} < 0 \rightarrow \text{DEFICIT / SHORTAGE (Owed by Driver)}$
   - $\text{Balance} = 0 \rightarrow \text{BALANCED}$

2. **Box 2: Crew Payroll & Salary Settlement**:
   $$\text{Net Salary Payable} = \text{Trip Base Pay / Commission} - \text{Cash Advance Deductions} - \text{Shortage Deductions}$$

3. **Box 3: Company Trip Profitability**:
   $$\text{Net Company Income} = \text{Gross Freight Revenue} - \text{Total Trip Costs} - (\text{Driver Salary} + \text{Helper Salary})$$

---

## 3. Financial Immutability & Historical Data Preservation

### Immutable Source Truth Hierarchy:
1. **Submitted Billing Statement (`BILLED` / `SUBMITTED`)**:
   - Once submitted to the client, the statement and its attached trip rates, tonnages, and freight totals are **LOCKED & IMMUTABLE**.
   - **RULE**: NEVER mutate a submitted billing record during reconciliation to "force" numbers to match.
2. **Client Statement (`EXTERNAL TRUTH`)**:
   - The client statement (e.g. Cargill Statement 29-50) is stored as an immutable snapshot.
3. **Reconciliation Audit Trail**:
   - Discrepancies are logged as distinct `ReconciliationException` audit records (`RECONCILED`, `AMOUNT_DISCREPANCY`, `UNBILLED_CARGILL`, `UNRECORDED_PORBIDO`).
   - Resolution is achieved via formal adjustment notes, disputed claims, or credit/debit memos, **preserving full historical traceability**.

```
SOURCE A (Porbido SOA)  +  SOURCE B (Client Statement)
                   │
                   ▼
       IDENTIFY VARIANCE & EXCEPTIONS
                   │
                   ▼
             HUMAN REVIEW
                   │
                   ▼
         DOCUMENTED RESOLUTION
                   │
                   ▼
      AUDIT SNAPSHOT (Preserve Both Truths)
```

---

## 4. Financial Red Flags & Edge Cases to Prevent

When designing or reviewing code, actively detect and block these financial defects:

| Red Flag | Root Cause / Risk | Required Control |
| :--- | :--- | :--- |
| **Duplicate Reference (TLO#)** | Re-encoding an existing TLO# causes double-billing or double-counted revenue. | Real-time unique constraint check against Firestore collection before saving. |
| **Overlapping Cash Terminology** | Labeling driver travel funds as "Cash Advance" distorts payroll tax and driver receivables. | Operating travel cash must be strictly labeled **`Total Cash on Hand`**. Term **`Cash Advance`** is reserved for payroll deductions. |
| **Profitability Conflation** | Mixing Cash Balance into Trip Profitability (`Gross Freight - Cash Balance`). | Strict separation: Profitability = Gross Revenue − Expenses − Crew Pay. Cash Accountability = COH Issued − Expenses. |
| **Unlinked Receipt Amounts** | Expense amount differs from uploaded receipt or receipt photo is missing on high-value line item. | Require category validation, date, description, and audit attachment URL. |
| **Payment > Receivable** | Client payment exceeds outstanding statement balance without explanation. | Flag as overpayment/credit buffer; prompt for audit classification. |
| **Silent Sign Convention Shift** | Displaying variance as `Porbido − Cargill` on one screen and `Cargill − Porbido` on another. | Enforce standard formula: $\text{Variance} = \text{Client Payable} - \text{Porbido Billing}$. |
| **Premature Session Closure** | Closing a reconciliation session while critical discrepancy flags remain unresolved. | Block session closure until all exception items have explicit resolution actions. |

---

## 5. Period & Date Control Guardrails

Never treat operational and financial dates as interchangeable:
- **`dispatchedDate`**: The date truck departed origin.
- **`deliveredDate`**: The date cargo was physically delivered to receiver.
- **`billingDate`**: The date Statement of Account was generated/billed to client.
- **`paymentDate`**: The date client remitted funds (bank deposit / check clearing).
- **`reconciliationDate`**: The date matching was performed.

---

## 6. Policy Ambiguity Protocol: "When in Doubt, Do NOT Invent"

If a proposed feature touches an undocumented business or accounting treatment:
- ❌ **DO NOT** make up an arbitrary accounting rule (e.g. choosing whether an unliquidated shortage is forgiven, converted to payroll loan, or deducted from company net income).
- ✅ **DO** immediately flag for user clarification with the prompt:
  > *"Business/accounting policy confirmation required: [State specific ambiguity, affected accounts, and proposed options]."*

---

## 7. Proportional Review Behavior ("Vibe Coding" with Safety)

- **Simple UI/Formatting Task**: Implement cleanly and swiftly using the Design System.
- **Financial Calculation / Formula**: Verify against `FinanceCalculator` invariants and unit boundary tests.
- **Billing, Payment, or Reconciliation Mutation**: Conduct rigorous domain review for immutability, duplicate prevention, and source traceability.

---

## 8. 2-Tier Previous Trip Carryover & Cash Custodianship Invariant

In trucking accounting and logistics finance, operating funds flow through dedicated custodianship tiers:

1. **Driver as Sole Operating Cash Custodian**:
   - Operating cash (fuel allowances, toll money, food per diem) is held by the **Driver** (stored in `/crew` collection). Trucks are capital assets and helpers are commission crew; neither are cash custodians.
   - Continuous driver fields: `currentCOHBalance`, `cohBalanceType` (`OVERAGE` | `SHORTAGE` | `BALANCED`), `lastTripId`, `lastTloNumber`, `lastSettledDate`.

2. **Immutable Historical Trip Snapshot**:
   - Every trip recorded in `/dispatches` stores a frozen historical snapshot of the carryover state when the trip was created (`previousCarryover: { amount, type, fromTripId, fromTloNumber }`) and the final liquidated ending balance (`endingCOHBalance`, `endingCOHType`).
   - Historical statements and trip summaries remain mathematically immutable regardless of subsequent driver trips.

3. **Starting Cash Equation**:
   $$\text{Total Starting Cash on Hand} = \text{Previous Carryover (Surplus/Deficit)} + \text{Dispatch Allowance (Trip Cash Issued)}$$
