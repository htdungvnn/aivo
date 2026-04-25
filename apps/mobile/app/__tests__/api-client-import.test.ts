import { createApiClient } from '@aivo/api-client';

describe('ApiClient Import Test', () => {
  it('should import createApiClient', () => {
    expect(createApiClient).toBeDefined();
  });
});
