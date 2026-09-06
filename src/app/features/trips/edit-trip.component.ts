import { Component, inject, signal, computed, OnInit, effect } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { DispatchStore } from '../../core/application/stores/dispatch.store';
import { FleetStore } from '../../core/application/stores/fleet.store';
import { RateType, RouteTag, TripCostItem, CostCategory, COHEntry, Trip } from '../../core/models/tms.models';
import { FinanceCalculator } from '../../core/domain/rules/finance-calculator';
import { ComboboxComponent } from '../../shared/ui-kit/combobox/combobox.component';
import { CurrencyFieldComponent } from '../../shared/ui-kit/currency-field/currency-field.component';
import { TransactionsTableComponent, CarryoverBalance } from '../../shared/ui-kit/transactions-table/transactions-table.component';
import { formatAppDate, appDateToIso } from '../../core/utils/date-formatter';

@Component({
  selector: 'app-edit-trip',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    RouterModule, 
    ComboboxComponent, 
    CurrencyFieldComponent, 
    TransactionsTableComponent
  ],
  template: `
    <div class="w-full space-y-6 animate-fade-in max-w-6xl mx-auto pb-16">
      
      <!-- ── Top Navigation & Page Header ────────────────────────────────────── -->
      <div>
        <button 
          type="button"
          (click)="goBack()" 
          class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-2 cursor-pointer">
          <span class="material-symbols-outlined text-[16px]">arrow_back</span>
          <span>Back</span>
        </button>
        <div class="flex items-center gap-3 flex-wrap">
          <h1 class="text-2xl font-semibold text-slate-900 tracking-tight">Edit Trip</h1>
          <span *ngIf="tloNumber" class="badge badge-brand text-xs font-mono font-bold py-1 px-3">
            TLO# {{ tloNumber }}
          </span>
        </div>
      </div>

      <form (ngSubmit)="onSubmitUpdateTrip()" #dispatchForm="ngForm" class="space-y-6">
        
        <!-- ── STEP 1: TRIP IDENTIFICATION ──────────────────────────────────── -->
        <div class="card p-6 shadow-2xs space-y-5">
          <div class="pb-2.5 border-b border-slate-100 flex items-center justify-between">
            <span class="badge badge-brand text-xs font-semibold gap-1.5 py-1 px-2.5">
              <span class="w-4 h-4 rounded-full bg-brand-600 text-white flex items-center justify-center text-[10px] font-bold font-mono">1</span>
              <span>Trip Identification</span>
            </span>
          </div>

          <div class="space-y-4">
            <!-- Row 1: Client & TLO # -->
            <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
              <!-- Searchable Client Combobox (6 Cols) -->
              <div class="md:col-span-6">
                <app-combobox
                  label="Client"
                  [required]="true"
                  placeholder="Type or select client name..."
                  [options]="clientOptions()"
                  [(value)]="clientName"
                />
              </div>

              <!-- TLO # (6 Cols) -->
              <div class="md:col-span-6">
                <label class="form-label">
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
                  [class.is-error]="!!tloError()"
                />
                <p *ngIf="tloError()" class="form-error-msg">
                  <span class="material-symbols-outlined text-[13px]">error</span>
                  <span>{{ tloError() }}</span>
                </p>
              </div>
            </div>

            <!-- Row 2: Commodity, Number of Bags, Trip Number -->
            <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
              <!-- Searchable Commodity Combobox (4 Cols) -->
              <div class="md:col-span-4">
                <app-combobox
                  label="Commodity"
                  placeholder="Type or select commodity..."
                  [options]="commodityOptions()"
                  [(value)]="commodity"
                />
              </div>

              <!-- Number of Bags (2 Cols) -->
              <div class="md:col-span-2">
                <label class="form-label">Number of Bags</label>
                <input 
                  type="number" 
                  name="bagCount"
                  [(ngModel)]="bagCount"
                  placeholder="0"
                  class="form-input text-xs font-mono font-semibold"
                />
              </div>

              <!-- Read-Only Trip Number (6 Cols) -->
              <div class="md:col-span-6">
                <label class="form-label">
                  Trip Number
                </label>
                <input 
                  type="text" 
                  [value]="tripNumber || computedNextTripNumber()" 
                  readonly 
                  tabindex="-1"
                  placeholder="—"
                  class="form-input text-xs font-mono font-bold bg-slate-50 text-slate-700 cursor-not-allowed select-none"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- ── STEP 2: ASSIGNMENT ────────────────────────────────────────────── -->
        <div class="card p-6 shadow-2xs space-y-5">
          <div class="pb-2.5 border-b border-slate-100 flex items-center justify-between">
            <span class="badge badge-brand text-xs font-semibold gap-1.5 py-1 px-2.5">
              <span class="w-4 h-4 rounded-full bg-brand-600 text-white flex items-center justify-center text-[10px] font-bold font-mono">2</span>
              <span>Assignment</span>
            </span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
            <!-- 1. Truck -->
            <div>
              <label class="form-label">
                Truck <span class="text-rose-500">*</span>
              </label>
              <select 
                name="plateNumber"
                [ngModel]="selectedPlate()"
                (ngModelChange)="onAssetSelect($event)"
                required
                class="form-input text-xs font-semibold cursor-pointer">
                <option value="" disabled selected>Select Truck</option>
                <option *ngFor="let asset of availableFleetAssets()" [value]="asset.plateNumber">
                  {{ asset.plateNumber }} ({{ asset.tonsCapacity || 30 }}T) {{ asset.truckType ? '• ' + asset.truckType : '' }}
                </option>
              </select>
            </div>

            <!-- 2. Driver -->
            <div>
              <label class="form-label">
                Driver <span class="text-rose-500">*</span>
              </label>
              <input 
                type="text" 
                [value]="computedAssignedDriver()" 
                readonly 
                tabindex="-1"
                placeholder="Unassigned"
                class="form-input text-xs font-semibold bg-slate-50 cursor-not-allowed select-none transition-all"
                [ngClass]="computedAssignedDriver() === 'Unassigned' ? 'text-slate-400 font-normal' : 'text-slate-800 font-bold'"
              />
            </div>

            <!-- 3. Helper -->
            <div>
              <label class="form-label">
                Helper
              </label>
              <input 
                type="text" 
                [value]="computedAssignedHelper()" 
                readonly 
                tabindex="-1"
                placeholder="Unassigned"
                class="form-input text-xs font-semibold bg-slate-50 cursor-not-allowed select-none transition-all"
                [ngClass]="computedAssignedHelper() === 'Unassigned' ? 'text-slate-400 font-normal' : 'text-slate-800 font-bold'"
              />
            </div>

            <!-- 4. Route Tag -->
            <div>
              <label class="form-label">Route Tag</label>
              <select name="routeTag" [(ngModel)]="routeTag" class="form-input text-xs font-semibold cursor-pointer">
                <option value="FRONTLOAD">🔵 Frontload</option>
                <option value="BACKLOAD">🟣 Backload</option>
              </select>
            </div>
          </div>
        </div>

        <!-- ── STEP 3: ROUTE & TIMELINE ─────────────────────────────────────── -->
        <div class="card p-6 shadow-2xs space-y-5">
          <div class="pb-2.5 border-b border-slate-100 flex items-center justify-between">
            <span class="badge badge-brand text-xs font-semibold gap-1.5 py-1 px-2.5">
              <span class="w-4 h-4 rounded-full bg-brand-600 text-white flex items-center justify-center text-[10px] font-bold font-mono">3</span>
              <span>Route &amp; Timeline</span>
            </span>
          </div>

          <div class="space-y-4">
            <!-- Row 1: Origin & Destination -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Searchable Origin Combobox -->
              <app-combobox
                label="Origin"
                [required]="true"
                placeholder="Type or select origin..."
                [options]="originOptions()"
                [(value)]="origin"
              />

              <!-- Searchable Destination Combobox -->
              <app-combobox
                label="Destination"
                [required]="true"
                placeholder="Type or select destination..."
                [options]="destinationOptions()"
                [(value)]="destination"
              />
            </div>

            <!-- Row 2: Dispatch Date & Shipment Date -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Dispatch Date -->
              <div>
                <label class="form-label">
                  Dispatch Date <span class="text-rose-500">*</span>
                </label>
                <input 
                  type="date" 
                  name="dispatchDate"
                  [ngModel]="dispatchDate"
                  (ngModelChange)="onDispatchDateChange($event)"
                  required
                  class="form-input text-xs font-semibold"
                />
              </div>

              <!-- Shipment Date -->
              <div>
                <label class="form-label">
                  Shipment Date <span class="text-rose-500">*</span>
                </label>
                <input 
                  type="date" 
                  name="deliveredDate"
                  [ngModel]="deliveredDate"
                  (ngModelChange)="onDeliveredDateChange($event)"
                  [min]="dispatchDate"
                  required
                  class="form-input text-xs font-semibold"
                  [class.is-error]="!!dateError()"
                />
                <p *ngIf="dateError()" class="form-error-msg">
                  <span class="material-symbols-outlined text-[13px]">error</span>
                  <span>{{ dateError() }}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- ── STEP 4: FREIGHT REVENUE ───────────────────────────────────────── -->
        <div class="card p-6 shadow-2xs space-y-5">
          <div class="pb-2.5 border-b border-slate-100 flex items-center justify-between">
            <span class="badge badge-brand text-xs font-semibold gap-1.5 py-1 px-2.5">
              <span class="w-4 h-4 rounded-full bg-brand-600 text-white flex items-center justify-center text-[10px] font-bold font-mono">4</span>
              <span>Freight Revenue</span>
            </span>
          </div>

          <div class="space-y-4">
            <!-- Row 1: Rate Structure & Weight -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <!-- Rate Scheme -->
              <div>
                <label class="form-label">Rate Scheme <span class="text-rose-500">*</span></label>
                <select 
                  name="rateType" 
                  [ngModel]="rateType()" 
                  (ngModelChange)="rateType.set($event)"
                  class="form-input text-xs font-semibold cursor-pointer py-2 pl-2.5 pr-7">
                  <option value="PER_TON">Per-Ton (₱/T)</option>
                  <option value="FLAT_RATE">Flat Rate (₱)</option>
                </select>
              </div>

              <!-- Truck Rate -->
              <div>
                <label class="form-label">Truck Rate <span class="text-rose-500">*</span></label>
                <app-currency-field
                  [value]="truckRate()"
                  (valueChange)="truckRate.set($event)"
                  placeholder="0.00"
                />
              </div>

              <!-- Weight (Tons) -->
              <div>
                <label class="form-label">Weight (Tons) <span class="text-rose-500">*</span></label>
                <input 
                  type="number" 
                  step="0.01"
                  min="0"
                  name="weight"
                  [ngModel]="weight()"
                  (ngModelChange)="onWeightChange($event)"
                  required
                  placeholder="0.00"
                  class="form-input text-xs font-mono font-semibold"
                  [class.is-error]="!!tonnageError()"
                />
                <p *ngIf="tonnageError()" class="form-error-msg">
                  <span class="material-symbols-outlined text-[13px]">error</span>
                  <span>{{ tonnageError() }}</span>
                </p>
              </div>
            </div>

            <!-- Row 2: Re-route Fee & Extra / Demurrage Fees -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Re-route Fee -->
              <div class="card p-4 bg-slate-50/50 border border-slate-200 flex flex-col justify-between">
                <div class="flex items-center justify-between mb-1.5">
                  <label class="form-label !mb-0">Re-route Fee</label>
                  <span class="form-hint">Standard ₱3,600</span>
                </div>
                <app-currency-field
                  [value]="rerouteFee()"
                  (valueChange)="rerouteFee.set($event)"
                  placeholder="0.00"
                />
              </div>

              <!-- Extra / Demurrage Fees -->
              <div class="card p-4 bg-slate-50/50 border border-slate-200 flex flex-col justify-between">
                <div class="flex items-center justify-between mb-1.5">
                  <label class="form-label !mb-0">Extra / Demurrage Fees</label>
                  <span class="form-hint">Claims &amp; Demurrage</span>
                </div>
                <app-currency-field
                  [value]="extraFees()"
                  (valueChange)="extraFees.set($event || 0)"
                  placeholder="0.00"
                />
              </div>
            </div>

            <!-- Row 3: Computed Gross Freight Revenue Banner -->
            <div class="card p-4 bg-blue-50/70 border border-blue-100 flex items-center justify-between">
              <div>
                <p class="text-[10px] font-bold text-blue-900 uppercase tracking-wider">Gross Freight Revenue</p>
                <p class="text-xs text-blue-700 font-mono mt-0.5">
                  {{ rateType() === 'PER_TON' ? ((weight() || 0) + 'T × ₱' + ((truckRate() || 0) | number:'1.2-2')) : ('Fixed Rate ₱' + ((truckRate() || 0) | number:'1.2-2')) }}
                  {{ (rerouteFee() && rerouteFee()! > 0) ? (' + ₱' + (rerouteFee() | number:'1.2-2') + ' (Re-route)') : '' }}
                  {{ (extraFees() && extraFees() > 0) ? (' + ₱' + (extraFees() | number:'1.2-2') + ' (Extra)') : '' }}
                </p>
              </div>
              <p class="text-lg font-bold text-blue-950 font-mono tabular-nums">₱{{ calculatedFreightCharge() | number:'1.2-2' }}</p>
            </div>
          </div>
        </div>

        <!-- ── STEP 5: FINANCES ─────────────────────────────────────────────── -->
        <div class="card p-6 shadow-2xs space-y-6 border-t-4 border-t-blue-600">
          <div class="pb-2.5 border-b border-slate-100 flex items-center justify-between">
            <span class="badge badge-brand text-xs font-semibold gap-1.5 py-1 px-2.5">
              <span class="w-4 h-4 rounded-full bg-brand-600 text-white flex items-center justify-center text-[10px] font-bold font-mono">5</span>
              <span>Finances</span>
            </span>
          </div>

          <!-- 1st Row: 3 Top Cash Cards (Carryover, Dispatch Allowance, Total Cash on Hand) -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            <!-- Card 1: Previous Carryover -->
            <div class="card p-4 bg-slate-50/70 border border-slate-200 flex flex-col justify-between">
              <div class="flex items-center justify-between">
                <span class="form-label !mb-0">Previous Carryover</span>
                <span class="badge text-[10px]" [ngClass]="driverCarryover()?.type === 'SHORTAGE' ? 'badge-danger' : (driverCarryover()?.type === 'OVERAGE' ? 'badge-success' : 'badge-neutral')">
                  {{ driverCarryover()?.type === 'SHORTAGE' ? 'Shortage' : (driverCarryover()?.type === 'OVERAGE' ? 'Surplus' : 'None') }}
                </span>
              </div>
              <div class="mt-2.5">
                <span class="font-mono font-bold text-xl tabular-nums block leading-none"
                      [ngClass]="driverCarryover()?.type === 'SHORTAGE' ? 'text-rose-600' : 'text-slate-900'">
                  {{ driverCarryover()?.type === 'SHORTAGE' ? '-₱' : '₱' }}{{ (driverCarryover()?.amount || 0) | number:'1.2-2' }}
                </span>
                <span class="form-hint mt-1 block">
                  {{ driverCarryover()?.lastTripTloNumber ? 'From TLO #' + driverCarryover()?.lastTripTloNumber : 'No previous balance' }}
                </span>
              </div>
            </div>

            <!-- Card 2: Dispatch Allowance -->
            <div class="card p-4 bg-blue-50/30 border border-blue-200/80 flex flex-col justify-between">
              <div class="flex items-center justify-between">
                <label class="form-label !mb-0 text-blue-950">
                  Dispatch Allowance <span class="text-rose-500">*</span>
                </label>
                <span class="badge badge-brand text-[10px]">Cash Issued</span>
              </div>
              <div class="mt-2.5">
                <app-currency-field
                  [value]="startingCOH()"
                  (valueChange)="startingCOH.set($event)"
                  placeholder="0.00"
                  inputClass="border-blue-200 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-mono font-bold"
                />
              </div>
            </div>

            <!-- Card 3: Total Cash on Hand -->
            <div class="card p-4 bg-emerald-50/30 border border-emerald-200/80 flex flex-col justify-between">
              <div class="flex items-center justify-between">
                <span class="form-label !mb-0 text-emerald-950">Total Cash on Hand</span>
                <span class="badge badge-success text-[10px]">Starting Pool</span>
              </div>
              <div class="mt-2.5">
                <span class="font-mono font-bold text-xl tabular-nums text-emerald-700 block leading-none">
                  ₱{{ totalStartingCOH() | number:'1.2-2' }}
                </span>
                <span class="form-hint mt-1 block">
                  Carryover + Dispatch Allowance
                </span>
              </div>
            </div>

          </div>

          <!-- 2nd Section: Transactions Table -->
          <div class="space-y-3 pt-1">
            <app-transactions-table
              [(entries)]="cohEntries"
              [startingBalance]="startingCOH() || 0"
              [carryover]="driverCarryover()"
              [defaultDate]="deliveredDate || dispatchDate"
            />
          </div>

          <!-- 3rd Section: Crew Salary Breakdown (2 Cards: Driver & Helper) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <!-- Driver Salary -->
            <div class="card p-4 bg-blue-50/30 border border-blue-200/80 flex flex-col justify-between">
              <div class="flex items-center justify-between">
                <label class="form-label !mb-0 text-blue-950">Driver Salary</label>
                <span class="badge badge-brand text-[10px]">Payroll</span>
              </div>
              <div class="mt-2.5">
                <app-currency-field
                  [value]="driverSalary()"
                  (valueChange)="driverSalary.set($event)"
                  placeholder="0.00"
                  inputClass="border-blue-200 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-mono font-bold"
                />
              </div>
            </div>

            <!-- Helper Salary -->
            <div class="card p-4 bg-emerald-50/30 border border-emerald-200/80 flex flex-col justify-between">
              <div class="flex items-center justify-between">
                <label class="form-label !mb-0 text-emerald-950">Helper Salary</label>
                <span class="badge badge-success text-[10px]">Payroll</span>
              </div>
              <div class="mt-2.5">
                <app-currency-field
                  [value]="helperSalary()"
                  (valueChange)="helperSalary.set($event)"
                  placeholder="0.00"
                  inputClass="border-emerald-200 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs font-mono font-bold"
                />
              </div>
            </div>
          </div>

          <!-- 4th Section: 3-Box Financial Liquidation & Profitability Summary -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            
            <!-- Box 1: Cash Liquidation -->
            <div class="card p-5 border-blue-200 bg-blue-50/20 space-y-3">
              <div class="flex items-center justify-between">
                <h4 class="text-xs font-bold text-blue-950 uppercase tracking-wider">Cash Liquidation</h4>
                <span class="badge badge-brand text-[10px]">
                  {{ cashAccountability().status }}
                </span>
              </div>
              <div class="space-y-2 text-xs">
                <div class="flex justify-between text-slate-600">
                  <span>Cash Issued:</span>
                  <span class="font-mono font-semibold tabular-nums text-slate-800">₱{{ (startingCOH() || 0) | number:'1.2-2' }}</span>
                </div>
                <div class="flex justify-between text-slate-600">
                  <span>Expenses Spent:</span>
                  <span class="font-mono font-semibold tabular-nums text-rose-600">− ₱{{ totalExpenses() | number:'1.2-2' }}</span>
                </div>
                <div class="pt-2 border-t border-blue-200 flex justify-between font-bold">
                  <span class="text-blue-950">Ending Cash Balance:</span>
                  <span class="font-mono tabular-nums" [ngClass]="cashAccountability().endingCashBalance >= 0 ? 'text-blue-800' : 'text-rose-700'">
                    ₱{{ cashAccountability().endingCashBalance | number:'1.2-2' }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Box 2: Crew Salary Summary -->
            <div class="card p-5 border-amber-200 bg-amber-50/20 space-y-3">
              <div class="flex items-center justify-between">
                <h4 class="text-xs font-bold text-amber-950 uppercase tracking-wider">Crew Salary</h4>
                <span class="badge badge-warning text-[10px]">PAYROLL</span>
              </div>
              <div class="space-y-2 text-xs">
                <div class="flex justify-between text-slate-600">
                  <span>Driver Salary:</span>
                  <span class="font-mono font-semibold tabular-nums text-slate-800">₱{{ (driverSalary() || 0) | number:'1.2-2' }}</span>
                </div>
                <div class="flex justify-between text-slate-600">
                  <span>Helper Salary:</span>
                  <span class="font-mono font-semibold tabular-nums text-slate-800">₱{{ (helperSalary() || 0) | number:'1.2-2' }}</span>
                </div>
                <div class="pt-2 border-t border-amber-200 flex justify-between font-bold">
                  <span class="text-amber-950">Total Crew Payroll:</span>
                  <span class="font-mono tabular-nums text-amber-950">₱{{ ((driverSalary() || 0) + (helperSalary() || 0)) | number:'1.2-2' }}</span>
                </div>
              </div>
            </div>

            <!-- Box 3: Company Profit -->
            <div class="card p-5 border-emerald-200 bg-emerald-50/20 space-y-3">
              <div class="flex items-center justify-between">
                <h4 class="text-xs font-bold text-emerald-950 uppercase tracking-wider">Company Profit</h4>
                <span class="badge badge-success text-[10px]">PROFIT</span>
              </div>
              <div class="space-y-2 text-xs">
                <div class="flex justify-between text-slate-600">
                  <span>Gross Revenue:</span>
                  <span class="font-mono font-semibold tabular-nums text-slate-800">₱{{ calculatedFreightCharge() | number:'1.2-2' }}</span>
                </div>
                <div class="flex justify-between text-slate-600">
                  <span>Trip Costs &amp; Payroll:</span>
                  <span class="font-mono font-semibold tabular-nums text-rose-600">− ₱{{ (totalExpenses() + (driverSalary() || 0) + (helperSalary() || 0)) | number:'1.2-2' }}</span>
                </div>
                <div class="pt-2 border-t border-emerald-200 flex justify-between font-bold">
                  <span class="text-emerald-950">Net Company Income:</span>
                  <span class="font-mono tabular-nums text-emerald-800 text-sm">
                    ₱{{ tripPnl().netCompanyIncome | number:'1.2-2' }}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- ── BOTTOM SUBMIT BUTTON & CONTROLS ─────────────────────────────────── -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <!-- Cancel Button -->
          <button 
            type="button"
            (click)="goBack()" 
            class="btn-secondary btn-md cursor-pointer">
            Cancel
          </button>

          <!-- Save Button -->
          <button
            type="submit"
            [disabled]="!dispatchForm.valid || !!tloError() || !!tonnageError() || isSaving()"
            class="btn-primary btn-md gap-2 w-full sm:w-auto cursor-pointer inline-flex items-center justify-center">
            <span class="material-symbols-outlined text-[18px]">verified</span>
            <span>{{ isSaving() ? 'Saving Changes...' : 'Update Trip' }}</span>
          </button>
        </div>
      </form>
    </div>
  `
})
export class EditTripComponent implements OnInit {
  route = inject(ActivatedRoute);
  router = inject(Router);
  location = inject(Location);
  dispatchStore = inject(DispatchStore);
  fleetStore = inject(FleetStore);

