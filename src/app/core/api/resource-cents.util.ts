/**
 * Normalise une valeur « centimes » depuis l'API (nombre JSON, chaîne numérique ou absente).
 */
export function normalizeCentsInput(value: unknown): number | null {
  if (value == null) {
    return null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.round(value) : null;
  }
  if (typeof value === 'string') {
    const t = value.trim();
    if (t === '') {
      return null;
    }
    const n = Number(t);
    return Number.isFinite(n) ? Math.round(n) : null;
  }
  return null;
}
