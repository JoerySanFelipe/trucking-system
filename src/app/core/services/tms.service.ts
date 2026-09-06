import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { 
  FleetAsset, 
  Driver, 
  TripDispatch, 
  DashboardKPIs,
  TripStatus,
  PODStatus,
  BillingStatus,
  FleetMaintenanceRecord,
  AuditLogEntry,
  UserRole,
  CADeductionPreference,
  RouteTag,
  PendingDriverSubmission,
  ClientStatement,
  ClientStatementLine,
  ReconciliationSession,
  ReconciliationException,
  ReconciliationAdjustment,
  ExceptionType,
  ExceptionStatus,
  ReconciliationResolution,
  AuditAction,
  BillingBatch,
  PaymentRecord
} from '../models/tms.models';
import { FirebaseService } from './firebase.service';
import { collection, addDoc, updateDoc, doc, getDocs, onSnapshot } from 'firebase/firestore';
import { ReconciliationMatchingEngine } from '../domain/rules/reconciliation-matching-engine';
import { DispatchStore } from '../application/stores/dispatch.store';
import { FleetStore } from '../application/stores/fleet.store';
import { BillingStore } from '../application/stores/billing.store';
import { ReconciliationStore } from '../application/stores/reconciliation.store';
import { FirestoreAdapterService } from '../infrastructure/firebase/firestore-adapter.service';

@Injectable({
  providedIn: 'root'
})
export class TmsService {

  private firebaseService = inject(FirebaseService);
  private dispatchStore = inject(DispatchStore);
  private fleetStore = inject(FleetStore);
  private billingStore = inject(BillingStore);
  private reconStore = inject(ReconciliationStore);
  private firestoreAdapter = inject(FirestoreAdapterService);

  // RBAC User Role Signal
  readonly userRole = signal<UserRole>('OWNER');

  // Security Audit Log Signal
  readonly auditLogs = signal<AuditLogEntry[]>([
    {
      id: 'aud-101',
      timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      userId: 'usr-owner-01',
      userName: 'Joery San Felipe',
      userRole: 'OWNER',
      action: 'DISPATCH',
      module: 'Smart Dispatch Entry',
      details: 'Dispatched trip TLO #904815 (CAO 3510) Subic ➔ Pulilan'
    },
    {
      id: 'aud-100',
      timestamp: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
      userId: 'usr-staff-01',
      userName: 'Admin Staff',
      userRole: 'STAFF',
      action: 'UPDATE',
      module: 'Trips Lifecycle Hub',
      details: 'Uploaded POD & changed status to POD_REVIEW for TLO #904813'
    }
  ]);

  // Fleet Assets Directory Signal (Live synced from Firestore)
  readonly fleet = signal<FleetAsset[]>([]);

  readonly drivers = signal<Driver[]>([]);

  readonly pendingDriverSubmissions = signal<PendingDriverSubmission[]>([]);

  // Phase 4: Enterprise Reconciliation Signals
  readonly reconciliationSessions = signal<ReconciliationSession[]>([]);
  readonly reconciliationExceptions = signal<ReconciliationException[]>([]);
  readonly reconciliationAdjustments = signal<ReconciliationAdjustment[]>([]);
  readonly clientStatements = signal<ClientStatement[]>([]);
  readonly clientStatementLines = signal<ClientStatementLine[]>([]);

  // Phase 0 & Phase 3: Billing & Payment Signals
  readonly billingBatches = signal<BillingBatch[]>([]);
  readonly payments = signal<PaymentRecord[]>([]);

  // Dispatches Signal (Live synced from Firestore)
  readonly dispatches = signal<TripDispatch[]>([]);

  constructor() {
    // Single Source of Truth Synchronization:
    // Synchronize TmsService signals reactively from DispatchStore and FleetStore
    // without opening duplicate Firestore onSnapshot listeners.
    effect(() => {
      const trips = this.dispatchStore.trips();
      this.dispatches.set(trips);
    });

    effect(() => {
      const fleet = this.fleetStore.trucks();
      this.fleet.set(fleet);
    });

    effect(() => {
      const crew = this.fleetStore.drivers();
      this.drivers.set(crew);
    });

    effect(() => {
      const batches = this.billingStore.batches();
      this.billingBatches.set(batches);
    });

    effect(() => {
      const payments = this.billingStore.payments();
      this.payments.set(payments);
    });

    effect(() => {
      const sessions = this.reconStore.sessions();
      this.reconciliationSessions.set(sessions);
    });

    effect(() => {
      const exceptions = this.reconStore.exceptions();
      this.reconciliationExceptions.set(exceptions);
    });
  }

