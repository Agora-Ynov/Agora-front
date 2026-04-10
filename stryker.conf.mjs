// @ts-check
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  packageManager: 'npm',
  testRunner: 'jest',
  reporters: ['html', 'clear-text', 'progress'],
  // `perTest` + workers peut échouer avec certaines versions de Node / zone.js (voir doc Stryker).
  coverageAnalysis: 'all',
  jest: {
    configFile: 'jest.stryker.config.js',
    projectType: 'custom',
  },
  mutate: [
    'src/app/shared/pipes/**/*.ts',
    'src/app/shared/utils/**/*.ts',
    '!**/*.spec.ts',
  ],
  thresholds: {
    high: 85,
    low: 62,
    break: 65,
  },
  concurrency: 2,
  timeoutMS: 120_000,
};

export default config;
