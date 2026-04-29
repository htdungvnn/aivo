// ============================================
// ACTIVITY EVENTS & TRACKING
// ============================================

export interface ActivityEvent {
  id: string;
  userId: string;
  workoutId?: string;
  type: ActivityEventType;
  payload: Record<string, unknown>;
  clientTimestamp: Date;
  serverTimestamp: Date;
  deviceInfo?: DeviceInfo;
}

export type ActivityEventType =
  | "track_metrics"
  | "heart_rate_zone"
  | "workout_complete"
  | "goal_progress"
  | "app_open"
  | "feature_used"
  | "recommendation_shown"
  | "recommendation_acted";

export interface DeviceInfo {
  platform: "web" | "ios" | "android";
  version: string;
  model?: string;
  os?: string;
}

// Real-time status updates
export interface StatusUpdate {
  userId: string;
  type: "workout_started" | "workout_updated" | "workout_completed" | "metric_update" | "goal_achieved";
  data: Record<string, unknown>;
  timestamp: Date;
}

// Helper function to create activity event
export function createActivityEvent(
  userId: string,
  type: ActivityEventType,
  payload: Record<string, unknown>,
  deviceInfo?: DeviceInfo
): ActivityEvent {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    userId,
    type,
    payload,
    clientTimestamp: now,
    serverTimestamp: now,
    deviceInfo,
  };
}
