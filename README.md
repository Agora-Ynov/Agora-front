# AGORA — Frontend Angular

Interface web du projet AGORA (réservations, administration, catalogue).

## Prérequis

- Node.js **20 LTS** recommandé (Stryker / Jest avec `jest-preset-angular` : éviter Node **24** tant que la chaîne Stryker n’est pas validée sur ta machine).
- `npm install`

## Tests

```bash
npm test
npm run test:coverage
```

### Couverture HTML / LCOV

Après `npm run test:coverage` :

- Rapport HTML : `coverage/lcov-report/index.html`
- `coverage/lcov.info` (pour Sonar, CI, etc.)

Les seuils Jest (`jest.config.js`) sont fixés à **≥90 %** (lignes, statements, fonctions) et **≥85 %** branches sur le périmètre **`src/app/shared`** (pipes, directives, utilitaires, pied de page), hors client OpenAPI généré.

### Tests de mutation (Stryker)

```bash
npm run test:mutation
```

Rapport : `reports/mutation/mutation.html` (dossier listé dans `.gitignore`).

Le fichier `jest.stryker.config.js` limite l’exécution aux tests `shared` pour réduire la durée et les problèmes de workers. Les seuils (`stryker.conf.mjs`, `break` ~65 %) sont volontairement **stricts mais atteignables** ; monte-les quand tu renforces les tests (objectif long terme **≥85 %** score de mutation sur ce périmètre).

## Build

```bash
npm run build
```

## Affichage « Mes réservations »

La liste paginée (`/reservations`) utilise `bookingReference` lorsque l’API la renvoie ; l’identifiant technique UUID n’est pas affiché sous le titre de la ressource.
