import { Routes } from '@angular/router';

export const adminRoutes: Routes = [
  {
    path: 'users',
    loadComponent: () =>
      import('./user-list.page').then((m) => m.UserListPage),
  },
  {
    path: 'users/new',
    loadComponent: () =>
      import('./user-form.page').then((m) => m.UserFormPage),
  },
  {
    path: 'users/:id',
    loadComponent: () =>
      import('./user-form.page').then((m) => m.UserFormPage),
  },
  {
    path: 'roles',
    loadComponent: () =>
      import('./role-list.page').then((m) => m.RoleListPage),
  },
  {
    path: 'roles/new',
    loadComponent: () =>
      import('./role-form.page').then((m) => m.RoleFormPage),
  },
  {
    path: 'roles/:id',
    loadComponent: () =>
      import('./role-form.page').then((m) => m.RoleFormPage),
  },
];
