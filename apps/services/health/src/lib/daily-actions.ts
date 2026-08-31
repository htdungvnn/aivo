/**
 * Daily Actions Library
 * Functions to generate and rank daily actions
 * 
 * Handles:
 * - Action generation based on readiness
 * - Priority ranking
 * - Action completion tracking
 */

import {
  DailyAction,
  DailyActionRequest,
  PlanAdaptation,
  DAILY_ACTIONS,
  ACTION_STATUS,
  ACTION_PRIORITIES,
  ACTION_MESSAGES,
  TrainingIntensity,
  getActionMessage,
  getActionPriority,
} from '@aivo/health-types';

// =============================================================================
// Types
// =============================================================================

/**
 * Readiness context for action generation
 */
export interface ActionContext {
  readinessScore: number;
  readinessLevel: 'low' | 'moderate' | 'good' | 'high';
  recommendation: {
    action: TrainingIntensity;
    intensityModifier: number;
    volumeModifier: number;
  };
  factors: {
    code: string;
    score: number;
    status: 'negative' | 'neutral' | 'positive';
  }[];
  nutrition: {
    caloriesConsumed: number;
    caloriesTarget: number;
    proteinG: number;
    proteinTarget: number;
    hydration: number;
    hydrationTarget: number;
  };
  activity: {
    steps: number;
    stepsTarget: number;
    activeMinutes: number;
    activeMinutesTarget: number;
  };
  recovery: {
    sleepHours: number | null;
    muscleSoreness: number | null;
  };
  hasCompletedCheckIn: boolean;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
}

/**
 * Generated action with priority
 */
export interface GeneratedAction {
  type: string;
  priority: number;
  title: string;
  description: string;
  reason: string;
  metadata: Record<string, unknown>;
}

/**
 * Adaptation recommendation
 */
export interface AdaptationRecommendation {
  type: string;
  field: string;
  originalValue: string | number | null;
  adaptedValue: string | number | null;
  reason: string;
  contributingFactors: string[];
}

// =============================================================================
// Action Generation
// =============================================================================

/**
 * Generate daily actions based on context
 */
export function generateDailyActions(
  context: ActionContext
): GeneratedAction[] {
  const actions: GeneratedAction[] = [];
  
  // 1. Check-in action (if not completed)
  if (!context.hasCompletedCheckIn) {
    actions.push({
      type: DAILY_ACTIONS.COMPLETE_CHECKIN,
      priority: getActionPriority(DAILY_ACTIONS.COMPLETE_CHECKIN),
      title: 'Complete your daily check-in',
      description: 'A quick check-in helps us give you better recommendations.',
      reason: 'Daily check-ins improve recommendation accuracy.',
      metadata: {},
    });
  }
  
  // 2. Training actions based on readiness
  const trainingAction = generateTrainingAction(context);
  if (trainingAction) {
    actions.push(trainingAction);
  }
  
  // 3. Recovery actions
  const recoveryActions = generateRecoveryActions(context);
  actions.push(...recoveryActions);
  
  // 4. Nutrition actions
  const nutritionActions = generateNutritionActions(context);
  actions.push(...nutritionActions);
  
  // 5. Activity actions
  const activityActions = generateActivityActions(context);
  actions.push(...activityActions);
  
  // 6. Sleep preparation (evening)
  if (context.timeOfDay === 'evening') {
    actions.push({
      type: DAILY_ACTIONS.PREPARE_SLEEP,
      priority: getActionPriority(DAILY_ACTIONS.PREPARE_SLEEP),
      title: 'Prepare for good sleep',
      description: 'Start winding down for quality rest tonight.',
      reason: 'Good sleep is essential for recovery.',
      metadata: {},
    });
  }
  
  // Sort by priority (lower = more important)
  return actions.sort((a, b) => a.priority - b.priority);
}

/**
 * Generate training-related action
 */
