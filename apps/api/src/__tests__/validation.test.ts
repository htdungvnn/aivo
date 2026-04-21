import { BodyMetricsValidator } from '../validation';

describe('BodyMetricsValidator', () => {
  describe('validateWeight', () => {
    it('validates normal weight', () => {
      const result = BodyMetricsValidator.validateWeight(
        70, 175, 25, 'male', 'intermediate'
      );
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects negative weight', () => {
      const result = BodyMetricsValidator.validateWeight(
        -10, 175, 25, 'male', 'intermediate'
      );
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Weight must be positive');
    });

    it('warns on very low weight', () => {
      const result = BodyMetricsValidator.validateWeight(
        25, 175, 25, 'male', 'intermediate'
      );
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Weight seems too low for a healthy adult');
    });

    it('warns on very high weight', () => {
      const result = BodyMetricsValidator.validateWeight(
        350, 175, 25, 'male', 'intermediate'
      );
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Weight seems too high - please verify');
    });

    it('considers BMI for underweight warning', () => {
      const result = BodyMetricsValidator.validateWeight(
        45, 175, 25, 'male', 'intermediate'
      );
      expect(result.warnings).toContain('BMI indicates underweight - consider consulting a nutritionist');
    });

    it('considers BMI for obese warning', () => {
      const result = BodyMetricsValidator.validateWeight(
        120, 175, 25, 'male', 'intermediate'
      );
      expect(result.warnings).toContain('BMI indicates obese category - consider consulting a healthcare provider');
    });

    it('provides gender-specific warnings', () => {
      const maleResult = BodyMetricsValidator.validateWeight(
        45, 175, 25, 'male', 'intermediate'
      );
      expect(maleResult.warnings.some(w => w.includes('male'))).toBe(true);

      const femaleResult = BodyMetricsValidator.validateWeight(
        35, 165, 25, 'female', 'intermediate'
      );
      expect(femaleResult.warnings.some(w => w.includes('female'))).toBe(true);
    });
  });

  describe('validateBodyFat', () => {
    it('validates normal body fat', () => {
      const result = BodyMetricsValidator.validateBodyFat(
        0.15, 25, 'male', 'intermediate'
      );
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects body fat above 100%', () => {
      const result = BodyMetricsValidator.validateBodyFat(
        1.5, 25, 'male', 'intermediate'
      );
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Body fat percentage must be between 0 and 100');
    });

    it('rejects body fat below essential minimum', () => {
      const result = BodyMetricsValidator.validateBodyFat(
        0.01, 25, 'male', 'intermediate'
      );
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Body fat cannot be below 2% (essential fat)');
    });

    it('has different essential minimum for females', () => {
      const result = BodyMetricsValidator.validateBodyFat(
        0.05, 25, 'female', 'intermediate'
      );
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Body fat cannot be below 10% (essential fat)');
    });

    it('warns on obese range body fat', () => {
      const result = BodyMetricsValidator.validateBodyFat(
        0.35, 25, 'male', 'intermediate'
      );
      expect(result.warnings).toContain('Body fat percentage is in the obese range');
    });

    it('warns on above athletic range', () => {
      const result = BodyMetricsValidator.validateBodyFat(
        0.18, 25, 'male', 'intermediate'
      );
      expect(result.warnings).toContain('Body fat is above athletic/fitness range');
    });

    it('considers age for body fat evaluation', () => {
      const result = BodyMetricsValidator.validateBodyFat(
        0.10, 50, 'male', 'intermediate'
      );
      expect(result.warnings).toContain('Body fat seems very low for your age group');
    });
  });

  describe('validateMuscleMass', () => {
    it('validates normal muscle mass', () => {
      const result = BodyMetricsValidator.validateMuscleMass(
        30, 70, 175, 'male'
      );
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects negative muscle mass', () => {
      const result = BodyMetricsValidator.validateMuscleMass(
        -5, 70, 175, 'male'
      );
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Muscle mass must be positive');
    });

    it('rejects muscle mass exceeding weight', () => {
      const result = BodyMetricsValidator.validateMuscleMass(
        80, 70, 175, 'male'
      );
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Muscle mass cannot exceed total body weight');
    });

    it('warns on unusually low muscle mass ratio', () => {
      const result = BodyMetricsValidator.validateMuscleMass(
        15, 70, 175, 'male'
      );
      // 15/70 = 0.21, typical min is 0.15 (0.30 * 0.5)
      expect(result.warnings).toContain('Muscle mass seems unusually low');
    });

    it('warns on unusually high muscle mass', () => {
      const result = BodyMetricsValidator.validateMuscleMass(
        55, 70, 175, 'male'
      );
      // 55/70 = 0.79, typical max is 0.40, 0.40 * 1.2 = 0.48
      expect(result.warnings).toContain('Muscle mass seems unusually high for your weight');
    });
  });

  describe('validateCompleteMetrics', () => {
    it('validates all metrics together when all valid', () => {
      const result = BodyMetricsValidator.validateCompleteMetrics({
        weight: 70,
        height: 175,
        age: 25,
        gender: 'male',
        fitnessLevel: 'intermediate',
        bodyFatPercentage: 0.15,
        muscleMass: 30,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('aggregates errors from all validations', () => {
      const result = BodyMetricsValidator.validateCompleteMetrics({
        weight: -10,
        height: 175,
        age: 25,
        gender: 'male',
        fitnessLevel: 'intermediate',
        bodyFatPercentage: 1.5,
        muscleMass: -5,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Weight must be positive');
      expect(result.errors).toContain('Body fat percentage must be between 0 and 100');
      expect(result.errors).toContain('Muscle mass must be positive');
    });

    it('detects inconsistent metric combination', () => {
      const result = BodyMetricsValidator.validateCompleteMetrics({
        weight: 70,
        height: 175,
        age: 25,
        gender: 'male',
        fitnessLevel: 'intermediate',
        bodyFatPercentage: 0.05, // 5% body fat
        muscleMass: 65, // 65/70 = 93% muscle, impossible
      });

      expect(result.valid).toBe(false);
      expect(result.warnings).toContain(
        'The combination of weight, body fat, and muscle mass seems inconsistent'
      );
      expect(result.suggestions).toContain(
        'Ensure these measurements were taken at the same time with consistent methodology'
      );
    });

    it('handles partial metrics (only weight)', () => {
      const result = BodyMetricsValidator.validateCompleteMetrics({
        weight: 70,
        height: 175,
        age: 25,
        gender: 'male',
        fitnessLevel: 'intermediate',
      });

      expect(result.valid).toBe(true);
    });

    it('handles partial metrics with errors', () => {
      const result = BodyMetricsValidator.validateCompleteMetrics({
        weight: -10,
        height: 175,
        age: 25,
        gender: 'male',
        fitnessLevel: 'intermediate',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Weight must be positive');
    });

    it('aggregates warnings from all validations', () => {
      const result = BodyMetricsValidator.validateCompleteMetrics({
        weight: 35, // Very low
        height: 175,
        age: 25,
        gender: 'male',
        fitnessLevel: 'intermediate',
        bodyFatPercentage: 0.02, // Very low
        muscleMass: 20, // Very low ratio
      });

      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('handles zero values', () => {
      const result = BodyMetricsValidator.validateCompleteMetrics({
        weight: 0,
        height: 175,
        age: 25,
        gender: 'male',
        fitnessLevel: 'intermediate',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Weight must be positive');
    });

    it('handles boundary body fat (0 and 1)', () => {
      const result0 = BodyMetricsValidator.validateBodyFat(0, 25, 'male', 'intermediate');
      expect(result0.valid).toBe(false);

      const result1 = BodyMetricsValidator.validateBodyFat(1, 25, 'male', 'intermediate');
      expect(result1.valid).toBe(false);
    });

    it('handles extremely high muscle mass', () => {
      const result = BodyMetricsValidator.validateMuscleMass(
        100, 70, 175, 'male'
      );
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Muscle mass cannot exceed total body weight');
    });

    it('handles very young and old ages', () => {
      const youngResult = BodyMetricsValidator.validateWeight(
        50, 170, 16, 'male', 'intermediate'
      );
      expect(youngResult.valid).toBe(true);

      const oldResult = BodyMetricsValidator.validateWeight(
        70, 170, 80, 'male', 'intermediate'
      );
      expect(oldResult.valid).toBe(true);
    });
  });
});
