/**
 * Settings Screen
 * App settings and preferences
 */

import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export default function SettingsScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);

  const handleOpenPrivacyPolicy = () => {
    Linking.openURL('https://aivo.app/privacy');
  };

  const handleOpenTermsOfService = () => {
    Linking.openURL('https://aivo.app/terms');
  };

  const handleDeleteAccount = () => {
    router.push('/settings/delete-account');
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          {/* Notifications Section */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Notifications</ThemedText>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Push Notifications</Text>
                <Text style={styles.settingDescription}>
                  Receive push notifications on your device
                </Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: '#e5e5e5', true: '#93c5fd' }}
                thumbColor={notificationsEnabled ? '#208AEF' : '#f4f4f4'}
              />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Email Notifications</Text>
                <Text style={styles.settingDescription}>
                  Receive email updates about your account
                </Text>
              </View>
              <Switch
                value={emailNotifications}
                onValueChange={setEmailNotifications}
                trackColor={{ false: '#e5e5e5', true: '#93c5fd' }}
                thumbColor={emailNotifications ? '#208AEF' : '#f4f4f5'}
              />
            </View>
          </View>

          {/* Security Section */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Security</ThemedText>
            <TouchableOpacity style={styles.actionRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Change Password</Text>
                <Text style={styles.settingDescription}>
                  Update your account password
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Two-Factor Authentication</Text>
                <Text style={styles.settingDescription}>
                  Add an extra layer of security
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Active Sessions</Text>
                <Text style={styles.settingDescription}>
                  Manage your active login sessions
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Privacy Section */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Privacy</ThemedText>
            <TouchableOpacity style={styles.actionRow} onPress={handleOpenPrivacyPolicy}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Privacy Policy</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionRow} onPress={handleOpenTermsOfService}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Terms of Service</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Data Export</Text>
                <Text style={styles.settingDescription}>
                  Download a copy of your data
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Account Section */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Account</ThemedText>
            <TouchableOpacity
              style={[styles.actionRow, styles.dangerRow]}
              onPress={handleDeleteAccount}
            >
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, styles.dangerText]}>Delete Account</Text>
                <Text style={styles.settingDescription}>
                  Permanently delete your account and data
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>

          {/* App Info */}
          <View style={styles.appInfo}>
            <Text style={styles.appVersion}>AIVO v1.0.0</Text>
            <Text style={styles.copyright}>© 2026 AIVO. All rights reserved.</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: Spacing.six,
  },
  section: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 8,
    borderBottomColor: '#f5f5f5',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    marginBottom: Spacing.three,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flex: 1,
    marginRight: Spacing.three,
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: '#999',
  },
  chevron: {
    fontSize: 24,
    color: '#ccc',
  },
  dangerRow: {
    borderBottomWidth: 0,
  },
  dangerText: {
    color: '#ef4444',
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: Spacing.four,
  },
  appVersion: {
    fontSize: 14,
    color: '#999',
    marginBottom: Spacing.one,
  },
  copyright: {
    fontSize: 12,
    color: '#bbb',
  },
});
