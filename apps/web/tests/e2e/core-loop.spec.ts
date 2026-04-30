/**
 * E2E Tests - Core User Journey
 *
 * Tests the critical "Core Loop":
 * 1. Login (OAuth flow - mocked)
 * 2. Analyze Body (upload image, get AI analysis)
 * 3. View Schedule (AI-generated workout plan)
 * 4. Workout Completion (trigger AI scheduler feedback loop)
 */

import { test, expect } from '@playwright/test';

// Test data
const TEST_USER = {
  email: 'e2e-test@example.com',
  name: 'E2E Test User',
  id: 'e2e-user-123',
};

const BODY_IMAGE_PATH = 'tests/e2e/fixtures/sample-body.jpg';
const WORKOUT_COMPLETION_DATA = {
  workoutId: 'test-workout-123',
  durationMinutes: 45,
  caloriesBurned: 350,
  notes: 'E2E test completion',
};

test.describe('Core User Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Mock OAuth callback for testing
    await page.route('**/api/auth/**', async (route) => {
      route.fulfill({
        json: {
          success: true,
          data: {
            user: TEST_USER,
            token: 'e2e-test-jwt-token',
          },
        },
        status: 200,
      });
    });

    // Mock API responses
    await page.route('**/api/body/vision/analyze', async (route) => {
      route.fulfill({
        json: {
          success: true,
          data: {
            id: 'analysis-123',
            userId: TEST_USER.id,
            analysis: {
              bodyComposition: {
                bodyFatEstimate: 0.15,
                muscleMassEstimate: 30,
              },
            },
            confidence: 0.92,
            createdAt: Date.now(),
          },
        },
        status: 200,
      });
    });

    await page.route('**/api/biometric/snapshot/generate', async (route) => {
      route.fulfill({
        json: {
          success: true,
          data: {
            id: 'snapshot-123',
            userId: TEST_USER.id,
            period: '7d',
            healthScore: 85,
            factors: { sleep: 0.9, activity: 0.8, recovery: 0.85 },
            recommendations: ['Maintain current routine'],
            createdAt: Date.now(),
          },
        },
        status: 200,
      });
    });

    await page.route('**/api/workouts/completed', async (route) => {
      route.fulfill({
        json: {
          success: true,
          data: {
            id: 'completed-123',
            workoutId: WORKOUT_COMPLETION_DATA.workoutId,
            userId: TEST_USER.id,
            aiAdjustments: {
              nextWorkoutIntensity: 'moderate',
              recoveryTimeHours: 24,
              recommendedFocus: ['endurance', 'strength'],
            },
          },
        },
        status: 200,
      });
    });
  });

  test('should complete full core loop: login → analyze → schedule → complete', async ({
    page,
  }) => {
    // ============================================
    // STEP 1: Login
    // ============================================
    await page.goto('/login');

    // In production this would show OAuth buttons; for E2E we mock the callback
    const loginButton = page.locator('[data-testid="google-login"]');
    await expect(loginButton).toBeVisible();
    await loginButton.click();

    // Wait for redirect and token storage
    await page.waitForURL('/dashboard');
    await expect(page).toHaveURL('/dashboard');

    // Verify user is logged in
    const userGreeting = page.locator('[data-testid="user-greeting"]');
    await expect(userGreeting).toContainText(TEST_USER.name);

    // ============================================
    // STEP 2: Body Analysis
    // ============================================
    await page.goto('/body/analysis');

    const uploadArea = page.locator('[data-testid="image-upload"]');
    await expect(uploadArea).toBeVisible();

    // Upload body image
    await uploadArea.setInputFiles(BODY_IMAGE_PATH);

    const analyzeButton = page.locator('[data-testid="analyze-button"]');
    await expect(analyzeButton).toBeEnabled();
    await analyzeButton.click();

    // Wait for analysis to complete
    const analysisResult = page.locator('[data-testid="analysis-result"]');
    await expect(analysisResult).toBeVisible({ timeout: 30000 });
    await expect(analysisResult).toContainText('Body Composition');

    // Verify analysis data
    const bodyFat = page.locator('[data-testid="body-fat"]');
    await expect(bodyFat).toContainText('15%');

    // ============================================
    // STEP 3: View AI Schedule
    // ============================================
    await page.goto('/schedule');

    const scheduleHeader = page.locator('[data-testid="schedule-header"]');
    await expect(scheduleHeader).toBeVisible();
    await expect(scheduleHeader).toContainText('Your Schedule');

    // Verify AI-generated workouts are present
    const workoutCard = page.locator('[data-testid="workout-card"]').first();
    await expect(workoutCard).toBeVisible();

    const workoutName = workoutCard.locator('[data-testid="workout-name"]');
    await expect(workoutName).toBeVisible();

    // ============================================
    // STEP 4: Complete Workout
    // ============================================
    await workoutCard.click();

    const completeWorkoutButton = page.locator('[data-testid="complete-workout"]');
    await expect(completeWorkoutButton).toBeVisible();
    await completeWorkoutButton.click();

    // Fill completion form
    await page.fill('[data-testid="duration-input"]', String(WORKOUT_COMPLETION_DATA.durationMinutes));
    await page.fill('[data-testid="calories-input"]', String(WORKOUT_COMPLETION_DATA.caloriesBurned));
    await page.fill('[data-testid="notes-input"]', WORKOUT_COMPLETION_DATA.notes);

    const submitCompletion = page.locator('[data-testid="submit-completion"]');
    await submitCompletion.click();

    // Verify AI feedback received
    const aiFeedback = page.locator('[data-testid="ai-feedback"]');
    await expect(aiFeedback).toBeVisible({ timeout: 10000 });
    await expect(aiFeedback).toContainText('Recovery');

    // Check that next workout is adjusted based on completion
    const nextWorkout = page.locator('[data-testid="next-workout"]');
    await expect(nextWorkout).toContainText('Intensity');
  });

  test('should handle body analysis without image', async ({ page }) => {
    await page.goto('/body/analysis');

    const analyzeButton = page.locator('[data-testid="analyze-button"]');
    await analyzeButton.click();

    // Should show validation error
    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('No image provided');
  });

  test('should persist workout completion across sessions', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.locator('[data-testid="google-login"]').click();
    await page.waitForURL('/dashboard');

    // Complete a workout
    await page.goto('/workouts');
    const workoutCard = page.locator('[data-testid="workout-card"]').first();
    await workoutCard.click();
    await page.locator('[data-testid="complete-workout"]').click();
    await page.fill('[data-testid="duration-input"]', '45');
    await page.locator('[data-testid="submit-completion"]').click();

    // Verify completion recorded
    const completionBadge = page.locator('[data-testid="completion-badge"]');
    await expect(completionBadge).toContainText('1');

    // Reload page to test persistence
    await page.reload();

    // Badge should still show
    await expect(completionBadge).toContainText('1');
  });
});
