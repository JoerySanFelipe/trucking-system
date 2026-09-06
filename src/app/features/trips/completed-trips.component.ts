import { Component, inject, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DispatchStore } from '../../core/application/stores/dispatch.store';
import { FleetStore } from '../../core/application/stores/fleet.store';
import { TripDispatch } from '../../core/models/tms.models';
import { FilterCardComponent } from '../../shared/ui-kit/filter-card/filter-card.component';
import { ToolbarComponent } from '../../shared/ui-kit/toolbar/toolbar.component';
import { EmptyStateComponent } from '../../shared/ui-kit/empty-state/empty-state.component';
import { StatusBadgeComponent } from '../../shared/ui-kit/status-badge/status-badge.component';
import { formatAppDate } from '../../core/utils/date-formatter';
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
    StatusBadgeComponent
  ],
  template: `
    <div class="w-full space-y-6 animate-fade-in-up pb-12">

      <!-- Page Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-semibold text-slate-900 tracking-tight">Completed Trips</h1>
          <p class="text-xs text-slate-500 font-medium mt-0.5">Archived delivery records, finalized trip liquidations, and billing pipeline status</p>
        </div>

        <div class="flex items-center gap-3">
          <a routerLink="/billing-queue" class="btn-primary text-xs h-9 px-4 inline-flex items-center gap-2 shadow-xs cursor-pointer rounded-xl font-semibold">
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
          <button 
            type="button"
            (click)="selectedFilter.set('ALL')"
            [ngClass]="selectedFilter() === 'ALL' ? 'bg-slate-900 text-white shadow-xs' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'"
            class="btn-xs rounded-xl font-semibold transition-all cursor-pointer flex items-center justify-center whitespace-nowrap">
            All ({{ completedTrips().length }})
          </button>
          <button 
            type="button"
            (click)="selectedFilter.set('READY_TO_BILL')"
            [ngClass]="selectedFilter() === 'READY_TO_BILL' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'"
            class="btn-xs rounded-xl font-semibold transition-all cursor-pointer flex items-center justify-center whitespace-nowrap">
            Ready to Bill ({{ readyToBillCount() }})
          </button>
          <button 
            type="button"
            (click)="selectedFilter.set('IN_BILLING')"
            [ngClass]="selectedFilter() === 'IN_BILLING' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'"
            class="btn-xs rounded-xl font-semibold transition-all cursor-pointer flex items-center justify-center whitespace-nowrap">
            In Billing ({{ inBillingCount() }})
          </button>
          <button 
            type="button"
            (click)="selectedFilter.set('BILLED')"
            [ngClass]="selectedFilter() === 'BILLED' ? 'bg-slate-700 text-white shadow-xs' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'"
            class="btn-xs rounded-xl font-semibold transition-all cursor-pointer flex items-center justify-center whitespace-nowrap">
            Billed ({{ billedCount() }})
          </button>

          <!-- Truck Plate Filter -->
          <select 
            [ngModel]="selectedTruckFilter()" 
            (ngModelChange)="selectedTruckFilter.set($event)" 
            class="form-input text-xs font-semibold text-slate-800 bg-white cursor-pointer whitespace-nowrap h-9 py-1 pl-3 pr-8 rounded-xl">
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
              class="text-xs bg-transparent outline-none font-medium text-slate-700 cursor-pointer" 
              title="From Date" 
            />
            <span class="text-slate-400 font-bold">→</span>
            <input 
              type="date" 
              [ngModel]="toDate()" 
              (ngModelChange)="toDate.set($event)" 
              class="text-xs bg-transparent outline-none font-medium text-slate-700 cursor-pointer" 
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
          <div class="relative" (click)="$event.stopPropagation()">
            <button (click)="isExportMenuOpen.set(!isExportMenuOpen())"
                    [disabled]="isExportingPdf() || isExportingExcel()"
                    type="button"
                    class="btn-secondary h-9 px-3 text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 shadow-2xs hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-75 disabled:cursor-wait">
              <span *ngIf="isExportingPdf() || isExportingExcel()" class="material-symbols-outlined text-[16px] text-brand-600 animate-spin">progress_activity</span>
              <span *ngIf="!isExportingPdf() && !isExportingExcel()" class="material-symbols-outlined text-[18px] text-slate-500">download</span>
              <span>{{ isExportingPdf() ? 'Exporting PDF...' : (isExportingExcel() ? 'Exporting Excel...' : 'Export') }}</span>
              <span *ngIf="!isExportingPdf() && !isExportingExcel()" class="material-symbols-outlined text-[16px] text-slate-400 transition-transform duration-150" [class.rotate-180]="isExportMenuOpen()">arrow_drop_down</span>
            </button>

            <div *ngIf="isExportMenuOpen()" 
                 class="absolute right-0 mt-1.5 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 animate-scale-in text-slate-800">
              <button (click)="exportPdf(); isExportMenuOpen.set(false)" 
                      [disabled]="isExportingPdf() || isExportingExcel()"
                      class="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer font-medium disabled:opacity-50">
                <span class="material-symbols-outlined text-[16px] text-rose-500">picture_as_pdf</span>
                <span>PDF Document</span>
              </button>
              <button (click)="exportExcel(); isExportMenuOpen.set(false)" 
                      [disabled]="isExportingPdf() || isExportingExcel()"
                      class="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer border-t border-slate-100 font-medium disabled:opacity-50">
                <span class="material-symbols-outlined text-[16px] text-emerald-600">table_chart</span>
                <span>Spreadsheet</span>
              </button>
            </div>
          </div>
        </div>

      </app-toolbar>

      <!-- ── COMPLETED TRIPS DATA TABLE (7-COLUMN OWNER-GRADE EXECUTIVE LAYOUT) ── -->
      <div class="card overflow-hidden shadow-2xs border border-slate-200">
        <div class="overflow-x-auto max-w-full">
          <table class="data-table min-w-[1100px]">
            <thead>
              <tr>
                <!-- Col 1: Timeline -->
                <th (click)="toggleSort('deliveredDate')" class="cursor-pointer select-none hover:text-brand-600 transition-colors w-[15%]">
                  <div class="flex items-center gap-1">
                    <span>Timeline</span>
                    <span *ngIf="sortField === 'deliveredDate'" class="text-brand-600 font-bold">{{ sortAsc ? '▲' : '▼' }}</span>
                  </div>
                </th>

                <!-- Col 2: Trip & Route -->
                <th (click)="toggleSort('tloNumber')" class="cursor-pointer select-none hover:text-brand-600 transition-colors w-[22%]">
                  <div class="flex items-center gap-1">
                    <span>Trip &amp; Route</span>
                    <span *ngIf="sortField === 'tloNumber'" class="text-brand-600 font-bold">{{ sortAsc ? '▲' : '▼' }}</span>
                  </div>
                </th>

                <!-- Col 3: Fleet -->
                <th class="w-[18%]">Fleet</th>

                <!-- Col 4: Gross Freight -->
                <th (click)="toggleSort('grossFreight')" class="cursor-pointer select-none hover:text-brand-600 transition-colors text-right w-[12%]">
                  <div class="flex items-center justify-end gap-1">
                    <span>Gross Freight</span>
                    <span *ngIf="sortField === 'grossFreight'" class="text-brand-600 font-bold">{{ sortAsc ? '▲' : '▼' }}</span>
                  </div>
                </th>

                <!-- Col 5: COH & Cost -->
                <th class="text-right w-[13%]">COH &amp; Cost</th>

                <!-- Col 6: Net Company Income -->
                <th (click)="toggleSort('netIncome')" class="cursor-pointer select-none hover:text-brand-600 transition-colors text-right w-[11%]">
                  <div class="flex items-center justify-end gap-1">
                    <span>Net Income</span>
                    <span *ngIf="sortField === 'netIncome'" class="text-brand-600 font-bold">{{ sortAsc ? '▲' : '▼' }}</span>
                  </div>
                </th>

                <!-- Col 7: Status -->
                <th class="text-right w-[9%]">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let trip of filteredTrips()" 
                  (click)="navigateToTrip(trip.id)"
                  class="hover:bg-slate-50/70 cursor-pointer transition-colors border-b border-slate-100 last:border-0">
                
                <!-- Col 1: Timeline -->
                <td class="font-mono text-xs whitespace-nowrap">
                  <div class="flex flex-col space-y-0.5">
                    <span class="text-xs font-bold text-slate-900 tabular-nums">
                      {{ getDispatchedDate(trip) }}
                    </span>
                    <span class="text-xs font-bold text-emerald-700 tabular-nums">
                      {{ getDeliveredDate(trip) }}
                    </span>
                    <span class="text-[11px] text-slate-500 font-medium tabular-nums">
                      {{ getTurnaroundDays(trip) }}
                    </span>
                  </div>
                </td>

                <!-- Col 2: Trip & Route -->
                <td>
                  <div class="flex flex-col space-y-1">
                    <!-- Row 1: TLO# & Client -->
                    <div class="flex items-center gap-2">
                      <span class="text-brand-600 font-bold font-mono text-xs tracking-tight">
                        TLO #{{ trip.tloNumber }}
                      </span>
                      <span class="font-bold text-slate-800 text-[10px] tracking-tight bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block truncate max-w-[150px]" 
                            title="{{ trip.client || 'Cargill PH, Inc.' }}">
                        {{ trip.client || 'Cargill PH, Inc.' }}
                      </span>
                    </div>

                    <!-- Row 2: Trip# -->
                    <div class="flex items-center gap-2">
                      <span class="text-brand-600 font-bold font-mono text-xs tracking-tight">
                        Trip #{{ trip.tripNumber || '—' }}
                      </span>
                    </div>

                    <!-- Row 3: Origin & Destination with Arrow -->
                    <span class="font-semibold text-slate-900 text-xs leading-snug truncate block" 
                          title="{{ getOrigin(trip) }} → {{ getDestination(trip) }}">
                      {{ getOrigin(trip) }} <span class="text-slate-400 font-normal">➔</span> {{ getDestination(trip) }}
                    </span>
                  </div>
                </td>

                <!-- Col 3: Fleet -->
                <td>
                  <div class="flex flex-col max-w-[220px] space-y-1">
                    <!-- Row 1: Route Tag, Plate Number -->
                    <div class="flex items-center gap-1.5">
                      <span [ngClass]="trip.routeTag === 'BACKLOAD' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-brand-600 border-blue-200'" 
                            class="px-1.5 py-0.5 rounded text-[10px] font-semibold border uppercase tracking-wider inline-block">
                        {{ trip.routeTag === 'BACKLOAD' ? '🟣 Backload' : '🔵 Frontload' }}
                      </span>
                      <span class="font-bold font-mono text-slate-900 text-[11px] tracking-tight bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block">
                        {{ trip.plateNumber }}
                      </span>
                    </div>

                    <!-- Row 2: Driver -->
                    <div class="text-[11px] font-medium text-slate-800 flex items-center gap-1.5 truncate">
                      <span class="w-1.5 h-1.5 rounded-full bg-brand-600 shrink-0"></span>
                      <span class="truncate">{{ trip.driverName }}</span>
                    </div>

                    <!-- Row 3: Helper -->
                    <div *ngIf="trip.helperName && trip.helperName !== 'None' && trip.helperName !== 'Unassigned'" class="text-[11px] font-medium text-slate-500 flex items-center gap-1.5 truncate">
                      <span class="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0"></span>
                      <span class="truncate">{{ trip.helperName }}</span>
                    </div>
                    <div *ngIf="!trip.helperName || trip.helperName === 'None' || trip.helperName === 'Unassigned'" class="text-[11px] font-medium text-slate-400 flex items-center gap-1.5 truncate">
                      <span class="w-1.5 h-1.5 rounded-full bg-slate-200 shrink-0"></span>
                      <span class="truncate italic">No Helper</span>
                    </div>
                  </div>
                </td>

                <!-- Col 4: Gross Freight -->
                <td class="text-right font-mono">
                  <div class="flex flex-col items-end space-y-0.5">
                    <!-- Row 1: Gross Freight Amount (Same as TLO: text-brand-600 font-bold font-mono text-xs tracking-tight) -->
                    <span class="text-brand-600 font-bold font-mono text-xs tracking-tight tabular-nums">
                      ₱{{ getGrossFreight(trip) | number:'1.2-2' }}
                    </span>

                    <!-- Row 2: Truck Rate (Same as Driver Name: text-[11px] font-medium text-slate-800) -->
                    <span class="text-[11px] font-medium text-slate-800 tabular-nums">
                      ₱{{ (trip.truckRate || trip.baseRate || 0) | number:'1.2-2' }}
                    </span>

                    <!-- Row 3: Weight (Same as Driver Name: text-[11px] font-medium text-slate-800) -->
                    <span class="text-[11px] font-medium text-slate-800 tabular-nums">
                      {{ getTonnage(trip) | number:'1.2-2' }} Tons
                    </span>
                  </div>
                </td>

                <!-- Col 5: COH & Cost -->
                <td class="text-right font-mono">
                  <div class="flex flex-col items-end space-y-0.5">
                    <!-- Row 1: Cash on Hand (Color Orange, Font size based on TLO: text-xs font-bold font-mono tracking-tight tabular-nums) -->
                    <span class="text-amber-600 font-bold font-mono text-xs tracking-tight tabular-nums">
                      ₱{{ getCashOnHand(trip) | number:'1.2-2' }}
                    </span>

                    <!-- Row 2: Trip Cost (Color Red, Font size based on Truck Rate: text-[11px] font-medium text-rose-600 tabular-nums) -->
                    <span class="text-[11px] font-medium text-rose-600 tabular-nums">
                      - ₱{{ getTotalTripCost(trip) | number:'1.2-2' }}
                    </span>

                    <!-- Row 3: Balance (Green if positive, Red with minus if negative, Font size based on Weight: text-[11px] font-medium tabular-nums) -->
                    <span class="text-[11px] font-medium tabular-nums"
                          [ngClass]="getCOHBalance(trip) >= 0 ? 'text-emerald-700' : 'text-rose-600'">
                      {{ getCOHBalance(trip) >= 0 ? '₱' + (getCOHBalance(trip) | number:'1.2-2') : '- ₱' + ((getCOHBalance(trip) * -1) | number:'1.2-2') }}
                    </span>
                  </div>
                </td>

                <!-- Col 6: Net Company Income -->
                <td class="text-right font-mono">
                  <div class="flex flex-col items-end space-y-0.5">
                    <span class="text-xs font-bold tabular-nums"
                          [ngClass]="getNetIncome(trip) >= 0 ? 'text-emerald-700' : 'text-rose-600'">
                      ₱{{ getNetIncome(trip) | number:'1.2-2' }}
                    </span>
                    <span class="px-1.5 py-0.5 rounded text-[10px] font-bold border inline-block mt-0.5 whitespace-nowrap"
                          [ngClass]="getNetIncome(trip) >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'">
                      {{ getMarginPercent(trip) }}% Margin
                    </span>
                  </div>
                </td>

                <!-- Col 7: Status -->
                <td class="text-right whitespace-nowrap">
                  <div class="flex flex-col items-end">
                    <app-status-badge [status]="getTripStatus(trip)"></app-status-badge>
                  </div>
                </td>

              </tr>

              <!-- Empty State in Table -->
              <tr *ngIf="filteredTrips().length === 0">
                <td colspan="7" class="py-12 text-center">
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
  private router = inject(Router);
  dispatchStore = inject(DispatchStore);
  fleetStore = inject(FleetStore);
  private reportExportService = inject(ReportExportService);

  selectedFilter = signal<string>('ALL');
  selectedTruckFilter = signal<string>('ALL');
  searchQuery = signal<string>('');
  fromDate = signal<string>('');
  toDate = signal<string>('');
  isExportMenuOpen = signal<boolean>(false);
  isExportingPdf = signal<boolean>(false);
  isExportingExcel = signal<boolean>(false);

  sortField: 'tloNumber' | 'deliveredDate' | 'grossFreight' | 'totalFreightCharge' | 'netIncome' = 'deliveredDate';
  sortAsc = false;

  @HostListener('document:click')
  onDocumentClick() {
    if (this.isExportMenuOpen()) {
      this.isExportMenuOpen.set(false);
    }
  }

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

  // ── PURE FINANCIAL CALCULATIONS & INVARIANTS ────────────────────────────────
  getOrigin(trip: TripDispatch): string {
    return trip.route?.origin || trip.origin || trip.originFrom || '—';
  }

  getDestination(trip: TripDispatch): string {
    return trip.route?.destination || trip.destination || trip.destinationTo || '—';
  }

  getTonnage(trip: TripDispatch): number {
    return Number(trip.cargo?.tonnage || trip.weightTons || trip.tonnage || 0) || 0;
  }

  getGrossFreight(trip: TripDispatch): number {
    return Number(trip.pricing?.grossFreight || trip.totalFreightCharge || trip.freightRevenue || 0) || 0;
  }

  getCrewExpenses(trip: TripDispatch): number {
    const entries = trip.cashLedger?.entries || trip.cohEntries || [];
    const debits = entries
      .filter(e => e.type === 'DEBIT')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    if (debits > 0) return debits;
    return (trip.travelExpenses || 0) + (trip.dieselExpenses || 0) + (trip.foodExpenses || 0);
  }

  getCashOnHand(trip: TripDispatch): number {
    const entries = trip.cashLedger?.entries || trip.cohEntries || [];
    const credits = entries
      .filter(e => e.type === 'CREDIT')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    if (credits > 0) return credits;
    return Number((trip as any).startingCOH || (trip as any).dispatchAllowance || (trip as any).driverAllowance || 0) || 0;
  }

  getCOHBalance(trip: TripDispatch): number {
    return this.getCashOnHand(trip) - this.getTotalTripCost(trip);
  }

  getCrewPayroll(trip: TripDispatch): number {
    return Number(trip.payroll?.totalCrewPayroll ?? ((Number(trip.payroll?.driverSalary ?? trip.driverSalary ?? 0)) + (Number(trip.payroll?.helperSalary ?? trip.helperSalary ?? 0))));
  }

  getTotalTripCost(trip: TripDispatch): number {
    if (trip.totalTripCost !== undefined && trip.totalTripCost !== null && Number(trip.totalTripCost) > 0) {
      return Number(trip.totalTripCost);
    }
    return this.getCrewExpenses(trip) + this.getCrewPayroll(trip);
  }

  getNetIncome(trip: TripDispatch): number {
    if (trip.netIncome !== undefined && trip.netIncome !== null) return Number(trip.netIncome) || 0;
    return this.getGrossFreight(trip) - this.getTotalTripCost(trip);
  }

  getMarginPercent(trip: TripDispatch): string {
    const gross = this.getGrossFreight(trip);
    const net = this.getNetIncome(trip);
    if (gross <= 0) return '0.0';
    return (Math.round((net / gross) * 1000) / 10).toFixed(1);
  }

  getDispatchedDate(trip: TripDispatch): string {
    return formatAppDate(trip.dispatchedDate || trip.dispatchedAt) || '—';
  }

  getDeliveredDate(trip: TripDispatch): string {
    return formatAppDate(trip.deliveredDate || trip.deliveredAt || trip.dispatchedDate) || '—';
  }

  getTurnaroundDays(trip: TripDispatch): string {
    const disp = trip.dispatchedDate || trip.dispatchedAt;
    const delv = trip.deliveredDate || trip.deliveredAt || disp;
    if (!disp || !delv) return '—';
    try {
      const d1 = new Date(disp.split('T')[0]);
      const d2 = new Date(delv.split('T')[0]);
      const diffMs = d2.getTime() - d1.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) return 'Same Day';
      if (diffDays === 1) return '1 Day';
      return `${diffDays} Days`;
    } catch {
      return '—';
    }
  }

  getTripStatus(trip: TripDispatch): string {
    if (trip.status === 'BILLED') return 'BILLED';
    if (trip.billingStatus === 'IN_BILLING') return 'IN_BILLING';
    if (trip.billingStatus === 'SUBMITTED') return 'SUBMITTED';
    return trip.billingStatus || 'READY_TO_BILL';
  }

  hasPod(trip: TripDispatch): boolean {
    return Boolean(trip.podImageUrl || trip.podStatus === 'APPROVED' || (trip as any).proofOfDeliveryUrl);
  }

  // ── FILTERED & SORTED TRIPS ────────────────────────────────────────────────
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
      list = list.filter(t => (t.deliveredDate || t.deliveredAt || t.dispatchedDate || t.dispatchedAt || '') >= from);
    }
    if (to) {
      list = list.filter(t => (t.deliveredDate || t.deliveredAt || t.dispatchedDate || t.dispatchedAt || '') <= to + 'T23:59:59');
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
        (this.getOrigin(t).toLowerCase().includes(search)) ||
        (this.getDestination(t).toLowerCase().includes(search))
      );
    }

    return [...list].sort((a, b) => {
      let valA: any = a[this.sortField as keyof TripDispatch] || '';
      let valB: any = b[this.sortField as keyof TripDispatch] || '';

      if (this.sortField === 'tloNumber') {
        valA = Number(a.tloNumber) || 0;
        valB = Number(b.tloNumber) || 0;
      } else if (this.sortField === 'grossFreight' || this.sortField === 'totalFreightCharge') {
        valA = this.getGrossFreight(a);
        valB = this.getGrossFreight(b);
      } else if (this.sortField === 'netIncome') {
        valA = this.getNetIncome(a);
        valB = this.getNetIncome(b);
      }

      if (valA < valB) return this.sortAsc ? -1 : 1;
      if (valA > valB) return this.sortAsc ? 1 : -1;
      return 0;
    });
  });


  toggleSort(field: 'tloNumber' | 'deliveredDate' | 'grossFreight' | 'totalFreightCharge' | 'netIncome') {
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

  async exportPdf() {
    this.isExportingPdf.set(true);
    try {
      this.reportExportService.exportCompletedTripsToPdf(this.filteredTrips());
    } finally {
      this.isExportingPdf.set(false);
    }
  }

  async exportExcel() {
    this.isExportingExcel.set(true);
    try {
      await this.reportExportService.exportCompletedTripsToExcel(this.filteredTrips());
    } finally {
      this.isExportingExcel.set(false);
    }
  }

  navigateToTrip(tripId: string) {
    if (tripId) {
      this.router.navigate(['/trips', tripId]);
    }
  }
}

