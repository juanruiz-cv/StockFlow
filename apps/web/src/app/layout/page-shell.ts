import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from './sidebar';

@Component({
  selector: 'app-page-shell',
  standalone: true,
  imports: [RouterOutlet, Sidebar],
  template: `
    <div class="flex h-screen">
      <app-sidebar />
      <main class="flex-1 overflow-auto bg-gray-50 p-6">
        <router-outlet />
      </main>
    </div>
  `,
})
export class PageShell {}
