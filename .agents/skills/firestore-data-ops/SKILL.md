---
name: firestore-data-ops
description: >-
  Cloud Firestore persistence, query optimization, indexing, batch writes, and cost-reduction protocol
  specifically for Porbido Trucking TMS. Use when writing queries, managing collections,
  structuring transactions, or optimizing Firebase database operations.
---

# Cloud Firestore Data Operations & Optimization Guide (Porbido TMS)

> **Persona & Standard**: Principal Cloud Database Engineer & Firebase Systems Architect.  
> **Core Mandate**: Ensure rock-solid transactional data integrity, prevent Firebase read/write bill shocks, optimize query indexes, and eliminate memory leaks from unmanaged real-time listeners.

---

## 🗄️ 1. Porbido TMS Canonical Collections Architecture

Maintain strict schema boundaries across primary Firestore root collections:

```
┌─────────────────┐       ┌──────────────────────┐       ┌─────────────────────┐
│   /dispatches   │  ──▶  │   /billingBatches    │  ──▶  │   /reconciliations  │
│ Individual Trips│       │ Customer SOA Batches │       │ Cargill Matches     │
└─────────────────┘       └──────────────────────┘       └─────────────────────┘
         │                           │
         ▼                           ▼
┌─────────────────┐       ┌──────────────────────┐       ┌─────────────────────┐
│      /crew      │       │       /clients       │       │       /fleet        │
│ Drivers/Ledgers │       │ Cargill, San Miguel  │       │ 10-Wheeler Trucks   │
└─────────────────┘       └──────────────────────┘       └─────────────────────┘
```

---

## ⚡ 2. Cost Reduction & Anti-Bill Shock Guardrails

Unbounded queries on Firestore directly multiply cloud billing costs. Enforce these four constraints on every database read:

### A. The Strict Limit & Pagination Rule
- **Never perform unbounded collection queries** (`collection(db, 'dispatches')` without filtering and limits).
- For large data tables (Trips, Historical SOAs), always apply:
  1. Categorical filtering (`where('billingStatus', '==', 'UNBILLED')`).
  2. Index-compatible ordering (`orderBy('dispatchedDate', 'desc')`).
  3. Strict page sizing (`limit(50)`).
  4. Cursor pagination (`startAfter(lastDocSnapshot)`) for continuous scrolling or next-page navigation.

### B. One-Time Fetch vs Real-Time Listener (`getDocs` vs `onSnapshot`)
- **Use `getDocs()` / `getDoc()`**:
  - For historical statements, audit logs, closed reconciliation sessions, and report exports (PDF/Excel). Once generated, these records are immutable; keeping a real-time listener open is a waste of reads and memory.
- **Reserve `onSnapshot()`**:
  - Exclusively for active operational views (e.g. today's active dispatches in transit, live notifications).
- **Mandatory Unsubscription**:
  - Always store the `Unsubscribe` callback and invoke it during `ngOnDestroy` or route teardown:
  ```typescript
  const unsubscribe = onSnapshot(q, (snapshot) => { ... });
  this.destroyRef.onDestroy(() => unsubscribe());
  ```

---

## 🔄 3. Atomic Batch Writes & Concurrent Transactions

When a business operation touches multiple documents, never perform separate individual `setDoc` or `updateDoc` calls in a loose loop.

### A. Batch Writes (`writeBatch`)
Use `writeBatch()` for multi-document operations without read-dependencies (e.g. locking 30 trips into an SOA batch):
```typescript
const batch = writeBatch(this.firestore);

// Link trips to billing batch atomically
for (const trip of selectedTrips) {
  const tripRef = doc(this.firestore, 'dispatches', trip.id);
  batch.update(tripRef, {
    billingBatchId: batchId,
    billingStatus: 'BILLED',
    billedDate: serverTimestamp(),
  });
}

// Write the master batch record in the same atomic commit
const batchRef = doc(this.firestore, 'billingBatches', batchId);
batch.set(batchRef, masterBatchRecord);

// Commit all mutations atomically (Max 500 operations)
await batch.commit();
```

### B. Transactions (`runTransaction`)
Use `runTransaction()` when updating balances that depend on existing values (e.g. Driver Cash-on-Hand Ledger):
```typescript
await runTransaction(this.firestore, async (transaction) => {
  const driverRef = doc(this.firestore, 'crew', driverId);
  const driverDoc = await transaction.get(driverRef);
  if (!driverDoc.exists()) throw new Error('Driver not found');

  const currentBalance = driverDoc.data()['currentCOHBalance'] || 0;
  const newBalance = currentBalance + netSettlementDifference;

  transaction.update(driverRef, {
    currentCOHBalance: newBalance,
    cohBalanceType: newBalance > 0 ? 'OVERAGE' : newBalance < 0 ? 'SHORTAGE' : 'BALANCED',
    lastSettledDate: serverTimestamp(),
  });
});
```

---

## 📦 4. Complete Entity Serialization Invariant

When saving or updating entities in Firestore, all serializer methods (e.g. `serializeCleanTripForFirestore`) must preserve relational integrity:

1. **No Dropped Fields**: Ensure all tracking IDs (`billingBatchId`, `driverId`, `truckPlateNumber`, `tloNumber`) and numerical amounts are serialized accurately.
2. **Undefined Guard**: Firestore throws an error if any field is `undefined`. Always sanitize objects to replace `undefined` with `null` or omit optional attributes.
3. **Date Preservation**: Store dates consistently as Firestore `Timestamp` or ISO strings, never mixing ad-hoc formats across documents.

---

## 🔒 5. Firestore Security Rules Blueprint

Porbido TMS security rules must enforce:
- **Authenticated Access**: Disallow all unauthenticated reads and writes (`request.auth != null`).
- **Unique Reference Integrity**: Validate that new dispatches have a non-empty `tloNumber` and valid rate type (`PER_TON` or `FLAT_RATE`).
- **Financial Immutability**: Reject update mutations on billing batches whose status is `LOCKED` or `PAID`.
