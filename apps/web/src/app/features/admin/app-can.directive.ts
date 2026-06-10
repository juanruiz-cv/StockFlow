import { Directive, Input, inject, TemplateRef, ViewContainerRef, signal, effect } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';

@Directive({
  selector: '[appCan]',
  standalone: true,
})
export class AppCanDirective {
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly authService = inject(AuthService);

  private readonly permission = signal('');
  private hasView = false;

  @Input() set appCan(value: string) {
    this.permission.set(value);
  }

  constructor() {
    effect(() => {
      const perm = this.permission();
      const permissions = this.authService.permissions();
      const hasPermission = !perm || permissions.includes(perm);

      if (hasPermission && !this.hasView) {
        this.viewContainer.createEmbeddedView(this.templateRef);
        this.hasView = true;
      } else if (!hasPermission && this.hasView) {
        this.viewContainer.clear();
        this.hasView = false;
      }
    });
  }
}
