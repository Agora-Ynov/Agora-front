# AGORA — Contexte projet front-end

> Document de référence pour l'agent IA et les développeurs.
> Mis à jour au fur et à mesure de l'avancement.

---

## Présentation du projet

**AGORA** est un système de réservation de ressources municipales (salles, équipements, etc.).
Ce dépôt contient le **front-end Angular**.

- **Back-end** : API REST Spring Boot sur `http://localhost:8080` (dev)
- **Mailhog** (emails dev) : `http://localhost:8025`

---

## Stack technique

| Technologie | Version | Rôle |
|---|---|---|
| Angular | 17+ | Framework principal — standalone components |
| Angular Material | 17 | Composants UI accessibles |
| Angular Reactive Forms | — | Formulaires |
| Angular HttpClient + Interceptors | — | Appels API + auth |
| FullCalendar Angular | 6 | Calendrier public des créneaux |
| Jest | 29 | Tests unitaires (remplace Karma) |
| Cypress | 13 | Tests E2E |
| ESLint + Prettier | — | Qualité de code |
| TypeScript | strict mode | — |

---

## Architecture cible

```
src/
  app/
    core/           ← Services singleton, guards, interceptors (injectés une seule fois)
      auth/         ← AuthService, JwtService, modèles auth
      guards/       ← AuthGuard, RoleGuard, AdminGuard
      interceptors/ ← JwtInterceptor (Bearer token), ErrorInterceptor (401/403/409/500)
      api/          ← ApiService (wrapper HttpClient), modèles TypeScript des DTO
    shared/         ← Composants/pipes/directives réutilisables dans toute l'app
      components/   ← BadgeStatus, LoadingSpinner, ConfirmDialog, PageHeader, EmptyState
      pipes/        ← DateFr, StatusLabel, FileSize
      directives/   ← HasRole (*hasRole="'SECRETARY_ADMIN'")
    features/       ← Modules fonctionnels (lazy-loadable)
      home/
      auth/         ← login, register, activate (compte sous tutelle)
      reservation/  ← catalogue, slot-picker, booking-form, my-reservations, recurring-form
      documents/    ← upload drag & drop avec progress bar
      waitlist/
      groups/
      calendar/     ← calendrier public FullCalendar
      account/      ← profil, exemptions
      admin/        ← dashboard KPIs, users, reservations, payments, audit, config, exports
  environments/     ← environment.ts (dev), environment.prod.ts (prod)
```

---

## Rôles utilisateurs (back-end)

| Rôle | Description |
|---|---|
| `CITIZEN` | Citoyen connecté — peut réserver |
| `GUEST` | Réservation sans compte |
| `SECRETARY_ADMIN` | Secrétaire — accès admin complet |
| `DELEGATE_ADMIN` | Délégué — accès admin partiel |
| `TUTORED` | Compte sous tutelle (activé par email) |

La directive `*hasRole` et les guards `RoleGuard` / `AdminGuard` s'appuient sur les claims JWT.

---

## Flux d'authentification

1. `POST /api/auth/login` → reçoit `accessToken` (JWT) + `refreshToken`
2. `JwtInterceptor` attache `Authorization: Bearer {token}` à chaque requête (sauf login/register/refresh/activate)
3. `ErrorInterceptor` gère :
   - **401** → vide le storage, redirige `/login`
   - **403** → toastr "Accès refusé"
   - **409** → toastr avec le message du back (`ApiError.message`)
   - **422** → toastr avec les erreurs de validation
   - **500** → toastr "Erreur serveur, réessayez"
4. `AuthGuard` protège toutes les routes authentifiées
5. `AdminGuard` protège le préfixe `/admin` (rôle `SECRETARY_ADMIN` ou `DELEGATE_ADMIN`)

---

## Routes principales

