import React from "react";
import { View, ActivityIndicator, Text, StyleSheet } from "react-native";
import { Activity as ActivityIcon } from "lucide-react-native";
import colors from "@/theme/colors";

interface LoadingProps {
  message?: string;
  fullScreen?: boolean;
}

/**
 * Reusable loading component with consistent styling
 */
export function Loading({ message = "Loading...", fullScreen = false }: LoadingProps) {
  const content = (
    <View style={styles.container}>
      <ActivityIcon size={48} color={colors.brand.primary} />
      <ActivityIndicator size="large" color={colors.brand.primary} style={styles.spinner} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );

  if (fullScreen) {
    return <View style={styles.fullScreen}>{content}</View>;
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16,
  },
  fullScreen: {
    flex: 1,
    backgroundColor: colors.background.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  spinner: {
    marginTop: 8,
  },
  message: {
    color: colors.text.secondary,
    fontSize: 16,
    textAlign: "center",
  },
});
