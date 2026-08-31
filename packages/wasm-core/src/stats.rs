//! # Statistics Utilities
//!
//! Statistical functions for time-series analysis and health metrics.

use crate::math::{round_to, safe_divide};
use serde::{Deserialize, Serialize};
use std::collections::VecDeque;

/// Running statistics tracker
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RunningStats {
    pub count: usize,
    pub sum: f64,
    pub min: f64,
    pub max: f64,
    pub mean: f64,
    pub m2: f64, // Sum of squares of differences from mean (for variance)
}

impl RunningStats {
    pub fn new() -> Self {
        Self {
            count: 0,
            sum: 0.0,
            min: f64::INFINITY,
            max: f64::NEG_INFINITY,
            mean: 0.0,
            m2: 0.0,
        }
    }

    /// Update with a new value using Welford's algorithm
    pub fn update(&mut self, value: f64) {
        if !value.is_finite() {
            return;
        }

        self.count += 1;
        self.sum += value;
        
        if value < self.min {
            self.min = value;
        }
        if value > self.max {
            self.max = value;
        }

        // Welford's online algorithm for variance
        let delta = value - self.mean;
        self.mean += delta / self.count as f64;
        let delta2 = value - self.mean;
        self.m2 += delta * delta2;
    }

    /// Get variance
    pub fn variance(&self) -> f64 {
        if self.count < 2 {
            0.0
        } else {
            self.m2 / (self.count - 1) as f64
        }
    }

    /// Get population variance
    pub fn population_variance(&self) -> f64 {
        if self.count == 0 {
            0.0
        } else {
            self.m2 / self.count as f64
        }
    }

    /// Get standard deviation
    pub fn std_dev(&self) -> f64 {
        self.variance().sqrt()
    }

    /// Reset statistics
    pub fn reset(&mut self) {
        *self = Self::new();
    }
}

impl Default for RunningStats {
    fn default() -> Self {
        Self::new()
    }
}

/// Time series statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeSeriesStats {
    pub values: Vec<f64>,
    pub timestamps: Vec<i64>,
    pub start_timestamp: Option<i64>,
    pub end_timestamp: Option<i64>,
}

impl TimeSeriesStats {
    pub fn new() -> Self {
        Self {
            values: Vec::new(),
            timestamps: Vec::new(),
            start_timestamp: None,
            end_timestamp: None,
        }
    }

    pub fn with_capacity(capacity: usize) -> Self {
        Self {
            values: Vec::with_capacity(capacity),
            timestamps: Vec::with_capacity(capacity),
            start_timestamp: None,
            end_timestamp: None,
        }
    }

    /// Add a data point
    pub fn add(&mut self, timestamp: i64, value: f64) {
        if !value.is_finite() {
            return;
        }

        self.values.push(value);
        self.timestamps.push(timestamp);
        
        if self.start_timestamp.is_none() || timestamp < self.start_timestamp.unwrap() {
            self.start_timestamp = Some(timestamp);
        }
        if self.end_timestamp.is_none() || timestamp > self.end_timestamp.unwrap() {
            self.end_timestamp = Some(timestamp);
        }
    }

    /// Calculate simple moving average
    pub fn sma(&self, window: usize) -> Vec<f64> {
        if self.values.is_empty() || window == 0 {
            return Vec::new();
        }

        let mut result = Vec::with_capacity(self.values.len());
        
        for i in 0..self.values.len() {
            let start = i.saturating_sub(window - 1);
            let window_values = &self.values[start..=i];
            let sum: f64 = window_values.iter().sum();
            result.push(sum / window_values.len() as f64);
        }
        
        result
    }

    /// Calculate exponential moving average
    pub fn ema(&self, span: usize) -> Vec<f64> {
        if self.values.is_empty() || span == 0 {
            return Vec::new();
        }

        let alpha = 2.0 / (span as f64 + 1.0);
        let mut result = Vec::with_capacity(self.values.len());
        
        if let Some(first) = self.values.first() {
            result.push(*first);
            
            for i in 1..self.values.len() {
                let ema = alpha * self.values[i] + (1.0 - alpha) * result[i - 1];
                result.push(ema);
            }
        }
        
        result
    }

