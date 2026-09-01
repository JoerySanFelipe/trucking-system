# MASTER AI ONE-SHOT CODING PROMPT

## Porbido TMS — Billing, Payment & Reconciliation

### Fully Functional Frontend-First Prototype

---

# 1. ROLE

You are a senior frontend engineer, UI/UX architect, and enterprise workflow designer.

Your task is to build a **fully working frontend prototype** for the Billing, Payment, and Reconciliation modules of the Porbido Transportation Management System (TMS).

This is not a static UI mockup.

Every important interaction must work.

However, this is also **NOT a production backend implementation**.

The prototype must prioritize:

- Functional frontend workflows
- Realistic mock data
- Frontend state management
- Realistic business-rule simulation
- Search and filtering
- Working tables
- Working forms
- Working confirmation modals
- Working state transitions
- Working print/PDF preview behavior
- Working audit-history simulation
- Consistent enterprise UI/UX

Do not over-engineer backend infrastructure.

---

# 2. CRITICAL IMPLEMENTATION PHILOSOPHY

## ONE-SHOT CODING DOES NOT MEAN UNSTRUCTURED CODING

You are receiving one master implementation prompt, but you MUST implement the system **phase-by-phase**.

Do NOT attempt to build the entire system simultaneously.

The required execution pattern is:

```text
IMPLEMENT PHASE
      ↓
SELF-CHECK
      ↓
VERIFY REQUIREMENTS
      ↓
FIX PROBLEMS
      ↓
STABILIZE
      ↓
PROCEED TO NEXT PHASE
```

Do not skip phases.

Do not unnecessarily merge phases.

Do not jump to later functionality before the required foundation is working.

The final objective is still one-shot implementation from this prompt, but the implementation must be internally disciplined and sequential.

---

# 3. MOCKUP / PROTOTYPE BOUNDARY

## IMPLEMENT NOW

Build a fully functional frontend prototype.

The prototype must include:

- Navigation
- Tables
- Search
- Filters
- Pagination
- Selection
- Forms
- Modals
- Toasts
- Loading states
- Error states
- Empty states
- State transitions
- Validation
- Mock calculations
- Mock OCR behavior
- Mock statement processing
- Mock matching
- Mock audit history
- Print/PDF simulation
- Local/frontend persistence where useful

## DO NOT IMPLEMENT YET

Do NOT implement production:

- REST APIs
- GraphQL
- Backend services
- Database servers
- Firebase/backend integrations
- Authentication infrastructure
- Production RBAC
- Server-side authorization
- Payment gateways
- Real OCR APIs
- External accounting integrations
- Microservices
- Production deployment infrastructure
- Production audit database
- Enterprise security infrastructure

Actual backend development will happen later.

---

# 4. FULL-ACCESS MOCKUP RULE

For the prototype, treat the user as having **full access**.

Do NOT hide pages or actions because of permissions.

All relevant screens and actions should be visible so the complete workflow can be demonstrated.

Role-based permissions will be implemented later during actual development.

However, business workflow restrictions MUST still work.

For example:

- Submitted Billing cannot be edited.
- Closed Reconciliation cannot be edited.
- Mixed-client Billing Batch cannot be created.
- Required reconciliation conditions must be satisfied before closing.

These are workflow rules, not RBAC.

---

# 5. CORE SYSTEM CONCEPT

The system must maintain five distinct concepts:

## BILLING

What Porbido officially billed.

## PAYMENT

What Porbido actually received.

## RECONCILIATION

What was verified against the client's statement.

## BILLING ADJUSTMENT

A controlled correction determined during reconciliation.

## AUDIT TRAIL

The historical record of what happened, when, and by whom.

Never merge these concepts into one generic financial status.

---

# 6. CORE FINANCIAL PRINCIPLE

Use this rule throughout the entire prototype:

> **Do not rewrite history. Record the correction.**

Before finalization, mistakes should return to the appropriate starting point.

After finalization, corrections must use controlled workflows.

---

# 7. MODULE ARCHITECTURE

Primary navigation:

