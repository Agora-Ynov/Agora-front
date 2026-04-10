import { routes } from './app.routes';

describe('routes', () => {
  it('should expose the home route on root path', async () => {
    expect(routes[0]?.path).toBe('');

    expect(routes[0]?.loadComponent).toBeDefined();
    const loadedComponent = await routes[0]?.loadComponent?.();
    expect(loadedComponent).toBeDefined();
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

  it('should expose the resource detail route', async () => {
    const detailRoute = routes.find(route => route.path === 'catalogue/:id');

    expect(detailRoute).toBeDefined();
    expect(detailRoute?.loadComponent).toBeDefined();

    const loadedComponent = await detailRoute?.loadComponent?.();

    expect(loadedComponent).toBeDefined();
  });

  it('should redirect unknown routes to root', () => {
    const fallbackRoute = routes[routes.length - 1];

    expect(fallbackRoute?.path).toBe('**');
    expect(fallbackRoute?.redirectTo).toBe('');
  });
});
