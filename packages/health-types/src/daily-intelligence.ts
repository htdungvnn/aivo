/**
 * Daily Intelligence Types
 * Types for the Daily Intelligence dashboard and actions
 */

import { z } from 'zod';
import {
  DAILY_ACTIONS,
  ACTION_STATUS,
  ADAPTATION_TYPES,
  ADAPTATION_STATUS,
  TRAINING_INTENSITY,
} from './index.js';

// =============================================================================
// Daily Intelligence Types
// =============================================================================

/**
 * Daily action for the user
 */
export interface DailyAction {
  id: string;
  userId: string;
  date: string;
  type: string;
  priority: number;
  title: string;
  description: string;
  status: string;
  completedAt: number | null;
  skippedAt: number | null;
  skipReason: string | null;
  metadata: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

/**
 * Daily action request for creation
 */
export interface DailyActionRequest {
  type: string;
  priority?: number;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Plan adaptation for daily adjustments
 */
export interface PlanAdaptation {
  id: string;
  userId: string;
  date: string;
  originalPlanId: string | null;
  type: string;
  status: string;
  
  // What was changed
  field: string;
  originalValue: string | number | null;
  adaptedValue: string | number | null;
  
  // Reason for change
  reason: string;
  readinessScore: number;
  contributingFactors: string[];
  
  // User decision
  acceptedAt: number | null;
  rejectedAt: number | null;
  restoredAt: number | null;
  
  createdAt: number;
  updatedAt: number;
}

/**
 * Adaptation request
 */
export interface AdaptationRequest {
  adaptationId: string;
  action: 'accept' | 'reject' | 'restore';
}

/**
 * Daily Intelligence snapshot
 */
export interface DailyIntelligenceSnapshot {
  id: string;
  userId: string;
  date: string;
  timezone: string;
  
  // Readiness
  readinessScore: number;
  readinessLevel: string;
  readinessConfidence: number;
  readinessFactorsJson: string;
  
  // Next action
  nextActionJson: string;
  
  // Today's plan
  todayPlanJson: string;
  
  // Current status
  currentNutritionJson: string;
  currentActivityJson: string;
  currentRecoveryJson: string;
  
  // AI insight
  aiInsightJson: string | null;
  aiInsightPromptVersion: string | null;
  
  // Data quality
  dataCompleteness: number;
  lastSyncAt: number;
  
  // Metadata
  idempotencyKey: string;
  algorithmVersion: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Today's Daily Intelligence
 */
export interface TodayIntelligence {
  date: string;
  timezone: string;
  
  // Readiness
  readiness: {
    score: number;
    level: string;
    confidence: number;
    factors: {
      code: string;
      score: number;
      contribution: number;
      status: string;
      messageKey: string;
    }[];
    recommendation: {
      action: string;
      intensityModifier: number;
      volumeModifier: number;
    };
  };
  
  // Actions
  actions: DailyAction[];
  
  // Today's plan with adaptations
  todayPlan: {
    primaryGoal: string | null;
    plannedWorkout: {
      name: string;
      type: string;
      duration: number;
      intensity: string;
    } | null;
    adaptedIntensity: number | null;
    adaptedVolume: number | null;
    adaptations: PlanAdaptation[];
  };
  
  // Nutrition status
  nutrition: {
    caloriesConsumed: number;
    caloriesTarget: number;
    caloriesRemaining: number;
    proteinG: number;
    proteinTarget: number;
    carbsG: number;
    carbsTarget: number;
    fatG: number;
    fatTarget: number;
  };
  
  // Activity status
  activity: {
    steps: number;
    stepsTarget: number;
    activeMinutes: number;
    activeMinutesTarget: number;
    hydration: number;
    hydrationTarget: number;
  };
  
  // Recovery status
  recovery: {
    sleepHours: number | null;
    sleepQuality: number | null;
    hrv: number | null;
    muscleSoreness: number | null;
    recoveryRecommendation: string;
  };
  
  // Habits
  habits: {
    total: number;
    completed: number;
    items: {
      name: string;
      completed: boolean;
    }[];
  };
  
