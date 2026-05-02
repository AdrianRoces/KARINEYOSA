import { useEffect } from 'react';

/**
 * A reusable modal for confirming destructive actions.
 * Includes Escape key support and click-outside-to-close functionality.
 */
function DeleteConfirmationDialog({ 
  isOpen, 
  onClose, 
  onConfirm,
  title = "Confirm Delete",
  message = "Are you sure you want to delete this item? This action cannot be undone.",
  confirmText = "Delete",
  cancelText = "Cancel"
}) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleClickOutside = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]"
      onClick={handleClickOutside}
    >
      <div className="bg-gradient-to-b from-[#e7d6f7] to-[#f7d6d0] rounded-lg p-6 w-[400px] shadow-lg border-2 border-[#d2679f]/30">
        <h2 className="text-[#841c4f] text-xl font-bold mb-4">
          {title}
        </h2>
        <p className="text-gray-700 mb-6">
          {message}
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded font-semibold transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-200 hover:bg-red-300 text-red-800 rounded font-semibold transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteConfirmationDialog;