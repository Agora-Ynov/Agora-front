# Notes de version — Agora (front)

Document transmissible récapitulant les évolutions récentes de l’application Angular **agora-front**. Les éléments fonctionnels correspondent au code présent sur la branche d’intégration (ex. `develop`) au moment de cette rédaction.

## Qualité et outillage

- **Prettier** : formatage homogène sur `src/**/*.ts` et `src/**/*.html`, aligné sur la vérification CI (`prettier --check`).
- **Lint** : respect des règles ESLint Angular (égalités strictes dans les templates, absence de `console` non justifié hors blocs dev).

## Authentification et comptes

- Parcours **login / register / activation** branché sur l’API OpenAPI générée.
- **Jeton JWT** : gestion via intercepteur et garde d’accès aux routes protégées.
- Rôles : garde **admin**, **superadmin** et directives/outils associés selon le profil renvoyé par le backend.

## Réservations (utilisateur)

- **Catalogue** : liste des ressources, filtres (famille, disponibilité, etc.), **réinitialisation des filtres** ; affichage des tarifs et indicateurs (dont **tarif de location** lorsque renseigné côté API).
- **Formulaire de réservation** : création simple et invité ; envoi des créneaux au format attendu par l’API (chaînes pour les heures afin d’éviter les problèmes de sérialisation `LocalTime`).
- **Mes réservations** : liste / détail avec rechargement cohérent après retour de flux (ex. paramètres de requête après création).
- **Calendrier de disponibilités** : consultation des créneaux et réservation depuis le calendrier.
- **Liste d’attente** : intégration des endpoints waitlist côté UI.

## Administration

- **Tableau de bord** : statistiques synthétiques (données admin stats / dashboard).
- **Réservations admin** : liste, filtrage et mise à jour de statuts / paiements selon les DTO admin.
- **Groupes admin** : création, mise à jour, membres (API admin groups).
- **Utilisateurs admin** : gestion des comptes, tutelles, activation, impersonation (bannière dédiée).
- **Ressources** : gestion CRUD côté UI ; affichage **tarif de location** lorsque `rentalPriceCents` est défini ; cartographique des champs accessibilité / étiquettes alignés sur le backend.
- **Blackouts**, **affiliations**, **paiements** : écrans dédiés branchés sur les services admin.
- **Audit** : consultation des entrées d’audit administrateur.

## Super-admin

- **Support administrateur** : promotion / gestion des comptes admin support (écran superadmin), conformément aux endpoints `superadmin` / support.

## Client API (OpenAPI)

- Client TypeScript **généré** sous `src/app/core/api/` (services et modèles), avec éventuelles **couches de façade** (`resource.service`, etc.) pour le mapping vers les modèles UI.
- Après régénération OpenAPI, conserver le **format Prettier** sur les fichiers générés pour que la CI reste verte.

## Dernières retouches (lot courant)

- **Catalogue** : traces `console` limitées au **mode développement** (`isDevMode`) pour faciliter le diagnostic (chargement API, filtrage des ressources sans id).
- **Admin — ressources** : affichage du bloc « Tarif location » avec condition stricte `!== null && !== undefined` (conformité template ESLint).

---

_Pour toute release, compléter une entrée datée ou versionnée (semver) en tête de fichier si le projet adopte un numéro de version publié._
