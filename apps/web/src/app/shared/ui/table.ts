import { Component, input, output, computed, ChangeDetectionStrategy } from '@angular/core';

export interface Column<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
}

export interface PaginationState {
  page: number;
  limit: number;
  total: number;
}

@Component({
  selector: 'app-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table class="w-full text-left text-sm">
        <thead class="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            @for (col of columns(); track $index) {
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
          @for (row of data(); track rowKey(row)) {
            <tr class="transition-colors duration-150 hover:bg-gray-50">
              @for (col of columns(); track $index) {
                <td class="px-4 py-3">
                  {{ cellValue(row, col.key) }}
                </td>
              }
            </tr>
          } @empty {
            <tr>
              <td [attr.colspan]="columns().length" class="px-4 py-12 text-center text-gray-500">
                @if (loading()) {
                  Cargando...
                } @else {
                  {{ emptyMessage() }}
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
              (click)="goToPage(pagination().page - 1)"
              [disabled]="pagination().page <= 1"
              class="cursor-pointer rounded-md px-3 py-1 text-sm transition-all duration-150 hover:bg-gray-100 disabled:opacity-40"
            >
              Anterior
            </button>

            @for (p of pages(); track $index) {
              <button
                (click)="goToPage(p)"
                class="cursor-pointer rounded-md px-3 py-1 text-sm transition-all duration-150"
                [class.bg-blue-600]="p === pagination().page"
                [class.text-white]="p === pagination().page"
                [class.hover:bg-gray-100]="p !== pagination().page"
              >
                {{ p }}
              </button>
            }

            <button
              (click)="goToPage(pagination().page + 1)"
              [disabled]="pagination().page >= totalPages()"
              class="cursor-pointer rounded-md px-3 py-1 text-sm transition-all duration-150 hover:bg-gray-100 disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
export class Table<T> {
  protected readonly Math = Math;

  readonly columns = input.required<Column<T>[]>();
  readonly data = input.required<T[]>();
  readonly pagination = input.required<PaginationState>();
  readonly loading = input(false);
  readonly sortColumn = input<string>();
  readonly sortDirection = input<'asc' | 'desc'>('asc');
  readonly trackBy = input<(item: T) => string | number>((item: T) => (item as any)?.id ?? '');
  readonly emptyMessage = input('No hay datos');

  readonly sortChange = output<{ column: string; direction: 'asc' | 'desc' }>();
  readonly pageChange = output<number>();

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

  protected rowKey(item: T): string | number {
    return this.trackBy()(item);
  }

  protected cellValue(item: T, key: string): unknown {
    return (item as Record<string, unknown>)[key];
  }

  protected toggleSort(key: string): void {
    if (this.sortColumn() === key) {
      const newDir = this.sortDirection() === 'asc' ? 'desc' : 'asc';
      this.sortChange.emit({ column: key, direction: newDir });
    } else {
      this.sortChange.emit({ column: key, direction: 'asc' });
    }
  }

  protected goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.pageChange.emit(page);
    }
  }
}
