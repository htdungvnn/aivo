/**
 * Coach API Client for Web (Next.js)
 * Handles AI Coach conversations, workout planning, and sessions
 */

const BASE_URL = process.env.NEXT_PUBLIC_COACH_API_URL || '/api/v1/coach';

export interface CoachMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  attachments?: CoachAttachment[];
  contextUsed?: string[];
  suggestedActions?: CoachSuggestedAction[];
}

export interface CoachAttachment {
  type: 'metric' | 'chart' | 'recommendation' | 'meal' | 'workout';
  data: Record<string, unknown>;
}

export interface CoachSuggestedAction {
  id: string;
  label: string;
  type: 'navigate' | 'action' | 'mutate';
  payload: Record<string, unknown>;
}

export interface CoachConversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  lastMessage?: CoachMessage;
}

export interface CoachContext {
  date: string;
  readinessScore?: number;
  readinessLevel?: string;
  topFactors?: Array<{ name: string; score: number }>;
  todayCalories?: { consumed: number; target: number };
  todayProtein?: { consumed: number; target: number };
  todayWorkout?: { name: string; completed: boolean };
  sleepLastNight?: { duration: number; quality: number };
  hydration?: { current: number; target: number };
  activity?: { steps: number; target: number };
  activeGoals?: string[];
  recentInsights?: string[];
}

export interface ChatRequest {
  message: string;
  conversationId?: string;
  context?: CoachContext;
}

export interface ChatResponse {
  message: CoachMessage;
  conversationId: string;
  contextUsed: string[];
  suggestedActions: CoachSuggestedAction[];
  requiresConfirmation?: boolean;
  pendingMutation?: {
    type: string;
    description: string;
    changes: Record<string, unknown>;
  };
}

export interface WorkoutPlan {
  id: string;
  revision: number;
  status: 'draft' | 'active' | 'completed' | 'archived';
  startDate: string;
  endDate: string;
  workouts: WorkoutDay[];
  createdAt: number;
  updatedAt: number;
}

export interface WorkoutDay {
  dayOfWeek: number;
  date: string;
  type: 'rest' | 'cardio' | 'strength' | 'mobility' | 'mixed';
  status: 'planned' | 'completed' | 'skipped';
  exercises: WorkoutExercise[];
  duration?: number;
  notes?: string;
}

export interface WorkoutExercise {
  id: string;
  name: string;
  sets: number;
  reps?: string;
  duration?: number;
  restSeconds?: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  equipment: string[];
  locked: boolean;
  completedSets?: number;
  formScore?: number;
}

export interface WorkoutSession {
  id: string;
  planId: string;
  workoutDayId: string;
  date: string;
  status: 'planned' | 'in_progress' | 'completed' | 'skipped';
  startedAt?: number;
  completedAt?: number;
  exercises: SessionExercise[];
  totalVolume?: number;
  duration?: number;
  difficulty?: number;
  notes?: string;
}

export interface SessionExercise {
  exerciseId: string;
  name: string;
  sets: SetResult[];
  formScore?: number;
  corrections?: FormCorrection[];
}

export interface SetResult {
  setNumber: number;
  reps?: number;
  weight?: number;
  duration?: number;
  completed: boolean;
  formScore?: number;
}

export interface FormCorrection {
  type: 'depth' | 'knee_twist' | 'rounding' | 'arching' | 'speed' | 'balance';
  description: string;
  severity: 'minor' | 'moderate' | 'major';
  timestamp: number;
}

export interface ProgressMetrics {
  readiness: {
    current: number;
    average: number;
    trend: 'improving' | 'stable' | 'declining';
    change: number;
  };
  workouts: {
    completedThisWeek: number;
    totalThisMonth: number;
    streak: number;
    volumeTrend: number;
  };
  nutrition: {
    calorieAdherence: number;
    proteinAdherence: number;
    averageCalories: number;
  };
  sleep: {
    averageDuration: number;
    averageQuality: number;
    consistency: number;
  };
  activity: {
    stepsAverage: number;
    activeMinutesAverage: number;
    targetAchievement: number;
  };
}

