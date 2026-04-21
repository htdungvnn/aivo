import * as XLSX from 'xlsx';
import type {
  User,
  Workout,
  WorkoutExercise,
  DailySchedule,
  ScheduledWorkout,
  ScheduledExercise,
  RecoveryTask,
  NutritionGoal,
  SleepGoal,
  ScheduleAdjustment,
  BodyMetric,
  BodyHeatmapData,
  HeatmapVectorPoint,
  VisionAnalysis,
  Conversation,
  AIRecommendation,
  RecommendationAction,
  GamificationProfile,
  Badge,
  Achievement,
  SocialProofCard,
  ActivityEvent,
} from '@aivo/shared-types';

/**
 * Comprehensive user data for export
 */
export interface ComprehensiveUserData {
  user: User;
  workouts: (Workout & { exercises?: WorkoutExercise[] })[];
  dailySchedules: (DailySchedule & { workout?: ScheduledWorkout })[];
  bodyMetrics: BodyMetric[];
  bodyHeatmaps: BodyHeatmapData[];
  visionAnalyses: VisionAnalysis[];
  conversations: Conversation[];
  aiRecommendations: AIRecommendation[];
  gamificationProfile?: GamificationProfile;
  badges: Badge[];
  achievements: Achievement[];
  socialProofCards: SocialProofCard[];
  activityEvents: ActivityEvent[];
}

/**
 * Excel Generator for AIVO data export
 * Generates multi-sheet Excel workbooks with user data
 */
export class ExcelGenerator {
  private readonly DATE_FORMAT = 'YYYY-MM-DD HH:mm:ss';
  private readonly DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

  /**
   * Generate complete Excel workbook from user data
   */
  generateAll(data: ComprehensiveUserData): Buffer {
    const wb = XLSX.XLSX.utils.book_new();

    // Add all sheets
    wb.SheetNames.push('User Profile');
    XLSX.XLSX.utils.book_append_sheet(wb, this.generateUserProfileSheet(data.user), 'User Profile');

    wb.SheetNames.push('Workouts');
    XLSX.XLSX.utils.book_append_sheet(wb, this.generateWorkoutsSheet(data.workouts), 'Workouts');

    wb.SheetNames.push('Workout Exercises');
    XLSX.XLSX.utils.book_append_sheet(wb, this.generateWorkoutExercisesSheet(data.workouts), 'Workout Exercises');

    wb.SheetNames.push('Daily Schedules');
    XLSX.XLSX.utils.book_append_sheet(wb, this.generateDailySchedulesSheet(data.dailySchedules), 'Daily Schedules');

    wb.SheetNames.push('Body Metrics');
    XLSX.XLSX.utils.book_append_sheet(wb, this.generateBodyMetricsSheet(data.bodyMetrics), 'Body Metrics');

    wb.SheetNames.push('Body Heatmaps');
    XLSX.XLSX.utils.book_append_sheet(wb, this.generateBodyHeatmapsSheet(data.bodyHeatmaps), 'Body Heatmaps');

    wb.SheetNames.push('Vision Analyses');
    XLSX.XLSX.utils.book_append_sheet(wb, this.generateVisionAnalysesSheet(data.visionAnalyses), 'Vision Analyses');

    wb.SheetNames.push('AI Conversations');
    XLSX.XLSX.utils.book_append_sheet(wb, this.generateAIInteractionsSheet(data.conversations), 'AI Conversations');

    wb.SheetNames.push('AI Recommendations');
    XLSX.XLSX.utils.book_append_sheet(wb, this.generateAIRecommendationsSheet(data.aiRecommendations), 'AI Recommendations');

    if (data.gamificationProfile) {
      wb.SheetNames.push('Gamification');
      XLSX.XLSX.utils.book_append_sheet(wb, this.generateGamificationSheet(data.gamificationProfile), 'Gamification');
    }

    if (data.badges.length > 0) {
      wb.SheetNames.push('Badges');
      XLSX.XLSX.utils.book_append_sheet(wb, this.generateBadgesSheet(data.badges), 'Badges');
    }

    if (data.achievements.length > 0) {
      wb.SheetNames.push('Achievements');
      XLSX.XLSX.utils.book_append_sheet(wb, this.generateAchievementsSheet(data.achievements), 'Achievements');
    }

    if (data.socialProofCards.length > 0) {
      wb.SheetNames.push('Social Content');
      XLSX.XLSX.utils.book_append_sheet(wb, this.generateSocialProofSheet(data.socialProofCards), 'Social Content');
    }

    if (data.activityEvents.length > 0) {
      wb.SheetNames.push('Activity Events');
      XLSX.XLSX.utils.book_append_sheet(wb, this.generateActivityEventsSheet(data.activityEvents), 'Activity Events');
    }

    return XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
  }

