// ============================================
// AIVO Shared Types - Complete System Schema
// ============================================
// Strict TypeScript definitions for the entire AIVO platform
// No `any` types allowed - full type safety
// ============================================
// EXPORT ALL TYPES
// ============================================
// Export type guards
export function isUser(obj) {
    return (typeof obj === "object" &&
        obj !== null &&
        "id" in obj &&
        "email" in obj &&
        "name" in obj &&
        "createdAt" in obj &&
        "updatedAt" in obj);
}
export function isWorkout(obj) {
    return (typeof obj === "object" &&
        obj !== null &&
        "id" in obj &&
        "userId" in obj &&
        "type" in obj &&
        "duration" in obj &&
        "status" in obj);
}
export function isActivityEvent(obj) {
    return (typeof obj === "object" &&
        obj !== null &&
        "id" in obj &&
        "userId" in obj &&
        "type" in obj &&
        "payload" in obj &&
        "clientTimestamp" in obj &&
        "serverTimestamp" in obj);
}
// ============================================
// SECTION 12: BODY HEATMAP - SHARED CONSTANTS & UTILITIES
// ============================================
/**
 * Normalized muscle positions (0-100 coordinate system)
 * These positions map to the body outline SVG
 */
export const MUSCLE_POSITIONS = {
    chest: { x: 50, y: 42, zone: "front_torso" },
    chest_upper: { x: 50, y: 35, zone: "front_torso" },
    chest_lower: { x: 50, y: 50, zone: "front_torso" },
    back: { x: 50, y: 55, zone: "back_torso" },
    back_upper: { x: 50, y: 48, zone: "back_torso" },
    back_lower: { x: 50, y: 65, zone: "back_torso" },
    shoulders: { x: 24, y: 38, zone: "front_torso" },
    shoulders_rear: { x: 76, y: 38, zone: "back_torso" },
    biceps: { x: 18, y: 45, zone: "front_arm" },
    triceps: { x: 22, y: 50, zone: "back_arm" },
    forearms: { x: 12, y: 55, zone: "front_arm" },
    abs: { x: 50, y: 62, zone: "front_torso" },
    core: { x: 50, y: 68, zone: "front_torso" },
    obliques: { x: 30, y: 58, zone: "front_torso" },
    quadriceps: { x: 30, y: 82, zone: "front_leg" },
    hamstrings: { x: 30, y: 92, zone: "back_leg" },
    glutes: { x: 38, y: 82, zone: "back_torso" },
    calves: { x: 30, y: 100, zone: "front_leg" },
    neck: { x: 50, y: 15, zone: "front_torso" },
};
/**
 * SVG path data for body outline (front view)
 * Coordinates in 200x400 viewBox
 */
export const BODY_OUTLINE_FRONT = `
  M 50 15
  C 42 15, 35 18, 32 22
  C 29 26, 28 30, 28 35
  C 28 38, 27 40, 25 42
  C 23 44, 20 46, 15 48
  C 10 50, 7 52, 5 56
  C 3 60, 3 65, 4 70
  C 5 75, 6 80, 7 90
  C 8 100, 10 110, 12 120
  M 12 120 C 15 118, 20 115, 25 112
  M 50 15
  C 58 15, 65 18, 68 22
  C 71 26, 72 30, 72 35
  C 72 38, 73 40, 75 42
  C 77 44, 80 46, 85 48
  C 90 50, 93 52, 95 56
  C 97 60, 97 65, 96 70
  C 95 75, 94 80, 93 90
  C 92 100, 90 110, 88 120
  M 88 120 C 85 118, 80 115, 75 112
  M 30 28 C 30 40, 32 55, 32 70
  C 32 85, 30 100, 28 115
  M 70 28 C 70 40, 68 55, 68 70
  C 68 85, 70 100, 72 115
  M 32 115 C 28 118, 20 120, 15 122
  M 68 115 C 72 118, 80 120, 85 122
  M 45 100 C 40 100, 35 105, 32 115
  M 55 100 C 60 100, 65 105, 68 115
`.trim();
/**
 * SVG path data for body outline (back view)
 */