export class CoachApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'CoachApiError';
  }
}

export class CoachApiClient {
  private baseUrl: string;
  
  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl;
  }
  
  /**
   * Get auth token from cookies
   */
  private getToken(): string | null {
    if (typeof document === 'undefined') return null;
    
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'aivo_access_token') {
        return value ?? null;
      }
    }
    return null;
  }
  
  /**
   * Make authenticated request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    
    if (!token) {
      throw new CoachApiError('Not authenticated', 'UNAUTHORIZED', 401);
    }
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      const error = data.error || { code: 'UNKNOWN_ERROR', message: 'An error occurred' };
      throw new CoachApiError(error.message, error.code, response.status);
    }
    
    return data.data;
  }
  
  // ===========================================================================
  // Chat API
  // ===========================================================================
  
  /**
   * Send a message to the AI Coach
   */
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    return this.request('/chat', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }
  
  /**
   * Get conversation history
   */
  async getConversations(limit: number = 20, offset: number = 0): Promise<{
    conversations: CoachConversation[];
    total: number;
    hasMore: boolean;
  }> {
    return this.request(`/conversations?limit=${limit}&offset=${offset}`);
  }
  
  /**
   * Get a specific conversation
   */
  async getConversation(conversationId: string): Promise<{
    conversation: CoachConversation;
    messages: CoachMessage[];
  }> {
    return this.request(`/conversations/${conversationId}`);
  }
  
  /**
   * Create a new conversation
   */
  async createConversation(title?: string): Promise<{
    conversation: CoachConversation;
  }> {
    return this.request('/conversations', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  }
  
  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId: string): Promise<{
    deleted: boolean;
  }> {
    return this.request(`/conversations/${conversationId}`, {
      method: 'DELETE',
    });
  }
  
  /**
   * Confirm a pending mutation
   */
  async confirmMutation(conversationId: string, mutationId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    return this.request(`/conversations/${conversationId}/mutations/${mutationId}/confirm`, {
      method: 'POST',
    });
  }
  
  /**
   * Cancel a pending mutation
   */
  async cancelMutation(conversationId: string, mutationId: string): Promise<{
    cancelled: boolean;
  }> {
    return this.request(`/conversations/${conversationId}/mutations/${mutationId}/cancel`, {
      method: 'POST',
    });
  }
  
  // ===========================================================================
  // Suggested Prompts
  // ===========================================================================
  
  /**
   * Get suggested prompts for the user
   */
  async getSuggestedPrompts(): Promise<{
    prompts: Array<{
      id: string;
      text: string;
      context?: string[];
    }>;
  }> {
    return this.request('/prompts');
  }
  
  // ===========================================================================
  // Workout Plan API
  // ===========================================================================
  
  /**
   * Get current workout plan
   */
  async getCurrentPlan(): Promise<WorkoutPlan | null> {
    try {
      return await this.request('/plans/current');
    } catch (error) {
      if (error instanceof CoachApiError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }
  
  /**
   * Get workout plan by ID
   */
  async getPlan(planId: string): Promise<WorkoutPlan> {
    return this.request(`/plans/${planId}`);
  }
  
  /**
   * Generate a new workout plan
   */
  async generatePlan(preferences?: {
    workoutDays?: number;
    focusAreas?: string[];
    equipment?: string[];
  }): Promise<{
    plan: WorkoutPlan;
    estimatedTime: number;
  }> {
    return this.request('/plans/generate', {
      method: 'POST',
      body: JSON.stringify(preferences || {}),
    });
  }
  
  /**
   * Accept workout plan
   */
  async acceptPlan(planId: string): Promise<{
    plan: WorkoutPlan;
  }> {
    return this.request(`/plans/${planId}/accept`, {
      method: 'POST',
    });
  }
  
  /**
   * Update workout plan
   */
  async updatePlan(
    planId: string,
    updates: Partial<WorkoutPlan>
  ): Promise<{
    plan: WorkoutPlan;
  }> {
    return this.request(`/plans/${planId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }
  
  /**
   * Swap exercise in a workout
   */
  async swapExercise(
    planId: string,
    workoutDayId: string,
    exerciseId: string,
    replacementId: string
  ): Promise<{
    workoutDay: WorkoutDay;
  }> {
    return this.request(`/plans/${planId}/workouts/${workoutDayId}/exercises/${exerciseId}/swap`, {
      method: 'POST',
      body: JSON.stringify({ replacementId }),
    });
  }
  
  // ===========================================================================
  // Workout Sessions API
  // ===========================================================================
  
  /**
   * Start a workout session
   */
  async startSession(workoutDayId: string): Promise<{
    session: WorkoutSession;
  }> {
    return this.request('/sessions/start', {
      method: 'POST',
      body: JSON.stringify({ workoutDayId }),
    });
  }
  
  /**
   * Update session progress
   */
  async updateSession(
    sessionId: string,
    updates: Partial<WorkoutSession>
  ): Promise<{
    session: WorkoutSession;
  }> {
    return this.request(`/sessions/${sessionId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }
  
  /**
   * Complete a workout session
   */
  async completeSession(
    sessionId: string,
    results: {
      exercises: SessionExercise[];
      duration?: number;
      difficulty?: number;
      notes?: string;
    }
  ): Promise<{
    session: WorkoutSession;
    summary: {
      totalVolume: number;
      personalBests: string[];
      formScore: number;
      readinessImpact: number;
    };
  }> {
    return this.request(`/sessions/${sessionId}/complete`, {
      method: 'POST',
      body: JSON.stringify(results),
    });
  }
  
  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<WorkoutSession> {
    return this.request(`/sessions/${sessionId}`);
  }
  
  /**
   * Get recent sessions
   */
  async getRecentSessions(limit: number = 10): Promise<{
    sessions: WorkoutSession[];
  }> {
    return this.request(`/sessions/recent?limit=${limit}`);
  }
  
  // ===========================================================================
  // Progress API
  // ===========================================================================
  
  /**
   * Get progress metrics
   */
  async getProgressMetrics(): Promise<ProgressMetrics> {
    return this.request('/progress/metrics');
  }
  
  /**
   * Get progress trends
   */
  async getProgressTrends(
    metrics: string[],
    range: string = '30d'
  ): Promise<{
    trends: Record<string, {
      data: Array<{ date: string; value: number }>;
      change: number;
      trend: 'improving' | 'stable' | 'declining';
    }>;
  }> {
    return this.request('/progress/trends', {
      method: 'POST',
      body: JSON.stringify({ metrics, range }),
    });
  }
  
  // ===========================================================================
  // Camera Coach API
  // ===========================================================================
  
  /**
   * Get Camera Coach history
   */
  async getCameraCoachHistory(
    limit: number = 20,
    offset: number = 0
  ): Promise<{
    sessions: Array<{
      id: string;
      date: string;
      exercise: string;
      sets: number;
      reps: number;
      averageFormScore: number;
      formTrend: 'improving' | 'stable' | 'declining';
      corrections: FormCorrection[];
      duration: number;
    }>;
    total: number;
  }> {
    return this.request(`/camera-coach/history?limit=${limit}&offset=${offset}`);
  }
  
  /**
   * Get Camera Coach session details
   */
  async getCameraCoachSession(sessionId: string): Promise<{
    id: string;
    date: string;
    exercise: string;
    sets: Array<{
      setNumber: number;
      reps: number;
      formScore: number;
      rangeOfMotion: number;
      tempo: string;
      corrections: FormCorrection[];
    }>;
    recommendations: string[];
  }> {
    return this.request(`/camera-coach/sessions/${sessionId}`);
  }
}

// Singleton instance
let clientInstance: CoachApiClient | null = null;

export function getCoachClient(baseUrl?: string): CoachApiClient {
  if (!clientInstance) {
    clientInstance = new CoachApiClient(baseUrl);
  }
  return clientInstance;
}

export function resetCoachClient(): void {
  clientInstance = null;
}
