/// Integration tests for biometric statistical functions
/// These tests verify the core correlation and anomaly detection algorithms

#[cfg(test)]
mod biometric_stats {
    use wasm_bindgen_test::*;
    use aivo_compute::{CorrelationAnalyzer, AnomalyPoint, DailyBiometricData};

    wasm_bindgen_test_configure!(run_in_browser);

    // Helper to create test data
    fn create_test_data() -> Vec<DailyBiometricData> {
        vec![
            DailyBiometricData {
                date: "2025-04-01".to_string(),
                exercise_load: 8.0,
                sleep_quality: 85.0,
                sleep_duration: 7.5,
                calories_consumed: 2200.0,
                protein_intake: 120.0,
                carb_intake: 250.0,
                fat_intake: 70.0,
                late_nutrition: 0.0,
                hydration: 2.5,
                recovery_score: 75.0,
                body_weight: 70.0,
                body_fat: 15.0,
                workout_intensity: 7.0,
                consecutive_days: 3,
            },
            DailyBiometricData {
                date: "2025-04-02".to_string(),
                exercise_load: 6.0,
                sleep_quality: 90.0,
                sleep_duration: 8.0,
                calories_consumed: 2100.0,
                protein_intake: 110.0,
                carb_intake: 230.0,
                fat_intake: 65.0,
                late_nutrition: 0.0,
                hydration: 2.8,
                recovery_score: 82.0,
                body_weight: 70.2,
                body_fat: 14.8,
                workout_intensity: 6.0,
                consecutive_days: 4,
            },
            DailyBiometricData {
                date: "2025-04-03".to_string(),
                exercise_load: 9.0,
                sleep_quality: 70.0,
                sleep_duration: 6.5,
                calories_consumed: 2400.0,
                protein_intake: 130.0,
                carb_intake: 280.0,
                fat_intake: 75.0,
                late_nutrition: 1.0,
                hydration: 2.0,
                recovery_score: 65.0,
                body_weight: 70.1,
                body_fat: 15.2,
                workout_intensity: 8.0,
                consecutive_days: 5,
            },
            DailyBiometricData {
                date: "2025-04-04".to_string(),
                exercise_load: 7.0,
                sleep_quality: 80.0,
                sleep_duration: 7.8,
                calories_consumed: 2150.0,
                protein_intake: 115.0,
                carb_intake: 240.0,
                fat_intake: 68.0,
                late_nutrition: 0.0,
                hydration: 2.6,
                recovery_score: 78.0,
                body_weight: 70.3,
                body_fat: 14.9,
                workout_intensity: 7.0,
                consecutive_days: 6,
            },
            DailyBiometricData {
                date: "2025-04-05".to_string(),
                exercise_load: 5.0,
                sleep_quality: 95.0,
                sleep_duration: 8.5,
                calories_consumed: 2050.0,
                protein_intake: 105.0,
                carb_intake: 220.0,
                fat_intake: 60.0,
                late_nutrition: 0.0,
                hydration: 3.0,
                recovery_score: 88.0,
                body_weight: 70.4,
                body_fat: 14.5,
                workout_intensity: 5.0,
                consecutive_days: 7,
            },
        ]
    }

    #[wasm_bindgen_test]
    fn test_pearson_correlation_positive() {
        // Test positive correlation: sleep_quality and recovery_score
        let data = create_test_data();
        let x: Vec<f64> = data.iter().map(|d| d.sleep_quality).collect();
        let y: Vec<f64> = data.iter().map(|d| d.recovery_score).collect();

        let (r, p_value) = CorrelationAnalyzer::pearson_correlation(&x, &y);

        // Should show positive correlation (better sleep → higher recovery)
        assert!(r > 0.0, "Expected positive correlation, got r={}", r);
        assert!(r <= 1.0, "r should be <= 1.0, got {}", r);
        assert!(p_value >= 0.0 && p_value <= 1.0, "p_value should be 0-1, got {}", p_value);
    }

