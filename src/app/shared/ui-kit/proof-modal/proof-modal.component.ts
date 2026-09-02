import { Component, input, output, signal, HostListener, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalTeleportDirective } from '../../directives/modal-teleport.directive';

@Component({
  selector: 'app-proof-modal',
  standalone: true,
  imports: [CommonModule, ModalTeleportDirective],
  template: `
    <div *ngIf="isOpen()" 
         appModalTeleport
         class="fixed inset-0 z-50 overflow-y-auto"
         role="dialog"
         aria-modal="true">
      
      <!-- Backdrop Overlay -->
      <div class="fixed inset-0 bg-slate-900/70 backdrop-blur-xs transition-opacity animate-fade-in"
           (click)="onClose()"></div>

      <!-- Centering Flex Wrapper -->
      <div class="flex min-h-full items-center justify-center p-4 text-center sm:p-6">
        <!-- Modal Container -->
        <div (click)="$event.stopPropagation()"
             class="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl border border-slate-200 w-full max-w-lg my-auto animate-scale-in">
          
          <!-- Header -->
          <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
            <div>
              <h3 class="font-bold text-sm text-slate-900">{{ title() }}</h3>
              <p *ngIf="subtitle()" class="text-xs text-slate-400 font-medium mt-0.5">{{ subtitle() }}</p>
            </div>
            <button 
              type="button"
              (click)="onClose()" 
              class="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100 cursor-pointer">
              <span class="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <!-- Body Content -->
          <div class="p-6 space-y-4">
            
            <!-- ── MODE A: VIEW ATTACHED IMAGE ── -->
            <div *ngIf="imageUrl()" class="space-y-4">
              <div class="rounded-xl overflow-hidden border border-slate-200 bg-slate-950 flex items-center justify-center max-h-[380px] shadow-inner">
                <img [src]="imageUrl()" [alt]="title()" class="max-h-[380px] w-auto max-w-full object-contain" />
              </div>

              <!-- Actions for Attached Image -->
              <div *ngIf="!readOnly()" class="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  (click)="onRemove()"
                  class="btn-secondary text-xs text-rose-600 hover:bg-rose-50 hover:border-rose-300 gap-1.5 inline-flex items-center cursor-pointer">
                  <span class="material-symbols-outlined text-[16px]">delete</span>
                  <span>Remove Proof</span>
                </button>

                <button
                  type="button"
                  (click)="fileInput.click()"
                  class="btn-secondary text-xs gap-1.5 inline-flex items-center cursor-pointer">
                  <span class="material-symbols-outlined text-[16px]">swap_horiz</span>
                  <span>Replace Image</span>
                </button>
              </div>
            </div>

            <!-- ── MODE B: UPLOAD / PASTE / DROPZONE ── -->
            <div *ngIf="!imageUrl()">
              <div 
                (click)="fileInput.click()"
                (dragover)="onDragOver($event)"
                (dragleave)="onDragLeave($event)"
                (drop)="onDrop($event)"
                [ngClass]="isDragging ? 'border-brand-500 bg-brand-50/40 ring-2 ring-brand-500/20' : 'border-slate-300 bg-slate-50/40 hover:bg-slate-50 hover:border-brand-400'"
                class="border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 group">
                
                <div class="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-slate-500 group-hover:text-brand-600 group-hover:border-brand-200 transition-all group-hover:scale-105">
                  <span class="material-symbols-outlined text-[24px]">add_photo_alternate</span>
                </div>

                <div>
                  <p class="text-xs text-slate-700 font-semibold">
                    <span class="text-brand-600 hover:underline">Click to browse</span> or drag &amp; drop
                  </p>
                  <p class="text-[11px] text-slate-400 mt-1">
                    or paste directly from clipboard (<kbd class="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-mono text-slate-600">Ctrl + V</kbd>)
                  </p>
                </div>

                <span class="text-[10px] text-slate-400">Supported: JPG, PNG, WEBP (Max 10MB)</span>
              </div>
            </div>

            <!-- Hidden Native File Input -->
            <input 
              #fileInput
              type="file" 
              accept="image/*" 
              (change)="onFileSelected($event)" 
              class="hidden" 
            />

          </div>

          <!-- Footer -->
          <div class="px-5 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-2.5">
            <button
              type="button"
              (click)="onClose()"
              class="btn-secondary text-xs py-2 px-4 cursor-pointer">
              Close
            </button>
            <button
              *ngIf="!readOnly()"
              type="button"
              (click)="onSave()"
              [disabled]="isSaving() || !isDirty()"
              class="btn-primary text-xs py-2 px-5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5 shadow-xs">
              <span *ngIf="isSaving()" class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              <span *ngIf="!isSaving()" class="material-symbols-outlined text-[16px]">check</span>
              <span>{{ isSaving() ? 'Saving...' : 'Save' }}</span>
            </button>
          </div>

        </div>
      </div>

    </div>
  `
})
export class ProofModalComponent {
  isOpen = input<boolean>(false);
  imageUrl = input<string>('');
  title = input<string>('Proof of Transaction');
  subtitle = input<string>('');
  readOnly = input<boolean>(false);
  isSaving = input<boolean>(false);

  close = output<void>();
  imageChange = output<string>();
  imageRemove = output<void>();
  save = output<string>();

  isDragging = false;
  isDirty = signal<boolean>(false);

  constructor() {
    effect(() => {
      const open = this.isOpen();
      untracked(() => {
        this.isDirty.set(false);
      });
      if (open) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    });
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.isOpen()) {
      this.onClose();
    }
  }

  @HostListener('window:paste', ['$event'])
  onPaste(event: ClipboardEvent) {
    if (!this.isOpen() || this.readOnly()) return;
    const items = event.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          this.processImageFile(file);
          event.preventDefault();
          break;
        }
      }
    }
  }

  onDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging = false;
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging = false;
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      this.processImageFile(files[0]);
    }
  }

  onFileSelected(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.processImageFile(target.files[0]);
      target.value = ''; // Reset input
    }
  }

  private processImageFile(file: File) {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      this.isDirty.set(true);
      this.imageChange.emit(result);
    };
    reader.readAsDataURL(file);
  }

  onRemove() {
    this.isDirty.set(true);
    this.imageRemove.emit();
  }

  onSave() {
    this.save.emit(this.imageUrl() || '');
  }

  onClose() {
    this.isDragging = false;
    this.isDirty.set(false);
    this.close.emit();
  }
}
