import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TmsService } from '../../core/services/tms.service';
import { BillingBatch, TripDispatch } from '../../core/models/tms.models';

import { ModalTeleportDirective } from '../../shared/directives/modal-teleport.directive';

@Component({
  selector: 'app-draft-billing-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, ModalTeleportDirective],
  template: `
    <div class="min-h-screen bg-slate-100 p-4 md:p-8 animate-fade-in-up">
      <!-- Back Navigation / Workspace Context -->
      <div class="max-w-[1024px] mx-auto mb-6 flex items-center justify-between">
        <a routerLink="/draft-billing" class="text-sm font-bold text-slate-500 hover:text-brand-600 inline-flex items-center gap-1.5 transition-colors cursor-pointer">
          <span class="material-symbols-outlined text-[18px]">arrow_back</span>
          <span>Back to Draft Workspace</span>
        </a>
      </div>

      <!-- Error State (Not Found) -->
      <div *ngIf="!batch()" class="max-w-[1024px] mx-auto card p-12 text-center bg-white shadow-sm border border-slate-200">
        <h2 class="text-2xl font-bold text-slate-800 mb-2">Billing Not Found</h2>
        <p class="text-slate-500 mb-6">The requested billing document could not be loaded.</p>
        <a routerLink="/draft-billing" class="btn-primary px-6 py-2">Return to Workspace</a>
      </div>

      <!-- Document & Action Bar Container -->
      <div *ngIf="batch() as b" class="max-w-[1024px] mx-auto space-y-6">
        
        <!-- Action Bar (Top) -->
        <div *ngIf="b.status === 'DRAFT'" class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="badge badge-brand text-xs px-2.5 py-1 uppercase tracking-wider font-bold">Draft Mode</span>
            <span class="text-sm text-slate-500">Review carefully before submission.</span>
          </div>
          <div class="flex items-center gap-3">
            <button (click)="openDeleteModal()" class="btn-ghost text-red-600 hover:bg-red-50 text-sm px-4 py-2">Delete Draft</button>
            <button (click)="openSubmitModal()" class="btn-primary shadow-brand text-sm px-6 py-2 font-bold">Mark as Submitted</button>
          </div>
        </div>

        <!-- Success/Lock Banner (Post-Submission) -->
        <div *ngIf="b.status === 'SUBMITTED'" class="bg-emerald-50 p-5 rounded-xl border border-emerald-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in">
          <div class="flex items-start gap-4">
            <div class="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
              <span class="material-symbols-outlined text-[24px]">task_alt</span>
            </div>
            <div>
              <h3 class="text-lg font-bold text-emerald-800 tracking-tight">Billing Successfully Submitted</h3>
              <p class="text-emerald-700 text-sm mt-0.5">This document is now locked and immutable. Any adjustments must be handled via Reconciliation.</p>
            </div>
          </div>
          <div class="flex gap-3">
            <a routerLink="/draft-billing" class="btn-secondary text-sm px-4 py-2 whitespace-nowrap">Return to Drafts</a>
            <!-- Link to Printed Billing placeholder for later phases -->
            <a routerLink="/printed-billing" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-5 py-2 rounded-lg shadow-sm transition-colors whitespace-nowrap">Go to Printed Billing</a>
          </div>
        </div>

        <!-- The Professional Document Surface (Landscape / A4 feel) -->
        <div class="bg-white rounded-none shadow-xl border border-slate-300 p-10 md:p-14 overflow-hidden relative" style="min-height: 21cm;">
          
          <!-- Immutability Stamp -->
          <div *ngIf="b.status === 'SUBMITTED'" class="absolute top-10 right-10 pointer-events-none opacity-20 transform rotate-12">
            <div class="border-4 border-red-600 text-red-600 text-4xl font-black uppercase tracking-widest px-6 py-3 rounded-xl border-dashed">
              Submitted
            </div>
          </div>

          <!-- Document Header -->
          <div class="flex justify-between items-start border-b-2 border-slate-800 pb-8 mb-8">
            <div>
              <div class="text-[10px] font-bold tracking-widest text-brand-600 uppercase mb-1">Porbido Trucking & Hauling</div>
              <h1 class="text-4xl font-black text-slate-900 tracking-tighter uppercase">Billing Statement</h1>
            </div>
            <div class="text-right">
              <div class="text-2xl font-mono font-bold text-slate-800">{{ b.billingNumber }}</div>
              <div class="text-sm text-slate-500 mt-1">Created: {{ b.creationDate | date:'mediumDate' }}</div>
            </div>
          </div>

          <!-- Metadata Section -->
          <div class="flex justify-between mb-10">
            <div>
              <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Bill To Client</p>
              <h2 class="text-xl font-bold text-slate-900">{{ b.client }}</h2>
            </div>
            <div class="text-right">
              <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Billing Period</p>
              <h2 class="text-xl font-medium text-slate-800">{{ b.billingPeriod }}</h2>
            </div>
          </div>

          <!-- Itemized Trip Table -->
          <div class="mb-10">
            <table class="w-full text-sm text-left">
              <thead>
                <tr class="bg-slate-100 border-b-2 border-slate-300 text-slate-700">
                  <th class="py-3 px-3 font-bold uppercase tracking-wider text-[11px]">Date</th>
                  <th class="py-3 px-3 font-bold uppercase tracking-wider text-[11px]">TLO #</th>
                  <th class="py-3 px-3 font-bold uppercase tracking-wider text-[11px]">Plate</th>
                  <th class="py-3 px-3 font-bold uppercase tracking-wider text-[11px]">Route (Origin ➔ Destination)</th>
                  <th class="py-3 px-3 font-bold uppercase tracking-wider text-[11px] text-right">Weight</th>
                  <th class="py-3 px-3 font-bold uppercase tracking-wider text-[11px] text-right">Rate</th>
                  <th class="py-3 px-3 font-bold uppercase tracking-wider text-[11px] text-right">Freight (₱)</th>
                </tr>
              </thead>
              <tbody class="text-slate-800 font-medium">
                <tr *ngFor="let trip of batchTrips()" class="border-b border-slate-200">
                  <td class="py-3 text-xs text-slate-500">{{ trip.dispatchedAt | date:'MMM d, y' }}</td>
                  <td class="py-3 font-mono text-xs">{{ trip.tloNumber }}</td>
                  <td class="py-3 text-xs">{{ trip.plateNumber }}</td>
                  <td class="py-3 text-xs truncate max-w-[200px]">{{ trip.origin }} ➔ {{ trip.destination }}</td>
                  <td class="py-3 text-right font-mono text-xs tabular-nums">{{ trip.tonnage | number:'1.2-2' }}</td>
                  <td class="py-3 text-right font-mono text-xs text-slate-500 tabular-nums">
                    {{ trip.rateType === 'FLAT_RATE' ? 'FLAT' : (trip.baseRate | number:'1.2-2') }}
                  </td>
                  <td class="py-3 text-right font-mono tabular-nums text-emerald-700">₱{{ trip.totalFreightCharge | number:'1.2-2' }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Financial Summary -->
          <div class="flex justify-end pt-4">
            <div class="w-full max-w-sm">
              <div class="flex justify-between py-2 text-sm text-slate-600">
                <span>Total Trips</span>
                <span class="font-bold text-slate-900">{{ batchTrips().length }}</span>
              </div>
              <div class="flex justify-between py-2 text-sm text-slate-600 border-b border-slate-200">
                <span>Total Weight</span>
                <span class="font-mono font-bold text-slate-900">{{ b.totalWeight | number:'1.2-2' }} T</span>
              </div>
              <div class="flex justify-between py-3 text-sm text-slate-800 font-bold">
                <span>Gross Freight Subtotal</span>
                <span class="font-mono">₱{{ b.grossFreight | number:'1.2-2' }}</span>
              </div>
              
              <!-- Placeholder for future Billing Adjustments -->
              <!-- <div class="flex justify-between py-2 text-sm text-rose-600 font-medium">
                <span>Less: Billing Adjustments</span>
                <span class="font-mono">-₱0.00</span>
              </div> -->

              <div class="flex justify-between py-4 mt-2 border-t-2 border-slate-800">
                <span class="text-lg font-black text-slate-900 uppercase tracking-tight">Billing Total</span>
                <span class="text-xl font-black font-mono text-emerald-700 tabular-nums">₱{{ b.grossFreight | number:'1.2-2' }}</span>
              </div>
            </div>
          </div>
          
          <div class="mt-20 pt-8 border-t border-slate-200 text-center text-xs text-slate-400 font-medium">
            Generated by Porbido Trucking & Hauling System
          </div>
      </div>
    </div>

    <!-- Modals -->
    <!-- Delete Modal -->
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
              Are you sure you want to delete this draft billing batch (<strong>{{ batch()?.billingNumber }}</strong>)? 
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

    <!-- Submit Modal -->
    <div *ngIf="isSubmitModalOpen()" appModalTeleport class="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" (click)="closeSubmitModal()"></div>
      <div class="flex min-h-full items-center justify-center p-4 text-center sm:p-6">
        <div (click)="$event.stopPropagation()" class="relative transform bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden my-auto text-left animate-scale-in border-t-4 border-brand-600">
          <div class="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
            <h2 class="text-lg font-black text-slate-900">Submit Billing Statement</h2>
            <button (click)="closeSubmitModal()" class="text-slate-400 hover:text-slate-600 p-1 flex items-center justify-center cursor-pointer">
              <span class="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
          <div class="p-6 space-y-4">
            <div class="bg-amber-50 text-amber-800 p-4 rounded-xl border border-amber-200 flex items-start gap-3">
              <span class="material-symbols-outlined text-[24px] text-amber-600 flex-shrink-0 mt-0.5">warning</span>
              <div class="text-sm font-medium">
                <strong class="block mb-1 text-amber-900">Important Warning</strong>
                Once submitted, this billing can no longer be edited or deleted. Financial values, included trips, and client information will become strictly immutable.
              </div>
            </div>
            <p class="text-slate-700 text-sm font-medium text-center py-2">
              Are you sure you want to finalize <span class="font-bold text-slate-900">{{ batch()?.billingNumber }}</span>?
            </p>
          </div>
          <div class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
            <button (click)="closeSubmitModal()" class="btn-secondary px-5 py-2 text-sm font-bold cursor-pointer">Cancel</button>
            <button (click)="executeSubmit()" class="btn-primary shadow-brand px-6 py-2 text-sm font-bold cursor-pointer">Yes, Mark as Submitted</button>
          </div>
        </div>
    </div>
    </div>
  `
})
export class DraftBillingDetailComponent implements OnInit {
  tmsService = inject(TmsService);
  route = inject(ActivatedRoute);
  router = inject(Router);

