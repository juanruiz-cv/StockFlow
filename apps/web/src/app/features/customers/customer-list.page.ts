import { Component, inject, signal, effect, computed, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { of, catchError, tap } from 'rxjs';
import { SearchInput } from '../../shared/ui/search-input';
import { PaginationState } from '../../shared/ui/table';
import { CustomerService } from './customer.service';
import { Customer } from './models';

@Component({
  selector: 'app-customer-list',
  standalone: true,
  imports: [RouterLink, SearchInput, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">Clientes</h1>
        <a
          routerLink="/customers/new"
          class="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-all duration-150 hover:bg-blue-700 active:scale-[0.98]"
        >
          + Nuevo Cliente
        </a>
      </div>

      <div class="flex items-center gap-4">
        <div class="max-w-sm flex-1">
          <app-search-input (search)="onSearch($event)" placeholder="Buscar por nombre, email o teléfono..." />
        </div>
        <label class="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            [checked]="showDeleted()"
            (change)="toggleShowDeleted()"
            class="rounded border-gray-300"
          />
          Mostrar eliminados
        </label>
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
            @for (customer of customers(); track customer.id) {
              <tr class="transition-colors duration-150 hover:bg-gray-50">
                <td class="px-4 py-3">{{ customer.nombre }}</td>
                <td class="px-4 py-3">{{ customer.email }}</td>
                <td class="px-4 py-3">{{ customer.telefono }}</td>
                <td class="px-4 py-3">{{ customer.created_at | date:'shortDate' }}</td>
                <td class="px-4 py-3">
                  <div class="flex gap-3">
                    <a [routerLink]="['/customers', customer.id]" class="text-sm text-blue-600 transition-all duration-150 hover:text-blue-800 active:scale-[0.97]">Editar</a>
                    @if (customer.activo) {
                      <button type="button" (click)="confirmDelete(customer)" class="cursor-pointer text-sm text-red-600 transition-all duration-150 hover:text-red-800 active:scale-[0.97]">Eliminar</button>
                    } @else {
                      <button type="button" (click)="restore(customer)" class="cursor-pointer text-sm text-green-600 transition-all duration-150 hover:text-green-800 active:scale-[0.97]">Restaurar</button>
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
                    No hay clientes
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
            <p class="text-lg font-medium text-gray-900">¿Eliminar cliente?</p>
            <p class="mt-1 text-sm text-gray-500">
              "{{ deleteTarget()?.nombre }}" será desactivado y oculto de la lista.
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
export class CustomerListPage {
  protected readonly Math = Math;

  private readonly customerService = inject(CustomerService);
  private readonly destroyRef = inject(DestroyRef);

  readonly searchTerm = signal('');
  readonly sortColumn = signal<string>('nombre');
  readonly sortDirection = signal<'asc' | 'desc'>('asc');
  readonly currentPage = signal(1);
  readonly loading = signal(false);
  readonly showDeleted = signal(false);
  readonly deleteTarget = signal<Customer | null>(null);

  readonly columns = [
    { key: 'nombre', label: 'Nombre', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'telefono', label: 'Teléfono', sortable: true },
    { key: 'created_at', label: 'Creado', sortable: true },
  ];

  readonly customers = signal<Customer[]>([]);
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
      const deleted = this.showDeleted();
      this.loadMore(page, sortCol, sortDir, search, deleted);
    });
    this.destroyRef.onDestroy(() => sub.destroy());
  }

  private loadMore(
    page: number,
    sortColumn: string,
    sortDirection: 'asc' | 'desc',
    search: string,
    showDeleted: boolean,
  ): void {
    this.loading.set(true);
    this.customerService
      .list({
        page,
        limit: 20,
        search: search || undefined,
        sortColumn,
        sortDirection,
        showDeleted,
      })
      .pipe(
        tap({
          next: (res) => {
            this.customers.set(res.data);
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

  toggleShowDeleted(): void {
    this.showDeleted.update((v) => !v);
    this.currentPage.set(1);
  }

  confirmDelete(customer: Customer): void {
    this.deleteTarget.set(customer);
  }

  cancelDelete(): void {
    this.deleteTarget.set(null);
  }

  executeDelete(): void {
    const target = this.deleteTarget();
    if (!target) return;
    this.deleteTarget.set(null);
    this.customerService.delete(target.id).subscribe(() => {
      this.currentPage.set(1);
    });
  }

  restore(customer: Customer): void {
    this.customerService.restore(customer.id).subscribe(() => {
      this.currentPage.set(1);
    });
  }
}
