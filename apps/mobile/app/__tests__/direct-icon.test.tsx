// Must be first
jest.mock('lucide-react-native', () => {
  console.log('[test] lucide-react-native mock called');
  return {
    Activity: () => null,
    Bed: () => null,
    Camera: () => null,
    ChevronRight: () => null,
    Dumbbell: () => null,
    Image: () => null,
    Scale: () => null,
    Target: () => null,
    TrendingUp: () => null,
    Utensils: () => null,
    User: () => null,
    Zap: () => null,
    AlertTriangle: () => null,
  };
});

import { Activity, User, TrendingUp, Upload } from 'lucide-react-native';

describe('Direct import test', () => {
  it('should have icons defined', () => {
    console.log('Activity:', Activity);
    console.log('User:', User);
    console.log('TrendingUp:', TrendingUp);
    console.log('Upload:', Upload);
    expect(typeof Activity).toBe('function');
    expect(typeof User).toBe('function');
    expect(typeof TrendingUp).toBe('function');
    expect(typeof Upload).toBe('function');
  });
});
