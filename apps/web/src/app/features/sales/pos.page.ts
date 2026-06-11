import {
  Component,
  computed,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { of, catchError, tap } from 'rxjs';
import { Modal } from '../../shared/ui/modal';
import { SaleService } from './sale.service';
import { ProductService } from '../products/product.service';
import { ToastService } from '../../shared/ui/toast';
import type { Product } from '../products/models';
import type { CartItem } from './models';

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, FormsModule, Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">Punto de Venta (POS)</h1>
        <a routerLink="/sales" class="text-sm text-blue-600 transition-colors duration-150 hover:text-blue-800"
          >&larr; Historial de Ventas</a
        >
      </div>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <!-- Left Panel: Product Search -->
        <div class="space-y-4 lg:col-span-3">
          <div class="rounded-lg border border-gray-200 bg-white p-4">
            <div class="relative">
              <input
                type="text"
                [ngModel]="searchQuery()"
                (ngModelChange)="onSearchInput($event)"
                placeholder="Buscar producto por nombre o SKU..."
                class="w-full rounded-lg border border-gray-300 px-3 py-2 pl-10 text-sm focus:border-blue-500 focus:outline-none"
              />
              <svg class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              >
            </div>

            @if (searchQuery() && !searching()) {
              <div class="mt-2 max-h-80 overflow-y-auto">
                @for (product of searchResults(); track product.id) {
                  <button
                    type="button"
                    (click)="addToCart(product)"
                    class="flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors duration-150 hover:bg-gray-50"
                  >
                    <div>
                      <span class="font-medium">{{ product.nombre }}</span>
                      <span class="ml-2 font-mono text-xs text-gray-500">{{
                        product.sku
                      }}</span>
                    </div>
                    <span class="font-mono text-sm text-gray-700"
                      >{{ product.precio_venta.toFixed(2) }}</span
                    >
                  </button>
                } @empty {
                  <div class="px-3 py-4 text-center text-sm text-gray-500">
                    Sin resultados
                  </div>
                }
              </div>
            }

            @if (searching()) {
              <div class="mt-2 px-3 py-4 text-center text-sm text-gray-500">
                Buscando...
              </div>
            }
          </div>

          @if (successMessage()) {
            <div
              class="rounded-lg bg-green-50 p-3 text-sm text-green-600"
            >
              {{ successMessage() }}
            </div>
          }
          @if (submitError()) {
            <div class="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {{ submitError() }}
            </div>
          }
        </div>

        <!-- Right Panel: Cart -->
        <div class="space-y-4 lg:col-span-2">
          <div class="rounded-lg border border-gray-200 bg-white p-4">
            <h2 class="mb-4 text-lg font-semibold text-gray-900">Carrito</h2>

            @if (cartItems().length === 0) {
              <div class="py-8 text-center text-sm text-gray-500">
                Carrito vacío. Busque productos para agregar.
              </div>
            }

            <div class="space-y-3">
              @for (item of cartItems(); track item.product_id) {
                <div class="flex items-center justify-between rounded-md border border-gray-100 p-3">
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-medium text-gray-900">
                      {{ item.product_name }}
                    </p>
                    <p class="text-xs text-gray-500">{{ item.sku }}</p>
                    <p class="mt-1 text-sm text-gray-700">
                      {{ item.unit_price.toFixed(2) }} c/u
                    </p>
                  </div>
                  <div class="ml-3 flex items-center gap-2">
                    <button
                      type="button"
                      (click)="adjustQuantity(item.product_id, -1)"
                      class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-gray-300 text-sm transition-colors duration-150 hover:bg-gray-50"
                    >
                      −
                    </button>
                    <span class="w-6 text-center text-sm font-medium">{{
                      item.quantity
                    }}</span>
                    <button
                      type="button"
                      (click)="adjustQuantity(item.product_id, 1)"
                      class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-gray-300 text-sm transition-colors duration-150 hover:bg-gray-50"
                    >
                      +
                    </button>
                  </div>
                  <div class="ml-3 text-right">
                    <p class="text-sm font-medium text-gray-900">
                      {{ itemSubtotal(item).toFixed(2) }}
                    </p>
                    <button
                      type="button"
                      (click)="removeFromCart(item.product_id)"
                      class="cursor-pointer text-xs text-red-500 transition-colors duration-150 hover:text-red-700"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              }
            </div>

            @if (cartItems().length > 0) {
              <div
                class="mt-4 border-t border-gray-200 pt-4"
              >
                <div class="flex justify-between text-base font-semibold text-gray-900">
                  <span>Total</span>
                  <span>{{ cartTotal().toFixed(2) }}</span>
                </div>

                <button
                  type="button"
                  (click)="openPaymentModal()"
                  class="mt-4 w-full cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-blue-700"
                >
                  Cobrar
                </button>
              </div>
            }
          </div>
        </div>
      </div>
    </div>

    <!-- Payment Modal -->
    <app-modal [open]="paymentModalOpen()" (close)="paymentModalOpen.set(false)">
      <form [formGroup]="paymentForm" (ngSubmit)="onSubmitPayment()">
        <h3 class="text-lg font-semibold text-gray-900">Procesar Pago</h3>
        <p class="mt-1 text-sm text-gray-500">
          Total a cobrar: <span class="font-semibold">{{ cartTotal().toFixed(2) }}</span>
        </p>

        <div class="mt-4 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700"
              >Método de pago</label
            >
            <select
              formControlName="method"
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="cash">Efectivo</option>
              <option value="card">Tarjeta</option>
              <option value="transfer">Transferencia</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700"
              >Monto recibido</label
            >
            <input
              type="number"
              formControlName="amount"
              step="0.01"
              min="0"
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          @if (paymentForm.get('amount')?.value && cartTotal() > 0) {
            <div
              class="rounded-lg bg-blue-50 p-3 text-sm text-blue-700"
            >
              Cambio: <span class="font-semibold">{{ calculatedChange().toFixed(2) }}</span>
            </div>
          }

          @if (paymentForm.get('amount')?.value > 0 && calculatedChange() < 0) {
            <div class="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-700">
              El monto recibido es menor al total. Faltan
              {{ (-calculatedChange()).toFixed(2) }}
            </div>
          }
        </div>

        <div class="mt-6 flex justify-end gap-3">
          <button
            type="button"
            (click)="paymentModalOpen.set(false)"
            class="cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-sm transition-colors duration-150 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            [disabled]="submitting() || paymentForm.invalid || calculatedChange() < 0"
            class="cursor-pointer rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-green-700 disabled:opacity-50"
          >
            {{ submitting() ? 'Procesando...' : 'Confirmar Pago' }}
          </button>
        </div>
      </form>
    </app-modal>
  `,
})
export class PosPage {
  private readonly fb = inject(FormBuilder);
  private readonly productService = inject(ProductService);
  private readonly saleService = inject(SaleService);
  private readonly toastService = inject(ToastService);

  readonly searchQuery = signal('');
  readonly searchResults = signal<Product[]>([]);
  readonly searching = signal(false);
  readonly cartItems = signal<CartItem[]>([]);
  readonly submitting = signal(false);
  readonly submitError = signal('');
  readonly successMessage = signal('');
  readonly paymentModalOpen = signal(false);

  private searchTimeoutId: ReturnType<typeof setTimeout> | null = null;

  readonly cartTotal = computed(() =>
    this.cartItems().reduce(
      (sum, item) => sum + item.unit_price * item.quantity,
      0,
    ),
  );

  readonly paymentForm = this.fb.group({
    method: ['cash', Validators.required],
    amount: [0, [Validators.required, Validators.min(0.01)]],
  });

  readonly calculatedChange = computed(() => {
    const amount = this.paymentForm.get('amount')?.value ?? 0;
    return amount - this.cartTotal();
  });

  onSearchInput(value: string): void {
    this.searchQuery.set(value);

    if (this.searchTimeoutId) clearTimeout(this.searchTimeoutId);

    if (!value.trim()) {
      this.searchResults.set([]);
      return;
    }

    this.searchTimeoutId = setTimeout(() => {
      this.searchProducts(value);
    }, 300);
  }

  private searchProducts(query: string): void {
    this.searching.set(true);
    this.productService
      .list({ search: query, limit: 20 })
      .pipe(
        tap((res) => {
          this.searchResults.set(res.data);
          this.searching.set(false);
        }),
        catchError(() => {
          this.searching.set(false);
          return of(null);
        }),
      )
      .subscribe();
  }

  addToCart(product: Product): void {
    const existing = this.cartItems().find(
      (item) => item.product_id === product.id,
    );

    if (existing) {
      this.adjustQuantity(product.id, 1);
    } else {
      this.cartItems.update((items) => [
        ...items,
        {
          product_id: product.id,
          product_name: product.nombre,
          sku: product.sku,
          quantity: 1,
          unit_price: product.precio_venta,
        },
      ]);
    }

    this.searchQuery.set('');
    this.searchResults.set([]);
  }

  adjustQuantity(productId: string, delta: number): void {
    this.cartItems.update((items) =>
      items
        .map((item) => {
          if (item.product_id !== productId) return item;
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          return { ...item, quantity: newQty };
        })
        .filter((item): item is CartItem => item !== null),
    );
  }

  removeFromCart(productId: string): void {
    this.cartItems.update((items) =>
      items.filter((item) => item.product_id !== productId),
    );
  }

  protected itemSubtotal(item: CartItem): number {
    return item.unit_price * item.quantity;
  }

  openPaymentModal(): void {
    this.paymentForm.reset({ method: 'cash', amount: 0 });
    this.paymentModalOpen.set(true);
  }

  onSubmitPayment(): void {
    if (this.paymentForm.invalid) return;

    const method = this.paymentForm.get('method')?.value as 'cash' | 'card' | 'transfer';
    const amount = this.paymentForm.get('amount')?.value ?? 0;

    if (amount < this.cartTotal()) return;

    this.submitError.set('');
    this.successMessage.set('');
    this.submitting.set(true);

    const dto = {
      items: this.cartItems().map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
      })),
      payments: [{ method, amount }],
    };

    this.saleService
      .create(dto)
      .pipe(
        tap({
          next: (sale) => {
            this.submitting.set(false);
            this.paymentModalOpen.set(false);
            this.toastService.show({
              message: `Venta #${sale.invoice_number} completada. Cambio: $${sale.change.toFixed(2)}`,
              type: 'success',
              duration: 5000,
            });
            this.successMessage.set(
              `Venta #${sale.invoice_number} registrada exitosamente`,
            );
            this.cartItems.set([]);
          },
          error: (err) => {
            this.submitting.set(false);
            if (err.status === 400) {
              this.submitError.set(
                'Error de validación. Verifique los datos.',
              );
            } else {
              this.submitError.set(
                'Error al procesar la venta. Intente nuevamente.',
              );
            }
          },
        }),
        catchError(() => of(null)),
      )
      .subscribe();
  }
}
