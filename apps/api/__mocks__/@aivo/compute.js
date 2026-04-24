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

module.exports = {
  FitnessCalculator,
  CorrelationAnalyzer,
  RecoveryCalculator,
};
