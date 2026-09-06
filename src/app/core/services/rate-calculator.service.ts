import { Injectable } from '@angular/core';
import { MasterRoute, RateType } from '../models/tms.models';
import { FinanceCalculator } from '../domain/rules/finance-calculator';

import { RouteRegistry } from '../domain/rules/route-registry';

@Injectable({
  providedIn: 'root'
})
export class RateCalculatorService {

  readonly REROUTE_FEE = FinanceCalculator.REROUTE_FEE; // Fixed ₱3,600.00

  readonly masterRoutes: MasterRoute[] = RouteRegistry.MASTER_CARGILL_ROUTES.map(r => ({
    id: r.id,
    origin: r.origin,
    destination: r.destination,
    rateType: r.rateType,
    baseRate: r.baseRate,
    description: r.description || ''
  }));

  calculateFreightCharge(
    rateType: RateType,
    baseRate: number,
    tonnage: number,
    applyRerouteFee: boolean,
    extraFees: number = 0
  ): number {
    return FinanceCalculator.calculateFreight(
      rateType,
      baseRate,
      tonnage,
      applyRerouteFee,
      extraFees
    );
  }
}
