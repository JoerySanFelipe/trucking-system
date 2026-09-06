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
