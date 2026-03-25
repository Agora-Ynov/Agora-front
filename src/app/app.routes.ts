import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

// Temporary minimal routing kept to ensure the app stays runnable locally
// while feature branches for auth/home/calendar UIs are still incomplete.
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'catalogue',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/reservation/catalogue/catalogue.component').then(
        m => m.CatalogueComponent
      ),
  },
  {
    path: 'register',
    redirectTo: 'login',
  },
  {
    path: 'calendar',
    redirectTo: 'login',
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
