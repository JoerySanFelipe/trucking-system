import { Component, input, output, model, signal, computed, HostListener, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { COHEntry, PODStatus } from '../../../core/models/tms.models';
import { CurrencyFieldComponent } from '../currency-field/currency-field.component';
import { ProofModalComponent } from '../proof-modal/proof-modal.component';
import { ComboboxComponent } from '../combobox/combobox.component';
import { DispatchStore } from '../../../core/application/stores/dispatch.store';

export interface CarryoverBalance {
  amount: number;
  type: 'SHORTAGE' | 'OVERAGE' | 'BALANCED';
  lastTripId?: string;
  lastTripTloNumber?: string;
  notes?: string;
}

import { ModalTeleportDirective } from '../../directives/modal-teleport.directive';

@Component({
  selector: 'app-transactions-table',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyFieldComponent, ProofModalComponent, ComboboxComponent, ModalTeleportDirective],
  host: { class: 'block' },
  template: `
    <!-- ── 1. Table Card Container ─────────────────────────────────────────── -->
    <div class="card overflow-hidden border border-slate-200 shadow-2xs">
      
      <!-- ── Table Header Toolbar ───────────────────────────────────────────── -->
      <div class="px-6 py-3.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
        <div class="flex items-center gap-3">
          <h2 class="text-base font-bold text-slate-900">Transactions</h2>
          <span class="px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            {{ filteredTableEntries().length }}
          </span>
        </div>

        <div class="flex items-center gap-2.5 flex-1 sm:justify-end">
          <!-- Description-Based Search Bar -->
          <div class="relative w-full sm:w-64">
            <span class="material-symbols-outlined text-[16px] text-slate-400 absolute left-3 top-2.5 pointer-events-none">search</span>
            <input
              type="text"
              [ngModel]="searchQuery()"
              (ngModelChange)="searchQuery.set($event)"
              placeholder="Search by description..."
              class="form-input !pl-9 !pr-8 text-xs py-2 w-full border-slate-200 focus:border-brand-500 rounded-xl"
            />
            <button
              *ngIf="searchQuery()"
              type="button"
              (click)="searchQuery.set('')"
              class="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5 rounded"
              title="Clear search">
              <span class="material-symbols-outlined text-[14px]">close</span>
            </button>
          </div>

          <!-- Add Cash Entry Button -->
          <button
            *ngIf="!readOnly()"
            type="button"
            (click)="openAddModal()"
            class="btn-primary text-xs gap-1.5 shadow-brand inline-flex items-center cursor-pointer flex-shrink-0">
            <span class="material-symbols-outlined text-[16px]">add</span>
            <span>Add Cash Entry</span>
          </button>
        </div>
      </div>

      <!-- ── Data Table (Full Text Wrapping & High Readability) ─────────────── -->
      <div class="overflow-x-auto">
        <table class="data-table w-full">
          <thead>
            <tr>
              <th class="w-[110px] text-left">Date</th>
              <th class="text-left">Description</th>
              <th class="w-[130px] text-right">Credit</th>
              <th class="w-[130px] text-right">Debit</th>
              <th class="w-[130px] text-right">Balance</th>
              <th class="w-[70px] text-center">Proof</th>
              <th *ngIf="!readOnly()" class="w-[50px] text-center">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">

            <!-- 0. Previous Carryover Row (if exists) -->
            <tr *ngIf="carryover() && carryover()!.amount > 0 && shouldShowCarryover()" class="hover:bg-slate-50/80 bg-slate-50/40">
              <td class="font-mono text-xs text-slate-400 whitespace-nowrap text-left">
                --
              </td>
              <td class="text-xs text-left font-semibold text-slate-800 break-words whitespace-normal leading-relaxed">
                Previous Trip Balance {{ carryover()?.lastTripTloNumber ? '(from TLO #' + carryover()?.lastTripTloNumber + ')' : '' }}
              </td>
              <td class="text-right font-mono font-bold text-xs tabular-nums !text-emerald-600">
                <span *ngIf="carryover()!.type === 'OVERAGE'" class="!text-emerald-600 font-bold">+₱{{ carryover()!.amount | number:'1.2-2' }}</span>
                <span *ngIf="carryover()!.type !== 'OVERAGE'" class="text-slate-300">--</span>
              </td>
              <td class="text-right font-mono font-bold text-xs tabular-nums !text-rose-600">
                <span *ngIf="carryover()!.type === 'SHORTAGE'" class="!text-rose-600 font-bold">-₱{{ carryover()!.amount | number:'1.2-2' }}</span>
                <span *ngIf="carryover()!.type !== 'SHORTAGE'" class="text-slate-300">--</span>
              </td>
              <td class="text-right font-mono font-bold text-xs tabular-nums"
                  [ngClass]="carryover()!.type === 'SHORTAGE' ? 'text-rose-600' : 'text-slate-900'">
                {{ carryover()!.type === 'SHORTAGE' ? '-₱' : '₱' }}{{ carryover()!.amount | number:'1.2-2' }}
              </td>
              <td class="text-center">
                <span class="text-[10px] text-slate-300 font-medium select-none">--</span>
              </td>
              <td *ngIf="!readOnly()" class="text-center">
                <span class="text-[10px] text-slate-300 font-medium select-none">--</span>
              </td>
            </tr>

            <!-- 1. Initial Dispatch Advance Row from Starting Balance -->
            <tr *ngIf="startingBalance() > 0 && !hasExplicitInitialEntry() && shouldShowStartingBalance()" class="hover:bg-slate-50">
              <td class="font-mono text-xs text-slate-400 whitespace-nowrap text-left">
                --
              </td>
              <td class="text-xs text-left font-semibold text-slate-800 break-words whitespace-normal leading-relaxed">
                Driver Starting Cash on Hand
              </td>
              <td class="text-right font-mono font-bold text-xs tabular-nums !text-emerald-600">
                <span class="!text-emerald-600 font-bold">+₱{{ startingBalance() | number:'1.2-2' }}</span>
              </td>
              <td class="text-right font-mono font-bold text-xs tabular-nums text-slate-300">
                --
              </td>
              <td class="text-right font-mono font-bold text-xs text-slate-900 tabular-nums">
                ₱{{ initialComputedBalance() | number:'1.2-2' }}
              </td>
              <td class="text-center">
                <span class="text-[10px] text-slate-300 font-medium select-none">--</span>
              </td>
              <td *ngIf="!readOnly()" class="text-center">
                <span class="text-[10px] text-slate-300 font-medium select-none">--</span>
              </td>
            </tr>

            <!-- 2. Transaction Records List -->
            <tr *ngFor="let entry of filteredTableEntries()" class="hover:bg-slate-50 group transition-colors">
              <td class="font-mono text-xs text-slate-500 whitespace-nowrap text-left">
                {{ (entry.timestamp || entry.date) | date:'mediumDate' }}
              </td>
              <td class="text-xs text-left font-medium text-slate-800 break-words whitespace-normal leading-relaxed">
                {{ entry.description }}
              </td>
              <td class="text-right font-mono font-bold text-xs tabular-nums !text-emerald-600">
                <span *ngIf="entry.type === 'CREDIT'" class="!text-emerald-600 font-bold">+₱{{ entry.amount | number:'1.2-2' }}</span>
                <span *ngIf="entry.type !== 'CREDIT'" class="text-slate-300">--</span>
              </td>
              <td class="text-right font-mono font-bold text-xs tabular-nums !text-rose-600">
                <span *ngIf="entry.type === 'DEBIT'" class="!text-rose-600 font-bold">-₱{{ entry.amount | number:'1.2-2' }}</span>
                <span *ngIf="entry.type !== 'DEBIT'" class="text-slate-300">--</span>
              </td>
              <td class="text-right font-mono font-bold text-xs tabular-nums"
                  [ngClass]="entry.runningBalance >= 0 ? 'text-slate-900' : 'text-rose-600'">
                ₱{{ entry.runningBalance | number:'1.2-2' }}
              </td>
              
              <!-- Proof Column: Compact Thumbnail or Attach Icon Button -->
              <td class="text-center">
                <div *ngIf="entry.proofUrl" 
                     (click)="openRowProofModal(entry)"
                     class="w-7 h-7 rounded-lg overflow-hidden border cursor-pointer hover:scale-110 transition-transform bg-slate-900 flex items-center justify-center relative group/thumb mx-auto shadow-2xs"
                     [ngClass]="entry.proofStatus === 'FLAGGED_BLURRY' ? 'border-rose-400 ring-2 ring-rose-400/30' : 'border-slate-200'"
                     title="Click to view receipt proof">
                  <img [src]="entry.proofUrl" [alt]="entry.description" class="w-full h-full object-cover"/>
                  <span *ngIf="entry.proofStatus === 'FLAGGED_BLURRY'" 
                        class="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border border-white"
                        title="Flagged issue"></span>
                  <div class="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <span class="material-symbols-outlined text-[13px]">zoom_in</span>
                  </div>
                </div>

                <button *ngIf="!entry.proofUrl && !readOnly()" 
                        type="button"
                        (click)="openRowProofModal(entry)"
                        title="Attach receipt proof"
                        class="w-7 h-7 rounded-lg border border-dashed border-slate-300 hover:border-brand-500 hover:bg-brand-50 text-slate-400 hover:text-brand-600 flex items-center justify-center transition-all cursor-pointer mx-auto">
                  <span class="material-symbols-outlined text-[16px]">add_photo_alternate</span>
                </button>

                <span *ngIf="!entry.proofUrl && readOnly()" class="text-[10px] text-slate-300 font-medium">--</span>
              </td>

              <!-- Action Column: Delete Button -->
              <td *ngIf="!readOnly()" class="text-center">
                <button 
                  type="button" 
                  (click)="deleteEntry(entry)"
                  title="Delete Entry"
                  class="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-all cursor-pointer mx-auto">
                  <span class="material-symbols-outlined text-[16px]">delete</span>
                </button>
              </td>
            </tr>

            <!-- 3. Empty State Row -->
            <tr *ngIf="filteredTableEntries().length === 0 && (!shouldShowCarryover() || !carryover() || carryover()!.amount <= 0) && (!shouldShowStartingBalance() || startingBalance() <= 0)">
              <td [attr.colspan]="readOnly() ? 6 : 7" class="text-center py-8 text-slate-400 text-xs italic">
                <div class="flex flex-col items-center justify-center gap-1.5">
                  <span class="material-symbols-outlined text-[24px] text-slate-300">search_off</span>
                  <span>{{ searchQuery() ? 'No transactions matching "' + searchQuery() + '"' : 'No transactions recorded for this trip.' }}</span>
                </div>
              </td>
            </tr>

          </tbody>

          <!-- ── Accounting Equation Summary Footer ─────────────────────────── -->
          <tfoot *ngIf="cohTableWithRunningBalance().length > 0 || startingBalance() > 0 || (carryover() && carryover()!.amount > 0)" class="bg-slate-50/90 border-t-2 border-slate-200">
            <tr>
              <td colspan="2" class="px-5 py-3.5 text-xs font-mono font-bold text-slate-900 uppercase tracking-wider text-left">
                Total
              </td>
              <td class="text-right font-mono font-bold text-sm tabular-nums text-emerald-600 py-3.5">
                +₱{{ totalCredit() | number:'1.2-2' }}
              </td>
              <td class="text-right font-mono font-bold text-sm tabular-nums text-rose-600 py-3.5">
                -₱{{ totalDebit() | number:'1.2-2' }}
              </td>
              <td class="text-right font-mono font-black text-sm tabular-nums py-3.5"
                  [ngClass]="netBalance() >= 0 ? 'text-slate-900' : 'text-rose-600'">
                ₱{{ netBalance() | number:'1.2-2' }}
              </td>
              <td></td>
              <td *ngIf="!readOnly()"></td>
            </tr>
          </tfoot>
        </table>
      </div>

    </div>

    <!-- ── 2. MODAL: ADD CASH ENTRY (FULL CANVAS OVERLAY) ─────────────────────── -->
    <div *ngIf="showAddCOHModal()" 
         appModalTeleport
         class="fixed inset-0 z-50 overflow-y-auto"
         role="dialog"
         aria-modal="true">
      
      <!-- Fullscreen Backdrop -->
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
           (click)="closeAddModal()"></div>

      <!-- Centering Flex Wrapper -->
      <div class="flex min-h-full items-center justify-center p-4 text-center sm:p-6">
        <div (click)="$event.stopPropagation()"
             class="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl border border-slate-200 w-full max-w-lg my-auto animate-scale-in">

          <!-- Header -->
          <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
            <div>
              <h3 class="font-bold text-sm text-slate-900">Add Cash Entry</h3>
            </div>
            <button 
              type="button"
              (click)="closeAddModal()"
              class="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100 cursor-pointer">
              <span class="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

        <!-- Form -->
        <form (ngSubmit)="submitCOHEntry()" class="p-6 space-y-4">

          <!-- Entry Type Tabs (Credit vs Debit) -->
          <div>
            <label class="form-label uppercase text-[10px]">Entry Type <span class="text-rose-500">*</span></label>
            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                (click)="setEntryType('CREDIT')"
                [ngClass]="newCOHType() === 'CREDIT' ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-bold ring-2 ring-emerald-500/20' : 'btn-secondary text-xs'"
                class="py-2.5 px-3 rounded-xl border text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer">
                <span>Credit</span>
              </button>

              <button
                type="button"
                (click)="setEntryType('DEBIT')"
                [ngClass]="newCOHType() === 'DEBIT' ? 'bg-rose-50 border-rose-500 text-rose-800 font-bold ring-2 ring-rose-500/20' : 'btn-secondary text-xs'"
                class="py-2.5 px-3 rounded-xl border text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer">
                <span>Debit</span>
              </button>
            </div>
          </div>

          <!-- Description Combobox with Smart Search Suggestions -->
          <div>
            <app-combobox
              label="Description"
              [required]="true"
              [(value)]="newCOHDescription"
              [options]="suggestedDescriptions()"
              [placeholder]="newCOHType() === 'CREDIT' ? 'e.g. Enter credit description' : 'e.g. Enter debit description'"
              [maxDisplay]="5"
            />
          </div>

          <!-- Amount: Monetized format, right-aligned -->
          <div>
            <label class="form-label uppercase text-[10px]">Amount <span class="text-rose-500">*</span></label>
            <app-currency-field
              [value]="newCOHAmount"
              (valueChange)="newCOHAmount = $event"
              placeholder="0.00"
              inputClass="text-right font-mono font-bold text-sm"
            />
          </div>

          <!-- Proof Attachment Dropzone & Clipboard Paste Box -->
          <div>
            <label class="form-label uppercase text-[10px]">Proof Attachment (Optional)</label>
            
            <!-- When image is attached: show preview card -->
            <div *ngIf="newCOHProofUrl" class="p-3 rounded-xl border border-emerald-200 bg-emerald-50/30 flex items-center justify-between gap-3">
              <div class="flex items-center gap-2.5 overflow-hidden">
                <img [src]="newCOHProofUrl" alt="Proof Thumbnail" class="w-10 h-10 rounded-lg object-cover border border-emerald-200 shadow-2xs shrink-0" />
                <div class="overflow-hidden">
                  <p class="text-xs font-bold text-emerald-950 truncate">Receipt Proof Attached</p>
                  <p class="text-[10px] text-emerald-700">Image successfully loaded</p>
                </div>
              </div>
              <button
                type="button"
                (click)="removeProof()"
                class="btn-secondary text-[11px] py-1 px-2.5 text-rose-600 hover:bg-rose-50 hover:border-rose-300 cursor-pointer">
                Remove
              </button>
            </div>

            <!-- When no image: interactive dropzone & paste target -->
            <div 
              *ngIf="!newCOHProofUrl"
              (click)="proofFileInput.click()"
              (dragover)="onDragOver($event)"
              (dragleave)="onDragLeave($event)"
              (drop)="onFileDrop($event)"
              [ngClass]="isDragging ? 'border-brand-500 bg-brand-50/40 ring-2 ring-brand-500/20' : 'border-slate-300 bg-slate-50/50 hover:bg-slate-50 hover:border-brand-400'"
              class="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-1.5 group">
              <input #proofFileInput type="file" accept="image/*" (change)="onFileSelected($event)" class="hidden" />
              
              <div class="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-slate-500 group-hover:text-brand-600 group-hover:border-brand-200 transition-colors">
                <span class="material-symbols-outlined text-[20px]">add_photo_alternate</span>
              </div>
              <div class="text-xs text-slate-600">
                <span class="font-semibold text-brand-600 hover:underline">Click to upload</span> or drag and drop
              </div>
              <p class="text-[11px] text-slate-400">or paste image directly (<kbd class="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-mono text-slate-600">Ctrl + V</kbd>)</p>
            </div>
          </div>

          <!-- Footer Buttons -->
          <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              (click)="closeAddModal()"
              class="btn-secondary text-xs cursor-pointer">
              Cancel
            </button>
            <button
              type="submit"
              [disabled]="!newCOHAmount || !newCOHDescription"
              class="btn-primary text-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
              Save Entry
            </button>
          </div>

        </form>

        </div>
      </div>
    </div>

    <!-- ── 3. REUSABLE PROOF MODAL (FOR VIEWING & UPLOADING PROOFS ON ROWS) ────── -->
    <app-proof-modal
      [isOpen]="isProofModalOpen()"
      [imageUrl]="proofModalUrl()"
      [title]="proofModalTitle()"
      [subtitle]="proofModalSubtitle()"
      [readOnly]="readOnly()"
      [isSaving]="isSavingProof()"
      (imageChange)="onProofImageChange($event)"
      (imageRemove)="onProofImageRemove()"
      (save)="onProofSave($event)"
      (close)="onProofModalClose()"
    />
  `
})
export class TransactionsTableComponent {
  // Input collection of entries
  entries = model<COHEntry[]>([]);
  startingBalance = input<number>(0);
  carryover = input<CarryoverBalance | null>(null);
  readOnly = input<boolean>(false);
  defaultDate = input<string>('');
  tripId = input<string>('');

