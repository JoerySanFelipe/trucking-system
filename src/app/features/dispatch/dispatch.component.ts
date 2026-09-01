import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FleetStore } from '../../core/application/stores/fleet.store';
import { DispatchStore } from '../../core/application/stores/dispatch.store';
import { FinanceCalculator } from '../../core/domain/rules/finance-calculator';
import { RateType, RouteTag, Trip, COHEntry } from '../../core/models/tms.models';
import { TmsService } from '../../core/services/tms.service';
import { ModalComponent } from '../../shared/ui-kit/modal/modal.component';
import { CurrencyFieldComponent } from '../../shared/ui-kit/currency-field/currency-field.component';
import { ComboboxComponent } from '../../shared/ui-kit/combobox/combobox.component';
import { CarryoverBalance } from '../../shared/ui-kit/transactions-table/transactions-table.component';

@Component({
  selector: 'app-dispatch',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    RouterLink,
    ModalComponent,
    CurrencyFieldComponent,
    ComboboxComponent
  ],
  template: `
    <div class="w-full space-y-6 animate-fade-in-up max-w-5xl mx-auto pb-12">
      <!-- ── Page Header ────────────────────────────────────────────── -->
      <div>
        <h1 class="text-2xl font-semibold text-slate-900 tracking-tight">Dispatch Operations Hub</h1>
        <p class="text-sm text-slate-500 mt-0.5 font-medium">Select a dispatch mode below to record trips or review requests.</p>
      </div>

      <!-- ── 3-Card Hub Grid ────────────────────────────────────────────── -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <!-- CARD 1: PRE-DISPATCH -->
        <div class="card p-6 flex flex-col hover:shadow-md transition-shadow border border-slate-200">
          <div class="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-brand-600 mb-4 border border-blue-100 shadow-2xs">
            <span class="material-symbols-outlined text-[28px]">local_shipping</span>
          </div>
          <h2 class="text-lg font-bold text-slate-900 mb-2">Pre-Dispatch</h2>
          <p class="text-xs text-slate-500 font-medium mb-6 flex-1">Quick pre-trip registration before truck departure from garage/port.</p>
          <button (click)="openPreDispatchModal()" class="btn-primary w-full shadow-xs text-sm py-2.5 cursor-pointer">
            Start Pre-Dispatch
          </button>
        </div>

        <!-- CARD 2: POST-DISPATCH -->
        <div class="card p-6 flex flex-col hover:shadow-md transition-shadow border border-slate-200">
          <div class="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mb-4 border border-emerald-100 shadow-2xs">
            <span class="material-symbols-outlined text-[28px]">history_edu</span>
          </div>
          <h2 class="text-lg font-bold text-slate-900 mb-2">Post-Dispatch</h2>
          <p class="text-xs text-slate-500 font-medium mb-6 flex-1">Encode and reconcile finished or historical backlogged trips.</p>
          <a routerLink="/dispatch/post-dispatch" class="btn-secondary w-full text-center shadow-2xs text-sm py-2.5 cursor-pointer">
            Encode Completed Trip
          </a>
        </div>

        <!-- CARD 3: CREW FLOATING REQUESTS -->
        <div class="card p-6 flex flex-col hover:shadow-md transition-shadow border border-slate-200 relative">
          <div class="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 mb-4 border border-amber-100 shadow-2xs">
            <span class="material-symbols-outlined text-[28px]">phone_android</span>
          </div>
          <h2 class="text-lg font-bold text-slate-900 mb-2">Crew Floating Requests</h2>
          <p class="text-xs text-slate-500 font-medium mb-6 flex-1">Review and approve driver-initiated TLO requests from mobile.</p>
          
          <div *ngIf="dispatchStore.pendingSubmissions().length > 0" class="absolute top-6 right-6">
            <span class="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-1 rounded-full animate-pulse shadow-2xs">
              {{ dispatchStore.pendingSubmissions().length }} Pending
            </span>
          </div>

          <a routerLink="/dispatch/crew-requests" class="btn-secondary w-full text-center shadow-2xs text-sm py-2.5 bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100 cursor-pointer">
            Review Queue
          </a>
        </div>

      </div>
    </div>

    <!-- ── PRE-DISPATCH MODAL (100% UNIFORM WITH POST-DISPATCH) ──────────────── -->
    <app-modal
      [isOpen]="showPreDispatchModal()"
      title="Pre-Dispatch Entry"
      subtitle=""
      size="lg"
      (closed)="closePreDispatchModal()">
      
      <form (ngSubmit)="onSubmitPreDispatch()" #preDispatchForm="ngForm" id="preDispatchForm" class="space-y-4">
        
        <!-- ── SECTION 1: SHIPMENT & ASSIGNMENT ────────────────────────────── -->
        <div class="card p-5 shadow-2xs space-y-4 border border-slate-200">
          <div class="pb-2.5 border-b border-slate-100 flex items-center justify-between">
            <span class="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-50 text-brand-700 border border-blue-200/60 text-xs font-semibold shadow-2xs">
              <span class="w-4 h-4 rounded-md bg-brand-600 text-white flex items-center justify-center text-[10px] font-bold font-mono">1</span>
              <span>Shipment &amp; Assignment</span>
            </span>
          </div>

          <div class="space-y-3">
            <!-- Row 1: Searchable Client Combobox -->
            <div>
              <app-combobox
                label="Client"
                [required]="true"
                placeholder="Type or select client name..."
                [options]="clientOptions()"
                [(value)]="clientName"
              />
            </div>

            <!-- Row 2: TLO #, Dispatch Date, Truck -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
              <!-- TLO # Field with Real-Time Validation -->
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1.5">
                  TLO # <span class="text-rose-500">*</span>
                </label>
                <input 
                  type="text" 
                  inputmode="numeric"
                  name="tloNumber"
                  [(ngModel)]="tloNumber"
                  (input)="validateTLO()"
                  required
                  placeholder="e.g. 904816"
                  class="form-input text-xs font-mono font-bold"
                  [ngClass]="{'border-rose-400 bg-rose-50/40 text-rose-900': tloError()}"
                />
                <p *ngIf="tloError()" class="text-[11px] font-medium text-rose-600 mt-1 flex items-center gap-1">
                  <span class="material-symbols-outlined text-[13px]">error</span>
                  <span>{{ tloError() }}</span>
                </p>
              </div>

              <!-- Dispatch Date -->
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1.5">
                  Dispatch Date <span class="text-rose-500">*</span>
                </label>
                <input 
                  type="date" 
                  name="dispatchDate"
                  [(ngModel)]="dispatchDate"
                  required
                  class="form-input w-full text-xs font-semibold"
                />
              </div>

              <!-- Truck Selection -->
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1.5">
                  Truck <span class="text-rose-500">*</span>
                </label>
                <select 
                  name="plateNumber"
                  [ngModel]="selectedPlate()"
                  (ngModelChange)="onAssetSelect($event)"
                  required
                  class="form-input text-xs font-semibold cursor-pointer">
                  <option value="" disabled selected>Select Available Truck</option>
                  <option *ngFor="let asset of availableFleetAssets()" [value]="asset.plateNumber">
                    {{ asset.plateNumber }} ({{ asset.tonsCapacity || 30 }}T) {{ asset.truckType ? '• ' + asset.truckType : '' }}
                  </option>
                </select>
              </div>
            </div>

            <!-- Row 2: Trip Number (Static), Driver (Static), Helper (Static) -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
              <!-- Static Trip Number (Read-Only) -->
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1.5">
                  Trip Number
                </label>
                <input 
                  type="text" 
                  [value]="computedNextTripNumber()" 
                  readonly 
                  tabindex="-1"
                  placeholder="—"
                  class="form-input text-xs font-mono font-bold bg-slate-50/80 text-slate-700 border-slate-200 cursor-not-allowed select-none"
                />
              </div>

              <!-- Driver (Auto-Filled from Truck) -->
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1.5">
                  Driver <span class="text-rose-500">*</span>
                </label>
                <input 
                  type="text" 
                  [value]="computedAssignedDriver()" 
                  readonly 
                  tabindex="-1"
                  placeholder="Unassigned"
                  class="form-input text-xs font-semibold bg-slate-50/80 border-slate-200 cursor-not-allowed select-none transition-all"
                  [ngClass]="computedAssignedDriver() === 'Unassigned' ? 'text-slate-400 font-normal' : 'text-slate-800 font-bold'"
                />
              </div>

              <!-- Helper (Auto-Filled from Truck) -->
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1.5">
                  Helper
                </label>
                <input 
                  type="text" 
                  [value]="computedAssignedHelper()" 
                  readonly 
                  tabindex="-1"
                  placeholder="Unassigned"
                  class="form-input text-xs font-semibold bg-slate-50/80 border-slate-200 cursor-not-allowed select-none transition-all"
                  [ngClass]="computedAssignedHelper() === 'Unassigned' ? 'text-slate-400 font-normal' : 'text-slate-800 font-bold'"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- ── SECTION 2: ROUTE & RATES ─────────────────────────────────────── -->
        <div class="card p-5 shadow-2xs space-y-4 border border-slate-200">
          <div class="pb-2.5 border-b border-slate-100 flex items-center justify-between">
            <span class="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-50 text-brand-700 border border-blue-200/60 text-xs font-semibold shadow-2xs">
              <span class="w-4 h-4 rounded-md bg-brand-600 text-white flex items-center justify-center text-[10px] font-bold font-mono">2</span>
              <span>Route &amp; Rates</span>
            </span>
          </div>

          <div class="space-y-3">
            <!-- Row 1: Origin, Destination, Route Tag -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
              <app-combobox
                label="Origin"
                [required]="true"
                placeholder="Type or select origin..."
                [options]="originOptions()"
                [(value)]="origin"
              />

              <app-combobox
                label="Destination"
                [required]="true"
                placeholder="Type or select destination..."
                [options]="destinationOptions()"
                [(value)]="destination"
              />

              <!-- Route Tag -->
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1.5">Route Tag</label>
                <select name="routeTag" [(ngModel)]="routeTag" class="form-input text-xs font-semibold cursor-pointer">
                  <option value="FRONTLOAD">🔵 Frontload</option>
                  <option value="BACKLOAD">🟣 Backload</option>
                </select>
              </div>
            </div>

            <!-- Row 2: Rate Scheme, Truck Rate, Weight (Tons) -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
              <!-- Rate Scheme -->
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1.5">Rate Scheme <span class="text-rose-500">*</span></label>
                <select 
                  name="rateType" 
                  [ngModel]="rateType()" 
                  (ngModelChange)="rateType.set($event)"
                  class="form-input text-xs font-semibold cursor-pointer py-2 pl-2.5 pr-7">
                  <option value="PER_TON">Per-Ton (₱/T)</option>
                  <option value="FLAT_RATE">Flat Rate (₱)</option>
                </select>
              </div>

              <!-- Truck Rate (Dynamic Monetary Formatted Field) -->
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1.5">Truck Rate <span class="text-rose-500">*</span></label>
                <app-currency-field
                  [value]="truckRate()"
                  (valueChange)="truckRate.set($event)"
                  placeholder="0.00"
                />
              </div>

              <!-- Weight (Tons) -->
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1.5">Weight (Tons) <span class="text-rose-500">*</span></label>
                <input 
                  type="number" 
                  step="0.01"
                  min="0"
                  name="weight"
                  [ngModel]="weight()"
                  (ngModelChange)="onWeightChange($event)"
                  [required]="rateType() === 'PER_TON'"
                  placeholder="0.00"
                  class="form-input text-xs font-mono font-semibold"
                  [ngClass]="{'border-amber-400 bg-amber-50/30': tonnageError()}"
                />
                <p *ngIf="tonnageError()" class="text-[11px] font-medium text-amber-600 mt-1">{{ tonnageError() }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- ── SECTION 3: FINANCES & GROSS REVENUE ──────────────────────────── -->
        <div class="space-y-3">
          
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <!-- Card 1: Previous Carryover (Static / Read-Only from FleetStore / Driver) -->
            <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between shadow-2xs">
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-slate-700">Previous Carryover</span>
                <span class="badge text-[10px]" [ngClass]="driverCarryover()?.type === 'SHORTAGE' ? 'badge-danger' : (driverCarryover()?.type === 'OVERAGE' ? 'badge-success' : 'badge-neutral')">
                  {{ driverCarryover()?.type === 'SHORTAGE' ? 'Shortage' : (driverCarryover()?.type === 'OVERAGE' ? 'Surplus' : 'None') }}
                </span>
              </div>
              <div class="mt-2">
                <span class="font-mono font-bold text-xl tabular-nums block leading-none"
                      [ngClass]="driverCarryover()?.type === 'SHORTAGE' ? 'text-rose-600' : 'text-slate-900'">
                  {{ driverCarryover()?.type === 'SHORTAGE' ? '-₱' : '₱' }}{{ (driverCarryover()?.amount || 0) | number:'1.2-2' }}
                </span>
                <span class="text-[10px] text-slate-400 font-medium block mt-1">
                  {{ driverCarryover()?.lastTripTloNumber ? 'From TLO #' + driverCarryover()?.lastTripTloNumber : 'No previous balance' }}
                </span>
              </div>
            </div>

            <!-- Card 2: Dispatch Allowance (Dynamic Currency Field) -->
            <div class="p-3.5 rounded-xl border border-blue-200/80 bg-blue-50/20 flex flex-col justify-between shadow-2xs">
              <div class="flex items-center justify-between">
                <label class="text-xs font-semibold text-blue-950">Dispatch Allowance</label>
                <span class="badge badge-brand text-[10px]">Cash Issued</span>
              </div>
              <div class="mt-2">
                <app-currency-field
                  [value]="startingAdvance()"
                  (valueChange)="startingAdvance.set($event)"
                  placeholder="0.00"
                  inputClass="border-blue-200 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-mono font-bold"
                />
              </div>
            </div>
          </div>

          <!-- Computed Gross Freight Revenue Banner (Identical to Post-Dispatch) -->
          <div class="bg-blue-50/70 p-3.5 rounded-xl border border-blue-100 flex items-center justify-between shadow-2xs">
            <div>
              <p class="text-[10px] font-bold text-blue-900 uppercase tracking-wider">Gross Freight Revenue</p>
              <p class="text-xs text-blue-700 font-mono mt-0.5">
                {{ rateType() === 'PER_TON' ? ((weight() || 0) + 'T × ₱' + ((truckRate() || 0) | number:'1.2-2')) : ('Fixed Rate ₱' + ((truckRate() || 0) | number:'1.2-2')) }}
              </p>
            </div>
            <p class="text-lg font-bold text-blue-900 font-mono">₱{{ calculatedFreightCharge() | number:'1.2-2' }}</p>
          </div>

        </div>

      </form>

      <!-- Modal Footer -->
      <div footer class="flex items-center justify-between w-full">
        <!-- Red Cancel Button -->
        <button 
          type="button" 
          (click)="closePreDispatchModal()" 
          class="px-5 py-2.5 text-xs font-semibold text-rose-600 bg-rose-50/50 hover:bg-rose-100/80 border border-rose-300 rounded-xl transition-all shadow-2xs inline-flex items-center gap-1.5 cursor-pointer">
          Cancel
        </button>

        <!-- Dispatch Button -->
        <button
          type="button"
          (click)="onSubmitPreDispatch()"
          [disabled]="!tloNumber.trim() || !dispatchDate || !!tloError() || !!tonnageError() || !selectedPlate() || computedAssignedDriver() === 'Unassigned'"
          class="btn-primary py-2.5 px-6 text-xs gap-2 disabled:opacity-50 transition-all shadow-sm cursor-pointer inline-flex items-center justify-center">
          <span class="material-symbols-outlined text-[18px]">local_shipping</span>
          <span>Dispatch</span>
        </button>
      </div>

    </app-modal>
  `
})
export class DispatchComponent implements OnInit {
  fleetStore = inject(FleetStore);
  dispatchStore = inject(DispatchStore);
  tmsService = inject(TmsService);
  router = inject(Router);