```text
Billing
├── Billing Queue
├── Draft Billing
└── Printed Billing

Reconciliation
└── Reconciliation Workspace
```

Payment is a workflow inside Printed Billing rather than a separate primary module.

---

# 8. GLOBAL BILLING FLOW

The complete Billing lifecycle is:

```text
Trip
 ↓
Billing Queue
 ↓
Create Draft Billing
 ↓
Draft Billing Workspace
 ↓
Billing Preview
 ↓
Mark as Submitted
 ↓
Printed Billing
 ↓
Payment
 ↓
Reconciliation
 ↓
Adjustment / Resolution
 ↓
Closed Reconciliation
```

---

# 9. TRIP ELIGIBILITY

A trip must only enter Billing Queue when all required trip/document/details are complete.

If required information is missing:

```text
Trip
 ↓
NOT ELIGIBLE
 ↓
NOT SHOWN IN BILLING QUEUE
```

Do not display incomplete trips as billable records.

---

# 10. BILLING QUEUE

Create a professional enterprise-style Billing Queue.

Required search fields:

- TLO Number
- Truck Plate
- Route

Required filter:

- Client

Also support:

- Select individual trip
- Select All
- Pagination
- Selection persistence
- Clear selection

Default table presentation:

```text
Trips | Total Weight | Gross Freight
```

Do not add unnecessary columns simply for decoration.

---

# 11. BILLING QUEUE SELECTION RULES

## SELECT ALL

"Select All" means:

> Select all currently filtered/eligible trips.

It must NOT mean every trip in the entire database.

## SELECTION PERSISTENCE

Selected trips remain selected while the user:

- Changes page
- Paginates
- Searches
- Filters

until selection is cleared or the trips are moved into a Billing context.

Display selected count clearly.

Example:

```text
8 trips selected
```

---

# 12. SINGLE ACTIVE BILLING CONTEXT RULE

A trip can only belong to one active billing context at a time.

Once selected into a Draft Billing:

```text
Billing Queue
 ↓
Trip removed from active Queue
 ↓
Draft Billing Workspace
```

The trip must not remain selectable from Billing Queue.

---

# 13. MULTI-CLIENT PROTECTION

A Billing Batch may contain trips from only one client.

If the user selects trips belonging to different clients, block creation.

Display:

```text
Trips from multiple clients cannot be combined into one Billing Batch.

Please select trips from the same client.
```

Do not silently split the batch.

---

# 14. DRAFT BILLING

When eligible trips are selected, create a Draft Billing.

Billing Number format:

```text
BILL-2026-0001
```

Use sequential numbering in mock data.

Draft Billing contains:

- Billing Number
- Client
- Billing Period
- Creation Date
- Trips
- Total Weight
- Gross Freight
- Billing information
- Draft status

---

# 15. BILLING PERIOD

The system should automatically suggest the appropriate billing period based on the selected trips.

Example:

```text
Aug 3–28, 2026
```

The user may change the suggested period if necessary.

---

# 16. CLIENT FIELD

Client should primarily use existing clients.

However, the field should support typing/searching for correction or faster selection.

Do not force completely manual client entry when an existing client is available.

---

# 17. CREATION DATE

Creation Date must be recorded separately from Billing Period.

Creation Date should appear prominently in Billing records.

When listing Billings, Creation Date should be prioritized near the beginning of the table.

---

# 18. DRAFT BILLING WORKSPACE

Draft Billings must have their own workspace/tab.

Draft Billing should provide:

- Search
- Filtering
- View
- Continue Editing
- Delete

Deletion requires confirmation.

Confirmation pattern:

```text
Remove Draft Billing?

This action will remove the draft billing.

[Cancel] [Remove]
```

After deletion, return to the Billing Queue.

---

# 19. BILLING PREVIEW

The Billing Preview is the official review stage before submission.

The preview must visually resemble an actual billing document.

Use:

- Landscape orientation
- Professional document hierarchy
- Company/client information
- Billing Period
- Creation Date
- Billing Number
- Trip information
- Total Weight
- Gross Freight
- Billing Total

