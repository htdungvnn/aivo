/**
 * Coach Service - Planning Service
 * AI-powered workout plan generation and adjustment
 */

import type { D1Database, CoachEnv } from '../env.d';
import { getExerciseDefinitions } from './exercises';

export class PlanningService {
  constructor(private env: CoachEnv) {}

  async requestPlan(userId: string, data: {
    currentGoal: string;
    reason: string;
    availableExercises?: string[];
    excludedExercises?: string[];
    maxWorkoutsPerWeek?: number;
    maxSessionDurationMs?: number;
    userFeedback?: string;
  }): Promise<any> {
    const jobId = crypto.randomUUID();
    const now = Date.now();
    
    // Create planning job
    await this.env.DB
      .prepare(`
        INSERT INTO ai_planning_jobs (
          id, user_id, status, request_json, reason, created_at
        ) VALUES (?, ?, 'pending', ?, ?, ?)
      `)
      .bind(
        jobId,
        userId,
        JSON.stringify(data),
        data.reason,
        now
      )
      .run();
    
    // Process plan generation asynchronously
    this.generatePlan(jobId, userId, data).catch(err => {
      console.error('Plan generation failed:', err);
    });
    
    return {
      id: jobId,
      status: 'pending',
      userId,
      reason: data.reason,
      createdAt: now,
    };
  }

  async getJobStatus(db: D1Database, jobId: string): Promise<any | null> {
    const result = await db
      .prepare('SELECT * FROM ai_planning_jobs WHERE id = ?')
      .bind(jobId)
      .first();
    
    if (!result) return null;
    
    return {
      id: result.id,
      userId: result.user_id,
      status: result.status,
      request: result.request_json ? JSON.parse(result.request_json) : null,
      generatedPlan: result.generated_plan_json ? JSON.parse(result.generated_plan_json) : null,
      errorMessage: result.error_message,
      model: result.model,
      createdAt: result.created_at,
      startedAt: result.started_at,
      completedAt: result.completed_at,
    };
  }

  async getUserJobs(db: D1Database, userId: string, limit: number): Promise<any[]> {
    const result = await db
      .prepare(`
        SELECT * FROM ai_planning_jobs 
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `)
      .bind(userId, limit)
      .all();
    
    return result.results.map((row: any) => ({
      id: row.id,
      status: row.status,
      reason: row.reason,
      createdAt: row.created_at,
      completedAt: row.completed_at,
    }));
  }

  async adjustPlan(
    userId: string,
    planId: string,
    reason: string,
    completedSessionId?: string
  ): Promise<void> {
    // Load current plan and recent sessions
    const plan = await this.loadPlan(planId);
    const recentSessions = await this.loadRecentSessions(userId);
    
    // Build AI prompt
    const prompt = this.buildAdjustmentPrompt(plan, recentSessions, reason);
    
    // Call AI
    const response = await this.callAI(prompt);
    
    // Validate and apply plan
    await this.applyAdjustedPlan(planId, response);
  }

  private async generatePlan(
    jobId: string,
    userId: string,
    data: any
  ): Promise<void> {
    const now = Date.now();
    
    // Update job status
    await this.env.DB
      .prepare(`
        UPDATE ai_planning_jobs 
        SET status = 'processing', started_at = ?
        WHERE id = ?
      `)
      .bind(now, jobId)
      .run();
    
    try {
      // Build prompt
      const exercises = getExerciseDefinitions();
      const availableExercises = data.availableExercises 
        ? exercises.filter(e => data.availableExercises.includes(e.code))
        : exercises;
      
      const prompt = `
Generate a personalized workout plan for a user with the following characteristics:
- Primary goal: ${data.currentGoal}
- Available exercises: ${availableExercises.map(e => e.code).join(', ')}
${data.maxWorkoutsPerWeek ? `- Preferred workout frequency: ${data.maxWorkoutsPerWeek} days per week` : ''}
${data.userFeedback ? `- User feedback: ${data.userFeedback}` : ''}

Return a JSON workout plan with the following structure:
{
  "name": "Plan name",
  "goal": "${data.currentGoal}",
  "durationWeeks": 4,
  "workoutDaysPerWeek": ${data.maxWorkoutsPerWeek || 4},
  "workouts": [
    {
      "dayNumber": 1,
      "name": "Day name",
      "exercises": [
        {
          "exerciseCode": "exercise_code",
          "order": 0,
          "targetSets": 3,
          "targetReps": 10,
          "restBetweenSetsMs": 60000,
          "restAfterExerciseMs": 90000
        }
      ],
      "isRestDay": false
    }
  ]
}

Only include valid exercise codes from the available exercises list.
`.trim();
      
      // Call AI
      const response = await this.callAI(prompt);
      
      // Update job with result
      await this.env.DB
        .prepare(`
          UPDATE ai_planning_jobs 
          SET status = 'completed', 
              generated_plan_json = ?,
              model = ?,
              completed_at = ?
          WHERE id = ?
        `)
        .bind(JSON.stringify(response), this.env.AI_MODEL, Date.now(), jobId)
        .run();
      
    } catch (error) {
      // Update job with error
      await this.env.DB
        .prepare(`
          UPDATE ai_planning_jobs 
          SET status = 'failed', 
              error_message = ?,
              completed_at = ?
          WHERE id = ?
        `)
        .bind(
          error instanceof Error ? error.message : 'Unknown error',
          Date.now(),
          jobId
        )
        .run();
    }
  }

