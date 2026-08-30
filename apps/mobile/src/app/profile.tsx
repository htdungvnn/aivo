/**
 * Profile Screen - Protected Route
 * Shows user profile and session information
 */

import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthGuard } from '@/contexts/AuthGuardContext';
import { getAuthClient, Session } from '@/lib/auth';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

interface SessionsResponse {
  sessions: Session[];
  total: number;
}

export default function ProfileScreen() {
  const { user, session, roles, isAuthenticated, isLoading: authLoading, needsVerification } = useAuthGuard();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const authClient = getAuthClient();

  const loadSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    try {
      const response = await authClient.getSessions();
      setSessions(response.sessions);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      loadSessions();
    }
  }, [isAuthenticated, authLoading, loadSessions]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadSessions();
    setIsRefreshing(false);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await authClient.logout();
            router.replace('/auth/login');
          },
        },
      ]
    );
  };

  const handleLogoutAll = async () => {
    Alert.alert(
      'Sign Out All Devices',
      'This will sign you out from all devices. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out All',
          style: 'destructive',
          onPress: async () => {
            try {
              await authClient.logoutAll();
              router.replace('/auth/login');
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out from all devices');
            }
          },
        },
      ]
    );
  };

  const handleRevokeSession = async (sessionId: string) => {
    Alert.alert(
      'Revoke Session',
      'Are you sure you want to end this session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              await authClient.revokeSession(sessionId);
              await loadSessions();
            } catch (error) {
              Alert.alert('Error', 'Failed to revoke session');
            }
          },
        },
      ]
    );
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDeviceIcon = (deviceName: string | null, platform: string | null) => {
    if (platform?.includes('iOS') || deviceName?.toLowerCase().includes('iphone') || deviceName?.toLowerCase().includes('ipad')) {
      return '📱';
    }
    if (platform?.includes('Android') || deviceName?.toLowerCase().includes('android')) {
      return '📱';
    }
    return '💻';
  };

  if (authLoading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      </ThemedView>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useRequireAuth
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          }
        >
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              {user?.avatarUrl ? (
                <Text style={styles.avatarImage}>👤</Text>
              ) : (
                <Text style={styles.avatarInitial}>
                  {user?.displayName?.charAt(0) || user?.email?.charAt(0) || '?'}
                </Text>
              )}
            </View>
            <ThemedText style={styles.displayName}>
              {user?.displayName || 'User'}
            </ThemedText>
            <ThemedText style={styles.email}>{user?.email}</ThemedText>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{user?.status}</Text>
            </View>
          </View>

          {/* Verification Warning */}
          {needsVerification && (
            <TouchableOpacity
              style={styles.warningCard}
              onPress={() => router.push('/auth/verification-pending')}
            >
              <Text style={styles.warningIcon}>📧</Text>
              <View style={styles.warningContent}>
                <Text style={styles.warningTitle}>Email Not Verified</Text>
                <Text style={styles.warningText}>
                  Verify your email to access all features
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          )}

          {/* Roles */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Roles</ThemedText>
            <View style={styles.rolesContainer}>
              {roles.map((role) => (
                <View key={role} style={styles.roleBadge}>
                  <Text style={styles.roleText}>{role}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Current Session */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Current Session</ThemedText>
            <View style={styles.sessionCard}>
              <View style={styles.sessionHeader}>
                <Text style={styles.deviceIcon}>
                  {getDeviceIcon(session?.deviceName, session?.platform)}
                </Text>
                <View style={styles.sessionInfo}>
                  <Text style={styles.deviceName}>
                    {session?.deviceName || session?.clientType || 'This Device'}
                  </Text>
                  <Text style={styles.sessionPlatform}>
                    {session?.platform || 'Unknown platform'}
                  </Text>
                </View>
                <View style={styles.currentBadge}>
                  <Text style={styles.currentBadgeText}>Current</Text>
                </View>
              </View>
              <View style={styles.sessionDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Last Active:</Text>
                  <Text style={styles.detailValue}>
                    {session?.lastActiveAt ? formatDate(session.lastActiveAt) : 'Unknown'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Created:</Text>
                  <Text style={styles.detailValue}>
                    {session?.createdAt ? formatDate(session.createdAt) : 'Unknown'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* All Sessions */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>Other Sessions</ThemedText>
              <TouchableOpacity onPress={handleLogoutAll}>
                <Text style={styles.signOutAllText}>Sign out all</Text>
              </TouchableOpacity>
            </View>
            {isLoadingSessions ? (
              <Text style={styles.loadingText}>Loading sessions...</Text>
            ) : sessions.length <= 1 ? (
              <Text style={styles.noSessionsText}>
                No other active sessions
              </Text>
            ) : (
              sessions
                .filter((s) => s.id !== session?.id)
                .map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={styles.sessionItem}
                    onLongPress={() => handleRevokeSession(s.id)}
                  >
                    <Text style={styles.deviceIcon}>
                      {getDeviceIcon(s.deviceName, s.platform)}
                    </Text>
                    <View style={styles.sessionItemInfo}>
                      <Text style={styles.deviceName}>
                        {s.deviceName || s.clientType || 'Unknown Device'}
                      </Text>
                      <Text style={styles.sessionPlatform}>
                        Last active: {formatDate(s.lastActiveAt)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.revokeButton}
                      onPress={() => handleRevokeSession(s.id)}
                    >
                      <Text style={styles.revokeText}>✕</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))
            )}
          </View>

          {/* Account Actions */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Account</ThemedText>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => router.push('/settings')}
            >
              <Text style={styles.actionIcon}>⚙️</Text>
              <Text style={styles.actionText}>Settings</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionItem, styles.dangerAction]}
              onPress={() => router.push('/settings/delete-account')}
            >
              <Text style={styles.actionIcon}>🗑️</Text>
              <Text style={[styles.actionText, styles.dangerText]}>Delete Account</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Sign Out */}
          <TouchableOpacity style={styles.signOutButton} onPress={handleLogout}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.four,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#208AEF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  avatarImage: {
    fontSize: 40,
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: '600',
    color: '#fff',
  },
  displayName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: Spacing.one,
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginBottom: Spacing.two,
  },
  badge: {
    backgroundColor: '#e5e5e5',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.one,
  },
  badgeText: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    margin: Spacing.four,
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
  warningIcon: {
    fontSize: 24,
    marginRight: Spacing.three,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400e',
  },
  warningText: {
    fontSize: 14,
    color: '#b45309',
  },
  chevron: {
    fontSize: 24,
    color: '#999',
  },
  section: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    marginBottom: Spacing.two,
  },
  signOutAllText: {
    fontSize: 14,
    color: '#ef4444',
  },
  rolesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  roleBadge: {
    backgroundColor: '#208AEF',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.one,
  },
  roleText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  sessionCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  deviceIcon: {
    fontSize: 24,
    marginRight: Spacing.three,
  },
  sessionInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
  },
  sessionPlatform: {
    fontSize: 12,
    color: '#666',
  },
  currentBadge: {
    backgroundColor: '#22c55e',
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Spacing.one,
  },
  currentBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  sessionDetails: {
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    paddingTop: Spacing.two,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.one,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: Spacing.two,
    padding: Spacing.three,
    marginBottom: Spacing.two,
  },
  sessionItemInfo: {
    flex: 1,
    marginLeft: Spacing.three,
  },
  revokeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  revokeText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingVertical: Spacing.three,
  },
  noSessionsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingVertical: Spacing.three,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: Spacing.two,
    padding: Spacing.three,
    marginBottom: Spacing.two,
  },
  actionIcon: {
    fontSize: 20,
    marginRight: Spacing.three,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  dangerAction: {
    backgroundColor: '#fee2e2',
  },
  dangerText: {
    color: '#ef4444',
  },
  signOutButton: {
    marginHorizontal: Spacing.four,
    marginTop: Spacing.four,
    backgroundColor: '#ef4444',
    borderRadius: Spacing.two,
    padding: Spacing.three,
    alignItems: 'center',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
