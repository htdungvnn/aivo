/**
 * Mock Data Generator for Admin User Testing
 *
 * This script generates comprehensive mock data for testing the AIVO platform.
 * Run with: pnpm run seed:mock
 *
 * Generates:
 * - Admin user with full profile
 * - OAuth session
 * - Body metrics history (30 days)
 * - Progress photos
 * - Workout history (4 weeks)
 * - Active workout routine
 * - Body insights & recovery data
 * - Fitness goals
 * - Conversation history with AI
 * - Memory nodes & edges
 * - Gamification profile (points, level, streak)
 * - Badges & achievements
 * - Nutrition logs
 * - Form analysis data
 * - Sleep logs
 * - Notifications
 */

import { crypto } from "node:crypto";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./src/schema.ts";

// Helper to generate random UUID
function generateId(): string {
  return crypto.randomUUID();
}

// Helper to get timestamp
function now(): number {
  return Math.floor(Date.now() / 1000);
}

// Helper to get date string
function dateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

// Helper to get timestamp for days ago
function daysAgo(days: number): number {
  return Math.floor(Date.now() / 1000) - (days * 24 * 60 * 60);
}

// Admin user data
const adminUser = {
  id: "admin-user-001",
  email: "admin@aivo.ai",
  name: "Admin Test User",
  age: 28,
  gender: "male",
  height: 180, // cm
  weight: 82.5, // kg
  restingHeartRate: 58,
  maxHeartRate: 192,
  fitnessLevel: "intermediate",
  goals: JSON.stringify({
    primary: "Build muscle and increase strength",
    secondary: ["Improve cardiovascular health", "Reduce body fat to 12%"],
    timeline: "6 months"
  }),
  emailVerified: 1,
  onboardingCompleted: 1,
  receiveMonthlyReports: 1,
  createdAt: daysAgo(60),
  updatedAt: now(),
};

// OAuth session
const adminSession = {
  id: generateId(),
  userId: adminUser.id,
  provider: "google",
  providerUserId: "google-admin-123",
  accessToken: "mock-access-token-" + generateId(),
  refreshToken: "mock-refresh-token-" + generateId(),
  expiresAt: now() + (7 * 24 * 60 * 60), // 7 days
  createdAt: now(),
  updatedAt: now(),
};

// Gamification profile
const gamificationProfile = {
  id: generateId(),
  userId: adminUser.id,
  totalPoints: 2850,
  level: 12,
  currentXp: 450,
  xpToNextLevel: 1000,
  streakCurrent: 7,
  streakLongest: 21,
  lastActivityDate: dateStr(0),
  freezeCount: 2,
  updatedAt: now(),
};

// Body metrics history (last 30 days)
const bodyMetrics = [];
for (let i = 30; i >= 0; i--) {
  const baseWeight = 83 + (i % 7 === 0 ? -1.5 : 0); // Weekly drop
  bodyMetrics.push({
    id: generateId(),
    userId: adminUser.id,
    timestamp: daysAgo(i),
    weight: baseWeight + (Math.random() * 2 - 1),
    bodyFatPercentage: 18.5 - (i * 0.1) + (Math.random() * 0.5 - 0.25),
    muscleMass: 65 + (i * 0.05) + (Math.random() * 0.5),
    boneMass: 10.2,
    waterPercentage: 55 + (Math.random() * 2 - 1),
    bmi: 25.4 - (i * 0.05),
    waistCircumference: 86 - (i * 0.2) + (Math.random() * 0.5),
    chestCircumference: 102 + (Math.random() * 1 - 0.5),
    hipCircumference: 98,
    source: i === 0 ? "manual" : "ai",
    notes: i === 0 ? "Morning measurement, fasted" : undefined,
  });
}

