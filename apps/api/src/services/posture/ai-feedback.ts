/**
 * AI Feedback Service for Posture Analysis
 * Uses GPT-4o to analyze skeleton coordinates and provide nuanced coaching feedback
 * This is Step 3 of the posture correction pipeline
 */

import { openai } from "../utils/openai";
import type { SkeletonData, FormDeviation, PostureAnalysisResult } from "./posture-analyzer";

export interface AIFeedbackRequest {
  skeletonData: SkeletonData;
  geometricAnalysis: PostureAnalysisResult;
  userProfile?: {
    experienceLevel: "beginner" | "intermediate" | "advanced";
    goals: string[];
    injuries: string[];
  };
}

export interface AIFeedbackResponse {
  overallAssessment: string;
  primaryIssues: Array<{
    issue: string;
    severity: "low" | "medium" | "high" | "critical";
    explanation: string;
    priority: number; // 1-5, 1 being highest priority
  }>;
  personalizedCues: Array<{
    triggerPoint: string; // When to cue
    verbalCue: string;
    visualCue?: string;
    tactileCue?: string;
  }>;
  drillRecommendations: Array<{
    name: string;
    purpose: string;
    frequency: string; // e.g., "3x per week"
    duration: string; // e.g., "2 weeks"
    steps: string[];
    regressions: string[]; // Easier variations
    progressions: string[]; // Harder variations
  }>;
  confidence: number; // 0-1
  warnings: string[];
}

/**
 * Generate AI-powered feedback from skeleton data
 * This sends skeleton coordinates (not video) to GPT-4o for analysis
 */
