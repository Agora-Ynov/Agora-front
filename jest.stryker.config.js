/**
 * Config Jest dédiée à Stryker : moins de workers, périmètre restreint pour limiter les soucis
 * Node récents / zone.js dans les workers.
 */
const base = require('./jest.config.js');

module.exports = {
  ...base,
  maxWorkers: 1,
  testMatch: [
    '<rootDir>/src/app/shared/**/*.spec.ts',
  ],
  collectCoverageFrom: base.collectCoverageFrom,
};