// Body photos
const bodyPhotos = [
  {
    id: generateId(),
    userId: adminUser.id,
    r2Url: "https://r2.aivo.ai/photos/admin/front-2025-04-20.jpg",
    thumbnailUrl: "https://r2.aivo.ai/photos/admin/thumbs/front-2025-04-20.jpg",
    uploadDate: daysAgo(0),
    analysisStatus: "completed",
    poseDetected: 1,
    metadata: JSON.stringify({ width: 1920, height: 1080, fileSize: 2500000, pose: "front" }),
  },
  {
    id: generateId(),
    userId: adminUser.id,
    r2Url: "https://r2.aivo.ai/photos/admin/side-2025-04-13.jpg",
    thumbnailUrl: "https://r2.aivo.ai/photos/admin/thumbs/side-2025-04-13.jpg",
    uploadDate: daysAgo(7),
    analysisStatus: "completed",
    poseDetected: 1,
    metadata: JSON.stringify({ width: 1920, height: 1080, fileSize: 2400000, pose: "side" }),
  },
];

// Workout routines (active routine)
const activeRoutine = {
  id: "routine-001",
  userId: adminUser.id,
  name: "Upper/Lower Strength Program",
  description: "4-day upper/lower split focusing on compound movements",
  weekStartDate: dateStr(0),
  isActive: 1,
  createdAt: daysAgo(14),
  updatedAt: now(),
};

// Routine exercises
const routineExercises = [
  // Monday - Upper
  { id: generateId(), routineId: activeRoutine.id, dayOfWeek: 0, exerciseName: "Barbell Bench Press", exerciseType: "strength", targetMuscleGroups: JSON.stringify(["chest", "triceps", "shoulders"]), sets: 4, reps: 8, weight: 100, rpe: 8, restTime: 180, orderIndex: 1, notes: "Focus on bar path" },
  { id: generateId(), routineId: activeRoutine.id, dayOfWeek: 0, exerciseName: "Bent Over Rows", exerciseType: "strength", targetMuscleGroups: JSON.stringify(["back", "biceps"]), sets: 4, reps: 10, weight: 80, rpe: 8, restTime: 180, orderIndex: 2 },
  { id: generateId(), routineId: activeRoutine.id, dayOfWeek: 0, exerciseName: "Overhead Press", exerciseType: "strength", targetMuscleGroups: JSON.stringify(["shoulders", "triceps"]), sets: 3, reps: 10, weight: 45, rpe: 7.5, restTime: 120, orderIndex: 3 },
  { id: generateId(), routineId: activeRoutine.id, dayOfWeek: 0, exerciseName: "Tricep Pushdowns", exerciseType: "strength", targetMuscleGroups: JSON.stringify(["triceps"]), sets: 3, reps: 12, weight: 30, rpe: 7, restTime: 90, orderIndex: 4 },

  // Tuesday - Lower
  { id: generateId(), routineId: activeRoutine.id, dayOfWeek: 1, exerciseName: "Barbell Squats", exerciseType: "strength", targetMuscleGroups: JSON.stringify(["quadriceps", "glutes", "core"]), sets: 4, reps: 8, weight: 120, rpe: 8.5, restTime: 240, orderIndex: 1, notes: "Depth: parallel or below" },
  { id: generateId(), routineId: activeRoutine.id, dayOfWeek: 1, exerciseName: "Romanian Deadlifts", exerciseType: "strength", targetMuscleGroups: JSON.stringify(["hamstrings", "glutes", "lower_back"]), sets: 3, reps: 10, weight: 70, rpe: 8, restTime: 180, orderIndex: 2 },
  { id: generateId(), routineId: activeRoutine.id, dayOfWeek: 1, exerciseName: "Leg Press", exerciseType: "strength", targetMuscleGroups: JSON.stringify(["quadriceps", "glutes"]), sets: 3, reps: 12, weight: 180, rpe: 7.5, restTime: 120, orderIndex: 3 },
  { id: generateId(), routineId: activeRoutine.id, dayOfWeek: 1, exerciseName: "Calf Raises", exerciseType: "strength", targetMuscleGroups: JSON.stringify(["calves"]), sets: 4, reps: 15, weight: 100, rpe: 8, restTime: 90, orderIndex: 4 },

  // Thursday - Upper
  { id: generateId(), routineId: activeRoutine.id, dayOfWeek: 3, exerciseName: "Incline Bench Press", exerciseType: "strength", targetMuscleGroups: JSON.stringify(["chest", "shoulders"]), sets: 4, reps: 10, weight: 80, rpe: 8, restTime: 180, orderIndex: 1 },
  { id: generateId(), routineId: activeRoutine.id, dayOfWeek: 3, exerciseName: "Pull Ups", exerciseType: "strength", targetMuscleGroups: JSON.stringify(["back", "biceps"]), sets: 3, reps: 8, weight: 0, rpe: 8, restTime: 180, orderIndex: 2 },
  { id: generateId(), routineId: activeRoutine.id, dayOfWeek: 3, exerciseName: "Face Pulls", exerciseType: "strength", targetMuscleGroups: JSON.stringify(["shoulders", "rear_delts"]), sets: 3, reps: 15, weight: 20, rpe: 7, restTime: 90, orderIndex: 3 },

  // Friday - Lower
  { id: generateId(), routineId: activeRoutine.id, dayOfWeek: 4, exerciseName: "Deadlifts", exerciseType: "strength", targetMuscleGroups: JSON.stringify(["back", "glutes", "hamstrings", "core"]), sets: 3, reps: 5, weight: 140, rpe: 9, restTime: 300, orderIndex: 1, notes: "Heavy day - focus on form" },
  { id: generateId(), routineId: activeRoutine.id, dayOfWeek: 4, exerciseName: "Hip Thrusts", exerciseType: "strength", targetMuscleGroups: JSON.stringify(["glutes", "hamstrings"]), sets: 4, reps: 12, weight: 100, rpe: 8, restTime: 120, orderIndex: 2 },
  { id: generateId(), routineId: activeRoutine.id, dayOfWeek: 4, exerciseName: "Leg Curls", exerciseType: "strength", targetMuscleGroups: JSON.stringify(["hamstrings"]), sets: 3, reps: 12, weight: 50, rpe: 8, restTime: 90, orderIndex: 3 },
];

