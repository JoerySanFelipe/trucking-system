import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './shared/components/sidebar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent],
  template: `
    <div class="min-h-screen flex font-sans antialiased" style="background: #F8FAFC;">

      <!-- ── Sidebar (fixed) ──────────────────────────────── -->
      <app-sidebar #sidebar></app-sidebar>

      <!-- ── Main Content Area ───────────────────────────── -->
      <div class="flex-1 flex flex-col min-w-0 transition-all duration-300"
           [style.paddingLeft]="sidebar.isCollapsed() ? '4.5rem' : '14rem'">

        <!-- Top App Header -->
        <header class="bg-white border-b border-slate-200 sticky top-0 z-30 h-16 flex items-center justify-between px-5"
                style="box-shadow: 0 1px 6px rgba(0,0,0,0.04);">

          <!-- Mobile hamburger spacer -->
          <div class="md:hidden w-10"></div>

          <!-- Rate ticker widget (desktop) -->
          <div class="hidden sm:flex items-center gap-2.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-brand-200 transition-colors cursor-default ml-2 md:ml-0">
            <div class="w-7 h-7 rounded-lg flex items-center justify-center bg-blue-50">
              <span class="material-symbols-outlined text-[16px] text-brand-600">trending_up</span>
            </div>
            <div>
              <div class="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">Subic → Pulilan Rate</div>
              <div class="flex items-center gap-1.5 mt-0.5">
                <span class="text-xs font-black text-slate-900">₱1,100<span class="text-[10px] text-slate-400 font-medium">/ton</span></span>
                <span class="text-[9px] font-bold px-1.5 py-0.5 rounded" style="background:#F0FDF4; color:#15803D; border: 1px solid #BBF7D0;">ACTIVE</span>
              </div>
            </div>
            <!-- Sparkline -->
            <div class="w-14 h-5 hidden sm:block">
              <svg class="w-full h-full overflow-visible" viewBox="0 0 56 20">
                <defs>
                  <linearGradient id="hdrGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#2563EB" stop-opacity="0.25"/>
                    <stop offset="100%" stop-color="#2563EB" stop-opacity="0"/>
                  </linearGradient>
                </defs>
                <path d="M0 15 Q14 10,28 12 T56 4 L56 20 L0 20 Z" fill="url(#hdrGrad)"/>
                <path d="M0 15 Q14 10,28 12 T56 4" fill="none" stroke="#2563EB" stroke-width="1.5" stroke-linecap="round"/>
                <circle cx="56" cy="4" r="2" fill="#2563EB"/>
              </svg>
            </div>
          </div>

          <!-- Right Side Actions -->
          <div class="flex items-center gap-3">

            <!-- Search (desktop) -->
            <div class="hidden lg:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 cursor-text hover:border-brand-200 transition-colors" style="min-width:220px;">
              <span class="material-symbols-outlined text-[16px] text-slate-400">search</span>
              <span class="text-xs font-medium text-slate-400">Search TLO, driver, plate…</span>
              <span class="ml-auto text-[10px] bg-white border border-slate-200 rounded px-1 py-0.5 text-slate-300 font-medium">⌘K</span>
            </div>

            <!-- Notifications -->
            <button class="relative p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-center" title="Notifications">
              <span class="material-symbols-outlined text-[20px]">notifications</span>
              <span class="absolute top-1.5 right-1.5 w-2 h-2 rounded-full ring-2 ring-white" style="background:#D97706;"></span>
            </button>

            <!-- User Profile -->
            <div class="flex items-center gap-2.5 border-l border-slate-100 pl-3 cursor-pointer">
              <div class="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-sm"
                   style="background: linear-gradient(135deg, #1E3A5F 0%, #2563EB 100%);">
                JP
              </div>
              <div class="hidden sm:block text-left">
                <p class="text-xs font-bold text-slate-800 leading-tight">Joemar Porbido</p>
                <p class="text-[10px] text-slate-400 font-medium">Admin Portal</p>
              </div>
              <div class="w-1.5 h-1.5 rounded-full" style="background:#22C55E;" title="Online"></div>
            </div>
          </div>
        </header>

        <!-- ── Page Content ─────────────────────────────── -->
        <main class="flex-1 w-full px-6 py-6">
          <router-outlet></router-outlet>
        </main>

      </div>
    </div>
  `
})
export class AppComponent {
  title = 'porbido-tms';
}
