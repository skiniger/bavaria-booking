import { X, Keyboard } from 'lucide-react';
import { formatShortcut, type KeyboardShortcut } from '../../hooks/useKeyboardShortcuts';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface KeyboardShortcutsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: KeyboardShortcut[];
}

export default function KeyboardShortcutsDialog({
  isOpen,
  onClose,
  shortcuts,
}: KeyboardShortcutsDialogProps) {
  const dialogRef = useFocusTrap(isOpen);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-dialog-title"
    >
      <div
        ref={dialogRef}
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Keyboard className="w-6 h-6 text-bavaria-blue" />
            <h2 id="shortcuts-dialog-title" className="text-xl font-bold">
              Tastenkombinationen
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Dialog schließen"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-4">
            {shortcuts.map((shortcut, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span className="text-gray-700">{shortcut.description}</span>
                <kbd className="px-3 py-1.5 text-sm font-semibold text-gray-800 bg-white border border-gray-300 rounded-lg shadow-sm">
                  {formatShortcut(shortcut)}
                </kbd>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t text-sm text-gray-500">
            <p>
              <strong>Hinweis:</strong> Tastenkombinationen funktionieren nicht,
              wenn Sie in einem Eingabefeld tippen.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