    /// Calculate trend slope using linear regression
    pub fn trend_slope(&self) -> Option<f64> {
        if self.values.len() < 2 {
            return None;
        }

        let n = self.values.len() as f64;
        let sum_x: f64 = (0..self.values.len()).map(|i| i as f64).sum();
        let sum_y: f64 = self.values.iter().sum();
        let sum_xy: f64 = self.values.iter()
            .enumerate()
            .map(|(i, y)| i as f64 * y)
            .sum();
        let sum_xx: f64 = (0..self.values.len())
            .map(|i| (i as f64).powi(2))
            .sum();

        let denominator = n * sum_xx - sum_x.powi(2);
        if denominator.abs() < f64::EPSILON {
            return Some(0.0);
        }

        Some(round_to((n * sum_xy - sum_x * sum_y) / denominator, 4))
    }

    /// Calculate percentage change
    pub fn pct_change(&self) -> Option<f64> {
        if self.values.len() < 2 {
            return None;
        }

        let first = self.values.first()?;
        let last = self.values.last()?;
        
        if first.abs() < f64::EPSILON {
            return None;
        }

        Some(round_to((last - first) / first * 100.0, 2))
    }

    /// Get min value
    pub fn min(&self) -> Option<f64> {
        self.values.iter().copied().reduce(f64::min)
    }

    /// Get max value
    pub fn max(&self) -> Option<f64> {
        self.values.iter().copied().reduce(f64::max)
    }

    /// Get mean value
    pub fn mean(&self) -> Option<f64> {
        if self.values.is_empty() {
            return None;
        }
        Some(self.values.iter().sum::<f64>() / self.values.len() as f64)
    }

    /// Calculate standard deviation
    pub fn std_dev(&self) -> Option<f64> {
        if self.values.len() < 2 {
            return None;
        }

        let mean = self.mean()?;
        let variance = self.values.iter()
            .map(|v| (v - mean).powi(2))
            .sum::<f64>() / (self.values.len() - 1) as f64;
        
        Some(variance.sqrt())
    }

    /// Calculate z-score for a value
    pub fn z_score(&self, value: f64) -> Option<f64> {
        let mean = self.mean()?;
        let std = self.std_dev()?;
        
        if std < f64::EPSILON {
            return None;
        }

        Some(round_to((value - mean) / std, 2))
    }

    /// Detect outliers using z-score threshold
    pub fn outliers(&self, threshold: f64) -> Vec<(usize, f64)> {
        let mean = match self.mean() {
            Some(m) => m,
            None => return Vec::new(),
        };
        
        let std = match self.std_dev() {
            Some(s) if s > f64::EPSILON => s,
            _ => return Vec::new(),
        };

        self.values
            .iter()
            .enumerate()
            .filter(|(_, &v)| ((v - mean) / std).abs() > threshold)
            .map(|(i, &v)| (i, v))
            .collect()
    }

    /// Calculate rolling min
    pub fn rolling_min(&self, window: usize) -> Vec<f64> {
        self.rolling_aggregate(window, |vals| vals.iter().copied().reduce(f64::min).unwrap_or(f64::NAN))
    }

    /// Calculate rolling max
    pub fn rolling_max(&self, window: usize) -> Vec<f64> {
        self.rolling_aggregate(window, |vals| vals.iter().copied().reduce(f64::max).unwrap_or(f64::NAN))
    }

    fn rolling_aggregate<F>(&self, window: usize, agg: F) -> Vec<f64>
    where
        F: Fn(&[f64]) -> f64,
    {
        if self.values.is_empty() || window == 0 {
            return Vec::new();
        }

        let mut result = Vec::with_capacity(self.values.len());
        
        for i in 0..self.values.len() {
            let start = i.saturating_sub(window - 1);
            let window_values = &self.values[start..=i];
            result.push(agg(window_values));
        }
        
        result
    }

    /// Find peaks (local maxima)
    pub fn find_peaks(&self, min_distance: usize) -> Vec<usize> {
        if self.values.len() < 3 {
            return Vec::new();
        }

        let mut peaks = Vec::new();
        let threshold = min_distance;

        for i in 1..self.values.len() - 1 {
            let prev = self.values[i - 1];
            let curr = self.values[i];
            let next = self.values[i + 1];

            if curr > prev && curr > next {
                // Check minimum distance from last peak
                if peaks.is_empty() || i - peaks.last().unwrap() > threshold {
                    peaks.push(i);
                }
            }
        }

        peaks
    }

