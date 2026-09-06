export type RateType = 'PER_TON' | 'FLAT_RATE';

export type TripStatus = 'DISPATCHED' | 'IN_TRANSIT' | 'ARRIVED' | 'POD_SUBMITTED' | 'COMPLETED' | 'BILLED' | 'FOR_REVIEW';

export type BillingStatus = 'READY_TO_BILL' | 'IN_BILLING' | 'SUBMITTED' | 'VERIFIED' | 'FOR_REVIEW' | 'UNBILLED_FOLLOWUP';

export type PODStatus = 'PENDING' | 'APPROVED' | 'FLAGGED_BLURRY';

export type RouteTag = 'FRONTLOAD' | 'BACKLOAD';

export type CADeductionPreference = 'NEXT_TRIP_ALLOWANCE' | 'MONTHLY_PAYROLL';

export type CostCategory = 'DIESEL' | 'TOLL_FEES' | 'FOOD_PER_DIEM' | 'TRUCK_REPAIR' | 'OTHER_EXPENSE';

export interface TripCostItem {
  id: string;              // Format: ID_Date e.g. "cst01_01-22-2026"
  category: CostCategory;
  amount: number;
  date: string;
  description?: string;
  receiptImage?: string;   // Optional attached receipt photo
}

export interface TripRoute {
  origin: string;
  destination: string;
  routeTag: RouteTag;
}

export interface TripCargo {
  commodity: string;
  bagCount: number;
  tonnage: number;
}

export interface TripPricing {
  rateType: RateType;
  truckRate: number;
  rerouteFee: number;
  extraFees: number;
  grossFreight: number;
}

export interface TripPayroll {
  driverSalary: number;
  helperSalary: number;
  totalCrewPayroll: number;
}

export interface TripCashLedger {
  previousCarryover?: {
    amount: number;
    type: 'OVERAGE' | 'SHORTAGE' | 'BALANCED';
    fromTloNumber?: string;
  };
  entries: COHEntry[];
}

export interface TripTruckSnapshot {
  plateNumber: string;
  driver: {
    id: string;
    name: string;
  };
  helper?: {
    id: string;
    name: string;
  } | null;
}

export interface Trip {
  id: string;              // e.g. "trp-101"
  tripNumber?: number;     // Strictly number only (no letters / prefixes) e.g. 29
  tloNumber: number | string; // Numerical string or number e.g. 904816
  plateNumber: string;     // Asset plate
  truckType?: string;      // e.g. "10-Wheeler Heavy Truck"
  driverName: string;
  helperName?: string;
  origin: string;
  destination: string;
  dispatchedAt: string;    // ISO date string
  deliveredAt?: string;
  tonnage: number;
  baseRate: number;
  rateType: RateType;
  totalFreightCharge: number;
  status: TripStatus;
  podStatus: PODStatus;

  // ── Organised Clean Grouped Structure
  route?: TripRoute;
  cargo?: TripCargo;
  pricing?: TripPricing;
  payroll?: TripPayroll;
  cashLedger?: TripCashLedger;
  createdAt?: string;

  // Standard Structure Properties
  dispatchedDate?: string;  // e.g. "2026-01-22"
  deliveredDate?: string;  // e.g. "2026-01-23"
  originFrom?: string;      // e.g. "Subic Port"
  destinationTo?: string;   // e.g. "Cargill Pulilan Feeds Mill"
  routeTag?: RouteTag;      // "FRONTLOAD" | "BACKLOAD"
  truck?: TripTruckSnapshot;
  truckRate?: number;       // e.g. 1100.00
  weightTons?: number;      // e.g. 32.50 tons
  cost?: number;            // Total Expenses
  costItems?: TripCostItem[]; // Breakdown list
  operatingExpenses?: number; // Total Crew Operating Expenses (debited COH or travel/diesel/food)
  totalTripCost?: number;   // Total Trip Cost: Operating Expenses + Crew Payroll
  freightRevenue?: number;  // Gross Cargill Charge
  netIncome?: number;       // Company Profit: Freight Revenue − Total Trip Cost

  // Additional Operational fields
  rerouteFeeApplied?: boolean;
  rerouteFee?: number;
  extraFees?: number;
  billingStatus?: BillingStatus;
  podImageUrl?: string | null;
  podFlagReason?: string;
  client?: string;
  commodity?: string;
  bagCount?: number;
  updatedAt?: string;
  travelExpenses?: number;
  foodExpenses?: number;
  dieselExpenses?: number;
  driverSalary?: number;
  helperSalary?: number;
  cohEntries?: COHEntry[];
  previousTripBalance?: DriverLastTripBalance;
  previousCarryover?: {
    amount: number;
    type: 'OVERAGE' | 'SHORTAGE' | 'BALANCED';
    fromTripId?: string;
    fromTloNumber?: string;
  };
  endingCOHBalance?: number;
  endingCOHType?: 'OVERAGE' | 'SHORTAGE' | 'BALANCED';
  travelReceiptUrl?: string;
  dieselReceiptUrl?: string;
  caDeductionPreference?: CADeductionPreference;
  billingSaNumber?: string;
  billingBatchId?: string;
  notes?: string;
}

export type TripDispatch = Trip;

export interface MasterRoute {
  id: string;
  origin: string;
  destination: string;
  rateType: RateType;
  baseRate: number;
  description: string;
  routeTag?: RouteTag;
}

export type COHCategory = 
  | 'DISPATCH_ADVANCE' 
  | 'ADDITIONAL_SENT' 
  | 'ATM_WITHDRAWAL' 
  | 'OTHER_CREDIT'
  | 'DIESEL'
  | 'TOLL_FEES'
  | 'FOOD_PER_DIEM'
  | 'EMERGENCY_REPAIR' 
  | 'OTHER_INCIDENTAL'
  | 'FUEL_TOLL_ADVANCE';

export interface COHEntry {
  id: string;
  tripId: string;
  category?: COHCategory | string;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  description: string;
  timestamp: string;
  proofUrl?: string;
  proofDataUrl?: string;
  proofStatus?: PODStatus;
  flagReason?: string;
  date?: string;
}

export type TransactionCategory = CostCategory | COHCategory | 'INITIAL_COH' | 'GCASH_REMITTANCE' | 'OTHER_CREDIT';

export interface CashTransactionItem {
  id: string;
  tripId?: string;
  date: string;
  category?: TransactionCategory | string;
  type: 'CREDIT' | 'DEBIT';
  description: string;
  amount: number;
  runningBalance?: number;
  proofUrl?: string;
  proofDataUrl?: string;
  proofStatus?: PODStatus;
}

export type COHBalanceType = 'OVERAGE' | 'SHORTAGE' | 'BALANCED';

export interface DriverLastTripBalance {
  amount: number;
  type: COHBalanceType;
  lastTripTloNumber?: string;
  notes?: string;
}

export interface PendingDriverSubmission {
  id: string;
  tloNumber: string;
  driverName: string;
  date: string;
  loggedExpensesCount: number;
  travelExpenses?: number;
  foodExpenses?: number;
  dieselExpenses?: number;
  requestedAdvance?: number;
  tloReceiptUrl?: string;
}
