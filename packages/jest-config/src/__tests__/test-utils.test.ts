/// <reference types="jest" />
import { describe, it, expect } from '@jest/globals';

// Shared test utilities verification
describe('Test Utilities', () => {
  it('should export factory functions', async () => {
    const factories = await import('@aivo/jest-config/test-utils/factories');
    expect(factories.userFactory).toBeDefined();
    expect(factories.sessionFactory).toBeDefined();
    expect(factories.bodyMetricsFactory).toBeDefined();
    expect(factories.workoutFactory).toBeDefined();
  });

  it('should export mock functions', async () => {
    const mocks = await import('@aivo/jest-config/test-utils/mocks');
    expect(mocks.createMockDb).toBeDefined();
    expect(mocks.createMockR2).toBeDefined();
    expect(mocks.createMockKv).toBeDefined();
  });

  it('should export helper functions', async () => {
    const helpers = await import('@aivo/jest-config/test-utils/helpers');
    expect(helpers.createMockContext).toBeDefined();
    expect(helpers.createMockRequest).toBeDefined();
    expect(helpers.assertResponse).toBeDefined();
    expect(helpers.assertErrorResponse).toBeDefined();
  });
});

describe('Factory Output Validation', () => {
  it('userFactory generates valid user data', () => {
    const { userFactory } = require('@aivo/jest-config/test-utils/factories');
    const user = userFactory();
    expect(user.id).toBeDefined();
    expect(user.email).toContain('@');
    expect(['google', 'facebook']).toContain(user.provider);
    expect(user.createdAt).toBeLessThanOrEqual(Date.now() / 1000);
  });

  it('bodyMetricsFactory generates valid metrics', () => {
    const { bodyMetricsFactory } = require('@aivo/jest-config/test-utils/factories');
    const metrics = bodyMetricsFactory();
    expect(metrics.id).toBeDefined();
    expect(metrics.userId).toBeDefined();
    expect(metrics.weight).toBeGreaterThan(0);
    expect(metrics.bodyFatPercentage).toBeGreaterThan(0);
    expect(metrics.bodyFatPercentage).toBeLessThan(1);
  });

  it('workoutFactory generates valid workout', () => {
    const { workoutFactory } = require('@aivo/jest-config/test-utils/factories');
    const workout = workoutFactory();
    expect(workout.id).toBeDefined();
    expect(workout.userId).toBeDefined();
    expect(['beginner', 'intermediate', 'advanced']).toContain(workout.difficulty);
    expect(workout.exercises.length).toBeGreaterThan(0);
  });
});
