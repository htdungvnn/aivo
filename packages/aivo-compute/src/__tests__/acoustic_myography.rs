/// Integration tests for acoustic myography DSP functions
/// These tests verify the signal processing and fatigue detection algorithms

#[cfg(test)]
mod acoustic_myography_tests {
    use wasm_bindgen_test::*;
    use aivo_compute::AcousticMyography;
    use serde_json::from_str;

    wasm_bindgen_test_configure!(run_in_browser);

    /// Generate a synthetic sine wave for testing
    fn generate_sine_wave(frequency_hz: f64, duration_ms: u32, sample_rate: u32) -> Vec<i16> {
        let num_samples = (sample_rate as f64 * duration_ms as f64 / 1000.0).round() as usize;
        let mut samples = Vec::with_capacity(num_samples);

        for i in 0..num_samples {
            let t = i as f64 / sample_rate as f64;
            let value = (2.0 * PI * frequency_hz * t).sin();
            // Scale to i16 range
            let scaled = (value * 0.5 * 32767.0) as i16;
            samples.push(scaled);
        }

        samples
    }

    /// Generate white noise
    fn generate_noise(duration_ms: u32, sample_rate: u32, amplitude: f64) -> Vec<i16> {
        let num_samples = (sample_rate as f64 * duration_ms as f64 / 1000.0).round() as usize;
        let mut samples = Vec::with_capacity(num_samples);

        for _ in 0..num_samples {
            let value: f64 = rand::random::<f64>() * 2.0 - 1.0;
            let scaled = (value * amplitude * 32767.0) as i16;
            samples.push(scaled);
        }

        samples
    }

    #[wasm_bindgen_test]
    fn test_initialization() {
        let config_json = AcousticMyography::init().unwrap();
        let config: serde_json::Value = from_str(&config_json).unwrap();

        assert_eq!(config["sample_rate"], 8000);
        assert_eq!(config["chunk_duration_ms"], 500);
        assert!(config["bands"].as_array().unwrap().len() >= 3);
    }

    #[wasm_bindgen_test]
    fn test_recommended_config() {
        let config_json = AcousticMyography::get_recommended_config().unwrap();
        let config: serde_json::Value = from_str(&config_json).unwrap();

        assert_eq!(config["sample_rate"], 8000);
        assert_eq!(config["chunk_duration_ms"], 500);
    }

    #[wasm_bindgen_test]
    fn test_process_sine_wave_50hz() {
        // Generate 50 Hz sine wave (simulating muscle sound)
        let samples = generate_sine_wave(50.0, 500, 8000);

        let result_json = AcousticMyography::process_audio_chunk(&samples, 0).unwrap();
        let result: serde_json::Value = from_str(&result_json).unwrap();

        // Check all required fields exist
        assert!(result["rms_amplitude"].is_number());
        assert!(result["median_frequency"].is_number());
        assert!(result["frequency_bands"].is_array());
        assert!(result["spectral_entropy"].is_number());
        assert!(result["motor_unit_recruitment"].is_number());
        assert!(result["contraction_count"].is_number());
        assert!(result["signal_to_noise_ratio"].is_number());
        assert!(result["confidence"].is_number());
        assert!(result["is_valid"].is_bool());

        // Median frequency should be around 50 Hz
        let median_freq = result["median_frequency"].as_f64().unwrap();
        assert!(median_freq > 40.0 && median_freq < 60.0,
                "Median freq should be ~50 Hz, got {}", median_freq);
    }

    #[wasm_bindgen_test]
    fn test_process_sine_wave_80hz() {
        // 80 Hz sine wave
        let samples = generate_sine_wave(80.0, 500, 8000);

        let result_json = AcousticMyography::process_audio_chunk(&samples, 0).unwrap();
        let result: serde_json::Value = from_str(&result_json).unwrap();

        let median_freq = result["median_frequency"].as_f64().unwrap();
        assert!(median_freq > 70.0 && median_freq < 90.0,
                "Median freq should be ~80 Hz, got {}", median_freq);
    }

    #[wasm_bindgen_test]
    fn test_silence_returns_invalid() {
        // All zeros = silence
        let samples = vec![0i16; 4000]; // 500ms at 8kHz

        let result_json = AcousticMyography::process_audio_chunk(&samples, 0).unwrap();
        let result: serde_json::Value = from_str(&result_json).unwrap();

        assert!(!result["is_valid"].as_bool().unwrap());
        assert!(result["confidence"].as_f64().unwrap() < 0.5);
    }

