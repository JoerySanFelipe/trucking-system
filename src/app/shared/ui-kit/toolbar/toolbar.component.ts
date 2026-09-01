import { Component, input, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  host: {
    class: 'block w-full'
  },
  template: `
    <div class="card p-3 grid grid-cols-1 md:grid-cols-[auto_1fr_auto] items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl shadow-xs">
      
      <!-- ── Left Slot: Filters & Dropdowns ── -->
      <div class="flex flex-wrap items-center gap-2 justify-start shrink-0">
        <ng-content select="[filters]"></ng-content>
      </div>

      <!-- ── Center: Search Input Bar (True Mathematical Center) ── -->
      <div *ngIf="showSearch()" class="flex items-center justify-center w-full px-2">
        <div class="relative w-full max-w-sm">
          <span class="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] pointer-events-none select-none z-10 flex items-center justify-center">
            search
          </span>
          <input 
            type="text" 
            [ngModel]="searchQuery()" 
            (ngModelChange)="searchQuery.set($event)"
            [placeholder]="searchPlaceholder()" 
            class="w-full !pl-9 pr-8 py-2 text-xs font-normal bg-white rounded-xl border border-slate-200/90 focus:border-[#3361FF] focus:ring-2 focus:ring-[#3361FF]/20 text-[#262B35] placeholder:text-slate-400 h-9 transition-all outline-none">
          <button 
            *ngIf="searchQuery()" 
            (click)="searchQuery.set('')"
            type="button"
            aria-label="Clear search input"
            class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-center z-10">
            <span class="material-symbols-outlined text-[14px]">close</span>
          </button>
        </div>
      </div>

      <!-- ── Right Slot: Tab Switchers & Main Action Buttons ── -->
      <div class="flex items-center gap-2.5 justify-end shrink-0 ml-auto md:ml-0">
        <ng-content select="[tabs]"></ng-content>
        <ng-content select="[actions]"></ng-content>
      </div>

    </div>
  `
})
export class ToolbarComponent {
  searchQuery = model<string>('');
  searchPlaceholder = input<string>('Search Record');
  showSearch = input<boolean>(true);
}
