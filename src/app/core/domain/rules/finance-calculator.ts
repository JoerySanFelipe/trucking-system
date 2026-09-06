/**
 * Pure Domain Engine: Financial Invariants & Calculations
 * 
 * Centralized, framework-agnostic mathematical rules for Porbido Trucking TMS.
 * Strictly decoupled from Angular UI and Firebase persistence layers.
 */

export interface TripPnlBreakdown {
  grossFreight: number;
  totalOperatingExpenses: number;
  crewPayroll: number;
  totalTripCost: number;
  netCompanyIncome: number;
  profitMarginPercent: number;
}

export interface CashAccountabilityResult {
  totalCashOnHand: number;
  operatingExpensesSpent: number;
  endingCashBalance: number;
  status: 'BALANCED' | 'SURPLUS' | 'DEFICIT';
}

import { RouteRegistry, RouteDefinition } from './route-registry';

export type MasterRouteDefinition = RouteDefinition;

export class FinanceCalculator {
  /**
   * Fixed Re-route fee invariant in Philippine Peso (₱)
   */
  static readonly REROUTE_FEE = 3600;

  /**
   * Master Cargill Hauling Routes & Rate Schemas (Single Source of Truth from RouteRegistry)
   */
  static readonly MASTER_ROUTES: readonly RouteDefinition[] = RouteRegistry.MASTER_CARGILL_ROUTES;

  /**
   * Finds preset master route configuration by origin and destination
   */
  static findMasterRoute(origin: string, destination: string): RouteDefinition | undefined {
    return RouteRegistry.findRoute(origin, destination);
  }

  /**
   * Calculates gross freight revenue based on Rate Scheme and Re-route fee
   * 
   * Invariants:
   * - PER_TON: (Tonnage * BaseRate) + Re-route Fee (₱3,600) + Extra Fees
   * - FLAT_RATE: BaseRate + Re-route Fee (₱3,600) + Extra Fees
   */
  static calculateFreight(
    rateType: 'PER_TON' | 'FLAT_RATE',
    baseRate: number,
    tonnage: number,
    rerouteApplied: boolean,
    extraFees: number = 0
  ): number {
    const base = rateType === 'PER_TON' 
      ? Math.max(tonnage || 0, 0) * Math.max(baseRate || 0, 0) 
      : Math.max(baseRate || 0, 0);
    const reroute = rerouteApplied ? this.REROUTE_FEE : 0;
    const extras = Math.max(extraFees || 0, 0);

    return Math.round((base + reroute + extras) * 100) / 100;
  }

  /**
   * Console 1: Trip Profitability (P&L)
   * 
   * Formula:
   * Net Company Income = Gross Freight − (Operating Expenses + Crew Payroll)
   * Note: Strictly decoupled from Cash Accountability (Ending Cash Balance).
   */
  static calculateTripPnl(
    grossFreight: number,
    travelExpenses: number = 0,
    dieselExpenses: number = 0,
    foodExpenses: number = 0,
    driverSalary: number = 0,
    helperSalary: number = 0
  ): TripPnlBreakdown {
    const totalOperatingExpenses = Math.max(travelExpenses || 0, 0) + 
                                   Math.max(dieselExpenses || 0, 0) + 
                                   Math.max(foodExpenses || 0, 0);
    const crewPayroll = Math.max(driverSalary || 0, 0) + 
                        Math.max(helperSalary || 0, 0);
    const totalTripCost = totalOperatingExpenses + crewPayroll;
    const netCompanyIncome = (grossFreight || 0) - totalTripCost;
    const profitMarginPercent = grossFreight > 0 
      ? Math.round((netCompanyIncome / grossFreight) * 1000) / 10 
      : 0;

    return {
      grossFreight: Math.round((grossFreight || 0) * 100) / 100,
      totalOperatingExpenses: Math.round(totalOperatingExpenses * 100) / 100,
      crewPayroll: Math.round(crewPayroll * 100) / 100,
      totalTripCost: Math.round(totalTripCost * 100) / 100,
      netCompanyIncome: Math.round(netCompanyIncome * 100) / 100,
      profitMarginPercent
    };
  }

  /**
   * Console 2: Three-Box Cash Accountability
   * 
   * Formula:
   * Ending Cash Balance = (Starting Allowance + Carried Over Balance) − Operating Expenses Spent
   * Note: Strictly decoupled from Trip Profitability.
   */
  static calculateCashAccountability(
    startingAllowance: number,
    operatingExpensesSpent: number,
    carriedOverBalance: number = 0
  ): CashAccountabilityResult {
    const totalCashOnHand = Math.max(startingAllowance || 0, 0) + (carriedOverBalance || 0);
    const spent = Math.max(operatingExpensesSpent || 0, 0);
    const endingCashBalance = totalCashOnHand - spent;

    let status: 'BALANCED' | 'SURPLUS' | 'DEFICIT' = 'BALANCED';
    if (endingCashBalance > 0) status = 'SURPLUS';
    else if (endingCashBalance < 0) status = 'DEFICIT';

    return {
      totalCashOnHand: Math.round(totalCashOnHand * 100) / 100,
      operatingExpensesSpent: Math.round(spent * 100) / 100,
      endingCashBalance: Math.round(endingCashBalance * 100) / 100,
      status
    };
  }

  /**
   * Driver & Helper Payroll Liquidation
   * 
   * Formula:
   * Net Salary Payable = Trip Base Pay − Cash Advance Deductions
   */
  static calculateCrewNetPay(basePay: number, cashAdvanceDeductions: number = 0): number {
    const gross = Math.max(basePay || 0, 0);
    const deductions = Math.max(cashAdvanceDeductions || 0, 0);
    return Math.max(Math.round((gross - deductions) * 100) / 100, 0);
  }

  /**
   * Sums itemized cost amounts
   */
  static calculateTotalCost(costItems?: { amount: number }[]): number {
    if (!costItems || costItems.length === 0) return 0;
    const total = costItems.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
    return Math.round(total * 100) / 100;
  }

  /**
   * Calculates Net Company Income
   * Formula: Freight Revenue - Total Cost - Crew Payroll
   */
  static calculateCompanyNetIncome(freightRevenue: number, totalCost: number, crewPayroll: number = 0): number {
    const revenue = Number(freightRevenue) || 0;
    const cost = Number(totalCost) || 0;
    const payroll = Number(crewPayroll) || 0;
    return Math.round((revenue - cost - payroll) * 100) / 100;
  }
}
