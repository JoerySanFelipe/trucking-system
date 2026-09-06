import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DispatchStore } from '../../core/application/stores/dispatch.store';
import { FleetStore } from '../../core/application/stores/fleet.store';
import { FilterCardComponent } from '../../shared/ui-kit/filter-card/filter-card.component';
import { ToolbarComponent } from '../../shared/ui-kit/toolbar/toolbar.component';
import { EmptyStateComponent } from '../../shared/ui-kit/empty-state/empty-state.component';
import { ModalTeleportDirective } from '../../shared/directives/modal-teleport.directive';
import { formatAppDate } from '../../core/utils/date-formatter';
import { 
  CrewPayrollSummary, 
  TripPayItem, 
  PayoutChannel, 
  PayrollPeriodType, 
  PayrollPeriodConfig 
} from '../../core/models/payroll.models';
import { CrewMember, CrewRole, CashAdvanceRecord, CrewSalaryRecord } from '../../core/models/fleet.models';
import { TripDispatch } from '../../core/models/tms.models';
import { PayslipPdfBuilder } from '../../core/infrastructure/export/payslip-pdf.builder';

@Component({
  selector: 'app-payroll',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    FilterCardComponent,
    ToolbarComponent,
    EmptyStateComponent,
    ModalTeleportDirective
  ],
  template: `
    <div class="w-full space-y-6 animate-fade-in-up pb-16">

      <!-- ── PAGE HEADER ──────────────────────────────────────────────────────── -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-semibold text-slate-900 tracking-tight">Driver &amp; Helper Payroll</h1>
          <p class="text-xs text-slate-500 font-medium mt-0.5">
            Trip earnings aggregation, Cash Advance management, and official payout settlement
          </p>
        </div>

        <!-- Header Actions -->
        <div class="flex items-center gap-2 flex-wrap">
          <!-- Add Cash Advance Button -->
          <button 
            type="button" 
            (click)="openAddCashAdvanceModal()" 
            class="btn-secondary text-xs h-9 px-3.5 inline-flex items-center gap-1.5 cursor-pointer rounded-xl font-semibold shadow-2xs">
            <span class="material-symbols-outlined text-[18px] text-amber-600">price_change</span>
            <span>Record Cash Advance</span>
          </button>

          <!-- Quick Link to Completed Trips -->
          <a 
            routerLink="/completed-trips" 
            class="btn-primary text-xs h-9 px-3.5 inline-flex items-center gap-1.5 cursor-pointer rounded-xl font-semibold shadow-xs">
            <span class="material-symbols-outlined text-[18px]">fact_check</span>
            <span>View Completed Trips</span>
          </a>
        </div>
      </div>

      <!-- ── CUT-OFF / PERIOD PICKER ─────────────────────────────────────────── -->
      <div class="card p-4 border border-slate-200 bg-white rounded-2xl shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-[20px]">date_range</span>
          </div>
          <div>
            <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Payroll Settlement Cut-off</div>
            <div class="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>{{ activePeriodConfig().label }}</span>
              <span class="text-xs font-mono font-normal text-slate-500">
                ({{ activePeriodConfig().fromDate | date:'dd-MMM' }} – {{ activePeriodConfig().toDate | date:'dd-MMM-yyyy' }})
              </span>
            </div>
          </div>
        </div>

        <!-- Period Presets -->
        <div class="flex items-center gap-1.5 flex-wrap">
          <button 
            type="button"
            (click)="setPeriodType('1ST_HALF')"
            [ngClass]="periodType() === '1ST_HALF' ? 'bg-brand-600 text-white shadow-xs' : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'"
            class="btn-xs rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer">
            1st Half (1–15)
          </button>
          <button 
            type="button"
            (click)="setPeriodType('2ND_HALF')"
            [ngClass]="periodType() === '2ND_HALF' ? 'bg-brand-600 text-white shadow-xs' : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'"
            class="btn-xs rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer">
            2nd Half (16–End)
          </button>
          <button 
            type="button"
            (click)="setPeriodType('THIS_MONTH')"
            [ngClass]="periodType() === 'THIS_MONTH' ? 'bg-brand-600 text-white shadow-xs' : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'"
            class="btn-xs rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer">
            This Month
          </button>
          <button 
            type="button"
            (click)="setPeriodType('ALL_PENDING')"
            [ngClass]="periodType() === 'ALL_PENDING' ? 'bg-brand-600 text-white shadow-xs' : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'"
            class="btn-xs rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer">
            All Completed
          </button>

          <!-- Custom Date Toggle Inputs -->
          <div class="flex items-center gap-1 ml-1 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5">
            <input 
              type="date" 
              [ngModel]="customFromDate()" 
              (ngModelChange)="onCustomFromChange($event)" 
              class="bg-transparent outline-none font-medium text-slate-800 text-[11px] cursor-pointer"
              title="Cut-off Start Date"
            />
            <span class="text-slate-400">→</span>
            <input 
              type="date" 
              [ngModel]="customToDate()" 
              (ngModelChange)="onCustomToChange($event)" 
              class="bg-transparent outline-none font-medium text-slate-800 text-[11px] cursor-pointer"
              title="Cut-off End Date"
            />
          </div>
        </div>
      </div>

      <!-- ── EXECUTIVE KPI METRIC CARDS ──────────────────────────────────────── -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <!-- 1. Total Gross Earnings -->
        <app-filter-card 
          label="Total Gross Payroll" 
          [value]="totalGrossEarningsFormatted()" 
          icon="payments"
          theme="blue"
          [isActive]="false">
        </app-filter-card>

        <!-- 2. Total Cash Advance Deductions -->
        <app-filter-card 
          label="Total CA Deducted" 
          [value]="totalDeductionsFormatted()" 
          icon="money_off"
          theme="amber"
          [isActive]="false">
        </app-filter-card>

        <!-- 3. Net Payable to Crew -->
        <app-filter-card 
          label="Net Cash Needed" 
          [value]="totalNetPayableFormatted()" 
          icon="account_balance_wallet"
          theme="emerald"
          [isActive]="false">
        </app-filter-card>

        <!-- 4. Outstanding Active CA -->
        <app-filter-card 
          label="Active Crew CA" 
          [value]="totalOutstandingCAFormatted()" 
          icon="savings"
          theme="neutral"
          [isActive]="false">
        </app-filter-card>
      </div>

      <!-- ── TOOLBAR (SEARCH & ROLE FILTERS) ──────────────────────────────────── -->
      <app-toolbar 
        class="block w-full"
        [(searchQuery)]="searchQuery" 
        searchPlaceholder="Search crew name, phone, or plate...">
        
        <!-- Left Slot: Role Filters -->
        <div filters class="flex items-center gap-2 flex-nowrap shrink-0">
          <button 
            type="button"
            (click)="selectedRoleFilter.set('ALL')"
            [ngClass]="selectedRoleFilter() === 'ALL' ? 'bg-slate-900 text-white shadow-xs' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'"
            class="btn-xs rounded-xl font-semibold transition-all cursor-pointer flex items-center justify-center whitespace-nowrap">
            All Crew ({{ payrollSummaries().length }})
          </button>
          <button 
            type="button"
            (click)="selectedRoleFilter.set('Driver')"
            [ngClass]="selectedRoleFilter() === 'Driver' ? 'bg-brand-600 text-white shadow-xs' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'"
            class="btn-xs rounded-xl font-semibold transition-all cursor-pointer flex items-center justify-center whitespace-nowrap">
            Drivers ({{ driverCount() }})
          </button>
          <button 
            type="button"
            (click)="selectedRoleFilter.set('Helper')"
            [ngClass]="selectedRoleFilter() === 'Helper' ? 'bg-brand-600 text-white shadow-xs' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'"
            class="btn-xs rounded-xl font-semibold transition-all cursor-pointer flex items-center justify-center whitespace-nowrap">
            Helpers ({{ helperCount() }})
          </button>
        </div>
      </app-toolbar>

      <!-- ── MASTER CREW PAYROLL LEDGER TABLE ─────────────────────────────────── -->
      <div class="card overflow-hidden bg-white border border-slate-200 rounded-2xl shadow-2xs">
        <div class="overflow-x-auto">
          <table class="data-table w-full text-left">
            <thead>
              <tr class="bg-slate-50/80 border-b border-slate-200 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                <th class="w-[20%]">Crew Member</th>
                <th class="w-[10%]">Role</th>
                <th class="text-center w-[12%]">Trips in Cut-off</th>
                <th class="text-right w-[13%]">Gross Earnings</th>
                <th class="text-right w-[13%]">Outstanding CA</th>
                <th class="text-right w-[13%]">CA Deducted</th>
                <th class="text-right w-[14%]">Net Payable</th>
                <th class="text-right w-[15%]">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-xs">
              <tr *ngFor="let crew of filteredSummaries()" 
                  class="hover:bg-slate-50/80 transition-colors">
                
                <!-- Col 1: Crew Member -->
                <td>
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-xl flex items-center justify-center text-white text-[11px] font-bold shrink-0 shadow-2xs"
                         [ngClass]="crew.role === 'Driver' ? 'bg-brand-600' : 'bg-slate-600'">
                      {{ getInitials(crew.crewName) }}
                    </div>
                    <div class="truncate max-w-[200px]">
                      <div class="font-bold text-slate-900 text-xs truncate" [title]="crew.crewName">
                        {{ crew.crewName }}
                      </div>
                      <div class="text-[10px] text-slate-400 font-medium">
                        {{ crew.phone || 'No phone recorded' }}
                      </div>
                    </div>
                  </div>
                </td>

                <!-- Col 2: Role -->
                <td>
                  <span [ngClass]="crew.role === 'Driver' ? 'bg-blue-50 text-brand-600 border-blue-200' : 'bg-slate-100 text-slate-700 border-slate-200'"
                        class="px-2 py-0.5 rounded-full text-[10px] font-semibold border inline-block whitespace-nowrap">
                    {{ crew.role === 'Driver' ? 'Lead Driver' : 'Helper' }}
                  </span>
                </td>

                <!-- Col 3: Trips in Cut-off -->
                <td class="text-center">
                  <div class="inline-flex items-center gap-1">
                    <span class="font-bold font-mono text-slate-900 text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {{ crew.completedTripsCount }} {{ crew.completedTripsCount === 1 ? 'Trip' : 'Trips' }}
                    </span>
                  </div>
                </td>

                <!-- Col 4: Gross Earnings -->
                <td class="text-right font-mono">
                  <span class="font-bold text-slate-900 text-xs tabular-nums">
                    ₱{{ crew.grossTripPay | number:'1.2-2' }}
                  </span>
                </td>

                <!-- Col 5: Outstanding CA -->
                <td class="text-right font-mono">
                  <span *ngIf="crew.outstandingCA > 0" class="text-amber-600 font-semibold text-xs tabular-nums bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 inline-block">
                    ₱{{ crew.outstandingCA | number:'1.2-2' }}
                  </span>
                  <span *ngIf="crew.outstandingCA <= 0" class="text-slate-300 font-normal text-xs">
                    —
                  </span>
                </td>

                <!-- Col 6: CA Deducted -->
                <td class="text-right font-mono">
                  <span *ngIf="crew.approvedDeduction > 0" class="text-rose-600 font-medium text-xs tabular-nums">
                    - ₱{{ crew.approvedDeduction | number:'1.2-2' }}
                  </span>
                  <span *ngIf="crew.approvedDeduction <= 0" class="text-slate-300 font-normal text-xs">
                    ₱0.00
                  </span>
                </td>

                <!-- Col 7: Net Payable -->
                <td class="text-right font-mono">
                  <span class="text-xs font-bold tabular-nums"
                        [ngClass]="crew.netPayable > 0 ? 'text-emerald-700' : 'text-slate-400'">
                    ₱{{ crew.netPayable | number:'1.2-2' }}
                  </span>
                </td>

                <!-- Col 8: Actions -->
                <td class="text-right whitespace-nowrap">
                  <div class="flex items-center justify-end gap-1.5">
                    <!-- Settle & Pay Button -->
                    <button 
                      type="button" 
                      (click)="openSettleModal(crew)"
                      [disabled]="crew.completedTripsCount === 0 && crew.grossTripPay === 0"
                      class="btn-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-2.5 py-1 font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed">
                      <span class="material-symbols-outlined text-[14px]">payments</span>
                      <span>Settle Pay</span>
                    </button>

                    <!-- Print Payslip -->
                    <button 
                      type="button" 
                      (click)="downloadPayslipPdf(crew)"
                      [disabled]="crew.completedTripsCount === 0 && crew.grossTripPay === 0"
                      title="Generate Official PDF Payslip Voucher"
                      class="btn-xs bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg p-1 inline-flex items-center justify-center cursor-pointer transition-colors shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed">
                      <span class="material-symbols-outlined text-[15px] text-slate-600">receipt</span>
                    </button>

                    <!-- View Breakdown -->
                    <button 
                      type="button" 
                      (click)="openBreakdownModal(crew)"
                      title="View Itemized Trips & Cash Advances"
                      class="btn-xs bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg p-1 inline-flex items-center justify-center cursor-pointer transition-colors shadow-2xs">
                      <span class="material-symbols-outlined text-[15px] text-slate-600">visibility</span>
                    </button>
                  </div>
                </td>

              </tr>

              <!-- Empty State in Table -->
              <tr *ngIf="filteredSummaries().length === 0">
                <td colspan="8" class="py-12 text-center">
                  <app-empty-state
                    title="No Crew Members Found"
                    description="No drivers or helpers match the selected role or search query in this cut-off period."
                    actionLabel="Reset Filter"
                    (actionClicked)="resetFilters()">
                  </app-empty-state>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ── MODAL A: RECORD CASH ADVANCE ───────────────────────────────────── -->
      <div *ngIf="isAddCaModalOpen()" 
           appModalTeleport 
           class="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fade-in">
        <div class="card bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
          
          <!-- Modal Header -->
          <div class="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
                <span class="material-symbols-outlined text-[18px]">price_change</span>
              </div>
              <h3 class="text-sm font-bold text-slate-900">Record Cash Advance</h3>
            </div>
            <button (click)="closeAddCaModal()" class="text-slate-400 hover:text-slate-600 cursor-pointer">
              <span class="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <!-- Form Body -->
          <form (ngSubmit)="submitCashAdvance()" class="p-5 space-y-4 overflow-y-auto">
            
            <!-- Crew Selection -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Select Crew Member *</label>
              <select 
                [(ngModel)]="newCaCrewId" 
                name="newCaCrewId" 
                required 
                class="form-input text-xs w-full py-2 bg-white">
                <option value="" disabled>-- Choose Driver or Helper --</option>
                <option *ngFor="let c of fleetStore.crew()" [value]="c.id">
                  {{ c.name }} ({{ c.role }})
                </option>
              </select>
            </div>

            <!-- Amount Input -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Cash Advance Amount (₱) *</label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-xs">₱</span>
                <input 
                  type="number" 
                  step="0.01" 
                  min="1" 
                  [(ngModel)]="newCaAmount" 
                  name="newCaAmount" 
                  required 
                  placeholder="0.00" 
                  class="form-input text-xs w-full py-2 pl-7 font-mono font-bold text-slate-900"
                />
              </div>
            </div>

            <!-- Date & Channel -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Date *</label>
                <input 
                  type="date" 
                  [(ngModel)]="newCaDate" 
                  name="newCaDate" 
                  required 
                  class="form-input text-xs w-full py-2 bg-white"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Channel *</label>
                <select 
                  [(ngModel)]="newCaChannel" 
                  name="newCaChannel" 
                  class="form-input text-xs w-full py-2 bg-white font-medium">
                  <option value="GCASH">GCash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CASH">Cash</option>
                </select>
              </div>
            </div>

            <!-- Reference Number (Optional for GCash / Bank) -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Reference No. / Mobile (Optional)</label>
              <input 
                type="text" 
                [(ngModel)]="newCaRef" 
                name="newCaRef" 
                placeholder="e.g. Ref# 10294819 / 0917-xxx-xxxx" 
                class="form-input text-xs w-full py-2 font-mono"
              />
            </div>

            <!-- Purpose / Reason -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Reason / Remarks *</label>
              <input 
                type="text" 
                [(ngModel)]="newCaReason" 
                name="newCaReason" 
                required 
                placeholder="e.g. Family emergency, personal bale, pambili gamot" 
                class="form-input text-xs w-full py-2"
              />
            </div>

            <!-- Modal Footer -->
            <div class="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button 
                type="button" 
                (click)="closeAddCaModal()" 
                class="btn-secondary text-xs px-4 py-2 cursor-pointer font-semibold rounded-xl">
                Cancel
              </button>
              <button 
                type="submit" 
                [disabled]="!newCaCrewId || !newCaAmount || newCaAmount <= 0" 
                class="btn-primary text-xs px-4 py-2 cursor-pointer font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed">
                Save Cash Advance
              </button>
            </div>
          </form>

        </div>
      </div>

      <!-- ── MODAL B: SETTLE PAYOUT & MANUAL DEDUCTION ───────────────────────── -->
      <div *ngIf="settlingCrew()" 
           appModalTeleport 
           class="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fade-in">
        <div class="card bg-white w-full max-w-xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
          
          <!-- Modal Header -->
          <div class="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                <span class="material-symbols-outlined text-[18px]">account_balance_wallet</span>
              </div>
              <div>
                <h3 class="text-sm font-bold text-slate-900">Settle Payroll — {{ settlingCrew()?.crewName }}</h3>
                <p class="text-[11px] text-slate-500 font-medium">
                  {{ settlingCrew()?.role === 'Driver' ? 'Lead Driver' : 'Helper' }} · Period: {{ activePeriodConfig().label }}
                </p>
              </div>
            </div>
            <button (click)="closeSettleModal()" class="text-slate-400 hover:text-slate-600 cursor-pointer">
              <span class="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <!-- Modal Body -->
          <div class="p-5 space-y-4 overflow-y-auto">
            
            <!-- Trips Summary Table in this Period -->
            <div>
              <div class="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Completed Trips in Cut-off ({{ settlingCrew()?.completedTripsCount }})</span>
                <span class="font-mono text-slate-900">Gross: ₱{{ settlingCrew()?.grossTripPay | number:'1.2-2' }}</span>
              </div>
              
              <div class="border border-slate-200 rounded-xl overflow-hidden max-h-36 overflow-y-auto">
                <table class="w-full text-[11px]">
                  <thead class="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th class="p-1.5 text-left">TLO #</th>
                      <th class="p-1.5 text-left">Date</th>
                      <th class="p-1.5 text-left">Route</th>
                      <th class="p-1.5 text-right">Fixed Rate</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    <tr *ngFor="let t of settlingCrew()?.trips" class="hover:bg-slate-50">
                      <td class="p-1.5 font-bold font-mono text-brand-600">TLO #{{ t.tloNumber }}</td>
                      <td class="p-1.5 text-slate-600">{{ t.deliveredDate || t.dispatchedDate | date:'dd-MMM' }}</td>
                      <td class="p-1.5 text-slate-700 truncate max-w-[150px]">{{ t.origin }} ➔ {{ t.destination }}</td>
                      <td class="p-1.5 text-right font-mono font-bold text-slate-900">₱{{ t.rate | number:'1.2-2' }}</td>
                    </tr>
                    <tr *ngIf="!settlingCrew()?.trips?.length">
                      <td colspan="4" class="p-3 text-center text-slate-400 italic">No completed trips in this period</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Financial Calculation Box -->
            <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
              
              <!-- Gross -->
              <div class="flex items-center justify-between text-xs">
                <span class="text-slate-600 font-medium">Gross Trip Earnings:</span>
                <span class="font-mono font-bold text-slate-900">₱{{ settlingCrew()?.grossTripPay | number:'1.2-2' }}</span>
              </div>

              <!-- Outstanding CA info -->
              <div class="flex items-center justify-between text-xs">
                <span class="text-slate-600 font-medium">Total Outstanding Cash Advance:</span>
                <span class="font-mono font-semibold text-amber-600">₱{{ settlingCrew()?.outstandingCA | number:'1.2-2' }}</span>
              </div>

              <!-- Manual Deduction Input -->
              <div class="pt-2 border-t border-slate-200">
                <label class="block text-xs font-bold text-slate-900 mb-1">
                  Manual Cash Advance Deduction (₱):
                </label>
                <div class="relative">
                  <span class="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-xs">₱</span>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    [max]="settlingCrew()?.outstandingCA || 0" 
                    [(ngModel)]="settleDeductionInput" 
                    placeholder="0.00" 
                    class="form-input text-xs w-full py-2 pl-7 font-mono font-bold text-rose-600 bg-white"
                  />
                </div>
                <p class="text-[10px] text-slate-500 mt-1">
                  Specify deduction amount for this cut-off. Any uncollected amount remains in the crew's outstanding CA balance.
                </p>
              </div>

              <!-- Net Result -->
              <div class="pt-2 border-t border-slate-200 flex items-center justify-between">
                <span class="text-xs font-bold text-slate-900">NET CASH PAYABLE:</span>
                <span class="text-base font-bold font-mono text-emerald-700">
                  ₱{{ getLiveNetPayable() | number:'1.2-2' }}
                </span>
              </div>

              <!-- Remaining CA result -->
              <div class="flex items-center justify-between text-[11px] text-slate-500">
                <span>Remaining CA Balance:</span>
                <span class="font-mono font-semibold text-slate-700">
                  ₱{{ getLiveRemainingCA() | number:'1.2-2' }}
                </span>
              </div>
            </div>

            <!-- Payment Channel & Reference -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Disbursement Channel *</label>
                <select 
                  [(ngModel)]="settleChannel" 
                  class="form-input text-xs w-full py-2 bg-white font-medium">
                  <option value="GCASH">GCash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CASH">Cash</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Reference No. (Optional)</label>
                <input 
                  type="text" 
                  [(ngModel)]="settleRef" 
                  placeholder="e.g. Ref# / Deposit Slip" 
                  class="form-input text-xs w-full py-2 font-mono"
                />
              </div>
            </div>

            <!-- Notes -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Payout Notes</label>
              <input 
                type="text" 
                [(ngModel)]="settleNotes" 
                placeholder="Optional notes or remarks" 
                class="form-input text-xs w-full py-2"
              />
            </div>

            <!-- Modal Footer Actions -->
            <div class="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button 
                type="button" 
                (click)="closeSettleModal()" 
                class="btn-secondary text-xs px-4 py-2 cursor-pointer font-semibold rounded-xl">
                Cancel
              </button>
              <button 
                type="button" 
                (click)="confirmAndRecordPayout()" 
                class="btn-primary text-xs px-4 py-2 bg-emerald-600 hover:bg-emerald-700 border-emerald-600 cursor-pointer font-semibold rounded-xl shadow-xs">
                Confirm &amp; Record Payout
              </button>
            </div>

          </div>
        </div>
      </div>

      <!-- ── MODAL C: ITEMIZE TRIP & CA BREAKDOWN DRAWER ─────────────────────── -->
      <div *ngIf="inspectingCrew()" 
           appModalTeleport 
           class="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fade-in">
        <div class="card bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
          
          <!-- Header -->
          <div class="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-brand-600 flex items-center justify-center">
                <span class="material-symbols-outlined text-[18px]">badge</span>
              </div>
              <div>
                <h3 class="text-sm font-bold text-slate-900">{{ inspectingCrew()?.crewName }} — Full Ledger</h3>
                <p class="text-[11px] text-slate-500 font-medium">Role: {{ inspectingCrew()?.role }} · Contact: {{ inspectingCrew()?.phone || '—' }}</p>
              </div>
            </div>
            <button (click)="closeBreakdownModal()" class="text-slate-400 hover:text-slate-600 cursor-pointer">
              <span class="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <!-- Content Tabs -->
          <div class="p-5 space-y-4 overflow-y-auto">
            <!-- 1. Trips List -->
            <div>
              <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Completed Trips Credited ({{ inspectingCrew()?.completedTripsCount }})</span>
                <span class="font-mono text-brand-600">Total: ₱{{ inspectingCrew()?.grossTripPay | number:'1.2-2' }}</span>
              </h4>
              <div class="border border-slate-200 rounded-xl overflow-hidden">
                <table class="w-full text-[11px]">
                  <thead class="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th class="p-2 text-left">TLO #</th>
                      <th class="p-2 text-left">Date</th>
                      <th class="p-2 text-left">Route</th>
                      <th class="p-2 text-left">Plate</th>
                      <th class="p-2 text-right">Fixed Pay</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    <tr *ngFor="let t of inspectingCrew()?.trips" class="hover:bg-slate-50">
                      <td class="p-2 font-bold font-mono text-brand-600">TLO #{{ t.tloNumber }}</td>
                      <td class="p-2 text-slate-600">{{ t.deliveredDate || t.dispatchedDate | date:'dd-MMM-yyyy' }}</td>
                      <td class="p-2 text-slate-800">{{ t.origin }} ➔ {{ t.destination }}</td>
                      <td class="p-2 font-mono text-slate-600">{{ t.plateNumber }}</td>
                      <td class="p-2 text-right font-mono font-bold text-slate-900">₱{{ t.rate | number:'1.2-2' }}</td>
                    </tr>
                    <tr *ngIf="!inspectingCrew()?.trips?.length">
                      <td colspan="5" class="p-4 text-center text-slate-400 italic">No trips recorded in this selected cut-off period.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- 2. Cash Advances History -->
            <div>
              <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Cash Advance History</span>
                <span class="font-mono text-amber-600">Active: ₱{{ inspectingCrew()?.outstandingCA | number:'1.2-2' }}</span>
              </h4>
              <div class="border border-slate-200 rounded-xl overflow-hidden">
                <table class="w-full text-[11px]">
                  <thead class="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th class="p-2 text-left">Date</th>
                      <th class="p-2 text-left">Reason / Remarks</th>
                      <th class="p-2 text-center">Status</th>
                      <th class="p-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    <tr *ngFor="let ca of getCrewCashAdvances(inspectingCrew()?.crewId || '')" class="hover:bg-slate-50">
                      <td class="p-2 text-slate-600">{{ ca.date | date:'dd-MMM-yyyy' }}</td>
                      <td class="p-2 text-slate-800">{{ ca.reason }}</td>
                      <td class="p-2 text-center">
                        <span [ngClass]="ca.status === 'PAID' || ca.status === 'DEDUCTED' ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-amber-50 text-amber-700 border-amber-200'"
                              class="px-1.5 py-0.5 rounded text-[10px] font-semibold border">
                          {{ ca.status }}
                        </span>
                      </td>
                      <td class="p-2 text-right font-mono font-bold text-rose-600">₱{{ ca.amount | number:'1.2-2' }}</td>
                    </tr>
                    <tr *ngIf="!getCrewCashAdvances(inspectingCrew()?.crewId || '').length">
                      <td colspan="4" class="p-4 text-center text-slate-400 italic">No cash advance records found for this crew member.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Close Button -->
            <div class="pt-3 border-t border-slate-100 flex justify-end">
              <button 
                type="button" 
                (click)="closeBreakdownModal()" 
                class="btn-secondary text-xs px-4 py-2 cursor-pointer font-semibold rounded-xl">
                Close
              </button>
            </div>
          </div>

        </div>
      </div>

    </div>
  `
})
export class PayrollComponent {
  dispatchStore = inject(DispatchStore);
  fleetStore = inject(FleetStore);

