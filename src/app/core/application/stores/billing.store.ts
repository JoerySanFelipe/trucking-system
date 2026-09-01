import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { BillingBatch, PaymentRecord, TripDispatch, PaymentStatus } from '../../models/tms.models';
import { FirestoreAdapterService } from '../../infrastructure/firebase/firestore-adapter.service';

@Injectable({
  providedIn: 'root'
})
export class BillingStore {
  private firestore = inject(FirestoreAdapterService);

  // State Signals
  readonly batches = signal<BillingBatch[]>([]);
  readonly payments = signal<PaymentRecord[]>([]);

  // Loading State Signals
  readonly isLoadingBatches = signal<boolean>(true);
  readonly isLoadingPayments = signal<boolean>(true);
  readonly isLoading = computed(() => this.isLoadingBatches() || this.isLoadingPayments());

  // Computed Views
  readonly draftBatches = computed(() => 
    this.batches().filter(b => b.status === 'DRAFT')
  );

  readonly submittedBatches = computed(() => 
    this.batches().filter(b => b.status === 'SUBMITTED')
  );

  // O(1) Indexing: Map batchId -> Confirmed Total Amount Paid
  readonly paymentsMap = computed(() => {
    const map = new Map<string, number>();
    for (const p of this.payments()) {
      if (p.status === 'CONFIRMED') {
        map.set(p.billingBatchId, (map.get(p.billingBatchId) || 0) + p.amountReceived);
      }
    }
    return map;
  });

  constructor() {
    this.initPersistence();
  }

  private initPersistence() {
    // 1. Connect Firestore Live Sync for Billing Batches
    this.firestore.observeCollection<BillingBatch>('billingBatches', cloudBatches => {
      this.batches.set(cloudBatches || []);
      this.isLoadingBatches.set(false);
    }, () => {
      this.isLoadingBatches.set(false);
    });

    // 2. Connect Firestore Live Sync for Payments
    this.firestore.observeCollection<PaymentRecord>('payments', cloudPayments => {
      this.payments.set(cloudPayments || []);
      this.isLoadingPayments.set(false);
    }, () => {
      this.isLoadingPayments.set(false);
    });
  }

  getAmountPaid(batchId: string): number {
    return this.paymentsMap().get(batchId) || 0;
  }

  getBalanceDue(batch: BillingBatch): number {
    const paid = this.getAmountPaid(batch.id);
    return Math.max(batch.grossFreight - paid, 0);
  }

  getPaymentStatus(batch: BillingBatch): PaymentStatus {
    const paid = this.getAmountPaid(batch.id);
    if (paid <= 0) return 'UNPAID';
    if (paid >= batch.grossFreight) return 'PAID';
    return 'UNDERPAID';
  }

  getBatchById(id: string): BillingBatch | undefined {
    return this.batches().find(b => b.id === id);
  }

  async createDraftBatch(trips: TripDispatch[], client: string, billingPeriod: string): Promise<BillingBatch> {
    const totalWeight = trips.reduce((sum, t) => sum + t.tonnage, 0);
    const grossFreight = trips.reduce((sum, t) => sum + t.totalFreightCharge, 0);
    const batchNumber = `BILL-2026-${(this.batches().length + 1).toString().padStart(4, '0')}`;

    const newBatch: BillingBatch = {
      id: 'batch-' + Date.now(),
      billingNumber: batchNumber,
      client,
      billingPeriod,
      creationDate: new Date().toISOString().split('T')[0],
      tripIds: trips.map(t => t.id),
      totalWeight,
      grossFreight,
      status: 'DRAFT'
    };

    // Optimistic UI Update
    this.batches.update(list => [newBatch, ...list]);

    // Cloud Persistence
    await this.firestore.saveDocument('billingBatches', newBatch.id, newBatch);
    return newBatch;
  }

  async submitDraftBatch(batchId: string): Promise<void> {
    this.batches.update(list => 
      list.map(b => b.id === batchId ? { ...b, status: 'SUBMITTED' } : b)
    );
    await this.firestore.updateDocument('billingBatches', batchId, { status: 'SUBMITTED' });
  }

  async deleteDraftBatch(batchId: string): Promise<void> {
    this.batches.update(list => list.filter(b => b.id !== batchId));
    await this.firestore.deleteDocument('billingBatches', batchId);
  }

  async recordPayment(payment: Omit<PaymentRecord, 'id'>): Promise<PaymentRecord> {
    const newPayment: PaymentRecord = {
      ...payment,
      id: 'pay-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5)
    };

    this.payments.update(list => [newPayment, ...list]);
    await this.firestore.saveDocument('payments', newPayment.id, newPayment);
    return newPayment;
  }
}
