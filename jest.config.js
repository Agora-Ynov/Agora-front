module.exports = {
  preset: 'jest-preset-angular',
  /** Réduit le bruit : résumé + détails uniquement en cas d'échec */
  silent: true,
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testMatch: ['**/src/**/*.spec.ts'],
  collectCoverageFrom: [
    'src/app/**/*.ts',
    '!src/app/**/*.model.ts',
    '!src/app/**/*.module.ts',
    '!src/app/core/api/**',
    '!src/main.ts',
  ],
  // Hors client OpenAPI généré : seuils réalistes pour les specs Jest actuelles.
  coverageThreshold: {
    global: {
      branches: 4,
      functions: 9,
      lines: 11,
      statements: 11,
    },
  },
  coverageReporters: ['html', 'lcov', 'json-summary', 'text'],
  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$',
      },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$)'],
  moduleNameMapper: {
    '^@environments/(.*)$': '<rootDir>/src/environments/$1',
    '^@app/(.*)$': '<rootDir>/src/app/$1',
    '^@shared/(.*)$': '<rootDir>/src/app/shared/$1',
    '^@core/(.*)$': '<rootDir>/src/app/core/$1',
  },
};
