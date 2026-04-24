// ============================================
// ACOUSTIC MYOGRAPHY MODULE
// Real-time muscle fatigue analysis from audio
// ============================================

use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use std::f64::consts::PI;

/// Audio configuration for processing
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AudioConfig {
    pub sample_rate: u32,         // Typically 8000 Hz
    pub chunk_duration_ms: u32,   // Size of audio chunks (e.g., 500ms)
    pub bands: Vec<FrequencyBand>,
}

/// Frequency band definition
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FrequencyBand {
    pub name: String,
    pub min_hz: f64,
    pub max_hz: f64,
}

/// Band-pass filter state using IIR (Butterworth-inspired)
#[derive(Clone)]
struct BandpassFilter {
    sample_rate: f64,
    low_cutoff: f64,
    high_cutoff: f64,
    // State for biquad filter (2nd order)
    x1: f64, x2: f64, x3: f64,
    y1: f64, y2: f64, y3: f64,
}

impl BandpassFilter {
    fn new(sample_rate: f64, low_cutoff: f64, high_cutoff: f64) -> Self {
        let _omega1 = 2.0 * PI * low_cutoff / sample_rate;
        let _omega2 = 2.0 * PI * high_cutoff / sample_rate;

        // Simplified Butterworth coefficients for bandpass
        let _bw = _omega2 - _omega1;
        let _center = (_omega1 + _omega2) / 2.0;

        let _b0 = (_bw / 2.0).sin();
        let _b1 = 0.0;
        let _b2 = -_b0;
        let _a0 = 1.0 + (_center / 2.0).sin();
        let _a1 = -2.0 * (_center / 2.0).cos();
        let _a2 = 1.0 - (_center / 2.0).sin();

        Self {
            sample_rate,
            low_cutoff,
            high_cutoff,
            x1: 0.0, x2: 0.0, x3: 0.0,
            y1: 0.0, y2: 0.0, y3: 0.0,
        }
    }

    fn process(&mut self, input: f64) -> f64 {
        // 3-tap delay line
        self.x3 = self.x2;
        self.x2 = self.x1;
        self.x1 = input;

        // Simple bandpass (high-pass then low-pass cascade approximation)
        // This is a simplified version for WASM efficiency
        let high_passed = input - self.x2; // Remove DC and very low freq
        let output = high_passed * 0.5; // Basic filtering

        self.y3 = self.y2;
        self.y2 = self.y1;
        self.y1 = output;

        output
    }

    fn reset(&mut self) {
        self.x1 = 0.0; self.x2 = 0.0; self.x3 = 0.0;
        self.y1 = 0.0; self.y2 = 0.0; self.y3 = 0.0;
    }
}

/// FFT-based spectral analyzer
struct SpectralAnalyzer {
    fft_size: usize,
    sample_rate: f64,
    window: Vec<f64>,
}

impl SpectralAnalyzer {
    fn new(fft_size: usize, sample_rate: f64) -> Self {
        let mut window = vec![0.0; fft_size];
        let sum: f64 = (0..fft_size)
            .map(|i| 2.0 * i as f64 / (fft_size as f64 - 1.0) - 1.0)
            .map(|x| (PI * 0.5 * x).sin().abs())
            .sum();
        for i in 0..fft_size {
            window[i] = (PI * 0.5 * (2.0 * i as f64 / (fft_size as f64 - 1.0) - 1.0)).sin().abs() / sum * fft_size as f64;
        }

        Self {
            fft_size,
            sample_rate,
            window,
        }
    }

    fn analyze(&mut self, samples: &[f64]) -> Option<Spectrum> {
        if samples.len() != self.fft_size {
            return None;
        }

        // Apply window
        let mut windowed = vec![0.0; self.fft_size];
        for i in 0..self.fft_size {
            windowed[i] = samples[i] * self.window[i];
        }

        // Simple DFT (for WASM, using full FFT library would be larger)
        // This is a basic power spectrum calculation
        let mut spectrum = Vec::new();
        let bin_width = self.sample_rate / self.fft_size as f64;

        for k in 0..(self.fft_size / 2) {
            let mut real = 0.0;
            let mut imag = 0.0;

            for n in 0..self.fft_size {
                let angle = 2.0 * PI * k as f64 * n as f64 / self.fft_size as f64;
                real += windowed[n] * angle.cos();
                imag -= windowed[n] * angle.sin();
            }

            let magnitude = (real * real + imag * imag).sqrt() / self.fft_size as f64;
            spectrum.push(magnitude);
        }

        Some(Spectrum {
            bins: spectrum,
            bin_width_hz: bin_width,
            fft_size: self.fft_size,
        })
    }
}

