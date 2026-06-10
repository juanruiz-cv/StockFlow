import { Component, inject, signal, effect, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { of, catchError, tap } from 'rxjs';
import { Table, Column, PaginationState } from '../../shared/ui/table';
import { SearchInput } from '../../shared/ui/search-input';
import { ProductService } from './product.service';
import { Product } from './models';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [RouterLink, Table, SearchInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">Productos</h1>
        <a
          routerLink="/products/new"
          class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Nuevo Producto
        </a>
      </div>

      <div class="max-w-sm">
        <app-search-input (search)="onSearch($event)" placeholder="Buscar por nombre o SKU..." />
      </div>

      <app-table
        [columns]="columns"
        [data]="products()"
        [pagination]="pagination()"
        [loading]="loading()"
        [sortColumn]="sortColumn()"
        [sortDirection]="sortDirection()"
        (sortChange)="onSortChange($event)"
        (pageChange)="onPageChange($event)"
      />
    </div>
  `,
})
export class ProductListPage {
  private readonly productService = inject(ProductService);
  private readonly destroyRef = inject(DestroyRef);

  readonly searchTerm = signal('');
  readonly sortColumn = signal<string>('nombre');
  readonly sortDirection = signal<'asc' | 'desc'>('asc');
  readonly currentPage = signal(1);
  readonly loading = signal(false);

  readonly columns: Column<Product>[] = [
    { key: 'nombre', label: 'Nombre', sortable: true },
    { key: 'sku', label: 'SKU', sortable: true },
    { key: 'categoria_nombre', label: 'Categor\u00eda', sortable: true },
    { key: 'marca_nombre', label: 'Marca', sortable: true },
    { key: 'precio_venta', label: 'Precio Venta', sortable: true },
    { key: 'stock_actual', label: 'Stock', sortable: true },
  ];

  readonly products = signal<Product[]>([]);
  readonly pagination = signal<PaginationState>({ page: 1, limit: 20, total: 0 });

  constructor() {
    const sub = effect(() => {
      const page = this.currentPage();
      const sortCol = this.sortColumn();
      const sortDir = this.sortDirection();
      const search = this.searchTerm();
      this.loadMore(page, sortCol, sortDir, search);
    });
    this.destroyRef.onDestroy(() => sub.destroy());
  }

  private loadMore(
    page: number,
    sortColumn: string,
    sortDirection: 'asc' | 'desc',
    search: string,
  ): void {
    this.loading.set(true);
    this.productService
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
            this.products.set(res.data);
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

  onSortChange(event: { column: string; direction: 'asc' | 'desc' }): void {
    this.sortColumn.set(event.column);
    this.sortDirection.set(event.direction);
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
  }
}
