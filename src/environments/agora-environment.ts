/**
 * Contrat commun dev / prod pour éviter les oublis de champs (ex. `debugCalendar`)
 * et les erreurs TS lors du `ng serve`.
 */
export interface AgoraEnvironment {
  production: boolean;
  /** Logs optionnels (calendrier, etc.) — désactivé en prod. */
  debugCalendar: boolean;
  apiUrl: string;
  mailhogUrl: string;
  useMockAuth: boolean;
}
