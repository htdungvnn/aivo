/**
 * Delete Account Screen
 * Process for deleting user account
 */

import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { getAuthClient } from '@/lib/auth';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/themed-button';
import { Spacing } from '@/constants/theme';

export default function DeleteAccountScreen() {
  const [confirmationText, setConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const authClient = getAuthClient();

  const isConfirmationValid = confirmationText.toLowerCase() === 'delete';

  const handleDeleteAccount = async () => {
    if (!isConfirmationValid) {
      Alert.alert('Error', 'Please type "DELETE" to confirm');
      return;
    }

    Alert.alert(
      'Delete Account',
      'This action is permanent. All your data will be deleted and cannot be recovered. Are you absolutely sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await authClient.deleteAccount();
              Alert.alert(
                'Account Deleted',
                'Your account has been deleted.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Clear tokens and redirect to login
                      authClient.clearTokens();
                      router.replace('/auth/login');
                    },
                  },
                ]
              );
            } catch (error) {
              Alert.alert(
                'Error',
                error instanceof Error ? error.message : 'Failed to delete account'
              );
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView contentContainerStyle={styles.content}>
            {/* Warning Header */}
            <View style={styles.warningHeader}>
              <Text style={styles.warningIcon}>⚠️</Text>
              <ThemedText style={styles.warningTitle}>Delete Account</ThemedText>
              <ThemedText style={styles.warningSubtitle}>
                This action is permanent and cannot be undone
              </ThemedText>
            </View>

            {/* Warning Content */}
            <View style={styles.warningContent}>
              <ThemedText style={styles.warningText}>
                Deleting your account will:
              </ThemedText>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>• Permanently remove your profile</Text>
                <Text style={styles.bulletItem}>• Delete all your data and content</Text>
                <Text style={styles.bulletItem}>• Remove access to all premium features</Text>
                <Text style={styles.bulletItem}>• Cancel any active subscriptions</Text>
                <Text style={styles.bulletItem}>• End all active sessions</Text>
              </View>
              <ThemedText style={styles.warningText}>
                Your data will be removed from our servers within 30 days.
              </ThemedText>
            </View>

            {/* Confirmation Input */}
            <View style={styles.confirmationSection}>
              <ThemedText style={styles.confirmationLabel}>
                Type <Text style={styles.confirmWord}>DELETE</Text> to confirm:
              </ThemedText>
              <TextInput
                style={styles.confirmationInput}
                value={confirmationText}
                onChangeText={setConfirmationText}
                placeholder="DELETE"
                placeholderTextColor="#ccc"
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <ThemedButton
                title={isDeleting ? 'Deleting...' : 'Delete My Account'}
                onPress={handleDeleteAccount}
                disabled={!isConfirmationValid || isDeleting}
                variant="destructive"
                style={styles.deleteButton}
              />
              <ThemedButton
                title="Cancel"
                onPress={() => router.back()}
                variant="outline"
                style={styles.cancelButton}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: Spacing.four,
  },
  warningHeader: {
    alignItems: 'center',
    paddingVertical: Spacing.four,
  },
  warningIcon: {
    fontSize: 64,
    marginBottom: Spacing.three,
  },
  warningTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ef4444',
    marginBottom: Spacing.two,
  },
  warningSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  warningContent: {
    backgroundColor: '#fef2f2',
    borderRadius: Spacing.two,
    padding: Spacing.four,
    marginBottom: Spacing.four,
  },
  warningText: {
    fontSize: 15,
    color: '#991b1b',
    lineHeight: 22,
    marginBottom: Spacing.two,
  },
  bulletList: {
    marginVertical: Spacing.two,
  },
  bulletItem: {
    fontSize: 14,
    color: '#b91c1c',
    lineHeight: 22,
  },
  confirmationSection: {
    marginBottom: Spacing.four,
  },
  confirmationLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: Spacing.two,
    textAlign: 'center',
  },
  confirmWord: {
    fontWeight: '700',
    color: '#ef4444',
  },
  confirmationInput: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#ef4444',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    color: '#333',
  },
  actions: {
    gap: Spacing.three,
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },
  cancelButton: {
    backgroundColor: '#fff',
  },
});
