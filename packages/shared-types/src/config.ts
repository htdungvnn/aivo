// ============================================
// FEATURE FLAGS & CONFIGURATION
// ============================================

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  variant?: string;
  conditions?: FlagCondition;
  createdAt: Date;
  updatedAt: Date;
}

export interface FlagCondition {
  userId?: string;
  userSegment?: string;
  percentage?: number; // Rollout percentage 0-100
  platform?: ("web" | "ios" | "android")[];
  version?: string;
}

export interface Variant {
  name: string;
  value: unknown;
  weight: number; // Percentage allocation (0-100)
}

export interface Experiment {
  id: string;
  name: string;
  description: string;
  variants: Variant[];
  targetAudience: FlagCondition;
  metrics: string[]; // Key metrics to track
  status: "draft" | "active" | "paused" | "completed";
  createdAt: Date;
  startedAt?: Date;
  endedAt?: Date;
}

export interface RolloutPlan {
  id: string;
  featureKey: string;
  stages: RolloutStage[];
  currentStage: number;
  status: "in_progress" | "completed" | "cancelled";
}

export interface RolloutStage {
  percentage: number; // 0-100
  durationHours?: number;
  criteria?: RolloutCriteria;
}

export interface RolloutCriteria {
  errorRateThreshold?: number; // Max acceptable error rate %
  minActiveUsers?: number;
  performanceBaseline?: Record<string, number>;
}

// App configuration
export interface AppConfig {
  environment: Environment;
  features: Record<string, boolean>;
  api: {
    baseUrl: string;
    timeout: number;
    retries: number;
  };
  ai: {
    defaultModel: string;
    costOptimization: "aggressive" | "balanced" | "quality";
    maxTokens: number;
  };
  storage: {
    r2PublicUrl: string;
    maxUploadSize: number; // bytes
    allowedImageTypes: string[];
    allowedVideoTypes: string[];
  };
  auth: {
    tokenExpiry: number; // seconds
    refreshTokenExpiry: number; // seconds
    oauthProviders: string[];
  };
  notifications: {
    enabled: boolean;
    defaultSound: boolean;
    quietHours?: { start: string; end: string };
  };
}

export type Environment = "development" | "staging" | "production";

export interface BuildInfo {
  version: string;
  buildNumber: number;
  commitSha: string;
  builtAt: Date;
  environment: Environment;
}

export interface ConfigOverride {
  key: string;
  value: unknown;
  reason: string;
  expiresAt?: Date;
}
