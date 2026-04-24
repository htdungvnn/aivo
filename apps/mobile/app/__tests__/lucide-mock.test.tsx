// Must be first - hoisted to top by Jest
jest.mock('lucide-react-native', () => {
  function MockIcon(props) {
    return null;
  }
  return {
    Activity: MockIcon,
    Bed: MockIcon,
    Camera: MockIcon,
    ChevronRight: MockIcon,
    Dumbbell: MockIcon,
    Image: MockIcon,
    Scale: MockIcon,
    Target: MockIcon,
    TrendingUp: MockIcon,
    Utensils: MockIcon,
    User: MockIcon,
    Zap: MockIcon,
    AlertTriangle: MockIcon,
  };
});

import React from 'react';
import { render } from '@testing-library/react-native';

// Test that lucide-react-native mock is working
describe('Lucide mock test', () => {
  it('should import icons correctly', async () => {
    const lucide = await import('lucide-react-native');
    console.log('Lucide imports:', lucide);
    expect(lucide.Activity).toBeDefined();
    expect(lucide.User).toBeDefined();
  });
});
