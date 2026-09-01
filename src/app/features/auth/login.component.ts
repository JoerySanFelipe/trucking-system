import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-[85vh] flex items-center justify-center px-4 animate-fade-in">
      <div class="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-2xl p-8">
        
        <!-- Brand Header -->
        <div class="text-center mb-8">
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-blue-dark to-brand-blue flex items-center justify-center text-white font-extrabold text-2xl mx-auto shadow-lg mb-3">
            P
          </div>
          <h1 class="text-2xl font-black text-slate-900 tracking-tight">Porbido Trucking TMS</h1>
          <p class="text-xs text-slate-500 font-semibold mt-1">Cargill Philippines Hauling Control Center</p>
        </div>

        <form (ngSubmit)="onLogin()" class="space-y-5">
          
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Dispatcher Email</label>
            <input 
              type="email" 
              [(ngModel)]="email" 
              name="email" 
              required
              class="w-full px-4 py-3 rounded-xl border border-slate-300 font-semibold text-slate-900 focus:ring-2 focus:ring-brand-blue outline-none transition-all"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Password</label>
            <input 
              type="password" 
              [(ngModel)]="password" 
              name="password" 
              required
              class="w-full px-4 py-3 rounded-xl border border-slate-300 font-semibold text-slate-900 focus:ring-2 focus:ring-brand-blue outline-none transition-all"
            />
          </div>

          <div class="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
            <span class="text-slate-600 font-semibold">Demo Role:</span>
            <span class="font-extrabold text-brand-blue bg-blue-100 px-2 py-0.5 rounded border border-blue-200">Admin Lead Dispatcher</span>
          </div>

          <button 
            type="submit" 
            class="w-full py-3.5 rounded-xl bg-brand-blue hover:bg-brand-blue-dark text-white font-extrabold text-sm shadow-md transition-all">
            Sign In to Dashboard →
          </button>

        </form>

        <p class="text-center text-[11px] text-slate-400 font-semibold mt-6">
          Authorized Porbido Trucking & Hauling Service Staff Only
        </p>

      </div>
    </div>
  `
})
export class LoginComponent {
  router = inject(Router);

  email = 'admin@porbidotrucking.com';
  password = '••••••••••••';

  onLogin() {
    this.router.navigate(['/dashboard']);
  }
}
