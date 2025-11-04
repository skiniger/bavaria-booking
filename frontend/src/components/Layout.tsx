import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';
import {
  Home, Calendar, Hotel, Users, Grid, Settings as SettingsIcon,
  Wifi, WifiOff, Bot, TrendingUp, Zap
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { isOnline } = useStore();

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
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-bavaria-blue">BAVARIABOOKINGX</h1>
              {!isOnline && (
                <span className="flex items-center text-sm text-red-600">
                  <WifiOff className="w-4 h-4 mr-1" />
                  Offline-Modus
                </span>
              )}
              {isOnline && (
                <span className="flex items-center text-sm text-green-600">
                  <Wifi className="w-4 h-4 mr-1" />
                  Online
                </span>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {new Date().toLocaleDateString('de-DE', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-md h-[calc(100vh-64px)] sticky top-16 overflow-y-auto">
          <nav className="mt-6 px-4 space-y-6">
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
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