  showPreDispatchModal = signal<boolean>(false);

  // Fleet Assets derived from FleetStore
  fleetAssets = this.fleetStore.trucks;
  availableFleetAssets = computed(() => this.fleetAssets().filter(t => t.status === 'Available'));

  private extractUniqueStrings(items: (string | undefined)[]): string[] {
    const valid = items.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
    return Array.from(new Set<string>(valid));
  }

  // Dynamic Self-Learning Database Options (Derived ONLY from saved Firestore trips)
  clientOptions = computed<string[]>(() => {
    const saved = this.dispatchStore.trips().map(t => t.client);
    return this.extractUniqueStrings(saved);
  });

  originOptions = computed<string[]>(() => {
    const saved = this.dispatchStore.trips().map(t => t.origin || t.originFrom);
    const unique = this.extractUniqueStrings(saved);
    const currentDest = (this.destination() || '').trim().toLowerCase();
    return currentDest ? unique.filter(opt => opt.trim().toLowerCase() !== currentDest) : unique;
  });

  destinationOptions = computed<string[]>(() => {
    const saved = this.dispatchStore.trips().map(t => t.destination || t.destinationTo);
    const unique = this.extractUniqueStrings(saved);
    const currentOrig = (this.origin() || '').trim().toLowerCase();
    return currentOrig ? unique.filter(opt => opt.trim().toLowerCase() !== currentOrig) : unique;
  });