    #[wasm_bindgen_test]
    fn test_pearson_correlation_negative() {
        // Test negative correlation: exercise_load (negative impact) with recovery_score
        let data = create_test_data();
        let x: Vec<f64> = data.iter().map(|d| d.exercise_load).collect();
        let y: Vec<f64> = data.iter().map(|d| d.recovery_score).collect();

        let (r, p_value) = CorrelationAnalyzer::pearson_correlation(&x, &y);

        // Should show negative correlation (higher exercise load → lower recovery)
        assert!(r < 0.0, "Expected negative correlation, got r={}", r);
        assert!(r >= -1.0, "r should be >= -1.0, got {}", r);
    }

    #[wasm_bindgen_test]
    fn test_pearson_correlation_perfect_positive() {
        // Test perfect positive correlation
        let x = vec![1.0, 2.0, 3.0, 4.0, 5.0];
        let y = vec![2.0, 4.0, 6.0, 8.0, 10.0]; // y = 2x

        let (r, p_value) = CorrelationAnalyzer::pearson_correlation(&x, &y);

        assert!((r - 1.0).abs() < 0.001, "Expected r=1.0, got {}", r);
    }

    #[wasm_bindgen_test]
    fn test_pearson_correlation_perfect_negative() {
        // Test perfect negative correlation
        let x = vec![1.0, 2.0, 3.0, 4.0, 5.0];
        let y = vec![10.0, 8.0, 6.0, 4.0, 2.0]; // y = 12 - 2x

        let (r, p_value) = CorrelationAnalyzer::pearson_correlation(&x, &y);

        assert!((r + 1.0).abs() < 0.001, "Expected r=-1.0, got {}", r);
    }

    #[wasm_bindgen_test]
    fn test_pearson_correlation_no_correlation() {
        // Test no correlation
        let x = vec![1.0, 2.0, 3.0, 4.0, 5.0];
        let y = vec![5.0, 2.0, 8.0, 1.0, 9.0]; // Random

        let (r, p_value) = CorrelationAnalyzer::pearson_correlation(&x, &y);

        // r should be close to 0
        assert!(r.abs() < 0.5, "Expected small correlation, got {}", r);
    }

    #[wasm_bindgen_test]
    fn test_z_score_anomaly_detection() {
        let data = vec![10.0, 11.0, 10.5, 10.2, 9.8, 10.1, 25.0]; // 25 is an outlier
        let dates = vec![
            "2025-04-01".to_string(),
            "2025-04-02".to_string(),
            "2025-04-03".to_string(),
            "2025-04-04".to_string(),
            "2025-04-05".to_string(),
            "2025-04-06".to_string(),
            "2025-04-07".to_string(),
        ];

        let anomalies = CorrelationAnalyzer::detect_anomalies(&data, &dates, "test_factor", 2.0);

        // Should detect the outlier (25.0)
        assert_eq!(anomalies.len(), 1, "Expected 1 anomaly");
        assert_eq!(anomalies[0].date, "2025-04-07");
        assert_eq!(anomalies[0].factor, "test_factor");
        assert!(anomalies[0].z_score.abs() > 2.0, "Anomaly should have |z-score| > 2.0");
    }

    #[wasm_bindgen_test]
    fn test_z_score_anomaly_detection_multiple_outliers() {
        let data = vec![10.0, 11.0, 10.5, 25.0, 9.8, 26.0, 10.1];
        let dates = vec![
            "2025-04-01".to_string(),
            "2025-04-02".to_string(),
            "2025-04-03".to_string(),
            "2025-04-04".to_string(),
            "2025-04-05".to_string(),
            "2025-04-06".to_string(),
            "2025-04-07".to_string(),
        ];

        let anomalies = CorrelationAnalyzer::detect_anomalies(&data, &dates, "test_factor", 2.0);

        assert_eq!(anomalies.len(), 2, "Expected 2 anomalies");
    }

