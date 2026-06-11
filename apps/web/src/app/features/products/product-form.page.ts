import { Component, inject, signal, effect, ChangeDetectionStrategy } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router, ActivatedRoute, RouterLink } from "@angular/router";
import { of, catchError, tap, switchMap } from "rxjs";
import { toSignal } from "@angular/core/rxjs-interop";
import { ProductService } from "./product.service";
import { CategoryManager } from "./category-manager";
import { BrandManager } from "./brand-manager";
import { SupplierManager } from "./supplier-manager";
import { Categoria, Marca, Proveedor } from "./models";

@Component({
  selector: "app-product-form",
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CategoryManager, BrandManager, SupplierManager],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto max-w-2xl space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">{{ isEditing() ? "Editar Producto" : "Nuevo Producto" }}</h1>
        <a routerLink="/products" class="text-sm text-blue-600 transition-colors duration-150 hover:text-blue-800">&#8592; Volver</a>
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
        <div class="grid grid-cols-2 gap-4">
          <div class="col-span-2">
            <label class="block text-sm font-medium text-gray-700">Nombre *</label>
            <input formControlName="nombre" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
            @if (form.get("nombre")?.invalid && form.get("nombre")?.touched) {
              <p class="mt-1 text-xs text-red-500">El nombre es requerido</p>
            }
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">SKU *</label>
            <input formControlName="sku" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
            @if (form.get("sku")?.invalid && form.get("sku")?.touched) {
              <p class="mt-1 text-xs text-red-500">El SKU es requerido</p>
            }
            @if (skuError()) {
              <p class="mt-1 text-xs text-red-500">{{ skuError() }}</p>
            }
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Descripci\u00f3n</label>
            <input formControlName="descripcion" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Categor\u00eda *</label>
            <div class="mt-1 flex gap-2">
              <select formControlName="categoria_id" class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                <option value="">Seleccionar...</option>
                @for (cat of categories(); track cat.id) {
                  <option [value]="cat.id">{{ cat.nombre }}</option>
                }
              </select>
              <app-category-manager (created)="categories.set($event)" />
            </div>
            @if (form.get("categoria_id")?.invalid && form.get("categoria_id")?.touched) {
              <p class="mt-1 text-xs text-red-500">La categor\u00eda es requerida</p>
            }
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Marca *</label>
            <div class="mt-1 flex gap-2">
              <select formControlName="marca_id" class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                <option value="">Seleccionar...</option>
                @for (brand of brands(); track brand.id) {
                  <option [value]="brand.id">{{ brand.nombre }}</option>
                }
              </select>
              <app-brand-manager (created)="brands.set($event)" />
            </div>
            @if (form.get("marca_id")?.invalid && form.get("marca_id")?.touched) {
              <p class="mt-1 text-xs text-red-500">La marca es requerida</p>
            }
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Proveedor *</label>
            <div class="mt-1 flex gap-2">
              <select formControlName="proveedor_id" class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                <option value="">Seleccionar...</option>
                @for (sup of suppliers(); track sup.id) {
                  <option [value]="sup.id">{{ sup.nombre }}</option>
                }
              </select>
              <app-supplier-manager (created)="suppliers.set($event)" />
            </div>
            @if (form.get("proveedor_id")?.invalid && form.get("proveedor_id")?.touched) {
              <p class="mt-1 text-xs text-red-500">El proveedor es requerido</p>
            }
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Precio Compra *</label>
            <input type="number" formControlName="precio_compra" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
            @if (form.get("precio_compra")?.invalid && form.get("precio_compra")?.touched) {
              <p class="mt-1 text-xs text-red-500">Ingrese un precio v\u00e1lido</p>
            }
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Precio Venta *</label>
            <input type="number" formControlName="precio_venta" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
            @if (form.get("precio_venta")?.invalid && form.get("precio_venta")?.touched) {
              <p class="mt-1 text-xs text-red-500">Ingrese un precio v\u00e1lido</p>
            }
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Stock Actual *</label>
            <input type="number" formControlName="stock_actual" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Stock M\u00ednimo</label>
            <input type="number" formControlName="stock_minimo" class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
          </div>
        </div>

        @if (submitError()) {
          <div class="rounded-lg bg-red-50 p-3 text-sm text-red-600">{{ submitError() }}</div>
        }

        <div class="flex justify-end gap-3">
          <a routerLink="/products" class="cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-sm transition-colors duration-150 hover:bg-gray-50">Cancelar</a>
          <button type="submit" [disabled]="submitting()" class="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-all duration-150 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50">
            {{ submitting() ? "Guardando..." : isEditing() ? "Actualizar" : "Crear Producto" }}
          </button>
        </div>
      </form>
    </div>
  `,
})
export class ProductFormPage {
  private readonly fb = inject(FormBuilder);
  private readonly productService = inject(ProductService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly isEditing = signal(false);
  readonly submitting = signal(false);
  readonly submitError = signal("");
  readonly skuError = signal("");

  readonly productId = toSignal(
    this.route.paramMap.pipe(
      tap((params) => {
        const id = params.get("id");
        if (id && id !== "new") {
          this.isEditing.set(true);
          this.loadProduct(id);
        }
      }),
      switchMap((params) => {
        const id = params.get("id");
        return of(id && id !== "new" ? id : null);
      }),
    ),
  );

  readonly categories = signal<Categoria[]>([]);
  readonly brands = signal<Marca[]>([]);
  readonly suppliers = signal<Proveedor[]>([]);

  readonly form = this.fb.group({
    nombre: ["", Validators.required],
    sku: ["", Validators.required],
    descripcion: [""],
    categoria_id: ["", Validators.required],
    marca_id: ["", Validators.required],
    proveedor_id: ["", Validators.required],
    precio_compra: [0, [Validators.required, Validators.min(0)]],
    precio_venta: [0, [Validators.required, Validators.min(0)]],
    stock_actual: [0, [Validators.required, Validators.min(0)]],
    stock_minimo: [0, [Validators.min(0)]],
  });

  private readonly loadRefs = effect(() => {
    this.productService.listCategories().subscribe((cats) => this.categories.set(cats));
    this.productService.listBrands().subscribe((br) => this.brands.set(br));
    this.productService.listSuppliers().subscribe((sup) => this.suppliers.set(sup));
  });

  private loadProduct(id: string): void {
    this.productService.getById(id).subscribe((product) => {
      this.form.patchValue({
        nombre: product.nombre,
        sku: product.sku,
        descripcion: product.descripcion || "",
        categoria_id: product.categoria_id,
        marca_id: product.marca_id,
        proveedor_id: product.proveedor_id,
        precio_compra: product.precio_compra,
        precio_venta: product.precio_venta,
        stock_actual: product.stock_actual,
        stock_minimo: product.stock_minimo,
      });
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.submitting.set(true);
    this.submitError.set("");
    this.skuError.set("");

    const dto = this.form.value;
    const action = this.isEditing()
      ? this.productService.update(this.route.snapshot.paramMap.get("id")!, dto as any)
      : this.productService.create(dto as any);

    action.pipe(
      tap({
        next: () => this.router.navigate(["/products"]),
        error: (err) => {
          this.submitting.set(false);
          if (err.status === 409) {
            this.skuError.set("Este SKU ya existe");
          } else {
            this.submitError.set("Error al guardar el producto. Intente nuevamente.");
          }
        },
      }),
      catchError(() => of(null)),
    ).subscribe();
  }
}