import { Component, inject, signal, computed, OnInit, effect, untracked, HostListener } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TmsService } from '../../core/services/tms.service';
import { DispatchStore } from '../../core/application/stores/dispatch.store';
import { FleetStore } from '../../core/application/stores/fleet.store';
import { TripDispatch, TripStatus, COHEntry, COHCategory, DriverLastTripBalance, COHBalanceType, PODStatus } from '../../core/models/tms.models';
import { FinanceCalculator } from '../../core/domain/rules/finance-calculator';
import { AppDatePipe } from '../../core/utils/date-formatter';

export type TripDetailTab = 'OVERVIEW' | 'COH_LEDGER' | 'POD_SCAN' | 'FINANCIAL_STATEMENT';

export interface ProofItem {
  id: string;
  title: string;
  category: string;
  url: string;
  timestamp: string;
  status: PODStatus;
  flagReason?: string;
  cohEntryId?: string;
  amount?: number;
}

import { TransactionsTableComponent, CarryoverBalance } from '../../shared/ui-kit/transactions-table/transactions-table.component';
import { ModalTeleportDirective } from '../../shared/directives/modal-teleport.directive';

@Component({
  selector: 'app-trip-details',
  standalone: true,
  imports: [CommonModule, FormsModule, AppDatePipe, TransactionsTableComponent, ModalTeleportDirective],
  template: `
    <div class="w-full space-y-6 animate-fade-in-up">

      <!-- Error State: Trip Not Found -->
      <div *ngIf="!trip()" class="card p-12 text-center space-y-3">
        <span class="material-symbols-outlined text-[48px] text-slate-300 mx-auto">search_off</span>
        <h2 class="text-lg font-bold text-slate-900">Trip Record Not Found</h2>
        <p class="text-xs text-slate-400">The requested trip details could not be located in active dispatches.</p>
        <a routerLink="/trips" class="btn-primary text-xs inline-flex items-center gap-2 mt-2">
          <span class="material-symbols-outlined text-[18px]">arrow_back</span>
          <span>Return to Trips Hub</span>
        </a>
      </div>

      <div *ngIf="trip()" class="space-y-6">

        <!-- ── 1. SOLID DARK BLUE EXECUTIVE HEADER CARD ──────────────────────── -->
        <div class="p-6 sm:p-7 rounded-2xl bg-[#172E8A] border border-blue-900/60 text-white space-y-6 shadow-md relative">
          
          <!-- Top Header Line -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/15 pb-5">
            
            <div class="space-y-2">
              <button (click)="goBack()" type="button" class="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-100 hover:text-white transition-colors bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg border border-white/15 cursor-pointer">
                <span class="material-symbols-outlined text-[16px]">arrow_back</span>
                <span>Back</span>
              </button>

              <div class="flex items-center gap-3.5 flex-wrap pt-0.5">
                <!-- Stacked TLO Label + TRIP Box & Big TLO Number (As in reference image) -->
                <div class="flex items-stretch gap-3 sm:gap-3.5">
                  <!-- Left Stack: TLO on top, TRIP # box at bottom -->
                  <div class="flex flex-col justify-between py-1 select-none">
                    <span class="text-base sm:text-lg lg:text-xl font-bold uppercase tracking-wider text-white font-mono leading-none">
                      TLO
                    </span>
                    <span class="text-xs sm:text-sm font-bold uppercase tracking-wider text-white border border-white/40 bg-white/10 px-2.5 py-1 rounded font-mono leading-none whitespace-nowrap shadow-xs">
                      TRIP #{{ formattedTripNumber() }}
                    </span>
                  </div>

                  <!-- Right: TLO Number (Moderated Scale) -->
                  <h1 class="text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight text-white font-mono leading-none self-center">
                    {{ trip()?.tloNumber || '---' }}
                  </h1>
                </div>

                <span *ngIf="isOverdue()" class="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/30 text-rose-200 border border-rose-400/30 flex items-center gap-1.5 animate-pulse">
                  <span class="material-symbols-outlined text-[14px] text-rose-300">warning</span>
                  <span>Overdue (>48h)</span>
                </span>
              </div>
            </div>

            <!-- Quick Controls: 1. Status, 2. Actions, 3. Mark as Completed -->
            <div class="flex items-center gap-2.5 self-start sm:self-auto flex-wrap" (click)="$event.stopPropagation()">
              
              <!-- 1. Status Dropdown (Custom Floating Menu with Dynamic Color-coded Border & Text) -->
              <div class="relative">
                <button
                  (click)="toggleStatusMenu($event)"
                  type="button"
                  [ngClass]="statusButtonBorderClass()"
                  class="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold transition-all flex items-center gap-1.5 backdrop-blur-xs cursor-pointer shadow-xs border">
                  <span class="text-[10px] font-bold text-blue-200/80 uppercase tracking-wider">Status:</span>
                  <span [ngClass]="statusButtonTextClass()" class="font-bold">
                    {{ trip()?.status === 'DISPATCHED' ? 'Dispatch' : trip()?.status === 'IN_TRANSIT' ? 'In Transit' : (trip()?.status === 'ARRIVED' || trip()?.status === 'POD_SUBMITTED') ? 'Arrived' : trip()?.status === 'FOR_REVIEW' ? 'For Review' : trip()?.status === 'COMPLETED' ? 'Completed' : (trip()?.status || 'Select') }}
                  </span>
                  <span [ngClass]="statusButtonTextClass()" class="material-symbols-outlined text-[14px] transition-transform duration-150" [class.rotate-180]="isStatusMenuOpen()">expand_more</span>
                </button>

                <!-- Floating Dropdown Menu (White Background, Colored Text without Icons) -->
                <div
                  *ngIf="isStatusMenuOpen()"
                  (click)="$event.stopPropagation()"
                  class="absolute left-0 mt-1.5 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-scale-in">
                  
                  <button
                    (click)="selectStatus('DISPATCHED')"
                    type="button"
                    class="w-full px-3.5 py-2 text-left text-xs font-bold hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer flex items-center justify-between">
                    <span>Dispatch</span>
                    <span *ngIf="trip()?.status === 'DISPATCHED'" class="text-slate-400 font-normal">●</span>
                  </button>

                  <button
                    (click)="selectStatus('IN_TRANSIT')"
                    type="button"
                    class="w-full px-3.5 py-2 text-left text-xs font-bold hover:bg-blue-50 text-blue-600 transition-colors cursor-pointer flex items-center justify-between">
                    <span>In Transit</span>
                    <span *ngIf="trip()?.status === 'IN_TRANSIT'" class="text-blue-600 font-normal">●</span>
                  </button>

                  <button
                    (click)="selectStatus('ARRIVED')"
                    type="button"
                    class="w-full px-3.5 py-2 text-left text-xs font-bold hover:bg-teal-50 text-teal-600 transition-colors cursor-pointer flex items-center justify-between">
                    <span>Arrived</span>
                    <span *ngIf="trip()?.status === 'ARRIVED' || trip()?.status === 'POD_SUBMITTED'" class="text-teal-600 font-normal">●</span>
                  </button>

                  <button
                    (click)="selectStatus('FOR_REVIEW')"
                    type="button"
                    class="w-full px-3.5 py-2 text-left text-xs font-bold hover:bg-amber-50 text-amber-600 transition-colors cursor-pointer flex items-center justify-between">
                    <span>For Review</span>
                    <span *ngIf="trip()?.status === 'FOR_REVIEW'" class="text-amber-600 font-normal">●</span>
                  </button>
                </div>
              </div>

              <!-- 2. Actions Dropdown (Print, Edit, Delete) -->
              <div class="relative">
                <button
                  (click)="toggleActionMenu($event)"
                  type="button"
                  class="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-all flex items-center gap-1.5 backdrop-blur-xs cursor-pointer shadow-xs">
                  <span class="material-symbols-outlined text-[16px] text-blue-200">tune</span>
                  <span>Actions</span>
                  <span class="material-symbols-outlined text-[14px] text-blue-200 transition-transform duration-150" [class.rotate-180]="isActionMenuOpen()">expand_more</span>
                </button>

                <!-- Floating Dropdown Menu (White Background, Slate Text) -->
                <div
                  *ngIf="isActionMenuOpen()"
                  (click)="$event.stopPropagation()"
                  class="absolute right-0 mt-1.5 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-scale-in text-slate-800">
                  
                  <!-- Print -->
                  <button
                    (click)="onActionPrint()"
                    type="button"
                    class="w-full px-3.5 py-2 text-left text-xs font-semibold hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 transition-colors cursor-pointer">
                    <span class="material-symbols-outlined text-[18px] text-slate-500">print</span>
                    <span>Print Slip</span>
                  </button>

                  <!-- Edit -->
                  <button
                    (click)="onActionEdit()"
                    type="button"
                    class="w-full px-3.5 py-2 text-left text-xs font-semibold hover:bg-blue-50 flex items-center gap-2.5 text-blue-700 transition-colors cursor-pointer">
                    <span class="material-symbols-outlined text-[18px] text-blue-600">edit</span>
                    <span>Edit Trip</span>
                  </button>

                  <div class="my-1 border-t border-slate-100"></div>

                  <!-- Delete -->
                  <button
                    (click)="onActionDelete()"
                    type="button"
                    class="w-full px-3.5 py-2 text-left text-xs font-semibold hover:bg-rose-50 flex items-center gap-2.5 text-rose-600 transition-colors cursor-pointer">
                    <span class="material-symbols-outlined text-[18px] text-rose-500">delete</span>
                    <span>Delete Trip</span>
                  </button>
                </div>
              </div>

              <!-- 3. Mark as Completed Button (Glassmorphic, Green on hover) -->
              <button
                *ngIf="trip()?.status !== 'COMPLETED'"
                (click)="markTripAsCompleted()"
                class="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-emerald-600 border border-white/20 hover:border-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 backdrop-blur-xs cursor-pointer shadow-xs">
                <span class="material-symbols-outlined text-[16px]">check_circle</span>
                <span>Mark as Completed</span>
              </button>

              <!-- Mark for Billing (if in review) -->
              <button
                *ngIf="trip()?.status === 'FOR_REVIEW'"
                (click)="openBillingModal()"
                class="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer border border-amber-400/30">
                <span class="material-symbols-outlined text-[16px]">receipt_long</span>
                <span>Mark for Billing</span>
              </button>

            </div>

          </div>

          <!-- 3 KPI Metric Tiles -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            <!-- Gross Freight Revenue -->
            <div class="p-4 rounded-xl border border-white/15 bg-white/10 flex flex-col justify-between shadow-2xs">
              <div>
                <div class="flex items-center justify-between mb-2">
                  <span class="text-[11px] font-bold uppercase tracking-wider text-blue-200 font-mono">Gross Freight Revenue</span>
                  <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-400/20 text-blue-200">
                    <span class="material-symbols-outlined text-[18px]">payments</span>
                  </div>
                </div>
                <div class="text-2xl font-bold text-white font-mono tabular-nums tracking-tight">
                  ₱{{ (trip()?.pricing?.grossFreight || trip()?.totalFreightCharge || trip()?.freightRevenue || 0) | number:'1.2-2' }}
                </div>
              </div>
              <span class="text-[11px] text-blue-200/90 mt-2.5 font-medium flex items-center gap-1">
                <span>Rate:</span>
                <strong class="font-mono text-white">₱{{ (trip()?.pricing?.truckRate || trip()?.truckRate || trip()?.baseRate || 0) | number:'1.2-2' }}</strong>
                <span class="text-blue-300">×</span>
                <strong class="font-mono text-white">{{ (trip()?.cargo?.tonnage || trip()?.weightTons || trip()?.tonnage || 0) }} tons</strong>
              </span>
            </div>

            <!-- Total Trip Cost -->
            <div class="p-4 rounded-xl border border-white/15 bg-white/10 flex flex-col justify-between shadow-2xs">
              <div>
                <div class="flex items-center justify-between mb-2">
                  <span class="text-[11px] font-bold uppercase tracking-wider text-rose-200 font-mono">Total Trip Cost</span>
                  <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-rose-500/25 border border-rose-400/30 text-rose-300">
                    <span class="material-symbols-outlined text-[18px]">trending_down</span>
                  </div>
                </div>
                <div class="text-2xl font-bold text-rose-300 font-mono tabular-nums tracking-tight">
                  ₱{{ totalTripCost() | number:'1.2-2' }}
                </div>
              </div>
              <span class="text-[11px] text-blue-200/80 mt-2.5 font-medium">
                Total Operation &amp; Crew Expenses
              </span>
            </div>

            <!-- Net Trip Income -->
            <div class="p-4 rounded-xl border border-white/15 bg-white/10 flex flex-col justify-between shadow-2xs">
              <div>
                <div class="flex items-center justify-between mb-2">
                  <span class="text-[11px] font-bold uppercase tracking-wider font-mono"
                        [ngClass]="netCompanyIncome() >= 0 ? 'text-emerald-200' : 'text-rose-200'">
                    Net Trip Income
                  </span>
                  <div class="w-8 h-8 rounded-lg flex items-center justify-center border"
                       [ngClass]="netCompanyIncome() >= 0 ? 'bg-emerald-500/25 border-emerald-400/30 text-emerald-300' : 'bg-rose-500/25 border-rose-400/30 text-rose-300'">
                    <span class="material-symbols-outlined text-[18px]">
                      {{ netCompanyIncome() >= 0 ? 'trending_up' : 'trending_down' }}
                    </span>
                  </div>
                </div>
                <div class="text-2xl font-bold font-mono tabular-nums tracking-tight"
                     [ngClass]="netCompanyIncome() >= 0 ? 'text-emerald-300' : 'text-rose-300'">
                  ₱{{ netCompanyIncome() | number:'1.2-2' }}
                </div>
              </div>
              <div class="flex items-center justify-between mt-2.5">
                <span class="text-[11px] text-blue-200/80 font-medium">Company Trip Profit</span>
                <span class="px-2 py-0.5 rounded-md text-[10px] font-bold border font-mono"
                      [ngClass]="netCompanyIncome() >= 0 ? 'bg-emerald-400/25 text-emerald-200 border-emerald-400/30' : 'bg-rose-400/25 text-rose-200 border-rose-400/30'">
                  {{ profitMarginPercent() }}% Margin
                </span>
              </div>
            </div>

          </div>

          <!-- Bottom Info Bar inside Card (Icon + Data, Clean Non-Bold Typography) -->
          <div class="pt-4 border-t border-white/15 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div class="flex items-center gap-4 sm:gap-6 flex-wrap">
              <!-- 1. Date -->
              <span class="flex items-center gap-1.5 text-blue-100">
                <span class="material-symbols-outlined text-[16px] text-blue-300">calendar_today</span>
                <span class="font-mono text-white">{{ (trip()?.dispatchedDate || trip()?.dispatchedAt) ? ((trip()?.dispatchedDate || trip()?.dispatchedAt) | appDate) : '---' }}</span>
              </span>

              <!-- 2. Client -->
              <span class="flex items-center gap-1.5 text-blue-100">
                <span class="material-symbols-outlined text-[16px] text-blue-300">business</span>
                <span class="text-white">{{ trip()?.client || '---' }}</span>
              </span>

              <!-- 3. Route (Route Tag + Origin → Destination) -->
              <span class="flex items-center gap-1.5 text-blue-100 font-mono">
                <span class="material-symbols-outlined text-[16px] text-sky-300">alt_route</span>
                <span *ngIf="trip()?.route?.routeTag || trip()?.routeTag" class="text-blue-200 uppercase">
                  {{ trip()?.route?.routeTag || trip()?.routeTag }}
                </span>
                <span class="text-white">{{ trip()?.route?.origin || trip()?.origin || '---' }}</span>
                <span class="text-blue-300">→</span>
                <span class="text-white">{{ trip()?.route?.destination || trip()?.destination || '---' }}</span>
              </span>

              <!-- 3. Truck -->
              <span class="flex items-center gap-1.5 text-blue-100">
                <span class="material-symbols-outlined text-[16px] text-blue-300">local_shipping</span>
                <span class="font-mono text-white">{{ trip()?.truck?.plateNumber || trip()?.plateNumber || '---' }}</span>
              </span>

              <!-- 4. Driver -->
              <span class="flex items-center gap-1.5 text-blue-100">
                <span class="material-symbols-outlined text-[16px] text-blue-300">search_hands_free</span>
                <span class="text-white">{{ trip()?.truck?.driver?.name || trip()?.driverName || '---' }}</span>
              </span>

              <!-- 5. Helper -->
              <span class="flex items-center gap-1.5 text-blue-100">
                <span class="material-symbols-outlined text-[16px] text-blue-300">partner_exchange</span>
                <span class="text-white">{{ trip()?.truck?.helper?.name || trip()?.helperName || '---' }}</span>
              </span>
            </div>
          </div>

        </div>

        <!-- ── 2. TABBED NAVIGATION BAR ─────────────────────────────────────────── -->
        <div class="card p-1.5 flex items-center gap-1.5 overflow-x-auto shadow-xs">
          
          <button
            (click)="activeTab.set('OVERVIEW')"
            [ngClass]="activeTab() === 'OVERVIEW' ? 'bg-brand-600 text-white font-bold shadow-brand' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-semibold'"
            class="px-4 py-2.5 rounded-xl text-xs inline-flex items-center gap-2 transition-all flex-shrink-0 cursor-pointer">
            <span class="material-symbols-outlined text-[18px]">visibility</span>
            <span>Overview</span>
          </button>

          <button
            (click)="activeTab.set('COH_LEDGER')"
            [ngClass]="activeTab() === 'COH_LEDGER' ? 'bg-brand-600 text-white font-bold shadow-brand' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-semibold'"
            class="px-4 py-2.5 rounded-xl text-xs inline-flex items-center gap-2 transition-all flex-shrink-0 cursor-pointer">
            <span class="material-symbols-outlined text-[18px]">account_balance_wallet</span>
            <span>Cash Ledger</span>
            <span class="px-2 py-0.5 rounded-full text-[10px]" [ngClass]="activeTab() === 'COH_LEDGER' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'">
              {{ cohList().length }}
            </span>
          </button>

          <button
            (click)="activeTab.set('POD_SCAN')"
            [ngClass]="activeTab() === 'POD_SCAN' ? 'bg-brand-600 text-white font-bold shadow-brand' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-semibold'"
            class="px-4 py-2.5 rounded-xl text-xs inline-flex items-center gap-2 transition-all flex-shrink-0 cursor-pointer">
            <span class="material-symbols-outlined text-[18px]">receipt_long</span>
            <span>Proofs</span>
            <span class="px-2 py-0.5 rounded-full text-[10px]" [ngClass]="activeTab() === 'POD_SCAN' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'">
              {{ proofList().length }}
            </span>
          </button>

          <button
            (click)="activeTab.set('FINANCIAL_STATEMENT')"
            [ngClass]="activeTab() === 'FINANCIAL_STATEMENT' ? 'bg-brand-600 text-white font-bold shadow-brand' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-semibold'"
            class="px-4 py-2.5 rounded-xl text-xs inline-flex items-center gap-2 transition-all flex-shrink-0 cursor-pointer">
            <span class="material-symbols-outlined text-[18px]">request_quote</span>
            <span>Financials</span>
          </button>

        </div>

        <!-- ── 3. TAB CONTENT 1: OVERVIEW ───────────────────────────────────────── -->
        <div *ngIf="activeTab() === 'OVERVIEW'" class="space-y-6 animate-fade-in">
          
          <!-- Trip Cash Snapshot (Cash Accountability) -->
          <div class="card p-6 space-y-5">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 class="text-xs font-bold text-slate-900">Trip Cash Snapshot</h2>
              <!-- See Breakdown button redirecting to Cash Ledger Tab -->
              <button
                (click)="activeTab.set('COH_LEDGER')"
                class="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer">
                <span>See Breakdown</span>
                <span class="material-symbols-outlined text-[14px]">chevron_right</span>
              </button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              <!-- Trip Cash Allowance -->
              <div class="p-5 rounded-2xl border border-slate-200 bg-white flex items-start gap-4 shadow-xs">
                <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 border border-amber-100">
                  <span class="material-symbols-outlined text-[20px]">account_balance_wallet</span>
                </div>
                <div class="space-y-1 w-full">
                  <span class="text-[10px] font-bold uppercase text-slate-400 font-mono block">Cash on Hand</span>
                  <div class="text-2xl font-black text-amber-600 font-mono tabular-nums">
                    ₱{{ totalCOHCredit() | number:'1.2-2' }}
                  </div>
                  <p class="text-xs text-slate-500 font-medium">
                    Total trip allowance
                  </p>
                </div>
              </div>

              <!-- Expenses Spent -->
              <div class="p-5 rounded-2xl border border-slate-200 bg-white flex items-start gap-4 shadow-xs">
                <div class="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0 border border-rose-100">
                  <span class="material-symbols-outlined text-[20px]">receipt_long</span>
                </div>
                <div class="space-y-1">
                  <span class="text-[10px] font-bold uppercase text-slate-400 font-mono block">Crew Expenses</span>
                  <div class="text-2xl font-black text-rose-600 font-mono tabular-nums">
                    ₱{{ totalTripExpenses() | number:'1.2-2' }}
                  </div>
                  <p class="text-xs text-slate-500 font-medium">
                    Allowance expenses
                  </p>
                </div>
              </div>

              <!-- Ending Cash Balance -->
              <div class="p-5 rounded-2xl border border-slate-200 bg-white flex items-start gap-4 shadow-xs">
                <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border border-slate-200"
                     [ngClass]="netCOHBalance() >= 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'">
                  <span class="material-symbols-outlined text-[20px]">savings</span>
                </div>
                <div class="space-y-1 w-full">
                  <span class="text-[10px] font-bold uppercase text-slate-400 font-mono block">Ending Cash on Hand</span>
                  <div class="text-2xl font-black font-mono tabular-nums"
                       [ngClass]="netCOHBalance() >= 0 ? 'text-emerald-600' : 'text-rose-600'">
                    ₱{{ netCOHBalance() | number:'1.2-2' }}
                  </div>
                  <div class="flex items-center justify-between pt-1">
                    <p class="text-xs text-slate-500 font-medium">
                      Unspent allowance
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>

          <!-- Crew Salary Breakdown -->
          <div class="card p-6 space-y-4">
            <h2 class="text-xs font-bold text-slate-900 border-b border-slate-100 pb-3">
              Crew Salary Breakdown
            </h2>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <!-- 1st Box: Driver Salary -->
              <div class="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div class="flex items-center gap-3.5">
                  <div class="w-10 h-10 rounded-xl bg-blue-100 text-brand-600 flex items-center justify-center font-bold flex-shrink-0">
                    <span class="material-symbols-outlined text-[20px]">search_hands_free</span>
                  </div>
                  <div>
                    <span class="text-[10px] font-bold text-slate-400 uppercase block">Driver Salary</span>
                    <span class="text-base font-black text-slate-900 font-mono tabular-nums">₱{{ (trip()?.payroll?.driverSalary ?? trip()?.driverSalary ?? 0) | number:'1.2-2' }}</span>
                  </div>
                </div>
              </div>

              <!-- 2nd Box: Helper Salary -->
              <div class="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div class="flex items-center gap-3.5">
                  <div class="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold flex-shrink-0">
                    <span class="material-symbols-outlined text-[20px]">partner_exchange</span>
                  </div>
                  <div>
                    <span class="text-[10px] font-bold text-slate-400 uppercase block">Helper Salary</span>
                    <span class="text-base font-black text-slate-900 font-mono tabular-nums">₱{{ (trip()?.payroll?.helperSalary ?? trip()?.helperSalary ?? 0) | number:'1.2-2' }}</span>
                  </div>
                </div>
              </div>

              <!-- 3rd Box: Total Salary -->
              <div class="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div class="flex items-center gap-3.5">
                  <div class="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold flex-shrink-0">
                    <span class="material-symbols-outlined text-[20px]">payments</span>
                  </div>
                  <div>
                    <span class="text-[10px] font-bold text-slate-400 uppercase block">Total Crew Payroll</span>
                    <span class="text-base font-black text-emerald-700 font-mono tabular-nums">₱{{ ((trip()?.payroll?.driverSalary ?? trip()?.driverSalary ?? 0) + (trip()?.payroll?.helperSalary ?? trip()?.helperSalary ?? 0)) | number:'1.2-2' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Hauling Route & Cargo Specifications -->
          <div class="card p-6 space-y-4">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 class="text-xs font-bold text-slate-900">
                Hauling Route & Cargo Specifications
              </h2>
              <span class="badge badge-brand text-[10px]">
                {{ trip()?.routeTag || '---' }}
              </span>
            </div>

            <!-- Route Visualizer -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center gap-3.5">
                <div class="w-10 h-10 rounded-xl bg-blue-100 text-brand-600 flex items-center justify-center font-bold flex-shrink-0">
                  <span class="material-symbols-outlined text-[20px]">location_on</span>
                </div>
                <div>
                  <span class="text-[10px] font-bold text-slate-400 uppercase block">Origin</span>
                  <span class="font-extrabold text-xs text-slate-900">{{ trip()?.origin || trip()?.originFrom || '---' }}</span>
                </div>
              </div>

              <div class="flex flex-col items-center justify-center text-center px-4 py-1">
                <span class="text-xs font-bold text-slate-700 font-mono">{{ (trip()?.weightTons || trip()?.tonnage) ? ((trip()?.weightTons || trip()?.tonnage) + ' Tons Capacity') : '---' }}</span>
                <div class="w-full border-t border-dashed border-slate-300 my-2"></div>
              </div>

              <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center gap-3.5">
                <div class="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold flex-shrink-0">
                  <span class="material-symbols-outlined text-[20px]">flag</span>
                </div>
                <div>
                  <span class="text-[10px] font-bold text-slate-400 uppercase block">Destination</span>
                  <span class="font-extrabold text-xs text-slate-900">{{ trip()?.destination || trip()?.destinationTo || '---' }}</span>
                </div>
              </div>
            </div>

            <!-- Cargo Spec Details -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span class="text-[10px] font-bold text-slate-400 uppercase block">Client</span>
                <span class="text-xs font-bold text-slate-800">{{ trip()?.client || '---' }}</span>
              </div>

              <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span class="text-[10px] font-bold text-slate-400 uppercase block">Commodity Cargo</span>
                <span class="text-xs font-bold text-slate-800">{{ (trip()?.commodity && trip()?.commodity !== 'General Cargo') ? trip()?.commodity : ((trip()?.cargo?.commodity && trip()?.cargo?.commodity !== 'General Cargo') ? trip()?.cargo?.commodity : '---') }}</span>
              </div>

              <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span class="text-[10px] font-bold text-slate-400 uppercase block">Number of Bags</span>
                <span class="text-xs font-bold text-slate-800">{{ (trip()?.bagCount || trip()?.cargo?.bagCount) ? ((trip()?.bagCount || trip()?.cargo?.bagCount) + ' Bags') : '---' }}</span>
              </div>
            </div>
          </div>

        </div>

        <!-- ── 4. TAB CONTENT 2: CASH LEDGER ─────────────────────────────────── -->
        <div *ngIf="activeTab() === 'COH_LEDGER'" class="space-y-6 animate-fade-in">

          <div class="space-y-6">

            <!-- Cash Flow Summary: Accounting Equation -->
            <div class="card p-5 border border-slate-200">
              <div class="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <h2 class="text-xs font-bold text-slate-900">Cash Flow Summary</h2>
                </div>
              </div>

              <!-- Accounting Equation: Previous Carryover + Trip Cash Advance − Expenses = Ending Balance -->
              <div class="flex flex-wrap items-stretch gap-3">

                <!-- Stage 1: Previous Carryover -->
                <div class="flex flex-col justify-between bg-white border border-slate-200 rounded-2xl px-6 py-5 flex-1 min-w-[180px] shadow-xs">
                  <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono mb-2 block">Previous Carryover</span>
                  <span class="font-mono font-black text-xl tabular-nums block"
                        [ngClass]="lastTripBalance()?.type === 'SHORTAGE' ? 'text-rose-600' : 'text-emerald-600'">
                    {{ lastTripBalance()?.type === 'SHORTAGE' ? '-' : '' }}₱{{ (lastTripBalance()?.amount || 0) | number:'1.2-2' }}
                  </span>
                  <span class="text-[10px] font-semibold mt-2 block"
                        [ngClass]="lastTripBalance()?.type === 'SHORTAGE' ? 'text-rose-500' : 'text-emerald-500'">
                    {{ lastTripBalance()?.type === 'SHORTAGE' ? 'Carried Deficit' : (lastTripBalance()?.type === 'OVERAGE' ? 'Carried Surplus' : 'Fully Liquidated') }}
                  </span>
                </div>

                <!-- Connector: + -->
                <div class="flex items-center justify-center self-center">
                  <span class="text-2xl font-black text-slate-300 select-none">+</span>
                </div>

                <!-- Stage 2: Trip Cash Allowance -->
                <div class="flex flex-col justify-between bg-white border border-slate-200 rounded-2xl px-6 py-5 flex-1 min-w-[180px] shadow-xs">
                  <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono mb-2 block">Cash on hand</span>
                  <span class="font-mono font-black text-xl tabular-nums text-emerald-600 block">
                    ₱{{ totalCOHCredit() | number:'1.2-2' }}
                  </span>
                  <span class="text-[10px] font-semibold text-emerald-500 mt-2 block">Initial &amp; additional cash</span>
                </div>

                <!-- Connector: − -->
                <div class="flex items-center justify-center self-center">
                  <span class="text-2xl font-black text-slate-300 select-none">−</span>
                </div>

                <!-- Stage 3: Expenses Spent -->
                <div class="flex flex-col justify-between bg-white border border-slate-200 rounded-2xl px-6 py-5 flex-1 min-w-[180px] shadow-xs">
                  <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono mb-2 block">Crew Expenses</span>
                  <span class="font-mono font-black text-xl tabular-nums text-rose-600 block">
                    ₱{{ totalTripExpenses() | number:'1.2-2' }}
                  </span>
                  <span class="text-[10px] font-semibold text-rose-500 mt-2 block">Fuel, toll, meals and others</span>
                </div>

                <!-- Connector: = -->
                <div class="flex items-center justify-center self-center">
                  <span class="text-2xl font-black text-slate-300 select-none">=</span>
                </div>

                <!-- Stage 4: Ending Cash Balance -->
                <div class="flex flex-col justify-between bg-white border-2 rounded-2xl px-6 py-5 flex-1 min-w-[200px] shadow-xs"
                     [ngClass]="netCOHBalance() >= 0 ? 'border-emerald-200' : 'border-rose-200'">
                  <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono mb-2 block">Ending Cash on hand</span>
                  <span class="font-mono font-black text-xl tabular-nums text-slate-900 block">
                    ₱{{ netCOHBalance() | number:'1.2-2' }}
                  </span>
                  <div class="flex items-center gap-2 mt-2">
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          [ngClass]="netCOHBalance() >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'">
                      {{ netCOHBalance() >= 0 ? '✓ Cash Surplus' : '⚠️ Shortage' }}
                    </span>
                    <button
                      *ngIf="netCOHBalance() > 0"
                      (click)="convertUnspentToCashAdvance()"
                      class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200 transition-all cursor-pointer">
                      Convert
                    </button>
                  </div>
                </div>

              </div>
            </div>


            <!-- CLEAN REUSABLE TRANSACTIONS TABLE -->
            <app-transactions-table
              class="block mt-6"
              [tripId]="trip()?.id || ''"
              [entries]="cohList()"
              [startingBalance]="0"
              [carryover]="lastTripBalance()"
              [defaultDate]="trip()?.deliveredDate || trip()?.dispatchedDate || ''"
              (entryAdded)="onCOHEntryAdded($event)"
              (entryUpdated)="onCOHEntryUpdated($event)"
              (entryDeleted)="onCOHEntryDeleted($event)"
            />

          </div>

        </div>

        <!-- ── 5. TAB CONTENT 3: PROOFS ─────────────────────────────────────────── -->
        <div *ngIf="activeTab() === 'POD_SCAN'" class="space-y-5 animate-fade-in">

          <!-- Page Header -->
          <div class="card p-5">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 class="text-base font-extrabold text-slate-900">Image Proofs</h2>
                <p class="text-xs text-slate-400 mt-0.5">Proof of delivery and supporting images for recorded trip expenses.</p>
              </div>

              <!-- Search + Filters -->
              <div class="flex items-center gap-2 flex-wrap">
                <div class="relative min-w-[220px]">
                  <span class="material-symbols-outlined text-[16px] text-slate-400 absolute left-3 top-2.5 pointer-events-none">search</span>
                  <input
                    type="text"
                    [(ngModel)]="proofSearchQuery"
                    placeholder="Search proofs..."
                    class="form-input pl-9 text-xs py-2 w-full"
                  />
                </div>

                <select [(ngModel)]="receiptStatusFilter" class="form-input text-xs py-2 pr-8 min-w-[130px] font-semibold">
                  <option value="">All Proofs</option>
                  <option value="FLAGGED_BLURRY">Flagged Issues Only</option>
                </select>
              </div>
            </div>

            <!-- Proof Gallery — 5-col desktop, 6-col large desktop, 2-col tablet, 1-col mobile -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 xl:grid-cols-6 gap-4 mt-5 pt-5 border-t border-slate-100">

              <div *ngFor="let proof of filteredProofsByStatus()"
                   class="card overflow-hidden border border-slate-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col group cursor-pointer"
                   (click)="openImageModal(proof.url, proof.title, proof.timestamp, proof.status, proof.id)">

                <!-- Category + Status Strip -->
                <div class="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-2 min-h-[32px]">
                  <span class="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 truncate">{{ proof.category }}</span>
                  <span *ngIf="proof.status === 'FLAGGED_BLURRY'"
                        class="text-[9px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 bg-rose-100 text-rose-700 border border-rose-200 inline-flex items-center gap-1">
                    <span class="material-symbols-outlined text-[12px]">flag</span>
                    <span>Flagged Issue</span>
                  </span>
                </div>

                <!-- Thumbnail — fixed 16:9 aspect ratio for compactness -->
                <div class="relative overflow-hidden bg-slate-900" style="aspect-ratio: 16/9;">
                  <img
                    [src]="proof.url"
                    [alt]="proof.title"
                    class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div class="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-bold gap-1">
                    <span class="material-symbols-outlined text-[14px]">visibility</span>
                    <span>View</span>
                  </div>
                </div>

                <!-- Card Body -->
                <div class="p-3 flex flex-col gap-1.5 flex-1 bg-white">
                  <h3 class="font-semibold text-slate-800 text-[11px] leading-snug line-clamp-2">{{ proof.title }}</h3>
                  <div *ngIf="proof.amount" class="text-base font-black text-slate-900 font-mono tabular-nums leading-none">
                    ₱{{ proof.amount | number:'1.2-2' }}
                  </div>
                  <p class="text-[10px] text-slate-400 font-mono mt-auto">
                    {{ proof.timestamp | date:'MMM d, y · h:mm a' }}
                  </p>
                </div>

              </div>

              <!-- Empty State -->
              <div *ngIf="filteredProofsByStatus().length === 0" class="col-span-full py-14 text-center space-y-2">
                <span class="material-symbols-outlined text-[36px] text-slate-300 mx-auto">receipt_long</span>
                <p class="text-xs font-bold text-slate-600">No image proofs found</p>
                <p class="text-[11px] text-slate-400">Try adjusting your search or filter.</p>
              </div>

            </div>
          </div>

        </div>

        <!-- ── 6. TAB CONTENT 4: COMPREHENSIVE FINANCIAL STATEMENT & AUDIT ────── -->
        <div *ngIf="activeTab() === 'FINANCIAL_STATEMENT'" class="space-y-6 animate-fade-in">

          <!-- 1. DETAILED FINANCIAL CALCULATIONS (3-COLUMN BREAKDOWN) -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

            <!-- Column 1: Freight Revenue Calculation -->
            <div class="card p-6 space-y-4 border-t-4 border-t-brand-500 flex flex-col justify-between">
              <div class="space-y-4">
                <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-lg bg-blue-100 text-brand-600 flex items-center justify-center">
                      <span class="material-symbols-outlined text-[20px] text-brand-600">payments</span>
                    </div>
                    <h2 class="text-xs font-bold text-slate-900 uppercase tracking-wider">Gross Freight Revenue</h2>
                  </div>
                  <span class="badge badge-brand text-[9px]">{{ trip()?.rateType || '---' }}</span>
                </div>

                <div class="space-y-2 text-xs">
                  <div class="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span class="text-slate-600 font-medium">Master Base Rate</span>
                    <span class="font-mono font-bold text-slate-900">₱{{ (trip()?.truckRate || trip()?.baseRate || 0) | number:'1.2-2' }}{{ trip()?.rateType === 'PER_TON' ? ' / ton' : '' }}</span>
                  </div>

                  <div class="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span class="text-slate-600 font-medium">Scale Weight (Tonnage)</span>
                    <span class="font-mono font-bold text-slate-900">{{ trip()?.weightTons || trip()?.tonnage || 0 }} Tons</span>
                  </div>

                  <div class="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span class="text-slate-600 font-medium">Base Freight Subtotal</span>
                    <span class="font-mono font-bold text-slate-900">
                      ₱{{ (trip()?.rateType === 'PER_TON' ? (((trip()?.weightTons || trip()?.tonnage || 0) * (trip()?.truckRate || trip()?.baseRate || 0))) : (trip()?.truckRate || trip()?.baseRate || 0)) | number:'1.2-2' }}
                    </span>
                  </div>

                  <div class="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span class="text-slate-600 font-medium">Re-route Fee</span>
                    <span class="font-mono font-bold" [ngClass]="(trip()?.rerouteFee || trip()?.rerouteFeeApplied) ? 'text-emerald-600' : 'text-slate-400'">
                      {{ trip()?.rerouteFee !== undefined ? ('₱' + (trip()?.rerouteFee | number:'1.2-2')) : (trip()?.rerouteFeeApplied ? '₱3,600.00' : '₱0.00') }}
                    </span>
                  </div>

                  <div class="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span class="text-slate-600 font-medium">Extra / Demurrage Fees</span>
                    <span class="font-mono font-bold text-slate-900">₱{{ (trip()?.extraFees || 0) | number:'1.2-2' }}</span>
                  </div>
                </div>
              </div>

              <div class="p-3.5 mt-4 bg-blue-50/80 rounded-xl border border-blue-200 flex items-center justify-between">
                <span class="text-xs font-black text-slate-900">Gross Freight Revenue</span>
                <span class="text-lg font-black text-brand-600 font-mono tabular-nums">
                  ₱{{ (trip()?.totalFreightCharge || trip()?.freightRevenue || 0) | number:'1.2-2' }}
                </span>
              </div>
            </div>

            <!-- Column 2: Trip Operating Expenses (Strictly separate from Crew Salaries) -->
            <div class="card p-6 space-y-4 border-t-4 border-t-rose-500 flex flex-col justify-between">
              <div class="space-y-4">
                <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                      <span class="material-symbols-outlined text-[20px] text-rose-600">trending_down</span>
                    </div>
                    <h2 class="text-xs font-bold text-slate-900 uppercase tracking-wider">Crew Expenses</h2>
                  </div>
                  <span class="badge badge-danger text-[9px]">Outflow</span>
                </div>

                <div class="space-y-2 text-xs">
                  <div class="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span class="text-slate-600 font-medium">Diesel Fuel Expenses</span>
                    <span class="font-mono font-bold text-rose-700">₱{{ expenseDieselFuel() | number:'1.2-2' }}</span>
                  </div>

                  <div class="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span class="text-slate-600 font-medium">Expressway Toll Fees</span>
                    <span class="font-mono font-bold text-rose-700">₱{{ expenseTollFees() | number:'1.2-2' }}</span>
                  </div>

                  <div class="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span class="text-slate-600 font-medium">Meals / Per Diem</span>
                    <span class="font-mono font-bold text-rose-700">₱{{ expenseMeals() | number:'1.2-2' }}</span>
                  </div>

                  <div class="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span class="text-slate-600 font-medium">Others</span>
                    <span class="font-mono font-bold text-slate-700">₱{{ expenseOther() | number:'1.2-2' }}</span>
                  </div>
                </div>
              </div>

              <div class="p-3.5 mt-4 bg-rose-50/80 rounded-xl border border-rose-200 flex items-center justify-between">
                <span class="text-xs font-black text-slate-900">Total Operating Expenses</span>
                <span class="text-lg font-black text-rose-700 font-mono tabular-nums">
                  ₱{{ totalTripExpenses() | number:'1.2-2' }}
                </span>
              </div>
            </div>

            <!-- Column 3: Crew Compensation (Dedicated Section) -->
            <div class="card p-6 space-y-4 border-t-4 border-t-indigo-500 flex flex-col justify-between">
              <div class="space-y-4">
                <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                      <span class="material-symbols-outlined text-[20px] text-indigo-700">groups</span>
                    </div>
                    <h2 class="text-xs font-bold text-slate-900 uppercase tracking-wider">Crew Compensation</h2>
                  </div>
                  <span class="badge badge-brand text-[9px]">Payroll</span>
                </div>

                <div class="space-y-2 text-xs">
                  <div class="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span class="text-slate-600 font-medium">Driver Salary Pay</span>
                    <span class="font-mono font-bold text-slate-900">₱{{ (trip()?.driverSalary || 0) | number:'1.2-2' }}</span>
                  </div>

                  <div class="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span class="text-slate-600 font-medium">Helper Salary Pay</span>
                    <span class="font-mono font-bold text-slate-900">₱{{ (trip()?.helperSalary || 0) | number:'1.2-2' }}</span>
                  </div>
                </div>
              </div>

              <div class="p-3.5 mt-4 bg-indigo-50/80 rounded-xl border border-indigo-200 flex items-center justify-between">
                <span class="text-xs font-black text-slate-900">Total Crew Payroll</span>
                <span class="text-lg font-black text-indigo-800 font-mono tabular-nums">
                  ₱{{ ((trip()?.driverSalary || 0) + (trip()?.helperSalary || 0)) | number:'1.2-2' }}
                </span>
              </div>
            </div>

          </div>

          <!-- 2. TRIP PROFITABILITY EQUATION CONSOLE -->
          <div class="card p-5 border border-slate-200">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h2 class="text-xs font-bold text-slate-900">Trip Profitability Calculation</h2>
                <p class="text-[10px] text-slate-400 font-medium mt-0.5">Gross Freight Revenue − Crew Expenses − Crew Compensation = Net Trip Income</p>
              </div>
              <span class="badge text-[10px] font-bold"
                    [ngClass]="netCompanyIncome() >= 0 ? 'badge-success' : 'badge-danger'">
                {{ profitMarginPercent() }}% Net Margin
              </span>
            </div>

            <div class="flex flex-wrap items-stretch gap-3">

              <!-- Revenue -->
              <div class="flex flex-col justify-between bg-white border border-slate-200 rounded-2xl px-5 py-4 flex-1 min-w-[170px] shadow-xs">
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono mb-1 block">Gross Freight Revenue</span>
                <span class="font-mono font-black text-xl tabular-nums text-brand-600 block">
                  ₱{{ (trip()?.totalFreightCharge || trip()?.freightRevenue || 0) | number:'1.2-2' }}
                </span>
                <span class="text-[10px] font-semibold text-slate-400 mt-2 block">Customer Billing</span>
              </div>

              <!-- Minus -->
              <div class="flex items-center justify-center self-center">
                <span class="text-2xl font-black text-slate-300 select-none">−</span>
              </div>

              <!-- Operating Expenses -->
              <div class="flex flex-col justify-between bg-white border border-slate-200 rounded-2xl px-5 py-4 flex-1 min-w-[170px] shadow-xs">
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono mb-1 block">Crew Expenses</span>
                <span class="font-mono font-black text-xl tabular-nums text-rose-600 block">
                  Less: ₱{{ totalTripExpenses() | number:'1.2-2' }}
                </span>
                <span class="text-[10px] font-semibold text-rose-500 mt-2 block">Fuel, Toll, Meals, Others</span>
              </div>

              <!-- Minus -->
              <div class="flex items-center justify-center self-center">
                <span class="text-2xl font-black text-slate-300 select-none">−</span>
              </div>

              <!-- Crew Payroll -->
              <div class="flex flex-col justify-between bg-white border border-slate-200 rounded-2xl px-5 py-4 flex-1 min-w-[170px] shadow-xs">
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono mb-1 block">Crew Compensation</span>
                <span class="font-mono font-black text-xl tabular-nums text-indigo-700 block">
                  Less: ₱{{ ((trip()?.driverSalary || 0) + (trip()?.helperSalary || 0)) | number:'1.2-2' }}
                </span>
                <span class="text-[10px] font-semibold text-indigo-500 mt-2 block">Driver & Helper Salaries</span>
              </div>

              <!-- Equals -->
              <div class="flex items-center justify-center self-center">
                <span class="text-2xl font-black text-slate-300 select-none">=</span>
              </div>

              <!-- Net Income -->
              <div class="flex flex-col justify-between bg-white border-2 rounded-2xl px-5 py-4 flex-1 min-w-[190px] shadow-xs"
                   [ngClass]="netCompanyIncome() >= 0 ? 'border-emerald-300 bg-emerald-50/20' : 'border-rose-300 bg-rose-50/20'">
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono mb-1 block">Net Trip Income</span>
                <span class="font-mono font-black text-xl tabular-nums block"
                      [ngClass]="netCompanyIncome() >= 0 ? 'text-emerald-700' : 'text-rose-700'">
                  ₱{{ netCompanyIncome() | number:'1.2-2' }}
                </span>
                <span class="text-[10px] font-bold mt-2 block"
                      [ngClass]="netCompanyIncome() >= 0 ? 'text-emerald-600' : 'text-rose-600'">
                  {{ profitMarginPercent() }}% Net Margin
                </span>
              </div>
            </div>
          </div>

          <!-- 3. OFFICIAL TRIP FINANCIAL STATEMENT TABLE -->
          <div class="card overflow-hidden border border-slate-200">
            <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
              <div>
                <h2 class="text-base font-bold text-slate-900">Trip Financial Statement</h2>
                <p class="text-xs text-slate-400 font-medium mt-0.5">Itemized profitability statement for TLO #{{ trip()?.tloNumber || '---' }}</p>
              </div>

              <button onclick="window.print()" class="btn-secondary text-xs inline-flex items-center gap-1.5 cursor-pointer">
                <span class="material-symbols-outlined text-[16px]">print</span>
                <span>Print Statement</span>
              </button>
            </div>

            <div class="overflow-x-auto">
              <table class="data-table w-full">
                <thead>
                  <tr>
                    <th>Line Item Description</th>
                    <th>Category</th>
                    <th>Subtotal (₱)</th>
                    <th class="text-right">Net Impact</th>
                  </tr>
                </thead>
                <tbody>
                  <tr class="hover:bg-slate-50">
                    <td class="font-bold text-slate-900 text-xs">1. Gross Freight Revenue</td>
                    <td><span class="badge badge-brand">Revenue</span></td>
                    <td class="font-mono text-xs tabular-nums">₱{{ (trip()?.totalFreightCharge || trip()?.freightRevenue || 0) | number:'1.2-2' }}</td>
                    <td class="text-right font-mono font-bold text-xs text-emerald-700 tabular-nums">+₱{{ (trip()?.totalFreightCharge || trip()?.freightRevenue || 0) | number:'1.2-2' }}</td>
                  </tr>

                  <tr class="hover:bg-slate-50">
                    <td class="font-bold text-slate-900 text-xs">2. Crew Expenses (Diesel Fuel, Tolls, Meals, Others)</td>
                    <td><span class="badge badge-danger">Outflow</span></td>
                    <td class="font-mono text-xs tabular-nums">₱{{ totalTripExpenses() | number:'1.2-2' }}</td>
                    <td class="text-right font-mono font-bold text-xs text-rose-700 tabular-nums">-₱{{ totalTripExpenses() | number:'1.2-2' }}</td>
                  </tr>

                  <tr class="hover:bg-slate-50">
                    <td class="font-bold text-slate-900 text-xs">3. Crew Compensation (Driver & Helper Salaries)</td>
                    <td><span class="badge badge-neutral">Payroll</span></td>
                    <td class="font-mono text-xs tabular-nums">₱{{ ((trip()?.driverSalary || 0) + (trip()?.helperSalary || 0)) | number:'1.2-2' }}</td>
                    <td class="text-right font-mono font-bold text-xs text-rose-700 tabular-nums">-₱{{ ((trip()?.driverSalary || 0) + (trip()?.helperSalary || 0)) | number:'1.2-2' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Statement Summary Footer -->
            <div class="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs font-mono font-bold text-slate-700">
              <span class="text-slate-900 font-extrabold uppercase">NET TRIP INCOME & PROFITABILITY</span>
              <div class="flex items-center gap-4">
                <span class="badge text-xs px-3 py-1"
                      [ngClass]="netCompanyIncome() >= 0 ? 'badge-success' : 'badge-danger'">
                  {{ profitMarginPercent() }}% Net Margin
                </span>
                <span class="font-black text-base tabular-nums"
                      [ngClass]="netCompanyIncome() >= 0 ? 'text-emerald-700' : 'text-rose-700'">
                  ₱{{ netCompanyIncome() | number:'1.2-2' }}
                </span>
              </div>
            </div>
          </div>

        </div>

        <!-- Operational Notes Card -->
        <div *ngIf="trip()?.notes" class="card p-4 border-l-4 border-l-warning bg-amber-50/40">
          <span class="text-[10px] font-bold text-amber-800 uppercase tracking-wider block mb-0.5">Operational Notes</span>
          <p class="text-xs text-amber-900 font-medium">{{ trip()?.notes }}</p>
        </div>

      </div>

      <!-- ── MODAL 1: ENLARGED IMAGE VIEWER MODAL ────────────────────────────── -->
      <div *ngIf="selectedImageModal()" appModalTeleport class="fixed inset-0 z-[100] overflow-y-auto" role="dialog" aria-modal="true">
        <!-- Backdrop -->
        <div class="fixed inset-0 bg-slate-900/80 backdrop-blur-md transition-opacity" (click)="selectedImageModal.set(null)"></div>
        <!-- Centering Flex Wrapper -->
        <div class="flex min-h-full items-center justify-center p-4 text-center sm:p-6">
          <div (click)="$event.stopPropagation()" class="relative transform card max-w-2xl w-full overflow-hidden shadow-2xl bg-white border border-slate-200 my-auto text-left animate-scale-in">

            <div class="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 class="font-bold text-sm text-slate-900">{{ selectedImageModal()?.title }}</h3>
                <p class="text-xs text-slate-400 mt-0.5 font-mono">{{ selectedImageModal()?.timestamp | date:'medium' }}</p>
              </div>
              <button (click)="selectedImageModal.set(null)" class="text-slate-400 hover:text-slate-600 p-1 flex items-center justify-center cursor-pointer">
                <span class="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div class="p-6 space-y-4">
              <div class="bg-slate-900 rounded-2xl overflow-hidden aspect-video flex items-center justify-center border border-slate-200">
                <img [src]="selectedImageModal()?.url" [alt]="selectedImageModal()?.title" class="max-h-full object-contain"/>
              </div>

              <div class="flex items-center justify-between pt-2">
                <span *ngIf="selectedImageModal()?.status === 'FLAGGED_BLURRY'"
                      class="badge badge-danger text-xs inline-flex items-center gap-1">
                  <span class="material-symbols-outlined text-[14px]">flag</span>
                  <span>Flagged: Blurry / Issue</span>
                </span>
                <span *ngIf="selectedImageModal()?.status !== 'FLAGGED_BLURRY'"></span>

                <div class="flex items-center gap-3">
                  <button
                    *ngIf="selectedImageModal()?.status === 'FLAGGED_BLURRY'"
                    (click)="unflagSelectedImageModal()"
                    class="btn-secondary text-xs text-slate-700 hover:bg-slate-100 inline-flex items-center gap-1.5 cursor-pointer">
                    <span class="material-symbols-outlined text-[16px] text-emerald-600">check_circle</span>
                    <span>Clear Flag</span>
                  </button>

                  <button
                    *ngIf="selectedImageModal()?.status !== 'FLAGGED_BLURRY'"
                    (click)="flagSelectedImageModal()"
                    class="btn-secondary text-xs border-rose-200 text-rose-700 hover:bg-rose-50 inline-flex items-center gap-1.5 cursor-pointer">
                    <span class="material-symbols-outlined text-[16px] text-rose-600">flag</span>
                    <span>Flag Blurry / Issue</span>
                  </button>

                  <button
                    (click)="selectedImageModal.set(null)"
                    class="btn-primary text-xs cursor-pointer">
                    Close Viewer
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <!-- ── MODAL 2: ADJUST DRIVER PREVIOUS TRIP BALANCE ──────────────────────── -->
      <div *ngIf="showPrevBalanceModal()" appModalTeleport class="fixed inset-0 z-[100] overflow-y-auto" role="dialog" aria-modal="true">
        <!-- Backdrop -->
        <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" (click)="showPrevBalanceModal.set(false)"></div>
        <!-- Centering Flex Wrapper -->
        <div class="flex min-h-full items-center justify-center p-4 text-center sm:p-6">
          <div (click)="$event.stopPropagation()" class="relative transform card max-w-md w-full overflow-hidden my-auto shadow-2xl text-left animate-scale-in">

            <div class="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 class="font-bold text-sm text-slate-900">Adjust Previous Trip Balance</h3>
                <p class="text-xs text-slate-400 mt-0.5">Set carried-over Overage (Credit) or Shortage (Deficit)</p>
              </div>
              <button (click)="showPrevBalanceModal.set(false)" class="text-slate-400 hover:text-slate-600 font-bold text-lg px-2 cursor-pointer">✕</button>
            </div>

            <form (ngSubmit)="submitPrevBalance()" class="p-6 space-y-4">

              <div>
                <label class="form-label uppercase text-[10px]">Previous Balance Status</label>
                <div class="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    (click)="prevType = 'SHORTAGE'"
                    [ngClass]="prevType === 'SHORTAGE' ? 'bg-rose-50 border-rose-500 text-rose-800 font-bold ring-2 ring-rose-500/20' : 'btn-secondary text-xs'"
                    class="py-2 px-2 rounded-xl border text-[11px] flex flex-col items-center justify-center transition-all cursor-pointer">
                    <span>Shortage</span>
                    <span class="text-[9px] font-medium opacity-80">(Deficit)</span>
                  </button>

                  <button
                    type="button"
                    (click)="prevType = 'OVERAGE'"
                    [ngClass]="prevType === 'OVERAGE' ? 'bg-amber-50 border-amber-500 text-amber-800 font-bold ring-2 ring-amber-500/20' : 'btn-secondary text-xs'"
                    class="py-2 px-2 rounded-xl border text-[11px] flex flex-col items-center justify-center transition-all cursor-pointer">
                    <span>Overage</span>
                    <span class="text-[9px] font-medium opacity-80">(Credit)</span>
                  </button>

                  <button
                    type="button"
                    (click)="prevType = 'BALANCED'"
                    [ngClass]="prevType === 'BALANCED' ? 'bg-slate-200 border-slate-400 text-slate-900 font-bold' : 'btn-secondary text-xs'"
                    class="py-2 px-2 rounded-xl border text-[11px] flex flex-col items-center justify-center transition-all cursor-pointer">
                    <span>Liquidated</span>
                    <span class="text-[9px] font-medium opacity-80">(₱0.00)</span>
                  </button>
                </div>
              </div>

              <div *ngIf="prevType !== 'BALANCED'">
                <label class="form-label uppercase text-[10px]">Carried-Over Amount (₱) <span class="text-rose-500">*</span></label>
                <div class="relative">
                  <span class="absolute left-3.5 top-2 font-bold text-slate-400 text-xs">₱</span>
                  <input
                    type="number"
                    step="0.01"
                    [(ngModel)]="prevAmount"
                    name="prevAmount"
                    required
                    placeholder="e.g. 1200.00"
                    class="form-input pl-8 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label class="form-label uppercase text-[10px]">Last Trip TLO #</label>
                <input
                  type="text"
                  [(ngModel)]="prevLastTlo"
                  name="prevLastTlo"
                  placeholder="e.g. 904811"
                  class="form-input text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label class="form-label uppercase text-[10px]">Notes / Detail</label>
                <input
                  type="text"
                  [(ngModel)]="prevNotes"
                  name="prevNotes"
                  placeholder="e.g. Unliquidated cash deficit carried over from TLO #904811"
                  class="form-input text-xs"
                />
              </div>

              <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  (click)="showPrevBalanceModal.set(false)"
                  class="btn-secondary text-xs cursor-pointer">
                  Cancel
                </button>
                <button
                  type="submit"
                  class="btn-primary text-xs cursor-pointer">
                  Update Balance
                </button>
              </div>

            </form>

          </div>
        </div>
      </div>

    
      <!-- Mark for Billing Modal -->
      <div *ngIf="isBillingModalOpen" appModalTeleport class="fixed inset-0 z-[100] overflow-y-auto" role="dialog" aria-modal="true">
        <!-- Backdrop -->
        <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" (click)="isBillingModalOpen = false"></div>
        <!-- Centering Flex Wrapper -->
        <div class="flex min-h-full items-center justify-center p-4 text-center sm:p-6">
          <div (click)="$event.stopPropagation()" class="relative transform bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden my-auto text-left animate-scale-in">
            <div class="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 class="font-extrabold text-lg text-slate-900">Mark Trip for Billing?</h3>
              <button (click)="isBillingModalOpen = false" class="text-slate-400 hover:text-slate-600 font-bold text-lg px-2">✕</button>
            </div>
            <div class="p-6 space-y-6">
              <p class="text-sm text-slate-600">This trip will be transferred to the Billing workspace and will no longer appear in Dispatch Trips.</p>
              
              <div class="grid grid-cols-1 gap-3">
                <div class="flex justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span class="text-xs font-bold text-slate-500 uppercase">Gross Freight</span>
                  <span class="font-mono font-black text-slate-900">₱{{ (trip()?.totalFreightCharge || trip()?.freightRevenue || 0) | number:'1.2-2' }}</span>
                </div>
                <div class="flex justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span class="text-xs font-bold text-slate-500 uppercase">Trip Cost</span>
                  <span class="font-mono font-black text-rose-600">₱{{ totalTripExpenses() | number:'1.2-2' }}</span>
                </div>
                <div class="flex justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span class="text-xs font-bold text-slate-700 uppercase">Net Trip Margin</span>
                  <span class="font-mono font-black" [ngClass]="netCompanyIncome() < 0 ? 'text-rose-600' : 'text-emerald-600'">₱{{ netCompanyIncome() | number:'1.2-2' }}</span>
                </div>
              </div>

              <div class="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 mt-4">
                <button (click)="isBillingModalOpen = false" class="btn-secondary text-xs py-2 px-4">Cancel</button>
                <button (click)="confirmMarkForBilling()" class="btn-primary text-xs py-2 px-4 bg-amber-500 hover:bg-amber-600 border-amber-500 hover:border-amber-600 text-white">Confirm & Send to Billing</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── MODAL 5: DELETE TRIP CONFIRMATION ────────────────────────────────── -->
      <div *ngIf="showDeleteTripModal()" appModalTeleport class="fixed inset-0 z-[100] overflow-y-auto" role="dialog" aria-modal="true">
        <!-- Backdrop -->
        <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" (click)="closeDeleteTripModal()"></div>
        <!-- Centering Flex Wrapper -->
        <div class="flex min-h-full items-center justify-center p-4 text-center sm:p-6">
          <div (click)="$event.stopPropagation()" class="relative transform card max-w-md w-full overflow-hidden shadow-2xl my-auto text-left animate-scale-in">
            <div class="p-5 border-b border-slate-100 flex items-center justify-between bg-rose-50">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                  <span class="material-symbols-outlined text-[20px]">delete</span>
                </div>
                <div>
                  <h3 class="font-bold text-sm text-slate-900">Delete Trip Record</h3>
                  <p class="text-xs text-rose-600">This action is permanent and irreversible</p>
                </div>
              </div>
              <button (click)="closeDeleteTripModal()" class="text-slate-400 hover:text-slate-600 font-bold text-lg px-2">✕</button>
            </div>

            <div class="p-6 space-y-3">
              <p class="text-sm text-slate-700">
                Are you sure you want to delete Trip 
                <strong class="font-mono font-bold text-slate-900">#{{ trip()?.tripNumber || trip()?.tloNumber || '---' }}</strong> 
                (Plate: <span class="font-bold text-slate-800">{{ trip()?.plateNumber || trip()?.truck?.plateNumber || '---' }}</span>)?
              </p>
              <p class="text-xs text-slate-500">
                This will remove all expense entries, cash records, and billing data for this trip from Cloud Firestore.
              </p>
            </div>

            <div class="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button (click)="closeDeleteTripModal()" type="button" class="btn-secondary text-xs px-4 py-2 cursor-pointer">
                Cancel
              </button>
              <button (click)="executeDeleteTrip()" type="button" class="btn-danger text-xs px-5 py-2 cursor-pointer bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5">
                <span class="material-symbols-outlined text-[16px]">delete_forever</span>
                <span>Yes, Delete Trip</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class TripDetailsComponent implements OnInit {
  route = inject(ActivatedRoute);
  router = inject(Router);
  location = inject(Location);
  dispatchStore = inject(DispatchStore);
  fleetStore = inject(FleetStore);
  tmsService = inject(TmsService);

  goBack() {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/trips']);
    }
  }

  isBillingModalOpen = false;
  showDeleteTripModal = signal<boolean>(false);
  isActionMenuOpen = signal<boolean>(false);
  isStatusMenuOpen = signal<boolean>(false);

  // Formatted Trip Number (e.g. "3")
  formattedTripNumber = computed(() => {
    const t = this.trip();
    const num = t?.tripNumber ?? (t as any)?.truck?.tripNumber;
    if (num === undefined || num === null || num === '' || num === '—') return '1';
    const n = Number(String(num).replace(/\D/g, ''));
    if (isNaN(n)) return String(num);
    return `${n}`;
  });

  // Dynamic Status Button Border & Text Styling
  statusButtonBorderClass = computed(() => {
    const s = this.trip()?.status;
    switch (s) {
      case 'DISPATCHED': return 'border-slate-300/70 hover:border-slate-200';
      case 'IN_TRANSIT': return 'border-sky-400 hover:border-sky-300';
      case 'ARRIVED':
      case 'POD_SUBMITTED': return 'border-teal-400 hover:border-teal-300';
      case 'FOR_REVIEW': return 'border-amber-400 hover:border-amber-300';
      case 'COMPLETED': return 'border-emerald-400 hover:border-emerald-300';
      default: return 'border-white/20 hover:border-white/40';
    }
  });

  statusButtonTextClass = computed(() => {
    const s = this.trip()?.status;
    switch (s) {
      case 'DISPATCHED': return 'text-slate-200';
      case 'IN_TRANSIT': return 'text-sky-300';
      case 'ARRIVED':
      case 'POD_SUBMITTED': return 'text-teal-300';
      case 'FOR_REVIEW': return 'text-amber-300';
      case 'COMPLETED': return 'text-emerald-300';
      default: return 'text-white';
    }
  });

  @HostListener('document:click')
  onDocumentClick() {
    if (this.isActionMenuOpen()) {
      this.isActionMenuOpen.set(false);
    }
    if (this.isStatusMenuOpen()) {
      this.isStatusMenuOpen.set(false);
    }
  }

  toggleStatusMenu(event: MouseEvent) {
    event.stopPropagation();
    this.isActionMenuOpen.set(false);
    this.isStatusMenuOpen.update(v => !v);
  }

  selectStatus(status: TripStatus) {
    this.isStatusMenuOpen.set(false);
    this.onStatusChange(status);
  }

  toggleActionMenu(event: MouseEvent) {
    event.stopPropagation();
    this.isStatusMenuOpen.set(false);
    this.isActionMenuOpen.update(v => !v);
  }

  onActionPrint() {
    this.isActionMenuOpen.set(false);
    window.print();
  }

  onActionEdit() {
    this.isActionMenuOpen.set(false);
    const t = this.trip();
    if (t) {
      this.router.navigate(['/trips', t.id, 'edit']);
    }
  }

  onActionDelete() {
    this.isActionMenuOpen.set(false);
    this.openDeleteTripModal();
  }

  openDeleteTripModal() {
    this.showDeleteTripModal.set(true);
  }

  closeDeleteTripModal() {
    this.showDeleteTripModal.set(false);
  }

  async executeDeleteTrip() {
    const t = this.trip();
    if (!t) return;
    await this.dispatchStore.deleteTrip(t.id);
    this.closeDeleteTripModal();
    this.router.navigate(['/trips']);
  }

  openBillingModal() {
    this.isBillingModalOpen = true;
  }

  confirmMarkForBilling() {
    const t = this.trip();
    if (t) {
      this.dispatchStore.updateBillingStatus(t.id, 'READY_TO_BILL');
      this.tmsService.approveForBilling(t.id);
      this.isBillingModalOpen = false;
      this.router.navigate(['/trips']);
    }
  }

  tripId = signal<string>('');
  activeTab = signal<TripDetailTab>('OVERVIEW');
  proofSearchQuery = '';
  receiptStatusFilter = '';

  showAddCOHModal = signal<boolean>(false);
  showPrevBalanceModal = signal<boolean>(false);
  
  selectedImageModal = signal<{ url: string; title: string; timestamp: string; status: PODStatus; id?: string; flagReason?: string } | null>(null);

  // New COH Entry Form state
  newCOHType: 'CREDIT' | 'DEBIT' = 'CREDIT';
  newCOHCategory: COHCategory = 'ADDITIONAL_SENT';
  newCOHAmount: number | null = null;
  newCOHDescription = '';
  newCOHProofUrl = '';

  // Previous Trip Balance Form state
  prevType: COHBalanceType = 'BALANCED';
  prevAmount: number | null = null;
  prevLastTlo = '';
  prevNotes = '';

  trip = computed(() => {
    const id = this.tripId();
    if (!id) return null;
    const cleanId = String(id).trim().toLowerCase();

    // 1. Match from DispatchStore (by Firestore id, numeric/string tloNumber, or tripNumber)
    const fromStore = this.dispatchStore.trips().find(t => 
      t.id.toLowerCase() === cleanId || 
      String(t.tloNumber).toLowerCase() === cleanId || 
      (t.tripNumber !== undefined && String(t.tripNumber) === cleanId)
    );
    if (fromStore) return fromStore;

    // 2. Match from TmsService
    const fromTms = this.tmsService.dispatches().find(t => 
      t.id.toLowerCase() === cleanId || 
      String(t.tloNumber).toLowerCase() === cleanId || 
      (t.tripNumber !== undefined && String(t.tripNumber) === cleanId)
    );
    if (fromTms) return fromTms;

    return this.dispatchStore.getTripById(id) || this.dispatchStore.getTripByTlo(id) || null;
  });

  lastTripBalance = computed<CarryoverBalance | null>(() => {
    const t = this.trip();
    if (!t) return null;
    if (t.previousCarryover) {
      return {
        amount: t.previousCarryover.amount,
        type: t.previousCarryover.type,
        lastTripTloNumber: t.previousCarryover.fromTloNumber
      };
    }
    if (t.previousTripBalance) {
      return {
        amount: t.previousTripBalance.amount,
        type: t.previousTripBalance.type,
        lastTripTloNumber: t.previousTripBalance.lastTripTloNumber
      };
    }
    const driverName = t.driverName || t.truck?.driver?.name;
    if (driverName) {
      const b = this.fleetStore.getDriverCOHBalance(driverName);
      if (b) {
        return {
          amount: b.amount,
          type: b.type,
          lastTripTloNumber: b.lastTloNumber
        };
      }
    }
    return null;
  });

  cohList = computed(() => {
    const t = this.trip();
    if (!t) return [];
    if (t.cashLedger?.entries && t.cashLedger.entries.length > 0) {
      return t.cashLedger.entries;
    }
    if (t.cohEntries && t.cohEntries.length > 0) {
      return t.cohEntries;
    }
    // If no COH ledger entries exist in database, check if trip has legacy dispatch allowance or expenses
    const entries: COHEntry[] = [];
    const initialAdvance = (t as any).dispatchAllowance || (t as any).startingCOH || 0;
    if (initialAdvance > 0) {
      entries.push({
        id: `coh-init-${t.id}`,
        tripId: t.id,
        category: 'DISPATCH_ADVANCE' as COHCategory,
        amount: initialAdvance,
        type: 'CREDIT' as const,
        description: 'Initial Dispatch Cash Advance',
        timestamp: t.dispatchedAt || t.dispatchedDate || new Date().toISOString(),
        proofStatus: 'APPROVED' as PODStatus
      });
    }
    if ((t.dieselExpenses || 0) > 0) {
      entries.push({
        id: `coh-diesel-${t.id}`,
        tripId: t.id,
        category: 'FUEL_TOLL_ADVANCE' as COHCategory,
        amount: t.dieselExpenses!,
        type: 'DEBIT' as const,
        description: 'Diesel Fuel Expenses',
        timestamp: t.dispatchedAt || t.dispatchedDate || new Date().toISOString(),
        proofStatus: 'APPROVED' as PODStatus
      });
    }
    if ((t.travelExpenses || 0) > 0) {
      entries.push({
        id: `coh-toll-${t.id}`,
        tripId: t.id,
        category: 'FUEL_TOLL_ADVANCE' as COHCategory,
        amount: t.travelExpenses!,
        type: 'DEBIT' as const,
        description: 'Expressway RFID Toll Fees',
        timestamp: t.dispatchedAt || t.dispatchedDate || new Date().toISOString(),
        proofStatus: 'APPROVED' as PODStatus
      });
    }
    if ((t.foodExpenses || 0) > 0) {
      entries.push({
        id: `coh-food-${t.id}`,
        tripId: t.id,
        category: 'FOOD_PER_DIEM' as COHCategory,
        amount: t.foodExpenses!,
        type: 'DEBIT' as const,
        description: 'Meals / Crew Food Per Diem',
        timestamp: t.dispatchedAt || t.dispatchedDate || new Date().toISOString(),
        proofStatus: 'APPROVED' as PODStatus
      });
    }
    return entries;
  });

  proofList = computed<ProofItem[]>(() => {
    const t = this.trip();
    if (!t) return [];

    const list: ProofItem[] = [];

    // 1. Official Proof of Delivery Image / Waybill if present in database
    if (t.podImageUrl) {
      list.push({
        id: `proof-pod-${t.id}`,
        title: `Official Proof of Delivery (TLO #${t.tloNumber || '---'})`,
        category: 'POD / Delivery',
        url: t.podImageUrl,
        timestamp: t.deliveredDate || t.deliveredAt || t.dispatchedDate || t.dispatchedAt || new Date().toISOString(),
        status: t.podStatus || 'APPROVED'
      });
    }

    // 2. Receipts from COH entries that have proof URLs attached from database
    const entries = this.cohList();
    entries.forEach(e => {
      if (e.proofUrl) {
        list.push({
          id: `proof-${e.id}`,
          title: e.description || 'Receipt Proof',
          category: e.description || 'Receipt Proof',
          url: e.proofUrl,
          timestamp: e.timestamp,
          status: e.proofStatus === 'FLAGGED_BLURRY' ? 'FLAGGED_BLURRY' : 'APPROVED',
          cohEntryId: e.id,
          amount: e.type === 'DEBIT' ? e.amount : undefined
        });
      }
    });

    return list;
  });

  filteredProofs = computed(() => {
    const query = this.proofSearchQuery.toLowerCase().trim();
    const all = this.proofList();
    if (!query) return all;
    return all.filter(p =>
      p.title.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query)
    );
  });

  flaggedProofCount = computed(() => {
    return this.proofList().filter(p => p.status === 'FLAGGED_BLURRY').length;
  });

  filteredProofsByStatus = computed(() => {
    const query = this.proofSearchQuery.toLowerCase().trim();
    const statusFilter = this.receiptStatusFilter;
    let all = this.proofList();
    if (query) {
      all = all.filter(p =>
        p.title.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
      );
    }
    if (statusFilter) {
      all = all.filter(p => p.status === statusFilter);
    }
    return all;
  });

  cohTableWithRunningBalance = computed(() => {
    const list = this.cohList();
    const prev = this.lastTripBalance();
    let currentBalance = prev ? (prev.type === 'OVERAGE' ? prev.amount : (prev.type === 'SHORTAGE' ? -prev.amount : 0)) : 0;

    return list.map(entry => {
      if (entry.type === 'CREDIT') {
        currentBalance += entry.amount;
      } else {
        currentBalance -= entry.amount;
      }
      return {
        ...entry,
        runningBalance: currentBalance
      };
    });
  });

  freshCashCredits = computed(() => {
    return this.cohList()
      .filter(e => e.type === 'CREDIT')
      .reduce((sum, e) => sum + e.amount, 0);
  });

  totalCOHCredit = computed(() => {
    const directCredits = this.freshCashCredits();
    const prev = this.lastTripBalance();
    const prevOverage = prev && prev.type === 'OVERAGE' ? prev.amount : 0;

    return directCredits + prevOverage;
  });

  totalCOHDebit = computed(() => {
    const directDebits = this.cohList()
      .filter(e => e.type === 'DEBIT')
      .reduce((sum, e) => sum + e.amount, 0);

    const prev = this.lastTripBalance();
    const prevShortage = prev && prev.type === 'SHORTAGE' ? prev.amount : 0;

    return directDebits + prevShortage;
  });

  netCOHBalance = computed(() => {
    return this.totalCOHCredit() - this.totalCOHDebit();
  });

  totalTripExpenses = computed(() => {
    const cohDebits = this.cohList()
      .filter(e => e.type === 'DEBIT')
      .reduce((sum, e) => sum + e.amount, 0);

    if (cohDebits > 0) {
      return cohDebits;
    }

    const t = this.trip();
    if (!t) return 0;
    return (t.travelExpenses || 0) + (t.foodExpenses || 0) + (t.dieselExpenses || 0);
  });

  expenseDieselFuel = computed(() => {
    const hasCohExpenses = this.cohList().some(e => e.type === 'DEBIT');
    if (!hasCohExpenses) return this.trip()?.dieselExpenses || 0;
    return this.cohList()
      .filter(e => {
        if (e.type !== 'DEBIT') return false;
        const desc = (e.description || '').toLowerCase();
        return e.category === 'DIESEL' || e.category === 'FUEL_TOLL_ADVANCE' || desc.includes('diesel') || desc.includes('fuel') || desc.includes('gas');
      })
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  });

  expenseTollFees = computed(() => {
    const hasCohExpenses = this.cohList().some(e => e.type === 'DEBIT');
    if (!hasCohExpenses) return this.trip()?.travelExpenses || 0;
    return this.cohList()
      .filter(e => {
        if (e.type !== 'DEBIT') return false;
        const desc = (e.description || '').toLowerCase();
        return e.category === 'TOLL_FEES' || desc.includes('toll') || desc.includes('rfid') || desc.includes('expressway');
      })
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  });

  expenseMeals = computed(() => {
    const hasCohExpenses = this.cohList().some(e => e.type === 'DEBIT');
    if (!hasCohExpenses) return this.trip()?.foodExpenses || 0;
    return this.cohList()
      .filter(e => {
        if (e.type !== 'DEBIT') return false;
        const desc = (e.description || '').toLowerCase();
        return e.category === 'FOOD_PER_DIEM' || desc.includes('food') || desc.includes('meal') || desc.includes('per diem');
      })
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  });

  expenseOther = computed(() => {
    const hasCohExpenses = this.cohList().some(e => e.type === 'DEBIT');
    if (!hasCohExpenses) {
       const total = this.totalTripExpenses();
       const defined = (this.trip()?.dieselExpenses || 0) + (this.trip()?.travelExpenses || 0) + (this.trip()?.foodExpenses || 0);
       return total > defined ? total - defined : 0;
    }
    const diesel = this.expenseDieselFuel();
    const toll = this.expenseTollFees();
    const meals = this.expenseMeals();
    const total = this.totalTripExpenses();
    return Math.max(0, total - (diesel + toll + meals));
  });

  totalCrewPayroll = computed(() => {
    const t = this.trip();
    if (!t) return 0;
    const driverSalary = Number(t.payroll?.driverSalary ?? t.driverSalary ?? 0) || 0;
    const helperSalary = Number(t.payroll?.helperSalary ?? t.helperSalary ?? 0) || 0;
    return driverSalary + helperSalary;
  });

  pnlBreakdown = computed(() => {
    const t = this.trip();
    if (!t) {
      return {
        grossFreight: 0,
        totalOperatingExpenses: 0,
        crewPayroll: 0,
        totalTripCost: 0,
        netCompanyIncome: 0,
        profitMarginPercent: 0
      };
    }
    const freight = Number(t.pricing?.grossFreight || t.totalFreightCharge || t.freightRevenue || 0) || 0;
    const operatingExpenses = this.totalTripExpenses();
    const crewPayroll = this.totalCrewPayroll();
    const totalCost = operatingExpenses + crewPayroll;
    const netIncome = freight - totalCost;
    const margin = freight > 0 ? Math.round((netIncome / freight) * 1000) / 10 : 0;

    return {
      grossFreight: freight,
      totalOperatingExpenses: operatingExpenses,
      crewPayroll: crewPayroll,
      totalTripCost: totalCost,
      netCompanyIncome: netIncome,
      profitMarginPercent: margin
    };
  });

  totalTripCost = computed(() => this.pnlBreakdown().totalTripCost);

  netCompanyIncome = computed(() => this.pnlBreakdown().netCompanyIncome);

  profitMarginPercent = computed(() => this.pnlBreakdown().profitMarginPercent.toFixed(1));

  ngOnInit() {
    this.route.params.subscribe(params => {
      if (params['id']) {
        const id = params['id'];
        this.tripId.set(id);
        const cleanId = String(id).trim().toLowerCase();
        const t = this.dispatchStore.trips().find(tr => 
          tr.id.toLowerCase() === cleanId || 
          String(tr.tloNumber).toLowerCase() === cleanId || 
          (tr.tripNumber !== undefined && String(tr.tripNumber) === cleanId)
        ) || this.tmsService.dispatches().find(tr => 
          tr.id.toLowerCase() === cleanId || 
          String(tr.tloNumber).toLowerCase() === cleanId || 
          (tr.tripNumber !== undefined && String(tr.tripNumber) === cleanId)
        );

        if (t && (t.previousTripBalance || t.previousCarryover)) {
          const bal = t.previousTripBalance || {
            type: t.previousCarryover!.type,
            amount: t.previousCarryover!.amount,
            lastTripTloNumber: t.previousCarryover!.fromTloNumber,
            notes: ''
          };
          this.prevType = bal.type;
          this.prevAmount = bal.amount;
          this.prevLastTlo = bal.lastTripTloNumber || '';
          this.prevNotes = (bal as any).notes || '';
        }
      }
    });

    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.activeTab.set(params['tab'] as TripDetailTab);
      }
    });
  }

  isOverdue(): boolean {
    const t = this.trip();
    return t ? this.tmsService.isTripOverdue(t) : false;
  }

  onStatusChange(status: string) {
    const t = this.trip();
    if (t) {
      if (status === 'COMPLETED') {
        this.dispatchStore.completeTrip(t.id);
        this.tmsService.updateTripStatus(t.id, 'COMPLETED');
      } else {
        this.dispatchStore.updateTripStatus(t.id, status as TripStatus);
        this.tmsService.updateTripStatus(t.id, status as TripStatus);
      }
    }
  }

  markTripAsCompleted() {
    const t = this.trip();
    if (t) {
      this.dispatchStore.completeTrip(t.id);
      this.tmsService.updateTripStatus(t.id, 'COMPLETED');
    }
  }

  openImageModal(url: string, title: string, timestamp: string, status: PODStatus = 'APPROVED', id?: string) {
    this.selectedImageModal.set({ url, title, timestamp, status, id });
  }

  approvePODImage(proof?: ProofItem) {
    const t = this.trip();
    if (!t) return;
    const url = proof?.url || t.podImageUrl || undefined;
    this.dispatchStore.approvePOD(t.id, url);
    if (proof) {
      proof.status = 'APPROVED';
    }
    this.selectedImageModal.set(null);
  }

  unflagSelectedImageModal() {
    const current = this.selectedImageModal();
    const t = this.trip();
    if (!current || !t) return;

    if (t.podImageUrl && current.url === t.podImageUrl) {
      this.dispatchStore.updateTrip(t.id, {
        podStatus: 'APPROVED',
        podFlagReason: undefined
      });
    }

    if (current.id) {
      const cohId = current.id.replace('proof-', '');
      const entries = this.cohList();
      const target = entries.find(e => e.id === cohId);
      if (target) {
        const updatedEntry = { ...target, proofStatus: undefined, flagReason: undefined };
        this.onCOHEntryUpdated(updatedEntry);
      }
    }

    current.status = 'APPROVED';
    this.selectedImageModal.set(null);
  }

  flagSelectedImageModal() {
    const current = this.selectedImageModal();
    const t = this.trip();
    if (!current || !t) return;
    const reason = prompt('Please enter reason for flagging blurry/unclear proof image:', 'Image is blurry / receipt text unreadable');
    if (reason !== null) {
      if (t.podImageUrl && current.url === t.podImageUrl) {
        this.dispatchStore.flagPOD(t.id, reason);
      }
      if (current.id) {
        const cohId = current.id.replace('proof-', '');
        const entries = this.cohList();
        const target = entries.find(e => e.id === cohId);
        if (target) {
          const updatedEntry = { ...target, proofStatus: 'FLAGGED_BLURRY' as PODStatus, flagReason: reason };
          this.onCOHEntryUpdated(updatedEntry);
        }
      }
      current.status = 'FLAGGED_BLURRY';
      current.flagReason = reason;
      this.selectedImageModal.set(null);
    }
  }

  flagProofItem(proof: ProofItem) {
    const t = this.trip();
    const reason = prompt(`Please enter reason for flagging "${proof.title}":`, 'Image is blurry / receipt number unreadable');
    if (reason !== null) {
      proof.status = 'FLAGGED_BLURRY';
      proof.flagReason = reason;
      if (t) {
        this.dispatchStore.flagPOD(t.id, reason);
      }
      alert(`Proof marked as FLAGGED: ${reason}`);
    }
  }

  attachProofToCOH(entry: any) {
    const url = prompt(`Enter receipt photo URL for "${entry.description}":`, 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop');
    if (url) {
      entry.proofUrl = url;
      entry.proofStatus = 'PENDING';
    }
  }

  getInitials(name?: string): string {
    if (!name) return 'DR';
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }

  getCategoryLabel(category: COHCategory): string {
    switch (category) {
      case 'DISPATCH_ADVANCE': return 'Dispatch Advance';
      case 'ADDITIONAL_SENT': return 'Additional Allowance';
      case 'ATM_WITHDRAWAL': return 'ATM Cash Withdrawal';
      case 'EMERGENCY_REPAIR': return 'Emergency Repair';
      case 'FUEL_TOLL_ADVANCE': return 'Fuel & Toll';
      case 'FOOD_PER_DIEM': return 'Meals / Per Diem';
      case 'OTHER_INCIDENTAL': return 'Other Incidental';
      default: return category;
    }
  }

  getCategoryBadgeClass(category: COHCategory): string {
    switch (category) {
      case 'DISPATCH_ADVANCE': return 'badge-success';
      case 'ADDITIONAL_SENT': return 'badge-brand';
      case 'ATM_WITHDRAWAL': return 'badge-neutral';
      case 'EMERGENCY_REPAIR': return 'badge-danger';
      case 'FUEL_TOLL_ADVANCE': return 'badge-warning';
      case 'FOOD_PER_DIEM': return 'badge-brand';
      case 'OTHER_INCIDENTAL': return 'badge-neutral';
      default: return 'badge-neutral';
    }
  }

  async onCOHEntryAdded(entryData: COHEntry) {
    const t = this.trip();
    if (!t) return;
    const currentEntries = this.cohList();
    const updated = [...currentEntries, entryData];

    const debits = updated
      .filter(e => e.type === 'DEBIT')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    await this.dispatchStore.updateTrip(t.id, {
      cohEntries: updated,
      cashLedger: {
        previousCarryover: t.cashLedger?.previousCarryover || t.previousCarryover || { amount: 0, type: 'BALANCED', fromTloNumber: '' },
        entries: updated
      },
      cost: debits
    });

    this.tmsService.addCOHEntry(t.id, entryData);
  }

  async onCOHEntryUpdated(entryData: COHEntry) {
    const t = this.trip();
    if (!t) return;
    const currentEntries = this.cohList();
    const updated = currentEntries.map(e => e.id === entryData.id ? entryData : e);

    const debits = updated
      .filter(e => e.type === 'DEBIT')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    await this.dispatchStore.updateTrip(t.id, {
      cohEntries: updated,
      cashLedger: {
        previousCarryover: t.cashLedger?.previousCarryover || t.previousCarryover || { amount: 0, type: 'BALANCED', fromTloNumber: '' },
        entries: updated
      },
      cost: debits
    });
  }

  async onCOHEntryDeleted(entryData: COHEntry) {
    const t = this.trip();
    if (!t) return;
    const currentEntries = this.cohList();
    const updated = currentEntries.filter(e => e.id !== entryData.id);

    const debits = updated
      .filter(e => e.type === 'DEBIT')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    await this.dispatchStore.updateTrip(t.id, {
      cohEntries: updated,
      cashLedger: {
        previousCarryover: t.cashLedger?.previousCarryover || t.previousCarryover || { amount: 0, type: 'BALANCED', fromTloNumber: '' },
        entries: updated
      },
      cost: debits
    });
  }

  submitPrevBalance() {
    const t = this.trip();
    if (!t) return;

    const updatedBalance: DriverLastTripBalance = {
      type: this.prevType,
      amount: this.prevType === 'BALANCED' ? 0 : (this.prevAmount || 0),
      lastTripTloNumber: this.prevLastTlo,
      notes: this.prevNotes
    };

    this.tmsService.updatePreviousTripBalance(t.id, updatedBalance);
    this.showPrevBalanceModal.set(false);
  }

  onCADeductionPrefChange(preference: import('../../core/models/tms.models').CADeductionPreference) {
    const t = this.trip();
    if (t) {
      this.tmsService.updateCADeductionPreference(t.id, preference);
    }
  }

  convertUnspentToCashAdvance() {
    const unspent = this.netCOHBalance();
    if (unspent <= 0) {
      alert('There is no unspent cash surplus available to convert.');
      return;
    }
    const t = this.trip();
    if (!t) return;

    const formattedAmount = unspent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (confirm(`Convert unspent trip cash of ₱${formattedAmount} to Driver Cash Advance (Payroll Deduction)?`)) {
      this.tmsService.addCOHEntry(t.id, {
        category: 'OTHER_INCIDENTAL',
        amount: unspent,
        type: 'DEBIT',
        description: `Unspent trip cash converted to Driver Cash Advance payroll deduction`,
        timestamp: new Date().toISOString()
      });
      alert(`Successfully converted ₱${formattedAmount} unspent cash surplus to Driver Cash Advance!`);
    }
  }
}
