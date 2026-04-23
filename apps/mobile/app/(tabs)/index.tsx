import { View, Text, ScrollView, StyleSheet } from "react-native";
import { Heart, Dumbbell, Flame, Clock } from "lucide-react-native";
import colors from "@/theme/colors";

export default function DashboardScreen() {
  const stats = [
    { icon: Heart, label: "Heart Rate", value: "72", unit: "bpm", color: colors.brand.primary },
    { icon: Dumbbell, label: "Workouts", value: "12", unit: "this week", color: colors.success },
    { icon: Flame, label: "Calories", value: "2,847", unit: "kcal", color: colors.warning },
    { icon: Clock, label: "Active", value: "345", unit: "minutes", color: colors.purple },
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