The preview should feel close to a real enterprise billing document, not like a generic dashboard card.

---

# 20. BILLING DETAIL STRUCTURE

The primary billing line presentation should remain:

```text
Trips | Total Weight | Gross Freight
```

Do not add unrelated financial concepts into this section.

---

# 21. MARK AS SUBMITTED

The "Mark as Submitted" control MUST exist inside the Billing Preview/Details page.

It must NOT be placed directly in the Billing table.

Clicking it requires a confirmation modal.

Use wording similar to:

```text
Submit Billing?

Once submitted, this billing can no longer be edited or deleted.

Any future billing discrepancy must be handled through Reconciliation.

[Cancel] [Confirm Submission]
```

---

# 22. SUBMITTED BILLING IMMUTABILITY

After submission:

```text
DRAFT
 ↓
SUBMITTED 🔒
```

Submitted Billing:

- Cannot be edited
- Cannot be deleted
- Cannot be silently changed

The prototype must actually enforce this behavior.

Any billing mistake after submission must be handled through Reconciliation.

---

# 23. PRINTED BILLING

Printed Billings contain only Billing records that have reached the printable/submitted stage.

Draft Billings must NOT appear here.

Printed Billing table should prioritize:

```text
Creation Date
Billing Number
Client
Billing Period
Trips
Total Weight
Gross Freight
Billing Status
Payment Status
```

Use separate Billing and Payment status badges.

---

# 24. BILLING STATUS VS PAYMENT STATUS

These must always remain separate.

Example:

```text
Billing Status: Submitted
Payment Status: Underpaid
```

Do NOT combine them into one status.

Billing Status describes the document/workflow state.

Payment Status describes actual money received.

---

# 25. PAYMENT

Payment is a workflow inside Printed Billing.

Supported payment states:

```text
Unpaid
Paid
Underpaid
```

The system must allow recording a payment.

---

# 26. RECORD PAYMENT

Payment recording should support:

- Amount Received
- Payment Date
- Payment Method
- Reference Code
- Optional Receipt Image

Receipt evidence may be either:

- Reference Code
- Receipt Image

Do not require both.

---

# 27. PAYMENT CALCULATION

Example:

```text
Billing Total       ₱80,000.00
Amount Received     ₱75,000.00
Outstanding          ₱5,000.00

Payment Status: UNDERPAID
```

Full payment:

```text
Amount Received = Billing Total
 ↓
PAID
```

No payment:

```text
Amount Received = ₱0
 ↓
UNPAID
```

---

# 28. PAYMENT CONFIRMATION

Recording Payment always requires confirmation.

Example:

```text
Record Payment?

Amount Received: ₱75,000.00

[Cancel] [Confirm Payment]
```

After confirmation:

```text
Payment Recorded Successfully.
```

Payment details become viewable.

Confirmed payment records should not be casually edited.

---

# 29. PAYMENT VS RECONCILIATION

Payment Status and Reconciliation Status are independent.

Payment does NOT automatically resolve Reconciliation.

Reconciliation does NOT automatically change Payment Status.

Underpayment does NOT automatically create a Billing Adjustment.

---

# 30. FINANCIAL PRESENTATION

When reconciliation determines that the Billing itself requires correction, preserve the original billing amount and show the adjustment separately.

Example:

```text
Trip Freight          ₱80,000.00
Billing Adjustments    ₱5,000.00
Billing Total         ₱85,000.00
```

Use the appropriate positive/negative adjustment based on the scenario.

Do NOT overwrite the original Billing amount.

---

# 31. RECONCILIATION WORKSPACE

Create a dedicated Reconciliation Workspace.

Primary table:

```text
Creation Date
Reconciliation No.
Client
Billing Period
Billings
Exceptions
Status
Action
```

Reconciliation Number:

```text
REC-2026-0001
```

---

# 32. RECONCILIATION SEARCH & FILTERS

Support:

- Reconciliation Number
- Client
- Billing Period

Use pagination.

Provide Clear Filters.

Preserve filters during the current session when practical.

---

# 33. CREATE RECONCILIATION

