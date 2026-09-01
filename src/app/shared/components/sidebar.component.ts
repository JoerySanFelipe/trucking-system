import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { TmsService } from '../../core/services/tms.service';

interface NavGroup {
  label: string;
  items: NavItem[];
}

interface NavItem {
  label: string;
  route: string;
  icon: string;
  badge?: number;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <!-- Mobile Backdrop -->
    <div
      *ngIf="isMobileOpen()"
      (click)="toggleMobileMenu()"
      class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden">
    </div>

    <!-- Mobile Hamburger Button -->
    <div class="md:hidden fixed top-3.5 left-4 z-50">
      <button
        (click)="toggleMobileMenu()"
        class="p-2 rounded-xl bg-white text-slate-700 shadow-card border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition-all hover:bg-slate-50 flex items-center justify-center">
        <span class="material-symbols-outlined text-[22px]">menu</span>
      </button>
    </div>

    <!-- Sidebar -->
    <aside
      [class.translate-x-0]="isMobileOpen()"
      [class.-translate-x-full]="!isMobileOpen()"
      [class.w-56]="!isCollapsed()"
      [class.w-18]="isCollapsed()"
      class="fixed top-0 left-0 bottom-0 bg-white border-r border-slate-200 z-40 flex flex-col
             transition-all duration-300 ease-in-out md:translate-x-0 overflow-hidden"
      style="box-shadow: 2px 0 12px rgba(0,0,0,0.04);">

      <!-- ── Logo Brand Block ───────────────────────────────── -->
      <div class="flex-shrink-0 h-16 border-b border-slate-100 flex items-center justify-between px-3.5">

        <!-- Logo -->
        <div class="flex items-center gap-3 min-w-0 overflow-hidden">
          <!-- P monogram -->
          <div class="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-base tracking-tight shadow-brand"
               style="background: linear-gradient(135deg, #262B35 0%, #172E8A 55%, #3361FF 100%);">
            P
          </div>

          <!-- Brand text (hidden when collapsed) -->
          <div *ngIf="!isCollapsed()" class="min-w-0 animate-fade-in">
            <div class="flex items-center gap-1.5">
              <span class="font-bold text-sm text-[#262B35] tracking-tight leading-none">PORBIDO</span>
              <span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-brand-50 text-brand-500 border border-brand-200 leading-none">TMS</span>
            </div>
            <p class="text-[10px] text-slate-400 font-medium leading-none mt-1">Trucking & Hauling</p>
          </div>
        </div>

        <!-- Close on mobile -->
        <button (click)="toggleMobileMenu()" class="md:hidden text-slate-400 hover:text-slate-600 p-1 rounded-lg flex items-center justify-center">
          <span class="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>

      <!-- ── Navigation ─────────────────────────────────────── -->
      <nav class="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2.5 space-y-0.5">

        <!-- MAIN GROUP -->
        <p *ngIf="!isCollapsed()" class="section-title animate-fade-in">Main</p>

        <!-- Dashboard -->
        <a routerLink="/dashboard"
           routerLinkActive="active"
           (click)="closeMobileMenu()"
           [title]="isCollapsed() ? 'Dashboard' : ''"
           class="nav-item group tooltip-trigger">
          <div class="flex-shrink-0 w-5 h-5 flex items-center justify-center">
            <span class="material-symbols-outlined text-[20px] transition-transform duration-150 group-hover:scale-110">dashboard</span>
          </div>
          <span *ngIf="!isCollapsed()" class="ml-2.5 text-sm font-medium truncate animate-fade-in">Dashboard</span>
          <span *ngIf="isCollapsed()" class="tooltip-text">Dashboard</span>
        </a>

        <!-- Dispatch -->
        <a routerLink="/dispatch"
           routerLinkActive="active"
           (click)="closeMobileMenu()"
           class="nav-item group tooltip-trigger">
          <div class="flex-shrink-0 w-5 h-5 flex items-center justify-center">
            <span class="material-symbols-outlined text-[20px] transition-transform duration-150 group-hover:scale-110">local_shipping</span>
          </div>
          <span *ngIf="!isCollapsed()" class="ml-2.5 text-sm font-medium truncate animate-fade-in">Dispatch</span>
          <span *ngIf="isCollapsed()" class="tooltip-text">Dispatch</span>
        </a>

