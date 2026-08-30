/**
 * Coach Service - Plans Service
 */

import type { D1Database } from '../env.d';

interface PlanExercise {
  exerciseCode: string;
  order: number;
  targetSets: number;
  targetReps: number;
  restBetweenSetsMs: number;
  restAfterExerciseMs: number;
  userLocked: boolean;
}

interface WorkoutDay {
  dayNumber: number;
  name?: string;
  exercises: PlanExercise[];
  isRestDay: boolean;
}

interface Plan {
  id: string;
  userId: string;
  name: string;
  status: string;
  revision: number;
  goal: string;
  durationWeeks: number;
  workoutDaysPerWeek: number;
  workouts: WorkoutDay[];
  createdAt: number;
  updatedAt: number;
  activatedAt?: number;
}

interface CreatePlanData {
  name: string;
  goal: string;
  durationWeeks: number;
  workoutDaysPerWeek: number;
  workouts: WorkoutDay[];
  description?: string;
  startDate?: string;
}

export class PlanService {
  async getActivePlan(db: D1Database, userId: string): Promise<Plan | null> {
    const result = await db
      .prepare(`
        SELECT * FROM workout_plans 
        WHERE user_id = ? AND status = 'active'
        ORDER BY activated_at DESC
        LIMIT 1
      `)
      .bind(userId)
      .first();
    
    if (!result) return null;
    
    return this.formatPlan(result);
  }

  async getUserPlans(db: D1Database, userId: string, status?: string): Promise<Plan[]> {
    let query = 'SELECT * FROM workout_plans WHERE user_id = ?';
    const bindings: any[] = [userId];
    
    if (status) {
      query += ' AND status = ?';
      bindings.push(status);
    }
    
    query += ' ORDER BY updated_at DESC';
    
    const result = await db.prepare(query).bind(...bindings).all();
    return result.results.map((row: any) => this.formatPlan(row));
  }

  async getPlanById(db: D1Database, planId: string): Promise<Plan | null> {
    const result = await db
      .prepare('SELECT * FROM workout_plans WHERE id = ?')
      .bind(planId)
      .first();
    
    if (!result) return null;
    return this.formatPlan(result);
  }

  async createPlan(db: D1Database, userId: string, data: CreatePlanData): Promise<Plan> {
    const id = crypto.randomUUID();
    const now = Date.now();
    
    await db
      .prepare(`
        INSERT INTO workout_plans (
          id, user_id, name, status, goal, duration_weeks, 
          workout_days_per_week, workouts_json, created_at, updated_at
        ) VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        id,
        userId,
        data.name,
        data.goal,
        data.durationWeeks,
        data.workoutDaysPerWeek,
        JSON.stringify(data.workouts),
        now,
        now
      )
      .run();
    
    return this.getPlanById(db, id) as Promise<Plan>;
  }

  async updatePlan(
    db: D1Database,
    planId: string,
    userId: string,
    data: Partial<CreatePlanData>
  ): Promise<Plan | null> {
    const plan = await this.getPlanById(db, planId);
    if (!plan || plan.userId !== userId) return null;
    
    const updates: string[] = ['updated_at = ?'];
    const bindings: any[] = [Date.now()];
    
    if (data.name) {
      updates.push('name = ?');
      bindings.push(data.name);
    }
    if (data.workouts) {
      updates.push('workouts_json = ?');
      bindings.push(JSON.stringify(data.workouts));
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      bindings.push(data.description);
    }
    
    bindings.push(planId);
    
    await db
      .prepare(`UPDATE workout_plans SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...bindings)
      .run();
    
    return this.getPlanById(db, planId);
  }

  async activatePlan(db: D1Database, planId: string, userId: string): Promise<Plan | null> {
    const plan = await this.getPlanById(db, planId);
    if (!plan || plan.userId !== userId) return null;
    
    const now = Date.now();
    
    // Deactivate current active plans
    await db
      .prepare(`
        UPDATE workout_plans 
        SET status = 'completed', updated_at = ?
        WHERE user_id = ? AND status = 'active'
      `)
      .bind(now, userId)
      .run();
    
    // Activate the new plan
    await db
      .prepare(`
        UPDATE workout_plans 
        SET status = 'active', activated_at = ?, updated_at = ?
        WHERE id = ?
      `)
      .bind(now, now, planId)
      .run();
    
    return this.getPlanById(db, planId);
  }

  async archivePlan(db: D1Database, planId: string, userId: string): Promise<Plan | null> {
    const plan = await this.getPlanById(db, planId);
    if (!plan || plan.userId !== userId) return null;
    
    await db
      .prepare(`
        UPDATE workout_plans 
        SET status = 'archived', updated_at = ?
        WHERE id = ?
      `)
      .bind(Date.now(), planId)
      .run();
    
    return this.getPlanById(db, planId);
  }

  async deletePlan(db: D1Database, planId: string, userId: string): Promise<boolean> {
    const plan = await this.getPlanById(db, planId);
    if (!plan || plan.userId !== userId) return false;
    
    await db
      .prepare('DELETE FROM workout_plans WHERE id = ?')
      .bind(planId)
      .run();
    
    return true;
  }

  private formatPlan(row: any): Plan {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      status: row.status,
      revision: row.revision,
      goal: row.goal,
      durationWeeks: row.duration_weeks,
      workoutDaysPerWeek: row.workout_days_per_week,
      workouts: row.workouts_json ? JSON.parse(row.workouts_json) : [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      activatedAt: row.activated_at,
    };
  }
}
