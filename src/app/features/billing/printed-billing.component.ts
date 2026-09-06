import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { TmsService } from '../../core/services/tms.service';
import { BillingStore } from '../../core/application/stores/billing.store';
import { BillingBatch, PaymentRecord } from '../../core/models';

import { ModalTeleportDirective } from '../../shared/directives/modal-teleport.directive';

@Component({
  selector: 'app-printed-billing',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ModalTeleportDirective],
  template: `
    <div class="w-full space-y-6 animate-fade-in-up">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-slate-900 tracking-tight">Printed Billing</h1>
          <p class="text-sm text-slate-500 mt-1">Manage and record payments for finalized billing statements.</p>
        </div>
      </div>

      <!-- Filters -->
      <div class="card p-4 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50 border-b border-slate-200">
        <div class="flex flex-wrap gap-3 flex-1">
          <input type="text" [ngModel]="searchBillingNumber()" (ngModelChange)="searchBillingNumber.set($event)" placeholder="Billing Number" class="form-input text-sm w-48" />
          <select [ngModel]="searchClient()" (ngModelChange)="searchClient.set($event)" class="form-input text-sm w-48">
            <option value="">All Clients</option>
            <option *ngFor="let client of availableClients()" [value]="client">{{ client }}</option>
          </select>
          <select [ngModel]="searchPaymentStatus()" (ngModelChange)="searchPaymentStatus.set($event)" class="form-input text-sm w-48">
            <option value="">All Payment Statuses</option>
            <option value="UNPAID">Unpaid</option>
            <option value="UNDERPAID">Underpaid</option>
            <option value="PAID">Paid</option>
          </select>
          <button (click)="clearFilters()" class="btn-secondary text-sm px-3 py-1.5" *ngIf="searchBillingNumber() || searchClient() || searchPaymentStatus()">Clear Filters</button>
        </div>
      </div>

      <!-- Table Area -->
      <div class="card overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
          <div class="flex items-center gap-4">
            <h2 class="text-base font-bold text-slate-900">Submitted Billings</h2>
            <span class="badge badge-brand">{{ filteredBatches().length }} statements</span>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>BILLING NUMBER</th>
                <th>CLIENT</th>
                <th>BILLING PERIOD</th>
                <th>CREATION DATE</th>
                <th class="text-center">TRIPS</th>
                <th class="text-right">WEIGHT (T)</th>
                <th class="text-right">BILLING TOTAL</th>
                <th class="text-right">AMOUNT PAID</th>
                <th class="text-right">BALANCE DUE</th>
                <th class="text-center">PAYMENT STATUS</th>
                <th class="text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let batch of paginatedBatches()" class="hover:bg-slate-50 transition-colors group">
                <td class="font-bold text-slate-900 font-mono text-sm">
                  <a [routerLink]="['/printed-billing', batch.id]" class="hover:text-brand-600 hover:underline">
                    {{ batch.billingNumber }}
                  </a>
                </td>
                <td class="font-bold text-slate-800 text-sm">{{ batch.client }}</td>
                <td class="text-xs text-slate-500 uppercase">{{ batch.billingPeriod }}</td>
                <td class="text-xs text-slate-600">{{ batch.creationDate | date:'mediumDate' }}</td>
                <td class="text-center font-medium text-slate-700">{{ batch.tripIds.length }}</td>
                <td class="text-right font-medium tabular-nums text-slate-700">{{ batch.totalWeight | number:'1.2-2' }} T</td>
                <td class="text-right font-black tabular-nums text-slate-900">₱{{ batch.grossFreight | number:'1.2-2' }}</td>
                <td class="text-right font-medium tabular-nums text-emerald-600">₱{{ billingStore.getAmountPaid(batch.id) | number:'1.2-2' }}</td>
                <td class="text-right font-bold tabular-nums" [ngClass]="billingStore.getBalanceDue(batch) > 0 ? 'text-rose-600' : 'text-slate-400'">
                  ₱{{ billingStore.getBalanceDue(batch) | number:'1.2-2' }}
                </td>
                <td class="text-center">
                  <span class="badge"
                    [ngClass]="{
                      'badge-neutral': billingStore.getPaymentStatus(batch) === 'UNPAID',
                      'badge-warning': billingStore.getPaymentStatus(batch) === 'UNDERPAID',
                      'badge-success': billingStore.getPaymentStatus(batch) === 'PAID'
                    }">
                    {{ billingStore.getPaymentStatus(batch) }}
                  </span>
                </td>
                <td class="text-right space-x-2">
                  <div class="flex items-center justify-end gap-2">
                    <a [routerLink]="['/printed-billing', batch.id]" class="btn-primary text-xs px-3 py-1.5" title="View Statement">
                      View Statement
                    </a>
                    <button (click)="openPaymentModal(batch)" *ngIf="billingStore.getPaymentStatus(batch) !== 'PAID'" class="btn-secondary text-brand-600 border-brand-200 hover:bg-brand-50 text-xs px-3 py-1.5" title="Record Payment">
                      Record Payment
                    </button>
                    <button (click)="printDocument(batch.id)" class="btn-secondary text-slate-600 text-xs px-2 py-1.5 flex items-center justify-center cursor-pointer" title="Print Statement">
                      <span class="material-symbols-outlined text-[16px]">print</span>
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="paginatedBatches().length === 0">
                <td colspan="11" class="text-center py-12 text-slate-500 font-medium bg-slate-50/50">
                  <div class="mb-2">
                    <span class="material-symbols-outlined text-[36px] text-slate-300 mx-auto mb-2">description</span>
                    <span class="text-lg font-bold text-slate-700 block">No printed billings found</span>
                  </div>
                  <div class="text-sm">Try adjusting your search or filters.</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50" *ngIf="filteredBatches().length > 0">
          <span class="text-xs text-slate-500 font-medium">Showing {{ (currentPage() - 1) * pageSize() + 1 }} - {{ Math.min(currentPage() * pageSize(), filteredBatches().length) }} of {{ filteredBatches().length }}</span>
          <div class="flex gap-2">
            <button class="btn-secondary px-3 py-1 text-xs" [disabled]="currentPage() === 1" (click)="currentPage.set(currentPage() - 1)">Previous</button>
            <button class="btn-secondary px-3 py-1 text-xs" [disabled]="currentPage() >= totalPages()" (click)="currentPage.set(currentPage() + 1)">Next</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Record Payment Modal -->
    <div *ngIf="isPaymentModalOpen()" appModalTeleport class="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" (click)="closePaymentModal()"></div>
      <div class="flex min-h-full items-center justify-center p-4 text-center sm:p-6">
        <div (click)="$event.stopPropagation()" class="relative transform bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden my-auto text-left animate-scale-in">
          <div class="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h2 class="text-lg font-black text-slate-900 uppercase tracking-wide">Record Payment</h2>
            <button (click)="closePaymentModal()" class="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
          </div>
          
          <div class="p-6 space-y-6">
            <!-- Billing Overview Strip -->
            <div class="grid grid-cols-4 gap-4 bg-slate-50 rounded-xl p-4 border border-slate-200">
              <div class="space-y-1">
                <div class="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Billing Number</div>
                <div class="font-mono font-bold text-slate-900">{{ activePaymentBatch?.billingNumber }}</div>
              </div>
              <div class="space-y-1 text-right">
                <div class="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Billing Total</div>
                <div class="font-mono font-black text-slate-900">₱{{ activePaymentBatch?.grossFreight | number:'1.2-2' }}</div>
              </div>
              <div class="space-y-1 text-right">
                <div class="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Amount Paid</div>
                <div class="font-mono font-bold text-emerald-600">₱{{ tmsService.getAmountPaid(activePaymentBatch!.id) | number:'1.2-2' }}</div>
              </div>
              <div class="space-y-1 text-right border-l border-slate-200 pl-4">
                <div class="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Balance Due</div>
                <div class="font-mono font-black text-rose-600 text-lg leading-none mt-1">₱{{ tmsService.getBalanceDue(activePaymentBatch!.id) | number:'1.2-2' }}</div>
              </div>
            </div>

            <!-- Payment Details -->
            <div class="space-y-4">
              <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Payment Details</h3>
              
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="form-label">Amount Received (₱) <span class="text-rose-500">*</span></label>
                  <input type="number" [(ngModel)]="paymentForm.amountReceived" class="form-input w-full font-mono text-lg font-bold text-emerald-700" placeholder="0.00" min="0.01" />
                  <p class="text-[10px] text-rose-500 mt-1" *ngIf="paymentForm.amountReceived !== undefined && paymentForm.amountReceived <= 0">Amount must be greater than zero.</p>
                </div>
                <div>
                  <label class="form-label">Payment Date <span class="text-rose-500">*</span></label>
                  <input type="date" [(ngModel)]="paymentForm.paymentDate" class="form-input w-full" />
                  <p class="text-[10px] text-rose-500 mt-1" *ngIf="!paymentForm.paymentDate">Date is required.</p>
                </div>
              </div>

              <div>
                <label class="form-label">Payment Method <span class="text-rose-500">*</span></label>
                <select [(ngModel)]="paymentForm.paymentMethod" class="form-input w-full">
                  <option value="" disabled>Select a method...</option>
                  <option value="Bank Transfer">Bank Transfer (InstaPay/PESONet)</option>
                  <option value="Check">Check Deposit</option>
                  <option value="Cash">Cash</option>
                  <option value="GCash">GCash / E-Wallet</option>
                </select>
                <p class="text-[10px] text-rose-500 mt-1" *ngIf="!paymentForm.paymentMethod">Payment method is required.</p>
              </div>
            </div>

            <!-- Payment Evidence -->
            <div class="space-y-4">
              <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-baseline gap-2">
                Payment Evidence 
                <span class="text-[10px] text-slate-400 normal-case tracking-normal font-normal">(Provide at least one)</span>
                <span class="text-rose-500">*</span>
              </h3>
              
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="text-xs font-medium text-slate-600 block mb-1">Reference Code</label>
                  <input type="text" [(ngModel)]="paymentForm.referenceCode" class="form-input w-full text-sm" placeholder="e.g. BDO-123456" />
                </div>
                <div>
                  <label class="text-xs font-medium text-slate-600 block mb-1">Receipt Evidence</label>
                  <input type="text" [(ngModel)]="paymentForm.receiptImageUrl" class="form-input w-full text-sm" placeholder="Filename or URL" />
                </div>
              </div>
              <p class="text-[11px] text-rose-600 font-bold bg-rose-50 p-2 rounded-md border border-rose-200" *ngIf="!hasValidEvidence()">
                Validation Error: You must provide either a Reference Code or Receipt Evidence to proceed.
              </p>
            </div>
          </div>
          
          <div class="bg-amber-50 text-amber-800 p-3 rounded-xl border border-amber-200/50 text-xs flex gap-2.5 items-start">
            <span class="material-symbols-outlined text-[18px] text-amber-600 shrink-0 mt-0.5">info</span>
            <span>Ensure the payment amount and details are correct. Confirmed payments are recorded permanently and cannot be edited.</span>
          </div>

          <div class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
            <button (click)="closePaymentModal()" class="btn-secondary px-5 py-2 text-sm font-bold cursor-pointer">Cancel</button>
            <button (click)="confirmPayment()" class="btn-primary px-6 py-2 text-sm shadow-brand font-bold cursor-pointer" [disabled]="!isPaymentFormValid()">Confirm Payment</button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class PrintedBillingComponent {
  billingStore = inject(BillingStore);
  tmsService = inject(TmsService);
  router = inject(Router);
  Math = Math;

  // Search & Filter State
  searchBillingNumber = signal('');
  searchClient = signal('');
  searchPaymentStatus = signal('');

  // Pagination State
  currentPage = signal(1);
  pageSize = signal(15);

  // Modal State
  isPaymentModalOpen = signal(false);
  activePaymentBatch: BillingBatch | null = null;
  paymentForm: Partial<PaymentRecord> = {};

  availableClients = computed(() => {
    const clients = new Set<string>();
    this.billingStore.submittedBatches().forEach(b => {
      if (b.client) clients.add(b.client);
    });
    return Array.from(clients).sort();
  });

  filteredBatches = computed(() => {
    let batches = this.billingStore.submittedBatches();
    
    const billingNum = this.searchBillingNumber().toLowerCase();
    const client = this.searchClient();
    const payStatus = this.searchPaymentStatus();
    
    if (billingNum) {
      batches = batches.filter(b => b.billingNumber.toLowerCase().includes(billingNum));
    }
    if (client) {
      batches = batches.filter(b => b.client === client);
    }
    if (payStatus) {
      batches = batches.filter(b => this.billingStore.getPaymentStatus(b) === payStatus);
    }

    return batches;
  });

  paginatedBatches = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredBatches().slice(start, start + this.pageSize());
  });

  totalPages = computed(() => Math.ceil(this.filteredBatches().length / this.pageSize()));

  clearFilters() {
    this.searchBillingNumber.set('');
    this.searchClient.set('');
    this.searchPaymentStatus.set('');
    this.currentPage.set(1);
  }

  printDocument(batchId: string) {
    this.router.navigate(['/printed-billing', batchId], { queryParams: { print: 'true' } });
  }

  // Modal Logic
  openPaymentModal(batch: BillingBatch) {
    this.activePaymentBatch = batch;
    const balanceDue = this.tmsService.getBalanceDue(batch.id);
    this.paymentForm = {
      billingBatchId: batch.id,
      amountReceived: balanceDue > 0 ? balanceDue : undefined, // Pre-fill remaining balance
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: '',
      referenceCode: '',
      receiptImageUrl: ''
    };
    this.isPaymentModalOpen.set(true);
  }

  closePaymentModal() {
    this.isPaymentModalOpen.set(false);
    this.activePaymentBatch = null;
    this.paymentForm = {};
  }

  hasValidEvidence(): boolean {
    if (this.paymentForm.paymentMethod === 'Cash') return true;
    const hasRef = !!this.paymentForm.referenceCode && this.paymentForm.referenceCode.trim().length > 0;
    const hasImg = !!this.paymentForm.receiptImageUrl && this.paymentForm.receiptImageUrl.trim().length > 0;
    return hasRef || hasImg;
  }

  isPaymentFormValid(): boolean {
    const amountValid = !!this.paymentForm.amountReceived && this.paymentForm.amountReceived > 0;
    const dateValid = !!this.paymentForm.paymentDate;
    const methodValid = !!this.paymentForm.paymentMethod;
    
    return amountValid && dateValid && methodValid && this.hasValidEvidence();
  }

  confirmPayment() {
    if (!this.isPaymentFormValid() || !this.activePaymentBatch) return;

    this.tmsService.recordPayment(this.paymentForm as Omit<PaymentRecord, 'id'>);
    
    this.closePaymentModal();
  }
}
