import { DateFrPipe } from './date-fr.pipe';

describe('DateFrPipe', () => {
  const pipe = new DateFrPipe();

  it('retourne vide pour null/undefined', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
  });

  it('retourne vide pour date invalide', () => {
    expect(pipe.transform('invalid')).toBe('');
  });

  it('formate short par défaut', () => {
    const s = pipe.transform('2026-04-08T12:00:00.000Z', 'short');
    expect(s).toMatch(/08/);
    expect(s).toMatch(/2026/);
  });

  it('formate long / time / datetime', () => {
    const d = new Date('2026-04-08T14:30:00');
    expect(pipe.transform(d, 'long')).toContain('2026');
    expect(pipe.transform(d, 'time')).toMatch(/\d{1,2}:\d{2}/);
    expect(pipe.transform(d, 'datetime')).toMatch(/08/);
  });
});