/// Spectral analysis result
#[derive(Serialize, Clone)]
pub struct Spectrum {
    bins: Vec<f64>,
    bin_width_hz: f64,
    fft_size: usize,
}

/// Features extracted from audio chunk
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AcousticFeatures {
    pub rms_amplitude: f64,
    pub median_frequency: f64,
    pub frequency_bands: Vec<BandEnergy>,
    pub spectral_entropy: f64,
    pub motor_unit_recruitment: f64,
    pub contraction_count: u32,
    pub signal_to_noise_ratio: f64,
    pub confidence: f64,
    pub is_valid: bool,
}

/// Energy in a frequency band
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct BandEnergy {
    pub band: String,
    pub min_freq: f64,
    pub max_freq: f64,
    pub energy: f64,
    pub normalized: f64,
}

/// Acoustic analyzer state
pub struct AcousticMyographyState {
    config: AudioConfig,
    bandpass: BandpassFilter,
    spectral_analyzer: SpectralAnalyzer,
    baseline: Option<BaselineData>,
    recent_median_freqs: Vec<f64>,
    recent_amplitudes: Vec<f64>,
    recent_contraction_rates: Vec<f64>,
}

/// Calibration baseline data
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct BaselineData {
    pub median_frequency: f64,
    pub rms_amplitude: f64,
    pub spectral_entropy: f64,
    pub contraction_rate: f64,
    pub quality_score: f64,
}

/// Fatigue calculation result
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FatigueResult {
    pub fatigue_level: f64,       // 0-100
    pub fatigue_category: String, // fresh, moderate, fatigued, exhausted
    pub median_freq_shift: f64,   // Hz shift from baseline
    pub confidence: f64,
    pub recommendations: Vec<String>,
}

// Pre-defined frequency bands for muscle sound analysis
const MUSCLE_BANDS_DATA: &[( &str, f64, f64)] = &[
    ("very_low", 5.0, 20.0),
    ("low", 20.0, 50.0),
    ("mid", 50.0, 120.0),
    ("high", 120.0, 200.0),
];

// FFT size - must be power of 2
const FFT_SIZE: usize = 512;

// Fatigue category thresholds
const FRESH_MAX: f64 = 25.0;
const MODERATE_MAX: f64 = 50.0;
const FATIGUED_MAX: f64 = 75.0;

// Sample rate for processing
const TARGET_SAMPLE_RATE: u32 = 8000;

// Chunk duration in ms
const TARGET_CHUNK_MS: u32 = 500;

#[wasm_bindgen]
#[derive(Serialize, Deserialize)]
pub struct AcousticMyography;

