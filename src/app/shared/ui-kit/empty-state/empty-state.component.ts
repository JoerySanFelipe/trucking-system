import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card p-10 text-center flex flex-col items-center justify-center max-w-lg mx-auto space-y-4 border-dashed border-2 border-slate-200 my-6 animate-scale-in"
         role="status">
      
      <!-- Icon Container -->
      <div class="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shadow-xs">
        <span class="material-symbols-outlined text-[28px] text-slate-400">
          {{ icon() === 'search' ? 'search_off' : icon() === 'truck' ? 'local_shipping' : 'description' }}
        </span>
      </div>

      <div class="space-y-1">
        <h3 class="text-base font-bold text-slate-900 tracking-tight">{{ title() }}</h3>
        <p class="text-xs text-slate-500 max-w-sm font-medium leading-relaxed">{{ description() }}</p>
      </div>

      <!-- Action Button -->
      <div *ngIf="actionLabel()" class="pt-2">
        <button (click)="actionClicked.emit()"
                type="button"
                class="btn-primary text-xs py-2 px-5 shadow-sm inline-flex items-center gap-2">
          {{ actionLabel() }}
        </button>
      </div>

    </div>
  `
})
export class EmptyStateComponent {
  icon = input<'search' | 'document' | 'truck'>('document');
  title = input.required<string>();
  description = input.required<string>();
  actionLabel = input<string>('');
  actionClicked = output<void>();
}
