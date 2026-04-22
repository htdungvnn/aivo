/**
 * AI Narrative Generation Service for Infographics
 *
 * Uses OpenAI to generate compelling "hype" narratives based on user fitness stats.
 * Transforms raw data into shareable social proof content.
 */

import { OpenAI } from "openai";
import type {
  InfographicStory,
  UserStats,
  InfographicConfig,
  InfographicTemplate,
  WorkoutType,
} from "@aivo/shared-types";

// OpenAI client configured from env
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  // Cloudflare Workers compatibility
  dangerouslyAllowBrowser: true,
});

/**
 * System prompt for AI narrative generation
 */
const SYSTEM_PROMPT = `You are AIVO's viral content writer. Your job is to turn fitness data into exciting, shareable social media posts that make users feel proud and motivated.

Guidelines:
- Use emojis sparingly and appropriately (💪🔥🏆📈✨)
- Highlight surprising/impressive numbers with analogies ("equivalent to lifting X baby elephants!")
- Use conversational, energetic tone
- Keep headlines under 60 characters (catchy, clickable)
- Narrative: 2-3 sentences max, celebrating achievements
- Call-to-action: friendly invite to join AIVO
- Tone options: motivational, celebratory, educational, competitive
- Reading level: easy (8th grade), medium (high school), challenging (college)

Respond with JSON matching this schema:
{
  "headline": "string (max 60 chars, attention-grabbing)",
  "subheadline": "string or null",
  "narrative": "string (2-3 sentences, the 'hype' paragraph)",
  "stats": [{"label": "string", "value": "string", "unit": "string or null", "comparison": "string or null"}],
  "callToAction": "string",
  "funFacts": ["string"],
  "tone": "string",
  "readingLevel": "string"
}`;

/**
 * Build context string from user stats
 */
function buildStoryContext(stats: UserStats, template: InfographicTemplate): string {
  const lines: string[] = [];

  // Period
  lines.push(`Period: ${stats.period.type} (${stats.period.startDate} to ${stats.period.endDate})`);

  // Workouts
  lines.push(`\nWorkouts: ${stats.workouts.count} sessions, ${Math.round(stats.workouts.totalMinutes)} minutes, ${Math.round(stats.workouts.totalCalories)} calories`);
  const typesEntries = Object.entries(stats.workouts.types) as [WorkoutType, number][];
  if (typesEntries.length > 0) {
    const types = typesEntries
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type, count]) => `${type}: ${count}`)
      .join(", ");
    lines.push(`Top workout types: ${types}`);
  }

  // Strength
  if (stats.strength.totalVolume > 0) {
    lines.push(`\nTotal training volume: ${Math.round(stats.strength.totalVolume).toLocaleString()} kg`);
    const oneRMsEntries = Object.entries(stats.strength.estimatedOneRMs) as [string, number][];
    if (oneRMsEntries.length > 0) {
      const top = oneRMsEntries
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, orm]) => `${name}: ${Math.round(orm)}kg 1RM`)
        .join(", ");
      lines.push(`Top lifts: ${top}`);
    }
  }

  // Personal records
  if (stats.workouts.personalRecords.length > 0) {
    lines.push(`\nPersonal records this period: ${stats.workouts.personalRecords.length}`);
    stats.workouts.personalRecords.forEach(pr => {
      lines.push(`- ${pr.exercise}: ${pr.weight}kg x ${pr.reps} (${pr.improvementPercent?.toFixed(1)}% improvement)`);
    });
  }

  // Gamification
  lines.push(`\nCurrent streak: ${stats.gamification.streak} days (longest: ${stats.gamification.longestStreak})`);
  lines.push(`Level: ${stats.gamification.level} | Points: ${stats.gamification.points.toLocaleString()}`);
  if (stats.gamification.leaderboardRank) {
    lines.push(`Global rank: #${stats.gamification.leaderboardRank}`);
  }

  // Body metrics
  if (stats.body.weightChange !== undefined || stats.body.bodyFatChange !== undefined) {
    lines.push("\nBody composition changes:");
    if (stats.body.weightChange !== undefined) {
      lines.push(`- Weight: ${stats.body.weightChange > 0 ? '+' : ''}${stats.body.weightChange.toFixed(1)} kg`);
    }
    if (stats.body.bodyFatChange !== undefined) {
      lines.push(`- Body fat: ${stats.body.bodyFatChange > 0 ? '+' : ''}${stats.body.bodyFatChange.toFixed(1)}%`);
    }
    if (stats.body.muscleGain !== undefined) {
      lines.push(`- Muscle gain: +${stats.body.muscleGain.toFixed(1)} kg`);
    }
    if (stats.body.bmi !== undefined) {
      lines.push(`- Current BMI: ${stats.body.bmi.toFixed(1)}`);
    }
  }

  // Fun facts/analogies
  if (stats.workouts.totalCalories > 0) {
    const pizzaCalories = 285; // slice of cheese pizza
    const pizzaSlices = Math.round(stats.workouts.totalCalories / pizzaCalories);
    if (pizzaSlices > 0) {
      lines.push(`\nFun fact: Burned the equivalent of ${pizzaSlices} slices of pizza!`);
    }
  }

  if (stats.workouts.totalMinutes > 60) {
    const movies = Math.round(stats.workouts.totalMinutes / 90);
    if (movies >= 1) {
      lines.push(`That's ${movies} full movie${movies > 1 ? 's' : ''} of workout time!`);
    }
  }

  // Determine template-specific context
  if (template === "streak") {
    lines.push(`\nFocus on the streak: ${stats.gamification.streak} consecutive days!`);
  } else if (template === "milestone") {
    lines.push(`\nLook for milestone achievements: high numbers, personal records, round numbers`);
  } else if (template === "muscle_heatmap") {
    if (stats.body.muscleDevelopment && stats.body.muscleDevelopment.length > 0) {
      const topMuscle = stats.body.muscleDevelopment.reduce((best, curr) =>
        curr.score > best.score ? curr : best
      );
      lines.push(`\nStrongest muscle group: ${topMuscle.group} (${topMuscle.score.toFixed(0)}/100)`);
    }
  }

  return lines.join("\n");
}

