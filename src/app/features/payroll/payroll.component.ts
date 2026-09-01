import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface DriverPayroll {
  name: string;
  role: string;
  initials: string;
  tripsThisPeriod: number;
  basePay: number;
  cashAdvance: number;
  netPayable: number;
  totalFreight: number;
}

const PAYROLL_DATA: DriverPayroll[] = [
  { name: 'Jojo Macaraig',  role: 'Lead Driver',  initials: 'JM', tripsThisPeriod: 12, basePay: 42240, cashAdvance: 5000,  netPayable: 37240, totalFreight: 352640 },
  { name: 'Marvin Santos',  role: 'Lead Driver',  initials: 'MS', tripsThisPeriod: 10, basePay: 35200, cashAdvance: 3000,  netPayable: 32200, totalFreight: 294800 },
  { name: 'Roldan Flores',  role: 'Lead Driver',  initials: 'RF', tripsThisPeriod: 11, basePay: 38720, cashAdvance: 4500,  netPayable: 34220, totalFreight: 321980 },
  { name: 'Edwin Reyes',    role: 'Lead Driver',  initials: 'ER', tripsThisPeriod: 9,  basePay: 30600, cashAdvance: 2000,  netPayable: 28600, totalFreight: 268560 },
  { name: 'Dante Cruz',     role: 'Lead Driver',  initials: 'DC', tripsThisPeriod: 8,  basePay: 26880, cashAdvance: 1500,  netPayable: 25380, totalFreight: 235520 },
  { name: 'Ramon Bautista', role: 'Helper',       initials: 'RB', tripsThisPeriod: 12, basePay: 18000, cashAdvance: 0,     netPayable: 18000, totalFreight: 352640 },
  { name: 'Carlo Mendez',   role: 'Helper',       initials: 'CM', tripsThisPeriod: 10, basePay: 15000, cashAdvance: 1000,  netPayable: 14000, totalFreight: 294800 },
  { name: 'Danny Santos',   role: 'Helper',       initials: 'DS', tripsThisPeriod: 11, basePay: 16500, cashAdvance: 0,     netPayable: 16500, totalFreight: 321980 },
];

@Component({
  selector: 'app-payroll',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full space-y-6 animate-fade-in-up">

      <!-- Page Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-slate-900 tracking-tight">Driver Payroll</h1>
          <p class="text-sm text-slate-400 mt-0.5 font-medium">August 2026 · {{ drivers.length }} crew members</p>
        </div>
        <div class="flex items-center gap-2">
          <select class="form-input text-xs py-1.5" style="width:180px;">
            <option>August 2026</option>
            <option>July 2026</option>
            <option>June 2026</option>
          </select>
          <button class="btn-secondary text-xs inline-flex items-center gap-1.5 cursor-pointer">
            <span class="material-symbols-outlined text-[16px]">picture_as_pdf</span>
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      <!-- Liquidation Summary Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger-children">
        <!-- Cash Box -->
        <div class="card-hero p-6 animate-fade-in-up" style="animation-delay:0s;">
          <div class="relative z-10">
            <div class="text-[10px] font-bold uppercase tracking-wider text-blue-200 mb-2">Total Gross Payroll</div>
            <div class="text-3xl font-black text-white" style="letter-spacing:-0.03em;">₱{{ totalGross | number:'1.0-0' }}</div>
            <p class="text-xs text-blue-200 font-medium mt-1.5">Driver + Helper base pay</p>
          </div>
        </div>
        <!-- Deductions -->
        <div class="card p-6 animate-fade-in-up border-l-4 border-l-warning" style="animation-delay:0.05s;">
          <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Cash Advance Deductions</div>
          <div class="text-3xl font-black text-warning" style="letter-spacing:-0.03em;">₱{{ totalDeductions | number:'1.0-0' }}</div>
          <p class="text-xs text-slate-400 font-medium mt-1.5">Total deducted this period</p>
        </div>
        <!-- Net Payable -->
        <div class="card p-6 animate-fade-in-up border-l-4 border-l-success" style="animation-delay:0.10s;">
          <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Net Payable to Crew</div>
          <div class="text-3xl font-black text-success" style="letter-spacing:-0.03em;">₱{{ totalNet | number:'1.0-0' }}</div>
          <p class="text-xs text-slate-400 font-medium mt-1.5">After all deductions</p>
        </div>
      </div>

      <!-- Drivers Section -->
      <div class="card overflow-hidden animate-fade-in-up" style="animation-delay:0.15s;">
        <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 class="text-base font-bold text-slate-900">Payroll Ledger</h2>
          <div class="flex gap-2">
            <button
              (click)="roleFilter.set('ALL')"
              [ngClass]="roleFilter() === 'ALL' ? 'bg-brand-500 text-white' : 'btn-secondary'"
              class="px-3 py-1 rounded-lg text-xs font-bold transition-all">All</button>
            <button
              (click)="roleFilter.set('Lead Driver')"
              [ngClass]="roleFilter() === 'Lead Driver' ? 'bg-brand-500 text-white' : 'btn-secondary'"
              class="px-3 py-1 rounded-lg text-xs font-bold transition-all">Drivers</button>
            <button
              (click)="roleFilter.set('Helper')"
              [ngClass]="roleFilter() === 'Helper' ? 'bg-brand-500 text-white' : 'btn-secondary'"
              class="px-3 py-1 rounded-lg text-xs font-bold transition-all">Helpers</button>
          </div>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>Driver / Helper</th>
              <th>Role</th>
              <th>Trips</th>
              <th>Base Pay</th>
              <th>Cash Advance</th>
              <th>Net Payable</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let d of filteredDrivers(); let i = index"
                class="animate-fade-in-up"
                [style.animation-delay]="(i * 0.04) + 's'">
              <td>
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                       style="background: linear-gradient(135deg, #1E3A5F 0%, #2563EB 100%);">
                    {{ d.initials }}
                  </div>
                  <div>
                    <p class="font-bold text-slate-900 text-sm">{{ d.name }}</p>
                    <p class="text-[10px] text-slate-400">{{ d.tripsThisPeriod }} trips this period</p>
                  </div>
                </div>
              </td>
              <td>
                <span class="badge" [class.badge-brand]="d.role === 'Lead Driver'" [class.badge-neutral]="d.role === 'Helper'">
                  {{ d.role }}
                </span>
              </td>
              <td><span class="font-bold text-slate-900">{{ d.tripsThisPeriod }}</span></td>
              <td><span class="font-black text-slate-900 tabular-nums">₱{{ d.basePay | number:'1.0-0' }}</span></td>
              <td>
                <span *ngIf="d.cashAdvance > 0" class="font-bold text-warning tabular-nums">-₱{{ d.cashAdvance | number:'1.0-0' }}</span>
                <span *ngIf="d.cashAdvance === 0" class="text-xs text-slate-300">—</span>
              </td>
              <td>
                <span class="font-black text-success text-base tabular-nums">₱{{ d.netPayable | number:'1.0-0' }}</span>
              </td>
              <td>
                <span class="badge badge-success">Ready</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  `
})
export class PayrollComponent {
  drivers = PAYROLL_DATA;
  roleFilter = signal<string>('ALL');

  filteredDrivers() {
    if (this.roleFilter() === 'ALL') return this.drivers;
    return this.drivers.filter(d => d.role === this.roleFilter());
  }

  get totalGross()      { return this.drivers.reduce((s, d) => s + d.basePay, 0); }
  get totalDeductions() { return this.drivers.reduce((s, d) => s + d.cashAdvance, 0); }
  get totalNet()        { return this.drivers.reduce((s, d) => s + d.netPayable, 0); }
}
