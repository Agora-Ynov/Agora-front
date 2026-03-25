module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testMatch: ['**/src/**/*.spec.ts'],
  collectCoverageFrom: [
    'src/app/**/*.ts',
    '!src/app/**/*.model.ts',
    '!src/app/**/*.module.ts',
    '!src/main.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 70,
      lines: 70,
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