export const BODY_OUTLINE_BACK = `
  M 50 15
  C 42 15, 35 18, 32 22
  C 29 26, 28 30, 28 35
  C 28 38, 27 40, 25 42
  C 23 44, 20 46, 15 48
  C 10 50, 7 52, 5 56
  C 3 60, 3 65, 4 70
  C 5 75, 6 80, 7 90
  C 8 100, 10 110, 12 120
  M 12 120 C 15 118, 20 115, 25 112
  M 50 15
  C 58 15, 65 18, 68 22
  C 71 26, 72 30, 72 35
  C 72 38, 73 40, 75 42
  C 77 44, 80 46, 85 48
  C 90 50, 93 52, 95 56
  C 97 60, 97 65, 96 70
  C 95 75, 94 80, 93 90
  C 92 100, 90 110, 88 120
  M 88 120 C 85 118, 80 115, 75 112
  M 30 32 C 30 45, 32 60, 32 75
  C 32 90, 30 105, 28 120
  M 70 32 C 70 45, 68 60, 68 75
  C 68 90, 70 105, 72 120
  M 32 120 C 28 123, 20 125, 15 127
  M 68 120 C 72 123, 80 125, 85 127
`.trim();
/**
 * Get color for intensity value based on scale
 * @param intensity - Value between 0 and 1
 * @param scale - Color scale to use
 * @returns Object with baseColor and opacity
 */
export function getHeatmapColor(intensity, scale = "heat") {
    const i = Math.max(0, Math.min(1, intensity));
    const opacity = 0.4 + i * 0.5;
    switch (scale) {
        case "cool":
            return { baseColor: "rgba(6, 182, 212, ", opacity };
        case "monochrome":
            return { baseColor: "rgba(255, 255, 255, ", opacity };
        case "heat":
        default:
            if (i < 0.2) {
                return { baseColor: "rgba(59, 130, 246, ", opacity };
            } // blue
            if (i < 0.4) {
                return { baseColor: "rgba(6, 182, 212, ", opacity };
            } // cyan
            if (i < 0.6) {
                return { baseColor: "rgba(34, 197, 94, ", opacity };
            } // green
            if (i < 0.8) {
                return { baseColor: "rgba(234, 179, 8, ", opacity };
            } // yellow
            return { baseColor: "rgba(249, 115, 22, ", opacity }; // orange
    }
}
/**
 * Calculate radius for heatmap point based on intensity
 */
export function getHeatmapRadius(intensity, baseRadius = 8) {
    return baseRadius + intensity * 6;
}
/**
 * Aggregate heatmap points by muscle location
 * Groups nearby points and averages their intensities
 */
