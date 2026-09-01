import { Pipe, PipeTransform } from '@angular/core';

/**
 * Standard Month Names mapping per Porbido Enterprise Standard:
 * - June & July are 4 letters ('June', 'July')
 * - All other months are 3 letters ('Jan', 'Feb', 'Mar', 'Apr', 'May', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec')
 */
const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'June',
  'July',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
];

/**
 * Formats any Date object, ISO string, timestamp, or date string
 * into the strict Porbido Enterprise format: "DD-MMM-YY" (e.g. "30-Aug-26", "15-June-26")
 */
export function formatAppDate(input: string | Date | number | null | undefined): string {
  if (!input) return '';

  // If already in DD-MMM-YY format (e.g. "30-Aug-26" or "15-June-26")
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (/^\d{1,2}-[A-Za-z]{3,4}-\d{2}$/.test(trimmed)) {
      // Normalize day to 2 digits
      const parts = trimmed.split('-');
      const day = parts[0].padStart(2, '0');
      let month = parts[1];
      // Normalize June / July
      if (month.toLowerCase() === 'jun' || month.toLowerCase() === 'june') month = 'June';
      if (month.toLowerCase() === 'jul' || month.toLowerCase() === 'july') month = 'July';
      return `${day}-${month}-${parts[2]}`;
    }
  }

  let d: Date;
  if (typeof input === 'string') {
    // Check if ISO format YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(input)) {
      const [yearStr, monthStr, dayStr] = input.split('T')[0].split('-');
      const year = parseInt(yearStr, 10);
      const monthIdx = parseInt(monthStr, 10) - 1;
      const day = parseInt(dayStr, 10);
      d = new Date(year, monthIdx, day);
    } else {
      d = new Date(input);
    }
  } else if (typeof input === 'number') {
    d = new Date(input);
  } else {
    d = input;
  }

  if (isNaN(d.getTime())) {
    return String(input);
  }

  const day = String(d.getDate()).padStart(2, '0');
  const month = MONTH_NAMES[d.getMonth()];
  const year = String(d.getFullYear()).slice(-2); // Last 2 digits (e.g. "26")

  return `${day}-${month}-${year}`;
}

/**
 * Converts standard Porbido date string (e.g. "30-Aug-26") to ISO format ("2026-08-30")
 * for HTML5 <input type="date"> elements.
 */
export function appDateToIso(formattedDate: string): string {
  if (!formattedDate) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(formattedDate)) return formattedDate;

  const parts = formattedDate.trim().split('-');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const monthStr = parts[1].toLowerCase();
    let monthIdx = MONTH_NAMES.findIndex(m => m.toLowerCase() === monthStr);
    if (monthIdx === -1) {
      if (monthStr === 'jun') monthIdx = 5;
      if (monthStr === 'jul') monthIdx = 6;
      if (monthStr === 'sept') monthIdx = 8;
    }
    if (monthIdx !== -1) {
      const month = String(monthIdx + 1).padStart(2, '0');
      let year = parts[2];
      if (year.length === 2) {
        year = '20' + year;
      }
      return `${year}-${month}-${day}`;
    }
  }

  const d = new Date(formattedDate);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  return '';
}

/**
 * Returns today's date formatted as DD-MMM-YY (e.g. "30-Aug-26")
 */
export function getTodayAppDate(): string {
  return formatAppDate(new Date());
}

/**
 * Standalone Angular Pipe for templates: {{ trip.dispatchedDate | appDate }}
 */
@Pipe({
  name: 'appDate',
  standalone: true
})
export class AppDatePipe implements PipeTransform {
  transform(value: string | Date | number | null | undefined): string {
    return formatAppDate(value);
  }
}
