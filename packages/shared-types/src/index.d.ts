export interface User {
    id: string;
    email: string;
    name: string;
    age?: number;
    gender?: Gender;
    height?: number;
    weight?: number;
    restingHeartRate?: number;
    maxHeartRate?: number;
    fitnessLevel?: FitnessLevel;
    goals?: UserGoal[];
    picture?: string;
    createdAt: Date;
    updatedAt: Date;
}
export type Gender = "male" | "female" | "other" | "prefer_not_to_say";
export type FitnessLevel = "beginner" | "intermediate" | "advanced" | "elite";
export type UserGoal = "lose_weight" | "gain_muscle" | "improve_endurance" | "maintain_fitness" | "general_health" | "increase_strength" | "improve_flexibility" | "stress_reduction";
export interface OAuthProvider {
    type: "google" | "facebook" | "apple";
    providerId: string;
    email: string;
    name: string;
    picture?: string;
}
export interface LoginRequest {
    token: string;
}
export interface AuthToken {
    token: string;
    refreshToken?: string;
    expiresAt: Date;
}
export interface AuthResponse {
    user: User;
    token: string;
    isNewUser: boolean;
}
export interface BodyMetric {
    id: string;
    userId: string;
    timestamp: number;
    weight?: number | null;
    bodyFatPercentage?: number | null;
    muscleMass?: number | null;
    boneMass?: number | null;
    waterPercentage?: number | null;
    bmi?: number | null;
    waistCircumference?: number | null;
    chestCircumference?: number | null;
    hipCircumference?: number | null;
    source?: "manual" | "ai" | "device";
    notes?: string | null;
}
export interface BodyHeatmapData {
    id: string;
    userId: string;
    timestamp: number;
    imageUrl?: string;
    vectorData: HeatmapVectorPoint[];
    metadata?: {
        analysisSource?: "ai_vision" | "manual_input" | "device_sync";
        confidence?: number;
        zones?: MuscleZone[];
        analysisId?: string;
        generatedAt?: string;
        pointCount?: number;
    };
}
export interface HeatmapVectorPoint {
    x: number;
    y: number;
    intensity: number;
    muscle: MuscleGroup;
}
export type MuscleGroup = "chest" | "back" | "shoulders" | "biceps" | "triceps" | "core" | "quadriceps" | "hamstrings" | "glutes" | "calves" | "forearms" | "neck";
export interface MuscleZone {
    group: MuscleGroup;
    development: "underdeveloped" | "normal" | "overdeveloped";
    imbalanceScore: number;
    recommendation?: string;
}
export interface BodyCompositionEstimate {
    bodyFatEstimate: number;
    muscleMassEstimate: number;
    confidence: number;
}
export interface VisionAnalysis {
    id: string;
    userId: string;
    imageUrl: string;
    processedUrl?: string;
    analysis: {
        posture?: PostureAssessment;
        symmetry?: SymmetryAssessment;
        muscleDevelopment: MuscleDevelopment[];
        riskFactors: RiskFactor[];
        bodyComposition?: BodyCompositionEstimate;
    };
    confidence: number;
    createdAt: number;
}
export interface PostureAssessment {
    score: number;
    issues: PostureIssue[];
    recommendations: string[];
}
export interface PostureIssue {
    type: "forward_head" | "rounded_shoulders" | "hyperlordosis" | "kyphosis" | "pelvic_tilt";
    severity: "mild" | "moderate" | "severe";
}
export interface SymmetryAssessment {
    overallScore: number;
    imbalances: ImbalanceDetail[];
}
export interface ImbalanceDetail {
    muscleGroup: MuscleGroup;
    percentageDiff: number;
    side: "left" | "right";
}
export interface MuscleDevelopment {
    group: MuscleGroup;
    score: number;
    percentile: number;
}
export interface RiskFactor {
    factor: string;
    severity: "low" | "medium" | "high";
    description: string;
}
export interface Workout {
    id: string;
    userId: string;
    type: WorkoutType;
    name?: string;
    duration: number;
    caloriesBurned?: number;
    startTime: Date;
    endTime: Date;
    notes?: string;
    metrics?: WorkoutMetrics;
    exercises?: WorkoutExercise[];
    createdAt: Date;
    completedAt?: Date;
    status: "scheduled" | "in_progress" | "completed" | "cancelled";
}
export type WorkoutType = "strength" | "cardio" | "hiit" | "yoga" | "running" | "cycling" | "swimming" | "pilates" | "mobility" | "sports" | "other";
export interface WorkoutMetrics {
    heartRate?: HeartRateData;
    distance?: number;
    pace?: number;
    power?: number;
    elevation?: number;
    reps?: number;
    sets?: number;
    custom?: Record<string, number>;
}
export interface HeartRateData {
    avg: number;
    min: number;
    max: number;
    zones?: HeartRateZone[];
}
export interface HeartRateZone {
    name: string;
    min: number;
    max: number;
    timeInZone: number;
}
export interface WorkoutExercise {
    id?: string;
    workoutId: string;
    name: string;
    sets: number;
    reps: number;
    weight?: number;
    restTime?: number;
    notes?: string;
    order: number;
    rpe?: number;
}
export interface DailySchedule {
    id: string;
    userId: string;
    date: string;
    workout?: ScheduledWorkout;
    recoveryTasks: RecoveryTask[];
    nutritionGoals?: NutritionGoal[];
    sleepGoal?: SleepGoal;
    generatedBy: "ai" | "manual";
    optimizationScore?: number;
    adjustmentsMade: ScheduleAdjustment[];
}
export interface ScheduledWorkout {
    workoutId?: string;
    templateId?: string;
    customName: string;
    type: WorkoutType;
    duration: number;
    estimatedCalories: number;
    exercises: ScheduledExercise[];
    notes?: string;
}
export interface ScheduledExercise {
    name: string;
    sets: number;
    reps: number;
    weight?: number;
    restTime: number;
    rpeTarget: number;
    notes?: string;
}
export interface RecoveryTask {
    id: string;
    type: "stretching" | "mobility" | "foam_rolling" | "rest" | "active_recovery";
    duration: number;
    priority: "high" | "medium" | "low";
    completed: boolean;
}
export interface NutritionGoal {
    caloriesTarget: number;
    proteinTarget: number;
    carbsTarget: number;
    fatTarget: number;
    waterTarget: number;
}
export interface SleepGoal {
    targetHours: number;
    targetBedtime?: string;
    targetWakeTime?: string;
}
export interface ScheduleAdjustment {
    reason: string;
    originalPlan: string;
    adjustedPlan: string;
    factor: "recovery" | "scheduling_conflict" | "equipment" | "fatigue" | "preference";
}
export interface WorkoutTemplate {
    id: string;
    userId: string;
    name: string;
    type: WorkoutType;
    duration: number;
    exercises: TemplateExercise[];
    tags: string[];
    isPublic: boolean;
    popularity?: number;
}
export interface TemplateExercise {
    name: string;
    defaultSets: number;
    defaultReps: number;
    weightProgression?: number;
    notes?: string;
    order: number;
}
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
    confidence: number;
    reasoning?: string;
    actions: RecommendationAction[];
    expiresAt?: Date;
    isRead: boolean;
    isDismissed: boolean;
    feedback?: RecommendationFeedback;
    createdAt: Date;
}
export type RecommendationType = "workout_suggestion" | "recovery_advice" | "nutrition_tip" | "form_correction" | "goal_adjustment" | "scheduling_optimization" | "injury_prevention" | "motivation_boost";
export interface RecommendationAction {
    id: string;
    label: string;
    type: "navigate" | "start_workout" | "update_goal" | "custom";
    payload?: Record<string, unknown>;
}
export interface RecommendationFeedback {
    helpful: boolean;
    rating?: number;
    comment?: string;
}
export interface MemoryNode {
    id: string;
    userId: string;
    type: MemoryType;
    content: string;
    embedding?: number[];
    metadata: {
        importance: number;
        recency: number;
        accessCount: number;
        lastAccessed: Date;
        tags: string[];
    };
    relatedNodes: string[];
}
export type MemoryType = "preference" | "achievement" | "struggle" | "goal_progress" | "feedback" | "social_interaction" | "habit";
export interface MemoryEdge {
    id: string;
    fromNodeId: string;
    toNodeId: string;
    relationship: "related" | "causes" | "contradicts" | "reinforces";
    weight: number;
}
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
/**
 * Parsed food entry from voice/text input
 */