  // Insight
  insight: {
    text: string | null;
    type: string | null;
    generatedAt: number | null;
  };
  
  // Data quality
  dataQuality: {
    completeness: number;
    freshness: number;
    lastSyncAt: number;
  };
  
  // Metadata
  calculatedAt: number;
  algorithmVersion: string;
}

/**
 * Weekly Intelligence Summary
 */
export interface WeeklyIntelligenceSummary {
  startDate: string;
  endDate: string;
  timezone: string;
  
  // Weekly averages
  averages: {
    readiness: number;
    sleepHours: number;
    sleepQuality: number;
    steps: number;
    activeMinutes: number;
    caloriesConsumed: number;
    workoutsCompleted: number;
    hrv: number;
    energy: number;
  };
  
  // Weekly totals
  totals: {
    workouts: number;
    activeDays: number;
    caloriesConsumed: number;
    steps: number;
    activeMinutes: number;
    habitsCompleted: number;
  };
  
  // Trends
  trends: {
    readiness: 'improving' | 'stable' | 'declining';
    sleep: 'improving' | 'stable' | 'declining';
    energy: 'improving' | 'stable' | 'declining';
    activity: 'improving' | 'stable' | 'declining';
    nutrition: 'improving' | 'stable' | 'declining';
  };
  
  // Highlights
  highlights: {
    bestDay: string;
    bestReadiness: number;
    mostActiveDay: string;
    mostSteps: number;
    longestWorkout: string;
    longestWorkoutDuration: number;
  };
  
  // Insights
  insights: {
    type: string;
    text: string;
    priority: number;
  }[];
  
  // Factor breakdown
  factorBreakdown: {
    code: string;
    averageScore: number;
    trend: 'improving' | 'stable' | 'declining';
  }[];
  
  // Recommendations
  recommendations: {
    type: string;
    text: string;
    action: string;
  }[];
  
  generatedAt: number;
}

/**
 * User check-in request
 */
export interface CheckInRequest {
  energy?: number;
  stress?: number;
  sleepQuality?: number;
  muscleSoreness?: number;
  notes?: string;
}

/**
 * User check-in response
 */
export interface CheckInResponse {
  checkIn: {
    id: string;
    date: string;
    completed: boolean;
    completedAt: number;
  };
  readinessRecalculated: boolean;
  newReadinessScore?: number;
}

// =============================================================================
// Zod Schemas
// =============================================================================

/**
 * DailyAction schema
 */
export const DailyActionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  date: z.string(),
  type: z.string(),
  priority: z.number().int().min(1),
  title: z.string(),
  description: z.string(),
  status: z.string(),
  completedAt: z.number().nullable(),
  skippedAt: z.number().nullable(),
  skipReason: z.string().nullable(),
  metadata: z.record(z.unknown()),
  createdAt: z.number(),
  updatedAt: z.number(),
});

/**
 * PlanAdaptation schema
 */
export const PlanAdaptationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  date: z.string(),
  originalPlanId: z.string().nullable(),
  type: z.string(),
  status: z.string(),
  field: z.string(),
  originalValue: z.union([z.string(), z.number()]).nullable(),
  adaptedValue: z.union([z.string(), z.number()]).nullable(),
  reason: z.string(),
  readinessScore: z.number(),
  contributingFactors: z.array(z.string()),
  acceptedAt: z.number().nullable(),
  rejectedAt: z.number().nullable(),
  restoredAt: z.number().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

/**
 * TodayIntelligence schema
 */
export const TodayIntelligenceSchema = z.object({
  date: z.string(),
  timezone: z.string(),
  
  readiness: z.object({
    score: z.number().min(0).max(100),
    level: z.string(),
    confidence: z.number().min(0).max(1),
    factors: z.array(z.object({
      code: z.string(),
      score: z.number(),
      contribution: z.number(),
      status: z.string(),
      messageKey: z.string(),
    })),
    recommendation: z.object({
      action: z.string(),
      intensityModifier: z.number(),
      volumeModifier: z.number(),
    }),
  }),
  
  actions: z.array(DailyActionSchema),
  
  todayPlan: z.object({
    primaryGoal: z.string().nullable(),
    plannedWorkout: z.object({
      name: z.string(),
      type: z.string(),
      duration: z.number(),
      intensity: z.string(),
    }).nullable(),
    adaptedIntensity: z.number().nullable(),
    adaptedVolume: z.number().nullable(),
    adaptations: z.array(PlanAdaptationSchema),
  }),
  
  nutrition: z.object({
    caloriesConsumed: z.number(),
    caloriesTarget: z.number(),
    caloriesRemaining: z.number(),
    proteinG: z.number(),
    proteinTarget: z.number(),
    carbsG: z.number(),
    carbsTarget: z.number(),
    fatG: z.number(),
    fatTarget: z.number(),
  }),
  
  activity: z.object({
    steps: z.number(),
    stepsTarget: z.number(),
    activeMinutes: z.number(),
    activeMinutesTarget: z.number(),
    hydration: z.number(),
    hydrationTarget: z.number(),
  }),
  
  recovery: z.object({
    sleepHours: z.number().nullable(),
    sleepQuality: z.number().nullable(),
    hrv: z.number().nullable(),
    muscleSoreness: z.number().nullable(),
    recoveryRecommendation: z.string(),
  }),
  
  habits: z.object({
    total: z.number(),
    completed: z.number(),
    items: z.array(z.object({
      name: z.string(),
      completed: z.boolean(),
    })),
  }),
  
  insight: z.object({
    text: z.string().nullable(),
    type: z.string().nullable(),
    generatedAt: z.number().nullable(),
  }),
  
  dataQuality: z.object({
    completeness: z.number().min(0).max(1),
    freshness: z.number(),
    lastSyncAt: z.number(),
  }),
  
  calculatedAt: z.number(),
  algorithmVersion: z.string(),
});

/**
 * WeeklyIntelligenceSummary schema
 */
export const WeeklyIntelligenceSummarySchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  timezone: z.string(),
  
