/**
 * Login screen for mobile
 */

import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Colors } from '@/constants/theme';

export default function LoginScreen() {
  const { login, error, clearError, isLoading } = useAuth();

  const handleGoogleLogin = async () => {
    clearError();
    try {
      await login('google');
    } catch (err) {
      console.error('Google login error:', err);
    }
  };

  const handleFacebookLogin = async () => {
    clearError();
    try {
      await login('facebook');
    } catch (err) {
      console.error('Facebook login error:', err);
    }
  };

  if (error) {
    Alert.alert('Login Error', error, [{ text: 'OK', onPress: clearError }]);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Welcome to AIVO</Text>
            <Text style={styles.subtitle}>Sign in to continue</Text>
          </View>

          <View style={styles.providers}>
            <TouchableOpacity
              style={styles.providerButton}
              onPress={handleGoogleLogin}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <Text style={styles.providerIcon}>G</Text>
              <Text style={styles.providerText}>Continue with Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.providerButton, styles.facebookButton]}
              onPress={handleFacebookLogin}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <Text style={[styles.providerIcon, styles.facebookIcon]}>f</Text>
              <Text style={[styles.providerText, styles.facebookText]}>Continue with Facebook</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.terms}>
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </Text>
        </View>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.six,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: Spacing.two,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  providers: {
    gap: Spacing.three,
  },
  providerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    backgroundColor: '#fff',
    gap: Spacing.two,
  },
  providerIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4285f4',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '600',
    fontSize: 14,
  },
  facebookIcon: {
    backgroundColor: '#1877f2',
  },
  providerText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  facebookText: {
    color: '#fff',
  },
  facebookButton: {
    backgroundColor: '#1877f2',
    borderColor: '#1877f2',
  },
  terms: {
    marginTop: Spacing.six,
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});
