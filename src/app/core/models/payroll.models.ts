import { CrewRole, CrewMember, CashAdvanceRecord, CrewSalaryRecord } from './fleet.models';
import { Trip } from './trip.models';

export type PayoutChannel = 'GCASH' | 'BANK_TRANSFER' | 'CASH';

export type PayrollPayoutStatus = 'PENDING' | 'PAID' | 'NO_EARNINGS';

export interface TripPayItem {
  tripId: string;
  tripNumber?: number;
  tloNumber: number | string;
  deliveredDate: string;
  dispatchedDate: string;
  origin: string;
  destination: string;
  plateNumber: string;
  rate: number;
}

export interface CrewPayrollSummary {
  crewId: string;
  crewName: string;
  role: CrewRole;
  phone?: string;
  completedTripsCount: number;
  trips: TripPayItem[];
  grossTripPay: number;
  outstandingCA: number;
  approvedDeduction: number;
  netPayable: number;
  payoutStatus: PayrollPayoutStatus;
  lastPayoutDate?: string;
  lastPayoutChannel?: PayoutChannel;
  lastPayoutRef?: string;
}

export interface PayrollPayoutRecord {
  id: string;
  crewId: string;
  crewName: string;
  role: CrewRole;
  periodLabel: string;
  fromDate: string;
  toDate: string;
  tripsIncluded: { tripId: string; tloNumber: string | number; amount: number }[];
  grossPay: number;
  caDeduction: number;
  netPayable: number;
  payoutChannel: PayoutChannel;
  referenceNumber?: string;
  notes?: string;
  paidAt: string;
  paidBy?: string;
}

export type PayrollPeriodType = '1ST_HALF' | '2ND_HALF' | 'THIS_MONTH' | 'ALL_PENDING' | 'CUSTOM';

export interface PayrollPeriodConfig {
  type: PayrollPeriodType;
  label: string;
  fromDate: string;
  toDate: string;
}