  tripId = signal<string>('');
  originalTrip = signal<Trip | null>(null);
  isSaving = signal<boolean>(false);

  // Reactive Stores
  fleetAssets = this.fleetStore.trucks;
  // In edit mode: allow currently assigned plate even if status is 'In Transit'
  availableFleetAssets = computed(() => {
    const currentPlate = this.selectedPlate();
    return this.fleetAssets().filter(t => t.status === 'Available' || t.plateNumber === currentPlate);
  });
  drivers = this.fleetStore.drivers;
  helpers = this.fleetStore.helpers;

  private extractUniqueStrings(items: (string | undefined)[]): string[] {
    const valid = items.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
    return Array.from(new Set<string>(valid));
  }

  // Dynamic Self-Learning Database Options
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

  commodityOptions = computed<string[]>(() => {
    const saved = this.dispatchStore.trips().map(t => t.commodity);
    return this.extractUniqueStrings(saved);
  });

  // Form State Properties
  clientName = '';
  tloNumber = '';
  tripNumber = '';
  dispatchDate = '';
  deliveredDate = '';
  
  selectedPlate = signal<string>('');
  customDriver = signal<string>('');
  customHelper = signal<string>('');
  
  origin = signal<string>('');
  destination = signal<string>('');
  routeTag: RouteTag = 'FRONTLOAD';
  commodity = '';
  bagCount: number | null = null;
  
