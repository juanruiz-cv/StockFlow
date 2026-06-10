import { Routes } from '@angular/router';

export const cajaRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./session.page').then((m) => m.SessionPage),
  },
  {
    path: 'movements',
    loadComponent: () =>
      import('./movement-list.page').then((m) => m.MovementListPage),
  },
];
