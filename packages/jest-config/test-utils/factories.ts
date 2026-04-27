/**
 * Test Factory Functions for AIVO
 * Provides consistent test data generation for all packages
 */

import { faker } from '@faker-js/faker';

/**
 * Generate a unique ID
 */
export const generateId = () => faker.string.uuid();

/**
 * Factory for creating user test data
 */
export const userFactory = (overrides?: Partial<UserTestData>): UserTestData => ({
  id: generateId(),
  email: faker.internet.email(),
  name: faker.person.fullName(),
  avatarUrl: faker.internet.avatar(),
  provider: 'google' as const,
  providerId: generateId(),
  createdAt: Math.floor(Date.now() / 1000),
  age: faker.number.int({ min: 18, max: 80 }),
  height: faker.number.float({ min: 140, max: 220, precision: 0.01 }),
  fitnessGoal: faker.helpers.arrayElement(['lose_weight', 'gain_muscle', 'maintain', 'improve_endurance']),
  ...overrides,
});

/**
 * Factory for creating session test data
 */
export const sessionFactory = (overrides?: Partial<SessionTestData>): SessionTestData => ({
  id: generateId(),
  userId: generateId(),
  provider: 'google' as const,
  providerUserId: generateId(),
  token: faker.string.alphanumeric(32),
  createdAt: Math.floor(Date.now() / 1000),
  expiresAt: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
  ...overrides,
});

/**
 * Factory for creating body metrics test data
 */
export const bodyMetricsFactory = (overrides?: Partial<BodyMetricsTestData>): BodyMetricsTestData => ({
  id: generateId(),
  userId: generateId(),
  timestamp: Math.floor(Date.now() / 1000),
  weight: faker.number.float({ min: 40, max: 200, precision: 0.1 }),
  bodyFatPercentage: faker.number.float({ min: 0.05, max: 0.40, precision: 0.001 }),
  muscleMass: faker.number.float({ min: 10, max: 80, precision: 0.1 }),
  bmi: faker.number.float({ min: 15, max: 40, precision: 0.1 }),
  chest: faker.number.float({ min: 60, max: 140, precision: 0.1 }),
  waist: faker.number.float({ min: 50, max: 120, precision: 0.1 }),
  hips: faker.number.float({ min: 60, max: 150, precision: 0.1 }),
  shoulders: faker.number.float({ min: 40, max: 60, precision: 0.1 }),
  biceps: faker.number.float({ min: 20, max: 50, precision: 0.1 }),
  thighs: faker.number.float({ min: 40, max: 80, precision: 0.1 }),
  calves: faker.number.float({ min: 25, max: 45, precision: 0.1 }),
  neck: faker.number.float({ min: 30, max: 50, precision: 0.1 }),
  forearms: faker.number.float({ min: 20, max: 40, precision: 0.1 }),
  ...overrides,
});

/**
 * Factory for creating body heatmap test data
 */
export const bodyHeatmapFactory = (overrides?: Partial<BodyHeatmapTestData>): BodyHeatmapTestData => ({
  id: generateId(),
  userId: generateId(),
  timestamp: Math.floor(Date.now() / 1000),
  vectorData: JSON.stringify({
    muscles: [
      { x: faker.number.int({ min: 0, max: 100 }), y: faker.number.int({ min: 0, max: 100 }), muscle: 'chest', intensity: faker.number.float({ min: 0, max: 1 }) },
      { x: faker.number.int({ min: 0, max: 100 }), y: faker.number.int({ min: 0, max: 100 }), muscle: 'back', intensity: faker.number.float({ min: 0, max: 1 }) },
      { x: faker.number.int({ min: 0, max: 100 }), y: faker.number.int({ min: 0, max: 100 }), muscle: 'legs', intensity: faker.number.float({ min: 0, max: 1 }) },
    ]
  }),
  sourceType: 'photo' as const,
  sourceUrl: faker.internet.url(),
  confidence: faker.number.float({ min: 0.5, max: 1.0, precision: 0.001 }),
  ...overrides,
});

/**
 * Factory for creating vision analysis test data
 */
export const visionAnalysisFactory = (overrides?: Partial<VisionAnalysisTestData>): VisionAnalysisTestData => ({
  id: generateId(),
  userId: generateId(),
  imageUrl: faker.internet.url(),
  analysis: JSON.stringify({
    posture: {
      alignmentScore: faker.number.float({ min: 0, max: 1, precision: 0.001 }),
      issues: faker.helpers.arrayElements(['forward_head_posture', 'rounded_shoulders', 'excessive_kyphosis', 'anterior_pelvic_tilt'], faker.number.int({ min: 0, max: 2 })),
      confidence: faker.number.float({ min: 0.5, max: 1.0, precision: 0.001 }),
    },
    symmetry: {
      leftRightBalance: faker.number.float({ min: 0.5, max: 1.0, precision: 0.001 }),
      imbalances: faker.helpers.arrayElements(['right_quad_stronger', 'left_lat_weaker', 'right_calf_smaller'], faker.number.int({ min: 0, max: 1 })),
    },
    muscleDevelopment: [
      { muscle: 'chest', score: faker.number.float({ min: 0, max: 1, precision: 0.001 }), zone: 'upper' },
      { muscle: 'back', score: faker.number.float({ min: 0, max: 1, precision: 0.001 }), zone: 'middle' },
      { muscle: 'legs', score: faker.number.float({ min: 0, max: 1, precision: 0.001 }), zone: 'quad' },
    ],
    bodyComposition: {
      bodyFatEstimate: faker.number.float({ min: 0.05, max: 0.35, precision: 0.001 }),
      muscleMassEstimate: faker.number.float({ min: 0.2, max: 0.5, precision: 0.001 }),
    },
  }),
  confidence: faker.number.float({ min: 0.6, max: 1.0, precision: 0.001 }),
  createdAt: Math.floor(Date.now() / 1000),
  processedAt: Math.floor(Date.now() / 1000),
  ...overrides,
});

