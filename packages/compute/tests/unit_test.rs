#[cfg(test)]
mod tests {
    use super::*;
    use aivo_compute::fitness::{calculate_1rm, calculate_bmr, calculate_tdee, calculate_macros};

    #[test]
    fn test_calculate_1rm_epley() {
        // 100kg for 10 reps → 1RM ≈ 133kg
        let result = calculate_1rm(100.0, 10, "epley");
        assert!(result > 130.0 && result < 140.0);
    }

    #[test]
    fn test_calculate_1rm_brzycki() {
        // 100kg for 10 reps → 1RM ≈ 125kg (Brzycki is more conservative)
        let result = calculate_1rm(100.0, 10, "brzycki");
        assert!(result > 120.0 && result < 130.0);
    }

    #[test]
    fn test_calculate_1rm_single_rep() {
        // 1 rep max should equal weight
        let result = calculate_1rm(100.0, 1, "epley");
        assert!((result - 100.0).abs() < 0.01);
    }

    #[test]
    fn test_calculate_bmr_male() {
        // 75kg, 180cm, 30 years, male → ~1750 kcal
        let result = calculate_bmr(75.0, 180.0, 30, "male");
        assert!(result > 1700.0 && result < 1800.0);
    }

    #[test]
    fn test_calculate_bmr_female() {
        // 60kg, 165cm, 25 years, female → ~1350 kcal
        let result = calculate_bmr(60.0, 165.0, 25, "female");
        assert!(result > 1300.0 && result < 1400.0);
    }

    #[test]
    fn test_calculate_tdee() {
        // BMR 1750 × 1.55 (moderately active) ≈ 2710 kcal
        let result = calculate_tdee(1750.0, 1.55);
        assert!((result - 2712.5).abs() < 1.0);
    }

    #[test]
    fn test_calculate_macros_maintenance() {
        let macros = calculate_macros(2700.0, "maintain", 0.3, 0.25);
        assert_eq!(macros.calories, 2700);
        assert!(macros.protein_g > 0);
        assert!(macros.carbs_g > 0);
        assert!(macros.fat_g > 0);
        // Verify macros sum to calories
        let total_cal = macros.protein_g * 4 + macros.carbs_g * 4 + macros.fat_g * 9;
        assert!((total_cal - macros.calories).abs() < 100); // Allow rounding variance
    }

    #[test]
    fn test_calculate_macros_weight_loss() {
        let macros = calculate_macros(2700.0, "lose", 0.3, 0.25);
        assert_eq!(macros.calories, 2200); // 2700 - 500
    }

    #[test]
    fn test_calculate_macros_weight_gain() {
        let macros = calculate_macros(2700.0, "gain", 0.3, 0.25);
        assert_eq!(macros.calories, 3200); // 2700 + 500
    }

    #[test]
    fn test_edge_case_zero_weight() {
        // Should handle gracefully without panic
        let result = calculate_bmr(0.0, 180.0, 30, "male");
        assert!(result.is_finite());
    }

    #[test]
    fn test_edge_case_very_high_reps() {
        // 20+ reps should still produce valid result
        let result = calculate_1rm(100.0, 20, "epley");
        assert!(result > 100.0); // Should be > weight
        assert!(result < 150.0); // But not unreasonably high
    }
}
