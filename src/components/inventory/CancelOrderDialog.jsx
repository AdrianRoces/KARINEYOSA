import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { supabase } from '../../supabase';

function CancelOrderDialog({ order, onClose, onSuccess }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleCancel = async () => {
    if (!reason.trim()) {
      toast.error('❌ Please provide a cancellation reason', {
        position: 'top-right',
        autoClose: 3000,
        theme: 'colored'
      });
      return;
    }

    setLoading(true);
    try {
      // Try to fetch all orders with the same transaction_id, or just this order if no transaction_id
      let transactionOrders = [];
      
      if (order.transaction_id || order.transactionId) {
        const { data, error } = await supabase
          .from('orders')
          .select('id, product_id, quantity, transaction_id')
          .eq('transaction_id', order.transaction_id || order.transactionId);

        if (error) {
          console.warn('Error fetching transaction orders:', error);
        } else {
          transactionOrders = data || [];
        }
      }

      // If no transaction found, just use the current order
      if (transactionOrders.length === 0) {
        transactionOrders = [{
          id: order.id,
          product_id: order.productId || order.product_id,
          quantity: order.quantity
        }];
      }

      console.log('Orders to cancel:', transactionOrders);

      // Cancel each order and restore stock using the Supabase function
      if (transactionOrders && transactionOrders.length > 0) {
        for (const txnOrder of transactionOrders) {
          if (!txnOrder.id) {
            console.warn('Order missing id:', txnOrder);
            continue;
          }

          // Call the Supabase function to cancel the order and restore inventory
          const { data, error } = await supabase.rpc('cancel_order', {
            p_order_id: txnOrder.id,
            p_cancellation_reason: reason.trim()
          });

          if (error) {
            console.error(`Error cancelling order ${txnOrder.id}:`, error);
            throw error;
          }

          if (!data?.success) {
            console.warn(`Failed to cancel order ${txnOrder.id}:`, data?.message);
            throw new Error(data?.message || 'Failed to cancel order');
          }

          console.log(`Successfully cancelled order ${txnOrder.id}, restored ${data.quantity_restored} items`);
        }
      }

      toast.success(`✅ Order(s) cancelled successfully! Stock has been restored.`, {
        position: 'top-right',
        autoClose: 3000,
        theme: 'colored',
        style: { backgroundColor: '#4CAF50' }
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error(`❌ ${error.message}`, {
        position: 'top-right',
        autoClose: 5000,
        theme: 'colored',
        style: { backgroundColor: '#f44336' }
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        className="bg-gradient-to-b from-[#e7d6f7] to-[#f7d6d0] rounded-lg p-6 w-96 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[#841c4f] text-xl font-bold">Cancel Order</h2>
          <button
            onClick={onClose}
            className="text-[#841c4f] text-2xl hover:text-red-600"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-white/60 p-4 rounded">
            <p className="text-[#841c4f] font-semibold">Order Details:</p>
            <p className="text-sm text-gray-700">Customer: {order.customerName}</p>
            <p className="text-sm text-gray-700">Product: {order.productName}</p>
            <p className="text-sm text-gray-700">Quantity: {order.quantity} ({order.size || 'N/A'})</p>
            <p className="text-sm text-gray-700">Amount: ₱{order.totalAmount.toFixed(2)}</p>
          </div>

          <div>
            <label className="block text-[#841c4f] mb-1">Cancellation Reason:</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-2 border rounded bg-white/80 backdrop-blur-sm border-[#d2679f]/30 focus:border-[#d2679f] focus:outline-none"
              rows="3"
              placeholder="Why are you cancelling this order?"
              required
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 bg-gray-300 text-gray-700 py-2 rounded font-bold hover:bg-gray-400 disabled:opacity-50"
            >
              Keep Order
            </button>
            <button
              onClick={handleCancel}
              disabled={loading}
              className="flex-1 bg-red-500 text-white py-2 rounded font-bold hover:bg-red-600 disabled:opacity-50"
            >
              {loading ? 'Cancelling...' : 'Confirm Cancel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CancelOrderDialog;