  // Pre-Dispatch Form Fields (All clean and blank by default)
  clientName = '';
  tloNumber = '';
  dispatchDate = '';
  selectedPlate = signal<string>('');
  
  origin = signal<string>('');
  destination = signal<string>('');
  routeTag: RouteTag = 'FRONTLOAD';
  
  // Starting Cash Advance signal
  startingAdvance = signal<number | null>(null);

  // Reactive Signals for Auto-Math Calculation
  rateType = signal<RateType>('PER_TON');
  truckRate = signal<number | null>(null);
  weight = signal<number | null>(null);

  tloError = signal<string>('');
  tonnageError = signal<string>('');

  // Dynamic Read-Only Trip Number Computed from Selected Truck Asset (Same as Post-Dispatch)
  computedNextTripNumber = computed<string>(() => {
    const plate = this.selectedPlate();
    if (!plate) return '—';
    const asset = this.fleetAssets().find(a => a.plateNumber === plate);
    if (!asset) return '—';
    const count = Number(asset.currentTripNumber ?? asset.tripNumber ?? 0) + 1;
    return count.toString();
  });

  // Dynamic Static/Read-Only Assigned Driver (Fetched from Truck Database Record)
  computedAssignedDriver = computed<string>(() => {
    const plate = this.selectedPlate();
    if (!plate) return 'Unassigned';
    const asset = this.fleetAssets().find(a => a.plateNumber === plate);
    const driverName = asset?.assignedCrew?.driver?.name?.trim();
    if (driverName && driverName !== 'None' && driverName !== 'Unassigned') {
      return driverName;
    }
    return 'Unassigned';
  });