// Workouts (completed workouts)
const workouts = [];
const workoutExercisesData = [];

for (let week = 0; week < 4; week++) {
  // Monday workout
  const monWorkoutId = generateId();
  workouts.push({
    id: monWorkoutId,
    userId: adminUser.id,
    type: "strength",
    name: "Upper Body A",
    duration: 75 * 60,
    caloriesBurned: 450,
    startTime: daysAgo(week * 7 + 5) * 1000 + 10 * 3600000,
    endTime: daysAgo(week * 7 + 5) * 1000 + 11 * 3600000 + 15 * 60000,
    notes: "Good session, PR on bench!",
    metrics: JSON.stringify({ feeling: 8, energy: 7 }),
    createdAt: daysAgo(week * 7 + 5),
    completedAt: daysAgo(week * 7 + 5),
    status: "completed",
  });
  workoutExercisesData.push(
    { id: generateId(), workoutId: monWorkoutId, name: "Barbell Bench Press", sets: 4, reps: 8, weight: 100, rpe: 8, order: 1, notes: "PR - 100kg x 8" },
    { id: generateId(), workoutId: monWorkoutId, name: "Bent Over Rows", sets: 4, reps: 10, weight: 80, rpe: 7.5, order: 2 },
    { id: generateId(), workoutId: monWorkoutId, name: "Overhead Press", sets: 3, reps: 10, weight: 45, rpe: 7, order: 3 },
    { id: generateId(), workoutId: monWorkoutId, name: "Tricep Pushdowns", sets: 3, reps: 12, weight: 30, rpe: 7, order: 4 },
  );

  // Tuesday workout
  const tueWorkoutId = generateId();
  workouts.push({
    id: tueWorkoutId,
    userId: adminUser.id,
    type: "strength",
    name: "Lower Body A",
    duration: 80 * 60,
    caloriesBurned: 550,
    startTime: daysAgo(week * 7 + 4) * 1000 + 9 * 3600000,
    endTime: daysAgo(week * 7 + 4) * 1000 + 10 * 3600000 + 20 * 60000,
    notes: "Squats felt strong",
    metrics: JSON.stringify({ feeling: 9, energy: 8 }),
    createdAt: daysAgo(week * 7 + 4),
    completedAt: daysAgo(week * 7 + 4),
    status: "completed",
  });
  workoutExercisesData.push(
    { id: generateId(), workoutId: tueWorkoutId, name: "Barbell Squats", sets: 4, reps: 8, weight: 120, rpe: 8.5, order: 1, notes: "Deep and controlled" },
    { id: generateId(), workoutId: tueWorkoutId, name: "Romanian Deadlifts", sets: 3, reps: 10, weight: 70, rpe: 8, order: 2 },
    { id: generateId(), workoutId: tueWorkoutId, name: "Leg Press", sets: 3, reps: 12, weight: 180, rpe: 7.5, order: 3 },
    { id: generateId(), workoutId: tueWorkoutId, name: "Calf Raises", sets: 4, reps: 15, weight: 100, rpe: 8, order: 4 },
  );

  // Thursday workout
  const thuWorkoutId = generateId();
  workouts.push({
    id: thuWorkoutId,
    userId: adminUser.id,
    type: "strength",
    name: "Upper Body B",
    duration: 70 * 60,
    caloriesBurned: 420,
    startTime: daysAgo(week * 7 + 2) * 1000 + 10 * 3600000,
    endTime: daysAgo(week * 7 + 2) * 1000 + 11 * 3600000 + 10 * 60000,
    notes: "Shoulder feeling good",
    metrics: JSON.stringify({ feeling: 8, energy: 7.5 }),
    createdAt: daysAgo(week * 7 + 2),
    completedAt: daysAgo(week * 7 + 2),
    status: "completed",
  });
  workoutExercisesData.push(
    { id: generateId(), workoutId: thuWorkoutId, name: "Incline Bench Press", sets: 4, reps: 10, weight: 80, rpe: 7.5, order: 1 },
    { id: generateId(), workoutId: thuWorkoutId, name: "Pull Ups", sets: 3, reps: 8, weight: 0, rpe: 8, order: 2 },
    { id: generateId(), workoutId: thuWorkoutId, name: "Face Pulls", sets: 3, reps: 15, weight: 20, rpe: 7, order: 3 },
  );

  // Friday workout
  const friWorkoutId = generateId();
  workouts.push({
    id: friWorkoutId,
    userId: adminUser.id,
    type: "strength",
    name: "Lower Body B",
    duration: 85 * 60,
    caloriesBurned: 580,
    startTime: daysAgo(week * 7 + 1) * 1000 + 9 * 3600000,
    endTime: daysAgo(week * 7 + 1) * 1000 + 10 * 3600000 + 25 * 60000,
    notes: "Heavy deadlift day, felt recovered",
    metrics: JSON.stringify({ feeling: 9, energy: 8 }),
    createdAt: daysAgo(week * 7 + 1),
    completedAt: daysAgo(week * 7 + 1),
    status: "completed",
  });
  workoutExercisesData.push(
    { id: generateId(), workoutId: friWorkoutId, name: "Deadlifts", sets: 3, reps: 5, weight: 140, rpe: 9, order: 1, notes: "Worked up to 140kg x 5" },
    { id: generateId(), workoutId: friWorkoutId, name: "Hip Thrusts", sets: 4, reps: 12, weight: 100, rpe: 8, order: 2 },
    { id: generateId(), workoutId: friWorkoutId, name: "Leg Curls", sets: 3, reps: 12, weight: 50, rpe: 8, order: 3 },
  );
}

