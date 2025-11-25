module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Rutas de test
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],

  // Transform con nueva sintaxis (sin globals)
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: true }],
  },

  // Coverage
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/server.ts', '!src/swagger.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],

  // Alias
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },

  // Setup global
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],

  // Tiempo
  testTimeout: 30000,
  verbose: true,

  // Para ESM en TypeScript
  extensionsToTreatAsEsm: ['.ts'],
};