  /**
   * Generate User Profile sheet
   */
  generateUserProfileSheet(user: User): XLSX.WorkSheet {
    const headers = [
      'ID',
      'Email',
      'Name',
      'Age',
      'Gender',
      'Height (cm)',
      'Weight (kg)',
      'Resting Heart Rate',
      'Max Heart Rate',
      'Fitness Level',
      'Goals',
      'Profile Picture URL',
      'Email Verified',
      'Onboarding Completed',
      'Created At',
      'Updated At',
    ];

    const rows = [
      headers,
      [
        user.id,
        user.email,
        user.name,
        user.age ?? '',
        user.gender ?? '',
        user.height ?? '',
        user.weight ?? '',
        user.restingHeartRate ?? '',
        user.maxHeartRate ?? '',
        user.fitnessLevel ?? '',
        user.goals?.join('; ') ?? '',
        user.picture ? this.makeHyperlink(user.picture, 'View Image') : '',
        user.emailVerified ? 'Yes' : 'No',
        user.onboardingCompleted ? 'Yes' : 'No',
        this.formatDate(user.createdAt),
        this.formatDate(user.updatedAt),
      ],
    ];

    return XLSX.XLSX.utils.aoa_to_sheet(rows);
  }

  /**
   * Generate Workouts sheet (summary level)
   */
  generateWorkoutsSheet(workouts: (Workout & { exercises?: WorkoutExercise[] })): XLSX.WorkSheet {
    const headers = [
      'Workout ID',
      'User ID',
      'Type',
      'Name',
      'Duration (min)',
      'Calories Burned',
      'Start Time',
      'End Time',
      'Notes',
      'Status',
      'Exercise Count',
      'Created At',
      'Completed At',
    ];

    const rows: any[][] = [headers];

    for (const workout of workouts) {
      rows.push([
        workout.id,
        workout.userId,
        workout.type,
        workout.name ?? '',
        workout.duration,
        workout.caloriesBurned ?? '',
        this.formatDate(workout.startTime),
        this.formatDate(workout.endTime),
        workout.notes ?? '',
        workout.status,
        workout.exercises?.length ?? 0,
        this.formatDate(workout.createdAt),
        workout.completedAt ? this.formatDate(workout.completedAt) : '',
      ]);
    }

    const sheet = XLSX.XLSX.utils.aoa_to_sheet(rows);
    this.setColumnWidths(sheet, [12, 12, 12, 20, 12, 14, 20, 20, 30, 12, 12, 20, 20]);
    return sheet;
  }

  /**
   * Generate Workout Exercises sheet (detailed)
   */
  generateWorkoutExercisesSheet(workouts: (Workout & { exercises?: WorkoutExercise[] })): XLSX.WorkSheet {
    const headers = [
      'Exercise ID',
      'Workout ID',
      'Workout Name',
      'Exercise Name',
      'Sets',
      'Reps',
      'Weight (kg)',
      'Rest Time (sec)',
      'RPE',
      'Order',
      'Notes',
    ];

    const rows: any[][] = [headers];

    for (const workout of workouts) {
      if (workout.exercises) {
        for (const exercise of workout.exercises) {
          rows.push([
            exercise.id ?? `${workout.id}_${exercise.order}`,
            workout.id,
            workout.name ?? workout.type,
            exercise.name,
            exercise.sets ?? '',
            exercise.reps ?? '',
            exercise.weight ?? '',
            exercise.restTime ?? '',
            exercise.rpe ?? '',
            exercise.order,
            exercise.notes ?? '',
          ]);
        }
      }
    }

    return XLSX.utils.aoa_to_sheet(rows);
  }

