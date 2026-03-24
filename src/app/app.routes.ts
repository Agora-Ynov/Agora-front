import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

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
      import('./features/auth/register/register.component').then(
        m => m.RegisterComponent
      ),
  },
  {
    path: 'activate',
    loadComponent: () =>
      import('./features/auth/activate/activate.component').then(
        m => m.ActivateComponent
      ),
  },
  {
    path: 'catalogue',
    loadComponent: () =>
      import('./features/reservation/catalogue/catalogue.component').then(
        m => m.CatalogueComponent
      ),
  },
  {
    path: 'calendar',
    loadComponent: () =>
      import('./features/calendar/public-calendar.component').then(
        m => m.PublicCalendarComponent
      ),
  },
  {
    path: 'reservations',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import(
            './features/reservation/my-reservations/my-reservations.component'
          ).then(m => m.MyReservationsComponent),
      },
      {
        path: 'new',
        loadComponent: () =>
          import(
            './features/reservation/booking-form/booking-form.component'
          ).then(m => m.BookingFormComponent),
      },
    ],
  },
  {
    path: 'account',
    canActivate: [authGuard],
    children: [
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/account/profile.component').then(
            m => m.ProfileComponent
          ),
      },
      {
        path: 'groups',
        loadComponent: () =>
          import('./features/groups/group-list.component').then(
            m => m.GroupListComponent
          ),
      },
    ],
  },
  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import(
            './features/admin/dashboard/admin-dashboard.component'
          ).then(m => m.AdminDashboardComponent),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./features/admin/users/user-table.component').then(
            m => m.UserTableComponent
          ),
      },
      {
        path: 'users/:id',
        loadComponent: () =>
          import('./features/admin/users/user-detail.component').then(
            m => m.UserDetailComponent
          ),
      },
      {
        path: 'reservations',
        loadComponent: () =>
          import(
            './features/admin/reservations/admin-reservation-table.component'
          ).then(m => m.AdminReservationTableComponent),
      },
      {
        path: 'payments',
        loadComponent: () =>
          import('./features/admin/payments/payment-table.component').then(
            m => m.PaymentTableComponent
          ),
      },
      {
        path: 'audit',
        loadComponent: () =>
          import('./features/admin/audit/audit-log-table.component').then(
            m => m.AuditLogTableComponent
          ),
      },
      {
        path: 'config',
        loadComponent: () =>
          import('./features/admin/config/document-rules.component').then(
            m => m.DocumentRulesComponent
          ),
      },
      {
        path: 'exports',
        loadComponent: () =>
          import('./features/admin/exports/export-panel.component').then(
            m => m.ExportPanelComponent
          ),
      },
    ],
  },
  {
    path: 'unauthorized',
    loadComponent: () =>
      import('./features/home/home.component').then(m => m.HomeComponent),
  },
  { path: '**', redirectTo: '' },
];
