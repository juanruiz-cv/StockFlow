export default {
  displayName: 'api',
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@stockflow/shared$': '<rootDir>/../../libs/shared/src/index.ts',
    '^@stockflow/shared/(.*)$': '<rootDir>/../../libs/shared/src/$1',
  },
  transform: {
    '^.+\\.(ts|js)$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: ['src/**/*.ts', '!src/main.ts', '!src/**/*.module.ts'],
};