| Chemin | Composant | Protection |
|---|---|---|
| `/` | HomeComponent | public |
| `/login` | LoginComponent | public |
| `/register` | RegisterComponent | public |
| `/activate` | ActivateComponent | public (token URL) |
| `/catalogue` | CatalogueComponent | public |
| `/calendar` | PublicCalendarComponent | public |
| `/reservations` | MyReservationsComponent | AuthGuard |
| `/reservations/new` | BookingFormComponent | AuthGuard |
| `/account/profile` | ProfileComponent | AuthGuard |
| `/account/groups` | GroupListComponent | AuthGuard |
| `/admin/dashboard` | AdminDashboardComponent | AuthGuard + AdminGuard |
| `/admin/users` | UserTableComponent | AuthGuard + AdminGuard |
| `/admin/users/:id` | UserDetailComponent | AuthGuard + AdminGuard |
| `/admin/reservations` | AdminReservationTableComponent | AuthGuard + AdminGuard |
| `/admin/payments` | PaymentTableComponent | AuthGuard + AdminGuard |
| `/admin/audit` | AuditLogTableComponent | AuthGuard + AdminGuard |
| `/admin/config` | DocumentRulesComponent | AuthGuard + AdminGuard |
| `/admin/exports` | ExportPanelComponent | AuthGuard + AdminGuard |

---

## Convention de commits (Conventional Commits)

Format : `type(module): description courte`

| Type | Usage |
|---|---|
| `feat` | Nouvelle fonctionnalité |
| `fix` | Correctif bug |
| `chore` | Dépendances, config, tooling |
| `test` | Tests unitaires |
| `docs` | Documentation, CHANGELOG |
| `refactor` | Refactoring sans impact fonctionnel |

---

## Modèle de branches Git

```
main        ← production stable — merge via PR uniquement, JAMAIS de push direct
develop     ← intégration continue — base de toutes les feature branches
feature/xxx ← une branche par fonctionnalité (ex: feature/auth, feature/reservation)
fix/xxx     ← hotfix (depuis main, merge double main + develop)
fix/deps-xxx← mise à jour dépendances
```

**Règle** : toujours partir de `develop` pour créer une `feature/xxx`.

---

## État d'avancement

### ✅ Fait (initialisation)
- [x] Projet Angular 17 initialisé (standalone components, routing, SCSS)
- [x] `src/environments/environment.ts` et `environment.prod.ts`
- [x] `.gitignore` complété (Cypress, .env, logs)
- [x] `CONTEXT.md` (ce fichier)

### 🔲 Étape 1 — Core & Auth
- [ ] `src/app/core/auth/auth.model.ts` — interfaces `User`, `TokenPayload`
- [ ] `src/app/core/auth/jwt.service.ts` — encode/décode/stocke le JWT
- [ ] `src/app/core/auth/auth.service.ts` — login, logout, register, refresh, getCurrentUser, hasRole, isImpersonating
- [ ] `src/app/core/interceptors/jwt.interceptor.ts` — attache Bearer token
- [ ] `src/app/core/interceptors/error.interceptor.ts` — gestion 401/403/409/422/500
- [ ] `src/app/core/guards/auth.guard.ts`
- [ ] `src/app/core/guards/role.guard.ts`
- [ ] `src/app/core/guards/admin.guard.ts`
- [ ] `src/app/core/api/api.service.ts` — wrapper HttpClient avec baseUrl
- [ ] `src/app/core/api/models/` — tous les modèles DTO (user, reservation, resource, document, group, payment, audit, paged-response, api-error)

### 🔲 Étape 2 — Shared
- [ ] `src/app/shared/components/badge-status/`
- [ ] `src/app/shared/components/loading-spinner/`
- [ ] `src/app/shared/components/confirm-dialog/`
- [ ] `src/app/shared/components/page-header/`
- [ ] `src/app/shared/components/empty-state/`
- [ ] `src/app/shared/pipes/date-fr.pipe.ts`
- [ ] `src/app/shared/pipes/status-label.pipe.ts`
- [ ] `src/app/shared/pipes/file-size.pipe.ts`
- [ ] `src/app/shared/directives/has-role.directive.ts`

