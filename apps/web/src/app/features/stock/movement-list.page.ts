import { Component, inject, signal, computed, effect, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { of, catchError, tap } from 'rxjs';
import { PaginationState } from '../../shared/ui/table';
import { StockService } from './stock.service';
import { StockMovement } from './models';

@Component({
  selector: 'app-movement-list',
  standalone: true,
  imports: [RouterLink, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">Movimientos de Stock</h1>
        <a
          routerLink="/stock/movement/new"
          class="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-blue-700"
        >
          + Nuevo Movimiento
        </a>
      </div>

      <!-- Type filter tabs -->
      <div class="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
        @for (opt of filterOptions; track opt.value) {
          <button
            (click)="onFilterChange(opt.value)"
            class="rounded-md px-4 py-2 text-sm font-medium transition-colors"
            [class.bg-white]="selectedType() === opt.value"
            [class.text-gray-900]="selectedType() === opt.value"
            [class.shadow-sm]="selectedType() === opt.value"
            [class.text-gray-500]="selectedType() !== opt.value"
            [class.hover:text-gray-700]="selectedType() !== opt.value"
          >
            {{ opt.label }}
          </button>
        }
      </div>

      <div class="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th scope="col" class="px-4 py-3">Tipo</th>
              <th scope="col" class="px-4 py-3">Producto</th>
              <th scope="col" class="px-4 py-3">SKU</th>
              <th scope="col" class="px-4 py-3">Cantidad</th>
              <th scope="col" class="px-4 py-3">Stock Anterior</th>
              <th scope="col" class="px-4 py-3">Stock Nuevo</th>
              <th scope="col" class="px-4 py-3">Motivo</th>
              <th scope="col" class="px-4 py-3">Fecha</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            @for (movement of movements(); track movement.id) {
              <tr class="transition-colors duration-150 hover:bg-gray-50">
                <td class="px-4 py-3">
                  <span
                    class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                    [class.bg-green-100]="movement.type === 'inbound'"
                    [class.text-green-700]="movement.type === 'inbound'"
                    [class.bg-red-100]="movement.type === 'outbound'"
                    [class.text-red-700]="movement.type === 'outbound'"
                    [class.bg-yellow-100]="movement.type === 'adjust'"
                    [class.text-yellow-700]="movement.type === 'adjust'"
                  >
                    {{ typeLabel(movement.type) }}
                  </span>
                </td>
                <td class="px-4 py-3">
                    <a [routerLink]="['/products', movement.product_id]" class="text-blue-600 transition-colors duration-150 hover:text-blue-800">
                    {{ movement.product_name }}
                  </a>
                </td>
                <td class="px-4 py-3 font-mono text-xs">{{ movement.sku }}</td>
                <td class="px-4 py-3 font-medium">
                  <span [class.text-green-600]="movement.type === 'inbound' || (movement.type === 'adjust' && movement.quantity > 0)"
                        [class.text-red-600]="movement.type === 'outbound' || (movement.type === 'adjust' && movement.quantity < 0)">
                    {{ movement.quantity > 0 ? '+' : '' }}{{ movement.quantity }}
                  </span>
                </td>
                <td class="px-4 py-3 text-gray-500">{{ movement.previous_stock }}</td>
                <td class="px-4 py-3 font-medium">{{ movement.new_stock }}</td>
                <td class="px-4 py-3 text-gray-500">{{ movement.reason || '—' }}</td>
                <td class="px-4 py-3 text-gray-500">{{ movement.created_at | date:'short' }}</td>
              </tr>
            } @empty {
              <tr>
                <td colspan="8" class="px-4 py-12 text-center text-gray-500">
                  @if (loading()) {
                    Cargando...
                  } @else {
                    No hay movimientos
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
    </div>
  `,
})
export class MovementListPage {
  protected readonly Math = Math;

  private readonly stockService = inject(StockService);
  private readonly destroyRef = inject(DestroyRef);

  readonly selectedType = signal('');
  readonly currentPage = signal(1);
  readonly loading = signal(false);

  readonly filterOptions = [
    { value: '', label: 'Todos' },
    { value: 'inbound', label: 'Ingresos' },
    { value: 'outbound', label: 'Salidas' },
    { value: 'adjust', label: 'Ajustes' },
  ];

  readonly movements = signal<StockMovement[]>([]);
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
      const type = this.selectedType();
      const page = this.currentPage();
      this.loadMovements(page, type);
    });
    this.destroyRef.onDestroy(() => sub.destroy());
  }

  private loadMovements(page: number, type: string): void {
    this.loading.set(true);
    this.stockService
      .getMovements({
        page,
        limit: 20,
        type: type || undefined,
      })
      .pipe(
        tap({
          next: (res) => {
            this.movements.set(res.data);
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

  protected typeLabel(type: string): string {
    const labels: Record<string, string> = {
      inbound: 'Ingreso',
      outbound: 'Salida',
      adjust: 'Ajuste',
    };
    return labels[type] || type;
  }

  onFilterChange(type: string): void {
    this.selectedType.set(type);
    this.currentPage.set(1);
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }
}
