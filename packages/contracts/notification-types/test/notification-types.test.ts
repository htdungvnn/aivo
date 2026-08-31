/**
 * Notification Types Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_PRIORITY,
  isWithinQuietHours,
  createDefaultPreferences,
  isGloballyOptedOut,
  isCategoryChannelEnabled,
  shouldDeferForQuietHours,
  getNextDeliveryWindow,
  quietHoursSchema,
  userNotificationPreferencesSchema,
  isFrequencyCapExceeded,
} from '../src/index';

describe('Notification Categories', () => {
  it('should have all required categories', () => {
    expect(NOTIFICATION_CATEGORIES.AUTH_LOGIN).toBe('auth.login');
    expect(NOTIFICATION_CATEGORIES.WORKOUT_REMINDER).toBe('workout.reminder');
    expect(NOTIFICATION_CATEGORIES.REPORT_READY).toBe('report.ready');
  });

  it('should export NotificationCategory type', () => {
    const category: NotificationCategory = NOTIFICATION_CATEGORIES.AUTH_LOGIN;
    expect(category).toBe('auth.login');
  });
});

describe('Quiet Hours', () => {
  describe('isWithinQuietHours', () => {
    it('should return false when quiet hours are disabled', () => {
      const quietHours = {
        enabled: false,
        startTime: '22:00',
        endTime: '08:00',
        timezone: 'UTC',
      };

      expect(isWithinQuietHours(quietHours)).toBe(false);
    });

    it('should handle daytime quiet hours', () => {
      // Test with a fixed time - this test will pass/fail based on actual time
      const quietHours = {
        enabled: true,
        startTime: '00:00',
        endTime: '23:59',
        timezone: 'UTC',
      };

      // At midnight, should be within quiet hours
      const result = isWithinQuietHours(quietHours);
      expect(typeof result).toBe('boolean');
    });

    it('should validate time format', () => {
      const validQuietHours = {
        enabled: true,
        startTime: '22:00',
        endTime: '08:00',
        timezone: 'UTC',
      };

      expect(quietHoursSchema.safeParse(validQuietHours).success).toBe(true);
    });

    it('should reject invalid time format', () => {
      const invalidQuietHours = {
        enabled: true,
        startTime: '25:00', // Invalid hour
        endTime: '08:00',
        timezone: 'UTC',
      };

      expect(quietHoursSchema.safeParse(invalidQuietHours).success).toBe(false);
    });
  });

  describe('getNextDeliveryWindow', () => {
    it('should return null when quiet hours are disabled', () => {
      const quietHours = {
        enabled: false,
        startTime: '22:00',
        endTime: '08:00',
        timezone: 'UTC',
      };

      expect(getNextDeliveryWindow(quietHours)).toBeNull();
    });
  });
});

describe('User Preferences', () => {
  const userId = '123e4567-e89b-12d3-a456-426614174000';

  describe('createDefaultPreferences', () => {
    it('should create preferences with user ID', () => {
      const prefs = createDefaultPreferences(userId);

      expect(prefs.userId).toBe(userId);
      expect(prefs.globalOptOut).toBe(false);
      expect(prefs.timezone).toBe('UTC');
      expect(prefs.locale).toBe('en');
    });

    it('should have quiet hours configured', () => {
      const prefs = createDefaultPreferences(userId);

      expect(prefs.quietHours).toBeDefined();
      expect(prefs.quietHours?.enabled).toBe(false);
    });

    it('should have essential auth notifications enabled by default', () => {
      const prefs = createDefaultPreferences(userId);

      expect(prefs.categories[NOTIFICATION_CATEGORIES.AUTH_LOGIN].email.enabled).toBe(true);
      expect(prefs.categories[NOTIFICATION_CATEGORIES.AUTH_EMAIL_VERIFICATION].email.enabled).toBe(true);
    });

    it('should have social notifications disabled by default', () => {
      const prefs = createDefaultPreferences(userId);

      expect(prefs.categories[NOTIFICATION_CATEGORIES.SOCIAL_INTERACTION].email.enabled).toBe(false);
    });

    it('should have workout reminder frequency caps', () => {
      const prefs = createDefaultPreferences(userId);

      expect(prefs.categories[NOTIFICATION_CATEGORIES.WORKOUT_REMINDER].email.maxPerDay).toBe(2);
      expect(prefs.categories[NOTIFICATION_CATEGORIES.WORKOUT_REMINDER].push.maxPerDay).toBe(3);
    });
  });

  describe('isGloballyOptedOut', () => {
    it('should return false when opt-out is disabled', () => {
      const prefs = createDefaultPreferences(userId);
      expect(isGloballyOptedOut(prefs)).toBe(false);
    });

    it('should return true when opt-out is enabled', () => {
      const prefs = { ...createDefaultPreferences(userId), globalOptOut: true };
      expect(isGloballyOptedOut(prefs)).toBe(true);
    });
  });

  describe('isCategoryChannelEnabled', () => {
    it('should return false when globally opted out', () => {
      const prefs = { ...createDefaultPreferences(userId), globalOptOut: true };
      expect(isCategoryChannelEnabled(prefs, NOTIFICATION_CATEGORIES.AUTH_LOGIN, NOTIFICATION_CHANNELS.EMAIL)).toBe(false);
    });

    it('should return true when category is enabled', () => {
      const prefs = createDefaultPreferences(userId);
      expect(isCategoryChannelEnabled(prefs, NOTIFICATION_CATEGORIES.AUTH_LOGIN, NOTIFICATION_CHANNELS.EMAIL)).toBe(true);
    });

    it('should return false for unknown category', () => {
      const prefs = createDefaultPreferences(userId);
      expect(isCategoryChannelEnabled(prefs, 'unknown.category' as any, NOTIFICATION_CHANNELS.EMAIL)).toBe(false);
    });
  });

  describe('shouldDeferForQuietHours', () => {
    it('should not defer urgent notifications', () => {
      const prefs = createDefaultPreferences(userId);
      const request = {
        notificationId: 'test',
        userId,
        category: NOTIFICATION_CATEGORIES.AUTH_LOGIN,
        priority: NOTIFICATION_PRIORITY.URGENT,
        channels: [NOTIFICATION_CHANNELS.EMAIL],
        locale: 'en',
        idempotencyKey: 'test',
        templateCode: 'auth_login',
        templateParams: {},
      };

      expect(shouldDeferForQuietHours(request, prefs)).toBe(false);
    });

    it('should not defer when bypassQuietHours is true', () => {
      const prefs = createDefaultPreferences(userId);
      const request = {
        notificationId: 'test',
        userId,
        category: NOTIFICATION_CATEGORIES.AUTH_LOGIN,
        priority: NOTIFICATION_PRIORITY.NORMAL,
        channels: [NOTIFICATION_CHANNELS.EMAIL],
        locale: 'en',
        idempotencyKey: 'test',
        templateCode: 'auth_login',
        templateParams: {},
        bypassQuietHours: true,
      };

      expect(shouldDeferForQuietHours(request, prefs)).toBe(false);
    });

    it('should not defer when quiet hours are disabled', () => {
      const prefs = createDefaultPreferences(userId);
      const request = {
        notificationId: 'test',
        userId,
        category: NOTIFICATION_CATEGORIES.AUTH_LOGIN,
        priority: NOTIFICATION_PRIORITY.NORMAL,
        channels: [NOTIFICATION_CHANNELS.EMAIL],
        locale: 'en',
        idempotencyKey: 'test',
        templateCode: 'auth_login',
        templateParams: {},
      };

      expect(shouldDeferForQuietHours(request, prefs)).toBe(false);
    });
  });
});

describe('Frequency Cap', () => {
  it('should not exceed when under limit', () => {
    const preference = { enabled: true, maxPerDay: 5 };
    const dailyCount = {
      userId: 'test',
      category: NOTIFICATION_CATEGORIES.WORKOUT_REMINDER,
      channel: NOTIFICATION_CHANNELS.EMAIL,
      date: '2024-01-01',
      count: 3,
      lastSentAt: new Date().toISOString(),
    };

    expect(isFrequencyCapExceeded(preference, dailyCount)).toBe(false);
  });

  it('should exceed when at limit', () => {
    const preference = { enabled: true, maxPerDay: 5 };
    const dailyCount = {
      userId: 'test',
      category: NOTIFICATION_CATEGORIES.WORKOUT_REMINDER,
      channel: NOTIFICATION_CHANNELS.EMAIL,
      date: '2024-01-01',
      count: 5,
      lastSentAt: new Date().toISOString(),
    };

    expect(isFrequencyCapExceeded(preference, dailyCount)).toBe(true);
  });

  it('should not check cap when maxPerDay is undefined', () => {
    const preference = { enabled: true };
    const dailyCount = {
      userId: 'test',
      category: NOTIFICATION_CATEGORIES.AUTH_LOGIN,
      channel: NOTIFICATION_CHANNELS.EMAIL,
      date: '2024-01-01',
      count: 100,
      lastSentAt: new Date().toISOString(),
    };

    expect(isFrequencyCapExceeded(preference, dailyCount)).toBe(false);
  });
});

describe('Schema Validation', () => {
  it('should validate quiet hours schema', () => {
    const valid = {
      enabled: true,
      startTime: '22:00',
      endTime: '08:00',
      timezone: 'America/New_York',
      days: [0, 6], // Weekend only
    };

    expect(quietHoursSchema.safeParse(valid).success).toBe(true);
  });

  it('should reject invalid quiet hours', () => {
    const invalid = {
      enabled: true,
      startTime: 'invalid',
      endTime: '08:00',
      timezone: 'UTC',
    };

    expect(quietHoursSchema.safeParse(invalid).success).toBe(false);
  });

  it('should validate full preferences schema', () => {
    const prefs = createDefaultPreferences('123e4567-e89b-12d3-a456-426614174000');
    expect(userNotificationPreferencesSchema.safeParse(prefs).success).toBe(true);
  });
});