  // Dynamic Static/Read-Only Assigned Helper (Fetched from Truck Database Record)
  computedAssignedHelper = computed<string>(() => {
    const plate = this.selectedPlate();
    if (!plate) return 'Unassigned';
    const asset = this.fleetAssets().find(a => a.plateNumber === plate);
    const helperName = asset?.assignedCrew?.helper?.name?.trim();
    if (helperName && helperName !== 'None' && helperName !== 'Unassigned') {
      return helperName;
    }
    return 'Unassigned';
  });

  // Dynamic Driver Carryover fetched from FleetStore by Driver Name (Same as Post-Dispatch)
  driverCarryover = computed<CarryoverBalance | null>(() => {
    const driverName = this.computedAssignedDriver();
    if (!driverName || driverName === 'Unassigned') return null;
    return this.fleetStore.getDriverCOHBalance(driverName);
  });

  // Auto-calculated reactive Gross Freight & Salaries
  calculatedFreightCharge = computed(() => {
    return FinanceCalculator.calculateFreight(
      this.rateType(),
      this.truckRate() || 0,
      this.weight() || 0,
      false, // No reroute fee in pre-dispatch
      0      // No extra fees in pre-dispatch
    );
  });

  ngOnInit() {
    this.resetForm();
  }

  openPreDispatchModal() {
    this.resetForm();
    this.showPreDispatchModal.set(true);
  }

