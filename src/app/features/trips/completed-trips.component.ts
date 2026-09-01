import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DispatchStore } from '../../core/application/stores/dispatch.store';
import { FleetStore } from '../../core/application/stores/fleet.store';
import { TripDispatch } from '../../core/models/tms.models';
import { FilterCardComponent } from '../../shared/ui-kit/filter-card/filter-card.component';
import { ToolbarComponent } from '../../shared/ui-kit/toolbar/toolbar.component';
import { EmptyStateComponent } from '../../shared/ui-kit/empty-state/empty-state.component';
import { AppDatePipe } from '../../core/utils/date-formatter';
import { ReportExportService } from '../../core/services/report-export.service';

@Component({
  selector: 'app-completed-trips',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    RouterLink,
    FilterCardComponent,
    ToolbarComponent,
    EmptyStateComponent,
    AppDatePipe
  ],
  template: `
    <div class="w-full space-y-6 animate-fade-in-up pb-12">

      <!-- Page Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-semibold text-[#262B35] tracking-tight">Completed Trips</h1>
        </div>

        <div class="flex items-center gap-3">
          <a routerLink="/billing-queue" class="btn-primary text-xs py-2.5 px-4 inline-flex items-center gap-1.5 shadow-2xs cursor-pointer">
            <span class="material-symbols-outlined text-[18px]">receipt_long</span>
            <span>Go to Billing Queue</span>
          </a>
        </div>
      </div>

      <!-- ── KPI METRIC FILTER CARDS ────────────────────────────────────────── -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <app-filter-card 
          label="Total Completed" 
          [value]="completedTrips().length" 
          icon="task_alt"
          theme="neutral"
          [isActive]="selectedFilter() === 'ALL'"
          (selected)="selectedFilter.set('ALL')">
        </app-filter-card>

        <app-filter-card 
          label="Ready to Bill" 
          [value]="readyToBillCount()" 
          [total]="completedTrips().length"
          icon="playlist_add_check"
          theme="emerald"
          [isActive]="selectedFilter() === 'READY_TO_BILL'"
          (selected)="selectedFilter.set('READY_TO_BILL')">
        </app-filter-card>

        <app-filter-card 
          label="In Billing / Sent" 
          [value]="inBillingCount()" 
          [total]="completedTrips().length"
          icon="forward_to_inbox"
          theme="blue"
          [isActive]="selectedFilter() === 'IN_BILLING'"
          (selected)="selectedFilter.set('IN_BILLING')">
        </app-filter-card>

        <app-filter-card 
          label="Total Net Profit" 
          [value]="totalNetProfitFormatted()" 
          icon="trending_up"
          theme="emerald"
          [isActive]="false">
        </app-filter-card>
      </div>

      <!-- ── UNIVERSAL TOOLBAR (3-COLUMN RESPONSIVE GRID) ───────────────────── -->
      <app-toolbar 
        class="block w-full mt-6"
        [(searchQuery)]="searchQuery" 
        searchPlaceholder="Search TLO#, client, plate, driver, route, commodity...">
        
        <!-- Left Slot: Status Filters & Truck Selector -->
        <div filters class="flex items-center gap-2 flex-nowrap shrink-0">
          <button (click)="selectedFilter.set('ALL')"
                  [ngClass]="selectedFilter() === 'ALL' ? 'bg-[#262B35] text-white shadow-xs' : 'bg-white text-[#262B35] border border-slate-200 hover:bg-slate-100'"
                  class="h-10 px-3.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center whitespace-nowrap">
            All ({{ completedTrips().length }})
          </button>
          <button (click)="selectedFilter.set('READY_TO_BILL')"
                  [ngClass]="selectedFilter() === 'READY_TO_BILL' ? 'bg-[#29CC6A] text-white shadow-xs' : 'bg-white text-[#262B35] border border-slate-200 hover:bg-slate-100'"
                  class="h-10 px-3.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center whitespace-nowrap">
            Ready to Bill ({{ readyToBillCount() }})
          </button>
          <button (click)="selectedFilter.set('IN_BILLING')"
                  [ngClass]="selectedFilter() === 'IN_BILLING' ? 'bg-[#3361FF] text-white shadow-xs' : 'bg-white text-[#262B35] border border-slate-200 hover:bg-slate-100'"
                  class="h-10 px-3.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center whitespace-nowrap">
            In Billing ({{ inBillingCount() }})
          </button>
          <button (click)="selectedFilter.set('BILLED')"
                  [ngClass]="selectedFilter() === 'BILLED' ? 'bg-slate-800 text-white shadow-xs' : 'bg-white text-[#262B35] border border-slate-200 hover:bg-slate-100'"
                  class="h-10 px-3.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center whitespace-nowrap">
            Billed ({{ billedCount() }})
          </button>

          <!-- Truck Plate Filter -->
          <select 
            [ngModel]="selectedTruckFilter()" 
            (ngModelChange)="selectedTruckFilter.set($event)" 
            class="h-10 text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl pl-3 pr-8 py-1.5 cursor-pointer whitespace-nowrap outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500">
            <option value="ALL">All Trucks</option>
            <option *ngFor="let asset of fleetStore.fleet()" [value]="asset.plateNumber">
              {{ asset.plateNumber }}
            </option>
          </select>
        </div>

        <!-- Right Slot: Date Range Inputs & Export Dropdown -->
        <div actions class="flex items-center gap-2">
          <!-- Date Range Selector -->
          <div class="hidden lg:flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-200 rounded-xl px-2.5 h-9 shadow-2xs">
            <span class="text-[11px] font-semibold text-slate-400">Date:</span>
            <input 
              type="date" 
              [ngModel]="fromDate()" 
              (ngModelChange)="fromDate.set($event)" 
              class="text-xs bg-transparent outline-none font-medium text-slate-700" 
              title="From Date" 
            />
            <span class="text-slate-400 font-bold">→</span>
            <input 
              type="date" 
              [ngModel]="toDate()" 
              (ngModelChange)="toDate.set($event)" 
              class="text-xs bg-transparent outline-none font-medium text-slate-700" 
              title="To Date" 
            />
            <button 
              *ngIf="fromDate() || toDate()" 
              (click)="clearDates()" 
              title="Reset Dates"
              class="text-slate-400 hover:text-rose-600 ml-1 cursor-pointer flex items-center">
              <span class="material-symbols-outlined text-[15px]">cancel</span>
            </button>
          </div>

          <!-- Export Dropdown -->
          <div class="relative">
            <button (click)="isExportMenuOpen.set(!isExportMenuOpen())"
                    type="button"
                    class="btn-secondary h-9 px-3 text-xs font-medium rounded-xl inline-flex items-center gap-1.5 shadow-2xs hover:bg-slate-100 transition-all cursor-pointer">
              <span class="material-symbols-outlined text-[18px] text-slate-500">download</span>
              <span>Export</span>
              <span class="material-symbols-outlined text-[16px] text-slate-400">arrow_drop_down</span>
            </button>

            <div *ngIf="isExportMenuOpen()" 
                 class="absolute right-0 mt-1.5 w-36 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-30 animate-scale-up">
              <button (click)="exportPdf(); isExportMenuOpen.set(false)" 
                      class="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer">
                <span class="material-symbols-outlined text-[16px] text-slate-500">picture_as_pdf</span>
                <span>PDF</span>
              </button>
              <button (click)="exportExcel(); isExportMenuOpen.set(false)" 
                      class="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer border-t border-slate-100">
                <span class="material-symbols-outlined text-[16px] text-slate-500">table_chart</span>
                <span>Xlsx</span>
              </button>
            </div>
          </div>
        </div>

      </app-toolbar>

      <!-- ── COMPLETED TRIPS DATA TABLE (10-COLUMN FINANCIAL & LIQUIDATION LAYOUT) ── -->
      <div class="card overflow-hidden shadow-2xs border border-slate-200">
        <div class="overflow-x-auto max-w-full">
          <table class="data-table min-w-[1180px]">
            <thead>
              <tr>
                <!-- Col 1: TLO & Trip # -->
                <th (click)="toggleSort('tloNumber')" class="cursor-pointer select-none hover:text-brand-600 transition-colors">
                  <div class="flex items-center gap-1">
                    <span>TLO & Trip #</span>
                    <span *ngIf="sortField === 'tloNumber'" class="text-brand-600 font-bold">{{ sortAsc ? '▲' : '▼' }}</span>
                  </div>
                </th>

                <!-- Col 2: Delivered Date -->
                <th (click)="toggleSort('deliveredDate')" class="cursor-pointer select-none hover:text-brand-600 transition-colors">
                  <div class="flex items-center gap-1">
                    <span>Delivered Date</span>
                    <span *ngIf="sortField === 'deliveredDate'" class="text-brand-600 font-bold">{{ sortAsc ? '▲' : '▼' }}</span>
                  </div>
                </th>

                <!-- Col 3: Client & Route -->
                <th>Client & Route</th>

                <!-- Col 4: Truck & Crew -->
                <th>Truck & Crew</th>

                <!-- Col 5: Gross Freight -->
                <th (click)="toggleSort('totalFreightCharge')" class="cursor-pointer select-none hover:text-brand-600 transition-colors text-right">
                  <div class="flex items-center justify-end gap-1">
                    <span>Gross Freight</span>
                    <span *ngIf="sortField === 'totalFreightCharge'" class="text-brand-600 font-bold">{{ sortAsc ? '▲' : '▼' }}</span>
                  </div>
                </th>

                <!-- Col 6: Expenses Spent -->
                <th class="text-right">Crew Expenses</th>

                <!-- Col 7: Ending COH Balance -->
                <th class="text-right">COH Balance</th>

                <!-- Col 8: Net Company Income -->
                <th (click)="toggleSort('netIncome')" class="cursor-pointer select-none hover:text-brand-600 transition-colors text-right">
                  <div class="flex items-center justify-end gap-1">
                    <span>Net Profit</span>
                    <span *ngIf="sortField === 'netIncome'" class="text-brand-600 font-bold">{{ sortAsc ? '▲' : '▼' }}</span>
                  </div>
                </th>

                <!-- Col 9: Billing Status -->
                <th>Billing Status</th>

                <!-- Col 10: Action -->
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let trip of filteredTrips()" class="hover:bg-slate-50 transition-colors">
                
                <!-- Col 1: TLO & Trip # -->
                <td>
                  <div class="flex flex-col">
                    <span class="text-brand-600 font-bold font-mono text-xs tracking-tight">TLO #{{ trip.tloNumber }}</span>
                    <span class="text-[11px] font-mono text-slate-400 mt-0.5 font-medium">
                      {{ trip.tripNumber ? '#' + trip.tripNumber : '—' }}
                    </span>
                  </div>
                </td>

                <!-- Col 2: Delivered Date -->
                <td class="font-mono text-xs text-slate-700 whitespace-nowrap">
                  <div class="font-semibold text-slate-900">
                    {{ (trip.deliveredDate || trip.deliveredAt || trip.dispatchedDate) | appDate }}
                  </div>
                  <span class="text-[10px] text-slate-400">
                    Disp: {{ (trip.dispatchedDate || trip.dispatchedAt) | appDate }}
                  </span>
                </td>

                <!-- Col 3: Client & Route (Route Tag on Top) -->
                <td>
                  <div class="flex flex-col max-w-[210px]">
                    <div class="flex items-center gap-1.5 mb-1">
                      <span [ngClass]="trip.routeTag === 'BACKLOAD' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-brand-600 border-blue-200'" 
                            class="px-1.5 py-0.5 rounded text-[10px] font-bold border uppercase inline-block">
                        {{ trip.routeTag === 'BACKLOAD' ? '🟣 Backload' : '🔵 Frontload' }}
                      </span>
                      <span class="text-[10px] text-slate-500 font-medium truncate" title="{{ trip.client || 'Cargill' }}">
                        {{ trip.client || 'Cargill' }}
                      </span>
                    </div>
                    <span class="font-semibold text-slate-900 text-xs leading-snug truncate" title="{{ trip.origin || trip.originFrom }} → {{ trip.destination || trip.destinationTo }}">
                      {{ trip.origin || trip.originFrom }} <span class="text-slate-400">➔</span> {{ trip.destination || trip.destinationTo }}
                    </span>
                  </div>
                </td>

                <!-- Col 4: Truck & Crew -->
                <td>
                  <div class="flex flex-col space-y-1">
                    <span class="font-bold font-mono text-slate-900 text-xs tracking-tight bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80 inline-block w-fit">
                      {{ trip.plateNumber }}
                    </span>
                    <div class="text-[11px] font-medium text-slate-800 flex items-center gap-1.5">
                      <span class="w-1.5 h-1.5 rounded-full bg-brand-600"></span>
                      <span>{{ trip.driverName }}</span>
                    </div>
                    <div *ngIf="trip.helperName && trip.helperName !== 'None' && trip.helperName !== 'Unassigned'" class="text-[10px] text-slate-500 flex items-center gap-1.5">
                      <span class="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                      <span>{{ trip.helperName }}</span>
                    </div>
                  </div>
                </td>

                <!-- Col 5: Gross Freight -->
                <td class="text-right font-mono">
                  <span class="text-xs font-bold text-slate-900 tabular-nums">
                    ₱{{ trip.totalFreightCharge | number:'1.2-2' }}
                  </span>
                  <span class="text-[10px] text-slate-400 block mt-0.5">
                    {{ trip.tonnage | number:'1.2-2' }} Tons
                  </span>
                </td>

                <!-- Col 6: Expenses Spent -->
                <td class="text-right font-mono">
                  <span class="text-xs font-bold text-rose-600 tabular-nums">
                    -₱{{ getCrewExpenses(trip) | number:'1.2-2' }}
                  </span>
                  <span class="text-[10px] text-slate-400 block mt-0.5">
                    COH: ₱{{ getCashOnHand(trip) | number:'1.2-2' }}
                  </span>
                </td>

                <!-- Col 7: Ending COH Balance -->
                <td class="text-right font-mono">
                  <span class="text-xs font-bold tabular-nums"
                        [ngClass]="getCOHBalance(trip) >= 0 ? 'text-emerald-600' : 'text-rose-600'">
                    ₱{{ getCOHBalance(trip) | number:'1.2-2' }}
                  </span>
                  <span class="text-[10px] font-semibold block mt-0.5"
                        [ngClass]="getCOHBalance(trip) >= 0 ? 'text-emerald-600' : 'text-rose-600'">
                    {{ getCOHBalance(trip) >= 0 ? '✓ Surplus' : '⚠️ Shortage' }}
                  </span>
                </td>

                <!-- Col 8: Net Company Income -->
                <td class="text-right font-mono">
                  <span class="text-xs font-bold tabular-nums"
                        [ngClass]="getNetIncome(trip) >= 0 ? 'text-emerald-600' : 'text-rose-600'">
                    ₱{{ getNetIncome(trip) | number:'1.2-2' }}
                  </span>
                  <span class="text-[10px] text-slate-400 block mt-0.5">
                    Net Margin
                  </span>
                </td>

                <!-- Col 9: Billing Status -->
                <td>
                  <span [ngClass]="{
                    'bg-emerald-50 text-emerald-700 border-emerald-200': (trip.billingStatus || 'READY_TO_BILL') === 'READY_TO_BILL',
                    'bg-blue-50 text-blue-700 border-blue-200': trip.billingStatus === 'IN_BILLING' || trip.billingStatus === 'SUBMITTED',
                    'bg-slate-100 text-slate-700 border-slate-200': trip.status === 'BILLED' || trip.billingStatus === 'VERIFIED'
                  }" class="px-2 py-0.5 rounded-full text-[11px] font-bold border inline-block whitespace-nowrap">
                    {{ trip.status === 'BILLED' ? 'Billed' : trip.billingStatus === 'IN_BILLING' ? 'In Billing' : trip.billingStatus === 'SUBMITTED' ? 'Submitted' : 'Ready to Bill' }}
                  </span>
                </td>

                <!-- Col 10: Action -->
                <td class="text-right whitespace-nowrap">
                  <div class="inline-flex items-center gap-1.5 justify-end">
                    <a [routerLink]="['/trips', trip.id]" class="btn-primary text-xs px-2.5 py-1.5 inline-flex items-center gap-1 shadow-2xs cursor-pointer">
                      <span class="material-symbols-outlined text-[15px]">visibility</span>
                      <span>Details</span>
                    </a>
                  </div>
                </td>

              </tr>

              <!-- Empty State in Table -->
              <tr *ngIf="filteredTrips().length === 0">
                <td colspan="10" class="py-12 text-center">
                  <app-empty-state
                    title="No Completed Trips Found"
                    description="No completed operational trips match your current filter, search criteria, or date range."
                    actionLabel="Clear Filters"
                    (actionClicked)="resetFilters()">
                  </app-empty-state>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `
})
export class CompletedTripsComponent {
  dispatchStore = inject(DispatchStore);
  fleetStore = inject(FleetStore);
  private reportExportService = inject(ReportExportService);

