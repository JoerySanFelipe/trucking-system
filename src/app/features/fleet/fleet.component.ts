import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FleetStore } from '../../core/application/stores/fleet.store';
import { FleetAsset, CrewMember, CrewRole, CrewType, CrewStatus, FleetTruckStatus } from '../../core/models/tms.models';
import { ReportExportService } from '../../core/services/report-export.service';
import { 
  StatusBadgeComponent, 
  ModalComponent, 
  SkeletonComponent, 
  FilterCardComponent, 
  ToolbarComponent, 
  ActionModalComponent 
} from '../../shared/ui-kit';

@Component({
  selector: 'app-fleet',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    StatusBadgeComponent,
    ModalComponent,
    SkeletonComponent,
    FilterCardComponent,
    ToolbarComponent,
    ActionModalComponent
  ],
  template: `
    <div class="w-full space-y-6 animate-fade-in-up pb-12">

      <!-- Page Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-semibold text-[#262B35] tracking-tight">Fleet & Crew Registry</h1>
        </div>
      </div>

      <!-- ── TAB 1 KPI METRIC CARDS: TRUCKS ──────────────────────────────── -->
      <div *ngIf="activeTab() === 'TRUCKS'" class="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-fade-in">
        <app-filter-card
          label="Total Trucks"
          [value]="fleetStore.fleet().length"
          icon="local_shipping"
          theme="blue"
          [isActive]="truckFilterStatus() === 'ALL'"
          (selected)="truckFilterStatus.set('ALL')">
        </app-filter-card>

        <app-filter-card
          label="Available"
          [value]="fleetStore.availableTrucks().length"
          [total]="fleetStore.fleet().length"
          icon="check_circle"
          theme="emerald"
          [isActive]="truckFilterStatus() === 'Available'"
          (selected)="truckFilterStatus.set('Available')">
        </app-filter-card>

        <app-filter-card
          label="In Transit"
          [value]="fleetStore.inTransitTrucks().length"
          [total]="fleetStore.fleet().length"
          icon="alt_route"
          theme="blue"
          [isActive]="truckFilterStatus() === 'In Transit'"
          (selected)="truckFilterStatus.set('In Transit')">
        </app-filter-card>

        <app-filter-card
          label="Maintenance"
          [value]="fleetStore.maintenanceTrucks().length"
          [total]="fleetStore.fleet().length"
          icon="build"
          theme="amber"
          [isActive]="truckFilterStatus() === 'Maintenance'"
          (selected)="truckFilterStatus.set('Maintenance')">
        </app-filter-card>
      </div>

      <!-- ── TAB 2 KPI METRIC CARDS: CREW ────────────────────────────────── -->
      <div *ngIf="activeTab() === 'CREW'" class="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-fade-in">
        <app-filter-card
          label="Total Crew"
          [value]="fleetStore.crew().length"
          icon="groups"
          theme="orange"
          [isActive]="crewFilterRole() === 'ALL' && crewFilterStatus() === 'ALL'"
          (selected)="crewFilterRole.set('ALL'); crewFilterStatus.set('ALL')">
        </app-filter-card>

        <app-filter-card
          label="Drivers"
          [value]="fleetStore.activeDrivers().length"
          [total]="fleetStore.drivers().length"
          icon="search_hands_free"
          theme="blue"
          [isActive]="crewFilterRole() === 'Driver'"
          (selected)="crewFilterRole.set('Driver')">
        </app-filter-card>

        <app-filter-card
          label="Helpers"
          [value]="fleetStore.activeHelpers().length"
          [total]="fleetStore.helpers().length"
          icon="partner_exchange"
          theme="emerald"
          [isActive]="crewFilterRole() === 'Helper'"
          (selected)="crewFilterRole.set('Helper')">
        </app-filter-card>

        <app-filter-card
          label="In Transit"
          [value]="fleetStore.inTransitCrew().length"
          [total]="fleetStore.crew().length"
          icon="near_me"
          theme="violet"
          [isActive]="crewFilterStatus() === 'In Transit'"
          (selected)="crewFilterStatus.set(crewFilterStatus() === 'In Transit' ? 'ALL' : 'In Transit')">
        </app-filter-card>
      </div>

      <!-- ── TAB 1: TRUCKS GRID & TOOLBAR ─────────────────────────────────── -->
      <div *ngIf="activeTab() === 'TRUCKS'" class="space-y-4 animate-fade-in">
        
        <!-- Truck Status Filter Bar + Center Search + Right: [ Trucks | Crew ] + [ Add Truck ] Action -->
        <app-toolbar 
          [(searchQuery)]="searchQuery" 
          searchPlaceholder="Search Record">
          
          <div filters class="flex flex-wrap items-center gap-2">
            <button (click)="truckFilterStatus.set('ALL')"
                    [ngClass]="truckFilterStatus() === 'ALL' ? 'bg-[#262B35] text-white shadow-xs' : 'bg-white text-[#262B35] border border-slate-200 hover:bg-slate-100'"
                    class="h-10 px-4 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center justify-center">
              All
            </button>
            <button (click)="truckFilterStatus.set('Available')"
                    [ngClass]="truckFilterStatus() === 'Available' ? 'bg-[#29CC6A] text-white shadow-xs' : 'bg-white text-[#262B35] border border-slate-200 hover:bg-slate-100'"
                    class="h-10 px-4 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center justify-center">
              Available
            </button>
            <button (click)="truckFilterStatus.set('In Transit')"
                    [ngClass]="truckFilterStatus() === 'In Transit' ? 'bg-[#3361FF] text-white shadow-xs' : 'bg-white text-[#262B35] border border-slate-200 hover:bg-slate-100'"
                    class="h-10 px-4 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center justify-center">
              In Transit
            </button>
            <button (click)="truckFilterStatus.set('Maintenance')"
                    [ngClass]="truckFilterStatus() === 'Maintenance' ? 'bg-[#D97706] text-white shadow-xs' : 'bg-white text-[#262B35] border border-slate-200 hover:bg-slate-100'"
                    class="h-10 px-4 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center justify-center">
              Maintenance
            </button>
          </div>

          <div tabs class="p-1 flex items-center gap-1 bg-slate-200/70 rounded-xl border border-slate-200">
            <button (click)="activeTab.set('TRUCKS')"
                    [ngClass]="activeTab() === 'TRUCKS' ? 'bg-[#3361FF] text-white font-medium shadow-xs' : 'text-slate-700 hover:text-slate-900 font-medium'"
                    class="h-8 px-3.5 rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer font-medium">
              <span class="material-symbols-outlined text-[16px]">local_shipping</span>
              <span>Trucks</span>
            </button>

            <button (click)="activeTab.set('CREW')"
                    [ngClass]="activeTab() === 'CREW' ? 'bg-[#3361FF] text-white font-medium shadow-xs' : 'text-slate-700 hover:text-slate-900 font-medium'"
                    class="h-8 px-3.5 rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer font-medium">
              <span class="material-symbols-outlined text-[16px]">groups</span>
              <span>Crew</span>
            </button>
          </div>

          <div actions class="flex items-center gap-2">
            <!-- Export Dropdown -->
            <div class="relative">
              <button (click)="isExportMenuOpen.set(!isExportMenuOpen())"
                      type="button"
                      class="btn-secondary h-10 px-3.5 text-xs font-medium rounded-xl inline-flex items-center gap-1.5 shadow-2xs hover:bg-slate-100 transition-all cursor-pointer">
                <span class="material-symbols-outlined text-[18px] text-slate-600">download</span>
                <span class="hidden sm:inline">Export</span>
                <span class="material-symbols-outlined text-[16px] text-slate-400">arrow_drop_down</span>
              </button>

              <!-- Dropdown Menu -->
              <div *ngIf="isExportMenuOpen()" 
                   (click)="isExportMenuOpen.set(false)"
                   class="absolute right-0 mt-1.5 w-36 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1 animate-scale-in">
                <button (click)="exportPdf()" 
                        type="button" 
                        class="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-2.5 transition-colors cursor-pointer">
                  <span class="material-symbols-outlined text-[18px] text-slate-500">picture_as_pdf</span>
                  <span>PDF</span>
                </button>
                <button (click)="exportExcel()" 
                        type="button" 
                        class="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-2.5 transition-colors cursor-pointer border-t border-slate-100">
                  <span class="material-symbols-outlined text-[18px] text-slate-500">table_view</span>
                  <span>Xlsx</span>
                </button>
              </div>
            </div>

            <button (click)="openAddTruckModal()" class="btn-primary h-10 px-5 text-xs font-medium rounded-xl inline-flex items-center gap-2 shadow-xs cursor-pointer">
              <span class="material-symbols-outlined text-[18px]">add</span>
              <span>Add Truck</span>
            </button>
          </div>

        </app-toolbar>

        <!-- SKELETON LOADING STATE FOR TRUCKS -->
        <div *ngIf="fleetStore.isLoading()" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          <app-skeleton variant="card"></app-skeleton>
          <app-skeleton variant="card"></app-skeleton>
          <app-skeleton variant="card"></app-skeleton>
        </div>

        <!-- REAL TRUCKS GRID -->
        <div *ngIf="!fleetStore.isLoading() && filteredTrucks().length > 0" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          <div *ngFor="let truck of filteredTrucks()" class="card p-6 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
            
            <!-- Crew Assignments Clean List: Icon, Position, Name with Incomplete Warning -->
            <div>
              <!-- Card Header -->
              <div class="flex items-start justify-between mb-4">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-2xl flex items-center justify-center bg-[#F1F4FF] text-[#3361FF] shrink-0 border border-[#C2D1FF]">
                    <span class="material-symbols-outlined text-[24px]">local_shipping</span>
                  </div>
                  <div>
                    <h3 class="text-lg font-bold text-[#262B35] font-mono tracking-tight">{{ truck.plateNumber }}</h3>
                    <p class="text-xs text-slate-500 font-medium">
                      <span *ngIf="truck.truckType">{{ truck.truckType }} | </span><span class="font-mono">{{ truck.tonsCapacity || 0 }} Tons Capacity</span>
                    </p>
                  </div>
                </div>

                <app-status-badge [status]="truck.status"></app-status-badge>
              </div>

              <!-- Crew Assignments Box (Red border if missing Driver or Helper) -->
              <div class="rounded-xl p-3 mb-4 space-y-2 text-xs transition-all"
                   [ngClass]="isTruckCrewIncomplete(truck) 
                     ? 'bg-[#FFF0F0]/50 border-2 border-[#FC5555]/60 shadow-2xs' 
                     : 'bg-slate-50/80 border border-slate-100'">
                
                <!-- Driver Row -->
                <div class="flex items-center gap-2">
                  <span class="w-6 h-6 rounded-lg bg-[#F1F4FF] border border-[#C2D1FF] flex items-center justify-center text-[#3361FF] shrink-0" title="Driver">
                    <span class="material-symbols-outlined text-[15px]">search_hands_free</span>
                  </span>
                  <span class="text-slate-400 font-medium text-[11px] shrink-0">Driver</span>
                  <span class="font-medium text-xs truncate"
                        [ngClass]="getTruckDriverName(truck) === 'None' ? 'text-[#FC5555] font-semibold' : 'text-[#262B35]'">
                    {{ getTruckDriverName(truck) }}
                  </span>
                </div>

                <!-- Helper Row -->
                <div class="flex items-center gap-2">
                  <span class="w-6 h-6 rounded-lg bg-[#EAFBF1] border border-[#A3F2C3] flex items-center justify-center text-[#169E4E] shrink-0" title="Helper">
                    <span class="material-symbols-outlined text-[15px]">partner_exchange</span>
                  </span>
                  <span class="text-slate-400 font-medium text-[11px] shrink-0">Helper</span>
                  <span class="font-medium text-xs truncate"
                        [ngClass]="getTruckHelperName(truck) === 'None' ? 'text-slate-400 font-normal' : 'text-slate-700'">
                    {{ getTruckHelperName(truck) === 'None' ? 'Unassigned' : getTruckHelperName(truck) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Card Actions Footer (Timestamps on start/left, Edit & Delete on right) -->
            <div class="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <!-- Left: Created & Modified Timestamps (Muted color to avoid distraction) -->
              <div class="flex flex-col text-[10px] text-slate-400 leading-tight space-y-0.5 font-normal">
                <div class="flex items-center gap-1">
                  <span>Created:</span>
                  <span class="font-mono">{{ formatTimestamp(truck.createdAt) }}</span>
                </div>
                <div class="flex items-center gap-1">
                  <span>Modified:</span>
                  <span class="font-mono">{{ formatTimestamp(truck.updatedAt) }}</span>
                </div>
              </div>

              <!-- Right: Action Buttons -->
              <div class="flex items-center gap-1.5 shrink-0">
                <button (click)="openEditTruckModal(truck)" title="Edit Truck Record" class="p-1.5 text-slate-400 hover:text-[#3361FF] hover:bg-[#F1F4FF] rounded-lg transition-colors cursor-pointer flex items-center justify-center">
                  <span class="material-symbols-outlined text-[18px]">edit</span>
                </button>
                <button (click)="confirmDeleteTruck(truck)" title="Delete Truck" class="p-1.5 text-slate-400 hover:text-[#FC5555] hover:bg-[#FFF0F0] rounded-lg transition-colors cursor-pointer flex items-center justify-center">
                  <span class="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            </div>

          </div>
        </div>

        <!-- EMPTY STATE (Only shown after loading finishes) -->
        <div *ngIf="!fleetStore.isLoading() && filteredTrucks().length === 0" class="card p-12 text-center text-slate-400">
          <span class="material-symbols-outlined text-4xl text-slate-300 mb-2">local_shipping</span>
          <p class="font-medium text-slate-600">No trucks found</p>
          <p class="text-xs text-slate-400 mt-1">No heavy trucks match the active search or filter.</p>
        </div>

      </div>

      <!-- ── TAB 2: CREW DIRECTORY (DRIVERS & HELPERS) ─────────────────────── -->
      <div *ngIf="activeTab() === 'CREW'" class="space-y-4 animate-fade-in">
        
        <!-- Filter Bar + Center Search + Right: [ Trucks | Crew ] + [ Add Crew ] Action -->
        <app-toolbar 
          [(searchQuery)]="searchQuery" 
          searchPlaceholder="Search Record">

          <div filters class="flex flex-wrap items-center gap-2">
            <button (click)="crewFilterRole.set('ALL')"
                    [ngClass]="crewFilterRole() === 'ALL' ? 'bg-[#262B35] text-white shadow-xs' : 'bg-white text-[#262B35] border border-slate-200 hover:bg-slate-100'"
                    class="h-10 px-4 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center justify-center">
              All
            </button>
            <button (click)="crewFilterRole.set('Driver')"
                    [ngClass]="crewFilterRole() === 'Driver' ? 'bg-[#3361FF] text-white shadow-xs' : 'bg-white text-[#262B35] border border-slate-200 hover:bg-slate-100'"
                    class="h-10 px-4 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center justify-center">
              Driver
            </button>
            <button (click)="crewFilterRole.set('Helper')"
                    [ngClass]="crewFilterRole() === 'Helper' ? 'bg-[#29CC6A] text-white shadow-xs' : 'bg-white text-[#262B35] border border-slate-200 hover:bg-slate-100'"
                    class="h-10 px-4 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center justify-center">
              Helper
            </button>

            <!-- Status Dropdown Selection -->
            <div class="flex items-center gap-2 ml-1">
              <span class="text-xs font-medium text-slate-500">Status:</span>
              <select [ngModel]="crewFilterStatus()" (ngModelChange)="crewFilterStatus.set($event)" class="h-10 px-3.5 rounded-xl text-xs font-medium border border-slate-200 bg-white text-[#262B35] outline-none focus:ring-2 focus:ring-brand-blue/20 cursor-pointer">
                <option value="ALL">All</option>
                <option value="Active">Active</option>
                <option value="In Transit">In Transit</option>
                <option value="On Leave">On Leave</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div tabs class="p-1 flex items-center gap-1 bg-slate-200/70 rounded-xl border border-slate-200">
            <button (click)="activeTab.set('TRUCKS')"
                    [ngClass]="activeTab() === 'TRUCKS' ? 'bg-[#3361FF] text-white font-medium shadow-xs' : 'text-slate-700 hover:text-slate-900 font-medium'"
                    class="h-8 px-3.5 rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer font-medium">
              <span class="material-symbols-outlined text-[16px]">local_shipping</span>
              <span>Trucks</span>
            </button>

            <button (click)="activeTab.set('CREW')"
                    [ngClass]="activeTab() === 'CREW' ? 'bg-[#3361FF] text-white font-medium shadow-xs' : 'text-slate-700 hover:text-slate-900 font-medium'"
                    class="h-8 px-3.5 rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer font-medium">
              <span class="material-symbols-outlined text-[16px]">groups</span>
              <span>Crew</span>
            </button>
          </div>

          <div actions class="flex items-center gap-2">
            <!-- Export Dropdown -->
            <div class="relative">
              <button (click)="isExportMenuOpen.set(!isExportMenuOpen())"
                      type="button"
                      class="btn-secondary h-10 px-3.5 text-xs font-medium rounded-xl inline-flex items-center gap-1.5 shadow-2xs hover:bg-slate-100 transition-all cursor-pointer">
                <span class="material-symbols-outlined text-[18px] text-slate-600">download</span>
                <span class="hidden sm:inline">Export</span>
                <span class="material-symbols-outlined text-[16px] text-slate-400">arrow_drop_down</span>
              </button>

              <!-- Dropdown Menu -->
              <div *ngIf="isExportMenuOpen()" 
                   (click)="isExportMenuOpen.set(false)"
                   class="absolute right-0 mt-1.5 w-36 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1 animate-scale-in">
                <button (click)="exportPdf()" 
                        type="button" 
                        class="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-2.5 transition-colors cursor-pointer">
                  <span class="material-symbols-outlined text-[18px] text-slate-500">picture_as_pdf</span>
                  <span>PDF</span>
                </button>
                <button (click)="exportExcel()" 
                        type="button" 
                        class="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-2.5 transition-colors cursor-pointer border-t border-slate-100">
                  <span class="material-symbols-outlined text-[18px] text-slate-500">table_view</span>
                  <span>Xlsx</span>
                </button>
              </div>
            </div>

            <button (click)="openAddCrewModal()" class="btn-primary h-10 px-5 text-xs font-medium rounded-xl inline-flex items-center gap-2 shadow-xs cursor-pointer">
              <span class="material-symbols-outlined text-[18px]">person_add</span>
              <span>Add Crew</span>
            </button>
          </div>

        </app-toolbar>

        <!-- Crew Table -->
        <div class="card overflow-hidden">
          <div class="overflow-x-auto">
            <table class="data-table">
              <thead>
                <tr>
                  <th (click)="toggleCrewSort('name')" class="cursor-pointer select-none hover:text-[#3361FF] transition-colors">
                    <div class="inline-flex items-center gap-1.5">
                      <span>Name</span>
                      <span *ngIf="crewSortColumn() === 'name'" class="material-symbols-outlined text-[16px] text-[#3361FF]">
                        {{ crewSortDirection() === 'asc' ? 'arrow_upward' : 'arrow_downward' }}
                      </span>
                    </div>
                  </th>
                  <th (click)="toggleCrewSort('role')" class="cursor-pointer select-none hover:text-[#3361FF] transition-colors">
                    <div class="inline-flex items-center gap-1.5">
                      <span>Role</span>
                      <span *ngIf="crewSortColumn() === 'role'" class="material-symbols-outlined text-[16px] text-[#3361FF]">
                        {{ crewSortDirection() === 'asc' ? 'arrow_upward' : 'arrow_downward' }}
                      </span>
                    </div>
                  </th>
                  <th (click)="toggleCrewSort('type')" class="cursor-pointer select-none hover:text-[#3361FF] transition-colors">
                    <div class="inline-flex items-center gap-1.5">
                      <span>Type</span>
                      <span *ngIf="crewSortColumn() === 'type'" class="material-symbols-outlined text-[16px] text-[#3361FF]">
                        {{ crewSortDirection() === 'asc' ? 'arrow_upward' : 'arrow_downward' }}
                      </span>
                    </div>
                  </th>
                  <th (click)="toggleCrewSort('phone')" class="cursor-pointer select-none hover:text-[#3361FF] transition-colors">
                    <div class="inline-flex items-center gap-1.5">
                      <span>Contact Number</span>
                      <span *ngIf="crewSortColumn() === 'phone'" class="material-symbols-outlined text-[16px] text-[#3361FF]">
                        {{ crewSortDirection() === 'asc' ? 'arrow_upward' : 'arrow_downward' }}
                      </span>
                    </div>
                  </th>
                  <th (click)="toggleCrewSort('status')" class="cursor-pointer select-none hover:text-[#3361FF] transition-colors">
                    <div class="inline-flex items-center gap-1.5">
                      <span>Status</span>
                      <span *ngIf="crewSortColumn() === 'status'" class="material-symbols-outlined text-[16px] text-[#3361FF]">
                        {{ crewSortDirection() === 'asc' ? 'arrow_upward' : 'arrow_downward' }}
                      </span>
                    </div>
                  </th>
                  <th class="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                <!-- SKELETON LOADING ROWS -->
                <ng-container *ngIf="fleetStore.isLoading()">
                  <app-skeleton variant="table-row" [columns]="6"></app-skeleton>
                  <app-skeleton variant="table-row" [columns]="6"></app-skeleton>
                  <app-skeleton variant="table-row" [columns]="6"></app-skeleton>
                  <app-skeleton variant="table-row" [columns]="6"></app-skeleton>
                  <app-skeleton variant="table-row" [columns]="6"></app-skeleton>
                </ng-container>

                <!-- REAL DATA ROWS -->
                <ng-container *ngIf="!fleetStore.isLoading()">
                  <tr *ngFor="let member of filteredCrew()" class="hover:bg-slate-50 transition-colors">
                    <td class="text-[#262B35] text-sm">
                      <div class="flex items-center gap-3">
                        <!-- Driver Role Icon: Google Material Symbol (search_hands_free) in Blue Theme -->
                        <div *ngIf="member.role === 'Driver'" class="w-9 h-9 rounded-xl bg-[#F1F4FF] border border-[#C2D1FF] flex items-center justify-center text-[#3361FF] shadow-2xs shrink-0" title="Driver">
                          <span class="material-symbols-outlined text-[20px]">search_hands_free</span>
                        </div>

                        <!-- Helper Role Icon: Google Material Symbol (partner_exchange) in Green Theme -->
                        <div *ngIf="member.role === 'Helper'" class="w-9 h-9 rounded-xl bg-[#EAFBF1] border border-[#A3F2C3] flex items-center justify-center text-[#169E4E] shadow-2xs shrink-0" title="Helper">
                          <span class="material-symbols-outlined text-[20px]">partner_exchange</span>
                        </div>

                        <div>
                          <span class="font-medium text-[#262B35]">{{ member.name }}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span class="px-2 py-0.5 rounded-md text-[11px] font-medium border"
                            [ngClass]="member.role === 'Driver' ? 'bg-[#F1F4FF] text-[#3361FF] border-[#C2D1FF]' : 'bg-[#EAFBF1] text-[#169E4E] border-[#A3F2C3]'">
                        {{ member.role }}
                      </span>
                    </td>
                    <td>
                      <span class="px-2 py-0.5 rounded-md text-[11px] font-medium"
                            [ngClass]="member.type === 'Regular' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'">
                        {{ member.type }}
                      </span>
                    </td>
                    <td class="font-mono text-xs text-slate-700">{{ member.phone }}</td>
                    <td>
                      <app-status-badge [status]="member.status"></app-status-badge>
                    </td>
                    <td class="text-right">
                      <div class="inline-flex items-center gap-1.5">
                        <button (click)="openEditCrewModal(member)" title="Edit Crew Record" class="p-1.5 text-slate-400 hover:text-[#3361FF] hover:bg-[#F1F4FF] rounded-lg transition-colors cursor-pointer flex items-center justify-center">
                          <span class="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button (click)="confirmDeleteCrew(member)" title="Delete Crew Member" class="p-1.5 text-slate-400 hover:text-[#FC5555] hover:bg-[#FFF0F0] rounded-lg transition-colors cursor-pointer flex items-center justify-center">
                          <span class="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr *ngIf="filteredCrew().length === 0">
                    <td colspan="6" class="text-center py-12 text-slate-400">
                      No crew members match the active search or filter.
                    </td>
                  </tr>
                </ng-container>
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>

    <!-- ── MODAL 1: ADD / EDIT TRUCK ────────────────────────────────────────── -->
    <app-modal
      [isOpen]="showTruckModal()"
      [title]="editingTruckId() ? 'Edit Truck Record' : 'Add New Truck'"
      [subtitle]="editingTruckSubtitle()"
      size="md"
      [showCloseButton]="false"
      (closed)="closeTruckModal()">
      
      <form class="space-y-4" (ngSubmit)="requestSaveTruck()">
        
        <!-- Validation Alert Banner -->
        <div *ngIf="truckFormError()" class="p-3 rounded-xl bg-[#FFF0F0] border border-[#FFC2C2] text-[#FC5555] text-xs font-medium flex items-center gap-2">
          <span class="material-symbols-outlined text-[18px]">error</span>
          <span>{{ truckFormError() }}</span>
        </div>

        <!-- 1st Row: Plate Number, Trip Number (Current count with Lock toggle) -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Plate Number <span class="text-[#FC5555]">*</span></label>
            <input type="text" [(ngModel)]="truckForm.plateNumber" name="plateNumber" required placeholder="e.g. CCK 5273" class="form-input w-full text-sm font-mono font-medium">
          </div>

          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">
              Trip Number <span class="text-slate-400 font-normal">(Current count)</span>
            </label>

            <div class="relative flex items-center">
              <input 
                type="number" 
                min="0" 
                step="1" 
                [(ngModel)]="truckForm.currentTripNumber" 
                name="currentTripNumber" 
                [disabled]="editingTruckId() ? isTripNumberLocked() : false"
                placeholder="0" 
                class="form-input w-full text-sm font-mono font-medium transition-all"
                [ngClass]="editingTruckId() && isTripNumberLocked() ? 'pr-10 bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed select-none opacity-80' : 'bg-white text-slate-900 border-slate-300 focus:border-blue-500'"
              />

              <!-- Single Clickable Lock/Unlock Button inside input box -->
              <button 
                *ngIf="editingTruckId()" 
                type="button" 
                (click)="toggleTripNumberLock()"
                [title]="isTripNumberLocked() ? 'Click to unlock and edit trip count' : 'Click to lock and protect trip count'"
                class="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all flex items-center justify-center cursor-pointer"
                [ngClass]="isTripNumberLocked() ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/70' : 'text-amber-600 bg-amber-50 hover:bg-amber-100 hover:text-amber-700 border border-amber-200/70'">
                <span class="material-symbols-outlined text-[17px]">
                  {{ isTripNumberLocked() ? 'lock' : 'lock_open' }}
                </span>
              </button>
            </div>
          </div>
        </div>

        <!-- 2nd Row: Capacity (Tons), Truck Type (Optional) -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Capacity (Tons) <span class="text-[#FC5555]">*</span></label>
            <input type="number" step="0.5" min="0" [(ngModel)]="truckForm.capacityTons" name="capacityTons" required placeholder="0" class="form-input w-full text-sm font-mono font-medium">
          </div>

          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Truck Type <span class="text-slate-400 font-normal">(Optional)</span></label>
            <input type="text" [(ngModel)]="truckForm.truckType" name="truckType" placeholder="e.g. 10-Wheeler Heavy Truck" class="form-input w-full text-sm font-medium">
          </div>
        </div>

        <!-- 3rd Row: Operational Status -->
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">Operational Status</label>
          <select [(ngModel)]="truckForm.status" name="status" class="form-input w-full text-sm font-medium">
            <option value="Available">Available</option>
            <option value="In Transit">In Transit</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Inactive">Inactive</option>
          </select>
          <p *ngIf="truckForm.status === 'Available' || truckForm.status === 'In Transit'" class="text-[11px] text-[#3361FF] font-medium mt-1">
            ℹ️ {{ truckForm.status }} trucks strictly require an assigned Driver.
          </p>
        </div>

        <!-- 4th Row: Assigned Driver, Assigned Helper -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">
              Assigned Driver <span *ngIf="truckForm.status === 'Available' || truckForm.status === 'In Transit'" class="text-[#FC5555]">*</span>
            </label>
            <select [(ngModel)]="truckForm.assignedDriver" name="assignedDriver" class="form-input w-full text-sm font-medium">
              <option value="">None</option>
              <option *ngFor="let d of availableDriversForTruck()" [value]="d.name">{{ d.name }} ({{ d.type }})</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">
              Assigned Helper
            </label>
            <select [(ngModel)]="truckForm.assignedHelper" name="assignedHelper" class="form-input w-full text-sm font-medium">
              <option value="">None</option>
              <option *ngFor="let h of availableHelpersForTruck()" [value]="h.name">{{ h.name }} ({{ h.type }})</option>
            </select>
          </div>
        </div>
      </form>

      <div footer class="flex items-center gap-3">
        <button (click)="closeTruckModal()" type="button" class="btn-secondary text-xs px-4 py-2 font-medium hover:bg-[#FFF0F0] hover:text-[#FC5555] hover:border-[#FFC2C2] transition-colors cursor-pointer">
          Cancel
        </button>
        <button (click)="requestSaveTruck()" type="button" class="btn-primary text-xs px-5 py-2 font-medium cursor-pointer">
          Save
        </button>
      </div>
    </app-modal>

    <!-- ── MODAL 2: ADD / EDIT CREW MEMBER ─────────────────────────────────── -->
    <app-modal
      [isOpen]="showCrewModal()"
      [title]="editingCrewId() ? 'Edit Crew Record' : 'Add New Crew'"
      [subtitle]="editingCrewSubtitle()"
      size="md"
      [showCloseButton]="false"
      (closed)="closeCrewModal()">
      
      <form class="space-y-4" (ngSubmit)="requestSaveCrew()">
        
        <!-- Validation Alert Banner -->
        <div *ngIf="crewFormError()" class="p-3 rounded-xl bg-[#FFF0F0] border border-[#FFC2C2] text-[#FC5555] text-xs font-medium flex items-center gap-2">
          <span class="material-symbols-outlined text-[18px]">error</span>
          <span>{{ crewFormError() }}</span>
        </div>

        <!-- 1st Row: Full Name -->
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">Full Name <span class="text-[#FC5555]">*</span></label>
          <input type="text" [(ngModel)]="crewForm.name" name="name" required placeholder="e.g. Juan dela Cruz" class="form-input w-full text-sm font-medium">
        </div>

        <!-- 2nd Row: Role, Type -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Role <span class="text-[#FC5555]">*</span></label>
            <select [(ngModel)]="crewForm.role" name="role" class="form-input w-full text-sm font-medium">
              <option value="Driver">Driver</option>
              <option value="Helper">Helper</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Type <span class="text-[#FC5555]">*</span></label>
            <select [(ngModel)]="crewForm.type" name="type" class="form-input w-full text-sm font-medium">
              <option value="Regular">Regular</option>
              <option value="On-call">On-call</option>
            </select>
          </div>
        </div>

        <!-- 3rd Row: Contact Number, Status -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Contact Number (11 digits) <span class="text-[#FC5555]">*</span></label>
            <input 
              type="text" 
              inputmode="numeric" 
              maxlength="11" 
              [value]="crewForm.phone" 
              (keydown)="onlyNumbersKeydown($event)"
              (input)="onPhoneInputElement($event)"
              (paste)="onPhonePaste($event)" 
              name="phone" 
              required 
              placeholder="09171234567" 
              class="form-input w-full text-sm font-mono font-medium">
          </div>

          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Status</label>
            <select [(ngModel)]="crewForm.status" name="status" class="form-input w-full text-sm font-medium">
              <option value="Active">Active</option>
              <option value="In Transit">In Transit</option>
              <option value="On Leave">On Leave</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        <!-- 4th Row: Email, Password (with Eye Icon) -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Email</label>
            <input type="email" [(ngModel)]="crewForm.email" name="email" placeholder="driver@porbido.ph" class="form-input w-full text-sm font-mono font-medium">
          </div>

          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Password</label>
            <div class="relative">
              <input 
                [type]="showPassword() ? 'text' : 'password'" 
                [(ngModel)]="crewForm.password" 
                name="password" 
                placeholder="••••••••" 
                class="form-input w-full text-sm pr-10 font-mono font-medium">
              <button 
                type="button" 
                (click)="showPassword.set(!showPassword())" 
                class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 transition-colors cursor-pointer flex items-center justify-center"
                [title]="showPassword() ? 'Hide Password' : 'Show Password'">
                <span class="material-symbols-outlined text-[18px]">{{ showPassword() ? 'visibility_off' : 'visibility' }}</span>
              </button>
            </div>
          </div>
        </div>

      </form>

      <div footer class="flex items-center gap-3">
        <button (click)="closeCrewModal()" type="button" class="btn-secondary text-xs px-4 py-2 font-medium hover:bg-[#FFF0F0] hover:text-[#FC5555] hover:border-[#FFC2C2] transition-colors cursor-pointer">
          Cancel
        </button>
        <button (click)="requestSaveCrew()" type="button" class="btn-primary text-xs px-5 py-2 font-medium cursor-pointer">
          Save
        </button>
      </div>
    </app-modal>

    <!-- ── MODAL 3: SAVE CONFIRMATION & ANIMATION MODAL ────────────────────── -->
    <app-action-modal
      [isOpen]="showSaveConfirmModal()"
      [step]="saveStep()"
      actionType="save"
      [itemType]="pendingSaveType()"
      (confirmed)="executeSave()"
      (cancelled)="cancelSaveConfirm()">
    </app-action-modal>

    <!-- ── MODAL 4: DELETE CONFIRMATION & ANIMATION MODAL ────────────────── -->
    <app-action-modal
      [isOpen]="showDeleteConfirmModal()"
      [step]="deleteStep()"
      actionType="delete"
      [itemType]="deleteItemType()"
      [itemLabel]="deleteItemLabel()"
      (confirmed)="executeDelete()"
      (cancelled)="closeDeleteModal()">
    </app-action-modal>
  `
})
export class FleetComponent {
  fleetStore = inject(FleetStore);
  reportExport = inject(ReportExportService);

