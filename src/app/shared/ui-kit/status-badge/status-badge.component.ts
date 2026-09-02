import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border font-mono tracking-tight"
          [ngClass]="badgeClass()">
      <span *ngIf="showDot()" class="w-1.5 h-1.5 rounded-full" [ngClass]="dotClass()"></span>
      <span>{{ displayLabel() }}</span>
    </span>
  `
})
export class StatusBadgeComponent {
  status = input.required<string>();
  label = input<string>('');
  showDot = input<boolean>(true);
  variant = input<'auto' | 'brand' | 'success' | 'warning' | 'danger' | 'neutral'>('auto');

  displayLabel = computed(() => {
    if (this.label()) return this.label();
    const s = this.status()?.toUpperCase().replace(/\s+/g, '_');
    if (s === 'POD_SUBMITTED' || s === 'ARRIVED') return 'Arrived';
    if (s === 'IN_TRANSIT') return 'In Transit';
    if (s === 'FOR_REVIEW') return 'For Review';
    if (s === 'DISPATCHED') return 'Dispatched';
    if (s === 'COMPLETED') return 'Completed';
    return this.status();
  });

  badgeClass = computed(() => {
    const v = this.variant();
    if (v !== 'auto') {
      switch (v) {
        case 'brand': return 'bg-[#F1F4FF] text-[#3361FF] border-[#C2D1FF]';
        case 'success': return 'bg-[#EAFBF1] text-[#169E4E] border-[#A3F2C3]';
        case 'warning': return 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]';
        case 'danger': return 'bg-[#FFF0F0] text-[#FC5555] border-[#FFC2C2]';
        default: return 'bg-[#EDEFF2] text-[#262B35] border-[#D1D5DB]';
      }
    }

    const s = this.status().toUpperCase().replace(/\s+/g, '_');
    switch (s) {
      // 🟢 Success / Active / Available / Paid
      case 'AVAILABLE':
      case 'ACTIVE':
      case 'ARRIVED':
      case 'POD_SUBMITTED':
      case 'SUBMITTED':
      case 'PAID':
      case 'CONFIRMED':
      case 'RESOLVED':
      case 'MATCHED':
      case 'BALANCED':
      case 'FULLY_RECONCILED':
        return 'bg-[#EAFBF1] text-[#169E4E] border-[#A3F2C3]';

      // 🔵 Blue / In Transit / In Billing / Draft
      case 'IN_TRANSIT':
      case 'IN_BILLING':
      case 'DRAFT':
      case 'IN_REVIEW':
        return 'bg-[#F1F4FF] text-[#3361FF] border-[#C2D1FF]';

      // 🟠 Orange / Maintenance / On Leave / Review
      case 'MAINTENANCE':
      case 'ON_LEAVE':
      case 'FOR_REVIEW':
      case 'UNDERPAID':
      case 'AMOUNT_MISMATCH':
      case 'DETAIL_MISMATCH':
      case 'UNBILLED_FOLLOWUP':
        return 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]';

      // 🔴 Coral Red / Inactive / Danger / Deficit
      case 'INACTIVE':
      case 'DISPUTED':
      case 'DUPLICATE_REFERENCE':
      case 'MISSING_IN_CLIENT':
      case 'MISSING_IN_PORBIDO':
      case 'DEFICIT':
      case 'CANCELLED':
        return 'bg-[#FFF0F0] text-[#FC5555] border-[#FFC2D1]';

      case 'DISPATCHED':
      case 'UNPAID':
      case 'OPEN':
      default:
        return 'bg-[#EDEFF2] text-[#262B35] border-[#D1D5DB]';
    }
  });

  dotClass = computed(() => {
    const s = this.status().toUpperCase().replace(/\s+/g, '_');
    const v = this.variant();
    if (v === 'brand' || s === 'IN_TRANSIT' || s === 'IN_BILLING') return 'bg-[#3361FF]';
    if (v === 'success' || s === 'AVAILABLE' || s === 'ACTIVE' || s === 'ARRIVED' || s === 'POD_SUBMITTED' || s === 'PAID' || s === 'RESOLVED') return 'bg-[#29CC6A]';
    if (v === 'warning' || s === 'MAINTENANCE' || s === 'ON_LEAVE' || s === 'FOR_REVIEW' || s === 'UNDERPAID') return 'bg-[#D97706]';
    if (v === 'danger' || s === 'INACTIVE' || s === 'DISPUTED' || s === 'MISSING_IN_CLIENT') return 'bg-[#FC5555]';
    return 'bg-slate-400';
  });
}

