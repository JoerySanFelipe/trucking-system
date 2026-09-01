import { Component, input, output, effect, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalTeleportDirective } from '../../directives/modal-teleport.directive';

export type ActionModalStep = 'CONFIRM' | 'PROCESSING' | 'SAVING' | 'DELETING' | 'SUCCESS';
export type ActionModalType = 'save' | 'delete' | 'submit' | 'approve' | 'archive';

@Component({
  selector: 'app-action-modal',
  standalone: true,
  imports: [CommonModule, ModalTeleportDirective],
  template: `
    <div *ngIf="isOpen()" 
         appModalTeleport
         class="fixed inset-0 z-50 overflow-y-auto"
         role="dialog"
         aria-modal="true">
      
      <!-- Backdrop Overlay -->
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-fade-in"
           (click)="cancelled.emit()"></div>

      <!-- Centering Flex Wrapper -->
      <div class="flex min-h-full items-center justify-center p-4 text-center sm:p-6">
        <div (click)="$event.stopPropagation()"
             class="relative transform bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in border border-slate-200 p-6 text-center my-auto">
          
          <!-- ── PHASE 1: CONFIRMATION PROMPT ── -->
          <ng-container *ngIf="isConfirmStep()">
            <div [ngClass]="getIconThemeClasses()"
                 class="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 border shadow-xs">
              <span class="material-symbols-outlined text-[24px]">{{ getConfirmIcon() }}</span>
            </div>

            <h3 class="text-base font-semibold text-[#262B35] tracking-tight">
              {{ getConfirmTitle() }}
            </h3>
            
            <p class="text-xs text-slate-500 font-medium mt-1 mb-5">
              {{ getConfirmMessage() }}
            </p>

            <div class="flex items-center justify-center gap-3">
              <button (click)="cancelled.emit()" 
                      type="button" 
                      class="btn-secondary text-xs px-4 py-2 font-medium hover:bg-[#FFF0F0] hover:text-[#FC5555] hover:border-[#FFC2C2] transition-colors cursor-pointer">
                Cancel
              </button>
              <button (click)="confirmed.emit()" 
                      type="button" 
                      [ngClass]="getConfirmButtonClasses()"
                      class="text-xs px-5 py-2 font-medium cursor-pointer shadow-xs transition-all">
                {{ getConfirmButtonText() }}
              </button>
            </div>
          </ng-container>

          <!-- ── PHASE 2: PROCESSING ANIMATION ── -->
          <ng-container *ngIf="isProcessingStep()">
            <div [ngClass]="getProcessingIconThemeClasses()"
                 class="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 border shadow-xs animate-bounce">
              <span class="material-symbols-outlined text-[24px] animate-spin">{{ getProcessingIcon() }}</span>
            </div>

            <h3 class="text-base font-semibold text-[#262B35] tracking-tight">
              {{ getProcessingTitle() }}
            </h3>
            
            <p class="text-xs text-slate-500 font-medium mt-1">
              {{ getProcessingMessage() }}
            </p>

            <div class="mt-4 flex justify-center">
              <div class="h-1.5 w-32 bg-slate-100 rounded-full overflow-hidden">
                <div class="h-full bg-current rounded-full skeleton-shimmer"
                     [ngClass]="actionType() === 'delete' ? 'text-[#FC5555]' : 'text-[#3361FF]'"></div>
              </div>
            </div>
          </ng-container>

          <!-- ── PHASE 3: SUCCESS ANIMATION ── -->
          <ng-container *ngIf="isSuccessStep()">
            <div [ngClass]="getSuccessIconThemeClasses()"
                 class="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 border shadow-xs animate-scale-in">
              <span class="material-symbols-outlined text-[26px]">check_circle</span>
            </div>

            <h3 class="text-base font-semibold text-[#262B35] tracking-tight">
              {{ getSuccessTitle() }}
            </h3>
            
            <p class="text-xs text-slate-500 font-medium mt-1">
              {{ getSuccessMessage() }}
            </p>
          </ng-container>

        </div>
      </div>

    </div>
  `
})
export class ActionModalComponent {
  isOpen = input.required<boolean>();
  step = input.required<ActionModalStep>();
  actionType = input<ActionModalType>('save');
  itemType = input<string>('Record');
  itemLabel = input<string>('');

  // Custom overrides (optional)
  title = input<string>('');
  confirmMessage = input<string>('');
  confirmButtonText = input<string>('');

