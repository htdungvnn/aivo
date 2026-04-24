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
    Upload: MockIcon,
    Zap: MockIcon,
    AlertTriangle: MockIcon,
  };
});

import React from 'react';
import { render } from '@testing-library/react-native';
import * as lucide from 'lucide-react-native';

// Test that lucide-react-native mock is working
describe('Lucide mock test', () => {
  it('should import icons correctly', () => {
    console.log('Lucide imports:', lucide);
    expect(lucide.Activity).toBeDefined();
    expect(lucide.User).toBeDefined();
    expect(lucide.Upload).toBeDefined();
  });
});
