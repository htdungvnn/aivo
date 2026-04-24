// Mock for @aivo/optimizer WASM package
const WorkoutOptimizer = {
  new: jest.fn().mockImplementation(() => ({
    optimize: jest.fn().mockReturnValue({ score: 85, schedule: [] }),
    calculate_deviation: jest.fn().mockReturnValue({ overallScore: 10, deviations: [] }),
    generate_optimization_suggestions: jest.fn().mockReturnValue([]),
  })),
};

module.exports = {
  WorkoutOptimizer,
};
