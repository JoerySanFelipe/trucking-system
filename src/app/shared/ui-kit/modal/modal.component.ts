import { Component, input, output, HostListener, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalTeleportDirective } from '../../directives/modal-teleport.directive';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule, ModalTeleportDirective],
  template: `
    <div *ngIf="isOpen()" 
         appModalTeleport
         class="fixed inset-0 z-50 overflow-y-auto"
         role="dialog"
         aria-modal="true"
         [attr.aria-labelledby]="modalId() + '-title'">
      
      <!-- Backdrop Overlay -->
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-fade-in"
           (click)="onBackdropClick()"></div>

      <!-- Centering Flex Wrapper -->
      <div class="flex min-h-full items-center justify-center p-4 text-center sm:p-6">
        <!-- Modal Container -->
        <div class="relative transform bg-white rounded-2xl shadow-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-scale-in border border-slate-200 my-auto text-left"
             [ngClass]="{
               'max-w-md': size() === 'sm',
               'max-w-xl': size() === 'md',
               'max-w-3xl': size() === 'lg',
               'max-w-5xl': size() === 'xl'
             }">
          
          <!-- Header -->
          <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
            <div>
              <h2 [id]="modalId() + '-title'" class="text-base font-semibold text-[#262B35] tracking-tight">{{ title() }}</h2>
              <p *ngIf="subtitle()" class="text-xs text-slate-400 font-medium mt-0.5">{{ subtitle() }}</p>
            </div>
            <button *ngIf="showCloseButton()"
                    (click)="closed.emit()" 
                    type="button"
                    aria-label="Close dialog"
                    class="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer">
              <span class="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <!-- Body -->
          <div class="p-6 overflow-y-auto custom-scrollbar flex-1">
            <ng-content></ng-content>
          </div>

          <!-- Footer -->
          <div *ngIf="hasFooter()" class="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
            <ng-content select="[footer]"></ng-content>
          </div>

        </div>
      </div>

    </div>
  `
})
export class ModalComponent {
  isOpen = input.required<boolean>();
  title = input.required<string>();
  subtitle = input<string>('');
  size = input<'sm' | 'md' | 'lg' | 'xl'>('md');
  hasFooter = input<boolean>(true);
  closeOnBackdrop = input<boolean>(false);
  showCloseButton = input<boolean>(false);
  modalId = input<string>('modal-' + Math.random().toString(36).substring(2, 7));

  closed = output<void>();

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    });
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.isOpen()) {
      this.closed.emit();
    }
  }

  onBackdropClick() {
    if (this.closeOnBackdrop()) {
      this.closed.emit();
    }
  }
}
