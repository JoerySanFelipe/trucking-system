import { Routes } from '@angular/router';

// Force HMR Trigger: V2

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'login', loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent) },
  { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
  { path: 'dispatch', loadComponent: () => import('./features/dispatch/dispatch.component').then(m => m.DispatchComponent) },
  { path: 'dispatch/post-dispatch', loadComponent: () => import('./features/dispatch/post-dispatch.component').then(m => m.PostDispatchComponent) },
  { path: 'dispatch/crew-requests', loadComponent: () => import('./features/dispatch/crew-requests.component').then(m => m.CrewRequestsComponent) },
  { path: 'trips', loadComponent: () => import('./features/trips/trips.component').then(m => m.TripsComponent) },
  { path: 'trips/:id', loadComponent: () => import('./features/trips/trip-details.component').then(m => m.TripDetailsComponent) },
  { path: 'trips/:id/edit', loadComponent: () => import('./features/trips/edit-trip.component').then(m => m.EditTripComponent) },
  { path: 'completed-trips', loadComponent: () => import('./features/trips/completed-trips.component').then(m => m.CompletedTripsComponent) },
  { path: 'billings', loadComponent: () => import('./features/sales/sales-kanban.component').then(m => m.SalesKanbanComponent) },
  { path: 'reconciliation', loadComponent: () => import('./features/sales/reconciliation.component').then(m => m.ReconciliationComponent) },
  { path: 'fleet', loadComponent: () => import('./features/fleet/fleet.component').then(m => m.FleetComponent) },
  { path: 'payroll', loadComponent: () => import('./features/payroll/payroll.component').then(m => m.PayrollComponent) },
  { path: 'reports', loadComponent: () => import('./features/reports/reports.component').then(m => m.ReportsComponent) },
  { path: 'audit', loadComponent: () => import('./features/audit/audit-log.component').then(m => m.AuditLogComponent) },
  { path: 'billing-queue', loadComponent: () => import('./features/billing/billing-queue.component').then(m => m.BillingQueueComponent) },
  { path: 'draft-billing', loadComponent: () => import('./features/billing/draft-billing.component').then(m => m.DraftBillingComponent) },
  { path: 'draft-billing/:id', loadComponent: () => import('./features/billing/draft-billing-detail.component').then(m => m.DraftBillingDetailComponent) },
  { path: 'printed-billing', loadComponent: () => import('./features/billing/printed-billing.component').then(m => m.PrintedBillingComponent) },
  { path: 'printed-billing/:id', loadComponent: () => import('./features/billing/printed-billing-detail.component').then(m => m.PrintedBillingDetailComponent) },
  { path: 'reconciliation-workspace', loadComponent: () => import('./features/reconciliation/reconciliation-workspace.component').then(m => m.ReconciliationWorkspaceComponent) },
  { path: 'reconciliation-workspace/:id', loadComponent: () => import('./features/reconciliation/reconciliation-session-detail.component').then(m => m.ReconciliationSessionDetailComponent) },
  { path: '**', redirectTo: 'dashboard' }
];

