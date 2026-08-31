//! # Types
//!
//! Type definitions for analytics calculations.

use serde::{Deserialize, Serialize};

/// Data point for time series
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct DataPoint {
    pub timestamp: i64,
    pub value: f64,
}

/// Chart data point with formatted timestamp
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChartDataPoint {
    pub timestamp: String,
    pub value: f64,
}

/// Chart summary statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChartSummary {
    pub average: f64,
    pub minimum: f64,
    pub maximum: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub change_percent: Option<f64>,
}

impl ChartSummary {
    pub fn new(average: f64, minimum: f64, maximum: f64, change_percent: Option<f64>) -> Self {
        Self {
            average,
            minimum,
            maximum,
            change_percent,
        }
    }
}

/// Chart data output
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChartData {
    pub metric: String,
    pub points: Vec<ChartDataPoint>,
    pub summary: ChartSummary,
}

/// Time series result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeSeriesResult {
    pub values: Vec<f64>,
    pub timestamps: Vec<i64>,
}

/// Weekly aggregation result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WeeklyAggregate {
    pub week_start: i64,
    pub sum: f64,
    pub count: u32,
    pub avg: f64,
}

/// Monthly aggregation result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonthlyAggregate {
    pub month_start: i64,
    pub sum: f64,
    pub count: u32,
    pub avg: f64,
}

/// Percentile values
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Percentiles {
    pub p50: f64,
    pub p75: f64,
    pub p90: f64,
    pub p95: f64,
    pub p99: f64,
}

/// Outlier data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Outlier {
    pub index: usize,
    pub value: f64,
    pub z_score: f64,
}

/// Goal progress result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GoalProgress {
    pub progress_percent: f64,
    pub remaining: f64,
    pub is_complete: bool,
}

/// Timestamp format
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TimestampFormat {
    Timestamp,
    Iso,
    Date,
}

impl TimestampFormat {
    pub fn as_str(&self) -> &'static str {
        match self {
            TimestampFormat::Timestamp => "timestamp",
            TimestampFormat::Iso => "iso",
            TimestampFormat::Date => "date",
        }
    }
}

/// Streak direction
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum StreakDirection {
    Above,
    Below,
    AtOrAbove,
    AtOrBelow,
}
