/**
 * Pure Domain Engine: Reconciliation 5-Pass Cross-Matching Algorithm
 * 
 * Centralized, framework-agnostic bi-directional matching engine for Porbido Trucking TMS.
 * Cross-matches Porbido Dispatches against independent Client Statement lines.
 */

import { 
  TripDispatch, 
  ClientStatementLine, 
  ReconciliationException, 
  ExceptionType 
} from '../../models/tms.models';

export class ReconciliationMatchingEngine {
  /**
   * Executes deterministic 5-pass bi-directional cross-matching
   * 
   * Pass 1: Duplicate Reference Detection in Client Statement
   * Pass 2: Exact TLO# Match
   * Pass 3: Fallback Heuristic Match (Plate Number + Cargo Weight + Tolerant Amount)
   * Pass 4: Unmatched Porbido Trips (Missing in Client Statement - Unclaimed Revenue)
   * Pass 5: Unmatched Client Lines (Missing in Porbido - Unrecorded Trip)
   */
  static match(
    sessionId: string,
    porbidoTrips: TripDispatch[],
    statementLines: ClientStatementLine[]
  ): ReconciliationException[] {
    const exceptions: ReconciliationException[] = [];
    const matchedTripIds = new Set<string>();
    const matchedLineIds = new Set<string>();

    // Pass 1: Duplicate Reference Detection in Client Statement
    const tloGroups = new Map<string, ClientStatementLine[]>();
    for (const line of statementLines) {
      const group = tloGroups.get(line.shipmentRefNumber) || [];
      group.push(line);
      tloGroups.set(line.shipmentRefNumber, group);
    }

    for (const [tlo, lines] of tloGroups.entries()) {
      if (lines.length > 1) {
        for (const line of lines) {
          matchedLineIds.add(line.id);
          exceptions.push(
            this.createException(sessionId, 'DUPLICATE_REFERENCE', 'NONE', 0, 0, undefined, line)
          );
        }
      }
    }

    // Pass 2 & 3: Exact TLO Match & Fallback Heuristic Match
    for (const trip of porbidoTrips) {
      if (matchedTripIds.has(trip.id)) continue;

      const exactLines = tloGroups.get(String(trip.tloNumber)) || [];
      const exactLine = exactLines.length === 1 && !matchedLineIds.has(exactLines[0].id) ? exactLines[0] : null;

      let matchedLine: ClientStatementLine | null = null;
      let matchMethod: 'TLO_EXACT' | 'FALLBACK_HEURISTIC' | 'NONE' = 'NONE';

      if (exactLine) {
        matchedLine = exactLine;
        matchMethod = 'TLO_EXACT';
      } else {
        // Pass 3: Fallback Heuristic Match (Matching Plate, Weight, within ₱1,000 threshold)
        const heuristicLine = statementLines.find(l => 
          !matchedLineIds.has(l.id) && 
          l.plateNumber.trim().toUpperCase() === trip.plateNumber.trim().toUpperCase() && 
          l.weight === trip.tonnage && 
          Math.abs(l.payableAmount - trip.totalFreightCharge) <= 1000
        );
        if (heuristicLine) {
          matchedLine = heuristicLine;
          matchMethod = 'FALLBACK_HEURISTIC';
        }
      }

      if (matchedLine) {
        matchedTripIds.add(trip.id);
        matchedLineIds.add(matchedLine.id);

        const amountVariance = matchedLine.payableAmount - trip.totalFreightCharge;
        const weightVariance = matchedLine.weight - trip.tonnage;

        let type: ExceptionType = 'MATCHED';
        if (amountVariance !== 0) {
          type = 'AMOUNT_MISMATCH';
        } else if (weightVariance !== 0 || matchedLine.plateNumber !== trip.plateNumber) {
          type = 'DETAIL_MISMATCH';
        }

        exceptions.push(
          this.createException(sessionId, type, matchMethod, amountVariance, weightVariance, trip, matchedLine)
        );
      } else {
        // Pass 4: Missing in Client Statement (Unclaimed Porbido Revenue)
        exceptions.push(
          this.createException(sessionId, 'MISSING_IN_CLIENT', 'NONE', -trip.totalFreightCharge, -trip.tonnage, trip, undefined)
        );
      }
    }

    // Pass 5: Unmatched Client Lines (Missing in Porbido Internal Logs)
    for (const line of statementLines) {
      if (!matchedLineIds.has(line.id)) {
        exceptions.push(
          this.createException(sessionId, 'MISSING_IN_PORBIDO', 'NONE', line.payableAmount, line.weight, undefined, line)
        );
      }
    }

    return exceptions;
  }

  private static createException(
    sessionId: string,
    type: ExceptionType,
    matchMethod: 'TLO_EXACT' | 'FALLBACK_HEURISTIC' | 'NONE',
    amountVariance: number,
    weightVariance: number,
    porbidoTrip?: TripDispatch,
    clientLine?: ClientStatementLine
  ): ReconciliationException {
    return {
      id: 'exc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      sessionId,
      type,
      status: type === 'MATCHED' ? 'RESOLVED' : 'OPEN',
      matchMethod,
      porbidoTripId: porbidoTrip?.id,
      porbidoTrip,
      clientLineId: clientLine?.id,
      clientLine,
      amountVariance: Math.round(amountVariance * 100) / 100,
      weightVariance: Math.round(weightVariance * 100) / 100
    };
  }
}
