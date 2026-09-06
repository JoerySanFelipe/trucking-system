import { Directive, ElementRef, inject, OnDestroy, OnInit } from '@angular/core';

/**
 * Directive that teleports modal dialog containers directly into document.body.
 * This guarantees that fixed inset-0 overlays are anchored strictly to the browser viewport,
 * immune to ancestor CSS transforms, keyframe animations (e.g. animate-fade-in-up),
 * filter effects, or page scroll displacement.
 */
@Directive({
  selector: '[appModalTeleport]',
  standalone: true
})
export class ModalTeleportDirective implements OnInit, OnDestroy {
  private el = inject(ElementRef).nativeElement as HTMLElement;
  private isTeleported = false;

  ngOnInit(): void {
    if (typeof document === 'undefined') return;

    // Move modal directly to document.body so it is viewport-locked
    if (this.el.parentNode && this.el.parentNode !== document.body) {
      document.body.appendChild(this.el);
      this.isTeleported = true;

      // Lock body scroll while modal is visible
      document.body.style.overflow = 'hidden';
    }
  }

  ngOnDestroy(): void {
    if (this.isTeleported) {
      // Cleanly remove the teleported DOM element from document.body
      if (this.el.parentNode) {
        this.el.remove();
      }
      this.isTeleported = false;
    }

    // Unlock body scroll if no other modal is currently active
    if (typeof document !== 'undefined') {
      const remainingModals = document.querySelectorAll(
        '.fixed.inset-0.z-50, .fixed.inset-0.z-\\[100\\], .fixed.inset-0.z-\\[120\\], .fixed.inset-0.z-\\[250\\]'
      );
      if (remainingModals.length === 0) {
        document.body.style.overflow = '';
      }
    }
  }
}
