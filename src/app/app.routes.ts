import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'catalogue',
  },
  {
    path: 'catalogue',
    loadComponent: () =>
      import('./features/reservation/catalogue/catalogue.component').then(
        m => m.CatalogueComponent
      ),
  },
  {
    path: 'login',
    redirectTo: 'catalogue',
  },
  {
    path: 'register',
    redirectTo: 'catalogue',
  },
  {
    path: 'calendar',
    redirectTo: 'catalogue',
  },
  {
    path: '**',
    redirectTo: 'catalogue',
  },
];