        <!-- Ongoing Trips -->
        <a routerLink="/trips"
           routerLinkActive="active"
           (click)="closeMobileMenu()"
           class="nav-item group tooltip-trigger">
          <div class="flex-shrink-0 w-5 h-5 flex items-center justify-center">
            <span class="material-symbols-outlined text-[20px] transition-transform duration-150 group-hover:scale-110">alt_route</span>
          </div>
          <span *ngIf="!isCollapsed()" class="ml-2.5 text-sm font-medium truncate animate-fade-in">Ongoing Trips</span>
          <span *ngIf="isCollapsed()" class="tooltip-text">Ongoing Trips</span>
        </a>

        <!-- Completed Trips -->
        <a routerLink="/completed-trips"
           routerLinkActive="active"
           (click)="closeMobileMenu()"
           class="nav-item group tooltip-trigger">
          <div class="flex-shrink-0 w-5 h-5 flex items-center justify-center">
            <span class="material-symbols-outlined text-[20px] transition-transform duration-150 group-hover:scale-110">task_alt</span>
          </div>
          <span *ngIf="!isCollapsed()" class="ml-2.5 text-sm font-medium truncate animate-fade-in">Completed Trips</span>
          <span *ngIf="isCollapsed()" class="tooltip-text">Completed Trips</span>
        </a>

        <!-- FINANCE GROUP -->
        <div *ngIf="!isCollapsed()" class="pt-1">
          <p class="section-title animate-fade-in">Finance</p>
        </div>
        <div *ngIf="isCollapsed()" class="my-2 border-t border-slate-100"></div>

        <!-- Billing (Expandable) -->
        <div class="space-y-0.5 relative">
          <button (click)="toggleBillingMenu()"
             [class.active]="isBillingActive()"
             class="w-full text-left nav-item group tooltip-trigger flex items-center justify-between"
             [title]="isCollapsed() ? 'Billing' : ''">
            <div class="flex items-center">
              <div class="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                <span class="material-symbols-outlined text-[20px] transition-transform duration-150 group-hover:scale-110">receipt_long</span>
              </div>
              <span *ngIf="!isCollapsed()" class="ml-2.5 text-sm font-medium truncate animate-fade-in">Billing</span>
            </div>
            <span *ngIf="!isCollapsed()" [class.rotate-180]="isBillingOpen()" class="material-symbols-outlined text-[18px] text-slate-400 transition-transform duration-200">expand_more</span>
            <span *ngIf="isCollapsed()" class="tooltip-text">Billing</span>
          </button>
          
          <!-- Billing Children -->
          <div *ngIf="isBillingOpen() && !isCollapsed()" class="pl-10 space-y-1 mt-1 pb-1 animate-fade-in">
            <a routerLink="/billing-queue" routerLinkActive="text-brand-600 font-semibold" (click)="closeMobileMenu()" class="block py-1 text-sm text-slate-500 hover:text-slate-800 transition-colors">Billing Queue</a>
            <a routerLink="/draft-billing" routerLinkActive="text-brand-600 font-semibold" (click)="closeMobileMenu()" class="block py-1 text-sm text-slate-500 hover:text-slate-800 transition-colors">Draft Billings</a>
            <a routerLink="/printed-billing" routerLinkActive="text-brand-600 font-semibold" (click)="closeMobileMenu()" class="block py-1 text-sm text-slate-500 hover:text-slate-800 transition-colors">Printed Billings</a>
          </div>
        </div>

        <!-- Reconciliation -->
        <a routerLink="/reconciliation-workspace"
           routerLinkActive="active"
           (click)="closeMobileMenu()"
           class="nav-item group tooltip-trigger">
          <div class="flex-shrink-0 w-5 h-5 flex items-center justify-center">
            <span class="material-symbols-outlined text-[20px] transition-transform duration-150 group-hover:scale-110">compare_arrows</span>
          </div>
          <span *ngIf="!isCollapsed()" class="ml-2.5 text-sm font-medium truncate animate-fade-in">Reconciliation</span>
          <span *ngIf="isCollapsed()" class="tooltip-text">Reconciliation</span>
        </a>

        <!-- Payroll -->
        <a routerLink="/payroll"
           routerLinkActive="active"
           (click)="closeMobileMenu()"
           class="nav-item group tooltip-trigger">
          <div class="flex-shrink-0 w-5 h-5 flex items-center justify-center">
            <span class="material-symbols-outlined text-[20px] transition-transform duration-150 group-hover:scale-110">payments</span>
          </div>
          <span *ngIf="!isCollapsed()" class="ml-2.5 text-sm font-medium truncate animate-fade-in">Payroll</span>
          <span *ngIf="isCollapsed()" class="tooltip-text">Payroll</span>
        </a>

        <!-- MANAGEMENT GROUP -->
        <div *ngIf="!isCollapsed()" class="pt-1">
          <p class="section-title animate-fade-in">Management</p>
        </div>
        <div *ngIf="isCollapsed()" class="my-2 border-t border-slate-100"></div>