// Body insights (recovery data)
const bodyInsights = [];
for (let i = 30; i >= 0; i--) {
  const fatigue = Math.max(1, 5 + Math.floor(Math.random() * 5) - (i % 7 === 6 ? 3 : 0)); // Lower on rest days
  bodyInsights.push({
    id: generateId(),
    userId: adminUser.id,
    timestamp: daysAgo(i) + 8 * 3600,
    source: "ai_analysis",
    recoveryScore: Math.max(20, 90 - (i % 7 === 6 ? 0 : Math.floor(Math.random() * 30))),
    fatigueLevel: fatigue,
    muscleSoreness: JSON.stringify({
      chest: Math.max(0, 8 - i % 7),
      back: Math.max(0, 7 - i % 7),
      legs: Math.max(0, 9 - i % 7),
      shoulders: Math.max(0, 6 - i % 7),
    }),
    sleepQuality: Math.min(10, 7 + Math.floor(Math.random() * 3)),
    sleepHours: 7 + Math.random() * 1.5,
    stressLevel: Math.max(1, 5 + Math.floor(Math.random() * 4)),
    hydrationLevel: Math.min(10, 8 + Math.floor(Math.random() * 2)),
    notes: i === 0 ? "Feeling strong, ready for heavy day" : undefined,
    rawData: undefined,
  });
}