export interface ParsedFoodEntry {
    meal_type: string | null;
    food_name: string;
    estimated_calories: number | null;
    protein_g: number | null;
    carbs_g: number | null;
    fat_g: number | null;
    fiber_g: number | null;
    confidence: number;
    portion_size: string | null;
}
/**
 * Parsed workout entry from voice/text input
 */
export interface ParsedWorkoutEntry {
    workout_type: string | null;
    exercise_name: string;
    sets: number | null;
    reps: number | null;
    weight: number | null;
    weight_unit: string | null;
    duration_minutes: number | null;
    rpe: number | null;
    confidence: number;
}
/**
 * Parsed body metric from voice/text input
 */
export interface ParsedBodyMetric {
    metric_type: "weight" | "body_fat" | "muscle_mass" | "circumference";
    value: number;
    unit: string;
    confidence: number;
}
/**
 * Complete result of voice parsing
 */
export interface VoiceParseResult {
    has_food: boolean;
    has_workout: boolean;
    has_body_metric: boolean;
    food_entries: ParsedFoodEntry[];
    workout_entries: ParsedWorkoutEntry[];
    body_metrics: ParsedBodyMetric[];
    overall_confidence: number;
    needs_clarification: boolean;
    clarification_questions: string[];
}
/**
 * Voice logging request payload
 */
export interface VoiceLogRequest {
    text: string;
    context_hint?: string;
}
export interface GamificationProfile {
    id: string;
    userId: string;
    totalPoints: number;
    level: number;
    currentXp: number;
    xpToNextLevel: number;
    streak: {
        current: number;
        longest: number;
        lastActivityDate: string;
    };
    badges: Badge[];
    achievements: Achievement[];
    leaderboardPosition?: number;
    socialProofCards: SocialProofCard[];
}
export interface Badge {
    id: string;
    type: BadgeType;
    name: string;
    description: string;
    icon: string;
    earnedAt: Date;
    tier: "bronze" | "silver" | "gold" | "platinum";
}
export type BadgeType = "first_workout" | "seven_day_streak" | "thirty_day_streak" | "calorie_master" | "early_bird" | "night_owl" | "social_butterfly" | "goal_achiever" | "personal_best" | "perfect_week" | "workout_variety" | "consistency_king";
export interface Achievement {
    id: string;
    userId: string;
    type: AchievementType;
    progress: number;
    target: number;
    reward: number;
    completed: boolean;
    completedAt?: Date;
    claimed: boolean;
}
export type AchievementType = "total_workouts" | "total_minutes" | "total_calories" | "consecutive_days" | "workout_type_mastery" | "personal_record";
export interface SocialProofCard {
    id: string;
    userId: string;
    type: "milestone" | "streak" | "comparison" | "achievement";
    title: string;
    subtitle: string;
    data: {
        value: number;
        label: string;
        comparison?: string;
        icon: string;
        color: string;
    };
    shareableImageUrl?: string;
    createdAt: Date;
    isPublic: boolean;
}
export interface ActivityEvent {
    id: string;
    userId: string;
    workoutId?: string;
    type: ActivityEventType;
    payload: Record<string, unknown>;
    clientTimestamp: Date;
    serverTimestamp: Date;
    deviceInfo?: DeviceInfo;
}
export type ActivityEventType = "track_metrics" | "heart_rate_zone" | "workout_complete" | "goal_progress" | "app_open" | "feature_used" | "recommendation_shown" | "recommendation_acted";
export interface DeviceInfo {
    platform: "web" | "ios" | "android";
    version: string;
    model?: string;
    os?: string;
}
export interface StatusUpdate {
    userId: string;
    type: "workout_started" | "workout_updated" | "workout_completed" | "metric_update" | "goal_achieved";
    data: Record<string, unknown>;
    timestamp: Date;
}
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    timestamp: Date;
}
export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}
export type Env = {
    DB: unknown;
    AI?: unknown;
    R2?: unknown;
    AUTH_SECRET: string;
};
export interface WasmFitnessCalculator {
    calculateBMI(weightKg: number, heightCm: number): number;
    getBMICategory(bmi: number): "underweight" | "normal" | "overweight" | "obese";
    calculateBMR(weightKg: number, heightCm: number, ageYears: number, isMale: boolean): number;
    calculateTDEE(bmr: number, activityLevel: ActivityLevel): number;
    calculateTargetCalories(tdee: number, goal: Goal): number;
    calculateOneRepMax(weightLifted: number, reps: number): number;
    calculateOneRepMaxBrzycki(weightLifted: number, reps: number): number;
    calculateVolume(weight: number, reps: number, sets: number): number;
    calculateIntensity(weightLifted: number, oneRepMax: number): number;
    calculateMaxHeartRate(ageYears: number): number;
    calculateHeartRateZones(restingHR: number, maxHR: number): HeartRateZone[];
    calculateKarvonenZone(restingHR: number, maxHR: number, percentage: number): number;
    calculateCaloriesBurned(weightKg: number, minutes: number, metValue: number): number;
    calculateBodyFatPercentage(age: number, gender: Gender, bmi: number): "essential" | "athletic" | "fitness" | "average" | "obese";
    calculateProgressPercentage(current: number, target: number, start: number): number;
    calculatePersonalRecordImprovement(currentPr: number, previousPr: number): number;
}
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type Goal = "lose" | "maintain" | "gain";
export interface PromptCompressionResult {
    originalTokens: number;
    compressedTokens: number;
    compressionRatio: number;
    strategy: CompressionStrategy;
    compressedPrompt: string;
    preservedSemantics: boolean;
}
export type CompressionStrategy = "semantic_pruning" | "summarization" | "deduplication" | "keyword_extraction" | "sliding_window";
export interface HeatmapGenerationInput {
    userId: string;
    muscleData: MuscleIntensity[];
    width: number;
    height: number;
    colorScheme: "fire" | "ice" | "rainbow" | "grayscale";
}
export interface MuscleIntensity {
    muscle: MuscleGroup;
    intensity: number;
    position: {
        x: number;
        y: number;
    };
}
export interface GeneratedHeatmap {
    svgString: string;
    pngUrl?: string;
    dataPoints: number;
    generationTimeMs: number;
}
export interface MetabolicDigitalTwinInput {
    historicalData: MetabolicHistoricalPoint[];
    userId: string;
    timeHorizonDays: number;
}
export interface MetabolicHistoricalPoint {
    timestamp: number;
    weightKg: number;
    bodyFatPct: number;
    muscleMassKg: number;
    activityLevel?: number;
    calorieIntake?: number;
}
export interface TrendLine {
    slope: number;
    intercept: number;
    rSquared: number;
    stdError: number;
}
export interface Projection {
    daysAhead: number;
    value: number;
    lowerBound: number;
    upperBound: number;
    confidence: number;
}
export interface ScenarioProjection {
    scenarioType: "consistent_performance" | "potential_regression" | "best_case" | "worst_case";
    weightProjections: Projection[];
    bodyFatProjections: Projection[];
    muscleProjections: Projection[];
    overallConfidence: number;
    expectedBehaviorChange: string;
}
export interface CurrentMetrics {
    weightKg: number;
    bodyFatPct: number;
    muscleMassKg: number;
    leanBodyMassKg: number;
    bmi: number;
    activityScore: number;
}
export interface TrendAnalysis {
    weightTrend: TrendLine;
    bodyFatTrend: TrendLine;
    muscleTrend: TrendLine;
    consistencyScore: number;
    volatility: number;
    trendStrength: number;
}
export interface ScenarioResults {
    consistentPerformance: ScenarioProjection;
    potentialRegression: ScenarioProjection;
    bestCase: ScenarioProjection;
    worstCase: ScenarioProjection;
}
export interface DigitalTwinResult {
    userId: string;
    generatedAt: number;
    timeHorizonDays: number;
    currentMetrics: CurrentMetrics;
    trendAnalysis: TrendAnalysis;
    scenarios: ScenarioResults;
    recommendations: string[];
}
export interface ShareableContent {
    id: string;
    userId: string;
    type: "workout_summary" | "achievement" | "progress" | "social_proof";
    title: string;
    description: string;
    imageUrl: string;
    platform: "instagram" | "twitter" | "facebook" | "tiktok" | "generic";
    isPublic: boolean;
    likes: number;
    shares: number;
    createdAt: Date;
}
export interface SystemMetrics {
    timestamp: Date;
    activeUsers: number;
    newUsers: number;
    workoutsCompleted: number;
    aiRequests: number;
    apiLatency: number;
    errorRate: number;
    storageUsed: number;
}
export interface UserAnalytics {
    userId: string;
    engagementScore: number;
    retentionRisk: "low" | "medium" | "high";
    predictedLTV: number;
    churnProbability: number;
    preferredCommunication: ("email" | "push" | "in_app")[];
    lastActive: Date;
}
export interface MigrationRecord {
    id: string;
    name: string;
    appliedAt: Date;
    hash: string;
    version: number;
}
export type Nullable<T> = T | null;
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export interface Discriminator<T extends string, V extends Record<string, unknown>> {
    kind: T;
    data: V;
}
export type Result<T, E = Error> = {
    ok: true;
    value: T;
} | {
    ok: false;
    error: E;
};
export declare function isUser(obj: unknown): obj is User;
export declare function isWorkout(obj: unknown): obj is Workout;
export declare function isActivityEvent(obj: unknown): obj is ActivityEvent;
/**
 * Normalized muscle positions (0-100 coordinate system)
 * These positions map to the body outline SVG
 */