  // Events
  entriesChange = output<COHEntry[]>();
  entryAdded = output<COHEntry>();
  entryUpdated = output<COHEntry>();
  entryDeleted = output<COHEntry>();

  // Add Modal State
  showAddCOHModal = signal<boolean>(false);
  isDragging = false;

  // Reusable Proof Modal State
  activeProofTarget: COHEntry | null = null;
  isProofModalOpen = signal<boolean>(false);
  isSavingProof = signal<boolean>(false);
  proofModalUrl = signal<string>('');
  proofModalTitle = signal<string>('Receipt Proof');
  proofModalSubtitle = signal<string>('');

  // Form State for Add Entry
  private dispatchStore = inject(DispatchStore);
  newCOHType = signal<'CREDIT' | 'DEBIT'>('DEBIT');
  newCOHAmount: number | null = null;
  newCOHDescription = '';
  newCOHProofUrl = '';

  suggestedDescriptions = computed<string[]>(() => {
    const currentType = this.newCOHType();
    const trips = this.dispatchStore.trips();
    const descSet = new Set<string>();

    // 1. Current trip entries strictly matching the selected type
    for (const e of this.entries()) {
      if (e.type === currentType && e.description?.trim()) {
        descSet.add(e.description.trim());
      }
    }

    // 2. All trips in database strictly matching the selected type
    for (const t of trips) {
      const entries = t.cashLedger?.entries || t.cohEntries || [];
      for (const e of entries) {
        if (e.type === currentType && e.description?.trim()) {
          descSet.add(e.description.trim());
        }
      }
    }

    // Purely database records — zero hardcoded defaults!
    return Array.from(descSet);
  });

