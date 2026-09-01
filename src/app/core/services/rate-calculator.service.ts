import { Injectable } from '@angular/core';
import { MasterRoute, RateType } from '../models/tms.models';
import { FinanceCalculator } from '../domain/rules/finance-calculator';

@Injectable({
  providedIn: 'root'
})
export class RateCalculatorService {

  readonly REROUTE_FEE = FinanceCalculator.REROUTE_FEE; // Fixed ₱3,600.00

  readonly masterRoutes: MasterRoute[] = [
    {
      id: 'route-1',
      origin: 'Subic Port',
      destination: 'Cargill Pulilan Feeds Mill',
      rateType: 'PER_TON',
      baseRate: 1100,
      description: '₱1,100.00 / ton (Short-haul)'
    },
    {
      id: 'route-2',
      origin: 'Cargill Pulilan Feeds Mill',
      destination: 'Cargill Iloilo Facility',
      rateType: 'FLAT_RATE',
      baseRate: 144000,
      description: '₱144,000.00 Flat rate'
    },
    {
      id: 'route-3',
      origin: 'Cargill Iloilo Facility',
      destination: 'Manila International Container Terminal (MICT)',
      rateType: 'FLAT_RATE',
      baseRate: 95500,
      description: '₱95,500.00 Flat rate'
    }
  ];

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
