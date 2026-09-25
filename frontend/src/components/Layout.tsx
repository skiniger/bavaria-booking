import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';
import {
  Home, Calendar, Hotel, Users, Grid, Settings as SettingsIcon,
  Wifi, WifiOff, Bot, TrendingUp, Zap, Menu, X, Keyboard, LogOut
} from 'lucide-react';
import { authAPI, AUTH_CHECK_EVENT } from '../services/api';
import ToastContainer from './ui/Toast';
import SkipLink from './ui/SkipLink';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { isOnline } = useStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', path: '/dashboard', icon: Home, section: 'main' },
    { name: 'Reservierungen', path: '/reservations', icon: Calendar, section: 'main' },
    { name: 'Pension', path: '/pension', icon: Hotel, section: 'main' },
    { name: 'Personal', path: '/staff', icon: Users, section: 'main' },
    { name: 'Layout', path: '/layout', icon: Grid, section: 'main' },
    { name: 'Meiti AI', path: '/meiti-ai', icon: Bot, section: 'ai' },
    { name: 'Analytics', path: '/analytics', icon: TrendingUp, section: 'ai' },
    { name: 'Kapazität', path: '/capacity', icon: Zap, section: 'ai' },
    { name: 'Einstellungen', path: '/settings', icon: SettingsIcon, section: 'settings' },
  ];

  const mainNavigation = navigation.filter(item => item.section === 'main');
  const aiNavigation = navigation.filter(item => item.section === 'ai');
  const settingsNavigation = navigation.filter(item => item.section === 'settings');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Skip Link for Accessibility */}
      <SkipLink />

      {/* Toast Notifications */}
      <ToastContainer />

      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-40" role="banner">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Menü öffnen"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>

              <h1 className="text-xl sm:text-2xl font-bold text-bavaria-blue">
                BAVARIABOOKINGX
              </h1>

              {/* Connection Status */}
              {!isOnline && (
                <span className="hidden sm:flex items-center text-sm text-red-600">
                  <WifiOff className="w-4 h-4 mr-1" />
                  <span className="hidden md:inline">Offline-Modus</span>
                </span>
              )}
              {isOnline && (
                <span className="hidden sm:flex items-center text-sm text-green-600">
                  <Wifi className="w-4 h-4 mr-1" />
                  <span className="hidden md:inline">Online</span>
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Keyboard Shortcut Hint - Desktop only */}
              <button
                onClick={() => {
                  const event = new KeyboardEvent('keydown', { key: '?' });
                  window.dispatchEvent(event);
                }}
                className="hidden lg:flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Tastenkombinationen anzeigen"
              >
                <Keyboard className="w-4 h-4" />
                <span className="text-xs">?</span>
              </button>

              {/* Date - Hidden on small screens */}
              <span className="hidden md:block text-sm text-gray-600">
                {new Date().toLocaleDateString('de-DE', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
              {/* Compact date for small/medium screens */}
              <span className="md:hidden text-xs text-gray-600">
                {new Date().toLocaleDateString('de-DE', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })}
              </span>

              <button
                onClick={async () => {
                  try {
                    await authAPI.logout();
                  } finally {
                    window.dispatchEvent(new Event(AUTH_CHECK_EVENT));
                  }
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Abmelden"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Abmelden</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
            fixed lg:sticky top-16 left-0 z-30
            w-64 bg-white shadow-md h-[calc(100vh-64px)]
            overflow-y-auto transition-transform duration-300 ease-in-out
            ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
          role="navigation"
          aria-label="Hauptnavigation"
        >
          <nav className="mt-6 px-4 space-y-6" aria-label="Seitennavigation">
            {/* Main Navigation */}
            <div>
              <h3 className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Hauptmenü
              </h3>
              <div className="space-y-1">
                {mainNavigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-bavaria-blue text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* AI & Analytics Navigation */}
            <div>
              <h3 className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                KI & Analytics
              </h3>
              <div className="space-y-1">
                {aiNavigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-bavaria-blue text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Settings Navigation */}
            <div>
              <div className="space-y-1">
                {settingsNavigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-bavaria-blue text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main
          id="main-content"
          className="flex-1 p-4 sm:p-6 lg:p-8 w-full lg:w-auto"
          role="main"
          aria-label="Hauptinhalt"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