    /// Find valleys (local minima)
    pub fn find_valleys(&self, min_distance: usize) -> Vec<usize> {
        if self.values.len() < 3 {
            return Vec::new();
        }

        let mut valleys = Vec::new();

        for i in 1..self.values.len() - 1 {
            let prev = self.values[i - 1];
            let curr = self.values[i];
            let next = self.values[i + 1];

            if curr < prev && curr < next {
                if valleys.is_empty() || i - valleys.last().unwrap() > min_distance {
                    valleys.push(i);
                }
            }
        }

        valleys
    }

    /// Calculate streak (consecutive values above/below threshold)
    pub fn streak(&self, threshold: f64, direction: StreakDirection) -> usize {
        if self.values.is_empty() {
            return 0;
        }

        let mut current_streak = 0;
        let mut max_streak = 0;

        for &value in &self.values {
            let is_above = match direction {
                StreakDirection::Above => value > threshold,
                StreakDirection::Below => value < threshold,
                StreakDirection::AtOrAbove => value >= threshold,
                StreakDirection::AtOrBelow => value <= threshold,
            };

            if is_above {
                current_streak += 1;
                max_streak = max_streak.max(current_streak);
            } else {
                current_streak = 0;
            }
        }

        max_streak
    }

    /// Get duration in milliseconds
    pub fn duration_ms(&self) -> Option<i64> {
        match (self.start_timestamp, self.end_timestamp) {
            (Some(start), Some(end)) => Some(end - start),
            _ => None,
        }
    }
}

impl Default for TimeSeriesStats {
    fn default() -> Self {
        Self::new()
    }
}

/// Streak direction
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StreakDirection {
    Above,
    Below,
    AtOrAbove,
    AtOrBelow,
}

/// Aggregation period for time series
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AggregationPeriod {
    Minute,
    Hour,
    Day,
    Week,
    Month,
}

impl AggregationPeriod {
    pub fn duration_ms(&self) -> i64 {
        match self {
            AggregationPeriod::Minute => 60 * 1000,
            AggregationPeriod::Hour => 60 * 60 * 1000,
            AggregationPeriod::Day => 24 * 60 * 60 * 1000,
            AggregationPeriod::Week => 7 * 24 * 60 * 60 * 1000,
            AggregationPeriod::Month => 30 * 24 * 60 * 60 * 1000, // Approximate
        }
    }
}

/// Aggregation result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AggregatedDataPoint {
    pub timestamp: i64,
    pub sum: f64,
    pub count: usize,
    pub mean: f64,
    pub min: f64,
    pub max: f64,
}

impl TimeSeriesStats {
    /// Aggregate data by period
    pub fn aggregate(&self, period: AggregationPeriod) -> Vec<AggregatedDataPoint> {
        if self.values.is_empty() {
            return Vec::new();
        }

        let period_ms = period.duration_ms();
        let mut result: Vec<AggregatedDataPoint> = Vec::new();
        
        let mut current_bucket: Option<(i64, Vec<f64>)> = None;

        for (i, &timestamp) in self.timestamps.iter().enumerate() {
            let bucket_start = (timestamp / period_ms) * period_ms;

            match &mut current_bucket {
                Some((start, values)) if *start == bucket_start => {
                    values.push(self.values[i]);
                }
                _ => {
                    // Emit previous bucket
                    if let Some((start, values)) = current_bucket.take() {
                        if !values.is_empty() {
                            result.push(AggregatedDataPoint {
                                timestamp: start,
                                sum: values.iter().sum(),
                                count: values.len(),
                                mean: values.iter().sum::<f64>() / values.len() as f64,
                                min: *values.iter().min_by(|a, b| a.partial_cmp(b).unwrap()).unwrap(),
                                max: *values.iter().max_by(|a, b| a.partial_cmp(b).unwrap()).unwrap(),
                            });
                        }
                    }
                    // Start new bucket
                    current_bucket = Some((bucket_start, vec![self.values[i]]));
                }
            }
        }

        // Emit last bucket
        if let Some((start, values)) = current_bucket {
            if !values.is_empty() {
                result.push(AggregatedDataPoint {
                    timestamp: start,
                    sum: values.iter().sum(),
                    count: values.len(),
                    mean: values.iter().sum::<f64>() / values.len() as f64,
                    min: *values.iter().min_by(|a, b| a.partial_cmp(b).unwrap()).unwrap(),
                    max: *values.iter().max_by(|a, b| a.partial_cmp(b).unwrap()).unwrap(),
                });
            }
        }

        result
    }
}

