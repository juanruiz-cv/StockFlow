import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="space-y-6">
      <h1 class="text-2xl font-bold text-gray-900">Dashboard</h1>

      <p class="text-gray-600">
        Bienvenido, {{ authService.user()?.name ?? 'Usuario' }}
      </p>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <a
          routerLink="/products"
          class="rounded-lg bg-white p-6 shadow hover:shadow-md"
        >
          <h3 class="text-lg font-semibold">Productos</h3>
          <p class="mt-2 text-sm text-gray-600">
            Gestionar catálogo de productos
          </p>
        </a>

        <a
          routerLink="/customers"
          class="rounded-lg bg-white p-6 shadow hover:shadow-md"
        >
          <h3 class="text-lg font-semibold">Clientes</h3>
          <p class="mt-2 text-sm text-gray-600">
            Administrar clientes
          </p>
        </a>

        <a
          routerLink="/stock"
          class="rounded-lg bg-white p-6 shadow hover:shadow-md"
        >
          <h3 class="text-lg font-semibold">Stock</h3>
          <p class="mt-2 text-sm text-gray-600">
            Control de inventario
          </p>
        </a>

        <a
          routerLink="/caja"
          class="rounded-lg bg-white p-6 shadow hover:shadow-md"
        >
          <h3 class="text-lg font-semibold">Caja</h3>
          <p class="mt-2 text-sm text-gray-600">
            Gestión de caja
          </p>
        </a>

        <a
          routerLink="/sales"
          class="rounded-lg bg-white p-6 shadow hover:shadow-md"
        >
          <h3 class="text-lg font-semibold">Ventas</h3>
          <p class="mt-2 text-sm text-gray-600">
            Registrar y consultar ventas
          </p>
        </a>
      </div>
    </div>
  `,
})
export class DashboardPage {
  readonly authService = inject(AuthService);
}
