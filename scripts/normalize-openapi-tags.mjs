/**
 * Springdoc + openapi-generator : le tag « Réservations » peut produire une classe « Rservations ».
 * Normalise le tag en ASCII jusqu'à alignement complet backend (voir ReservationsController).
 */
import { readFileSync, writeFileSync } from 'fs';

const path = new URL('../openapi/agora-openapi.json', import.meta.url);
const j = JSON.parse(readFileSync(path, 'utf8'));

function walk(o) {
  if (!o || typeof o !== 'object') {
    return;
  }
  if (Array.isArray(o)) {
    o.forEach(walk);
    return;
  }
  for (const k of Object.keys(o)) {
    if (k === 'tags' && Array.isArray(o[k])) {
      o[k] = o[k].map(t => (t === 'Réservations' ? 'Reservations' : t));
    } else {
      walk(o[k]);
    }
  }
}

walk(j);
if (j.tags) {
  j.tags = j.tags.map(t => ({
    ...t,
    name: t.name === 'Réservations' ? 'Reservations' : t.name,
  }));
}

writeFileSync(path, `${JSON.stringify(j, null, 2)}\n`);
