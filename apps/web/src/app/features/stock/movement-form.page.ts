import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { of, catchError, tap } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { StockService } from './stock.service';
import { ProductService } from '../products/product.service';
import { Product } from '../products/models';

@Component({
  selector: 'app-movement-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto max-w-2xl space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">Nuevo Movimiento de Stock</h1>
        <a routerLink="/stock" class="text-sm text-blue-600 transition-colors duration-150 hover:text-blue-800">&larr; Volver</a>
      </div>

      <!-- Type selector tabs -->
      <div class="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
        @for (tab of movementTabs; track tab.value) {
          <button
            type="button"
            (click)="selectTab(tab.value)"
            class="flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all duration-150 active:scale-[0.98]"
            [class.bg-white]="movementType() === tab.value"
            [class.text-gray-900]="movementType() === tab.value"
            [class.shadow-sm]="movementType() === tab.value"
            [class.text-gray-500]="movementType() !== tab.value"
            [class.hover:text-gray-700]="movementType() !== tab.value"
          >
            {{ tab.label }}
          </button>
        }
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
        <!-- Product selector -->
        <div>
          <label class="block text-sm font-medium text-gray-700">Producto *</label>
          <div class="relative mt-1">
            <input
              type="text"
              [ngModel]="productQuery()"
              (ngModelChange)="onProductQueryChange($event)"
              [ngModelOptions]="{standalone: true}"
              placeholder="Buscar producto por nombre o SKU..."
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            @if (showProductDropdown()) {
              <div class="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                @for (product of filteredProducts(); track product.id) {
                  <button
                    type="button"
                    (click)="selectProduct(product)"
                    class="w-full cursor-pointer px-3 py-2 text-left text-sm transition-colors duration-150 hover:bg-gray-50"
                    [class.bg-blue-50]="selectedProduct()?.id === product.id"
                  >
                    <span class="font-medium">{{ product.nombre }}</span>
                    <span class="ml-2 font-mono text-xs text-gray-500">{{ product.sku }}</span>
                  </button>
                } @empty {
                  <div class="px-3 py-2 text-sm text-gray-500">Sin resultados</div>
                }
              </div>
            }
          </div>
          @if (selectedProduct()) {
            <p class="mt-1 text-xs text-gray-500">
              Seleccionado: {{ selectedProduct()?.nombre }} (Stock actual: {{ selectedProduct()?.stock_actual }})
            </p>
          }
          @if (productError()) {
            <p class="mt-1 text-xs text-red-500">Debe seleccionar un producto</p>
          }
        </div>

        <!-- Quantity -->
        <div>
          <label class="block text-sm font-medium text-gray-700">
            {{ movementType() === 'adjust' ? 'Cantidad (negativa para disminuir)' : 'Cantidad *' }}
          </label>
          <input
            type="number"
            formControlName="quantity"
            class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          @if (form.get('quantity')?.invalid && form.get('quantity')?.touched) {
            <p class="mt-1 text-xs text-red-500">
              @if (form.get('quantity')?.errors?.['required']) {
                La cantidad es requerida
              } @else if (form.get('quantity')?.errors?.['min']) {
                La cantidad debe ser mayor a 0
              }
            </p>
          }
          @if (stockError()) {
            <p class="mt-1 text-xs text-red-500">{{ stockError() }}</p>
          }
        </div>

        <!-- Reason (required for adjust, optional for others) -->
        <div>
          <label class="block text-sm font-medium text-gray-700">
            Motivo {{ movementType() === 'adjust' ? '*' : '(opcional)' }}
          </label>
          <textarea
            formControlName="reason"
            rows="2"
            class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          ></textarea>
          @if (form.get('reason')?.invalid && form.get('reason')?.touched) {
            <p class="mt-1 text-xs text-red-500">El motivo es requerido para ajustes</p>
          }
        </div>

        @if (submitError()) {
          <div class="rounded-lg bg-red-50 p-3 text-sm text-red-600">{{ submitError() }}</div>
        }

        @if (successMessage()) {
          <div class="rounded-lg bg-green-50 p-3 text-sm text-green-600">{{ successMessage() }}</div>
        }

        <div class="flex justify-end gap-3">
          <a routerLink="/stock" class="cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-sm transition-colors duration-150 hover:bg-gray-50">Cancelar</a>
          <button
            type="submit"
            [disabled]="submitting()"
            class="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-all duration-150 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50"
          >
            {{ submitting() ? 'Guardando...' : submitLabel() }}
          </button>
        </div>
      </form>
    </div>
  `,
})
export class MovementFormPage {
  private readonly fb = inject(FormBuilder);
  private readonly stockService = inject(StockService);
  private readonly productService = inject(ProductService);
  private readonly router = inject(Router);

  readonly movementType = signal<'inbound' | 'outbound' | 'adjust'>('inbound');
  readonly submitting = signal(false);
  readonly submitError = signal('');
  readonly successMessage = signal('');
  readonly productError = signal('');
  readonly stockError = signal('');

  readonly productQuery = signal('');
  readonly selectedProduct = signal<Product | null>(null);
  readonly showProductDropdown = signal(false);

  readonly movementTabs = [
    { value: 'inbound' as const, label: 'Ingreso' },
    { value: 'outbound' as const, label: 'Salida' },
    { value: 'adjust' as const, label: 'Ajuste' },
  ];

  readonly allProducts = signal<Product[]>([]);

  readonly filteredProducts = computed(() => {
    const query = this.productQuery().toLowerCase();
    if (!query) return this.allProducts();
    return this.allProducts().filter(
      (p) =>
        p.nombre.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query),
    );
  });

  readonly form = this.fb.group({
    quantity: [0, [Validators.required, Validators.min(1)]],
    reason: [''],
  });

  constructor() {
    this.loadProducts();

    // Reset validators when movement type changes
    this.movementType();

    // Update reason validators based on type
    this.form.get('reason')?.clearValidators();
    if (this.movementType() === 'adjust') {
      this.form.get('reason')?.setValidators(Validators.required);
    }
    this.form.get('reason')?.updateValueAndValidity();
  }

  protected submitLabel(): string {
    const labels: Record<string, string> = {
      inbound: 'Registrar Ingreso',
      outbound: 'Registrar Salida',
      adjust: 'Registrar Ajuste',
    };
    return labels[this.movementType()];
  }

  private loadProducts(): void {
    this.productService
      .list({ limit: 200 })
      .pipe(
        tap((res) => {
          this.allProducts.set(res.data);
        }),
        catchError(() => of(null)),
      )
      .subscribe();
  }

  selectTab(type: 'inbound' | 'outbound' | 'adjust'): void {
    this.movementType.set(type);
    this.submitError.set('');
    this.stockError.set('');
    this.successMessage.set('');
    this.form.get('quantity')?.setValue(0);
    this.form.get('quantity')?.markAsUntouched();

    // Update reason validators
    this.form.get('reason')?.clearValidators();
    if (type === 'adjust') {
      this.form.get('reason')?.setValidators(Validators.required);
    }
    this.form.get('reason')?.updateValueAndValidity();
  }

  onProductQueryChange(value: string): void {
    this.productQuery.set(value);
    this.showProductDropdown.set(true);
    this.selectedProduct.set(null);
    this.productError.set('');
    this.stockError.set('');
  }

  selectProduct(product: Product): void {
    this.selectedProduct.set(product);
    this.productQuery.set(`${product.nombre} (${product.sku})`);
    this.showProductDropdown.set(false);
    this.productError.set('');
    this.stockError.set('');
  }

  onSubmit(): void {
    this.submitError.set('');
    this.stockError.set('');
    this.successMessage.set('');

    const product = this.selectedProduct();
    if (!product) {
      this.productError.set('Debe seleccionar un producto');
      return;
    }

    if (this.form.invalid) return;

    const quantity = this.form.get('quantity')?.value ?? 0;
    const reason = this.form.get('reason')?.value || undefined;

    // Outbound validation: check sufficient stock
    if (this.movementType() === 'outbound' && quantity > product.stock_actual) {
      this.stockError.set(`Stock insuficiente (disponible: ${product.stock_actual})`);
      return;
    }

    this.submitting.set(true);

    const type = this.movementType();
    let action;

    if (type === 'inbound') {
      action = this.stockService.inbound({ product_id: product.id, quantity, reason });
    } else if (type === 'outbound') {
      action = this.stockService.outbound({ product_id: product.id, quantity, reason });
    } else {
      action = this.stockService.adjust({
        product_id: product.id,
        quantity: quantity,
        reason: reason || 'Ajuste de stock',
      });
    }

    action.pipe(
      tap({
        next: (movement) => {
          this.submitting.set(false);
          this.successMessage.set('Movimiento registrado exitosamente');

          // Update local stock display
          const currentProduct = this.selectedProduct();
          if (currentProduct) {
            this.selectedProduct.set({
              ...currentProduct,
              stock_actual: movement.new_stock,
            });
          }

          // Reset form after brief delay
          setTimeout(() => {
            this.router.navigate(['/stock']);
          }, 1500);
        },
        error: (err) => {
          this.submitting.set(false);
          if (err.status === 400) {
            this.submitError.set('Error de validaci\u00f3n. Verifique los datos.');
          } else if (err.status === 409) {
            this.stockError.set('Stock insuficiente');
          } else {
            this.submitError.set('Error al registrar el movimiento. Intente nuevamente.');
          }
        },
      }),
      catchError(() => of(null)),
    ).subscribe();
  }
}