Create Reconciliation using:

- Client
- Billing Period

Support:

- Monthly Period
- Custom Period

Before creation, show:

```text
Eligible Billings
Total Billing Amount
```

The user must be able to view included Billings before creation.

If no eligible Billings exist:

> Block creation.

---

# 34. ACTIVE RECONCILIATION PROTECTION

Only one active Reconciliation may exist for:

```text
Client + Billing Period
```

If one already exists:

> View Existing Reconciliation

rather than creating a competing active reconciliation.

---

# 35. RECONCILIATION WORKSPACE STRUCTURE

Use:

```text
Overview
Statement
Matching
Exceptions
Audit Trail
```

Keep the Reconciliation Header visible.

Header should show:

- Reconciliation Number
- Client
- Billing Period
- Status

---

# 36. RECONCILIATION OVERVIEW

Overview should show:

- Reconciliation status
- Billing count
- Statement line count
- Matching progress
- Matched count
- Reconciled percentage
- Exception count
- Next Action

Avoid oversized redundant summary cards.

---

# 37. STATEMENT DOCUMENT

Statement Document section should display:

- File Name
- Upload Date
- Uploaded By
- File Size
- Processing Status
- Extracted Line Count

Actions:

- View PDF
- Review Data
- Reprocess

Document deletion requires controlled confirmation.

---

# 38. STATEMENT PROCESSING

The prototype should simulate:

```text
Upload
 ↓
Processing
 ↓
OCR / Extraction
 ↓
Statement Review
```

Do not implement real OCR APIs.

Use realistic mock extracted data.

---

# 39. STATEMENT REVIEW

Show extracted statement data.

Include:

- TLO
- Trip Date
- Truck Plate
- Route
- Amount
- Confidence

Provide:

> Show Only Items Needing Review

---

# 40. OCR CORRECTION

If OCR is incorrect, allow correction.

Preserve:

```text
Original OCR Value
Corrected Value
Corrected By
Corrected Date/Time
```

After correction, allow matching to be rerun.

---

# 41. CONFIRM STATEMENT DATA

The user must explicitly confirm statement data before matching.

Confirmation is required.

Once confirmed, matching becomes available.

---

# 42. MATCHING

Matching compares:

```text
Porbido Billing
vs
Client Statement
```

Table:

```text
TLO
Trip Date
Truck Plate
Route
Porbido Freight
Client Amount
Variance
Result
Action
```

Rows may expand to show detailed values.

---

# 43. MATCHING RESULTS

Support:

- Exact Match
- Variance
- Missing from Client
- Client Statement Only
- Needs Review
- Duplicate Statement
- Duplicate Billing

Automatic matching should show confidence.

---

# 44. RE-RUN MATCHING

Matching may be rerun.

Rerunning requires confirmation.

The prototype should simulate recalculation.

---

# 45. CLIENT STATEMENT ONLY

If a statement line has no Porbido Billing:

> Client Statement Only

Do NOT automatically create a Billing.

It may be manually linked to an existing Billing when appropriate.

Manual linking must be recorded in Audit Trail.

---

# 46. MISSING FROM CLIENT

If a Porbido Billing is absent from the Client Statement:

> Missing from Client

Do NOT automatically cancel or modify the Billing.

---

# 47. DUPLICATES

Duplicate Statement Lines must be flagged.

Duplicate Porbido Billing references must also be flagged.

Do not silently select one duplicate and discard the other.

---

# 48. EXCEPTIONS

Exceptions workspace should show only items requiring attention.

Columns:

```text
TLO
Exception Type
Porbido Amount
Client Amount
Variance
Status
Action
```

A separate Priority field is not required.

---

# 49. MULTIPLE DISCREPANCIES

A single trip may have multiple discrepancy tags.

Related discrepancies may be resolved together while preserving each discrepancy in history.

---

# 50. RESOLUTION

Resolution workflow should contain:

- Original Billing Amount
- Client Amount
- Variance
- Discrepancies
- Resolution
- Reason
- Evidence

Resolution options should adapt to the exception.

---

