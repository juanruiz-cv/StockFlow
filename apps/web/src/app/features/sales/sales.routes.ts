import { Routes } from '@angular/router';

export const salesRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./sale-history.page').then((m) => m.SaleHistoryPage),
  },
  {
    path: 'pos',
    loadComponent: () =>
      import('./pos.page').then((m) => m.PosPage),
  },
];
