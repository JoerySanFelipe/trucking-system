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
        <a routerLink="/dispatch" class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-2">
          <span class="material-symbols-outlined text-[16px]">arrow_back</span>
          <span>Back to Dispatch Hub</span>
        </a>
        <h1 class="text-2xl font-semibold text-slate-900 tracking-tight">Crew Floating Requests</h1>
        <p class="text-sm text-slate-500 mt-0.5 font-medium">Review and approve driver-initiated TLO requests from mobile.</p>
      </div>

      <!-- ── Queue List View ─────────────────────────────────────────────────── -->
      <div *ngIf="!selectedRequest()" class="space-y-4">
        <!-- Empty State -->
        <div *ngIf="pendingSubmissions().length === 0" class="card p-12 flex flex-col items-center justify-center text-center">
          <div class="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 border border-slate-100">
            <span class="material-symbols-outlined text-[36px] text-slate-300">task_alt</span>
          </div>
          <h3 class="text-base font-semibold text-slate-900">No Pending Requests</h3>
          <p class="text-xs text-slate-500 mt-1 max-w-xs">All driver mobile submissions have been processed and dispatched.</p>
        </div>

        <!-- Cards Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div *ngFor="let req of pendingSubmissions()" class="card card-interactive overflow-hidden flex flex-col justify-between">
            <div class="flex flex-col sm:flex-row h-full">
              <!-- Thumbnail -->
              <div class="sm:w-32 bg-slate-50 flex-shrink-0 flex items-center justify-center border-b sm:border-b-0 sm:border-r border-slate-100 p-3">
                <img *ngIf="req.tloReceiptUrl" [src]="req.tloReceiptUrl" alt="TLO Slip" class="max-h-24 object-contain rounded drop-shadow-xs" />
                <div *ngIf="!req.tloReceiptUrl" class="text-[11px] text-slate-400 font-medium text-center">
                  <span class="material-symbols-outlined text-[24px] text-slate-300 block mb-0.5">image_not_supported</span>
                  <span>No Slip</span>
                </div>
              </div>
              
              <!-- Content -->
              <div class="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <div class="flex items-start justify-between gap-2">
                    <div>
                      <span class="badge badge-warning text-[10px] font-semibold uppercase mb-1.5">Pending Request</span>
                      <h3 class="text-base font-bold text-slate-900 font-mono">TLO #{{ req.tloNumber }}</h3>
                    </div>
                    <span class="badge badge-brand text-xs font-mono font-bold">
                      Req: ₱{{ (req.requestedAdvance || 0) | number:'1.2-2' }}
                    </span>
                  </div>
                  <p class="text-xs text-slate-500 font-medium mt-1.5 flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-[15px] text-slate-400">person</span>
                    <span>{{ req.driverName }}</span>
                    <span class="text-slate-300">•</span>
                    <span>{{ req.date | date:'mediumDate' }}</span>
                  </p>
                </div>
                
                <button 
                  type="button"
                  (click)="selectRequest(req)" 
                  class="btn-primary btn-sm w-full gap-1.5 cursor-pointer inline-flex items-center justify-center">
                  <span class="material-symbols-outlined text-[16px]">edit_document</span>
                  <span>Review &amp; Fill Details</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Review & Approval View ──────────────────────────────────────────── -->
      <form *ngIf="selectedRequest()" (ngSubmit)="onSubmitApproval()" #approvalForm="ngForm" class="space-y-6">
        
        <div class="flex items-center justify-between">
          <button 
            type="button" 
            (click)="selectedRequest.set(null)" 
            class="btn-secondary btn-xs gap-1 cursor-pointer inline-flex items-center">
            <span class="material-symbols-outlined text-[14px]">arrow_back</span>
            <span>Back to Queue</span>
          </button>
          <span class="badge badge-warning text-xs font-semibold py-1 px-3">
            Reviewing TLO #{{ tloNumber }}
          </span>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          <!-- Column 1: Driver Pre-Filled Data & TLO Image -->
          <div class="lg:col-span-1 space-y-4">
            <div class="card p-5 space-y-4 border border-blue-200/60 bg-blue-50/20">
              <div class="flex items-center gap-2 pb-2.5 border-b border-blue-100">
                <span class="material-symbols-outlined text-[18px] text-brand-600">person</span>
                <h2 class="text-xs font-bold text-slate-900 uppercase tracking-wider">Driver Submission</h2>
              </div>
              
              <div class="space-y-3.5 text-xs">
                <div>
                  <span class="form-hint uppercase text-[10px] font-bold block mb-0.5">Driver Name</span>
                  <div class="font-semibold text-slate-900 text-sm">{{ selectedDriver }}</div>
                </div>
                <div>
                  <span class="form-hint uppercase text-[10px] font-bold block mb-0.5">TLO #</span>
                  <div class="font-mono font-bold text-slate-900 text-sm">{{ tloNumber }}</div>
                </div>
                <div>
                  <span class="form-hint uppercase text-[10px] font-bold block mb-0.5 text-amber-700">Requested Advance</span>
                  <div class="font-mono font-bold text-amber-800 text-base">₱{{ startingCOH | number:'1.2-2' }}</div>
                </div>
                
                <div class="pt-2 border-t border-blue-100">
                  <span class="form-hint uppercase text-[10px] font-bold block mb-2">TLO Receipt Slip</span>
                  <div class="bg-white rounded-xl border border-slate-200 p-2 min-h-[160px] flex items-center justify-center">
                    <img *ngIf="tloReceiptUrl" [src]="tloReceiptUrl" alt="TLO" class="max-w-full h-auto rounded drop-shadow-xs"/>
                    <span *ngIf="!tloReceiptUrl" class="text-xs text-slate-400 font-medium">No Image Attached</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Column 2 & 3: Admin Inputs -->
          <div class="lg:col-span-2 space-y-6">
            
            <div class="card p-6 space-y-5">
              <div class="pb-2.5 border-b border-slate-100 flex items-center justify-between">
                <span class="badge badge-brand text-xs font-semibold gap-1.5 py-1 px-2.5">
                  <span class="w-4 h-4 rounded-full bg-brand-600 text-white flex items-center justify-center text-[10px] font-bold font-mono">1</span>
                  <span>Admin Completion</span>
                </span>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Heavy Truck Plate Selection -->
                <div>
                  <label class="form-label">
                    Assign Truck Plate <span class="text-rose-500">*</span>
                  </label>
                  <select 
                    name="plateNumber"
                    [(ngModel)]="selectedPlate"
                    required
                    class="form-input text-xs font-semibold cursor-pointer">
                    <option value="" disabled>Select Heavy Truck</option>
                    <option *ngFor="let asset of fleet()" [value]="asset.plateNumber">
                      {{ asset.plateNumber }} ({{ asset.tonsCapacity || 30 }}T)
                    </option>
                  </select>
                </div>
                
                <!-- Helper Name -->
                <div>
                  <label class="form-label">Helper / Co-Driver</label>
                  <input 
                    type="text" 
                    name="helperName"
                    [(ngModel)]="helperName"
                    placeholder="e.g. Marvin Mendoza"
                    class="form-input text-xs font-semibold"
                  />
                </div>

                <!-- Origin -->
                <div>
                  <label class="form-label">Origin (FROM) <span class="text-rose-500">*</span></label>
                  <select 
                    name="selectedOriginPreset"
                    [(ngModel)]="selectedOriginPreset"
                    (change)="onOriginSelect()"
                    class="form-input text-xs font-semibold cursor-pointer mb-2">
                    <option *ngFor="let opt of originOptions" [value]="opt">{{ opt }}</option>
                  </select>
                  <input 
                    *ngIf="selectedOriginPreset === 'CUSTOM'"
                    type="text" 
                    name="origin"
                    [(ngModel)]="origin"
                    required
                    placeholder="Enter custom origin..."
                    class="form-input text-xs font-semibold"
                  />
                </div>

                <!-- Destination -->
                <div>
                  <label class="form-label">Destination (TO) <span class="text-rose-500">*</span></label>
                  <select 
                    name="selectedDestinationPreset"
                    [(ngModel)]="selectedDestinationPreset"
                    (change)="onDestinationSelect()"
                    required
                    class="form-input text-xs font-semibold cursor-pointer mb-2">
                    <option *ngFor="let opt of destinationOptions" [value]="opt">{{ opt }}</option>
                  </select>
                  <input 
                    *ngIf="selectedDestinationPreset === 'CUSTOM'"
                    type="text" 
                    name="destination"
                    [(ngModel)]="destination"
                    required
                    placeholder="Enter custom destination..."
                    class="form-input text-xs font-semibold"
                  />
                </div>

                <!-- Rate Scheme -->
                <div>
                  <label class="form-label">Rate Scheme <span class="text-rose-500">*</span></label>
                  <select 
                    name="rateType"
                    [(ngModel)]="rateType"
                    class="form-input text-xs font-semibold cursor-pointer">
                    <option value="PER_TON">Per-Ton (₱ / Ton)</option>
                    <option value="FLAT_RATE">Flat Rate (Fixed ₱)</option>
                  </select>
                </div>

                <!-- Base Rate -->
                <div>
                  <label class="form-label">Truck Base Rate (₱) <span class="text-rose-500">*</span></label>
                  <div class="relative">
                    <span class="absolute left-3.5 top-2.5 font-bold text-slate-400 text-xs">₱</span>
                    <input 
                      type="number" 
                      step="0.01"
                      name="truckRate"
                      [(ngModel)]="truckRate"
                      (input)="autoCalcSalaries()"
                      required
                      class="form-input text-xs font-mono font-semibold pl-7"
                    />
                  </div>
                </div>

                <!-- Scale Weight -->
                <div class="md:col-span-2">
                  <label class="form-label">Scale Weight (Tons) <span class="text-rose-500">*</span></label>
                  <div class="relative">
                    <input 
                      type="number" 
                      step="0.01"
                      min="0"
                      name="weight"
                      [(ngModel)]="weight"
                      (input)="validateTonnage(); autoCalcSalaries()"
                      required
                      class="form-input text-xs font-mono font-semibold pr-12"
                      [class.is-error]="!!tonnageError()"
                    />
                    <span class="absolute right-3.5 top-2.5 text-slate-400 font-semibold text-xs">Tons</span>
                  </div>
                  <p *ngIf="tonnageError()" class="form-error-msg">
                    <span class="material-symbols-outlined text-[13px]">warning</span>
                    <span>{{ tonnageError() }}</span>
                  </p>
                </div>
                
              </div>
            </div>

            <!-- Submit -->
            <div class="flex items-center justify-end">
              <button
                type="submit"
                [disabled]="!approvalForm.valid || !!tonnageError()"
                class="btn-primary btn-md gap-2 w-full sm:w-auto cursor-pointer inline-flex items-center justify-center">
                <span class="material-symbols-outlined text-[18px]">check_circle</span>
                <span>Approve &amp; Register Trip</span>
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
