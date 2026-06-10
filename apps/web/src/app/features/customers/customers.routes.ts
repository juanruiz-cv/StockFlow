import { Routes } from '@angular/router';

export const customersRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./customer-list.page').then((m) => m.CustomerListPage),
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./customer-form.page').then((m) => m.CustomerFormPage),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./customer-form.page').then((m) => m.CustomerFormPage),
  },
];
