import * as Device from 'expo-device';
import { Platform, StyleSheet, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useEffect } from 'react';

import { AnimatedIcon } from '@/components/animated-icon';
import { HintRow } from '@/components/hint-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WebBadge } from '@/components/web-badge';
import { useAuthGuard } from '@/contexts/AuthGuardContext';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

function getDevMenuHint() {
  if (Platform.OS === 'web') {
    return <ThemedText type="small">use browser devtools</ThemedText>;
  }
  if (Device.isDevice) {
    return (
      <ThemedText type="small">
        shake device or press <ThemedText type="code">m</ThemedText> in terminal
      </ThemedText>
    );
  }
  const shortcut = Platform.OS === 'android' ? 'cmd+m (or ctrl+m)' : 'cmd+d';
  return (
    <ThemedText type="small">
      press <ThemedText type="code">{shortcut}</ThemedText>
    </ThemedText>
  );
}

export default function HomeScreen() {
  const { isAuthenticated, isReady, isLoading } = useAuthGuard();

  // Redirect to profile if authenticated, login if not
  useEffect(() => {
    if (isReady && !isLoading) {
      if (isAuthenticated) {
        router.replace('/profile');
      }
      // If not authenticated, stay on home (landing page)
    }
  }, [isReady, isLoading, isAuthenticated]);

  const handleGetStarted = () => {
    router.push('/auth/login');
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.heroSection}>
          <AnimatedIcon />
          <ThemedText type="title" style={styles.title}>
            Welcome to AIVO
          </ThemedText>
          <ThemedText type="body" style={styles.subtitle}>
            Your AI-powered voice assistant
          </ThemedText>
        </ThemedView>

        {!isAuthenticated && (
          <View style={styles.ctaContainer}>
            <Text style={styles.ctaButton} onPress={handleGetStarted}>
              Get Started
            </Text>
          </View>
        )}

        <ThemedText type="code" style={styles.code}>
          features
        </ThemedText>

        <ThemedView type="backgroundElement" style={styles.stepContainer}>
          <HintRow
            title="Voice Commands"
            hint={<ThemedText type="body">Natural language processing</ThemedText>}
          />
          <HintRow
            title="Smart Reminders"
            hint={<ThemedText type="body">Never miss an important task</ThemedText>}
          />
          <HintRow
            title="Personalized AI"
            hint={<ThemedText type="body">Learns your preferences</ThemedText>}
          />
        </ThemedView>

        {Platform.OS === 'web' && <WebBadge />}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
  },
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    color: '#666',
  },
  ctaContainer: {
    marginVertical: Spacing.three,
  },
  ctaButton: {
    backgroundColor: '#208AEF',
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.six,
    borderRadius: Spacing.two,
    overflow: 'hidden',
  },
  code: {
    textTransform: 'uppercase',
  },
  stepContainer: {
    gap: Spacing.three,
    alignSelf: 'stretch',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
    borderRadius: Spacing.four,
  },
});
