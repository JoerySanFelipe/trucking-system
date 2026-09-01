import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface RoutePerf {
  route: string;
  trips: number;
  totalFreight: number;
  avgTonnage: number;
}

const ROUTE_PERF: RoutePerf[] = [
  { route: 'Subic Port → Cargill Pulilan',  trips: 48, totalFreight: 1422480, avgTonnage: 26.2 },
  { route: 'Cargill Pulilan → Cargill Iloilo', trips: 3,  totalFreight: 432000,  avgTonnage: 0     },
  { route: 'Cargill Iloilo → Manila Container', trips: 2,  totalFreight: 191000,  avgTonnage: 0     },
];

const MONTHLY_DATA = [
  { month: 'Mar', freight: 890000 },
  { month: 'Apr', freight: 1050000 },
  { month: 'May', freight: 980000 },
  { month: 'Jun', freight: 1240000 },
  { month: 'Jul', freight: 1380000 },
  { month: 'Aug', freight: 1422480 },
];

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full space-y-6 animate-fade-in-up">

      <!-- Page Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-slate-900 tracking-tight">Reports & Statements</h1>
          <p class="text-sm text-slate-400 mt-0.5 font-medium">Financial overview · August 2026</p>
        </div>
        <div class="flex gap-2">
          <select class="form-input text-xs py-1.5" style="width:160px;">
            <option>August 2026</option>
            <option>July 2026</option>
          </select>
          <button class="btn-primary text-xs inline-flex items-center gap-1.5 shadow-xs cursor-pointer">
            <span class="material-symbols-outlined text-[16px]">download</span>
            <span>Export Report</span>
          </button>
        </div>
      </div>

      <!-- KPI Row -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        <div class="card p-5 animate-fade-in-up" style="animation-delay:0s;">
          <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Total Freight Revenue</div>
          <div class="text-2xl font-black text-slate-900 tabular-nums">₱2.04M</div>
          <div class="text-xs text-emerald-700 font-semibold mt-1.5 inline-flex items-center gap-1">
            <span class="material-symbols-outlined text-[14px]">trending_up</span>
            <span>+14.2% vs last month</span>
          </div>
        </div>
        <div class="card p-5 animate-fade-in-up" style="animation-delay:0.05s;">
          <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Total Trips</div>
          <div class="text-2xl font-black text-slate-900">53</div>
          <div class="text-xs text-slate-400 font-medium mt-1.5">5 trucks · Aug 2026</div>
        </div>
        <div class="card p-5 animate-fade-in-up" style="animation-delay:0.10s;">
          <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Net Company Profit</div>
          <div class="text-2xl font-black text-success tabular-nums">₱890K</div>
          <div class="text-xs text-slate-400 font-medium mt-1.5">After all deductions</div>
        </div>
        <div class="card p-5 animate-fade-in-up" style="animation-delay:0.15s;">
          <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Avg Freight/Trip</div>
          <div class="text-2xl font-black text-slate-900 tabular-nums">₱28.4K</div>
          <div class="text-xs text-slate-400 font-medium mt-1.5">Based on 53 trips</div>
        </div>
      </div>

      <!-- Charts + Route Performance -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">

        <!-- Monthly Chart (spans 2 cols) -->
        <div class="lg:col-span-2 card p-6 animate-fade-in-up" style="animation-delay:0.20s;">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h2 class="text-base font-bold text-slate-900">Monthly Freight Revenue</h2>
              <p class="text-xs text-slate-400 font-medium mt-0.5">Mar–Aug 2026</p>
            </div>
            <span class="badge badge-success">↑ Trending Up</span>
          </div>
          <!-- Bar chart (SVG inline) -->
          <div class="flex items-end gap-3 h-40 px-2">
            <div *ngFor="let m of monthlyData; let i = index"
                 class="flex-1 flex flex-col items-center gap-1.5 group animate-fade-in-up"
                 [style.animation-delay]="(i * 0.05) + 's'">
              <span class="text-[10px] font-bold text-slate-400 group-hover:text-brand-500 transition-colors tabular-nums">
                ₱{{ (m.freight / 1000000).toFixed(1) }}M
              </span>
              <div class="w-full rounded-t-lg transition-all duration-300 group-hover:opacity-90"
                   [style.height]="getBarHeight(m.freight)"
                   [style.background]="i === monthlyData.length - 1
                     ? 'linear-gradient(180deg, #1D4ED8 0%, #2563EB 100%)'
                     : '#E2E8F0'">
              </div>
              <span class="text-[10px] font-bold text-slate-400">{{ m.month }}</span>
            </div>
          </div>
        </div>

        <!-- Route Performance -->
        <div class="card p-6 animate-fade-in-up" style="animation-delay:0.20s;">
          <h2 class="text-base font-bold text-slate-900 mb-4">Route Performance</h2>
          <div class="space-y-4">
            <div *ngFor="let r of routePerf; let i = index" class="animate-fade-in-up" [style.animation-delay]="(i*0.05)+'s'">
              <div class="flex justify-between text-xs mb-1.5">
                <span class="font-semibold text-slate-700 text-[11px]">{{ r.route }}</span>
                <span class="font-black text-brand-500 tabular-nums">{{ r.trips }}</span>
              </div>
              <div class="w-full bg-slate-100 rounded-full h-2">
                <div class="h-2 rounded-full transition-all duration-500"
                     style="background: linear-gradient(90deg, #1D4ED8 0%, #2563EB 100%);"
                     [style.width]="(r.trips / 48 * 100) + '%'">
                </div>
              </div>
              <div class="flex justify-between mt-1">
                <span class="text-[10px] text-slate-400">{{ r.trips }} trips</span>
                <span class="text-[10px] font-bold text-slate-600 tabular-nums">₱{{ (r.totalFreight/1000000).toFixed(2) }}M</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Top Drivers Table -->
      <div class="card overflow-hidden animate-fade-in-up" style="animation-delay:0.25s;">
        <div class="px-6 py-4 border-b border-slate-100">
          <h2 class="text-base font-bold text-slate-900">Top Drivers by Freight</h2>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Driver</th>
              <th>Trips</th>
              <th>Total Freight</th>
              <th>Performance</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let d of topDrivers; let i = index" class="animate-fade-in-up" [style.animation-delay]="(i*0.04)+'s'">
              <td>
                <span class="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black"
                      [style.background]="i === 0 ? '#FEF9C3' : i === 1 ? '#F1F5F9' : '#FEF6EE'"
                      [style.color]="i === 0 ? '#A16207' : i === 1 ? '#475569' : '#C2410C'">
                  {{ i + 1 }}
                </span>
              </td>
              <td>
                <div class="flex items-center gap-2">
                  <div class="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                       style="background: linear-gradient(135deg, #1E3A5F 0%, #2563EB 100%);">
                    {{ d.initials }}
                  </div>
                  <div>
                    <p class="text-sm font-bold text-slate-900">{{ d.name }}</p>
                    <p class="text-xs text-slate-400">{{ d.plate }}</p>
                  </div>
                </div>
              </td>
              <td><span class="font-bold">{{ d.trips }}</span></td>
              <td><span class="font-black text-success tabular-nums">₱{{ d.freight | number:'1.0-0' }}</span></td>
              <td>
                <div class="w-24 bg-slate-100 rounded-full h-1.5">
                  <div class="h-1.5 rounded-full" style="background:#2563EB;"
                       [style.width]="(d.freight / 352640 * 100) + '%'"></div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  `
})
export class ReportsComponent {
  monthlyData = MONTHLY_DATA;
  routePerf = ROUTE_PERF;
  maxFreight = Math.max(...MONTHLY_DATA.map(m => m.freight));

  topDrivers = [
    { name: 'Jojo Macaraig',  initials: 'JM', plate: 'CCK 5273', trips: 12, freight: 352640 },
    { name: 'Roldan Flores',  initials: 'RF', plate: 'CAK 2693', trips: 11, freight: 321980 },
    { name: 'Marvin Santos',  initials: 'MS', plate: 'NAK 2202', trips: 10, freight: 294800 },
    { name: 'Edwin Reyes',    initials: 'ER', plate: 'CAO 3510', trips: 9,  freight: 268560 },
    { name: 'Dante Cruz',     initials: 'DC', plate: 'RHA 965',  trips: 8,  freight: 235520 },
  ];

  getBarHeight(freight: number): string {
    const pct = freight / this.maxFreight;
    return (pct * 120) + 'px';
  }
}
