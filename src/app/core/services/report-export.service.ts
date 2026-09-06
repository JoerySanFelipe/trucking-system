import { Injectable, inject } from '@angular/core';
import * as ExcelJS from 'exceljs';
import { FleetAsset, CrewMember, TripDispatch, COHEntry } from '../models';
import { PORBIDO_LOGO_BASE64 } from '../constants/report-logo.constant';
import { formatAppDate } from '../utils/date-formatter';
import { FirebaseService } from './firebase.service';
import {
  TripDossierProofItem,
  ReportPdfOptions,
  ReportExcelOptions,
  PdfTableBuilder,
  ExcelWorkbookBuilder,
  TripFinancialMetricsCalculator,
  TripDossierPdfBuilder,
  TripDossierExcelBuilder
} from '../infrastructure/export';

// Re-export for backward compatibility
export type { TripDossierProofItem, ReportPdfOptions, ReportExcelOptions };

/**
 * ReportExportService - Facade Service for PDF & Excel document generation.
 * Follows the Single Responsibility Principle by delegating complex rendering pipelines
 * to dedicated builders in `src/app/core/infrastructure/export/`.
 */
@Injectable({
  providedIn: 'root'
})
export class ReportExportService {
  private firebaseService = inject(FirebaseService);

  readonly PAGE_WIDTH_MM = PdfTableBuilder.PAGE_WIDTH_MM;
  readonly PAGE_HEIGHT_MM = PdfTableBuilder.PAGE_HEIGHT_MM;
  readonly MARGIN_MM = PdfTableBuilder.MARGIN_MM;

  // ─── CORE PDF & EXCEL BUILDERS (DELEGATED) ─────────────────────────────────

  exportEnterprisePdf(options: ReportPdfOptions): void {
    PdfTableBuilder.buildEnterprisePdf(options);
  }

  async exportEnterpriseExcel(options: ReportExcelOptions): Promise<void> {
    await ExcelWorkbookBuilder.buildEnterpriseExcel(options);
  }

  async exportTripDetailsToPdf(
    trip: TripDispatch,
    cohEntries: COHEntry[] = [],
    proofs: TripDossierProofItem[] = []
  ): Promise<void> {
    await TripDossierPdfBuilder.build(trip, cohEntries, proofs, this.firebaseService);
  }

  async exportTripDetailsToExcel(
    trip: TripDispatch,
    cohEntries: COHEntry[] = [],
    proofItems?: TripDossierProofItem[]
  ): Promise<void> {
    await TripDossierExcelBuilder.build(
      trip,
      cohEntries,
      proofItems,
      (b64, folder) => this.firebaseService.uploadBase64Image(b64, folder)
    );
  }

  // ─── TRUCKS CONVENIENCE EXPORTERS ──────────────────────────────────────────

