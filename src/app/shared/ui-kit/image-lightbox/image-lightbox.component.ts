import { Component, input, output, signal, computed, HostListener, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalTeleportDirective } from '../../directives/modal-teleport.directive';

@Component({
  selector: 'app-image-lightbox',
  standalone: true,
  imports: [CommonModule, ModalTeleportDirective],
  template: `
    <div 
      *ngIf="isOpen()" 
      appModalTeleport
      class="fixed inset-0 z-[250] flex flex-col bg-slate-950/95 backdrop-blur-md select-none animate-fade-in"
      role="dialog"
      aria-modal="true"
      (wheel)="onWheel($event)"
      (mousemove)="onMouseMove($event)"
      (mouseup)="onMouseUp()"
      (mouseleave)="onMouseUp()">

      <!-- ── TOP FLOATING CONTROL BAR ──────────────────────────────────────── -->
      <header class="px-5 py-3.5 bg-slate-900/80 border-b border-white/10 backdrop-blur-md flex items-center justify-between gap-4 z-20 shrink-0">
        
        <!-- Left: Image Title & Metadata -->
        <div class="flex items-center gap-3 overflow-hidden">
          <div class="w-8 h-8 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-white shrink-0">
            <span class="material-symbols-outlined text-[18px]">visibility</span>
          </div>
          <div class="overflow-hidden">
            <h3 class="text-xs sm:text-sm font-semibold text-white truncate max-w-[200px] sm:max-w-md" [title]="title()">
              {{ title() || 'Proof Document' }}
            </h3>
            <p *ngIf="subtitle()" class="text-[11px] text-slate-400 font-mono truncate mt-0.5">
              {{ subtitle() }}
            </p>
          </div>
        </div>

        <!-- Right: Control Tools -->
        <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
          
          <!-- Zoom Out -->
          <button 
            type="button"
            (click)="zoomOut()"
            [disabled]="zoomLevel() <= 0.5"
            title="Zoom Out (-)"
            class="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed border border-white/10">
            <span class="material-symbols-outlined text-[18px]">zoom_out</span>
          </button>

          <!-- Zoom Percentage (Click to toggle 1x / 2x) -->
          <button 
            type="button"
            (click)="toggleZoom()"
            title="Click to toggle 100% / 200%"
            class="h-8 px-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer border border-white/10 tabular-nums">
            {{ zoomPercentage() }}%
          </button>

          <!-- Zoom In -->
          <button 
            type="button"
            (click)="zoomIn()"
            [disabled]="zoomLevel() >= 3.5"
            title="Zoom In (+)"
            class="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed border border-white/10">
            <span class="material-symbols-outlined text-[18px]">zoom_in</span>
          </button>

          <div class="w-px h-5 bg-white/15 mx-1 hidden sm:block"></div>

          <!-- Rotate 90deg Clockwise -->
          <button 
            type="button"
            (click)="rotateClockwise()"
            title="Rotate 90° Clockwise (R)"
            class="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer border border-white/10">
            <span class="material-symbols-outlined text-[18px]">rotate_right</span>
          </button>

          <!-- Reset Fit -->
          <button 
            type="button"
            (click)="resetTransform()"
            title="Reset View (0)"
            class="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer border border-white/10">
            <span class="material-symbols-outlined text-[18px]">restart_alt</span>
          </button>

          <div class="w-px h-5 bg-white/15 mx-1"></div>

          <!-- Close Lightbox -->
          <button 
            type="button"
            (click)="onClose()"
            title="Close Lightbox (ESC)"
            class="w-8 h-8 rounded-xl bg-white/15 hover:bg-rose-600 text-white flex items-center justify-center transition-all cursor-pointer border border-white/20">
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>

        </div>
      </header>

      <!-- ── CENTER VIEWPORT CANVAS ────────────────────────────────────────── -->
      <main 
        class="relative flex-1 w-full h-full overflow-hidden flex items-center justify-center p-4 sm:p-8 cursor-default"
        (click)="onBackdropClick($event)">

        <div 
          class="relative flex items-center justify-center select-none"
          [style.transform]="transformStyle()"
          [style.transition]="isDragging() ? 'none' : 'transform 0.15s ease-out'">
          <img 
            [src]="imageUrl()" 
            [alt]="title()"
            (mousedown)="onMouseDown($event)"
            (click)="$event.stopPropagation()"
            [style.cursor]="zoomLevel() > 1 ? (isDragging() ? 'grabbing' : 'grab') : 'zoom-in'"
            (dblclick)="toggleZoom()"
            class="max-h-[85vh] max-w-[92vw] w-auto h-auto object-contain select-none shadow-2xl rounded-lg"
            draggable="false" 
          />
        </div>

      </main>

      <!-- ── BOTTOM HELPER HINT PILL ───────────────────────────────────────── -->
      <footer class="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <div class="px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-white/15 backdrop-blur-md text-[11px] text-slate-300 font-medium shadow-lg flex items-center gap-2">
          <span>Double-click or scroll to zoom</span>
          <span class="text-white/30">•</span>
          <span>Drag to pan</span>
          <span class="text-white/30">•</span>
          <span><kbd class="px-1 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">R</kbd> Rotate</span>
          <span class="text-white/30">•</span>
          <span><kbd class="px-1 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">ESC</kbd> Close</span>
        </div>
      </footer>

    </div>
  `
})
export class ImageLightboxComponent {
  isOpen = input<boolean>(false);
  imageUrl = input<string>('');
  title = input<string>('Image Viewer');
  subtitle = input<string>('');