  activeTab = signal<'TRUCKS' | 'CREW'>('TRUCKS');
  
  // Search query (Active within the currently selected Tab)
  searchQuery = signal<string>('');

  // Export menu dropdown state
  isExportMenuOpen = signal<boolean>(false);

  // Truck filters
  truckFilterStatus = signal<string>('ALL');

  // Crew filters & sorting
  crewFilterRole = signal<string>('ALL');
  crewFilterStatus = signal<string>('ALL');
  crewSortColumn = signal<'name' | 'role' | 'type' | 'phone' | 'status' | 'updatedAt'>('updatedAt');
  crewSortDirection = signal<'asc' | 'desc'>('desc');

  // Stored timestamps for edit modals
  truckTimestamps: { createdAt?: string; updatedAt?: string } = {};
  crewTimestamps: { createdAt?: string; updatedAt?: string } = {};

  // Export Handlers
  exportPdf() {
    this.isExportMenuOpen.set(false);
    if (this.activeTab() === 'TRUCKS') {
      this.reportExport.exportTrucksToPdf(this.filteredTrucks());
    } else {
      this.reportExport.exportCrewToPdf(this.filteredCrew());
    }
  }

  exportExcel() {
    this.isExportMenuOpen.set(false);
    if (this.activeTab() === 'TRUCKS') {
      this.reportExport.exportTrucksToExcel(this.filteredTrucks());
    } else {
      this.reportExport.exportCrewToExcel(this.filteredCrew());
    }
  }