  private async callAI(prompt: string): Promise<any> {
    try {
      const response = await this.env.AI_GATEWAY.run(this.env.AI_MODEL, {
        messages: [
          { role: 'system', content: 'You are a fitness planning assistant. Return only valid JSON.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: parseInt(this.env.AI_MAX_TOKENS || '1024', 10),
        temperature: parseFloat(this.env.AI_TEMPERATURE || '0.7'),
      });
      
      // Parse JSON from response
      const content = response.response.trim();
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('Failed to parse AI response');
    } catch (error) {
      console.error('AI call failed:', error);
      throw error;
    }
  }

  private async loadPlan(planId: string): Promise<any> {
    const result = await this.env.DB
      .prepare('SELECT * FROM workout_plans WHERE id = ?')
      .bind(planId)
      .first();
    
    if (!result) return null;
    
    return {
      id: result.id,
      name: result.name,
      workouts: JSON.parse(result.workouts_json || '[]'),
    };
  }

  private async loadRecentSessions(userId: string): Promise<any[]> {
    const result = await this.env.DB
      .prepare(`
        SELECT * FROM workout_summaries
        WHERE user_id = ?
        ORDER BY completed_at DESC
        LIMIT 10
      `)
      .bind(userId)
      .all();
    
    return result.results;
  }

  private buildAdjustmentPrompt(plan: any, sessions: any[], reason: string): string {
    return `
Adjust the workout plan "${plan.name}" based on the following information:

Reason for adjustment: ${reason}

Recent workout performance:
${sessions.map(s => `- Completed ${s.completed_sets || 0} sets, avg quality: ${s.overall_quality_score || 0}`).join('\n')}

Current plan structure:
${JSON.stringify(plan.workouts, null, 2)}

Generate an adjusted plan following the same JSON structure. Consider:
- Progressive overload for muscle gain goals
- Sustainable volume for fat loss goals
- Adequate recovery time
- Exercise variety

Return only the adjusted plan JSON.
    `.trim();
  }

  private async applyAdjustedPlan(planId: string, adjustedPlan: any): Promise<void> {
    // Create new revision
    const existingPlan = await this.env.DB
      .prepare('SELECT revision FROM workout_plans WHERE id = ?')
      .bind(planId)
      .first();
    
    const newRevision = (existingPlan?.revision || 0) + 1;
    
    // Archive current plan
    await this.env.DB
      .prepare(`
        UPDATE workout_plans 
        SET status = 'archived', updated_at = ?
        WHERE id = ?
      `)
      .bind(Date.now(), planId)
      .run();
    
    // Create new revision
    await this.env.DB
      .prepare(`
        INSERT INTO workout_plans (
          id, user_id, name, status, revision, previous_revision_id,
          goal, duration_weeks, workout_days_per_week, workouts_json,
          created_at, updated_at
        ) VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        crypto.randomUUID(),
        (await this.env.DB.prepare('SELECT user_id FROM workout_plans WHERE id = ?').bind(planId).first())?.user_id,
        adjustedPlan.name || 'Adjusted Plan',
        newRevision,
        planId,
        adjustedPlan.goal || 'general_fitness',
        adjustedPlan.durationWeeks || 4,
        adjustedPlan.workoutDaysPerWeek || 4,
        JSON.stringify(adjustedPlan.workouts || []),
        Date.now(),
        Date.now()
      )
      .run();
  }
}
