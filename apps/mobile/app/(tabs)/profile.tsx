import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { User, Settings, LogOut, Bell, Shield, HelpCircle, Download, FileSpreadsheet, FileJson, FileText } from "lucide-react-native";
import { useState, useCallback } from "react";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "@/contexts/AuthContext";
import { createApiClient, type ExportFormat } from "@aivo/api-client";

const COLORS = {
  background: "#030712",
  surface: "#111827",
  surfaceDark: "#1f2937",
  border: "#374151",
  textMuted: "#9ca3af",
  textPrimary: "#ffffff",
  primary: "#3b82f6",
  danger: COLORS.danger,
  success: COLORS.success,
  successDark: "#064e3b",
  successLight: COLORS.successLight,
  gray: "#6b7280",
  overlay: COLORS.overlay,
  transparent: COLORS.transparent,
} as const;

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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <User size={48} color={COLORS.textMuted} />
        </View>
        <Text style={styles.userName}>{user?.name || "Alex Johnson"}</Text>
        <Text style={styles.userEmail}>{user?.email || "alex@aivo.fit"}</Text>
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
          <TouchableOpacity key={index} style={styles.menuItem} onPress={item.onPress ? () => void item.onPress?.() : undefined}>
            <View style={[styles.menuIconContainer, item.isPrimary && styles.primaryIconContainer]}>
              <item.icon size={20} color={item.isDestructive ? COLORS.danger : item.isPrimary ? COLORS.success : "#3b82f6"} />
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

      {/* Export Format Selection Modal */}
      {showExportOptions && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Export Data</Text>
            <Text style={styles.modalSubtitle}>Select format to download</Text>

            {exportFormats.map((format, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.formatOption, exportFormat === format.value && styles.selectedFormatOption]}
                onPress={() => setExportFormat(format.value)}
              >
                <format.icon size={24} color={exportFormat === format.value ? COLORS.success : COLORS.textMuted} />
                <Text style={styles.formatLabel}>{format.label}</Text>
                {exportFormat === format.value && (
                  <View style={styles.checkmark}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowExportOptions(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, isExporting && styles.disabledButton]}
                onPress={() => void handleExport()}
                disabled={isExporting}
              >
                <Text style={styles.confirmButtonText}>
                  {isExporting ? "Exporting..." : "Export"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <Text style={styles.version}>AIVO v0.1.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.surfaceDark,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  userName: {
    color: COLORS.textPrimary,
    fontSize: 24,
    fontWeight: "bold",
  },
  userEmail: {
    color: COLORS.textMuted,
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
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "bold",
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  menuContainer: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceDark,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  primaryIconContainer: {
    backgroundColor: COLORS.successLight,
  },
  menuLabel: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 16,
  },
  menuAction: {
    color: COLORS.primary,
    fontSize: 14,
  },
  destructiveText: {
    color: COLORS.danger,
  },
  // Export Modal Styles
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 360,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 4,
  },
  modalSubtitle: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },
  formatOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceDark,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: COLORS.transparent,
    gap: 12,
  },
  selectedFormatOption: {
    borderColor: COLORS.success,
    backgroundColor: "#064e3b",
  },
  formatLabel: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "500",
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.success,
    justifyContent: "center",
    alignItems: "center",
  },
  checkmarkText: {
    color: COLORS.textPrimary,
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
    backgroundColor: COLORS.border,
  },
  cancelButtonText: {
    color: COLORS.textMuted,
    fontSize: 16,
    fontWeight: "600",
  },
  confirmButton: {
    backgroundColor: COLORS.success,
  },
  confirmButtonText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.6,
  },
  version: {
    color: "#6b7280",
    fontSize: 12,
    textAlign: "center",
    marginTop: 24,
    marginBottom: 32,
  },
});
