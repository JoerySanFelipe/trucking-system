import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TmsService } from '../../core/services/tms.service';
import { ReconciliationSession, ReconciliationException, TripDispatch, ClientStatementLine } from '../../core/models/tms.models';

interface BillingRecord {
  id: string;
  tloNumber: string;
  plateNumber: string;
  driverName: string;
  route: string;
  tonnage: number;
  porbidoCharge: number;
  cargillCharge: number | null;
  status: 'RECONCILED' | 'AMOUNT_DISCREPANCY' | 'UNBILLED_CARGILL' | 'UNRECORDED_PORBIDO';
  date: string;
}

const STATUS_META = {
  RECONCILED:           { icon: '✅', label: 'Reconciled',        color: 'badge-success' },
  AMOUNT_DISCREPANCY:   { icon: '⚠️', label: 'Amount Discrepancy', color: 'badge-warning' },
  UNBILLED_CARGILL:     { icon: '🔴', label: 'Unbilled (Cargill)', color: 'badge-danger' },
  UNRECORDED_PORBIDO:   { icon: '🟠', label: 'Unrecorded (Porbido)',color: 'badge-warning' },
};

@Component({
  selector: 'app-sales-kanban',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full space-y-6 animate-fade-in-up">

      <!-- Page Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">Billing Reconciliation</h1>
          <p class="text-sm text-slate-400 mt-0.5 font-medium">Porbido vs Cargill — 2-way TLO cross-match</p>
        </div>
        <div class="flex items-center gap-2">
          <button
            (click)="viewMode.set('kanban')"
            [ngClass]="viewMode() === 'kanban' ? 'bg-brand-600 text-white shadow-brand' : 'btn-secondary'"
            class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer">
            <span class="material-symbols-outlined text-[16px]">view_kanban</span>
            <span>Kanban</span>
          </button>
          <button
            (click)="viewMode.set('table')"
            [ngClass]="viewMode() === 'table' ? 'bg-brand-600 text-white shadow-brand' : 'btn-secondary'"
            class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer">
            <span class="material-symbols-outlined text-[16px]">table_rows</span>
            <span>Table</span>
          </button>
        </div>
      </div>

      <!-- Summary Chips -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        <div class="card p-4 animate-fade-in-up" *ngFor="let s of statusSummary()">
          <div class="text-lg font-black tabular-nums" [style.color]="s.color">{{ s.count }}</div>
          <div class="text-xs text-slate-500 font-medium mt-0.5">{{ s.label }}</div>
          <div class="mt-2 text-xs font-bold tabular-nums text-slate-700">₱{{ s.total | number:'1.0-0' }}</div>
        </div>
      </div>

      <!-- KANBAN VIEW -->
      <div *ngIf="viewMode() === 'kanban'" class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4 animate-scale-in">

        <!-- RECONCILED -->
        <div class="space-y-3">
          <div class="flex items-center gap-2 px-1">
            <span class="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
            <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider">Reconciled</h3>
            <span class="badge badge-success ml-auto">{{ getByStatus('RECONCILED').length }}</span>
          </div>
          <div *ngFor="let r of getByStatus('RECONCILED')" class="card p-4 card-interactive animate-fade-in-up">
            <div class="flex items-start justify-between mb-2">
              <span class="font-black text-sm text-slate-900 tlo-number">#{{ r.tloNumber }}</span>
              <span class="badge badge-success inline-flex items-center gap-1">
                <span class="material-symbols-outlined text-[12px]">check</span>
                <span>Matched</span>
              </span>
            </div>
            <p class="text-xs text-slate-500 font-medium">{{ r.plateNumber }} · {{ r.driverName }}</p>
            <p class="text-xs text-slate-400 mt-1">{{ r.route }}</p>
            <div class="mt-3 pt-3 border-t border-slate-50 flex justify-between">
              <span class="text-xs text-slate-400">{{ r.tonnage }}T</span>
              <span class="text-xs font-black text-success">₱{{ r.porbidoCharge | number:'1.0-0' }}</span>
            </div>
          </div>
        </div>

        <!-- AMOUNT DISCREPANCY -->
        <div class="space-y-3">
          <div class="flex items-center gap-2 px-1">
            <span class="material-symbols-outlined text-[18px] text-amber-600">warning</span>
            <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider">Discrepancy</h3>
            <span class="badge badge-warning ml-auto">{{ getByStatus('AMOUNT_DISCREPANCY').length }}</span>
          </div>
          <div *ngFor="let r of getByStatus('AMOUNT_DISCREPANCY')" class="card p-4 card-interactive border-l-4 border-l-warning animate-fade-in-up">
            <div class="flex items-start justify-between mb-2">
              <span class="font-black text-sm text-slate-900 tlo-number">#{{ r.tloNumber }}</span>
              <span class="badge badge-warning inline-flex items-center gap-1">
                <span class="material-symbols-outlined text-[12px]">warning</span>
                <span>Diff</span>
              </span>
            </div>
            <p class="text-xs text-slate-500 font-medium">{{ r.plateNumber }} · {{ r.driverName }}</p>
            <p class="text-xs text-slate-400 mt-1">{{ r.route }}</p>
            <div class="mt-3 pt-3 border-t border-slate-50 space-y-1">
              <div class="flex justify-between text-xs">
                <span class="text-slate-400">Porbido</span>
                <span class="font-bold text-slate-700">₱{{ r.porbidoCharge | number:'1.0-0' }}</span>
              </div>
              <div class="flex justify-between text-xs">
                <span class="text-slate-400">Cargill</span>
                <span class="font-bold text-warning">₱{{ r.cargillCharge | number:'1.0-0' }}</span>
              </div>
              <div class="flex justify-between text-xs">
                <span class="text-slate-400">Diff</span>
                <span class="font-black text-danger">₱{{ Math.abs(r.porbidoCharge - (r.cargillCharge || 0)) | number:'1.0-0' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- UNBILLED CARGILL (PORBIDO_ONLY) -->
        <div class="space-y-3">
          <div class="flex items-center gap-2 px-1">
            <span class="material-symbols-outlined text-[18px] text-rose-600">error</span>
            <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider">Unbilled</h3>
            <span class="badge badge-danger ml-auto">{{ getByStatus('UNBILLED_CARGILL').length }}</span>
          </div>
          <div *ngFor="let r of getByStatus('UNBILLED_CARGILL')" class="card p-4 card-interactive border-l-4 border-l-danger animate-fade-in-up">
            <div class="flex items-start justify-between mb-2">
              <span class="font-black text-sm text-slate-900 tlo-number">#{{ r.tloNumber }}</span>
              <span class="badge badge-danger inline-flex items-center gap-1">
                <span class="material-symbols-outlined text-[12px]">error</span>
                <span>Unclaimed</span>
              </span>
            </div>
            <p class="text-xs text-slate-500 font-medium">{{ r.plateNumber }} · {{ r.driverName }}</p>
            <p class="text-xs text-slate-400 mt-1">{{ r.route }}</p>
            <p class="text-[10px] text-danger font-bold mt-2">Not found in Cargill billing statement</p>
            <div class="mt-3 pt-3 border-t border-slate-50 flex justify-between">
              <span class="text-xs text-slate-400">Unclaimed</span>
              <span class="text-xs font-black text-danger">₱{{ r.porbidoCharge | number:'1.0-0' }}</span>
            </div>
          </div>
        </div>

        <!-- UNRECORDED PORBIDO (CARGILL_ONLY) -->
        <div class="space-y-3">
          <div class="flex items-center gap-2 px-1">
            <span class="material-symbols-outlined text-[18px] text-orange-500">help</span>
            <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider">Unrecorded</h3>
            <span class="badge badge-warning ml-auto">{{ getByStatus('UNRECORDED_PORBIDO').length }}</span>
          </div>
          <div *ngFor="let r of getByStatus('UNRECORDED_PORBIDO')" class="card p-4 card-interactive border-l-4 border-l-orange-400 animate-fade-in-up">
            <div class="flex items-start justify-between mb-2">
              <span class="font-black text-sm text-slate-900 tlo-number">#{{ r.tloNumber }}</span>
              <span class="badge badge-warning inline-flex items-center gap-1">
                <span class="material-symbols-outlined text-[12px]">help</span>
                <span>Missing</span>
              </span>
            </div>
            <p class="text-xs text-slate-500 font-medium">{{ r.plateNumber }} · {{ r.driverName }}</p>
            <p class="text-xs text-slate-400 mt-1">{{ r.route }}</p>
            <p class="text-[10px] text-warning font-bold mt-2">Found in Cargill, missing in Porbido logs</p>
            <div class="mt-3 pt-3 border-t border-slate-50 flex justify-between">
              <span class="text-xs text-slate-400">Cargill billed</span>
              <span class="text-xs font-black text-warning">₱{{ r.cargillCharge | number:'1.0-0' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- TABLE VIEW -->
      <div *ngIf="viewMode() === 'table'" class="card overflow-hidden animate-scale-in">
        <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 class="text-base font-bold text-slate-900">Reconciliation Ledger</h2>
          <span class="text-xs text-slate-400 font-medium">{{ records().length }} TLO records</span>
        </div>
        <div class="overflow-x-auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>TLO #</th>
                <th>Plate / Driver</th>
                <th>Route</th>
                <th>Tonnage</th>
                <th>Porbido Charge</th>
                <th>Cargill Charge</th>
                <th>Difference</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let r of records()" class="animate-fade-in-up">
                <td><span class="font-bold tlo-number text-slate-900">#{{ r.tloNumber }}</span></td>
                <td>
                  <p class="font-bold text-slate-900 text-sm">{{ r.plateNumber }}</p>
                  <p class="text-xs text-slate-400">{{ r.driverName }}</p>
                </td>
                <td><span class="text-xs text-slate-600">{{ r.route }}</span></td>
                <td><span class="font-bold tabular-nums">{{ r.tonnage }}T</span></td>
                <td><span class="font-black text-slate-900 tabular-nums">₱{{ r.porbidoCharge | number:'1.0-0' }}</span></td>
                <td>
                  <span *ngIf="r.cargillCharge !== null" class="font-bold tabular-nums" [class.text-success]="r.status === 'RECONCILED'" [class.text-warning]="r.status === 'AMOUNT_DISCREPANCY'">
                    ₱{{ r.cargillCharge | number:'1.0-0' }}
                  </span>
                  <span *ngIf="r.cargillCharge === null" class="text-xs text-slate-300 italic">Not in statement</span>
                </td>
                <td>
                  <span *ngIf="r.cargillCharge !== null && r.status === 'AMOUNT_DISCREPANCY'" class="font-black text-danger tabular-nums">
                    ₱{{ Math.abs(r.porbidoCharge - r.cargillCharge) | number:'1.0-0' }}
                  </span>
                  <span *ngIf="r.status === 'RECONCILED'" class="text-success text-xs font-bold">—</span>
                  <span *ngIf="r.status === 'UNBILLED_CARGILL'" class="text-danger text-xs font-bold">₱{{ r.porbidoCharge | number:'1.0-0' }}</span>
                  <span *ngIf="r.status === 'UNRECORDED_PORBIDO'" class="text-warning text-xs font-bold">₱{{ r.cargillCharge | number:'1.0-0' }}</span>
                </td>
                <td>
                  <span class="badge"
                        [class.badge-success]="r.status === 'RECONCILED'"
                        [class.badge-warning]="r.status === 'AMOUNT_DISCREPANCY' || r.status === 'UNRECORDED_PORBIDO'"
                        [class.badge-danger]="r.status === 'UNBILLED_CARGILL'">
                    {{ statusMeta[r.status].label }}
                  </span>
                </td>
              </tr>
              <tr *ngIf="records().length === 0">
                <td colspan="8" class="text-center py-12 text-slate-400 font-bold">No reconciliation data available yet. Run a reconciliation from the Reconcile tab.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `
})
export class SalesKanbanComponent {
  tmsService = inject(TmsService);
  viewMode = signal<'kanban' | 'table'>('kanban');
  statusMeta = STATUS_META;
  Math = Math;

  records = computed(() => {
    const exceptions = this.tmsService.reconciliationExceptions();
    const dispatches = this.tmsService.dispatches();
    const statementLines = this.tmsService.clientStatementLines();
    const mapped: BillingRecord[] = [];

    // Aggregate all exceptions for the kanban board
    for (const res of exceptions) {
        let tloNumber = 'UNKNOWN';
        let plateNumber = 'UNKNOWN';
        let driverName = 'UNKNOWN';
        let route = 'UNKNOWN';
        let tonnage = 0;
        let porbidoCharge = 0;
        let cargillCharge: number | null = null;
        let status: BillingRecord['status'] = 'RECONCILED';
        let date = new Date().toISOString().split('T')[0];

        if (res.porbidoTripId) {
          const t = dispatches.find(d => d.id === res.porbidoTripId);
          if (t) {
            tloNumber = String(t.tloNumber);
            plateNumber = t.plateNumber;
            driverName = t.driverName;
            route = `${t.origin} -> ${t.destination}`;
            tonnage = t.tonnage;
            porbidoCharge = t.totalFreightCharge;
            date = t.dispatchedAt;
          }
        }
        
        if (res.clientLineId) {
          const l = statementLines.find(x => x.id === res.clientLineId);
          if (l) {
            cargillCharge = l.payableAmount;
            if (res.type === 'MISSING_IN_PORBIDO') {
              tloNumber = l.shipmentRefNumber;
              plateNumber = l.plateNumber;
              driverName = 'Unknown (Client)';
              route = l.route;
              tonnage = l.weight;
              date = typeof l.shipmentDate === 'string' ? l.shipmentDate : new Date(l.shipmentDate).toISOString().split('T')[0];
            }
          }
        }

        if (res.type === 'MATCHED' || res.type === 'DETAIL_MISMATCH') status = 'RECONCILED';
        if (res.type === 'AMOUNT_MISMATCH') status = 'AMOUNT_DISCREPANCY';
        if (res.type === 'MISSING_IN_CLIENT') status = 'UNBILLED_CARGILL';
        if (res.type === 'MISSING_IN_PORBIDO') status = 'UNRECORDED_PORBIDO';
        if (res.type === 'DUPLICATE_REFERENCE') status = 'AMOUNT_DISCREPANCY';

        mapped.push({
          id: res.porbidoTripId || res.clientLineId || Math.random().toString(),
          tloNumber,
          plateNumber,
          driverName,
          route,
          tonnage,
          porbidoCharge,
          cargillCharge,
          status,
          date
        });
    }

    return mapped;
  });

  getByStatus(status: string) {
    return this.records().filter(r => r.status === status);
  }

  statusSummary = computed(() => {
    return [
      { label: 'Reconciled',         count: this.getByStatus('RECONCILED').length,           total: this.getByStatus('RECONCILED').reduce((s,r)=>s+r.porbidoCharge,0),            color: '#16A34A' },
      { label: 'Amount Discrepancy', count: this.getByStatus('AMOUNT_DISCREPANCY').length,   total: this.getByStatus('AMOUNT_DISCREPANCY').reduce((s,r)=>s+r.porbidoCharge,0),    color: '#D97706' },
      { label: 'Unbilled (Cargill)', count: this.getByStatus('UNBILLED_CARGILL').length,     total: this.getByStatus('UNBILLED_CARGILL').reduce((s,r)=>s+r.porbidoCharge,0),      color: '#DC2626' },
      { label: 'Unrecorded (Porbido)',count:this.getByStatus('UNRECORDED_PORBIDO').length,   total: this.getByStatus('UNRECORDED_PORBIDO').reduce((s,r)=>s+(r.cargillCharge||0),0),color:'#F97316' },
    ];
  });
}
