/**
 * AIVO Notification Types Package
 * 
 * Notification categories, preferences, quiet hours, and delivery policies.
 * Used by: Auth Service, Mail Worker, Mobile App, Web App
 */

import { z } from 'zod';

// =============================================================================
// Notification Categories
// =============================================================================

/**
 * Notification categories
 */
export const NOTIFICATION_CATEGORIES = {
  // Authentication
  AUTH_LOGIN: 'auth.login',
  AUTH_PASSWORD_CHANGE: 'auth.password_change',
  AUTH_EMAIL_VERIFICATION: 'auth.email_verification',
  
  // Habits & Workouts
  HABIT_REMINDER: 'habit.reminder',
  WORKOUT_REMINDER: 'workout.reminder',
  RECOVERY_SUGGESTION: 'recovery.suggestion',
  PLAN_ADJUSTMENT: 'plan.adjustment',
  
  // Health & Nutrition
  READINESS_ALERT: 'health.readiness_alert',
  GOAL_PROGRESS: 'health.goal_progress',
  MEAL_REMINDER: 'nutrition.meal_reminder',
  GROCERY_REMINDER: 'nutrition.grocery_reminder',
  
  // Reports
  REPORT_READY: 'report.ready',
  
  // Family & Social
  FAMILY_INVITATION: 'family.invitation',
  FAMILY_UPDATE: 'family.update',
  SOCIAL_INTERACTION: 'social.interaction',
  
  // System
  SYSTEM_NOTIFICATION: 'system.notification',
  MAINTENANCE: 'system.maintenance',
} as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[keyof typeof NOTIFICATION_CATEGORIES];

/**
 * Notification channels
 */
export const NOTIFICATION_CHANNELS = {
  EMAIL: 'email',
  PUSH: 'push',
  IN_APP: 'in_app',
} as const;

export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[keyof typeof NOTIFICATION_CHANNELS];

/**
 * Notification priority
 */
export const NOTIFICATION_PRIORITY = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

export type NotificationPriority = (typeof NOTIFICATION_PRIORITY)[keyof typeof NOTIFICATION_PRIORITY];

// =============================================================================
// Quiet Hours
// =============================================================================

/**
 * Quiet hours schema
 */
export const quietHoursSchema = z.object({
  enabled: z.boolean(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'HH:MM format'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'HH:MM format'),
  timezone: z.string().min(1),
  // Days when quiet hours apply (0 = Sunday, 6 = Saturday)
  days: z.array(z.number().int().min(0).max(6)).optional(),
});

export type QuietHours = z.infer<typeof quietHoursSchema>;

/**
 * Check if current time is within quiet hours
 */
