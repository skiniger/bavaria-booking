import { useState, type FormEvent } from 'react';
import { LogIn } from 'lucide-react';
import { authAPI, type AuthUser } from '../services/api';
import { useStore } from '../store/useStore';
import ToastContainer from './ui/Toast';

interface LoginFormProps {
  onLoggedIn: (user: AuthUser) => void;
}

export default function LoginForm({ onLoggedIn }: LoginFormProps) {
  const { addToast } = useStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await authAPI.login(username, password);
      setPassword('');
      onLoggedIn(data);
    } catch {
      addToast('error', 'Anmeldung fehlgeschlagen – Benutzername oder Passwort prüfen.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <ToastContainer />
      <form onSubmit={handleSubmit} className="card w-full max-w-sm space-y-4" aria-labelledby="login-title">
        <h1 id="login-title" className="text-2xl font-bold text-bavaria-blue">BAVARIABOOKINGX</h1>
        <p className="text-sm text-gray-600">Bitte mit deinem Mitarbeiter-Konto anmelden.</p>
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">Benutzername</span>
          <input
            className="input"
            autoComplete="username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">Passwort</span>
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2" disabled={busy}>
          <LogIn className="w-4 h-4" />
          {busy ? 'Anmelden …' : 'Anmelden'}
        </button>
      </form>
    </div>
  );
}
