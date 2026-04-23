/**
 * Admin Test Data API
 *
 * Provides endpoints for UI/UX testing with mock admin data.
 * Only available in development mode.
 */

import { Hono, type Context } from "hono";
import { cors } from "hono/cors";

export const AdminTestRouter = () => {
  const app = new Hono();

  // Enable CORS for frontend testing
  app.use("*", cors({
    origin: ["http://localhost:3000", "http://localhost:19006"],
    allowHeaders: ["Content-Type"],
    allowMethods: ["GET", "POST", "OPTIONS"],
  }));

  // Admin auth middleware (simple dev check)
  const isDevOrAdmin = (c: Context): boolean => {
    // In production, implement proper admin authentication
    return c.env.NODE_ENV !== "production" || c.req.header("X-Admin-Key") === "dev-admin-key";
  };

  // Inline mock data (simplified for admin testing)
  const mockData = {
    users: [{
      id: "admin-user-001",
      email: "admin@aivo.ai",
      name: "Admin Test User",
      age: 28,
      gender: "male",
      height: 180,
      weight: 82.5,
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
      createdAt: Math.floor(Date.now() / 1000) - 60 * 86400,
      updatedAt: Math.floor(Date.now() / 1000),
    }],
    sessions: [{
      id: "session-001",
      userId: "admin-user-001",
      provider: "google",
      providerUserId: "google-admin-123",
      accessToken: "mock-access-token",
      refreshToken: "mock-refresh-token",
      expiresAt: Math.floor(Date.now() / 1000) + 7 * 86400,
      createdAt: Math.floor(Date.now() / 1000),
      updatedAt: Math.floor(Date.now() / 1000),
    }],
    gamificationProfiles: [{
      id: "gamification-001",
      userId: "admin-user-001",
      totalPoints: 2850,
      level: 12,
      currentXp: 450,
      xpToNextLevel: 1000,
      streakCurrent: 7,
      streakLongest: 21,
      lastActivityDate: new Date().toISOString().split('T')[0],
      freezeCount: 2,
      updatedAt: Math.floor(Date.now() / 1000),
    }],
    workoutRoutines: [{
      id: "routine-001",
      userId: "admin-user-001",
      name: "Upper/Lower Strength Program",
      description: "4-day upper/lower split focusing on compound movements",
      weekStartDate: new Date().toISOString().split('T')[0],
      isActive: 1,
      createdAt: Math.floor(Date.now() / 1000) - 14 * 86400,
      updatedAt: Math.floor(Date.now() / 1000),
    }],
    workouts: Array.from({ length: 16 }, (_, i) => ({
      id: `workout-${i}`,
      userId: "admin-user-001",
      type: "strength",
      name: i % 2 === 0 ? "Upper Body" : "Lower Body",
      duration: 75 * 60,
      caloriesBurned: 450 + Math.floor(Math.random() * 100),
      startTime: (Date.now() - i * 86400 * 1000),
      endTime: (Date.now() - i * 86400 * 1000) + 75 * 60 * 1000,
      notes: "Good session",
      metrics: JSON.stringify({ feeling: 8, energy: 7 }),
      createdAt: Math.floor(Date.now() / 1000) - i * 86400,
      completedAt: Math.floor(Date.now() / 1000) - i * 86400,
      status: "completed",
    })),
    bodyInsights: Array.from({ length: 30 }, (_, i) => ({
      id: `insight-${i}`,
      userId: "admin-user-001",
      timestamp: Math.floor(Date.now() / 1000) - i * 86400,
      source: "ai_analysis",
      recoveryScore: Math.max(20, 90 - (i % 7 === 6 ? 0 : Math.floor(Math.random() * 30))),
      fatigueLevel: Math.max(1, 5 + Math.floor(Math.random() * 5) - (i % 7 === 6 ? 3 : 0)),
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
      notes: i === 0 ? "Feeling strong" : undefined,
      rawData: undefined,
    })),
    bodyMetrics: Array.from({ length: 30 }, (_, i) => ({
      id: `metric-${i}`,
      userId: "admin-user-001",
      timestamp: Math.floor(Date.now() / 1000) - i * 86400,
      weight: 83 + (Math.random() * 2 - 1),
      bodyFatPercentage: 18.5 - (i * 0.1) + (Math.random() * 0.5),
      muscleMass: 65 + (i * 0.05) + (Math.random() * 0.5),
      boneMass: 10.2,
      waterPercentage: 55 + (Math.random() * 2 - 1),
      bmi: 25.4 - (i * 0.05),
      waistCircumference: 86 - (i * 0.2) + (Math.random() * 0.5),
      chestCircumference: 102 + (Math.random() * 1 - 0.5),
      hipCircumference: 98,
      source: i === 0 ? "manual" : "ai",
      notes: i === 0 ? "Morning measurement, fasted" : undefined,
    })),
    userGoals: [
      {
        id: "goal-001",
        userId: "admin-user-001",
        type: "strength",
        targetMetric: "bench_press_1rm",
        currentValue: 105,
        targetValue: 120,
        deadline: new Date(Date.now() + 90 * 86400 * 1000).toISOString().split('T')[0],
        priority: 1,
        status: "active",
        createdAt: Math.floor(Date.now() / 1000) - 30 * 86400,
        updatedAt: Math.floor(Date.now() / 1000),
      },
      {
        id: "goal-002",
        userId: "admin-user-001",
        type: "weight_loss",
        targetMetric: "body_weight",
        currentValue: 82.5,
        targetValue: 76,
        deadline: new Date(Date.now() + 60 * 86400 * 1000).toISOString().split('T')[0],
        priority: 2,
        status: "active",
        createdAt: Math.floor(Date.now() / 1000) - 30 * 86400,
        updatedAt: Math.floor(Date.now() / 1000),
      },
    ],
    aiRecommendations: [
      {
        id: "rec-001",
        userId: "admin-user-001",
        type: "nutrition",
        title: "Increase Protein Intake",
        description: "Based on your strength goals, aim for 1.8-2.2g of protein per kg of body weight daily.",
        confidence: 0.92,
        reasoning: "Current protein intake estimated at 120g/day. For muscle growth at 82.5kg, target 150-180g/day.",
        actions: JSON.stringify(["Track protein in meals", "Add protein shake post-workout"]),
        expiresAt: Math.floor(Date.now() / 1000) + 30 * 86400,
        isRead: 0,
        isDismissed: 0,
        feedback: null,
        createdAt: Math.floor(Date.now() / 1000) - 3600,
      },
    ],
    conversations: Array.from({ length: 15 }, (_, i) => ({
      id: `conv-${i}`,
      userId: "admin-user-001",
      message: i % 3 === 0 ? "How's my recovery looking this week?" :
               i % 3 === 1 ? "Any tips for breaking my bench press plateau?" :
               "What should my protein intake be?",
      response: "Great question! Based on your recent progress, you're doing really well. To break through plateaus, try adding variation to your routine.",
      context: JSON.stringify([`Date: ${new Date(Date.now() - i * 86400 * 1000).toISOString().split('T')[0]}`, `Workout: ${i % 2 === 0 ? 'Upper' : 'Lower'}`]),
      tokensUsed: 150 + Math.floor(Math.random() * 100),
      model: "gpt-4o-mini",
      createdAt: Math.floor(Date.now() / 1000) - Math.floor(i / 3) * 86400,
    })),
    memoryNodes: [
      {
        id: "memory-001",
        userId: "admin-user-001",
        type: "fact",
        content: "User is 28 years old male, 180cm height",
        embedding: JSON.stringify(new Array(1536).fill(0).map(() => Math.random())),
        metadata: JSON.stringify({ source: "conversation", confidence: 0.95, extractedAt: Math.floor(Date.now() / 1000) - 30 * 86400, verifications: 5 }),
        relatedNodes: JSON.stringify([]),
        extractedAt: Math.floor(Date.now() / 1000) - 30 * 86400,
        updatedAt: Math.floor(Date.now() / 1000) - 30 * 86400,
      },
    ],
    badges: [
      {
        id: "badge-001",
        userId: "admin-user-001",
        type: "streak",
        name: "Week Warrior",
        description: "Completed 7 consecutive workout days",
        icon: "🏆",
        earnedAt: Math.floor(Date.now() / 1000) - 7 * 86400,
        tier: "silver",
      },
      {
        id: "badge-002",
        userId: "admin-user-001",
        type: "achievement",
        name: "Heavy Lifter",
        description: "Achieved 100kg+ bench press",
        icon: "💪",
        earnedAt: Math.floor(Date.now() / 1000) - 20 * 86400,
        tier: "gold",
      },
    ],
    dailyCheckins: Array.from({ length: 20 }, (_, i) => ({
      userId: "admin-user-001",
      date: new Date(Date.now() - i * 86400 * 1000).toISOString().split('T')[0],
      checkedInAt: Math.floor(Date.now() / 1000) - i * 86400 + 10 * 3600,
      source: "workout",
      workoutId: `workout-${i}`,
    })),
    pointTransactions: [
      { id: "points-001", userId: "admin-user-001", type: "earn", amount: 100, reason: "First workout completed", relatedId: "workout-0", balanceAfter: 100, createdAt: Math.floor(Date.now() / 1000) - 30 * 86400 },
      { id: "points-002", userId: "admin-user-001", type: "earn", amount: 200, reason: "Achievement earned", relatedId: "badge-002", balanceAfter: 300, createdAt: Math.floor(Date.now() / 1000) - 20 * 86400 },
    ],
    memoryEdges: [],
    notifications: [],
    sleepLogs: [],
  };

  // Type definitions for responses
  interface AdminStats {
    totalUsers: number;
    totalWorkouts: number;
    totalMemories: number;
    activeRoutines: number;
    avgRecoveryScore: number;
    topGoal: string;
  }

  interface AdminUserData {
    profile: typeof mockData.users[0];
    gamification: typeof mockData.gamificationProfiles[0];
    recentWorkouts: Array<{
      id: string;
      name: string;
      date: string;
      duration: number;
      caloriesBurned: number;
      status: string;
    }>;
    recentConversations: Array<{
      id: string;
      message: string;
      response: string;
      createdAt: number;
    }>;
    memories: Array<{
      id: string;
      type: string;
      content: string;
      confidence: number;
      verifications: number;
    }>;
    goals: typeof mockData.userGoals;
    bodyMetrics: Array<{
      date: string;
      weight: number;
      bodyFat: number;
    }>;
  }

  // GET /api/admin/stats - Dashboard overview stats
  app.get("/api/admin/stats", async (c) => {
    if (!isDevOrAdmin(c)) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const stats: AdminStats = {
      totalUsers: mockData.users.length,
      totalWorkouts: mockData.workouts.length,
      totalMemories: mockData.memoryNodes.length,
      activeRoutines: mockData.workoutRoutines.filter(r => r.isActive).length,
      avgRecoveryScore: Math.round(
        mockData.bodyInsights.reduce((sum, i) => sum + (i.recoveryScore || 0), 0) / mockData.bodyInsights.length
      ),
      topGoal: mockData.userGoals[0]?.targetMetric || "N/A",
    };

    return c.json({ success: true, data: stats });
  });

  // GET /api/admin/user/:userId - Get detailed user data
  app.get("/api/admin/user/:userId", async (c) => {
    if (!isDevOrAdmin(c)) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { userId } = c.req.param();

    if (userId !== mockData.users[0].id) {
      return c.json({ error: "User not found" }, 404);
    }

    const userData: AdminUserData = {
      profile: mockData.users[0],
      gamification: mockData.gamificationProfiles[0],
      recentWorkouts: mockData.workouts
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        .slice(0, 10)
        .map(w => ({
          id: w.id,
          name: w.name,
          date: new Date((w.createdAt || 0) * 1000).toISOString().split('T')[0],
          duration: w.duration || 0,
          caloriesBurned: w.caloriesBurned || 0,
          status: w.status,
        })),
      recentConversations: mockData.conversations
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        .slice(0, 5)
        .map(conv => ({
          id: conv.id,
          message: conv.message,
          response: conv.response,
          createdAt: conv.createdAt,
        })),
      memories: mockData.memoryNodes.map(m => ({
        id: m.id,
        type: m.type,
        content: m.content,
        confidence: JSON.parse(m.metadata).confidence,
        verifications: JSON.parse(m.metadata).verifications,
      })),
      goals: mockData.userGoals,
      bodyMetrics: mockData.bodyMetrics
        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
        .slice(0, 14)
        .map(m => ({
          date: new Date((m.timestamp || 0) * 1000).toISOString().split('T')[0],
          weight: m.weight || 0,
          bodyFat: m.bodyFatPercentage || 0,
        })),
    };

    return c.json({ success: true, data: userData });
  });

  // GET /api/admin/workouts - Get all workouts with filtering
  app.get("/api/admin/workouts", async (c) => {
    if (!isDevOrAdmin(c)) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { type, limit = "50" } = c.req.query();

    let filtered = mockData.workouts;
    if (type) {
      filtered = filtered.filter(w => w.type === type);
    }

    const sorted = filtered
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .slice(0, parseInt(limit));

    return c.json({
      success: true,
      data: sorted,
      total: filtered.length,
    });
  });

  // GET /api/admin/conversations - Get chat history
  app.get("/api/admin/conversations", async (c) => {
    if (!isDevOrAdmin(c)) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { userId } = c.req.query();

    let convs = mockData.conversations;
    if (userId) {
      convs = convs.filter(conv => conv.userId === userId);
    }

    return c.json({
      success: true,
      data: convs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
      total: convs.length,
    });
  });

  // GET /api/admin/memories - Get memory nodes
  app.get("/api/admin/memories", async (c) => {
    if (!isDevOrAdmin(c)) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { type, minConfidence } = c.req.query();

    let memories = mockData.memoryNodes.map(m => ({
      id: m.id,
      userId: m.userId,
      type: m.type,
      content: m.content,
      metadata: JSON.parse(m.metadata),
      extractedAt: m.extractedAt,
    }));

    if (type) {
      memories = memories.filter(m => m.type === type);
    }
    if (minConfidence) {
      const conf = parseFloat(minConfidence);
      memories = memories.filter(m => m.metadata.confidence >= conf);
    }

    return c.json({
      success: true,
      data: memories.sort((a, b) => b.metadata.confidence - a.metadata.confidence),
      total: memories.length,
    });
  });

  // GET /api/admin/body-metrics - Get body metrics history
  app.get("/api/admin/body-metrics", async (c) => {
    if (!isDevOrAdmin(c)) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    return c.json({
      success: true,
      data: mockData.bodyMetrics
        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
        .map(m => ({
          date: new Date((m.timestamp || 0) * 1000).toISOString().split('T')[0],
          weight: m.weight,
          bodyFat: m.bodyFatPercentage,
          muscleMass: m.muscleMass,
          bmi: m.bmi,
        })),
      total: mockData.bodyMetrics.length,
    });
  });

  // GET /api/admin/recovery - Get recovery scores
  app.get("/api/admin/recovery", async (c) => {
    if (!isDevOrAdmin(c)) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    return c.json({
      success: true,
      data: mockData.bodyInsights
        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
        .map(i => ({
          date: new Date((i.timestamp || 0) * 1000).toISOString().split('T')[0],
          recoveryScore: i.recoveryScore,
          fatigueLevel: i.fatigueLevel,
          sleepQuality: i.sleepQuality,
          muscleSoreness: i.muscleSoreness,
        })),
      total: mockData.bodyInsights.length,
    });
  });

  // GET /api/admin/gamification - Get gamification stats
  app.get("/api/admin/gamification", async (c) => {
    if (!isDevOrAdmin(c)) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const profile = mockData.gamificationProfiles[0];

    return c.json({
      success: true,
      data: {
        profile,
        badges: mockData.badges,
        pointTransactions: mockData.pointTransactions
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
          .slice(0, 20),
        dailyCheckins: mockData.dailyCheckins.slice(0, 30),
      },
    });
  });

  // GET /api/admin/ai-activity - Get AI interaction metrics
  app.get("/api/admin/ai-activity", async (c) => {
    if (!isDevOrAdmin(c)) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    return c.json({
      success: true,
      data: {
        conversations: {
          total: mockData.conversations.length,
          recent: mockData.conversations
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
            .slice(0, 5),
        },
        recommendations: {
          total: mockData.aiRecommendations.length,
          read: mockData.aiRecommendations.filter(r => r.isRead).length,
          pending: mockData.aiRecommendations.filter(r => !r.isRead).length,
          items: mockData.aiRecommendations,
        },
        memories: {
          total: mockData.memoryNodes.length,
          byType: mockData.memoryNodes.reduce((acc, m) => {
            acc[m.type] = (acc[m.type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
        },
      },
    });
  });

  // GET /api/admin/health-check - API health status
  app.get("/api/admin/health-check", async (c) => {
    return c.json({
      success: true,
      data: {
        status: "healthy",
        timestamp: Math.floor(Date.now() / 1000).toString(),
        version: "1.0.0",
        mockDataAvailable: true,
        userCount: mockData.users.length,
      },
    });
  });

  return app;
};
