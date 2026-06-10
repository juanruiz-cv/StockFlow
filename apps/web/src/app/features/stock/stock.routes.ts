import { Routes } from '@angular/router';

export const stockRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./stock.page').then((m) => m.StockPage),
  },
  {
    path: 'movements',
    loadComponent: () =>
      import('./movement-list.page').then((m) => m.MovementListPage),
  },
  {
    path: 'movement/new',
    loadComponent: () =>
      import('./movement-form.page').then((m) => m.MovementFormPage),
  },
];
