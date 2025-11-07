import { MeitiChat } from '../components/ai/MeitiChat';
import { Bot } from 'lucide-react';

export default function MeitiAI() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Bot className="h-8 w-8 text-bavaria-blue" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meiti AI Assistent</h1>
          <p className="text-gray-500">Ihr intelligenter KI-Helfer für BAVARIABOOKINGX</p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Bot className="h-5 w-5 text-bavaria-blue flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-gray-900 mb-1">Was kann Meiti AI für Sie tun?</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Echtzeit-Auslastungsanalysen und Vorhersagen</li>
              <li>• Reservierungsübersicht und Statistiken</li>
              <li>• Personalplanung und Zeiterfassung</li>
              <li>• Tischverfügbarkeit und Optimierungsvorschläge</li>
              <li>• Umsatzanalysen und Trends</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Chat Component */}
      <MeitiChat />
    </div>
  );
}
