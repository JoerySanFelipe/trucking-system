import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { DispatchStore } from '../../core/application/stores/dispatch.store';
import { FleetStore } from '../../core/application/stores/fleet.store';
import { RateType, RouteTag, TripCostItem, CostCategory, CashTransactionItem, TransactionCategory, COHEntry, COHCategory } from '../../core/models/tms.models';
import { FinanceCalculator } from '../../core/domain/rules/finance-calculator';
import { ComboboxComponent } from '../../shared/ui-kit/combobox/combobox.component';
import { CurrencyFieldComponent } from '../../shared/ui-kit/currency-field/currency-field.component';
import { TransactionsTableComponent, CarryoverBalance } from '../../shared/ui-kit/transactions-table/transactions-table.component';
import { formatAppDate, appDateToIso } from '../../core/utils/date-formatter';

@Component({
  selector: 'app-post-dispatch',
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
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <a routerLink="/dispatch" class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-2">
            <span class="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Back</span>
          </a>
          <div class="flex items-center gap-3">
            <h1 class="text-2xl font-semibold text-[#262B35] tracking-tight">Post-Dispatch Entry</h1>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button 
            type="button" 
            (click)="resetForm()"
            class="px-3 py-2 text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-2xs inline-flex items-center gap-1.5 cursor-pointer">
            <span class="material-symbols-outlined text-[16px] text-slate-500">restart_alt</span>
            <span>Clear / Reset Form</span>
          </button>
        </div>
      </div>

      <form (ngSubmit)="onSubmitPostDispatch()" #dispatchForm="ngForm" class="space-y-6">
        
        <!-- ── STEP 1: TRIP IDENTIFICATION ──────────────────────────────────── -->
        <div class="card p-6 shadow-2xs space-y-5">
          <div class="pb-2.5 border-b border-slate-100 flex items-center justify-between">
            <span class="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-50 text-brand-700 border border-blue-200/60 text-xs font-semibold shadow-2xs">
              <span class="w-4 h-4 rounded-md bg-brand-600 text-white flex items-center justify-center text-[10px] font-bold font-mono">1</span>
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
            </div>

            <!-- Row 2: Commodity, Number of Bags, Trip Number (Same width as TLO #) -->
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
                <label class="block text-xs font-semibold text-slate-700 mb-1.5">Number of Bags</label>
                <input 
                  type="number" 
                  name="bagCount"
                  [(ngModel)]="bagCount"
                  placeholder="0"
                  class="form-input text-xs font-mono font-semibold"
                />
              </div>

              <!-- Read-Only Trip Number (6 Cols - Same width as TLO #) -->
              <div class="md:col-span-6">
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
            </div>
          </div>
        </div>

        <!-- ── STEP 2: ASSIGNMENT ────────────────────────────────────────────── -->
        <div class="card p-6 shadow-2xs space-y-5">
          <div class="pb-2.5 border-b border-slate-100 flex items-center justify-between">
            <span class="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-50 text-brand-700 border border-blue-200/60 text-xs font-semibold shadow-2xs">
              <span class="w-4 h-4 rounded-md bg-brand-600 text-white flex items-center justify-center text-[10px] font-bold font-mono">2</span>
              <span>Assignment</span>
            </span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
            <!-- 1. Truck -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">
                Truck <span class="text-rose-500">*</span>
              </label>
              <select 
                name="plateNumber"
                [ngModel]="selectedPlate()"
                (ngModelChange)="onAssetSelect($event)"
                required
                class="form-input text-xs font-semibold">
                <option value="" disabled selected>Select Available Truck</option>
                <option *ngFor="let asset of availableFleetAssets()" [value]="asset.plateNumber">
                  {{ asset.plateNumber }} ({{ asset.tonsCapacity || 30 }}T) {{ asset.truckType ? '• ' + asset.truckType : '' }}
                </option>
              </select>
            </div>

            <!-- 2. Driver -->
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

            <!-- 3. Helper -->
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

            <!-- 4. Route Tag -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">Route Tag</label>
              <select name="routeTag" [(ngModel)]="routeTag" class="form-input text-xs font-semibold">
                <option value="FRONTLOAD">🔵 Frontload</option>
                <option value="BACKLOAD">🟣 Backload</option>
              </select>
            </div>
          </div>
        </div>

        <!-- ── STEP 3: ROUTE & TIMELINE ─────────────────────────────────────── -->
        <div class="card p-6 shadow-2xs space-y-5">
          <div class="pb-2.5 border-b border-slate-100 flex items-center justify-between">
            <span class="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-50 text-brand-700 border border-blue-200/60 text-xs font-semibold shadow-2xs">
              <span class="w-4 h-4 rounded-md bg-brand-600 text-white flex items-center justify-center text-[10px] font-bold font-mono">3</span>
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
                <label class="block text-xs font-semibold text-slate-700 mb-1.5">
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

              <!-- Shipment Date (Constrained by [min]="dispatchDate") -->
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1.5">
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
                  [ngClass]="{'border-rose-400 bg-rose-50/40 text-rose-900': dateError()}"
                />
                <p *ngIf="dateError()" class="text-[11px] font-medium text-rose-600 mt-1 flex items-center gap-1">
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
            <span class="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-50 text-brand-700 border border-blue-200/60 text-xs font-semibold shadow-2xs">
              <span class="w-4 h-4 rounded-md bg-brand-600 text-white flex items-center justify-center text-[10px] font-bold font-mono">4</span>
              <span>Freight Revenue</span>
            </span>
          </div>

          <div class="space-y-4">
            <!-- Row 1: Rate Structure & Weight -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                  required
                  placeholder="0.00"
                  class="form-input text-xs font-mono font-semibold"
                  [ngClass]="{'border-amber-400 bg-amber-50/30': tonnageError()}"
                />
                <p *ngIf="tonnageError()" class="text-[11px] font-medium text-amber-600 mt-1">{{ tonnageError() }}</p>
              </div>
            </div>

            <!-- Row 2: Re-route Fee (Input Amount) & Gross Revenue Calculation Banner -->
            <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
              <!-- Re-route Fee (Dynamic Monetary Formatted Field) - 5 Columns -->
              <div class="md:col-span-5 p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                <label class="block text-xs font-semibold text-slate-700 mb-1">Re-route Fee</label>
                <app-currency-field
                  [value]="rerouteFee()"
                  (valueChange)="rerouteFee.set($event)"
                  placeholder="0.00"
                />
              </div>

              <!-- Computed Gross Freight Revenue Banner - 7 Columns (Wider) -->
              <div class="md:col-span-7 bg-blue-50/70 p-3.5 rounded-xl border border-blue-100 flex items-center justify-between">
                <div>
                  <p class="text-[10px] font-bold text-blue-900 uppercase tracking-wider">Gross Freight Revenue</p>
                  <p class="text-xs text-blue-700 font-mono mt-0.5">
                    {{ rateType() === 'PER_TON' ? ((weight() || 0) + 'T × ₱' + ((truckRate() || 0) | number:'1.2-2')) : ('Fixed Rate ₱' + ((truckRate() || 0) | number:'1.2-2')) }} {{ (rerouteFee() && rerouteFee()! > 0) ? (' + ₱' + (rerouteFee() | number:'1.2-2')) : '' }}
                  </p>
                </div>
                <p class="text-lg font-bold text-blue-900 font-mono">₱{{ calculatedFreightCharge() | number:'1.2-2' }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- ── STEP 5: FINANCES ─────────────────────────────────────────────── -->
        <div class="card p-6 shadow-2xs space-y-6 border-t-4 border-t-blue-600">
          <div class="pb-2.5 border-b border-slate-100 flex items-center justify-between">
            <span class="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-50 text-brand-700 border border-blue-200/60 text-xs font-semibold shadow-2xs">
              <span class="w-4 h-4 rounded-md bg-brand-600 text-white flex items-center justify-center text-[10px] font-bold font-mono">5</span>
              <span>Finances</span>
            </span>
          </div>

          <!-- 1st Row: 3 Top Cash Cards (Carryover, Dispatch Allowance, Total Cash on Hand) -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
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
                <span class="text-[11px] text-slate-400 font-medium block mt-1">
                  {{ driverCarryover()?.lastTripTloNumber ? 'From TLO #' + driverCarryover()?.lastTripTloNumber : 'No previous balance' }}
                </span>
              </div>
            </div>

            <!-- Card 2: Dispatch Allowance (Interactive Monetary Formatted Field) -->
            <div class="p-3.5 rounded-xl border border-blue-200/80 bg-blue-50/20 flex flex-col justify-between shadow-2xs">
              <div class="flex items-center justify-between">
                <label class="text-xs font-semibold text-blue-950">
                  Dispatch Allowance <span class="text-rose-500">*</span>
                </label>
                <span class="badge badge-brand text-[10px]">Cash Issued</span>
              </div>
              <div class="mt-2">
                <app-currency-field
                  [value]="startingCOH()"
                  (valueChange)="startingCOH.set($event)"
                  placeholder="0.00"
                  inputClass="border-blue-200 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-mono font-bold"
                />
              </div>
            </div>

            <!-- Card 3: Total Cash on Hand (Computed: Carryover + Dispatch Allowance) -->
            <div class="p-3.5 rounded-xl border border-emerald-200/80 bg-emerald-50/20 flex flex-col justify-between shadow-2xs">
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-emerald-950">Total Cash on Hand</span>
                <span class="badge badge-success text-[10px]">Starting Pool</span>
              </div>
              <div class="mt-2">
                <span class="font-mono font-bold text-xl tabular-nums text-emerald-700 block leading-none">
                  ₱{{ totalStartingCOH() | number:'1.2-2' }}
                </span>
                <span class="text-[11px] text-slate-400 font-medium block mt-1">
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
            <div class="p-3.5 rounded-xl border border-blue-200/80 bg-blue-50/20 flex flex-col justify-between shadow-2xs">
              <div class="flex items-center justify-between">
                <label class="block text-xs font-semibold text-blue-950">Driver Salary</label>
                <span class="badge badge-brand text-[10px]">Payroll</span>
              </div>
              <div class="mt-2">
                <app-currency-field
                  [value]="driverSalary()"
                  (valueChange)="driverSalary.set($event)"
                  placeholder="0.00"
                  inputClass="border-blue-200 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-mono font-bold"
                />
              </div>
            </div>

            <!-- Helper Salary -->
            <div class="p-3.5 rounded-xl border border-emerald-200/80 bg-emerald-50/20 flex flex-col justify-between shadow-2xs">
              <div class="flex items-center justify-between">
                <label class="block text-xs font-semibold text-emerald-950">Helper Salary</label>
                <span class="badge badge-success text-[10px]">Payroll</span>
              </div>
              <div class="mt-2">
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
            
            <!-- Box 1: Cash Liquidation (BLUE) -->
            <div class="p-4 rounded-xl border border-blue-200 bg-blue-50/30 space-y-3 shadow-2xs">
              <div class="flex items-center justify-between">
                <h4 class="text-xs font-semibold text-blue-950">Cash Liquidation</h4>
                <span class="badge badge-brand text-[10px]">
                  {{ cashAccountability().status }}
                </span>
              </div>
              <div class="space-y-1.5 text-xs">
                <div class="flex justify-between text-slate-600">
                  <span>Cash Issued:</span>
                  <span class="font-mono font-semibold text-slate-800">₱{{ (startingCOH() || 0) | number:'1.2-2' }}</span>
                </div>
                <div class="flex justify-between text-slate-600">
                  <span>Expenses Spent:</span>
                  <span class="font-mono font-semibold text-rose-600">− ₱{{ totalExpenses() | number:'1.2-2' }}</span>
                </div>
                <div class="pt-2 border-t border-blue-200 flex justify-between font-bold">
                  <span class="text-blue-950">Ending Cash Balance:</span>
                  <span class="font-mono" [ngClass]="cashAccountability().endingCashBalance >= 0 ? 'text-blue-800' : 'text-rose-700'">
                    ₱{{ cashAccountability().endingCashBalance | number:'1.2-2' }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Box 2: Crew Salary Summary (AMBER) -->
            <div class="p-4 rounded-xl border border-amber-300 bg-amber-50/30 space-y-3 shadow-2xs">
              <div class="flex items-center justify-between">
                <h4 class="text-xs font-semibold text-amber-950">Crew Salary</h4>
                <span class="badge badge-warning text-[10px]">PAYROLL</span>
              </div>
              <div class="space-y-1.5 text-xs">
                <div class="flex justify-between text-slate-600">
                  <span>Driver Salary:</span>
                  <span class="font-mono font-semibold text-slate-800">₱{{ (driverSalary() || 0) | number:'1.2-2' }}</span>
                </div>
                <div class="flex justify-between text-slate-600">
                  <span>Helper Salary:</span>
                  <span class="font-mono font-semibold text-slate-800">₱{{ (helperSalary() || 0) | number:'1.2-2' }}</span>
                </div>
                <div class="pt-2 border-t border-amber-200 flex justify-between font-bold">
                  <span class="text-amber-950">Total Crew Payroll:</span>
                  <span class="font-mono text-amber-950">₱{{ ((driverSalary() || 0) + (helperSalary() || 0)) | number:'1.2-2' }}</span>
                </div>
              </div>
            </div>

            <!-- Box 3: Company Profit (GREEN) -->
            <div class="p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 space-y-3 shadow-2xs">
              <div class="flex items-center justify-between">
                <h4 class="text-xs font-semibold text-emerald-950">Company Profit</h4>
                <span class="badge badge-success text-[10px]">PROFIT</span>
              </div>
              <div class="space-y-1.5 text-xs">
                <div class="flex justify-between text-slate-600">
                  <span>Gross Revenue:</span>
                  <span class="font-mono font-semibold text-slate-800">₱{{ calculatedFreightCharge() | number:'1.2-2' }}</span>
                </div>
                <div class="flex justify-between text-slate-600">
                  <span>Trip Costs &amp; Payroll:</span>
                  <span class="font-mono font-semibold text-rose-600">− ₱{{ (totalExpenses() + (driverSalary() || 0) + (helperSalary() || 0)) | number:'1.2-2' }}</span>
                </div>
                <div class="pt-2 border-t border-emerald-200 flex justify-between font-bold">
                  <span class="text-emerald-950">Net Company Income:</span>
                  <span class="font-mono text-emerald-800 text-sm">
                    ₱{{ tripPnl().netCompanyIncome | number:'1.2-2' }}
                  </span>
                </div>
              </div>
            </div>

          </div>

        </div>

        <!-- ── SUBMIT BUTTON & CONTROLS ────────────────────────────────────────── -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <!-- Red Cancel Button -->
          <a routerLink="/dispatch" class="px-6 py-3 text-xs font-semibold text-rose-600 bg-rose-50/50 hover:bg-rose-100/80 border border-rose-300 rounded-xl transition-all shadow-2xs inline-flex items-center gap-1.5 cursor-pointer">
            Cancel
          </a>

          <!-- Save Button -->
          <button
            type="submit"
            [disabled]="!dispatchForm.valid || !!tloError() || !!tonnageError()"
            class="btn-primary py-3 px-8 text-xs gap-2 disabled:opacity-50 transition-all w-full sm:w-auto shadow-sm cursor-pointer inline-flex items-center justify-center">
            <span class="material-symbols-outlined text-[18px]">verified</span>
            <span>Save</span>
          </button>
        </div>
      </form>
    </div>
  `
})
export class PostDispatchComponent implements OnInit {
  dispatchStore = inject(DispatchStore);
  fleetStore = inject(FleetStore);
  router = inject(Router);

  // Reactive Stores
  fleetAssets = this.fleetStore.trucks;
  availableFleetAssets = computed(() => this.fleetAssets().filter(t => t.status === 'Available'));
  drivers = this.fleetStore.drivers;
  helpers = this.fleetStore.helpers;

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

  commodityOptions = computed<string[]>(() => {
    const saved = this.dispatchStore.trips().map(t => t.commodity);
    return this.extractUniqueStrings(saved);
  });

  driverOptions = computed<string[]>(() => this.drivers().map(d => d.name));
  helperOptions = computed<string[]>(() => this.helpers().map(h => h.name));

  // Form State Properties (Clean, blank for typing or selecting)
  clientName = '';
  tloNumber = '';
  dispatchDate = '';
  deliveredDate = '';
  
  selectedPlate = signal<string>('');
  selectedDriver = '';
  selectedHelper = '';
  
  origin = signal<string>('');
  destination = signal<string>('');
  routeTag: RouteTag = 'FRONTLOAD';
  commodity = '';
  bagCount: number | null = null;
  
  // Reactive Signals for Dynamic Auto-Calculations
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

  // Dynamic Itemized Cash Ledger & Expense Collection (Bi-directional: Credit & Debit)
  cohEntries = signal<COHEntry[]>([]);

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

  ngOnInit() {
    this.resetForm();
  }

  resetForm() {
    this.clientName = '';
    this.tloNumber = '';
    this.dispatchDate = new Date().toISOString().split('T')[0];
    this.deliveredDate = new Date().toISOString().split('T')[0];
    this.selectedPlate.set('');
    this.selectedDriver = '';
    this.selectedHelper = '';
    this.origin.set('');
    this.destination.set('');
    this.routeTag = 'FRONTLOAD';
    this.commodity = '';
    this.bagCount = null;
    
    this.rateType.set('PER_TON');
    this.truckRate.set(null);
    this.weight.set(null);
    this.rerouteFee.set(null);
    this.startingCOH.set(null);
    this.driverSalary.set(null);
    this.helperSalary.set(null);

    this.tloError.set('');
    this.tonnageError.set('');
    this.dateError.set('');
    this.cohEntries.set([]);
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

  // Dynamic Read-Only Trip Number Computed from Selected Truck Asset (No # prefix)
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

  // Dynamic Driver Carryover Balance fetched from FleetStore by Driver Name/ID
  driverCarryover = computed<CarryoverBalance | null>(() => {
    const driverName = this.computedAssignedDriver();
    if (!driverName || driverName === 'Unassigned') return null;
    return this.fleetStore.getDriverCOHBalance(driverName);
  });

  // Total Starting Cash on Hand (Previous Carryover + Dispatch Allowance)
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

  // Total Expenses Spent (Sum of all Debit transactions)
  totalExpenses = computed(() => {
    return this.cohEntries()
      .filter(t => t.type === 'DEBIT')
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  });

  // Calculated Gross Freight Revenue
  calculatedFreightCharge = computed(() => {
    return FinanceCalculator.calculateFreight(
      this.rateType(),
      this.truckRate() || 0,
      this.weight() || 0,
      false,
      (Number(this.rerouteFee()) || 0) + (this.extraFees() || 0)
    );
  });

  // Box 1: Cash Accountability
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

  // Box 3: Trip Profit & Loss
  tripPnl = computed(() => {
    return FinanceCalculator.calculateTripPnl(
      this.calculatedFreightCharge(),
      this.totalExpenses(),
      (this.driverSalary() || 0) + (this.helperSalary() || 0)
    );
  });

  onAssetSelect(plate: string) {
    this.selectedPlate.set(plate);
  }

  // ── FORM VALIDATIONS ───────────────────────────────────────────────────────

  validateTLO() {
    if (!this.tloNumber || this.tloNumber.trim() === '') {
      this.tloError.set('TLO# is required');
      return;
    }
    if (!/^\d+$/.test(this.tloNumber)) {
      this.tloError.set('TLO# must contain numerical digits only');
      return;
    }
    const exists = this.dispatchStore.trips().some(d => d.tloNumber === this.tloNumber.trim());
    if (exists) {
      this.tloError.set(`TLO# ${this.tloNumber} is already registered!`);
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

  async onSubmitPostDispatch() {
    this.validateTLO();
    this.validateTonnage();
    this.validateDates();
    if (this.tloError() || this.tonnageError() || this.dateError() || !this.tloNumber.trim()) return;

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

    // Standardized Global Dates (DD-MMM-YY e.g. 30-Aug-26, 15-June-26, 04-July-26)
    const formattedDispatchDate = formatAppDate(this.dispatchDate);
    const formattedDeliveredDate = formatAppDate(this.deliveredDate);

    // Persist standard expense collection
    const standardizedCostItems: TripCostItem[] = this.costItems();

    // Persist cash ledger entries
    const finalCOHEntries: COHEntry[] = [...this.cohEntries()];
    if (this.startingCOH() && this.startingCOH()! > 0 && !finalCOHEntries.some(e => (e.category === 'DISPATCH_ADVANCE' || e.description === 'Driver Starting Cash on Hand') && e.type === 'CREDIT')) {
      finalCOHEntries.unshift({
        id: `coh-init-${Date.now()}`,
        tripId: '',
        amount: Number(this.startingCOH()),
        type: 'CREDIT',
        description: 'Driver Starting Cash on Hand',
        timestamp: formattedDispatchDate
      });
    }

    // 1. Calculate Carryover Snapshot and Ending Cash-on-Hand Balance
    const carryover = this.driverCarryover();
    const carryoverAmt = carryover ? (carryover.type === 'OVERAGE' ? carryover.amount : -carryover.amount) : 0;
    const initialAdvance = Number(this.startingCOH()) || 0;
    const additionalCredits = this.cohEntries()
      .filter(e => e.type === 'CREDIT' && e.category !== 'DISPATCH_ADVANCE' && e.description !== 'Driver Starting Cash on Hand')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const totalExpDebits = this.cohEntries()
      .filter(e => e.type === 'DEBIT')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const endingCOH = carryoverAmt + initialAdvance + additionalCredits - totalExpDebits;
    const endingCOHType: 'OVERAGE' | 'SHORTAGE' | 'BALANCED' = endingCOH > 0 ? 'OVERAGE' : (endingCOH < 0 ? 'SHORTAGE' : 'BALANCED');

    const rawTripNum = this.computedNextTripNumber();
    const cleanTripNum = rawTripNum !== '—' 
      ? (Number(rawTripNum.replace(/\D/g, '')) || (this.dispatchStore.dispatches().length + 1)) 
      : (this.dispatchStore.dispatches().length + 1);
    const cleanTlo = Number(this.tloNumber.trim().replace(/\D/g, '')) || 0;

    const newTrip = await this.dispatchStore.addTrip({
      tloNumber: cleanTlo,
      tripNumber: cleanTripNum,
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
      extraFees: (Number(this.rerouteFee()) || 0) + (this.extraFees() || 0),
      totalFreightCharge: freight,
      freightRevenue: freight,
      cost: totalExp,
      costItems: standardizedCostItems,
      cohEntries: finalCOHEntries,
      previousCarryover: carryover ? {
        amount: carryover.amount,
        type: carryover.type,
        fromTripId: carryover.lastTripId,
        fromTloNumber: carryover.lastTripTloNumber
      } : undefined,
      endingCOHBalance: endingCOH,
      endingCOHType: endingCOHType,
      driverSalary: this.driverSalary() || 0,
      helperSalary: this.helperSalary() || 0,
      netIncome: netIncome,
      dispatchedAt: new Date(this.dispatchDate).toISOString(),
      deliveredAt: new Date(this.deliveredDate).toISOString(),
      status: 'COMPLETED',
      billingStatus: 'READY_TO_BILL',
      podStatus: 'APPROVED'
    });

    // 2. Update the assigned driver's running Cash-on-Hand balance in FleetStore & Firestore
    if (hasValidDriver) {
      await this.fleetStore.updateDriverCOHBalance(
        driverName,
        endingCOH,
        endingCOHType,
        newTrip.id,
        this.tloNumber.trim()
      );
    }

    // 3. Increment the assigned truck's currentTripNumber sequence in FleetStore
    if (selectedAsset) {
      const nextCount = Number(selectedAsset.currentTripNumber ?? selectedAsset.tripNumber ?? 0) + 1;
      await this.fleetStore.updateTruck(selectedAsset.id, {
        currentTripNumber: nextCount,
        tripNumber: nextCount
      });
    }

    this.router.navigate(['/trips']);
  }
}
