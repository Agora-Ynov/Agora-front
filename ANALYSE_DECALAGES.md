# AGORA — Analyse des décalages : Maquette vs Cahiers Technique & Fonctionnel

> Document généré le 23/03/2026  
> Source maquette : `C:\Users\aminech\Downloads\agora-file` (React 18 + Tailwind)  
> Référence : `agora_cahier_technique_v3.docx` + `agora_cahier_fonctionnel_v2.docx`

---

## 1. Stack technique — Décalage majeur

| | Maquette | Cahiers (référence) |
|---|---|---|
| Framework | React 18 + React Router 7 | **Angular 17+** |
| UI | Radix UI + Tailwind CSS v4 | **Angular Material 17** |
| Auth | localStorage + Context API | **JWT + Spring Security** |
| Email | SMTP générique | **Brevo SDK** (spécifique) |

> ⚠️ La maquette est en React — notre projet est bien en Angular.  
> La maquette sert uniquement de **référence visuelle et fonctionnelle**, pas technique.

---

## 2. Rôles — Décalages

| Rôle | Maquette | Cahier fonctionnel |
|---|---|---|
| Visiteur invité | ✅ | ✅ |
| Utilisateur autonome | ✅ `"utilisateur"` | ✅ `AUTONOMOUS` |
| Utilisateur sous tutelle | ✅ `autonomie: false` | ✅ `TUTORED` |
| Secrétaire-Admin | ✅ `"secretaire"` | ✅ |
| Administrateur | ✅ `"administrateur"` | ✅ |
| **Manager de groupe** | ❌ ABSENT | ✅ Acteur distinct |
| **Admin délégué** | ❌ ABSENT | ✅ Agent mairie à périmètre défini |

**Action requise :** ajouter les rôles `DELEGATE_ADMIN` et `GROUP_MANAGER` dans `user.model.ts` et les guards Angular.

---

## 3. Compte sous tutelle — Décalages significatifs

| Champ | Maquette | Cahier fonctionnel |
|---|---|---|
| Identifiant interne | `"user-tutelle-1"` (ID générique) | Format `PERR-1948-042` (NOM + année + séquentiel 3 chiffres) |
| Date de naissance | ❌ ABSENT | ✅ Obligatoire (lever les homonymes) |
| Adresse postale | ❌ ABSENT | ✅ Optionnel |
| Notes internes admin | ❌ ABSENT | ✅ Non visible par l'usager |
| Fiche imprimable PDF | ❌ ABSENT | ✅ Remise en main propre au guichet |
| Recherche par identifiant interne | ❌ ABSENT | ✅ Saisie dans la barre de recherche admin |

**Format identifiant interne :**
```
[4 lettres NOM] - [année naissance] - [séquentiel 3 chiffres]
Exemple : PERR-1948-042
```

**Action requise :**
- Ajouter dans `user.model.ts` : `dateOfBirth`, `postalAddress`, `internalId`, `adminNotes`
- Mettre à jour `tutored-form.component` pour afficher ces champs
- Ajouter une recherche par identifiant interne dans `user-table.component`

---

## 4. Activation autonome — Totalement absent de la maquette

Le cahier fonctionnel décrit un flux complet en 7 étapes :

1. L'admin ouvre le compte sous tutelle → clique **"Activer le compte en autonomie"**
2. Il saisit l'adresse email de la personne (1ère fois qu'un email est enregistré)
3. Le système envoie un lien Brevo à usage unique (expiration **72h**)
4. La personne reçoit : *"Votre espace AGORA est prêt — définissez votre mot de passe"*
5. Elle clique le lien → page de création de mot de passe (règles de sécurité affichées)
6. Compte passe de `TUTORED` → `AUTONOMOUS`
7. Tout l'historique est conservé intégralement (réservations, PJ, groupes, exonérations)

**Ce qui est conservé lors de l'activation :**

