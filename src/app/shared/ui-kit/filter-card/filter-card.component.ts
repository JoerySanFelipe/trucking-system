import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type FilterCardTheme = 'blue' | 'emerald' | 'amber' | 'coral' | 'neutral' | 'slate' | 'orange' | 'violet';

@Component({
  selector: 'app-filter-card',
  standalone: true,
  imports: [CommonModule],
  host: {
    class: 'block h-full'
  },
  template: `
    <div (click)="selected.emit()"
         [attr.role]="'button'"
         [attr.tabindex]="0"
         (keydown.enter)="selected.emit()"
         (keydown.space)="selected.emit()"
         [ngClass]="getCardClasses()"
         class="card p-4 relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-all cursor-pointer border select-none">
      
      <!-- Card Header: Icon & Label -->
      <div class="flex items-center gap-3 mb-3.5">
        <div [ngClass]="getIconContainerClasses()"
             class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105 shadow-2xs">
          <span class="material-symbols-outlined text-[22px]">{{ icon() }}</span>
        </div>
        <span class="text-xs font-semibold text-slate-700 truncate">{{ label() }}</span>
      </div>

      <!-- Card Body: Value / Count -->
      <div class="flex items-baseline gap-1.5 font-mono tracking-tight tabular-nums">
        <span class="text-3xl font-medium text-[#262B35]">
          <span *ngIf="isCurrency()">₱</span>{{ isCurrency() ? (value() | number:'1.0-0') : value() }}
        </span>
        <span *ngIf="total() !== undefined && total() !== null" class="text-sm font-normal text-slate-400">
          / {{ total() }}
        </span>
      </div>

      <!-- Optional Subtext -->
      <p *ngIf="subtext()" class="text-[11px] text-slate-400 font-medium mt-1 truncate">
        {{ subtext() }}
      </p>
    </div>
  `
})
export class FilterCardComponent {
  label = input.required<string>();
  value = input.required<string | number>();
  total = input<string | number | undefined>(undefined);
  icon = input<string>('analytics');
  theme = input<FilterCardTheme>('blue');
  isActive = input<boolean>(false);
  isCurrency = input<boolean>(false);
  subtext = input<string>('');

  selected = output<void>();

  getCardClasses(): string {
    if (this.isActive()) {
      switch (this.theme()) {
        case 'emerald':
          return 'ring-2 ring-emerald-600/30 border-emerald-600/50 bg-emerald-50/30 shadow-xs';
        case 'amber':
          return 'ring-2 ring-amber-600/30 border-amber-600/50 bg-amber-50/30 shadow-xs';
        case 'orange':
          return 'ring-2 ring-orange-500/30 border-orange-500/50 bg-orange-50/40 shadow-xs';
        case 'violet':
          return 'ring-2 ring-violet-500/30 border-violet-500/50 bg-violet-50/40 shadow-xs';
        case 'coral':
          return 'ring-2 ring-[#FC5555]/30 border-[#FC5555]/50 bg-[#FFF0F0]/50 shadow-xs';
        case 'slate':
        case 'neutral':
          return 'ring-2 ring-slate-800/20 border-slate-700 bg-slate-100 shadow-xs';
        case 'blue':
        default:
          return 'ring-2 ring-[#3361FF]/30 border-[#3361FF]/50 bg-[#F1F4FF]/40 shadow-xs';
      }
    }
    return 'border-slate-200/80 bg-white hover:border-slate-300';
  }

  getIconContainerClasses(): string {
    switch (this.theme()) {
      case 'emerald':
        return 'bg-[#EAFBF1] text-[#169E4E] border-[#A3F2C3]';
      case 'amber':
        return 'bg-amber-50 text-amber-600 border-amber-200';
      case 'orange':
        return 'bg-orange-50 text-orange-600 border-orange-200';
      case 'violet':
        return 'bg-violet-50 text-violet-600 border-violet-200';
      case 'coral':
        return 'bg-[#FFF0F0] text-[#FC5555] border-[#FFC2C2]';
      case 'slate':
      case 'neutral':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'blue':
      default:
        return 'bg-[#F1F4FF] text-[#3361FF] border-[#C2D1FF]';
    }
  }
}