export declare const MUSCLE_POSITIONS: Record<string, {
    x: number;
    y: number;
    zone: string;
}>;
/**
 * SVG path data for body outline (front view)
 * Coordinates in 200x400 viewBox
 */
export declare const BODY_OUTLINE_FRONT: string;
/**
 * SVG path data for body outline (back view)
 */
export declare const BODY_OUTLINE_BACK: string;
/**
 * Color scale types for heatmap visualization
 */
export type HeatmapColorScale = "heat" | "cool" | "monochrome";
/**
 * Get color for intensity value based on scale
 * @param intensity - Value between 0 and 1
 * @param scale - Color scale to use
 * @returns Object with baseColor and opacity
 */
export declare function getHeatmapColor(intensity: number, scale?: HeatmapColorScale): {
    baseColor: string;
    opacity: number;
};
/**
 * Calculate radius for heatmap point based on intensity
 */
export declare function getHeatmapRadius(intensity: number, baseRadius?: number): number;
/**
 * Aggregate heatmap points by muscle location
 * Groups nearby points and averages their intensities
 */
export declare function aggregateHeatmapPoints(vectorData: Array<{
    x: number;
    y: number;
    intensity: number;
    muscle: MuscleGroup;
}>): Array<{
    x: number;
    y: number;
    intensity: number;
    muscle: MuscleGroup;
}>;
/**
 * Pre-defined body zones for SVG heatmap rendering
 * Coordinates are normalized (0-1) relative to SVG viewport
 */
export interface BodyZone {
    id: string;
    name: string;
    bounds: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    muscles: string[];
}
export declare const BODY_ZONES: BodyZone[];
/**
 * Heatmap region data for a specific body zone
 */
export interface HeatmapRegion {
    zoneId: string;
    intensity: number;
    color: string;
    confidence: number;
}
/**
 * Complete vision analysis result from Claude
 */
export interface VisionAnalysisResult {
    photoId: string;
    pose: "front" | "back" | "side" | "unknown";
    regions: HeatmapRegion[];
    metrics: {
        upperBodyScore: number;
        coreScore: number;
        lowerBodyScore: number;
        overallScore: number;
    };
    processedAt: string;
}
/**
 * Stored heatmap record (from database)
 */
export interface StoredHeatmap {
    id: string;
    userId: string;
    photoId: string;
    regions: HeatmapRegion[];
    metrics: {
        upperBodyScore: number;
        coreScore: number;
        lowerBodyScore: number;
        overallScore: number;
    };
    createdAt: number;
}
/**
 * Body photo upload record
 */
export interface BodyPhotoRecord {
    id: string;
    userId: string;
    r2Url: string;
    thumbnailUrl?: string;
    uploadDate: number;
    analysisStatus: "pending" | "processing" | "completed" | "failed";
    poseDetected?: boolean;
}
/**
 * Heatmap comparison data showing progress between two measurements
 */
export interface HeatmapComparison {
    current: StoredHeatmap;
    previous?: StoredHeatmap;
    differences: Record<string, {
        current: number;
        previous: number;
        change: number;
        trend: "improved" | "regressed" | "stable";
    }>;
}
/**
 * Posture issue type discriminator
 */
export type PostureIssueType = "forward_head" | "rounded_shoulders" | "hyperlordosis" | "kyphosis" | "pelvic_tilt";
/**
 * Severity levels for posture issues
 */