export function aggregateHeatmapPoints(vectorData) {
    const groups = {};
    vectorData.forEach((point) => {
        const key = `${point.muscle}_${Math.round(point.x)}_${Math.round(point.y)}`;
        if (!groups[key]) {
            groups[key] = { x: point.x, y: point.y, count: 0, totalIntensity: 0 };
        }
        groups[key].count++;
        groups[key].totalIntensity += point.intensity;
    });
    return Object.values(groups).map((g) => ({
        x: g.x,
        y: g.y,
        intensity: g.totalIntensity / g.count,
        muscle: vectorData.find((p) => Math.abs(p.x - g.x) < 2 && Math.abs(p.y - g.y) < 2)?.muscle || "chest",
    }));
}
export const BODY_ZONES = [
    // Upper Body
    {
        id: "chest",
        name: "Chest",
        bounds: { x: 0.35, y: 0.18, width: 0.30, height: 0.15 },
        muscles: ["pectorals", "deltoids_front"],
    },
    {
        id: "back_upper",
        name: "Upper Back",
        bounds: { x: 0.35, y: 0.12, width: 0.30, height: 0.15 },
        muscles: ["trapezius", "deltoids_rear", "lats"],
    },
    {
        id: "shoulders",
        name: "Shoulders",
        bounds: { x: 0.25, y: 0.18, width: 0.50, height: 0.08 },
        muscles: ["deltoids"],
    },
    {
        id: "arms",
        name: "Arms",
        bounds: { x: 0.15, y: 0.20, width: 0.10, height: 0.30 },
        muscles: ["biceps", "triceps", "forearms"],
    },
    // Core
    {
        id: "abs_upper",
        name: "Upper Abs",
        bounds: { x: 0.35, y: 0.32, width: 0.30, height: 0.08 },
        muscles: ["rectus_abdominis"],
    },
    {
        id: "abs_lower",
        name: "Lower Abs",
        bounds: { x: 0.35, y: 0.40, width: 0.30, height: 0.10 },
        muscles: ["rectus_abdominis", "hip_flexors"],
    },
    {
        id: "obliques",
        name: "Obliques",
        bounds: { x: 0.25, y: 0.35, width: 0.50, height: 0.12 },
        muscles: ["obliques", "serratus_anterior"],
    },
    {
        id: "lower_back",
        name: "Lower Back",
        bounds: { x: 0.35, y: 0.28, width: 0.30, height: 0.08 },
        muscles: ["erector_spinae"],
    },
    // Lower Body
    {
        id: "glutes",
        name: "Glutes",
        bounds: { x: 0.35, y: 0.50, width: 0.30, height: 0.12 },
        muscles: ["gluteus_maximus"],
    },
    {
        id: "quads",
        name: "Quadriceps",
        bounds: { x: 0.30, y: 0.62, width: 0.40, height: 0.20 },
        muscles: ["quadriceps"],
    },
    {
        id: "hamstrings",
        name: "Hamstrings",
        bounds: { x: 0.30, y: 0.82, width: 0.40, height: 0.15 },
        muscles: ["hamstrings"],
    },
    {
        id: "calves",
        name: "Calves",
        bounds: { x: 0.35, y: 0.97, width: 0.30, height: 0.10 },
        muscles: ["gastrocnemius", "soleus"],
    },
];
/**
 * Human-readable labels and descriptions for posture issues
 */
export const POSTURE_ISSUE_LABELS = {
    forward_head: {
        label: "Forward Head",
        description: "Head positioned too far forward relative to shoulders"
    },
    rounded_shoulders: {
        label: "Rounded Shoulders",
        description: "Shoulders rolled forward, indicating poor upper back posture"
    },
    hyperlordosis: {
        label: "Hyperlordosis",
        description: "Excessive inward curve of the lower back"
    },
    kyphosis: {
        label: "Kyphosis",
        description: " Excessive outward curve of the upper back (hunching)"
    },
    pelvic_tilt: {
        label: "Pelvic Tilt",
        description: "Anterior or posterior pelvic misalignment"
    },
};
/**
 * Severity color mappings (hex colors)
 */
export const SEVERITY_COLORS = {
    mild: "#fbbf24", // amber-400
    moderate: "#f97316", // orange-500
    severe: "#ef4444", // red-500
};
/**
 * Severity background/style mappings for UI
 * Returns platform-agnostic style descriptors
 */
export const SEVERITY_STYLES = {
    mild: { bg: "rgba(251, 191, 36, 0.2)", border: "rgba(251, 191, 36, 0.3)", text: "rgba(251, 191, 36, 1)" },
    moderate: { bg: "rgba(249, 115, 22, 0.2)", border: "rgba(249, 115, 22, 0.3)", text: "rgba(249, 115, 22, 1)" },
    severe: { bg: "rgba(239, 68, 68, 0.2)", border: "rgba(239, 68, 68, 0.3)", text: "rgba(239, 68, 68, 1)" },
};
/**
 * Get score color class/string based on score value
 */
export function getScoreColor(score) {
    if (score >= 80)
        return "text-emerald-400";
    if (score >= 60)
        return "text-blue-400";
    if (score >= 40)
        return "text-amber-400";
    return "text-red-400";
}
/**
 * Get human-readable score label
 */
export function getScoreLabel(score) {
    if (score >= 80)
        return "Excellent";
    if (score >= 60)
        return "Good";
    if (score >= 40)
        return "Fair";
    return "Needs Work";
}
/**
 * Get gradient class for score bar
 */