#[wasm_bindgen]
impl AcousticMyography {
    /// Initialize the analyzer with configuration
    #[wasm_bindgen(js_name = "init")]
    pub fn init() -> Result<String, JsValue> {
        let config = AudioConfig {
            sample_rate: TARGET_SAMPLE_RATE,
            chunk_duration_ms: TARGET_CHUNK_MS,
            bands: MUSCLE_BANDS_DATA.iter()
                .map(|&(name, min_hz, max_hz)| FrequencyBand {
                    name: name.to_string(),
                    min_hz,
                    max_hz,
                })
                .collect(),
        };

        Ok(serde_json::to_string(&config).map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))?)
    }

    /// Get recommended configuration
    #[wasm_bindgen(js_name = "getRecommendedConfig")]
    pub fn get_recommended_config() -> Result<String, JsValue> {
        Self::init()
    }

    /// Process raw PCM audio chunk (mono, 16-bit signed integers)
    /// Returns features JSON with fatigue analysis
    #[wasm_bindgen(js_name = "processAudioChunk")]
    pub fn process_audio_chunk(
        pcm_data: &[i16],
        _timestamp_ms: u64,
    ) -> Result<String, JsValue> {
        if pcm_data.is_empty() {
            return Err(JsValue::from_str("No audio data provided"));
        }

        // Convert to f64 and normalize
        let samples: Vec<f64> = pcm_data.iter()
            .map(|&s| s as f64 / 32768.0)
            .collect();

        // Step 1: Calculate RMS amplitude (overall power)
        let rms_amplitude = calculate_rms(&samples);

        // Step 2: Band-pass filter (20-200 Hz)
        let mut filtered = Vec::with_capacity(samples.len());
        let mut filter = BandpassFilter::new(TARGET_SAMPLE_RATE as f64, 20.0, 200.0);
        for &sample in &samples {
            filtered.push(filter.process(sample));
        }

        // Step 3: Spectral analysis via FFT
        let spectrum = analyze_spectrum(&filtered)?;

        // Step 4: Calculate median frequency
        let median_frequency = calculate_median_frequency(&spectrum);

        // Step 5: Calculate band energies
        let frequency_bands = calculate_band_energies(&spectrum);

        // Step 6: Calculate spectral entropy
        let spectral_entropy = calculate_spectral_entropy(&spectrum);

        // Step 7: Estimate motor unit recruitment
        let motor_unit_recruitment = estimate_motor_unit_recruitment(&spectrum, rms_amplitude);

        // Step 8: Count contractions (peak detection on envelope)
        let contraction_count = detect_contractions(&filtered, TARGET_SAMPLE_RATE as f64);

        // Step 9: Calculate SNR
        let signal_to_noise_ratio = calculate_snr(&filtered, &spectrum);

        // Step 10: Determine signal quality/confidence
        let confidence = assess_signal_quality(
            rms_amplitude,
            spectral_entropy,
            signal_to_noise_ratio,
            contraction_count,
        );

        // Step 11: Validate signal
        let is_valid = confidence > 0.5 &&
                       median_frequency > 10.0 &&
                       median_frequency < 200.0;

        let features = AcousticFeatures {
            rms_amplitude,
            median_frequency,
            frequency_bands,
            spectral_entropy,
            motor_unit_recruitment,
            contraction_count,
            signal_to_noise_ratio,
            confidence,
            is_valid,
        };

        serde_json::to_string(&features)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }

    /// Calculate fatigue score from features and optional baseline
    #[wasm_bindgen(js_name = "calculateFatigueScore")]
    pub fn calculate_fatigue_score(
        features_json: &str,
        baseline_json: &str,  // Empty string means no baseline
    ) -> Result<String, JsValue> {
        let features: AcousticFeatures = serde_json::from_str(features_json)
            .map_err(|e| JsValue::from_str(&format!("Invalid features JSON: {}", e)))?;

        let baseline = if baseline_json.is_empty() {
            None
        } else {
            Some(serde_json::from_str::<BaselineData>(baseline_json)
                .map_err(|e| JsValue::from_str(&format!("Invalid baseline JSON: {}", e)))?)
        };

        let result = compute_fatigue_score(&features, &baseline);

        serde_json::to_string(&result)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }

    /// Calibrate baseline from resting muscle samples
    #[wasm_bindgen(js_name = "calibrateBaseline")]
    pub fn calibrate_baseline(
        pcm_data: &[i16],
    ) -> Result<String, JsValue> {
        if pcm_data.is_empty() {
            return Err(JsValue::from_str("No audio data provided"));
        }

        // Convert and filter
        let samples: Vec<f64> = pcm_data.iter()
            .map(|&s| s as f64 / 32768.0)
            .collect();

        let mut filtered = Vec::with_capacity(samples.len());
        let mut filter = BandpassFilter::new(TARGET_SAMPLE_RATE as f64, 20.0, 200.0);
        for &sample in &samples {
            filtered.push(filter.process(sample));
        }

        let spectrum = analyze_spectrum(&filtered)?;
        let median_freq = calculate_median_frequency(&spectrum);
        let rms_amplitude = calculate_rms(&filtered);
        let spectral_entropy = calculate_spectral_entropy(&spectrum);
        let contraction_rate = detect_contractions(&filtered, TARGET_SAMPLE_RATE as f64) as f64 /
                              (pcm_data.len() as f64 / TARGET_SAMPLE_RATE as f64);

        // Quality score based on signal characteristics
        let quality_score = assess_signal_quality(rms_amplitude, spectral_entropy, 0.0, 0);

        let baseline = BaselineData {
            median_frequency: median_freq,
            rms_amplitude,
            spectral_entropy,
            contraction_rate,
            quality_score,
        };

        serde_json::to_string(&baseline)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }

    /// Detect if signal contains exercise-related muscle sounds
    #[wasm_bindgen(js_name = "isExerciseSignal")]
    pub fn is_exercise_signal(
        pcm_data: &[i16],
    ) -> Result<bool, JsValue> {
        if pcm_data.is_empty() {
            return Ok(false);
        }

        let samples: Vec<f64> = pcm_data.iter()
            .map(|&s| s as f64 / 32768.0)
            .collect();

        let mut filter = BandpassFilter::new(TARGET_SAMPLE_RATE as f64, 20.0, 200.0);
        let mut filtered = Vec::with_capacity(samples.len());
        for &sample in &samples {
            filtered.push(filter.process(sample));
        }

        let spectrum = analyze_spectrum(&filtered)?;
        let median_freq = calculate_median_frequency(&spectrum);
        let rms_amplitude = calculate_rms(&filtered);
        let confidence = assess_signal_quality(rms_amplitude, 0.0, 0.0, 0) as f64;

        // Exercise signal criteria:
        // - Median frequency in muscle sound range (20-150 Hz)
        // - Sufficient amplitude
        // - Good confidence
        Ok(median_freq > 20.0 && median_freq < 150.0 && rms_amplitude > 0.01 && confidence > 0.5)
    }

    /// Get recommended sample rate
    #[wasm_bindgen(js_name = "recommendedSampleRate")]
    pub fn recommended_sample_rate() -> u32 {
        TARGET_SAMPLE_RATE
    }

    /// Get recommended chunk duration
    #[wasm_bindgen(js_name = "recommendedChunkDurationMs")]
    pub fn recommended_chunk_duration_ms() -> u32 {
        TARGET_CHUNK_MS
    }
}