        <!-- Fleet -->
        <a routerLink="/fleet"
           routerLinkActive="active"
           (click)="closeMobileMenu()"
           class="nav-item group tooltip-trigger">
          <div class="flex-shrink-0 w-5 h-5 flex items-center justify-center">
            <span class="material-symbols-outlined text-[20px] transition-transform duration-150 group-hover:scale-110">garage</span>
          </div>
          <span *ngIf="!isCollapsed()" class="ml-2.5 text-sm font-medium truncate animate-fade-in">Fleet</span>
          <span *ngIf="isCollapsed()" class="tooltip-text">Fleet</span>
        </a>

        <!-- Reports -->
        <a routerLink="/reports"
           routerLinkActive="active"
           (click)="closeMobileMenu()"
           class="nav-item group tooltip-trigger">
          <div class="flex-shrink-0 w-5 h-5 flex items-center justify-center">
            <span class="material-symbols-outlined text-[20px] transition-transform duration-150 group-hover:scale-110">analytics</span>
          </div>
          <span *ngIf="!isCollapsed()" class="ml-2.5 text-sm font-medium truncate animate-fade-in">Reports</span>
          <span *ngIf="isCollapsed()" class="tooltip-text">Reports</span>
        </a>

        <!-- SYSTEM GROUP -->
        <div *ngIf="!isCollapsed()" class="pt-1">
          <p class="section-title animate-fade-in">System</p>
        </div>
        <div *ngIf="isCollapsed()" class="my-2 border-t border-slate-100"></div>

        <!-- Audit -->
        <a routerLink="/audit"
           routerLinkActive="active"
           (click)="closeMobileMenu()"
           class="nav-item group tooltip-trigger">
          <div class="flex-shrink-0 w-5 h-5 flex items-center justify-center">
            <span class="material-symbols-outlined text-[20px] transition-transform duration-150 group-hover:scale-110">shield</span>
          </div>
          <span *ngIf="!isCollapsed()" class="ml-2.5 text-sm font-medium truncate animate-fade-in">Audit</span>
          <span *ngIf="isCollapsed()" class="tooltip-text">Audit</span>
        </a>
      </nav>

      <!-- ── Bottom: Collapse Toggle + User Card ────────────── -->
      <div class="flex-shrink-0 border-t border-slate-100">

        <!-- User Card (expanded only) -->
        <div *ngIf="!isCollapsed()" class="px-3 py-3 flex items-center gap-2.5 animate-fade-in">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
               style="background: linear-gradient(135deg, #1E3A5F 0%, #2563EB 100%);">
            JO
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-bold text-slate-800 leading-tight truncate">Joemar Porbido</p>
            <p class="text-[10px] text-slate-400 font-medium truncate">Admin · Dispatcher</p>
          </div>
          <div class="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" title="Online"></div>
        </div>

        <!-- Collapse Toggle Button -->
        <button
          (click)="toggleCollapse()"
          class="hidden md:flex w-full items-center justify-center gap-2 px-3 py-2.5 text-slate-400 hover:text-brand-500 hover:bg-brand-50 transition-all text-xs font-medium border-t border-slate-100">
          <span class="material-symbols-outlined text-[18px] transition-transform duration-300" [class.rotate-180]="isCollapsed()">keyboard_double_arrow_left</span>
          <span *ngIf="!isCollapsed()" class="animate-fade-in">Collapse</span>
        </button>
      </div>

    </aside>
  `,
  styles: [`
    :host { display: contents; }
    .nav-item.active svg { stroke: currentColor; }
  `]
})
export class SidebarComponent {
  tmsService = inject(TmsService);
  router = inject(Router);
  
  isMobileOpen = signal<boolean>(false);
  isCollapsed   = signal<boolean>(false);
  isBillingOpen = signal<boolean>(false);

  toggleMobileMenu() { this.isMobileOpen.update(v => !v); }
  closeMobileMenu()  { this.isMobileOpen.set(false); }
  
  toggleCollapse() { 
    this.isCollapsed.update(v => !v); 
    if (this.isCollapsed()) {
       this.isBillingOpen.set(false);
    }
  }

  toggleBillingMenu() {
    if (this.isCollapsed()) {
      this.isCollapsed.set(false);
      this.isBillingOpen.set(true);
    } else {
      this.isBillingOpen.update(v => !v);
    }
  }

  isBillingActive(): boolean {
    const url = this.router.url;
    return url.includes('/billing-queue') || url.includes('/draft-billing') || url.includes('/printed-billing');
  }
}