  // Reactive Signals for Auto-Calculations
  rateType = signal<RateType>('PER_TON');
  truckRate = signal<number | null>(null);
  weight = signal<number | null>(null);
  rerouteFee = signal<number | null>(null);
  extraFees = signal<number>(0);
  
  startingCOH = signal<number | null>(null);
  driverSalary = signal<number | null>(null);
  helperSalary = signal<number | null>(null);

  // Reactive State Signals
  tloError = signal<string>('');
  tonnageError = signal<string>('');
  dateError = signal<string>('');

  // Dynamic Itemized Cash Ledger & Expense Collection
  cohEntries = signal<COHEntry[]>([]);
  initialCarryover = signal<CarryoverBalance | null>(null);

  // Computed Cost Items for Domain Compatibility
  costItems = computed<TripCostItem[]>(() => {
    return this.cohEntries()
      .filter(t => t.type === 'DEBIT')
      .map(t => ({
        id: t.id,
        category: (t.category as CostCategory) || 'OTHER_EXPENSE',
        amount: Number(t.amount) || 0,
        date: formatAppDate(t.timestamp || this.deliveredDate || this.dispatchDate),
        description: t.description,
        receiptImage: t.proofUrl
      }));
  });

  constructor() {
    // Effect to reactively load trip when store is ready or id changes
    effect(() => {
      const id = this.tripId();
      const trips = this.dispatchStore.trips();
      if (id && trips.length > 0 && !this.originalTrip()) {
        const found = this.dispatchStore.getTripById(id);
        if (found) {
          this.populateForm(found);
        }
      }
    });
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.tripId.set(id);
    if (id) {
      const found = this.dispatchStore.getTripById(id);
      if (found) {
        this.populateForm(found);
      }
    }
  }

