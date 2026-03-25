import { routes } from './app.routes';

describe('routes', () => {
  it('should redirect root path to login', () => {
    expect(routes[0]).toMatchObject({
      path: '',
      pathMatch: 'full',
      redirectTo: 'login',
    });
  });

  it('should expose the login route', async () => {
    const loginRoute = routes.find(route => route.path === 'login');

    expect(loginRoute).toBeDefined();
    expect(loginRoute?.loadComponent).toBeDefined();

    const loadedComponent = await loginRoute?.loadComponent?.();

    expect(loadedComponent).toBeDefined();
  });

  it('should expose the register route', async () => {
    const registerRoute = routes.find(route => route.path === 'register');

    expect(registerRoute).toBeDefined();
    expect(registerRoute?.loadComponent).toBeDefined();

    const loadedComponent = await registerRoute?.loadComponent?.();

    expect(loadedComponent).toBeDefined();
  });

  it('should expose the catalogue route', async () => {
    const catalogueRoute = routes.find(route => route.path === 'catalogue');

    expect(catalogueRoute).toBeDefined();
    expect(catalogueRoute?.loadComponent).toBeDefined();

    const loadedComponent = await catalogueRoute?.loadComponent?.();

    expect(loadedComponent).toBeDefined();
  });

  it('should redirect unknown routes to login', () => {
    const fallbackRoute = routes[routes.length - 1];

    expect(fallbackRoute).toMatchObject({
      path: '**',
      redirectTo: 'login',
    });
  });
});
