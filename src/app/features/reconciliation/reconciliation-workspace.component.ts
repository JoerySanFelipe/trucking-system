import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TmsService } from '../../core/services/tms.service';

@Component({
  selector: 'app-reconciliation-workspace',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="w-full space-y-6 animate-fade-in-up pb-12">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-slate-900 tracking-tight">Reconciliation</h1>
          <p class="text-sm text-slate-500 mt-1">Compare Porbido submitted billings against an independently received client statement.</p>
        </div>
      </div>

      <!-- Creation Flow -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <!-- STEP 1 & 2: Selection -->
        <div class="card p-6 space-y-5">
          <div>
            <h2 class="text-base font-bold text-slate-900">1. Select Client</h2>
            <p class="text-xs text-slate-500 mb-3">Choose the client to reconcile.</p>
            <select [(ngModel)]="selectedClient" class="form-input w-full text-sm">
              <option value="">-- Select Client --</option>
              <option *ngFor="let client of availableClients()" [value]="client">{{ client }}</option>
            </select>
          </div>

          <div>
            <h2 class="text-base font-bold text-slate-900">2. Select Billing Period</h2>
            <p class="text-xs text-slate-500 mb-3">Choose the period for this reconciliation.</p>
            <select [(ngModel)]="selectedPeriod" [disabled]="!selectedClient()" class="form-input w-full text-sm disabled:bg-slate-50 disabled:text-slate-400">
              <option value="">-- Select Period --</option>
              <option *ngFor="let period of availablePeriods()" [value]="period">{{ period }}</option>
            </select>
          </div>
        </div>

        <!-- Pre-Creation Summary -->
        <div class="card p-6 bg-brand-50/30 border-brand-100 flex flex-col justify-between">
          <div>
            <h2 class="text-base font-bold text-brand-900 mb-4 flex items-center gap-2">
              <span class="material-symbols-outlined text-[20px] text-brand-600">compare_arrows</span>
              <span>Reconciliation Summary</span>
            </h2>
            
            <div class="space-y-3">
              <div class="flex justify-between text-sm">
                <span class="text-slate-500">Client:</span>
                <span class="font-semibold text-slate-900">{{ selectedClient() || '—' }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-slate-500">Billing Period:</span>
                <span class="font-semibold text-slate-900">{{ selectedPeriod() || '—' }}</span>
              </div>
              <div class="flex justify-between text-sm pt-2 border-t border-brand-200/50">
                <span class="text-slate-500">Porbido Billings:</span>
                <span class="font-semibold text-slate-900">{{ eligibleBillings().length }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-slate-500">Client Statement:</span>
                <span class="font-semibold text-slate-900">{{ clientStatement()?.statementNumber || '—' }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-slate-500">Statement Lines:</span>
                <span class="font-semibold text-slate-900">{{ statementLinesCount() }}</span>
              </div>
            </div>
          </div>

          <div class="mt-6">
            <button 
              [disabled]="!canCreateSession()"
              (click)="createSession()"
              class="btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed">
              Create Reconciliation Session
            </button>
            <p *ngIf="!canCreateSession() && selectedClient() && selectedPeriod()" class="text-xs text-rose-500 text-center mt-2 font-medium">
              Missing eligible billings or client statement.
            </p>
          </div>
        </div>
      </div>

      <!-- STEP 3 & 4: Data Preview -->
      <div *ngIf="selectedClient() && selectedPeriod()" class="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <!-- Porbido Billings Preview -->
        <div class="card p-0 overflow-hidden">
          <div class="bg-slate-50 px-5 py-4 border-b border-slate-200 flex justify-between items-center">
            <div>
              <h2 class="text-sm font-bold text-slate-800">3. Porbido Submitted Billings</h2>
              <p class="text-[11px] text-slate-500">Only SUBMITTED billings are eligible.</p>
            </div>
            <span class="badge bg-slate-200 text-slate-700">{{ eligibleBillings().length }} records</span>
          </div>
          
          <div class="p-5" *ngIf="eligibleBillings().length === 0">
            <div class="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl">
              <p class="text-sm font-medium text-slate-500">No eligible billings found.</p>
            </div>
          </div>

          <div class="divide-y divide-slate-100" *ngIf="eligibleBillings().length > 0">
            <div *ngFor="let b of eligibleBillings()" class="p-5 hover:bg-slate-50 transition-colors">
              <div class="flex justify-between items-start mb-2">
                <div>
                  <div class="text-sm font-bold text-brand-600">{{ b.billingNumber }}</div>
                  <div class="text-xs text-slate-500 mt-0.5">{{ b.tripIds.length }} trips • {{ b.totalWeight }} tons</div>
                </div>
                <div class="text-right">
                  <div class="text-sm font-mono font-bold text-slate-900">₱{{ b.grossFreight | number:'1.2-2' }}</div>
                  <span class="badge bg-emerald-100 text-emerald-700 mt-1">SUBMITTED</span>
                </div>
              </div>
            </div>
            <div class="p-4 bg-slate-50/50 flex justify-between items-center text-sm font-bold text-slate-800 border-t border-slate-100">
              <span>Total Porbido Amount</span>
              <span class="font-mono">₱{{ porbidoTotalAmount() | number:'1.2-2' }}</span>
            </div>
          </div>
        </div>

        <!-- Client Statement Preview -->
        <div class="card p-0 overflow-hidden border-indigo-100">
          <div class="bg-indigo-50/50 px-5 py-4 border-b border-indigo-100 flex justify-between items-center">
            <div>
              <h2 class="text-sm font-bold text-indigo-900">4. Client Statement</h2>
              <p class="text-[11px] text-indigo-600/70">Received client statement data.</p>
            </div>
            <span class="badge bg-indigo-100 text-indigo-700" *ngIf="clientStatement()">{{ statementLinesCount() }} lines</span>
          </div>

          <div class="p-5" *ngIf="!clientStatement()">
            <div class="text-center py-6 border-2 border-dashed border-indigo-100 rounded-xl">
              <p class="text-sm font-medium text-indigo-500/70">No statement found for this period.</p>
            </div>
          </div>

          <div *ngIf="clientStatement()" class="p-5">
            <div class="space-y-4">
              <div class="flex justify-between items-center p-3 rounded-lg border border-indigo-50 bg-white shadow-sm">
                <div>
                  <div class="text-xs font-medium text-slate-500 uppercase tracking-wider">Statement Ref</div>
                  <div class="text-sm font-bold text-indigo-900 mt-0.5">{{ clientStatement()?.statementNumber }}</div>
                </div>
                <div class="text-right">
                  <div class="text-xs font-medium text-slate-500 uppercase tracking-wider">Statement Date</div>
                  <div class="text-sm font-bold text-slate-700 mt-0.5">{{ clientStatement()?.statementDate | date:'mediumDate' }}</div>
                </div>
              </div>

              <div class="p-4 bg-indigo-50/50 rounded-lg border border-indigo-100 flex justify-between items-center text-sm font-bold text-indigo-900">
                <span>Total Statement Amount</span>
                <span class="font-mono">₱{{ clientStatement()?.totalAmount | number:'1.2-2' }}</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  `
})
export class ReconciliationWorkspaceComponent {
  tmsService = inject(TmsService);
  router = inject(Router);

  selectedClient = signal<string>('');
  selectedPeriod = signal<string>('');

  availableClients = computed(() => {
    // Collect all distinct clients from submitted billings and client statements
    const clients = new Set<string>();
    this.tmsService.billingBatches().filter(b => b.status === 'SUBMITTED').forEach(b => clients.add(b.client));
    this.tmsService.clientStatements().forEach(s => clients.add(s.client));
    return Array.from(clients).sort();
  });

  // Helper: Convert "Aug 7, 2026 - Aug 9, 2026" or "August 2026" into canonical "Month Year" (e.g. "August 2026")
  deriveAccountingMonth(periodStr: string): string {
    if (!periodStr) return '';
    const firstDateStr = periodStr.split('-')[0].trim();
    const d = new Date(firstDateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    }
    return periodStr;
  }

  availablePeriods = computed(() => {
    const client = this.selectedClient();
    if (!client) return [];
    const periods = new Set<string>();
    this.tmsService.billingBatches().filter(b => b.client === client && b.status === 'SUBMITTED').forEach(b => periods.add(this.deriveAccountingMonth(b.billingPeriod)));
    this.tmsService.clientStatements().filter(s => s.client === client).forEach(s => periods.add(this.deriveAccountingMonth(s.statementPeriod)));
    return Array.from(periods).sort();
  });

  eligibleBillings = computed(() => {
    const client = this.selectedClient();
    const period = this.selectedPeriod();
    if (!client || !period) return [];
    return this.tmsService.billingBatches().filter(
      b => b.client === client && this.deriveAccountingMonth(b.billingPeriod) === period && b.status === 'SUBMITTED'
    );
  });

  porbidoTotalAmount = computed(() => {
    return this.eligibleBillings().reduce((sum, b) => sum + b.grossFreight, 0);
  });

  clientStatement = computed(() => {
    const client = this.selectedClient();
    const period = this.selectedPeriod();
    if (!client || !period) return undefined;
    return this.tmsService.clientStatements().find(
      s => s.client === client && this.deriveAccountingMonth(s.statementPeriod) === period
    );
  });

  statementLinesCount = computed(() => {
    const statement = this.clientStatement();
    if (!statement) return 0;
    return this.tmsService.clientStatementLines().filter(l => l.statementId === statement.id).length;
  });

  canCreateSession = computed(() => {
    return this.selectedClient() !== '' && 
           this.selectedPeriod() !== '' && 
           this.eligibleBillings().length > 0 && 
           this.clientStatement() !== undefined;
  });

  createSession() {
    if (!this.canCreateSession()) return;
    
    const client = this.selectedClient();
    const period = this.selectedPeriod();
    const stmt = this.clientStatement();
    const billingIds = this.eligibleBillings().map(b => b.id);
    
    if (stmt) {
      const session = this.tmsService.createReconciliationSession(
        client,
        period,
        stmt.id,
        billingIds
      );
      this.router.navigate(['/reconciliation-workspace', session.id]);
    }
  }
}
