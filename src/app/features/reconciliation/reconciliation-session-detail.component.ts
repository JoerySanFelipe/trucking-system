import { Component, inject, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TmsService } from '../../core/services/tms.service';
import { ReconciliationSession, ClientStatement, ClientStatementLine, TripDispatch, ReconciliationException } from '../../core/models/tms.models';

import { ModalTeleportDirective } from '../../shared/directives/modal-teleport.directive';

@Component({
  selector: 'app-reconciliation-session-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ModalTeleportDirective],
  template: `
    <div class="w-full space-y-6 animate-fade-in-up pb-12" *ngIf="session()">
      
      <!-- Persistent Header -->
      <div class="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <div class="flex items-center gap-3 mb-1">
            <a routerLink="/reconciliation-workspace" class="text-sm font-medium text-brand-600 hover:text-brand-800 transition-colors">
              &larr; Back to Workspace
            </a>
            <span class="text-slate-300">|</span>
            <span class="badge bg-indigo-100 text-indigo-700 font-mono">{{ session()?.id }}</span>
            <span class="badge" [ngClass]="{
              'bg-amber-100 text-amber-700': session()?.status === 'DRAFT',
              'bg-blue-100 text-blue-700': session()?.status === 'IN_REVIEW',
              'bg-emerald-100 text-emerald-700': session()?.status === 'CLOSED'
            }">{{ session()?.status }}</span>
          </div>
          <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">Reconciliation Session</h1>
          <p class="text-sm text-slate-500 mt-1">
            {{ session()?.client }} &bull; {{ session()?.billingPeriod }} &bull; Created {{ session()?.createdAt | date:'medium' }}
          </p>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="flex space-x-1 border-b border-slate-200">
        <button *ngFor="let tab of tabs" 
          (click)="activeTab.set(tab.id)"
          [class]="activeTab() === tab.id ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'"
          class="whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-colors">
          {{ tab.label }}
          <span *ngIf="tab.id === 'exceptions' && unresolvedCount() > 0" class="ml-2 bg-rose-100 text-rose-700 py-0.5 px-2 rounded-full text-xs">
            {{ unresolvedCount() }}
          </span>
        </button>
      </div>

      <!-- TAB CONTENT: OVERVIEW -->
      <div *ngIf="activeTab() === 'overview'" class="space-y-6 animate-fade-in">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          
          <div class="card p-5 bg-slate-50">
            <div class="text-sm font-medium text-slate-500 mb-1">Porbido Submitted Billings</div>
            <div class="text-2xl font-bold text-slate-900">{{ porbidoTrips().length }} <span class="text-sm font-normal text-slate-500">trips</span></div>
          </div>
          <div class="card p-5 bg-indigo-50/50">
            <div class="text-sm font-medium text-indigo-500 mb-1">Client Statement Lines</div>
            <div class="text-2xl font-bold text-indigo-900">{{ statementLines().length }} <span class="text-sm font-normal text-indigo-500">lines</span></div>
          </div>
          <div class="card p-5 bg-emerald-50">
            <div class="text-sm font-medium text-emerald-600 mb-1">Perfectly Matched</div>
            <div class="text-2xl font-bold text-emerald-700">{{ matchCount() }} <span class="text-sm font-normal text-emerald-600">records</span></div>
          </div>
          <div class="card p-5 bg-rose-50 border-rose-100">
            <div class="text-sm font-medium text-rose-600 mb-1">Unresolved Exceptions</div>
            <div class="text-2xl font-bold text-rose-700">{{ unresolvedCount() }} <span class="text-sm font-normal text-rose-600">issues</span></div>
          </div>

        </div>

        <div class="card p-6">
          <h2 class="text-lg font-bold text-slate-900 mb-4">Exception Breakdown</h2>
          <div class="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div class="p-4 rounded-lg bg-amber-50">
              <div class="text-xl font-bold text-amber-700">{{ exceptionCounts().amountMismatch }}</div>
              <div class="text-xs font-medium text-amber-600 mt-1 uppercase tracking-wider">Amount<br>Mismatch</div>
            </div>
            <div class="p-4 rounded-lg bg-orange-50">
              <div class="text-xl font-bold text-orange-700">{{ exceptionCounts().detailMismatch }}</div>
              <div class="text-xs font-medium text-orange-600 mt-1 uppercase tracking-wider">Detail<br>Mismatch</div>
            </div>
            <div class="p-4 rounded-lg bg-purple-50">
              <div class="text-xl font-bold text-purple-700">{{ exceptionCounts().duplicateRef }}</div>
              <div class="text-xs font-medium text-purple-600 mt-1 uppercase tracking-wider">Duplicate<br>Ref</div>
            </div>
            <div class="p-4 rounded-lg bg-rose-50">
              <div class="text-xl font-bold text-rose-700">{{ exceptionCounts().missingClient }}</div>
              <div class="text-xs font-medium text-rose-600 mt-1 uppercase tracking-wider">Missing In<br>Client</div>
            </div>
            <div class="p-4 rounded-lg bg-blue-50">
              <div class="text-xl font-bold text-blue-700">{{ exceptionCounts().missingPorbido }}</div>
              <div class="text-xs font-medium text-blue-600 mt-1 uppercase tracking-wider">Missing In<br>Porbido</div>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB CONTENT: STATEMENT -->
      <div *ngIf="activeTab() === 'statement'" class="card p-0 overflow-hidden animate-fade-in">
        <div class="bg-indigo-50/50 px-5 py-4 border-b border-indigo-100">
          <h2 class="text-sm font-bold text-indigo-900">CLIENT STATEMENT</h2>
          <p class="text-[11px] text-indigo-600/70">Independent received dataset. READ-ONLY.</p>
        </div>
        <div class="overflow-x-auto">
          <table class="data-table w-full text-sm">
            <thead>
              <tr class="bg-slate-100 border-b border-slate-200 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                <th class="p-4">TLO / Reference</th>
                <th class="p-4">Date</th>
                <th class="p-4">Plate</th>
                <th class="p-4">Route</th>
                <th class="p-4 text-right">Weight</th>
                <th class="p-4 text-right">Payable Amount</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr *ngFor="let line of statementLines()" class="hover:bg-slate-50/50">
                <td class="p-4 font-bold text-slate-800">{{ line.shipmentRefNumber }}</td>
                <td class="p-4 text-slate-600">{{ line.shipmentDate | date:'shortDate' }}</td>
                <td class="p-4 text-slate-600">{{ line.plateNumber }}</td>
                <td class="p-4 text-slate-600 truncate max-w-[200px]">{{ line.route }}</td>
                <td class="p-4 text-right font-mono text-slate-700">{{ line.weight | number:'1.2-2' }} t</td>
                <td class="p-4 text-right font-mono font-bold text-indigo-700">₱{{ line.payableAmount | number:'1.2-2' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TAB CONTENT: MATCHING -->
      <div *ngIf="activeTab() === 'matching'" class="card p-0 overflow-hidden animate-fade-in border-slate-200">
        <div class="overflow-x-auto">
          <table class="w-full text-sm text-left">
            <thead>
              <tr class="bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider">
                <th class="p-4 border-r border-slate-200 bg-brand-50/30 w-5/12">PORBIDO SUBMITTED</th>
                <th class="p-4 border-r border-slate-200 bg-indigo-50/30 w-5/12">CLIENT STATEMENT</th>
                <th class="p-4 bg-slate-50 w-2/12">MATCH RESULT</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr *ngFor="let exc of exceptions()" class="hover:bg-slate-50/30 transition-colors">
                
                <!-- Porbido Side -->
                <td class="p-4 border-r border-slate-100 align-top">
                  <div *ngIf="exc.porbidoTrip" class="space-y-1">
                    <div class="flex justify-between">
                      <span class="font-bold text-brand-700">{{ exc.porbidoTrip.tloNumber }}</span>
                      <span class="text-xs text-slate-500">{{ exc.porbidoTrip.dispatchedAt | date:'shortDate' }}</span>
                    </div>
                    <div class="text-xs text-slate-600">{{ exc.porbidoTrip.plateNumber }} &bull; {{ exc.porbidoTrip.tonnage }} t</div>
                    <div class="text-xs text-slate-500 truncate" title="{{ exc.porbidoTrip.destination }}">{{ exc.porbidoTrip.destination }}</div>
                    <div class="font-mono font-bold text-slate-900 mt-2">₱{{ exc.porbidoTrip.totalFreightCharge | number:'1.2-2' }}</div>
                  </div>
                  <div *ngIf="!exc.porbidoTrip" class="h-full flex items-center justify-center p-4">
                    <span class="text-xs font-medium text-slate-400 italic">No Porbido Record</span>
                  </div>
                </td>

                <!-- Client Side -->
                <td class="p-4 border-r border-slate-100 align-top bg-indigo-50/10">
                  <div *ngIf="exc.clientLine" class="space-y-1">
                    <div class="flex justify-between">
                      <span class="font-bold text-indigo-800">{{ exc.clientLine.shipmentRefNumber }}</span>
                      <span class="text-xs text-slate-500">{{ exc.clientLine.shipmentDate | date:'shortDate' }}</span>
                    </div>
                    <div class="text-xs text-slate-600">{{ exc.clientLine.plateNumber }} &bull; {{ exc.clientLine.weight }} t</div>
                    <div class="text-xs text-slate-500 truncate" title="{{ exc.clientLine.route }}">{{ exc.clientLine.route }}</div>
                    <div class="font-mono font-bold text-indigo-700 mt-2">₱{{ exc.clientLine.payableAmount | number:'1.2-2' }}</div>
                  </div>
                  <div *ngIf="!exc.clientLine" class="h-full flex items-center justify-center p-4">
                    <span class="text-xs font-medium text-slate-400 italic">No Client Record</span>
                  </div>
                </td>

                <!-- Result Side -->
                <td class="p-4 align-top bg-slate-50/50">
                  <div class="flex flex-col gap-2">
                    <span class="badge w-max" [ngClass]="getExceptionBadgeClass(exc.type)">
                      {{ exc.type.replace('_', ' ') }}
                    </span>
                    
                    <span *ngIf="exc.matchMethod !== 'NONE'" class="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                      BY: {{ exc.matchMethod.replace('_', ' ') }}
                    </span>
                    
                    <div *ngIf="exc.amountVariance !== 0" class="mt-2 text-xs font-bold" [ngClass]="exc.amountVariance > 0 ? 'text-emerald-600' : 'text-rose-600'">
                      Variance: {{ exc.amountVariance > 0 ? '+' : '' }}₱{{ exc.amountVariance | number:'1.2-2' }}
                    </div>
                  </div>
                </td>

              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TAB CONTENT: EXCEPTIONS -->
      <div *ngIf="activeTab() === 'exceptions'" class="space-y-4 animate-fade-in">
        
        <div *ngIf="actionableExceptions().length === 0" class="card p-12 text-center border-dashed border-2">
          <span class="material-symbols-outlined text-[48px] text-emerald-500 mx-auto mb-3">task_alt</span>
          <h3 class="text-lg font-bold text-slate-800">No Exceptions Found</h3>
          <p class="text-sm text-slate-500 mt-1">All records are perfectly matched.</p>
        </div>

        <div *ngFor="let exc of actionableExceptions()" class="card p-0 overflow-hidden border-l-4" [ngClass]="getExceptionBorderClass(exc.type)">
          <div class="p-4 flex items-start justify-between bg-slate-50 border-b border-slate-100">
            <div class="flex items-center gap-3">
              <span class="badge" [ngClass]="getExceptionBadgeClass(exc.type)">{{ exc.type.replace('_', ' ') }}</span>
              <span class="text-sm font-bold text-slate-700">
                Ref: {{ exc.porbidoTrip?.tloNumber || exc.clientLine?.shipmentRefNumber }}
              </span>
            </div>
            
            <div class="flex items-center gap-3">
              <!-- Status Badge -->
              <span *ngIf="exc.status === 'OPEN'" class="badge bg-slate-200 text-slate-700">UNRESOLVED</span>
              <span *ngIf="exc.status === 'RESOLVED'" class="badge bg-emerald-100 text-emerald-700">RESOLVED</span>
              <span *ngIf="exc.status === 'DISPUTED'" class="badge bg-rose-100 text-rose-700">DISPUTED</span>
              
              <!-- Resolve Button -->
              <button *ngIf="exc.status === 'OPEN'" (click)="openResolveModal(exc)" class="btn-primary text-xs px-3 py-1 shadow-sm">Resolve</button>
            </div>
          </div>
          
          <div class="p-5 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            
            <div>
              <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Porbido Source</h4>
              <div *ngIf="exc.porbidoTrip" class="space-y-2 text-slate-700">
                <div class="flex justify-between border-b border-slate-100 pb-1">
                  <span>Freight Charge</span>
                  <span class="font-mono font-bold">₱{{ exc.porbidoTrip.totalFreightCharge | number:'1.2-2' }}</span>
                </div>
                <div class="flex justify-between border-b border-slate-100 pb-1">
                  <span>Plate / Weight</span>
                  <span>{{ exc.porbidoTrip.plateNumber }} ({{ exc.porbidoTrip.tonnage }}t)</span>
                </div>
              </div>
              <div *ngIf="!exc.porbidoTrip" class="text-slate-400 italic">No corresponding Porbido trip.</div>
            </div>

            <div>
              <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Client Source</h4>
              <div *ngIf="exc.clientLine" class="space-y-2 text-slate-700">
                <div class="flex justify-between border-b border-slate-100 pb-1">
                  <span>Payable Amount</span>
                  <span class="font-mono font-bold">₱{{ exc.clientLine.payableAmount | number:'1.2-2' }}</span>
                </div>
                <div class="flex justify-between border-b border-slate-100 pb-1">
                  <span>Plate / Weight</span>
                  <span>{{ exc.clientLine.plateNumber }} ({{ exc.clientLine.weight }}t)</span>
                </div>
              </div>
              <div *ngIf="!exc.clientLine" class="text-slate-400 italic">No corresponding Client line.</div>
            </div>

          </div>

          <!-- Variance Details -->
          <div *ngIf="exc.amountVariance !== 0 && exc.status === 'OPEN'" class="bg-rose-50/50 p-4 border-t border-rose-100 flex justify-between items-center">
            <span class="text-sm font-bold text-rose-800">Amount Variance</span>
            <span class="font-mono font-bold text-rose-700">
              {{ exc.amountVariance > 0 ? '+' : '' }}₱{{ exc.amountVariance | number:'1.2-2' }}
            </span>
          </div>
          
          <!-- Resolution Details (If Resolved or Disputed) -->
          <div *ngIf="exc.status !== 'OPEN'" class="bg-slate-50 p-4 border-t border-slate-200">
            <div *ngIf="exc.status === 'RESOLVED' && exc.resolution">
              <h4 class="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2">Resolution: {{ exc.resolution.action.replace('_', ' ') }}</h4>
              <p *ngIf="exc.resolution.notes" class="text-sm text-slate-600 mb-2">Notes: {{ exc.resolution.notes }}</p>
              <div class="text-[11px] text-slate-400">Confirmed by {{ exc.resolution.confirmedBy }} on {{ exc.resolution.confirmedAt | date:'medium' }}</div>
            </div>
            
            <div *ngIf="exc.status === 'DISPUTED'">
              <h4 class="text-xs font-bold text-rose-700 uppercase tracking-wider mb-2">Disputed</h4>
              <p *ngIf="exc.disputeReason" class="text-sm text-slate-600 mb-2">Reason: {{ exc.disputeReason }}</p>
              <div *ngIf="exc.resolution" class="text-[11px] text-slate-400">Recorded by {{ exc.resolution.confirmedBy }} on {{ exc.resolution.confirmedAt | date:'medium' }}</div>
            </div>
          </div>

        </div>

      </div>

    </div>
    
    <!-- RESOLUTION MODAL -->
    <div *ngIf="selectedException()" appModalTeleport class="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" (click)="closeResolveModal()"></div>
      <div class="flex min-h-full items-center justify-center p-4 text-center sm:p-6">
        <div (click)="$event.stopPropagation()" class="relative transform bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden my-auto text-left animate-scale-in flex flex-col max-h-[90vh]">
          <div class="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h2 class="text-lg font-black text-slate-900">Resolve Exception</h2>
            <button (click)="closeResolveModal()" class="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
          </div>
          
          <div class="p-6 overflow-y-auto" *ngIf="selectedException() as exc">
            <div class="mb-5">
              <div class="text-sm text-slate-500 mb-1">Exception Reference</div>
              <div class="text-lg font-bold text-slate-800">{{ exc.porbidoTrip?.tloNumber || exc.clientLine?.shipmentRefNumber }}</div>
              <div class="flex gap-2 mt-2">
                <span class="badge" [ngClass]="getExceptionBadgeClass(exc.type)">{{ exc.type.replace('_', ' ') }}</span>
                <span *ngIf="exc.amountVariance !== 0" class="badge text-rose-700 bg-rose-100 font-mono">Variance: {{ exc.amountVariance > 0 ? '+' : '' }}₱{{ exc.amountVariance | number:'1.2-2' }}</span>
              </div>
            </div>
            
            <div class="space-y-5">
              <!-- Resolution Action Selection -->
              <div>
                <label class="block text-sm font-bold text-slate-700 mb-2">Select Action</label>
                <select [ngModel]="resolveAction()" (ngModelChange)="resolveAction.set($event)" class="form-input w-full">
                  <option [ngValue]="null" disabled>Choose a resolution...</option>
                  <option value="ACCEPT_PORBIDO">Accept Porbido Details</option>
                  <option value="ACCEPT_CLIENT">Accept Client Details</option>
                  <option value="ADJUSTMENT">Create Adjustment</option>
                  <option value="DISPUTED">Mark as Disputed</option>
                </select>
              </div>
              
              <!-- ADJUSTMENT FIELDS -->
              <div *ngIf="resolveAction() === 'ADJUSTMENT'" class="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-4">
                <h4 class="text-sm font-bold text-indigo-900">Adjustment Details</h4>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1">Type</label>
                    <select [ngModel]="adjType()" (ngModelChange)="adjType.set($event)" class="form-input w-full text-sm">
                      <option value="POSITIVE">Positive (+)</option>
                      <option value="NEGATIVE">Negative (-)</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1">Amount (₱)</label>
                    <input type="number" [ngModel]="adjAmount()" (ngModelChange)="adjAmount.set($event)" class="form-input w-full text-sm font-mono" min="0.01" step="0.01" placeholder="0.00">
                  </div>
                </div>
              </div>
              
              <!-- NOTES / REASON (Required for Dispute/Adjustment, Optional otherwise) -->
              <div *ngIf="resolveAction()">
                <label class="block text-sm font-bold text-slate-700 mb-2">
                  {{ resolveAction() === 'DISPUTED' ? 'Dispute Reason & Evidence (Required)' : (resolveAction() === 'ADJUSTMENT' ? 'Adjustment Reason (Required)' : 'Notes (Optional)') }}
                </label>
                <textarea [ngModel]="resolveNotes()" (ngModelChange)="resolveNotes.set($event)" rows="3" class="form-input w-full" placeholder="Enter details..."></textarea>
              </div>
              
            </div>
          </div>
          
          <div class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
            <button (click)="closeResolveModal()" class="btn-secondary px-5 py-2 text-sm font-bold cursor-pointer">Cancel</button>
            <button (click)="confirmResolution()" [disabled]="!isResolutionValid()" class="btn-primary shadow-brand px-6 py-2 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">Confirm Resolution</button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ReconciliationSessionDetailComponent implements OnInit {
  tmsService = inject(TmsService);
  route = inject(ActivatedRoute);

  sessionId = signal<string>('');
  activeTab = signal<string>('overview');
  
  tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'statement', label: 'Client Statement' },
    { id: 'matching', label: 'Matching Matrix' },
    { id: 'exceptions', label: 'Exceptions' }
  ];

  session = computed(() => {
    return this.tmsService.reconciliationSessions().find(s => s.id === this.sessionId());
  });

  statementLines = computed(() => {
    const s = this.session();
    if (!s) return [];
    return this.tmsService.clientStatementLines().filter(l => l.statementId === s.statementId);
  });

  porbidoTrips = computed(() => {
    const s = this.session();
    if (!s) return [];
    const batches = this.tmsService.billingBatches().filter(b => s.porbidoBillingIds.includes(b.id));
    const tripIds = batches.flatMap(b => b.tripIds);
    return this.tmsService.dispatches().filter(t => tripIds.includes(t.id));
  });

  exceptions = computed(() => {
    return this.tmsService.reconciliationExceptions().filter(e => e.sessionId === this.sessionId());
  });

  actionableExceptions = computed(() => {
    return this.exceptions().filter(e => e.type !== 'MATCHED');
  });

  unresolvedCount = computed(() => this.exceptions().filter(e => e.type !== 'MATCHED' && e.status === 'OPEN').length);
  matchCount = computed(() => this.exceptions().filter(e => e.type === 'MATCHED').length);

  exceptionCounts = computed(() => {
    const ex = this.exceptions();
    return {
      amountMismatch: ex.filter(e => e.type === 'AMOUNT_MISMATCH').length,
      detailMismatch: ex.filter(e => e.type === 'DETAIL_MISMATCH').length,
      duplicateRef: ex.filter(e => e.type === 'DUPLICATE_REFERENCE').length,
      missingClient: ex.filter(e => e.type === 'MISSING_IN_CLIENT').length,
      missingPorbido: ex.filter(e => e.type === 'MISSING_IN_PORBIDO').length,
    };
  });

  // Modal State
  selectedException = signal<ReconciliationException | null>(null);
  resolveAction = signal<'ACCEPT_PORBIDO' | 'ACCEPT_CLIENT' | 'ADJUSTMENT' | 'DISPUTED' | null>(null);
  resolveNotes = signal<string>('');
  adjType = signal<'POSITIVE' | 'NEGATIVE'>('POSITIVE');
  adjAmount = signal<number | null>(null);

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.sessionId.set(id);
        // Execute Matching Engine securely
        this.tmsService.runMatchingEngine(id);
      }
    });
  }

  getExceptionBadgeClass(type: string): string {
    switch (type) {
      case 'MATCHED': return 'bg-emerald-100 text-emerald-700';
      case 'AMOUNT_MISMATCH': return 'bg-amber-100 text-amber-700';
      case 'DETAIL_MISMATCH': return 'bg-orange-100 text-orange-700';
      case 'DUPLICATE_REFERENCE': return 'bg-purple-100 text-purple-700';
      case 'MISSING_IN_CLIENT': return 'bg-rose-100 text-rose-700';
      case 'MISSING_IN_PORBIDO': return 'bg-blue-100 text-blue-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  }

  getExceptionBorderClass(type: string): string {
    switch (type) {
      case 'MATCHED': return 'border-emerald-400';
      case 'AMOUNT_MISMATCH': return 'border-amber-400';
      case 'DETAIL_MISMATCH': return 'border-orange-400';
      case 'DUPLICATE_REFERENCE': return 'border-purple-400';
      case 'MISSING_IN_CLIENT': return 'border-rose-400';
      case 'MISSING_IN_PORBIDO': return 'border-blue-400';
      default: return 'border-slate-300';
    }
  }

  openResolveModal(exc: ReconciliationException) {
    this.selectedException.set(exc);
    this.resolveAction.set(null);
    this.resolveNotes.set('');
    this.adjType.set('POSITIVE');
    this.adjAmount.set(null);
  }
  
  closeResolveModal() {
    this.selectedException.set(null);
  }

  isResolutionValid(): boolean {
    const action = this.resolveAction();
    if (!action) return false;
    
    if (action === 'ADJUSTMENT') {
      const amt = this.adjAmount();
      if (!amt || amt <= 0) return false;
      if (!this.resolveNotes() || this.resolveNotes().trim().length === 0) return false;
    }
    
    if (action === 'DISPUTED') {
      if (!this.resolveNotes() || this.resolveNotes().trim().length === 0) return false;
    }
    
    return true;
  }
  
  confirmResolution() {
    if (!this.isResolutionValid()) return;
    
    const exc = this.selectedException();
    const action = this.resolveAction();
    if (!exc || !action) return;
    
    try {
      this.tmsService.resolveReconciliationException(
        exc.id, 
        action, 
        this.resolveNotes(), 
        action === 'ADJUSTMENT' ? { type: this.adjType(), amount: this.adjAmount()! } : undefined
      );
      this.closeResolveModal();
    } catch (e) {
      console.error('Error resolving exception:', e);
      alert('Failed to resolve exception.');
    }
  }
}
