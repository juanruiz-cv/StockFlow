import {
  Injectable,
  inject,
  Component,
  ChangeDetectionStrategy,
  output,
  input,
} from '@angular/core';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="fixed inset-0 bg-black/50"></div>
      <div class="relative z-10 mx-4 w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <p class="text-sm text-gray-600">{{ message() }}</p>
        <div class="mt-6 flex justify-end gap-3">
          <button
            type="button"
            (click)="cancel.emit()"
            class="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            (click)="confirm.emit()"
            class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            {{ confirmLabel() }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ConfirmDialogComponent {
  readonly message = input('¿Está seguro?');
  readonly confirmLabel = input('Confirmar');
  readonly confirm = output();
  readonly cancel = output();
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly overlay = inject(Overlay);

  confirm(message: string, confirmLabel = 'Confirmar'): Promise<boolean> {
    const overlayRef: OverlayRef = this.overlay.create({
      hasBackdrop: false,
      positionStrategy: this.overlay.position().global().bottom().left(),
      scrollStrategy: this.overlay.scrollStrategies.block(),
    });

    const portal = new ComponentPortal(ConfirmDialogComponent);
    const componentRef = overlayRef.attach(portal);
    componentRef.setInput('message', message);
    componentRef.setInput('confirmLabel', confirmLabel);

    return new Promise((resolve) => {
      const subConfirm = componentRef.instance.confirm.subscribe(() => {
        subConfirm.unsubscribe();
        subCancel.unsubscribe();
        overlayRef.dispose();
        resolve(true);
      });

      const subCancel = componentRef.instance.cancel.subscribe(() => {
        subConfirm.unsubscribe();
        subCancel.unsubscribe();
        overlayRef.dispose();
        resolve(false);
      });
    });
  }
}