    #[wasm_bindgen_test]
    fn test_noise_signal() {
        // White noise should have low confidence and invalid signal
        let mut samples = generate_noise(500, 8000, 0.3);
        // Add DC offset to simulate some baseline
        for sample in &mut samples {
            *sample = sample.wrapping_add(1000);
        }

        let result_json = AcousticMyography::process_audio_chunk(&samples, 0).unwrap();
        let result: serde_json::Value = from_str(&result_json).unwrap();

        // Noise should have low confidence
        assert!(result["confidence"].as_f64().unwrap() < 0.6);
    }

    #[wasm_bindgen_test]
    fn test_calibrate_baseline() {
        // Generate clean 60 Hz signal (resting muscle baseline)
        let samples = generate_sine_wave(60.0, 5000, 8000);

        let baseline_json = AcousticMyography::calibrate_baseline(&samples).unwrap();
        let baseline: serde_json::Value = from_str(&baseline_json).unwrap();

        assert!(baseline["median_frequency"].is_number());
        assert!(baseline["rms_amplitude"].is_number());
        assert!(baseline["spectral_entropy"].is_number());
        assert!(baseline["contraction_rate"].is_number());
        assert!(baseline["quality_score"].is_number());

        let median_freq = baseline["median_frequency"].as_f64().unwrap();
        assert!(median_freq > 50.0 && median_freq < 70.0,
                "Baseline median freq should be ~60 Hz, got {}", median_freq);
    }

    #[wasm_bindgen_test]
    fn test_fatigue_score_with_baseline() {
        // Create features for fresh muscle (high median freq)
        let fresh_features = serde_json::json!({
            "rms_amplitude": 0.1,
            "median_frequency": 75.0,
            "frequency_bands": [],
            "spectral_entropy": 0.6,
            "motor_unit_recruitment": 0.5,
            "contraction_count": 10,
            "signal_to_noise_ratio": 20.0,
            "confidence": 0.9,
            "is_valid": true,
        });

        // Create baseline (slightly higher median)
        let baseline = serde_json::json!({
            "median_frequency": 80.0,
            "rms_amplitude": 0.1,
            "spectral_entropy": 0.6,
            "contraction_rate": 0.5,
            "quality_score": 0.9,
        });

        let result_json = AcousticMyography::calculate_fatigue_score(
            &fresh_features.to_string(),
            Some(&baseline.to_string())
        ).unwrap();
        let result: serde_json::Value = from_str(&result_json).unwrap();

        // Fresh muscle should have low fatigue score
        let fatigue_level = result["fatigue_level"].as_f64().unwrap();
        assert!(fatigue_level < 20.0, "Fresh muscle should have low fatigue, got {}", fatigue_level);
        assert_eq!(result["fatigue_category"], "fresh");
    }

    #[wasm_bindgen_test]
    fn test_fatigue_score_fatigued() {
        // Fatigued muscle (lower median freq)
        let fatigued_features = serde_json::json!({
            "rms_amplitude": 0.15,
            "median_frequency": 55.0,  // 25 Hz shift from baseline
            "frequency_bands": [],
            "spectral_entropy": 0.4,
            "motor_unit_recruitment": 0.3,
            "contraction_count": 5,
            "signal_to_noise_ratio": 15.0,
            "confidence": 0.8,
            "is_valid": true,
        });

        let baseline = serde_json::json!({
            "median_frequency": 80.0,
            "rms_amplitude": 0.1,
            "spectral_entropy": 0.6,
            "contraction_rate": 0.5,
            "quality_score": 0.9,
        });

        let result_json = AcousticMyography::calculate_fatigue_score(
            &fatigued_features.to_string(),
            Some(&baseline.to_string())
        ).unwrap();
        let result: serde_json::Value = from_str(&result_json).unwrap();

        // 25 Hz shift should give high fatigue
        let fatigue_level = result["fatigue_level"].as_f64().unwrap();
        assert!(fatigue_level > 60.0, "Fatigued muscle should have high fatigue, got {}", fatigue_level);
        assert!(result["fatigue_category"] == "fatigued" || result["fatigue_category"] == "exhausted");
    }