  // Computed KPIs
  readonly kpis = computed<DashboardKPIs>(() => {
    const list = this.dispatches();
    const assets = this.fleet();
    
    const activeFleet = assets.filter(a => a.status !== 'Maintenance').length;
    const todayStr = new Date().toISOString().split('T')[0];
    const dispatchedToday = list.filter(d => d.dispatchedAt.startsWith(todayStr)).length;
    
    const unbilledFreight = list
      .filter(d => d.billingStatus !== 'SUBMITTED')
      .reduce((sum, d) => sum + d.totalFreightCharge, 0);

    const typoDiscrepancies = list.filter(d => d.podStatus === 'FLAGGED_BLURRY').length;

    return {
      activeFleetCount: activeFleet,
      dispatchedTodayCount: dispatchedToday || list.filter(d => d.status === 'DISPATCHED').length,
      unbilledFreightTotal: unbilledFreight,
      typoDiscrepanciesCount: typoDiscrepancies
    };

  });

  // Role Switcher helper
  setUserRole(role: UserRole) {
    this.userRole.set(role);
    this.logAuditAction('UPDATE', 'System Security Governance', `Switched active access role to ${role}`);
  }

  // Audit Logging helper
  logAuditAction(action: AuditLogEntry['action'], module: string, details: string) {
    const entry: AuditLogEntry = {
      id: 'aud-' + Date.now(),
      timestamp: new Date().toISOString(),
      userId: this.userRole() === 'OWNER' ? 'usr-owner-01' : 'usr-staff-01',
      userName: this.userRole() === 'OWNER' ? 'Joery San Felipe (Owner)' : 'Admin Staff',
      userRole: this.userRole(),
      action,
      module,
      details
    };
    this.auditLogs.update(logs => [entry, ...logs]);
  }

  // Actions
  async addDispatch(dispatchData: Omit<TripDispatch, 'id' | 'updatedAt' | 'podStatus' | 'status'> & { dispatchedAt?: string }) {
    const tag: RouteTag = (dispatchData.destination.includes('Manila') || dispatchData.destination.includes('Port')) ? 'BACKLOAD' : 'FRONTLOAD';
    
    const newDispatch: TripDispatch = {
      ...dispatchData,
      id: 'trp-' + Date.now(),
      status: 'DISPATCHED',
      podStatus: 'PENDING',
      routeTag: dispatchData.routeTag || tag,
      caDeductionPreference: dispatchData.caDeductionPreference || 'NEXT_TRIP_ALLOWANCE',
      dispatchedAt: dispatchData.dispatchedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };


    // 1. Instant local signal update
    this.fleet.update(assets => 
      assets.map(a => a.plateNumber === dispatchData.plateNumber ? { ...a, status: 'In Transit' } : a)
    );
    this.dispatches.update(list => [newDispatch, ...list]);

    this.logAuditAction('DISPATCH', 'Smart Dispatch Entry', `Dispatched trip TLO #${newDispatch.tloNumber} (${newDispatch.plateNumber}) ${newDispatch.origin} ➔ ${newDispatch.destination}`);

    // 2. Persist to live Firestore database
    try {
      const colRef = collection(this.firebaseService.db, 'dispatches');
      const cleanData = JSON.parse(JSON.stringify(newDispatch, (k, v) => v === undefined ? null : v));
      await addDoc(colRef, cleanData);
      console.log('[TmsService] Successfully added trip to Firestore dispatches:', newDispatch.id);
    } catch (error) {
      console.warn('Firestore write saved locally:', error);
    }

    return newDispatch;
  }

  removePendingSubmission(id: string) {
    this.pendingDriverSubmissions.update(list => list.filter(p => p.id !== id));
  }

