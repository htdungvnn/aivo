// ============================================
// ADMIN & MONITORING
// ============================================
import type { User } from "./user";
import type { Workout } from "./workout";
import type { ActivityEvent } from "./activity";

export interface SystemMetrics {
  timestamp: Date;
  activeUsers: number;
  newUsers: number;
  workoutsCompleted: number;
  aiRequests: number;
  apiLatency: number; // ms
  errorRate: number; // percentage
  storageUsed: number; // bytes
}

export interface UserAnalytics {
  userId: string;
  engagementScore: number; // 0-100
  retentionRisk: "low" | "medium" | "high";
  predictedLTV: number; // Lifetime value
  churnProbability: number; // 0-1
  preferredCommunication: ("email" | "push" | "in_app")[];
  lastActive: Date;
}

// Migration tracking
export interface MigrationRecord {
  id: string;
  name: string;
  appliedAt: Date;
  hash: string;
  version: number;
}