    #[wasm_bindgen_test]
    fn test_is_exercise_signal() {
        // Clean 60 Hz signal should be detected as exercise
        let samples = generate_sine_wave(60.0, 500, 8000);
        let is_exercise = AcousticMyography::is_exercise_signal(&samples).unwrap();
        assert!(is_exercise);

        // Low frequency (5 Hz) should not be detected
        let low_samples = generate_sine_wave(5.0, 500, 8000);
        let is_exercise_low = AcousticMyography::is_exercise_signal(&low_samples).unwrap();
        assert!(!is_exercise_low);

        // High frequency (300 Hz) should not be detected
        let high_samples = generate_sine_wave(300.0, 500, 8000);
        let is_exercise_high = AcousticMyography::is_exercise_signal(&high_samples).unwrap();
        assert!(!is_exercise_high);
    }

    #[wasm_bindgen_test]
    fn test_band_energy_distribution() {
        // The process_audio_chunk should populate frequency bands
        let samples = generate_sine_wave(50.0, 500, 8000);
        let result_json = AcousticMyography::process_audio_chunk(&samples, 0).unwrap();
        let result: serde_json::Value = from_str(&result_json).unwrap();

        let bands = result["frequency_bands"].as_array().unwrap();
        assert!(!bands.is_empty());

        // Should have a "low" band containing most energy
        let low_band = bands.iter().find(|b| b["band"] == "low");
        assert!(low_band.is_some());

        let low_energy = low_band.unwrap()["normalized"].as_f64().unwrap();
        assert!(low_energy > 0.3, "Low band should have significant energy for 50 Hz signal");
    }

    #[wasm_bindgen_test]
    fn test_empty_input_error() {
        let empty: Vec<i16> = vec![];
        let result = AcousticMyography::process_audio_chunk(&empty, 0);
        assert!(result.is_err());

        let calib_result = AcousticMyography::calibrate_baseline(&empty);
        assert!(calib_result.is_err());
    }

    #[wasm_bindgen_test]
    fn test_sample_rate_constant() {
        assert_eq!(AcousticMyography::recommended_sample_rate(), 8000);
    }

    #[wasm_bindgen_test]
    fn test_chunk_duration_constant() {
        assert_eq!(AcousticMyography::recommended_chunk_duration_ms(), 500);
    }

    #[wasm_bindgen_test]
    fn test_fatigue_category_thresholds() {
        // Test different fatigue levels
        let high_features = serde_json::json!({
            "rms_amplitude": 0.15,
            "median_frequency": 40.0,
            "frequency_bands": [],
            "spectral_entropy": 0.3,
            "motor_unit_recruitment": 0.8,
            "contraction_count": 3,
            "signal_to_noise_ratio": 10.0,
            "confidence": 0.9,
            "is_valid": true,
        });

        let baseline = serde_json::json!({
            "median_frequency": 80.0,
            "rms_amplitude": 0.1,
            "spectral_entropy": 0.6,
            "contraction_rate": 0.5,
            "quality_score": 0.9,
        });

        // 40 Hz shift from 80 Hz baseline = high fatigue
        let result_json = AcousticMyography::calculate_fatigue_score(
            &high_features.to_string(),
            Some(&baseline.to_string())
        ).unwrap();
        let result: serde_json::Value = from_str(&result_json).unwrap();

        let category = result["fatigue_category"].as_str().unwrap();
        assert!(category == "exhausted" || category == "fatigued");
    }

    #[wasm_bindgen_test]
    fn test_motor_unit_recruitment_estimation() {
        // High RMS + high power in muscle band = high recruitment
        // Test by verifying the range is 0-1
        // This is implicitly tested in process_audio_chunk
        let samples = generate_sine_wave(60.0, 500, 8000);
        let result_json = AcousticMyography::process_audio_chunk(&samples, 0).unwrap();
        let result: serde_json::Value = from_str(&result_json).unwrap();

        let recruitment = result["motor_unit_recruitment"].as_f64().unwrap();
        assert!(recruitment >= 0.0 && recruitment <= 1.0,
                "Motor unit recruitment should be 0-1, got {}", recruitment);
    }

    #[wasm_bindgen_test]
    fn test_contraction_detection() {
        // Signal with clear peaks should detect contractions
        let mut samples = vec![0i16; 4000];
        // Add periodic bursts
        for i in 0..10 {
            let start = i * 400;
            for j in 0..100 {
                if start + j < samples.len() {
                    samples[start + j] = 15000; // High amplitude burst
                }
            }
        }

        let result_json = AcousticMyography::process_audio_chunk(&samples, 0).unwrap();
        let result: serde_json::Value = from_str(&result_json).unwrap();

        let contractions = result["contraction_count"].as_u64().unwrap();
        assert!(contractions >= 5, "Should detect multiple contractions, got {}", contractions);
    }
}