    #[wasm_bindgen_test]
    fn test_z_score_anomaly_detection_none() {
        let data = vec![10.0, 11.0, 10.5, 10.2, 9.8, 10.1, 10.3];
        let dates = vec![
            "2025-04-01".to_string(),
            "2025-04-02".to_string(),
            "2025-04-03".to_string(),
            "2025-04-04".to_string(),
            "2025-04-05".to_string(),
            "2025-04-06".to_string(),
            "2025-04-07".to_string(),
        ];

        let anomalies = CorrelationAnalyzer::detect_anomalies(&data, &dates, "test_factor", 2.0);

        assert_eq!(anomalies.len(), 0, "Expected no anomalies");
    }

    #[wasm_bindgen_test]
    fn test_recovery_score_calculation() {
        // Test recovery score with good inputs
        let score = CorrelationAnalyzer::calculate_recovery_score(
            85.0,  // sleep_quality (0-100)
            8.0,   // sleep_duration (hours)
            7.0,   // exercise_intensity (1-10)
            0.8,   // calories_adequate (0-1)
            0.9,   // hydration_adequate (0-1)
        );

        assert!(score >= 0.0 && score <= 100.0, "Score should be 0-100, got {}", score);
        assert!(score > 70.0, "Good inputs should yield high recovery score, got {}", score);
    }

    #[wasm_bindgen_test]
    fn test_recovery_score_poor_inputs() {
        // Test recovery score with poor inputs
        let score = CorrelationAnalyzer::calculate_recovery_score(
            40.0,  // poor sleep quality
            5.0,   // short sleep
            9.0,   // very intense exercise (negative impact)
            0.5,   // below adequate calories
            0.4,   // poor hydration
        );

        assert!(score >= 0.0 && score <= 100.0, "Score should be 0-100, got {}", score);
        assert!(score < 50.0, "Poor inputs should yield low recovery score, got {}", score);
    }

    #[wasm_bindgen_test]
    fn test_sleep_consistency() {
        // Consistent sleep: low std dev
        let durations = vec![7.5, 7.8, 7.3, 7.6, 7.4];
        let consistency = CorrelationAnalyzer::calculate_sleep_consistency(&durations);

        assert!(consistency > 80.0, "Consistent sleep should have high score, got {}", consistency);
    }

    #[wasm_bindgen_test]
    fn test_sleep_inconsistency() {
        // Inconsistent sleep: high std dev
        let durations = vec![5.0, 9.0, 6.0, 10.0, 4.0];
        let consistency = CorrelationAnalyzer::calculate_sleep_consistency(&durations);

        assert!(consistency < 50.0, "Inconsistent sleep should have low score, got {}", consistency);
    }

    #[wasm_bindgen_test]
    fn test_nutrition_consistency() {
        // Consistent calorie intake
        let calories = vec![2200.0, 2150.0, 2250.0, 2180.0, 2220.0];
        let target = 2200.0;
        let consistency = CorrelationAnalyzer::calculate_nutrition_consistency(&calories, target);

        assert!(consistency > 85.0, "Consistent nutrition should have high score, got {}", consistency);
    }

    #[wasm_bindgen_test]
    fn test_nutrition_inconsistency() {
        // Variable calorie intake
        let calories = vec![1500.0, 3000.0, 1800.0, 3500.0, 1600.0];
        let target = 2200.0;
        let consistency = CorrelationAnalyzer::calculate_nutrition_consistency(&calories, target);

        assert!(consistency < 50.0, "Inconsistent nutrition should have low score, got {}", consistency);
    }

    #[wasm_bindgen_test]
    fn test_analyze_correlations_minimum_data() {
        // Need at least 7 days for analysis
        let mut data = create_test_data();
        // Only 5 days - below minimum
        data.truncate(5);

        let result = CorrelationAnalyzer::analyze_correlations(
            &serde_json::to_string(&data).unwrap(),
            7,
            Some(2.5)
        ).unwrap();

        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();

        // Should still work but with minimal correlations
        assert!(parsed["total_correlations"].as_i64().unwrap() >= 0);
    }

    #[wasm_bindgen_test]
    fn test_analyze_correlations_7_days() {
        let data = create_test_data();

        let result = CorrelationAnalyzer::analyze_correlations(
            &serde_json::to_string(&data).unwrap(),
            7,
            Some(2.5)
        ).unwrap();

        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();

        assert!(parsed["period_days"].as_i64().unwrap() == 7);
        assert!(parsed["total_correlations"].as_i64().unwrap() >= 0);
        assert!(parsed["summary"].as_str().unwrap().len() > 0);
    }

