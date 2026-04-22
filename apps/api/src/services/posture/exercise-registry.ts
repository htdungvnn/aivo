/**
 * Exercise Registry
 * Centralized registry for exercise-specific data
 * Follows Open/Closed Principle - new exercises can be added via registration
 */

export interface ExerciseDefinition {
  id: string;
  name: string;
  processingFeeMultiplier: number;
  defaultDrills: DrillDefinition[];
}

export interface DrillDefinition {
  name: string;
  purpose: string;
  frequency: string;
  duration: string;
  steps: string[];
  regressions: string[];
  progressions: string[];
}

export interface IssueDrillMapping {
  issueType: string;
  drillName: string;
  description: string;
  steps: string[];
  cues: string[];
  durationSeconds: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  equipment: string[];
}

export class ExerciseRegistry {
  private exercises: Map<string, ExerciseDefinition> = new Map();
  private issueDrillMappings: Map<string, IssueDrillMapping[]> = new Map();

  constructor() {
    this.initializeDefaultExercises();
    this.initializeDefaultIssueMappings();
  }

  private initializeDefaultExercises(): void {
    const defaultExercises: ExerciseDefinition[] = [
      {
        id: "squat",
        name: "Squat",
        processingFeeMultiplier: 1.0,
        defaultDrills: [],
      },
      {
        id: "deadlift",
        name: "Deadlift",
        processingFeeMultiplier: 1.2,
        defaultDrills: [],
      },
      {
        id: "bench_press",
        name: "Bench Press",
        processingFeeMultiplier: 1.0,
        defaultDrills: [],
      },
      {
        id: "overhead_press",
        name: "Overhead Press",
        processingFeeMultiplier: 1.1,
        defaultDrills: [],
      },
      {
        id: "lunge",
        name: "Lunge",
        processingFeeMultiplier: 0.9,
        defaultDrills: [],
      },
    ];

    for (const exercise of defaultExercises) {
      this.exercises.set(exercise.id, exercise);
    }
  }