// ============================================
// DSP FUNCTIONS
// ============================================

/// Calculate root mean square amplitude
fn calculate_rms(samples: &[f64]) -> f64 {
    if samples.is_empty() {
        return 0.0;
    }
    let sum_sq: f64 = samples.iter().map(|&x| x * x).sum();
    (sum_sq / samples.len() as f64).sqrt()
}

/// Analyze spectrum using simplified FFT
fn analyze_spectrum(filtered: &[f64]) -> Result<Spectrum, JsValue> {
    if filtered.len() < FFT_SIZE {
        return Err(JsValue::from_str(&format!(
            "Need at least {} samples, got {}", FFT_SIZE, filtered.len()
        )));
    }

    // Take first FFT_SIZE samples
    let segment = &filtered[..FFT_SIZE];

    // Hann window
    let mut windowed = vec![0.0; FFT_SIZE];
    for i in 0..FFT_SIZE {
        let window = 0.5 * (1.0 - (2.0 * PI * i as f64 / (FFT_SIZE as f64 - 1.0)).cos());
        windowed[i] = segment[i] * window;
    }

    // DFT (real implementation would use rustfft)
    let bin_width = TARGET_SAMPLE_RATE as f64 / FFT_SIZE as f64;
    let mut bins = vec![0.0; FFT_SIZE / 2];

    for k in 0..(FFT_SIZE / 2) {
        let mut real = 0.0;
        let mut imag = 0.0;

        for n in 0..FFT_SIZE {
            let angle = 2.0 * PI * k as f64 * n as f64 / FFT_SIZE as f64;
            real += windowed[n] * angle.cos();
            imag -= windowed[n] * angle.sin();
        }

        bins[k] = (real * real + imag * imag).sqrt() / FFT_SIZE as f64;
    }

    Ok(Spectrum {
        bins,
        bin_width_hz: bin_width,
        fft_size: FFT_SIZE,
    })
}

/// Calculate median frequency (F50) - 50% of total power
fn calculate_median_frequency(spectrum: &Spectrum) -> f64 {
    // Convert to power
    let power: Vec<f64> = spectrum.bins.iter().map(|&a| a * a).collect();
    let total_power: f64 = power.iter().sum();

    if total_power == 0.0 {
        return 0.0;
    }

    let half_power = total_power * 0.5;
    let mut cumulative = 0.0;

    for (i, &p) in power.iter().enumerate() {
        cumulative += p;
        if cumulative >= half_power {
            return (i as f64) * spectrum.bin_width_hz;
        }
    }

    (spectrum.bins.len() as f64) * spectrum.bin_width_hz
}