  // Formatter for Created/Modified Timestamps
  formatTimestamp(iso?: string): string {
    if (!iso) return '—';
    try {
      const date = new Date(iso);
      if (isNaN(date.getTime())) return '—';
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return '—';
    }
  }

  editingTruckSubtitle(): string {
    if (!this.editingTruckId()) return '';
    const created = this.formatTimestamp(this.truckTimestamps.createdAt);
    const modified = this.formatTimestamp(this.truckTimestamps.updatedAt);
    return `Created: ${created} • Modified: ${modified}`;
  }

  editingCrewSubtitle(): string {
    if (!this.editingCrewId()) return '';
    const created = this.formatTimestamp(this.crewTimestamps.createdAt);
    const modified = this.formatTimestamp(this.crewTimestamps.updatedAt);
    return `Created: ${created} • Modified: ${modified}`;
  }

  toggleCrewSort(column: 'name' | 'role' | 'type' | 'phone' | 'status') {
    if (this.crewSortColumn() === column) {
      if (this.crewSortDirection() === 'asc') {
        this.crewSortDirection.set('desc');
      } else {
        // Reset back to default last modified
        this.crewSortColumn.set('updatedAt');
        this.crewSortDirection.set('desc');
      }
    } else {
      this.crewSortColumn.set(column);
      this.crewSortDirection.set('asc');
    }
  }