export function isWithinQuietHours(quietHours: QuietHours): boolean {
  if (!quietHours.enabled) {
    return false;
  }

  const now = new Date();
  const userTz = quietHours.timezone;
  
  // Get current time in user's timezone
  const userTimeStr = now.toLocaleTimeString('en-US', { 
    timeZone: userTz, 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
  const [currentHour, currentMinute] = userTimeStr.split(':').map(Number);
  const currentMinutes = currentHour * 60 + currentMinute;

  const [startHour, startMinute] = quietHours.startTime.split(':').map(Number);
  const startMinutes = startHour * 60 + startMinute;

  const [endHour, endMinute] = quietHours.endTime.split(':').map(Number);
  const endMinutes = endHour * 60 + endMinute;

  // Check if current day is restricted
  const currentDay = now.getDay(); // 0 = Sunday
  if (quietHours.days && quietHours.days.length > 0) {
    if (!quietHours.days.includes(currentDay)) {
      return false;
    }
  }

  // Handle overnight quiet hours (e.g., 22:00 - 07:00)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  // Normal case (e.g., 13:00 - 15:00)
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

// =============================================================================
// User Notification Preferences
// =============================================================================

/**
 * Channel preference for a category
 */
export const channelPreferenceSchema = z.object({
  enabled: z.boolean(),
  // Optional frequency cap (notifications per day)
  maxPerDay: z.number().int().positive().optional(),
  // Optional time window for frequency cap reset
  resetHour: z.number().int().min(0).max(23).optional(),
});

export type ChannelPreference = z.infer<typeof channelPreferenceSchema>;

/**
 * Category preferences
 */
export const categoryPreferenceSchema = z.object({
  email: channelPreferenceSchema,
  push: channelPreferenceSchema,
  inApp: channelPreferenceSchema,
});

export type CategoryPreference = z.infer<typeof categoryPreferenceSchema>;

/**
 * User notification preferences
 */
export const userNotificationPreferencesSchema = z.object({
  userId: z.string().uuid(),
  // Global quiet hours applied to all channels
  quietHours: quietHoursSchema.optional(),
  // Per-category preferences
  categories: z.record(z.string(), categoryPreferenceSchema),
  // Global opt-out (overrides category preferences)
  globalOptOut: z.boolean().default(false),
  // Timezone for local delivery calculations
  timezone: z.string().default('UTC'),
  // Language preference for notifications
  locale: z.enum(['en', 'vi']).default('en'),
  // Last updated timestamp
  updatedAt: z.string().datetime().optional(),
});

export type UserNotificationPreferences = z.infer<typeof userNotificationPreferencesSchema>;

/**
 * Create default notification preferences
 */
export function createDefaultPreferences(userId: string): UserNotificationPreferences {
  const defaultCategory = {
    email: { enabled: true },
    push: { enabled: false },
    inApp: { enabled: true },
  };

  return {
    userId,
    quietHours: {
      enabled: false,
      startTime: '22:00',
      endTime: '08:00',
      timezone: 'UTC',
    },
    categories: {
      // Essential auth - always enabled by default
      [NOTIFICATION_CATEGORIES.AUTH_LOGIN]: {
        email: { enabled: true },
        push: { enabled: false },
        inApp: { enabled: true },
      },
      [NOTIFICATION_CATEGORIES.AUTH_EMAIL_VERIFICATION]: {
        email: { enabled: true },
        push: { enabled: false },
        inApp: { enabled: true },
      },
      // Health notifications
      [NOTIFICATION_CATEGORIES.READINESS_ALERT]: defaultCategory,
      [NOTIFICATION_CATEGORIES.GOAL_PROGRESS]: defaultCategory,
      // Workout notifications
      [NOTIFICATION_CATEGORIES.WORKOUT_REMINDER]: {
        email: { enabled: true, maxPerDay: 2 },
        push: { enabled: true, maxPerDay: 3 },
        inApp: { enabled: true },
      },
      // Nutrition notifications
      [NOTIFICATION_CATEGORIES.MEAL_REMINDER]: defaultCategory,
      [NOTIFICATION_CATEGORIES.GROCERY_REMINDER]: defaultCategory,
      // Report notifications
      [NOTIFICATION_CATEGORIES.REPORT_READY]: defaultCategory,
      // Family notifications
      [NOTIFICATION_CATEGORIES.FAMILY_INVITATION]: defaultCategory,
      [NOTIFICATION_CATEGORIES.FAMILY_UPDATE]: defaultCategory,
      // Social notifications - opt-out by default
      [NOTIFICATION_CATEGORIES.SOCIAL_INTERACTION]: {
        email: { enabled: false },
        push: { enabled: false },
        inApp: { enabled: true },
      },
      // System notifications
      [NOTIFICATION_CATEGORIES.SYSTEM_NOTIFICATION]: defaultCategory,
      // Marketing disabled by default
      [NOTIFICATION_CATEGORIES.MAINTENANCE]: {
        email: { enabled: false },
        push: { enabled: false },
        inApp: { enabled: true },
      },
    },
    globalOptOut: false,
    timezone: 'UTC',
    locale: 'en',
  };
}

// =============================================================================
// Frequency Tracking
// =============================================================================

/**
 * Daily notification count
 */
export interface DailyNotificationCount {
  userId: string;
  category: NotificationCategory;
  channel: NotificationChannel;
  date: string; // YYYY-MM-DD
  count: number;
  lastSentAt: string; // ISO datetime
}

/**
 * Frequency cap exceeded error
 */
export class FrequencyCapExceededError extends Error {
  constructor(
    public readonly category: NotificationCategory,
    public readonly channel: NotificationChannel,
    public readonly maxPerDay: number
  ) {
    super(`Frequency cap exceeded for ${category} on ${channel}: max ${maxPerDay} per day`);
    this.name = 'FrequencyCapExceededError';
  }
}

// =============================================================================
// Notification Request
// =============================================================================

/**
 * Notification request
 */
export interface NotificationRequest {
  notificationId: string;
  userId: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  locale: string;
  correlationId?: string;
  idempotencyKey: string;
  // Template data (not sensitive health details)
  templateCode: string;
  templateParams: Record<string, string | number | boolean>;
  // Scheduled delivery time (if deferred)
  scheduledAt?: string; // ISO datetime
  // User's current timezone (for local delivery)
  userTimezone?: string;
  // Skip quiet hours check (for urgent notifications)
  bypassQuietHours?: boolean;
}

/**
 * Notification delivery result
 */
export interface NotificationDeliveryResult {
  notificationId: string;
  channel: NotificationChannel;
  success: boolean;
  deliveredAt?: string;
  error?: {
    code: string;
    message: string;
  };
  // Safe metadata (no sensitive data)
  metadata?: {
    providerMessageId?: string;
    attemptCount: number;
  };
}

// =============================================================================
// Template Versioning
// =============================================================================

/**
 * Template version info
 */
export interface TemplateVersion {
  code: string;
  version: number;
  locale: string;
  updatedAt: string;
  // Deep link base URL for the notification
  deepLinkBase?: string;
}

/**
 * Get template deep link
 */
export function getTemplateDeepLink(template: TemplateVersion, params: Record<string, string>): string {
  if (!template.deepLinkBase) {
    return '';
  }
  
  const url = new URL(template.deepLinkBase);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if user has opted out globally
 */
export function isGloballyOptedOut(preferences: UserNotificationPreferences): boolean {
  return preferences.globalOptOut;
}

/**
 * Check if category is enabled for a channel
 */
export function isCategoryChannelEnabled(
  preferences: UserNotificationPreferences,
  category: NotificationCategory,
  channel: NotificationChannel
): boolean {
  if (preferences.globalOptOut) {
    return false;
  }

  const categoryPrefs = preferences.categories[category];
  if (!categoryPrefs) {
    return false;
  }

  const channelPref = getChannelPreference(categoryPrefs, channel);
  return channelPref?.enabled ?? false;
}

/**
 * Get channel preference from category preferences
 */
export function getChannelPreference(
  categoryPrefs: CategoryPreference,
  channel: NotificationChannel
): ChannelPreference | undefined {
  switch (channel) {
    case NOTIFICATION_CHANNELS.EMAIL:
      return categoryPrefs.email;
    case NOTIFICATION_CHANNELS.PUSH:
      return categoryPrefs.push;
    case NOTIFICATION_CHANNELS.IN_APP:
      return categoryPrefs.inApp;
  }
}

/**
 * Check if frequency cap is exceeded
 */
export function isFrequencyCapExceeded(
  preference: ChannelPreference,
  dailyCount: DailyNotificationCount
): boolean {
  if (!preference.maxPerDay) {
    return false;
  }
  return dailyCount.count >= preference.maxPerDay;
}

/**
 * Determine if notification should be deferred to quiet hours
 */
export function shouldDeferForQuietHours(
  request: NotificationRequest,
  preferences: UserNotificationPreferences
): boolean {
  // Never defer urgent notifications
  if (request.priority === NOTIFICATION_PRIORITY.URGENT || request.bypassQuietHours) {
    return false;
  }

  if (!preferences.quietHours || !preferences.quietHours.enabled) {
    return false;
  }

  return isWithinQuietHours(preferences.quietHours);
}

/**
 * Get next delivery window after quiet hours
 */
export function getNextDeliveryWindow(
  quietHours: QuietHours
): { date: string; time: string } | null {
  if (!quietHours.enabled) {
    return null;
  }

  const now = new Date();
  const userTz = quietHours.timezone;

  // Get current time in user's timezone
  const userTimeStr = now.toLocaleTimeString('en-US', { 
    timeZone: userTz, 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
  const [currentHour, currentMinute] = userTimeStr.split(':').map(Number);

  const [endHour, endMinute] = quietHours.endTime.split(':').map(Number);

  let nextDeliveryDate = now;
  
  // If currently in quiet hours
  if (isWithinQuietHours(quietHours)) {
    // Schedule for end of quiet hours
    const endDate = new Date(now);
    // Handle overnight quiet hours
    if (endHour < currentHour || (endHour === currentHour && endMinute <= currentMinute)) {
      // End time is tomorrow
      endDate.setDate(endDate.getDate() + 1);
    }
    endDate.setHours(endHour, endMinute, 0, 0);
    nextDeliveryDate = endDate;
  }

  // Format date and time
  const dateStr = nextDeliveryDate.toLocaleDateString('en-CA', { timeZone: userTz }); // YYYY-MM-DD
  return { date: dateStr, time: quietHours.endTime };
}

// =============================================================================
// Validation Schemas for API
// =============================================================================

/**
 * Update preferences request
 */
export const updatePreferencesRequestSchema = z.object({
  quietHours: quietHoursSchema.optional(),
  categoryPreferences: z.record(z.string(), categoryPreferenceSchema).optional(),
  globalOptOut: z.boolean().optional(),
  timezone: z.string().optional(),
  locale: z.enum(['en', 'vi']).optional(),
});

export type UpdatePreferencesRequest = z.infer<typeof updatePreferencesRequestSchema>;

/**
 * Category preference update
 */
export const updateCategoryPreferenceSchema = z.object({
  email: channelPreferenceSchema.partial().optional(),
  push: channelPreferenceSchema.partial().optional(),
  inApp: channelPreferenceSchema.partial().optional(),
});

export type UpdateCategoryPreference = z.infer<typeof updateCategoryPreferenceSchema>;