  confirmed = output<void>();
  cancelled = output<void>();

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
    if (this.isOpen() && this.isConfirmStep()) {
      this.cancelled.emit();
    }
  }

  isConfirmStep(): boolean {
    return this.step() === 'CONFIRM';
  }

  isProcessingStep(): boolean {
    return this.step() === 'PROCESSING' || this.step() === 'SAVING' || this.step() === 'DELETING';
  }

  isSuccessStep(): boolean {
    return this.step() === 'SUCCESS';
  }

  getConfirmTitle(): string {
    if (this.title()) return this.title();
    switch (this.actionType()) {
      case 'delete':
        return `Delete ${this.itemType()}?`;
      case 'submit':
        return `Submit ${this.itemType()}?`;
      case 'approve':
        return `Approve ${this.itemType()}?`;
      case 'save':
      default:
        return `Save ${this.itemType()}?`;
    }
  }

  getConfirmMessage(): string {
    if (this.confirmMessage()) return this.confirmMessage();
    const label = this.itemLabel() ? ` "${this.itemLabel()}"` : '';
    switch (this.actionType()) {
      case 'delete':
        return `Are you sure you want to delete this ${this.itemType().toLowerCase()}${label}? This action cannot be undone.`;
      case 'submit':
        return `Submit this ${this.itemType().toLowerCase()}${label} for official processing?`;
      case 'approve':
        return `Confirm approval for this ${this.itemType().toLowerCase()}${label}?`;
      case 'save':
      default:
        return `Are you sure you want to save the changes made to this ${this.itemType().toLowerCase()}${label}?`;
    }
  }

  getConfirmButtonText(): string {
    if (this.confirmButtonText()) return this.confirmButtonText();
    switch (this.actionType()) {
      case 'delete':
        return 'Yes, Delete';
      case 'submit':
        return 'Yes, Submit';
      case 'approve':
        return 'Yes, Approve';
      case 'save':
      default:
        return 'Yes, Save';
    }
  }

  getConfirmButtonClasses(): string {
    if (this.actionType() === 'delete') {
      return 'bg-[#FC5555] hover:bg-[#E03E3E] text-white rounded-xl';
    }
    return 'btn-primary rounded-xl';
  }

  getConfirmIcon(): string {
    switch (this.actionType()) {
      case 'delete':
        return 'delete';
      case 'submit':
        return 'send';
      case 'approve':
        return 'task_alt';
      case 'save':
      default:
        return 'save';
    }
  }

  getIconThemeClasses(): string {
    if (this.actionType() === 'delete') {
      return 'bg-[#FFF0F0] border-[#FFC2C2] text-[#FC5555]';
    }
    return 'bg-[#F1F4FF] border-[#C2D1FF] text-[#3361FF]';
  }

  getProcessingTitle(): string {
    switch (this.actionType()) {
      case 'delete':
        return `Deleting ${this.itemType()}...`;
      case 'submit':
        return `Submitting ${this.itemType()}...`;
      case 'approve':
        return `Approving ${this.itemType()}...`;
      case 'save':
      default:
        return `Saving ${this.itemType()}...`;
    }
  }

  getProcessingMessage(): string {
    switch (this.actionType()) {
      case 'delete':
        return 'Please wait while the record is being safely deleted.';
      case 'submit':
        return 'Submitting record for processing.';
      case 'approve':
        return 'Applying approval to record.';
      case 'save':
      default:
        return 'Please wait while your changes are being securely saved.';
    }
  }

  getProcessingIcon(): string {
    return 'progress_activity';
  }

  getProcessingIconThemeClasses(): string {
    if (this.actionType() === 'delete') {
      return 'bg-[#FFF0F0] border-[#FFC2C2] text-[#FC5555]';
    }
    return 'bg-[#F1F4FF] border-[#C2D1FF] text-[#3361FF]';
  }

  getSuccessTitle(): string {
    switch (this.actionType()) {
      case 'delete':
        return `${this.itemType()} Deleted!`;
      case 'submit':
        return `${this.itemType()} Submitted!`;
      case 'approve':
        return `${this.itemType()} Approved!`;
      case 'save':
      default:
        return `${this.itemType()} Saved!`;
    }
  }

  getSuccessMessage(): string {
    switch (this.actionType()) {
      case 'delete':
        return 'The record was successfully removed.';
      case 'submit':
        return 'The record has been submitted successfully.';
      case 'approve':
        return 'The record was successfully approved.';
      case 'save':
      default:
        return 'All changes have been successfully saved.';
    }
  }

  getSuccessIconThemeClasses(): string {
    if (this.actionType() === 'delete') {
      return 'bg-[#FFF0F0] border-[#FFC2C2] text-[#FC5555]';
    }
    return 'bg-[#EAFBF1] border-[#A3F2C3] text-[#169E4E]';
  }
}