/// Percentile result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PercentileResult {
    pub p50: f64,
    pub p75: f64,
    pub p90: f64,
    pub p95: f64,
    pub p99: f64,
}

impl TimeSeriesStats {
    /// Calculate percentiles
    pub fn percentiles(&self) -> Option<PercentileResult> {
        if self.values.is_empty() {
            return None;
        }

        let mut sorted = self.values.clone();
        sorted.sort_by(|a, b| a.partial_cmp(b).unwrap());

        let len = sorted.len();
        
        Some(PercentileResult {
            p50: *sorted[(len as f64 * 0.50) as usize].min(&sorted[len - 1]),
            p75: *sorted[(len as f64 * 0.75) as usize].min(&sorted[len - 1]),
            p90: *sorted[(len as f64 * 0.90) as usize].min(&sorted[len - 1]),
            p95: *sorted[(len as f64 * 0.95) as usize].min(&sorted[len - 1]),
            p99: *sorted[((len as f64 * 0.99) as usize).min(len - 1)],
        })
    }
}

/// Circular buffer for rolling window
pub struct CircularBuffer<T> {
    buffer: VecDeque<T>,
    capacity: usize,
}

impl<T: Clone> CircularBuffer<T> {
    pub fn new(capacity: usize) -> Self {
        Self {
            buffer: VecDeque::with_capacity(capacity),
            capacity,
        }
    }

    pub fn push(&mut self, value: T) {
        if self.buffer.len() >= self.capacity {
            self.buffer.pop_front();
        }
        self.buffer.push_back(value);
    }

    pub fn values(&self) -> Vec<T> {
        self.buffer.iter().cloned().collect()
    }

    pub fn len(&self) -> usize {
        self.buffer.len()
    }

    pub fn is_empty(&self) -> bool {
        self.buffer.is_empty()
    }

    pub fn mean(&self) -> Option<f64>
    where
        T: Copy + Into<f64>,
    {
        if self.buffer.is_empty() {
            return None;
        }
        let sum: f64 = self.buffer.iter().map(|v| (*v).into()).sum();
        Some(sum / self.buffer.len() as f64)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_running_stats() {
        let mut stats = RunningStats::new();
        stats.update(10.0);
        stats.update(20.0);
        stats.update(30.0);
        
        assert_eq!(stats.count, 3);
        assert_eq!(stats.mean, 20.0);
        assert_eq!(stats.min, 10.0);
        assert_eq!(stats.max, 30.0);
    }

    #[test]
    fn test_time_series_stats() {
        let mut ts = TimeSeriesStats::new();
        ts.add(1000, 10.0);
        ts.add(2000, 20.0);
        ts.add(3000, 30.0);
        
        assert_eq!(ts.mean(), Some(20.0));
        assert_eq!(ts.min(), Some(10.0));
        assert_eq!(ts.max(), Some(30.0));
        assert_eq!(ts.duration_ms(), Some(2000));
    }

    #[test]
    fn test_sma() {
        let mut ts = TimeSeriesStats::new();
        ts.add(1000, 10.0);
        ts.add(2000, 20.0);
        ts.add(3000, 30.0);
        ts.add(4000, 40.0);
        
        let sma_2 = ts.sma(2);
        assert_eq!(sma_2, vec![10.0, 15.0, 25.0, 35.0]);
    }

    #[test]
    fn test_trend_slope() {
        let mut ts = TimeSeriesStats::new();
        ts.add(1000, 10.0);
        ts.add(2000, 15.0);
        ts.add(3000, 20.0);
        ts.add(4000, 25.0);
        
        // Should have positive slope (~5 per unit)
        let slope = ts.trend_slope();
        assert!(slope.is_some());
    }
}
