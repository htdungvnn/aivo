// Health data types - will be aligned with shared-types
export interface HealthMetric {
  id: string;
  userId: string;
  type: HealthMetricType;
  value: number;
  unit: string;
  source: "apple_health" | "google_fit" | "manual";
  device?: string;
  recordedAt: Date;
  syncedAt: Date;
}

export type HealthMetricType =
  | "steps"
  | "heart_rate"
  | "sleep_duration"
  | "sleep_quality"
  | "calories_burned"
  | "active_minutes"
  | "distance"
  | "floors_climbed"
  | "blood_oxygen"
  | "respiratory_rate"
  | "heart_rate_variability"
  | "vo2_max"
  | "resting_heart_rate"
  | "workout_count"
  | "exercise_time";

export interface HealthGoal {
  id: string;
  userId: string;
  metricType: HealthMetricType;
  target: number;
  current: number;
  unit: string;
  timeframe: "daily" | "weekly" | "monthly";
  progressPercentage: number;
  completed: boolean;
  lastUpdated: Date;
}

export interface HealthTrend {
  metricType: HealthMetricType;
  period: "day" | "week" | "month" | "year";
  dataPoints: {
    date: Date;
    value: number;
    average?: number;
    min?: number;
    max?: number;
  }[];
  summary: {
    total: number;
    average: number;
    min: number;
    max: number;
    trend: "increasing" | "decreasing" | "stable";
    changePercentage: number;
  };
}

export interface SyncStatus {
  lastSyncAt: Date | null;
  isSyncing: boolean;
  pendingCount: number;
  errors: SyncError[];
  devices: ConnectedDevice[];
}

export interface ConnectedDevice {
  id: string;
  name: string;
  type: "ios" | "android" | "wearos" | "fitbit" | "garmin";
  syncEnabled: boolean;
  lastConnected: Date;
  batteryLevel?: number;
  metrics: HealthMetricType[];
}

export interface SyncError {
  id: string;
  timestamp: Date;
  message: string;
  metricType?: HealthMetricType;
  deviceId?: string;
  resolved: boolean;
}

// Export types
export type ExportFormat = "csv" | "json" | "xlsx" | "pdf";

export interface ExportOptions {
  format: ExportFormat;
  startDate: Date;
  endDate: Date;
  metrics: HealthMetricType[];
  includeRawData: boolean;
}

export interface ExportResult {
  success: boolean;
  data?: Blob;
  filename: string;
  contentType: string;
  error?: string;
}

// Chart data types
export interface ChartDataPoint {
  timestamp: Date;
  value: number;
  label?: string;
  metadata?: Record<string, unknown>;
}

export interface ChartSeries {
  name: string;
  data: ChartDataPoint[];
  color: string;
  unit: string;
}

export interface ChartConfig {
  type: "line" | "area" | "bar" | "scatter" | "heatmap";
  title: string;
  description?: string;
  series: ChartSeries[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  timeRange?: "day" | "week" | "month" | "year" | "custom";
}