  close = output<void>();

  // Manipulation State
  zoomLevel = signal<number>(1);
  rotation = signal<number>(0);
  panX = signal<number>(0);
  panY = signal<number>(0);
  isDragging = signal<boolean>(false);

  // Dragging coordinates
  private startX = 0;
  private startY = 0;
  private initialPanX = 0;
  private initialPanY = 0;
  private hasDragged = false;

  zoomPercentage = computed<number>(() => Math.round(this.zoomLevel() * 100));

  transformStyle = computed<string>(() => {
    return `translate(${this.panX()}px, ${this.panY()}px) scale(${this.zoomLevel()}) rotate(${this.rotation()}deg)`;
  });

  constructor() {
    effect(() => {
      const open = this.isOpen();
      untracked(() => {
        if (open) {
          this.resetTransform();
        }
      });
    });
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (!this.isOpen()) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.onClose();
    } else if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      this.zoomIn();
    } else if (event.key === '-' || event.key === '_') {
      event.preventDefault();
      this.zoomOut();
    } else if (event.key === 'r' || event.key === 'R') {
      event.preventDefault();
      this.rotateClockwise();
    } else if (event.key === '0') {
      event.preventDefault();
      this.resetTransform();
    }
  }

  zoomIn() {
    this.zoomLevel.update(z => Math.min(3.5, Math.round((z + 0.25) * 100) / 100));
  }

  zoomOut() {
    this.zoomLevel.update(z => {
      const next = Math.max(0.5, Math.round((z - 0.25) * 100) / 100);
      if (next <= 1) {
        this.panX.set(0);
        this.panY.set(0);
      }
      return next;
    });
  }

  toggleZoom() {
    if (this.zoomLevel() > 1.05) {
      this.zoomLevel.set(1);
      this.panX.set(0);
      this.panY.set(0);
    } else {
      this.zoomLevel.set(2);
    }
  }

  rotateClockwise() {
    this.rotation.update(r => (r + 90) % 360);
  }

  resetTransform() {
    this.zoomLevel.set(1);
    this.rotation.set(0);
    this.panX.set(0);
    this.panY.set(0);
    this.isDragging.set(false);
  }

  onWheel(e: WheelEvent) {
    e.preventDefault();
    if (e.deltaY < 0) {
      this.zoomIn();
    } else {
      this.zoomOut();
    }
  }

  onMouseDown(e: MouseEvent) {
    if (e.button !== 0) return; // Left click only
    this.hasDragged = false;
    this.isDragging.set(true);
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.initialPanX = this.panX();
    this.initialPanY = this.panY();
    e.preventDefault();
  }

  onMouseMove(e: MouseEvent) {
    if (!this.isDragging()) return;
    const dx = e.clientX - this.startX;
    const dy = e.clientY - this.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      this.hasDragged = true;
    }
    this.panX.set(this.initialPanX + dx);
    this.panY.set(this.initialPanY + dy);
  }

  onMouseUp() {
    this.isDragging.set(false);
  }

  onBackdropClick(e: MouseEvent) {
    if (this.hasDragged) {
      this.hasDragged = false;
      return;
    }
    this.onClose();
  }

  onClose() {
    this.resetTransform();
    this.close.emit();
  }
}
