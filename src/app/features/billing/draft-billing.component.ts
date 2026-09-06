import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TmsService } from '../../core/services/tms.service';
import { BillingStore } from '../../core/application/stores/billing.store';
import { Router, RouterLink } from '@angular/router';

import { ModalTeleportDirective } from '../../shared/directives/modal-teleport.directive';

@Component({
  selector: 'app-draft-billing',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ModalTeleportDirective],
  template: `
    <div class="w-full space-y-6 animate-fade-in-up">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-slate-900 tracking-tight">Draft Billings Workspace</h1>
          <p class="text-sm text-slate-500 mt-1">Review draft billing batches before generating the final statement.</p>
        </div>
      </div>

      <!-- Filters & Actions -->
      <div class="card p-4 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50 border-b border-slate-200">
        <div class="flex flex-wrap gap-3 flex-1">
          <input type="text" [ngModel]="searchBillingNumber()" (ngModelChange)="searchBillingNumber.set($event)" placeholder="Billing Number" class="form-input text-sm w-48" />
          <input type="text" [ngModel]="searchClient()" (ngModelChange)="searchClient.set($event)" placeholder="Client Name" class="form-input text-sm w-48" />
          <button (click)="clearFilters()" class="btn-secondary text-sm px-3 py-1.5" *ngIf="searchBillingNumber() || searchClient()">Clear</button>
        </div>
      </div>

      <!-- Table Area -->
      <div class="card overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
          <h2 class="text-base font-bold text-slate-900">Active Drafts</h2>
          <span class="badge badge-brand">{{ filteredDrafts().length }} drafts</span>
        </div>

        <div class="overflow-x-auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>Billing Number</th>
                <th>Client</th>
                <th>Billing Period</th>
                <th class="text-right">Trips</th>
                <th class="text-right">Total Weight</th>
                <th class="text-right">Gross Freight (₱)</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let draft of filteredDrafts()" class="hover:bg-slate-50 transition-colors">
                <td class="font-bold text-slate-900 font-mono text-sm">{{ draft.billingNumber }}</td>
                <td>
                  <span class="badge badge-neutral">{{ draft.client }}</span>
                </td>
                <td class="text-sm text-slate-600">{{ draft.billingPeriod }}</td>
                <td class="text-right font-bold text-slate-700">{{ draft.tripIds.length }}</td>
                <td class="text-right text-slate-700">{{ draft.totalWeight | number:'1.2-2' }} T</td>
                <td class="text-right font-black tabular-nums text-emerald-700">₱{{ draft.grossFreight | number:'1.2-2' }}</td>
                <td class="text-right space-x-2">
                  <button (click)="confirmDelete(draft.id)" class="btn-ghost text-red-600 hover:text-red-700 px-3 py-1.5 text-xs">Delete</button>
                  <a [routerLink]="['/draft-billing', draft.id]" class="btn-secondary px-4 py-1.5 text-xs inline-block">Review & Submit</a>
                </td>
              </tr>
              <tr *ngIf="filteredDrafts().length === 0">
                <td colspan="7" class="text-center py-12 text-slate-400 font-medium">
                  <div *ngIf="billingStore.draftBatches().length === 0">No draft billings found.</div>
                  <div *ngIf="billingStore.draftBatches().length > 0">No drafts match your current filters.</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div *ngIf="isDeleteModalOpen()" appModalTeleport class="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" (click)="closeDeleteModal()"></div>
      <div class="flex min-h-full items-center justify-center p-4 text-center sm:p-6">
        <div (click)="$event.stopPropagation()" class="relative transform bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden my-auto text-left animate-scale-in">
          <div class="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
            <h2 class="text-lg font-bold text-red-600">Delete Draft Billing</h2>
            <button (click)="closeDeleteModal()" class="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
          </div>
          
          <div class="p-6">
            <p class="text-slate-700 text-sm">
              Are you sure you want to delete this draft billing batch? 
              This action will return all included trips back to the Billing Queue.
            </p>
          </div>

          <div class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
            <button (click)="closeDeleteModal()" class="btn-secondary px-5 py-2 text-sm cursor-pointer">Cancel</button>
            <button (click)="executeDelete()" class="px-6 py-2 text-sm font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors cursor-pointer">Delete Draft</button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class DraftBillingComponent {
  billingStore = inject(BillingStore);
  tmsService = inject(TmsService);
  
  // Search & Filter State
  searchBillingNumber = signal<string>('');
  searchClient = signal<string>('');

  // Delete Modal State
  deleteTargetId = signal<string | null>(null);
  isDeleteModalOpen = computed(() => this.deleteTargetId() !== null);

  filteredDrafts = computed(() => {
    let drafts = this.billingStore.draftBatches();
    const billingNum = this.searchBillingNumber().trim().toLowerCase();
    const client = this.searchClient().trim().toLowerCase();
    
    if (billingNum) {
      drafts = drafts.filter(d => d.billingNumber.toLowerCase().includes(billingNum));
    }
    if (client) {
      drafts = drafts.filter(d => d.client.toLowerCase().includes(client));
    }
    
    // Sort drafts by newest first (descending creationDate or just by id/time for now)
    return drafts.sort((a, b) => b.id.localeCompare(a.id));
  });

  clearFilters() {
    this.searchBillingNumber.set('');
    this.searchClient.set('');
  }

  confirmDelete(batchId: string) {
    this.deleteTargetId.set(batchId);
  }

  closeDeleteModal() {
    this.deleteTargetId.set(null);
  }

  executeDelete() {
    const targetId = this.deleteTargetId();
    if (targetId) {
      this.tmsService.deleteDraftBilling(targetId);
      this.closeDeleteModal();
    }
  }
}
// Force HMR Trigger
