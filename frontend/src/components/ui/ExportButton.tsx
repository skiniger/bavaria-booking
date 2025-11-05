import { Download, FileText, File } from 'lucide-react';
import { useState } from 'react';

interface ExportButtonProps {
  onExportPDF?: () => void;
  onExportCSV?: () => void;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export default function ExportButton({
  onExportPDF,
  onExportCSV,
  label = 'Exportieren',
  size = 'md',
  variant = 'secondary',
  disabled = false,
}: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  // If only one export option, render simple button
  const hasBothOptions = onExportPDF && onExportCSV;
  if (!hasBothOptions) {
    const onClick = onExportPDF || onExportCSV;
    const Icon = onExportPDF ? FileText : File;

    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`
          inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium
          transition-all duration-200
          ${variant === 'primary'
            ? 'bg-bavaria-blue text-white hover:bg-blue-700'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}
          ${size === 'sm' ? 'text-sm px-3 py-1.5' : ''}
          ${size === 'lg' ? 'text-lg px-5 py-3' : ''}
        `}
      >
        <Icon className="w-4 h-4" />
        {label}
      </button>
    );
  }

  // Dropdown for multiple export options
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium
          transition-all duration-200
          ${variant === 'primary'
            ? 'bg-bavaria-blue text-white hover:bg-blue-700'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}
          ${size === 'sm' ? 'text-sm px-3 py-1.5' : ''}
          ${size === 'lg' ? 'text-lg px-5 py-3' : ''}
        `}
      >
        <Download className="w-4 h-4" />
        {label}
      </button>

      {isOpen && !disabled && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown menu */}
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
            {onExportPDF && (
              <button
                onClick={() => {
                  onExportPDF();
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 transition-colors"
              >
                <FileText className="w-4 h-4 text-red-600" />
                Als PDF exportieren
              </button>
            )}
            {onExportCSV && (
              <button
                onClick={() => {
                  onExportCSV();
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 transition-colors"
              >
                <File className="w-4 h-4 text-green-600" />
                Als CSV exportieren
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
