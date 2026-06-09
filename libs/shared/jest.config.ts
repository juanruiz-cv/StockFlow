export default {
  displayName: 'shared',
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|js)$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
};
