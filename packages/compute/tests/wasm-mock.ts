/**
 * WASM Mock Bridge for Jest Testing
 *
 * Provides deterministic mocks for Rust compute functions.
 * Real WASM is loaded in integration tests; unit tests use these mocks.
 */

// Mock implementations for compute functions
const mockComputeResults = new Map<string, unknown>();

/**
 * Configure mock return values for specific compute functions.
 * Call this in your test setup to define expected outputs.
 */
export function configureWasmMock(
  functionName: string,
  mockResult: unknown
) {
  mockComputeResults.set(functionName, mockResult);
}

/**
 * Reset all WASM mocks to clean state between test suites.
 */
export function resetWasmMocks() {
  mockComputeResults.clear();
}

/**
 * Mock implementation of calculate_1rm (One-Rep Max)
 */
export function mockCalculate1rm(
  weight: number,
  reps: number,
  method: "epley" | "brzycki" = "epley"
): number {
  if (method === "epley") {
    return weight * (1 + reps / 30);
  } else {
    return weight * (36 / (37 - reps));
  }
}

/**
 * Mock implementation of calculate_bmr (Basal Metabolic Rate)
 * Uses Mifflin-St Jeor equation.
 */
export function mockCalculateBmr(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: "male" | "female"
): number {
  if (gender === "male") {
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else {
    return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  }
}

/**
 * Mock implementation of calculate_tdee (Total Daily Energy Expenditure)
 */
export function mockCalculateTdee(
  bmr: number,
  activityLevel: number // 1.0 - 1.9
): number {
  return bmr * activityLevel;
}

/**
 * Mock implementation of calculate_macros
 */
export function mockCalculateMacros(
  tdee: number,
  goal: "lose" | "maintain" | "gain",
  proteinRatio: number = 0.3,
  fatRatio: number = 0.25
): {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
} {
  let calories = tdee;
  if (goal === "lose") calories -= 500;
  if (goal === "gain") calories += 500;

  const proteinCal = calories * proteinRatio;
  const fatCal = calories * fatRatio;
  const carbCal = calories - proteinCal - fatCal;

  return {
    calories: Math.round(calories),
    protein_g: Math.round(proteinCal / 4),
    carbs_g: Math.round(carbCal / 4),
    fat_g: Math.round(fatCal / 9),
  };
}

/**
 * Mock implementation of generate_workout_plan
 */
export function mockGenerateWorkoutPlan(
  fitnessLevel: string,
  daysPerWeek: number,
  equipment: string[]
): Array<{
  day: number;
  exercise: string;
  sets: number;
  reps: number;
  restSeconds: number;
}> {
  const exercises: Record<string, Array<{ exercise: string; sets: number; reps: number }>> =
    {
      beginner: [
        { exercise: "bodyweight_squat", sets: 3, reps: 12 },
        { exercise: "push_up", sets: 3, reps: 10 },
        { exercise: "bodyweight_row", sets: 3, reps: 10 },
      ],
      intermediate: [
        { exercise: "barbell_squat", sets: 4, reps: 8 },
        { exercise: "bench_press", sets: 4, reps: 8 },
        { exercise: "deadlift", sets: 3, reps: 5 },
      ],
      advanced: [
        { exercise: "barbell_squat", sets: 5, reps: 5 },
        { exercise: "bench_press", sets: 5, reps: 5 },
        { exercise: "deadlift", sets: 3, reps: 3 },
      ],
    };

  const baseExercises = exercises[fitnessLevel as keyof typeof exercises] || exercises.beginner;
  const plan: Array<{
    day: number;
    exercise: string;
    sets: number;
    reps: number;
    restSeconds: number;
  }> = [];

  for (let day = 1; day <= daysPerWeek; day++) {
    baseExercises.forEach((ex, idx) => {
      plan.push({
        day,
        exercise: ex.exercise,
        sets: ex.sets,
        reps: ex.reps,
        restSeconds: 90 - fitnessLevel === "advanced" ? 30 : 60,
      });
    });
  }

  return plan;
}

/**
 * Create a Jest mock module that can be imported instead of real WASM.
 */
export function createWasmMockModule() {
  return {
    calculate_1rm: jest.fn((weight: number, reps: number, method: number) =>
      mockCalculate1rm(weight, reps, method === 0 ? "epley" : "brzycki")
    ),
    calculate_bmr: jest.fn(mockCalculateBmr),
    calculate_tdee: jest.fn(mockCalculateTdee),
    calculate_macros: jest.fn(mockCalculateMacros),
    generate_workout_plan: jest.fn(mockGenerateWorkoutPlan),
    // Add other WASM functions as needed
  };
}

// Auto-mock for Jest
jest.mock("@aivo/compute", () => ({
  ...createWasmMockModule(),
  __esModule: true,
}));
