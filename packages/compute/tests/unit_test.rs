#[cfg(test)]
mod tests {
    use super::*;
    use aivo_compute::fitness::FitnessCalculator;

    #[test]
    fn test_calculate_1rm_epley() {
        // 100kg for 10 reps → 1RM ≈ 133kg
        let result = FitnessCalculator::calculate_one_rep_max(100.0, 10.0);
        assert!(result > 130.0 && result < 140.0);
    }

    #[test]
    fn test_calculate_1rm_brzycki() {
        // 100kg for 10 reps → 1RM ≈ 125kg (Brzycki is more conservative)
        let result = FitnessCalculator::calculate_one_rep_max_brzycki(100.0, 10.0);
        assert!(result > 120.0 && result < 130.0);
    }

    #[test]
    fn test_calculate_1rm_single_rep() {
        // 1 rep max should equal weight
        let result = FitnessCalculator::calculate_one_rep_max(100.0, 1.0);
        assert!((result - 100.0).abs() < 0.01);
    }

    #[test]
    fn test_calculate_bmr_male() {
        // 75kg, 180cm, 30 years, male → ~1750 kcal
        let result = FitnessCalculator::calculate_bmr(75.0, 180.0, 30.0, true);
        assert!(result > 1700.0 && result < 1800.0);
    }

    #[test]
    fn test_calculate_bmr_female() {
        // 60kg, 165cm, 25 years, female → ~1350 kcal
        let result = FitnessCalculator::calculate_bmr(60.0, 165.0, 25.0, false);
        assert!(result > 1300.0 && result < 1400.0);
    }

    #[test]
    fn test_calculate_tdee() {
        // BMR 1750 × moderate (1.55) ≈ 2712.5 kcal
        let result = FitnessCalculator::calculate_tdee(1750.0, "moderate");
        assert!((result - 2712.5).abs() < 1.0);
    }

    #[test]
    fn test_calculate_target_calories_maintenance() {
        let result = FitnessCalculator::calculate_target_calories(2700.0, "maintain");
        assert_eq!(result, 2700.0);
    }

    #[test]
    fn test_calculate_target_calories_weight_loss() {
        let result = FitnessCalculator::calculate_target_calories(2700.0, "lose");
        assert_eq!(result, 2200.0); // 2700 - 500
    }

    #[test]
    fn test_calculate_target_calories_weight_gain() {
        let result = FitnessCalculator::calculate_target_calories(2700.0, "gain");
        assert_eq!(result, 3200.0); // 2700 + 500
    }

    #[test]
    fn test_edge_case_zero_weight() {
        // Should handle gracefully without panic
        let result = FitnessCalculator::calculate_bmr(0.0, 180.0, 30.0, true);
        assert!(result.is_finite());
    }

    #[test]
    fn test_edge_case_very_high_reps() {
        // 20+ reps should still produce valid result
        let result = FitnessCalculator::calculate_one_rep_max(100.0, 20.0);
        assert!(result > 100.0); // Should be > weight
        assert!(result < 150.0); // But not unreasonably high
    }
}
