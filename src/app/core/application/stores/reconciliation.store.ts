import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { 
  ReconciliationSession, 
  ReconciliationException, 
  ReconciliationAdjustment, 
  ClientStatement, 
  ClientStatementLine, 
  ResolutionAction,
  AuditAction,
  TripDispatch 
} from '../../models/tms.models';
import { FirestoreAdapterService } from '../../infrastructure/firebase/firestore-adapter.service';
import { ReconciliationMatchingEngine } from '../../domain/rules/reconciliation-matching-engine';

@Injectable({
  providedIn: 'root'
})
export class ReconciliationStore {
  private firestore = inject(FirestoreAdapterService);

  // State Signals
  readonly sessions = signal<ReconciliationSession[]>([]);
  readonly exceptions = signal<ReconciliationException[]>([]);
  readonly adjustments = signal<ReconciliationAdjustment[]>([]);
  readonly clientStatements = signal<ClientStatement[]>([]);
  readonly clientStatementLines = signal<ClientStatementLine[]>([]);

  // Loading State Signals
  readonly isLoadingSessions = signal<boolean>(true);
  readonly isLoadingExceptions = signal<boolean>(true);
  readonly isLoading = computed(() => this.isLoadingSessions() || this.isLoadingExceptions());

  constructor() {
    this.initPersistence();
  }

  private initPersistence() {
    // 1. Observe Firestore Collections
    this.firestore.observeCollection<ReconciliationSession>('reconciliationSessions', cloudSessions => {
      this.sessions.set(cloudSessions || []);
      this.isLoadingSessions.set(false);
    }, () => {
      this.isLoadingSessions.set(false);
    });

    this.firestore.observeCollection<ReconciliationException>('reconciliationExceptions', cloudExceptions => {
      this.exceptions.set(cloudExceptions || []);
      this.isLoadingExceptions.set(false);
    }, () => {
      this.isLoadingExceptions.set(false);
    });
  }

  getSessionById(id: string): ReconciliationSession | undefined {
    return this.sessions().find(s => s.id === id);
  }

  getExceptionsBySession(sessionId: string): ReconciliationException[] {
    return this.exceptions().filter(e => e.sessionId === sessionId);
  }

  getAdjustmentsBySession(sessionId: string): ReconciliationAdjustment[] {
    return this.adjustments().filter(a => a.sessionId === sessionId);
  }

  async createSession(
    client: string, 
    billingPeriod: string, 
    statementId: string, 
    porbidoBillingIds: string[], 
    porbidoTrips: TripDispatch[], 
    statementLines: ClientStatementLine[]
  ): Promise<ReconciliationSession> {
    const sessionId = 'recon-' + Date.now();
    
    const newSession: ReconciliationSession = {
      id: sessionId,
      client,
      billingPeriod,
      statementId,
      porbidoBillingIds,
      status: 'IN_REVIEW',
      createdAt: new Date().toISOString(),
      auditTrail: [
        {
          id: 'aud-' + Date.now(),
          action: 'SESSION_CREATED',
          timestamp: new Date().toISOString(),
          actor: 'Joemar Porbido',
          description: `Created Reconciliation Session for ${client} (${billingPeriod})`
        }
      ]
    };

    // Run Pure Matching Engine
    const generatedExceptions = ReconciliationMatchingEngine.match(sessionId, porbidoTrips, statementLines);

    // Update Signals
    this.sessions.update(list => [newSession, ...list]);
    this.exceptions.update(list => [...list, ...generatedExceptions]);

    // Firestore Sync
    await this.firestore.saveDocument('reconciliationSessions', sessionId, newSession);
    for (const exc of generatedExceptions) {
      await this.firestore.saveDocument('reconciliationExceptions', exc.id, exc);
    }

    return newSession;
  }

  async resolveException(
    exceptionId: string, 
    action: ResolutionAction, 
    notes?: string, 
    adjustmentData?: { type: 'POSITIVE' | 'NEGATIVE'; amount: number; reason: string }, 
    disputeReason?: string
  ): Promise<void> {
    const target = this.exceptions().find(e => e.id === exceptionId);
    if (!target) return;

    let adjustmentId: string | undefined;

    if (action === 'ADJUSTMENT' && adjustmentData) {
      adjustmentId = 'adj-' + Date.now();
      const newAdjustment: ReconciliationAdjustment = {
        id: adjustmentId,
        sessionId: target.sessionId,
        exceptionId: target.id,
        type: adjustmentData.type,
        amount: adjustmentData.amount,
        reason: adjustmentData.reason,
        createdAt: new Date().toISOString(),
        createdBy: 'Joemar Porbido'
      };
      this.adjustments.update(list => [...list, newAdjustment]);
      await this.firestore.saveDocument('reconciliationAdjustments', adjustmentId, newAdjustment);
    }

    const updatedStatus = action === 'ACCEPT_PORBIDO' || action === 'ACCEPT_CLIENT' || action === 'ADJUSTMENT' 
      ? 'RESOLVED' 
      : 'DISPUTED';

    const resolution = {
      action,
      notes,
      adjustmentId,
      confirmedAt: new Date().toISOString(),
      confirmedBy: 'Joemar Porbido'
    };

    this.exceptions.update(list => 
      list.map(e => e.id === exceptionId ? { 
        ...e, 
        status: updatedStatus, 
        resolution, 
        disputeReason: disputeReason || e.disputeReason 
      } : e)
    );

    await this.firestore.updateDocument('reconciliationExceptions', exceptionId, {
      status: updatedStatus,
      resolution,
      disputeReason: disputeReason || target.disputeReason
    });

    // Add Audit Log
    this.logSessionAction(
      target.sessionId, 
      'RESOLUTION_RECORDED', 
      `Recorded resolution '${action}' on exception ${exceptionId}`
    );
  }

  async logSessionAction(sessionId: string, action: AuditAction, description: string) {
    const entry = {
      id: 'aud-' + Date.now(),
      action,
      timestamp: new Date().toISOString(),
      actor: 'Joemar Porbido',
      description
    };

    this.sessions.update(list => 
      list.map(s => s.id === sessionId ? { 
        ...s, 
        auditTrail: [entry, ...(s.auditTrail || [])] 
      } : s)
    );

    const session = this.getSessionById(sessionId);
    if (session) {
      await this.firestore.updateDocument('reconciliationSessions', sessionId, {
        auditTrail: session.auditTrail
      });
    }
  }
}
