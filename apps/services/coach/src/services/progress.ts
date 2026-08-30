/**
 * Coach Service - Progress Service
 */

import type { D1Database } from '../env.d';

export class ProgressService {
  async getProgressSummary(
    db: D1Database,
    userId: string,
    startDate: number,
    endDate: number
  ): Promise<any> {
    const result = await db
      .prepare(`
        SELECT 
          COUNT(*) as total_workouts,
          SUM(duration_ms) as total_duration_ms,
          SUM(total_reps) as total_reps,
          AVG(overall_quality_score) as avg_quality_score
        FROM workout_summaries
        WHERE user_id = ? AND completed_at BETWEEN ? AND ?
      `)
      .bind(userId, startDate, endDate)
      .first();
    
    return {
      userId,
      periodStart: startDate,
      periodEnd: endDate,
      totalWorkouts: result?.total_workouts || 0,
      totalDurationMs: result?.total_duration_ms || 0,
      totalReps: result?.total_reps || 0,
      averageQualityScore: result?.avg_quality_score || 0,
    };
  }

  async getExerciseProgress(
    db: D1Database,
    userId: string,
    exerciseCode: string,
    limit: number
  ): Promise<any[]> {
    const result = await db
      .prepare(`
        SELECT ws.*, wse.exercise_code
        FROM workout_summaries ws
        JOIN json_each(ws.exercises_json) wse
        WHERE ws.user_id = ? AND wse.exercise_code = ?
        ORDER BY ws.completed_at DESC
        LIMIT ?
      `)
      .bind(userId, exerciseCode, limit)
      .all();
    
    return result.results;
  }

  async getWorkoutHistory(
    db: D1Database,
    userId: string,
    filters: { limit: number; offset: number; exerciseCode?: string }
  ): Promise<any[]> {
    let query = `
      SELECT ws.*, wse.exercise_code
      FROM workout_summaries ws
      JOIN json_each(ws.exercises_json) wse
      WHERE ws.user_id = ?
    `;
    const bindings: any[] = [userId];
    
    if (filters.exerciseCode) {
      query += ' AND wse.exercise_code = ?';
      bindings.push(filters.exerciseCode);
    }
    
    query += ' ORDER BY ws.completed_at DESC LIMIT ? OFFSET ?';
    bindings.push(filters.limit, filters.offset);
    
    const result = await db.prepare(query).bind(...bindings).all();
    return result.results;
  }

  async getTrends(
    db: D1Database,
    userId: string,
    metric: string,
    period: string
  ): Promise<any> {
    const now = Date.now();
    let startDate: number;
    
    switch (period) {
      case 'day':
        startDate = now - 24 * 60 * 60 * 1000;
        break;
      case 'week':
        startDate = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case 'month':
        startDate = now - 30 * 24 * 60 * 60 * 1000;
        break;
      default:
        startDate = now - 7 * 24 * 60 * 60 * 1000;
    }
    
    const column = metric === 'quality_score' 
      ? 'overall_quality_score' 
      : 'total_reps';
    
    const result = await db
      .prepare(`
        SELECT 
          DATE(completed_at / 1000, 'unixepoch') as date,
          AVG(${column}) as value
        FROM workout_summaries
        WHERE user_id = ? AND completed_at BETWEEN ? AND ?
        GROUP BY DATE(completed_at / 1000, 'unixepoch')
        ORDER BY date
      `)
      .bind(userId, startDate, now)
      .all();
    
    return {
      metric,
      period,
      dataPoints: result.results,
    };
  }

  async getUserGoals(db: D1Database, userId: string): Promise<any | null> {
    const result = await db
      .prepare('SELECT * FROM user_fitness_goals WHERE user_id = ?')
      .bind(userId)
      .first();
    
    if (!result) return null;
    
    return {
      userId: result.user_id,
      primaryGoal: result.primary_goal,
      secondaryGoals: result.secondary_goals ? JSON.parse(result.secondary_goals) : [],
      experienceLevel: result.experience_level,
      limitations: result.limitations ? JSON.parse(result.limitations) : [],
      equipment: result.equipment ? JSON.parse(result.equipment) : [],
      preferredWorkoutDays: result.preferred_workout_days ? JSON.parse(result.preferred_workout_days) : [],
      reminderEnabled: result.reminder_enabled === 1,
      reminderTime: result.reminder_time,
      createdAt: result.created_at,
      updatedAt: result.updated_at,
    };
  }

