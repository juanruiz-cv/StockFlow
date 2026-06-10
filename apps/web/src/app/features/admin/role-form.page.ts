import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { of, catchError, tap, switchMap, forkJoin } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { AdminService } from './admin.service';
import { Permission } from './models';

@Component({
  selector: 'app-role-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto max-w-2xl space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">{{ isEditing() ? 'Editar Rol' : 'Nuevo Rol' }}</h1>
        <a routerLink="/admin/roles" class="text-sm text-blue-600 hover:text-blue-800">&larr; Volver</a>
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
        <div>
          <label class="block text-sm font-medium text-gray-700">Nombre del Rol *</label>
          <input
            formControlName="name"
            class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          @if (form.get('name')?.invalid && form.get('name')?.touched) {
            <p class="mt-1 text-xs text-red-500">El nombre es requerido</p>
          }
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Permisos</label>

          @if (loadingPermissions()) {
            <p class="text-sm text-gray-500">Cargando permisos...</p>
          } @else {
            <div class="space-y-1 rounded-lg border border-gray-200 p-4">
              @for (perm of permissions(); track perm.id) {
                <label class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-gray-50">
                  <input
                    type="checkbox"
                    [value]="perm.id"
                    (change)="togglePermission(perm.id, $event)"
                    [checked]="selectedPermissionIds().includes(perm.id)"
                    class="rounded border-gray-300"
                  />
                  <span class="font-mono text-xs text-gray-700">{{ perm.name }}</span>
                </label>
              } @empty {
                <p class="text-sm text-gray-500">No hay permisos disponibles</p>
              }
            </div>
          }
        </div>

        @if (submitError()) {
          <div class="rounded-lg bg-red-50 p-3 text-sm text-red-600">{{ submitError() }}</div>
        }

        <div class="flex justify-end gap-3">
          <a routerLink="/admin/roles" class="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">Cancelar</a>
          <button
            type="submit"
            [disabled]="submitting()"
            class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {{ submitting() ? 'Guardando...' : isEditing() ? 'Actualizar' : 'Crear Rol' }}
          </button>
        </div>
      </form>
    </div>
  `,
})
export class RoleFormPage {
  private readonly fb = inject(FormBuilder);
  private readonly adminService = inject(AdminService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly isEditing = signal(false);
  readonly submitting = signal(false);
  readonly submitError = signal('');
  readonly loadingPermissions = signal(true);

  readonly permissions = signal<Permission[]>([]);
  readonly selectedPermissionIds = signal<string[]>([]);

  readonly roleId = toSignal(
    this.route.paramMap.pipe(
      tap((params) => {
        const id = params.get('id');
        if (id && id !== 'new') {
          this.isEditing.set(true);
          this.loadRole(id);
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
  });

  constructor() {
    this.adminService.listPermissions().subscribe({
      next: (perms) => {
        this.permissions.set(perms);
        this.loadingPermissions.set(false);
      },
      error: () => {
        this.loadingPermissions.set(false);
      },
    });
  }

  private loadRole(id: string): void {
    this.adminService.getRoleById(id).subscribe((role) => {
      this.form.patchValue({ name: role.name });
      this.selectedPermissionIds.set(role.permissionIds ?? []);
    });
  }

  togglePermission(permissionId: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedPermissionIds.update((ids) =>
      checked ? [...ids, permissionId] : ids.filter((id) => id !== permissionId),
    );
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.submitting.set(true);
    this.submitError.set('');

    const { name } = this.form.value;
    const permissionIds = this.selectedPermissionIds();

    if (this.isEditing()) {
      const id = this.route.snapshot.paramMap.get('id')!;
      this.adminService
        .updateRole(id, { name: name!, permissionIds })
        .pipe(
          tap({
            next: () => this.router.navigate(['/admin/roles']),
            error: () => {
              this.submitting.set(false);
              this.submitError.set('Error al guardar el rol. Intente nuevamente.');
            },
          }),
          catchError(() => of(null)),
        )
        .subscribe();
    } else {
      this.adminService
        .createRole({ name: name! })
        .pipe(
          tap({
            next: (role) => {
              // Assign permissions after creation
              if (permissionIds.length > 0) {
                this.adminService.updateRole(role.id, { permissionIds }).subscribe({
                  next: () => this.router.navigate(['/admin/roles']),
                  error: () => {
                    this.submitting.set(false);
                    this.submitError.set('Error al asignar permisos.');
                  },
                });
              } else {
                this.router.navigate(['/admin/roles']);
              }
            },
            error: () => {
              this.submitting.set(false);
              this.submitError.set('Error al guardar el rol. Intente nuevamente.');
            },
          }),
          catchError(() => of(null)),
        )
        .subscribe();
    }
  }
}
