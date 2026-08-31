//! # Time Series Calculations
//!
//! Moving averages, trend analysis, and rolling calculations.

use crate::types::*;
use wasm_core::math::round_to;

/// Calculate Simple Moving Average (SMA)
pub fn calculate_sma(values: &[f64], window: usize) -> Vec<f64> {
    if values.is_empty() || window == 0 {
        return Vec::new();
    }

    let mut result = Vec::with_capacity(values.len());

    for i in 0..values.len() {
        let start = if i >= window { i - window + 1 } else { 0 };
        let window_values = &values[start..=i];
        let sum: f64 = window_values.iter().sum();
        let avg = sum / window_values.len() as f64;
        result.push(round_to(avg, 2));
    }

    result
}

/// Calculate Exponential Moving Average (EMA)
pub fn calculate_ema(values: &[f64], span: usize) -> Vec<f64> {
    if values.is_empty() || span == 0 {
        return Vec::new();
    }

    let alpha = 2.0 / (span as f64 + 1.0);
    let mut result = Vec::with_capacity(values.len());
    result.push(values[0]);

    for i in 1..values.len() {
        let ema = alpha * values[i] + (1.0 - alpha) * result[i - 1];
        result.push(round_to(ema, 2));
    }

    result
}

/// Calculate trend slope using linear regression
/// 
/// Returns the slope (rate of change per unit)
pub fn calculate_trend_slope(values: &[f64]) -> Option<f64> {
    if values.len() < 2 {
        return None;
    }

    let n = values.len() as f64;
    let sum_x = (n * (n - 1.0)) / 2.0;
    let sum_y: f64 = values.iter().sum();
    let sum_xy: f64 = values.iter().enumerate().map(|(i, y)| i as f64 * y).sum();
    let sum_xx: f64 = (1..=values.len()).map(|i| (i * i) as f64).sum::<f64>();

    let denominator = n * sum_xx - sum_x * sum_x;
    if denominator.abs() < 1e-10 {
        return Some(0.0);
    }

    let slope = (n * sum_xy - sum_x * sum_y) / denominator;
    Some(round_to(slope, 4))
}

/// Calculate percentage change over the period
pub fn calculate_pct_change(values: &[f64]) -> Option<f64> {
    if values.len() < 2 {
        return None;
    }

    let first = values[0];
    let last = values[values.len() - 1];

    if first == 0.0 {
        return None;
    }

    let pct_change = ((last - first) / first) * 100.0;
    Some(round_to(pct_change, 2))
}

/// Calculate rolling minimum
pub fn calculate_rolling_min(values: &[f64], window: usize) -> Vec<f64> {
    calculate_rolling_aggregate(values, window, |a, b| a.min(b))
}

/// Calculate rolling maximum
pub fn calculate_rolling_max(values: &[f64], window: usize) -> Vec<f64> {
    calculate_rolling_aggregate(values, window, |a, b| a.max(b))
}

/// Generic rolling aggregate function
fn calculate_rolling_aggregate<F>(values: &[f64], window: usize, agg: F) -> Vec<f64>
where
    F: Fn(f64, f64) -> f64,
{
    if values.is_empty() || window == 0 {
        return Vec::new();
    }

    let mut result = Vec::with_capacity(values.len());

    for i in 0..values.len() {
        let start = if i >= window { i - window + 1 } else { 0 };
        let window_values = &values[start..=i];
        let initial = window_values[0];
        let aggregated = window_values.iter().skip(1).fold(initial, &agg);
        result.push(round_to(aggregated, 2));
    }

    result
}

/// Find peaks in data
/// 
/// A peak is a point that is higher than both neighbors
pub fn find_peaks(values: &[f64], min_distance: usize) -> Vec<usize> {
    if values.len() < 3 {
        return Vec::new();
    }

    let mut peaks = Vec::new();

    for i in 1..values.len() - 1 {
        if values[i] > values[i - 1] && values[i] > values[i + 1] {
            // Check minimum distance from last peak
            if peaks.is_empty() || i - peaks[peaks.len() - 1] > min_distance {
                peaks.push(i);
            }
        }
    }

    peaks
}