  averages: z.object({
    readiness: z.number(),
    sleepHours: z.number(),
    sleepQuality: z.number(),
    steps: z.number(),
    activeMinutes: z.number(),
    caloriesConsumed: z.number(),
    workoutsCompleted: z.number(),
    hrv: z.number(),
    energy: z.number(),
  }),
  
  totals: z.object({
    workouts: z.number(),
    activeDays: z.number(),
    caloriesConsumed: z.number(),
    steps: z.number(),
    activeMinutes: z.number(),
    habitsCompleted: z.number(),
  }),
  
  trends: z.object({
    readiness: z.enum(['improving', 'stable', 'declining']),
    sleep: z.enum(['improving', 'stable', 'declining']),
    energy: z.enum(['improving', 'stable', 'declining']),
    activity: z.enum(['improving', 'stable', 'declining']),
    nutrition: z.enum(['improving', 'stable', 'declining']),
  }),
  
  highlights: z.object({
    bestDay: z.string(),
    bestReadiness: z.number(),
    mostActiveDay: z.string(),
    mostSteps: z.number(),
    longestWorkout: z.string(),
    longestWorkoutDuration: z.number(),
  }),
  
  insights: z.array(z.object({
    type: z.string(),
    text: z.string(),
    priority: z.number().int().min(1),
  })),
  
  factorBreakdown: z.array(z.object({
    code: z.string(),
    averageScore: z.number(),
    trend: z.enum(['improving', 'stable', 'declining']),
  })),
  
  recommendations: z.array(z.object({
    type: z.string(),
    text: z.string(),
    action: z.string(),
  })),
  
  generatedAt: z.number(),
});

/**
 * CheckInRequest schema
 */
export const CheckInRequestSchema = z.object({
  energy: z.number().min(1).max(10).optional(),
  stress: z.number().min(1).max(10).optional(),
  sleepQuality: z.number().min(1).max(10).optional(),
  muscleSoreness: z.number().min(0).max(10).optional(),
  notes: z.string().max(500).optional(),
});

/**
 * AdaptationRequest schema
 */