# 51. RESOLUTION EVIDENCE

Support:

- PDF
- JPG
- JPEG
- PNG

Evidence can be attached when required.

---

# 52. BILLING ADJUSTMENT

A Billing Adjustment is created only when reconciliation determines that the Billing itself requires correction.

Do NOT automatically create a Billing Adjustment simply because payment is underpaid.

Example:

```text
Original Billing: ₱80,000
Adjustment: -₱5,000
Reconciled Amount: ₱75,000
```

Original Billing remains unchanged.

---

# 53. RESOLUTION IMMUTABILITY

Confirmed resolution cannot simply be edited.

If incorrect:

```text
Controlled Reopen
 ↓
New Resolution
 ↓
Previous Resolution preserved in history
```

---

# 54. STATEMENT VERSIONING

If a confirmed statement needs correction:

```text
Original Statement
 ↓
Superseded Version

New Statement
 ↓
Current Version
```

Matching always uses the Current Statement Version.

Never silently overwrite the original statement.

---

# 55. REOPENING

Closed Reconciliation may be reopened only through a controlled workflow.

Reopening requires:

- Confirmation
- Mandatory reason

Previous history remains intact.

---

# 56. FINAL VALIDATION

Before closing Reconciliation, validate:

```text
✓ Statement confirmed
✓ Matching completed
✓ Required exceptions resolved
✓ Required resolutions completed
✓ Required reasons completed
✓ Required evidence completed
✓ Duplicate issues resolved
```

If any required condition fails:

> Block Close Reconciliation.

---

# 57. CLOSE RECONCILIATION

Closing requires confirmation.

After closing:

```text
IN REVIEW
 ↓
CLOSED 🔒
```

Closed Reconciliation becomes read-only.

---

# 58. FINAL RECONCILIATION SNAPSHOT

Generate a simulated immutable final snapshot containing:

- Client
- Billing Period
- Billing Count
- Statement Line Count
- Matched Count
- Adjusted Count
- Disputed Count
- Original Billing Total
- Billing Adjustments
- Reconciled Amount
- Closed By
- Closed Date

---

# 59. AUDIT TRAIL

Audit Trail must simulate:

- Created
- Updated
- Submitted
- Payment Recorded
- Statement Uploaded
- Statement Confirmed
- OCR Corrected
- Matching Run
- Exception Resolved
- Adjustment Created
- Reopened
- Closed
- Document Versioned

Each event should show:

```text
User
Date/Time
Action
Relevant Details
```

Audit Trail is append-only in the prototype.

Entries cannot be edited or deleted through normal UI interactions.

---

# 60. BILLING ↔ RECONCILIATION LINK

If a Billing has been included in a Reconciliation, display a relationship such as:

```text
Reconciliation:
REC-2026-0001
```

Allow the user to navigate to the related Reconciliation.

---

# 61. TABLE RULES

Major tables should support:

- Pagination
- Search where applicable
- Filters where applicable
- Sorting where useful
- Clear Filters
- Loading state
- Error state
- Empty state

Default page size:

```text
25
```

Allow:

```text
25 | 50 | 100
```

---

# 62. EMPTY STATES

Use a single meaningful empty state per workspace.

Example:

```text
No Draft Billings

There are currently no draft billings to review.
```

When filters return no results:

```text
No records match your current filters.
```

Do not confuse filtered-empty state with true workspace-empty state.

---

# 63. LOADING STATES

Use skeleton/loading states rather than blank tables.

---

# 64. ERROR STATES

Errors should be specific.

Example:

```text
Unable to load billing records.

Please try again.

[Retry]
```

Preserve current filters when possible.

---

# 65. SEARCH/FILTER PERSISTENCE

Preserve search and filters during the current session where practical.

Example:

```text
Client: Cargill
Billing Period: August 2026
Status: Submitted
```

If the user opens a record and returns, preserve their workspace context.

---

# 66. FORM VALIDATION

Required fields must be clearly indicated.

Example:

```text
Reason *
```

Validation messages should appear near the relevant field.

Do not allow invalid financial forms to submit.

---

