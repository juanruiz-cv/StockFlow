import { Component, inject, signal, computed, effect, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { of, catchError, tap } from 'rxjs';
import { SearchInput } from '../../shared/ui/search-input';
import { PaginationState } from '../../shared/ui/table';
import { StockService } from './stock.service';
import { StockItem } from './models';

@Component({
  selector: 'app-stock',
  standalone: true,
  imports: [RouterLink, SearchInput, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">Stock Actual</h1>
        <div class="flex gap-2">
          <a
            routerLink="/stock/movements"
            class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Ver Movimientos
          </a>
          <a
            routerLink="/stock/movement/new"
            class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Nuevo Movimiento
          </a>
        </div>
      </div>

      <div class="max-w-sm">
        <app-search-input (search)="onSearch($event)" placeholder="Buscar por producto o SKU..." />
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
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            @for (item of stockItems(); track item.id) {
              <tr
                class="hover:bg-gray-50"
                [class.bg-red-50]="isLowStock(item)"
              >
                <td class="px-4 py-3">
                  <a [routerLink]="['/products', item.product_id]" class="text-blue-600 hover:text-blue-800">
                    {{ item.product_name }}
                  </a>
                </td>
                <td class="px-4 py-3 font-mono text-xs">{{ item.sku }}</td>
                <td
                  class="px-4 py-3 font-medium"
                  [class.text-red-600]="isLowStock(item)"
                >
                  {{ item.quantity }}
                </td>
                <td class="px-4 py-3 text-gray-500">
                  {{ item.last_movement_at ? (item.last_movement_at | date:'short') : '—' }}
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="4" class="px-4 py-12 text-center text-gray-500">
                  @if (loading()) {
                    Cargando...
                  } @else {
                    No hay productos en stock
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
                class="rounded-md px-3 py-1 text-sm hover:bg-gray-100 disabled:opacity-40"
              >
                Anterior
              </button>
              @for (p of pages(); track $index) {
                <button
                  (click)="onPageChange(p)"
                  class="rounded-md px-3 py-1 text-sm"
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
                class="rounded-md px-3 py-1 text-sm hover:bg-gray-100 disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class StockPage {
  protected readonly Math = Math;

  private readonly stockService = inject(StockService);
  private readonly destroyRef = inject(DestroyRef);

  readonly searchTerm = signal('');
  readonly sortColumn = signal<string>('product_name');
  readonly sortDirection = signal<'asc' | 'desc'>('asc');
  readonly currentPage = signal(1);
  readonly loading = signal(false);

  readonly columns = [
    { key: 'product_name', label: 'Producto', sortable: true },
    { key: 'sku', label: 'SKU', sortable: true },
    { key: 'quantity', label: 'Cantidad', sortable: true },
    { key: 'last_movement_at', label: '\u00daltimo Movimiento', sortable: true },
  ];

  readonly stockItems = signal<StockItem[]>([]);
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
      this.loadData(page, sortCol, sortDir, search);
    });
    this.destroyRef.onDestroy(() => sub.destroy());
  }

  private loadData(
    page: number,
    sortColumn: string,
    sortDirection: 'asc' | 'desc',
    search: string,
  ): void {
    this.loading.set(true);
    this.stockService
      .list({
        page,
        limit: 20,
        search: search || undefined,
        sortColumn,
        sortDirection,
      })
      .pipe(
        tap({
          next: (res) => {
            this.stockItems.set(res.data);
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

  protected isLowStock(item: StockItem): boolean {
    return item.quantity <= item.low_stock_threshold;
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
}