/// Find valleys in data
/// 
/// A valley is a point that is lower than both neighbors
pub fn find_valleys(values: &[f64], min_distance: usize) -> Vec<usize> {
    if values.len() < 3 {
        return Vec::new();
    }

    let mut valleys = Vec::new();

    for i in 1..values.len() - 1 {
        if values[i] < values[i - 1] && values[i] < values[i + 1] {
            if valleys.is_empty() || i - valleys[valleys.len() - 1] > min_distance {
                valleys.push(i);
            }
        }
    }

    valleys
}

/// Calculate streak of values meeting threshold
pub fn calculate_streak(values: &[f64], threshold: f64, direction: StreakDirection) -> usize {
    if values.is_empty() {
        return 0;
    }

    let check = |v: f64| -> bool {
        match direction {
            StreakDirection::Above => v > threshold,
            StreakDirection::Below => v < threshold,
            StreakDirection::AtOrAbove => v >= threshold,
            StreakDirection::AtOrBelow => v <= threshold,
        }
    };

    let mut current_streak = 0usize;
    let mut max_streak = 0usize;

    for &value in values {
        if check(value) {
            current_streak += 1;
            max_streak = max_streak.max(current_streak);
        } else {
            current_streak = 0;
        }
    }

    max_streak
}

/// Convert timestamps and values to chart-ready format
pub fn to_chart_data(
    timestamps: &[i64],
    values: &[f64],
    format: TimestampFormat,
) -> Vec<ChartDataPoint> {
    if timestamps.len() != values.len() {
        return Vec::new();
    }

    timestamps
        .iter()
        .zip(values.iter())
        .map(|(&ts, &val)| ChartDataPoint {
            timestamp: format_timestamp(ts, format),
            value: round_to(val, 2),
        })
        .collect()
}

/// Format timestamp to string
fn format_timestamp(ts: i64, format: TimestampFormat) -> String {
    let date = js_sys::Date::new(&wasm_bindgen::JsValue::from(ts as f64));
    
    match format {
        TimestampFormat::Timestamp => ts.to_string(),
        TimestampFormat::Iso => date.to_iso_string().as_string().unwrap_or_default(),
        TimestampFormat::Date => date.to_iso_string().as_string()
            .map(|s| s.split('T').next().unwrap_or(&s).to_string())
            .unwrap_or_default(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sma() {
        let values = vec![1.0, 2.0, 3.0, 4.0, 5.0];
        let sma = calculate_sma(&values, 3);
        assert_eq!(sma.len(), 5);
        assert!((sma[2] - 2.0).abs() < 0.01);
    }

    #[test]
    fn test_ema() {
        let values = vec![1.0, 2.0, 3.0, 4.0, 5.0];
        let ema = calculate_ema(&values, 3);
        assert_eq!(ema.len(), 5);
        assert_eq!(ema[0], 1.0);
    }

    #[test]
    fn test_trend_slope() {
        let values = vec![1.0, 2.0, 3.0, 4.0, 5.0];
        let slope = calculate_trend_slope(&values).unwrap();
        assert!((slope - 1.0).abs() < 0.01);
    }

    #[test]
    fn test_pct_change() {
        let values = vec![100.0, 110.0];
        let pct = calculate_pct_change(&values).unwrap();
        assert!((pct - 10.0).abs() < 0.01);
    }

    #[test]
    fn test_peaks() {
        let values = vec![1.0, 3.0, 2.0, 5.0, 4.0, 6.0, 5.0];
        let peaks = find_peaks(&values, 1);
        assert_eq!(peaks, vec![1, 3, 5]);
    }

    #[test]
    fn test_streak() {
        let values = vec![1.0, 2.0, 3.0, 2.0, 3.0, 4.0, 5.0];
        let streak = calculate_streak(&values, 2.5, StreakDirection::Above);
        assert_eq!(streak, 3);
    }
}