  batchId = signal<string | null>(null);

  // Modals
  isDeleteModalOpen = signal(false);
  isSubmitModalOpen = signal(false);

  // Computed data
  batch = computed(() => {
    const id = this.batchId();
    if (!id) return null;
    return this.tmsService.billingBatches().find(b => b.id === id) || null;
  });

  batchTrips = computed(() => {
    const currentBatch = this.batch();
    if (!currentBatch) return [];
    
    // Find all trips matching this batch ID
    return this.tmsService.dispatches().filter(t => t.billingBatchId === currentBatch.id);
  });

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.batchId.set(params.get('id'));
    });
  }

  openDeleteModal() {
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal() {
    this.isDeleteModalOpen.set(false);
  }

  executeDelete() {
    const b = this.batch();
    if (b && b.status === 'DRAFT') {
      this.tmsService.deleteDraftBilling(b.id);
      this.closeDeleteModal();
      this.router.navigate(['/draft-billing']);
    }
  }

  openSubmitModal() {
    this.isSubmitModalOpen.set(true);
  }

  closeSubmitModal() {
    this.isSubmitModalOpen.set(false);
  }

  executeSubmit() {
    const b = this.batch();
    if (b && b.status === 'DRAFT') {
      this.tmsService.submitDraftBilling(b.id);
      this.closeSubmitModal();
      // Notice: we do NOT route away immediately so the user can see the success banner and immutability lock.
    }
  }
}