  async updateTripStatus(tripId: string, status: TripStatus) {
    this.dispatches.update(list => 
      list.map(t => t.id === tripId ? { ...t, status, updatedAt: new Date().toISOString() } : t)
    );

    this.logAuditAction('UPDATE', 'Trips Lifecycle Hub', `Updated trip status to ${status} for ${tripId}`);

    try {
      const docRef = doc(this.firebaseService.db, 'dispatches', tripId);
      await updateDoc(docRef, { status, updatedAt: new Date().toISOString() });
    } catch (e) {
      // Local fallback
    }
  }

  async updateCADeductionPreference(tripId: string, preference: CADeductionPreference) {
    this.dispatches.update(list =>
      list.map(t => t.id === tripId || t.tloNumber === tripId ? { ...t, caDeductionPreference: preference, updatedAt: new Date().toISOString() } : t)
    );

    this.logAuditAction('UPDATE', 'CA Deduction Engine', `Changed CA deduction preference to ${preference} for trip ${tripId}`);

    try {
      const targetTrip = this.dispatches().find(t => t.id === tripId || t.tloNumber === tripId);
      if (targetTrip) {
        const docRef = doc(this.firebaseService.db, 'dispatches', targetTrip.id);
        await updateDoc(docRef, { caDeductionPreference: preference, updatedAt: new Date().toISOString() });
      }
    } catch (e) {
      // Fallback
    }
  }

  async approveForBilling(tripId: string) {
    this.dispatches.update(list =>
      list.map(t => t.id === tripId ? { ...t, billingStatus: 'READY_TO_BILL', updatedAt: new Date().toISOString() } : t)
    );
    this.logAuditAction('UPDATE', 'Billing Cycle', `Approved trip ${tripId} for billing`);
    
    try {
      const docRef = doc(this.firebaseService.db, 'dispatches', tripId);
      await updateDoc(docRef, { billingStatus: 'READY_TO_BILL', updatedAt: new Date().toISOString() });
    } catch (e) {}
  }

  async addToBillingBatch(tripId: string, saNumber: string) {
    this.dispatches.update(list =>
      list.map(t => t.id === tripId ? { ...t, billingSaNumber: saNumber, billingStatus: 'IN_BILLING', updatedAt: new Date().toISOString() } : t)
    );
    this.logAuditAction('UPDATE', 'Billing Cycle', `Added trip ${tripId} to Billing SA #${saNumber}`);
    
    try {
      const docRef = doc(this.firebaseService.db, 'dispatches', tripId);
      await updateDoc(docRef, { billingSaNumber: saNumber, billingStatus: 'IN_BILLING', updatedAt: new Date().toISOString() });
    } catch (e) {}
  }

  isTripInActiveBilling(tripId: string): boolean {
    const trip = this.dispatches().find(t => t.id === tripId);
    if (!trip) return false;
    if (trip.billingBatchId) {
      const batch = this.billingBatches().find(b => b.id === trip.billingBatchId);
      if (batch && (batch.status === 'DRAFT' || batch.status === 'SUBMITTED')) {
        return true;
      }
    }
    return false;
  }

  readonly eligibleBillingTrips = computed(() => {
    return this.dispatches().filter(t => t.billingStatus === 'READY_TO_BILL' && !this.isTripInActiveBilling(t.id));
  });

  readonly draftBillingBatches = computed(() => {
    return this.billingBatches().filter(b => b.status === 'DRAFT');
  });

  readonly submittedBillingBatches = computed(() => {
    return this.billingBatches().filter(b => b.status === 'SUBMITTED');
  });
  
  getAmountPaid(batchId: string): number {
    return this.payments()
      .filter(p => p.billingBatchId === batchId && p.status === 'CONFIRMED')
      .reduce((sum, p) => sum + p.amountReceived, 0);
  }

  getBalanceDue(batchId: string): number {
    const batch = this.billingBatches().find(b => b.id === batchId);
    if (!batch) return 0;
    const amountPaid = this.getAmountPaid(batchId);
    return Math.max(batch.grossFreight - amountPaid, 0);
  }

