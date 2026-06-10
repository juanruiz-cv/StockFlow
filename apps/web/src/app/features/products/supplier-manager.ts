import { Component, inject, signal, output, ChangeDetectionStrategy } from "@angular/core";
import { ProductService } from "./product.service";
import { Proveedor } from "./models";

@Component({
  selector: "app-supplier-manager",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" (click)="showForm.set(!showForm())" class="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50">+</button>
    @if (showForm()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/30" (click)="showForm.set(false)">
        <div class="w-96 rounded-lg bg-white p-6 shadow-xl" (click)="$event.stopPropagation()">
          <h3 class="mb-4 text-lg font-semibold">Nuevo Proveedor</h3>
          <input #nameInput placeholder="Nombre del proveedor" class="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
          <div class="flex justify-end gap-2">
            <button type="button" (click)="showForm.set(false)" class="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">Cancelar</button>
            <button type="button" (click)="create(nameInput.value)" class="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">Crear</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class SupplierManager {
  private readonly productService = inject(ProductService);
  readonly showForm = signal(false);
  readonly created = output<Proveedor[]>();

  create(name: string): void {
    if (!name.trim()) return;
    this.productService.createSupplier({ nombre: name }).subscribe(() => {
      this.showForm.set(false);
      this.productService.listSuppliers().subscribe((sup) => this.created.emit(sup));
    });
  }
}