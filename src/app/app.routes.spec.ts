import { routes } from './app.routes';

describe('routes', () => {
  it('should redirect root path to catalogue', () => {
    expect(routes[0]).toMatchObject({
      path: '',
      pathMatch: 'full',
      redirectTo: 'catalogue',
    });
  });

  it('should expose the catalogue route', async () => {
    const catalogueRoute = routes.find(route => route.path === 'catalogue');

    expect(catalogueRoute).toBeDefined();
    expect(catalogueRoute?.loadComponent).toBeDefined();

    const loadedComponent = await catalogueRoute?.loadComponent?.();

    expect(loadedComponent).toBeDefined();
  });

  it('should redirect unknown routes to catalogue', () => {
    const fallbackRoute = routes[routes.length - 1];

    expect(fallbackRoute).toMatchObject({
      path: '**',
      redirectTo: 'catalogue',
    });
  });
});