  async updateUserGoals(
    db: D1Database,
    userId: string,
    data: any
  ): Promise<any> {
    const existing = await this.getUserGoals(db, userId);
    const now = Date.now();
    
    if (existing) {
      await db
        .prepare(`
          UPDATE user_fitness_goals SET
            primary_goal = ?,
            secondary_goals = ?,
            experience_level = ?,
            limitations = ?,
            equipment = ?,
            preferred_workout_days = ?,
            reminder_enabled = ?,
            reminder_time = ?,
            updated_at = ?
          WHERE user_id = ?
        `)
        .bind(
          data.primaryGoal,
          JSON.stringify(data.secondaryGoals || []),
          data.experienceLevel,
          JSON.stringify(data.limitations || []),
          JSON.stringify(data.equipment || []),
          JSON.stringify(data.preferredWorkoutDays || []),
          data.reminderEnabled ? 1 : 0,
          data.reminderTime || null,
          now,
          userId
        )
        .run();
    } else {
      await db
        .prepare(`
          INSERT INTO user_fitness_goals (
            user_id, primary_goal, secondary_goals, experience_level,
            limitations, equipment, preferred_workout_days,
            reminder_enabled, reminder_time, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          userId,
          data.primaryGoal,
          JSON.stringify(data.secondaryGoals || []),
          data.experienceLevel,
          JSON.stringify(data.limitations || []),
          JSON.stringify(data.equipment || []),
          JSON.stringify(data.preferredWorkoutDays || []),
          data.reminderEnabled ? 1 : 0,
          data.reminderTime || null,
          now,
          now
        )
        .run();
    }
    
    return this.getUserGoals(db, userId);
  }

  async getExercisePreferences(
    db: D1Database,
    userId: string,
    exerciseCode: string
  ): Promise<any | null> {
    const result = await db
      .prepare(`
        SELECT * FROM user_exercise_preferences 
        WHERE user_id = ? AND exercise_code = ?
      `)
      .bind(userId, exerciseCode)
      .first();
    
    if (!result) return null;
    
    return {
      userId: result.user_id,
      exerciseCode: result.exercise_code,
      experienceLevel: result.experience_level,
      excluded: result.excluded === 1,
      exclusionReason: result.exclusion_reason,
      modifications: result.modifications ? JSON.parse(result.modifications) : [],
      createdAt: result.created_at,
      updatedAt: result.updated_at,
    };
  }

  async updateExercisePreferences(
    db: D1Database,
    userId: string,
    exerciseCode: string,
    data: any
  ): Promise<any> {
    const existing = await this.getExercisePreferences(db, userId, exerciseCode);
    const now = Date.now();
    
    if (existing) {
      await db
        .prepare(`
          UPDATE user_exercise_preferences SET
            experience_level = ?,
            excluded = ?,
            exclusion_reason = ?,
            modifications = ?,
            updated_at = ?
          WHERE user_id = ? AND exercise_code = ?
        `)
        .bind(
          data.experienceLevel,
          data.excluded ? 1 : 0,
          data.exclusionReason || null,
          JSON.stringify(data.modifications || []),
          now,
          userId,
          exerciseCode
        )
        .run();
    } else {
      await db
        .prepare(`
          INSERT INTO user_exercise_preferences (
            user_id, exercise_code, experience_level, excluded,
            exclusion_reason, modifications, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          userId,
          exerciseCode,
          data.experienceLevel,
          data.excluded ? 1 : 0,
          data.exclusionReason || null,
          JSON.stringify(data.modifications || []),
          now,
          now
        )
        .run();
    }
    
    return this.getExercisePreferences(db, userId, exerciseCode);
  }
}