/**
 * Generate infographic narrative using AI
 *
 * @param userId - User ID (for logging/auditing)
 * @param stats - Aggregated user statistics
 * @param config - Infographic configuration (template, theme, etc.)
 * @param constraints - Content constraints (reading level, tone)
 */
export async function generateInfographicStory(
  userId: string,
  stats: UserStats,
  config: Partial<InfographicConfig>,
  constraints?: {
    readingLevel?: "easy" | "medium" | "challenging";
    tone?: "motivational" | "celebratory" | "educational" | "competitive";
  }
): Promise<InfographicStory> {
  const template = config.template || "weekly_summary";
  const readingLevel = constraints?.readingLevel || "easy";
  const tone = constraints?.tone || inferToneFromStats(stats);

  // Build context from stats
  const context = buildStoryContext(stats, template);

  // Create user prompt with template-specific guidance
  const templateGuidance = getTemplateGuidance(template);
  const userPrompt = `
Generate a social proof infographic for this user's ${stats.period.type} fitness data:

${context}

${templateGuidance}

Generate:
1. An exciting headline (under 60 chars) that makes them want to share
2. Optional catchy subheadline
3. A short 2-3 sentence "hype" paragraph celebrating their achievements
4. 3-5 key statistics with labels and units (use comparison data if available)
5. A call-to-action for followers (e.g., "Join me on AIVO!")
6. 2-3 fun facts or comparisons (you can add more to the list above)

Tone: ${tone}
Reading level: ${readingLevel}
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt.trim() },
      ],
      temperature: 0.8,  // Creative but controlled
      max_tokens: 800,
      response_format: { type: "json_object" },
      // Track usage for analytics
      user: userId,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from AI");
    }

    const story: InfographicStory = JSON.parse(content);

    // Validate required fields
    if (!story.headline || story.headline.length === 0) {
      throw new Error("Missing headline in AI response");
    }
    if (!story.narrative || story.narrative.length === 0) {
      throw new Error("Missing narrative in AI response");
    }

    return story;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("AI narrative generation failed:", error);

    // Fallback: generate simple narrative from stats
    return generateFallbackStory(stats, template, tone);
  }
}

/**
 * Infer appropriate tone from user stats and achievements
 */
function inferToneFromStats(stats: UserStats): "motivational" | "celebratory" | "educational" | "competitive" {
  if (stats.gamification.streak >= 30) {
    return "celebratory";  // Long streak deserves celebration
  }
  if (stats.workouts.personalRecords.length >= 3) {
    return "competitive";  // Multiple PRs = competitive vibe
  }
  if (stats.body.muscleGain && stats.body.muscleGain > 2) {
    return "motivational";  // Significant muscle gain
  }
  return "motivational";  // Default
}

/**
 * Get template-specific guidance for AI
 */
function getTemplateGuidance(template: InfographicTemplate): string {
  switch (template) {
    case "weekly_summary":
      return `TEMPLATE: Weekly Summary
- Headline should summarize the week's achievement
- Stats should include: workout count, total calories, maybe total minutes
- Focus on consistency and volume`;
    case "milestone":
      return `TEMPLATE: Milestone Celebration
- Headline should highlight a big number (e.g., "100TH WORKOUT!")
- Primary stat should be the milestone number
- Narrative should celebrate reaching a significant threshold`;
    case "streak":
      return `TEMPLATE: Streak Display
- Headline about consistency (e.g., "ON FIRE THIS WEEK")
- Primary stat: current streak days
- Secondary stat: longest streak
- Emphasize consecutive days, don't break the chain`;
    case "muscle_heatmap":
      return `TEMPLATE: Muscle Development
- Headline about muscle growth or balance
- Stats about top muscle groups
- Narrative should mention training focus areas`;
    case "comparison":
      return `TEMPLATE: Before/After Comparison
- Headline about progress/transformation
- Stats should show before vs after for key metrics (weight, body fat, muscle)
- Narrative about the journey`;
    default:
      return "";
  }
}

