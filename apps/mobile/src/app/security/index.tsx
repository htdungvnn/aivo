/**
 * AIVO Mobile - Security Screen
 * Account security, sessions, and authentication
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/ui';

import {
  ScrollScreen,
  BackHeader,
  Card,
  SectionHeader,
  Badge,
  spacingNamed,
  fontSize,
  fontWeight,
} from '@/components/mobile';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/useAuth';

interface Session {
  id: string;
  deviceName: string;
  platform: string;
  lastActive: string;
  isCurrent: boolean;
}

export default function SecurityScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const { logoutAll } = useAuth();

  // Mock data
  const sessions: Session[] = [
    { id: '1', deviceName: 'iPhone 15 Pro', platform: 'iOS', lastActive: 'Just now', isCurrent: true },
    { id: '2', deviceName: 'Chrome on MacBook', platform: 'Web', lastActive: '2 hours ago', isCurrent: false },
    { id: '3', deviceName: 'Samsung Galaxy S24', platform: 'Android', lastActive: 'Yesterday', isCurrent: false },
  ];

  const connectedProviders = [
    { provider: 'Google', connected: true },
    { provider: 'Facebook', connected: true },
    { provider: 'Apple', connected: false },
  ];

  const handleRevokeSession = (session: Session) => {
    Alert.alert(
      'Revoke Session',
      `Are you sure you want to sign out of "${session.deviceName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: () => {
            // Would call API to revoke session
            Alert.alert('Session Revoked', 'The session has been signed out.');
          },
        },
      ]
    );
  };

  const handleLogoutAll = () => {
    Alert.alert(
      'Sign Out All Devices',
      'This will sign you out of all devices except this one. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out All',
          style: 'destructive',
          onPress: async () => {
            await logoutAll();
            Alert.alert('Signed Out', 'All other sessions have been signed out.');
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => router.push('/settings/delete-account'),
        },
      ]
    );
  };

  const getPlatformIcon = (platform: string): keyof typeof Ionicons.glyphMap => {
    const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
      iOS: 'logo-apple',
      Android: 'logo-android',
      Web: 'globe',
    };
    return icons[platform] || 'phone-portrait';
  };

  return (
    <ScrollScreen
      edges={['top']}
      contentStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.headerSpacer} />

      <BackHeader title="Security" subtitle="Manage your account security" />

      {/* Account Status */}
      <Card variant="elevated" padding="lg" style={styles.statusCard}>
        <View style={styles.statusRow}>
          <View style={[styles.statusIcon, { backgroundColor: colors.success + '20' }]}>
            <Ionicons name="shield-checkmark" size={24} color={colors.success} />
          </View>
          <View style={styles.statusInfo}>
            <Text style={[styles.statusTitle, { color: colors.textPrimary }]}>
              Account Active
            </Text>
            <Text style={[styles.statusSubtitle, { color: colors.textSecondary }]}>
              Your account is secure
            </Text>
          </View>
        </View>
      </Card>

      {/* Connected Providers */}
      <SectionHeader title="Connected Accounts" />
      
      <Card padding="none">
        {connectedProviders.map((item, index) => (
          <React.Fragment key={item.provider}>
            <View style={styles.providerRow}>
              <View style={styles.providerInfo}>
                <Ionicons
                  name={item.provider === 'Google' ? 'logo-google' : item.provider === 'Facebook' ? 'logo-facebook' : 'logo-apple'}
                  size={24}
                  color={item.provider === 'Google' ? '#4285F4' : item.provider === 'Facebook' ? '#1877F2' : colors.textSecondary}
                />
                <Text style={[styles.providerName, { color: colors.textPrimary }]}>
                  {item.provider}
                </Text>
              </View>
              {item.connected ? (
                <Badge label="Connected" variant="success" size="sm" />
              ) : (
                <TouchableOpacity>
                  <Text style={[styles.connectText, { color: colors.primary }]}>
                    Connect
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            {index < connectedProviders.length - 1 && (
              <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
            )}
          </React.Fragment>
        ))}
      </Card>

      {/* Active Sessions */}
      <SectionHeader
        title="Active Sessions"
        action={{
          label: 'Sign out all',
          onPress: handleLogoutAll,
        }}
      />
      
      <Card padding="none">
        {sessions.map((session, index) => (
          <React.Fragment key={session.id}>
            <View style={styles.sessionRow}>
              <View style={[styles.sessionIcon, { backgroundColor: colors.surfaceMuted }]}>
                <Ionicons
                  name={getPlatformIcon(session.platform)}
                  size={20}
                  color={colors.textSecondary}
                />
              </View>
              <View style={styles.sessionInfo}>
                <View style={styles.sessionHeader}>
                  <Text style={[styles.sessionDevice, { color: colors.textPrimary }]}>
                    {session.deviceName}
                  </Text>
                  {session.isCurrent && (
                    <Badge label="Current" variant="success" size="sm" />
                  )}
                </View>
                <Text style={[styles.sessionMeta, { color: colors.textMuted }]}>
                  {session.platform} • {session.lastActive}
                </Text>
              </View>
              {!session.isCurrent && (
                <TouchableOpacity
                  onPress={() => handleRevokeSession(session)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close-circle-outline" size={22} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
            {index < sessions.length - 1 && (
              <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
            )}
          </React.Fragment>
        ))}
      </Card>

      {/* Security Options */}
      <SectionHeader title="Security Options" />
      
      <Card padding="none">
        <TouchableOpacity style={styles.actionRow}>
          <View style={styles.actionInfo}>
            <Ionicons name="key-outline" size={20} color={colors.textSecondary} />
            <View>
              <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>
                Change Password
              </Text>
              <Text style={[styles.actionDesc, { color: colors.textMuted }]}>
                Update your account password
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
        <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
        <TouchableOpacity style={styles.actionRow}>
          <View style={styles.actionInfo}>
            <Ionicons name="mail-outline" size={20} color={colors.textSecondary} />
            <View>
              <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>
                Change Email
              </Text>
              <Text style={[styles.actionDesc, { color: colors.textMuted }]}>
                Update your email address
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
        <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
        <TouchableOpacity style={styles.actionRow}>
          <View style={styles.actionInfo}>
            <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
            <View>
              <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>
                Session History
              </Text>
              <Text style={[styles.actionDesc, { color: colors.textMuted }]}>
                View past login activity
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </Card>

      {/* Danger Zone */}
      <SectionHeader title="Danger Zone" />
      
      <Card variant="bordered" padding="lg" style={styles.dangerCard}>
        <TouchableOpacity
          style={styles.dangerAction}
          onPress={handleDeleteAccount}
        >
          <View style={[styles.dangerIcon, { backgroundColor: colors.danger + '15' }]}>
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </View>
          <View style={styles.dangerInfo}>
            <Text style={[styles.dangerLabel, { color: colors.danger }]}>
              Delete Account
            </Text>
            <Text style={[styles.dangerDesc, { color: colors.textMuted }]}>
              Permanently delete your account and all data
            </Text>
          </View>
        </TouchableOpacity>
      </Card>

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
  statusCard: {
    marginBottom: spacingNamed['2xl'],
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacingNamed.md,
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  statusSubtitle: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacingNamed.md,
    paddingHorizontal: spacingNamed.lg,
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingNamed.md,
  },
  providerName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  connectText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacingNamed.md,
    paddingHorizontal: spacingNamed.lg,
  },
  sessionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacingNamed.md,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingNamed.sm,
  },
  sessionDevice: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  sessionMeta: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  rowDivider: {
    height: 0.5,
    marginLeft: spacingNamed.lg,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacingNamed.md,
    paddingHorizontal: spacingNamed.lg,
  },
  actionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingNamed.md,
    flex: 1,
  },
  actionLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  actionDesc: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  dangerCard: {
    borderColor: colors.danger + '30',
  },
  dangerAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dangerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacingNamed.md,
  },
  dangerInfo: {
    flex: 1,
  },
  dangerLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  dangerDesc: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  bottomPadding: {
    height: 100,
  },
});

export {};