  getPaymentStatus(batchId: string): import('../models/tms.models').PaymentStatus {
    const batch = this.billingBatches().find(b => b.id === batchId);
    if (!batch) return 'UNPAID';
    
    const amountPaid = this.getAmountPaid(batchId);
    if (amountPaid === 0) return 'UNPAID';
    if (amountPaid >= batch.grossFreight) return 'PAID';
    return 'UNDERPAID';
  }

  recordPayment(paymentData: Omit<PaymentRecord, 'id'>) {
    const newPayment: PaymentRecord = {
      ...paymentData,
      id: 'pay-' + Date.now(),
      status: 'CONFIRMED'
    };
    
    this.payments.update(list => [...list, newPayment]);
    this.billingStore.recordPayment(newPayment);
    this.logAuditAction('UPDATE', 'Payment Tracker', `Recorded ₱${paymentData.amountReceived} payment for Billing Batch ${paymentData.billingBatchId}`);
  }

  generateBillingNumber(): string {
    const count = this.billingBatches().length + 1;
    return `BILL-2026-${count.toString().padStart(4, '0')}`;
  }

  createDraftBillingBatch(tripIds: string[], client: string, billingPeriod: string, totalWeight: number, grossFreight: number): BillingBatch {
    const batch: BillingBatch = {
      id: 'batch-' + Date.now(),
      billingNumber: this.generateBillingNumber(),
      client,
      billingPeriod,
      creationDate: new Date().toISOString().split('T')[0],
      tripIds,
      totalWeight,
      grossFreight,
      status: 'DRAFT'
    };
    
    this.billingBatches.update(b => [batch, ...b.filter(item => item.id !== batch.id)]);
    
    this.dispatches.update(list => list.map(t => {
      if (tripIds.includes(t.id)) {
        return { ...t, billingBatchId: batch.id, billingStatus: 'IN_BILLING', updatedAt: new Date().toISOString() };
      }
      return t;
    }));
    
    // Cloud Firestore Persistence
    this.billingStore.saveBatch(batch);
    for (const tripId of tripIds) {
      this.dispatchStore.updateTrip(tripId, { billingBatchId: batch.id, billingStatus: 'IN_BILLING' });
    }

    this.logAuditAction('CREATE', 'Billing Cycle', `Created Draft Billing ${batch.billingNumber} for ${client}`);
    return batch;
  }

  createReconciliationSession(client: string, billingPeriod: string, statementId: string, porbidoBillingIds: string[]): ReconciliationSession {
    const session: ReconciliationSession = {
      id: 'recon-' + Date.now(),
      client,
      billingPeriod,
      statementId,
      porbidoBillingIds,
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
      auditTrail: [{
        id: 'aud-' + Date.now(),
        action: 'SESSION_CREATED',
        timestamp: new Date().toISOString(),
        actor: 'Joemar Porbido',
        description: `Created Reconciliation Session for ${client} (${billingPeriod})`
      }]
    };

    this.reconciliationSessions.update(s => [session, ...s.filter(item => item.id !== session.id)]);
    this.reconStore.sessions.update(s => [session, ...s.filter(item => item.id !== session.id)]);
    this.firestoreAdapter.saveDocument('reconciliationSessions', session.id, session);
    this.logAuditAction('CREATE', 'Reconciliation', `Created Reconciliation Session for ${client}`);
    
    return session;
  }

  runMatchingEngine(sessionId: string) {
    const session = this.reconciliationSessions().find(s => s.id === sessionId);
    if (!session) return;
    
    // Idempotent check
    const existingExceptions = this.reconciliationExceptions().filter(e => e.sessionId === sessionId);
    if (existingExceptions.length > 0) return;

    const statementLines = this.clientStatementLines().filter(l => l.statementId === session.statementId);
    
    const billedBatches = this.billingBatches().filter(b => session.porbidoBillingIds.includes(b.id));
    const tripIds = billedBatches.flatMap(b => b.tripIds);
    const trips = this.dispatches().filter(t => tripIds.includes(t.id));

    const newExceptions = ReconciliationMatchingEngine.match(sessionId, trips, statementLines);
    this.reconciliationExceptions.update(ex => [...ex, ...newExceptions]);
    this.reconStore.exceptions.update(ex => [...ex, ...newExceptions]);
    for (const exc of newExceptions) {
      this.firestoreAdapter.saveDocument('reconciliationExceptions', exc.id, exc);
    }
  }

