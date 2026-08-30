/**
 * Coach Service - Sessions Service
 */

import type { D1Database } from '../env.d';

interface WorkoutSession {
  id: string;
  userId: string;
  planId?: string;
  status: string;
  exercises: SessionExercise[];
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  idempotencyKey?: string;
}

interface SessionExercise {
  exerciseCode: string;
  targetSets: number;
  targetReps: number;
  sets: SetSummary[];
}

interface SetSummary {
  setNumber: number;
  status: string;
  completedReps: number;
  averageRangeOfMotion: number;
  averageQualityScore: number;
  averageTempoSeconds: number;
  durationMs: number;
  correctionCounts: Record<string, number>;
}

interface SessionFilters {
  limit: number;
  offset: number;
  status?: string;
}

export class SessionService {
  async getUserSessions(
    db: D1Database,
    userId: string,
    filters: SessionFilters
  ): Promise<WorkoutSession[]> {
    let query = 'SELECT * FROM workout_sessions WHERE user_id = ?';
    const bindings: any[] = [userId];
    
    if (filters.status) {
      query += ' AND status = ?';
      bindings.push(filters.status);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    bindings.push(filters.limit, filters.offset);
    
    const result = await db.prepare(query).bind(...bindings).all();
    return Promise.all(result.results.map((row: any) => this.formatSession(row)));
  }

  async getActiveSession(db: D1Database, userId: string): Promise<WorkoutSession | null> {
    const result = await db
      .prepare(`
        SELECT * FROM workout_sessions 
        WHERE user_id = ? AND status IN ('planned', 'in_progress', 'paused')
        ORDER BY created_at DESC
        LIMIT 1
      `)
      .bind(userId)
      .first();
    
    if (!result) return null;
    return this.formatSession(result);
  }

  async getSessionById(db: D1Database, sessionId: string): Promise<WorkoutSession | null> {
    const result = await db
      .prepare('SELECT * FROM workout_sessions WHERE id = ?')
      .bind(sessionId)
      .first();
    
    if (!result) return null;
    return this.formatSession(result);
  }

  async getByIdempotencyKey(
    db: D1Database,
    idempotencyKey: string
  ): Promise<WorkoutSession | null> {
    const result = await db
      .prepare('SELECT * FROM workout_sessions WHERE idempotency_key = ?')
      .bind(idempotencyKey)
      .first();
    
    if (!result) return null;
    return this.formatSession(result);
  }

  async startSession(
    db: D1Database,
    userId: string,
    data: { planId?: string; exercises: any[]; idempotencyKey?: string }
  ): Promise<WorkoutSession> {
    const id = crypto.randomUUID();
    const now = Date.now();
    
    const exercises = data.exercises.map((ex, idx) => ({
      exerciseCode: ex.exerciseCode,
      targetSets: ex.targetSets || 3,
      targetReps: ex.targetReps || 10,
      sets: [],
    }));
    
    await db
      .prepare(`
        INSERT INTO workout_sessions (
          id, user_id, plan_id, status, exercises_json, 
          created_at, started_at, idempotency_key
        ) VALUES (?, ?, ?, 'in_progress', ?, ?, ?, ?)
      `)
      .bind(
        id,
        userId,
        data.planId || null,
        JSON.stringify(exercises),
        now,
        now,
        data.idempotencyKey || null
      )
      .run();
    
    return this.getSessionById(db, id) as Promise<WorkoutSession>;
  }

  async updateSessionCheckpoint(
    db: D1Database,
    sessionId: string,
    userId: string,
    data: { status?: string; currentExerciseIndex?: number; notes?: string }
  ): Promise<WorkoutSession | null> {
    const session = await this.getSessionById(db, sessionId);
    if (!session || session.userId !== userId) return null;
    
    const updates: string[] = [];
    const bindings: any[] = [];
    
    if (data.status) {
      updates.push('status = ?');
      bindings.push(data.status);
    }
    if (data.notes) {
      updates.push('notes = ?');
      bindings.push(data.notes);
    }
    
    if (updates.length === 0) return session;
    
    bindings.push(sessionId);
    await db
      .prepare(`UPDATE workout_sessions SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...bindings)
      .run();
    
    return this.getSessionById(db, sessionId);
  }

  async submitSetSummary(
    db: D1Database,
    sessionId: string,
    userId: string,
    data: {
      exerciseCode: string;
      setNumber: number;
      status: string;
      completedReps: number;
      averageRangeOfMotion: number;
      averageQualityScore: number;
      averageTempoSeconds: number;
      durationMs: number;
      restDurationMs?: number;
      correctionCounts?: Record<string, number>;
      averageConfidence: number;
      repDetails?: any[];
    }
  ): Promise<SetSummary | null> {
    const session = await this.getSessionById(db, sessionId);
    if (!session || session.userId !== userId) return null;
    
    // Insert set summary
    const setId = crypto.randomUUID();
    const now = Date.now();
    
    await db
      .prepare(`
        INSERT INTO workout_sets (
          id, session_id, exercise_code, set_number, status,
          completed_reps, avg_range_of_motion, avg_quality_score,
          avg_tempo_seconds, duration_ms, rest_duration_ms,
          correction_counts_json, avg_confidence, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        setId,
        sessionId,
        data.exerciseCode,
        data.setNumber,
        data.status,
        data.completedReps,
        data.averageRangeOfMotion,
        data.averageQualityScore,
        data.averageTempoSeconds,
        data.durationMs,
        data.restDurationMs || 0,
        JSON.stringify(data.correctionCounts || {}),
        data.averageConfidence,
        now
      )
      .run();
    
    // Insert rep details if provided
    if (data.repDetails && data.repDetails.length > 0) {
      for (const rep of data.repDetails) {
        await db
          .prepare(`
            INSERT INTO workout_reps (
              id, set_id, rep_number, range_of_motion, tempo_seconds,
              quality_score, corrections_json, duration_ms, timestamp
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `)
          .bind(
            crypto.randomUUID(),
            setId,
            rep.repNumber,
            rep.rangeOfMotion,
            rep.tempoSeconds,
            rep.qualityScore,
            JSON.stringify(rep.corrections),
            rep.durationMs,
            rep.timestamp
          )
          .run();
      }
    }
    
    return {
      setNumber: data.setNumber,
      status: data.status,
      completedReps: data.completedReps,
      averageRangeOfMotion: data.averageRangeOfMotion,
      averageQualityScore: data.averageQualityScore,
      averageTempoSeconds: data.averageTempoSeconds,
      durationMs: data.durationMs,
      correctionCounts: data.correctionCounts || {},
    };
  }

  async completeSession(
    db: D1Database,
    env: any,
    sessionId: string,
    userId: string,
    data: { userRating?: number; userNotes?: string; totalDurationMs: number }
  ): Promise<any | null> {
    const session = await this.getSessionById(db, sessionId);
    if (!session || session.userId !== userId) return null;
    
    const now = Date.now();
    
    // Update session status
    await db
      .prepare(`
        UPDATE workout_sessions 
        SET status = 'completed', completed_at = ?, user_rating = ?, user_notes = ?
        WHERE id = ?
      `)
      .bind(now, data.userRating || null, data.userNotes || null, sessionId)
      .run();
    
    // Get all sets for this session
    const setsResult = await db
      .prepare('SELECT * FROM workout_sets WHERE session_id = ?')
      .bind(sessionId)
      .all();
    
    // Calculate summary
    const summary = {
      id: crypto.randomUUID(),
      userId,
      sessionId,
      planId: session.planId,
      createdAt: session.createdAt,
      startedAt: session.startedAt || session.createdAt,
      completedAt: now,
      durationMs: data.totalDurationMs,
      exercises: this.calculateExerciseSummaries(setsResult.results),
      totalSets: setsResult.results.length,
      completedSets: setsResult.results.filter((s: any) => s.status === 'completed').length,
      totalReps: setsResult.results.reduce((sum: number, s: any) => sum + s.completed_reps, 0),
      overallQualityScore: this.calculateOverallQuality(setsResult.results),
      userRating: data.userRating,
      engineVersion: env.ENGINE_VERSION,
      wasmVersion: env.WASM_ENGINE_VERSION,
      validatedAt: now,
    };
    
    // Insert summary
    await db
      .prepare(`
        INSERT INTO workout_summaries (
          id, user_id, session_id, plan_id, created_at, started_at, completed_at,
          duration_ms, exercises_json, total_sets, completed_sets, total_reps,
          overall_quality_score, user_rating, engine_version, wasm_version, validated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        summary.id,
        summary.userId,
        summary.sessionId,
        summary.planId || null,
        summary.createdAt,
        summary.startedAt,
        summary.completedAt,
        summary.durationMs,
        JSON.stringify(summary.exercises),
        summary.totalSets,
        summary.completedSets,
        summary.totalReps,
        summary.overallQualityScore,
        summary.userRating || null,
        summary.engineVersion,
        summary.wasmVersion,
        summary.validatedAt
      )
      .run();
    
    // Queue plan adjustment
    if (session.planId) {
      try {
        await env.PLANNING_QUEUE.send({
          schemaVersion: 1,
          messageId: crypto.randomUUID(),
          type: 'coach.plan_adjustment',
          occurredAt: new Date().toISOString(),
          recipient: { email: '' },
          locale: 'en',
          data: {
            userId,
            planId: session.planId,
            reason: 'session_completed',
            completedSessionId: sessionId,
          },
        });
      } catch (e) {
        console.error('Failed to queue plan adjustment:', e);
      }
    }
    
    return summary;
  }

  async cancelSession(
    db: D1Database,
    sessionId: string,
    userId: string
  ): Promise<WorkoutSession | null> {
    const session = await this.getSessionById(db, sessionId);
    if (!session || session.userId !== userId) return null;
    
    await db
      .prepare(`
        UPDATE workout_sessions 
        SET status = 'cancelled'
        WHERE id = ?
      `)
      .bind(sessionId)
      .run();
    
    return this.getSessionById(db, sessionId);
  }

  async submitCorrection(
    db: D1Database,
    sessionId: string,
    userId: string,
    data: {
      exerciseCode: string;
      setNumber?: number;
      correctionCode: string;
      severity: string;
      acknowledged: boolean;
    }
  ): Promise<any> {
    const session = await this.getSessionById(db, sessionId);
    if (!session || session.userId !== userId) return null;
    
    const id = crypto.randomUUID();
    const now = Date.now();
    
    await db
      .prepare(`
        INSERT INTO workout_corrections (
          id, session_id, exercise_code, set_number, correction_code,
          severity, acknowledged, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        sessionId,
        data.exerciseCode,
        data.setNumber || null,
        data.correctionCode,
        data.severity,
        data.acknowledged ? 1 : 0,
        now
      )
      .run();
    
    return { id, ...data, createdAt: now };
  }

  private async formatSession(row: any): Promise<WorkoutSession> {
    return {
      id: row.id,
      userId: row.user_id,
      planId: row.plan_id,
      status: row.status,
      exercises: row.exercises_json ? JSON.parse(row.exercises_json) : [],
      createdAt: row.created_at,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      idempotencyKey: row.idempotency_key,
    };
  }

  private calculateExerciseSummaries(sets: any[]): any[] {
    const byExercise = new Map<string, any[]>();
    
    for (const set of sets) {
      const existing = byExercise.get(set.exercise_code) || [];
      existing.push(set);
      byExercise.set(set.exercise_code, existing);
    }
    
    return Array.from(byExercise.entries()).map(([code, exerciseSets]) => ({
      exerciseCode: code,
      totalSets: exerciseSets.length,
      completedSets: exerciseSets.filter(s => s.status === 'completed').length,
      totalReps: exerciseSets.reduce((sum, s) => sum + s.completed_reps, 0),
      averageQualityScore: exerciseSets.reduce((sum, s) => sum + s.avg_quality_score, 0) / exerciseSets.length,
    }));
  }

  private calculateOverallQuality(sets: any[]): number {
    if (sets.length === 0) return 0;
    return sets.reduce((sum, s) => sum + s.avg_quality_score, 0) / sets.length;
  }
}
