export type MaintenanceServiceType = 'OIL_CHANGE' | 'TIRE_REPLACEMENT' | 'ENGINE_REPAIR' | 'ROUTINE_INSPECTION' | string;

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

  // Cash Advances & Salaries
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
