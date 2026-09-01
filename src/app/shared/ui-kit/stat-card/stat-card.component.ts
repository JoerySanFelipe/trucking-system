import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card p-5 relative overflow-hidden flex flex-col justify-between h-full animate-fade-in-up"
         [attr.aria-busy]="loading()"
         [attr.aria-label]="label() + ': ' + (loading() ? 'Loading' : value())">
      
      <!-- Skeleton Loading Shimmer -->
      <div *ngIf="loading()" class="space-y-3 animate-pulse" aria-hidden="true">
        <div class="flex justify-between items-center">
          <div class="h-3 bg-slate-200 rounded w-24"></div>
          <div class="w-8 h-8 bg-slate-200 rounded-lg"></div>
        </div>
        <div class="h-8 bg-slate-200 rounded w-36"></div>
        <div class="h-3 bg-slate-100 rounded w-28"></div>
      </div>

      <!-- Live Content State -->
      <div *ngIf="!loading()" class="flex flex-col justify-between h-full">
        <div class="flex items-center justify-between mb-2">
          <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">{{ label() }}</span>
          <div *ngIf="hasIcon()" class="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50 text-brand-blue shrink-0 shadow-2xs">
            <ng-content select="[icon]"></ng-content>
          </div>
        </div>

        <div>
          <div class="text-2xl sm:text-3xl font-bold text-slate-900 font-mono tabular-nums tracking-tight">
            {{ isCurrency() ? ('₱' + (value() | number:'1.2-2')) : value() }}
          </div>
          
          <div class="flex items-center justify-between mt-2 text-xs">
            <span *ngIf="subtext()" class="text-slate-400 font-medium truncate">{{ subtext() }}</span>
            <span *ngIf="trendText()" 
                  class="font-bold px-1.5 py-0.5 rounded text-[10px] ml-auto shrink-0"
                  [ngClass]="trendType() === 'UP' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'">
              {{ trendText() }}
            </span>
          </div>
        </div>
      </div>

    </div>
  `
})
export class StatCardComponent {
  label = input.required<string>();
  value = input.required<string | number>();
  loading = input<boolean>(false);
  isCurrency = input<boolean>(false);
  subtext = input<string>('');
  trendText = input<string>('');
  trendType = input<'UP' | 'DOWN'>('UP');
  hasIcon = input<boolean>(true);
}
