import { Component, input, output, signal, HostListener, effect, untracked, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalTeleportDirective } from '../../directives/modal-teleport.directive';
import { ImageLightboxComponent } from '../image-lightbox/image-lightbox.component';
import { PODStatus } from '../../../core/models/tms.models';
import { FirebaseService } from '../../../core/services/firebase.service';

@Component({
  selector: 'app-proof-modal',
  standalone: true,
  imports: [CommonModule, ModalTeleportDirective, ImageLightboxComponent],
  template: `
    <!-- ── 1. MAIN PROOF MODAL ────────────────────────────────────────────── -->
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
             class="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl border border-slate-200 w-full max-w-xl my-auto animate-scale-in">
          
          <!-- Header -->
          <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div class="space-y-1">
              <h3 class="font-bold text-sm text-slate-900 leading-snug">{{ title() }}</h3>
              
              <!-- Subtitle or Formatted Timestamp -->
              <div class="flex items-center gap-2 flex-wrap text-xs text-slate-400 font-medium">
                <span *ngIf="subtitle()">{{ subtitle() }}</span>
                <span *ngIf="subtitle() && timestamp()">•</span>
                <span *ngIf="timestamp()" class="font-mono text-[11px]">
                  {{ timestamp() | date:'medium' }}
                </span>
              </div>
            </div>

            <button 
              type="button"
              (click)="onClose()" 
              class="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100 cursor-pointer ml-2 flex-shrink-0">
              <span class="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <!-- Metadata Chips Bar (Type, Amount, Status) -->
          <div *ngIf="type() || amount() != null || status() === 'FLAGGED_BLURRY'" 
               class="px-5 py-2.5 bg-slate-50/40 border-b border-slate-100 flex items-center justify-between gap-2 flex-wrap">
            <div class="flex items-center gap-2 flex-wrap">
              <!-- Type Badge -->
              <span *ngIf="type() === 'CREDIT'"
                    class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-600 text-white shadow-xs inline-flex items-center">
                Credit
              </span>
              <span *ngIf="type() === 'DEBIT'"
                    class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-600 text-white shadow-xs inline-flex items-center">
                Debit
              </span>
              <span *ngIf="type() === 'POD'"
                    class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-600 text-white shadow-xs inline-flex items-center">
                POD / Delivery
              </span>

              <!-- Amount Display -->
              <span *ngIf="amount() != null" class="text-xs font-bold font-mono text-slate-900 tabular-nums">
                ₱{{ amount() | number:'1.2-2' }}
              </span>
            </div>

            <!-- Flagged Issue Badge -->
            <div *ngIf="status() === 'FLAGGED_BLURRY'" class="flex items-center gap-1.5">
              <span class="badge badge-danger text-xs inline-flex items-center gap-1">
                <span class="material-symbols-outlined text-[14px]">flag</span>
                <span>Flagged: Blurry / Issue</span>
              </span>
              <span *ngIf="flagReason()" class="text-[11px] text-rose-600 italic">
                ({{ flagReason() }})
              </span>
            </div>
          </div>

          <!-- Body Content -->
          <div class="p-6 space-y-4">
            
            <!-- ── MODE A: VIEW ATTACHED IMAGE (CLICK TO FULLSCREEN) ── -->
            <div *ngIf="imageUrl()" class="space-y-4">
              <div 
                (click)="isFullscreenOpen.set(true)"
                class="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-950 flex items-center justify-center max-h-[380px] aspect-video shadow-inner cursor-zoom-in">
                
                <img [src]="imageUrl()" [alt]="title()" class="max-h-[380px] w-auto max-w-full object-contain transition-transform duration-200 group-hover:scale-[1.02]" />

                <!-- Sleek Hover Overlay Banner -->
                <div class="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center pointer-events-none">
                  <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-xs text-slate-900 text-xs font-bold shadow-lg transform translate-y-1 group-hover:translate-y-0 transition-transform">
                    <span class="material-symbols-outlined text-[16px] text-brand-600">fullscreen</span>
                    <span>Click to View Fullscreen &amp; Zoom</span>
                  </span>
                </div>

                <!-- Corner Expand Button -->
                <button
                  type="button"
                  (click)="isFullscreenOpen.set(true); $event.stopPropagation()"
                  title="View Fullscreen & Zoom"
                  class="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-black/60 hover:bg-brand-600 text-white transition-colors cursor-pointer shadow-md flex items-center justify-center">
                  <span class="material-symbols-outlined text-[16px]">open_in_full</span>
                </button>
              </div>

              <!-- Action Bar for Attached Image (Single Row: Left Flag, Right Replace & Remove Icons) -->
              <div class="flex items-center justify-between pt-2.5 border-t border-slate-100 w-full">
                <!-- Left: Flagging Controls -->
                <div class="flex items-center">
                  <button
                    *ngIf="status() === 'FLAGGED_BLURRY'"
                    type="button"
                    (click)="openClearFlagConfirmModal()"
                    class="btn-secondary text-xs text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 gap-1.5 inline-flex items-center cursor-pointer shadow-2xs">
                    <span class="material-symbols-outlined text-[16px] text-emerald-600">check_circle</span>
                    <span>Clear Flag</span>
                  </button>

                  <button
                    *ngIf="status() !== 'FLAGGED_BLURRY'"
                    type="button"
                    (click)="openFlagModal()"
                    class="btn-secondary text-xs border-rose-200 text-rose-700 hover:bg-rose-50 gap-1.5 inline-flex items-center cursor-pointer shadow-2xs">
                    <span class="material-symbols-outlined text-[16px] text-rose-600">flag</span>
                    <span>Flag Blurry / Issue</span>
                  </button>
                </div>

                <!-- Right: Replace & Remove Icons (if editable) -->
                <div *ngIf="!readOnly()" class="flex items-center gap-1.5">
                  <button
                    type="button"
                    (click)="fileInput.click()"
                    title="Replace Image"
                    aria-label="Replace Image"
                    class="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 hover:border-slate-300 flex items-center justify-center transition-colors cursor-pointer shadow-2xs">
                    <span class="material-symbols-outlined text-[18px]">swap_horiz</span>
                  </button>

                  <button
                    type="button"
                    (click)="openRemoveConfirmModal()"
                    title="Remove Proof"
                    aria-label="Remove Proof"
                    class="w-8 h-8 rounded-lg border border-rose-200 text-rose-500 hover:text-rose-700 hover:bg-rose-50 hover:border-rose-300 flex items-center justify-center transition-colors cursor-pointer shadow-2xs">
                    <span class="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
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

    <!-- ── 2. CONFIRMATION MODAL: REMOVE PROOF ─────────────────────────────── -->
    <div *ngIf="showRemoveConfirmModal()" appModalTeleport class="fixed inset-0 z-[120] overflow-y-auto" role="dialog" aria-modal="true">
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" (click)="closeRemoveConfirmModal()"></div>
      <div class="flex min-h-full items-center justify-center p-4 text-center sm:p-6">
        <div (click)="$event.stopPropagation()" class="relative transform card max-w-md w-full overflow-hidden shadow-2xl my-auto text-left animate-scale-in">
          <div class="p-5 border-b border-slate-100 flex items-center justify-between bg-rose-50/70">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-2xs">
                <span class="material-symbols-outlined text-[20px]">delete</span>
              </div>
              <h3 class="font-bold text-sm text-slate-900">Remove Proof</h3>
            </div>
            <button (click)="closeRemoveConfirmModal()" class="text-slate-400 hover:text-slate-600 font-bold text-base p-1 cursor-pointer">✕</button>
          </div>
          <div class="p-6 space-y-2">
            <p class="text-sm font-semibold text-slate-800 leading-relaxed">
              Are you sure you want to remove this proof document?
            </p>
            <p class="text-xs text-slate-500">
              This will detach the uploaded receipt or document photo from this transaction record.
            </p>
          </div>
          <div class="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button (click)="closeRemoveConfirmModal()" type="button" class="btn-secondary text-xs px-4 py-2 cursor-pointer">
              Cancel
            </button>
            <button (click)="confirmRemoveProof()" type="button" class="btn-danger text-xs px-5 py-2 cursor-pointer bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs">
              <span class="material-symbols-outlined text-[16px]">delete_forever</span>
              <span>Yes, Remove Proof</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── 3. CONFIRMATION MODAL: FLAG BLURRY / ISSUE ──────────────────────── -->
    <div *ngIf="showFlagConfirmModal()" appModalTeleport class="fixed inset-0 z-[120] overflow-y-auto" role="dialog" aria-modal="true">
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" (click)="closeFlagConfirmModal()"></div>
      <div class="flex min-h-full items-center justify-center p-4 text-center sm:p-6">
        <div (click)="$event.stopPropagation()" class="relative transform card max-w-md w-full overflow-hidden shadow-2xl my-auto text-left animate-scale-in">
          <div class="p-5 border-b border-slate-100 flex items-center justify-between bg-rose-50/70">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-2xs">
                <span class="material-symbols-outlined text-[20px]">flag</span>
              </div>
              <h3 class="font-bold text-sm text-slate-900">Flag Blurry / Issue</h3>
            </div>
            <button (click)="closeFlagConfirmModal()" class="text-slate-400 hover:text-slate-600 font-bold text-base p-1 cursor-pointer">✕</button>
          </div>
          <div class="p-6 space-y-2">
            <p class="text-sm font-semibold text-slate-800 leading-relaxed">
              Are you sure you want to Flag this proof with Blurry / Issue
            </p>
            <p class="text-xs text-slate-500">
              This will mark the proof document as flagged for audit review.
            </p>
          </div>
          <div class="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button (click)="closeFlagConfirmModal()" type="button" class="btn-secondary text-xs px-4 py-2 cursor-pointer">
              Cancel
            </button>
            <button (click)="confirmFlagIssue()" type="button" class="btn-danger text-xs px-5 py-2 cursor-pointer bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs">
              <span class="material-symbols-outlined text-[16px]">flag</span>
              <span>Yes, Flag Issue</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── 4. CONFIRMATION MODAL: CLEAR FLAG ───────────────────────────────── -->
    <div *ngIf="showClearFlagConfirmModal()" appModalTeleport class="fixed inset-0 z-[120] overflow-y-auto" role="dialog" aria-modal="true">
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" (click)="closeClearFlagConfirmModal()"></div>
      <div class="flex min-h-full items-center justify-center p-4 text-center sm:p-6">
        <div (click)="$event.stopPropagation()" class="relative transform card max-w-md w-full overflow-hidden shadow-2xl my-auto text-left animate-scale-in">
          <div class="p-5 border-b border-slate-100 flex items-center justify-between bg-emerald-50/70">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-2xs">
                <span class="material-symbols-outlined text-[20px]">check_circle</span>
              </div>
              <h3 class="font-bold text-sm text-slate-900">Clear Flag</h3>
            </div>
            <button (click)="closeClearFlagConfirmModal()" class="text-slate-400 hover:text-slate-600 font-bold text-base p-1 cursor-pointer">✕</button>
          </div>
          <div class="p-6 space-y-2">
            <p class="text-sm font-semibold text-slate-800 leading-relaxed">
              Are you sure you want to Clear the Flag on this proof?
            </p>
            <p class="text-xs text-slate-500">
              This will mark the proof document as verified and clear any flagged issues.
            </p>
          </div>
          <div class="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button (click)="closeClearFlagConfirmModal()" type="button" class="btn-secondary text-xs px-4 py-2 cursor-pointer">
              Cancel
            </button>
            <button (click)="confirmClearFlag()" type="button" class="btn-primary text-xs px-5 py-2 cursor-pointer bg-emerald-600 hover:bg-emerald-700 border-emerald-600 hover:border-emerald-700 text-white font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs">
              <span class="material-symbols-outlined text-[16px]">check_circle</span>
              <span>Yes, Clear Flag</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── 5. FULLSCREEN INTERACTIVE IMAGE LIGHTBOX ────────────────────────── -->
    <app-image-lightbox
      [isOpen]="isFullscreenOpen()"
      [imageUrl]="imageUrl()"
      [title]="title()"
      [subtitle]="subtitle()"
      (close)="isFullscreenOpen.set(false)"
    />
  `
})
export class ProofModalComponent {
  // Inputs
  isOpen = input<boolean>(false);
  imageUrl = input<string>('');
  title = input<string>('Proof of Transaction');
  subtitle = input<string>('');
  timestamp = input<string>('');
  type = input<'CREDIT' | 'DEBIT' | 'POD' | string>('');
  amount = input<number | null | undefined>(null);
  status = input<PODStatus>('APPROVED');
  flagReason = input<string | undefined>(undefined);
  readOnly = input<boolean>(false);
  isSaving = input<boolean>(false);