function generateTrainingAction(
  context: ActionContext
): GeneratedAction | null {
  const { recommendation, readinessLevel } = context;
  
  switch (recommendation.action) {
    case 'rest':
      return {
        type: DAILY_ACTIONS.REST,
        priority: getActionPriority(DAILY_ACTIONS.REST),
        ...getActionMessage(DAILY_ACTIONS.REST),
        reason: `Your readiness score (${context.readinessScore}) indicates you need rest.`,
        metadata: {
          readinessScore: context.readinessScore,
          intensityModifier: recommendation.intensityModifier,
        },
      };
    
    case 'recovery':
      return {
        type: DAILY_ACTIONS.RECOVERY,
        priority: getActionPriority(DAILY_ACTIONS.RECOVERY),
        ...getActionMessage(DAILY_ACTIONS.RECOVERY),
        reason: 'Light activity can aid recovery without adding stress.',
        metadata: {
          readinessScore: context.readinessScore,
          intensityModifier: recommendation.intensityModifier,
        },
      };
    
    case 'light_training':
      return {
        type: DAILY_ACTIONS.LIGHT_WORKOUT,
        priority: getActionPriority(DAILY_ACTIONS.LIGHT_WORKOUT),
        ...getActionMessage(DAILY_ACTIONS.LIGHT_WORKOUT),
        reason: `Your readiness (${context.readinessScore}) supports light training.`,
        metadata: {
          readinessScore: context.readinessScore,
          intensityModifier: recommendation.intensityModifier,
        },
      };
    
    case 'normal_training':
      return {
        type: DAILY_ACTIONS.START_WORKOUT,
        priority: getActionPriority(DAILY_ACTIONS.START_WORKOUT),
        ...getActionMessage(DAILY_ACTIONS.START_WORKOUT),
        reason: `You're ready for a normal workout today (readiness: ${context.readinessScore}).`,
        metadata: {
          readinessScore: context.readinessScore,
        },
      };
    
    case 'high_intensity':
      return {
        type: DAILY_ACTIONS.START_WORKOUT,
        priority: getActionPriority(DAILY_ACTIONS.START_WORKOUT),
        title: 'Great day for intensity!',
        description: "You're primed for a challenging workout.",
        reason: `High readiness (${context.readinessScore}) - safe to push.`,
        metadata: {
          readinessScore: context.readinessScore,
          intensityModifier: recommendation.intensityModifier,
        },
      };
    
    default:
      return null;
  }
}

/**
 * Generate recovery-related actions
 */
function generateRecoveryActions(
  context: ActionContext
): GeneratedAction[] {
  const actions: GeneratedAction[] = [];
  
  // High muscle soreness
  if (context.recovery.muscleSoreness !== null && context.recovery.muscleSoreness >= 7) {
    actions.push({
      type: DAILY_ACTIONS.RECOVERY,
      priority: getActionPriority(DAILY_ACTIONS.RECOVERY) + 1,
      ...getActionMessage(DAILY_ACTIONS.RECOVERY),
      reason: `High muscle soreness (${context.recovery.muscleSoreness}/10) - prioritize recovery.`,
      metadata: {
        muscleSoreness: context.recovery.muscleSoreness,
      },
    });
  }
  
  // Poor sleep
  if (context.recovery.sleepHours !== null && context.recovery.sleepHours < 6) {
    actions.push({
      type: DAILY_ACTIONS.REST,
      priority: getActionPriority(DAILY_ACTIONS.REST) + 2,
      title: 'Prioritize rest after poor sleep',
      description: 'Sleep debt affects performance and recovery.',
      reason: `Only ${context.recovery.sleepHours.toFixed(1)} hours of sleep.`,
      metadata: {
        sleepHours: context.recovery.sleepHours,
      },
    });
  }
  
  return actions;
}

/**
 * Generate nutrition-related actions
 */
function generateNutritionActions(
  context: ActionContext
): GeneratedAction[] {
  const actions: GeneratedAction[] = [];
  
  // Low protein
  const proteinPercent = context.nutrition.proteinTarget > 0
    ? (context.nutrition.proteinG / context.nutrition.proteinTarget) * 100
    : 0;
  
  if (proteinPercent < 70 && context.nutrition.proteinTarget > 0) {
    actions.push({
      type: DAILY_ACTIONS.ADD_PROTEIN,
      priority: getActionPriority(DAILY_ACTIONS.ADD_PROTEIN),
      ...getActionMessage(DAILY_ACTIONS.ADD_PROTEIN),
      reason: `Protein at ${proteinPercent.toFixed(0)}% of target.`,
      metadata: {
        currentG: context.nutrition.proteinG,
        targetG: context.nutrition.proteinTarget,
      },
    });
  }
  
  // Low hydration
  const hydrationPercent = context.nutrition.hydrationTarget > 0
    ? (context.nutrition.hydration / context.nutrition.hydrationTarget) * 100
    : 0;
  
  if (hydrationPercent < 50 && context.nutrition.hydrationTarget > 0) {
    actions.push({
      type: DAILY_ACTIONS.DRINK_WATER,
      priority: getActionPriority(DAILY_ACTIONS.DRINK_WATER),
      ...getActionMessage(DAILY_ACTIONS.DRINK_WATER),
      reason: `Hydration at ${hydrationPercent.toFixed(0)}% of target.`,
      metadata: {
        currentMl: context.nutrition.hydration,
        targetMl: context.nutrition.hydrationTarget,
      },
    });
  }
  
  return actions;
}

/**
 * Generate activity-related actions
 */
function generateActivityActions(
  context: ActionContext
): GeneratedAction[] {
  const actions: GeneratedAction[] = [];
  
  // Low steps
  const stepsPercent = context.activity.stepsTarget > 0
    ? (context.activity.steps / context.activity.stepsTarget) * 100
    : 0;
  
  if (stepsPercent < 50 && context.activity.stepsTarget > 0) {
    actions.push({
      type: DAILY_ACTIONS.SHORT_WALK,
      priority: getActionPriority(DAILY_ACTIONS.SHORT_WALK),
      ...getActionMessage(DAILY_ACTIONS.SHORT_WALK),
      reason: `Only ${stepsPercent.toFixed(0)}% of step goal reached.`,
      metadata: {
        currentSteps: context.activity.steps,
        targetSteps: context.activity.stepsTarget,
      },
    });
  }
  
  return actions;
}

