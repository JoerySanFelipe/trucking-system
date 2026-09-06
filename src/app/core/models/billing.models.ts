export type BillingBatchStatus = 'DRAFT' | 'SUBMITTED';

export interface BillingBatch {
  id: string;
  billingNumber: string;
  client: string;
  billingPeriod: string;
  creationDate: string;
  tripIds: string[];
  totalWeight: number;
  grossFreight: number;
  status: BillingBatchStatus;
}

export type PaymentStatus = 'UNPAID' | 'PAID' | 'UNDERPAID';
export type PaymentRecordStatus = 'PENDING' | 'CONFIRMED';

export interface PaymentRecord {
  id: string;
  billingBatchId: string;
  amountReceived: number;
  paymentDate: string;
  paymentMethod: string;
  referenceCode?: string;
  receiptImageUrl?: string;
  status: PaymentRecordStatus;
}
