import { Routes } from '@angular/router';
import { adminAuditResolver } from './features/admin/audit/admin-audit.resolver';
import { adminGuard } from './core/guards/admin.guard';
import { adminRootRedirectGuard } from './core/guards/admin-root-redirect.guard';
import { authGuard } from './core/guards/auth.guard';
import { staffHomeRedirectGuard } from './core/guards/staff-home-redirect.guard';
import { superadminGuard } from './core/guards/superadmin.guard';

export const routes: Routes = [
  {
    path: '',
    canActivate: [staffHomeRedirectGuard],
    loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent),
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
    path: 'auth/activate',
    loadComponent: () =>
      import('./features/auth/activate-account/activate-account.component').then(
        m => m.ActivateAccountComponent
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
    path: 'admin/reservations',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/reservations/admin-reservations.component').then(
        m => m.AdminReservationsComponent
      ),
  },
  {
    path: 'admin/resources',
    canActivate: [adminGuard],
    data: { allowDelegate: true },
    loadComponent: () =>
      import('./features/admin/resources/resource-management.component').then(
        m => m.ResourceManagementComponent
      ),
  },
  {
    path: 'admin/affiliations',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/affiliations/admin-affiliations.component').then(
        m => m.AdminAffiliationsComponent
      ),
  },
  {
    path: 'admin/audit',
    canActivate: [adminGuard],
    /** Données fraîches à chaque entrée sur la route (y compris retour depuis autre écran admin). */
    runGuardsAndResolvers: 'always',
    resolve: { auditBundle: adminAuditResolver },
    loadComponent: () =>
      import('./features/admin/audit/admin-audit-page.component').then(
        m => m.AdminAuditPageComponent
      ),
  },
  {
    path: 'admin/blackouts',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/blackouts/admin-blackouts.component').then(
        m => m.AdminBlackoutsComponent
      ),
  },
  {
    path: 'admin/groups',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/groups/admin-groups.component').then(m => m.AdminGroupsComponent),
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
    path: 'account/affiliation-request',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/account/affiliation-request.component').then(
        m => m.AffiliationRequestComponent
      ),
  },
  {
    path: 'account/waitlist',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/waitlist/waitlist-page.component').then(m => m.WaitlistPageComponent),
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
    pathMatch: 'full',
    canActivate: [adminRootRedirectGuard],
    loadComponent: () =>
      import('./features/admin/admin-root-stub.component').then(m => m.AdminRootStubComponent),
  },
  {
    path: 'superadmin/admin-support',
    canActivate: [superadminGuard],
    loadComponent: () =>
      import('./features/superadmin/superadmin-admin-support-page.component').then(
        m => m.SuperadminAdminSupportPageComponent
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
    loadComponent: () =>
      import('./features/calendar/availability-calendar.component').then(
        m => m.AvailabilityCalendarComponent
      ),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
