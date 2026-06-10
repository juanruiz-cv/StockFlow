import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { of, catchError, tap, switchMap, forkJoin } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { AdminService } from './admin.service';
import { Role } from './models';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto max-w-2xl space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">{{ isEditing() ? 'Editar Usuario' : 'Nuevo Usuario' }}</h1>
        <a routerLink="/admin/users" class="text-sm text-blue-600 hover:text-blue-800">&larr; Volver</a>
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
        <div>
          <label class="block text-sm font-medium text-gray-700">Nombre *</label>
          <input
            formControlName="name"
            class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          @if (form.get('name')?.invalid && form.get('name')?.touched) {
            <p class="mt-1 text-xs text-red-500">El nombre es requerido</p>
          }
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">Email *</label>
          <input
            type="email"
            formControlName="email"
            class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          @if (form.get('email')?.invalid && form.get('email')?.touched) {
            <p class="mt-1 text-xs text-red-500">Ingrese un email v\u00e1lido</p>
          }
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">{{ isEditing() ? 'Contrase\u00f1a (dejar vac\u00edo para mantener)' : 'Contrase\u00f1a *' }}</label>
          <input
            type="password"
            formControlName="password"
            class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          @if (form.get('password')?.invalid && form.get('password')?.touched) {
            <p class="mt-1 text-xs text-red-500">La contrase\u00f1a es requerida</p>
          }
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Roles</label>
          <div class="space-y-2">
            @for (role of roles(); track role.id) {
              <label class="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  [value]="role.id"
                  (change)="toggleRole(role.id, $event)"
                  [checked]="selectedRoleIds().includes(role.id)"
                  class="rounded border-gray-300"
                />
                {{ role.name }}
              </label>
            } @empty {
              <p class="text-sm text-gray-500">No hay roles disponibles</p>
            }
          </div>
        </div>

        @if (submitError()) {
          <div class="rounded-lg bg-red-50 p-3 text-sm text-red-600">{{ submitError() }}</div>
        }

        <div class="flex justify-end gap-3">
          <a routerLink="/admin/users" class="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">Cancelar</a>
          <button
            type="submit"
            [disabled]="submitting()"
            class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {{ submitting() ? 'Guardando...' : isEditing() ? 'Actualizar' : 'Crear Usuario' }}
          </button>
        </div>
      </form>
    </div>
  `,
})
export class UserFormPage {
  private readonly fb = inject(FormBuilder);
  private readonly adminService = inject(AdminService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly isEditing = signal(false);
  readonly submitting = signal(false);
  readonly submitError = signal('');

  readonly roles = signal<Role[]>([]);
  readonly selectedRoleIds = signal<string[]>([]);
  private existingRoleIds: string[] = [];

  readonly userId = toSignal(
    this.route.paramMap.pipe(
      tap((params) => {
        const id = params.get('id');
        if (id && id !== 'new') {
          this.isEditing.set(true);
          this.loadUser(id);
        }
      }),
      switchMap((params) => {
        const id = params.get('id');
        return of(id && id !== 'new' ? id : null);
      }),
    ),
  );

  readonly form = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  constructor() {
    this.adminService.listRoles({ page: 1, limit: 100 }).subscribe((res) => {
      this.roles.set(res.data);
    });

    // Password not required when editing
    if (this.isEditing()) {
      this.form.get('password')?.clearValidators();
      this.form.get('password')?.updateValueAndValidity();
    }
  }

  private loadUser(id: string): void {
    this.adminService.getUserById(id).subscribe((user) => {
      this.form.patchValue({
        name: user.name,
        email: user.email,
        password: '',
      });
      this.form.get('password')?.clearValidators();
      this.form.get('password')?.updateValueAndValidity();
      this.selectedRoleIds.set(user.roleIds ?? []);
      this.existingRoleIds = user.roleIds ?? [];
    });
  }

  toggleRole(roleId: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedRoleIds.update((ids) =>
      checked ? [...ids, roleId] : ids.filter((id) => id !== roleId),
    );
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.submitting.set(true);
    this.submitError.set('');

    const { name, email, password } = this.form.value;

    if (this.isEditing()) {
      const id = this.route.snapshot.paramMap.get('id')!;
      this.adminService
        .updateUser(id, { name: name!, email: email! })
        .pipe(
          tap({
            next: () => this.syncRolesAfterSave(id),
            error: () => {
              this.submitting.set(false);
              this.submitError.set('Error al guardar el usuario. Intente nuevamente.');
            },
          }),
          catchError(() => of(null)),
        )
        .subscribe();
    } else {
      this.adminService
        .createUser({ name: name!, email: email!, password: password! })
        .pipe(
          tap({
            next: (user) => this.syncRolesAfterSave(user.id),
            error: () => {
              this.submitting.set(false);
              this.submitError.set('Error al guardar el usuario. Intente nuevamente.');
            },
          }),
          catchError(() => of(null)),
        )
        .subscribe();
    }
  }

  private syncRolesAfterSave(userId: string): void {
    const selected = this.selectedRoleIds();
    const existing = this.existingRoleIds;

    const toAdd = selected.filter((id) => !existing.includes(id));
    const toRemove = existing.filter((id) => !selected.includes(id));

    const ops: Array<ReturnType<typeof this.adminService.assignRole>> = [];

    for (const roleId of toAdd) {
      ops.push(this.adminService.assignRole(userId, roleId));
    }
    for (const roleId of toRemove) {
      ops.push(this.adminService.removeRole(userId, roleId));
    }

    if (ops.length === 0) {
      this.submitting.set(false);
      this.router.navigate(['/admin/users']);
      return;
    }

    forkJoin(ops).subscribe({
      next: () => {
        this.submitting.set(false);
        this.router.navigate(['/admin/users']);
      },
      error: () => {
        this.submitting.set(false);
        this.submitError.set('Error al asignar roles. Intente nuevamente.');
      },
    });
  }
}
