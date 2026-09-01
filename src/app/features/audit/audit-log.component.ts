import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface AuditLog {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW' | 'EXPORT';
  entity: string;
  detail: string;
  user: string;
  initials: string;
  timestamp: string;
  module: string;
}

const AUDIT_DATA: AuditLog[] = [
  { id: 'AUD-001', action: 'CREATE',  entity: 'Trip Dispatch', detail: 'New dispatch created — TLO #904820 (RHA 965, Dante Cruz)',       user: 'Joemar Porbido', initials: 'JP', timestamp: 'Aug 5, 2026 · 07:14 AM', module: 'Dispatch' },
  { id: 'AUD-002', action: 'UPDATE',  entity: 'Trip Status',   detail: 'TLO #904816 status changed: UNBILLED → FOR_CHECKING',           user: 'Joemar Porbido', initials: 'JP', timestamp: 'Aug 5, 2026 · 07:32 AM', module: 'Trips' },
  { id: 'AUD-003', action: 'UPDATE',  entity: 'Trip Status',   detail: 'TLO #904819 status changed: FOR_CHECKING → BILLED',             user: 'Joemar Porbido', initials: 'JP', timestamp: 'Aug 5, 2026 · 08:00 AM', module: 'Trips' },
  { id: 'AUD-004', action: 'CREATE',  entity: 'Trip Dispatch', detail: 'New dispatch created — TLO #904818 (CAK 2693, Roldan Flores)',   user: 'Joemar Porbido', initials: 'JP', timestamp: 'Aug 5, 2026 · 08:45 AM', module: 'Dispatch' },
  { id: 'AUD-005', action: 'EXPORT',  entity: 'Payroll Report', detail: 'August 2026 payroll report exported to PDF',                   user: 'Joemar Porbido', initials: 'JP', timestamp: 'Aug 4, 2026 · 05:20 PM', module: 'Payroll' },
  { id: 'AUD-006', action: 'UPDATE',  entity: 'POD Receipt',    detail: 'TLO #904816 POD flagged — blurry image, pending re-upload',    user: 'Joemar Porbido', initials: 'JP', timestamp: 'Aug 4, 2026 · 04:10 PM', module: 'Trips' },
  { id: 'AUD-007', action: 'UPDATE',  entity: 'Billing Record', detail: 'TLO #904817 marked as AMOUNT_DISCREPANCY — ₱440 variance',    user: 'Joemar Porbido', initials: 'JP', timestamp: 'Aug 4, 2026 · 03:55 PM', module: 'Billing' },
  { id: 'AUD-008', action: 'VIEW',    entity: 'Reports',        detail: 'Monthly freight revenue report viewed — Aug 2026',             user: 'Joemar Porbido', initials: 'JP', timestamp: 'Aug 4, 2026 · 02:30 PM', module: 'Reports' },
  { id: 'AUD-009', action: 'CREATE',  entity: 'Trip Dispatch', detail: 'New dispatch created — TLO #904817 (NAK 2202, Marvin Santos)',  user: 'Joemar Porbido', initials: 'JP', timestamp: 'Aug 4, 2026 · 07:00 AM', module: 'Dispatch' },
  { id: 'AUD-010', action: 'DELETE',  entity: 'Draft Record',   detail: 'Draft dispatch (unsaved) cleared by user',                    user: 'Joemar Porbido', initials: 'JP', timestamp: 'Aug 3, 2026 · 06:55 PM', module: 'Dispatch' },
];

