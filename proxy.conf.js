/**
 * Proxy → API sur l’hôte (même valeur que `BACKEND_PORT` dans Agora-back/.env, pas le 8080 du conteneur).
 * Vérifie avec : `docker compose ps` (colonne PORTS du service backend).
 * Exemples : 8080, 8081 (défaut compose sans .env), 8082… — sinon :
 *   AGORA_BACKEND_URL=http://127.0.0.1:<port> npm start
 */
const target = process.env.AGORA_BACKEND_URL || 'http://127.0.0.1:8082';

module.exports = {
  '/api': {
    target,
    secure: false,
    changeOrigin: true,
    logLevel: 'debug',
  },
  '/v3/api-docs': {
    target,
    secure: false,
    changeOrigin: true,
    logLevel: 'debug',
  },
};