| Donnée | Conservée ? |
|---|---|
| Historique des réservations | ✅ Intégral |
| Pièces jointes (métadonnées) | ✅ Même supprimées (deleted_at) |
| Flags d'exonération | ✅ Restent actifs |
| Appartenance aux groupes | ✅ |
| Journal d'audit | ✅ Toutes les actions admin consultables |
| Identifiant interne | ✅ Conservé comme référence (non affiché à l'utilisateur) |
| Notes internes admin | ✅ Visibles uniquement par les admins |

**Dans la maquette :** juste un toggle `autonomie: boolean`, aucun flux d'activation.

**Action requise :**
- `activation-panel.component` → bouton "Activer le compte en autonomie" + saisie email
- `activate.component` (page `/activate`) → formulaire création mot de passe depuis le lien Brevo
- `AccountActivationService` côté back → lien usage unique 72h + régénération si expiré

---

## 5. Statuts de paiement — Décalages

| Code maquette | Code cahier technique | Présent maquette |
|---|---|---|
| `a_regler` | `DEPOSIT_PENDING` | ✅ |
| `reglee` | `DEPOSIT_PAID` | ✅ |
| `dispensee` | `EXEMPT` | ✅ (partiel) |
| ❌ ABSENT | `WAIVED` — dispensé sans exonération formelle | ❌ |
| ❌ ABSENT | `REFUNDED` — remboursé après annulation | ❌ |

**Transitions autorisées (cahier technique) :**
```
DEPOSIT_PENDING → DEPOSIT_PAID  (paiement reçu au guichet)
DEPOSIT_PENDING → EXEMPT        (flag exonération attribué)
DEPOSIT_PENDING → WAIVED        (dispense secrétaire, décision manuelle)
DEPOSIT_PAID    → REFUNDED      (annulation après paiement)
```

**Action requise :** mettre à jour `payment.model.ts` avec `WAIVED` et `REFUNDED`.

---

## 6. Fonctionnalités complètes absentes de la maquette

| Fonctionnalité | Maquette | Cahiers | Dans notre structure Angular |
|---|---|---|---|
| **Réservations récurrentes** (SF-03) | ❌ listé évolution | ✅ | ✅ `recurring-form/` vide |
| **Liste d'attente** (SF-04) | ❌ | ✅ | ✅ `waitlist/` vide |
| **Calendrier public** (SF-07.3) | ❌ listé évolution | ✅ | ✅ `calendar/` vide |
| **Rappel J-1 automatique** (SF-08) | ❌ | ✅ back-end @Scheduled | Config dans settings |
| **Blackout dates** (SF-07) | ❌ | ✅ | ✅ `blackout-manager/` vide |
| **Quotas** (SF-07.5) | ❌ | ✅ | ✅ `quota-config/` vide |
| **Export CSV/PDF** (SF-07.4) | ❌ | ✅ | ✅ `export-panel/` vide |
| **QR code dans emails** (SF-07.8) | ❌ | ✅ ZXing back-end | Géré côté back |
| **Attributs accessibilité ressources** (SF-07.7) | ❌ | ✅ 6 attributs | Absent des modèles |
| **Dashboard statistiques avancé** (SF-07.11) | Partiel | ✅ | Partiel dans `admin-dashboard/` |
| **Suspension / blacklist comptes** (SF-07.12) | ❌ | ✅ | Absent |
| **Notifications rappel configurables** (SF-07.10) | ❌ | ✅ | Absent |

### Détail — Attributs accessibilité ressources (SF-07.7)

Chaque ressource doit être taguée et filtrable dans le catalogue :

| Attribut | Code | Affichage catalogue |
|---|---|---|
| Accès PMR | `PMR_ACCESS` | Icône fauteuil roulant |
| Parking à proximité | `PARKING` | Icône parking |
| Sonorisation intégrée | `SOUND_SYSTEM` | Icône micro |
| Vidéo / Projecteur intégré | `PROJECTOR` | Icône écran |
| Cuisine équipée | `KITCHEN` | Icône cuisine |
| Accès direct rue | `STREET_ACCESS` | Icône porte |

**Action requise :** ajouter `accessibilityFeatures: AccessibilityFeature[]` dans `resource.model.ts` + filtres dans `catalogue.component`.

### Détail — Réservation récurrente (SF-03)

| Paramètre | Type | Exemple |
|---|---|---|
| Fréquence | `WEEKLY / BIWEEKLY / MONTHLY` | `WEEKLY` |
| Jour de la semaine | `Lundi..Dimanche` | Mardi |
| Dates début / fin | `date..date` | 01/04/2026 au 30/06/2026 |
| Dates à exclure | liste de dates | 08/04/2026 (jour férié) |
| Nb max occurrences | entier | 52 (sécurité) |

Chaque occurrence = réservation indépendante liée par `recurringGroupId`.  
Annulation possible : "cette occurrence seulement" ou "toutes les occurrences à venir".

### Détail — Liste d'attente (SF-04)

1. Créneau occupé → le système propose "Rejoindre la liste d'attente"
2. L'utilisateur est inscrit en position N
3. Si annulation de la réservation occupante → email Brevo au 1er de la file : *"Le créneau est libre — vous avez 24h pour confirmer"*
4. Si confirmation dans les 24h → réservation créée. Sinon → passe au suivant.

### Détail — Quotas (SF-07.5)

| Type de quota | Exemple | Application |
|---|---|---|
| Max réservations / mois / utilisateur | 3 par mois | Bloqué à la 4ème tentative |
| Max réservations / mois / groupe | 10 par mois | Tous membres confondus |
| Max durée par réservation | 4h | Salle des fêtes max 4h en semaine |
| Délai minimum avant réservation | 48h | Pas de rés. la veille pour même jour |
| Délai max avant réservation | 90 jours | Pas de rés. à plus de 3 mois |

---

## 7. Pages présentes dans la maquette mais absentes de notre structure Angular

| Page maquette | Route maquette | Statut dans notre projet Angular |
|---|---|---|
| **AdminResourcesPage** — CRUD admin ressources | `/admin/ressources` | ❌ **MANQUANT** — seul le catalogue public existe |
| **ResourceDetailPage** — détail d'une ressource | `/ressource/:id` | ❌ **MANQUANT** dans notre structure |
| **DashboardPage** — tableau de bord utilisateur | `/tableau-de-bord` | ❌ **MANQUANT** — on a `profile` + `exemptions` mais pas de dashboard utilisateur |

**Actions requises :**
```
src/app/features/admin/resources/
  admin-resources.component.ts
  admin-resources.component.html

src/app/features/reservation/resource-detail/
  resource-detail.component.ts
  resource-detail.component.html

src/app/features/account/dashboard/
  dashboard.component.ts
  dashboard.component.html
```

---

## 8. Exonérations — Nomenclature à aligner

| Maquette (React) | Cahier technique | À utiliser dans Angular |
|---|---|---|
| `critereSocial` | `SOCIAL` | `SOCIAL` |
| `mandatElectif` | `MANDATE` | `MANDATE` |
| `association` | `ASSOCIATION` | `ASSOCIATION` |

**Action requise :** s'assurer que les enums Angular utilisent `SOCIAL` et `MANDATE` (pas camelCase).

---

## 9. Modèles Angular à compléter

### `user.model.ts`

```typescript
// À ajouter
dateOfBirth?: string;          // obligatoire pour TUTORED
postalAddress?: string;        // optionnel pour TUTORED
internalId?: string;           // format PERR-1948-042, généré par le back
adminNotes?: string;           // notes internes, non visibles par l'usager
accountStatus: AccountStatus;  // PENDING_VALIDATION | ACTIVE | INACTIVE | SUSPENDED | REJECTED
```

### `payment.model.ts`

```typescript
// États manquants
WAIVED = 'WAIVED',     // dispensé sans exonération formelle
REFUNDED = 'REFUNDED'  // remboursé après annulation
```

### `resource.model.ts`

```typescript
// À ajouter
accessibilityFeatures: AccessibilityFeature[]; // PMR_ACCESS, PARKING, etc.
slots?: ResourceSlot[];                         // créneaux disponibles
```

### `user.model.ts` — Rôles

```typescript
// À ajouter
| 'DELEGATE_ADMIN'   // admin délégué à périmètre défini
| 'GROUP_MANAGER'    // manager de groupe
```

---

## 10. Récapitulatif des actions prioritaires

### Priorité haute (bloquant pour la cohérence back/front)

- [ ] Aligner `payment.model.ts` — ajouter `WAIVED` et `REFUNDED`
- [ ] Aligner `user.model.ts` — ajouter `dateOfBirth`, `internalId`, `adminNotes`, `DELEGATE_ADMIN`, `GROUP_MANAGER`
- [ ] Aligner `resource.model.ts` — ajouter `accessibilityFeatures`
- [ ] Créer `admin/resources/` (CRUD admin ressources manquant)
- [ ] Créer `reservation/resource-detail/` (page détail ressource manquante)
- [ ] Créer `account/dashboard/` (tableau de bord utilisateur manquant)
- [ ] Mettre à jour `app.routes.ts` avec les routes manquantes

### Priorité moyenne (fonctionnalités SF à implémenter)

- [ ] `activate.component` — flux complet activation autonome (lien Brevo 72h)
- [ ] `activation-panel.component` — bouton + saisie email + régénération lien
- [ ] `tutored-form.component` — champs `dateOfBirth`, `postalAddress`, `internalId`, `adminNotes`
- [ ] `catalogue.component` — filtres accessibilité (PMR, parking, etc.)
- [ ] `user-table.component` — recherche par identifiant interne `PERR-1948-042`

### Priorité basse (fonctionnalités complémentaires)

- [ ] `recurring-form.component` — SF-03 réservations récurrentes
- [ ] `waitlist/` — SF-04 liste d'attente
- [ ] `calendar/` — SF-07.3 calendrier public FullCalendar
- [ ] `blackout-manager.component` — SF-07 fermetures/blackout
- [ ] `quota-config.component` — SF-07.5 quotas
- [ ] `export-panel.component` — SF-07.4 exports CSV/PDF
- [ ] `admin-dashboard` — SF-07.11 statistiques avancées
- [ ] Suspension / blacklist comptes — SF-07.12

---

*Document de référence — à mettre à jour au fur et à mesure de l'implémentation.*
