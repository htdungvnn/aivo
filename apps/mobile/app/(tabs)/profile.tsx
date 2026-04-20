import { View, Text, StyleSheet, ScrollView } from "react-native";
import { User, Settings, LogOut, Bell, Shield, HelpCircle } from "lucide-react-native";

export default function ProfileScreen() {
  const menuItems = [
    { icon: Bell, label: "Notifications", action: "Configure" },
    { icon: Shield, label: "Privacy", action: "Manage" },
    { icon: HelpCircle, label: "Help & Support", action: "Get Help" },
    { icon: Settings, label: "Settings", action: "Open" },
    { icon: LogOut, label: "Sign Out", action: "", isDestructive: true },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <User size={48} color="#9ca3af" />
        </View>
        <Text style={styles.userName}>Alex Johnson</Text>
        <Text style={styles.userEmail}>alex@aivo.fit</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>15</Text>
            <Text style={styles.statLabel}>Workouts</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>2,847</Text>
            <Text style={styles.statLabel}>Calories</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>345</Text>
            <Text style={styles.statLabel}>Minutes</Text>
          </View>
        </View>
      </View>

      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity key={index} style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <item.icon size={20} color={item.isDestructive ? "#ef4444" : "#3b82f6"} />
            </View>
            <Text style={[styles.menuLabel, item.isDestructive && styles.destructiveText]}>
              {item.label}
            </Text>
            {item.action && (
              <Text style={styles.menuAction}>{item.action}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.version}>AIVO v0.1.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#030712",
  },
  header: {
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#374151",
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#1f2937",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  userName: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
  userEmail: {
    color: "#9ca3af",
    fontSize: 14,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: "row",
    marginTop: 20,
    paddingHorizontal: 20,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  statLabel: {
    color: "#9ca3af",
    fontSize: 12,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: "#374151",
  },
  menuContainer: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111827",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#374151",
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#1f2937",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  menuLabel: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
  },
  menuAction: {
    color: "#3b82f6",
    fontSize: 14,
  },
  destructiveText: {
    color: "#ef4444",
  },
  version: {
    color: "#6b7280",
    fontSize: 12,
    textAlign: "center",
    marginTop: 24,
    marginBottom: 32,
  },
});