  private initializeDefaultIssueMappings(): void {
    const mappings: Record<string, Omit<IssueDrillMapping, "issueType">> = {
      knee_valgus: {
        drillName: "Resistance Band Squats",
        description: "Knees caving inward during movement",
        steps: [
          "Place resistance band around knees",
          "Perform bodyweight squats with band tension",
          "Focus on pushing knees outward against band",
          "3 sets of 15 reps",
        ],
        cues: ["Push knees outward", "Spread the floor with your feet"],
        durationSeconds: 60,
        difficulty: "beginner",
        equipment: ["resistance_band", "bodyweight"],
      },
      rounded_back: {
        drillName: "Hip Hinge Drills",
        description: "Upper back rounding during lifts",
        steps: [
          "Practice hip hinges with light weight or broomstick",
          "Brace core before each rep (take deep breath)",
          "Keep chest up throughout movement",
          "Reduce weight until form is perfect",
        ],
        cues: ["Chest up", "Maintain neutral spine"],
        durationSeconds: 60,
        difficulty: "intermediate",
        equipment: ["broomstick", "light_weight"],
      },
      butt_wink: {
        drillName: "Hip Flexor Stretch & Core Bracing",
        description: "Pelvic posterior tilt at bottom of squat",
        steps: [
          "Stretch hip flexors daily",
          "Practice core bracing with dead bug exercise",
          "Reduce depth until mobility improves",
          "Maintain neutral pelvic position",
        ],
        cues: ["Keep core tight", "Don't let lower back round"],
        durationSeconds: 60,
        difficulty: "intermediate",
        equipment: ["bodyweight"],
      },
      incomplete_depth: {
        drillName: "Box Squats",
        description: "Not achieving required depth",
        steps: [
          "Use box squats to train depth",
          "Sit back until glutes touch box",
          "Practice pause squats at depth",
          "Gradually reduce box height",
        ],
        cues: ["Sit back", "Go deeper"],
        durationSeconds: 60,
        difficulty: "beginner",
        equipment: ["box", "barbell"],
      },
      heels_rising: {
        drillName: "Ankle Mobility + Elevated Squats",
        description: "Heels lifting during squat",
        steps: [
          "Improve ankle mobility with wall stretches",
          "Practice with elevated heels initially",
          "Use goblet squats to reinforce heel contact",
          "Progress to flat ground as mobility improves",
        ],
        cues: ["Keep weight in heels", "Drive through heels"],
        durationSeconds: 60,
        difficulty: "beginner",
        equipment: ["weight_plate", "dumbbell"],
      },
      bar_path_deviation: {
        drillName: "Pause Squats",
        description: "Bar not following vertical path",
        steps: [
          "Practice with empty bar focusing on path",
          "Pause at various points to reinforce control",
          "Use video feedback to monitor path",
          "Reduce weight until path is consistent",
        ],
        cues: ["Keep bar straight up and down", "Control the descent"],
        durationSeconds: 60,
        difficulty: "intermediate",
        equipment: ["barbell"],
      },
      excessive_lean: {
        drillName: "Goblet Squats (upright)",
        description: "Excessive forward torso lean",
        steps: [
          "Use goblet squat to train upright torso",
          "Keep weight in heels",
          "Chest up, gaze forward",
          "Start with bodyweight only",
        ],
        cues: ["Stay upright", "Chest up"],
        durationSeconds: 60,
        difficulty: "beginner",
        equipment: ["dumbbell", "kettlebell"],
      },
      knee_hyperextension: {
        drillName: "Soft Knee Lockout Practice",
        description: "Hyperextending knees at top",
        steps: [
          "Practice soft knee lockout",
          "Maintain slight bend at top",
          "Focus on controlled locking",
          "Use lighter weight to build habit",
        ],
        cues: ["Keep soft knees", "Don't lock out"],
        durationSeconds: 60,
        difficulty: "beginner",
        equipment: ["bodyweight"],
      },
      hip_asymmetry: {
        drillName: "Single-Leg Work",
        description: "Uneven hip position",
        steps: [
          "Single-leg stance holds",
          "Single-leg RDLs for balance",
          "Mirror check during exercises",
          "Address mobility imbalances",
        ],
        cues: ["Keep hips level", "Balance evenly"],
        durationSeconds: 60,
        difficulty: "intermediate",
        equipment: ["bodyweight", "dumbbell"],
      },
      shoulder_elevation: {
        drillName: "Shoulder Depression Drills",
        description: "Shoulders shrugged up",
        steps: [
          "Practice shoulder depression with band pull-aparts",
          "Lat activation exercises",
          "Mindful shoulder positioning",
          "Use cues like 'squeeze shoulder blades down'",
        ],
        cues: ["Shoulders down", "Depress scapulae"],
        durationSeconds: 60,
        difficulty: "beginner",
        equipment: ["resistance_band"],
      },
      elbow_flare: {
        drillName: "Elbow Tuck Cues",
        description: "Elbows flaring out",
        steps: [
          "Practice elbow tuck with band",
          "Focus on 45-degree angle",
          "Use lighter weight initially",
          "Video feedback for form",
        ],
        cues: ["Tuck elbows", "Keep elbows at 45 degrees"],
        durationSeconds: 60,
        difficulty: "beginner",
        equipment: ["bodyweight"],
      },
      head_position: {
        drillName: "Chin Tuck / Gaze Fixation",
        description: "Head position not neutral",
        steps: [
          "Practice chin tuck against wall",
          "Maintain neutral gaze",
          "Use mirror feedback",
          "Build proprioception for position",
        ],
        cues: ["Chin tucked", "Gaze straight ahead"],
        durationSeconds: 60,
        difficulty: "beginner",
        equipment: ["bodyweight"],
      },
      asymmetric_extension: {
        drillName: "Tempo Work + Mirror Check",
        description: "Asymmetric extension",
        steps: [
          "Slow tempo work for control",
          "Mirror check during practice",
          "Address strength imbalances",
          "Unilateral work for balance",
        ],
        cues: ["Stay symmetrical", "Move both sides together"],
        durationSeconds: 60,
        difficulty: "intermediate",
        equipment: ["bodyweight"],
      },
      hip_hinge: {
        drillName: "Romanian Deadlifts",
        description: "Hip hinge pattern not established",
        steps: [
          "Stand with feet hip-width",
          "Push hips back while maintaining neutral spine",
          "Feel the stretch in hamstrings",
          "Practice with dowel along spine",
        ],
        cues: ["Push hips back", "Maintain neutral spine"],
        durationSeconds: 60,
        difficulty: "beginner",
        equipment: ["dumbbell", "barbell", "dowel"],
      },
    };

    for (const [issueType, mapping] of Object.entries(mappings)) {
      this.issueDrillMappings.set(issueType, [{
        issueType,
        ...mapping,
      }]);
    }
  }

  getExercise(id: string): ExerciseDefinition | undefined {
    return this.exercises.get(id);
  }

  getAllExercises(): ExerciseDefinition[] {
    return Array.from(this.exercises.values());
  }

  registerExercise(exercise: ExerciseDefinition): void {
    this.exercises.set(exercise.id, exercise);
  }

  getDrillForIssue(issueType: string): IssueDrillMapping | undefined {
    const mappings = this.issueDrillMappings.get(issueType);
    return mappings?.[0];
  }

  getAllIssueMappings(): IssueDrillMapping[] {
    return Array.from(this.issueDrillMappings.values()).flat();
  }

  calculateProcessingFee(exerciseType: string): number {
    const exercise = this.exercises.get(exerciseType);
    const basePrice = 1.0;
    const multiplier = exercise?.processingFeeMultiplier ?? 1.0;
    return Math.round(basePrice * multiplier * 100) / 100;
  }
}

// Singleton instance for global access
export const exerciseRegistry = new ExerciseRegistry();