  constructor() {
    // Lock background body scroll whenever add modal is active
    effect(() => {
      if (this.showAddCOHModal()) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    });
  }

  // Handle ESC key to dismiss add modal
  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.showAddCOHModal()) {
      this.closeAddModal();
    }
  }

  // Handle Clipboard Paste (Ctrl+V) for instant image attaching inside Add Modal
  @HostListener('window:paste', ['$event'])
  onPaste(event: ClipboardEvent) {
    if (!this.showAddCOHModal()) return;
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

  hasExplicitInitialEntry = computed<boolean>(() => {
    return this.entries().some(e => 
      ((e.category === 'DISPATCH_ADVANCE') || 
       (e.description && e.description.toLowerCase().includes('starting cash')) ||
       (e.description && e.description.toLowerCase().includes('dispatch allowance'))) && 
      e.type === 'CREDIT'
    );
  });

  initialComputedBalance = computed<number>(() => {
    let base = Number(this.startingBalance()) || 0;
    const c = this.carryover();
    if (c && c.amount > 0) {
      if (c.type === 'OVERAGE') base += c.amount;
      if (c.type === 'SHORTAGE') base -= c.amount;
    }
    return base;
  });

  // Real-Time Running Balance Computation
  cohTableWithRunningBalance = computed<Array<COHEntry & { date?: string; runningBalance: number }>>(() => {
    let currentBalance = this.hasExplicitInitialEntry() ? 0 : this.initialComputedBalance();
    
    // If has explicit initial entry and carryover exists, add carryover to currentBalance
    if (this.hasExplicitInitialEntry()) {
      const c = this.carryover();
      if (c && c.amount > 0) {
        if (c.type === 'OVERAGE') currentBalance += c.amount;
        if (c.type === 'SHORTAGE') currentBalance -= c.amount;
      }
    }

    return this.entries().map(entry => {
      const amt = Number(entry.amount) || 0;
      if (entry.type === 'CREDIT') {
        currentBalance += amt;
      } else {
        currentBalance -= amt;
      }
      return {
        ...entry,
        date: entry.timestamp,
        runningBalance: currentBalance
      };
    });
  });

  // Description-based search and filter
  searchQuery = signal<string>('');

  filteredTableEntries = computed(() => {
    const list = this.cohTableWithRunningBalance();
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return list;
    return list.filter(entry => entry.description?.toLowerCase().includes(q));
  });

  shouldShowCarryover = computed<boolean>(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return true;
    const desc = `previous trip balance ${this.carryover()?.lastTripTloNumber ? '(from tlo #' + this.carryover()?.lastTripTloNumber + ')' : ''}`;
    return desc.toLowerCase().includes(q);
  });

  shouldShowStartingBalance = computed<boolean>(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return true;
    return 'driver starting cash on hand'.includes(q);
  });

  totalCredit = computed<number>(() => {
    const sumCredits = this.entries()
      .filter(e => e.type === 'CREDIT')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    let total = this.hasExplicitInitialEntry() ? sumCredits : sumCredits + (Number(this.startingBalance()) || 0);
    const c = this.carryover();
    if (c && c.type === 'OVERAGE') {
      total += c.amount;
    }
    return total;
  });

  totalDebit = computed<number>(() => {
    const sumDebits = this.entries()
      .filter(e => e.type === 'DEBIT')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    let total = sumDebits;
    const c = this.carryover();
    if (c && c.type === 'SHORTAGE') {
      total += c.amount;
    }
    return total;
  });

  netBalance = computed<number>(() => {
    return this.totalCredit() - this.totalDebit();
  });

  setEntryType(type: 'CREDIT' | 'DEBIT') {
    this.newCOHType.set(type);
    this.newCOHDescription = '';
  }

  openAddModal() {
    this.setEntryType('DEBIT');
    this.newCOHAmount = null;
    this.newCOHDescription = '';
    this.newCOHProofUrl = '';
    this.isDragging = false;
    this.showAddCOHModal.set(true);
  }

  closeAddModal() {
    this.showAddCOHModal.set(false);
    this.isDragging = false;
  }

  submitCOHEntry() {
    if (!this.newCOHAmount || !this.newCOHDescription.trim()) return;

    const newEntry: COHEntry = {
      id: `coh-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      tripId: '',
      amount: Number(this.newCOHAmount),
      type: this.newCOHType(),
      description: this.newCOHDescription.trim(),
      timestamp: this.defaultDate() || new Date().toISOString(),
      proofUrl: this.newCOHProofUrl?.trim() || undefined,
      proofStatus: undefined
    };

    const updated = [...this.entries(), newEntry];
    this.entries.set(updated);
    this.entriesChange.emit(updated);
    this.entryAdded.emit(newEntry);

    this.newCOHAmount = null;
    this.newCOHDescription = '';
    this.newCOHProofUrl = '';
    this.showAddCOHModal.set(false);
  }

  deleteEntry(entry: COHEntry) {
    const updated = this.entries().filter(e => e.id !== entry.id);
    this.entries.set(updated);
    this.entriesChange.emit(updated);
    this.entryDeleted.emit(entry);
  }

  // ── REUSABLE PROOF MODAL INTEGRATION ──────────────────────────────────────
  openRowProofModal(entry: COHEntry) {
    this.activeProofTarget = entry;
    this.proofModalUrl.set(entry.proofUrl || '');
    this.proofModalTitle.set(entry.description || 'Receipt Proof');
    this.proofModalSubtitle.set(`${entry.type === 'CREDIT' ? 'Credit' : 'Debit'} • ₱${(Number(entry.amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    this.isProofModalOpen.set(true);
  }

  onProofImageChange(newUrl: string) {
    this.proofModalUrl.set(newUrl);
  }

  onProofImageRemove() {
    this.proofModalUrl.set('');
  }

  onProofModalClose() {
    this.isProofModalOpen.set(false);
    this.activeProofTarget = null;
    this.proofModalUrl.set('');
  }

  async onProofSave(savedUrl: string) {
    if (!this.activeProofTarget) {
      this.isProofModalOpen.set(false);
      return;
    }

    this.isSavingProof.set(true);
    try {
      const targetId = this.activeProofTarget.id;
      const cleanUrl = savedUrl ? savedUrl.trim() : undefined;
      const updatedEntry: COHEntry = {
        ...this.activeProofTarget,
        proofUrl: cleanUrl,
        proofStatus: cleanUrl && this.activeProofTarget.proofStatus === 'FLAGGED_BLURRY' ? undefined : this.activeProofTarget.proofStatus
      };

      const updated = this.entries().map(e => e.id === targetId ? updatedEntry : e);
      this.entries.set(updated);
      this.entriesChange.emit(updated);
      this.entryUpdated.emit(updatedEntry);

      // Persist directly to Firestore via DispatchStore
      const targetTripId = this.tripId() || this.activeProofTarget.tripId || (this.entries()[0]?.tripId);
      if (targetTripId && this.dispatchStore) {
        const trip = this.dispatchStore.getTripById(targetTripId);
        const currentCarryover = trip?.cashLedger?.previousCarryover || trip?.previousCarryover || { amount: 0, type: 'BALANCED', fromTloNumber: '' };
        const debits = updated
          .filter(e => e.type === 'DEBIT')
          .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

        await this.dispatchStore.updateTrip(targetTripId, {
          cohEntries: updated,
          cashLedger: {
            previousCarryover: currentCarryover,
            entries: updated
          },
          cost: debits
        });
      }

      this.isProofModalOpen.set(false);
      this.activeProofTarget = null;
      this.proofModalUrl.set('');
    } finally {
      this.isSavingProof.set(false);
    }
  }

  // Drag & Drop & Upload handlers for Add Modal
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onFileDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.processImageFile(files[0]);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.processImageFile(input.files[0]);
    }
  }

  private processImageFile(file: File) {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.newCOHProofUrl = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  removeProof() {
    this.newCOHProofUrl = '';
  }
}