// User goals
const userGoals = [
  {
    id: generateId(),
    userId: adminUser.id,
    type: "strength",
    targetMetric: "bench_press_1rm",
    currentValue: 105,
    targetValue: 120,
    deadline: dateStr(90),
    priority: 1,
    status: "active",
    createdAt: daysAgo(30),
    updatedAt: now(),
  },
  {
    id: generateId(),
    userId: adminUser.id,
    type: "weight_loss",
    targetMetric: "body_weight",
    currentValue: 82.5,
    targetValue: 76,
    deadline: dateStr(60),
    priority: 2,
    status: "active",
    createdAt: daysAgo(30),
    updatedAt: now(),
  },
  {
    id: generateId(),
    userId: adminUser.id,
    type: "endurance",
    targetMetric: "5k_time",
    currentValue: 28.5,
    targetValue: 25.0,
    deadline: dateStr(90),
    priority: 2,
    status: "active",
    createdAt: daysAgo(15),
    updatedAt: now(),
  },
];

// AI recommendations
const aiRecommendations = [
  {
    id: generateId(),
    userId: adminUser.id,
    type: "nutrition",
    title: "Increase Protein Intake",
    description: "Based on your strength goals and activity level, aim for 1.8-2.2g of protein per kg of body weight daily.",
    confidence: 0.92,
    reasoning: "Current protein intake estimated at 120g/day. For muscle growth at 82.5kg, target 150-180g/day.",
    actions: JSON.stringify(["Track protein in meals", "Add protein shake post-workout", "Consider whey protein supplement"]),
    expiresAt: daysAgo(30),
    isRead: 0,
    isDismissed: 0,
    feedback: null,
    createdAt: now() - 3600,
  },
  {
    id: generateId(),
    userId: adminUser.id,
    type: "recovery",
    title: "Optimize Sleep Schedule",
    description: "Your sleep consistency score improved this week. Maintain bedtime within 30 minutes of 22:30 for optimal recovery.",
    confidence: 0.88,
    reasoning: "Consistent sleep correlates with strength gains and recovery scores >85.",
    actions: JSON.stringify(["Set bedtime reminder for 22:00", "Avoid screens 1 hour before bed", "Track sleep quality daily"]),
    expiresAt: daysAgo(14),
    isRead: 1,
    isDismissed: 0,
    feedback: null,
    createdAt: now() - 86400,
  },
];