export function getScoreGradient(score) {
    return score >= 60
        ? "bg-gradient-to-r from-emerald-500 to-blue-500"
        : "bg-gradient-to-r from-amber-500 to-red-500";
}
/**
 * Calculate health score from metrics and user profile
 * Pure function - no side effects
 */
export function calculateHealthScore(params) {
    const factors = {
        bmi: 0.5,
        bodyFat: 0.5,
        muscleMass: 0.5,
        fitnessLevel: 0.4,
    };
    // BMI scoring (0-1)
    if (params.bmi !== undefined) {
        const bmi = params.bmi;
        if (bmi >= 18.5 && bmi <= 24.9) {
            factors.bmi = 1;
        }
        else if (bmi >= 25 && bmi <= 29.9) {
            factors.bmi = 0.7;
        }
        else if (bmi >= 30) {
            factors.bmi = 0.3;
        }
        else {
            factors.bmi = 0.5;
        }
    }
    // Body fat scoring (0-1)
    if (params.bodyFatPercentage !== undefined) {
        const bf = params.bodyFatPercentage / 100; // Convert to decimal
        if (bf < 0.12) {
            factors.bodyFat = 0.8;
        }
        else if (bf >= 0.12 && bf <= 0.25) {
            factors.bodyFat = 1;
        }
        else if (bf > 0.25 && bf <= 0.30) {
            factors.bodyFat = 0.7;
        }
        else {
            factors.bodyFat = 0.3;
        }
    }
    // Muscle mass scoring (0-1)
    if (params.muscleMass !== undefined && params.weight !== undefined) {
        const muscleRatio = params.muscleMass / params.weight;
        if (muscleRatio >= 0.35 && muscleRatio <= 0.45) {
            factors.muscleMass = 1;
        }
        else if (muscleRatio >= 0.30 && muscleRatio < 0.35) {
            factors.muscleMass = 0.8;
        }
        else if (muscleRatio > 0.45 && muscleRatio <= 0.50) {
            factors.muscleMass = 0.9;
        }
        else {
            factors.muscleMass = 0.5;
        }
    }
    // Fitness level scoring
    const fitnessMap = {
        beginner: 0.4,
        intermediate: 0.7,
        advanced: 0.9,
        elite: 1.0,
    };
    factors.fitnessLevel = fitnessMap[params.fitnessLevel || "beginner"] || 0.4;
    // Weighted average
    const weights = { bmi: 0.25, bodyFat: 0.3, muscleMass: 0.3, fitnessLevel: 0.15 };
    const score = (factors.bmi * weights.bmi +
        factors.bodyFat * weights.bodyFat +
        factors.muscleMass * weights.muscleMass +
        factors.fitnessLevel * weights.fitnessLevel) *
        100;
    // Determine category
    let category;
    if (score >= 80) {
        category = "excellent";
    }
    else if (score >= 60) {
        category = "good";
    }
    else if (score >= 40) {
        category = "fair";
    }
    else {
        category = "poor";
    }
    // Generate recommendations
    const recommendations = [];
    if (factors.bmi < 0.7) {
        recommendations.push("Focus on maintaining a healthy weight range through balanced nutrition");
    }
    if (factors.bodyFat < 0.7) {
        recommendations.push("Consider adjusting macronutrient intake to optimize body composition");
    }
    if (factors.muscleMass < 0.7) {
        recommendations.push("Incorporate resistance training to build lean muscle mass");
    }
    if (recommendations.length === 0) {
        recommendations.push("Keep up your excellent health trajectory!");
    }
    return {
        score: Math.round(score * 10) / 10,
        category,
        factors,
        recommendations,
    };
}
// ============================================
// SECTION 15: TIMESTAMP UTILITIES
// ============================================
/**
 * Get current timestamp in milliseconds
 */
export function now() {
    return Date.now();
}
/**
 * Convert milliseconds to Unix timestamp (seconds)
 */
export function toUnixTimestamp(ms) {
    return Math.floor(ms / 1000);
}
/**
 * Convert Unix timestamp to Date
 */
export function fromUnixTimestamp(unix) {
    return new Date(unix * 1000);
}
// ============================================
// SECTION 16: API RESPONSE HELPERS
// ============================================
/**
 * Create a standard API response
 */
