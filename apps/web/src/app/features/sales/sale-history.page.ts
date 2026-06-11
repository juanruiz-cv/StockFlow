import {
  Component,
  computed,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { of, catchError, tap } from 'rxjs';
import { Modal } from '../../shared/ui/modal';
import { SaleService } from './sale.service';
import { ToastService } from '../../shared/ui/toast';
import type { Sale } from './models';

@Component({
  selector: 'app-sale-history',
  standalone: true,
  imports: [RouterLink, DatePipe, FormsModule, Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">Historial de Ventas</h1>
        <a
          routerLink="/sales/pos"
          class="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-all duration-150 hover:bg-blue-700 active:scale-[0.98]"
        >
          + Nueva Venta
        </a>
      </div>

      <div class="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th scope="col" class="px-4 py-3">Factura</th>
              <th scope="col" class="px-4 py-3">Cliente</th>
              <th scope="col" class="px-4 py-3">Total</th>
              <th scope="col" class="px-4 py-3">Estado</th>
              <th scope="col" class="px-4 py-3">Fecha</th>
              <th scope="col" class="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            @for (sale of sales(); track sale.id) {
              <tr class="transition-colors duration-150 hover:bg-gray-50">
                <td class="px-4 py-3 font-medium">
                  #{{ sale.invoice_number }}
                </td>
                <td class="px-4 py-3 text-gray-500">
                  {{ sale.customer_name || '—' }}
                </td>
                <td class="px-4 py-3 font-medium">
                  {{ sale.total.toFixed(2) }}
                </td>
                <td class="px-4 py-3">
                  <span
                    class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                    [class.bg-green-100]="sale.status === 'completed'"
                    [class.text-green-700]="sale.status === 'completed'"
                    [class.bg-red-100]="sale.status === 'voided'"
                    [class.text-red-700]="sale.status === 'voided'"
                  >
                    {{ sale.status === 'completed' ? 'Completada' : 'Anulada' }}
                  </span>
                </td>
                <td class="px-4 py-3 text-gray-500">
                  {{ sale.created_at | date : 'dd/MM/yyyy HH:mm' }}
                </td>
                <td class="px-4 py-3">
                  @if (sale.status === 'completed') {
                    <button
                      type="button"
                      (click)="voidSale(sale)"
                      class="cursor-pointer text-xs text-red-500 transition-all duration-150 hover:text-red-700 active:scale-[0.97]"
                    >
                      Anular
                    </button>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6" class="px-4 py-12 text-center text-gray-500">
                  @if (loading()) {
                    Cargando...
                  } @else {
                    No hay ventas registradas
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

    <!-- Void Reason Modal -->
    <app-modal [open]="voidModalOpen()" (close)="voidModalOpen.set(false)">
      <h3 class="text-lg font-semibold text-gray-900">Anular Venta</h3>
      <p class="mt-1 text-sm text-gray-500">
        ¿Está seguro de anular la venta
        <span class="font-medium">#{{ voidTarget()?.invoice_number }}</span
        >?
      </p>

      <div class="mt-4">
        <label class="block text-sm font-medium text-gray-700"
          >Motivo de anulación *</label
        >
        <textarea
          [(ngModel)]="voidReason"
          rows="3"
          placeholder="Describa el motivo..."
          class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        ></textarea>
        @if (voidError()) {
          <p class="mt-1 text-xs text-red-500">{{ voidError() }}</p>
        }
      </div>

      <div class="mt-6 flex justify-end gap-3">
        <button
          type="button"
          (click)="voidModalOpen.set(false)"
          class="cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-sm transition-all duration-150 hover:bg-gray-50 active:scale-[0.98]"
        >
          Cancelar
        </button>
        <button
          type="button"
          (click)="confirmVoid()"
          [disabled]="voiding() || !voidReason().trim()"
          class="cursor-pointer rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-all duration-150 hover:bg-red-700 active:scale-[0.98] disabled:opacity-50"
        >
          {{ voiding() ? 'Anulando...' : 'Anular Venta' }}
        </button>
      </div>
    </app-modal>
  `,
})
export class SaleHistoryPage {
  protected readonly Math = Math;

  private readonly saleService = inject(SaleService);
  private readonly toastService = inject(ToastService);

  readonly sales = signal<Sale[]>([]);
  readonly loading = signal(false);
  readonly currentPage = signal(1);
  readonly pageSize = 20;

  readonly voidModalOpen = signal(false);
  readonly voidTarget = signal<Sale | null>(null);
  readonly voidReason = signal('');
  readonly voidError = signal('');
  readonly voiding = signal(false);

  readonly pagination = computed(() => ({
    page: this.currentPage(),
    limit: this.pageSize,
    total: this.totalRecords(),
  }));

  readonly totalRecords = signal(0);

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
    this.loadSales();
  }

  private loadSales(): void {
    this.loading.set(true);
    this.saleService
      .list({
        page: this.currentPage(),
        limit: this.pageSize,
      })
      .pipe(
        tap({
          next: (res) => {
            this.sales.set(res.data);
            this.totalRecords.set(res.total);
            this.loading.set(false);
          },
          error: () => this.loading.set(false),
        }),
        catchError(() => of(null)),
      )
      .subscribe();
  }

  protected onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadSales();
    }
  }

  protected voidSale(sale: Sale): void {
    this.voidTarget.set(sale);
    this.voidReason.set('');
    this.voidError.set('');
    this.voidModalOpen.set(true);
  }

  protected confirmVoid(): void {
    const sale = this.voidTarget();
    if (!sale) return;

    const reason = this.voidReason().trim();
    if (!reason) {
      this.voidError.set('Debe ingresar un motivo de anulación');
      return;
    }

    this.voiding.set(true);
    this.voidError.set('');

    this.saleService
      .void(sale.id, { reason })
      .pipe(
        tap({
          next: () => {
            this.voiding.set(false);
            this.voidModalOpen.set(false);
            this.toastService.show({
              message: `Venta #${sale.invoice_number} anulada correctamente`,
              type: 'success',
            });
            this.loadSales();
          },
          error: (err) => {
            this.voiding.set(false);
            this.voidError.set(
              err.status === 400
                ? 'Error de validación. Verifique el motivo.'
                : 'Error al anular la venta. Intente nuevamente.',
            );
          },
        }),
        catchError(() => of(null)),
      )
      .subscribe();
  }
}
