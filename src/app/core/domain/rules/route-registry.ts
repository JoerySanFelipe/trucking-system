import { RateType, RouteTag } from '../../models/tms.models';

export interface RouteDefinition {
  readonly id: string;
  readonly origin: string;
  readonly destination: string;
  readonly rateType: RateType;
  readonly baseRate: number;
  readonly routeTag: RouteTag;
  readonly minTonnage?: number;
  readonly maxTonnage?: number;
  readonly description?: string;
}

/**
 * Pure Domain Authority: Canonical Route Definitions & Presets
 *
 * Centralized Single Source of Truth for all hauling routes across Porbido TMS.
 * Eliminates route string divergence between FinanceCalculator, RateCalculatorService,
 * and DEFAULT_CLIENTS.
 */
export class RouteRegistry {
  public static readonly MASTER_CARGILL_ROUTES: readonly RouteDefinition[] = Object.freeze([
    {
      id: 'route-subic-pulilan',
      origin: 'Subic Port',
      destination: 'Cargill Pulilan Feeds Mill',
      rateType: 'PER_TON',
      baseRate: 1100,
      routeTag: 'FRONTLOAD',
      minTonnage: 10,
      maxTonnage: 40,
      description: '₱1,100.00 / ton (Short-haul)'
    },
    {
      id: 'route-pulilan-iloilo',
      origin: 'Cargill Pulilan Feeds Mill',
      destination: 'Cargill Iloilo Facility',
      rateType: 'FLAT_RATE',
      baseRate: 144000,
      routeTag: 'FRONTLOAD',
      description: '₱144,000.00 Flat rate'
    },
    {
      id: 'route-iloilo-manila',
      origin: 'Cargill Iloilo Facility',
      destination: 'Manila Container Terminal',
      rateType: 'FLAT_RATE',
      baseRate: 95500,
      routeTag: 'BACKLOAD',
      description: '₱95,500.00 Flat rate'
    }
  ]);

  /**
   * Safe case-insensitive, whitespace-tolerant route matcher.
   * Handles naming variations like 'Manila Container Terminal' vs 'Manila International Container Terminal (MICT)'.
   */
  public static findRoute(origin: string, destination: string): RouteDefinition | undefined {
    if (!origin || !destination) return undefined;
    const cleanOrigin = origin.trim().toLowerCase();
    const cleanDest = destination.trim().toLowerCase();

    return this.MASTER_CARGILL_ROUTES.find(r => {
      const matchOrigin = r.origin.toLowerCase() === cleanOrigin;
      const targetDest = r.destination.toLowerCase();
      const matchDest = targetDest === cleanDest ||
        (cleanDest.includes('manila') && targetDest.includes('manila'));
      return matchOrigin && matchDest;
    });
  }
}
