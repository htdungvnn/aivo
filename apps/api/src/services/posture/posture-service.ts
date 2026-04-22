/**
 * Posture Analysis Service
 * Encapsulates business logic for posture analysis workflows
 * Follows Single Responsibility and Dependency Inversion principles
 */

import { eq, sql, and } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { schema } from "@aivo/db";
import type { SkeletonData, FormDeviation } from "./posture-analyzer";
import { analyzePosture } from "./posture-analyzer";
import { generateAIFeedback } from "./ai-feedback";
import { exerciseRegistry } from "./exercise-registry";
import { sendNotification } from "./posture-helpers";

export interface AnalysisResult {
  id: string;
  videoId?: string;
  userId: string;
  exerciseType: string;
  status: "completed";
  overallScore: number;
  grade: string;
  issues: Array<{
    type: string;
    severity: string;
    confidence: number;
    timestampMs: number;
    description: string;
    impact: string;
  }>;
  corrections: Array<{
    issueType: string;
    drillName: string;
    description: string;
    steps: string[];
    cues: string[];
    durationSeconds: number;
    difficulty: string;
    equipment: string[];
  }>;
  summary: {
    strengths: string[];
    primaryConcern: string;
    priority: "high" | "low";
  };
  aiFeedback?: unknown;
  aiProcessingTimeMs?: number;
  processingTimeMs: number;
  completedAt: number;
}

export class PostureService {
  private drizzle: DrizzleD1Database<typeof schema>;

  constructor(drizzle: DrizzleD1Database<typeof schema>) {
    this.drizzle = drizzle;
  }

  /**
   * Perform complete posture analysis pipeline
   */
  async analyzePosture(
    skeletonData: SkeletonData,
    userId: string,
    videoId?: string,
    userProfile?: { experienceLevel: "beginner" | "intermediate" | "advanced"; goals: string[]; injuries: string[] }
  ): Promise<AnalysisResult> {
    const startTime = Date.now();

    // Step 1: Run geometric analysis via WASM
    const analysisResult = await analyzePosture(skeletonData);

    // Step 2: Generate AI feedback (optional)
    let aiFeedback: unknown = null;
    let aiProcessingTimeMs: number | null = null;

    try {
      const aiStartTime = Date.now();
      const aiResult = await generateAIFeedback({
        skeletonData,
        geometricAnalysis: analysisResult,
        userProfile,
      });
      aiFeedback = aiResult;
      aiProcessingTimeMs = Date.now() - aiStartTime;
    } catch (error) {
      // AI feedback is optional - continue without it
      // eslint-disable-next-line no-console
      console.error("[PostureService] AI feedback failed:", error);
    }

    // Step 3: Store results
    const analysisId = `posture_${crypto.randomUUID()}`;
    const now = Math.floor(Date.now() / 1000);

    await this.drizzle.insert(schema.formAnalyses).values({
      id: analysisId,
      videoId: videoId ?? analysisId,
      userId,
      exerciseType: skeletonData.exerciseType,
      status: "completed",
      overallScore: analysisResult.overallScore,
      grade: analysisResult.grade,
      issues: JSON.stringify(
        analysisResult.deviations.map((d: FormDeviation) => ({
          type: d.issueType,
          severity: d.severity,
          confidence: d.confidence,
          timestampMs: d.timestampMs,
          description: d.description,
          impact: "both",
        }))
      ),
      corrections: JSON.stringify(
        analysisResult.deviations.map((d: FormDeviation) => {
          const drill = exerciseRegistry.getDrillForIssue(d.issueType);
          return {
            issueType: d.issueType,
            drillName: drill?.drillName ?? "Form Correction Drill",
            description: d.description,
            steps: drill?.steps ?? getDefaultSteps(d.issueType),
            cues: drill?.cues ?? [d.cue],
            durationSeconds: drill?.durationSeconds ?? 60,
            difficulty: drill?.difficulty ?? (d.severity === "major" ? "intermediate" : "beginner"),
            equipment: drill?.equipment ?? ["bodyweight"],
          };
        })
      ),
      summaryJson: JSON.stringify({
        strengths: [],
        primaryConcern: analysisResult.deviations[0]?.description ?? "No major issues detected",
        priority: analysisResult.deviations.some((d: FormDeviation) => d.severity === "major") ? "high" : "low",
      }),
      frameAnalysisJson: null,
      aiFeedbackJson: aiFeedback ? JSON.stringify(aiFeedback) : null,
      aiProcessingTimeMs: aiProcessingTimeMs ?? null,
      createdAt: now,
      completedAt: now,
      processingTimeMs: Date.now() - startTime,
    });

    // Step 4: Send notification
    await sendNotification(
      this.drizzle,
      userId,
      analysisId,
      analysisResult.grade,
      analysisResult.overallScore
    );

    return {
      id: analysisId,
      videoId,
      userId,
      exerciseType: skeletonData.exerciseType,
      status: "completed",
      overallScore: analysisResult.overallScore,
      grade: analysisResult.grade,
      issues: [],
      corrections: [],
      summary: {
        strengths: [],
        primaryConcern: analysisResult.deviations[0]?.description ?? "No major issues detected",
        priority: "low",
      },
      aiFeedback,
      aiProcessingTimeMs: aiProcessingTimeMs ?? undefined,
      processingTimeMs: Date.now() - startTime,
      completedAt: now,
    };
  }

