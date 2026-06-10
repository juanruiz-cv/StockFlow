import { Routes } from '@angular/router';

export const productsRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./product-list.page').then((m) => m.ProductListPage),
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./product-form.page').then((m) => m.ProductFormPage),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./product-form.page').then((m) => m.ProductFormPage),
  },
];
