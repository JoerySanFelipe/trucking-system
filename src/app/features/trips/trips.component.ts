import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { DispatchStore } from '../../core/application/stores/dispatch.store';
import { FleetStore } from '../../core/application/stores/fleet.store';
import { TripDispatch, TripStatus } from '../../core/models/tms.models';
import { FilterCardComponent } from '../../shared/ui-kit/filter-card/filter-card.component';
import { ToolbarComponent } from '../../shared/ui-kit/toolbar/toolbar.component';
import { StatusBadgeComponent } from '../../shared/ui-kit/status-badge/status-badge.component';
import { EmptyStateComponent } from '../../shared/ui-kit/empty-state/empty-state.component';
import { AppDatePipe } from '../../core/utils/date-formatter';
import { ReportExportService } from '../../core/services/report-export.service';

@Component({
  selector: 'app-trips',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    RouterLink,
    FilterCardComponent,
    ToolbarComponent,
    StatusBadgeComponent,
    EmptyStateComponent,
    AppDatePipe
  ],
  template: `
    <div class="w-full space-y-6 animate-fade-in-up pb-12">

      <!-- Page Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-semibold text-[#262B35] tracking-tight">Ongoing Trips</h1>
        </div>

        <div class="flex items-center gap-3">
          <a routerLink="/dispatch" class="btn-primary text-xs py-2.5 px-4 inline-flex items-center gap-1.5 shadow-2xs cursor-pointer">
            <span class="material-symbols-outlined text-[18px]">add</span>
            <span>Create New Dispatch</span>
          </a>
        </div>
      </div>

      <!-- ── KPI METRIC FILTER CARDS ────────────────────────────────────────── -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <app-filter-card 
          label="Total Ongoing" 
          [value]="ongoingTrips().length" 
          icon="local_shipping"
          theme="neutral"
          [isActive]="selectedFilter() === 'ALL'"
          (selected)="selectedFilter.set('ALL')">
        </app-filter-card>

        <app-filter-card 
          label="In Transit" 
          [value]="inTransitCount()" 
          [total]="ongoingTrips().length"
          icon="alt_route"
          theme="blue"
          [isActive]="selectedFilter() === 'IN_TRANSIT'"
          (selected)="selectedFilter.set('IN_TRANSIT')">
        </app-filter-card>

        <app-filter-card 
          label="POD Submitted" 
          [value]="podSubmittedCount()" 
          [total]="ongoingTrips().length"
          icon="fact_check"
          theme="emerald"
          [isActive]="selectedFilter() === 'POD_SUBMITTED'"
          (selected)="selectedFilter.set('POD_SUBMITTED')">
        </app-filter-card>

        <app-filter-card 
          label="For Review" 
          [value]="forReviewCount()" 
          [total]="ongoingTrips().length"
          icon="rate_review"
          theme="amber"
          [isActive]="selectedFilter() === 'FOR_REVIEW'"
          (selected)="selectedFilter.set('FOR_REVIEW')">
        </app-filter-card>
      </div>

      <!-- ── UNIVERSAL TOOLBAR (3-COLUMN RESPONSIVE GRID) ───────────────────── -->
      <app-toolbar 
        class="block w-full mt-6"
        [(searchQuery)]="searchQuery" 
        searchPlaceholder="Search TLO#, client, plate, driver, route, commodity...">
        
        <!-- Left Slot: Status Filters & Truck Selector (Single Row / Line) -->
        <div filters class="flex items-center gap-2 flex-nowrap shrink-0">
          <!-- Status Filter Buttons -->
          <button (click)="selectedFilter.set('ALL')"
                  [ngClass]="selectedFilter() === 'ALL' ? 'bg-[#262B35] text-white shadow-xs' : 'bg-white text-[#262B35] border border-slate-200 hover:bg-slate-100'"
                  class="h-10 px-3.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center whitespace-nowrap">
            All ({{ ongoingTrips().length }})
          </button>
          <button (click)="selectedFilter.set('IN_TRANSIT')"
                  [ngClass]="selectedFilter() === 'IN_TRANSIT' ? 'bg-[#3361FF] text-white shadow-xs' : 'bg-white text-[#262B35] border border-slate-200 hover:bg-slate-100'"
                  class="h-10 px-3.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center whitespace-nowrap">
            In Transit ({{ inTransitCount() }})
          </button>
          <button (click)="selectedFilter.set('POD_SUBMITTED')"
                  [ngClass]="selectedFilter() === 'POD_SUBMITTED' ? 'bg-[#29CC6A] text-white shadow-xs' : 'bg-white text-[#262B35] border border-slate-200 hover:bg-slate-100'"
                  class="h-10 px-3.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center whitespace-nowrap">
            POD Submitted ({{ podSubmittedCount() }})
          </button>
          <button (click)="selectedFilter.set('FOR_REVIEW')"
                  [ngClass]="selectedFilter() === 'FOR_REVIEW' ? 'bg-[#D97706] text-white shadow-xs' : 'bg-white text-[#262B35] border border-slate-200 hover:bg-slate-100'"
                  class="h-10 px-3.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center whitespace-nowrap">
            For Review ({{ forReviewCount() }})
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

      <!-- ── ONGOING TRIPS DATA TABLE (8-COLUMN OPERATIONS LAYOUT) ─────────── -->
      <div class="card overflow-hidden shadow-2xs border border-slate-200">
        <div class="overflow-x-auto max-w-full">
          <table class="data-table w-full min-w-[1050px]">
            <thead>
              <tr>
                <!-- Col 1: Dispatch Date (11%) -->
                <th (click)="toggleSort('dispatchedAt')" class="w-[11%] text-left cursor-pointer select-none hover:text-brand-600 transition-colors">
                  <div class="flex items-center gap-1">
                    <span>Dispatch Date</span>
                    <span *ngIf="sortField === 'dispatchedAt'" class="text-brand-600 font-bold">{{ sortAsc ? '▲' : '▼' }}</span>
                  </div>
                </th>

                <!-- Col 2: Client (15%) -->
                <th class="w-[15%] text-left">Client</th>

                <!-- Col 3: TLO # (11%) -->
                <th (click)="toggleSort('tloNumber')" class="w-[11%] text-left cursor-pointer select-none hover:text-brand-600 transition-colors">
                  <div class="flex items-center gap-1">
                    <span>TLO #</span>
                    <span *ngIf="sortField === 'tloNumber'" class="text-brand-600 font-bold">{{ sortAsc ? '▲' : '▼' }}</span>
                  </div>
                </th>

                <!-- Col 4: Route (20%) -->
                <th class="w-[20%] text-left">Route</th>

                <!-- Col 5: Fleet (16%) -->
                <th class="w-[16%] text-left">Fleet</th>

                <!-- Col 6: Truck Rate (11%) -->
                <th (click)="toggleSort('truckRate')" class="w-[11%] text-left cursor-pointer select-none hover:text-brand-600 transition-colors">
                  <div class="flex items-center gap-1">
                    <span>Truck Rate</span>
                    <span *ngIf="sortField === 'truckRate'" class="text-brand-600 font-bold">{{ sortAsc ? '▲' : '▼' }}</span>
                  </div>
                </th>

                <!-- Col 7: Cash on Hand (11%) -->
                <th class="w-[11%] text-left">Cash on Hand</th>

                <!-- Col 8: Status (5%) -->
                <th (click)="toggleSort('status')" class="w-[5%] text-left cursor-pointer select-none hover:text-brand-600 transition-colors">
                  <div class="flex items-center gap-1">
                    <span>Status</span>
                    <span *ngIf="sortField === 'status'" class="text-brand-600 font-bold">{{ sortAsc ? '▲' : '▼' }}</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let trip of filteredTrips()" 
                  (click)="navigateToTrip(trip.id)"
                  class="hover:bg-blue-50/40 cursor-pointer transition-colors">
                
                <!-- Col 1: Dispatch Date -->
                <td class="text-left font-mono text-sm text-slate-800 whitespace-nowrap">
                  <div class="font-semibold">{{ (trip.dispatchedDate || trip.dispatchedAt) | appDate }}</div>
                </td>

                <!-- Col 2: Client -->
                <td class="text-left">
                  <div class="flex flex-col max-w-[180px]">
                    <span class="text-sm font-semibold text-slate-800 truncate" title="{{ trip.client || 'Cargill Philippines, Inc.' }}">
                      {{ trip.client || 'Cargill Philippines, Inc.' }}
                    </span>
                  </div>
                </td>

                <!-- Col 3: TLO # (Pure number, Trip# below) -->
                <td class="text-left">
                  <div class="flex flex-col">
                    <span class="text-brand-600 font-bold font-mono text-sm tracking-tight">{{ trip.tloNumber }}</span>
                    <span class="text-xs font-mono text-slate-500 mt-0.5 font-medium">
                      {{ trip.tripNumber ? 'Trip# ' + trip.tripNumber : '—' }}
                    </span>
                  </div>
                </td>

                <!-- Col 4: Route (Route tag & Destination to and From) -->
                <td class="text-left">
                  <div class="flex flex-col max-w-[240px]">
                    <div>
                      <span [ngClass]="trip.routeTag === 'BACKLOAD' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-brand-600 border-blue-200'" 
                            class="px-2 py-0.5 rounded text-xs font-bold border uppercase inline-block mb-1 tracking-wide">
                        {{ trip.routeTag === 'BACKLOAD' ? '🟣 Backload' : '🔵 Frontload' }}
                      </span>
                    </div>
                    <span class="font-semibold text-slate-900 text-sm leading-snug truncate" title="{{ trip.origin || trip.originFrom }} → {{ trip.destination || trip.destinationTo }}">
                      {{ trip.origin || trip.originFrom }} <span class="text-slate-400 font-normal">➔</span> {{ trip.destination || trip.destinationTo }}
                    </span>
                  </div>
                </td>

                <!-- Col 5: Fleet (Plate Number, Driver, Helper) -->
                <td class="text-left">
                  <div class="flex flex-col space-y-1">
                    <div>
                      <span class="font-bold font-mono text-slate-900 text-xs tracking-tight bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200 inline-block">
                        {{ trip.plateNumber }}
                      </span>
                    </div>
                    <div class="flex flex-col space-y-0.5">
                      <div class="text-sm font-medium text-slate-800 flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full bg-brand-600 shrink-0"></span>
                        <span class="truncate max-w-[150px]" title="{{ trip.driverName }}">{{ trip.driverName }}</span>
                      </div>
                      <div *ngIf="trip.helperName && trip.helperName !== 'None' && trip.helperName !== 'Unassigned'" class="text-xs text-slate-500 flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full bg-slate-300 shrink-0"></span>
                        <span class="truncate max-w-[150px]" title="{{ trip.helperName }}">{{ trip.helperName }}</span>
                      </div>
                    </div>
                  </div>
                </td>

                <!-- Col 6: Truck Rate (Rate without /Ton, Weight below) -->
                <td class="text-left font-mono">
                  <div class="flex flex-col">
                    <span class="font-bold text-slate-900 text-sm tabular-nums">
                      ₱{{ (trip.truckRate || trip.baseRate || 0) | number:'1.2-2' }}
                    </span>
                    <span class="text-xs text-slate-500 font-medium mt-0.5 tabular-nums">
                      {{ (trip.weightTons || trip.tonnage || 0) | number:'1.2-2' }} Tons
                    </span>
                  </div>
                </td>

                <!-- Col 7: Cash on Hand (Red color, no expenses) -->
                <td class="text-left font-mono whitespace-nowrap">
                  <span class="font-bold text-rose-600 text-sm tabular-nums">
                    ₱{{ getCashOnHand(trip) | number:'1.2-2' }}
                  </span>
                </td>

                <!-- Col 8: Status (No delete button) -->
                <td class="text-left">
                  <div class="flex flex-col items-start gap-1">
                    <app-status-badge [status]="trip.status"></app-status-badge>
                    <span *ngIf="isOverdue(trip)" class="text-xs font-bold text-rose-600">
                      Priority (>48h)
                    </span>
                  </div>
                </td>

              </tr>

              <!-- Empty State in Table -->
              <tr *ngIf="filteredTrips().length === 0">
                <td colspan="8" class="py-12 text-center">
                  <app-empty-state
                    title="No Ongoing Trips Found"
                    description="No active operational trips match your current filter, search criteria, or date range."
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
export class TripsComponent {
  dispatchStore = inject(DispatchStore);
  fleetStore = inject(FleetStore);
  private reportExportService = inject(ReportExportService);

  statusFilters = [
    { label: 'All Ongoing', value: 'ALL' },
    { label: 'In Transit', value: 'IN_TRANSIT' },
    { label: 'POD Submitted', value: 'POD_SUBMITTED' },
    { label: 'For Review', value: 'FOR_REVIEW' },
  ];

  selectedFilter = signal<string>('ALL');
  selectedTruckFilter = signal<string>('ALL');
  searchQuery = signal<string>('');
  fromDate = signal<string>('');
  toDate = signal<string>('');
  isExportMenuOpen = signal<boolean>(false);
  
  sortField: 'tloNumber' | 'dispatchedAt' | 'truckRate' | 'status' = 'dispatchedAt';
  sortAsc = false;
  private router = inject(Router);

  // ── ONGOING TRIPS (CANONICAL FILTER) ───────────────────────────────────────
  // Ongoing Trips exclusively contains active, non-completed operational trips
  ongoingTrips = computed(() => {
    return this.dispatchStore.dispatches().filter(t => t.status !== 'COMPLETED' && t.status !== 'BILLED');
  });

  // ── COMPUTED COUNTERS & STATS (ONGOING ONLY) ──────────────────────────────

  inTransitCount = computed(() => {
    return this.ongoingTrips().filter(t => t.status === 'IN_TRANSIT').length;
  });

  podSubmittedCount = computed(() => {
    return this.ongoingTrips().filter(t => t.status === 'POD_SUBMITTED').length;
  });

  forReviewCount = computed(() => {
    return this.ongoingTrips().filter(t => t.status === 'FOR_REVIEW').length;
  });

  getFilterCount(status: string): number {
    if (status === 'ALL') return this.ongoingTrips().length;
    return this.ongoingTrips().filter(t => t.status === status).length;
  }

  // ── CASH ON HAND & EXPENSES CALCULATIONS ───────────────────────────────────

  getCrewExpenses(trip: TripDispatch): number {
    const debits = (trip.cohEntries || [])
      .filter(e => e.type === 'DEBIT')
      .reduce((sum, e) => sum + e.amount, 0);
    if (debits > 0) return debits;
    return (trip.travelExpenses || 0) + (trip.dieselExpenses || 0) + (trip.foodExpenses || 0) || (trip.cost || 0);
  }

  getCashOnHand(trip: TripDispatch): number {
    const credits = (trip.cohEntries || [])
      .filter(e => e.type === 'CREDIT')
      .reduce((sum, e) => sum + e.amount, 0);
    return credits > 0 ? credits : ((trip as any).dispatchAllowance || 0);
  }

  // ── EXPORT HANDLERS ───────────────────────────────────────────────────────

  exportPdf() {
    this.reportExportService.exportTripsToPdf(this.filteredTrips());
  }

  exportExcel() {
    this.reportExportService.exportTripsToExcel(this.filteredTrips());
  }

  // ── FILTERED & SORTED TRIPS ───────────────────────────────────────────────

  filteredTrips = computed(() => {
    let list = this.ongoingTrips();

    const status = this.selectedFilter();
    if (status !== 'ALL') {
      list = list.filter(t => t.status === status);
    }

    const truck = this.selectedTruckFilter();
    if (truck !== 'ALL') {
      list = list.filter(t => t.plateNumber.trim().toUpperCase() === truck.trim().toUpperCase());
    }

    const from = this.fromDate();
    const to = this.toDate();
    const search = this.searchQuery().trim().toLowerCase();

    if (from) {
      list = list.filter(t => (t.dispatchedDate || t.dispatchedAt) >= from);
    }
    if (to) {
      list = list.filter(t => (t.dispatchedDate || t.dispatchedAt) <= to + 'T23:59:59');
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

    // Sort list
    return [...list].sort((a, b) => {
      let valA: any = a[this.sortField] || '';
      let valB: any = b[this.sortField] || '';
      
      if (this.sortField === 'tloNumber') {
        valA = Number(a.tloNumber) || 0;
        valB = Number(b.tloNumber) || 0;
      } else if (this.sortField === 'truckRate') {
        valA = Number(a.truckRate ?? a.baseRate ?? 0);
        valB = Number(b.truckRate ?? b.baseRate ?? 0);
      }
      
      if (valA < valB) return this.sortAsc ? -1 : 1;
      if (valA > valB) return this.sortAsc ? 1 : -1;
      return 0;
    });
  });

  navigateToTrip(tripId: string) {
    if (tripId) {
      this.router.navigate(['/trips', tripId]);
    }
  }

  toggleSort(field: 'tloNumber' | 'dispatchedAt' | 'truckRate' | 'status') {
    if (this.sortField === field) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortField = field;
      this.sortAsc = true;
    }
  }

  isOverdue(trip: TripDispatch): boolean {
    if (trip.status === 'POD_SUBMITTED') return false;
    const dateStr = trip.dispatchedDate || trip.dispatchedAt;
    if (!dateStr) return false;
    const dispatched = new Date(dateStr).getTime();
    const now = Date.now();
    const diffHours = (now - dispatched) / (1000 * 60 * 60);
    return diffHours > 48;
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
}