### 🔲 Étape 3 — Routing principal
- [ ] `src/app/app.routes.ts` complet avec lazy loading et guards
- [ ] `src/app/app.config.ts` — provideRouter, provideHttpClient, interceptors

### 🔲 Étape 4 — Feature : Auth
- [ ] `login/login.component.ts` + `.html`
- [ ] `register/register.component.ts`
- [ ] `activate/activate.component.ts`

### 🔲 Étape 5 — Feature : Réservation
- [ ] `reservation.service.ts`
- [ ] `slot.service.ts`
- [ ] `catalogue/` — liste des ressources disponibles
- [ ] `slot-picker/` — sélection créneau
- [ ] `booking-form/` — formulaire réservation (connecté + invité)
- [ ] `my-reservations/` — mes réservations
- [ ] `recurring-form/` — réservation récurrente

### 🔲 Étape 6 — Feature : Documents
- [ ] `document.service.ts`
- [ ] `upload/document-upload.component.ts` + `.html` — drag & drop + progress

### 🔲 Étape 7 — Feature : Calendrier public
- [ ] Installer `@fullcalendar/angular` v6
- [ ] `calendar/public-calendar.component.ts`
- [ ] `calendar/calendar.service.ts`

### 🔲 Étape 8 — Feature : Groupes & Waitlist
- [ ] `groups/group-list.component.ts`
- [ ] `groups/group-detail.component.ts`
- [ ] `groups/membership-manager.component.ts`
- [ ] `groups/group.service.ts`
- [ ] `waitlist/waitlist-badge.component.ts`
- [ ] `waitlist/waitlist.service.ts`

### 🔲 Étape 9 — Feature : Compte utilisateur
- [ ] `account/profile.component.ts`
- [ ] `account/exemptions.component.ts`

### 🔲 Étape 10 — Feature : Admin
- [ ] `admin.service.ts` — toutes les méthodes admin
- [ ] `admin/dashboard/` — KPIs + alertes
- [ ] `admin/users/` — table, détail, tutored-form, activation-panel, impersonation-banner
- [ ] `admin/reservations/` — table + status-updater
- [ ] `admin/payments/` — table, status-updater, history
- [ ] `admin/audit/` — audit-log-table
- [ ] `admin/config/` — document-rules, quota-config, blackout-manager
- [ ] `admin/exports/` — export-panel

### 🔲 Étape 11 — Tests & Qualité
- [ ] Installer et configurer Jest 29 (`jest-preset-angular`, `setup-jest.ts`, `jest.config.js`)
- [ ] Installer et configurer Cypress 13
- [ ] `cypress/e2e/cy_reservation_invite.spec.cy.ts`
- [ ] `cypress/e2e/cy_impersonation_audit.spec.cy.ts`
- [ ] `cypress/e2e/cy_document_upload.spec.cy.ts`
- [ ] `cypress/e2e/cy_tutored_activation.spec.cy.ts`
- [ ] `cypress/e2e/cy_waitlist.spec.cy.ts`
- [ ] `cypress/support/commands.ts`

### 🔲 Étape 12 — CI/CD & Finalisation
- [ ] ESLint + Prettier configurés
- [ ] Mettre à jour `package.json` scripts (jest, cypress, lint, format)
- [ ] `angular.json` — ajouter fileReplacements pour prod
- [ ] README.md complet

---

## Variables d'environnement

Modifier `src/environments/environment.ts` pour le dev :

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080',
  mailhogUrl: 'http://localhost:8025'
};
```

---

## Commandes utiles

```bash
npm start             # Lance le serveur dev (nécessite le back sur :8080)
npm test              # Tests unitaires Jest
npm run test:coverage # Couverture Jest
npm run e2e           # Tests Cypress (back + front démarrés)
npm run lint          # ESLint
npm run format        # Prettier
npm run build:prod    # Build production
```