  goBack() {
    if (this.tripId()) {
      this.router.navigate(['/trips', this.tripId()]);
    } else {
      this.location.back();
    }
  }

  private populateForm(t: Trip) {
    this.originalTrip.set(t);
    this.clientName = t.client || '';
    this.tloNumber = String(t.tloNumber || '');
    this.tripNumber = t.tripNumber ? String(t.tripNumber) : '';
    this.commodity = t.cargo?.commodity || t.commodity || '';
    this.bagCount = t.cargo?.bagCount ?? t.bagCount ?? null;

    // Dates
    const rawDispatch = t.dispatchedDate || t.dispatchedAt;
    const rawDelivered = t.deliveredDate || t.deliveredAt;
    this.dispatchDate = rawDispatch ? (appDateToIso(rawDispatch) || rawDispatch.split('T')[0]) : new Date().toISOString().split('T')[0];
    this.deliveredDate = rawDelivered ? (appDateToIso(rawDelivered) || rawDelivered.split('T')[0]) : this.dispatchDate;

    // Truck & Crew
    const plate = t.truck?.plateNumber || t.plateNumber || '';
    this.selectedPlate.set(plate);
    this.customDriver.set(t.truck?.driver?.name || t.driverName || '');
    this.customHelper.set(t.truck?.helper?.name || t.helperName || '');

    // Route
    this.origin.set(t.route?.origin || t.origin || t.originFrom || '');
    this.destination.set(t.route?.destination || t.destination || t.destinationTo || '');
    this.routeTag = t.route?.routeTag || t.routeTag || 'FRONTLOAD';

    // Pricing
    this.rateType.set(t.pricing?.rateType || t.rateType || 'PER_TON');
    this.truckRate.set(t.pricing?.truckRate ?? t.truckRate ?? t.baseRate ?? null);
    this.weight.set(t.cargo?.tonnage ?? t.weightTons ?? t.tonnage ?? null);
    this.rerouteFee.set(t.pricing?.rerouteFee ?? t.rerouteFee ?? null);
    this.extraFees.set(t.pricing?.extraFees ?? t.extraFees ?? 0);

    // Salaries
    this.driverSalary.set(t.payroll?.driverSalary ?? t.driverSalary ?? null);
    this.helperSalary.set(t.payroll?.helperSalary ?? t.helperSalary ?? null);

    // Carryover & COH Entries
    const entries = t.cashLedger?.entries || t.cohEntries || [];
    this.cohEntries.set([...entries]);

    const initialAdvance = entries.find(e => (e.category === 'DISPATCH_ADVANCE' || e.description === 'Driver Starting Cash on Hand') && e.type === 'CREDIT');
    if (initialAdvance) {
      this.startingCOH.set(Number(initialAdvance.amount) || null);
    } else if ((t as any).startingAdvance) {
      this.startingCOH.set(Number((t as any).startingAdvance) || null);
    }

    if (t.cashLedger?.previousCarryover || (t as any).previousCarryover) {
      const co: any = t.cashLedger?.previousCarryover || (t as any).previousCarryover;
      this.initialCarryover.set({
        amount: co?.amount || 0,
        type: co?.type || 'BALANCED',
        lastTripId: co?.fromTripId || co?.lastTripId,
        lastTripTloNumber: co?.fromTloNumber || co?.lastTripTloNumber
      });
    }
  }

