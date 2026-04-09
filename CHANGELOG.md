# Journal des changements — AGORA (frontend)

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/).

## [Non publié] — 2026-04

### Ajouté

- **Client API** : régénération / extension OpenAPI (services admin : audit, blackouts, exports, groupes, paiements, réservations, statistiques, utilisateurs ; authentification ; groupes « publics » ; documents de réservation ; liste d’attente ; super-admin ; calendrier et ressources alignés backend).
- **Super-admin** : garde de route et espace dédié pour les parcours réservés à ce rôle.
- **Activation de compte** : parcours dédié après inscription lorsque le backend l’exige.
- **Admin ressources** : saisie du **tarif de location** (euros → centimes), sélection des **équipements / accessibilité** via cases à cocher (plus de saisie libre incohérente), affichage du tarif sur les cartes lorsqu’il est renseigné, champ **URL d’image**.
- **Cartographie groupes / tarifs** : utilitaires pour exploiter les infos de groupes de l’API dans le catalogue (remises, libellés).

### Modifié

- **Catalogue** : affichage des prix et libellés « à confirmer » clarifiés lorsque le tarif catalogue ou les remises groupes le justifient ; libellé de réinitialisation des filtres explicite.
- **Réservation** : envoi des créneaux `slotStart` / `slotEnd` en **chaînes** (compatibilité JSON backend / Jackson) ; formulaire et flux réservation alignés.
- **Mes réservations** : rechargement fiable lors du retour avec paramètres de requête (ex. `?created=…`), libellés de timeline caution moins ambigus.
- **Calendrier de disponibilité** : ajustements UI / logique pour rester cohérent avec l’API.
- **Fiche ressource** : cohérence avec `rentalPriceCents` et présentation.
- **Espace admin** : utilisateurs, groupes, réservations, audit, tableau de bord (styles et comportements) ; intercepteurs JWT / erreurs et garde admin affinés.
- **Profil / connexion** : champs et flux alignés avec les réponses `AuthMe` enrichies.

### Corrigé

- **Lint** : comparaisons strictes dans les templates Angular (`!==` via helper) ; suppression des `console.*` de debug dans le catalogue pour respecter ESLint en CI.

### Tests

- Suites Jest mises à jour (catalogue, détail ressource, routes) ; `npm run lint`, `npm test` et `ng build` (production) validés localement.

---

*Les versions suivantes reprendront un numéro sémantique lors des releases taguées.*
