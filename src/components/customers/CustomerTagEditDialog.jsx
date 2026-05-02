import { useState } from 'react';
import { TAG_STYLES, CUSTOMER_TAGS } from './constants';
import { useCustomerTagging } from './useCustomerTagging';
import { getComputedTag, getFinalTag, isManuallyOverridden } from './helpers';

function CustomerTagEditDialog({ isOpen, onClose, customer, onTagUpdated }) {
  const { performTagAction, loading } = useCustomerTagging();
  const [localError, setLocalError] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  if (!isOpen || !customer) return null;

  const handleEscape = (e) => {
    if (e.key === 'Escape' && !showConfirmDialog) {
      onClose();
    }
  };

  const isBogus = isManuallyOverridden(customer);
  const finalTag = getFinalTag(customer);
  const computedTag = getComputedTag(customer);

  const handleMarkBogus = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmMarkBogus = async () => {
    try {
      setLocalError(null);
      await performTagAction(customer.id, 'MarkBogus');
      
      if (onTagUpdated) {
        onTagUpdated(CUSTOMER_TAGS.BOGUS);
      }

      setTimeout(() => {
        setShowConfirmDialog(false);
        onClose();
      }, 300);
    } catch (err) {
      setLocalError(err.message);
    }
  };

  const handleRestore = async () => {
    try {
      setLocalError(null);
      await performTagAction(customer.id, 'Restore');
      
      if (onTagUpdated) {
        onTagUpdated(computedTag);
      }

      setTimeout(() => {
        onClose();
      }, 300);
    } catch (err) {
      setLocalError(err.message);
    }
  };

  const handleCancel = () => {
    if (showConfirmDialog) {
      setShowConfirmDialog(false);
    } else {
      onClose();
    }
  };

  window.addEventListener('keydown', handleEscape);

  const currentTagStyle = TAG_STYLES[finalTag] || TAG_STYLES[CUSTOMER_TAGS.NEW];
  const bogusTagStyle = TAG_STYLES[CUSTOMER_TAGS.BOGUS];

  if (showConfirmDialog) {
    return (
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[61]"
        onClick={(e) => e.target === e.currentTarget && handleCancel()}
      >
        <div className="bg-gradient-to-b from-[#e7d6f7] to-[#f7d6d0] rounded-lg p-8 w-[450px] shadow-2xl">
          <h3 className="text-[#841c4f] text-xl font-bold mb-4">Confirm Mark as Bogus</h3>
          
          <p className="text-gray-700 mb-6">
            Are you sure you want to mark <strong>{customer.name}</strong> as Bogus?
          </p>

          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded mb-6">
            <p className="text-red-700 text-sm font-semibold">
              ⚠️ This customer will be flagged as Bogus and their status will show as "{CUSTOMER_TAGS.BOGUS}".
            </p>
          </div>

          {localError && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg">
              <p className="text-red-700 text-sm font-semibold">{localError}</p>
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button
              onClick={handleCancel}
              disabled={loading}
              className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-semibold transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmMarkBogus}
              disabled={loading}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Confirm Mark as Bogus'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]"
      onClick={(e) => e.target === e.currentTarget && handleCancel()}
    >
      <div className="bg-gradient-to-b from-[#e7d6f7] to-[#f7d6d0] rounded-lg p-8 w-[500px] shadow-2xl max-h-[80vh] overflow-y-auto">
        <h2 className="text-[#841c4f] text-2xl font-bold mb-2">Edit Tag for {customer.name}</h2>
        
        <div className="bg-white/50 rounded-lg p-4 mb-6 border-l-4 border-[#841c4f]">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600 font-semibold">Current Status:</p>
              <p className={`inline-block px-3 py-1 rounded-full font-semibold text-sm mt-1 ${currentTagStyle.bg} ${currentTagStyle.text} border ${currentTagStyle.border}`}>
                {finalTag}
              </p>
            </div>
            <div>
              <p className="text-gray-600 font-semibold">Completed Orders:</p>
              <p className="text-lg font-bold text-[#841c4f] mt-1">
                {customer.totalOrders || customer.total_orders || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          {!isBogus ? (
            <div className="space-y-3">
              <p className="text-gray-700 font-semibold mb-3">Available Action:</p>
              <button
                onClick={handleMarkBogus}
                disabled={loading}
                className={`
                  w-full px-4 py-3 rounded-lg font-semibold transition-all text-left
                  ${bogusTagStyle.bg} ${bogusTagStyle.text} ${bogusTagStyle.border} border-2
                  hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                <span className="flex items-center">
                  <span className={`inline-block w-3 h-3 rounded-full mr-3 ${bogusTagStyle.dot}`}></span>
                  Mark as Bogus
                </span>
              </button>
              <p className="text-xs text-gray-600 mt-2">
                Click to manually flag this customer as Bogus
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-gray-700 font-semibold mb-3">Available Action:</p>
              <button
                onClick={handleRestore}
                disabled={loading}
                className="w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span>↺</span> Restore to {computedTag}
              </button>
              <p className="text-xs text-gray-600 mt-2">
                Click to remove the manual Bogus override and restore to {computedTag} status
              </p>
            </div>
          )}
        </div>

        {isBogus && (
          <div className="mb-6 p-4 bg-red-50 rounded-lg border-l-4 border-red-500">
            <p className="text-red-700 text-sm font-semibold flex items-center">
              <span className="mr-2">⚠️</span> This customer is manually marked as Bogus
            </p>
          </div>
        )}

        {localError && (
          <div className="mb-6 p-3 bg-red-100 border border-red-300 rounded-lg">
            <p className="text-red-700 text-sm font-semibold">{localError}</p>
          </div>
        )}

        {loading && (
          <div className="mb-6 p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
            <p className="text-yellow-700 text-sm font-semibold">Processing...</p>
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={handleCancel}
            disabled={loading}
            className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-semibold transition-colors disabled:opacity-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default CustomerTagEditDialog;