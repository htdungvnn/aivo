import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Dumbbell } from "lucide-react-native";

export default function WorkoutsScreen() {
  const router = useRouter();
  const workoutCategories = [
    { name: "HIIT", color: "#ef4444", count: 24 },
    { name: "Strength", color: "#3b82f6", count: 48 },
    { name: "Cardio", color: "#10b981", count: 32 },
    { name: "Yoga", color: "#8b5cf6", count: 18 },
    { name: "Running", color: "#f59e0b", count: 56 },
    { name: "Cycling", color: "#06b6d4", count: 21 },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Workouts</Text>
        <Text style={styles.subtitle}>Choose your challenge</Text>
      </View>

      <View style={styles.categoriesGrid}>
        {workoutCategories.map((category) => (
          <View key={category.name} style={styles.categoryCard}>
            <View style={[styles.categoryIcon, { backgroundColor: `${category.color}20` }]}>
              <Dumbbell size={24} color={category.color} />
            </View>
            <Text style={styles.categoryName}>{category.name}</Text>
            <Text style={styles.categoryCount}>{category.count} workouts</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recommended for You</Text>
        <View style={styles.recommendedCard}>
          <View>
            <Text style={styles.recommendedName}>Full Body Burn</Text>
            <Text style={styles.recommendedMeta}>45 min • Intermediate</Text>
          </View>
          <TouchableOpacity
            style={styles.startButton}
            onPress={() =>
              router.push("/active-workout", {
                workoutName: "Full Body Burn",
                targetRPE: 8,
                idealRestSeconds: 90,
              })
            }
          >
            <Text style={styles.startButtonText}>Start</Text>
          </TouchableOpacity>
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
  title: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "bold",
  },
  subtitle: {
    color: "#9ca3af",
    fontSize: 14,
    marginTop: 4,
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 12,
  },
  categoryCard: {
    width: "30%",
    backgroundColor: "#111827",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#374151",
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  categoryCount: {
    color: "#9ca3af",
    fontSize: 11,
    marginTop: 2,
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
  recommendedCard: {
    backgroundColor: "#111827",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#374151",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  recommendedName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  recommendedMeta: {
    color: "#9ca3af",
    fontSize: 12,
    marginTop: 4,
  },
  startButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  startButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
