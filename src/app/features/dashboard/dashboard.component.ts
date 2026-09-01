import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FleetStore } from '../../core/application/stores/fleet.store';
import { DispatchStore } from '../../core/application/stores/dispatch.store';
import { SkeletonComponent } from '../../shared/ui-kit/skeleton/skeleton.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, SkeletonComponent],
  template: `
    <div class="w-full space-y-6 animate-fade-in-up">

      <!-- ── Page Header ─────────────────────────────────────────── -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-[#262B35] tracking-tight">Good day! 👋</h1>
          <p class="text-sm text-slate-500 mt-0.5 font-medium">Porbido Trucking & Hauling — Operations Overview</p>
        </div>
        <div class="hidden sm:flex items-center gap-2">
          <span class="text-xs text-slate-400 font-medium">{{ today }}</span>
          <a routerLink="/dispatch"
             class="btn-primary text-sm inline-flex items-center gap-1.5 shadow-xs">
            <span class="material-symbols-outlined text-[18px]">add</span>
            <span>New Dispatch</span>
          </a>
        </div>
      </div>

      <!-- ── KPI Section ──────────────────────────────────────────── -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 stagger-children">

        <!-- Hero Card: Freight Revenue -->
        <div class="card-hero p-6 sm:col-span-2 lg:col-span-1 animate-fade-in-up"
             style="animation-delay:0s; min-height:160px;">
          <div class="relative z-10 h-full flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-3">
                <span class="text-[11px] font-bold uppercase tracking-wider text-blue-200">Total Billed Revenue</span>
                <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-white/10 border border-white/15">
                  <span class="material-symbols-outlined text-[20px] text-blue-200">trending_up</span>
                </div>
              </div>
              <div class="text-3xl font-black text-white tracking-tight" style="letter-spacing:-0.03em;">
                ₱{{ billedEarnings() | number:'1.0-0' }}
              </div>
              <p class="text-xs text-blue-200 font-medium mt-1">Submitted client statements</p>
            </div>

            <!-- Mini chart -->
            <div class="mt-4">
              <svg class="w-full h-10 overflow-visible" viewBox="0 0 200 40">
                <defs>
                  <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="rgba(255,255,255,0.3)"/>
                    <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
                  </linearGradient>
                </defs>
                <path d="M0 32 Q25 28,50 20 T100 18 T150 12 T200 8 L200 40 L0 40 Z"
                      fill="url(#heroGrad)"/>
                <path d="M0 32 Q25 28,50 20 T100 18 T150 12 T200 8"
                      fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="2" stroke-linecap="round"/>
                <circle cx="200" cy="8" r="3" fill="white"/>
              </svg>
              <div class="flex items-center justify-between mt-1">
                <span class="text-[10px] text-blue-300 font-medium">{{ dispatchStore.trips().length }} recorded trips</span>
                <span class="text-[10px] font-bold text-emerald-300">Live Sync Active</span>
              </div>
            </div>
          </div>
        </div>

        <!-- KPI 2: Active Fleet -->
        <div class="card p-5 animate-fade-in-up" style="animation-delay:0.05s;">
          <div class="flex items-center justify-between mb-4">
            <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Fleet</span>
            <div class="w-9 h-9 rounded-xl flex items-center justify-center bg-blue-50 text-brand-600 border border-blue-100">
              <span class="material-symbols-outlined text-[20px]">local_shipping</span>
            </div>
          </div>
          <div class="kpi-number text-[#262B35]">{{ fleetStore.availableTrucks().length + fleetStore.inTransitTrucks().length }} <span class="text-xl font-semibold text-slate-300">/ {{ fleetStore.trucks().length }}</span></div>
          <p class="text-xs text-slate-400 mt-1.5 font-medium">Operational 10-wheelers</p>
          <div class="mt-3 flex items-center gap-1.5">
            <span class="badge badge-success">{{ fleetStore.availableTrucks().length }} Available</span>
            <span class="badge badge-brand">{{ fleetStore.inTransitTrucks().length }} In Transit</span>
          </div>
        </div>

        <!-- KPI 3: Unbilled Freight -->
        <div class="card p-5 animate-fade-in-up" style="animation-delay:0.10s;">
          <div class="flex items-center justify-between mb-4">
            <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Unbilled Freight</span>
            <div class="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-50 text-amber-600 border border-amber-100">
              <span class="material-symbols-outlined text-[20px]">receipt_long</span>
            </div>
          </div>
          <div class="kpi-number text-[#262B35]" style="font-size:1.5rem;">₱{{ unbilledFreight() | number:'1.0-0' }}</div>
          <p class="text-xs text-amber-600 font-semibold mt-1.5">{{ unbilledTripsCount() }} trips pending billing batch</p>
          <a routerLink="/billings" class="btn-ghost text-xs mt-3 px-0 justify-start inline-flex items-center gap-1">
            <span>Go to Billing Queue</span>
            <span class="material-symbols-outlined text-[14px]">chevron_right</span>
          </a>
        </div>

        <!-- KPI 4: Total Crew -->
        <div class="card p-5 animate-fade-in-up" style="animation-delay:0.15s;">
          <div class="flex items-center justify-between mb-4">
            <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Registered Crew</span>
            <div class="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-600 border border-emerald-100">
              <span class="material-symbols-outlined text-[20px]">groups</span>
            </div>
          </div>
          <div class="kpi-number text-[#262B35]">{{ fleetStore.crew().length }}</div>
          <p class="text-xs text-slate-400 mt-1.5 font-medium">Drivers & Helpers roster</p>
          <div class="flex items-center gap-1.5 mt-3">
            <span class="badge badge-brand">{{ fleetStore.drivers().length }} Drivers</span>
            <span class="badge badge-success">{{ fleetStore.helpers().length }} Helpers</span>
          </div>
        </div>

      </div>

      <!-- ── Middle Row ───────────────────────────────────────────── -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">

        <!-- Fleet Status Panel -->
        <div class="lg:col-span-2 card overflow-hidden animate-fade-in-up" style="animation-delay:0.20s;">
          <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 class="text-base font-bold text-[#262B35]">Fleet Status</h2>
              <p class="text-xs text-slate-400 font-medium mt-0.5">Live truck assignments & operational state</p>
            </div>
            <a routerLink="/fleet" class="btn-ghost text-xs inline-flex items-center gap-1">
              <span>View All</span>
              <span class="material-symbols-outlined text-[14px]">chevron_right</span>
            </a>
          </div>

          <!-- Loading State -->
          <div *ngIf="isLoading()" class="p-6 space-y-3">
            <app-skeleton variant="box" height="3rem"></app-skeleton>
            <app-skeleton variant="box" height="3rem"></app-skeleton>
            <app-skeleton variant="box" height="3rem"></app-skeleton>
          </div>

          <!-- Real Data -->
          <div *ngIf="!isLoading()" class="divide-y divide-slate-50">
            <div *ngFor="let truck of fleetStore.trucks().slice(0, 5); let i = index"
                 class="px-6 py-4 flex items-center justify-between hover:bg-slate-50/70 transition-colors">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                     [ngClass]="truck.status === 'In Transit' ? 'bg-[#F1F4FF] text-[#3361FF] border border-[#C2D1FF]' : truck.status === 'Available' ? 'bg-[#EAFBF1] text-[#169E4E] border border-[#A3F2C3]' : 'bg-slate-100 text-slate-600'">
                  <span class="material-symbols-outlined text-[20px]">local_shipping</span>
                </div>
                <div>
                  <p class="text-sm font-bold text-[#262B35] font-mono">{{ truck.plateNumber }}</p>
                  <p class="text-xs text-slate-400 font-medium">Driver: {{ truck.assignedCrew?.driver?.name || 'Unassigned' }}</p>
                </div>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-xs font-mono text-slate-400">{{ truck.tonsCapacity || 30 }} Tons</span>
                <span class="badge"
                      [ngClass]="truck.status === 'In Transit' ? 'badge-brand' : truck.status === 'Available' ? 'badge-success' : 'badge-neutral'">
                  {{ truck.status }}
                </span>
              </div>
            </div>

            <div *ngIf="fleetStore.trucks().length === 0" class="p-8 text-center text-slate-400 text-xs">
              No registered trucks found in database.
            </div>
          </div>
        </div>

        <!-- Quick Actions Panel -->
        <div class="flex flex-col gap-5">
          <div class="card p-5 animate-fade-in-up" style="animation-delay:0.20s;">
            <h2 class="text-sm font-bold text-[#262B35] mb-3 flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[18px] text-brand-600">bolt</span>
              <span>Quick Actions</span>
            </h2>
            <div class="space-y-2">
              <a routerLink="/dispatch"
                 class="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-brand-200 hover:bg-brand-50 transition-all group cursor-pointer">
                <div class="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-brand-600 group-hover:scale-105 transition-transform shrink-0">
                  <span class="material-symbols-outlined text-[18px]">add_circle</span>
                </div>
                <div>
                  <p class="text-xs font-bold text-slate-900">New Dispatch</p>
                  <p class="text-[10px] text-slate-400">Assign truck & calculate rate</p>
                </div>
              </a>
              <a routerLink="/trips"
                 class="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50 transition-all group cursor-pointer">
                <div class="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition-transform shrink-0">
                  <span class="material-symbols-outlined text-[18px]">task_alt</span>
                </div>
                <div>
                  <p class="text-xs font-bold text-slate-900">Review PODs</p>
                  <p class="text-[10px] text-slate-400">Delivery receipt inspection</p>
                </div>
              </a>
              <a routerLink="/billings"
                 class="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-amber-200 hover:bg-amber-50 transition-all group cursor-pointer">
                <div class="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 group-hover:scale-105 transition-transform shrink-0">
                  <span class="material-symbols-outlined text-[18px]">compare_arrows</span>
                </div>
                <div>
                  <p class="text-xs font-bold text-slate-900">Reconcile Billing</p>
                  <p class="text-[10px] text-slate-400">Porbido vs Cargill check</p>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Recent Dispatches Table ──────────────────────────────── -->
      <div class="card overflow-hidden animate-fade-in-up" style="animation-delay:0.25s;">
        <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 class="text-base font-bold text-[#262B35]">Recent Dispatches</h2>
            <p class="text-xs text-slate-400 font-medium mt-0.5">Live trip operations records</p>
          </div>
          <a routerLink="/trips" class="btn-ghost text-xs inline-flex items-center gap-1">
            <span>View All Operations</span>
            <span class="material-symbols-outlined text-[14px]">chevron_right</span>
          </a>
        </div>
        <div class="overflow-x-auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>TLO #</th>
                <th>Truck & Driver</th>
                <th>Route</th>
                <th>Tonnage</th>
                <th>Freight Charge</th>
                <th>Status</th>
                <th class="text-right pr-6">Action</th>
              </tr>
            </thead>
            <tbody>
              <!-- SKELETON ROWS -->
              <ng-container *ngIf="isLoading()">
                <app-skeleton variant="table-row" [columns]="7"></app-skeleton>
                <app-skeleton variant="table-row" [columns]="7"></app-skeleton>
                <app-skeleton variant="table-row" [columns]="7"></app-skeleton>
              </ng-container>

              <!-- REAL DATA -->
              <ng-container *ngIf="!isLoading()">
                <tr *ngFor="let trip of dispatchStore.trips().slice(0, 5)">
                  <td>
                    <span class="font-bold text-[#262B35] font-mono text-sm">#{{ trip.tloNumber }}</span>
                  </td>
                  <td>
                    <p class="font-bold text-sm text-[#262B35] font-mono">{{ trip.plateNumber || trip.truck?.plateNumber }}</p>
                    <p class="text-xs text-slate-400 font-medium mt-0.5">{{ trip.driverName || trip.truck?.driver?.name }}</p>
                  </td>
                  <td>
                    <p class="text-xs font-semibold text-slate-600">{{ trip.originFrom || trip.origin }}</p>
                    <p class="text-xs font-bold text-brand-500 mt-0.5">→ {{ trip.destinationTo || trip.destination }}</p>
                  </td>
                  <td>
                    <span class="font-bold text-[#262B35] font-mono tabular-nums">{{ trip.weightTons ?? trip.tonnage | number:'1.2-2' }}</span>
                    <span class="text-xs text-slate-400 ml-1">tons</span>
                  </td>
                  <td>
                    <span class="font-bold text-[#262B35] font-mono tabular-nums">₱{{ (trip.freightRevenue ?? trip.totalFreightCharge) | number:'1.0-0' }}</span>
                  </td>
                  <td>
                    <span class="badge"
                          [ngClass]="trip.billingStatus === 'SUBMITTED' ? 'badge-success' : trip.status === 'POD_SUBMITTED' ? 'badge-warning' : 'badge-neutral'">
                      {{ trip.status }}
                    </span>
                  </td>
                  <td class="text-right">
                    <a [routerLink]="['/trips', trip.id || trip.tloNumber]" class="btn-secondary text-xs px-3 py-1.5 cursor-pointer">Manage</a>
                  </td>
                </tr>
                <tr *ngIf="dispatchStore.trips().length === 0">
                  <td colspan="7" class="text-center py-12 text-slate-400 text-sm">
                    No active dispatches found. Click "+ New Dispatch" to record a trip.
                  </td>
                </tr>
              </ng-container>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `
})
export class DashboardComponent {
  fleetStore = inject(FleetStore);
  dispatchStore = inject(DispatchStore);

  today = new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  isLoading = computed(() => this.fleetStore.isLoading() || this.dispatchStore.isLoading());

  billedEarnings = computed(() => {
    return this.dispatchStore.trips()
      .filter(t => t.billingStatus === 'SUBMITTED')
      .reduce((sum, t) => sum + (t.freightRevenue ?? t.totalFreightCharge ?? 0), 0);
  });

  unbilledFreight = computed(() => {
    return this.dispatchStore.trips()
      .filter(t => t.billingStatus === 'READY_TO_BILL')
      .reduce((sum, t) => sum + (t.freightRevenue ?? t.totalFreightCharge ?? 0), 0);
  });

  unbilledTripsCount = computed(() => {
    return this.dispatchStore.trips().filter(t => t.billingStatus === 'READY_TO_BILL').length;
  });
}