  onDispatchDateChange(newDate: string) {
    this.dispatchDate = newDate;
    if (this.deliveredDate && this.deliveredDate < newDate) {
      this.deliveredDate = newDate;
    }
    this.validateDates();
  }

  onDeliveredDateChange(newDate: string) {
    this.deliveredDate = newDate;
    this.validateDates();
  }

  validateDates() {
    if (this.dispatchDate && this.deliveredDate && this.deliveredDate < this.dispatchDate) {
      this.dateError.set('Shipment Date cannot be earlier than Dispatch Date.');
    } else {
      this.dateError.set('');
    }
  }

  computedNextTripNumber = computed<string>(() => {
    if (this.tripNumber) return this.tripNumber;
    const plate = this.selectedPlate();
    if (!plate) return '—';
    const asset = this.fleetAssets().find(a => a.plateNumber === plate);
    if (!asset) return '—';
    const count = Number(asset.currentTripNumber ?? asset.tripNumber ?? 0);
    return count > 0 ? count.toString() : '1';
  });

  computedAssignedDriver = computed<string>(() => {
    if (this.customDriver()) return this.customDriver();
    const plate = this.selectedPlate();
    if (!plate) return 'Unassigned';
    const asset = this.fleetAssets().find(a => a.plateNumber === plate);
    const driverName = asset?.assignedCrew?.driver?.name?.trim();
    if (driverName && driverName !== 'None' && driverName !== 'Unassigned') {
      return driverName;
    }
    return 'Unassigned';
  });

