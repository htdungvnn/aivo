// ============================================
// AI COACH & CONVERSATIONS
// ============================================

export interface Conversation {
  id: string;
  userId: string;
  message: string;
  response: string;
  context?: string[];
  tokensUsed: number;
  model?: string;
  createdAt: Date;
}

export interface AIRecommendation {
  id: string;
  userId: string;
  type: RecommendationType;
  title: string;
  description: string;
  confidence: number; // 0-1
  reasoning?: string;
  actions: RecommendationAction[];
  expiresAt?: Date;
  isRead: boolean;
  isDismissed: boolean;
  feedback?: RecommendationFeedback;
  createdAt: Date;
}

export type RecommendationType =
  | "workout_suggestion"
  | "recovery_advice"
  | "nutrition_tip"
  | "form_correction"
  | "goal_adjustment"
  | "scheduling_optimization"
  | "injury_prevention"
  | "motivation_boost";

export interface RecommendationAction {
  id: string;
  label: string;
  type: "navigate" | "start_workout" | "update_goal" | "custom";
  payload?: Record<string, unknown>;
}

export interface RecommendationFeedback {
  helpful: boolean;
  rating?: number; // 1-5
  comment?: string;
}

// AI Memory Graph for Retention Engine
export interface MemoryNode {
  id: string;
  userId: string;
  type: MemoryType;
  content: string;
  embedding?: number[]; // Vector embedding for similarity search
  metadata: {
    importance: number; // 0-1
    recency: number; // timestamp weight
    accessCount: number;
    lastAccessed: Date;
    tags: string[];
  };
  relatedNodes: string[]; // Other memory node IDs
}

export type MemoryType =
  | "preference"
  | "achievement"
  | "struggle"
  | "goal_progress"
  | "feedback"
  | "social_interaction"
  | "habit";

export interface MemoryEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  relationship: "related" | "causes" | "contradicts" | "reinforces";
  weight: number; // 0-1
}

// Prompt Compression context
export interface CompressedContext {
  id: string;
  userId: string;
  originalTokens: number;
  compressedTokens: number;
  compressionRatio: number;
  strategy: "semantic_pruning" | "summarization" | "deduplication" | "keyword_extraction";
  context: string[];
  createdAt: Date;
  expiresAt: Date;
}