// Conversations (chat history)
const conversations = [];
const sampleResponses = [
  "Great question! Based on your recent bench press progress, you're doing really well. To break through that plateau, try adding some drop sets on your last set and ensure you're getting enough rest between sets.",
  "Your recovery score this week is 87, which is excellent! This is a great time to push harder in your workouts. Remember to maintain proper form over increasing weight.",
  "I noticed your protein intake has been lower than recommended. For muscle growth at your current weight and activity level, aim for at least 150g of protein daily. Would you like some meal suggestions?",
  "Your sleep consistency has improved significantly - that's having a positive impact on your training performance. Keep it up!",
  "Based on your body metrics trend, you're losing fat while maintaining muscle mass. That's perfect for your body recomposition goal. Current rate of 0.5kg/week is sustainable."
];

for (let i = 0; i < 15; i++) {
  conversations.push({
    id: generateId(),
    userId: adminUser.id,
    message: i % 3 === 0 ? "How's my recovery looking this week?" :
             i % 3 === 1 ? "Any tips for breaking my bench press plateau?" :
             "What should my protein intake be?",
    response: sampleResponses[i % sampleResponses.length],
    context: JSON.stringify([`Date: ${dateStr(i)}`, `Workout: ${i % 2 === 0 ? 'Upper' : 'Lower'}`]),
    tokensUsed: 150 + Math.floor(Math.random() * 100),
    model: "gpt-4o-mini",
    createdAt: daysAgo(Math.floor(i / 3)),
  });
}

// Memory nodes (simulating extracted facts)
const memoryNodes = [
  {
    id: generateId(),
    userId: adminUser.id,
    type: "fact",
    content: "User is 28 years old male, 180cm height",
    embedding: JSON.stringify(new Array(1536).fill(0).map(() => Math.random())),
    metadata: JSON.stringify({ source: "conversation", confidence: 0.95, extractedAt: daysAgo(30), verifications: 5 }),
    relatedNodes: JSON.stringify([]),
    extractedAt: daysAgo(30),
    updatedAt: daysAgo(30),
  },
  {
    id: generateId(),
    userId: adminUser.id,
    type: "preference",
    content: "Prefers morning workouts around 10am",
    embedding: JSON.stringify(new Array(1536).fill(0).map(() => Math.random())),
    metadata: JSON.stringify({ source: "conversation", confidence: 0.85, extractedAt: daysAgo(25), verifications: 3 }),
    relatedNodes: JSON.stringify([]),
    extractedAt: daysAgo(25),
    updatedAt: daysAgo(25),
  },
  {
    id: generateId(),
    userId: adminUser.id,
    type: "event",
    content: "Achieved PR: bench press 100kg x 8 reps",
    embedding: JSON.stringify(new Array(1536).fill(0).map(() => Math.random())),
    metadata: JSON.stringify({ source: "workout", confidence: 0.98, extractedAt: daysAgo(20), verifications: 1 }),
    relatedNodes: JSON.stringify([]),
    extractedAt: daysAgo(20),
    updatedAt: daysAgo(20),
  },
  {
    id: generateId(),
    userId: adminUser.id,
    type: "constraint",
    content: "Can only train 4 days per week due to work schedule",
    embedding: JSON.stringify(new Array(1536).fill(0).map(() => Math.random())),
    metadata: JSON.stringify({ source: "conversation", confidence: 0.9, extractedAt: daysAgo(15), verifications: 2 }),
    relatedNodes: JSON.stringify([]),
    extractedAt: daysAgo(15),
    updatedAt: daysAgo(15),
  },
  {
    id: generateId(),
    userId: adminUser.id,
    type: "fact",
    content: "User has lower back injury history - avoid heavy deadlifts if pain returns",
    embedding: JSON.stringify(new Array(1536).fill(0).map(() => Math.random())),
    metadata: JSON.stringify({ source: "conversation", confidence: 0.95, extractedAt: daysAgo(10), verifications: 2, critical: true }),
    relatedNodes: JSON.stringify([]),
    extractedAt: daysAgo(10),
    updatedAt: daysAgo(10),
  },
  {
    id: generateId(),
    userId: adminUser.id,
    type: "emotional",
    content: "User reports high motivation levels when seeing progress",
    embedding: JSON.stringify(new Array(1536).fill(0).map(() => Math.random())),
    metadata: JSON.stringify({ source: "conversation", confidence: 0.8, extractedAt: daysAgo(7), verifications: 1 }),
    relatedNodes: JSON.stringify([]),
    extractedAt: daysAgo(7),
    updatedAt: daysAgo(7),
  },
  {
    id: generateId(),
    userId: adminUser.id,
    type: "entity",
    content: "Works out at Gold's Gym downtown",
    embedding: JSON.stringify(new Array(1536).fill(0).map(() => Math.random())),
    metadata: JSON.stringify({ source: "conversation", confidence: 0.9, extractedAt: daysAgo(5), verifications: 1 }),
    relatedNodes: JSON.stringify([]),
    extractedAt: daysAgo(5),
    updatedAt: daysAgo(5),
  },
  {
    id: generateId(),
    userId: adminUser.id,
    type: "fact",
    content: "Goal: reach 76kg body weight with visible abs",
    embedding: JSON.stringify(new Array(1536).fill(0).map(() => Math.random())),
    metadata: JSON.stringify({ source: "conversation", confidence: 0.95, extractedAt: daysAgo(3), verifications: 1 }),
    relatedNodes: JSON.stringify([]),
    extractedAt: daysAgo(3),
    updatedAt: daysAgo(3),
  },
];