  deleteDraftBilling(batchId: string) {
    const batch = this.billingBatches().find(b => b.id === batchId);
    if (!batch) throw new Error('Billing Batch not found');
    if (batch.status !== 'DRAFT') throw new Error('Only DRAFT billings can be deleted');

    this.billingBatches.update(list => list.filter(b => b.id !== batchId));
    
    this.dispatches.update(list => list.map(t => {
      if (t.billingBatchId === batchId || batch.tripIds.includes(t.id)) {
        return { ...t, billingBatchId: undefined, billingStatus: 'READY_TO_BILL', updatedAt: new Date().toISOString() };
      }
      return t;
    }));

    // Cloud Firestore Persistence
    this.billingStore.deleteDraftBatch(batchId);
    for (const tripId of batch.tripIds) {
      this.dispatchStore.updateTrip(tripId, { billingBatchId: undefined, billingStatus: 'READY_TO_BILL' });
    }

    this.logAuditAction('DELETE', 'Billing Cycle', `Deleted Draft Billing ${batch.billingNumber}`);
  }

  submitDraftBilling(batchId: string) {
    const batch = this.billingBatches().find(b => b.id === batchId);
    if (!batch) throw new Error('Billing Batch not found');
    
    this.billingBatches.update(list => list.map(b => b.id === batchId ? { ...b, status: 'SUBMITTED' } : b));
    this.dispatches.update(list => list.map(t => (t.billingBatchId === batchId || batch.tripIds.includes(t.id)) ? { ...t, billingStatus: 'SUBMITTED', updatedAt: new Date().toISOString() } : t));
    
    // Cloud Firestore Persistence
    this.billingStore.submitDraftBatch(batchId);
    const affectedTrips = this.dispatches().filter(t => t.billingBatchId === batchId || batch.tripIds.includes(t.id));
    for (const t of affectedTrips) {
      this.dispatchStore.updateTrip(t.id, { billingStatus: 'SUBMITTED' });
    }

    this.logAuditAction('UPDATE', 'Billing Cycle', `Submitted Billing ${batch.billingNumber}`);
  }

  markBillingSubmitted(sa: any) {
    if (sa.id) {
       this.submitDraftBilling(sa.id);
    }
  }

  reviewPOD(tripId: string, podStatus: PODStatus, reason?: string) {
    this.dispatches.update(list => list.map(t => t.id === tripId ? { ...t, podStatus, notes: reason ? (t.notes ? t.notes + '\n' + reason : reason) : t.notes, updatedAt: new Date().toISOString() } : t));
    this.logAuditAction('UPDATE', 'Trips Lifecycle Hub', `Reviewed POD for trip ${tripId} as ${podStatus}`);
  }

  addCOHEntry(tripId: string, entry: any) {
    const newEntry = {
      id: 'coh-' + Date.now() + Math.random().toString(36).substr(2, 4),
      tripId,
      ...entry
    };
    this.dispatches.update(list => list.map(t => {
      if (t.id === tripId || t.tloNumber === tripId) {
        const existing = t.cohEntries || [];
        const shouldAutoTransition = entry.type === 'DEBIT' && (t.status === 'DISPATCHED' || !t.status);
        return { 
          ...t, 
          status: shouldAutoTransition ? 'IN_TRANSIT' : t.status,
          cohEntries: [...existing, newEntry], 
          updatedAt: new Date().toISOString() 
        };
      }
      return t;
    }));
    this.logAuditAction('UPDATE', 'Cash Engine', `Added COH Entry (₱${entry.amount || 0}) for ${tripId}`);
  }

  updatePreviousTripBalance(tripId: string, balance: any) {
    this.dispatches.update(list => list.map(t => t.id === tripId ? { ...t, previousTripBalance: balance, updatedAt: new Date().toISOString() } : t));
  }

  isTripOverdue(trip: TripDispatch): boolean {
    if (trip.status === 'ARRIVED' || (trip.status as any) === 'POD_SUBMITTED' || trip.status === 'FOR_REVIEW') return false;
    const diff = Date.now() - new Date(trip.dispatchedAt).getTime();
    return diff > 48 * 3600 * 1000;
  }

