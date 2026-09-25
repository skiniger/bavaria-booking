export const ONBOARDING_TOUR_STORAGE_KEY = 'bavariabooking_tour_completed';

export function resetOnboardingTour() {
  localStorage.removeItem(ONBOARDING_TOUR_STORAGE_KEY);
  window.location.reload();
}
