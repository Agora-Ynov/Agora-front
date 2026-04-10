module.exports = {
  preset: 'jest-preset-angular',
  /** Réduit le bruit : résumé + détails uniquement en cas d'échec */
  silent: true,
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testMatch: ['**/src/**/*.spec.ts'],
  testPathIgnorePatterns: ['<rootDir>/.stryker-tmp/', '/node_modules/'],
  collectCoverageFrom: [
    'src/app/shared/pipes/**/*.ts',
    'src/app/shared/directives/**/*.ts',
    'src/app/shared/utils/**/*.ts',
    'src/app/shared/components/site-footer/**/*.ts',
    '!**/*.spec.ts',
  ],
  /** Seuils élevés sur le périmètre « shared » (hors API générée, hors gros composants de navigation). */
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90,
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
