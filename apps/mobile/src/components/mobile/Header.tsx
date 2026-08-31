/**
 * AIVO Mobile - Header Components
 * App header, back header, and section headers
 */

import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/ui';

import { Colors, spacingNamed, fontSize, fontWeight, TouchTarget, layout } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconButton } from './Button';

// =============================================================================
// App Header
// =============================================================================

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  left?: ReactNode;
  right?: ReactNode;
  large?: boolean;
  transparent?: boolean;
  style?: object;
}

export function AppHeader({
  title,
  subtitle,
  left,
  right,
  large = false,
  transparent = false,
  style,
}: AppHeaderProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <View
      style={[
        styles.header,
        !transparent && { backgroundColor: colors.background },
        large && styles.headerLarge,
        style,
      ]}
    >
      <View style={styles.headerContent}>
        {/* Left slot */}
        <View style={styles.headerLeft}>
          {left}
        </View>

        {/* Title */}
        <View style={styles.headerCenter}>
          {title && (
            <Text
              style={[
                styles.headerTitle,
                { color: colors.textPrimary },
                large && styles.headerTitleLarge,
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
          )}
          {subtitle && (
            <Text
              style={[
                styles.headerSubtitle,
                { color: colors.textSecondary },
              ]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          )}
        </View>

        {/* Right slot */}
        <View style={styles.headerRight}>
          {right}
        </View>
      </View>
    </View>
  );
}

// =============================================================================
// Back Header
// =============================================================================

interface BackHeaderProps {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
  large?: boolean;
  style?: object;
}

export function BackHeader({
  title,
  subtitle,
  onBack,
  right,
  large = false,
  style,
}: BackHeaderProps) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <View
      style={[
        styles.backHeader,
        { backgroundColor: colors.background },
        large && styles.headerLarge,
        style,
      ]}
    >
      {/* Back button */}
      <View style={styles.backButtonContainer}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>

      {/* Title */}
      <View style={styles.headerCenter}>
        {title && (
          <Text
            style={[
              styles.headerTitle,
              { color: colors.textPrimary },
              large && styles.headerTitleLarge,
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
        )}
        {subtitle && (
          <Text
            style={[
              styles.headerSubtitle,
              { color: colors.textSecondary },
            ]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        )}
      </View>

      {/* Right slot */}
      <View style={styles.headerRight}>
        {right}
      </View>
    </View>
  );
}

// =============================================================================
// Section Header
// =============================================================================

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
  icon?: ReactNode;
  style?: object;
}

export function SectionHeader({
  title,
  subtitle,
  action,
  icon,
  style,
}: SectionHeaderProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <View style={[styles.sectionHeader, style]}>
      <View style={styles.sectionHeaderLeft}>
        {icon && <View style={styles.sectionIcon}>{icon}</View>}
        <View>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>

      {action && (
        <TouchableOpacity
          onPress={action.onPress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
        >
          <Text style={[styles.sectionAction, { color: colors.primary }]}>
            {action.label}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// =============================================================================
// Tab Header
// =============================================================================

interface TabHeaderProps {
  tabs: string[];
  activeTab: number;
  onTabChange: (index: number) => void;
  style?: object;
}

export function TabHeader({
  tabs,
  activeTab,
  onTabChange,
  style,
}: TabHeaderProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <View style={[styles.tabHeader, { backgroundColor: colors.surface }, style]}>
      {tabs.map((tab, index) => (
        <TouchableOpacity
          key={index}
          onPress={() => onTabChange(index)}
          style={[
            styles.tabButton,
            index === activeTab && styles.tabButtonActive,
          ]}
          accessibilityRole="tab"
          accessibilityState={{ selected: index === activeTab }}
        >
          <Text
            style={[
              styles.tabText,
              { color: colors.textSecondary },
              index === activeTab && { color: colors.primary },
            ]}
          >
            {tab}
          </Text>
          {index === activeTab && (
            <View style={[styles.tabIndicator, { backgroundColor: colors.primary }]} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

// =============================================================================
// Greeting Header
// =============================================================================

interface GreetingHeaderProps {
  greeting?: string;
  name?: string;
  date?: Date;
  right?: ReactNode;
  style?: object;
}

export function GreetingHeader({
  greeting,
  name,
  date = new Date(),
  right,
  style,
}: GreetingHeaderProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  // Format date
  const formatDate = (d: Date): string => {
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  // Generate greeting
  const getGreeting = (): string => {
    if (greeting) return greeting;

    const hour = date.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <View style={[styles.greetingHeader, style]}>
      <View style={styles.greetingContent}>
        <Text style={[styles.greeting, { color: colors.textPrimary }]}>
          {getGreeting()}{name ? `, ${name}` : ''}
        </Text>
        <Text style={[styles.date, { color: colors.textSecondary }]}>
          {formatDate(date)}
        </Text>
      </View>
      {right && <View style={styles.greetingRight}>{right}</View>}
    </View>
  );
}

// =============================================================================
// List Header
// =============================================================================

interface ListHeaderProps {
  title: string;
  count?: number;
  style?: object;
}

export function ListHeader({
  title,
  count,
  style,
}: ListHeaderProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <View style={[styles.listHeader, style]}>
      <Text style={[styles.listHeaderTitle, { color: colors.textSecondary }]}>
        {title.toUpperCase()}
      </Text>
      {count !== undefined && (
        <Text style={[styles.listHeaderCount, { color: colors.textMuted }]}>
          {count}
        </Text>
      )}
    </View>
  );
}

// =============================================================================
// Empty Space Header (for scroll padding)
// =============================================================================

export function HeaderSpacer({ height = layout.headerHeight }: { height?: number }) {
  return <View style={{ height }} />;
}

const styles = StyleSheet.create({
  // App Header
  header: {
    height: layout.headerHeight,
    paddingTop: Platform.select({ ios: 50, android: 20 }) ?? 20,
    paddingHorizontal: spacingNamed.lg,
    justifyContent: 'center',
  },
  headerLarge: {
    height: Platform.select({ ios: 110, android: 100 }) ?? 100,
    paddingTop: Platform.select({ ios: 60, android: 40 }) ?? 40,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    minWidth: 44,
    alignItems: 'flex-start',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacingNamed.md,
  },
  headerRight: {
    minWidth: 44,
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
  headerTitleLarge: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },

  // Back Header
  backHeader: {
    height: layout.headerHeight,
    paddingTop: Platform.select({ ios: 50, android: 20 }) ?? 20,
    paddingHorizontal: spacingNamed.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonContainer: {
    minWidth: TouchTarget.minimum,
    height: TouchTarget.minimum,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    width: TouchTarget.minimum,
    height: TouchTarget.minimum,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacingNamed.md,
    paddingHorizontal: spacingNamed.xs,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    marginRight: spacingNamed.sm,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  sectionSubtitle: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  sectionAction: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },

  // Tab Header
  tabHeader: {
    flexDirection: 'row',
    paddingHorizontal: spacingNamed.lg,
    paddingVertical: spacingNamed.sm,
    gap: spacingNamed.lg,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacingNamed.sm,
    paddingHorizontal: spacingNamed.xs,
  },
  tabButtonActive: {},
  tabText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  tabIndicator: {
    height: 2,
    borderRadius: 1,
    marginTop: 4,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },

  // Greeting Header
  greetingHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacingNamed['2xl'],
  },
  greetingContent: {},
  greeting: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
  },
  date: {
    fontSize: fontSize.base,
    marginTop: spacingNamed.xs,
  },
  greetingRight: {
    marginTop: spacingNamed.xs,
  },

  // List Header
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacingNamed.md,
  },
  listHeaderTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.5,
  },
  listHeaderCount: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
});

export default AppHeader;