export type SeverityLevel = "mild" | "moderate" | "severe";
/**
 * Human-readable labels and descriptions for posture issues
 */
export declare const POSTURE_ISSUE_LABELS: Record<PostureIssueType, {
    label: string;
    description: string;
}>;
/**
 * Severity color mappings (hex colors)
 */
export declare const SEVERITY_COLORS: Record<SeverityLevel, string>;
/**
 * Severity background/style mappings for UI
 * Returns platform-agnostic style descriptors
 */
export declare const SEVERITY_STYLES: Record<SeverityLevel, {
    bg: string;
    border: string;
    text: string;
}>;
/**
 * Get score color class/string based on score value
 */
export declare function getScoreColor(score: number): string;
/**
 * Get human-readable score label
 */
export declare function getScoreLabel(score: number): string;
/**
 * Get gradient class for score bar
 */
export declare function getScoreGradient(score: number): string;
export interface HealthScoreFactors {
    bmi: number;
    bodyFat: number;
    muscleMass: number;
    fitnessLevel: number;
}
export interface HealthScoreResult {
    score: number;
    category: "excellent" | "good" | "fair" | "poor";
    factors: HealthScoreFactors;
    recommendations: string[];
}
/**
 * Calculate health score from metrics and user profile
 * Pure function - no side effects
 */
export declare function calculateHealthScore(params: {
    bmi?: number;
    bodyFatPercentage?: number;
    muscleMass?: number;
    weight?: number;
    fitnessLevel?: string;
}): HealthScoreResult;
/**
 * Get current timestamp in milliseconds
 */
export declare function now(): number;
/**
 * Convert milliseconds to Unix timestamp (seconds)
 */
export declare function toUnixTimestamp(ms: number): number;
/**
 * Convert Unix timestamp to Date
 */
export declare function fromUnixTimestamp(unix: number): Date;
/**
 * Create a standard API response
 */
export declare function createApiResponse<T>(data: T, status?: "success" | "error", message?: string): ApiResponse<T>;
/**
 * Create an error API response
 */
export declare function createErrorResponse<T = never>(error: string): ApiResponse<T>;
/**
 * Food item from nutritional database
 */
export interface FoodItem {
    id: string;
    name: string;
    brand?: string;
    servingSize: number;
    servingUnit: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g?: number;
    sugar_g?: number;
    sodium_mg?: number;
    isVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Food item detected by AI vision analysis
 */
export interface DetectedFoodItem {
    name: string;
    confidence: number;
    estimatedPortionG: number;
    portionUnit: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g?: number;
    sugar_g?: number;
    matchedFoodItemId?: string;
}
/**
 * AI Vision analysis result for food image
 */
export interface FoodVisionAnalysis {
    id: string;
    userId: string;
    imageUrl: string;
    detectedItems: DetectedFoodItem[];
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
    analysisConfidence: number;
    analysisNotes?: string;
    portionEstimationMethod?: "volume_analysis" | "comparison" | "density_calc" | "ai_estimation";
    createdAt: number;
}
/**
 * Food log entry - user's recorded food consumption
 */
export interface FoodLog {
    id: string;
    userId: string;
    mealType: MealType;
    foodItemId?: string;
    customName?: string;
    imageUrl?: string;
    estimatedPortionG?: number;
    confidence?: number;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g?: number;
    sugar_g?: number;
    loggedAt: number;
    createdAt: number;
}
/**
 * Meal type discriminator - supports standard and custom types
 */
export type MealType = "breakfast" | "lunch" | "dinner" | "snack" | "pre_workout" | "post_workout" | "custom";
/**
 * Summary of nutrients for a single meal
 */
export interface MealSummary {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    sugar?: number;
    itemCount: number;
}
/**
 * Daily nutrition summary with targets
 */
export interface DailyNutritionSummary {
    date: string;
    totalCalories: number;
    targetCalories: number;
    totalProtein: number;
    targetProtein: number;
    totalCarbs: number;
    targetCarbs: number;
    totalFat: number;
    targetFat: number;
    totalFiber?: number;
    targetFiber?: number;
    foodLogCount: number;
    meals: {
        breakfast?: MealSummary;
        lunch?: MealSummary;
        dinner?: MealSummary;
        snack?: MealSummary;
        [key: string]: MealSummary | undefined;
    };
}
/**
 * User's macro targets (can be AI-suggested or manual)
 */
export interface MacroTargets {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g?: number;
    source: "ai_suggested" | "manual";
    createdAt: number;
}
export interface UploadImageResponse {
    success: boolean;
    data: {
        imageUrl: string;
        key: string;
        userId: string;
        uploadedAt: string;
    };
}
export interface VisionAnalysisRequest {
    imageUrl: string;
    mealType?: MealType;
}
export interface CreateFromAnalysisRequest {
    analysisId?: string;
    detectedItems: Array<{
        name: string;
        confidence: number;
        estimatedPortionG: number;
        portionUnit: string;
        calories: number;
        protein_g: number;
        carbs_g: number;
        fat_g: number;
        fiber_g?: number;
        sugar_g?: number;
        matchedFoodItemId?: string;
    }>;
    mealType: MealType;
    timestamp?: number;
}
export interface FoodLogCreate {
    mealType: MealType;
    foodItemId?: string;
    customName?: string;
    estimatedPortionG?: number;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g?: number;
    sugar_g?: number;
    loggedAt?: number;
}
export interface FoodLogUpdate {
    mealType?: MealType;
    foodItemId?: string;
    customName?: string;
    estimatedPortionG?: number;
    calories?: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
    fiber_g?: number;
    sugar_g?: number;
    loggedAt?: number;
}
/**
 * Infographic template types for social proof content
 */
export type InfographicTemplate = "weekly_summary" | "milestone" | "streak" | "muscle_heatmap" | "comparison";
/**
 * Color palette configuration for infographic theming
 */
export interface ColorPalette {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    textMuted: string;
}
/**
 * Typography configuration for infographic rendering
 */
export interface TypographyConfig {
    headlineFont: string;
    bodyFont: string;
    headlineSize: number;
    subheadSize: number;
    bodySize: number;
}
/**
 * Complete infographic configuration
 */
export interface InfographicConfig {
    template: InfographicTemplate;
    theme: "dark" | "light" | "neon" | "ocean" | "sunset" | "vibrant";
    layout: "portrait" | "landscape" | "square";
    colorScheme: ColorPalette;
    typography: TypographyConfig;
    includeStats: string[];
    includeComparison: boolean;
}
/**
 * AI-generated story content for the infographic
 */
export interface InfographicStory {
    headline: string;
    subheadline?: string;
    narrative: string;
    stats: Array<{
        label: string;
        value: string | number;
        unit?: string;
        comparison?: string;
        icon?: string;
    }>;
    callToAction: string;
    funFacts: string[];
    tone: "motivational" | "celebratory" | "educational" | "competitive";
    readingLevel: "easy" | "medium" | "challenging";
}
/**
 * User statistics for infographic generation
 */
export interface UserStats {
    period: {
        startDate: string;
        endDate: string;
        type: "weekly" | "monthly" | "all_time";
    };
    workouts: {
        count: number;
        totalMinutes: number;
        totalCalories: number;
        avgDuration: number;
        types: Record<WorkoutType, number>;
        personalRecords: PersonalRecord[];
    };
    strength: {
        totalVolume: number;
        topExercises: Array<{
            name: string;
            volume: number;
        }>;
        estimatedOneRMs: Record<string, number>;
    };
    gamification: {
        streak: number;
        longestStreak: number;
        points: number;
        level: number;
        badges: number;
        leaderboardRank?: number;
        percentile?: number;
    };
    body: {
        weightChange?: number;
        bodyFatChange?: number;
        muscleGain?: number;
        bmi?: number;
        healthScore?: number;
        muscleDevelopment?: Array<{
            group: MuscleGroup;
            score: number;
        }>;
    };
    comparisons: {
        vsAverage: Record<string, number>;
        personalBests: Array<{
            metric: string;
            improvement: number;
        }>;
    };
}
/**
 * Complete infographic data structure
 */
export interface InfographicData {
    id: string;
    userId: string;
    template: InfographicTemplate;
    config: InfographicConfig;
    story: InfographicStory;
    stats: UserStats;
    createdAt: Date;
    shareableImageUrl?: string;
    svgContent?: string;
    width: number;
    height: number;
}
/**
 * Personal record data
 */
export interface PersonalRecord {
    exercise: string;
    weight: number;
    reps: number;
    date: string;
    previous?: number;
    improvementPercent?: number;
}
/**
 * Render result from WASM infographic generator
 */
export interface InfographicRenderResult {
    svg: string;
    pngBuffer?: Uint8Array;
    pngUrl?: string;
    renderTimeMs: number;
    width: number;
    height: number;
}
export type InfographicRequest = {
    period: {
        type: "weekly" | "monthly";
        start: string;
        end?: string;
    };
    template?: string;
    config?: Partial<InfographicConfig>;
};
/**
 * Supported exercise types for form analysis
 */
export type FormExerciseType = "squat" | "deadlift" | "bench_press" | "overhead_press" | "lunge";
/**
 * Video status lifecycle
 */
export type FormVideoStatus = "pending" | "processing" | "completed" | "failed";
/**
 * Specific movement flaw detected
 */
export type FormIssueType = "knee_valgus" | "knee_hyperextension" | "rounded_back" | "excessive_lean" | "butt_wink" | "heels_rising" | "incomplete_depth" | "bar_path_deviation" | "hip_asymmetry" | "shoulder_elevation" | "elbow_flare" | "head_position" | "asymmetric_extension";
/**
 * Severity level of detected issue
 */
export type FormIssueSeverity = "minor" | "moderate" | "major";
/**
 * A specific form issue detected in the video
 */
export interface FormIssue {
    type: FormIssueType;
    severity: FormIssueSeverity;
    confidence: number;
    timestampMs: number;
    description: string;
    impact: "performance" | "safety" | "both";
}
/**
 * A correction drill to address a specific issue
 */
export interface FormCorrection {
    issueType: FormIssueType;
    drillName: string;
    description: string;
    steps: string[];
    cues: string[];
    durationSeconds: number;
    difficulty: "beginner" | "intermediate" | "advanced";
    equipment: string[];
}
/**
 * Uploaded video awaiting analysis
 */
export interface FormAnalysisVideo {
    id: string;
    userId: string;
    exerciseType: FormExerciseType;
    status: FormVideoStatus;
    videoKey: string;
    videoUrl: string;
    thumbnailUrl?: string;
    frameCount?: number;
    durationSeconds?: number;
    metadata: {
        fileSize: number;
        resolution?: string;
        fps?: number;
        uploadedAt: number;
    };
    createdAt: number;
    updatedAt: number;
}
/**
 * Complete analysis result after AI processing
 */
export interface FormAnalysisReport {
    videoId: string;
    userId: string;
    exerciseType: FormExerciseType;
    status: FormVideoStatus;
    overallScore: number;
    grade: "A" | "B" | "C" | "D" | "F";
    issues: FormIssue[];
    corrections: FormCorrection[];
    summary: {
        strengths: string[];
        primaryConcern: string;
        priority: "low" | "medium" | "high";
    };
    aiFeedback?: {
        overallAssessment: string;
        primaryIssues: Array<{
            issue: string;
            severity: "low" | "medium" | "high" | "critical";
            explanation: string;
            priority: number;
        }>;
        personalizedCues: Array<{
            triggerPoint: string;
            verbalCue: string;
            visualCue?: string;
            tactileCue?: string;
        }>;
        drillRecommendations: Array<{
            name: string;
            purpose: string;
            frequency: string;
            duration: string;
            steps: string[];
            regressions: string[];
            progressions: string[];
        }>;
        confidence: number;
        warnings: string[];
    };
    aiProcessingTimeMs?: number;
    frameAnalysis?: {
        keyFrames: Array<{
            timestampMs: number;
            url: string;
            issuesPresent: FormIssueType[];
        }>;
    };
    createdAt: number;
    completedAt?: number;
    processingTimeMs?: number;
}
/**
 * Job status for async processing
 */
export interface FormAnalysisJob {
    id: string;
    videoId: string;
    status: "queued" | "processing" | "completed" | "failed";
    attempts: number;
    errorMessage?: string;
    queuedAt: number;
    startedAt?: number;
    completedAt?: number;
}
/**
 * Helper function to calculate overall grade from score
 */
export declare function calculateFormGrade(score: number): "A" | "B" | "C" | "D" | "F";
/**
 * Helper function to get color for score display
 */
export declare function getFormScoreColor(score: number): string;
/**
 * Helper function to group issues by type
 */
export declare function groupIssuesByType(issues: FormIssue[]): Map<FormIssueType, FormIssue[]>;
/**
 * Helper function to get worst severity from list of issues
 */
export declare function getWorstSeverity(issues: FormIssue[]): FormIssueSeverity;
/**
 * Sleep log entry - structured sleep tracking with objective metrics
 * Corresponds to sleep_logs table
 */
export interface SleepLog {
    id: string;
    userId: string;
    date: string;
    durationHours: number;
    qualityScore?: number;
    deepSleepMinutes?: number;
    remSleepMinutes?: number;
    awakeMinutes?: number;
    bedtime?: string;
    waketime?: string;
    consistencyScore?: number;
    notes?: string;
    source: "manual" | "device" | "ai";
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Aggregated statistics for a time period (used in BiometricSnapshot)
 */
export interface ExerciseLoadAggregate {
    totalWorkouts: number;
    totalDurationMinutes: number;
    totalCalories: number;
    avgDurationMinutes: number;
    workoutsByType: Record<WorkoutType, number>;
    intensityDistribution: {
        low: number;
        moderate: number;
        high: number;
    };
    consecutiveDays: number;
    restDays: number;
    avgRpe?: number;
}
export interface SleepAggregate {
    avgDurationHours: number;
    avgQualityScore?: number;
    avgDeepSleepMinutes?: number;
    avgRemSleepMinutes?: number;
    consistencyScore?: number;
    bedtimeConsistency: number;
    qualityVsDurationCorrelation?: number;
    daysWithData: number;
    totalDays: number;
}
export interface NutritionAggregate {
    avgDailyCalories: number;
    targetCalories: number;
    avgDailyProtein: number;
    targetProtein: number;
    avgDailyCarbs: number;
    targetCarbs: number;
    avgDailyFat: number;
    targetFat: number;
    avgDailyFiber?: number;
    targetFiber?: number;
    proteinGoalPct: number;
    carbsGoalPct: number;
    fatGoalPct: number;
    consistencyScore: number;
    avgMealCount: number;
    lateNightEatingIncidents: number;
    hydration?: {
        avgWaterMl: number;
        targetWaterMl: number;
        goalPct: number;
    };
    macroBalanceScore: number;
}
export interface BodyMetricsAggregate {
    weightChange: number;
    bodyFatChange: number;
    muscleMassChange?: number;
    bmiChange?: number;
    avgWeight: number;
    avgBodyFat: number;
    measurementsCompleteness: number;
}
/**
 * Pre-computed biometric snapshot for a time period
 * Used to avoid expensive on-the-fly correlations for every API call
 * Corresponds to biometric_snapshots table
 */
export interface BiometricSnapshot {
    id: string;
    userId: string;
    period: "7d" | "30d";
    generatedAt: Date;
    validUntil?: Date;
    exerciseLoad: ExerciseLoadAggregate;
    sleep: SleepAggregate;
    nutrition: NutritionAggregate;
    bodyMetrics: BodyMetricsAggregate;
    recoveryScore: number;
    warnings: string[];
}
/**
 * Correlation finding between two factors
 * Identifies patterns like "recovery drops when eating after 9 PM"
 * Corresponds to correlation_findings table
 */
export interface CorrelationFinding {
    id: string;
    userId: string;
    snapshotId: string;
    factorA: BiometricFactor;
    factorB: BiometricFactor;
    correlationCoefficient: number;
    pValue: number;
    confidence: number;
    anomalyThreshold: number;
    anomalyCount: number;
    outlierDates: string[];
    explanation: string;
    actionableInsight: string;
    detectedAt: Date;
    validUntil?: Date;
    isDismissed: boolean;
}
/**
 * Factor types that can be correlated
 */
export type BiometricFactor = "sleep_duration" | "sleep_quality" | "deep_sleep" | "rem_sleep" | "sleep_consistency" | "bedtime" | "workout_intensity" | "workout_duration" | "consecutive_days" | "rest_days" | "exercise_variety" | "rpe_average" | "calorie_deficit" | "protein_intake" | "carb_intake" | "fat_intake" | "macro_balance" | "late_nutrition" | "hydration" | "meal_consistency" | "recovery_score" | "subjective_fatigue" | "readiness_score" | "body_weight" | "body_fat" | "muscle_mass" | "bmi";
/**
 * Request to trigger correlation analysis on demand
 */
export interface CorrelationAnalysisRequest {
    period: "7d" | "30d";
    factors?: BiometricFactor[];
    minimumConfidence: number;
    includeOutlierDetails: boolean;
}
/**
 * Response from correlation analysis
 */
export interface CorrelationAnalysisResult {
    snapshotId: string;
    generatedAt: Date;
    dataCoverage: number;
    findings: CorrelationFinding[];
    summary: {
        totalFactorsAnalyzed: number;
        significantCorrelations: number;
        primaryConcern?: string;
        recommendedAction?: string;
        warnings: string[];
    };
    recoveryScore: number;
    dataGaps: {
        sleep: number;
        workouts: number;
        nutrition: number;
        bodyMetrics: number;
    };
}
/**
 * Recovery score factors for detailed breakdown
 */
export interface RecoveryScoreFactors {
    sleep: {
        duration: number;
        quality: number;
        consistency: number;
        weight: number;
    };
    exercise: {
        load: number;
        recoveryTime: number;
        intensityBalance: number;
        weight: number;
    };
    nutrition: {
        adequacy: number;
        timing: number;
        hydration: number;
        weight: number;
    };
    bodyMetrics: {
        weightChange: number;
        bodyFatChange: number;
        trend: number;
        weight: number;
    };
}
/**
 * Recovery score calculation result
 */
export interface RecoveryScoreResult {
    score: number;
    factors: RecoveryScoreFactors;
    grade: "excellent" | "good" | "fair" | "poor" | "critical";
    trend: "improving" | "stable" | "declining";
    comparedToLastPeriod: {
        change: number;
        direction: "up" | "down" | "same";
    };
    primaryRiskFactor: BiometricFactor | null;
    recommendations: string[];
}
/**
 * Frequency band energy distribution for muscle sound analysis
 */
export interface BandEnergy {
    band: "very_low" | "low" | "mid" | "high";
    minHz: number;
    maxHz: number;
    energy: number;
    normalized: number;
}
/**
 * Features extracted from a single audio chunk (500ms)
 * Represents the acoustic signature of muscle activity
 */
export interface AcousticFeatures {
    rmsAmplitude: number;
    medianFrequency: number;
    frequencyBands: BandEnergy[];
    spectralEntropy: number;
    motorUnitRecruitment: number;
    contractionCount: number;
    signalToNoiseRatio: number;
    confidence: number;
    isValid: boolean;
}
/**
 * Baseline measurement from rested muscle
 * Used as reference for fatigue detection
 */
export interface BaselineData {
    medianFrequency: number;
    rmsAmplitude: number;
    spectralEntropy: number;
    contractionRate: number;
    qualityScore: number;
}
/**
 * Fatigue assessment result
 * Combines current features with baseline to determine fatigue level
 */
export interface FatigueResult {
    fatigueLevel: number;
    fatigueCategory: "fresh" | "moderate" | "fatigued" | "exhausted";
    medianFreqShift: number;
    confidence: number;
    recommendations: string[];
}
/**
 * Acoustic myography configuration
 */
export interface AcousticConfig {
    sampleRate: number;
    chunkDurationMs: number;
    lowCutoff: number;
    highCutoff: number;
    minContractionSeparationMs: number;
    bands: BandEnergy[];
}
/**
 * Complete acoustic session data for storage/analysis
 */
export interface AcousticSession {
    id: string;
    userId: string;
    exerciseName: string;
    muscleGroup: MuscleGroup;
    startTime: number;
    endTime?: number;
    totalChunks: number;
    validChunks: number;
    avgFatigueLevel: number;
    peakFatigueLevel: number;
    fatigueTrend: "improving" | "stable" | "declining";
    baselineUsed?: string;
    metadata: {
        deviceType: "iphone" | "android" | "web";
        sampleRate: number;
        ambientNoiseLevel?: number;
        notes?: string;
    };
    createdAt: number;
}
/**
 * Audio chunk storage (for potential re-analysis)
 */
export interface AudioChunk {
    id: string;
    sessionId: string;
    chunkIndex: number;
    timestamp: number;
    pcmData?: string;
    r2Key?: string;
    features?: AcousticFeatures;
}
export * from "./adaptive-planner";
/**
 * Agent types for specialized nutrition consultation
 */
export type NutritionAgentType = "chef" | "medical" | "budget";
/**
 * Request to consult with nutrition agents
 */
export interface NutritionConsultRequest {
    userId: string;
    query: string;
    context: NutritionConsultContext;
    preferredAgents?: NutritionAgentType[];
    maxResponseTimeMs?: number;
}
/**
 * Contextual information for nutrition consultation
 */
export interface NutritionConsultContext {
    userProfile?: {
        age?: number;
        gender?: Gender;
        height?: number;
        weight?: number;
        fitnessGoals?: UserGoal[];
        activityLevel?: ActivityLevel;
    };
    allergies?: string[];
    intolerances?: string[];
    medicalConditions?: string[];
    medications?: Array<{
        name: string;
        dosage?: string;
        frequency?: string;
    }>;
    budget?: {
        daily?: number;
        weekly?: number;
        monthly?: number;
        currency: string;
        priceSensitivity: "low" | "medium" | "high";
    };
    availableIngredients?: Array<{
        name: string;
        quantity: number;
        unit: string;
        expirationDate?: string;
        isPerishable: boolean;
    }>;
    kitchenTools?: string[];
    skillLevel?: "beginner" | "intermediate" | "advanced";
    dietType?: "omnivore" | "vegetarian" | "vegan" | "pescatarian" | "keto" | "paleo" | "mediterranean";
    macroPreferences?: {
        proteinGrams?: number;
        carbsGrams?: number;
        fatGrams?: number;
        calorieTarget?: number;
    };
}
/**
 * Response from a single agent
 */
export interface AgentResponse {
    agentType: NutritionAgentType;
    success: boolean;
    content: string;
    confidence: number;
    warnings?: string[];
    metadata?: Record<string, unknown>;
    processingTimeMs: number;
}
/**
 * Orchestrated consultation response
 */
export interface NutritionConsultResponse {
    success: boolean;
    sessionId: string;
    userQuery: string;
    agentsConsulted: NutritionAgentType[];
    responses: AgentResponse[];
    synthesizedAdvice: string;
    primaryAgent: NutritionAgentType;
    warnings: string[];
    processingTimeMs: number;
}
/**
 * Stored consultation record (for database)
 */
export interface StoredNutritionConsult {
    id: string;
    userId: string;
    sessionId: string;
    query: string;
    context: NutritionConsultContext;
    agentsConsulted: NutritionAgentType[];
    responses: AgentResponse[];
    synthesizedAdvice: string;
    warnings: string[];
    processingTimeMs: number;
    createdAt: Date;
    userRating?: number;
    feedback?: string;
}
/**
 * Chef Agent specific types
 */
export interface ChefAgentRequest extends NutritionConsultRequest {
    context: NutritionConsultContext & {
        availableIngredients: NonNullable<NutritionConsultContext["availableIngredients"]>;
        kitchenTools: NonNullable<NutritionConsultContext["kitchenTools"]>;
        skillLevel: NonNullable<NutritionConsultContext["skillLevel"]>;
    };
}
export interface ChefAgentResponse extends AgentResponse {
    agentType: "chef";
    recipe?: Recipe;
    ingredientSubstitutions?: Array<{
        original: string;
        substitute: string;
        reason: string;
    }>;
    missingIngredients?: string[];
    estimatedPrepTimeMinutes?: number;
    estimatedCookTimeMinutes?: number;
    difficultyLevel?: "easy" | "medium" | "hard";
    servings?: number;
    nutritionEstimate?: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
    };
}
/**
 * Generated recipe from Chef Agent
 */
export interface Recipe {
    name: string;
    description: string;
    ingredients: Array<{
        name: string;
        quantity: number;
        unit: string;
        notes?: string;
    }>;
    instructions: Array<{
        step: number;
        text: string;
        durationMinutes?: number;
        tips?: string[];
    }>;
    tips: string[];
    warnings?: string[];
    storageInstructions?: string;
    reheatingInstructions?: string;
    allergenAlerts?: string[];
    estimatedPrepTimeMinutes?: number;
    estimatedCookTimeMinutes?: number;
}
/**
 * Medical Agent specific types
 */
export interface MedicalAgentRequest extends NutritionConsultRequest {
    context: NutritionConsultContext & {
        allergies: string[];
        intolerances: string[];
        medicalConditions: string[];
        medications: NonNullable<NutritionConsultContext["medications"]>;
    };
}
export interface MedicalAgentResponse extends AgentResponse {
    agentType: "medical";
    safetyAlerts: SafetyAlert[];
    nutrientWarnings?: NutrientWarning[];
    dietaryModifications?: DietaryModification[];
    consultationNeeded?: boolean;
    consultationReason?: string;
    generalGuidance?: string;
}
export interface SafetyAlert {
    severity: "critical" | "warning" | "info";
    category: "drug_interaction" | "condition_exacerbation" | "nutrient_concern" | "allergy_risk";
    title: string;
    description: string;
    affectedMedications?: string[];
    affectedConditions?: string[];
    recommendation?: string;
}
export interface NutrientWarning {
    nutrient: string;
    currentLevel: string;
    concern: string;
    foodsToLimit?: string[];
    targetRange?: string;
}
export interface DietaryModification {
    condition: string;
    modification: string;
    rationale?: string;
    foodsToEmphasize?: string[];
    foodsToAvoid?: string[];
}
/**
 * Budget Agent specific types
 */
export interface BudgetAgentRequest extends NutritionConsultRequest {
    context: NutritionConsultContext & {
        budget: NonNullable<NutritionConsultContext["budget"]>;
    };
}
export interface BudgetAgentResponse extends AgentResponse {
    agentType: "budget";
    costAnalysis: CostAnalysis;
    savingsOpportunities: SavingsOpportunity[];
    groceryList?: GroceryItem[];
    budgetFriendlyAlternatives?: SavingsOpportunity[];
    mealPrepTips?: MealPrepTip[];
    confidence: number;
}
export interface CostAnalysis {
    estimatedTotalCost: number;
    costPerServing: number;
    servings: number;
    costBreakdown: CostBreakdownItem[];
}
export interface CostBreakdownItem {
    ingredient: string;
    cost: number;
    percentage: number;
    notes?: string;
}
export interface SavingsOpportunity {
    strategy: string;
    potentialSavings: number;
    notes?: string;
}
export interface GroceryItem {
    item: string;
    quantity: string;
    estimatedCost?: number;
    cheaperAlternative?: string;
    buyInBulk: boolean;
}
export type MealPrepTip = string;
/**
 * Live workout session tracking
 * Represents an active workout being performed with real-time adjustments
 */
export interface LiveWorkoutSession {
    id: string;
    userId: string;
    workoutTemplateId?: string;
    name: string;
    startedAt: number;
    lastActivityAt: number;
    status: "active" | "paused" | "completed" | "aborted";
    fatigueLevel: number;
    fatigueCategory: "fresh" | "moderate" | "fatigued" | "exhausted";
    totalPlannedVolume: number;
    totalCompletedVolume: number;
    setsCompleted: number;
    totalPlannedSets: number;
    targetRPE: number;
    idealRestSeconds: number;
    hasSpotter: boolean;
    endedAt?: number;
    totalDurationMs?: number;
    earlyExitReason?: string;
    earlyExitSuggestion?: string;
}
/**
 * Per-set RPE logging for fatigue analysis
 */
export interface SetRPELog {
    id: string;
    sessionId: string;
    setNumber: number;
    exerciseName: string;
    weight: number | null;
    plannedReps: number;
    completedReps: number;
    rpe: number;
    restTimeSeconds: number;
    timestamp: number;
    notes?: string;
}
/**
 * Live adjustment recommendation from AI
 * Returned by assess_current_fatigue and recommend_live_adjustment
 */
export interface LiveAdjustment {
    adjustmentType: "reduce_weight" | "reduce_reps" | "add_rest" | "keep" | "stop";
    weightPercent?: number;
    repAdjustment?: number;
    additionalRestSeconds?: number;
    confidence: number;
    reasoning: string;
    urgency: "low" | "medium" | "high" | "critical";
}
/**
 * Fatigue assessment result
 * Produced by assess_current_fatigue Rust function
 */
export interface FatigueAssessment {
    fatigueLevel: number;
    category: "fresh" | "moderate" | "fatigued" | "exhausted";
    rpeTrend: "increasing" | "stable" | "decreasing" | "no_data";
    avgRPE: number;
    restCompliance: number;
    recommendation: string;
}
/**
 * Per-exercise metrics during live session
 */
export interface LiveExerciseMetric {
    exerciseName: string;
    setsCompleted: number;
    totalSets: number;
    currentWeight: number | null;
    targetReps: number;
    avgRPE: number;
    rpeTrend: "increasing" | "stable" | "decreasing";
    fatigueLevel: number;
    recommendedAdjustment?: LiveAdjustment;
}
/**
 * Live adjustment request payload
 */
export interface LiveAdjustmentRequest {
    sessionId: string;
    currentWeight: number;
    targetReps: number;
    remainingSets: number;
    exerciseType: "squat" | "deadlift" | "bench_press" | "overhead_press" | "lunge" | "pull_up" | "row" | "other";
    isWarmup: boolean;
    hasSpotter: boolean;
    recentRPERecords: Array<{
        rpe: number;
        weight?: number;
        repsCompleted?: number;
        restTimeSeconds?: number;
        setNumber: number;
    }>;
}
/**
 * API response for live adjustment endpoint
 */
export interface LiveAdjustmentResponse {
    success: boolean;
    adjustment?: LiveAdjustment;
    fatigue?: FatigueAssessment;
    recommendedRest?: number;
    shouldEndWorkout?: boolean;
    endWorkoutReason?: string;
    endWorkoutSuggestion?: string;
}
/**
 * Set RPE log request
 */
export interface LogRPERequest {
    sessionId: string;
    setNumber: number;
    exerciseName: string;
    weight: number | null;
    plannedReps: number;
    completedReps: number;
    rpe: number;
    restTimeSeconds: number;
    notes?: string;
}
/**
 * Workout start request with live adjustment settings
 */
export interface StartLiveWorkoutRequest {
    workoutTemplateId?: string;
    name: string;
    exerciseType?: string;
    targetRPE?: number;
    idealRestSeconds?: number;
    hasSpotter?: boolean;
}
/**
 * Exercise type enum for live adjustment
 */
export type LiveExerciseType = "squat" | "deadlift" | "bench_press" | "overhead_press" | "lunge" | "pull_up" | "row" | "shoulder_press" | "bicep_curl" | "tricep_extension" | "leg_press" | "leg_extension" | "leg_curl" | "chest_fly" | "lat_pulldown" | "cable_row" | "dumbbell_row" | "hip_thrust" | "bulgarian_split_squat" | "other";
/**
 * Adjustment strategy based on workout phase
 */
export type AdjustmentStrategy = "aggressive" | "balanced" | "conservative" | "safety_first";
/**
 * Live workout session summary (for history/analytics)
 */
export interface LiveWorkoutSessionSummary {
    sessionId: string;
    userId: string;
    name: string;
    startedAt: number;
    completedAt: number;
    durationMs: number;
    totalSets: number;
    setsCompleted: number;
    totalVolume: number;
    avgRPE: number;
    maxRPE: number;
    fatiguePeak: number;
    adjustmentsApplied: number;
    earlyExit: boolean;
    earlyExitReason?: string;
}
/**
 * Fatigue trend analysis (for post-workout insights)
 */
export interface FatigueTrendAnalysis {
    userId: string;
    periodDays: number;
    avgSessionFatigue: number;
    fatigueAtEnd: number;
    restCompliance: number;
    adjustmentAcceptanceRate: number;
    commonTriggers: Array<{
        trigger: "high_rpe_trend" | "low_rest" | "high_volume" | "compound_exercise";
        count: number;
    }>;
    recommendations: string[];
}
/**
 * Notification for live workout adjustments
 */
export interface LiveAdjustmentNotification {
    sessionId: string;
    exerciseName: string;
    adjustment: LiveAdjustment;
    message: string;
    actionLabel: string;
    timestamp: number;
}
/**
 * Joint position with confidence score (2D or 3D)
 */
export interface SkeletonJoint {
    x: number;
    y: number;
    z?: number;
    confidence: number;
}
/**
 * Single frame of skeleton data
 */
export interface SkeletonFrame {
    frameNumber: number;
    timestampMs: number;
    joints: Record<string, SkeletonJoint>;
}
/**
 * Complete skeleton sequence for an exercise
 */
export interface SkeletonData {
    exerciseType: "squat" | "deadlift" | "bench_press" | "overhead_press" | "lunge";
    frames: SkeletonFrame[];
    metadata: {
        fps: number;
        resolutionWidth: number;
        resolutionHeight: number;
        totalFrames: number;
    };
}
/**
 * Detected form deviation from posture analysis
 */
export interface FormDeviation {
    joint: string;
    issueType: string;
    severity: "minor" | "moderate" | "major";
    confidence: number;
    timestampMs: number;
    actualValue: number;
    expectedRange: string;
    description: string;
    cue: string;
}
/**
 * Complete posture analysis result
 */
export interface PostureAnalysisResult {
    overallScore: number;
    grade: "A" | "B" | "C" | "D" | "F";
    totalFramesAnalyzed: number;
    deviations: FormDeviation[];
    criticalWarnings: string[];
    exerciseSpecificNotes: string[];
    processingTimeMs: number;
}
/**
 * Keyframe extraction result
 */
export interface KeyframeExtraction {
    totalFrames: number;
    keyframeCount: number;
    keyframeIndices: number[];
    fps: number;
    strategy: "every_n" | "phase_based" | "motion_based";
}
/**
 * Real-time feedback for a single frame
 */
export interface RealtimePostureFeedback {
    isCritical: boolean;
    deviations: FormDeviation[];
    feedback: string[];
    timestamp: number;
}
export declare const AGENT_SYSTEM_PROMPTS: Record<NutritionAgentType, string>;
//# sourceMappingURL=index.d.ts.map