export function createApiResponse(data, status = "success", message) {
    return {
        success: status === "success",
        data,
        error: status === "error" ? message : undefined,
        message,
        timestamp: new Date(),
    };
}
/**
 * Create an error API response
 */
export function createErrorResponse(error) {
    return {
        success: false,
        error,
        timestamp: new Date(),
    };
}
/**
 * Helper function to calculate overall grade from score
 */
export function calculateFormGrade(score) {
    if (score >= 90)
        return "A";
    if (score >= 80)
        return "B";
    if (score >= 70)
        return "C";
    if (score >= 60)
        return "D";
    return "F";
}
/**
 * Helper function to get color for score display
 */
export function getFormScoreColor(score) {
    if (score >= 90)
        return "#10b981"; // green
    if (score >= 80)
        return "#22c55e"; // light green
    if (score >= 70)
        return "#eab308"; // yellow
    if (score >= 60)
        return "#f97316"; // orange
    return "#ef4444"; // red
}
/**
 * Helper function to group issues by type
 */
export function groupIssuesByType(issues) {
    const map = new Map();
    for (const issue of issues) {
        const existing = map.get(issue.type) || [];
        map.set(issue.type, [...existing, issue]);
    }
    return map;
}
/**
 * Helper function to get worst severity from list of issues
 */
export function getWorstSeverity(issues) {
    if (issues.length === 0)
        return "minor";
    const severities = ["minor", "moderate", "major"];
    for (const severity of severities.reverse()) {
        if (issues.some(i => i.severity === severity)) {
            return severity;
        }
    }
    return "minor";
}
// ============================================
// SECTION 20: ADAPTIVE PLANNER - RE-PLANNING TYPES
// ============================================
// Re-export all adaptive planner types from the separate module
export * from "./adaptive-planner";
// ============================================
// END OF POSTURE ANALYSIS TYPES
// ============================================
// ============================================
// END OF LIVE WORKOUT ADJUSTMENT TYPES
// ==========================================
export const AGENT_SYSTEM_PROMPTS = {
    chef: `You are a professional chef and nutritionist specializing in practical home cooking.

Your expertise:
- Creating delicious, nutritious recipes from available ingredients
- Ingredient substitutions for allergies/restrictions
- Cooking techniques for all skill levels
- Meal prep and efficiency

Guidelines:
- Prioritize food safety (proper cooking temperatures, cross-contamination avoidance)
- Consider available kitchen tools and skill level
- Include clear, step-by-step instructions
- Provide realistic prep and cook times
- Suggest variations for dietary preferences
- Always include allergen warnings when applicable

Output format: Valid JSON matching the Recipe schema.`,
    medical: `You are a medical nutrition specialist with expertise in food-drug interactions and dietary contraindications.

Your expertise:
- Food-drug interactions (MAO inhibitors, blood thinners, etc.)
- Condition-specific dietary restrictions (diabetes, hypertension, kidney disease, etc.)
- Allergen identification and severity assessment
- Nutrient-drug interactions

CRITICAL SAFETY RULES:
1. If a user mentions a life-threatening allergy (anaphylaxis risk), mark as CRITICAL severity
2. Flag grapefruit interactions with statins, blood pressure meds
3. Warn about vitamin K interactions with warfarin
4. Flag high-potassium foods for kidney disease patients
5. Flag high-sodium foods for hypertension patients

DISCLAIMER: You are not a substitute for medical advice. Users should consult their healthcare provider.

Output format: Valid JSON matching the MedicalAgentResponse schema.`,
    budget: `You are a grocery shopping and meal budget optimization expert.

Your expertise:
- Cost per calorie and cost per gram protein calculations
- Seasonal produce pricing
- Bulk buying strategies
- Store brand vs name brand comparisons
- Reducing food waste

Guidelines:
- Provide realistic cost estimates based on average grocery prices
- Suggest cheaper protein sources (eggs, beans, chicken thighs vs breasts)
- Recommend frozen vegetables for cost savings
- Suggest plant-based proteins as budget alternatives
- Consider unit prices (price per oz/lb) not just total price

Output format: Valid JSON matching the BudgetAgentResponse schema.`,
};
