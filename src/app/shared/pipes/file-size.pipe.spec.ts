import { FileSizePipe } from './file-size.pipe';

describe('FileSizePipe', () => {
  const pipe = new FileSizePipe();

  it('retourne vide pour null/undefined/NaN', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform(Number.NaN)).toBe('');
  });

  it('0 octets', () => {
    expect(pipe.transform(0)).toBe('0 o');
  });

  it('Ko / Mo', () => {
    expect(pipe.transform(1024)).toContain('Ko');
    expect(pipe.transform(1024 * 1024)).toContain('Mo');
  });
});
