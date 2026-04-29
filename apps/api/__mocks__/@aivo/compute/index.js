// Mock for @aivo/compute WASM package
const FitnessCalculator = {
  calculateBMI: jest.fn().mockImplementation((weight, height) => {
    // height in cm, convert to meters
    const heightInM = height / 100;
    return weight / (heightInM * heightInM);
  }),
  getBMICategory: jest.fn().mockImplementation((bmi) => {
    if (bmi < 18.5) return 'underweight';
    if (bmi < 25) return 'normal';
    if (bmi < 30) return 'overweight';
    return 'obese';
  }),
  calculateBodyFat: jest.fn().mockReturnValue(15),
  calculateMuscleBalance: jest.fn().mockReturnValue(80),
  estimate_body_fat_from_bmi: jest.fn().mockReturnValue(18),
  calculate_lean_body_mass: jest.fn().mockReturnValue(60),
  calculate_health_score: jest.fn().mockReturnValue(75),
  calculate_tdee: jest.fn().mockReturnValue(2500),
  calculate_target_calories: jest.fn().mockReturnValue(2000),
  calculate_one_rep_max: jest.fn().mockReturnValue(100),
};

const CorrelationAnalyzer = {
  pearson_correlation: jest.fn().mockReturnValue({ r: 0.5, p_value: 0.01 }),
  calculate_consistency_score: jest.fn().mockReturnValue(75),
  detect_anomalies: jest.fn().mockReturnValue([]),
};

const RecoveryCalculator = {
  calculate_recovery_score: jest.fn().mockReturnValue(80),
  calculate_stress_score: jest.fn().mockReturnValue(30),
};

// Additional classes for new features
const AdaptivePlanner = {
  calculateDeviationScore: jest.fn().mockReturnValue({
    overallScore: 75,
    trend: 'stable',
    completionRate: 0.85,
    missedWorkouts: 1,
    averageRPE: 7.5,
  }),
  analyzeRecoveryCurve: jest.fn().mockReturnValue({
    overallRecoveryScore: 80,
    recommendedRestDays: 1,
    canTrainIntensity: 'moderate',
    profiles: [],
  }),
  shouldReschedule: jest.fn().mockReturnValue(false),
};

const VoiceParser = {
  parseVoiceEntry: jest.fn().mockReturnValue(JSON.stringify({
    hasFood: false,
    hasWorkout: true,
    hasBodyMetric: false,
    foodEntries: [],
    workoutEntries: [{ exerciseName: 'Push-ups', sets: 3, reps: 10 }],
    bodyMetrics: [],
    overallConfidence: 0.9,
    needsClarification: false,
    clarificationQuestions: [],
  })),
};

const AvatarMorpher = {
  generateAvatar: jest.fn().mockReturnValue('avatar-data'),
  updateBodyMetrics: jest.fn().mockReturnValue({ updated: true }),
};

const MetabolicTwin = {
  calculateTDEE: jest.fn().mockReturnValue(2500),
  calculateBMR: jest.fn().mockReturnValue(1800),
  estimate_body_fat: jest.fn().mockReturnValue(15),
};

const PostureAnalyzer = {
  analyzePosture: jest.fn().mockReturnValue({
    score: 85,
    issues: [],
    recommendations: ['Improve shoulder alignment'],
  }),
};

const LiveWorkoutAdjuster = {
  adjustWorkout: jest.fn().mockReturnValue({
    adjusted: true,
    newExercises: [],
  }),
};

const StreakCalculator = {
  calculateStreak: jest.fn().mockReturnValue(7),
};

const TokenOptimizer = {
  optimizeTokens: jest.fn().mockReturnValue({
    originalTokens: 1000,
    optimizedTokens: 800,
    savings: 20,
  }),
};

const ShareCardGenerator = {
  generateCard: jest.fn().mockReturnValue('card-data'),
};

const ImageProcessor = {
  generateBodyHeatmap: jest.fn().mockReturnValue('heatmap-data'),
};

const LeaderboardEngine = {
  getLeaderboard: jest.fn().mockReturnValue([]),
};

const MacroAdjuster = {
  adjustMacros: jest.fn().mockReturnValue({ adjusted: true }),
};

module.exports = {
  FitnessCalculator,
  CorrelationAnalyzer,
  RecoveryCalculator,
  AdaptivePlanner,
  VoiceParser,
  AvatarMorpher,
  MetabolicTwin,
  PostureAnalyzer,
  LiveWorkoutAdjuster,
  StreakCalculator,
  TokenOptimizer,
  ShareCardGenerator,
  ImageProcessor,
  LeaderboardEngine,
  MacroAdjuster,
};
