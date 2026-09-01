import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TmsService } from '../../core/services/tms.service';
import { RateCalculatorService } from '../../core/services/rate-calculator.service';
import { RateType, RouteTag, PendingDriverSubmission } from '../../core/models/tms.models';

@Component({
  selector: 'app-crew-requests',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="w-full space-y-6 animate-fade-in-up max-w-5xl mx-auto pb-12">
      <!-- ── Back to Hub Navigation ────────────────────────────────────────────── -->
      <div>
        <a routerLink="/dispatch" class="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors mb-4">
          <span class="material-symbols-outlined text-[18px]">arrow_back</span>
          <span>Back to Dispatch Hub</span>
        </a>
        <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">Crew Floating Requests</h1>
        <p class="text-sm text-slate-400 mt-0.5 font-medium">Review and approve driver-initiated TLO requests from mobile.</p>
      </div>

      <!-- ── Queue List View ─────────────────────────────────────────────────── -->
      <div *ngIf="!selectedRequest()" class="space-y-4">
        <div *ngIf="pendingSubmissions().length === 0" class="card p-12 flex flex-col items-center justify-center text-center">
          <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <span class="material-symbols-outlined text-[36px] text-slate-300">task_alt</span>
          </div>
          <h3 class="text-base font-bold text-slate-900">No Pending Requests</h3>
          <p class="text-sm text-slate-500 mt-1">All driver submissions have been processed.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div *ngFor="let req of pendingSubmissions()" class="card overflow-hidden hover:shadow-md transition-shadow">
            <div class="flex flex-col sm:flex-row h-full">
              <!-- Thumbnail -->
              <div class="sm:w-32 bg-slate-100 flex-shrink-0 flex items-center justify-center border-r border-slate-100 p-2">
                <img *ngIf="req.tloReceiptUrl" [src]="req.tloReceiptUrl" alt="TLO Slip" class="max-h-24 object-contain rounded drop-shadow-sm" />
                <div *ngIf="!req.tloReceiptUrl" class="text-xs text-slate-400 font-bold text-center">No Image<br/>Provided</div>
              </div>
              
              <!-- Content -->
              <div class="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <div class="flex items-start justify-between">
                    <div>
                      <span class="text-[10px] font-extrabold tracking-wider text-brand-600 uppercase mb-1 block">Pending Request</span>
                      <h3 class="text-base font-bold text-slate-900">TLO #{{ req.tloNumber }}</h3>
                    </div>
                    <span class="text-xs font-mono font-bold bg-amber-50 text-amber-700 px-2 py-1 rounded">
                      Req: ₱{{ req.requestedAdvance || 0 | number:'1.2-2' }}
                    </span>
                  </div>
                  <p class="text-sm text-slate-500 font-medium mt-1">{{ req.driverName }} • {{ req.date | date:'mediumDate' }}</p>
                </div>
                
                <button (click)="selectRequest(req)" class="btn-primary w-full text-xs py-2 mt-auto">
                  Review & Fill Details
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Review & Approval View ──────────────────────────────────────────── -->
      <form *ngIf="selectedRequest()" (ngSubmit)="onSubmitApproval()" #approvalForm="ngForm" class="space-y-6">
        
        <div class="flex items-center justify-between mb-2">
          <button type="button" (click)="selectedRequest.set(null)" class="text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors inline-flex items-center gap-1 cursor-pointer">
            <span class="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Back to Queue</span>
          </button>
          <span class="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">Reviewing TLO #{{ tloNumber }}</span>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <!-- Column 1: Driver Pre-Filled Data & TLO Image -->
          <div class="lg:col-span-1 space-y-6">
            <div class="card p-6 shadow-sm border border-brand-100 bg-brand-50/30">
              <h2 class="text-sm font-extrabold text-slate-900 mb-4 flex items-center gap-2">
                <span class="material-symbols-outlined text-[18px] text-brand-600">person</span>
                <span>Driver Submission</span>
              </h2>
              
              <div class="space-y-4">
                <div>
                  <label class="block text-[10px] font-bold text-slate-500 uppercase">Driver Name</label>
                  <div class="text-sm font-bold text-slate-900 mt-0.5">{{ selectedDriver }}</div>
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-slate-500 uppercase">TLO #</label>
                  <div class="text-sm font-mono font-bold text-slate-900 mt-0.5">{{ tloNumber }}</div>
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-amber-600 uppercase">Requested Advance</label>
                  <div class="text-sm font-mono font-bold text-amber-700 mt-0.5">₱{{ startingCOH | number:'1.2-2' }}</div>
                </div>
                
                <div class="pt-2 border-t border-brand-100">
                  <label class="block text-[10px] font-bold text-slate-500 uppercase mb-2">TLO Receipt Slip</label>
                  <div class="bg-white rounded-xl border border-slate-200 p-2 min-h-[160px] flex items-center justify-center">
                    <img *ngIf="tloReceiptUrl" [src]="tloReceiptUrl" alt="TLO" class="max-w-full h-auto rounded drop-shadow-sm"/>
                    <span *ngIf="!tloReceiptUrl" class="text-xs text-slate-400 font-bold">No Image Attached</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Column 2 & 3: Admin Inputs -->
          <div class="lg:col-span-2 space-y-6">
            
            <div class="card p-6 sm:p-8 shadow-sm">
              <h2 class="text-sm font-extrabold text-slate-900 mb-5 flex items-center gap-2">
                <span class="w-5 h-5 rounded-md bg-brand-100 text-brand-600 flex items-center justify-center text-[10px]">1</span>
                Admin Completion
              </h2>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Heavy Truck Plate Selection -->
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1.5">
                    Assign Truck Plate <span class="text-rose-500">*</span>
                  </label>
                  <select 
                    name="plateNumber"
                    [(ngModel)]="selectedPlate"
                    required
                    class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none bg-white transition-all cursor-pointer">
                    <option value="" disabled>Select Heavy Truck</option>
                    <option *ngFor="let asset of fleet()" [value]="asset.plateNumber">
                      {{ asset.plateNumber }} ({{ asset.tonsCapacity || 30 }}T)
                    </option>
                  </select>
                </div>
                
                <!-- Helper Name -->
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1.5">Helper / Co-Driver</label>
                  <input 
                    type="text" 
                    name="helperName"
                    [(ngModel)]="helperName"
                    placeholder="e.g. Marvin Mendoza"
                    class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 outline-none bg-white"
                  />
                </div>

                <!-- Origin -->
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1.5">Origin (FROM) <span class="text-rose-500">*</span></label>
                  <select 
                    name="selectedOriginPreset"
                    [(ngModel)]="selectedOriginPreset"
                    (change)="onOriginSelect()"
                    class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 outline-none bg-white mb-2">
                    <option *ngFor="let opt of originOptions" [value]="opt">{{ opt }}</option>
                  </select>
                  <input 
                    *ngIf="selectedOriginPreset === 'CUSTOM'"
                    type="text" 
                    name="origin"
                    [(ngModel)]="origin"
                    required
                    placeholder="Enter custom origin..."
                    class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 outline-none bg-white"
                  />
                </div>

                <!-- Destination -->
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1.5">Destination (TO) <span class="text-rose-500">*</span></label>
                  <select 
                    name="selectedDestinationPreset"
                    [(ngModel)]="selectedDestinationPreset"
                    (change)="onDestinationSelect()"
                    required
                    class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 outline-none bg-white mb-2">
                    <option *ngFor="let opt of destinationOptions" [value]="opt">{{ opt }}</option>
                  </select>
                  <input 
                    *ngIf="selectedDestinationPreset === 'CUSTOM'"
                    type="text" 
                    name="destination"
                    [(ngModel)]="destination"
                    required
                    placeholder="Enter custom destination..."
                    class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 outline-none bg-white"
                  />
                </div>

                <!-- Rate Scheme -->
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1.5">Rate Scheme <span class="text-rose-500">*</span></label>
                  <select 
                    name="rateType"
                    [(ngModel)]="rateType"
                    class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 outline-none bg-white">
                    <option value="PER_TON">Per-Ton (₱ / Ton)</option>
                    <option value="FLAT_RATE">Flat Rate (Fixed ₱)</option>
                  </select>
                </div>

                <!-- Base Rate -->
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1.5">Truck Base Rate (₱) <span class="text-rose-500">*</span></label>
                  <div class="relative">
                    <span class="absolute left-3.5 top-2.5 font-bold text-slate-400 text-xs">₱</span>
                    <input 
                      type="number" 
                      step="0.01"
                      name="truckRate"
                      [(ngModel)]="truckRate"
                      (input)="autoCalcSalaries()"
                      required
                      class="w-full pl-7 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-900 outline-none"
                    />
                  </div>
                </div>

                <!-- Scale Weight -->
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1.5">Scale Weight (Tons) <span class="text-rose-500">*</span></label>
                  <div class="relative">
                    <input 
                      type="number" 
                      step="0.01"
                      min="0"
                      name="weight"
                      [(ngModel)]="weight"
                      (input)="validateTonnage(); autoCalcSalaries()"
                      required
                      class="w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono font-bold text-slate-900 outline-none"
                      [ngClass]="{'border-slate-200': !tonnageError(), 'border-amber-500 bg-amber-50/40': tonnageError()}"
                    />
                    <span class="absolute right-3 top-2.5 text-slate-400 font-bold text-xs">Tons</span>
                  </div>
                  <p *ngIf="tonnageError()" class="text-[11px] font-bold text-amber-600 mt-1">{{ tonnageError() }}</p>
                </div>
                
              </div>
            </div>

            <!-- Submit -->
            <div class="flex items-center justify-end">
              <button
                type="submit"
                [disabled]="!approvalForm.valid || !!tonnageError()"
                class="btn-primary py-3 px-8 text-sm gap-2 disabled:opacity-50 transition-all shadow-md w-full sm:w-auto inline-flex items-center justify-center cursor-pointer">
                <span class="material-symbols-outlined text-[18px]">check_circle</span>
                <span>Approve & Register Trip</span>
              </button>
            </div>

          </div>
        </div>
      </form>
    </div>
  `
})
export class CrewRequestsComponent implements OnInit {
  tmsService = inject(TmsService);
  rateCalcService = inject(RateCalculatorService);
  router = inject(Router);

  fleet = this.tmsService.fleet;
  pendingSubmissions = this.tmsService.pendingDriverSubmissions;
  
  selectedRequest = signal<PendingDriverSubmission | null>(null);

  originOptions = [
    'Subic Port',
    'Cargill Pulilan Feeds Mill',
    'Cargill Iloilo Facility',
    'Manila International Container Terminal (MICT)',
    'Batangas Port',
    'CUSTOM'
  ];

  destinationOptions = [
    'Cargill Pulilan Feeds Mill',
    'Subic Port',
    'Cargill Iloilo Facility',
    'Manila International Container Terminal (MICT)',
    'Batangas Port',
    'CUSTOM'
  ];

  selectedOriginPreset = 'Subic Port';
  selectedDestinationPreset = 'Cargill Pulilan Feeds Mill';

  // Form Fields
  tloNumber = '';
  tripNumber: number = 0;
  dispatchDate = '';
  selectedDriver = '';
  startingCOH = 0;
  tloReceiptUrl: string | undefined = undefined;
  
  selectedPlate = '';
  helperName = '';
  origin = 'Subic Port';
  destination = 'Cargill Pulilan Feeds Mill';
  routeTag: RouteTag = 'FRONTLOAD';
  
  rateType: RateType = 'PER_TON';
  truckRate = 1100;
  weight = 32.5;
  extraFees = 0;

  travelExpenses?: number;
  foodExpenses?: number;
  dieselExpenses?: number;

  driverSalary = 0;
  helperSalary = 1500;

  tonnageError = signal<string>('');

  ngOnInit() {
    this.generateNextTripNumber();
  }

  generateNextTripNumber() {
    const existing = this.tmsService.dispatches();
    const nextId = 101 + existing.length;
    this.tripNumber = nextId;
  }

  selectRequest(req: PendingDriverSubmission) {
    this.selectedRequest.set(req);
    this.tloNumber = req.tloNumber;
    this.selectedDriver = req.driverName;
    this.dispatchDate = req.date;
    this.startingCOH = req.requestedAdvance || 0;
    this.tloReceiptUrl = req.tloReceiptUrl;
    
    // Auto-select plate if driver is assigned
    const asset = this.fleet().find(a => a.assignedCrew?.driver?.name === this.selectedDriver);
    if (asset) {
      this.selectedPlate = asset.plateNumber;
    }

    // Preserve expenses if any
    this.travelExpenses = req.travelExpenses;
    this.foodExpenses = req.foodExpenses;
    this.dieselExpenses = req.dieselExpenses;

    this.autoCalcSalaries();
  }

  calculatedFreightCharge = computed(() => {
    return this.rateCalcService.calculateFreightCharge(
      this.rateType,
      this.truckRate || 0,
      this.weight || 0,
      false, // No reroute fee on pre-dispatch
      this.extraFees || 0
    );
  });

  onOriginSelect() {
    this.origin = this.selectedOriginPreset !== 'CUSTOM' ? this.selectedOriginPreset : '';
  }

  onDestinationSelect() {
    this.destination = this.selectedDestinationPreset !== 'CUSTOM' ? this.selectedDestinationPreset : '';

    if (this.destination.includes('Manila') || this.destination.includes('Port')) {
      this.routeTag = 'BACKLOAD';
    } else {
      this.routeTag = 'FRONTLOAD';
    }

    if (this.origin === 'Subic Port' && this.destination === 'Cargill Pulilan Feeds Mill') {
      this.rateType = 'PER_TON';
      this.truckRate = 1100;
    } else if (this.origin.includes('Pulilan') && this.destination.includes('Iloilo')) {
      this.rateType = 'FLAT_RATE';
      this.truckRate = 144000;
    } else if (this.origin.includes('Iloilo') && this.destination.includes('Manila')) {
      this.rateType = 'FLAT_RATE';
      this.truckRate = 95500;
    }

    this.autoCalcSalaries();
  }

  autoCalcSalaries() {
    const gross = this.calculatedFreightCharge();
    this.driverSalary = Math.round(gross * 0.10);
    this.helperSalary = 1500;
  }

  validateTonnage() {
    if (this.weight === null || this.weight === undefined) {
      this.tonnageError.set('Weight is required');
      return;
    }
    if (this.weight < 10.0 || this.weight > 40.0) {
      this.tonnageError.set('Notice: Tonnage is outside usual 10.00 - 40.00T range');
      return;
    }
    this.tonnageError.set('');
  }

  async onSubmitApproval() {
    this.validateTonnage();
    if (this.tonnageError()) return;

    await this.tmsService.addDispatch({
      tloNumber: this.tloNumber,
      tripNumber: this.tripNumber,
      plateNumber: this.selectedPlate,
      driverName: this.selectedDriver,
      helperName: this.helperName,
      origin: this.origin,
      destination: this.destination,
      routeTag: this.routeTag,
      rateType: this.rateType,
      baseRate: this.truckRate,
      tonnage: this.weight,
      rerouteFeeApplied: false,
      extraFees: this.extraFees,
      totalFreightCharge: this.calculatedFreightCharge(),
      driverSalary: this.driverSalary,
      helperSalary: this.helperSalary,
      dispatchedAt: new Date(this.dispatchDate).toISOString(),
      // Carry over any pre-logged expenses
      travelExpenses: this.travelExpenses,
      foodExpenses: this.foodExpenses,
      dieselExpenses: this.dieselExpenses
    });

    const req = this.selectedRequest();
    if (req) {
      this.tmsService.removePendingSubmission(req.id);
    }

    this.router.navigate(['/trips']);
  }
}
