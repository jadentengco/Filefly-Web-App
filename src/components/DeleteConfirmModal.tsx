import React, { useEffect } from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  itemName?: string;
  itemCount?: number;
  description?: string;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Delete File',
  itemName,
  itemCount = 1,
  description,
}) => {
  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      id="delete-confirm-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="delete-confirm-modal-content"
        className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 text-slate-900 dark:text-white transition-all transform animate-in zoom-in-95 duration-150 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close X button */}
        <button
          id="delete-modal-close-btn"
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-4">
          {/* Danger icon */}
          <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-800/50">
            <Trash2 size={24} />
          </div>

          <div className="flex-1 min-w-0 pr-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {title}
            </h3>
            
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {description ? (
                <p>{description}</p>
              ) : itemCount > 1 ? (
                <p>
                  Are you sure you want to permanently delete{' '}
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {itemCount} selected files
                  </span>
                  ? This action cannot be undone.
                </p>
              ) : (
                <p>
                  Are you sure you want to delete{' '}
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate inline-block max-w-[220px] align-bottom">
                    &ldquo;{itemName}&rdquo;
                  </span>
                  ? This will remove the file from your workspace.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
          <button
            id="delete-modal-cancel-btn"
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors"
          >
            Cancel
          </button>

          <button
            id="delete-modal-confirm-btn"
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            autoFocus
          >
            <Trash2 size={14} />
            <span>{itemCount > 1 ? `Delete ${itemCount} Files` : 'Delete File'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
