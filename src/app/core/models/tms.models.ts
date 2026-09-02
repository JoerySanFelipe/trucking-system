export type RateType = 'PER_TON' | 'FLAT_RATE';

export type TripStatus = 'DISPATCHED' | 'IN_TRANSIT' | 'ARRIVED' | 'POD_SUBMITTED' | 'COMPLETED' | 'BILLED' | 'FOR_REVIEW';

export type BillingStatus = 'READY_TO_BILL' | 'IN_BILLING' | 'SUBMITTED' | 'VERIFIED' | 'FOR_REVIEW' | 'UNBILLED_FOLLOWUP';

export type PODStatus = 'PENDING' | 'APPROVED' | 'FLAGGED_BLURRY';

export type RouteTag = 'FRONTLOAD' | 'BACKLOAD';

export type CADeductionPreference = 'NEXT_TRIP_ALLOWANCE' | 'MONTHLY_PAYROLL';

export type MaintenanceServiceType = 'OIL_CHANGE' | 'TIRE_REPLACEMENT' | 'ENGINE_REPAIR' | 'ROUTINE_INSPECTION' | string;

// ─── 0. CLIENTS DOMAIN MODELS ────────────────────────────────────────────────

export interface ClientRoutePreset {
  origin: string;
  destination: string;
  rateType: RateType;
  baseRate: number;
  minTonnage?: number;
  maxTonnage?: number;
  routeTag?: RouteTag;
}

export interface Client {
  id: string;              // e.g. "cli-cargill"
  name: string;            // e.g. "Cargill Philippines Inc."
  code: string;            // e.g. "CARGILL"
  contactPerson?: string;
  contactNumber?: string;
  email?: string;
  address?: string;
  billingTermsDays?: number; // e.g. 30
  status: 'Active' | 'Inactive';
  defaultCommodity?: string;
  presetRoutes?: ClientRoutePreset[];
  createdAt?: string;
  updatedAt?: string;
}

export const DEFAULT_CLIENTS: Client[] = [
  {
    id: 'cli-cargill',
    name: 'Cargill Philippines Inc.',
    code: 'CARGILL',
    contactPerson: 'Logistics Division',
    contactNumber: '(02) 8848-8000',
    address: 'Pulilan, Bulacan / Subic Freeport / Iloilo',
    billingTermsDays: 30,
    status: 'Active',
    defaultCommodity: 'Feeds / Raw Materials',
    presetRoutes: [
      {
        origin: 'Subic Port',
        destination: 'Cargill Pulilan Feeds Mill',
        rateType: 'PER_TON',
        baseRate: 1100,
        minTonnage: 10,
        maxTonnage: 40,
        routeTag: 'FRONTLOAD'
      },
      {
        origin: 'Cargill Pulilan Feeds Mill',
        destination: 'Cargill Iloilo Facility',
        rateType: 'FLAT_RATE',
        baseRate: 144000,
        routeTag: 'FRONTLOAD'
      },
      {
        origin: 'Cargill Iloilo Facility',
        destination: 'Manila Container Terminal',
        rateType: 'FLAT_RATE',
        baseRate: 95500,
        routeTag: 'BACKLOAD'
      }
    ]
  },
  {
    id: 'cli-smc',
    name: 'San Miguel Foods (B-MEG)',
    code: 'SMC',
    status: 'Active',
    defaultCommodity: 'Animal Feeds & Grains',
    billingTermsDays: 30,
    presetRoutes: [
      {
        origin: 'Batangas Port',
        destination: 'SMC Feeds Mill Bataan',
        rateType: 'PER_TON',
        baseRate: 1250,
        routeTag: 'FRONTLOAD'
      }
    ]
  },
  {
    id: 'cli-urc',
    name: 'Universal Robina Corp (URC)',
    code: 'URC',
    status: 'Active',
    defaultCommodity: 'Flour / Sugar / Feeds',
    billingTermsDays: 30
  },
  {
    id: 'cli-general',
    name: 'Independent / Private Hauling',
    code: 'GEN',
    status: 'Active',
    defaultCommodity: 'General Cargo'
  }
];


// ─── 1. TRUCKS DOMAIN MODELS ─────────────────────────────────────────────────

export type TruckStatus = 'Available' | 'In Transit' | 'Maintenance' | 'Inactive';
export type FleetTruckStatus = TruckStatus;

export interface AssignedCrewMember {
  id: string;              // e.g. "crew-001"
  name: string;            // e.g. "Rowel Ortiz"
  role: 'Driver' | 'Helper';
}

export interface AssignedCrew {
  driver: AssignedCrewMember;
  helper?: AssignedCrewMember | null;
}

export interface MaintenanceRecord {
  id: string;              // Format: ID_Date e.g. "mnt01_01-22-2026"
  serviceType: MaintenanceServiceType;
  cost: number;
  date: string;
  description: string;
  performedBy?: string;
}
export type FleetMaintenanceRecord = MaintenanceRecord;