# 67. CURRENCY FORMAT

Use consistently:

```text
₱#,###,###.00
```

Example:

```text
₱80,000.00
```

Do not mix informal financial formats inside formal records.

---

# 68. DATE FORMAT

Use readable UI dates:

```text
Aug 9, 2026
```

Audit timestamps may use:

```text
Aug 9, 2026 · 10:32 AM
```

---

# 69. CONFIRMATION MODALS

Consequential actions require confirmation.

Examples:

- Delete Draft Billing
- Mark as Submitted
- Record Payment
- Re-run Matching
- Reopen Reconciliation
- Close Reconciliation
- Other destructive/financially consequential actions

---

# 70. CONFIRMATION VS TOAST

Use confirmation modal BEFORE consequential actions.

Use toast AFTER successful actions.

Example:

```text
CONFIRMATION
Record this payment?

       ↓

SUCCESS TOAST
Payment recorded successfully.
```

Do not use large disruptive dialogs for ordinary success notifications.

---

# 71. UNSAVED CHANGES

If the user attempts to leave a form with unsaved changes:

```text
Unsaved Changes

You have changes that haven't been saved.

[Stay] [Leave Without Saving]
```

---

# 72. ATTACHMENT RULES

Validate:

- File type
- File size

Show:

- Upload progress
- Filename
- Preview where supported
- Uploaded By
- Upload Date

Do not silently overwrite existing files.

---

# 73. PRINT / PDF

Billing Preview must support simulated:

```text
Preview
Print
Download PDF
```

The preview should visually resemble the printed landscape billing document.

Final Reconciliation Snapshot should also support:

```text
Print Reconciliation
Download PDF
```

Use frontend/browser print or mock PDF behavior as appropriate.

Do not build a backend document service.

---

# 74. GLOBAL STATUS SYSTEM

Use consistent semantic status badges.

Suggested semantic system:

```text
Draft       → Warning/Neutral
In Review   → Informational
Paid        → Success
Resolved    → Success
Underpaid   → Warning
Unpaid      → Critical
Closed      → Read-only/Neutral
```

Exact visual colors may be refined during UI implementation.

---

# 75. RESPONSIVE DESIGN

The prototype should work properly on:

- Desktop
- Laptop
- Tablet where practical

Primary optimization should be desktop because this is an enterprise operational system.

Tables must remain usable at realistic widths.

---

# 76. DESIGN DIRECTION

The interface should feel:

- Professional
- Enterprise-grade
- Clean
- Operational
- Financially trustworthy
- Information-dense without being cluttered
- Modern
- Consistent

Avoid:

- Excessive gradients
- Decorative dashboard clutter
- Giant unnecessary cards
- Excessive illustrations
- Consumer-app styling
- Excessive animation

Prioritize hierarchy, readability, and operational efficiency.

---

# 77. DATA DESIGN FOR MOCKUP

Create realistic mock data for:

- Clients
- Trips
- Billings
- Draft Billings
- Printed Billings
- Payments
- Statements
- Statement Lines
- Matches
- Exceptions
- Resolutions
- Adjustments
- Reconciliations
- Audit Events

Use realistic Philippine logistics/transportation examples.

Use realistic amounts, dates, TLO numbers, truck plates, routes, and client names.

Avoid lorem ipsum.

---

# 78. FRONTEND STATE

Use frontend state to simulate:

- Record creation
- Editing where permitted
- Submission
- Deletion where permitted
- Payment recording
- Matching
- Resolution
- Reconciliation closure
- Reopening
- Statement versioning
- Audit history

Use local persistence if useful so the prototype remains functional during navigation/refresh where practical.

---

# 79. CONCURRENCY

For the prototype, do NOT implement production multi-user concurrency infrastructure.

However, the UI architecture may simulate a conflict state if useful.

Actual concurrency enforcement belongs to backend development.

---

# 80. PERMISSIONS

For the prototype:

> FULL ACCESS.

Do not implement RBAC.

Actual roles such as:

- Billing User
- Reconciliation User
- Manager/Admin

