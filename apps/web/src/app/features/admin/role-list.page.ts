import { Component, inject, signal, effect, computed, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { of, catchError, tap } from 'rxjs';
import { SearchInput } from '../../shared/ui/search-input';
import { PaginationState } from '../../shared/ui/table';
import { AdminService } from './admin.service';
import { Role } from './models';

@Component({
  selector: 'app-role-list',
  standalone: true,
  imports: [RouterLink, SearchInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">Roles</h1>
        <a
          routerLink="/admin/roles/new"
          class="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-all duration-150 hover:bg-blue-700 active:scale-[0.98]"
        >
          + Nuevo Rol
        </a>
      </div>

      <div class="max-w-sm flex-1">
        <app-search-input (search)="onSearch($event)" placeholder="Buscar roles..." />
      </div>

      <div class="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th scope="col" class="px-4 py-3">Rol</th>
              <th scope="col" class="px-4 py-3">Permisos</th>
              <th scope="col" class="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            @for (role of roles(); track role.id) {
              <tr class="transition-colors duration-150 hover:bg-gray-50">
                <td class="px-4 py-3 font-medium">{{ role.name }}</td>
                <td class="px-4 py-3">
                  <div class="flex flex-wrap gap-1">
                    @for (perm of role.permissions.slice(0, 5); track perm) {
                      <span class="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                        {{ perm }}
                      </span>
                    }
                    @if (role.permissions.length > 5) {
                      <span class="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                        +{{ role.permissions.length - 5 }} m\u00e1s
                      </span>
                    }
                    @if (role.permissions.length === 0) {
                      <span class="text-xs text-gray-400">Sin permisos</span>
                    }
                  </div>
                </td>
                <td class="px-4 py-3">
                  <div class="flex gap-3">
                    <a [routerLink]="['/admin/roles', role.id]" class="text-sm text-blue-600 transition-all duration-150 hover:text-blue-800 active:scale-[0.97]">Editar</a>
                    <button type="button" (click)="confirmDelete(role)" class="cursor-pointer text-sm text-red-600 transition-all duration-150 hover:text-red-800 active:scale-[0.97]">Eliminar</button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="3" class="px-4 py-12 text-center text-gray-500">
                  @if (loading()) {
                    Cargando...
                  } @else {
                    No hay roles
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>

        @if (pagination().total > 0) {
          <div class="flex items-center justify-between border-t border-gray-200 px-4 py-3">
            <div class="text-sm text-gray-500">
              {{ (pagination().page - 1) * pagination().limit + 1 }}&ndash;{{
                Math.min(pagination().page * pagination().limit, pagination().total)
              }} de {{ pagination().total }}
            </div>
            <div class="flex items-center gap-1">
              <button
                (click)="onPageChange(pagination().page - 1)"
                [disabled]="pagination().page <= 1"
              class="cursor-pointer rounded-md px-3 py-1 text-sm transition-all duration-150 hover:bg-gray-100 disabled:opacity-40"
            >
              Anterior
            </button>
            @for (p of pages(); track $index) {
              <button
                (click)="onPageChange(p)"
                class="cursor-pointer rounded-md px-3 py-1 text-sm transition-all duration-150"
                [class.bg-blue-600]="p === pagination().page"
                [class.text-white]="p === pagination().page"
                [class.hover:bg-gray-100]="p !== pagination().page"
              >
                {{ p }}
              </button>
            }
            <button
              (click)="onPageChange(pagination().page + 1)"
              [disabled]="pagination().page >= totalPages()"
              class="cursor-pointer rounded-md px-3 py-1 text-sm transition-all duration-150 hover:bg-gray-100 disabled:opacity-40"
            >
              Siguiente
              </button>
            </div>
          </div>
        }
      </div>

      @if (deleteTarget()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div class="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <p class="text-lg font-medium text-gray-900">¿Eliminar rol?</p>
            <p class="mt-1 text-sm text-gray-500">
              El rol "{{ deleteTarget()?.name }}" ser\u00e1 eliminado permanentemente.
            </p>
            <div class="mt-6 flex justify-end gap-3">
              <button
                (click)="cancelDelete()"
                class="cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-sm transition-all duration-150 hover:bg-gray-50 active:scale-[0.98]"
              >
                Cancelar
              </button>
              <button
                type="button"
                (click)="executeDelete()"
                class="cursor-pointer rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-all duration-150 hover:bg-red-700 active:scale-[0.98]"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class RoleListPage {
  protected readonly Math = Math;

  private readonly adminService = inject(AdminService);
  private readonly destroyRef = inject(DestroyRef);

  readonly searchTerm = signal('');
  readonly currentPage = signal(1);
  readonly loading = signal(false);
  readonly deleteTarget = signal<Role | null>(null);

  readonly roles = signal<Role[]>([]);
  readonly pagination = signal<PaginationState>({ page: 1, limit: 20, total: 0 });

  protected totalPages = computed(() =>
    Math.max(1, Math.ceil(this.pagination().total / this.pagination().limit)),
  );

  protected pages = computed(() => {
    const total = this.totalPages();
    const current = this.pagination().page;
    const start = Math.max(1, current - 2);
    const end = Math.min(total, start + 4);
    const count = end - start + 1;
    if (count <= 0) return [1];
    return Array.from({ length: count }, (_, i) => start + i);
  });

  constructor() {
    const sub = effect(() => {
      const page = this.currentPage();
      const search = this.searchTerm();
      this.loadRoles(page, search);
    });
    this.destroyRef.onDestroy(() => sub.destroy());
  }

  private loadRoles(page: number, search: string): void {
    this.loading.set(true);
    this.adminService
      .listRoles({
        page,
        limit: 20,
        search: search || undefined,
      })
      .pipe(
        tap({
          next: (res) => {
            this.roles.set(res.data);
            this.pagination.set({
              page: res.page,
              limit: res.limit,
              total: res.total,
            });
            this.loading.set(false);
          },
          error: () => this.loading.set(false),
        }),
        catchError(() => of(null)),
      )
      .subscribe();
  }

  onSearch(term: string): void {
    this.searchTerm.set(term);
    this.currentPage.set(1);
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  confirmDelete(role: Role): void {
    this.deleteTarget.set(role);
  }

  cancelDelete(): void {
    this.deleteTarget.set(null);
  }

  executeDelete(): void {
    const target = this.deleteTarget();
    if (!target) return;
    this.deleteTarget.set(null);
    this.adminService.deleteRole(target.id).subscribe(() => {
      this.currentPage.set(1);
    });
  }
}
