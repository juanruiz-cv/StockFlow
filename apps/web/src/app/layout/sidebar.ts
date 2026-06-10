import { Component, inject, computed, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { MENU_ITEMS } from './sidebar-item';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside
      class="flex h-full flex-col bg-gray-900 text-white transition-all"
      [class.w-64]="!collapsed()"
      [class.w-16]="collapsed()"
    >
      <div class="flex items-center justify-between p-4">
        @if (!collapsed()) {
          <span class="text-lg font-bold">StockFlow</span>
        }
        <button
          (click)="collapsed.set(!collapsed())"
          class="rounded p-1 hover:bg-gray-700"
        >
          {{ collapsed() ? '→' : '←' }}
        </button>
      </div>

      <nav class="flex-1 space-y-1 px-2">
        @for (item of visibleMenuItems(); track item.path) {
          <a
            [routerLink]="item.path"
            routerLinkActive="bg-gray-700"
            class="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-gray-700"
          >
            <span>{{ item.icon }}</span>
            @if (!collapsed()) {
              <span>{{ item.label }}</span>
            }
          </a>
        }
      </nav>

      <div class="border-t border-gray-700 p-4">
        <button
          (click)="authService.logout()"
          class="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-red-400 hover:bg-gray-700"
        >
          <span>🚪</span>
          @if (!collapsed()) {
            <span>Cerrar sesión</span>
          }
        </button>
      </div>
    </aside>
  `,
})
export class Sidebar {
  readonly authService = inject(AuthService);
  readonly collapsed = signal(false);

  readonly visibleMenuItems = computed(() => {
    const userPermissions = this.authService.permissions();
    if (userPermissions.length === 0) return MENU_ITEMS;
    return MENU_ITEMS.filter(
      (item) => !item.permission || userPermissions.includes(item.permission),
    );
  });
}