may be documented conceptually but should not restrict the prototype.

---

# 81. DEVELOPMENT PHASES

Implement in exactly this general sequence.

## PHASE 0

Project inspection and architecture planning.

## PHASE 1

Design system and application shell.

## PHASE 2

Billing Queue.

## PHASE 3

Draft Billing.

## PHASE 4

Billing Preview and Submission.

## PHASE 5

Printed Billing.

## PHASE 6

Payment.

## PHASE 7

Reconciliation Workspace.

## PHASE 8

Overview, Statement Documents, OCR/Statement Review.

## PHASE 9

Matching.

## PHASE 10

Exceptions and Resolution.

## PHASE 11

Closing, Reopening, and Final Snapshot.

## PHASE 12

Audit Trail.

## PHASE 13

Global UX polish.

## PHASE 14

End-to-end QA.

---

# 82. PHASE CHECKPOINT RULE

At the end of EVERY phase:

1. Verify that all phase requirements are implemented.
2. Verify navigation.
3. Verify state transitions.
4. Verify validation.
5. Verify that existing functionality still works.
6. Fix discovered issues.
7. Only then proceed.

Do NOT leave known broken behavior for a later phase unless it is explicitly dependent on later functionality.

---

# 83. DO NOT RUSH

Do not optimize for speed at the expense of completeness.

Do not skip requirements simply because the implementation is large.

Do not create superficial placeholder buttons for required functionality.

If a required behavior is simulated, make the simulation functional and believable.

---

# 84. DO NOT INVENT BUSINESS RULES

All business rules in this specification are authoritative.

If a design decision is not specified:

- Prefer the simplest enterprise-friendly solution.
- Preserve consistency with existing rules.
- Do not introduce a major new feature.
- Do not change financial semantics.

---

# 85. DO NOT BREAK IMMUTABILITY

The following must be enforced by frontend state:

```text
Submitted Billing → Read-only
Confirmed Payment → Read-only
Confirmed Resolution → Controlled Reopen
Closed Reconciliation → Read-only
Superseded Statement → Historical
Final Snapshot → Immutable
```

---

# 86. FINAL END-TO-END QA

Before declaring the prototype complete, test these scenarios.

## TEST 1 — NORMAL BILLING

```text
Eligible Trip
 ↓
Billing Queue
 ↓
Select
 ↓
Draft Billing
 ↓
Preview
 ↓
Submit
 ↓
Printed Billing
 ↓
Paid
```

Must work.

---

## TEST 2 — MULTI-CLIENT PROTECTION

```text
Trip Client A
+
Trip Client B
 ↓
Create Billing
 ↓
BLOCK
```

Must display the multi-client warning.

---

## TEST 3 — UNDERPAYMENT

```text
Billing = ₱80,000
Payment = ₱75,000
 ↓
Underpaid
Outstanding = ₱5,000
```

Must NOT automatically create Billing Adjustment.

---

## TEST 4 — BILLING ADJUSTMENT

```text
Original Billing = ₱80,000
Adjustment = -₱5,000
Reconciled Amount = ₱75,000
```

Original Billing remains ₱80,000.

---

## TEST 5 — STATEMENT ONLY

Statement line with no Billing:

```text
Client Statement Only
```

Do not automatically create Billing.

---

## TEST 6 — MISSING FROM CLIENT

Billing with no statement line:

```text
Missing from Client
```

Do not cancel Billing.

---

## TEST 7 — OCR CORRECTION

```text
Original OCR
 ↓
Corrected Value
 ↓
Audit Entry
 ↓
Rerun Matching
```

---

## TEST 8 — EXCEPTION

```text
Variance
 ↓
Exception
 ↓
Resolution
 ↓
Reason
 ↓
Evidence
 ↓
Resolved
```

---

## TEST 9 — RECONCILIATION CLOSE

Attempt close with unresolved required exceptions.

Expected:

```text
BLOCKED
```

Resolve all requirements.

Then:

```text
Close
 ↓
Confirmation
 ↓
Closed
 ↓
Read-only
```

---

## TEST 10 — IMMUTABILITY

