module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'miniflare',
  roots: ['<rootDir>/src', '<rootDir>/__tests__'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.json',
      useESM: true,
      isolatedModules: true
    }]
  },
  moduleNameMapper: {
    '^@aivo/(.*)$': '<rootDir>/../$1/src'
  }
};
