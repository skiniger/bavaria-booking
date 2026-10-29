/** Alter, browserweiter Schlüssel – wird weiter respektiert, damit bisherige Nutzer die Tour nicht erneut sehen. */
export const ONBOARDING_TOUR_STORAGE_KEY = 'bavariabooking_tour_completed';

/** Schlüssel pro Benutzer: die Tour wird jedem Konto genau einmal gezeigt. */
export function onboardingTourKey(userId?: string | null) {
  return userId ? `${ONBOARDING_TOUR_STORAGE_KEY}:${userId}` : ONBOARDING_TOUR_STORAGE_KEY;
}

export function isOnboardingTourCompleted(userId?: string | null) {
  return (
    localStorage.getItem(onboardingTourKey(userId)) === 'true' ||
    localStorage.getItem(ONBOARDING_TOUR_STORAGE_KEY) === 'true'
  );
}

export function markOnboardingTourCompleted(userId?: string | null) {
  localStorage.setItem(onboardingTourKey(userId), 'true');
}

/** Entfernt den Abschluss-Status (alle Konten in diesem Browser), damit die Tour erneut startet. */
export function clearOnboardingTourState() {
  Object.keys(localStorage)
    .filter((k) => k === ONBOARDING_TOUR_STORAGE_KEY || k.startsWith(`${ONBOARDING_TOUR_STORAGE_KEY}:`))
    .forEach((k) => localStorage.removeItem(k));
}

export function resetOnboardingTour() {
  clearOnboardingTourState();
  window.location.reload();
}