  /**
   * Generate Daily Schedules sheet
   */
  generateDailySchedulesSheet(schedules: DailySchedule[]): XLSX.WorkSheet {
    const headers = [
      'Schedule ID',
      'Date',
      'Workout Name',
      'Workout Type',
      'Workout Duration',
      'Workout Calories',
      'Recovery Tasks',
      'Nutrition Goals',
      'Sleep Goal',
      'Optimization Score',
      'Adjustments Made',
      'Generated By',
    ];

    const rows: any[][] = [headers];

    for (const schedule of schedules) {
      const workout = schedule.workout;
      rows.push([
        schedule.id,
        schedule.date,
        workout?.customName ?? '',
        workout?.type ?? '',
        workout?.duration ?? '',
        workout?.estimatedCalories ?? '',
        this.jsonToString(schedule.recoveryTasks),
        this.jsonToString(schedule.nutritionGoals),
        this.jsonToString(schedule.sleepGoal),
        schedule.optimizationScore ?? '',
        this.jsonToString(schedule.adjustmentsMade),
        schedule.generatedBy,
      ]);
    }

    return XLSX.utils.aoa_to_sheet(rows);
  }

  /**
   * Generate Body Metrics sheet
   */
  generateBodyMetricsSheet(metrics: BodyMetric[]): XLSX.WorkSheet {
    const headers = [
      'Metric ID',
      'User ID',
      'Timestamp',
      'Weight (kg)',
      'Body Fat (%)',
      'Muscle Mass (kg)',
      'Bone Mass (kg)',
      'Water (%)',
      'BMI',
      'Waist Circumference (cm)',
      'Chest Circumference (cm)',
      'Hip Circumference (cm)',
      'Source',
      'Notes',
    ];

    const rows: any[][] = [headers];

    for (const metric of metrics) {
      rows.push([
        metric.id,
        metric.userId,
        this.formatDate(metric.timestamp),
        metric.weight ?? '',
        metric.bodyFatPercentage ?? '',
        metric.muscleMass ?? '',
        metric.boneMass ?? '',
        metric.waterPercentage ?? '',
        metric.bmi ?? '',
        metric.waistCircumference ?? '',
        metric.chestCircumference ?? '',
        metric.hipCircumference ?? '',
        metric.source ?? '',
        metric.notes ?? '',
      ]);
    }

    const sheet = XLSX.utils.aoa_to_sheet(rows);
    this.setColumnWidths(sheet, [12, 12, 20, 12, 14, 14, 12, 12, 10, 22, 22, 20, 10, 30]);
    return sheet;
  }

  /**
   * Generate Body Heatmaps sheet
   */
  generateBodyHeatmapsSheet(heatmaps: BodyHeatmapData[]): XLSX.WorkSheet {
    const headers = [
      'Heatmap ID',
      'User ID',
      'Timestamp',
      'Image URL',
      'Vector Data (JSON)',
      'Metadata (JSON)',
      'Point Count',
    ];

    const rows: any[][] = [headers];

    for (const heatmap of heatmaps) {
      const vectorData = JSON.stringify(heatmap.vectorData);
      const metadata = heatmap.metadata
        ? JSON.stringify(heatmap.metadata)
        : '';

      rows.push([
        heatmap.id,
        heatmap.userId,
        this.formatDate(heatmap.timestamp),
        heatmap.imageUrl ? this.makeHyperlink(heatmap.imageUrl, 'View Heatmap') : '',
        vectorData,
        metadata,
        heatmap.metadata?.pointCount ?? heatmap.vectorData.length,
      ]);
    }

    return XLSX.utils.aoa_to_sheet(rows);
  }