  // Period Signals
  periodType = signal<PayrollPeriodType>('THIS_MONTH');
  customFromDate = signal<string>('');
  customToDate = signal<string>('');

  // Search & Filters
  searchQuery = signal<string>('');
  selectedRoleFilter = signal<'ALL' | 'Driver' | 'Helper'>('ALL');

  // Modal Signals
  isAddCaModalOpen = signal<boolean>(false);
  newCaCrewId = '';
  newCaAmount: number | null = null;
  newCaDate: string = new Date().toISOString().split('T')[0];
  newCaChannel: PayoutChannel = 'GCASH';
  newCaRef = '';
  newCaReason = '';

  // Settle Modal Signals
  settlingCrew = signal<CrewPayrollSummary | null>(null);
  settleDeductionInput: number = 0;
  settleChannel: PayoutChannel = 'GCASH';
  settleRef = '';
  settleNotes = '';

  // Inspect Modal Signal
  inspectingCrew = signal<CrewPayrollSummary | null>(null);

  // ── PERIOD CONFIGURATION ───────────────────────────────────────────────────
  activePeriodConfig = computed<PayrollPeriodConfig>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed

    const pad = (n: number) => n < 10 ? `0${n}` : `${n}`;

    switch (this.periodType()) {
      case '1ST_HALF': {
        const fromDate = `${year}-${pad(month + 1)}-01`;
        const toDate = `${year}-${pad(month + 1)}-15`;
        return {
          type: '1ST_HALF',
          label: `${now.toLocaleString('default', { month: 'short' })} 1–15 Cut-off`,
          fromDate,
          toDate
        };
      }
      case '2ND_HALF': {
        const lastDay = new Date(year, month + 1, 0).getDate();
        const fromDate = `${year}-${pad(month + 1)}-16`;
        const toDate = `${year}-${pad(month + 1)}-${lastDay}`;
        return {
          type: '2ND_HALF',
          label: `${now.toLocaleString('default', { month: 'short' })} 16–${lastDay} Cut-off`,
          fromDate,
          toDate
        };
      }
      case 'THIS_MONTH': {
        const lastDay = new Date(year, month + 1, 0).getDate();
        const fromDate = `${year}-${pad(month + 1)}-01`;
        const toDate = `${year}-${pad(month + 1)}-${lastDay}`;
        return {
          type: 'THIS_MONTH',
          label: `${now.toLocaleString('default', { month: 'long', year: 'numeric' })} Full Month`,
          fromDate,
          toDate
        };
      }
      case 'ALL_PENDING': {
        return {
          type: 'ALL_PENDING',
          label: 'All Completed Trips (Unrestricted)',
          fromDate: '2020-01-01',
          toDate: '2099-12-31'
        };
      }
      case 'CUSTOM': {
        const from = this.customFromDate() || '2020-01-01';
        const to = this.customToDate() || new Date().toISOString().split('T')[0];
        return {
          type: 'CUSTOM',
          label: 'Custom Date Range',
          fromDate: from,
          toDate: to
        };
      }
    }
  });

  setPeriodType(type: PayrollPeriodType) {
    this.periodType.set(type);
  }

  onCustomFromChange(val: string) {
    this.customFromDate.set(val);
    this.periodType.set('CUSTOM');
  }

  onCustomToChange(val: string) {
    this.customToDate.set(val);
    this.periodType.set('CUSTOM');
  }

  // ── REVENUE & TRIP AGGREGATION ENGINE ──────────────────────────────────────
  completedTrips = computed(() => {
    const from = this.activePeriodConfig().fromDate;
    const to = this.activePeriodConfig().toDate;

    return this.dispatchStore.dispatches().filter(t => {
      const isCompleted = t.status === 'COMPLETED' || t.status === 'BILLED';
      if (!isCompleted) return false;

      const tripDate = (t.deliveredDate || t.deliveredAt || t.dispatchedDate || t.dispatchedAt || '').split('T')[0];
      if (!tripDate) return true;
      return tripDate >= from && tripDate <= to;
    });
  });

  payrollSummaries = computed<CrewPayrollSummary[]>(() => {
    const crewList = this.fleetStore.crew();
    const trips = this.completedTrips();

    const map = new Map<string, CrewPayrollSummary>();

    // 1. Initialize for all registered crew members
    for (const c of crewList) {
      const unpaidCaTotal = (c.cashAdvances || [])
        .filter(ca => ca.status === 'UNPAID')
        .reduce((sum, ca) => sum + (Number(ca.amount) || 0), 0);

      map.set(c.id, {
        crewId: c.id,
        crewName: c.name,
        role: c.role,
        phone: c.contactNumber || c.phone,
        completedTripsCount: 0,
        trips: [],
        grossTripPay: 0,
        outstandingCA: unpaidCaTotal,
        approvedDeduction: 0,
        netPayable: 0,
        payoutStatus: 'PENDING'
      });
    }

    // 2. Aggregate from Completed Trips
    for (const trip of trips) {
      const dName = (trip.driverName || trip.truck?.driver?.name || '').trim();
      const hName = (trip.helperName || trip.truck?.helper?.name || '').trim();

      const dRate = Number(trip.payroll?.driverSalary ?? trip.driverSalary ?? 0);
      const hRate = Number(trip.payroll?.helperSalary ?? trip.helperSalary ?? 0);

      const dDate = trip.deliveredDate || trip.deliveredAt || trip.dispatchedDate || '—';
      const orig = trip.route?.origin || trip.origin || 'Subic Port';
      const dest = trip.route?.destination || trip.destination || 'Cargill Pulilan Feeds Mill';
      const plate = trip.truck?.plateNumber || trip.plateNumber || 'CCK 5273';

      // Match Driver
      if (dName && dName !== 'None' && dName !== 'Unassigned') {
        let summary = Array.from(map.values()).find(s => s.role === 'Driver' && s.crewName.toLowerCase() === dName.toLowerCase());
        if (!summary) {
          const fakeId = `driver-${dName.replace(/\s+/g, '-').toLowerCase()}`;
          summary = {
            crewId: fakeId,
            crewName: dName,
            role: 'Driver',
            completedTripsCount: 0,
            trips: [],
            grossTripPay: 0,
            outstandingCA: 0,
            approvedDeduction: 0,
            netPayable: 0,
            payoutStatus: 'PENDING'
          };
          map.set(fakeId, summary);
        }

        summary.completedTripsCount += 1;
        summary.grossTripPay += dRate;
        summary.trips.push({
          tripId: trip.id,
          tripNumber: trip.tripNumber,
          tloNumber: trip.tloNumber,
          deliveredDate: dDate,
          dispatchedDate: trip.dispatchedDate || '',
          origin: orig,
          destination: dest,
          plateNumber: plate,
          rate: dRate
        });
      }

      // Match Helper
      if (hName && hName !== 'None' && hName !== 'Unassigned') {
        let summary = Array.from(map.values()).find(s => s.role === 'Helper' && s.crewName.toLowerCase() === hName.toLowerCase());
        if (!summary) {
          const fakeId = `helper-${hName.replace(/\s+/g, '-').toLowerCase()}`;
          summary = {
            crewId: fakeId,
            crewName: hName,
            role: 'Helper',
            completedTripsCount: 0,
            trips: [],
            grossTripPay: 0,
            outstandingCA: 0,
            approvedDeduction: 0,
            netPayable: 0,
            payoutStatus: 'PENDING'
          };
          map.set(fakeId, summary);
        }

        summary.completedTripsCount += 1;
        summary.grossTripPay += hRate;
        summary.trips.push({
          tripId: trip.id,
          tripNumber: trip.tripNumber,
          tloNumber: trip.tloNumber,
          deliveredDate: dDate,
          dispatchedDate: trip.dispatchedDate || '',
          origin: orig,
          destination: dest,
          plateNumber: plate,
          rate: hRate
        });
      }
    }

    // 3. Finalize Net Payable for each crew
    return Array.from(map.values()).map(s => {
      const net = Math.max(0, s.grossTripPay - s.approvedDeduction);
      let status: 'PENDING' | 'PAID' | 'NO_EARNINGS' = 'PENDING';
      if (s.grossTripPay === 0 && s.completedTripsCount === 0) {
        status = 'NO_EARNINGS';
      }
      return {
        ...s,
        netPayable: net,
        payoutStatus: status
      };
    });
  });

  // ── FILTERED SUMMARIES ─────────────────────────────────────────────────────
  filteredSummaries = computed(() => {
    let list = this.payrollSummaries();

    const role = this.selectedRoleFilter();
    if (role !== 'ALL') {
      list = list.filter(c => c.role === role);
    }

    const q = this.searchQuery().trim().toLowerCase();
    if (q) {
      list = list.filter(c => 
        c.crewName.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q))
      );
    }

    return list.sort((a, b) => b.grossTripPay - a.grossTripPay);
  });

  driverCount = computed(() => this.payrollSummaries().filter(c => c.role === 'Driver').length);
  helperCount = computed(() => this.payrollSummaries().filter(c => c.role === 'Helper').length);

  // ── KPIS ───────────────────────────────────────────────────────────────────
  totalGrossEarnings = computed(() => {
    return this.payrollSummaries().reduce((sum, c) => sum + c.grossTripPay, 0);
  });

  totalDeductions = computed(() => {
    return this.payrollSummaries().reduce((sum, c) => sum + c.approvedDeduction, 0);
  });

  totalNetPayable = computed(() => {
    return this.payrollSummaries().reduce((sum, c) => sum + c.netPayable, 0);
  });

  totalOutstandingCA = computed(() => {
    return this.payrollSummaries().reduce((sum, c) => sum + c.outstandingCA, 0);
  });

  totalGrossEarningsFormatted = computed(() => `₱${this.totalGrossEarnings().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  totalDeductionsFormatted = computed(() => `₱${this.totalDeductions().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  totalNetPayableFormatted = computed(() => `₱${this.totalNetPayable().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  totalOutstandingCAFormatted = computed(() => `₱${this.totalOutstandingCA().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

  // ── CASH ADVANCE ACTIONS ───────────────────────────────────────────────────
  openAddCashAdvanceModal() {
    this.newCaCrewId = '';
    this.newCaAmount = null;
    this.newCaDate = new Date().toISOString().split('T')[0];
    this.newCaChannel = 'GCASH';
    this.newCaRef = '';
    this.newCaReason = '';
    this.isAddCaModalOpen.set(true);
  }

  closeAddCaModal() {
    this.isAddCaModalOpen.set(false);
  }

  async submitCashAdvance() {
    if (!this.newCaCrewId || !this.newCaAmount || this.newCaAmount <= 0) return;

    const record = {
      amount: Number(this.newCaAmount),
      date: this.newCaDate,
      reason: this.newCaReason || 'Personal cash advance',
      status: 'UNPAID' as const
    };

    await this.fleetStore.addCashAdvance(this.newCaCrewId, record);
    this.closeAddCaModal();
  }

  // ── SETTLE PAYOUT ACTIONS ──────────────────────────────────────────────────
  openSettleModal(crew: CrewPayrollSummary) {
    this.settlingCrew.set(crew);
    // Default deduction: min(crew.outstandingCA, crew.grossTripPay)
    this.settleDeductionInput = Math.min(crew.outstandingCA, crew.grossTripPay);
    this.settleChannel = 'GCASH';
    this.settleRef = '';
    this.settleNotes = '';
  }

  closeSettleModal() {
    this.settlingCrew.set(null);
  }

  getLiveNetPayable(): number {
    const c = this.settlingCrew();
    if (!c) return 0;
    const ded = Math.max(0, Number(this.settleDeductionInput) || 0);
    return Math.max(0, c.grossTripPay - ded);
  }

  getLiveRemainingCA(): number {
    const c = this.settlingCrew();
    if (!c) return 0;
    const ded = Math.max(0, Number(this.settleDeductionInput) || 0);
    return Math.max(0, c.outstandingCA - ded);
  }

  async confirmAndRecordPayout() {
    const crew = this.settlingCrew();
    if (!crew) return;

    const ded = Math.max(0, Number(this.settleDeductionInput) || 0);
    const net = this.getLiveNetPayable();
    const date = new Date().toISOString().split('T')[0];

    // 1. Record in fleetStore.recordSalaryPayment
    const salaryRecord: Omit<CrewSalaryRecord, 'id'> = {
      tripNumber: crew.trips.map(t => t.tripNumber || t.tloNumber).join(', ') || 'Cutoff Settlement',
      tloNumber: crew.trips.map(t => t.tloNumber).join(', '),
      grossPay: crew.grossTripPay,
      caDeduction: ded,
      amount: net,
      status: 'PAID',
      date
    };

    await this.fleetStore.recordSalaryPayment(crew.crewId, salaryRecord);

    // 2. Automatically generate and download the payslip PDF voucher
    this.downloadPayslipPdf(crew, {
      periodLabel: this.activePeriodConfig().label,
      payoutDate: formatAppDate(date) || date,
      payoutChannel: this.settleChannel,
      referenceNumber: this.settleRef,
      approvedDeduction: ded,
      notes: this.settleNotes
    });

    this.closeSettleModal();
  }

  // ── INSPECT BREAKDOWN ACTIONS ──────────────────────────────────────────────
  openBreakdownModal(crew: CrewPayrollSummary) {
    this.inspectingCrew.set(crew);
  }

  closeBreakdownModal() {
    this.inspectingCrew.set(null);
  }

  getCrewCashAdvances(crewId: string): CashAdvanceRecord[] {
    const c = this.fleetStore.crew().find(m => m.id === crewId);
    return c?.cashAdvances || [];
  }

  // ── PAYSLIP PDF EXPORT ─────────────────────────────────────────────────────
  downloadPayslipPdf(crew: CrewPayrollSummary, overrideOptions?: any) {
    const date = new Date().toISOString().split('T')[0];
    const options = overrideOptions || {
      periodLabel: this.activePeriodConfig().label,
      payoutDate: formatAppDate(date) || date,
      payoutChannel: 'CASH',
      approvedDeduction: crew.approvedDeduction || 0,
      notes: ''
    };

    const doc = PayslipPdfBuilder.generatePayslipPdf(crew, options);
    const cleanName = crew.crewName.replace(/\s+/g, '_');
    doc.save(`Payslip_${cleanName}_${options.periodLabel.replace(/\s+/g, '_')}.pdf`);
  }

  // ── HELPERS ────────────────────────────────────────────────────────────────
  getInitials(name: string): string {
    if (!name) return 'CR';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  resetFilters() {
    this.searchQuery.set('');
    this.selectedRoleFilter.set('ALL');
  }
}
