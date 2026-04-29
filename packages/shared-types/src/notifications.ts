// ============================================
// PUSH NOTIFICATIONS
// ============================================

export type NotificationPriority = "low" | "normal" | "high" | "urgent";

export type NotificationStatus = "pending" | "sent" | "delivered" | "read" | "failed";

export type NotificationCategory =
  | "workout_reminder"
  | "goal_milestone"
  | "achievement"
  | "recommendation"
  | "social"
  | "system"
  | "recovery_alert";

export interface DevicePushToken {
  id: string;
  userId: string;
  deviceId: string;
  platform: "ios" | "android" | "web";
  token: string;
  isActive: boolean;
  lastUsed: Date;
  createdAt: Date;
}

export interface PushNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  priority: NotificationPriority;
  category: NotificationCategory;
  data?: Record<string, unknown>; // Custom payload
  scheduledAt: Date;
  sentAt?: Date;
  status: NotificationStatus;
  deviceToken: string;
  apnsId?: string; // Apple Push Notification Service ID
  fcmId?: string; // Firebase Cloud Messaging ID
  error?: string;
  createdAt: Date;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  category: NotificationCategory;
  title: string;
  body: string;
  priority: NotificationPriority;
  dataSchema?: Record<string, unknown>; // JSON schema for data placeholders
  variables: string[]; // Placeholder variables like {{workout_name}}
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationTriggerCondition {
  event: string;
  filters: Record<string, unknown>;
  templateId: string;
  delaySeconds?: number;
  expirationHours?: number;
}

export interface NotificationPreference {
  userId: string;
  category: NotificationCategory;
  enabled: boolean;
  quietHours?: {
    start: string; // HH:MM
    end: string;
  };
  frequency?: "immediate" | "digest" | "daily_summary";
  platforms: ("push" | "email" | "in_app")[];
  updatedAt: Date;
}
