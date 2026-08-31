/**
 * AIVO Mobile - Screen Container Component
 * Provides consistent screen layout with safe areas
 */

import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, StatusBar, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Colors, spacingNamed, TouchTarget } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthGuard } from '@/contexts/AuthGuardContext';

interface ScreenProps {
  children: ReactNode;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  safeArea?: boolean;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  backgroundColor?: string;
  withHeader?: boolean;
  headerProps?: HeaderProps;
}

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  rightAction?: ReactNode;
  leftAction?: ReactNode;
}

export function Screen({
  children,
  style,
  contentStyle,
  safeArea = true,
  edges = ['top'],
  backgroundColor,
  withHeader = false,
  headerProps,
}: ScreenProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const bgColor = backgroundColor ?? colors.background;

  const content = (
    <View style={[styles.container, { backgroundColor: bgColor }, style]}>
      <View style={[styles.content, contentStyle]}>
        {children}
      </View>
    </View>
  );

  if (safeArea) {
    return (
      <SafeAreaView
        edges={edges}
        style={[styles.safeArea, { backgroundColor: bgColor }]}
      >
        {content}
      </SafeAreaView>
    );
  }

  return content;
}

// Scrollable screen variant
export function ScrollScreen({
  children,
  style,
  contentStyle,
  safeArea = true,
  edges = ['top'],
  backgroundColor,
  keyboardShouldPersistTaps = 'handled',
}: Omit<ScreenProps, 'withHeader' | 'headerProps'> & {
  keyboardShouldPersistTaps?: 'handled' | 'always' | 'never';
}) {
  const { ScrollView } = require('react-native');
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const bgColor = backgroundColor ?? colors.background;

  const content = (
    <ScrollView
      style={[styles.container, { backgroundColor: bgColor }]}
      contentContainerStyle={[styles.scrollContent, contentStyle]}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="automatic"
    >
      {children}
    </ScrollView>
  );

  if (safeArea) {
    return (
      <SafeAreaView
        edges={edges}
        style={[styles.safeArea, { backgroundColor: bgColor }]}
      >
        {content}
      </SafeAreaView>
    );
  }

  return content;
}

// Keyboard-aware screen variant
export function KeyboardAwareScreen({
  children,
  style,
  contentStyle,
  safeArea = true,
  edges = ['top'],
  backgroundColor,
}: Omit<ScreenProps, 'withHeader' | 'headerProps'>) {
  const { KeyboardAvoidingView, Platform } = require('react-native');
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const bgColor = backgroundColor ?? colors.background;

  const content = (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: bgColor }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <View style={[styles.content, contentStyle]}>
        {children}
      </View>
    </KeyboardAvoidingView>
  );

  if (safeArea) {
    return (
      <SafeAreaView
        edges={edges}
        style={[styles.safeArea, { backgroundColor: bgColor }]}
      >
        {content}
      </SafeAreaView>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacingNamed.lg,
  },
  scrollContent: {
    paddingHorizontal: spacingNamed.lg,
    paddingBottom: spacingNamed['3xl'],
  },
});

export default Screen;
