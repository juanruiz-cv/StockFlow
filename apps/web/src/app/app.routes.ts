import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { LoginPage } from './core/auth/login.page';
import { PageShell } from './layout/page-shell';

export const routes: Routes = [
  { path: 'login', component: LoginPage },
  {
    path: '',
    component: PageShell,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage),
      },
      { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: '/dashboard' },
];
