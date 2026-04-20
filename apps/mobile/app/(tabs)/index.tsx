import { View, Text, ScrollView, StyleSheet } from "react-native";
import { Heart, Dumbbell, Flame, Clock } from "lucide-react-native";

export default function DashboardScreen() {
  const stats = [
    { icon: Heart, label: "Heart Rate", value: "72", unit: "bpm", color: "#3b82f6" },
    { icon: Dumbbell, label: "Workouts", value: "12", unit: "this week", color: "#10b981" },
    { icon: Flame, label: "Calories", value: "2,847", unit: "kcal", color: "#f59e0b" },
    { icon: Clock, label: "Active", value: "345", unit: "minutes", color: "#8b5cf6" },
  ];

  const recentWorkouts = [
    { name: "HIIT Session", date: "Today, 7:00 AM", duration: "45 min", calories: "520 kcal" },
    { name: "Strength Training", date: "Yesterday, 6:30 PM", duration: "60 min", calories: "380 kcal" },
    { name: "Morning Run", date: "2 days ago, 6:00 AM", duration: "35 min", calories: "280 kcal" },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back!</Text>
        <Text style={styles.title}>AIVO</Text>
      </View>

      <View style={styles.statsGrid}>
        {stats.map((stat, index) => (
          <View key={index} style={styles.statCard}>
            <View style={[styles.iconContainer, { backgroundColor: `${stat.color}20` }]}>
              <stat.icon size={20} color={stat.color} />
            </View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>
              {stat.label}
              <Text style={styles.statUnit}> {stat.unit}</Text>
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Workouts</Text>
        {recentWorkouts.map((workout, index) => (
          <View key={index} style={styles.workoutCard}>
            <View>
              <Text style={styles.workoutName}>{workout.name}</Text>
              <Text style={styles.workoutDate}>{workout.date}</Text>
            </View>
            <View style={styles.workoutStats}>
              <Text style={styles.workoutDuration}>{workout.duration}</Text>
              <Text style={styles.workoutCalories}>{workout.calories}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={[styles.section, styles.aiSection]}>
        <Text style={styles.sectionTitle}>AI Coach Insight</Text>
        <View style={styles.aiCard}>
          <Text style={styles.aiLabel}>Personalized Recommendation</Text>
          <Text style={styles.aiText}>
            Based on your recent performance, consider focusing on recovery today. Try light stretching or yoga.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#030712",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  greeting: {
    color: "#9ca3af",
    fontSize: 14,
  },
  title: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "bold",
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    width: "47%",
    backgroundColor: "#111827",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#374151",
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
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
  statLabel: {
    color: "#9ca3af",
    fontSize: 12,
    marginTop: 4,
  },
  statUnit: {
    color: "#6b7280",
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  workoutCard: {
    backgroundColor: "#111827",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#374151",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  workoutName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  workoutDate: {
    color: "#9ca3af",
    fontSize: 12,
    marginTop: 4,
  },
  workoutStats: {
    alignItems: "flex-end",
  },
  workoutDuration: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  workoutCalories: {
    color: "#9ca3af",
    fontSize: 12,
    marginTop: 4,
  },
  aiSection: {
    marginBottom: 32,
  },
  aiCard: {
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
  },
  aiLabel: {
    color: "#60a5fa",
    fontSize: 12,
    marginBottom: 8,
  },
  aiText: {
    color: "#d1d5db",
    fontSize: 14,
    lineHeight: 20,
  },
});
