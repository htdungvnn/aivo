import type { BodyMetric } from '@aivo/shared-types';
import { createApiClient } from '@aivo/api-client';

describe('Import scope test', () => {
  it('should import types', () => {
    const metric: BodyMetric = { id: '1', userId: 'u', timestamp: 1 };
    expect(metric.id).toBe('1');
  });

  it('should import api-client', () => {
    expect(createApiClient).toBeDefined();
  });
});
