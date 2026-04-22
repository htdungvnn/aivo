import { eq } from "drizzle-orm";
import type { FormIssue, FormCorrection, FormExerciseType } from "@aivo/shared-types";
import { sendFormAnalysisCompleteNotification } from "./notifications";
import type { createDrizzleInstance} from "@aivo/db";
import { formAnalysisVideos, formAnalyses } from "@aivo/db";

interface OpenAIChatResponse {
  choices: { message: { content?: string } }[];
}

interface OpenAIChatError {
  error?: { message?: string };
}

interface ParsedAnalysis {
  overallScore: number;
  grade: string;
  issues: unknown[];
  corrections: unknown[];
  summary: unknown;
}

// ============================================
// PROMPTS
// ============================================

const FORM_ANALYSIS_PROMPTS: Record<FormExerciseType, string> = {
  squat: `You are an expert strength coach and physical therapist specializing in squat form analysis.

Analyze the uploaded squat video and provide detailed feedback. Focus on:

1. Knee tracking (watch for valgus collapse - knees caving inward)
2. Back positioning (rounded back, excessive arch)
3. Hip hinge pattern (butt wink at depth)
4. Heel contact (heels rising)
5. Depth (parallel or below)
6. Bar path (if barbell back squat)
7. Overall balance and stability

Provide your analysis as JSON with the following structure:
- overallScore: number (0-100)
- grade: "A" | "B" | "C" | "D" | "F"
- issues: array of objects with:
  - type: specific issue from the predefined list
  - severity: "minor" | "moderate" | "major"
  - confidence: number (0-1)
  - timestampMs: approximate time in video when issue occurs (estimate)
  - description: human-readable explanation
  - impact: "performance" | "safety" | "both"
- corrections: array of drill recommendations for each major issue, with:
  - drillName: clear name
  - description: what it is
  - steps: array of step-by-step instructions
  - cues: verbal cues for the lifter
  - durationSeconds: recommended duration
  - difficulty: "beginner" | "intermediate" | "advanced"
  - equipment: array of equipment needed
- summary:
  - strengths: array of what the lifter did well
  - primaryConcern: the most important issue to fix
  - priority: "low" | "medium" | "high"
- frameAnalysis (optional): array of key frames with annotations`,

  deadlift: `You are an expert strength coach analyzing deadlift form.

Analyze the deadlift video for:

1. Starting position (hips, shoulders, back)
2. Bar path (stays close to body)
3. Hip drive (proper extension, no hyperextension)
4. Back rounding at any point
5. Knee tracking (valgus/varus)
6. Lockout position (hips forward, no lean back)
7. Overall setup and execution

Return JSON with same structure as squat analysis.`,

  bench_press: `You are an expert strength coach analyzing bench press form.

Analyze for:

1. Arch and shoulder positioning
2. Bar path (slight backward arc)
3. Elbow tuck (avoid excessive flare)
4. Leg drive and foot placement
5. Lockout (no elbow hyperextension)
6. Bar control on descent and ascent
7. Spotter safety (if present)

Return JSON with same structure.`,

  overhead_press: `You are an expert strength coach analyzing overhead press form.

Analyze for:

1. Core bracing and lumbar position
2. Bar path (vertical, no excessive back travel)
3. Head position (neutral, not jutting forward)
4. Hip and knee extension timing
5. Lockout position (no excessive back arch)
6. Shoulder mobility and stability

Return JSON with same structure.`,

  lunge: `You are an expert strength coach analyzing lunge form.

Analyze for:

1. Front knee tracking (over toe, not caving)
2. Back knee positioning (directly down, not flaring)
3. Torso uprightness (no excessive forward lean)
4. Hip stability (level hips)
5. Step length (appropriate distance)
6. Balance throughout movement

Return JSON with same structure.`,
};

// Valid issue types (matching shared-types FormIssueType)
const VALID_ISSUE_TYPES = [
  "knee_valgus",
  "knee_hyperextension",
  "rounded_back",
  "excessive_lean",
  "butt_wink",
  "heels_rising",
  "incomplete_depth",
  "bar_path_deviation",
  "hip_asymmetry",
  "shoulder_elevation",
  "elbow_flare",
  "head_position",
  "asymmetric_extension",
] as const;

type ValidIssueType = (typeof VALID_ISSUE_TYPES)[number];

interface AnalysisResult {
  overallScore: number;
  grade: "A" | "B" | "C" | "D" | "F";
  issues: FormIssue[];
  corrections: FormCorrection[];
  summary: {
    strengths: string[];
    primaryConcern: string;
    priority: "low" | "medium" | "high";
  };
}