    #[wasm_bindgen_test]
    fn test_analyze_correlations_30_days() {
        let data = create_test_data();

        let result = CorrelationAnalyzer::analyze_correlations(
            &serde_json::to_string(&data).unwrap(),
            30,
            Some(3.0)  // Higher anomaly threshold
        ).unwrap();

        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();

        assert!(parsed["period_days"].as_i64().unwrap() == 30);
        assert!(parsed["anomaly_threshold"].as_f64().unwrap() == 3.0);
    }

    #[wasm_bindgen_test]
    fn test_significance_threshold_small_n() {
        // With n < 10, need |r| > 0.7 for significance
        let x = vec![1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0]; // n=9
        let y = x.clone(); // Perfect correlation

        let significant = CorrelationAnalyzer::is_significant(1.0, 9);
        assert!(significant, "Perfect correlation with n=9 should be significant");
    }

    #[wasm_bindgen_test]
    fn test_significance_threshold_medium_n() {
        // With n >= 10, need |r| > 0.5 for significance
        let x = vec![1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0]; // n=10
        let y = x.clone();

        let significant = CorrelationAnalyzer::is_significant(0.6, 10);
        assert!(significant, "r=0.6 with n=10 should be significant");

        let not_significant = CorrelationAnalyzer::is_significant(0.4, 10);
        assert!(!not_significant, "r=0.4 with n=10 should not be significant");
    }

    #[wasm_bindgen_test]
    fn test_confidence_calculation() {
        let confidence_small = CorrelationAnalyzer::calculate_confidence(0.8, 30);
        let confidence_large = CorrelationAnalyzer::calculate_confidence(0.8, 100);

        // Larger sample size should yield higher confidence
        assert!(confidence_large > confidence_small, "Larger n should increase confidence");
    }

    #[wasm_bindgen_test]
    fn test_correlation_result_structure() {
        let result = CorrelationAnalyzer::analyze_correlations(
            &serde_json::to_string(&create_test_data()).unwrap(),
            7,
            Some(2.5)
        ).unwrap();

        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();

        // Check all required fields exist
        assert!(parsed["period_days"].is_number());
        assert!(parsed["aggregates"]["sleep"]["avg_duration"].is_number());
        assert!(parsed["aggregates"]["exercise"]["total_workouts"].is_number());
        assert!(parsed["aggregates"]["nutrition"]["consistency_score"].is_number());
        assert!(parsed["recovery_score"].is_number());
        assert!(parsed["warnings"].is_array());
        assert!(parsed["correlations"].is_array());
        assert!(parsed["correlation_count"].is_number());
        assert!(parsed["significant_count"].is_number());
        assert!(parsed["summary"].is_string());
    }

    #[wasm_bindgen_test]
    fn test_outlier_direction_detection() {
        // Test anomaly point direction
        let data = vec![10.0, 11.0, 10.5, 25.0]; // High outlier
        let dates = vec!["d1".to_string(), "d2".to_string(), "d3".to_string(), "d4".to_string()];
        let anomalies = CorrelationAnalyzer::detect_anomalies(&data, &dates, "test", 2.0);

        assert_eq!(anomalies[0].deviation_direction, "high");
        assert!(anomalies[0].observed_value > anomalies[0].expected_value);
    }

    #[wasm_bindgen_test]
    fn test_outlier_low_direction() {
        // Test low outlier
        let data = vec![10.0, 11.0, 10.5, 2.0]; // Low outlier
        let dates = vec!["d1".to_string(), "d2".to_string(), "d3".to_string(), "d4".to_string()];
        let anomalies = CorrelationAnalyzer::detect_anomalies(&data, &dates, "test", 2.0);

        assert_eq!(anomalies[0].deviation_direction, "low");
        assert!(anomalies[0].observed_value < anomalies[0].expected_value);
    }
}
