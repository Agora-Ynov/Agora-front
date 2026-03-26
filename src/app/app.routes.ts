import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';
import { authGuard } from './core/guards/auth.guard';

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
    path: 'catalogue/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/reservation/resource-detail/resource-detail.component').then(
        m => m.ResourceDetailComponent
      ),
  },
  {
    path: 'account',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/account/profile.component').then(m => m.ProfileComponent),
  },
  {
    path: 'reservations',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/reservation/my-reservations/my-reservations.component').then(
        m => m.MyReservationsComponent
      ),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/dashboard/admin-dashboard.component').then(
        m => m.AdminDashboardComponent
      ),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register.component').then(m => m.RegisterComponent),
  },
  {
    path: 'unauthorized',
    loadComponent: () =>
      import('./features/auth/unauthorized/unauthorized.component').then(
        m => m.UnauthorizedComponent
      ),
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
