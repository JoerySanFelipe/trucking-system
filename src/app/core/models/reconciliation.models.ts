import { Trip } from './trip.models';

export interface ClientStatement {
  id: string;
  client: string;
  statementPeriod: string;
  statementNumber: string;
  statementDate: string;
  totalAmount: number;
}

export interface ClientStatementLine {
  id: string;
  statementId: string;
  shipmentRefNumber: string;
  shipmentDate: string;
  plateNumber: string;
  route: string;
  weight: number;
  payableAmount: number;
}

export type ExceptionType = 
  | 'AMOUNT_MISMATCH' 
  | 'DETAIL_MISMATCH' 
  | 'MISSING_IN_CLIENT' 
  | 'MISSING_IN_PORBIDO' 
  | 'DUPLICATE_REFERENCE'
  | 'MATCHED';

export type ExceptionStatus = 'OPEN' | 'RESOLVED' | 'DISPUTED';

export type ResolutionAction = 'ACCEPT_PORBIDO' | 'ACCEPT_CLIENT' | 'ADJUSTMENT';

export interface ReconciliationAdjustment {
  id: string;
  sessionId: string;
  exceptionId: string;
  type: 'POSITIVE' | 'NEGATIVE';
  amount: number;
  reason: string;
  createdAt: string;
  createdBy: string;
}

export interface ReconciliationResolution {
  action: ResolutionAction;
  notes?: string;
  adjustmentId?: string;
  confirmedAt: string;
  confirmedBy: string;
}

export interface ReconciliationException {
  id: string;
  sessionId: string;
  type: ExceptionType;
  status: ExceptionStatus;
  matchMethod: 'TLO_EXACT' | 'FALLBACK_HEURISTIC' | 'NONE';
  porbidoTripId?: string;
  clientLineId?: string;
  amountVariance: number;
  weightVariance: number;
  resolution?: ReconciliationResolution;
  disputeReason?: string;
  porbidoTrip?: Trip;
  clientLine?: ClientStatementLine;
}

export type SessionStatus = 'DRAFT' | 'IN_REVIEW' | 'CLOSED';
export type FinalReconciliationResult = 'FULLY_RECONCILED' | 'RECONCILED_WITH_ADJUSTMENTS' | 'RECONCILED_WITH_DISPUTES';

export type AuditAction = 
  | 'SESSION_CREATED' 
  | 'STATEMENT_ADDED' 
  | 'MATCHING_RUN' 
  | 'EXCEPTION_DETECTED' 
  | 'RESOLUTION_RECORDED' 
  | 'ADJUSTMENT_CREATED' 
  | 'DISPUTE_ACKNOWLEDGED' 
  | 'SESSION_CLOSED' 
  | 'SESSION_REOPENED';

export interface ReconciliationAuditEntry {
  id: string;
  action: AuditAction;
  timestamp: string;
  actor: string;
  description: string;
  referenceId?: string;
}

export interface ReconciliationSession {
  id: string;
  client: string;
  billingPeriod: string;
  statementId: string;
  porbidoBillingIds: string[];
  status: SessionStatus;
  finalResult?: FinalReconciliationResult;
  createdAt: string;
  closedAt?: string;
  auditTrail: ReconciliationAuditEntry[];
}
