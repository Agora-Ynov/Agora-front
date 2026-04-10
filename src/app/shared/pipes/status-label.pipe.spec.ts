import { StatusLabelPipe } from './status-label.pipe';

describe('StatusLabelPipe', () => {
  const pipe = new StatusLabelPipe();

  it('retourne vide pour valeur vide', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform('')).toBe('');
  });

  it('mappe un statut connu', () => {
    expect(pipe.transform('CONFIRMED')).toBe('Confirmée');
  });

  it('retourne la valeur brute si inconnue', () => {
    expect(pipe.transform('CUSTOM_X')).toBe('CUSTOM_X');
  });
});
