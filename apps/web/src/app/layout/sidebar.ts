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
      class="flex h-full flex-col bg-gray-900 text-white transition-all duration-300"
      [class.w-64]="!collapsed()"
      [class.w-16]="collapsed()"
    >
      <div class="flex items-center justify-between p-4">
        @if (!collapsed()) {
          <span class="text-lg font-bold">StockFlow</span>
        }
        <button
          (click)="collapsed.set(!collapsed())"
          class="cursor-pointer rounded p-1 transition-colors duration-200 hover:bg-gray-700"
        >
          {{ collapsed() ? '→' : '←' }}
        </button>
      </div>

      <nav class="flex-1 space-y-1 px-2">
        @for (item of visibleMenuItems(); track item.path) {
          <a
            [routerLink]="item.path"
            routerLinkActive="bg-blue-700 border-l-2 border-blue-400"
            class="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm transition-all duration-200 hover:bg-gray-700 active:scale-[0.98]"
            [attr.title]="collapsed() ? item.label : null"
          >
            <span class="inline-flex h-5 w-5 items-center justify-center text-sm">{{ item.icon }}</span>
            @if (!collapsed()) {
              <span>{{ item.label }}</span>
            }
          </a>
        }
      </nav>

      <div class="border-t border-gray-700 p-4">
        <button
          (click)="authService.logout()"
          class="flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-red-400 transition-all duration-200 hover:bg-gray-700 active:scale-[0.98]"
        >
          <span class="inline-flex h-5 w-5 items-center justify-center text-sm">&#10005;</span>
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
