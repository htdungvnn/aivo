/**
 * Onboarding status contract.
 *
 * Auth is responsible for *reading* this status to decide where to route a
 * user after authentication. The onboarding feature owns the data — this
 * module only defines the shape exchanged between the API and the clients.
 */

export type OnboardingStatus = {
  onboardingCompleted: boolean;
};

export const ONBOARDING_NOT_COMPLETED: OnboardingStatus = {
  onboardingCompleted: false,
};

/**
 * Derives the post-authentication destination from the onboarding status.
 */
export function destinationForOnboardingStatus(
  status: OnboardingStatus | null | undefined,
): string {
  if (!status?.onboardingCompleted) {
    return "/onboarding";
  }
  return "/dashboard";
}
