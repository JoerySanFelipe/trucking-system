import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-reconciliation',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="w-full space-y-6 animate-fade-in-up p-8">
      <div class="card p-8 text-center max-w-2xl mx-auto">
        <h2 class="text-2xl font-bold text-slate-800 mb-4">Reconciliation Module Upgraded</h2>
        <p class="text-slate-600 mb-6">
          The legacy reconciliation module has been deprecated and replaced by the new Enterprise Reconciliation Workspace in Phase 4.
        </p>
        <a routerLink="/reconciliation-workspace" class="btn-primary inline-block">
          Go to New Reconciliation Workspace
        </a>
      </div>
    </div>
  `
})
export class ReconciliationComponent {}
