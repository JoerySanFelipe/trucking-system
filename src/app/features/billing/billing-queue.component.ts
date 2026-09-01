import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TmsService } from '../../core/services/tms.service';
import { Router } from '@angular/router';
import { TripDispatch } from '../../core/models/tms.models';

import { ModalTeleportDirective } from '../../shared/directives/modal-teleport.directive';

@Component({
  selector: 'app-billing-queue',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalTeleportDirective],
  template: `
    <div class="w-full space-y-6 animate-fade-in-up">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-slate-900 tracking-tight">Billing Queue</h1>
          <p class="text-sm text-slate-500 mt-1">Select eligible trips to create a Draft Billing Batch.</p>
        </div>
      </div>

      <!-- Filters & Actions -->
      <div class="card p-4 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50 border-b border-slate-200">
        <div class="flex flex-wrap gap-3 flex-1">
          <input type="text" [ngModel]="searchTlo()" (ngModelChange)="searchTlo.set($event)" placeholder="TLO Number" class="form-input text-sm w-32" />
          <input type="text" [ngModel]="searchPlate()" (ngModelChange)="searchPlate.set($event)" placeholder="Truck Plate" class="form-input text-sm w-32" />
          <input type="text" [ngModel]="searchRoute()" (ngModelChange)="searchRoute.set($event)" placeholder="Route (Origin/Dest)" class="form-input text-sm w-48" />
          <select [ngModel]="filterClient()" (ngModelChange)="filterClient.set($event)" class="form-input text-sm w-40">
            <option value="">All Clients</option>
            <option *ngFor="let client of availableClients()" [value]="client">{{ client }}</option>
          </select>
          <button (click)="clearFilters()" class="btn-secondary text-sm px-3 py-1.5" *ngIf="searchTlo() || searchPlate() || searchRoute() || filterClient()">Clear</button>
        </div>
      </div>

      <!-- Table & Selection Area -->
      <div class="card overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
          <div class="flex items-center gap-4">
            <h2 class="text-base font-bold text-slate-900">Eligible Trips</h2>
            <span class="badge badge-brand">{{ selectedTripIds().size }} trips selected</span>
          </div>
          
          <div class="flex items-center gap-4">
             <div *ngIf="selectedTripIds().size > 0 && hasMultiClientConflict()" class="text-xs font-bold text-red-600 bg-red-50 px-3 py-1 rounded-md border border-red-200 animate-pulse">
              Trips from multiple clients cannot be combined.
            </div>
            <button 
              (click)="openDraftModal()" 
              class="btn-primary py-2 px-6 shadow-brand text-sm transition-opacity"
              [disabled]="selectedTripIds().size === 0 || hasMultiClientConflict()"
              [ngClass]="{'opacity-50 cursor-not-allowed': selectedTripIds().size === 0 || hasMultiClientConflict()}">
              Create Draft Billing
            </button>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="data-table">
            <thead>
              <tr>
                <th class="w-12 text-center">
                  <input type="checkbox" 
                    class="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    [checked]="isAllFilteredSelected()"
                    (change)="toggleSelectAll()"
                    [disabled]="filteredTrips().length === 0" />
                </th>
                <th>TLO #</th>
                <th>Date</th>
                <th>Client</th>
                <th>Fleet & Driver</th>
                <th>Route</th>
                <th class="text-right">Weight (Tons)</th>
                <th class="text-right">Gross Freight (₱)</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let trip of paginatedTrips()" [class.bg-brand-50]="selectedTripIds().has(trip.id)" class="hover:bg-slate-50 transition-colors">
                <td class="text-center">
                  <input type="checkbox" 
                    class="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    [checked]="selectedTripIds().has(trip.id)"
                    (change)="toggleSelection(trip.id)" />
                </td>
                <td class="font-bold text-slate-900 font-mono text-sm">#{{ trip.tloNumber }}</td>
                <td class="text-xs text-slate-500">{{ trip.dispatchedAt | date:'mediumDate' }}</td>
                <td>
                  <span class="badge badge-neutral">{{ trip.client || 'Cargill' }}</span>
                </td>
                <td>
                  <div class="font-bold text-slate-800 text-sm">{{ trip.plateNumber }}</div>
                  <div class="text-[10px] text-slate-500 uppercase">{{ trip.driverName }}</div>
                </td>
                <td class="text-xs text-slate-600">{{ trip.origin }} ➔ {{ trip.destination }}</td>
                <td class="text-right font-bold tabular-nums text-slate-700">{{ trip.tonnage | number:'1.2-2' }}</td>
                <td class="text-right font-black tabular-nums text-emerald-700">₱{{ trip.totalFreightCharge | number:'1.2-2' }}</td>
              </tr>
              <tr *ngIf="paginatedTrips().length === 0">
                <td colspan="8" class="text-center py-12 text-slate-400 font-medium">
                  <div *ngIf="tmsService.eligibleBillingTrips().length === 0">No eligible trips ready for billing.</div>
                  <div *ngIf="tmsService.eligibleBillingTrips().length > 0">No trips match your current filters.</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50" *ngIf="filteredTrips().length > 0">
          <span class="text-xs text-slate-500 font-medium">Showing {{ (currentPage() - 1) * pageSize() + 1 }} - {{ Math.min(currentPage() * pageSize(), filteredTrips().length) }} of {{ filteredTrips().length }}</span>
          <div class="flex gap-2">
            <button class="btn-secondary px-3 py-1 text-xs" [disabled]="currentPage() === 1" (click)="currentPage.set(currentPage() - 1)">Previous</button>
            <button class="btn-secondary px-3 py-1 text-xs" [disabled]="currentPage() >= totalPages()" (click)="currentPage.set(currentPage() + 1)">Next</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Draft Modal -->
    <div *ngIf="isModalOpen()" appModalTeleport class="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" (click)="closeDraftModal()"></div>
      <div class="flex min-h-full items-center justify-center p-4 text-center sm:p-6">
        <div (click)="$event.stopPropagation()" class="relative transform bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden my-auto text-left animate-scale-in">
          <div class="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
            <h2 class="text-lg font-bold text-slate-900">Create Draft Billing</h2>
            <button (click)="closeDraftModal()" class="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
          </div>
          
          <div class="p-6 space-y-4">
            <div class="bg-blue-50 text-blue-800 p-4 rounded-xl border border-blue-100 text-sm">
              You are creating a new Draft Billing Batch containing <span class="font-bold">{{ selectedTripIds().size }}</span> selected trips.
            </div>

            <div>
              <label class="form-label">Client</label>
              <input type="text" [ngModel]="draftClient()" (ngModelChange)="draftClient.set($event)" class="form-input w-full" placeholder="e.g. Cargill" />
            </div>

            <div>
              <label class="form-label">Suggested Billing Period</label>
              <input type="text" [ngModel]="draftPeriod()" (ngModelChange)="draftPeriod.set($event)" class="form-input w-full" placeholder="e.g. Aug 1 - Aug 15, 2026" />
            </div>

            <div class="grid grid-cols-2 gap-4 pt-2">
              <div class="card p-4 bg-slate-50 border border-slate-100">
                <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Weight</div>
                <div class="text-lg font-black text-slate-800 tabular-nums">{{ draftTotalWeight() | number:'1.2-2' }} T</div>
              </div>
              <div class="card p-4 bg-emerald-50 border border-emerald-100">
                <div class="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">Gross Freight</div>
                <div class="text-lg font-black text-emerald-700 tabular-nums">₱{{ draftTotalFreight() | number:'1.2-2' }}</div>
              </div>
            </div>
          </div>

          <div class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
            <button (click)="closeDraftModal()" class="btn-secondary px-5 py-2 text-sm cursor-pointer">Cancel</button>
            <button (click)="confirmDraftBilling()" class="btn-primary px-6 py-2 text-sm shadow-brand cursor-pointer" [disabled]="!draftClient() || !draftPeriod()">Create Draft</button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class BillingQueueComponent {
  tmsService = inject(TmsService);
  router = inject(Router);
  Math = Math;

  // Search & Filter State
  searchTlo = signal('');
  searchPlate = signal('');
  searchRoute = signal('');
  filterClient = signal('');

  // Pagination State
  currentPage = signal(1);
  pageSize = signal(15);

  // Selection State
  selectedTripIds = signal<Set<string>>(new Set());

  // Modal State
  isModalOpen = signal(false);
  draftClient = signal('');
  draftPeriod = signal('');

  // Available Clients Dropdown
  availableClients = computed(() => {
    const clients = new Set<string>();
    this.tmsService.eligibleBillingTrips().forEach(t => {
      if (t.client) clients.add(t.client);
    });
    return Array.from(clients).sort();
  });

  // Filter Logic
  filteredTrips = computed(() => {
    let trips = this.tmsService.eligibleBillingTrips();
    
    const tlo = this.searchTlo().toLowerCase();
    const plate = this.searchPlate().toLowerCase();
    const route = this.searchRoute().toLowerCase();
    const client = this.filterClient();
    
    if (tlo) {
      trips = trips.filter(t => String(t.tloNumber).toLowerCase().includes(tlo));
    }
    if (plate) {
      trips = trips.filter(t => t.plateNumber.toLowerCase().includes(plate));
    }
    if (route) {
      trips = trips.filter(t => 
        t.origin.toLowerCase().includes(route) || 
        t.destination.toLowerCase().includes(route)
      );
    }
    if (client) {
      trips = trips.filter(t => (t.client || 'Cargill') === client);
    }

    return trips;
  });

  paginatedTrips = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredTrips().slice(start, start + this.pageSize());
  });

  totalPages = computed(() => Math.ceil(this.filteredTrips().length / this.pageSize()));

  // Selection Logic
  toggleSelection(tripId: string) {
    const current = new Set(this.selectedTripIds());
    if (current.has(tripId)) {
      current.delete(tripId);
    } else {
      current.add(tripId);
    }
    this.selectedTripIds.set(current);
  }

  isAllFilteredSelected(): boolean {
    const currentFiltered = this.filteredTrips();
    if (currentFiltered.length === 0) return false;
    return currentFiltered.every(t => this.selectedTripIds().has(t.id));
  }

  toggleSelectAll() {
    const currentFiltered = this.filteredTrips();
    const currentSelected = new Set(this.selectedTripIds());
    
    if (this.isAllFilteredSelected()) {
      // Deselect all filtered
      currentFiltered.forEach(t => currentSelected.delete(t.id));
    } else {
      // Select all filtered
      currentFiltered.forEach(t => currentSelected.add(t.id));
    }
    this.selectedTripIds.set(currentSelected);
  }

  clearFilters() {
    this.searchTlo.set('');
    this.searchPlate.set('');
    this.searchRoute.set('');
    this.filterClient.set('');
    this.currentPage.set(1);
  }

  // Multi-Client Validation
  hasMultiClientConflict = computed(() => {
    const selected = Array.from(this.selectedTripIds());
    if (selected.length <= 1) return false;
    
    const trips = this.tmsService.eligibleBillingTrips().filter(t => selected.includes(t.id));
    const clients = new Set(trips.map(t => t.client || 'Cargill'));
    
    return clients.size > 1;
  });

  // Modal & Creation Logic
  selectedTripObjects = computed(() => {
    const selected = Array.from(this.selectedTripIds());
    return this.tmsService.eligibleBillingTrips().filter(t => selected.includes(t.id));
  });

  draftTotalWeight = computed(() => {
    return this.selectedTripObjects().reduce((sum, t) => sum + t.tonnage, 0);
  });

  draftTotalFreight = computed(() => {
    return this.selectedTripObjects().reduce((sum, t) => sum + t.totalFreightCharge, 0);
  });

  openDraftModal() {
    if (this.selectedTripIds().size === 0 || this.hasMultiClientConflict()) return;
    
    const trips = this.selectedTripObjects();
    
    // Auto-fill Client
    this.draftClient.set(trips.length > 0 ? (trips[0].client || 'Cargill') : '');
    
    // Auto-suggest Period based on earliest and latest dates
    if (trips.length > 0) {
      const dates = trips.map(t => new Date(t.dispatchedAt).getTime());
      const minDate = new Date(Math.min(...dates));
      const maxDate = new Date(Math.max(...dates));
      
      const format = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      this.draftPeriod.set(minDate.getTime() === maxDate.getTime() 
        ? format(minDate) 
        : `${format(minDate)} - ${format(maxDate)}`);
    } else {
      this.draftPeriod.set('');
    }

    this.isModalOpen.set(true);
  }

  closeDraftModal() {
    this.isModalOpen.set(false);
  }

  confirmDraftBilling() {
    if (!this.draftClient() || !this.draftPeriod()) return;
    
    const tripIds = Array.from(this.selectedTripIds());
    
    // Create Draft Billing Batch via Service
    const batch = this.tmsService.createDraftBillingBatch(
      tripIds,
      this.draftClient(),
      this.draftPeriod(),
      this.draftTotalWeight(),
      this.draftTotalFreight()
    );

    this.selectedTripIds.set(new Set()); // Clear selection
    this.closeDraftModal();
    
    // Navigate to Draft Billing workspace (which is a placeholder for now)
    this.router.navigate(['/draft-billing']);
  }
}
