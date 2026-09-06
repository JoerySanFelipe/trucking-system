import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PORBIDO_LOGO_BASE64 } from '../../constants/report-logo.constant';
import { CrewPayrollSummary, TripPayItem } from '../../models/payroll.models';

export interface PayslipVoucherOptions {
  periodLabel: string;
  payoutDate: string;
  payoutChannel: 'GCASH' | 'BANK_TRANSFER' | 'CASH';
  referenceNumber?: string;
  approvedDeduction: number;
  notes?: string;
}

export class PayslipPdfBuilder {
  /**
   * Generates an authentic, compact Receipt Slip in A6 Portrait (105 x 148 mm).
   * Paper standard: A6 (1/4 of standard A4 paper).
   * Page 1: Company Copy
   * Page 2: Crew Copy
   */
  static generatePayslipPdf(crew: CrewPayrollSummary, options: PayslipVoucherOptions): jsPDF {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a6' // 105 x 148 mm
    });

    const margin = 6;
    const top = 5;

    // Page 1: Company Copy
    this.renderReceiptSlip(doc, crew, options, 'COMPANY COPY', margin, top);

    // Page 2: Crew Copy
    doc.addPage('a6', 'portrait');
    this.renderReceiptSlip(doc, crew, options, 'CREW COPY', margin, top);

    return doc;
  }

  private static renderReceiptSlip(
    doc: jsPDF,
    crew: CrewPayrollSummary,
    options: PayslipVoucherOptions,
    copyLabel: string,
    margin: number,
    y: number
  ): void {
    const pageWidth = 105;
    const printableWidth = pageWidth - (margin * 2);

    // 1. Header & Logo
    let currentY = y;
    try {
      if (PORBIDO_LOGO_BASE64) {
        const logoW = 20;
        const logoH = 5.8;
        doc.addImage(PORBIDO_LOGO_BASE64, 'PNG', (pageWidth - logoW) / 2, currentY, logoW, logoH);
        currentY += logoH + 1.5;
      }
    } catch {
      currentY += 1;
    }

    // Company Name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 58, 95);
    doc.text('PORBIDO TRUCKING & HAULING', pageWidth / 2, currentY + 3.5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Zone 4, Bancal, Botolan, Zambales · Cargill Contractor', pageWidth / 2, currentY + 6.8, { align: 'center' });

    // Pill Badge (Centered)
    const badgeW = 46;
    const badgeH = 4.5;
    doc.setFillColor(241, 245, 255);
    doc.setDrawColor(194, 209, 255);
    doc.roundedRect((pageWidth - badgeW) / 2, currentY + 8.5, badgeW, badgeH, 1, 1, 'FD');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(37, 99, 235);
    doc.text(`${copyLabel} · PAYSLIP RECEIPT`, pageWidth / 2, currentY + 11.7, { align: 'center' });

    // Separator line
    const sepY = currentY + 15;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.25);
    doc.line(margin, sepY, pageWidth - margin, sepY);

    // 2. Metadata Box
    const metaY = sepY + 2;
    const metaH = 14.5;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, metaY, printableWidth, metaH, 1, 1, 'FD');

    // Meta Left: Crew Name & Role
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(crew.crewName.toUpperCase(), margin + 2.5, metaY + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Role: ${crew.role.toUpperCase()}   ·   Phone: ${crew.phone || 'N/A'}`, margin + 2.5, metaY + 7.5);
    doc.text(`Period: ${options.periodLabel}`, margin + 2.5, metaY + 11);

    // Meta Right: Payout Date & Channel
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Date: ${options.payoutDate}`, pageWidth - margin - 2.5, metaY + 4, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    const channelText = options.payoutChannel === 'BANK_TRANSFER' ? 'Bank Transfer' : options.payoutChannel;
    const refText = options.referenceNumber ? ` (${options.referenceNumber})` : '';
    doc.text(`Channel: ${channelText}${refText}`, pageWidth - margin - 2.5, metaY + 7.5, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 163, 74);
    doc.text(`Status: PAID & SETTLED`, pageWidth - margin - 2.5, metaY + 11, { align: 'right' });

    // 3. Itemized Trips Table (Receipt Density)
    const tableY = metaY + metaH + 2;
    const tableBody = crew.trips.map((t, idx) => [
      String(idx + 1),
      `TLO #${t.tloNumber}\n${t.deliveredDate || t.dispatchedDate || '—'}`,
      `${t.origin} ➔ ${t.destination}\n${t.plateNumber || 'CCK 5273'}`,
      `P ${t.rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ]);

    // Fallback if direct adjustment/allowance
    if (tableBody.length === 0) {
      tableBody.push(['1', `Direct Entry\n${options.payoutDate}`, 'Operational Trip Compensation\n—', `P ${crew.grossTripPay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]);
    }

    autoTable(doc, {
      startY: tableY,
      margin: { left: margin, right: margin },
      head: [['#', 'TLO / Date', 'Route / Truck', 'Trip Pay']],
      body: tableBody,
      theme: 'grid',
      styles: {
        fontSize: 5.8,
        cellPadding: 0.8,
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.15
      },
      headStyles: {
        fillColor: [30, 58, 95],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 5.8
      },
      columnStyles: {
        0: { cellWidth: 5, halign: 'center' },
        1: { cellWidth: 24, fontStyle: 'bold' },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 22, halign: 'right', fontStyle: 'bold' }
      }
    });

    // 4. Financial Summary Box (Receipt Style)
    const finalTableY = (doc as any).lastAutoTable.finalY + 2;
    const gross = crew.grossTripPay;
    const caDeduction = options.approvedDeduction;
    const net = gross - caDeduction;
    const summaryH = 18.5;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, finalTableY, printableWidth, summaryH, 1, 1, 'FD');

    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('Total Gross Earnings:', margin + 2.5, finalTableY + 3.8);
    doc.text(`P ${gross.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - margin - 2.5, finalTableY + 3.8, { align: 'right' });

    doc.text('Less: Cash Advance (CA) Deduction:', margin + 2.5, finalTableY + 7.2);
    doc.setTextColor(225, 29, 72);
    doc.text(`- P ${caDeduction.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - margin - 2.5, finalTableY + 7.2, { align: 'right' });

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.2);
    doc.line(margin + 2.5, finalTableY + 9.2, pageWidth - margin - 2.5, finalTableY + 9.2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(22, 163, 74);
    doc.text('NET AMOUNT PAID:', margin + 2.5, finalTableY + 13.5);
    doc.text(`P ${net.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - margin - 2.5, finalTableY + 13.5, { align: 'right' });

    // CA Balance tracker
    const remainingCa = Math.max(0, crew.outstandingCA - caDeduction);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Prev CA: P ${crew.outstandingCA.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}  |  Remaining CA: P ${remainingCa.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, margin + 2.5, finalTableY + 16.8);

    // 5. Signatures
    const signY = finalTableY + summaryH + 8;
    const signWidth = 38;

    // Management Signature
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.2);
    doc.line(margin + 3, signY, margin + 3 + signWidth, signY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Prepared / Released By (Management)', margin + 3 + (signWidth / 2), signY + 3, { align: 'center' });

    // Crew Signature
    doc.line(pageWidth - margin - 3 - signWidth, signY, pageWidth - margin - 3, signY);
    doc.text('Received in Full & Correct (Crew)', pageWidth - margin - 3 - (signWidth / 2), signY + 3, { align: 'center' });

    // 6. Micro Receipt Footer
    doc.setFontSize(5);
    doc.setTextColor(160, 174, 192);
    doc.text('PORBIDO TMS · OFFICIAL PAYSLIP RECEIPT · PAPER SIZE: A6 (105 × 148 MM)', pageWidth / 2, 143, { align: 'center' });
  }
}