// =============================================================================
// Action Ranking
// =============================================================================

/**
 * Rank and deduplicate actions
 */
export function rankActions(
  actions: GeneratedAction[]
): GeneratedAction[] {
  // Remove duplicates (keep highest priority)
  const seen = new Map<string, GeneratedAction>();
  
  for (const action of actions) {
    const existing = seen.get(action.type);
    if (!existing || action.priority < existing.priority) {
      seen.set(action.type, action);
    }
  }
  
  // Sort by priority
  return Array.from(seen.values()).sort((a, b) => a.priority - b.priority);
}

/**
 * Select top N actions
 */
export function selectTopActions(
  actions: GeneratedAction[],
  count: number = 5
): GeneratedAction[] {
  const ranked = rankActions(actions);
  return ranked.slice(0, count);
}

// =============================================================================
// Adaptation Generation
// =============================================================================

/**
 * Generate plan adaptations based on readiness
 */
export function generateAdaptations(
  context: ActionContext,
  originalPlan?: {
    intensity: number;
    volume: number;
    exercises: string[];
    workoutType: string;
  }
): AdaptationRecommendation[] {
  const adaptations: AdaptationRecommendation[] = [];
  
  if (!originalPlan) return adaptations;
  
  const { recommendation, readinessLevel, factors } = context;
  
  // Intensity adaptation
  if (recommendation.intensityModifier !== 0) {
    const newIntensity = Math.round(
      originalPlan.intensity * (1 + recommendation.intensityModifier)
    );
    
    adaptations.push({
      type: 'intensity',
      field: 'intensity',
      originalValue: originalPlan.intensity,
      adaptedValue: clamp(newIntensity, 1, 10),
      reason: `Readiness ${readinessLevel} (${context.readinessScore}) indicates intensity adjustment.`,
      contributingFactors: factors
        .filter(f => f.status === 'negative')
        .map(f => f.code),
    });
  }
  
  // Volume adaptation
  if (recommendation.volumeModifier !== 0) {
    const newVolume = Math.round(
      originalPlan.volume * (1 + recommendation.volumeModifier)
    );
    
    adaptations.push({
      type: 'volume',
      field: 'volume',
      originalValue: originalPlan.volume,
      adaptedValue: clamp(newVolume, 1, 10),
      reason: `Adjusting volume based on readiness (${context.readinessScore}).`,
      contributingFactors: factors
        .filter(f => f.status === 'negative')
        .map(f => f.code),
    });
  }
  
  // Low readiness: suggest easier exercises
  if (readinessLevel === 'low' || readinessLevel === 'moderate') {
    adaptations.push({
      type: 'exercise_selection',
      field: 'workoutType',
      originalValue: originalPlan.workoutType,
      adaptedValue: 'recovery',
      reason: 'Lower readiness - swap to recovery-focused exercises.',
      contributingFactors: factors
        .filter(f => f.status === 'negative' && ['sleep', 'recovery_days', 'muscle_soreness'].includes(f.code))
        .map(f => f.code),
    });
  }
  
  return adaptations;
}

/**
 * Clamp value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// =============================================================================
// Action Formatting
// =============================================================================

/**
 * Format action for display
 */
export function formatAction(action: GeneratedAction): {
  title: string;
  description: string;
  icon?: string;
  color?: string;
} {
  const colors: Record<string, string> = {
    [DAILY_ACTIONS.REST]: '#6366F1',
    [DAILY_ACTIONS.RECOVERY]: '#10B981',
    [DAILY_ACTIONS.LIGHT_WORKOUT]: '#3B82F6',
    [DAILY_ACTIONS.START_WORKOUT]: '#EF4444',
    [DAILY_ACTIONS.ADD_PROTEIN]: '#F59E0B',
    [DAILY_ACTIONS.DRINK_WATER]: '#06B6D4',
    [DAILY_ACTIONS.SHORT_WALK]: '#8B5CF6',
    [DAILY_ACTIONS.PREPARE_SLEEP]: '#6366F1',
    [DAILY_ACTIONS.COMPLETE_CHECKIN]: '#3B82F6',
  };
  
  return {
    title: action.title,
    description: action.description,
    color: colors[action.type] ?? '#6B7280',
  };
}

/**
 * Convert generated action to stored action
 */
export function toStoredAction(
  action: GeneratedAction,
  userId: string,
  date: string
): DailyAction {
  const now = Date.now();
  
  return {
    id: crypto.randomUUID(),
    userId,
    date,
    type: action.type,
    priority: action.priority,
    title: action.title,
    description: action.description,
    status: ACTION_STATUS.PENDING,
    completedAt: null,
    skippedAt: null,
    skipReason: null,
    metadata: action.metadata,
    createdAt: now,
    updatedAt: now,
  };
}
