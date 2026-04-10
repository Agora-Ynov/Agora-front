# Ticket D — Front : rôles réels (JWT + `/me`), vues admin / superadmin, fin des mocks locaux

## Objectif

1. **Ne plus s’appuyer sur des données bidon** là où l’API existe ou va exister : remplacer les tableaux en dur et les actions « mock » par des appels HTTP alignés sur `agora_api_endpoints_version_final.md` (et le client OpenAPI regénéré).
2. **Séparer les vues** selon le rôle : au minimum distinguer **citoyen**, **admin opérationnel** (`SECRETARY_ADMIN` / `DELEGATE_ADMIN` / futur `ADMIN_SUPPORT`), et **superadmin** (`SUPERADMIN`) pour les écrans `/api/superadmin/*`.
3. **Aligner le modèle de rôle** avec le JWT réel émis par le back (voir section « Écart JWT » ci‑dessous).

## Référence

- Spec : `Agora-back/agora_api_endpoints_version_final.md` (sections Auth, Admin, Superadmin).
- Back : tickets `Agora-back/docs/ticket-b-superadmin-role.md` et `Agora-back/docs/ticket-c-admin-support-api.md`.

---

## Fouille code — état actuel (à corriger progressivement)

### 1. Types et lecture du JWT

| Fichier | Constat |
|---------|--------|
| `src/app/core/auth/auth.model.ts` | **Fait (2026-04)** : `UserRole` inclut `SUPERADMIN` et `ADMIN_SUPPORT` ; `TokenPayload.roles?` pour les claims Spring. |
| `src/app/core/auth/jwt.service.ts` | **Fait** : lecture du claim **`roles[]`**, mapping `ROLE_*` → `UserRole`, rôle principal par priorité (`getEffectiveRoles()`). |
| Back JWT (`JwtService` Java) | Claim **`roles`** (liste) — aligné. |

**Suite** : exposer `ADMIN_SUPPORT` dans le JWT ou `/api/auth/me` quand le back le fera, pour que le menu admin reflète les comptes support hors simple `SECRETARY_ADMIN`.

### 2. Garde et « qui est admin »

| Fichier | Constat |
|---------|--------|
| `src/app/core/guards/admin.guard.ts` | `auth.isAdmin()` → `SECRETARY_ADMIN` ou `DELEGATE_ADMIN` uniquement. |
| `src/app/core/auth/auth.service.ts` | `isAdmin()` idem ; `mapUserProfile` prend `tokenRole` depuis `getPayload()?.role` — **fragile** si le token n’a que `roles[]`. |

**Action** : une fois les rôles JWT fiables, décider si **`ADMIN_SUPPORT`** doit avoir accès aux routes `/admin/**` (souvent oui, périmètre réduit) — mettre à jour `isAdmin()` ou introduire `isStaffAdmin()` / `canAccessAdminSpa()` selon la spec produit.

### 3. Données mockées / locales (priorité « ne pas mocker »)

| Fichier | Constat |
|---------|--------|
| `src/app/features/admin/reservations/admin-reservations.component.ts` | **`reservations = signal([...])`** : grande liste **en dur** (pas d’appel API). **À remplacer** par `GET /api/admin/reservations` (ou équivalent spec) + mapping DTO → vue. |
| `src/app/features/admin/dashboard/admin-dashboard.component.ts` | **Stats** et **réservations récentes** / **colonnes actus** en **dur** (`statCards`, `recentReservations`, etc.). **À remplacer** par stats API si dispo (`/api/admin/stats` ou agrégation) ou par compteurs calculés depuis listes réelles. |
| `src/app/features/admin/users/user-management-page.component.ts` | **GET** `/api/admin/users` : OK. En revanche **`AdminUserMockDto`** (nom), **`createUser()`** → id `mock-${Date.now()}` et mise à jour **locale** pour suspendre/réactiver **sans** PATCH/POST back. **À brancher** sur les endpoints admin réels quand disponibles. |
| `src/app/features/admin/audit/admin-audit-page.component.ts` | **forkJoin** `GET /api/admin/audit` + `GET /api/admin/users` — structure API-ready ; vérifier que le **format** `content` correspond au back (sinon adapter mapper). Pas de mock de liste si l’API répond. |
| `src/app/features/admin/groups/admin-groups.component.html` | Texte mentionnant **mocks** (ligne ~375) — mettre à jour quand tout est branché. |
| `src/app/features/reservation/catalogue/resource-pricing.utils.ts` | `user.role === 'SECRETARY_ADMIN' \|\| user.role === 'DELEGATE_ADMIN'` — **étendre** si nouveau rôle staff (`ADMIN_SUPPORT`) pour tarifs / badges. |
| `src/app/features/reservation/catalogue/resource-presentation.utils.ts` | Commentaires « mock » historiques — pas bloquant si l’API catalogue est la source. |
| `src/environments/environment*.ts` | `useMockAuth: false` — pas de mock auth global actif. |
| Tests | `catalogue.component.spec.ts` utilise des **mocks de test** Jest — normal ; ne pas confondre avec la prod. |

### 4. Superadmin : UI absente

- **Aucune route** `superadmin` ou `admin/support-users` dans `src/app/app.routes.ts` aujourd’hui.
- **Aucun appel** à `GET|POST|DELETE /api/superadmin/admin-support` dans le repo front.

**Action** : ajouter une zone **Superadmin** (layout + routes) visible **uniquement** si `hasRole('SUPERADMIN')` ou équivalent authorities, avec écran liste + actions promote/revoke branchées sur le back (après Ticket C back).

---

## Plan d’implémentation recommandé (ordre)

1. **Blocage 0 — JWT**  
   Corriger `JwtService` / `AuthService` pour lire **`roles`** du token et exposer `hasAuthority`, `primaryRole`, ou étendre `UserRole`. Mettre à jour `adminGuard` et `isAdmin()` en conséquence.

2. **Données admin**  
   Remplacer les **signals en dur** dans `admin-reservations` et le **dashboard** par des services qui appellent les routes documentées ; gérer chargement / erreur / vide.

3. **Utilisateurs**  
   Remplacer création / suspension / réactivation **locales** dans `user-management-page` par les verbes HTTP de la spec (ou désactiver le bouton avec message « non branché » jusqu’à ce que le back expose les routes).

4. **Superadmin**  
   Nouveau module minimal : liste `GET /api/superadmin/admin-support`, boutons promote / revoke avec confirmations, toasts erreurs 409, etc.

5. **OpenAPI**  
   Back démarré → `npm run openapi:fetch` → `npm run openapi:generate` ; corriger imports et types générés.

---

## Definition of Done (front)

- [ ] Aucune liste métier critique en **dur** dans `admin-reservations` et le **dashboard** (sauf fallback explicite « API indisponible » si vous gardez un mode dégradé documenté).
- [ ] Création / suspension utilisateur : soit **API réelle**, soit feature **masquée** tant que le back n’existe pas (éviter `mock-` en prod).
- [ ] `UserRole` (ou équivalent) couvre **`SUPERADMIN`** et **`ADMIN_SUPPORT`** si la spec / le JWT les prévoit.
- [ ] Route + garde pour **Superadmin** ; lien dans le menu **seulement** pour les bons rôles.
- [ ] `npm run build` vert ; tests Jest ajustés si nécessaire.

---

## Liens tickets back

- `Agora-back/docs/ticket-b-superadmin-role.md` — JWT `ROLE_SUPERADMIN`
- `Agora-back/docs/ticket-c-admin-support-api.md` — CRUD admin-support