export const AdaptationRequestSchema = z.object({
  adaptationId: z.string(),
  action: z.enum(['accept', 'reject', 'restore']),
});

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Validate check-in request
 */
export function validateCheckInRequest(request: unknown): {
  valid: boolean;
  errors: string[];
} {
  const result = CheckInRequestSchema.safeParse(request);
  
  if (result.success) {
    return { valid: true, errors: [] };
  }
  
  return {
    valid: false,
    errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
  };
}

/**
 * Validate today intelligence
 */
export function validateTodayIntelligence(data: unknown): {
  valid: boolean;
  errors: string[];
} {
  const result = TodayIntelligenceSchema.safeParse(data);
  
  if (result.success) {
    return { valid: true, errors: [] };
  }
  
  return {
    valid: false,
    errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
  };
}

/**
 * Validate weekly intelligence summary
 */
export function validateWeeklySummary(data: unknown): {
  valid: boolean;
  errors: string[];
} {
  const result = WeeklyIntelligenceSummarySchema.safeParse(data);
  
  if (result.success) {
    return { valid: true, errors: [] };
  }
  
  return {
    valid: false,
    errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
  };
}

// =============================================================================
// Action Ranking
// =============================================================================

/**
 * Action priority configuration
 */
export const ACTION_PRIORITIES: Record<string, number> = {
  [DAILY_ACTIONS.COMPLETE_CHECKIN]: 1,
  [DAILY_ACTIONS.REST]: 2,
  [DAILY_ACTIONS.RECOVERY]: 3,
  [DAILY_ACTIONS.LIGHT_WORKOUT]: 4,
  [DAILY_ACTIONS.START_WORKOUT]: 5,
  [DAILY_ACTIONS.HIGH_INTENSITY]: 6,
  [DAILY_ACTIONS.ADD_PROTEIN]: 7,
  [DAILY_ACTIONS.DRINK_WATER]: 8,
  [DAILY_ACTIONS.SHORT_WALK]: 9,
  [DAILY_ACTIONS.PREPARE_SLEEP]: 10,
};

/**
 * Get action priority
 */
export function getActionPriority(actionType: string): number {
  return ACTION_PRIORITIES[actionType] ?? 100;
}

/**
 * Action titles and descriptions
 */
export const ACTION_MESSAGES: Record<string, { title: string; description: string }> = {
  [DAILY_ACTIONS.START_WORKOUT]: {
    title: 'Start your workout',
    description: 'You\'re ready for a great training session today.',
  },
  [DAILY_ACTIONS.LIGHT_WORKOUT]: {
    title: 'Light training recommended',
    description: 'Consider a lighter workout or active recovery today.',
  },
  [DAILY_ACTIONS.RECOVERY]: {
    title: 'Focus on recovery',
    description: 'Your body would benefit from rest or mobility work.',
  },
  [DAILY_ACTIONS.REST]: {
    title: 'Take a rest day',
    description: 'Rest is an important part of your training. Recover well!',
  },
  [DAILY_ACTIONS.ADD_PROTEIN]: {
    title: 'Add protein to your next meal',
    description: 'You\'re below your protein target. Add lean protein sources.',
  },
  [DAILY_ACTIONS.DRINK_WATER]: {
    title: 'Stay hydrated',
    description: 'Drink water throughout the day to stay properly hydrated.',
  },
  [DAILY_ACTIONS.SHORT_WALK]: {
    title: 'Take a short walk',
    description: 'A brief walk can help with recovery and energy levels.',
  },
  [DAILY_ACTIONS.PREPARE_SLEEP]: {
    title: 'Prepare for good sleep',
    description: 'Start winding down for quality rest tonight.',
  },
  [DAILY_ACTIONS.COMPLETE_CHECKIN]: {
    title: 'Complete your daily check-in',
    description: 'A quick check-in helps us give you better recommendations.',
  },
};

/**
 * Get action message
 */
export function getActionMessage(actionType: string): { title: string; description: string } {
  return ACTION_MESSAGES[actionType] ?? { title: actionType, description: '' };
}
