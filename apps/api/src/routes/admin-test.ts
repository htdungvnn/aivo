/**
 * Admin Test Data API
 *
 * Provides endpoints for UI/UX testing with mock admin data.
 * Only available in development mode.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";

// Import mock data schema
import { mockData } from "@aivo/db/src/__tests__/mock-data.ts";

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
    totalUsers: 1,
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
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 10)
      .map(w => ({
        id: w.id,
        name: w.name,
        date: new Date(w.createdAt * 1000).toISOString().split('T')[0],
        duration: w.duration || 0,
        caloriesBurned: w.caloriesBurned || 0,
        status: w.status,
      })),
    recentConversations: mockData.conversations
      .sort((a, b) => b.createdAt - a.createdAt)
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
      .filter((_, i) => i % 3 === 0) // Sample every 3rd day
      .slice(0, 14)
      .map(m => ({
        date: new Date(m.timestamp * 1000).toISOString().split('T')[0],
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
    .sort((a, b) => b.createdAt - a.createdAt)
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
    convs = convs.filter(c => c.userId === userId);
  }

  return c.json({
    success: true,
    data: convs.sort((a, b) => b.createdAt - a.createdAt),
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
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(m => ({
        date: new Date(m.timestamp * 1000).toISOString().split('T')[0],
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
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(i => ({
        date: new Date(i.timestamp * 1000).toISOString().split('T')[0],
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
        .sort((a, b) => b.createdAt - a.createdAt)
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
          .sort((a, b) => b.createdAt - a.createdAt)
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
      timestamp: Math.floor(Date.now() / 1000),
      version: "1.0.0",
      mockDataAvailable: true,
      userCount: mockData.users.length,
    },
  });
});

export default app;