export async function generateAIFeedback(
  request: AIFeedbackRequest
): Promise<AIFeedbackResponse> {
  const { skeletonData, geometricAnalysis, userProfile } = request;

  // Build the prompt with skeleton analysis
  const prompt = buildFeedbackPrompt(skeletonData, geometricAnalysis, userProfile);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: prompt,
        },
        {
          role: "user",
          content: `Analyze the provided skeleton data and generate comprehensive feedback.

Exercise: ${skeletonData.exerciseType}
Overall Geometric Score: ${geometricAnalysis.overallScore}/100 (Grade: ${geometricAnalysis.grade})

Detected deviations:
${geometricAnalysis.deviations
  .map(
    (d) =>
      `- ${d.joint} (${d.issueType}): ${d.description} [${d.severity}, confidence: ${Math.round(d.confidence * 100)}%]`
  )
  .join("\n")}

${geometricAnalysis.criticalWarnings.length > 0 ? `\nCRITICAL WARNINGS:\n${geometricAnalysis.criticalWarnings.join("\n")}` : ""}

Please provide your AI analysis as JSON matching the specified schema.`,
        },
      ],
      temperature: 0.4,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const parsed = JSON.parse(content) as AIFeedbackResponse;

    // Validate and normalize response
    return {
      overallAssessment: parsed.overallAssessment || "Analysis complete.",
      primaryIssues: parsed.primaryIssues || [],
      personalizedCues: parsed.personalizedCues || [],
      drillRecommendations: parsed.drillRecommendations || [],
      confidence: Math.max(0, Math.min(1, parsed.confidence || 0.8)),
      warnings: parsed.warnings || [],
    };
  } catch (error) {
    console.error("[AIFeedback] Analysis failed:", error);
    throw new Error(`AI feedback generation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Build the system prompt for AI feedback
 */
function buildFeedbackPrompt(
  skeletonData: SkeletonData,
  geometricAnalysis: PostureAnalysisResult,
  userProfile?: AIFeedbackRequest["userProfile"]
): string {
  const exercise = skeletonData.exerciseType;
  const frames = skeletonData.frames;

  // Extract key joint positions for analysis
  // Summarize the movement pattern
  const summary = summarizeMovement(skeletonData, geometricAnalysis);

  return `You are an expert strength coach and movement specialist analyzing ${exercise} form.

Your expertise:
- Biomechanics and joint kinematics
- Motor learning and skill acquisition
- Exercise physiology and muscle activation patterns
- Injury prevention and safe movement patterns

ANALYSIS CONTEXT:
${userProfile ? `Athlete Profile:
- Experience: ${userProfile.experienceLevel}
- Goals: ${userProfile.goals.join(", ") || "General fitness"}
- Injury history: ${userProfile.injuries.join(", ") || "None reported"}` : ""}

GEOMETRIC ANALYSIS RESULTS:
- Overall Score: ${geometricAnalysis.overallScore}/100 (${geometricAnalysis.grade})
- Frames analyzed: ${geometricAnalysis.totalFramesAnalyzed}
- Deviations detected: ${geometricAnalysis.deviations.length}
${geometricAnalysis.criticalWarnings.length > 0 ? `\n⚠️ CRITICAL WARNINGS: ${geometricAnalysis.criticalWarnings.join("; ")}` : ""}

${summary}

TASK: Provide personalized coaching feedback based on the skeleton coordinate analysis.

OUTPUT SCHEMA (return valid JSON):
{
  "overallAssessment": "string - comprehensive summary of form quality",
  "primaryIssues": [
    {
      "issue": "string - specific form flaw",
      "severity": "low" | "medium" | "high" | "critical",
      "explanation": "string - biomechanical reasoning",
      "priority": number 1-5 (1 = fix immediately)
    }
  ],
  "personalizedCues": [
    {
      "triggerPoint": "string - when to apply the cue (e.g., 'during descent', 'at bottom')",
      "verbalCue": "string - what to say to the athlete",
      "visualCue": "optional string - demonstration or visualization",
      "tactileCue": "optional string - physical touch guidance"
    }
  ],
  "drillRecommendations": [
    {
      "name": "string",
      "purpose": "string - what issue it addresses",
      "frequency": "string - e.g., '3x per week'",
      "duration": "string - e.g., '2 weeks or until mastered'",
      "steps": ["string"],
      "regressions": ["string - easier variations"],
      "progressions": ["string - harder variations"]
    }
  ],
  "confidence": number (0-1, your confidence in this analysis),
  "warnings": ["string - any cautions or concerns"]
}

IMPORTANT: Tailor feedback to ${userProfile?.experienceLevel || "the athlete's"} level. Focus on the highest priority issues first. Provide specific, actionable cues that can be implemented immediately.`;
}

/**
 * Summarize movement pattern from skeleton data
 */
function summarizeMovement(skeletonData: SkeletonData, analysis: PostureAnalysisResult): string {
  const { frames, exerciseType } = skeletonData;
  const { deviations } = analysis;

  // Find most frequent issue types
  const issueCounts = new Map<string, number>();
  for (const dev of deviations) {
    issueCounts.set(dev.issueType, (issueCounts.get(dev.issueType) || 0) + 1);
  }

  const topIssues = Array.from(issueCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([issue, count]) => `${issue} (${count} frames)`)
    .join(", ");

  return `
Movement Summary:
- Exercise: ${exerciseType}
- Total frames: ${frames.length}
- Duration: ${(frames.length / (skeletonData.metadata.fps || 30)).toFixed(1)} seconds
- Most common issues: ${topIssues || "None significant"}
- Severity distribution: ${getSeverityDistribution(deviations)}

Frame-by-frame angle data (sample):
${sampleFrames(frames, analysis.deviations).slice(0, 2000)} // Limit size
`;
}

/**
 * Get distribution of severity levels
 */
function getSeverityDistribution(deviations: FormDeviation[]): string {
  const counts = { minor: 0, moderate: 0, major: 0 };
  for (const d of deviations) {
    if (counts[d.severity as keyof typeof counts] !== undefined) {
      counts[d.severity as keyof typeof counts]++;
    }
  }
  return `Minor: ${counts.minor}, Moderate: ${counts.moderate}, Major: ${counts.major}`;
}

/**
 * Sample frames with deviations for AI analysis
 */
function sampleFrames(frames: SkeletonFrame[], deviations: FormDeviation[]): string {
  if (frames.length === 0) return "No frame data";

  // Sample up to 5 key frames
  const sampleCount = Math.min(5, frames.length);
  const step = Math.max(1, Math.floor(frames.length / sampleCount));

  const lines: string[] = [];
  for (let i = 0; i < frames.length; i += step) {
    if (lines.length >= sampleCount) break;
    const frame = frames[i];
    const frameDeviations = deviations.filter((d) => d.timestampMs === frame.timestampMs);

    lines.push(`Frame ${frame.frameNumber}:`);
    for (const [joint, pos] of Object.entries(frame.joints)) {
      if (pos.confidence > 0.5) {
        lines.push(`  ${joint}: (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}) conf=${(pos.confidence * 100).toFixed(0)}%`);
      }
    }
    if (frameDeviations.length > 0) {
      lines.push(`  Issues: ${frameDeviations.map(d => d.issueType).join(", ")}`);
    }
  }

  return lines.join("\n");
}