  // Phase 4 Checkpoint 2C: Exception Resolution
  resolveReconciliationException(
    exceptionId: string, 
    action: 'ACCEPT_PORBIDO' | 'ACCEPT_CLIENT' | 'ADJUSTMENT' | 'DISPUTED',
    notes: string,
    adjustmentData?: { type: 'POSITIVE' | 'NEGATIVE', amount: number }
  ) {
    const exception = this.reconciliationExceptions().find(e => e.id === exceptionId);
    if (!exception) throw new Error('Exception not found');
    if (exception.status !== 'OPEN') throw new Error('Exception is already resolved or disputed');
    
    const session = this.reconciliationSessions().find(s => s.id === exception.sessionId);
    if (!session) throw new Error('Session not found');

    const currentUser = this.userRole() === 'OWNER' ? 'Joery San Felipe (Owner)' : 'Admin Staff';
    const timestamp = new Date().toISOString();

    let resolutionAction: 'ACCEPT_PORBIDO' | 'ACCEPT_CLIENT' | 'ADJUSTMENT' | undefined;
    let adjustmentId: string | undefined;

    if (action === 'ADJUSTMENT') {
      if (!adjustmentData) throw new Error('Adjustment data required');
      resolutionAction = 'ADJUSTMENT';
      adjustmentId = 'adj-' + Date.now();
      
      const adjustment: ReconciliationAdjustment = {
        id: adjustmentId,
        sessionId: session.id,
        exceptionId: exception.id,
        type: adjustmentData.type,
        amount: adjustmentData.amount,
        reason: notes,
        createdAt: timestamp,
        createdBy: currentUser
      };
      
      this.reconciliationAdjustments.update(adj => [...adj, adjustment]);
    } else if (action === 'ACCEPT_PORBIDO' || action === 'ACCEPT_CLIENT') {
      resolutionAction = action;
    }

    let newStatus: ExceptionStatus = action === 'DISPUTED' ? 'DISPUTED' : 'RESOLVED';

    const resolution: ReconciliationResolution | undefined = resolutionAction ? {
      action: resolutionAction,
      notes,
      adjustmentId,
      confirmedAt: timestamp,
      confirmedBy: currentUser
    } : undefined;

    this.reconciliationExceptions.update(list => list.map(e => {
      if (e.id === exceptionId) {
        return {
          ...e,
          status: newStatus,
          resolution,
          disputeReason: action === 'DISPUTED' ? notes : e.disputeReason
        };
      }
      return e;
    }));

    let auditAction: AuditAction;
    if (action === 'DISPUTED') {
      auditAction = 'DISPUTE_ACKNOWLEDGED';
    } else if (action === 'ADJUSTMENT') {
      auditAction = 'ADJUSTMENT_CREATED';
    } else {
      auditAction = 'RESOLUTION_RECORDED';
    }
    
    const auditEntry = {
      id: 'aud-recon-' + Date.now() + Math.floor(Math.random() * 1000),
      action: auditAction,
      timestamp,
      actor: currentUser,
      description: `Exception ${exceptionId} marked as ${action}`
    };
    
    this.reconciliationSessions.update(list => list.map(s => {
      if (s.id === session.id) {
        return {
          ...s,
          auditTrail: [...s.auditTrail, auditEntry]
        };
      }
      return s;
    }));

    // Cloud Firestore Persistence
    const updatedExc = this.reconciliationExceptions().find(e => e.id === exceptionId);
    if (updatedExc) {
      this.firestoreAdapter.updateDocument('reconciliationExceptions', exceptionId, {
        status: updatedExc.status,
        resolution: updatedExc.resolution,
        disputeReason: updatedExc.disputeReason
      });
    }
    if (action === 'ADJUSTMENT' && adjustmentData) {
      const targetAdj = this.reconciliationAdjustments().find(a => a.exceptionId === exceptionId);
      if (targetAdj) {
        this.firestoreAdapter.saveDocument('reconciliationAdjustments', targetAdj.id, targetAdj);
      }
    }
    this.firestoreAdapter.updateDocument('reconciliationSessions', session.id, {
      auditTrail: (this.reconciliationSessions().find(s => s.id === session.id)?.auditTrail) || []
    });
  }
}
