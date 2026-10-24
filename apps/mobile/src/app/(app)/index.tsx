import { Link, router } from 'expo-router';
import * as Device from 'expo-device';
import { Platform, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedIcon } from '@/components/animated-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuthContext } from '@/lib/auth-context';

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

const FEATURES = [
  {
    title: 'Personalized For You',
    body: 'Plans adapt to your goals, fitness level, schedule, and progress.',
  },
  {
    title: 'AI-Powered Guidance',
    body: 'Turn fitness and nutrition data into simple, actionable insights.',
  },
  {
    title: 'Track Real Progress',
    body: 'Understand how workouts, nutrition, weight, and habits change over time.',
  },
] as const;

export default function HomeScreen() {
  const { user, signOut } = useAuthContext();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.heroSection}>
          <AnimatedIcon />
          <ThemedText type="title" style={styles.title}>
            Your AI Coach for a Healthier You
          </ThemedText>
          <ThemedText style={styles.tagline}>
            Personalized workouts, smarter nutrition, and AI-powered insights designed around your
            goals.
          </ThemedText>
          <Link href="/explore" asChild>
            <ThemedView type="backgroundElement" style={styles.cta}>
              <ThemedText type="linkPrimary" style={styles.ctaText}>
                Explore AIVO
              </ThemedText>
            </ThemedView>
          </Link>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.featureList}>
          {FEATURES.map((feature) => (
            <ThemedView key={feature.title} style={styles.feature}>
              <ThemedText type="smallBold" themeColor="primary">
                {feature.title}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {feature.body}
              </ThemedText>
            </ThemedView>
          ))}
        </ThemedView>

        {user ? (
          <ThemedView style={styles.accountRow}>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {user.email}
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void signOut().then(() => router.replace('/auth/sign-in'));
              }}>
              <ThemedText type="smallBold" themeColor="primary">
                Sign out
              </ThemedText>
            </Pressable>
          </ThemedView>
        ) : null}

        <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
          {getDevMenuHint()}
        </ThemedText>
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
    fontSize: 32,
    lineHeight: 38,
  },
  tagline: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    color: '#A1A1AA',
  },
  cta: {
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.four,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: 700,
  },
  featureList: {
    gap: Spacing.three,
    alignSelf: 'stretch',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
    borderRadius: Spacing.four,
  },
  feature: {
    gap: Spacing.one,
  },
  hint: {
    textAlign: 'center',
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    gap: Spacing.three,
  },
});
