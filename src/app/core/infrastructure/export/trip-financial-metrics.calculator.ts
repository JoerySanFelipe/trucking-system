import { TripDispatch, COHEntry } from '../../models/tms.models';
import { TripFinancialMetrics } from './export.types';

export class TripFinancialMetricsCalculator {
  static compute(trip: TripDispatch, cohEntries: COHEntry[] = []): TripFinancialMetrics {
    let fuel = 0;
    let toll = 0;
    let meals = 0;
    let maintenance = 0;
    let others = 0;
    let totalDebit = 0;
    let totalCredit = 0;

    for (const e of cohEntries) {
      const amt = Number(e.amount) || 0;
      if (e.type === 'CREDIT') {
        totalCredit += amt;
      } else {
        totalDebit += amt;
        const cat = (e.category || '').toUpperCase();
        const desc = (e.description || '').toLowerCase();
        if (cat === 'DIESEL' || desc.includes('diesel') || desc.includes('fuel') || desc.includes('gas') || desc.includes('petron') || desc.includes('shell')) {
          fuel += amt;
        } else if (cat === 'TOLL_FEES' || desc.includes('toll') || desc.includes('nlex') || desc.includes('sctex') || desc.includes('tplex') || desc.includes('rfid') || desc.includes('easytrip') || desc.includes('autosweep')) {
          toll += amt;
        } else if (cat === 'FOOD_PER_DIEM' || desc.includes('food') || desc.includes('meal') || desc.includes('per diem')) {
          meals += amt;
        } else if (cat === 'EMERGENCY_REPAIR' || desc.includes('vulcaniz') || desc.includes('gulong') || desc.includes('tire') || desc.includes('repair') || desc.includes('maintenance') || desc.includes('change oil') || desc.includes('langis') || desc.includes('mekaniko') || desc.includes('labor') || desc.includes('welding') || desc.includes('pito')) {
          maintenance += amt;
        } else {
          others += amt;
        }
      }
    }

    // Fallback to trip summary fields if cohEntries are empty or 0
    if (totalDebit === 0 && (trip.cost || trip.travelExpenses || trip.dieselExpenses)) {
      fuel = trip.dieselExpenses || 0;
      toll = 0;
      meals = trip.foodExpenses || 0;
      others = trip.travelExpenses || 0;
      totalDebit = trip.cost || (fuel + toll + meals + maintenance + others);
    }

    const baseRate = trip.baseRate || trip.truckRate || 0;
    const tonnage = trip.tonnage || trip.weightTons || 0;
    let grossFreight = trip.totalFreightCharge || trip.freightRevenue || 0;
    if (grossFreight === 0 && baseRate > 0) {
      if (trip.rateType === 'FLAT_RATE') {
        grossFreight = baseRate + (trip.rerouteFeeApplied ? 3600 : 0) + (trip.extraFees || 0);
      } else {
        grossFreight = (tonnage * baseRate) + (trip.rerouteFeeApplied ? 3600 : 0) + (trip.extraFees || 0);
      }
    }

    const driverSalary = trip.driverSalary !== undefined ? trip.driverSalary : 2000;
    const helperSalary = trip.helperSalary !== undefined ? trip.helperSalary : (trip.helperName && trip.helperName !== 'None' && trip.helperName !== 'Unassigned' ? 750 : 0);
    const totalCrewPayroll = driverSalary + helperSalary;

    const netTripIncome = grossFreight - totalDebit - totalCrewPayroll;
    const margin = grossFreight > 0 ? (netTripIncome / grossFreight) * 100 : 0;

    // Previous trip carryover
    const prevAmt = trip.previousCarryover?.amount || trip.previousTripBalance?.amount || 0;
    const prevType = trip.previousCarryover?.type || trip.previousTripBalance?.type || 'BALANCED';
    const signedCarryover = prevType === 'SHORTAGE' ? -prevAmt : (prevType === 'OVERAGE' ? prevAmt : 0);

    const startingCOH = signedCarryover + totalCredit;
    const endingBalance = startingCOH - totalDebit;
    let endingType: 'SURPLUS' | 'DEFICIT' | 'BALANCED' = 'BALANCED';
    if (endingBalance > 0.01) endingType = 'SURPLUS';
    else if (endingBalance < -0.01) endingType = 'DEFICIT';

    return {
      fuel,
      toll,
      meals,
      maintenance,
      others,
      totalDebit,
      totalCredit,
      baseRate,
      tonnage,
      grossFreight,
      driverSalary,
      helperSalary,
      totalCrewPayroll,
      netTripIncome,
      margin,
      prevAmt,
      prevType,
      signedCarryover,
      startingCOH,
      endingBalance,
      endingType
    };
  }
}