  computedAssignedHelper = computed<string>(() => {
    if (this.customHelper()) return this.customHelper();
    const plate = this.selectedPlate();
    if (!plate) return 'Unassigned';
    const asset = this.fleetAssets().find(a => a.plateNumber === plate);
    const helperName = asset?.assignedCrew?.helper?.name?.trim();
    if (helperName && helperName !== 'None' && helperName !== 'Unassigned') {
      return helperName;
    }
    return 'Unassigned';
  });

  driverCarryover = computed<CarryoverBalance | null>(() => {
    if (this.initialCarryover()) return this.initialCarryover();
    const driverName = this.computedAssignedDriver();
    if (!driverName || driverName === 'Unassigned') return null;
    return this.fleetStore.getDriverCOHBalance(driverName);
  });

  totalStartingCOH = computed<number>(() => {
    const carryover = this.driverCarryover();
    const carryoverAmt = carryover ? (carryover.type === 'OVERAGE' ? carryover.amount : -carryover.amount) : 0;
    const initialAdvance = Number(this.startingCOH()) || 0;
    return carryoverAmt + initialAdvance;
  });

  onWeightChange(val: any) {
    this.weight.set(val === null || val === '' || isNaN(Number(val)) ? null : Number(val));
    this.validateTonnage();
  }

