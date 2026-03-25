import { appConfig } from './app.config';

describe('appConfig', () => {
  it('should provide router and http client configuration', () => {
    expect(appConfig.providers).toBeDefined();
    expect(Array.isArray(appConfig.providers)).toBe(true);
    expect(appConfig.providers?.length).toBeGreaterThan(0);
  });
});
