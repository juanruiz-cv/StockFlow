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
          class="cursor-pointer rounded-lg border border-gray-100 bg-white p-6 shadow transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
        >
          <h3 class="flex items-center gap-2 text-lg font-semibold">
            <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-sm text-blue-600">⊞</span>
            Productos
          </h3>
          <p class="mt-2 text-sm text-gray-600">
            Gestionar catálogo de productos
          </p>
        </a>

        <a
          routerLink="/customers"
          class="cursor-pointer rounded-lg border border-gray-100 bg-white p-6 shadow transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
        >
          <h3 class="flex items-center gap-2 text-lg font-semibold">
            <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-sm text-blue-600">◉</span>
            Clientes
          </h3>
          <p class="mt-2 text-sm text-gray-600">
            Administrar clientes
          </p>
        </a>

        <a
          routerLink="/stock"
          class="cursor-pointer rounded-lg border border-gray-100 bg-white p-6 shadow transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
        >
          <h3 class="flex items-center gap-2 text-lg font-semibold">
            <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-sm text-blue-600">☰</span>
            Stock
          </h3>
          <p class="mt-2 text-sm text-gray-600">
            Control de inventario
          </p>
        </a>

        <a
          routerLink="/caja"
          class="cursor-pointer rounded-lg border border-gray-100 bg-white p-6 shadow transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
        >
          <h3 class="flex items-center gap-2 text-lg font-semibold">
            <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-sm text-blue-600">$</span>
            Caja
          </h3>
          <p class="mt-2 text-sm text-gray-600">
            Gestión de caja
          </p>
        </a>

        <a
          routerLink="/sales"
          class="cursor-pointer rounded-lg border border-gray-100 bg-white p-6 shadow transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
        >
          <h3 class="flex items-center gap-2 text-lg font-semibold">
            <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-sm text-blue-600">⌘</span>
            Ventas
          </h3>
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