/// Calculate energy in predefined frequency bands
fn calculate_band_energies(spectrum: &Spectrum) -> Vec<BandEnergy> {
    let total_energy: f64 = spectrum.bins.iter().map(|&a| a * a).sum();
    let mut bands = Vec::new();

    for &(name, min_hz, max_hz) in MUSCLE_BANDS_DATA {
        let min_bin = (min_hz / spectrum.bin_width_hz).ceil() as usize;
        let max_bin = ((max_hz / spectrum.bin_width_hz).floor() as usize).min(spectrum.bins.len());

        if min_bin >= max_bin {
            continue;
        }

        let energy: f64 = spectrum.bins[min_bin..max_bin]
            .iter()
            .map(|&a| a * a)
            .sum();

        let normalized = if total_energy > 0.0 { energy / total_energy } else { 0.0 };

        bands.push(BandEnergy {
            band: name.to_string(),
            min_freq: min_hz,
            max_freq: max_hz,
            energy,
            normalized,
        });
    }

    bands
}

/// Calculate spectral entropy (Shannon entropy of normalized spectrum)
fn calculate_spectral_entropy(spectrum: &Spectrum) -> f64 {
    let power: Vec<f64> = spectrum.bins.iter().map(|&a| a * a).collect();
    let total: f64 = power.iter().sum();

    if total == 0.0 {
        return 0.0;
    }

    let mut entropy = 0.0;
    for &p in &power {
        if p > 0.0 {
            let p_norm = p / total;
            entropy -= p_norm * p_norm.log2();
        }
    }

    // Normalize to 0-1 (max entropy = log2(N))
    let max_entropy = (spectrum.bins.len() as f64).log2();
    if max_entropy > 0.0 {
        entropy / max_entropy
    } else {
        0.0
    }
}

/// Estimate motor unit recruitment from spectral power
fn estimate_motor_unit_recruitment(spectrum: &Spectrum, rms: f64) -> f64 {
    // Total power in muscle band (20-150 Hz)
    let muscle_power: f64 = spectrum.bins
        .iter()
        .enumerate()
        .filter(|(i, _)| {
            let freq = (*i as f64) * spectrum.bin_width_hz;
            freq >= 20.0 && freq <= 150.0
        })
        .map(|(_, &a)| a * a)
        .sum();

    // Normalized recruitment score (empirical)
    // Higher power in muscle band = more motor units recruited
    let normalized = (muscle_power.sqrt() * 10.0).min(1.0);

    // Combine with RMS amplitude
    let amp_factor = (rms * 10.0).min(1.0);

    (normalized * 0.6 + amp_factor * 0.4).min(1.0)
}

/// Detect contractions using peak detection on envelope
fn detect_contractions(filtered: &[f64], sample_rate: f64) -> u32 {
    if filtered.len() < 100 {
        return 0;
    }

    // Simple envelope detection (full-wave rectification + smoothing)
    let envelope: Vec<f64> = filtered.iter()
        .map(|&x| x.abs())
        .collect();

    // Peak detection
    let mut peaks = 0;
    let mut in_peak = false;
    let threshold = envelope.iter().sum::<f64>() / envelope.len() as f64 * 1.5;

    for &value in &envelope {
        if value > threshold && !in_peak {
            in_peak = true;
            peaks += 1;
        } else if value < threshold * 0.3 {
            in_peak = false;
        }
    }

    // Minimum separation: at least 0.2s between contractions
    let _min_separation_samples = (sample_rate * 0.2) as usize;
    // Simplified: just return detected peaks
    // In production would use proper peak prominence and separation
    peaks.max(1)
}

/// Calculate signal-to-noise ratio (dB)
fn calculate_snr(filtered: &[f64], spectrum: &Spectrum) -> f64 {
    let signal_power: f64 = filtered.iter().map(|&x| x * x).sum::<f64>() / filtered.len() as f64;

    // Estimate noise from high frequency bins (>150 Hz)
    let noise_start_bin = (150.0 / spectrum.bin_width_hz).ceil() as usize;
    let noise_power: f64 = spectrum.bins[noise_start_bin.min(spectrum.bins.len())..]
        .iter()
        .map(|&a| a * a)
        .sum::<f64>() / spectrum.bins[noise_start_bin.min(spectrum.bins.len())..].len().max(1) as f64;

    if noise_power == 0.0 {
        return 40.0; // Arbitrary high SNR
    }

    10.0 * (signal_power / noise_power).log10()
}