  selectedFilter = signal<string>('ALL');
  selectedTruckFilter = signal<string>('ALL');
  searchQuery = signal<string>('');
  fromDate = signal<string>('');
  toDate = signal<string>('');
  isExportMenuOpen = signal<boolean>(false);

  sortField: 'tloNumber' | 'deliveredDate' | 'totalFreightCharge' | 'netIncome' = 'deliveredDate';
  sortAsc = false;

  // ── COMPLETED TRIPS (CANONICAL FILTER) ─────────────────────────────────────
  completedTrips = computed(() => {
    return this.dispatchStore.dispatches().filter(t => t.status === 'COMPLETED' || t.status === 'BILLED');
  });

  // Counters
  readyToBillCount = computed(() => {
    return this.completedTrips().filter(t => (t.billingStatus || 'READY_TO_BILL') === 'READY_TO_BILL' && t.status !== 'BILLED').length;
  });

  inBillingCount = computed(() => {
    return this.completedTrips().filter(t => t.billingStatus === 'IN_BILLING' || t.billingStatus === 'SUBMITTED').length;
  });

  billedCount = computed(() => {
    return this.completedTrips().filter(t => t.status === 'BILLED').length;
  });

  totalNetProfit = computed(() => {
    return this.completedTrips().reduce((sum, t) => sum + this.getNetIncome(t), 0);
  });

