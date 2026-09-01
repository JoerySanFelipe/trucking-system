import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TmsService } from '../../core/services/tms.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <header class="bg-white border-b border-brand-border sticky top-0 z-40 shadow-subtle">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          
          <!-- Logo & Brand -->
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#172E8A] to-[#3361FF] flex items-center justify-center text-white font-bold text-xl shadow-md">
              P
            </div>
            <div>
              <div class="flex items-center space-x-2">
                <span class="font-bold text-lg text-[#262B35] tracking-tight">PORBIDO</span>
                <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#F1F4FF] text-[#3361FF] border border-[#C2D1FF]">TMS Admin</span>
              </div>
              <p class="text-xs text-slate-500 font-medium hidden sm:block">Trucking & Hauling Services • Urdaneta City</p>
            </div>
          </div>

          <!-- Navigation Links -->
          <nav class="hidden md:flex items-center space-x-1">
            <a routerLink="/dashboard" routerLinkActive="bg-[#F1F4FF] text-[#3361FF] font-semibold"
               class="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-[#3361FF] hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[18px]">dashboard</span>
              <span>Dashboard</span>
            </a>
            <a routerLink="/dispatch" routerLinkActive="bg-[#F1F4FF] text-[#3361FF] font-semibold"
               class="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-[#3361FF] hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[18px]">local_shipping</span>
              <span>Dispatch Entry</span>
            </a>
            <a routerLink="/trips" routerLinkActive="bg-[#F1F4FF] text-[#3361FF] font-semibold"
               class="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-[#3361FF] hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[18px]">alt_route</span>
              <span>Trips & PODs</span>
            </a>
            <a routerLink="/billings" routerLinkActive="bg-[#F1F4FF] text-[#3361FF] font-semibold"
               class="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-[#3361FF] hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[18px]">view_kanban</span>
              <span>Sales Kanban</span>
            </a>
            <a routerLink="/fleet" routerLinkActive="bg-[#F1F4FF] text-[#3361FF] font-semibold"
               class="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-[#3361FF] hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[18px]">garage</span>
              <span>Fleet Asset</span>
            </a>
          </nav>

          <!-- Right Status, Truck Rate Metric & User Profile -->
          <div class="flex items-center space-x-3">
            
            <!-- Today's Truck Rate Metric Sparkline Widget (Left-aligned in right header group) -->
            <div class="flex items-center space-x-2.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80">
              <span class="material-symbols-outlined text-[20px] text-[#3361FF]">trending_up</span>
              <div>
                <div class="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-none">Today's Truck Rate</div>
                <div class="flex items-center space-x-1.5 mt-0.5">
                  <span class="text-xs font-black text-slate-900">₱1,100<span class="text-[10px] text-slate-500 font-semibold">/ton</span></span>
                  <span class="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">+4.2%</span>
                </div>
              </div>
              <div class="w-16 h-6 pl-1">
                <svg class="w-full h-full overflow-visible" viewBox="0 0 100 40">
                  <defs>
                    <linearGradient id="hdrRateGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stop-color="#3361FF" stop-opacity="0.35"/>
                      <stop offset="100%" stop-color="#3361FF" stop-opacity="0"/>
                    </linearGradient>
                  </defs>
                  <path d="M 0 30 Q 25 20, 50 24 T 100 8 L 100 40 L 0 40 Z" fill="url(#hdrRateGrad)"/>
                  <path d="M 0 30 Q 25 20, 50 24 T 100 8" fill="none" stroke="#3361FF" stroke-width="2.5" stroke-linecap="round"/>
                  <circle cx="100" cy="8" r="3" fill="#3361FF"/>
                </svg>
              </div>
            </div>

            <div class="hidden lg:flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span class="text-xs font-semibold text-slate-700">Partner: Cargill PH</span>
            </div>

            <!-- Notifications -->
            <button class="relative p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors flex items-center justify-center" title="Notifications">
              <span class="material-symbols-outlined text-[20px]">notifications</span>
              <span class="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            </button>

            <!-- RBAC Role Switcher Badge -->
            <button 
              (click)="toggleRole()"
              [ngClass]="userRole() === 'OWNER' ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100' : 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200'"
              class="px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Click to toggle access mode (Owner vs Staff)">
              <span class="material-symbols-outlined text-[16px]">{{ userRole() === 'OWNER' ? 'shield_person' : 'person' }}</span>
              <span>{{ userRole() === 'OWNER' ? 'Owner' : 'Staff' }}</span>
            </button>

            <div class="flex items-center space-x-2 border-l border-slate-200 pl-3">
              <div class="w-8 h-8 rounded-full bg-brand-blue text-white flex items-center justify-center font-bold text-sm shadow-sm">
                {{ userRole() === 'OWNER' ? 'J' : 'A' }}
              </div>
              <div class="hidden sm:block text-left">
                <p class="text-xs font-bold text-slate-900 leading-tight">{{ userRole() === 'OWNER' ? 'Joery San Felipe' : 'Admin Staff' }}</p>
                <p class="text-[10px] text-brand-muted font-medium">{{ userRole() === 'OWNER' ? 'Business Owner' : 'Operations Staff' }}</p>
              </div>
            </div>

          </div>

        </div>
      </div>
    </header>
  `
})
export class HeaderComponent {
  tmsService = inject(TmsService);

  userRole = this.tmsService.userRole;

  toggleRole() {
    const nextRole = this.userRole() === 'OWNER' ? 'STAFF' : 'OWNER';
    this.tmsService.setUserRole(nextRole);
  }
}

