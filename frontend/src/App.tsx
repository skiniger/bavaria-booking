import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useStore } from './store/useStore';
import { useKeyboardShortcuts, type KeyboardShortcut } from './hooks/useKeyboardShortcuts';
import KeyboardShortcutsDialog from './components/ui/KeyboardShortcutsDialog';

// Pages
import Dashboard from './pages/Dashboard';
import Reservations from './pages/Reservations';
import Pension from './pages/Pension';
import Staff from './pages/Staff';
import LayoutManagement from './pages/LayoutManagement';
import Settings from './pages/Settings';
import MeitiAI from './pages/MeitiAI';
import Analytics from './pages/Analytics';
import Capacity from './pages/Capacity';

// Layout
import Layout from './components/Layout';

// Create QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function AppContent() {
  const navigate = useNavigate();
  const [showShortcuts, setShowShortcuts] = useState(false);

  const shortcuts: KeyboardShortcut[] = [
    { key: '?', ctrl: false, description: 'Tastenkombinationen anzeigen', callback: () => setShowShortcuts(true) },
    { key: 'd', ctrl: true, description: 'Zum Dashboard', callback: () => navigate('/dashboard') },
    { key: 'r', ctrl: true, description: 'Zu Reservierungen', callback: () => navigate('/reservations') },
    { key: 'p', ctrl: true, description: 'Zu Pension', callback: () => navigate('/pension') },
    { key: 's', ctrl: true, description: 'Zu Personal', callback: () => navigate('/staff') },
    { key: 'l', ctrl: true, description: 'Zu Layout', callback: () => navigate('/layout') },
    { key: ',', ctrl: true, description: 'Zu Einstellungen', callback: () => navigate('/settings') },
    { key: 'm', ctrl: true, description: 'Zu Meiti AI', callback: () => navigate('/meiti-ai') },
    { key: 'a', ctrl: true, description: 'Zu Analytics', callback: () => navigate('/analytics') },
  ];

  useKeyboardShortcuts(shortcuts);

  return (
    <>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/reservations" element={<Reservations />} />
          <Route path="/pension" element={<Pension />} />
          <Route path="/staff" element={<Staff />} />
          <Route path="/layout" element={<LayoutManagement />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/meiti-ai" element={<MeitiAI />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/capacity" element={<Capacity />} />
        </Routes>
      </Layout>

      <KeyboardShortcutsDialog
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
        shortcuts={shortcuts}
      />
    </>
  );
}

function App() {
  const { setIsOnline } = useStore();

  useEffect(() => {
    // Online/Offline Listener
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setIsOnline]);

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AppContent />
      </Router>
    </QueryClientProvider>
  );
}

export default App;
