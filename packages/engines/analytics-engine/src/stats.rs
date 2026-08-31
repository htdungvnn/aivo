//! # Statistical Calculations
//!
//! Standard deviation, z-scores, percentiles, and outlier detection.

use crate::types::*;
use wasm_core::math::round_to;

/// Calculate standard deviation
pub fn calculate_std_dev(values: &[f64]) -> Option<f64> {
    if values.len() < 2 {
        return None;
    }

    let mean = values.iter().sum::<f64>() / values.len() as f64;
    let squared_diffs: f64 = values.iter().map(|v| (v - mean).powi(2)).sum();
    let variance = squared_diffs / (values.len() - 1) as f64;

    Some(round_to(variance.sqrt(), 2))
}

/// Calculate z-score for a value
pub fn calculate_z_score(value: f64, mean: f64, std_dev: f64) -> Option<f64> {
    if std_dev == 0.0 {
        return None;
    }
    Some(round_to((value - mean) / std_dev, 2))
}

/// Find outliers using z-score threshold
pub fn find_outliers(values: &[f64], threshold: f64) -> Vec<Outlier> {
    if values.len() < 3 {
        return Vec::new();
    }

    let mean = values.iter().sum::<f64>() / values.len() as f64;
    let std_dev = match calculate_std_dev(values) {
        Some(s) if s == 0.0 => return Vec::new(),
        Some(s) => s,
        None => return Vec::new(),
    };

    values
        .iter()
        .enumerate()
        .filter_map(|(index, &value)| {
            let z_score = (value - mean) / std_dev;
            if z_score.abs() > threshold {
                Some(Outlier {
                    index,
                    value,
                    z_score: round_to(z_score, 2),
                })
            } else {
                None
            }
        })
        .collect()
}

/// Calculate summary statistics
pub fn calculate_summary(values: &[f64]) -> Option<ChartSummary> {
    if values.is_empty() {
        return None;
    }

    let first = values[0];
    let last = values[values.len() - 1];
    let sum: f64 = values.iter().sum();

    let change_percent = if first != 0.0 {
        Some(round_to(((last - first) / first) * 100.0, 2))
    } else {
        None
    };

    Some(ChartSummary::new(
        round_to(sum / values.len() as f64, 2),
        values.iter().cloned().fold(f64::INFINITY, f64::min),
        values.iter().cloned().fold(f64::NEG_INFINITY, f64::max),
        change_percent,
    ))
}

/// Calculate percentiles
pub fn calculate_percentiles(values: &[f64]) -> Option<Percentiles> {
    if values.is_empty() {
        return None;
    }

    let mut sorted = values.to_vec();
    sorted.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    let len = sorted.len();

    let percentile = |p: f64| -> f64 {
        let index = ((p / 100.0) * (len as f64)).ceil() as usize - 1;
        sorted[index.max(0).min(len - 1)]
    };

    Some(Percentiles {
        p50: round_to(percentile(50.0), 2),
        p75: round_to(percentile(75.0), 2),
        p90: round_to(percentile(90.0), 2),
        p95: round_to(percentile(95.0), 2),
        p99: round_to(percentile(99.0), 2),
    })
}

/// Calculate median
pub fn calculate_median(values: &[f64]) -> Option<f64> {
    if values.is_empty() {
        return None;
    }

    let mut sorted = values.to_vec();
    sorted.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));

    let mid = sorted.len() / 2;
    if sorted.len() % 2 == 0 {
        Some(round_to((sorted[mid - 1] + sorted[mid]) / 2.0, 2))
    } else {
        Some(round_to(sorted[mid], 2))
    }
}

/// Calculate variance
pub fn calculate_variance(values: &[f64]) -> Option<f64> {
    if values.len() < 2 {
        return None;
    }

    let mean = values.iter().sum::<f64>() / values.len() as f64;
    let squared_diffs: f64 = values.iter().map(|v| (v - mean).powi(2)).sum();
    let variance = squared_diffs / (values.len() - 1) as f64;

    Some(round_to(variance, 2))
}

/// Calculate coefficient of variation (CV)
pub fn calculate_cv(values: &[f64]) -> Option<f64> {
    if values.is_empty() {
        return None;
    }

    let mean = values.iter().sum::<f64>() / values.len() as f64;
    if mean == 0.0 {
        return None;
    }

    let std_dev = calculate_std_dev(values)?;
    Some(round_to((std_dev / mean) * 100.0, 2))
}

/// Calculate correlation coefficient between two series
pub fn calculate_correlation(x: &[f64], y: &[f64]) -> Option<f64> {
    if x.len() != y.len() || x.len() < 2 {
        return None;
    }

    let n = x.len() as f64;
    let sum_x: f64 = x.iter().sum();
    let sum_y: f64 = y.iter().sum();
    let sum_xy: f64 = x.iter().zip(y.iter()).map(|(xi, yi)| xi * yi).sum();
    let sum_xx: f64 = x.iter().map(|xi| xi * xi).sum();
    let sum_yy: f64 = y.iter().map(|yi| yi * yi).sum();

    let numerator = n * sum_xy - sum_x * sum_y;
    let denominator = ((n * sum_xx - sum_x.powi(2)) * (n * sum_yy - sum_y.powi(2))).sqrt();

    if denominator.abs() < 1e-10 {
        return Some(0.0);
    }

    Some(round_to(numerator / denominator, 4))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_std_dev() {
        let values = vec![2.0, 4.0, 4.0, 4.0, 5.0, 5.0, 7.0, 9.0];
        let std = calculate_std_dev(&values).unwrap();
        assert!((std - 2.14).abs() < 0.01);
    }

    #[test]
    fn test_z_score() {
        let z = calculate_z_score(10.0, 8.0, 2.0).unwrap();
        assert!((z - 1.0).abs() < 0.01);
    }

    #[test]
    fn test_outliers() {
        let values = vec![1.0, 2.0, 3.0, 4.0, 5.0, 100.0];
        let outliers = find_outliers(&values, 2.0);
        assert_eq!(outliers.len(), 1);
        assert!((outliers[0].value - 100.0).abs() < 0.01);
    }

    #[test]
    fn test_median() {
        let values = vec![7.0, 1.0, 3.0];
        let median = calculate_median(&values).unwrap();
        assert!((median - 3.0).abs() < 0.01);
    }

    #[test]
    fn test_percentiles() {
        let values = (0..=100).map(|i| i as f64).collect::<Vec<_>>();
        let pcts = calculate_percentiles(&values).unwrap();
        assert!((pcts.p50 - 50.0).abs() < 1.0);
        assert!((pcts.p95 - 95.0).abs() < 1.0);
    }
}