// Memory edges (relationships)
const memoryEdges = [
  {
    id: generateId(),
    fromNodeId: memoryNodes[2].id,
    toNodeId: memoryNodes[0].id,
    relationship: "related_to",
    weight: 0.7,
    createdAt: now(),
  },
  {
    id: generateId(),
    fromNodeId: memoryNodes[4].id,
    toNodeId: memoryNodes[2].id,
    relationship: "related_to",
    weight: 0.8,
    createdAt: now(),
  },
  {
    id: generateId(),
    fromNodeId: memoryNodes[6].id,
    toNodeId: memoryNodes[0].id,
    relationship: "related_to",
    weight: 0.6,
    createdAt: now(),
  },
];

// Badges
const badges = [
  {
    id: generateId(),
    userId: adminUser.id,
    type: "streak",
    name: "Week Warrior",
    description: "Completed 7 consecutive workout days",
    icon: "🏆",
    earnedAt: daysAgo(7),
    tier: "silver",
  },
  {
    id: generateId(),
    userId: adminUser.id,
    type: "achievement",
    name: "Heavy Lifter",
    description: "Achieved 100kg+ bench press",
    icon: "💪",
    earnedAt: daysAgo(20),
    tier: "gold",
  },
  {
    id: generateId(),
    userId: adminUser.id,
    type: "consistency",
    name: "Perfect Week",
    description: "Hit all planned workouts for a week",
    icon: "⭐",
    earnedAt: daysAgo(14),
    tier: "bronze",
  },
];

// Sleep logs
const sleepLogs = [];
for (let i = 30; i >= 0; i--) {
  const bedtime = 22 + Math.floor(Math.random() * 2);
  const waketime = 6 + Math.floor(Math.random() * 2);
  sleepLogs.push({
    id: generateId(),
    userId: adminUser.id,
    date: dateStr(i),
    durationHours: 7 + Math.random() * 1.5,
    qualityScore: Math.max(50, 90 - (i % 7 === 6 ? 10 : 0) - Math.floor(Math.random() * 10)),
    deepSleepMinutes: 90 + Math.floor(Math.random() * 60),
    remSleepMinutes: 90 + Math.floor(Math.random() * 60),
    awakeMinutes: Math.floor(Math.random() * 20),
    bedtime: `${bedtime}:30`,
    waketime: `${waketime}:30`,
    consistencyScore: i === 0 ? 95 : 80 + Math.floor(Math.random() * 15),
    notes: i === 0 ? "Slept well, no disruptions" : undefined,
    source: "manual",
    createdAt: daysAgo(i),
    updatedAt: daysAgo(i),
  });
}

