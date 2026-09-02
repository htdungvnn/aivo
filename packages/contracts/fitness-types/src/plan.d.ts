/**
 * AIVO Fitness Types - Workout Plans
 * Plan management, revisions, and AI planning
 */
import { z } from 'zod';
export declare const PLAN_STATUS: {
    readonly DRAFT: 'draft';
    readonly ACTIVE: 'active';
    readonly COMPLETED: 'completed';
    readonly ARCHIVED: 'archived';
};
export type PlanStatus = (typeof PLAN_STATUS)[keyof typeof PLAN_STATUS];
export declare const ADJUSTMENT_REASONS: {
    readonly INITIAL_PLAN: 'initial_plan';
    readonly WEEKLY_PROGRESSION: 'weekly_progression';
    readonly ADHERENCE_GOOD: 'adherence_good';
    readonly ADHERENCE_POOR: 'adherence_poor';
    readonly USER_GOAL_CHANGED: 'user_goal_changed';
    readonly USER_FEEDBACK: 'user_feedback';
    readonly RECOVERY_NEEDED: 'recovery_needed';
    readonly PLATEAU_DETECTED: 'plateau_detected';
    readonly AI_RECOMMENDATION: 'ai_recommendation';
};
export type AdjustmentReason = (typeof ADJUSTMENT_REASONS)[keyof typeof ADJUSTMENT_REASONS];
/**
 * Exercise entry in a workout plan
 */