// ============================================
// ANALYSIS SERVICE
// ============================================

export async function analyzeFormVideo(
  videoUrl: string,
  exerciseType: FormExerciseType,
  apiKey: string,
  signal?: AbortSignal
): Promise<AnalysisResult> {
  const prompt = FORM_ANALYSIS_PROMPTS[exerciseType] || FORM_ANALYSIS_PROMPTS.squat;

  if (!apiKey) {
    throw new Error("OpenAI API key not configured");
  }

  try {
    // Call OpenAI GPT-4o API via fetch
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `${prompt}

IMPORTANT: Respond ONLY with valid JSON matching this exact schema:
{
  "overallScore": number,
  "grade": "A" | "B" | "C" | "D" | "F",
  "issues": [
    {
      "type": ${JSON.stringify(VALID_ISSUE_TYPES)},
      "severity": "minor" | "moderate" | "major",
      "confidence": number (0-1),
      "timestampMs": number,
      "description": string,
      "impact": "performance" | "safety" | "both"
    }
  ],
  "corrections": [
    {
      "issueType": same as issue.type,
      "drillName": string,
      "description": string,
      "steps": string[],
      "cues": string[],
      "durationSeconds": number,
      "difficulty": "beginner" | "intermediate" | "advanced",
      "equipment": string[]
    }
  ],
  "summary": {
    "strengths": string[],
    "primaryConcern": string,
    "priority": "low" | "medium" | "high"
  }
}`,
              },
              {
                type: "video_url",
                video_url: { url: videoUrl },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 2000,
      }),
      signal,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: { message: "OpenAI request failed" } })) as OpenAIChatError;
      if (response.status === 429) {
        throw new Error("OpenAI rate limit exceeded. Please try again later.");
      }
      throw new Error(err.error?.message || "OpenAI request failed");
    }

    const data = await response.json() as OpenAIChatResponse;
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from AI");
    }

    const parsed = JSON.parse(content) as ParsedAnalysis;

    // Validate and transform issues
    const issues: FormIssue[] = parsed.issues.map((issue) => ({
      type: issue.type as ValidIssueType,
      severity: issue.severity as FormIssue["severity"],
      confidence: Math.max(0, Math.min(1, issue.confidence)),
      timestampMs: issue.timestampMs || 0,
      description: issue.description,
      impact: issue.impact || "performance",
    }));

    // Validate and transform corrections
    const corrections: FormCorrection[] = parsed.corrections.map((corr) => ({
      issueType: corr.issueType as ValidIssueType,
      drillName: corr.drillName,
      description: corr.description,
      steps: Array.isArray(corr.steps) ? corr.steps : [corr.description],
      cues: Array.isArray(corr.cues) ? corr.cues : [corr.cues || ""],
      durationSeconds: Math.max(30, corr.durationSeconds || 60),
      difficulty: corr.difficulty || "intermediate",
      equipment: Array.isArray(corr.equipment) ? corr.equipment : [],
    }));

    return {
      overallScore: Math.max(0, Math.min(100, parsed.overallScore)),
      grade: parsed.grade as "A" | "B" | "C" | "D" | "F",
      issues,
      corrections,
      summary: {
        strengths: Array.isArray(parsed.summary.strengths) ? parsed.summary.strengths : [],
        primaryConcern: parsed.summary.primaryConcern || "Review form with a coach",
        priority: parsed.summary.priority || "medium",
      },
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new Error("Analysis timed out");
      }
      throw error;
    }
    throw new Error(String(error));
  }
}

// ============================================
// WORKER FUNCTION
// ============================================