  /**
   * Generate Vision Analyses sheet
   */
  generateVisionAnalysesSheet(analyses: VisionAnalysis[]): XLSX.WorkSheet {
    const headers = [
      'Analysis ID',
      'User ID',
      'Timestamp',
      'Original Image URL',
      'Processed Image URL',
      'Analysis (JSON)',
      'Confidence',
    ];

    const rows: any[][] = [headers];

    for (const analysis of analyses) {
      const analysisJson = JSON.stringify(analysis.analysis, null, 2);

      rows.push([
        analysis.id,
        analysis.userId,
        this.formatDate(analysis.createdAt),
        analysis.imageUrl ? this.makeHyperlink(analysis.imageUrl, 'View Original') : '',
        analysis.processedUrl ? this.makeHyperlink(analysis.processedUrl, 'View Processed') : '',
        analysisJson,
        `${(analysis.confidence * 100).toFixed(1)}%`,
      ]);
    }

    return XLSX.utils.aoa_to_sheet(rows);
  }

  /**
   * Generate AI Conversations sheet
   */
  generateAIInteractionsSheet(conversations: Conversation[]): XLSX.WorkSheet {
    const headers = [
      'Conversation ID',
      'User ID',
      'Timestamp',
      'Message',
      'Response',
      'Tokens Used',
      'Model',
    ];

    const rows: any[][] = [headers];

    for (const conv of conversations) {
      rows.push([
        conv.id,
        conv.userId,
        this.formatDate(conv.createdAt),
        conv.message,
        conv.response,
        conv.tokensUsed,
        conv.model ?? '',
      ]);
    }

    const sheet = XLSX.utils.aoa_to_sheet(rows);
    this.setColumnWidths(sheet, [12, 12, 20, 50, 50, 12, 15]);
    return sheet;
  }

  /**
   * Generate AI Recommendations sheet
   */
  generateAIRecommendationsSheet(recommendations: AIRecommendation[]): XLSX.WorkSheet {
    const headers = [
      'Recommendation ID',
      'User ID',
      'Type',
      'Title',
      'Description',
      'Confidence',
      'Actions (JSON)',
      'Is Read',
      'Is Dismissed',
      'Created At',
    ];

    const rows: any[][] = [headers];

    for (const rec of recommendations) {
      rows.push([
        rec.id,
        rec.userId,
        rec.type,
        rec.title,
        rec.description,
        `${(rec.confidence * 100).toFixed(1)}%`,
        JSON.stringify(rec.actions),
        rec.isRead ? 'Yes' : 'No',
        rec.isDismissed ? 'Yes' : 'No',
        this.formatDate(rec.createdAt),
      ]);
    }

    return XLSX.utils.aoa_to_sheet(rows);
  }

  /**
   * Generate Gamification sheet
   */
  generateGamificationSheet(profile: GamificationProfile): XLSX.WorkSheet {
    const headers = [
      'User ID',
      'Total Points',
      'Level',
      'Current XP',
      'XP to Next Level',
      'Current Streak',
      'Longest Streak',
      'Last Activity Date',
      'Leaderboard Position',
    ];

    const rows: any[][] = [
      headers,
      [
        profile.userId,
        profile.totalPoints,
        profile.level,
        profile.currentXp,
        profile.xpToNextLevel,
        profile.streak.current,
        profile.streak.longest,
        profile.streak.lastActivityDate,
        profile.leaderboardPosition ?? '',
      ],
    ];

    return XLSX.utils.aoa_to_sheet(rows);
  }

  /**
   * Generate Badges sheet
   */
  generateBadgesSheet(badges: Badge[]): XLSX.WorkSheet {
    const headers = [
      'Badge ID',
      'User ID',
      'Type',
      'Name',
      'Description',
      'Icon',
      'Tier',
      'Earned At',
    ];

    const rows: any[][] = [headers];

    for (const badge of badges) {
      rows.push([
        badge.id,
        badge.userId,
        badge.type,
        badge.name,
        badge.description,
        badge.icon,
        badge.tier,
        this.formatDate(badge.earnedAt),
      ]);
    }

    return XLSX.utils.aoa_to_sheet(rows);
  }