export declare const planExerciseSchema: z.ZodObject<{
    exerciseCode: z.ZodString;
    order: z.ZodNumber;
    targetSets: z.ZodDefault<z.ZodNumber>;
    targetReps: z.ZodDefault<z.ZodNumber>;
    restBetweenSetsMs: z.ZodDefault<z.ZodNumber>;
    restAfterExerciseMs: z.ZodDefault<z.ZodNumber>;
    increaseWhenMastered: z.ZodOptional<z.ZodObject<{
        reps: z.ZodOptional<z.ZodNumber>;
        sets: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
    userLocked: z.ZodDefault<z.ZodBoolean>;
    userSets: z.ZodOptional<z.ZodNumber>;
    userReps: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type PlanExercise = z.infer<typeof planExerciseSchema>;
/**
 * Single workout day in a plan
 */
export declare const workoutDaySchema: z.ZodObject<{
    id: z.ZodString;
    dayNumber: z.ZodNumber;
    name: z.ZodOptional<z.ZodString>;
    exercises: z.ZodArray<z.ZodObject<{
        exerciseCode: z.ZodString;
        order: z.ZodNumber;
        targetSets: z.ZodDefault<z.ZodNumber>;
        targetReps: z.ZodDefault<z.ZodNumber>;
        restBetweenSetsMs: z.ZodDefault<z.ZodNumber>;
        restAfterExerciseMs: z.ZodDefault<z.ZodNumber>;
        increaseWhenMastered: z.ZodOptional<z.ZodObject<{
            reps: z.ZodOptional<z.ZodNumber>;
            sets: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
        userLocked: z.ZodDefault<z.ZodBoolean>;
        userSets: z.ZodOptional<z.ZodNumber>;
        userReps: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
    isRestDay: z.ZodDefault<z.ZodBoolean>;
    estimatedDurationMs: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type WorkoutDay = z.infer<typeof workoutDaySchema>;
/**
 * Complete workout plan
 */
export declare const workoutPlanSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    status: z.ZodEnum<{
        active: "active";
        archived: "archived";
        completed: "completed";
        draft: "draft";
    }>;
    revision: z.ZodDefault<z.ZodNumber>;
    previousRevisionId: z.ZodOptional<z.ZodString>;
    goal: z.ZodEnum<{
        fat_loss: "fat_loss";
        general_fitness: "general_fitness";
        mobility: "mobility";
        muscle_gain: "muscle_gain";
    }>;
    workoutDaysPerWeek: z.ZodDefault<z.ZodNumber>;
    workouts: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        dayNumber: z.ZodNumber;
        name: z.ZodOptional<z.ZodString>;
        exercises: z.ZodArray<z.ZodObject<{
            exerciseCode: z.ZodString;
            order: z.ZodNumber;
            targetSets: z.ZodDefault<z.ZodNumber>;
            targetReps: z.ZodDefault<z.ZodNumber>;
            restBetweenSetsMs: z.ZodDefault<z.ZodNumber>;
            restAfterExerciseMs: z.ZodDefault<z.ZodNumber>;
            increaseWhenMastered: z.ZodOptional<z.ZodObject<{
                reps: z.ZodOptional<z.ZodNumber>;
                sets: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strip>>;
            userLocked: z.ZodDefault<z.ZodBoolean>;
            userSets: z.ZodOptional<z.ZodNumber>;
            userReps: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
        isRestDay: z.ZodDefault<z.ZodBoolean>;
        estimatedDurationMs: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
    durationWeeks: z.ZodDefault<z.ZodNumber>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    name: z.ZodDefault<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    createdWithAI: z.ZodDefault<z.ZodBoolean>;
    aiModel: z.ZodOptional<z.ZodString>;
    aiPromptVersion: z.ZodOptional<z.ZodString>;
    lastAdjustmentReason: z.ZodOptional<z.ZodEnum<{
        adherence_good: "adherence_good";
        adherence_poor: "adherence_poor";
        ai_recommendation: "ai_recommendation";
        initial_plan: "initial_plan";
        plateau_detected: "plateau_detected";
        recovery_needed: "recovery_needed";
        user_feedback: "user_feedback";
        user_goal_changed: "user_goal_changed";
        weekly_progression: "weekly_progression";
    }>>;
    createdAt: z.ZodNumber;
    updatedAt: z.ZodNumber;
    activatedAt: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type WorkoutPlan = z.infer<typeof workoutPlanSchema>;
/**
 * Aggregated progress for a user
 */
export declare const progressSummarySchema: z.ZodObject<{
    userId: z.ZodString;
    periodStart: z.ZodNumber;
    periodEnd: z.ZodNumber;
    totalWorkouts: z.ZodNumber;
    completedWorkouts: z.ZodNumber;
    totalDurationMs: z.ZodNumber;
    exercisesPerformed: z.ZodRecord<z.ZodString, z.ZodObject<{
        totalSets: z.ZodNumber;
        totalReps: z.ZodNumber;
        averageQualityScore: z.ZodNumber;
        completionRate: z.ZodNumber;
    }, z.core.$strip>>;
    averageQualityScore: z.ZodNumber;
    averageRangeOfMotion: z.ZodNumber;
    formComplianceRate: z.ZodNumber;
    adherenceRate: z.ZodNumber;
    plannedWorkouts: z.ZodNumber;
    qualityTrend: z.ZodOptional<z.ZodEnum<{
        declining: "declining";
        improving: "improving";
        stable: "stable";
    }>>;
    volumeTrend: z.ZodOptional<z.ZodEnum<{
        decreasing: "decreasing";
        increasing: "increasing";
        stable: "stable";
    }>>;
    goalProgress: z.ZodOptional<z.ZodObject<{
        current: z.ZodNumber;
        target: z.ZodDefault<z.ZodNumber>;
        percentage: z.ZodNumber;
    }, z.core.$strip>>;
    correctionTrends: z.ZodRecord<z.ZodString, z.ZodObject<{
        frequency: z.ZodNumber;
        trend: z.ZodEnum<{
            improving: "improving";
            stable: "stable";
            worsening: "worsening";
        }>;
    }, z.core.$strip>>;
    lastUpdated: z.ZodNumber;
}, z.core.$strip>;
export type ProgressSummary = z.infer<typeof progressSummarySchema>;
/**
 * Request for AI to generate or adjust a plan
 */
export declare const aiPlanningRequestSchema: z.ZodObject<{
    userId: z.ZodString;
    currentGoal: z.ZodEnum<{
        fat_loss: "fat_loss";
        general_fitness: "general_fitness";
        mobility: "mobility";
        muscle_gain: "muscle_gain";
    }>;
    previousPlan: z.ZodOptional<z.ZodObject<{
        id: z.ZodString;
        userId: z.ZodString;
        status: z.ZodEnum<{
            active: "active";
            archived: "archived";
            completed: "completed";
            draft: "draft";
        }>;
        revision: z.ZodDefault<z.ZodNumber>;
        previousRevisionId: z.ZodOptional<z.ZodString>;
        goal: z.ZodEnum<{
            fat_loss: "fat_loss";
            general_fitness: "general_fitness";
            mobility: "mobility";
            muscle_gain: "muscle_gain";
        }>;
        workoutDaysPerWeek: z.ZodDefault<z.ZodNumber>;
        workouts: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            dayNumber: z.ZodNumber;
            name: z.ZodOptional<z.ZodString>;
            exercises: z.ZodArray<z.ZodObject<{
                exerciseCode: z.ZodString;
                order: z.ZodNumber;
                targetSets: z.ZodDefault<z.ZodNumber>;
                targetReps: z.ZodDefault<z.ZodNumber>;
                restBetweenSetsMs: z.ZodDefault<z.ZodNumber>;
                restAfterExerciseMs: z.ZodDefault<z.ZodNumber>;
                increaseWhenMastered: z.ZodOptional<z.ZodObject<{
                    reps: z.ZodOptional<z.ZodNumber>;
                    sets: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strip>>;
                userLocked: z.ZodDefault<z.ZodBoolean>;
                userSets: z.ZodOptional<z.ZodNumber>;
                userReps: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strip>>;
            isRestDay: z.ZodDefault<z.ZodBoolean>;
            estimatedDurationMs: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
        durationWeeks: z.ZodDefault<z.ZodNumber>;
        startDate: z.ZodOptional<z.ZodString>;
        endDate: z.ZodOptional<z.ZodString>;
        name: z.ZodDefault<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        createdWithAI: z.ZodDefault<z.ZodBoolean>;
        aiModel: z.ZodOptional<z.ZodString>;
        aiPromptVersion: z.ZodOptional<z.ZodString>;
        lastAdjustmentReason: z.ZodOptional<z.ZodEnum<{
            adherence_good: "adherence_good";
            adherence_poor: "adherence_poor";
            ai_recommendation: "ai_recommendation";
            initial_plan: "initial_plan";
            plateau_detected: "plateau_detected";
            recovery_needed: "recovery_needed";
            user_feedback: "user_feedback";
            user_goal_changed: "user_goal_changed";
            weekly_progression: "weekly_progression";
        }>>;
        createdAt: z.ZodNumber;
        updatedAt: z.ZodNumber;
        activatedAt: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
    recentWorkouts: z.ZodOptional<z.ZodArray<z.ZodObject<{
        completedAt: z.ZodNumber;
        exercises: z.ZodArray<z.ZodObject<{
            exerciseCode: z.ZodString;
            completedSets: z.ZodNumber;
            totalReps: z.ZodNumber;
            qualityScore: z.ZodNumber;
        }, z.core.$strip>>;
        adherenceRate: z.ZodNumber;
    }, z.core.$strip>>>;
    availableExercises: z.ZodOptional<z.ZodArray<z.ZodString>>;
    excludedExercises: z.ZodOptional<z.ZodArray<z.ZodString>>;
    maxWorkoutsPerWeek: z.ZodOptional<z.ZodNumber>;
    maxSessionDurationMs: z.ZodOptional<z.ZodNumber>;
    userFeedback: z.ZodOptional<z.ZodString>;
    preferredSessionTime: z.ZodOptional<z.ZodEnum<{
        afternoon: "afternoon";
        evening: "evening";
        morning: "morning";
    }>>;
    reason: z.ZodEnum<{
        adherence_good: "adherence_good";
        adherence_poor: "adherence_poor";
        initial_plan: "initial_plan";
        plateau_detected: "plateau_detected";
        recovery_needed: "recovery_needed";
        user_feedback: "user_feedback";
        user_goal_changed: "user_goal_changed";
        weekly_progression: "weekly_progression";
    }>;
    model: z.ZodOptional<z.ZodString>;
    temperature: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type AIPlanningRequest = z.infer<typeof aiPlanningRequestSchema>;
export declare const PLANNING_JOB_STATUS: {
    readonly PENDING: 'pending';
    readonly PROCESSING: 'processing';
    readonly COMPLETED: 'completed';
    readonly FAILED: 'failed';
};
export type PlanningJobStatus = (typeof PLANNING_JOB_STATUS)[keyof typeof PLANNING_JOB_STATUS];
/**
 * AI planning job tracking
 */
export declare const planningJobSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    status: z.ZodEnum<{
        completed: "completed";
        failed: "failed";
        pending: "pending";
        processing: "processing";
    }>;
    request: z.ZodObject<{
        userId: z.ZodString;
        currentGoal: z.ZodEnum<{
            fat_loss: "fat_loss";
            general_fitness: "general_fitness";
            mobility: "mobility";
            muscle_gain: "muscle_gain";
        }>;
        previousPlan: z.ZodOptional<z.ZodObject<{
            id: z.ZodString;
            userId: z.ZodString;
            status: z.ZodEnum<{
                active: "active";
                archived: "archived";
                completed: "completed";
                draft: "draft";
            }>;
            revision: z.ZodDefault<z.ZodNumber>;
            previousRevisionId: z.ZodOptional<z.ZodString>;
            goal: z.ZodEnum<{
                fat_loss: "fat_loss";
                general_fitness: "general_fitness";
                mobility: "mobility";
                muscle_gain: "muscle_gain";
            }>;
            workoutDaysPerWeek: z.ZodDefault<z.ZodNumber>;
            workouts: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                dayNumber: z.ZodNumber;
                name: z.ZodOptional<z.ZodString>;
                exercises: z.ZodArray<z.ZodObject<{
                    exerciseCode: z.ZodString;
                    order: z.ZodNumber;
                    targetSets: z.ZodDefault<z.ZodNumber>;
                    targetReps: z.ZodDefault<z.ZodNumber>;
                    restBetweenSetsMs: z.ZodDefault<z.ZodNumber>;
                    restAfterExerciseMs: z.ZodDefault<z.ZodNumber>;
                    increaseWhenMastered: z.ZodOptional<z.ZodObject<{
                        reps: z.ZodOptional<z.ZodNumber>;
                        sets: z.ZodOptional<z.ZodNumber>;
                    }, z.core.$strip>>;
                    userLocked: z.ZodDefault<z.ZodBoolean>;
                    userSets: z.ZodOptional<z.ZodNumber>;
                    userReps: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strip>>;
                isRestDay: z.ZodDefault<z.ZodBoolean>;
                estimatedDurationMs: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strip>>;
            durationWeeks: z.ZodDefault<z.ZodNumber>;
            startDate: z.ZodOptional<z.ZodString>;
            endDate: z.ZodOptional<z.ZodString>;
            name: z.ZodDefault<z.ZodString>;
            description: z.ZodOptional<z.ZodString>;
            createdWithAI: z.ZodDefault<z.ZodBoolean>;
            aiModel: z.ZodOptional<z.ZodString>;
            aiPromptVersion: z.ZodOptional<z.ZodString>;
            lastAdjustmentReason: z.ZodOptional<z.ZodEnum<{
                adherence_good: "adherence_good";
                adherence_poor: "adherence_poor";
                ai_recommendation: "ai_recommendation";
                initial_plan: "initial_plan";
                plateau_detected: "plateau_detected";
                recovery_needed: "recovery_needed";
                user_feedback: "user_feedback";
                user_goal_changed: "user_goal_changed";
                weekly_progression: "weekly_progression";
            }>>;
            createdAt: z.ZodNumber;
            updatedAt: z.ZodNumber;
            activatedAt: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
        recentWorkouts: z.ZodOptional<z.ZodArray<z.ZodObject<{
            completedAt: z.ZodNumber;
            exercises: z.ZodArray<z.ZodObject<{
                exerciseCode: z.ZodString;
                completedSets: z.ZodNumber;
                totalReps: z.ZodNumber;
                qualityScore: z.ZodNumber;
            }, z.core.$strip>>;
            adherenceRate: z.ZodNumber;
        }, z.core.$strip>>>;
        availableExercises: z.ZodOptional<z.ZodArray<z.ZodString>>;
        excludedExercises: z.ZodOptional<z.ZodArray<z.ZodString>>;
        maxWorkoutsPerWeek: z.ZodOptional<z.ZodNumber>;
        maxSessionDurationMs: z.ZodOptional<z.ZodNumber>;
        userFeedback: z.ZodOptional<z.ZodString>;
        preferredSessionTime: z.ZodOptional<z.ZodEnum<{
            afternoon: "afternoon";
            evening: "evening";
            morning: "morning";
        }>>;
        reason: z.ZodEnum<{
            adherence_good: "adherence_good";
            adherence_poor: "adherence_poor";
            initial_plan: "initial_plan";
            plateau_detected: "plateau_detected";
            recovery_needed: "recovery_needed";
            user_feedback: "user_feedback";
            user_goal_changed: "user_goal_changed";
            weekly_progression: "weekly_progression";
        }>;
        model: z.ZodOptional<z.ZodString>;
        temperature: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>;
    generatedPlan: z.ZodOptional<z.ZodObject<{
        id: z.ZodString;
        userId: z.ZodString;
        status: z.ZodEnum<{
            active: "active";
            archived: "archived";
            completed: "completed";
            draft: "draft";
        }>;
        revision: z.ZodDefault<z.ZodNumber>;
        previousRevisionId: z.ZodOptional<z.ZodString>;
        goal: z.ZodEnum<{
            fat_loss: "fat_loss";
            general_fitness: "general_fitness";
            mobility: "mobility";
            muscle_gain: "muscle_gain";
        }>;
        workoutDaysPerWeek: z.ZodDefault<z.ZodNumber>;
        workouts: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            dayNumber: z.ZodNumber;
            name: z.ZodOptional<z.ZodString>;
            exercises: z.ZodArray<z.ZodObject<{
                exerciseCode: z.ZodString;
                order: z.ZodNumber;
                targetSets: z.ZodDefault<z.ZodNumber>;
                targetReps: z.ZodDefault<z.ZodNumber>;
                restBetweenSetsMs: z.ZodDefault<z.ZodNumber>;
                restAfterExerciseMs: z.ZodDefault<z.ZodNumber>;
                increaseWhenMastered: z.ZodOptional<z.ZodObject<{
                    reps: z.ZodOptional<z.ZodNumber>;
                    sets: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strip>>;
                userLocked: z.ZodDefault<z.ZodBoolean>;
                userSets: z.ZodOptional<z.ZodNumber>;
                userReps: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strip>>;
            isRestDay: z.ZodDefault<z.ZodBoolean>;
            estimatedDurationMs: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
        durationWeeks: z.ZodDefault<z.ZodNumber>;
        startDate: z.ZodOptional<z.ZodString>;
        endDate: z.ZodOptional<z.ZodString>;
        name: z.ZodDefault<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        createdWithAI: z.ZodDefault<z.ZodBoolean>;
        aiModel: z.ZodOptional<z.ZodString>;
        aiPromptVersion: z.ZodOptional<z.ZodString>;
        lastAdjustmentReason: z.ZodOptional<z.ZodEnum<{
            adherence_good: "adherence_good";
            adherence_poor: "adherence_poor";
            ai_recommendation: "ai_recommendation";
            initial_plan: "initial_plan";
            plateau_detected: "plateau_detected";
            recovery_needed: "recovery_needed";
            user_feedback: "user_feedback";
            user_goal_changed: "user_goal_changed";
            weekly_progression: "weekly_progression";
        }>>;
        createdAt: z.ZodNumber;
        updatedAt: z.ZodNumber;
        activatedAt: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
    errorMessage: z.ZodOptional<z.ZodString>;
    model: z.ZodOptional<z.ZodString>;
    promptTokens: z.ZodOptional<z.ZodNumber>;
    completionTokens: z.ZodOptional<z.ZodNumber>;
    createdAt: z.ZodNumber;
    startedAt: z.ZodOptional<z.ZodNumber>;
    completedAt: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type PlanningJob = z.infer<typeof planningJobSchema>;
/**
 * User exercise preferences
 */
export declare const userExercisePreferencesSchema: z.ZodObject<{
    userId: z.ZodString;
    exerciseCode: z.ZodString;
    experienceLevel: z.ZodDefault<z.ZodEnum<{
        advanced: "advanced";
        beginner: "beginner";
        intermediate: "intermediate";
    }>>;
    personalRecords: z.ZodOptional<z.ZodObject<{
        maxReps: z.ZodOptional<z.ZodNumber>;
        maxSets: z.ZodOptional<z.ZodNumber>;
        bestQualityScore: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
    excluded: z.ZodDefault<z.ZodBoolean>;
    exclusionReason: z.ZodOptional<z.ZodString>;
    modifications: z.ZodOptional<z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<{
            reps: "reps";
            rest: "rest";
            sets: "sets";
            tempo: "tempo";
        }>;
        value: z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>;
        reason: z.ZodString;
    }, z.core.$strip>>>;
    createdAt: z.ZodNumber;
    updatedAt: z.ZodNumber;
}, z.core.$strip>;
export type UserExercisePreferences = z.infer<typeof userExercisePreferencesSchema>;
/**
 * User fitness goals
 */
export declare const userFitnessGoalsSchema: z.ZodObject<{
    userId: z.ZodString;
    primaryGoal: z.ZodEnum<{
        fat_loss: "fat_loss";
        general_fitness: "general_fitness";
        mobility: "mobility";
        muscle_gain: "muscle_gain";
    }>;
    secondaryGoals: z.ZodOptional<z.ZodArray<z.ZodEnum<{
        fat_loss: "fat_loss";
        general_fitness: "general_fitness";
        mobility: "mobility";
        muscle_gain: "muscle_gain";
    }>>>;
    experienceLevel: z.ZodDefault<z.ZodEnum<{
        advanced: "advanced";
        beginner: "beginner";
        intermediate: "intermediate";
    }>>;
    limitations: z.ZodOptional<z.ZodArray<z.ZodString>>;
    equipment: z.ZodOptional<z.ZodArray<z.ZodString>>;
    preferredWorkoutDays: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
    preferredSessionDurationMs: z.ZodOptional<z.ZodNumber>;
    reminderEnabled: z.ZodDefault<z.ZodBoolean>;
    reminderTime: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodNumber;
    updatedAt: z.ZodNumber;
}, z.core.$strip>;
export type UserFitnessGoals = z.infer<typeof userFitnessGoalsSchema>;
export declare const planTypes: {
    readonly PLAN_STATUS: {
        readonly DRAFT: 'draft';
        readonly ACTIVE: 'active';
        readonly COMPLETED: 'completed';
        readonly ARCHIVED: 'archived';
    };
    readonly ADJUSTMENT_REASONS: {
        readonly INITIAL_PLAN: 'initial_plan';
        readonly WEEKLY_PROGRESSION: 'weekly_progression';
        readonly ADHERENCE_GOOD: 'adherence_good';
        readonly ADHERENCE_POOR: 'adherence_poor';
        readonly USER_GOAL_CHANGED: 'user_goal_changed';
        readonly USER_FEEDBACK: 'user_feedback';
        readonly RECOVERY_NEEDED: 'recovery_needed';
        readonly PLATEAU_DETECTED: 'plateau_detected';
        readonly AI_RECOMMENDATION: 'ai_recommendation';
    };
    readonly PLANNING_JOB_STATUS: {
        readonly PENDING: 'pending';
        readonly PROCESSING: 'processing';
        readonly COMPLETED: 'completed';
        readonly FAILED: 'failed';
    };
    readonly planExerciseSchema: z.ZodObject<{
        exerciseCode: z.ZodString;
        order: z.ZodNumber;
        targetSets: z.ZodDefault<z.ZodNumber>;
        targetReps: z.ZodDefault<z.ZodNumber>;
        restBetweenSetsMs: z.ZodDefault<z.ZodNumber>;
        restAfterExerciseMs: z.ZodDefault<z.ZodNumber>;
        increaseWhenMastered: z.ZodOptional<z.ZodObject<{
            reps: z.ZodOptional<z.ZodNumber>;
            sets: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
        userLocked: z.ZodDefault<z.ZodBoolean>;
        userSets: z.ZodOptional<z.ZodNumber>;
        userReps: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>;
    readonly workoutDaySchema: z.ZodObject<{
        id: z.ZodString;
        dayNumber: z.ZodNumber;
        name: z.ZodOptional<z.ZodString>;
        exercises: z.ZodArray<z.ZodObject<{
            exerciseCode: z.ZodString;
            order: z.ZodNumber;
            targetSets: z.ZodDefault<z.ZodNumber>;
            targetReps: z.ZodDefault<z.ZodNumber>;
            restBetweenSetsMs: z.ZodDefault<z.ZodNumber>;
            restAfterExerciseMs: z.ZodDefault<z.ZodNumber>;
            increaseWhenMastered: z.ZodOptional<z.ZodObject<{
                reps: z.ZodOptional<z.ZodNumber>;
                sets: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strip>>;
            userLocked: z.ZodDefault<z.ZodBoolean>;
            userSets: z.ZodOptional<z.ZodNumber>;
            userReps: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
        isRestDay: z.ZodDefault<z.ZodBoolean>;
        estimatedDurationMs: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>;
    readonly workoutPlanSchema: z.ZodObject<{
        id: z.ZodString;
        userId: z.ZodString;
        status: z.ZodEnum<{
            active: "active";
            archived: "archived";
            completed: "completed";
            draft: "draft";
        }>;
        revision: z.ZodDefault<z.ZodNumber>;
        previousRevisionId: z.ZodOptional<z.ZodString>;
        goal: z.ZodEnum<{
            fat_loss: "fat_loss";
            general_fitness: "general_fitness";
            mobility: "mobility";
            muscle_gain: "muscle_gain";
        }>;
        workoutDaysPerWeek: z.ZodDefault<z.ZodNumber>;
        workouts: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            dayNumber: z.ZodNumber;
            name: z.ZodOptional<z.ZodString>;
            exercises: z.ZodArray<z.ZodObject<{
                exerciseCode: z.ZodString;
                order: z.ZodNumber;
                targetSets: z.ZodDefault<z.ZodNumber>;
                targetReps: z.ZodDefault<z.ZodNumber>;
                restBetweenSetsMs: z.ZodDefault<z.ZodNumber>;
                restAfterExerciseMs: z.ZodDefault<z.ZodNumber>;
                increaseWhenMastered: z.ZodOptional<z.ZodObject<{
                    reps: z.ZodOptional<z.ZodNumber>;
                    sets: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strip>>;
                userLocked: z.ZodDefault<z.ZodBoolean>;
                userSets: z.ZodOptional<z.ZodNumber>;
                userReps: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strip>>;
            isRestDay: z.ZodDefault<z.ZodBoolean>;
            estimatedDurationMs: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
        durationWeeks: z.ZodDefault<z.ZodNumber>;
        startDate: z.ZodOptional<z.ZodString>;
        endDate: z.ZodOptional<z.ZodString>;
        name: z.ZodDefault<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        createdWithAI: z.ZodDefault<z.ZodBoolean>;
        aiModel: z.ZodOptional<z.ZodString>;
        aiPromptVersion: z.ZodOptional<z.ZodString>;
        lastAdjustmentReason: z.ZodOptional<z.ZodEnum<{
            adherence_good: "adherence_good";
            adherence_poor: "adherence_poor";
            ai_recommendation: "ai_recommendation";
            initial_plan: "initial_plan";
            plateau_detected: "plateau_detected";
            recovery_needed: "recovery_needed";
            user_feedback: "user_feedback";
            user_goal_changed: "user_goal_changed";
            weekly_progression: "weekly_progression";
        }>>;
        createdAt: z.ZodNumber;
        updatedAt: z.ZodNumber;
        activatedAt: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>;
    readonly progressSummarySchema: z.ZodObject<{
        userId: z.ZodString;
        periodStart: z.ZodNumber;
        periodEnd: z.ZodNumber;
        totalWorkouts: z.ZodNumber;
        completedWorkouts: z.ZodNumber;
        totalDurationMs: z.ZodNumber;
        exercisesPerformed: z.ZodRecord<z.ZodString, z.ZodObject<{
            totalSets: z.ZodNumber;
            totalReps: z.ZodNumber;
            averageQualityScore: z.ZodNumber;
            completionRate: z.ZodNumber;
        }, z.core.$strip>>;
        averageQualityScore: z.ZodNumber;
        averageRangeOfMotion: z.ZodNumber;
        formComplianceRate: z.ZodNumber;
        adherenceRate: z.ZodNumber;
        plannedWorkouts: z.ZodNumber;
        qualityTrend: z.ZodOptional<z.ZodEnum<{
            declining: "declining";
            improving: "improving";
            stable: "stable";
        }>>;
        volumeTrend: z.ZodOptional<z.ZodEnum<{
            decreasing: "decreasing";
            increasing: "increasing";
            stable: "stable";
        }>>;
        goalProgress: z.ZodOptional<z.ZodObject<{
            current: z.ZodNumber;
            target: z.ZodDefault<z.ZodNumber>;
            percentage: z.ZodNumber;
        }, z.core.$strip>>;
        correctionTrends: z.ZodRecord<z.ZodString, z.ZodObject<{
            frequency: z.ZodNumber;
            trend: z.ZodEnum<{
                improving: "improving";
                stable: "stable";
                worsening: "worsening";
            }>;
        }, z.core.$strip>>;
        lastUpdated: z.ZodNumber;
    }, z.core.$strip>;
    readonly aiPlanningRequestSchema: z.ZodObject<{
        userId: z.ZodString;
        currentGoal: z.ZodEnum<{
            fat_loss: "fat_loss";
            general_fitness: "general_fitness";
            mobility: "mobility";
            muscle_gain: "muscle_gain";
        }>;
        previousPlan: z.ZodOptional<z.ZodObject<{
            id: z.ZodString;
            userId: z.ZodString;
            status: z.ZodEnum<{
                active: "active";
                archived: "archived";
                completed: "completed";
                draft: "draft";
            }>;
            revision: z.ZodDefault<z.ZodNumber>;
            previousRevisionId: z.ZodOptional<z.ZodString>;
            goal: z.ZodEnum<{
                fat_loss: "fat_loss";
                general_fitness: "general_fitness";
                mobility: "mobility";
                muscle_gain: "muscle_gain";
            }>;
            workoutDaysPerWeek: z.ZodDefault<z.ZodNumber>;
            workouts: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                dayNumber: z.ZodNumber;
                name: z.ZodOptional<z.ZodString>;
                exercises: z.ZodArray<z.ZodObject<{
                    exerciseCode: z.ZodString;
                    order: z.ZodNumber;
                    targetSets: z.ZodDefault<z.ZodNumber>;
                    targetReps: z.ZodDefault<z.ZodNumber>;
                    restBetweenSetsMs: z.ZodDefault<z.ZodNumber>;
                    restAfterExerciseMs: z.ZodDefault<z.ZodNumber>;
                    increaseWhenMastered: z.ZodOptional<z.ZodObject<{
                        reps: z.ZodOptional<z.ZodNumber>;
                        sets: z.ZodOptional<z.ZodNumber>;
                    }, z.core.$strip>>;
                    userLocked: z.ZodDefault<z.ZodBoolean>;
                    userSets: z.ZodOptional<z.ZodNumber>;
                    userReps: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strip>>;
                isRestDay: z.ZodDefault<z.ZodBoolean>;
                estimatedDurationMs: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strip>>;
            durationWeeks: z.ZodDefault<z.ZodNumber>;
            startDate: z.ZodOptional<z.ZodString>;
            endDate: z.ZodOptional<z.ZodString>;
            name: z.ZodDefault<z.ZodString>;
            description: z.ZodOptional<z.ZodString>;
            createdWithAI: z.ZodDefault<z.ZodBoolean>;
            aiModel: z.ZodOptional<z.ZodString>;
            aiPromptVersion: z.ZodOptional<z.ZodString>;
            lastAdjustmentReason: z.ZodOptional<z.ZodEnum<{
                adherence_good: "adherence_good";
                adherence_poor: "adherence_poor";
                ai_recommendation: "ai_recommendation";
                initial_plan: "initial_plan";
                plateau_detected: "plateau_detected";
                recovery_needed: "recovery_needed";
                user_feedback: "user_feedback";
                user_goal_changed: "user_goal_changed";
                weekly_progression: "weekly_progression";
            }>>;
            createdAt: z.ZodNumber;
            updatedAt: z.ZodNumber;
            activatedAt: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
        recentWorkouts: z.ZodOptional<z.ZodArray<z.ZodObject<{
            completedAt: z.ZodNumber;
            exercises: z.ZodArray<z.ZodObject<{
                exerciseCode: z.ZodString;
                completedSets: z.ZodNumber;
                totalReps: z.ZodNumber;
                qualityScore: z.ZodNumber;
            }, z.core.$strip>>;
            adherenceRate: z.ZodNumber;
        }, z.core.$strip>>>;
        availableExercises: z.ZodOptional<z.ZodArray<z.ZodString>>;
        excludedExercises: z.ZodOptional<z.ZodArray<z.ZodString>>;
        maxWorkoutsPerWeek: z.ZodOptional<z.ZodNumber>;
        maxSessionDurationMs: z.ZodOptional<z.ZodNumber>;
        userFeedback: z.ZodOptional<z.ZodString>;
        preferredSessionTime: z.ZodOptional<z.ZodEnum<{
            afternoon: "afternoon";
            evening: "evening";
            morning: "morning";
        }>>;
        reason: z.ZodEnum<{
            adherence_good: "adherence_good";
            adherence_poor: "adherence_poor";
            initial_plan: "initial_plan";
            plateau_detected: "plateau_detected";
            recovery_needed: "recovery_needed";
            user_feedback: "user_feedback";
            user_goal_changed: "user_goal_changed";
            weekly_progression: "weekly_progression";
        }>;
        model: z.ZodOptional<z.ZodString>;
        temperature: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>;
    readonly planningJobSchema: z.ZodObject<{
        id: z.ZodString;
        userId: z.ZodString;
        status: z.ZodEnum<{
            completed: "completed";
            failed: "failed";
            pending: "pending";
            processing: "processing";
        }>;
        request: z.ZodObject<{
            userId: z.ZodString;
            currentGoal: z.ZodEnum<{
                fat_loss: "fat_loss";
                general_fitness: "general_fitness";
                mobility: "mobility";
                muscle_gain: "muscle_gain";
            }>;
            previousPlan: z.ZodOptional<z.ZodObject<{
                id: z.ZodString;
                userId: z.ZodString;
                status: z.ZodEnum<{
                    active: "active";
                    archived: "archived";
                    completed: "completed";
                    draft: "draft";
                }>;
                revision: z.ZodDefault<z.ZodNumber>;
                previousRevisionId: z.ZodOptional<z.ZodString>;
                goal: z.ZodEnum<{
                    fat_loss: "fat_loss";
                    general_fitness: "general_fitness";
                    mobility: "mobility";
                    muscle_gain: "muscle_gain";
                }>;
                workoutDaysPerWeek: z.ZodDefault<z.ZodNumber>;
                workouts: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    dayNumber: z.ZodNumber;
                    name: z.ZodOptional<z.ZodString>;
                    exercises: z.ZodArray<z.ZodObject<{
                        exerciseCode: z.ZodString;
                        order: z.ZodNumber;
                        targetSets: z.ZodDefault<z.ZodNumber>;
                        targetReps: z.ZodDefault<z.ZodNumber>;
                        restBetweenSetsMs: z.ZodDefault<z.ZodNumber>;
                        restAfterExerciseMs: z.ZodDefault<z.ZodNumber>;
                        increaseWhenMastered: z.ZodOptional<z.ZodObject<{
                            reps: z.ZodOptional<z.ZodNumber>;
                            sets: z.ZodOptional<z.ZodNumber>;
                        }, z.core.$strip>>;
                        userLocked: z.ZodDefault<z.ZodBoolean>;
                        userSets: z.ZodOptional<z.ZodNumber>;
                        userReps: z.ZodOptional<z.ZodNumber>;
                    }, z.core.$strip>>;
                    isRestDay: z.ZodDefault<z.ZodBoolean>;
                    estimatedDurationMs: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strip>>;
                durationWeeks: z.ZodDefault<z.ZodNumber>;
                startDate: z.ZodOptional<z.ZodString>;
                endDate: z.ZodOptional<z.ZodString>;
                name: z.ZodDefault<z.ZodString>;
                description: z.ZodOptional<z.ZodString>;
                createdWithAI: z.ZodDefault<z.ZodBoolean>;
                aiModel: z.ZodOptional<z.ZodString>;
                aiPromptVersion: z.ZodOptional<z.ZodString>;
                lastAdjustmentReason: z.ZodOptional<z.ZodEnum<{
                    adherence_good: "adherence_good";
                    adherence_poor: "adherence_poor";
                    ai_recommendation: "ai_recommendation";
                    initial_plan: "initial_plan";
                    plateau_detected: "plateau_detected";
                    recovery_needed: "recovery_needed";
                    user_feedback: "user_feedback";
                    user_goal_changed: "user_goal_changed";
                    weekly_progression: "weekly_progression";
                }>>;
                createdAt: z.ZodNumber;
                updatedAt: z.ZodNumber;
                activatedAt: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strip>>;
            recentWorkouts: z.ZodOptional<z.ZodArray<z.ZodObject<{
                completedAt: z.ZodNumber;
                exercises: z.ZodArray<z.ZodObject<{
                    exerciseCode: z.ZodString;
                    completedSets: z.ZodNumber;
                    totalReps: z.ZodNumber;
                    qualityScore: z.ZodNumber;
                }, z.core.$strip>>;
                adherenceRate: z.ZodNumber;
            }, z.core.$strip>>>;
            availableExercises: z.ZodOptional<z.ZodArray<z.ZodString>>;
            excludedExercises: z.ZodOptional<z.ZodArray<z.ZodString>>;
            maxWorkoutsPerWeek: z.ZodOptional<z.ZodNumber>;
            maxSessionDurationMs: z.ZodOptional<z.ZodNumber>;
            userFeedback: z.ZodOptional<z.ZodString>;
            preferredSessionTime: z.ZodOptional<z.ZodEnum<{
                afternoon: "afternoon";
                evening: "evening";
                morning: "morning";
            }>>;
            reason: z.ZodEnum<{
                adherence_good: "adherence_good";
                adherence_poor: "adherence_poor";
                initial_plan: "initial_plan";
                plateau_detected: "plateau_detected";
                recovery_needed: "recovery_needed";
                user_feedback: "user_feedback";
                user_goal_changed: "user_goal_changed";
                weekly_progression: "weekly_progression";
            }>;
            model: z.ZodOptional<z.ZodString>;
            temperature: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>;
        generatedPlan: z.ZodOptional<z.ZodObject<{
            id: z.ZodString;
            userId: z.ZodString;
            status: z.ZodEnum<{
                active: "active";
                archived: "archived";
                completed: "completed";
                draft: "draft";
            }>;
            revision: z.ZodDefault<z.ZodNumber>;
            previousRevisionId: z.ZodOptional<z.ZodString>;
            goal: z.ZodEnum<{
                fat_loss: "fat_loss";
                general_fitness: "general_fitness";
                mobility: "mobility";
                muscle_gain: "muscle_gain";
            }>;
            workoutDaysPerWeek: z.ZodDefault<z.ZodNumber>;
            workouts: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                dayNumber: z.ZodNumber;
                name: z.ZodOptional<z.ZodString>;
                exercises: z.ZodArray<z.ZodObject<{
                    exerciseCode: z.ZodString;
                    order: z.ZodNumber;
                    targetSets: z.ZodDefault<z.ZodNumber>;
                    targetReps: z.ZodDefault<z.ZodNumber>;
                    restBetweenSetsMs: z.ZodDefault<z.ZodNumber>;
                    restAfterExerciseMs: z.ZodDefault<z.ZodNumber>;
                    increaseWhenMastered: z.ZodOptional<z.ZodObject<{
                        reps: z.ZodOptional<z.ZodNumber>;
                        sets: z.ZodOptional<z.ZodNumber>;
                    }, z.core.$strip>>;
                    userLocked: z.ZodDefault<z.ZodBoolean>;
                    userSets: z.ZodOptional<z.ZodNumber>;
                    userReps: z.ZodOptional<z.ZodNumber>;
                }, z.core.$strip>>;
                isRestDay: z.ZodDefault<z.ZodBoolean>;
                estimatedDurationMs: z.ZodOptional<z.ZodNumber>;
            }, z.core.$strip>>;
            durationWeeks: z.ZodDefault<z.ZodNumber>;
            startDate: z.ZodOptional<z.ZodString>;
            endDate: z.ZodOptional<z.ZodString>;
            name: z.ZodDefault<z.ZodString>;
            description: z.ZodOptional<z.ZodString>;
            createdWithAI: z.ZodDefault<z.ZodBoolean>;
            aiModel: z.ZodOptional<z.ZodString>;
            aiPromptVersion: z.ZodOptional<z.ZodString>;
            lastAdjustmentReason: z.ZodOptional<z.ZodEnum<{
                adherence_good: "adherence_good";
                adherence_poor: "adherence_poor";
                ai_recommendation: "ai_recommendation";
                initial_plan: "initial_plan";
                plateau_detected: "plateau_detected";
                recovery_needed: "recovery_needed";
                user_feedback: "user_feedback";
                user_goal_changed: "user_goal_changed";
                weekly_progression: "weekly_progression";
            }>>;
            createdAt: z.ZodNumber;
            updatedAt: z.ZodNumber;
            activatedAt: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
        errorMessage: z.ZodOptional<z.ZodString>;
        model: z.ZodOptional<z.ZodString>;
        promptTokens: z.ZodOptional<z.ZodNumber>;
        completionTokens: z.ZodOptional<z.ZodNumber>;
        createdAt: z.ZodNumber;
        startedAt: z.ZodOptional<z.ZodNumber>;
        completedAt: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>;
    readonly userExercisePreferencesSchema: z.ZodObject<{
        userId: z.ZodString;
        exerciseCode: z.ZodString;
        experienceLevel: z.ZodDefault<z.ZodEnum<{
            advanced: "advanced";
            beginner: "beginner";
            intermediate: "intermediate";
        }>>;
        personalRecords: z.ZodOptional<z.ZodObject<{
            maxReps: z.ZodOptional<z.ZodNumber>;
            maxSets: z.ZodOptional<z.ZodNumber>;
            bestQualityScore: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
        excluded: z.ZodDefault<z.ZodBoolean>;
        exclusionReason: z.ZodOptional<z.ZodString>;
        modifications: z.ZodOptional<z.ZodArray<z.ZodObject<{
            type: z.ZodEnum<{
                reps: "reps";
                rest: "rest";
                sets: "sets";
                tempo: "tempo";
            }>;
            value: z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>;
            reason: z.ZodString;
        }, z.core.$strip>>>;
        createdAt: z.ZodNumber;
        updatedAt: z.ZodNumber;
    }, z.core.$strip>;
    readonly userFitnessGoalsSchema: z.ZodObject<{
        userId: z.ZodString;
        primaryGoal: z.ZodEnum<{
            fat_loss: "fat_loss";
            general_fitness: "general_fitness";
            mobility: "mobility";
            muscle_gain: "muscle_gain";
        }>;
        secondaryGoals: z.ZodOptional<z.ZodArray<z.ZodEnum<{
            fat_loss: "fat_loss";
            general_fitness: "general_fitness";
            mobility: "mobility";
            muscle_gain: "muscle_gain";
        }>>>;
        experienceLevel: z.ZodDefault<z.ZodEnum<{
            advanced: "advanced";
            beginner: "beginner";
            intermediate: "intermediate";
        }>>;
        limitations: z.ZodOptional<z.ZodArray<z.ZodString>>;
        equipment: z.ZodOptional<z.ZodArray<z.ZodString>>;
        preferredWorkoutDays: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
        preferredSessionDurationMs: z.ZodOptional<z.ZodNumber>;
        reminderEnabled: z.ZodDefault<z.ZodBoolean>;
        reminderTime: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodNumber;
        updatedAt: z.ZodNumber;
    }, z.core.$strip>;
};
export default planTypes;
//# sourceMappingURL=plan.d.ts.map