import { Component, inject, signal, effect, computed, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { of, catchError, tap } from 'rxjs';
import { SearchInput } from '../../shared/ui/search-input';
import { PaginationState } from '../../shared/ui/table';
import { AdminService } from './admin.service';
import { User } from './models';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [RouterLink, SearchInput, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">Usuarios</h1>
        <a
          routerLink="/admin/users/new"
          class="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-blue-700"
        >
          + Nuevo Usuario
        </a>
      </div>

      <div class="max-w-sm flex-1">
        <app-search-input (search)="onSearch($event)" placeholder="Buscar por nombre o email..." />
      </div>

      <div class="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              @for (col of columns; track col.key) {
                <th
                  scope="col"
                  class="cursor-pointer px-4 py-3"
                  [class.hover:bg-gray-100]="col.sortable"
                  (click)="col.sortable && toggleSort(col.key)"
                >
                  <span class="inline-flex items-center gap-1">
                    {{ col.label }}
                    @if (col.sortable && sortColumn() === col.key) {
                      <span class="text-gray-700">{{ sortDirection() === 'asc' ? '\u2191' : '\u2193' }}</span>
                    }
                  </span>
                </th>
              }
              <th scope="col" class="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            @for (user of users(); track user.id) {
              <tr class="transition-colors duration-150 hover:bg-gray-50">
                <td class="px-4 py-3">{{ user.name }}</td>
                <td class="px-4 py-3">{{ user.email }}</td>
                <td class="px-4 py-3">
                  <div class="flex flex-wrap gap-1">
                    @for (role of user.roles; track role) {
                      <span class="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                        {{ role }}
                      </span>
                    }
                  </div>
                </td>
                <td class="px-4 py-3">
                  @if (user.is_active) {
                    <span class="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Activo</span>
                  } @else {
                    <span class="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">Inactivo</span>
                  }
                </td>
                <td class="px-4 py-3">
                  <div class="flex gap-3">
                    <a [routerLink]="['/admin/users', user.id]" class="text-sm text-blue-600 transition-colors duration-150 hover:text-blue-800">Editar</a>
                    @if (user.is_active) {
                      <button (click)="confirmDeactivate(user)" class="cursor-pointer text-sm text-red-600 transition-colors duration-150 hover:text-red-800">Desactivar</button>
                    } @else {
                      <button (click)="activate(user)" class="cursor-pointer text-sm text-green-600 transition-colors duration-150 hover:text-green-800">Activar</button>
                    }
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5" class="px-4 py-12 text-center text-gray-500">
                  @if (loading()) {
                    Cargando...
                  } @else {
                    No hay usuarios
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

      @if (deactivateTarget()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div class="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <p class="text-lg font-medium text-gray-900">¿Desactivar usuario?</p>
            <p class="mt-1 text-sm text-gray-500">
              "{{ deactivateTarget()?.name }}" no podr\u00e1 iniciar sesi\u00f3n hasta que sea reactivado.
            </p>
            <div class="mt-6 flex justify-end gap-3">
              <button
                (click)="cancelDeactivate()"
                class="cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-sm transition-colors duration-150 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                (click)="executeDeactivate()"
                class="cursor-pointer rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-red-700"
              >
                Desactivar
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class UserListPage {
  protected readonly Math = Math;

  private readonly adminService = inject(AdminService);
  private readonly destroyRef = inject(DestroyRef);

  readonly searchTerm = signal('');
  readonly sortColumn = signal<string>('name');
  readonly sortDirection = signal<'asc' | 'desc'>('asc');
  readonly currentPage = signal(1);
  readonly loading = signal(false);
  readonly deactivateTarget = signal<User | null>(null);

  readonly columns = [
    { key: 'name', label: 'Nombre', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'roles', label: 'Roles', sortable: false },
    { key: 'is_active', label: 'Estado', sortable: true },
  ];

  readonly users = signal<User[]>([]);
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
      const sortCol = this.sortColumn();
      const sortDir = this.sortDirection();
      const search = this.searchTerm();
      this.loadUsers(page, sortCol, sortDir, search);
    });
    this.destroyRef.onDestroy(() => sub.destroy());
  }

  private loadUsers(
    page: number,
    sortColumn: string,
    sortDirection: 'asc' | 'desc',
    search: string,
  ): void {
    this.loading.set(true);
    this.adminService
      .listUsers({
        page,
        limit: 20,
        search: search || undefined,
        sortColumn,
        sortDirection,
      })
      .pipe(
        tap({
          next: (res) => {
            this.users.set(res.data);
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

  toggleSort(key: string): void {
    if (this.sortColumn() === key) {
      this.sortDirection.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortColumn.set(key);
      this.sortDirection.set('asc');
    }
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  confirmDeactivate(user: User): void {
    this.deactivateTarget.set(user);
  }

  cancelDeactivate(): void {
    this.deactivateTarget.set(null);
  }

  executeDeactivate(): void {
    const target = this.deactivateTarget();
    if (!target) return;
    this.deactivateTarget.set(null);
    this.adminService.updateUser(target.id, { is_active: false }).subscribe(() => {
      this.currentPage.set(1);
    });
  }

  activate(user: User): void {
    this.adminService.updateUser(user.id, { is_active: true }).subscribe(() => {
      this.currentPage.set(1);
    });
  }
}
