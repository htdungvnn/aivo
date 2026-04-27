import React, { useMemo } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl } from "react-native";
import { Heart, Dumbbell, Flame, Clock } from "lucide-react-native";
import { useMetrics } from "@/contexts/MetricsContext";
import { useAuth } from "@/contexts/AuthContext";
import { Loading } from "@/components/Loading";
import colors from "@/theme/colors";

// Memoized Stat Card component
const StatCard = React.memo(function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  color,
}: {
  icon: React.ComponentType<{ size: number; color: string }>;
  label: string;
  value: string;
  unit: string;
  color: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
        <Icon size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>
        {label}
        <Text style={styles.statUnit}> {unit}</Text>
      </Text>
    </View>
  );
});

// Memoized Workout Card component
const WorkoutCard = React.memo(function WorkoutCard({
  name,
  date,
  duration,
  calories,
}: {
  name: string;
  date: string;
  duration: string;
  calories: string;
}) {
  return (
    <View style={styles.workoutCard}>
      <View>
        <Text style={styles.workoutName}>{name}</Text>
        <Text style={styles.workoutDate}>{date}</Text>
      </View>
      <View style={styles.workoutStats}>
        <Text style={styles.workoutDuration}>{duration}</Text>
        <Text style={styles.workoutCalories}>{calories}</Text>
      </View>
    </View>
  );
});

// Memoized AI Insight Card
const AIInsightCard = React.memo(function AIInsightCard() {
  return (
    <View style={styles.aiCard}>
      <Text style={styles.aiLabel}>AI Coach Insight</Text>
      <Text style={styles.aiText}>
        Based on your recent performance, consider focusing on recovery today. Try light stretching or yoga.
      </Text>
    </View>
  );
});

export default function DashboardScreen() {
  const { metrics, loading, error, refreshMetrics, lastRefreshed } = useMetrics();
  const { user } = useAuth();

  // Calculate derived stats using useMemo
  const stats = useMemo(() => {
    // Calculate mock stats based on real data where available
    return [
      {
        icon: Heart,
        label: "Heart Rate",
        value: "72",
        unit: "bpm",
        color: colors.brand.primary,
      },
      {
        icon: Dumbbell,
        label: "Workouts",
        value: metrics.length > 0 ? "12" : "0",
        unit: "this week",
        color: colors.success,
      },
      {
        icon: Flame,
        label: "Calories",
        value: metrics.length > 0 ? "2,847" : "0",
        unit: "kcal",
        color: colors.warning,
      },
      {
        icon: Clock,
        label: "Active",
        value: metrics.length > 0 ? "345" : "0",
        unit: "minutes",
        color: colors.purple,
      },
    ];
  }, [metrics.length]);

  const recentWorkouts = useMemo(() => {
    if (metrics.length === 0) {
      return [];
    }
    // Transform metrics into workout-like entries (placeholder)
    return metrics.slice(0, 3).map((metric) => ({
      name: "Body Metrics Entry",
      date: new Date(metric.timestamp * 1000).toLocaleDateString("en-US", {
        weekday: "long",
        hour: "numeric",
        minute: "numeric",
      }),
      duration: "--",
      calories: metric.weight ? `${Math.round(metric.weight * 7)} kcal` : "--",
    }));
  }, [metrics]);

  const handleRefresh = () => {
    void refreshMetrics().catch(() => {
      // Error handled in refreshMetrics
    });
  };

  if (loading && metrics.length === 0) {
    return <Loading fullScreen message="Loading your fitness data..." />;
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={handleRefresh}
          tintColor={colors.brand.primary}
          colors={[colors.brand.primary]}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>
          {user?.name ? `Welcome back, ${user.name.split(" ")[0]}!` : "Welcome back!"}
        </Text>
        <Text style={styles.title}>AIVO</Text>
        {lastRefreshed && (
          <Text style={styles.lastUpdated}>
            Last updated: {lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Text>
        )}
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.statsGrid}>
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {recentWorkouts.length > 0 ? (
          recentWorkouts.map((workout, index) => (
            <WorkoutCard key={index} {...workout} />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No activity recorded yet</Text>
            <Text style={styles.emptyStateSubtext}>Start logging your metrics to see insights</Text>
          </View>
        )}
      </View>

      <View style={[styles.section, styles.aiSection]}>
        <Text style={styles.sectionTitle}>AI Coach Insight</Text>
        <AIInsightCard />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  greeting: {
    color: colors.text.secondary,
    fontSize: 14,
  },
  title: {
    color: colors.text.primary,
    fontSize: 32,
    fontWeight: "bold",
    marginTop: 4,
  },
  lastUpdated: {
    color: colors.text.tertiary,
    fontSize: 12,
    marginTop: 4,
  },
  errorBanner: {
    backgroundColor: `${colors.error}20`,
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.error,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    textAlign: "center",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    width: "47%",
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  statValue: {
    color: colors.text.primary,
    fontSize: 24,
    fontWeight: "bold",
  },
  statLabel: {
    color: colors.text.secondary,
    fontSize: 12,
    marginTop: 4,
  },
  statUnit: {
    color: colors.text.tertiary,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  workoutCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border.primary,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  workoutName: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: "600",
  },
  workoutDate: {
    color: colors.text.secondary,
    fontSize: 12,
    marginTop: 4,
  },
  workoutStats: {
    alignItems: "flex-end",
  },
  workoutDuration: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: "500",
  },
  workoutCalories: {
    color: colors.text.secondary,
    fontSize: 12,
    marginTop: 4,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 32,
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  emptyStateText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: "600",
  },
  emptyStateSubtext: {
    color: colors.text.secondary,
    fontSize: 14,
    marginTop: 4,
  },
  aiSection: {
    marginBottom: 32,
  },
  aiCard: {
    backgroundColor: colors.overlay.light,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  aiLabel: {
    color: colors.brand.primary,
    fontSize: 12,
    marginBottom: 8,
  },
  aiText: {
    color: colors.text.secondary,
    fontSize: 14,
    lineHeight: 20,
  },
});