export interface Truck {
  id: string;              // e.g. "trk-cck5273"
  plateNumber: string;     // e.g. "CCK 5273"
  truckType?: string;      // e.g. "10-Wheeler Heavy Truck" (Optional)
  currentTripNumber?: number; // e.g. 29 (Sequential trip count for this specific truck)
  tripNumber?: number;     // Alias for currentTripNumber
  status: TruckStatus;
  tonsCapacity?: number;   // e.g. 32.5
  assignedCrew?: AssignedCrew;
  maintenanceLogs?: MaintenanceRecord[];
  createdAt?: string;      // ISO Timestamp or DD-MMM-YY
  updatedAt?: string;      // ISO Timestamp or DD-MMM-YY
}
export type FleetAsset = Truck;

// ─── 2. CREW DOMAIN MODELS ───────────────────────────────────────────────────

export type CrewRole = 'Driver' | 'Helper';
export type CrewType = 'Regular' | 'On-call';
export type CrewStatus = 'Active' | 'In Transit' | 'On Leave' | 'Inactive';
export type CashAdvanceStatus = 'UNPAID' | 'DEDUCTED' | 'PAID';
export type SalaryPaymentStatus = 'PENDING' | 'PAID' | 'CANCELLED';

export interface CashAdvanceRecord {
  id: string;              // e.g. "ca-001_01-15-2026"
  amount: number;
  date: string;
  reason: string;
  status: CashAdvanceStatus;
  deductedOnTripNumber?: string; // e.g. "TRP-101"
}

export interface CrewSalaryRecord {
  id: string;              // e.g. "sal-001_01-22-2026"
  tripNumber: string;      // e.g. "TRP-101"
  tloNumber?: string;      // e.g. "904816"
  grossPay: number;        // e.g. 3500.00 (Trip Base Pay)
  caDeduction: number;     // e.g. 1000.00 (Ibinawas na Cash Advance)
  amount: number;          // e.g. 2500.00 (Net Amount Paid: Gross - CA Deduction)
  status: SalaryPaymentStatus; // "PENDING" | "PAID"
  date: string;            // e.g. "2026-01-22"
  receiptImage?: string;   // Optional: URL/Photo of GCash/deposit slip. (Default = CASH if empty)
}

export interface CrewMember {
  id: string;              // e.g. "crew-001"
  name: string;
  role: CrewRole;
  type: CrewType;
  status: CrewStatus;
  contactNumber?: string;
  phone?: string;
  email?: string;
  password?: string;
  createdAt?: string;      // ISO Timestamp
  updatedAt?: string;      // ISO Timestamp

  // 9. Cash Advances & 10. Salaries
  cashAdvances?: CashAdvanceRecord[];
  salaries?: CrewSalaryRecord[];

  // Cash-on-Hand Running Balance (Driver Custodian)
  currentCOHBalance?: number; // e.g. 1250.00 (Surplus) or -800.00 (Shortage)
  cohBalanceType?: 'OVERAGE' | 'SHORTAGE' | 'BALANCED';
  lastTripId?: string;
  lastTloNumber?: string;
  lastSettledDate?: string;

  // Compatibility aliases
  startingCOH?: number;
  currentCOH?: number;
}
export type Driver = CrewMember;

// ─── 3. TRIPS DOMAIN MODELS ──────────────────────────────────────────────────

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
  freightRevenue?: number;  // Gross Cargill Charge
  netIncome?: number;       // Company Profit: Freight Revenue − Cost − Crew Salaries

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

// ─── 4. SHARED & LEDGER MODELS ──────────────────────────────────────────────

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
  proofStatus?: PODStatus;
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
  proofStatus?: PODStatus;
}

export type COHBalanceType = 'OVERAGE' | 'SHORTAGE' | 'BALANCED';

export interface DriverLastTripBalance {
  amount: number;
  type: COHBalanceType;
  lastTripTloNumber?: string;
  notes?: string;
}

export type UserRole = 'OWNER' | 'STAFF';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'DISPATCH' | 'MAINTENANCE_LOG';
  module: string;
  details: string;
}

export interface DashboardKPIs {
  activeFleetCount: number;
  dispatchedTodayCount: number;
  unbilledFreightTotal: number;
  typoDiscrepanciesCount: number;
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

// ─── 5. BILLING & RECONCILIATION MODELS ─────────────────────────────────────

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

export type BillingBatchStatus = 'DRAFT' | 'SUBMITTED';

export interface BillingBatch {
  id: string;
  billingNumber: string;
  client: string;
  billingPeriod: string;
  creationDate: string;
  tripIds: string[];
  totalWeight: number;
  grossFreight: number;
  status: BillingBatchStatus;
}

export type PaymentStatus = 'UNPAID' | 'PAID' | 'UNDERPAID';
export type PaymentRecordStatus = 'PENDING' | 'CONFIRMED';

export interface PaymentRecord {
  id: string;
  billingBatchId: string;
  amountReceived: number;
  paymentDate: string;
  paymentMethod: string;
  referenceCode?: string;
  receiptImageUrl?: string;
  status: PaymentRecordStatus;
}
