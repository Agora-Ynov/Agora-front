export const environment = {
  production: false,
  /** Logs console pour le calendrier (désactivé en prod). */
  debugCalendar: true,
  /**
   * Chaîne vide en dev : les appels vont vers `/api/...` sur l’origine du `ng serve`
   * (ex. http://localhost:4200) et le **proxy** (`proxy.conf.js`) relaie vers le back.
   * Évite le CORS et évite les URLs invalides — ne jamais mettre `host:port` sans `http://`.
   * Si tu dois cibler l’API sans proxy : `http://127.0.0.1:8082` (avec le schéma).
   */
  apiUrl: '',
  mailhogUrl: 'http://localhost:8025',
  useMockAuth: false,
};