  /**
   * Generate Achievements sheet
   */
  generateAchievementsSheet(achievements: Achievement[]): XLSX.WorkSheet {
    const headers = [
      'Achievement ID',
      'User ID',
      'Type',
      'Progress (%)',
      'Target',
      'Reward (XP)',
      'Completed',
      'Completed At',
      'Claimed',
    ];

    const rows: any[][] = [headers];

    for (const ach of achievements) {
      rows.push([
        ach.id,
        ach.userId,
        ach.type,
        ach.progress.toFixed(1),
        ach.target,
        ach.reward,
        ach.completed ? 'Yes' : 'No',
        ach.completedAt ? this.formatDate(ach.completedAt) : '',
        ach.claimed ? 'Yes' : 'No',
      ]);
    }

    return XLSX.utils.aoa_to_sheet(rows);
  }

  /**
   * Generate Social Proof Cards sheet
   */
  generateSocialProofSheet(cards: SocialProofCard[]): XLSX.WorkSheet {
    const headers = [
      'Card ID',
      'User ID',
      'Type',
      'Title',
      'Subtitle',
      'Data (JSON)',
      'Shareable Image URL',
      'Platform',
      'Is Public',
      'Likes',
      'Shares',
      'Created At',
    ];

    const rows: any[][] = [headers];

    for (const card of cards) {
      rows.push([
        card.id,
        card.userId,
        card.type,
        card.title,
        card.subtitle ?? '',
        JSON.stringify(card.data),
        card.shareableImageUrl ? this.makeHyperlink(card.shareableImageUrl, 'View Image') : '',
        card.platform,
        card.isPublic ? 'Yes' : 'No',
        card.likes,
        card.shares,
        this.formatDate(card.createdAt),
      ]);
    }

    return XLSX.utils.aoa_to_sheet(rows);
  }

  /**
   * Generate Activity Events sheet
   */
  generateActivityEventsSheet(events: ActivityEvent[]): XLSX.WorkSheet {
    const headers = [
      'Event ID',
      'User ID',
      'Workout ID',
      'Type',
      'Payload (JSON)',
      'Client Timestamp',
      'Server Timestamp',
      'Device Platform',
      'Device Version',
      'Device Model',
    ];

    const rows: any[][] = [headers];

    for (const event of events) {
      rows.push([
        event.id,
        event.userId,
        event.workoutId ?? '',
        event.type,
        JSON.stringify(event.payload),
        this.formatDate(event.clientTimestamp),
        this.formatDate(event.serverTimestamp),
        event.deviceInfo?.platform ?? '',
        event.deviceInfo?.version ?? '',
        event.deviceInfo?.model ?? '',
      ]);
    }

    return XLSX.utils.aoa_to_sheet(rows);
  }

  // ==================== Helper Methods ====================

  /**
   * Format date/timestamp to readable string
   */
  private formatDate(dateOrTimestamp: Date | number | string): string {
    if (!dateOrTimestamp) return '';
    const date = dateOrTimestamp instanceof Date ? dateOrTimestamp : new Date(dateOrTimestamp);
    return date.toISOString().replace('T', ' ').substring(0, 19);
  }

  /**
   * Convert object to string representation
   */
  private jsonToString(value: unknown): string {
    if (!value) return '';
    if (typeof value === 'string') return value;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  /**
   * Create hyperlink formula for Excel
   */
  private makeHyperlink(url: string, text: string): string {
    return `=HYPERLINK("${url}", "${text}")`;
  }

  /**
   * Set reasonable column widths for a sheet
   */
  private setColumnWidths(sheet: XLSX.WorkSheet, widths: number[]): void {
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    for (let i = 0; i < widths.length && i < range.e.c; i++) {
      const col = String.fromCharCode(65 + i);
      sheet[`${col}:${col}`] = { wch: widths[i] };
    }
  }
}

/**
 * Generate CSV from array of objects
 */
export function generateCSV<T>(data: T[], headers: string[]): string {
  if (data.length === 0) return headers.join(',') + '\n';

  const rows = data.map((item) => {
    return headers.map((header) => {
      const value = (item as Record<string, unknown>)[header];
      if (value === undefined || value === null) return '';
      const str = String(value);
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Generate JSON export
 */
export function generateJSON(data: ComprehensiveUserData): string {
  return JSON.stringify(data, null, 2);
}
