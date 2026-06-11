import {
  Component,
  input,
  output,
  effect,
  inject,
  ChangeDetectionStrategy,
  ViewChild,
  TemplateRef,
  ViewContainerRef,
  OnDestroy,
} from '@angular/core';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';

@Component({
  selector: 'app-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-template #content>
      <div class="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
        <div class="fixed inset-0 bg-black/50" (click)="close.emit()"></div>
        <div
          class="relative z-10 mx-4 w-full max-w-lg rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto"
        >
          <ng-content />
        </div>
      </div>
    </ng-template>
  `,
})
export class Modal implements OnDestroy {
  private readonly overlay = inject(Overlay);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private overlayRef: OverlayRef | null = null;

  readonly open = input(false);
  readonly close = output();

  @ViewChild('content', { static: true }) private readonly contentTemplate!: TemplateRef<unknown>;

  constructor() {
    effect(() => {
      if (this.open()) {
        this.openOverlay();
      } else {
        this.closeOverlay();
      }
    });
  }

  ngOnDestroy(): void {
    this.closeOverlay();
  }

  private openOverlay(): void {
    if (this.overlayRef) return;

    this.overlayRef = this.overlay.create({
      hasBackdrop: false,
      positionStrategy: this.overlay.position().global().bottom().left(),
      scrollStrategy: this.overlay.scrollStrategies.block(),
    });

    const portal = new TemplatePortal(this.contentTemplate, this.viewContainerRef);
    this.overlayRef.attach(portal);
  }

  private closeOverlay(): void {
    this.overlayRef?.dispose();
    this.overlayRef = null;
  }
}
