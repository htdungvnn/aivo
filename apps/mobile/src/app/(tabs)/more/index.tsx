/**
 * AIVO Mobile - More Tab Screen
 * Profile, Settings, Security, and other account options
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import {
  ScrollScreen,
  AppHeader,
  Card,
  SectionHeader,
  ListHeader,
  Badge,
  spacingNamed,
  fontSize,
  fontWeight,
} from '@/components/mobile';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthGuard } from '@/contexts/AuthGuardContext';

interface MenuItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  badge?: string;
  badgeVariant?: 'success' | 'warning' | 'danger' | 'info' | 'default';
  onPress: () => void;
}

interface MenuSection {
  title?: string;
  items: MenuItem[];
}

export default function MoreScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const { user, logout } = useAuthGuard();

  const menuSections: MenuSection[] = [
    {
      title: 'Health',
      items: [
        {
          id: 'readiness',
          title: 'Readiness',
          subtitle: 'Your daily wellness score',
          icon: 'pulse',
          iconColor: colors.readiness,
          onPress: () => router.push('/health/readiness'),
        },
        {
          id: 'sleep',
          title: 'Sleep',
          subtitle: 'Track your sleep patterns',
          icon: 'moon',
          iconColor: colors.sleep,
          onPress: () => router.push('/health/sleep'),
        },
        {
          id: 'activity',
          title: 'Activity',
          subtitle: 'Steps and movement',
          icon: 'walk',
          iconColor: colors.activity,
          onPress: () => router.push('/health/activity'),
        },
        {
          id: 'hydration',
          title: 'Hydration',
          subtitle: 'Water intake tracking',
          icon: 'water',
          iconColor: colors.hydration,
          onPress: () => router.push('/health/hydration'),
        },
        {
          id: 'body-metrics',
          title: 'Body Metrics',
          subtitle: 'Weight and measurements',
          icon: 'body',
          iconColor: colors.textSecondary,
          onPress: () => router.push('/health/body-metrics'),
        },
        {
          id: 'habits',
          title: 'Habits',
          subtitle: 'Daily habit tracking',
          icon: 'checkbox',
          iconColor: colors.primary,
          onPress: () => router.push('/health/habits'),
        },
      ],
    },
    {
      title: 'Account',
      items: [
        {
          id: 'profile',
          title: 'Profile',
          subtitle: 'Personal information',
          icon: 'person',
          iconColor: colors.primary,
          onPress: () => router.push('/profile'),
        },
        {
          id: 'integrations',
          title: 'Integrations',
          subtitle: 'Connected apps and devices',
          icon: 'link',
          iconColor: colors.info,
          badge: '3',
          badgeVariant: 'info',
          onPress: () => router.push('/integrations'),
        },
        {
          id: 'security',
          title: 'Security',
          subtitle: 'Password and sessions',
          icon: 'shield-checkmark',
          iconColor: colors.success,
          onPress: () => router.push('/security'),
        },
        {
          id: 'settings',
          title: 'Settings',
          subtitle: 'App preferences',
          icon: 'settings',
          iconColor: colors.textSecondary,
          onPress: () => router.push('/settings'),
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          id: 'reports',
          title: 'Health Reports',
          subtitle: 'Download your reports',
          icon: 'document-text',
          iconColor: colors.workout,
          onPress: () => router.push('/reports'),
        },
        {
          id: 'notifications',
          title: 'Notifications',
          subtitle: 'Manage alerts',
          icon: 'notifications',
          iconColor: colors.warning,
          onPress: () => router.push('/notifications'),
        },
        {
          id: 'help',
          title: 'Help & Support',
          subtitle: 'FAQs and contact',
          icon: 'help-circle',
          iconColor: colors.info,
          onPress: () => router.push('/help'),
        },
      ],
    },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <ScrollScreen
      edges={['top']}
      contentStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.headerSpacer} />

      {/* Header */}
      <AppHeader title="More" />

      {/* User Card */}
      <Card variant="elevated" padding="lg" style={styles.userCard}>
        <TouchableOpacity
          style={styles.userContent}
          onPress={() => router.push('/profile')}
          activeOpacity={0.7}
        >
          <View style={styles.avatarContainer}>
            {user?.avatarUrl ? (
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarText}>
                  {user.displayName?.[0]?.toUpperCase() || 'U'}
                </Text>
              </View>
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarText}>
                  {user?.displayName?.[0]?.toUpperCase() || 'U'}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.textPrimary }]}>
              {user?.displayName || 'User'}
            </Text>
            <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
              {user?.email || 'user@example.com'}
            </Text>
            <View style={styles.userBadges}>
              <Badge label="Pro" variant="success" size="sm" />
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </Card>

      {/* Menu Sections */}
      {menuSections.map((section, sectionIndex) => (
        <View key={sectionIndex} style={styles.section}>
          {section.title && (
            <ListHeader title={section.title} />
          )}
          <Card padding="none">
            {section.items.map((item, itemIndex) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItem,
                  itemIndex < section.items.length - 1 && styles.menuItemBorder,
                ]}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.menuIcon,
                    { backgroundColor: (item.iconColor || colors.primary) + '20' },
                  ]}
                >
                  <Ionicons
                    name={item.icon}
                    size={20}
                    color={item.iconColor || colors.primary}
                  />
                </View>
                <View style={styles.menuItemContent}>
                  <View style={styles.menuItemText}>
                    <Text style={[styles.menuItemTitle, { color: colors.textPrimary }]}>
                      {item.title}
                    </Text>
                    {item.subtitle && (
                      <Text style={[styles.menuItemSubtitle, { color: colors.textSecondary }]}>
                        {item.subtitle}
                      </Text>
                    )}
                  </View>
                  <View style={styles.menuItemRight}>
                    {item.badge && (
                      <Badge
                        label={item.badge}
                        variant={item.badgeVariant || 'default'}
                        size="sm"
                      />
                    )}
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </Card>
        </View>
      ))}

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={[styles.appVersion, { color: colors.textMuted }]}>
          AIVO v1.0.0
        </Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={[styles.logoutText, { color: colors.danger }]}>
            Sign Out
          </Text>
        </TouchableOpacity>
      </View>

      {/* Legal Links */}
      <View style={styles.legalLinks}>
        <TouchableOpacity>
          <Text style={[styles.legalLink, { color: colors.textMuted }]}>
            Privacy Policy
          </Text>
        </TouchableOpacity>
        <Text style={[styles.legalDot, { color: colors.textMuted }]}>•</Text>
        <TouchableOpacity>
          <Text style={[styles.legalLink, { color: colors.textMuted }]}>
            Terms of Service
          </Text>
        </TouchableOpacity>
        <Text style={[styles.legalDot, { color: colors.textMuted }]}>•</Text>
        <TouchableOpacity>
          <Text style={[styles.legalLink, { color: colors.textMuted }]}>
            Licenses
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bottom padding */}
      <View style={styles.bottomPadding} />
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacingNamed.lg,
  },
  headerSpacer: {
    height: 20,
  },
  userCard: {
    marginBottom: spacingNamed['2xl'],
  },
  userContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: spacingNamed.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  userEmail: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  userBadges: {
    flexDirection: 'row',
    gap: spacingNamed.sm,
    marginTop: spacingNamed.sm,
  },
  section: {
    marginBottom: spacingNamed['2xl'],
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacingNamed.md,
    paddingHorizontal: spacingNamed.lg,
  },
  menuItemBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacingNamed.md,
  },
  menuItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  menuItemSubtitle: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingNamed.sm,
  },
  appInfo: {
    alignItems: 'center',
    marginBottom: spacingNamed.lg,
  },
  appVersion: {
    fontSize: fontSize.sm,
    marginBottom: spacingNamed.sm,
  },
  logoutText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacingNamed.sm,
    marginBottom: spacingNamed['2xl'],
  },
  legalLink: {
    fontSize: fontSize.sm,
  },
  legalDot: {
    fontSize: fontSize.sm,
  },
  bottomPadding: {
    height: 100,
  },
});

export {};