  filteredTrucks = computed(() => {
    let list = this.fleetStore.trucks();
    const status = this.truckFilterStatus();
    const q = this.searchQuery().trim().toLowerCase();

    // 1. Status Filter
    if (status !== 'ALL') {
      list = list.filter(t => t.status === status);
    }

    // 2. Universal Full-Field Deep Search
    if (q) {
      list = list.filter(t => {
        const plate = (t.plateNumber || '').toLowerCase();
        const st = (t.status || '').toLowerCase();
        const capacity = `${t.tonsCapacity || 30}`.toLowerCase();
        const driver = (t.assignedCrew?.driver?.name || '').toLowerCase();
        const helper = (t.assignedCrew?.helper?.name || '').toLowerCase();
        const created = this.formatTimestamp(t.createdAt).toLowerCase();
        const modified = this.formatTimestamp(t.updatedAt).toLowerCase();

        return plate.includes(q) ||
               st.includes(q) ||
               capacity.includes(q) ||
               driver.includes(q) ||
               helper.includes(q) ||
               created.includes(q) ||
               modified.includes(q);
      });
    }

    // 3. Auto-Sort: Always Last Modified First (Newest updatedAt on top)
    return list.slice().sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });
  });

  filteredCrew = computed(() => {
    let list = this.fleetStore.crew();
    const role = this.crewFilterRole();
    const status = this.crewFilterStatus();
    const q = this.searchQuery().trim().toLowerCase();

    // 1. Role Filter
    if (role !== 'ALL') {
      list = list.filter(c => c.role === role);
    }

    // 2. Status Filter
    if (status !== 'ALL') {
      list = list.filter(c => c.status === status);
    }

    // 3. Universal Full-Field Deep Search
    if (q) {
      list = list.filter(c => {
        const name = (c.name || '').toLowerCase();
        const r = (c.role || '').toLowerCase();
        const t = (c.type || '').toLowerCase();
        const phone = (c.contactNumber || c.phone || '').toLowerCase();
        const email = (c.email || '').toLowerCase();
        const st = (c.status || '').toLowerCase();
        const created = this.formatTimestamp(c.createdAt).toLowerCase();
        const modified = this.formatTimestamp(c.updatedAt).toLowerCase();

        return name.includes(q) ||
               r.includes(q) ||
               t.includes(q) ||
               phone.includes(q) ||
               email.includes(q) ||
               st.includes(q) ||
               created.includes(q) ||
               modified.includes(q);
      });
    }

    // 4. Sorting Logic
    const col = this.crewSortColumn();
    const dir = this.crewSortDirection();

    return list.slice().sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      if (col === 'updatedAt') {
        valA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        valB = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return dir === 'asc' ? valA - valB : valB - valA;
      }

      if (col === 'name') {
        valA = (a.name || '').toLowerCase();
        valB = (b.name || '').toLowerCase();
      } else if (col === 'role') {
        valA = (a.role || '').toLowerCase();
        valB = (b.role || '').toLowerCase();
      } else if (col === 'type') {
        valA = (a.type || '').toLowerCase();
        valB = (b.type || '').toLowerCase();
      } else if (col === 'phone') {
        valA = (a.contactNumber || a.phone || '').replace(/\D/g, '');
        valB = (b.contactNumber || b.phone || '').replace(/\D/g, '');
      } else if (col === 'status') {
        valA = (a.status || '').toLowerCase();
        valB = (b.status || '').toLowerCase();
      }

      if (valA < valB) return dir === 'asc' ? -1 : 1;
      if (valA > valB) return dir === 'asc' ? 1 : -1;
      return 0;
    });
  });

  // Available Drivers computed for Truck Form (Active & Not Assigned to other trucks)
  availableDriversForTruck = computed(() => {
    const currentEditingId = this.editingTruckId();
    const allTrucks = this.fleetStore.trucks();
    
    const assignedDriverNames = new Set<string>();
    for (const t of allTrucks) {
      if (t.id !== currentEditingId && t.assignedCrew?.driver?.name) {
        const name = t.assignedCrew.driver.name.trim().toLowerCase();
        if (name !== 'none' && name !== 'unassigned') {
          assignedDriverNames.add(name);
        }
      }
    }

    return this.fleetStore.drivers().filter(d => 
      d.status === 'Active' && !assignedDriverNames.has(d.name.trim().toLowerCase())
    );
  });

  // Available Helpers computed for Truck Form (Active & Not Assigned to other trucks)
  availableHelpersForTruck = computed(() => {
    const currentEditingId = this.editingTruckId();
    const allTrucks = this.fleetStore.trucks();

    const assignedHelperNames = new Set<string>();
    for (const t of allTrucks) {
      if (t.id !== currentEditingId && t.assignedCrew?.helper?.name) {
        const name = t.assignedCrew.helper.name.trim().toLowerCase();
        if (name !== 'none' && name !== 'unassigned') {
          assignedHelperNames.add(name);
        }
      }
    }

    return this.fleetStore.helpers().filter(h => 
      h.status === 'Active' && !assignedHelperNames.has(h.name.trim().toLowerCase())
    );
  });

  // Modals state
  showTruckModal = signal<boolean>(false);
  editingTruckId = signal<string | null>(null);
  truckFormError = signal<string>('');
  isTripNumberLocked = signal<boolean>(true);

  toggleTripNumberLock() {
    this.isTripNumberLocked.set(!this.isTripNumberLocked());
  }

  showCrewModal = signal<boolean>(false);
  editingCrewId = signal<string | null>(null);
  editingCrewOriginalName = signal<string>('');
  crewFormError = signal<string>('');
  showPassword = signal<boolean>(false);

  // Save Confirmation & Animation State
  showSaveConfirmModal = signal<boolean>(false);
  pendingSaveType = signal<'Truck' | 'Crew'>('Truck');
  saveStep = signal<'CONFIRM' | 'SAVING' | 'SUCCESS'>('CONFIRM');

  // Delete modal state
  showDeleteConfirmModal = signal<boolean>(false);
  deleteItemType = signal<'Truck' | 'Crew Member'>('Truck');
  deleteItemId = signal<string>('');
  deleteItemLabel = signal<string>('');
  deleteStep = signal<'CONFIRM' | 'DELETING' | 'SUCCESS'>('CONFIRM');

  truckForm: {
    plateNumber: string;
    truckType: string;
    currentTripNumber: number;
    capacityTons: number;
    status: FleetTruckStatus;
    assignedDriver: string;
    assignedHelper: string;
  } = {
    plateNumber: '',
    truckType: '',
    currentTripNumber: 0,
    capacityTons: 0,
    status: 'Available',
    assignedDriver: '',
    assignedHelper: ''
  };

  crewForm: {
    name: string;
    phone: string;
    role: CrewRole;
    type: CrewType;
    email: string;
    password: string;
    status: CrewStatus;
  } = {
    name: '',
    phone: '',
    role: 'Driver',
    type: 'Regular',
    email: '',
    password: '',
    status: 'Active'
  };

  // Safe Template Extractors
  getTruckDriverName(truck: FleetAsset): string {
    const name = truck.assignedCrew?.driver?.name?.trim();
    return (name && name !== 'None' && name !== 'Unassigned') ? name : 'None';
  }

  getTruckHelperName(truck: FleetAsset): string {
    const name = truck.assignedCrew?.helper?.name?.trim();
    return (name && name !== 'None' && name !== 'Unassigned') ? name : 'None';
  }

  // Check if truck has incomplete crew (missing required driver when Available or In Transit)
  isTruckCrewIncomplete(truck: FleetAsset): boolean {
    if (truck.status === 'Available' || truck.status === 'In Transit') {
      const hasDriver = this.getTruckDriverName(truck) !== 'None';
      return !hasDriver;
    }
    return false;
  }

  // ── TRUCK MODAL METHODS ───────────────────────────────────────────────────

  openAddTruckModal() {
    this.editingTruckId.set(null);
    this.truckFormError.set('');
    this.isTripNumberLocked.set(false);
    this.truckForm = {
      plateNumber: '',
      truckType: '',
      currentTripNumber: 0,
      capacityTons: 0,
      status: 'Available',
      assignedDriver: '',
      assignedHelper: ''
    };
    this.showTruckModal.set(true);
  }

  openEditTruckModal(truck: FleetAsset) {
    this.editingTruckId.set(truck.id);
    this.truckFormError.set('');
    this.isTripNumberLocked.set(true);
    this.truckTimestamps = {
      createdAt: truck.createdAt,
      updatedAt: truck.updatedAt
    };
    const dName = truck.assignedCrew?.driver?.name;
    const hName = truck.assignedCrew?.helper?.name;

    this.truckForm = {
      plateNumber: truck.plateNumber,
      truckType: truck.truckType || '',
      currentTripNumber: Number(truck.currentTripNumber ?? truck.tripNumber ?? 0),
      capacityTons: truck.tonsCapacity ?? 0,
      status: truck.status,
      assignedDriver: (dName && dName !== 'Unassigned' && dName !== 'None') ? dName : '',
      assignedHelper: (hName && hName !== 'None') ? hName : ''
    };
    this.showTruckModal.set(true);
  }

  closeTruckModal() {
    this.showTruckModal.set(false);
    this.editingTruckId.set(null);
    this.truckFormError.set('');
    this.isTripNumberLocked.set(true);
    this.truckTimestamps = {};
  }

  requestSaveTruck() {
    // 1. Strict Validation Guardrails
    const plate = (this.truckForm.plateNumber || '').trim().toUpperCase();
    if (!plate) {
      this.truckFormError.set('Plate Number is required.');
      return;
    }

    // 2. Duplicate Plate Number Detection
    const normalizedInputPlate = plate.replace(/\s+/g, '');
    const duplicateTruck = this.fleetStore.trucks().find(t => {
      if (this.editingTruckId() && t.id === this.editingTruckId()) {
        return false; // Skip the truck currently being edited
      }
      const existingPlate = (t.plateNumber || '').replace(/\s+/g, '').toUpperCase();
      return existingPlate === normalizedInputPlate;
    });

    if (duplicateTruck) {
      this.truckFormError.set(`A truck asset with Plate Number "${plate}" is already registered.`);
      return;
    }

    const tons = Number(this.truckForm.capacityTons);
    if (isNaN(tons) || tons <= 0) {
      this.truckFormError.set('Capacity must be a valid positive number in Tons (e.g. 32.5).');
      return;
    }

    // 3. Driver Requirement for Available and In Transit Statuses
    if (this.truckForm.status === 'Available' || this.truckForm.status === 'In Transit') {
      const driver = this.truckForm.assignedDriver?.trim();
      if (!driver || driver === 'None' || driver === 'Unassigned') {
        this.truckFormError.set(`Assigned Driver is strictly required when truck status is ${this.truckForm.status}.`);
        return;
      }
    }

    this.truckFormError.set('');
    this.saveStep.set('CONFIRM');
    this.pendingSaveType.set('Truck');
    this.showSaveConfirmModal.set(true);
  }

  confirmDeleteTruck(truck: FleetAsset) {
    this.deleteItemType.set('Truck');
    this.deleteItemId.set(truck.id);
    this.deleteItemLabel.set(truck.plateNumber);
    this.deleteStep.set('CONFIRM');
    this.showDeleteConfirmModal.set(true);
  }

  // ── CREW MODAL METHODS ────────────────────────────────────────────────────

  openAddCrewModal() {
    this.editingCrewId.set(null);
    this.editingCrewOriginalName.set('');
    this.crewFormError.set('');
    this.crewTimestamps = {};
    this.showPassword.set(false);
    this.crewForm = {
      name: '',
      phone: '',
      role: 'Driver',
      type: 'Regular',
      email: '',
      password: '',
      status: 'Active'
    };
    this.showCrewModal.set(true);
  }

  openEditCrewModal(member: CrewMember) {
    this.editingCrewId.set(member.id);
    this.editingCrewOriginalName.set(member.name);
    this.crewFormError.set('');
    this.crewTimestamps = {
      createdAt: member.createdAt,
      updatedAt: member.updatedAt
    };
    this.showPassword.set(false);
    this.crewForm = {
      name: member.name,
      phone: member.contactNumber || member.phone || '',
      role: member.role,
      type: member.type,
      email: member.email || '',
      password: member.password || '',
      status: member.status
    };
    this.showCrewModal.set(true);
  }

  closeCrewModal() {
    this.showCrewModal.set(false);
    this.editingCrewId.set(null);
    this.editingCrewOriginalName.set('');
    this.crewFormError.set('');
    this.crewTimestamps = {};
    this.showPassword.set(false);
  }

  onlyNumbersKeydown(event: KeyboardEvent) {
    const allowedKeys = [
      'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 
      'ArrowUp', 'ArrowDown', 'Tab', 'Enter', 'Home', 'End'
    ];
    if (allowedKeys.includes(event.key) || event.ctrlKey || event.metaKey) {
      return;
    }
    // Strictly block non-numeric characters (alphabet, symbols, etc.)
    if (!/^[0-9]$/.test(event.key)) {
      event.preventDefault();
    }
  }

  onPhoneInputElement(event: Event) {
    const input = event.target as HTMLInputElement;
    const clean = (input.value || '').replace(/\D/g, '').slice(0, 11);
    input.value = clean;
    this.crewForm.phone = clean;
  }

  onPhonePaste(event: ClipboardEvent) {
    event.preventDefault();
    const pastedData = event.clipboardData?.getData('text') || '';
    const clean = pastedData.replace(/\D/g, '').slice(0, 11);
    const input = event.target as HTMLInputElement;
    input.value = clean;
    this.crewForm.phone = clean;
  }

  requestSaveCrew() {
    // 1. Strict Name Validation
    const name = (this.crewForm.name || '').trim();
    if (!name || name.length < 2) {
      this.crewFormError.set('Full Name is required (at least 2 characters).');
      return;
    }

    // 2. Strict Contact Number (Strictly 11-digit starting with 09 & Unique across all crew)
    const phone = (this.crewForm.phone || '').trim();
    if (!/^09\d{9}$/.test(phone)) {
      this.crewFormError.set('Contact Number must be a valid 11-digit Philippine mobile number starting with 09 (e.g. 09171234567).');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const duplicatePhone = this.fleetStore.crew().find(c => {
      if (this.editingCrewId() && c.id === this.editingCrewId()) {
        return false;
      }
      const existingPhone = (c.contactNumber || c.phone || '').replace(/\D/g, '');
      return existingPhone === cleanPhone;
    });

    if (duplicatePhone) {
      this.crewFormError.set(`Contact Number "${phone}" is already registered to ${duplicatePhone.name}.`);
      return;
    }

    // 3. Email Format & Duplicate Validation (if provided)
    const email = (this.crewForm.email || '').trim().toLowerCase();
    if (email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        this.crewFormError.set('Please provide a valid email address format (e.g. name@porbido.ph).');
        return;
      }
      const duplicateEmail = this.fleetStore.crew().find(c => {
        if (this.editingCrewId() && c.id === this.editingCrewId()) {
          return false;
        }
        return (c.email || '').trim().toLowerCase() === email;
      });
      if (duplicateEmail) {
        this.crewFormError.set(`Email Address "${this.crewForm.email.trim()}" is already assigned to ${duplicateEmail.name}.`);
        return;
      }
    }

    // 4. Password Duplicate Validation (if provided)
    const password = (this.crewForm.password || '').trim();
    if (password) {
      const duplicatePassword = this.fleetStore.crew().find(c => {
        if (this.editingCrewId() && c.id === this.editingCrewId()) {
          return false;
        }
        return (c.password || '').trim() === password;
      });
      if (duplicatePassword) {
        this.crewFormError.set('This password is already in use by another crew account. Please provide a distinct password.');
        return;
      }
    }

    // 5. Composite Group Check (Name + Role + Type MUST be unique as a group)
    const role = this.crewForm.role;
    const type = this.crewForm.type;
    const normalizedName = name.toLowerCase();

    const duplicateProfile = this.fleetStore.crew().find(c => {
      if (this.editingCrewId() && c.id === this.editingCrewId()) {
        return false;
      }
      const cName = (c.name || '').trim().toLowerCase();
      return cName === normalizedName && c.role === role && c.type === type;
    });

    if (duplicateProfile) {
      this.crewFormError.set(`A crew member with Name "${name}", Role "${role}", and Type "${type}" is already registered in the system.`);
      return;
    }

    this.crewFormError.set('');
    this.saveStep.set('CONFIRM');
    this.pendingSaveType.set('Crew');
    this.showSaveConfirmModal.set(true);
  }

  confirmDeleteCrew(member: CrewMember) {
    this.deleteItemType.set('Crew Member');
    this.deleteItemId.set(member.id);
    this.deleteItemLabel.set(member.name);
    this.deleteStep.set('CONFIRM');
    this.showDeleteConfirmModal.set(true);
  }

  // ── SAVE CONFIRMATION & EXECUTION ─────────────────────────────────────────

  cancelSaveConfirm() {
    if (this.saveStep() !== 'CONFIRM') return;
    this.showSaveConfirmModal.set(false);
  }

  async executeSave() {
    this.saveStep.set('SAVING');

    try {
      if (this.pendingSaveType() === 'Truck') {
        const editingId = this.editingTruckId();
        const tons = Number(this.truckForm.capacityTons) || 30;

        const driverMember = this.fleetStore.crew().find(c => c.name === this.truckForm.assignedDriver);
        const helperMember = this.fleetStore.crew().find(c => c.name === this.truckForm.assignedHelper);

        const assignedCrew = {
          driver: {
            id: driverMember?.id || 'crew-d-temp',
            name: this.truckForm.assignedDriver || 'None',
            role: 'Driver' as const
          },
          helper: (this.truckForm.assignedHelper && this.truckForm.assignedHelper !== 'None') ? {
            id: helperMember?.id || 'crew-h-temp',
            name: this.truckForm.assignedHelper,
            role: 'Helper' as const
          } : null
        };

        if (editingId) {
          await this.fleetStore.updateTruck(editingId, {
            plateNumber: this.truckForm.plateNumber.trim().toUpperCase(),
            truckType: (this.truckForm.truckType || '').trim(),
            currentTripNumber: Number(this.truckForm.currentTripNumber) || 0,
            tripNumber: Number(this.truckForm.currentTripNumber) || 0,
            tonsCapacity: tons,
            status: this.truckForm.status,
            assignedCrew
          });
        } else {
          await this.fleetStore.addTruck({
            plateNumber: this.truckForm.plateNumber.trim().toUpperCase(),
            truckType: (this.truckForm.truckType || '').trim(),
            currentTripNumber: Number(this.truckForm.currentTripNumber) || 0,
            tripNumber: Number(this.truckForm.currentTripNumber) || 0,
            tonsCapacity: tons,
            status: this.truckForm.status,
            assignedCrew
          });
        }

      } else {
        // Saving Crew
        const editingId = this.editingCrewId();
        const originalName = this.editingCrewOriginalName();

        if (editingId) {
          await this.fleetStore.updateCrewMember(editingId, {
            name: this.crewForm.name.trim(),
            contactNumber: this.crewForm.phone.trim(),
            phone: this.crewForm.phone.trim(),
            role: this.crewForm.role,
            type: this.crewForm.type,
            email: this.crewForm.email.trim(),
            password: this.crewForm.password,
            status: this.crewForm.status
          });

          // Cascade unassign if status changed to On Leave or Inactive
          if (this.crewForm.status === 'On Leave' || this.crewForm.status === 'Inactive') {
            await this.fleetStore.unassignCrewMemberFromTrucks(originalName || this.crewForm.name);
          }
        } else {
          await this.fleetStore.addCrewMember({
            name: this.crewForm.name.trim(),
            contactNumber: this.crewForm.phone.trim(),
            phone: this.crewForm.phone.trim(),
            role: this.crewForm.role,
            type: this.crewForm.type,
            email: this.crewForm.email.trim(),
            password: this.crewForm.password,
            status: this.crewForm.status
          });
        }
      }

      // Step 1: Let the user clearly see the Saving animation (1.1 seconds)
      await new Promise(r => setTimeout(r, 1100));

      // Step 2: Show the green checkmark Success confirmation (1.0 seconds)
      this.saveStep.set('SUCCESS');
      await new Promise(r => setTimeout(r, 1000));

      // Step 3: Cleanly close modals
      this.showSaveConfirmModal.set(false);
      this.saveStep.set('CONFIRM');
      if (this.pendingSaveType() === 'Truck') {
        this.closeTruckModal();
      } else {
        this.closeCrewModal();
      }

    } catch (err) {
      console.error('Error saving record:', err);
      this.saveStep.set('CONFIRM');
      this.showSaveConfirmModal.set(false);
    }
  }

  // ── DELETE EXECUTION ──────────────────────────────────────────────────────

  closeDeleteModal() {
    if (this.deleteStep() !== 'CONFIRM') return;
    this.showDeleteConfirmModal.set(false);
    this.deleteItemId.set('');
    this.deleteItemLabel.set('');
  }

  async executeDelete() {
    const id = this.deleteItemId();
    const type = this.deleteItemType();
    const label = this.deleteItemLabel();
    if (!id) return;

    this.deleteStep.set('DELETING');

    try {
      if (type === 'Truck') {
        await this.fleetStore.deleteTruck(id);
      } else {
        await this.fleetStore.deleteCrewMember(id);
        // Safety unassign from any truck if this crew was assigned
        await this.fleetStore.unassignCrewMemberFromTrucks(label);
      }

      // Step 1: Let the user clearly see the Deleting animation (1.1 seconds)
      await new Promise(r => setTimeout(r, 1100));

      // Step 2: Show the coral red checkmark confirmation (1.0 seconds)
      this.deleteStep.set('SUCCESS');
      await new Promise(r => setTimeout(r, 1000));

      // Step 3: Cleanly close the delete modal
      this.showDeleteConfirmModal.set(false);
      this.deleteStep.set('CONFIRM');
      this.deleteItemId.set('');
      this.deleteItemLabel.set('');

    } catch (err) {
      console.error('Error deleting record:', err);
      this.deleteStep.set('CONFIRM');
      this.showDeleteConfirmModal.set(false);
    }
  }
}

