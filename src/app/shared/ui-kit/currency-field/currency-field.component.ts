import { Component, input, output, signal, effect, ElementRef, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-currency-field',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative rounded-xl w-full">
      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
        <span class="text-slate-400 font-bold text-xs font-mono">₱</span>
      </div>
      <input #inputEl
             type="text"
             inputmode="decimal"
             [value]="displayValue()"
             (focus)="onFocus($event)"
             (input)="onInput($event)"
             (blur)="onBlur()"
             [placeholder]="placeholder()"
             [disabled]="disabled()"
             [attr.aria-label]="label() || 'Amount in Philippine Peso'"
             class="form-input pl-7 pr-3 py-2 w-full text-xs font-mono font-bold text-right tabular-nums text-slate-900 placeholder:text-slate-300 transition-all"
             [ngClass]="[
               inputClass(),
               hasError() ? 'border-rose-400 bg-rose-50/30 text-rose-900' : '',
               disabled() ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white'
             ]">
    </div>
    <p *ngIf="errorMessage()" class="mt-1 text-[11px] text-rose-600 font-medium">{{ errorMessage() }}</p>
  `
})
export class CurrencyFieldComponent {
  value = input<number | null>(null);
  label = input<string>('');
  placeholder = input<string>('0.00');
  disabled = input<boolean>(false);
  hasError = input<boolean>(false);
  errorMessage = input<string>('');
  inputClass = input<string>('');

  valueChange = output<number | null>();

  inputEl = viewChild<ElementRef<HTMLInputElement>>('inputEl');
  displayValue = signal<string>('');
  private isFocused = false;

  constructor() {
    effect(() => {
      const val = this.value();
      // Only format from parent updates when user is NOT actively typing
      if (!this.isFocused) {
        if (val === null || val === undefined || isNaN(val) || val === 0) {
          if (val === 0) {
            this.displayValue.set('0.00');
          } else {
            this.displayValue.set('');
          }
        } else {
          this.displayValue.set(val.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }));
        }
      }
    });
  }

  onFocus(event: FocusEvent) {
    this.isFocused = true;
  }

  onInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let raw = input.value;

    if (!raw || raw.trim() === '') {
      this.displayValue.set('');
      this.valueChange.emit(null);
      return;
    }

    // Filter only digits and single decimal point
    let cleaned = raw.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }

    const intPart = parts[0] || '';
    const hasDecimal = cleaned.includes('.');
    const decPart = parts.length > 1 ? parts[1].slice(0, 2) : '';

    // Format integer part with standard commas on the fly
    const formattedInt = intPart ? intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '';
    
    // Display while typing: formatted integer + decimal (without premature .00)
    let display = formattedInt;
    if (hasDecimal) {
      display += '.' + decPart;
    }

    this.displayValue.set(display);
    input.value = display;

    const num = parseFloat(cleaned);
    this.valueChange.emit(isNaN(num) ? null : num);
  }

  onBlur() {
    this.isFocused = false;
    const val = this.displayValue();
    if (!val || val.trim() === '') {
      this.displayValue.set('');
      this.valueChange.emit(null);
      return;
    }

    const cleanNum = parseFloat(val.replace(/,/g, ''));
    if (isNaN(cleanNum)) {
      this.displayValue.set('');
      this.valueChange.emit(null);
    } else {
      // Auto-format decimals on blur
      const formatted = cleanNum.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      this.displayValue.set(formatted);
      this.valueChange.emit(cleanNum);
    }
  }
}