  // Outputs
  close = output<void>();
  imageChange = output<string>();
  imageRemove = output<void>();
  save = output<string>();
  flagIssue = output<string>();
  clearFlag = output<void>();

  // State Signals
  isDirty = signal<boolean>(false);
  isFullscreenOpen = signal<boolean>(false);
  showRemoveConfirmModal = signal<boolean>(false);
  showFlagConfirmModal = signal<boolean>(false);
  showClearFlagConfirmModal = signal<boolean>(false);
  isDragging = false;
  private firebaseService = inject(FirebaseService);

  constructor() {
    effect(() => {
      const open = this.isOpen();
      untracked(() => {
        this.isDirty.set(false);
        this.isFullscreenOpen.set(false);
        this.showRemoveConfirmModal.set(false);
        this.showFlagConfirmModal.set(false);
        this.showClearFlagConfirmModal.set(false);
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
    if (this.isFullscreenOpen()) {
      this.isFullscreenOpen.set(false);
      return;
    }
    if (this.showRemoveConfirmModal()) {
      this.closeRemoveConfirmModal();
      return;
    }
    if (this.showFlagConfirmModal()) {
      this.closeFlagConfirmModal();
      return;
    }
    if (this.showClearFlagConfirmModal()) {
      this.closeClearFlagConfirmModal();
      return;
    }
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
      target.value = '';
    }
  }

  private async processImageFile(file: File) {
    if (!file.type.startsWith('image/')) return;
    try {
      const downloadUrl = await this.firebaseService.uploadProofFile(file, 'proofs');
      this.isDirty.set(true);
      this.imageChange.emit(downloadUrl);
    } catch (err) {
      console.warn('Firebase Storage upload failed, falling back to data URL:', err);
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        this.isDirty.set(true);
        this.imageChange.emit(result);
      };
      reader.readAsDataURL(file);
    }
  }

  // Remove Confirmation Handlers
  openRemoveConfirmModal() {
    this.showRemoveConfirmModal.set(true);
  }

  closeRemoveConfirmModal() {
    this.showRemoveConfirmModal.set(false);
  }

  confirmRemoveProof() {
    this.closeRemoveConfirmModal();
    this.isDirty.set(true);
    this.imageRemove.emit();
  }

  // Flag Handlers
  openFlagModal() {
    this.showFlagConfirmModal.set(true);
  }

  closeFlagConfirmModal() {
    this.showFlagConfirmModal.set(false);
  }

  confirmFlagIssue() {
    this.closeFlagConfirmModal();
    this.flagIssue.emit('Image is blurry / receipt unreadable');
  }

  // Clear Flag Handlers
  openClearFlagConfirmModal() {
    this.showClearFlagConfirmModal.set(true);
  }

  closeClearFlagConfirmModal() {
    this.showClearFlagConfirmModal.set(false);
  }

  confirmClearFlag() {
    this.closeClearFlagConfirmModal();
    this.clearFlag.emit();
  }

  onSave() {
    this.save.emit(this.imageUrl() || '');
  }

  onClose() {
    this.isFullscreenOpen.set(false);
    this.showRemoveConfirmModal.set(false);
    this.showFlagConfirmModal.set(false);
    this.showClearFlagConfirmModal.set(false);
    this.isDragging = false;
    this.isDirty.set(false);
    this.close.emit();
  }
}
