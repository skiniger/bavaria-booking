import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TourStep {
  title: string;
  content: string;
  target?: string; // CSS selector for highlighting
  route?: string; // Route to navigate to
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

const tourSteps: TourStep[] = [
  {
    title: 'Willkommen bei BAVARIABOOKINGX!',
    content: 'Ihre komplette Lösung für Restaurant- und Pensionsverwaltung. Lassen Sie uns die wichtigsten Funktionen erkunden.',
    position: 'center',
  },
  {
    title: 'Dashboard',
    content: 'Hier sehen Sie alle wichtigen Kennzahlen auf einen Blick: Reservierungen, Auslastung, Personal und mehr.',
    route: '/dashboard',
    position: 'center',
  },
  {
    title: 'Reservierungen',
    content: 'Verwalten Sie Tischreservierungen mit Live-Status, Tischkombinationen und Kalenderansicht. Exportieren Sie Reservierungen als PDF oder CSV.',
    route: '/reservations',
    position: 'center',
  },
  {
    title: 'Pension & Rezeption',
    content: 'BMG-konforme Meldescheine für Ihre Pensionsgäste. Erstellen, verwalten und exportieren Sie Meldescheine direkt als PDF.',
    route: '/pension',
    position: 'center',
  },
  {
    title: 'Personalverwaltung',
    content: 'Zeiterfassung mit Ein-/Ausstempeln, automatischem Logout und Stundenübersicht. Exportieren Sie Arbeitsstunden als CSV.',
    route: '/staff',
    position: 'center',
  },
  {
    title: 'MeitiAI Chat',
    content: 'Ihr KI-Assistent für Reservierungsoptimierung, Kapazitätsplanung und intelligente Prognosen.',
    route: '/meiti-ai',
    position: 'center',
  },
  {
    title: 'Analytics',
    content: 'Detaillierte Analysen zu Auslastung, Umsatz, Trends und Prognosen für bessere Geschäftsentscheidungen.',
    route: '/analytics',
    position: 'center',
  },
  {
    title: 'Keyboard Shortcuts',
    content: 'Drücken Sie "?" um alle Tastenkombinationen anzuzeigen. Navigieren Sie schneller mit Ctrl+D (Dashboard), Ctrl+R (Reservierungen) und mehr!',
    position: 'center',
  },
  {
    title: 'Bereit zum Starten!',
    content: 'Sie sind jetzt bereit, BAVARIABOOKINGX voll zu nutzen. Bei Fragen stehen wir Ihnen gerne zur Verfügung. Viel Erfolg!',
    position: 'center',
  },
];

const STORAGE_KEY = 'bavariabooking_tour_completed';

export default function OnboardingTour() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if tour has been completed
    const tourCompleted = localStorage.getItem(STORAGE_KEY);
    if (!tourCompleted) {
      // Show tour after a short delay
      setTimeout(() => setIsVisible(true), 1000);
    }
  }, []);

  useEffect(() => {
    // Navigate to route if specified
    const step = tourSteps[currentStep];
    if (step.route && isVisible) {
      navigate(step.route);
    }
  }, [currentStep, navigate, isVisible]);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTour();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    completeTour();
  };

  const completeTour = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsVisible(false);
  };

  // Allow users to restart tour
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl+Shift+T to restart tour
      if (e.ctrlKey && e.shiftKey && e.key === 'T') {
        localStorage.removeItem(STORAGE_KEY);
        setCurrentStep(0);
        setIsVisible(true);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  if (!isVisible) return null;

  const step = tourSteps[currentStep];
  const progress = ((currentStep + 1) / tourSteps.length) * 100;
  const isLastStep = currentStep === tourSteps.length - 1;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
        {/* Tour Modal */}
        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full animate-slide-in">
          {/* Progress Bar */}
          <div className="h-2 bg-gray-200 rounded-t-xl overflow-hidden">
            <div
              className="h-full bg-bavaria-blue transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Header */}
          <div className="p-6 border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-bavaria-blue rounded-full flex items-center justify-center text-white font-bold">
                {currentStep + 1}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{step.title}</h2>
                <p className="text-sm text-gray-500">
                  Schritt {currentStep + 1} von {tourSteps.length}
                </p>
              </div>
            </div>
            <button
              onClick={handleSkip}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Tour beenden"
            >
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-8">
            <p className="text-lg text-gray-700 leading-relaxed">{step.content}</p>

            {/* Feature Highlights */}
            {currentStep === 0 && (
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="font-semibold text-bavaria-blue mb-1">Restaurant</div>
                  <div className="text-sm text-gray-600">Reservierungen, Tische, Gäste</div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="font-semibold text-bavaria-green mb-1">Pension</div>
                  <div className="text-sm text-gray-600">BMG-Meldescheine, Check-in/out</div>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <div className="font-semibold text-bavaria-yellow mb-1">Personal</div>
                  <div className="text-sm text-gray-600">Zeiterfassung, Stundenübersicht</div>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="font-semibold text-purple-600 mb-1">Analytics</div>
                  <div className="text-sm text-gray-600">KI-Prognosen, Auswertungen</div>
                </div>
              </div>
            )}

            {/* Checklist for last step */}
            {isLastStep && (
              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <Check className="w-5 h-5 text-bavaria-green flex-shrink-0" />
                  <span className="text-sm text-gray-700">Tour abgeschlossen</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <Check className="w-5 h-5 text-bavaria-blue flex-shrink-0" />
                  <span className="text-sm text-gray-700">
                    Alle Hauptfunktionen kennengelernt
                  </span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                  <Check className="w-5 h-5 text-bavaria-yellow flex-shrink-0" />
                  <span className="text-sm text-gray-700">
                    Tastenkombinationen verfügbar (drücken Sie "?")
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t flex items-center justify-between bg-gray-50 rounded-b-xl">
            <button
              onClick={handleSkip}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Tour überspringen
            </button>

            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <button
                  onClick={handlePrevious}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Zurück
                </button>
              )}

              <button
                onClick={handleNext}
                className="px-6 py-2 bg-bavaria-blue text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
              >
                {isLastStep ? (
                  <>
                    Fertig
                    <Check className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Weiter
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Hint */}
          <div className="px-6 pb-4 text-center">
            <p className="text-xs text-gray-500">
              Tipp: Drücken Sie Ctrl+Shift+T um die Tour neu zu starten
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

// Export helper to reset tour
export const resetOnboardingTour = () => {
  localStorage.removeItem(STORAGE_KEY);
  window.location.reload();
};