Try to edit:

- Submitted Billing
- Confirmed Payment
- Closed Reconciliation

Expected:

```text
BLOCKED
```

---

# 87. FINAL ACCEPTANCE CHECKLIST

Before declaring implementation complete, verify:

### Billing

- [ ] Billing Queue works
- [ ] TLO search works
- [ ] Truck Plate search works
- [ ] Route search works
- [ ] Client filter works
- [ ] Select All works correctly
- [ ] Selection persists through pagination
- [ ] Same-client validation works
- [ ] Trips move out of active Queue when placed in Draft
- [ ] Draft Billing works
- [ ] Billing numbering works
- [ ] Billing Period works
- [ ] Creation Date works
- [ ] Billing Preview works
- [ ] Landscape preview works
- [ ] Submission confirmation works
- [ ] Submitted Billing becomes immutable
- [ ] Printed Billing works

### Payment

- [ ] Unpaid works
- [ ] Paid works
- [ ] Underpaid works
- [ ] Amount calculation works
- [ ] Outstanding amount works
- [ ] Payment confirmation works
- [ ] Reference Code works
- [ ] Optional Receipt Image works
- [ ] Confirmed Payment becomes read-only

### Reconciliation

- [ ] Workspace works
- [ ] Create Reconciliation works
- [ ] Client filtering works
- [ ] Billing Period works
- [ ] Active Reconciliation protection works
- [ ] Overview works
- [ ] Statement upload simulation works
- [ ] Statement Review works
- [ ] OCR simulation works
- [ ] OCR correction works
- [ ] Matching works
- [ ] Match confidence works
- [ ] Exceptions work
- [ ] Multiple discrepancy tags work
- [ ] Resolution works
- [ ] Evidence works
- [ ] Billing Adjustment works
- [ ] Reopening works
- [ ] Statement versioning works
- [ ] Final validation works
- [ ] Close Reconciliation works
- [ ] Final Snapshot works
- [ ] Closed state becomes read-only

### Global UX

- [ ] Confirmation modals work
- [ ] Toast notifications work
- [ ] Loading states work
- [ ] Error states work
- [ ] Empty states work
- [ ] Filtered-empty states work
- [ ] Unsaved-change warning works
- [ ] Pagination works
- [ ] Search works
- [ ] Currency formatting is consistent
- [ ] Date formatting is consistent
- [ ] Print behavior works
- [ ] PDF/download behavior works
- [ ] Audit Trail works
- [ ] No unauthorized backend implementation was introduced

---

# 88. FINAL IMPLEMENTATION INSTRUCTION

Build the system completely according to this specification.

Do not treat this as a visual-only design.

Do not stop after creating static screens.

Do not implement production backend infrastructure.

Do not skip phases.

Do not invent major functionality.

Do not silently change locked business rules.

Prioritize:

> **Correctness → Workflow → Usability → Consistency → Visual Polish**

The final result must be a:

> **Fully functional, frontend-first, enterprise-style Billing, Payment, and Reconciliation prototype that can be demonstrated from Trip creation through final Reconciliation closure.**

The prototype should feel like a real operational TMS application while remaining intentionally separated from production backend infrastructure.

---

# 89. FINAL SUCCESS CONDITION

The implementation is considered successful only when a user can demonstrate the complete lifecycle:

```text
TRIP
 ↓
BILLING QUEUE
 ↓
DRAFT BILLING
 ↓
BILLING PREVIEW
 ↓
SUBMITTED BILLING
 ↓
PRINTED BILLING
 ↓
PAYMENT
 ↓
RECONCILIATION
 ↓
STATEMENT
 ↓
MATCHING
 ↓
EXCEPTION
 ↓
RESOLUTION
 ↓
BILLING ADJUSTMENT (when applicable)
 ↓
FINAL VALIDATION
 ↓
CLOSED RECONCILIATION
 ↓
FINAL SNAPSHOT
```

without encountering a workflow state that contradicts this specification.

**Execute phase-by-phase. Validate every phase before continuing. Complete the frontend prototype in one master execution.**