/**
 * Generate fallback story when AI fails
 * Uses templates and simple logic to create acceptable content
 */
function generateFallbackStory(
  stats: UserStats,
  template: InfographicTemplate,
  tone: string
): InfographicStory {
  const { period, workouts, gamification, body } = stats;

  // Generate headline based on template and stats
  let headline: string;
  let statsList: Array<{ label: string; value: string; unit?: string; comparison?: string }>;

  switch (template) {
    case "weekly_summary":
      headline = `${workouts.count} Workouts This Week!`;
      statsList = [
        { label: "Sessions", value: workouts.count.toString() },
        { label: "Calories", value: Math.round(workouts.totalCalories).toString(), unit: "kcal" },
        { label: "Minutes", value: Math.round(workouts.totalMinutes).toString() },
      ];
      break;

    case "milestone":
      const milestoneValue = Math.max(workouts.count, gamification.points, gamification.streak);
      const milestoneLabel = workouts.count >= 100 ? "Workouts" :
                            gamification.points >= 10000 ? "Points" : "Day Streak";
      headline = `Reached ${milestoneValue} ${milestoneLabel}!`;
      statsList = [
        { label: milestoneLabel, value: milestoneValue.toString() },
      ];
      break;

    case "streak":
      headline = `${gamification.streak} Day Streak! 🔥`;
      statsList = [
        { label: "Current", value: gamification.streak.toString(), unit: "days" },
        { label: "Longest", value: gamification.longestStreak.toString(), unit: "days" },
      ];
      break;

    case "muscle_heatmap":
      headline = body.muscleDevelopment?.[0]
        ? `Focus: ${body.muscleDevelopment[0].group}`
        : "Body Development Update";
      statsList = body.muscleDevelopment?.slice(0, 3).map(m => ({
        label: m.group,
        value: m.score.toFixed(0),
        unit: "/100",
      })) || [{ label: "Development", value: "See heatmap" }];
      break;

    case "comparison":
      headline = body.weightChange !== undefined
        ? `Lost ${Math.abs(body.weightChange).toFixed(1)} kg!`
        : "Making Progress";
      statsList = [
        { label: "Weight change", value: body.weightChange?.toFixed(1) || "N/A", unit: "kg" },
        { label: "Body fat", value: body.bodyFatChange?.toFixed(1) || "N/A", unit: "%" },
      ];
      break;

    default:
      headline = `Week of ${period.startDate}`;
      statsList = [{ label: "Workouts", value: workouts.count.toString() }];
  }

  // Build narrative
  let narrative: string;
  if (tone === "celebratory") {
    narrative = `Amazing work! You completed ${workouts.count} workout${workouts.count !== 1 ? 's' : ''} this ${period.type}, burning over ${Math.round(workouts.totalCalories)} calories. Keep up the fantastic momentum!`;
  } else {
    narrative = `Strong ${period.type}! You put in ${Math.round(workouts.totalMinutes)} minutes of training with ${workouts.count} sessions. Your dedication is paying off.`;
  }

  return {
    headline: headline.substring(0, 60),
    subheadline: undefined,
    narrative,
    stats: statsList,
    callToAction: "Join me on AIVO! 💪",
    funFacts: [`${period.type.toUpperCase()} STATS: Check out these numbers!`],
    tone: tone as "motivational" | "celebratory" | "educational" | "competitive",
    readingLevel: "easy",
  };
}

// Export for testing
export { buildStoryContext, getTemplateGuidance, inferToneFromStats, generateFallbackStory };
