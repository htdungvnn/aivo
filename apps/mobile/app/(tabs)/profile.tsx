import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { User, Settings, LogOut, Bell, Shield, HelpCircle, Download, FileSpreadsheet, FileJson, FileText } from "lucide-react-native";
import { useState, useCallback } from "react";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "@/contexts/AuthContext";
import { createApiClient, type ExportFormat } from "@aivo/api-client";
import colors from "@/theme/colors";

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [exportFormat, setExportFormat] = useState<ExportFormat>("xlsx");
  const [isExporting, setIsExporting] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);

  const handleExport = useCallback(async () => {
    if (!user) {return;}

    setIsExporting(true);
    try {
      const token = await SecureStore.getItemAsync("aivo_token");
      if (!token) {
        Alert.alert("Error", "No authentication token found. Please log in again.");
        return;
      }

      const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8787";

      const client = createApiClient({
        baseUrl: `${API_URL}/api`,
        tokenProvider: async () => token,
        userIdProvider: async () => user.id,
      });

      const result = await client.exportData({ format: exportFormat });

      if (!result.success || !result.data) {
        throw new Error(result.error || "Export failed");
      }

      // In a production app, you would:
      // 1. Save the file using expo-file-system
      // 2. Use expo-sharing to share the file
      // For now, show a success message
      Alert.alert(
        "Export Ready",
        `Your ${exportFormat.toUpperCase()} file (${(result.data.size / 1024).toFixed(1)} KB) is ready. In production, it would be saved to your device.`,
        [
          { text: "OK", style: "default" }
        ]
      );
    } catch (error) {
      Alert.alert("Export Failed", error instanceof Error ? error.message : "An error occurred during export");
    } finally {
      setIsExporting(false);
      setShowExportOptions(false);
    }
  }, [user, exportFormat]);

  const menuItems = [
    { icon: Download, label: "Export Data", action: "Tap to export", onPress: () => setShowExportOptions(true), isPrimary: true },
    { icon: Bell, label: "Notifications", action: "Configure" },
    { icon: Shield, label: "Privacy", action: "Manage" },
    { icon: HelpCircle, label: "Help & Support", action: "Get Help" },
    { icon: Settings, label: "Settings", action: "Open" },
    { icon: LogOut, label: "Sign Out", action: "", isDestructive: true, onPress: () => void logout() },
  ];

  const exportFormats = [
    { value: "xlsx" as ExportFormat, icon: FileSpreadsheet, label: "Excel (.xlsx)" },
    { value: "csv" as ExportFormat, icon: FileText, label: "CSV (.csv)" },
    { value: "json" as ExportFormat, icon: FileJson, label: "JSON (.json)" },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background.primary }]} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: colors.background.tertiary }]}>
          <User size={48} color={colors.text.secondary} />
        </View>
        <Text style={[styles.userName, { color: colors.text.primary }]}>{user?.name || "Alex Johnson"}</Text>
        <Text style={[styles.userEmail, { color: colors.text.secondary }]}>{user?.email || "alex@aivo.fit"}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text.primary }]}>15</Text>
            <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Workouts</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border.primary }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text.primary }]}>2,847</Text>
            <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Calories</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border.primary }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text.primary }]}>345</Text>
            <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Minutes</Text>
          </View>
        </View>
      </View>

      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity key={index} style={[styles.menuItem, { backgroundColor: colors.background.secondary, borderColor: colors.border.primary }]} onPress={item.onPress ? () => void item.onPress?.() : undefined}>
            <View style={[styles.menuIconContainer, item.isPrimary && styles.primaryIconContainer, { backgroundColor: item.isPrimary ? colors.overlay.light : colors.background.tertiary }]}>
              <item.icon size={20} color={item.isDestructive ? colors.error : item.isPrimary ? colors.success : colors.brand.primary} />
            </View>
            <Text style={[styles.menuLabel, { color: colors.text.primary }, item.isDestructive && { color: colors.error }]}>
              {item.label}
            </Text>
            {item.action && (
              <Text style={[styles.menuAction, { color: colors.brand.primary }]}>{item.action}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Export Format Selection Modal */}
      {showExportOptions && (
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay.medium }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.background.secondary, borderColor: colors.border.primary }]}>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Export Data</Text>
            <Text style={[styles.modalSubtitle, { color: colors.text.secondary }]}>Select format to download</Text>

            {exportFormats.map((format, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.formatOption, { backgroundColor: colors.background.tertiary, borderColor: colors.border.transparent }, exportFormat === format.value && [styles.selectedFormatOption, { borderColor: colors.success, backgroundColor: "#064e3b" }]]}
                onPress={() => setExportFormat(format.value)}
              >
                <format.icon size={24} color={exportFormat === format.value ? colors.success : colors.text.secondary} />
                <Text style={[styles.formatLabel, { color: colors.text.primary }]}>{format.label}</Text>
                {exportFormat === format.value && (
                  <View style={[styles.checkmark, { backgroundColor: colors.success }]}>
                    <Text style={[styles.checkmarkText, { color: colors.text.primary }]}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: colors.border.primary }]}
                onPress={() => setShowExportOptions(false)}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text.secondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, { backgroundColor: colors.success }, isExporting && styles.disabledButton]}
                onPress={() => void handleExport()}
                disabled={isExporting}
              >
                <Text style={[styles.confirmButtonText, { color: colors.text.primary }]}>
                  {isExporting ? "Exporting..." : "Export"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <Text style={[styles.version, { color: colors.text.tertiary }]}>AIVO v0.1.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 24,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
  },
  userEmail: {
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
    fontSize: 18,
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
  },
  menuContainer: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  primaryIconContainer: {
    // backgroundColor set inline
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
  },
  menuAction: {
    fontSize: 14,
  },
  // Export Modal Styles
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    zIndex: 1000,
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 360,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },
  formatOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    gap: 12,
  },
  selectedFormatOption: {
    // borderColor and backgroundColor set inline
  },
  formatLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  checkmarkText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButton: {
    // backgroundColor set inline
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  confirmButton: {
    // backgroundColor set inline
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.6,
  },
  version: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 24,
    marginBottom: 32,
  },
});
