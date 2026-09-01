import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type SkeletonVariant = 'card' | 'table-row' | 'stat' | 'line' | 'box';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Card Variant (for Truck / Dispatch Grid cards) -->
    <ng-container *ngIf="variant() === 'card'">
      <div class="card p-5 space-y-4 border border-slate-200/80 bg-white rounded-2xl shadow-xs animate-pulse">
        <!-- Header -->
        <div class="flex items-center justify-between">
          <div class="h-6 w-28 bg-slate-200 rounded-lg skeleton-shimmer"></div>
          <div class="h-6 w-20 bg-slate-200 rounded-full skeleton-shimmer"></div>
        </div>
        <!-- Specs / Subtitle -->
        <div class="h-4 w-36 bg-slate-100 rounded skeleton-shimmer"></div>
        
        <!-- Inner Box (e.g. Crew box) -->
        <div class="p-3 bg-slate-50/80 rounded-xl border border-slate-100 space-y-2">
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 rounded-lg bg-slate-200 skeleton-shimmer"></div>
            <div class="h-3.5 w-32 bg-slate-200 rounded skeleton-shimmer"></div>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 rounded-lg bg-slate-200 skeleton-shimmer"></div>
            <div class="h-3.5 w-28 bg-slate-200 rounded skeleton-shimmer"></div>
          </div>
        </div>

        <!-- Footer Row -->
        <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
          <div class="space-y-1">
            <div class="h-2.5 w-24 bg-slate-100 rounded skeleton-shimmer"></div>
            <div class="h-2.5 w-28 bg-slate-100 rounded skeleton-shimmer"></div>
          </div>
          <div class="flex gap-2">
            <div class="w-7 h-7 rounded-lg bg-slate-200 skeleton-shimmer"></div>
            <div class="w-7 h-7 rounded-lg bg-slate-200 skeleton-shimmer"></div>
          </div>
        </div>
      </div>
    </ng-container>

    <!-- Table Row Variant -->
    <ng-container *ngIf="variant() === 'table-row'">
      <tr class="animate-pulse border-b border-slate-100">
        <td *ngFor="let col of columnsArray()" class="py-3.5 px-4">
          <div class="h-4 bg-slate-200 rounded skeleton-shimmer" [style.width]="col.width"></div>
        </td>
      </tr>
    </ng-container>

    <!-- Stat Card Variant -->
    <ng-container *ngIf="variant() === 'stat'">
      <div class="card p-5 space-y-3 bg-white rounded-2xl border border-slate-100 shadow-xs animate-pulse">
        <div class="flex items-center justify-between">
          <div class="h-3.5 w-24 bg-slate-200 rounded skeleton-shimmer"></div>
          <div class="w-8 h-8 rounded-xl bg-slate-200 skeleton-shimmer"></div>
        </div>
        <div class="h-7 w-32 bg-slate-200 rounded-lg skeleton-shimmer"></div>
        <div class="h-3 w-40 bg-slate-100 rounded skeleton-shimmer"></div>
      </div>
    </ng-container>

    <!-- Generic Line / Box Variant -->
    <ng-container *ngIf="variant() === 'line' || variant() === 'box'">
      <div class="skeleton-shimmer rounded-lg"
           [ngClass]="customClass()"
           [style.height]="height()"
           [style.width]="width()"></div>
    </ng-container>
  `
})
export class SkeletonComponent {
  variant = input<SkeletonVariant>('card');
  count = input<number>(1);
  height = input<string>('1rem');
  width = input<string>('100%');
  customClass = input<string>('');
  columns = input<number>(5);

  columnsArray() {
    const widths = ['70%', '45%', '55%', '60%', '40%', '30%'];
    const cols = [];
    for (let i = 0; i < this.columns(); i++) {
      cols.push({ width: widths[i % widths.length] });
    }
    return cols;
  }
}
