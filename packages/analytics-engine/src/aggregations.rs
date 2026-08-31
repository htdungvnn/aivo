//! # Aggregation Calculations
//!
//! Weekly, monthly, and goal progress calculations.

use crate::types::*;
use wasm_core::math::round_to;

/// Aggregate data by week
pub fn aggregate_weekly(timestamps: &[i64], values: &[f64]) -> Vec<WeeklyAggregate> {
    if timestamps.len() != values.len() || timestamps.is_empty() {
        return Vec::new();
    }

    let mut weekly_map: std::collections::HashMap<i64, (f64, u32)> = std::collections::HashMap::new();

    for i in 0..timestamps.len() {
        let ts = timestamps[i];
        // Get start of week (Sunday)
        let date = ts_to_date(ts);
        let day_of_week = date % 86400000 / 86400000;
        let week_start = ts - (day_of_week * 86400000);
        
        let entry = weekly_map.entry(week_start).or_insert((0.0, 0));
        entry.0 += values[i];
        entry.1 += 1;
    }

    let mut result: Vec<WeeklyAggregate> = weekly_map
        .into_iter()
        .map(|(week_start, (sum, count))| WeeklyAggregate {
            week_start,
            sum: round_to(sum, 2),
            count,
            avg: round_to(sum / count as f64, 2),
        })
        .collect();

    result.sort_by_key(|a| a.week_start);
    result
}

/// Aggregate data by month
pub fn aggregate_monthly(timestamps: &[i64], values: &[f64]) -> Vec<MonthlyAggregate> {
    if timestamps.len() != values.len() || timestamps.is_empty() {
        return Vec::new();
    }

    let mut monthly_map: std::collections::HashMap<i64, (f64, u32)> = std::collections::HashMap::new();

    for i in 0..timestamps.len() {
        let ts = timestamps[i];
        // Get start of month
        let month_start = ts - (ts % (86400000 * 30));
        
        let entry = monthly_map.entry(month_start).or_insert((0.0, 0));
        entry.0 += values[i];
        entry.1 += 1;
    }

    let mut result: Vec<MonthlyAggregate> = monthly_map
        .into_iter()
        .map(|(month_start, (sum, count))| MonthlyAggregate {
            month_start,
            sum: round_to(sum, 2),
            count,
            avg: round_to(sum / count as f64, 2),
        })
        .collect();

    result.sort_by_key(|a| a.month_start);
    result
}

/// Calculate goal progress
pub fn calculate_goal_progress(current: f64, target: f64) -> GoalProgress {
    let progress_percent = if target > 0.0 {
        round_to((current / target) * 100.0, 1)
    } else {
        0.0
    };

    GoalProgress {
        progress_percent: progress_percent.min(100.0),
        remaining: (target - current).max(0.0),
        is_complete: current >= target,
    }
}

/// Convert timestamp to date (days since epoch)
fn ts_to_date(ts: i64) -> i64 {
    ts - (ts % 86400000)
}

/// Aggregate daily totals
pub fn aggregate_daily(timestamps: &[i64], values: &[f64]) -> Vec<DailyAggregate> {
    if timestamps.len() != values.len() || timestamps.is_empty() {
        return Vec::new();
    }

    let mut daily_map: std::collections::HashMap<i64, (f64, u32)> = std::collections::HashMap::new();

    for i in 0..timestamps.len() {
        let day = ts_to_date(timestamps[i]);
        let entry = daily_map.entry(day).or_insert((0.0, 0));
        entry.0 += values[i];
        entry.1 += 1;
    }

    let mut result: Vec<DailyAggregate> = daily_map
        .into_iter()
        .map(|(day, (sum, count))| DailyAggregate {
            day,
            sum: round_to(sum, 2),
            count,
            avg: round_to(sum / count as f64, 2),
            min: values.iter().cloned().fold(f64::INFINITY, f64::min),
            max: values.iter().cloned().fold(f64::NEG_INFINITY, f64::max),
        })
        .collect();

    result.sort_by_key(|a| a.day);
    result
}

