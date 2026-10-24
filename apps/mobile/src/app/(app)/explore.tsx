import { Image } from 'expo-image';
import { Platform, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Collapsible } from '@/components/ui/collapsible';
import { WebBadge } from '@/components/web-badge';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const WORKOUT = {
  name: 'Upper Body Strength',
  duration: '45 min',
  exercises: [
    { name: 'Bench Press', sets: '4 × 8' },
    { name: 'Lat Pulldown', sets: '3 × 10' },
    { name: 'Shoulder Press', sets: '3 × 10' },
  ],
} as const;

const NUTRITION = {
  calories: '1,540 / 2,200 kcal',
  protein: '112 / 160g',
  carbs: '170 / 250g',
  fat: '48 / 70g',
  meals: ['Breakfast', 'Lunch', 'Dinner', 'Snacks'],
} as const;

const STEPS = [
  { title: 'Tell AIVO Your Goal', body: 'Lose weight, build muscle, get stronger, or stay healthy.' },
  {
    title: 'Get Your Personal Plan',
    body: 'AIVO creates personalized guidance based on your profile and schedule.',
  },
  {
    title: 'Improve Every Day',
    body: 'Track progress and receive AI recommendations as your data changes.',
  },
] as const;

export default function ExploreScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };
  const theme = useTheme();

  const contentPlatformStyle = Platform.select({
    android: {
      paddingTop: insets.top,
      paddingLeft: insets.left,
      paddingRight: insets.right,
      paddingBottom: insets.bottom,
    },
    web: {
      paddingTop: Spacing.six,
      paddingBottom: Spacing.four,
    },
  });

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentInset={insets}
      contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="subtitle">Explore</ThemedText>
          <ThemedText style={styles.centerText} themeColor="textSecondary">
            Workouts, nutrition, and AI coaching{'\n'}built around your goals.
          </ThemedText>

          <ExternalLink href="https://aivo.app" asChild>
            <Pressable style={({ pressed }) => pressed && styles.pressed}>
              <ThemedView type="backgroundElement" style={styles.linkButton}>
                <ThemedText type="linkPrimary">Learn more about AIVO</ThemedText>
              </ThemedView>
            </Pressable>
          </ExternalLink>
        </ThemedView>

        <ThemedView style={styles.sectionsWrapper}>
          <Collapsible title="Today's Workout">
            <ThemedView style={styles.panel}>
              <ThemedText type="smallBold" themeColor="primary">
                {WORKOUT.name}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {WORKOUT.duration}
              </ThemedText>
              <ThemedView style={styles.list}>
                {WORKOUT.exercises.map((exercise) => (
                  <ThemedView key={exercise.name} style={styles.listRow}>
                    <ThemedText type="small">{exercise.name}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {exercise.sets}
                    </ThemedText>
                  </ThemedView>
                ))}
              </ThemedView>
            </ThemedView>
          </Collapsible>

          <Collapsible title="Daily Nutrition">
            <ThemedView style={styles.panel}>
              <ThemedText type="smallBold" themeColor="primary">
                Calories
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {NUTRITION.calories}
              </ThemedText>
              <ThemedView style={styles.list}>
                <ThemedView style={styles.listRow}>
                  <ThemedText type="small">Protein</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {NUTRITION.protein}
                  </ThemedText>
                </ThemedView>
                <ThemedView style={styles.listRow}>
                  <ThemedText type="small">Carbs</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {NUTRITION.carbs}
                  </ThemedText>
                </ThemedView>
                <ThemedView style={styles.listRow}>
                  <ThemedText type="small">Fat</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {NUTRITION.fat}
                  </ThemedText>
                </ThemedView>
              </ThemedView>
              <ThemedView style={styles.meals}>
                {NUTRITION.meals.map((meal) => (
                  <ThemedView key={meal} type="backgroundElement" style={styles.meal}>
                    <ThemedText type="small">{meal}</ThemedText>
                  </ThemedView>
                ))}
              </ThemedView>
            </ThemedView>
          </Collapsible>

          <Collapsible title="How It Works">
            <ThemedView style={styles.list}>
              {STEPS.map((step, index) => (
                <ThemedView key={step.title} style={styles.step}>
                  <ThemedText type="smallBold" themeColor="primary">
                    {String(index + 1).padStart(2, '0')}
                  </ThemedText>
                  <ThemedView style={styles.stepBody}>
                    <ThemedText type="smallBold">{step.title}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {step.body}
                    </ThemedText>
                  </ThemedView>
                </ThemedView>
              ))}
            </ThemedView>
          </Collapsible>

          <Collapsible title="AI Coach">
            <ThemedView style={styles.panel}>
              <ThemedText type="small" themeColor="textSecondary">
                &ldquo;You completed 4 workouts this week.&rdquo;
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                &ldquo;Your protein intake is below your current target.&rdquo;
              </ThemedText>
            </ThemedView>
          </Collapsible>

          <Collapsible title="The AIVO mark">
            <ThemedText type="small">
              Every AIVO surface uses the same mark, generated from a single source in the
              repository.
            </ThemedText>
            <Image
              source={require('@/assets/images/aivo-mark-3x.png')}
              style={styles.imageMark}
            />
          </Collapsible>
        </ThemedView>
        {Platform.OS === 'web' && <WebBadge />}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  container: {
    maxWidth: MaxContentWidth,
    flexGrow: 1,
  },
  titleContainer: {
    gap: Spacing.three,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.six,
  },
  centerText: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  linkButton: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
    justifyContent: 'center',
    gap: Spacing.one,
    alignItems: 'center',
  },
  sectionsWrapper: {
    gap: Spacing.five,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  panel: {
    gap: Spacing.two,
    alignItems: 'flex-start',
  },
  list: {
    gap: Spacing.two,
    alignSelf: 'stretch',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  meals: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    alignSelf: 'stretch',
  },
  meal: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  step: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'flex-start',
  },
  stepBody: {
    flex: 1,
    gap: Spacing.one,
  },
  imageMark: {
    width: 96,
    height: 96,
    alignSelf: 'center',
  },
});
