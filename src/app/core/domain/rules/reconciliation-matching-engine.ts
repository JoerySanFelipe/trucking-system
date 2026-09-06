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
  private static readonly CURRENCY_EPSILON = 0.01; // 1 cent safety threshold
  private static readonly HEURISTIC_TOLERANCE = 1000; // ₱1,000 threshold for fallback heuristic

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
    porbidoTrips: readonly TripDispatch[],
    statementLines: readonly ClientStatementLine[]
  ): ReconciliationException[] {
    const exceptions: ReconciliationException[] = [];
    const matchedTripIds = new Set<string>();
    const matchedLineIds = new Set<string>();

    // ── Pre-indexing: 1. Group by TLO# | 2. Group by Plate + Weight for O(1) heuristic lookup
    const tloGroups = new Map<string, ClientStatementLine[]>();
    const heuristicBuckets = new Map<string, ClientStatementLine[]>();

    for (const line of statementLines) {
      // 1. TLO grouping
      const cleanRef = String(line.shipmentRefNumber || '').trim();
      const tloGroup = tloGroups.get(cleanRef) || [];
      tloGroup.push(line);
      tloGroups.set(cleanRef, tloGroup);

      // 2. Composite key grouping: "PLATE_WEIGHT"
      const bucketKey = `${line.plateNumber.trim().toUpperCase()}_${Number(line.weight || 0).toFixed(2)}`;
      const bucket = heuristicBuckets.get(bucketKey) || [];
      bucket.push(line);
      heuristicBuckets.set(bucketKey, bucket);
    }

    // ── Pass 1: Duplicate Reference Detection in Client Statement
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

    // ── Pass 2 & 3: Exact TLO Match & O(1) Fallback Heuristic Match
    for (const trip of porbidoTrips) {
      if (matchedTripIds.has(trip.id)) continue;

      const tripTlo = String(trip.tloNumber || '').trim();
      const exactLines = tloGroups.get(tripTlo) || [];
      const exactCandidate = exactLines.length === 1 && !matchedLineIds.has(exactLines[0].id) 
        ? exactLines[0] 
        : null;

      let matchedLine: ClientStatementLine | null = null;
      let matchMethod: 'TLO_EXACT' | 'FALLBACK_HEURISTIC' | 'NONE' = 'NONE';

      if (exactCandidate) {
        matchedLine = exactCandidate;
        matchMethod = 'TLO_EXACT';
      } else {
        // Pass 3: O(1) composite bucket lookup instead of O(N) linear search
        const bucketKey = `${trip.plateNumber.trim().toUpperCase()}_${Number(trip.tonnage || 0).toFixed(2)}`;
        const candidates = heuristicBuckets.get(bucketKey) || [];

        for (const candidate of candidates) {
          if (!matchedLineIds.has(candidate.id) && 
              Math.abs(candidate.payableAmount - trip.totalFreightCharge) <= this.HEURISTIC_TOLERANCE) {
            matchedLine = candidate;
            matchMethod = 'FALLBACK_HEURISTIC';
            break;
          }
        }
      }

      if (matchedLine) {
        matchedTripIds.add(trip.id);
        matchedLineIds.add(matchedLine.id);

        const rawAmountVariance = matchedLine.payableAmount - trip.totalFreightCharge;
        const rawWeightVariance = matchedLine.weight - trip.tonnage;

        // Epsilon-safe financial comparison (avoids IEEE 754 precision issues)
        const hasAmountDiff = Math.abs(rawAmountVariance) > this.CURRENCY_EPSILON;
        const hasWeightDiff = Math.abs(rawWeightVariance) > 0.001;
        const hasPlateDiff = matchedLine.plateNumber.trim().toUpperCase() !== trip.plateNumber.trim().toUpperCase();

        let type: ExceptionType = 'MATCHED';
        if (hasAmountDiff) {
          type = 'AMOUNT_MISMATCH';
        } else if (hasWeightDiff || hasPlateDiff) {
          type = 'DETAIL_MISMATCH';
        }

        exceptions.push(
          this.createException(sessionId, type, matchMethod, rawAmountVariance, rawWeightVariance, trip, matchedLine)
        );
      } else {
        // Pass 4: Missing in Client Statement (Unclaimed Porbido Revenue)
        exceptions.push(
          this.createException(sessionId, 'MISSING_IN_CLIENT', 'NONE', -trip.totalFreightCharge, -trip.tonnage, trip, undefined)
        );
      }
    }

    // ── Pass 5: Unmatched Client Lines (Missing in Porbido Internal Logs)
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
