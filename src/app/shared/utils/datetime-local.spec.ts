import {
  normalizeToHourMinute,
  parseQueryDateTimeLocalToValue,
  toDateTimeLocalValue,
} from './datetime-local';

describe('datetime-local utils', () => {
  describe('normalizeToHourMinute', () => {
    it('normalise HH:mm et HH:mm:ss', () => {
      expect(normalizeToHourMinute('9:05')).toBe('09:05');
      expect(normalizeToHourMinute('09:05:30')).toBe('09:05');
    });

    it('rejette les entrées invalides', () => {
      expect(normalizeToHourMinute('')).toBeNull();
      expect(normalizeToHourMinute('25:00')).toBeNull();
      expect(normalizeToHourMinute('12:99')).toBeNull();
    });
  });

  describe('toDateTimeLocalValue', () => {
    it('combine date ISO et heure', () => {
      expect(toDateTimeLocalValue('2026-04-08', '14:30')).toBe('2026-04-08T14:30');
    });

    it('rejette date ou heure invalide', () => {
      expect(toDateTimeLocalValue('08-04-2026', '14:30')).toBeNull();
      expect(toDateTimeLocalValue('2026-04-08', 'bad')).toBeNull();
    });
  });

  describe('parseQueryDateTimeLocalToValue', () => {
    it('accepte espace ou T comme séparateur', () => {
      expect(parseQueryDateTimeLocalToValue('2026-04-08 14:30')).toBe('2026-04-08T14:30');
      expect(parseQueryDateTimeLocalToValue('2026-04-08T14:30')).toBe('2026-04-08T14:30');
    });

    it('retourne null sans séparateur date/heure', () => {
      expect(parseQueryDateTimeLocalToValue('2026-04-08')).toBeNull();
    });
  });
});
