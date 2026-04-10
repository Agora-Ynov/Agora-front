/**
 * Valeurs pour <input type="datetime-local"> : date/heure locale sans offset, format HTML5.
 */

/** Accepte HH:mm ou HH:mm:ss (évent. secondes depuis l’API). */
export function normalizeToHourMinute(timePart: string): string | null {
  const trimmed = timePart.trim();
  const match = /^(\d{1,2}):(\d{2})(?::\d{1,2})?/.exec(trimmed);
  if (!match) {
    return null;
  }
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) {
    return null;
  }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * @param isoDate date calendaire YYYY-MM-DD (locale, même référent que le back LocalDate)
 * @param timePart heure HH:mm ou HH:mm:ss
 */
export function toDateTimeLocalValue(isoDate: string, timePart: string): string | null {
  const d = isoDate.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    return null;
  }
  const hm = normalizeToHourMinute(timePart);
  if (!hm) {
    return null;
  }
  return `${d}T${hm}`;
}

/**
 * Reprend une valeur issue des query params (ex. calendrier) et la normalise pour l’input.
 */
export function parseQueryDateTimeLocalToValue(value: string): string | null {
  const normalized = value.trim().replace(' ', 'T');
  const tIndex = normalized.indexOf('T');
  if (tIndex === -1) {
    return null;
  }
  const datePart = normalized.slice(0, tIndex);
  const timePart = normalized.slice(tIndex + 1);
  return toDateTimeLocalValue(datePart, timePart);
}