  /**
   * Get analysis result by ID
   */
  async getAnalysis(analysisId: string, userId: string): Promise<AnalysisResult | null> {
    const analysis = await this.drizzle
      .select()
      .from(schema.formAnalyses)
      .where(
        and(
          eq(schema.formAnalyses.id, analysisId),
          eq(schema.formAnalyses.userId, userId)
        )
      )
      .get();

    if (!analysis) {
      return null;
    }

    return {
      id: analysis.id,
      userId: analysis.userId,
      exerciseType: analysis.exerciseType,
      status: "completed",
      overallScore: analysis.overallScore,
      grade: analysis.grade,
      issues: JSON.parse(analysis.issues ?? "[]"),
      corrections: JSON.parse(analysis.corrections ?? "[]"),
      summary: JSON.parse(analysis.summaryJson ?? "{}"),
      aiFeedback: analysis.aiFeedbackJson ? JSON.parse(analysis.aiFeedbackJson) : null,
      aiProcessingTimeMs: analysis.aiProcessingTimeMs ?? undefined,
      processingTimeMs: analysis.processingTimeMs ?? 0,
      completedAt: analysis.completedAt ?? 0,
    };
  }

  /**
   * Get user's analysis history
   */
  async getAnalysisHistory(userId: string, limit: number = 50): Promise<Array<{ id: string; exerciseType: string; overallScore: number; grade: string; completedAt: number; processingTimeMs: number }>> {
    const analyses = await this.drizzle
      .select({
        id: schema.formAnalyses.id,
        exerciseType: schema.formAnalyses.exerciseType,
        overallScore: schema.formAnalyses.overallScore,
        grade: schema.formAnalyses.grade,
        completedAt: schema.formAnalyses.completedAt,
        processingTimeMs: schema.formAnalyses.processingTimeMs,
      })
      .from(schema.formAnalyses)
      .where(eq(schema.formAnalyses.userId, userId))
      .orderBy(sql`${schema.formAnalyses.createdAt} DESC`)
      .limit(limit)
      .all();

    return analyses.map(a => ({
      id: a.id,
      exerciseType: a.exerciseType,
      overallScore: a.overallScore,
      grade: a.grade,
      completedAt: a.completedAt ?? 0,
      processingTimeMs: a.processingTimeMs ?? 0,
    }));
  }
}

/**
 * Get default drill steps for an issue type
 */
function getDefaultSteps(_issueType: string): string[] {
  return [
    "Warm up with bodyweight only",
    "Focus on proper technique",
    "Perform 3 sets of 10-15 slow reps",
    "Record yourself to track improvement",
  ];
}
