import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/home/home.component').then(m => m.HomeComponent),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register.component').then(m => m.RegisterComponent),
  },
  {
    path: 'catalogue',
    loadComponent: () =>
      import('./features/reservation/catalogue/catalogue.component').then(
        m => m.CatalogueComponent
      ),
  },
  {
    path: 'catalogue/:id/reserver',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/reservation/booking-form/booking-form.component').then(
        m => m.BookingFormComponent
      ),
  },
  {
    path: 'catalogue/:id',
    loadComponent: () =>
      import('./features/reservation/resource-detail/resource-detail.component').then(
        m => m.ResourceDetailComponent
      ),
  },
  {
  path: 'admin/resources',
  canActivate: [adminGuard],
  loadComponent: () =>
    import('./features/admin/resources/resource-management.component').then(
      m => m.ResourceManagementComponent
    ),
 },
  {
    path: 'admin/users',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/users/user-management-page.component').then(
        m => m.UserManagementPageComponent
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
    path: 'unauthorized',
    loadComponent: () =>
      import('./features/auth/unauthorized/unauthorized.component').then(
        m => m.UnauthorizedComponent
      ),
  },
  {
    path: 'calendar',
    redirectTo: '',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