  closePreDispatchModal() {
    this.showPreDispatchModal.set(false);
  }

  onAssetSelect(plate: string) {
    this.selectedPlate.set(plate);
    const asset = this.fleetAssets().find(a => a.plateNumber === plate);
    if (asset?.tonsCapacity && (this.weight() === null || this.weight() === 0)) {
      this.weight.set(asset.tonsCapacity);
    }
    this.validateTonnage();
  }

  onWeightChange(val: any) {
    this.weight.set(val === null || val === '' || isNaN(Number(val)) ? null : Number(val));
    this.validateTonnage();
  }

  validateTLO() {
    const trimmed = (this.tloNumber || '').trim();
    if (!trimmed) {
      this.tloError.set('TLO# is required');
      return;
    }
    if (!/^\d+$/.test(trimmed)) {
      this.tloError.set('TLO# must contain numeric digits only');
      return;
    }
    const exists = this.dispatchStore.dispatches().some(d => d.tloNumber === trimmed);
    if (exists) {
      this.tloError.set(`TLO# ${trimmed} already exists in database!`);
      return;
    }
    this.tloError.set('');
  }

  validateTonnage() {
    const w = this.weight();
    if (w === null || w === undefined || w <= 0) {
      if (this.rateType() === 'PER_TON') {
        this.tonnageError.set('Weight must be greater than 0');
        return;
      }
    }
    this.tonnageError.set('');
  }

