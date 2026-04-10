# Synchronisation du client API (OpenAPI)

Le contrat HTTP officiel est le document OpenAPI produit par le back (`/v3/api-docs`), aligné avec `Agora-back/agora_api_endpoints_version_final.md`.

## Prérequis

- Dépôt `Agora-back` à jour (chemins relatiques ou variables ci-dessous).

## Commandes

| Script | Rôle |
|--------|------|
| `npm run openapi:fetch` | Récupère `/v3/api-docs` depuis un back **déjà démarré** (`BACKEND_PORT`, défaut `8082`), puis normalise les tags. |
| `npm run openapi:import-from-back-tests` | Lance `OpenApiExportTest` dans le back (profil test, H2) et copie `target/agora-openapi-export.json` vers `openapi/agora-openapi.json`. **Recommandé** pour un contrat reproductible sans serveur manuel. |
| `npm run openapi:generate` | Régénère `src/app/core/api/**` via `openapi-generator` (TypeScript Angular). |
| `npm run openapi:sync` | `import-from-back-tests` + `generate`. |

### Variables d’environnement (import depuis les tests)

- `AGORA_BACK_DIR` : chemin absolu du dépôt back (défaut : `../Agora-back`).
- `AGORA_FRONT_DIR` : chemin absolu du dépôt front (défaut : `../Agora-front`).

Exemple :

```bash
cd /chemin/vers/Agora-front
AGORA_BACK_DIR=/chemin/vers/Agora-back AGORA_FRONT_DIR=/chemin/vers/Agora-front npm run openapi:sync
```

## Fichiers conservés hors générateur

Le fichier `src/app/core/api/.openapi-generator-ignore` exclut certaines façades manuelles (ex. `calendar.service.ts`, `resource.service.ts`). Après une régénération, vérifier les imports et `app.config` si de nouveaux services apparaissent.

## Normalisation

`scripts/normalize-openapi-tags.mjs` corrige le tag « Réservations » pour éviter des noms de classe incorrects côté générateur.