  totalNetProfitFormatted(): string {
    const p = this.totalNetProfit();
    return `₱${p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  // Financial Calculations
  getCrewExpenses(trip: TripDispatch): number {
    const debits = (trip.cohEntries || [])
      .filter(e => e.type === 'DEBIT')
      .reduce((sum, e) => sum + e.amount, 0);
    if (debits > 0) return debits;
    return (trip.travelExpenses || 0) + (trip.dieselExpenses || 0) + (trip.foodExpenses || 0);
  }

  getCashOnHand(trip: TripDispatch): number {
    const credits = (trip.cohEntries || [])
      .filter(e => e.type === 'CREDIT')
      .reduce((sum, e) => sum + e.amount, 0);
    return credits > 0 ? credits : (trip.truckRate ? 10000 : 0);
  }

  getCOHBalance(trip: TripDispatch): number {
    return this.getCashOnHand(trip) - this.getCrewExpenses(trip);
  }

  getNetIncome(trip: TripDispatch): number {
    if (trip.netIncome !== undefined) return trip.netIncome;
    const freight = trip.totalFreightCharge || 0;
    const expenses = this.getCrewExpenses(trip);
    const payroll = (trip.driverSalary || 0) + (trip.helperSalary || 0);
    return freight - expenses - payroll;
  }

  // Filtered & Sorted Trips
  filteredTrips = computed(() => {
    let list = this.completedTrips();

    const status = this.selectedFilter();
    if (status === 'READY_TO_BILL') {
      list = list.filter(t => (t.billingStatus || 'READY_TO_BILL') === 'READY_TO_BILL' && t.status !== 'BILLED');
    } else if (status === 'IN_BILLING') {
      list = list.filter(t => t.billingStatus === 'IN_BILLING' || t.billingStatus === 'SUBMITTED');
    } else if (status === 'BILLED') {
      list = list.filter(t => t.status === 'BILLED');
    }

    const truck = this.selectedTruckFilter();
    if (truck !== 'ALL') {
      list = list.filter(t => t.plateNumber.trim().toUpperCase() === truck.trim().toUpperCase());
    }

    const from = this.fromDate();
    const to = this.toDate();
    const search = this.searchQuery().trim().toLowerCase();

    if (from) {
      list = list.filter(t => (t.deliveredDate || t.deliveredAt || t.dispatchedDate || t.dispatchedAt) >= from);
    }
    if (to) {
      list = list.filter(t => (t.deliveredDate || t.deliveredAt || t.dispatchedDate || t.dispatchedAt) <= to + 'T23:59:59');
    }

    if (search) {
      list = list.filter(t => 
        (t.tloNumber && String(t.tloNumber).toLowerCase().includes(search)) ||
        (t.tripNumber && String(t.tripNumber).includes(search)) ||
        (t.client && t.client.toLowerCase().includes(search)) ||
        (t.commodity && t.commodity.toLowerCase().includes(search)) ||
        (t.plateNumber && t.plateNumber.toLowerCase().includes(search)) ||
        (t.driverName && t.driverName.toLowerCase().includes(search)) ||
        (t.helperName && t.helperName.toLowerCase().includes(search)) ||
        (t.origin && t.origin.toLowerCase().includes(search)) ||
        (t.destination && t.destination.toLowerCase().includes(search))
      );
    }

    return [...list].sort((a, b) => {
      let valA: any = a[this.sortField] || '';
      let valB: any = b[this.sortField] || '';

      if (this.sortField === 'tloNumber') {
        valA = Number(a.tloNumber) || 0;
        valB = Number(b.tloNumber) || 0;
      } else if (this.sortField === 'totalFreightCharge') {
        valA = a.totalFreightCharge || 0;
        valB = b.totalFreightCharge || 0;
      } else if (this.sortField === 'netIncome') {
        valA = this.getNetIncome(a);
        valB = this.getNetIncome(b);
      }

      if (valA < valB) return this.sortAsc ? -1 : 1;
      if (valA > valB) return this.sortAsc ? 1 : -1;
      return 0;
    });
  });

  toggleSort(field: 'tloNumber' | 'deliveredDate' | 'totalFreightCharge' | 'netIncome') {
    if (this.sortField === field) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortField = field;
      this.sortAsc = true;
    }
  }

  clearDates() {
    this.fromDate.set('');
    this.toDate.set('');
  }

  resetFilters() {
    this.selectedFilter.set('ALL');
    this.selectedTruckFilter.set('ALL');
    this.searchQuery.set('');
    this.fromDate.set('');
    this.toDate.set('');
  }

  exportPdf() {
    this.reportExportService.exportCompletedTripsToPdf(this.filteredTrips());
  }

  exportExcel() {
    this.reportExportService.exportCompletedTripsToExcel(this.filteredTrips());
  }
}
