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

@Injectable({
  providedIn: 'root'
})
export class TmsService {

  private firebaseService = inject(FirebaseService);

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
    this.listenToFirestoreDispatches();
    this.listenToFirestoreFleet();
    this.listenToFirestoreCrew();
  }

  // Real-time listener for Firestore dispatches collection
  private listenToFirestoreDispatches() {
    try {
      const colRef = collection(this.firebaseService.db, 'dispatches');
      onSnapshot(colRef, (snapshot) => {
        const liveItems: TripDispatch[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as TripDispatch));
        this.dispatches.set(liveItems);
      }, (error) => {
        console.info('Firestore offline fallback:', error.message);
      });
    } catch (e) {
      console.info('Firestore error');
    }
  }

  // Real-time listener for Firestore fleet collection
  private listenToFirestoreFleet() {
    try {
      const colRef = collection(this.firebaseService.db, 'fleet');
      onSnapshot(colRef, (snapshot) => {
        const liveItems: FleetAsset[] = snapshot.docs.map(doc => {
          const data = doc.data() as any;
          return {
            id: doc.id,
            plateNumber: data.plateNumber || '',
            status: data.status || 'Available',
            tonsCapacity: data.tonsCapacity ?? data.capacityTons ?? 30,
            assignedCrew: data.assignedCrew || {
              driver: { id: 'd-1', name: data.assignedDriver || 'None', role: 'Driver' },
              helper: data.assignedHelper ? { id: 'h-1', name: data.assignedHelper, role: 'Helper' } : null
            },
            maintenanceLogs: data.maintenanceLogs || [],
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
          } as FleetAsset;
        });
        this.fleet.set(liveItems);
      }, (error) => {
        console.info('Firestore fleet listener fallback:', error.message);
      });
    } catch (e) {
      console.info('Firestore fleet error');
    }
  }

  // Real-time listener for Firestore crew collection
  private listenToFirestoreCrew() {
    try {
      const colRef = collection(this.firebaseService.db, 'crew');
      onSnapshot(colRef, (snapshot) => {
        const liveItems: Driver[] = snapshot.docs.map(doc => {
          const data = doc.data() as any;
          return {
            id: doc.id,
            name: data.name || '',
            role: data.role || 'Driver',
            type: data.type || 'Regular',
            phone: data.contactNumber || data.phone || '',
            status: data.status || 'Active',
            startingCOH: data.startingCOH || 0,
            currentCOH: data.currentCOH || 0
          } as Driver;
        });
        this.drivers.set(liveItems);
      }, (error) => {
        console.info('Firestore crew listener fallback:', error.message);
      });
    } catch (e) {
      console.info('Firestore crew error');
    }
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
    
    this.billingBatches.update(b => [...b, batch]);
    
    this.dispatches.update(list => list.map(t => {
      if (tripIds.includes(t.id)) {
        return { ...t, billingBatchId: batch.id, updatedAt: new Date().toISOString() };
      }
      return t;
    }));
    
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

    this.reconciliationSessions.update(s => [...s, session]);
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
    
    const newExceptions: ReconciliationException[] = [];
    const matchedTripIds = new Set<string>();
    const matchedLineIds = new Set<string>();
    
    // 1. Detect DUPLICATE_REFERENCE in Client Statement
    const tloCounts = new Map<string, ClientStatementLine[]>();
    for (const line of statementLines) {
      if (!tloCounts.has(line.shipmentRefNumber)) {
        tloCounts.set(line.shipmentRefNumber, []);
      }
      tloCounts.get(line.shipmentRefNumber)!.push(line);
    }
    
    for (const [tlo, lines] of tloCounts.entries()) {
      if (lines.length > 1) {
        for (const line of lines) {
          matchedLineIds.add(line.id);
          newExceptions.push({
            id: 'exc-' + Date.now() + Math.random().toString(36).substr(2, 5),
            sessionId,
            type: 'DUPLICATE_REFERENCE',
            status: 'OPEN',
            matchMethod: 'NONE',
            clientLineId: line.id,
            clientLine: line,
            amountVariance: 0,
            weightVariance: 0
          });
        }
      }
    }
    
    // 2. Match Trips
    for (const trip of trips) {
      if (matchedTripIds.has(trip.id)) continue;
      
      const exactLines = tloCounts.get(String(trip.tloNumber)) || [];
      const exactLine = exactLines.length === 1 && !matchedLineIds.has(exactLines[0].id) ? exactLines[0] : null;
      
      let matchedLine: ClientStatementLine | null = null;
      let matchMethod: 'TLO_EXACT' | 'FALLBACK_HEURISTIC' | 'NONE' = 'NONE';
      
      if (exactLine) {
        matchedLine = exactLine;
        matchMethod = 'TLO_EXACT';
      } else {
        // Fallback Heuristic
        const heuristicLine = statementLines.find(l => 
           !matchedLineIds.has(l.id) && 
           l.plateNumber === trip.plateNumber && 
           l.weight === trip.tonnage && 
           Math.abs(l.payableAmount - trip.totalFreightCharge) <= 1000 // Simple heuristic example
        );
        if (heuristicLine) {
          matchedLine = heuristicLine;
          matchMethod = 'FALLBACK_HEURISTIC';
        }
      }
      
      if (matchedLine) {
        matchedTripIds.add(trip.id);
        matchedLineIds.add(matchedLine.id);
        
        let type: ExceptionType = 'MATCHED';
        const amountVariance = matchedLine.payableAmount - trip.totalFreightCharge;
        const weightVariance = matchedLine.weight - trip.tonnage;
        
        if (amountVariance !== 0) {
          type = 'AMOUNT_MISMATCH';
        } else if (weightVariance !== 0 || matchedLine.plateNumber !== trip.plateNumber) {
          type = 'DETAIL_MISMATCH';
        }
        
        newExceptions.push({
          id: 'exc-' + Date.now() + Math.random().toString(36).substr(2, 5),
          sessionId,
          type,
          status: type === 'MATCHED' ? 'RESOLVED' : 'OPEN',
          matchMethod,
          porbidoTripId: trip.id,
          porbidoTrip: trip,
          clientLineId: matchedLine.id,
          clientLine: matchedLine,
          amountVariance,
          weightVariance
        });
      } else {
        newExceptions.push({
          id: 'exc-' + Date.now() + Math.random().toString(36).substr(2, 5),
          sessionId,
          type: 'MISSING_IN_CLIENT',
          status: 'OPEN',
          matchMethod: 'NONE',
          porbidoTripId: trip.id,
          porbidoTrip: trip,
          amountVariance: 0 - trip.totalFreightCharge,
          weightVariance: 0 - trip.tonnage
        });
      }
    }
    
    // 3. Unmatched Client Lines
    for (const line of statementLines) {
      if (!matchedLineIds.has(line.id)) {
        newExceptions.push({
          id: 'exc-' + Date.now() + Math.random().toString(36).substr(2, 5),
          sessionId,
          type: 'MISSING_IN_PORBIDO',
          status: 'OPEN',
          matchMethod: 'NONE',
          clientLineId: line.id,
          clientLine: line,
          amountVariance: line.payableAmount,
          weightVariance: line.weight
        });
      }
    }
    
    this.reconciliationExceptions.update(ex => [...ex, ...newExceptions]);
  }

  deleteDraftBilling(batchId: string) {
    const batch = this.billingBatches().find(b => b.id === batchId);
    if (!batch) throw new Error('Billing Batch not found');
    if (batch.status !== 'DRAFT') throw new Error('Only DRAFT billings can be deleted');

    this.billingBatches.update(list => list.filter(b => b.id !== batchId));
    
    this.dispatches.update(list => list.map(t => {
      if (t.billingBatchId === batchId) {
        return { ...t, billingBatchId: undefined, updatedAt: new Date().toISOString() };
      }
      return t;
    }));
  }

  submitDraftBilling(batchId: string) {
    const batch = this.billingBatches().find(b => b.id === batchId);
    if (!batch) throw new Error('Billing Batch not found');
    
    this.billingBatches.update(list => list.map(b => b.id === batchId ? { ...b, status: 'SUBMITTED' } : b));
    this.dispatches.update(list => list.map(t => t.billingBatchId === batchId ? { ...t, billingStatus: 'SUBMITTED', updatedAt: new Date().toISOString() } : t));
    
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
        return { ...t, cohEntries: [...existing, newEntry], updatedAt: new Date().toISOString() };
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
  }
}
