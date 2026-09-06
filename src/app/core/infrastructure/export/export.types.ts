export interface TripDossierProofItem {
  id?: string;
  title?: string;
  category?: string;
  url?: string;
  timestamp?: string;
  status?: string;
  flagReason?: string;
  cohEntryId?: string;
  amount?: number;
  transactionType?: 'CREDIT' | 'DEBIT';
}

export interface ReportPdfOptions {
  fileName: string;
  documentTitle: string; // 'TRUCK RECORDS' | 'CREW RECORDS'
  generationDate?: string;
  generatedBy?: string;
  headers: any[];
  rows: (string | number)[][];
  totalRow?: (string | number)[];
  fontSize?: number;
  cellPadding?: any;
  columnStyles?: { [key: number]: { cellWidth?: number | 'auto'; halign?: 'left' | 'center' | 'right' } };
}

export interface ReportExcelOptions {
  fileName: string;
  documentTitle: string; // 'TRUCK RECORDS' | 'CREW RECORDS'
  generationDate?: string;
  generatedBy?: string;
  headers: string[];
  rows: (string | number)[][];
  totalRow?: (string | number)[];
}

export interface TripFinancialMetrics {
  fuel: number;
  toll: number;
  meals: number;
  maintenance: number;
  others: number;
  totalDebit: number;
  totalCredit: number;
  baseRate: number;
  tonnage: number;
  grossFreight: number;
  driverSalary: number;
  helperSalary: number;
  totalCrewPayroll: number;
  netTripIncome: number;
  margin: number;
  prevAmt: number;
  prevType: string;
  signedCarryover: number;
  startingCOH: number;
  endingBalance: number;
  endingType: 'SURPLUS' | 'DEFICIT' | 'BALANCED';
}