  totalExpenses = computed(() => {
    return this.cohEntries()
      .filter(t => t.type === 'DEBIT')
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  });

  calculatedFreightCharge = computed(() => {
    return FinanceCalculator.calculateFreight(
      this.rateType(),
      this.truckRate() || 0,
      this.weight() || 0,
      false,
      (Number(this.rerouteFee()) || 0) + (this.extraFees() || 0)
    );
  });

  cashAccountability = computed(() => {
    const carryover = this.driverCarryover();
    const carryoverAmt = carryover ? (carryover.type === 'OVERAGE' ? carryover.amount : -carryover.amount) : 0;
    const additionalCredits = this.cohEntries()
      .filter(e => e.type === 'CREDIT' && e.category !== 'DISPATCH_ADVANCE' && e.description !== 'Driver Starting Cash on Hand')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const initialAdvance = Number(this.startingCOH()) || 0;
    return FinanceCalculator.calculateCashAccountability(
      initialAdvance + additionalCredits,
      this.totalExpenses(),
      carryoverAmt
    );
  });

  tripPnl = computed(() => {
    return FinanceCalculator.calculateTripPnl(
      this.calculatedFreightCharge(),
      this.totalExpenses(),
      (this.driverSalary() || 0) + (this.helperSalary() || 0)
    );
  });

  onAssetSelect(plate: string) {
    this.selectedPlate.set(plate);
    const asset = this.fleetAssets().find(a => a.plateNumber === plate);
    if (asset?.assignedCrew) {
      this.customDriver.set(asset.assignedCrew.driver?.name || 'Unassigned');
      this.customHelper.set(asset.assignedCrew.helper?.name || 'Unassigned');
    }
  }

  validateTLO() {
    const tlo = this.tloNumber.trim();
    if (!tlo) {
      this.tloError.set('TLO# is required');
      return;
    }
    if (!/^\d+$/.test(tlo)) {
      this.tloError.set('TLO# must contain numerical digits only');
      return;
    }
    // In edit mode: allow if it matches the current trip's original TLO
    const isDuplicate = this.dispatchStore.trips().some(d => 
      d.id !== this.tripId() && String(d.tloNumber) === tlo
    );
    if (isDuplicate) {
      this.tloError.set(`TLO# ${tlo} is already registered to another trip!`);
      return;
    }
    this.tloError.set('');
  }

  validateTonnage() {
    const w = this.weight();
    if (w === null || w === undefined || w <= 0) {
      if (this.rateType() === 'PER_TON') {
        this.tonnageError.set('Weight must be greater than 0 tons');
        return;
      }
    }
    this.tonnageError.set('');
  }