export async function processFormAnalysisJob(
  drizzle: ReturnType<typeof createDrizzleInstance>,
  videoId: string,
  apiKey: string,
  signal?: AbortSignal
): Promise<{ success: boolean; error?: string }> {
  try {
    // Fetch video record
    const video = await drizzle
      .select()
      .from(formAnalysisVideos)
      .where(eq(formAnalysisVideos.id, videoId))
      .limit(1)
      .get();

    if (!video) {
      return { success: false, error: "Video not found" };
    }

    if (video.status === "failed") {
      return { success: false, error: "Video already failed" };
    }

    if (video.status === "completed") {
      return { success: false, error: "Video already analyzed" };
    }

    // Update status to processing
    const now = Math.floor(Date.now() / 1000);
    await drizzle
      .update(formAnalysisVideos)
      .set({ status: "processing", updatedAt: now })
      .where(eq(formAnalysisVideos.id, videoId));

    // Call AI analysis
    const startTime = Date.now();
    const analysisResult = await analyzeFormVideo(video.videoUrl, video.exerciseType, apiKey, signal);
    const processingTime = Date.now() - startTime;

    // Generate corrections for each issue
    const corrections: FormCorrection[] = analysisResult.issues.map((issue) => ({
      issueType: issue.type,
      drillName: getDefaultDrillName(issue.type),
      description: getDefaultDrillDescription(issue.type),
      steps: getDefaultDrillSteps(issue.type),
      cues: getDefaultDrillCues(issue.type),
      durationSeconds: 60,
      difficulty: issue.severity === "major" ? "intermediate" : "beginner",
      equipment: getDefaultDrillEquipment(issue.type),
    }));

    // Create analysis record
    const analysisId = `analysis_${crypto.randomUUID()}`;
    await drizzle.insert(formAnalyses).values({
      id: analysisId,
      videoId: video.id,
      userId: video.userId,
      exerciseType: video.exerciseType,
      status: "completed",
      overallScore: analysisResult.overallScore,
      grade: analysisResult.grade,
      issues: JSON.stringify(analysisResult.issues),
      corrections: JSON.stringify(corrections),
      summaryJson: JSON.stringify(analysisResult.summary),
      frameAnalysisJson: null,
      createdAt: now,
      completedAt: now,
      processingTimeMs: processingTime,
    });

    // Update video status to completed
    await drizzle
      .update(formAnalysisVideos)
      .set({ status: "completed", updatedAt: now })
      .where(eq(formAnalysisVideos.id, videoId));

    // Send push notification to user
    try {
      await sendFormAnalysisCompleteNotification(
        drizzle,
        video.userId,
        video.id,
        analysisResult.grade,
        analysisResult.overallScore
      );
    } catch (notifError) {
      // eslint-disable-next-line no-console
      console.error("[Cron] Failed to send notification:", notifError);
      // Don't fail the job if notification fails
    }

    return { success: true };
  } catch (error: unknown) {
    // eslint-disable-next-line no-console
    console.error(`Form analysis failed for video ${videoId}:`, error);

    // Mark video as failed
    try {
      await drizzle
        .update(formAnalysisVideos)
        .set({ status: "failed", updatedAt: Math.floor(Date.now() / 1000) })
        .where(eq(formAnalysisVideos.id, videoId));
    } catch (updateError) {
      // eslint-disable-next-line no-console
      console.error("Failed to update video status:", updateError);
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMessage };
  }
}

// ============================================
// DRILL REFERENCE DATA (Simplified)
// ============================================

function getDefaultDrillName(type: string): string {
  const names: Record<string, string> = {
    knee_valgus: "Resistance Band Squats",
    rounded_back: "Hip Hinge Drills",
    butt_wink: "Hip Flexor Stretch & Core Bracing",
    incomplete_depth: "Box Squats",
    heels_rising: "Ankle Mobility + Elevated Squats",
    bar_path_deviation: "Pause Squats",
    excessive_lean: "Goblet Squats (upright)",
    knee_hyperextension: "Soft Knee Lockout Practice",
    hip_asymmetry: "Single-Leg Work",
    shoulder_elevation: "Shoulder Depression Drills",
    elbow_flare: "Elbow Tuck Cues",
    head_position: "Chin Tuck / Gaze Fixation",
    asymmetric_extension: "Tempo Work + Mirror Check",
  };
  return names[type] || "Form Correction Drill";
}

function getDefaultDrillDescription(type: string): string {
  return `Practice drill to correct ${type.replace(/_/g, " ")}.`;
}

function getDefaultDrillSteps(type: string): string[] {
  // Generic steps - in production, these would be exercise-specific
  return [
    "Warm up with bodyweight only",
    "Focus on the cue provided",
    "Perform 3 sets of 10-15 slow reps",
    "Record yourself to check improvement",
  ];
}

function getDefaultDrillCues(type: string): string[] {
  const cues: Record<string, string[]> = {
    knee_valgus: ["Push knees outward", "Spread the floor with your feet"],
    rounded_back: ["Chest up", "Take a deep breath, brace core"],
    butt_wink: ["Maintain neutral spine", "Sit back into hips"],
    incomplete_depth: ["Sit back, then down", "Go below parallel"],
  };
  return cues[type] || ["Focus on form", "Control the movement"];
}

function getDefaultDrillEquipment(type: string): string[] {
  return ["bodyweight"];
}
