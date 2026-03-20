import { Theme } from '../lib/themes';

interface DeleteConfirmationModalProps {
  show: boolean;
  title: string;
  message: string;
  itemPreview?: string;
  onConfirm: () => void;
  onCancel: () => void;
  theme: Theme;
}

export default function DeleteConfirmationModal({
  show,
  title,
  message,
  itemPreview,
  onConfirm,
  onCancel,
  theme,
}: DeleteConfirmationModalProps) {
  if (!show) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onCancel}
    >
      <div 
        className="rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4"
        style={{ backgroundColor: theme.colors.surface }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
            <svg className="w-6 h-6" fill="none" stroke="#ef4444" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-1" style={{ color: theme.colors.text }}>
              {title}
            </h3>
            <p className="text-sm mb-3" style={{ color: theme.colors.textSecondary }}>
              {message}
            </p>
            {itemPreview && (
              <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: theme.colors.background, color: theme.colors.textSecondary }}>
                {itemPreview.length > 150 
                  ? itemPreview.substring(0, 150) + '...' 
                  : itemPreview}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex gap-3 justify-end pt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg font-medium transition-all hover:opacity-80"
            style={{ 
              backgroundColor: theme.colors.background,
              color: theme.colors.text
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg font-medium transition-all hover:opacity-90"
            style={{ 
              backgroundColor: '#ef4444',
              color: 'white'
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
