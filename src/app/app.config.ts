import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter, withComponentInputBinding, withRouterConfig } from '@angular/router';
import { routes } from './app.routes';
import { provideApi } from './core/api/provide-api';
import { BASE_PATH } from './core/api/variables';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { jwtInterceptor } from './core/interceptors/jwt.interceptor';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      withComponentInputBinding(),
      /** Permet `navigateByUrl(url, { onSameUrlNavigation: 'reload' })` pour ré-exécuter les resolvers (ex. audit). */
      withRouterConfig({ onSameUrlNavigation: 'reload' })
    ),
    provideHttpClient(withInterceptors([jwtInterceptor, errorInterceptor])),
    /** Aligné sur `environment.apiUrl` : chaîne vide en dev → URLs relatives `/api/...` (proxy ng serve). */
    { provide: BASE_PATH, useValue: environment.apiUrl },
    provideApi({
      basePath: environment.apiUrl,
      withCredentials: true,
    }),
    provideAnimations(),
  ],
};