const ACTION_STYLE: Record<string, {bg: string; text: string; label: string}> = {
  CREATE: { bg: '#F0FDF4', text: '#15803D', label: 'Create'  },
  UPDATE: { bg: '#EFF6FF', text: '#1D4ED8', label: 'Update'  },
  DELETE: { bg: '#FEF2F2', text: '#B91C1C', label: 'Delete'  },
  VIEW:   { bg: '#F8FAFC', text: '#475569', label: 'View'    },
  EXPORT: { bg: '#FFFBEB', text: '#B45309', label: 'Export'  },
};

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full space-y-6 animate-fade-in-up">

      <!-- Page Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-slate-900 tracking-tight">Security Audit</h1>
          <p class="text-sm text-slate-400 mt-0.5 font-medium">System activity & change log</p>
        </div>
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-1.5">
            <div class="w-2 h-2 rounded-full bg-success animate-pulse-slow"></div>
            <span class="text-xs text-slate-500 font-medium">Audit logging active</span>
          </div>
          <button class="btn-secondary text-xs gap-1.5 inline-flex items-center cursor-pointer">
            <span class="material-symbols-outlined text-[16px]">filter_list</span>
            <span>Filter</span>
          </button>
        </div>
      </div>

      <!-- Stats Row -->
      <div class="grid grid-cols-2 lg:grid-cols-5 gap-3 stagger-children">
        <div *ngFor="let s of actionStats; let i = index"
             class="card p-4 animate-fade-in-up" [style.animation-delay]="(i*0.04)+'s'">
          <div class="text-lg font-black" [style.color]="s.color">{{ s.count }}</div>
          <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{{ s.label }}</div>
        </div>
      </div>

      <!-- Timeline Log -->
      <div class="card overflow-hidden animate-fade-in-up" style="animation-delay:0.20s;">
        <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 class="text-base font-bold text-slate-900">Activity Timeline</h2>
          <span class="text-xs text-slate-400 font-medium">{{ logs.length }} events logged</span>
        </div>
        <div class="divide-y divide-slate-50">
          <div *ngFor="let log of logs; let i = index"
               class="px-6 py-4 flex items-start gap-4 hover:bg-slate-50/70 transition-colors animate-fade-in-up"
               [style.animation-delay]="(i * 0.03) + 's'">

            <!-- Timeline dot + line -->
            <div class="flex flex-col items-center flex-shrink-0 mt-1">
              <div class="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                   [style.background]="actionStyle(log.action).bg"
                   [style.color]="actionStyle(log.action).text">
                {{ log.id.split('-')[1] }}
              </div>
              <div *ngIf="i < logs.length - 1" class="w-px flex-1 bg-slate-100 mt-2" style="min-height:16px;"></div>
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-4 flex-wrap">
                <div class="flex items-center gap-2 flex-wrap">
                  <!-- Action badge -->
                  <span class="badge text-[10px] font-bold"
                        [style.background]="actionStyle(log.action).bg"
                        [style.color]="actionStyle(log.action).text"
                        [style.border-color]="actionStyle(log.action).bg">
                    {{ actionStyle(log.action).label }}
                  </span>
                  <!-- Module badge -->
                  <span class="badge badge-neutral text-[10px]">{{ log.module }}</span>
                  <!-- Entity -->
                  <span class="text-xs font-bold text-slate-700">{{ log.entity }}</span>
                </div>
                <span class="text-[10px] text-slate-400 font-medium flex-shrink-0">{{ log.timestamp }}</span>
              </div>
              <p class="text-xs text-slate-500 font-medium mt-1.5">{{ log.detail }}</p>
              <div class="flex items-center gap-1.5 mt-2">
                <div class="w-5 h-5 rounded-md flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                     style="background: linear-gradient(135deg, #1E3A5F 0%, #2563EB 100%);">
                  {{ log.initials }}
                </div>
                <span class="text-[10px] text-slate-400 font-medium">{{ log.user }}</span>
              </div>
            </div>

          </div>
        </div>
      </div>

    </div>
  `
})
export class AuditLogComponent {
  logs = AUDIT_DATA;

  actionStyle(action: string) {
    return ACTION_STYLE[action] ?? ACTION_STYLE['VIEW'];
  }

  get actionStats() {
    const counts: Record<string, number> = {};
    this.logs.forEach(l => { counts[l.action] = (counts[l.action] || 0) + 1; });
    return Object.keys(ACTION_STYLE).map(k => ({
      label:  ACTION_STYLE[k].label,
      count:  counts[k] || 0,
      color:  ACTION_STYLE[k].text,
    }));
  }
}
