import { 
  Component, 
  input, 
  model, 
  signal, 
  computed, 
  ElementRef, 
  HostListener, 
  inject 
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-combobox',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="relative w-full space-y-1.5 text-left">
      <!-- ── Label Block (Optional) ────────────────────────────────────────── -->
      <label *ngIf="label()" class="block text-xs font-semibold text-slate-700">
        {{ label() }}
        <span *ngIf="required()" class="text-rose-500">*</span>
      </label>

      <!-- ── Input & Trigger Container ─────────────────────────────────────── -->
      <div class="relative flex items-center">
        <!-- Searchable Text Input (Clean Left Padding, No Prefix Icon) -->
        <input 
          type="text"
          [value]="value()"
          (input)="onInputChange($event)"
          (focus)="onInputFocus()"
          [placeholder]="placeholder()"
          [disabled]="disabled()"
          [required]="required()"
          class="form-input text-xs font-semibold w-full transition-all pl-3.5"
          [ngClass]="{
            'pr-16': !!value() && !disabled(),
            'pr-9': !value() && !disabled(),
            'border-rose-400 bg-rose-50/40 text-rose-900': !!error(),
            'bg-slate-100/60 text-slate-400 cursor-not-allowed': disabled()
          }"
        />

        <!-- Right Actions: Clear Button & Dropdown Chevron Toggle -->
        <div class="absolute right-2 flex items-center gap-0.5">
          <!-- Clear Button (Shown only when text exists) -->
          <button 
            *ngIf="value() && !disabled()"
            type="button" 
            (click)="clearValue($event)"
            class="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors cursor-pointer"
            title="Clear text">
            <span class="material-symbols-outlined text-[15px]">close</span>
          </button>

          <!-- Dropdown Chevron Toggle -->
          <button 
            type="button" 
            (click)="toggleDropdown($event)"
            [disabled]="disabled()"
            class="p-1 text-slate-400 hover:text-blue-600 rounded-md transition-transform duration-75 cursor-pointer"
            [ngClass]="{'rotate-180 text-blue-600': isOpen()}"
            title="Toggle options list">
            <span class="material-symbols-outlined text-[18px]">keyboard_arrow_down</span>
          </button>
        </div>
      </div>

      <!-- ── Dropdown Popover Menu (Snappy 75ms Animation) ──────────────────── -->
      <div 
        *ngIf="isOpen() && !disabled()"
        class="absolute z-50 left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200/90 shadow-xl overflow-hidden py-1 max-h-56 overflow-y-auto transition-all duration-75 ease-out">
        
        <!-- Recents Header -->
        <div *ngIf="displayedOptions().length > 0" class="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 bg-slate-50/50">
          <span>Recents</span>
        </div>

        <!-- Filtered Options List -->
        <ul class="divide-y divide-slate-50 text-xs">
          <li *ngFor="let opt of displayedOptions()">
            <button 
              type="button" 
              (click)="selectOption(opt, $event)"
              class="w-full px-3.5 py-2 text-left font-medium flex items-center justify-between hover:bg-blue-50/70 hover:text-blue-900 transition-colors cursor-pointer"
              [ngClass]="{'bg-blue-50 text-blue-900 font-bold': opt === value()}">
              <span class="truncate">{{ opt }}</span>
              <span *ngIf="opt === value()" class="material-symbols-outlined text-blue-600 text-[16px] shrink-0 ml-2">check</span>
            </button>
          </li>
        </ul>

        <!-- Custom Typed Entry Indicator (When user typed something not in list) -->
        <div *ngIf="isCustomEntry()" class="p-2.5 border-t border-slate-100 bg-slate-50 text-[11px] text-slate-600 flex items-center gap-1.5">
          <span class="material-symbols-outlined text-blue-600 text-[14px]">edit_note</span>
          <span>Using: <strong class="text-[#262B35]">"{{ value() }}"</strong></span>
        </div>

        <!-- Empty State if no match -->
        <div *ngIf="displayedOptions().length === 0 && !isCustomEntry()" class="px-3 py-3 text-center text-xs text-slate-400">
          <p>No recents found.</p>
          <p class="text-[10px] text-slate-400 mt-0.5">Type to add new.</p>
        </div>
      </div>

      <!-- ── Error or Hint Message ─────────────────────────────────────────── -->
      <p *ngIf="error()" class="text-[11px] font-medium text-rose-600 mt-1 flex items-center gap-1">
        <span class="material-symbols-outlined text-[13px]">error</span>
        <span>{{ error() }}</span>
      </p>
      <p *ngIf="hint() && !error()" class="text-[10px] text-slate-400 mt-0.5">
        {{ hint() }}
      </p>
    </div>
  `
})
export class ComboboxComponent {
  private el = inject(ElementRef);

  // Inputs
  label = input<string>('');
  placeholder = input<string>('Type or select...');
  options = input<string[]>([]);
  maxDisplay = input<number>(5); // Default top 5 display limit for recents
  required = input<boolean>(false);
  disabled = input<boolean>(false);
  error = input<string>('');
  hint = input<string>('');

  // Two-way bound model value
  value = model<string>('');

  // Dropdown open state
  isOpen = signal<boolean>(false);

  // Displayed options (Filtered by user query, capped at maxDisplay when query is empty)
  displayedOptions = computed(() => {
    const query = (this.value() || '').toLowerCase().trim();
    const list = this.options() || [];
    if (!query) {
      return list.slice(0, this.maxDisplay());
    }
    return list
      .filter(opt => opt.toLowerCase().includes(query))
      .slice(0, this.maxDisplay());
  });

  // Determines if current value is a custom typed string not in options
  isCustomEntry = computed(() => {
    const val = (this.value() || '').trim();
    if (!val) return false;
    const list = this.options() || [];
    return !list.some(opt => opt.toLowerCase() === val.toLowerCase());
  });

  onInputChange(event: Event) {
    const inputVal = (event.target as HTMLInputElement).value;
    this.value.set(inputVal);
    if (!this.isOpen()) {
      this.isOpen.set(true);
    }
  }

  onInputFocus() {
    this.isOpen.set(true);
  }

  toggleDropdown(event: MouseEvent) {
    event.stopPropagation();
    this.isOpen.update(open => !open);
  }

  selectOption(opt: string, event: MouseEvent) {
    event.stopPropagation();
    this.value.set(opt);
    this.isOpen.set(false);
  }

  clearValue(event: MouseEvent) {
    event.stopPropagation();
    this.value.set('');
    this.isOpen.set(true);
  }

  // Instant close when clicking outside
  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    if (!this.el.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }

  // Keyboard accessibility
  @HostListener('keydown.escape')
  onEscape() {
    this.isOpen.set(false);
  }
}