// Point transactions
const pointTransactions = [
  { id: generateId(), userId: adminUser.id, type: "earn", amount: 100, reason: "First workout completed", relatedId: workouts[0].id, balanceAfter: 100, createdAt: daysAgo(30) },
  { id: generateId(), userId: adminUser.id, type: "earn", amount: 50, reason: "Daily streak bonus", relatedId: null, balanceAfter: 150, createdAt: daysAgo(29) },
  { id: generateId(), userId: adminUser.id, type: "earn", amount: 200, reason: "Achievement earned: Heavy Lifter", relatedId: badges[1].id, balanceAfter: 350, createdAt: daysAgo(20) },
  { id: generateId(), userId: adminUser.id, type: "earn", amount: 50, reason: "Weekly streak maintained", relatedId: null, balanceAfter: 400, createdAt: daysAgo(14) },
  { id: generateId(), userId: adminUser.id, type: "earn", amount: 100, reason: "Workout completed", relatedId: workouts[10].id, balanceAfter: 500, createdAt: daysAgo(10) },
  { id: generateId(), userId: adminUser.id, type: "earn", amount: 2500, reason: "Level up bonus", relatedId: null, balanceAfter: 3000, createdAt: daysAgo(7) },
  { id: generateId(), userId: adminUser.id, type: "spend", amount: -50, reason: "Streak freeze purchased", relatedId: null, balanceAfter: 2950, createdAt: daysAgo(5) },
];

// Notifications
const notifications = [
  {
    id: generateId(),
    userId: adminUser.id,
    type: "form_analysis_complete",
    title: "Form Analysis Complete",
    body: "Your bench press form analysis is ready. Overall score: A-",
    data: JSON.stringify({ analysisId: "mock-analysis-123", grade: "A-" }),
    channel: "push",
    status: "sent",
    expoPushTicket: "mock-ticket-123",
    sentAt: now() - 3600,
    deliveredAt: now() - 3500,
    createdAt: now() - 7200,
  },
  {
    id: generateId(),
    userId: adminUser.id,
    type: "streak_milestone",
    title: "7-Day Streak!",
    body: "Congratulations! You've completed 7 consecutive workout days.",
    data: JSON.stringify({ streak: 7 }),
    channel: "in_app",
    status: "pending",
    createdAt: now() - 86400,
  },
];

// Daily checkins
const dailyCheckins = [];
for (let i = 30; i >= 0; i--) {
  // Check in on workout days
  if (i % 3 !== 0) {
    dailyCheckins.push({
      userId: adminUser.id,
      date: dateStr(i),
      checkedInAt: daysAgo(i) + 10 * 3600,
      source: "workout",
      workoutId: workouts.find(w => Math.abs(w.createdAt - daysAgo(i)) < 86400)?.id || null,
    });
  }
}

// Export all data
export const mockData = {
  users: [adminUser],
  sessions: [adminSession],
  gamificationProfiles: [gamificationProfile],
  bodyMetrics,
  bodyPhotos,
  workoutRoutines: [activeRoutine],
  routineExercises,
  workouts,
  workoutExercises: workoutExercisesData,
  bodyInsights,
  userGoals,
  aiRecommendations,
  conversations,
  memoryNodes,
  memoryEdges,
  badges,
  sleepLogs,
  pointTransactions,
  notifications,
  dailyCheckins,
};

export type MockData = typeof mockData;