/**
 * Factory for creating workout test data
 */
export const workoutFactory = (overrides?: Partial<WorkoutTestData>): WorkoutTestData => ({
  id: generateId(),
  userId: generateId(),
  name: faker.helpers.arrayElement(['Upper Body', 'Lower Body', 'Full Body', 'Cardio', 'Strength']),
  description: faker.lorem.sentences(2),
  exercises: [
    {
      id: generateId(),
      name: faker.helpers.arrayElement(['Bench Press', 'Squat', 'Deadlift', 'Pull Up', 'Overhead Press']),
      sets: faker.number.int({ min: 3, max: 5 }),
      reps: faker.number.int({ min: 8, max: 12 }),
      weight: faker.number.float({ min: 20, max: 100, precision: 0.5 }),
      restSeconds: faker.number.int({ min: 60, max: 180 }),
    }
  ],
  durationMinutes: faker.number.int({ min: 30, max: 120 }),
  difficulty: faker.helpers.arrayElement(['beginner', 'intermediate', 'advanced']) as 'beginner' | 'intermediate' | 'advanced',
  createdAt: Math.floor(Date.now() / 1000),
  ...overrides,
});

/**
 * Factory for creating AI chat message test data
 */
export const chatMessageFactory = (overrides?: Partial<ChatMessageTestData>): ChatMessageTestData => ({
  id: generateId(),
  userId: generateId(),
  role: faker.helpers.arrayElement(['user', 'assistant', 'system']) as 'user' | 'assistant' | 'system',
  content: faker.lorem.paragraph(),
  tokens: faker.number.int({ min: 10, max: 500 }),
  model: faker.helpers.arrayElement(['gpt-4o-mini', 'gemini-1.5-flash', 'gpt-4o']),
  cost: faker.number.float({ min: 0.001, max: 0.1, precision: 0.000001 }),
  createdAt: Math.floor(Date.now() / 1000),
  ...overrides,
});

/**
 * Factory for creating nutrition log test data
 */
export const nutritionLogFactory = (overrides?: Partial<NutritionLogTestData>): NutritionLogTestData => ({
  id: generateId(),
  userId: generateId(),
  timestamp: Math.floor(Date.now() / 1000),
  mealType: faker.helpers.arrayElement(['breakfast', 'lunch', 'dinner', 'snack']) as 'breakfast' | 'lunch' | 'dinner' | 'snack',
  foodItems: [
    {
      name: faker.lorem.word(),
      calories: faker.number.int({ min: 50, max: 500 }),
      protein: faker.number.float({ min: 0, max: 50, precision: 0.1 }),
      carbs: faker.number.float({ min: 0, max: 100, precision: 0.1 }),
      fat: faker.number.float({ min: 0, max: 50, precision: 0.1 }),
      amount: faker.number.float({ min: 0.1, max: 2, precision: 0.1 }),
      unit: faker.helpers.arrayElement(['g', 'oz', 'cup', 'tbsp']),
    }
  ],
  totalCalories: faker.number.int({ min: 200, max: 1500 }),
  totalProtein: faker.number.float({ min: 10, max: 150, precision: 0.1 }),
  totalCarbs: faker.number.float({ min: 20, max: 200, precision: 0.1 }),
  totalFat: faker.number.float({ min: 5, max: 100, precision: 0.1 }),
  ...overrides,
});

/**
 * Type definitions for test data
 */
export interface UserTestData {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  provider: 'google' | 'facebook';
  providerId: string;
  createdAt: number;
  age?: number;
  height?: number;
  fitnessGoal?: string;
}

export interface SessionTestData {
  id: string;
  userId: string;
  provider: 'google' | 'facebook';
  providerUserId: string;
  token: string;
  createdAt: number;
  expiresAt: number;
}

export interface BodyMetricsTestData {
  id: string;
  userId: string;
  timestamp: number;
  weight: number;
  bodyFatPercentage: number;
  muscleMass: number;
  bmi: number;
  chest?: number;
  waist?: number;
  hips?: number;
  shoulders?: number;
  biceps?: number;
  thighs?: number;
  calves?: number;
  neck?: number;
  forearms?: number;
}

export interface BodyHeatmapTestData {
  id: string;
  userId: string;
  timestamp: number;
  vectorData: string;
  sourceType: 'photo' | 'manual';
  sourceUrl?: string;
  confidence: number;
}

export interface VisionAnalysisTestData {
  id: string;
  userId: string;
  imageUrl: string;
  analysis: string;
  confidence: number;
  createdAt: number;
  processedAt: number;
}

export interface WorkoutTestData {
  id: string;
  userId: string;
  name: string;
  description: string;
  exercises: Array<{
    id: string;
    name: string;
    sets: number;
    reps: number;
    weight: number;
    restSeconds: number;
  }>;
  durationMinutes: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  createdAt: number;
}

export interface ChatMessageTestData {
  id: string;
  userId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokens: number;
  model: string;
  cost: number;
  createdAt: number;
}

export interface NutritionLogTestData {
  id: string;
  userId: string;
  timestamp: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foodItems: Array<{
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    amount: number;
    unit: string;
  }>;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}
