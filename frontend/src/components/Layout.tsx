import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Home, Calendar, Hotel, Users, Grid, Settings as SettingsIcon, Wifi, WifiOff } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { isOnline } = useStore();

  const navigation = [
    { name: 'Dashboard', path: '/dashboard', icon: Home },
    { name: 'Reservierungen', path: '/reservations', icon: Calendar },
    { name: 'Pension', path: '/pension', icon: Hotel },
    { name: 'Personal', path: '/staff', icon: Users },
    { name: 'Layout', path: '/layout', icon: Grid },
    { name: 'Einstellungen', path: '/settings', icon: SettingsIcon },
  ];

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
        <aside className="w-64 bg-white shadow-md h-[calc(100vh-64px)] sticky top-16">
          <nav className="mt-6 px-4 space-y-2">
            {navigation.map((item) => {
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
