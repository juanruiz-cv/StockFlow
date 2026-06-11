import {
  Injectable,
  inject,
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
} from '@angular/core';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';

export interface ToastConfig {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
}

@Component({
  selector: 'app-toast',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="pointer-events-auto flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg"
      role="status" aria-live="polite"
      [class.bg-green-600]="type() === 'success'"
      [class.bg-red-600]="type() === 'error'"
      [class.bg-blue-600]="type() === 'info'"
    >
      @if (type() === 'success') {
        <span>✓</span>
      } @else if (type() === 'error') {
        <span>✕</span>
      } @else {
        <span>ℹ</span>
      }
      <span class="flex-1">{{ message() }}</span>
      <button
        type="button"
        (click)="dismiss.emit()"
        class="ml-2 text-white/80 hover:text-white"
      >
        ✕
      </button>
    </div>
  `,
})
export class ToastComponent {
  readonly message = input('');
  readonly type = input<ToastConfig['type']>('info');
  readonly dismiss = output();
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly overlay = inject(Overlay);
  private readonly activeToasts = signal<OverlayRef[]>([]);

  show(config: ToastConfig): void {
    const { message, type = 'info', duration = 3000 } = config;

    const overlayRef: OverlayRef = this.overlay.create({
      hasBackdrop: false,
      positionStrategy: this.overlay
        .position()
        .global()
        .top('16px')
        .right('16px'),
      scrollStrategy: this.overlay.scrollStrategies.noop(),
    });

    const portal = new ComponentPortal(ToastComponent);
    const componentRef = overlayRef.attach(portal);
    componentRef.setInput('message', message);
    componentRef.setInput('type', type);

    this.activeToasts.update((list) => [...list, overlayRef]);

    const dismiss = (): void => {
      overlayRef.dispose();
      this.activeToasts.update((list) => list.filter((r) => r !== overlayRef));
    };

    componentRef.instance.dismiss.subscribe(dismiss);

    if (duration > 0) {
      setTimeout(dismiss, duration);
    }
  }

  dismissAll(): void {
    for (const ref of this.activeToasts()) {
      ref.dispose();
    }
    this.activeToasts.set([]);
  }
}