  async onSubmitUpdateTrip() {
    this.validateTLO();
    this.validateTonnage();
    this.validateDates();
    if (this.tloError() || this.tonnageError() || this.dateError() || !this.tloNumber.trim() || !this.tripId()) return;

    this.isSaving.set(true);

    try {
      const freight = this.calculatedFreightCharge();
      const totalExp = this.totalExpenses();
      const netIncome = this.tripPnl().netCompanyIncome;
      const driverName = this.computedAssignedDriver();
      const hasValidDriver = driverName && driverName !== 'Unassigned' && driverName !== 'None';
      const driverMember = hasValidDriver ? this.fleetStore.getCrewByName(driverName) : null;
      const helperName = this.computedAssignedHelper();
      const hasValidHelper = helperName && helperName !== 'Unassigned' && helperName !== 'None';
      const helperMember = hasValidHelper ? this.fleetStore.getCrewByName(helperName) : null;
      const plate = this.selectedPlate();
      const selectedAsset = this.fleetAssets().find(a => a.plateNumber === plate);

      const formattedDispatchDate = formatAppDate(this.dispatchDate);
      const formattedDeliveredDate = formatAppDate(this.deliveredDate);

      const standardizedCostItems: TripCostItem[] = this.costItems();

      // Ensure starting allowance entry exists in cohEntries if defined
      const finalCOHEntries: COHEntry[] = [...this.cohEntries()];
      const existingAdvanceIdx = finalCOHEntries.findIndex(e => (e.category === 'DISPATCH_ADVANCE' || e.description === 'Driver Starting Cash on Hand') && e.type === 'CREDIT');
      if (this.startingCOH() && this.startingCOH()! > 0) {
        if (existingAdvanceIdx >= 0) {
          finalCOHEntries[existingAdvanceIdx] = {
            ...finalCOHEntries[existingAdvanceIdx],
            amount: Number(this.startingCOH())
          };
        } else {
          finalCOHEntries.unshift({
            id: `coh-init-${Date.now()}`,
            tripId: this.tripId(),
            amount: Number(this.startingCOH()),
            type: 'CREDIT',
            description: 'Driver Starting Cash on Hand',
            timestamp: formattedDispatchDate
          });
        }
      }

      const carryover = this.driverCarryover();
      const carryoverAmt = carryover ? (carryover.type === 'OVERAGE' ? carryover.amount : -carryover.amount) : 0;
      const initialAdvance = Number(this.startingCOH()) || 0;
      const additionalCredits = finalCOHEntries
        .filter(e => e.type === 'CREDIT' && e.category !== 'DISPATCH_ADVANCE' && e.description !== 'Driver Starting Cash on Hand')
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const totalExpDebits = finalCOHEntries
        .filter(e => e.type === 'DEBIT')
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

      const endingCOH = carryoverAmt + initialAdvance + additionalCredits - totalExpDebits;
      const endingCOHType: 'OVERAGE' | 'SHORTAGE' | 'BALANCED' = endingCOH > 0 ? 'OVERAGE' : (endingCOH < 0 ? 'SHORTAGE' : 'BALANCED');

      const cleanTlo = Number(this.tloNumber.trim().replace(/\D/g, '')) || this.tloNumber.trim();
      const cleanTripNum = this.tripNumber ? Number(String(this.tripNumber).replace(/\D/g, '')) : undefined;

      const currentTrip = this.dispatchStore.getTripById(this.tripId());
      const shouldAutoTransition = (currentTrip?.status === 'DISPATCHED' || !currentTrip?.status) && totalExpDebits > 0;

      await this.dispatchStore.updateTrip(this.tripId(), {
        ...(shouldAutoTransition ? { status: 'IN_TRANSIT' } : {}),
        tloNumber: cleanTlo,
        ...(cleanTripNum ? { tripNumber: cleanTripNum } : {}),
        client: this.clientName || 'General Client',
        dispatchedDate: formattedDispatchDate,
        deliveredDate: formattedDeliveredDate,
        origin: this.origin().trim(),
        destination: this.destination().trim(),
        originFrom: this.origin().trim(),
        destinationTo: this.destination().trim(),
        routeTag: this.routeTag,
        commodity: this.commodity?.trim() || '',
        bagCount: this.bagCount || 0,
        truck: {
          plateNumber: plate,
          driver: {
            id: driverMember?.id || 'crew-d-1',
            name: hasValidDriver ? driverName : 'None'
          },
          helper: helperMember ? {
            id: helperMember.id,
            name: helperMember.name
          } : (hasValidHelper ? { id: 'crew-h-1', name: helperName } : null)
        },
        plateNumber: plate,
        truckType: selectedAsset?.truckType || '',
        driverName: hasValidDriver ? driverName : '',
        helperName: hasValidHelper ? helperName : '',
        rateType: this.rateType(),
        baseRate: this.truckRate() || 0,
        truckRate: this.truckRate() || 0,
        tonnage: this.weight() || 0,
        weightTons: this.weight() || 0,
        rerouteFeeApplied: (Number(this.rerouteFee()) || 0) > 0,
        rerouteFee: Number(this.rerouteFee()) || 0,
        extraFees: Number(this.extraFees()) || 0,
        totalFreightCharge: freight,
        freightRevenue: freight,
        cost: totalExp,
        costItems: standardizedCostItems,
        cohEntries: finalCOHEntries,
        endingCOHBalance: endingCOH,
        endingCOHType: endingCOHType,
        driverSalary: this.driverSalary() || 0,
        helperSalary: this.helperSalary() || 0,
        netIncome: netIncome,
        dispatchedAt: new Date(this.dispatchDate).toISOString(),
        deliveredAt: new Date(this.deliveredDate).toISOString()
      });

      // Update driver's running Cash-on-Hand balance if needed
      if (hasValidDriver) {
        await this.fleetStore.updateDriverCOHBalance(
          driverName,
          endingCOH,
          endingCOHType,
          this.tripId(),
          String(this.tloNumber).trim()
        );
      }

      this.router.navigate(['/trips', this.tripId()]);
    } catch (err) {
      console.error('Failed to update trip:', err);
    } finally {
      this.isSaving.set(false);
    }
  }
}