  exportTrucksToPdf(trucks: FleetAsset[]): void {
    const timestamp = this.getFileTimestamp();
    const headers = ['Plate No.', 'Capacity', 'Operational Status', 'Assigned Driver', 'Assigned Helper', 'Last Modified'];

    const rows = trucks.map(t => [
      t.plateNumber || 'N/A',
      `${t.tonsCapacity || 30} Tons`,
      t.status || 'Available',
      t.assignedCrew?.driver?.name && t.assignedCrew.driver.name !== 'None' ? t.assignedCrew.driver.name : 'Unassigned',
      t.assignedCrew?.helper?.name && t.assignedCrew.helper.name !== 'None' ? t.assignedCrew.helper.name : 'None',
      t.updatedAt ? formatAppDate(t.updatedAt) : '—'
    ]);

    const totalCapacity = trucks.reduce((sum, t) => sum + (t.tonsCapacity || 30), 0);
    const totalRow = ['TOTAL UNITS', `${totalCapacity} Tons Total`, `${trucks.length} Units`, '', '', ''];

    this.exportEnterprisePdf({
      fileName: `Porbido_Truck_Records_${timestamp}`,
      documentTitle: 'TRUCK RECORDS',
      generatedBy: 'Operations Administrator',
      headers,
      rows,
      totalRow,
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 35 },
        2: { cellWidth: 42 },
        3: { cellWidth: 'auto' },
        4: { cellWidth: 'auto' },
        5: { cellWidth: 42 }
      }
    });
  }

  async exportTrucksToExcel(trucks: FleetAsset[]): Promise<void> {
    const timestamp = this.getFileTimestamp();
    const headers = ['Plate Number', 'Capacity', 'Operational Status', 'Assigned Driver', 'Assigned Helper', 'Last Modified'];
    const rows = trucks.map(t => [
      t.plateNumber || 'N/A',
      `${t.tonsCapacity || 30} Tons`,
      t.status || 'Available',
      t.assignedCrew?.driver?.name && t.assignedCrew.driver.name !== 'None' ? t.assignedCrew.driver.name : 'Unassigned',
      t.assignedCrew?.helper?.name && t.assignedCrew.helper.name !== 'None' ? t.assignedCrew.helper.name : 'None',
      t.updatedAt ? formatAppDate(t.updatedAt) : '—'
    ]);

    const totalCapacity = trucks.reduce((sum, t) => sum + (t.tonsCapacity || 30), 0);
    const totalRow = ['TOTAL UNITS', `${totalCapacity} Tons Total`, `${trucks.length} Units`, '', '', ''];

    await this.exportEnterpriseExcel({
      fileName: `Porbido_Truck_Records_${timestamp}`,
      documentTitle: 'TRUCK RECORDS',
      generatedBy: 'Operations Administrator',
      headers,
      rows,
      totalRow
    });
  }

  // ─── CREW DIRECTORY CONVENIENCE EXPORTERS ──────────────────────────────────

  exportCrewToPdf(crew: CrewMember[]): void {
    const timestamp = this.getFileTimestamp();
    const headers = ['Full Name', 'Role', 'Employment Type', 'Contact Number', 'Status', 'Email Address'];

    const rows = crew.map(c => [
      c.name || 'N/A',
      c.role || 'Driver',
      c.type || 'Regular',
      c.contactNumber || c.phone || 'N/A',
      c.status || 'Active',
      c.email || '—'
    ]);

    const totalRow = ['TOTAL PERSONNEL', `${crew.length} Members`, '', '', '', ''];

    this.exportEnterprisePdf({
      fileName: `Porbido_Crew_Records_${timestamp}`,
      documentTitle: 'CREW RECORDS',
      generatedBy: 'Operations Administrator',
      headers,
      rows,
      totalRow,
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 35 },
        2: { cellWidth: 38 },
        3: { cellWidth: 45 },
        4: { cellWidth: 35 },
        5: { cellWidth: 'auto' }
      }
    });
  }

  async exportCrewToExcel(crew: CrewMember[]): Promise<void> {
    const timestamp = this.getFileTimestamp();
    const headers = ['Full Name', 'Role', 'Employment Type', 'Contact Number', 'Status', 'Email Address'];
    const rows = crew.map(c => [
      c.name || 'N/A',
      c.role || 'Driver',
      c.type || 'Regular',
      c.contactNumber || c.phone || 'N/A',
      c.status || 'Active',
      c.email || '—'
    ]);

    const totalRow = ['TOTAL PERSONNEL', `${crew.length} Members`, '', '', '', ''];

    await this.exportEnterpriseExcel({
      fileName: `Porbido_Crew_Records_${timestamp}`,
      documentTitle: 'CREW RECORDS',
      generatedBy: 'Operations Administrator',
      headers,
      rows,
      totalRow
    });
  }

  // ─── ONGOING TRIPS CONVENIENCE EXPORTERS ──────────────────────────────────

  exportTripsToPdf(trips: TripDispatch[]): void {
    const timestamp = this.getFileTimestamp();

    const pdfHeaders = [
      [
        { content: 'IDENTIFIERS', colSpan: 6, styles: { halign: 'center', fontStyle: 'bold' } },
        { content: 'ROUTE', colSpan: 2, styles: { halign: 'center', fontStyle: 'bold' } },
        { content: 'FLEET', colSpan: 3, styles: { halign: 'center', fontStyle: 'bold' } },
        { content: 'FINANCIALS', colSpan: 3, styles: { halign: 'center', fontStyle: 'bold' } },
        { content: 'TRANSACTIONS (COH)', colSpan: 3, styles: { halign: 'center', fontStyle: 'bold' } },
        { content: 'PAYROLL', colSpan: 2, styles: { halign: 'center', fontStyle: 'bold' } },
        { content: 'PROFITABILITY', colSpan: 1, styles: { halign: 'center', fontStyle: 'bold' } }
      ],
      [
        'Dispatch Date', 'Client', 'TLO #', 'Trip #', 'Status', 'Tag',
        'Origin', 'Destination',
        'Plate No.', 'Driver', 'Helper',
        'Rate', 'Weight', 'Gross Freight',
        'Allowance (Cr)', 'Expenses (Dr)', 'Cash Balance',
        'Driver Pay', 'Helper Pay',
        'Est. Net Income'
      ]
    ];

    const getCash = (t: TripDispatch) => {
      const entries = (t.cashLedger?.entries && t.cashLedger.entries.length > 0)
        ? t.cashLedger.entries
        : (t.cohEntries || []);
      const credits = entries.filter(e => e.type === 'CREDIT').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const prev = t.previousCarryover || t.previousTripBalance;
      const prevOverage = prev && prev.type === 'OVERAGE' ? (Number(prev.amount) || 0) : 0;
      if (credits > 0 || prevOverage > 0) return credits + prevOverage;
      return (t as any).dispatchAllowance || (t as any).startingCOH || 0;
    };

    const getExpenses = (t: TripDispatch) => {
      const entries = (t.cashLedger?.entries && t.cashLedger.entries.length > 0)
        ? t.cashLedger.entries
        : (t.cohEntries || []);
      const debits = entries.filter(e => e.type === 'DEBIT').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      if (debits > 0) return debits;
      return (t.travelExpenses || 0) + (t.dieselExpenses || 0) + (t.foodExpenses || 0) || (t.cost || 0);
    };

    const getGrossFreight = (t: TripDispatch) => {
      const explicit = Number((t as any).pricing?.grossFreight ?? t.totalFreightCharge ?? t.freightRevenue ?? 0);
      if (explicit > 0) return explicit;
      const rate = Number(t.truckRate || t.baseRate || 0);
      const weight = Number(t.weightTons || t.tonnage || 0);
      const reroute = t.rerouteFee !== undefined ? Number(t.rerouteFee) : (t.rerouteFeeApplied ? 3600 : 0);
      const extra = Number(t.extraFees || 0);
      if (t.rateType === 'FLAT_RATE') {
        return rate + reroute + extra;
      }
      return (weight * rate) + reroute + extra;
    };

    const getDriverPay = (t: TripDispatch) => Number(t.driverSalary || (t as any).driverRate || 2000);
    const getHelperPay = (t: TripDispatch) => Number(t.helperSalary || (t as any).helperRate || (t.helperName && t.helperName !== 'None' && t.helperName !== 'Unassigned' ? 750 : 0));

    const rows = trips.map(t => {
      const rate = Number(t.truckRate || t.baseRate || 0);
      const weight = Number(t.weightTons || t.tonnage || 0);
      const grossFreight = getGrossFreight(t);
      const allowance = getCash(t);
      const expenses = getExpenses(t);
      const cohBalance = allowance - expenses;
      const driverPay = getDriverPay(t);
      const helperPay = getHelperPay(t);
      const estNetIncome = grossFreight - expenses - driverPay - helperPay;

      return [
        t.dispatchedDate || t.dispatchedAt ? formatAppDate(t.dispatchedDate || t.dispatchedAt) : '—',
        t.client || 'Cargill PH, Inc.',
        t.tloNumber ? `TLO #${t.tloNumber}` : '—',
        t.tripNumber !== undefined ? `Trip #${t.tripNumber}` : '—',
        t.status ? t.status.replace(/_/g, ' ') : '—',
        t.routeTag || 'FRONTLOAD',
        t.origin || '—',
        t.destination || '—',
        t.plateNumber || '—',
        t.driverName || '—',
        t.helperName && t.helperName !== 'None' && t.helperName !== 'Unassigned' ? t.helperName : '—',
        rate > 0 ? `₱${rate.toLocaleString()}` : '—',
        weight > 0 ? `${weight.toFixed(2)} T` : '—',
        grossFreight > 0 ? `₱${grossFreight.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—',
        allowance > 0 ? `₱${allowance.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—',
        expenses > 0 ? `₱${expenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—',
        `₱${cohBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        driverPay > 0 ? `₱${driverPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—',
        helperPay > 0 ? `₱${helperPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—',
        `₱${estNetIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
      ];
    });

    const totalWeight = trips.reduce((sum, t) => sum + Number(t.weightTons || t.tonnage || 0), 0);
    const totalGross = trips.reduce((sum, t) => sum + getGrossFreight(t), 0);
    const totalAllowance = trips.reduce((sum, t) => sum + getCash(t), 0);
    const totalExpenses = trips.reduce((sum, t) => sum + getExpenses(t), 0);
    const totalBalance = totalAllowance - totalExpenses;
    const totalDriverPay = trips.reduce((sum, t) => sum + getDriverPay(t), 0);
    const totalHelperPay = trips.reduce((sum, t) => sum + getHelperPay(t), 0);
    const totalNetIncome = totalGross - totalExpenses - totalDriverPay - totalHelperPay;

    const totalRow = [
      'TOTAL',
      `${trips.length} Active Trips`,
      '', '', '', '', '', '', '', '', '',
      '',
      `${totalWeight.toFixed(2)} T`,
      `₱${totalGross.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      `₱${totalAllowance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      `₱${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      `₱${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      `₱${totalDriverPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      `₱${totalHelperPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      `₱${totalNetIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
    ];

    this.exportEnterprisePdf({
      fileName: `Porbido_Ongoing_Trips_${timestamp}`,
      documentTitle: 'ONGOING TRIPS REPORT',
      generatedBy: 'Operations Administrator',
      headers: pdfHeaders,
      rows,
      totalRow,
      fontSize: 6.5,
      cellPadding: { top: 1.5, bottom: 1.5, left: 1.5, right: 1.5 },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 16 },
        2: { cellWidth: 14 },
        3: { cellWidth: 11 },
        4: { cellWidth: 14 },
        5: { cellWidth: 13 },
        6: { cellWidth: 18 },
        7: { cellWidth: 18 },
        8: { cellWidth: 13 },
        9: { cellWidth: 16 },
        10: { cellWidth: 14 },
        11: { cellWidth: 12, halign: 'right' },
        12: { cellWidth: 11, halign: 'right' },
        13: { cellWidth: 16, halign: 'right' },
        14: { cellWidth: 15, halign: 'right' },
        15: { cellWidth: 15, halign: 'right' },
        16: { cellWidth: 15, halign: 'right' },
        17: { cellWidth: 13, halign: 'right' },
        18: { cellWidth: 13, halign: 'right' },
        19: { cellWidth: 16, halign: 'right' }
      }
    });
  }

  async exportTripsToExcel(trips: TripDispatch[]): Promise<void> {
    const timestamp = this.getFileTimestamp();
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Porbido TMS';
    workbook.created = new Date();
    workbook.modified = new Date();

    const thinBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };

    const now = new Date();
    const formattedDate = `${now.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })} • ${now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })}`;

    // Worksheet 1: Company Info
    const infoSheet = workbook.addWorksheet('Company Info', { views: [{ showGridLines: true }] });
    infoSheet.columns = [{ width: 5 }, { width: 28 }, { width: 55 }, { width: 20 }];

    if (PORBIDO_LOGO_BASE64) {
      try {
        const logoId = workbook.addImage({ base64: PORBIDO_LOGO_BASE64, extension: 'png' });
        infoSheet.addImage(logoId, { tl: { col: 1, row: 1 }, ext: { width: 220, height: 62 } });
      } catch { }
    }

    infoSheet.getRow(1).height = 18;
    infoSheet.getRow(2).height = 18;
    infoSheet.getRow(3).height = 18;
    infoSheet.getRow(4).height = 18;
    infoSheet.getRow(5).height = 12;

    const r6 = infoSheet.getRow(6);
    r6.getCell(2).value = 'PORBIDO TRUCKING & HAULING SERVICE';
    r6.getCell(2).font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FF1E3A5F' } };
    r6.height = 20;

    const r7 = infoSheet.getRow(7);
    r7.getCell(2).value = 'ZONE 1 SAN VICENTE EAST, URDANETA CITY';
    r7.getCell(2).font = { name: 'Arial', size: 10, color: { argb: 'FF64748B' } };
    r7.height = 16;

    infoSheet.getRow(8).height = 12;

    const r9 = infoSheet.getRow(9);
    r9.getCell(2).value = 'DOCUMENT AUDIT PROFILE';
    r9.getCell(2).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1E3A5F' } };
    infoSheet.mergeCells('B9:C9');
    r9.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    r9.getCell(2).border = thinBorder;
    r9.height = 22;

    const metaItems = [
      { key: 'Document Title', val: 'ONGOING TRIPS REPORT' },
      { key: 'Generation Date & Time', val: formattedDate },
      { key: 'Generated By', val: 'Operations Administrator' },
      { key: 'Total Records Exported', val: `${trips.length} Active Trips` },
      { key: 'Confidentiality Level', val: 'OFFICIAL USE ONLY (PROPRIETARY)' }
    ];

    let currentInfoRow = 10;
    for (const item of metaItems) {
      const row = infoSheet.getRow(currentInfoRow);
      row.getCell(2).value = item.key;
      row.getCell(2).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF475569' } };
      row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      row.getCell(2).border = thinBorder;

      row.getCell(3).value = item.val;
      row.getCell(3).font = { name: 'Arial', size: 10, color: { argb: 'FF1E293B' } };
      row.getCell(3).border = thinBorder;
      row.height = 20;
      currentInfoRow++;
    }

    currentInfoRow++;
    const rFooter1 = infoSheet.getRow(currentInfoRow);
    rFooter1.getCell(2).value = 'PORBIDO TMS — CONFIDENTIAL & PROPRIETARY | FOR AUTHORIZED OFFICIAL USE ONLY';
    rFooter1.getCell(2).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF94A3B8' } };
    currentInfoRow++;

    const rFooter2 = infoSheet.getRow(currentInfoRow);
    rFooter2.getCell(2).value = 'System-generated document';
    rFooter2.getCell(2).font = { name: 'Arial', size: 8.5, italic: true, color: { argb: 'FF94A3B8' } };

    // Worksheet 2: Data
    const dataSheet = workbook.addWorksheet('Data', { views: [{ showGridLines: true }] });
    dataSheet.columns = [
      { width: 14 }, { width: 16 }, { width: 14 }, { width: 12 }, { width: 14 }, { width: 13 },
      { width: 22 }, { width: 22 }, { width: 14 }, { width: 18 }, { width: 16 },
      { width: 14 }, { width: 13 }, { width: 18 },
      { width: 18 }, { width: 18 }, { width: 18 },
      { width: 16 }, { width: 16 }, { width: 18 }
    ];

    const topHeaderRow = dataSheet.getRow(1);
    topHeaderRow.height = 20;

    dataSheet.mergeCells('A1:F1');
    topHeaderRow.getCell(1).value = 'TRIP IDENTIFIERS';
    dataSheet.mergeCells('G1:H1');
    topHeaderRow.getCell(7).value = 'ROUTE';
    dataSheet.mergeCells('I1:K1');
    topHeaderRow.getCell(9).value = 'FLEET ASSETS';
    dataSheet.mergeCells('L1:N1');
    topHeaderRow.getCell(12).value = 'FREIGHT FINANCIALS';
    dataSheet.mergeCells('O1:Q1');
    topHeaderRow.getCell(15).value = 'TRANSACTIONS & COH';
    dataSheet.mergeCells('R1:S1');
    topHeaderRow.getCell(18).value = 'CREW PAYROLL';
    topHeaderRow.getCell(20).value = 'NET PROFITABILITY';

    for (let c = 1; c <= 20; c++) {
      const cell = topHeaderRow.getCell(c);
      cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF1E3A5F' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = thinBorder;
    }

    const subHeaderRow = dataSheet.getRow(2);
    subHeaderRow.height = 22;
    const subHeaders = [
      'Dispatch Date', 'Client', 'TLO #', 'Trip #', 'Status', 'Tag',
      'Origin', 'Destination',
      'Plate No.', 'Driver', 'Helper',
      'Rate (PHP)', 'Weight (Tons)', 'Gross Freight (PHP)',
      'Allowance (Cr)', 'Expenses (Dr)', 'COH Balance (PHP)',
      'Driver Pay (PHP)', 'Helper Pay (PHP)',
      'Est. Net Income (PHP)'
    ];

    subHeaders.forEach((sh, idx) => {
      const cell = subHeaderRow.getCell(idx + 1);
      cell.value = sh;
      cell.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF1E3A5F' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = thinBorder;
    });

    const getCash = (t: TripDispatch) => {
      const entries = (t.cashLedger?.entries && t.cashLedger.entries.length > 0)
        ? t.cashLedger.entries
        : (t.cohEntries || []);
      const credits = entries.filter(e => e.type === 'CREDIT').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const prev = t.previousCarryover || t.previousTripBalance;
      const prevOverage = prev && prev.type === 'OVERAGE' ? (Number(prev.amount) || 0) : 0;
      if (credits > 0 || prevOverage > 0) return credits + prevOverage;
      return (t as any).dispatchAllowance || (t as any).startingCOH || 0;
    };

    const getExpenses = (t: TripDispatch) => {
      const entries = (t.cashLedger?.entries && t.cashLedger.entries.length > 0)
        ? t.cashLedger.entries
        : (t.cohEntries || []);
      const debits = entries.filter(e => e.type === 'DEBIT').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      if (debits > 0) return debits;
      return (t.travelExpenses || 0) + (t.dieselExpenses || 0) + (t.foodExpenses || 0) || (t.cost || 0);
    };

    const getGrossFreight = (t: TripDispatch) => {
      const explicit = Number((t as any).pricing?.grossFreight ?? t.totalFreightCharge ?? t.freightRevenue ?? 0);
      if (explicit > 0) return explicit;
      const rate = Number(t.truckRate || t.baseRate || 0);
      const weight = Number(t.weightTons || t.tonnage || 0);
      const reroute = t.rerouteFee !== undefined ? Number(t.rerouteFee) : (t.rerouteFeeApplied ? 3600 : 0);
      const extra = Number(t.extraFees || 0);
      if (t.rateType === 'FLAT_RATE') {
        return rate + reroute + extra;
      }
      return (weight * rate) + reroute + extra;
    };

    const getDriverPay = (t: TripDispatch) => Number(t.driverSalary || (t as any).driverRate || 2000);
    const getHelperPay = (t: TripDispatch) => Number(t.helperSalary || (t as any).helperRate || (t.helperName && t.helperName !== 'None' && t.helperName !== 'Unassigned' ? 750 : 0));

    let currentRow = 3;
    trips.forEach((t, i) => {
      const row = dataSheet.getRow(currentRow);
      row.height = 20;

      const rate = Number(t.truckRate || t.baseRate || 0);
      const weight = Number(t.weightTons || t.tonnage || 0);
      const grossFreight = getGrossFreight(t);
      const allowance = getCash(t);
      const expenses = getExpenses(t);
      const cohBalance = allowance - expenses;
      const driverPay = getDriverPay(t);
      const helperPay = getHelperPay(t);
      const estNetIncome = grossFreight - expenses - driverPay - helperPay;

      row.getCell(1).value = t.dispatchedDate || t.dispatchedAt ? formatAppDate(t.dispatchedDate || t.dispatchedAt) : '—';
      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(2).value = t.client || 'Cargill PH, Inc.';
      row.getCell(3).value = t.tloNumber ? `TLO #${t.tloNumber}` : '—';
      row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(4).value = t.tripNumber !== undefined ? `Trip #${t.tripNumber}` : '—';
      row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(5).value = t.status ? t.status.replace(/_/g, ' ') : '—';
      row.getCell(6).value = t.routeTag || 'FRONTLOAD';
      row.getCell(7).value = t.origin || '—';
      row.getCell(8).value = t.destination || '—';
      row.getCell(9).value = t.plateNumber || '—';
      row.getCell(10).value = t.driverName || '—';
      row.getCell(11).value = t.helperName && t.helperName !== 'None' && t.helperName !== 'Unassigned' ? t.helperName : '—';

      row.getCell(12).value = rate;
      row.getCell(12).numFmt = '#,##0.00';
      row.getCell(12).alignment = { horizontal: 'right', vertical: 'middle' };

      row.getCell(13).value = weight;
      row.getCell(13).numFmt = '#,##0.00';
      row.getCell(13).alignment = { horizontal: 'right', vertical: 'middle' };

      row.getCell(14).value = grossFreight;
      row.getCell(14).numFmt = '#,##0.00';
      row.getCell(14).alignment = { horizontal: 'right', vertical: 'middle' };

      row.getCell(15).value = allowance;
      row.getCell(15).numFmt = '#,##0.00';
      row.getCell(15).alignment = { horizontal: 'right', vertical: 'middle' };

      row.getCell(16).value = expenses;
      row.getCell(16).numFmt = '#,##0.00';
      row.getCell(16).alignment = { horizontal: 'right', vertical: 'middle' };

      row.getCell(17).value = cohBalance;
      row.getCell(17).numFmt = '#,##0.00';
      row.getCell(17).alignment = { horizontal: 'right', vertical: 'middle' };

      row.getCell(18).value = driverPay;
      row.getCell(18).numFmt = '#,##0.00';
      row.getCell(18).alignment = { horizontal: 'right', vertical: 'middle' };

      row.getCell(19).value = helperPay;
      row.getCell(19).numFmt = '#,##0.00';
      row.getCell(19).alignment = { horizontal: 'right', vertical: 'middle' };

      row.getCell(20).value = estNetIncome;
      row.getCell(20).numFmt = '#,##0.00';
      row.getCell(20).alignment = { horizontal: 'right', vertical: 'middle' };

      for (let c = 1; c <= 20; c++) {
        row.getCell(c).font = { name: 'Arial', size: 9, color: { argb: 'FF262B35' } };
        row.getCell(c).border = thinBorder;
        if (i % 2 === 1) {
          row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        }
      }

      currentRow++;
    });

    // TOTAL Summary Row
    const totalWeight = trips.reduce((sum, t) => sum + Number(t.weightTons || t.tonnage || 0), 0);
    const totalGross = trips.reduce((sum, t) => sum + getGrossFreight(t), 0);
    const totalAllowance = trips.reduce((sum, t) => sum + getCash(t), 0);
    const totalExpenses = trips.reduce((sum, t) => sum + getExpenses(t), 0);
    const totalBalance = totalAllowance - totalExpenses;
    const totalDriverPay = trips.reduce((sum, t) => sum + getDriverPay(t), 0);
    const totalHelperPay = trips.reduce((sum, t) => sum + getHelperPay(t), 0);
    const totalNetIncome = totalGross - totalExpenses - totalDriverPay - totalHelperPay;

    const totRow = dataSheet.getRow(currentRow);
    totRow.height = 22;

    totRow.getCell(1).value = 'TOTAL';
    totRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    totRow.getCell(2).value = `${trips.length} Active Trips`;
    totRow.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };

    totRow.getCell(13).value = totalWeight;
    totRow.getCell(13).numFmt = '#,##0.00';
    totRow.getCell(13).alignment = { horizontal: 'right', vertical: 'middle' };

    totRow.getCell(14).value = totalGross;
    totRow.getCell(14).numFmt = '#,##0.00';
    totRow.getCell(14).alignment = { horizontal: 'right', vertical: 'middle' };

    totRow.getCell(15).value = totalAllowance;
    totRow.getCell(15).numFmt = '#,##0.00';
    totRow.getCell(15).alignment = { horizontal: 'right', vertical: 'middle' };

    totRow.getCell(16).value = totalExpenses;
    totRow.getCell(16).numFmt = '#,##0.00';
    totRow.getCell(16).alignment = { horizontal: 'right', vertical: 'middle' };

    totRow.getCell(17).value = totalBalance;
    totRow.getCell(17).numFmt = '#,##0.00';
    totRow.getCell(17).alignment = { horizontal: 'right', vertical: 'middle' };

    totRow.getCell(18).value = totalDriverPay;
    totRow.getCell(18).numFmt = '#,##0.00';
    totRow.getCell(18).alignment = { horizontal: 'right', vertical: 'middle' };

    totRow.getCell(19).value = totalHelperPay;
    totRow.getCell(19).numFmt = '#,##0.00';
    totRow.getCell(19).alignment = { horizontal: 'right', vertical: 'middle' };

    totRow.getCell(20).value = totalNetIncome;
    totRow.getCell(20).numFmt = '#,##0.00';
    totRow.getCell(20).alignment = { horizontal: 'right', vertical: 'middle' };

    for (let c = 1; c <= 20; c++) {
      totRow.getCell(c).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF1E3A5F' } };
      totRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      totRow.getCell(c).border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'double', color: { argb: 'FF1E3A5F' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
      };
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const cleanFileName = `Porbido_Ongoing_Trips_${timestamp}.xlsx`;
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = cleanFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  // ─── COMPLETED TRIPS CONVENIENCE EXPORTERS ────────────────────────────────

  exportCompletedTripsToPdf(trips: TripDispatch[]): void {
    const timestamp = this.getFileTimestamp();

    const headers = [
      'TLO #',
      'Trip #',
      'Delivered Date',
      'Origin',
      'Destination',
      'Plate No.',
      'Driver',
      'Helper',
      'Tons',
      'Freight (PHP)',
      'Expenses (PHP)',
      'Net Profit (PHP)',
      'Status'
    ];

    const getExpenses = (t: TripDispatch) => {
      const debits = (t.cohEntries || []).filter(e => e.type === 'DEBIT').reduce((sum, e) => sum + e.amount, 0);
      return debits > 0 ? debits : (t.travelExpenses || 0) + (t.dieselExpenses || 0) + (t.foodExpenses || 0);
    };

    const getNet = (t: TripDispatch) => {
      if (t.netIncome !== undefined) return t.netIncome;
      return (t.totalFreightCharge || 0) - getExpenses(t) - ((t.driverSalary || 0) + (t.helperSalary || 0));
    };

    const rows = trips.map(t => {
      const delivered = t.deliveredDate || t.deliveredAt || t.dispatchedDate ? formatAppDate(t.deliveredDate || t.deliveredAt || t.dispatchedDate) : '—';
      const billingStatus = t.status === 'BILLED' ? 'Billed' : t.billingStatus === 'IN_BILLING' ? 'In Billing' : t.billingStatus === 'SUBMITTED' ? 'Submitted' : 'Ready to Bill';

      return [
        t.tloNumber ? `TLO #${t.tloNumber}` : '—',
        t.tripNumber !== undefined ? `Trip #${t.tripNumber}` : '—',
        delivered,
        t.origin || '—',
        t.destination || '—',
        t.plateNumber || '—',
        t.driverName || '—',
        t.helperName && t.helperName !== 'None' && t.helperName !== 'Unassigned' ? t.helperName : '—',
        t.tonnage ? `${Number(t.tonnage).toFixed(2)} T` : '—',
        t.totalFreightCharge ? `₱${Number(t.totalFreightCharge).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—',
        getExpenses(t) ? `₱${getExpenses(t).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—',
        `₱${getNet(t).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        billingStatus
      ];
    });

    const totalTons = trips.reduce((sum, t) => sum + (t.tonnage || 0), 0);
    const totalFreight = trips.reduce((sum, t) => sum + (t.totalFreightCharge || 0), 0);
    const totalExpenses = trips.reduce((sum, t) => sum + getExpenses(t), 0);
    const totalNet = trips.reduce((sum, t) => sum + getNet(t), 0);

    const totalRow = [
      'TOTAL COMPLETED',
      `${trips.length} Trips`,
      '', '', '', '', '', '',
      `${totalTons.toFixed(2)} T`,
      `₱${totalFreight.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      `₱${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      `₱${totalNet.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      ''
    ];

    this.exportEnterprisePdf({
      fileName: `Porbido_Completed_Trips_${timestamp}`,
      documentTitle: 'COMPLETED TRIPS & LIQUIDATION',
      generatedBy: 'Operations Administrator',
      headers,
      rows,
      totalRow,
      fontSize: 8,
      cellPadding: { top: 2, bottom: 2, left: 2, right: 2 },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 16 },
        2: { cellWidth: 24 },
        3: { cellWidth: 'auto' },
        4: { cellWidth: 'auto' },
        5: { cellWidth: 20 },
        6: { cellWidth: 24 },
        7: { cellWidth: 22 },
        8: { cellWidth: 18, halign: 'right' },
        9: { cellWidth: 26, halign: 'right' },
        10: { cellWidth: 24, halign: 'right' },
        11: { cellWidth: 26, halign: 'right' },
        12: { cellWidth: 20, halign: 'center' }
      }
    });
  }

  async exportCompletedTripsToExcel(trips: TripDispatch[]): Promise<void> {
    const timestamp = this.getFileTimestamp();
    const headers = [
      'TLO #',
      'Trip #',
      'Delivered Date',
      'Client',
      'Origin',
      'Destination',
      'Route Tag',
      'Plate No.',
      'Driver',
      'Helper',
      'Weight (Tons)',
      'Gross Freight (PHP)',
      'Expenses (PHP)',
      'COH Balance (PHP)',
      'Net Profit (PHP)',
      'Billing Status'
    ];

    const getExpenses = (t: TripDispatch) => {
      const debits = (t.cohEntries || []).filter(e => e.type === 'DEBIT').reduce((sum, e) => sum + e.amount, 0);
      return debits > 0 ? debits : (t.travelExpenses || 0) + (t.dieselExpenses || 0) + (t.foodExpenses || 0);
    };
    const getCOH = (t: TripDispatch) => {
      const credits = (t.cohEntries || []).filter(e => e.type === 'CREDIT').reduce((sum, e) => sum + e.amount, 0);
      return (credits > 0 ? credits : (t.truckRate ? 10000 : 0)) - getExpenses(t);
    };
    const getNet = (t: TripDispatch) => {
      if (t.netIncome !== undefined) return t.netIncome;
      return (t.totalFreightCharge || 0) - getExpenses(t) - ((t.driverSalary || 0) + (t.helperSalary || 0));
    };

    const rows = trips.map(t => {
      const delivered = t.deliveredDate || t.deliveredAt || t.dispatchedDate ? formatAppDate(t.deliveredDate || t.deliveredAt || t.dispatchedDate) : '—';
      const billingStatus = t.status === 'BILLED' ? 'Billed' : t.billingStatus === 'IN_BILLING' ? 'In Billing' : t.billingStatus === 'SUBMITTED' ? 'Submitted' : 'Ready to Bill';

      return [
        t.tloNumber ? `TLO #${t.tloNumber}` : '—',
        t.tripNumber ? String(t.tripNumber) : '—',
        delivered,
        t.client || 'Cargill Philippines, Inc.',
        t.origin || '—',
        t.destination || '—',
        t.routeTag || 'FRONTLOAD',
        t.plateNumber || '—',
        t.driverName || 'Unassigned',
        t.helperName && t.helperName !== 'None' && t.helperName !== 'Unassigned' ? t.helperName : '—',
        t.tonnage || 0,
        t.totalFreightCharge || 0,
        getExpenses(t),
        getCOH(t),
        getNet(t),
        billingStatus
      ];
    });

    const totalTons = trips.reduce((sum, t) => sum + (t.tonnage || 0), 0);
    const totalFreight = trips.reduce((sum, t) => sum + (t.totalFreightCharge || 0), 0);
    const totalExpenses = trips.reduce((sum, t) => sum + getExpenses(t), 0);
    const totalNet = trips.reduce((sum, t) => sum + getNet(t), 0);

    const totalRow = [
      'TOTAL COMPLETED',
      `${trips.length} Trips`,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      totalTons,
      totalFreight,
      totalExpenses,
      '',
      totalNet,
      ''
    ];

    await this.exportEnterpriseExcel({
      fileName: `Porbido_Completed_Trips_${timestamp}`,
      documentTitle: 'COMPLETED TRIPS & LIQUIDATION',
      generatedBy: 'Operations Administrator',
      headers,
      rows,
      totalRow
    });
  }

  // ─── PRIVATE HELPERS ──────────────────────────────────────────────────────

  private getFileTimestamp(): string {
    return PdfTableBuilder.getFileTimestamp();
  }
}