/// Daily aggregation result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DailyAggregate {
    pub day: i64,
    pub sum: f64,
    pub count: u32,
    pub avg: f64,
    pub min: f64,
    pub max: f64,
}

/// Calculate cumulative sum
pub fn calculate_cumulative_sum(values: &[f64]) -> Vec<f64> {
    let mut cumulative = Vec::with_capacity(values.len());
    let mut sum = 0.0;

    for &value in values {
        sum += value;
        cumulative.push(round_to(sum, 2));
    }

    cumulative
}

/// Calculate moving range for control charts
pub fn calculate_moving_range(values: &[f64]) -> Vec<f64> {
    if values.len() < 2 {
        return Vec::new();
    }

    values
        .windows(2)
        .map(|w| (w[1] - w[0]).abs())
        .map(|r| round_to(r, 2))
        .collect()
}

/// Calculate average moving range (for control charts)
pub fn calculate_average_moving_range(values: &[f64]) -> Option<f64> {
    let mr = calculate_moving_range(values);
    if mr.is_empty() {
        return None;
    }

    let sum: f64 = mr.iter().sum();
    Some(round_to(sum / mr.len() as f64, 2))
}

/// Calculate control limits for X-bar chart
pub fn calculate_xbar_limits(values: &[f64], d2: f64) -> Option<ControlLimits> {
    if values.is_empty() {
        return None;
    }

    let mean = values.iter().sum::<f64>() / values.len() as f64;
    let mr_avg = calculate_average_moving_range(values)?;

    Some(ControlLimits {
        ucl: round_to(mean + 3.0 * (mr_avg / d2), 2),
        cl: round_to(mean, 2),
        lcl: round_to(mean - 3.0 * (mr_avg / d2), 2),
    })
}

/// Control chart limits
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ControlLimits {
    pub ucl: f64,
    pub cl: f64,
    pub lcl: f64,
}

/// Calculate period-over-period change
pub fn calculate_period_change(
    current: f64,
    previous: f64,
) -> Option<PeriodChange> {
    if previous == 0.0 {
        return None;
    }

    let absolute_change = current - previous;
    let percent_change = ((current - previous) / previous) * 100.0;

    Some(PeriodChange {
        absolute: round_to(absolute_change, 2),
        percent: round_to(percent_change, 2),
        direction: if absolute_change > 0.0 { 
            ChangeDirection::Up 
        } else if absolute_change < 0.0 { 
            ChangeDirection::Down 
        } else { 
            ChangeDirection::Unchanged 
        },
    })
}

/// Period change result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PeriodChange {
    pub absolute: f64,
    pub percent: f64,
    pub direction: ChangeDirection,
}

/// Change direction
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ChangeDirection {
    Up,
    Down,
    Unchanged,
}

use serde::{Deserialize, Serialize};

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_goal_progress() {
        let progress = calculate_goal_progress(75.0, 100.0);
        assert!((progress.progress_percent - 75.0).abs() < 0.1);
        assert_eq!(progress.is_complete, false);
    }

    #[test]
    fn test_goal_progress_complete() {
        let progress = calculate_goal_progress(120.0, 100.0);
        assert_eq!(progress.progress_percent, 100.0);
        assert_eq!(progress.is_complete, true);
    }

    #[test]
    fn test_cumulative_sum() {
        let values = vec![1.0, 2.0, 3.0, 4.0];
        let cumulative = calculate_cumulative_sum(&values);
        assert_eq!(cumulative, vec![1.0, 3.0, 6.0, 10.0]);
    }

    #[test]
    fn test_moving_range() {
        let values = vec![1.0, 3.0, 2.0, 5.0];
        let mr = calculate_moving_range(&values);
        assert_eq!(mr, vec![2.0, 1.0, 3.0]);
    }

    #[test]
    fn test_period_change() {
        let change = calculate_period_change(110.0, 100.0).unwrap();
        assert!((change.absolute - 10.0).abs() < 0.01);
        assert!((change.percent - 10.0).abs() < 0.01);
        assert_eq!(change.direction, ChangeDirection::Up);
    }
}