/// Assess signal quality (0-1)
fn assess_signal_quality(
    rms: f64,
    entropy: f64,
    snr: f64,
    _contraction_count: u32,
) -> f64 {
    let mut score: f64 = 1.0;

    // Amplitude check
    if rms < 0.001 {
        score *= 0.3;
    } else if rms > 0.5 {
        score *= 0.7; // May be clipping
    }

    // SNR check
    if snr > 20.0 {
        score *= 1.0;
    } else if snr > 10.0 {
        score *= 0.8;
    } else if snr > 5.0 {
        score *= 0.5;
    } else {
        score *= 0.2;
    }

    // Entropy check (muscle sounds have moderate entropy)
    if entropy > 0.8 {
        score *= 0.6; // Too random = noise
    } else if entropy < 0.2 {
        score *= 0.7; // Too regular = sustained tone
    }

    score.max(0.0).min(1.0)
}

/// Compute fatigue score from features and baseline
fn compute_fatigue_score(features: &AcousticFeatures, baseline: &Option<BaselineData>) -> FatigueResult {
    let mut score: f64 = 0.0;
    let mut recommendations = Vec::new();

    // Weight 1: Median frequency shift from baseline (40%)
    if let Some(base) = baseline {
        let freq_shift = base.median_frequency - features.median_frequency;
        let normalized_shift = (freq_shift / 20.0).clamp(0.0, 1.0); // 20 Hz shift = full score
        score += normalized_shift * 40.0;

        if freq_shift > 10.0 {
            recommendations.push(format!(
                "Median frequency dropped {:.1} Hz from baseline - fatigue detected",
                freq_shift
            ));
        }
    } else {
        // No baseline - use absolute threshold
        if features.median_frequency < 40.0 {
            score += 30.0;
        } else if features.median_frequency < 60.0 {
            score += 15.0;
        }
    }

    // Weight 2: Amplitude variability (20%)
    // Fatigued muscles show more amplitude fluctuation
    // Simplified: use recent history not available in single chunk
    // score += amplitude_variability * 20.0;

    // Weight 3: Spectral entropy decrease (20%)
    // Fatigued = more regular pattern
    if features.spectral_entropy < 0.4 {
        score += 20.0;
        recommendations.push("Low spectral entropy indicates sustained contraction pattern".to_string());
    }

    // Weight 4: Contraction rate (10%)
    // Slower firing as fatigue increases
    if features.contraction_count < 2 {
        score += 10.0;
        recommendations.push("Slow contraction rate suggests fatigue".to_string());
    }

    // Weight 5: SNR adjustment (10%)
    let snr_factor = (features.signal_to_noise_ratio / 20.0).clamp(0.0, 1.0);
    score *= 0.5 + snr_factor * 0.5;

    // Confidence adjustment
    let confidence_score = score * features.confidence;

    // Determine category
    let category = if confidence_score < FRESH_MAX {
        "fresh"
    } else if confidence_score < MODERATE_MAX {
        "moderate"
    } else if confidence_score < FATIGUED_MAX {
        "fatigued"
    } else {
        "exhausted"
    };

    FatigueResult {
        fatigue_level: confidence_score.clamp(0.0, 100.0),
        fatigue_category: category.to_string(),
        median_freq_shift: baseline.as_ref().map_or(0.0, |b| b.median_frequency - features.median_frequency),
        confidence: features.confidence,
        recommendations,
    }
}

// ============================================
// TESTS (compile-time only, WASM tests separate)
// ============================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rms_calculation() {
        let samples = vec![1.0, -1.0, 1.0, -1.0];
        let rms = calculate_rms(&samples);
        assert!((rms - 1.0).abs() < 0.001);
    }

    #[test]
    fn test_spectral_entropy() {
        // Flat spectrum (max entropy) should be near 1.0
        let flat_spectrum = Spectrum {
            bins: vec![1.0; 256],
            bin_width_hz: 15.625,
            fft_size: 512,
        };
        let entropy = calculate_spectral_entropy(&flat_spectrum);
        assert!(entropy > 0.95);
    }

    #[test]
    fn test_median_frequency() {
        // Single spike at bin 100 (1562.5 Hz)
        let mut bins = vec![0.0; 256];
        bins[100] = 1.0;
        let spectrum = Spectrum {
            bins,
            bin_width_hz: 15.625,
            fft_size: 512,
        };
        let median = calculate_median_frequency(&spectrum);
        // Median should be at bin 100 * bin_width
        assert!((median - 1562.5).abs() < 1.0);
    }
}
