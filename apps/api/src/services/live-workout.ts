import { eq } from "drizzle-orm";
import type { D1Database } from "@cloudflare/workers-types";
import { createDrizzleInstance, liveWorkoutSessions, setRpeLogs } from "@aivo/db";
import {
  type LiveWorkoutSession,
  type SetRPELog,
  type LiveAdjustmentRequest,
  type LiveAdjustmentResponse,
  type StartLiveWorkoutRequest,
  type FatigueAssessment,
  type LiveAdjustment,
} from "@aivo/shared-types";
import { LiveWorkoutAdjuster } from "@aivo/compute";

export class LiveWorkoutService {
  private drizzle: ReturnType<typeof createDrizzleInstance>;

  constructor(db: D1Database) {
    this.drizzle = createDrizzleInstance(db);
  }

  async startSession(
    userId: string,
    request: StartLiveWorkoutRequest
  ): Promise<LiveWorkoutSession> {
    const now = Math.floor(Date.now() / 1000 * 1000); // milliseconds
    const sessionId = `session_${crypto.randomUUID()}`;

    const session: LiveWorkoutSession = {
      id: sessionId,
      userId,
      workoutTemplateId: request.workoutTemplateId,
      name: request.name,
      startedAt: now,
      lastActivityAt: now,
      status: "active",
      fatigueLevel: 0,
      fatigueCategory: "fresh",
      totalPlannedVolume: 0,
      totalCompletedVolume: 0,
      setsCompleted: 0,
      totalPlannedSets: 0,
      targetRPE: request.targetRPE ?? 8,
      idealRestSeconds: request.idealRestSeconds ?? 90,
      hasSpotter: request.hasSpotter ?? false,
      createdAt: now,
      updatedAt: now,
    };

    // Map to DB columns (targetRPE -> targetRpe, hasSpotter -> 0/1)
    await this.drizzle.insert(liveWorkoutSessions).values({
      ...session,
      targetRpe: session.targetRPE,
      hasSpotter: session.hasSpotter ? 1 : 0,
    });

    return session;
  }

  async getSession(sessionId: string, userId: string): Promise<LiveWorkoutSession | null> {
    const session = await this.drizzle
      .select()
      .from(liveWorkoutSessions)
      .where(eq(liveWorkoutSessions.id, sessionId))
      .limit(1)
      .get();

    if (!session || session.userId !== userId) {
      return null;
    }

    // Map DB row to LiveWorkoutSession interface
    return {
      ...session,
      targetRPE: Number(session.targetRpe),
      hasSpotter: Boolean(session.hasSpotter),
    } as LiveWorkoutSession;
  }

  async logRPE(log: SetRPELog): Promise<void> {
    const now = Math.floor(Date.now() / 1000 * 1000);
    await this.drizzle.insert(setRpeLogs).values({
      ...log,
      userId: log.userId,
      createdAt: now,
    });

    // Update session stats
    await this.drizzle
      .update(liveWorkoutSessions)
      .set({
        lastActivityAt: log.timestamp,
        setsCompleted: log.setNumber, // Keep as number
        updatedAt: now,
      })
      .where(eq(liveWorkoutSessions.id, log.sessionId));
  }

  async endSession(
    sessionId: string,
    userId: string,
    reason?: string,
    suggestion?: string
  ): Promise<LiveWorkoutSession | null> {
    const session = await this.getSession(sessionId, userId);
    if (!session) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000 * 1000);
    const duration = now - session.startedAt;

    await this.drizzle
      .update(liveWorkoutSessions)
      .set({
        status: "completed",
        endedAt: now,
        totalDurationMs: duration,
        earlyExitReason: reason,
        earlyExitSuggestion: suggestion,
        updatedAt: now,
      })
      .where(eq(liveWorkoutSessions.id, sessionId));

    return this.getSession(sessionId, userId);
  }

  async getLiveAdjustment(
    sessionId: string,
    userId: string,
    request: LiveAdjustmentRequest
  ): Promise<LiveAdjustmentResponse> {
    // Verify session ownership
    const session = await this.getSession(sessionId, userId);
    if (!session) {
      return { success: false, error: "Session not found" };
    }

    try {
      // Assess current fatigue using WASM
      const fatigueResult = LiveWorkoutAdjuster.assessCurrentFatigue(
        request.recentRPERecords,
        session.targetRPE,
        session.idealRestSeconds
      ) as FatigueAssessment;

      // Get adjustment recommendation
      const adjustment = LiveWorkoutAdjuster.recommendLiveAdjustment(
        request.currentWeight,
        request.targetReps,
        request.remainingSets,
        fatigueResult.fatigueLevel,
        fatigueResult.category,
        request.exerciseType,
        request.isWarmup,
        session.hasSpotter
      ) as LiveAdjustment;

      // Calculate recommended rest
      const lastRPE = request.recentRPERecords[0]?.rpe;
      const recommendedRest = LiveWorkoutAdjuster.calculateRecommendedRest(
        session.idealRestSeconds,
        fatigueResult.fatigueLevel,
        request.exerciseType,
        lastRPE
      );

      // Check if workout should end
      const endCheck = LiveWorkoutAdjuster.shouldEndWorkout(
        fatigueResult.fatigueLevel,
        session.setsCompleted,
        session.totalCompletedVolume,
        session.totalPlannedVolume,
        0 // TODO: track form breakdown count
      ) as { should_end: boolean; reason?: string; suggestion?: string };

      return {
        success: true,
        adjustment,
        fatigue: fatigueResult,
        recommendedRest,
        shouldEndWorkout: endCheck.should_end,
        endWorkoutReason: endCheck.reason,
        endWorkoutSuggestion: endCheck.suggestion,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to calculate adjustment",
      };
    }
  }
}
