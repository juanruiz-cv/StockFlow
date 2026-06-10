import { Component, inject, signal, output, ChangeDetectionStrategy } from "@angular/core";
import { ProductService } from "./product.service";
import { Marca } from "./models";

@Component({
  selector: "app-brand-manager",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" (click)="showForm.set(!showForm())" class="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50">+</button>
    @if (showForm()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/30" (click)="showForm.set(false)">
        <div class="w-96 rounded-lg bg-white p-6 shadow-xl" (click)="$event.stopPropagation()">
          <h3 class="mb-4 text-lg font-semibold">Nueva Marca</h3>
          <input #nameInput placeholder="Nombre de la marca" class="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
          <div class="flex justify-end gap-2">
            <button type="button" (click)="showForm.set(false)" class="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">Cancelar</button>
            <button type="button" (click)="create(nameInput.value)" class="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">Crear</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class BrandManager {
  private readonly productService = inject(ProductService);
  readonly showForm = signal(false);
  readonly created = output<Marca[]>();

  create(name: string): void {
    if (!name.trim()) return;
    this.productService.createBrand({ nombre: name }).subscribe(() => {
      this.showForm.set(false);
      this.productService.listBrands().subscribe((br) => this.created.emit(br));
    });
  }
}