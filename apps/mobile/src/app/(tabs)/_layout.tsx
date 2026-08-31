/**
 * AIVO Mobile - Main Tab Navigation
 * Bottom tab navigation with Today, Plan, Coach, Progress, More
 */

import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, TouchTarget } from '@/constants/theme';
import { Ionicons } from '@expo/ui';

// Tab bar icon component
function TabBarIcon({ 
  name, 
  color, 
  focused,
  badge 
}: { 
  name: keyof typeof Ionicons.glyphMap; 
  color: string; 
  focused: boolean;
  badge?: number;
}) {
  return (
    <View style={styles.iconContainer}>
      <Ionicons 
        name={focused ? name : `${name}-outline` as keyof typeof Ionicons.glyphMap} 
        size={24} 
        color={color} 
      />
      {badge && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      )}
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const isDark = colorScheme === 'dark';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
          height: Platform.select({ ios: 84, android: 64 }) ?? 64,
          paddingTop: 8,
          paddingBottom: Platform.select({ ios: 28, android: 8 }) ?? 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 4,
        },
        tabBarItemStyle: {
          minHeight: TouchTarget.minimum,
        },
      }}
    >
      {/* Today Tab - Daily Intelligence Dashboard */}
      <Tabs.Screen
        name="today"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="today" color={color} focused={focused} />
          ),
          tabBarTestID: 'tab-today',
        }}
      />

      {/* Plan Tab - Daily Plan */}
      <Tabs.Screen
        name="plan"
        options={{
          title: 'Plan',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="calendar" color={color} focused={focused} />
          ),
          tabBarTestID: 'tab-plan',
        }}
      />

      {/* Coach Tab - AI Coach */}
      <Tabs.Screen
        name="coach"
        options={{
          title: 'Coach',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="fitness" color={color} focused={focused} />
          ),
          tabBarTestID: 'tab-coach',
        }}
      />

      {/* Progress Tab - Analytics */}
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="stats-chart" color={color} focused={focused} />
          ),
          tabBarTestID: 'tab-progress',
        }}
      />

      {/* More Tab - Profile & Settings */}
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="menu" color={color} focused={focused} />
          ),
          tabBarTestID: 'tab-more',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
