import { Component, inject, computed, signal, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TmsService } from '../../core/services/tms.service';
import { BillingBatch, PaymentRecord } from '../../core/models/tms.models';

import { ModalTeleportDirective } from '../../shared/directives/modal-teleport.directive';

@Component({
  selector: 'app-printed-billing-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ModalTeleportDirective],
  template: `
    <div class="min-h-screen bg-slate-100 p-4 md:p-8 animate-fade-in-up print:p-0 print:bg-white print:min-h-0">
      
      <!-- Back Navigation / Workspace Context (Hidden in Print) -->
      <div class="max-w-[1024px] mx-auto mb-6 flex items-center justify-between print:hidden">
        <a routerLink="/printed-billing" class="text-sm font-bold text-slate-500 hover:text-brand-600 inline-flex items-center gap-1.5 transition-colors cursor-pointer">
          <span class="material-symbols-outlined text-[18px]">arrow_back</span>
          <span>Back to Printed Billing</span>
        </a>
      </div>

      <!-- Error State (Not Found) -->
      <div *ngIf="!batch()" class="max-w-[1024px] mx-auto card p-12 text-center bg-white shadow-sm border border-slate-200 print:hidden">
        <h2 class="text-2xl font-bold text-slate-800 mb-2">Billing Not Found</h2>
        <p class="text-slate-500 mb-6">The requested billing document could not be loaded.</p>
        <a routerLink="/printed-billing" class="btn-primary px-6 py-2">Return to Workspace</a>
      </div>

      <!-- Document & Action Bar Container -->
      <div *ngIf="batch() as b" class="max-w-[1024px] mx-auto space-y-6 print:space-y-0 print:w-full print:max-w-none">
        
        <!-- Action Bar (Top) (Hidden in Print) -->
        <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between print:hidden">
          <div class="flex items-center gap-3">
            <span class="badge"
              [ngClass]="{
                'badge-neutral': tmsService.getPaymentStatus(b.id) === 'UNPAID',
                'badge-warning': tmsService.getPaymentStatus(b.id) === 'UNDERPAID',
                'badge-success': tmsService.getPaymentStatus(b.id) === 'PAID'
              }">
              {{ tmsService.getPaymentStatus(b.id) }}
            </span>
            <span class="text-sm font-bold text-slate-700">Balance Due: ₱{{ tmsService.getBalanceDue(b.id) | number:'1.2-2' }}</span>
          </div>
          <div class="flex items-center gap-3">
            <button (click)="openPaymentModal()" *ngIf="tmsService.getPaymentStatus(b.id) !== 'PAID'" class="btn-secondary text-brand-600 border-brand-200 hover:bg-brand-50 hover:border-brand-300 text-sm px-4 py-2 font-bold shadow-sm">Record Payment</button>
            <button (click)="printDocument()" class="btn-primary shadow-brand text-sm px-6 py-2 font-bold inline-flex items-center gap-2 cursor-pointer">
              <span class="material-symbols-outlined text-[16px]">print</span>
              <span>Print Statement</span>
            </button>
          </div>
        </div>

        <!-- The Professional Document Surface (Landscape / A4 feel) -->
        <div class="bg-white rounded-none shadow-xl border border-slate-300 p-10 md:p-14 overflow-hidden relative print:shadow-none print:border-none print:p-0 print:m-0" style="min-height: 21cm;">
          
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
                <tr *ngIf="batchTrips().length === 0">
                  <td colspan="7" class="py-4 text-center text-sm text-slate-500">No trips recorded for this billing batch.</td>
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
              
              <div class="flex justify-between py-4 mt-2 border-t-2 border-slate-800 bg-slate-50/50 -mx-4 px-4 rounded-lg print:bg-transparent print:mx-0 print:px-0">
                <span class="text-lg font-black text-slate-900 uppercase tracking-tight">Billing Total</span>
                <span class="text-xl font-black font-mono text-emerald-700 tabular-nums">₱{{ b.grossFreight | number:'1.2-2' }}</span>
              </div>

              <!-- Payment Summary (Phase 3 specific) -->
              <div class="flex justify-between py-2 mt-4 text-sm text-slate-600">
                <span class="font-bold uppercase tracking-wider text-[11px]">Total Amount Paid</span>
                <span class="font-mono font-bold text-emerald-600">₱{{ tmsService.getAmountPaid(b.id) | number:'1.2-2' }}</span>
              </div>
              <div class="flex justify-between py-3 border-t border-slate-200">
                <span class="font-bold uppercase tracking-wider text-[11px] text-rose-700">Balance Due</span>
                <span class="font-mono font-black text-rose-600 tabular-nums text-lg">₱{{ tmsService.getBalanceDue(b.id) | number:'1.2-2' }}</span>
              </div>
            </div>
          </div>
          
          <!-- Payment History Table (Visible only if there are payments) -->
          <div class="mt-16 pt-8 border-t border-slate-200" *ngIf="batchPayments().length > 0">
             <h3 class="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Payment History</h3>
             <table class="w-full text-xs text-left">
              <thead>
                <tr class="bg-slate-100 text-slate-700 uppercase tracking-wider border-b border-slate-200">
                  <th class="py-2.5 px-3 font-bold">Date</th>
                  <th class="py-2.5 px-3 font-bold">Method</th>
                  <th class="py-2.5 px-3 font-bold">Reference / Evidence</th>
                  <th class="py-2.5 px-3 font-bold text-right">Amount (₱)</th>
                  <th class="py-2.5 px-3 font-bold text-center">Status</th>
                </tr>
              </thead>
              <tbody class="text-slate-700">
                <tr *ngFor="let p of batchPayments()" class="border-b border-slate-50 print:border-slate-200">
                  <td class="py-2">{{ p.paymentDate | date:'MMM d, y' }}</td>
                  <td class="py-2 font-medium">{{ p.paymentMethod }}</td>
                  <td class="py-2 font-mono text-[10px]">{{ p.referenceCode || p.receiptImageUrl }}</td>
                  <td class="py-2 text-right font-mono font-bold text-emerald-600">₱{{ p.amountReceived | number:'1.2-2' }}</td>
                  <td class="py-2 text-center">
                    <span class="badge badge-success text-[9px] py-0.5 print:border print:border-emerald-200">{{ p.status }}</span>
                  </td>
                </tr>
              </tbody>
             </table>
          </div>

          <div class="mt-20 pt-8 border-t border-slate-200 text-center text-xs text-slate-400 font-medium">
            Generated by Porbido Trucking & Hauling System
          </div>
        </div>
      </div>
    </div>

    <!-- Record Payment Modal (Same as workspace modal) -->
    <div *ngIf="isPaymentModalOpen()" appModalTeleport class="fixed inset-0 z-50 overflow-y-auto print:hidden" role="dialog" aria-modal="true">
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" (click)="closePaymentModal()"></div>
      <div class="flex min-h-full items-center justify-center p-4 text-center sm:p-6">
        <div (click)="$event.stopPropagation()" class="relative transform bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden my-auto text-left animate-scale-in">
          <div class="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h2 class="text-lg font-black text-slate-900 uppercase tracking-wide">Record Payment</h2>
            <button (click)="closePaymentModal()" class="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
          </div>
          
          <div class="p-6 space-y-6" *ngIf="batch() as activePaymentBatch">
            <!-- Billing Overview Strip -->
            <div class="grid grid-cols-4 gap-4 bg-slate-50 rounded-xl p-4 border border-slate-200">
              <div class="space-y-1">
                <div class="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Billing Number</div>
                <div class="font-mono font-bold text-slate-900">{{ activePaymentBatch.billingNumber }}</div>
              </div>
              <div class="space-y-1 text-right">
                <div class="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Billing Total</div>
                <div class="font-mono font-black text-slate-900">₱{{ activePaymentBatch.grossFreight | number:'1.2-2' }}</div>
              </div>
              <div class="space-y-1 text-right">
                <div class="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Amount Paid</div>
                <div class="font-mono font-bold text-emerald-600">₱{{ tmsService.getAmountPaid(activePaymentBatch.id) | number:'1.2-2' }}</div>
              </div>
              <div class="space-y-1 text-right border-l border-slate-200 pl-4">
                <div class="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Balance Due</div>
                <div class="font-mono font-black text-rose-600 text-lg leading-none mt-1">₱{{ tmsService.getBalanceDue(activePaymentBatch.id) | number:'1.2-2' }}</div>
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
            
            <div class="bg-amber-50 text-amber-800 p-3 rounded-xl border border-amber-200/50 text-xs flex gap-2.5 items-start">
              <span class="material-symbols-outlined text-[18px] text-amber-600 shrink-0 mt-0.5">info</span>
              <span>Ensure the payment amount and details are correct. Confirmed payments are recorded permanently and cannot be edited.</span>
            </div>
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
export class PrintedBillingDetailComponent implements OnInit, AfterViewInit {
  tmsService = inject(TmsService);
  route = inject(ActivatedRoute);

  batchId = signal<string | null>(null);

  // Modal State
  isPaymentModalOpen = signal(false);
  paymentForm: Partial<PaymentRecord> = {};

  // Computed data
  batch = computed(() => {
    const id = this.batchId();
    if (!id) return null;
    return this.tmsService.submittedBillingBatches().find(b => b.id === id) || null;
  });

  batchTrips = computed(() => {
    const currentBatch = this.batch();
    if (!currentBatch) return [];
    
    // Find all trips matching this batch ID
    return this.tmsService.dispatches().filter(t => currentBatch.tripIds.includes(t.id));
  });

  batchPayments = computed(() => {
    const currentBatch = this.batch();
    if (!currentBatch) return [];
    return this.tmsService.payments().filter(p => p.billingBatchId === currentBatch.id && p.status === 'CONFIRMED');
  });

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.batchId.set(params.get('id'));
    });
  }

  ngAfterViewInit() {
    this.route.queryParamMap.subscribe(params => {
      if (params.get('print') === 'true') {
        // slight delay to ensure render is complete
        setTimeout(() => this.printDocument(), 500);
      }
    });
  }

  printDocument() {
    window.print();
  }

  // Modal Logic
  openPaymentModal() {
    const b = this.batch();
    if (!b) return;

    const balanceDue = this.tmsService.getBalanceDue(b.id);
    this.paymentForm = {
      billingBatchId: b.id,
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
    const b = this.batch();
    if (!this.isPaymentFormValid() || !b) return;

    this.tmsService.recordPayment(this.paymentForm as Omit<PaymentRecord, 'id'>);
    
    this.closePaymentModal();
  }
}