  resetForm() {
    this.clientName = '';
    this.tloNumber = '';
    this.dispatchDate = '';
    this.selectedPlate.set('');
    this.origin.set('');
    this.destination.set('');
    this.rateType.set('PER_TON');
    this.truckRate.set(null);
    this.weight.set(null);
    this.routeTag = 'FRONTLOAD';
    this.startingAdvance.set(null);
    this.tloError.set('');
    this.tonnageError.set('');
  }

  async onSubmitPreDispatch() {
    this.validateTLO();
    this.validateTonnage();
    const driverName = this.computedAssignedDriver();
    if (!this.dispatchDate || this.tloError() || this.tonnageError() || !this.selectedPlate() || driverName === 'Unassigned' || !this.tloNumber.trim()) {
      return;
    }

    const freight = this.calculatedFreightCharge();
    const helperName = this.computedAssignedHelper();
    const driverMember = this.fleetStore.getCrewByName(driverName);
    const helperMember = helperName !== 'Unassigned' ? this.fleetStore.getCrewByName(helperName) : null;
    const initialAdvance = Number(this.startingAdvance()) || 0;
    const carryover = this.driverCarryover();

    // If starting allowance is issued, create initial CREDIT cohEntry
    const cohEntries: COHEntry[] = [];
    if (initialAdvance > 0) {
      cohEntries.push({
        id: `coh-${Date.now()}-1`,
        tripId: '',
        category: 'DISPATCH_ADVANCE',
        amount: initialAdvance,
        type: 'CREDIT',
        description: 'Driver Starting Dispatch Allowance',
        timestamp: new Date(this.dispatchDate).toISOString(),
        proofStatus: 'APPROVED'
      });
    }

    const rawTripNum = this.computedNextTripNumber();
    const cleanTripNum = rawTripNum !== '—' 
      ? (Number(rawTripNum.replace(/\D/g, '')) || (this.dispatchStore.dispatches().length + 1)) 
      : (this.dispatchStore.dispatches().length + 1);
    const cleanTlo = Number(this.tloNumber.trim().replace(/\D/g, '')) || 0;

    const newTrip = await this.dispatchStore.addTrip({
      client: this.clientName.trim() || 'General Client',
      tloNumber: cleanTlo,
      tripNumber: cleanTripNum,
      dispatchedDate: this.dispatchDate,
      originFrom: this.origin(),
      destinationTo: this.destination(),
      routeTag: this.routeTag,
      truck: {
        plateNumber: this.selectedPlate(),
        driver: {
          id: driverMember?.id || 'crew-d-1',
          name: driverName
        },
        helper: helperMember ? {
          id: helperMember.id,
          name: helperMember.name
        } : (helperName !== 'Unassigned' ? { id: 'crew-h-1', name: helperName } : null)
      },
      truckRate: this.truckRate() || 0,
      weightTons: this.weight() || 0,
      cost: initialAdvance,
      costItems: [],
      cohEntries: cohEntries,
      previousCarryover: carryover ? {
        amount: carryover.amount,
        type: carryover.type,
        fromTripId: carryover.lastTripId,
        fromTloNumber: carryover.lastTripTloNumber
      } : undefined,
      freightRevenue: freight,
      plateNumber: this.selectedPlate(),
      driverName: driverName,
      helperName: helperName !== 'Unassigned' ? helperName : '',
      origin: this.origin(),
      destination: this.destination(),
      commodity: 'Feeds / Raw Materials',
      rateType: this.rateType(),
      baseRate: this.truckRate() || 0,
      tonnage: this.weight() || 0,
      rerouteFeeApplied: false,
      extraFees: 0,
      totalFreightCharge: freight,
      driverSalary: 0,
      helperSalary: 0,
      dispatchedAt: new Date(this.dispatchDate).toISOString(),
      status: 'DISPATCHED',
      billingStatus: 'READY_TO_BILL',
      podStatus: 'PENDING'
    });

    // Update Truck and Driver live status in FleetStore
    await this.fleetStore.updateTruckStatus(this.selectedPlate(), 'In Transit');
    if (driverMember) {
      await this.fleetStore.updateCrewMember(driverMember.id, { status: 'In Transit' });
    }

    // Sync to legacy TmsService signal if active
    try {
      this.tmsService.dispatches.update(list => [newTrip, ...list]);
    } catch {}

    this.closePreDispatchModal();
    this.router.navigate(['/trips', newTrip.id]);
  }
}
