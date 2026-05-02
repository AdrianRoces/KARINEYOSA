import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { supabase } from '../../supabase';

function RestoreOrderDialog({ order, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose, loading]);

  const handleRestore = async () => {
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

      console.log('Orders to restore:', transactionOrders);

      // Deduct stock for each item in the transaction (since order is becoming active again)
      if (transactionOrders && transactionOrders.length > 0) {
        for (const txnOrder of transactionOrders) {
          if (!txnOrder.product_id) {
            console.warn('Order missing product_id:', txnOrder);
            continue;
          }

          // Get the sizes record for this product
          const { data: sizeData, error: sizeError } = await supabase
            .from('sizes')
            .select('id, remaining_quantity')
            .eq('product_id', txnOrder.product_id)
            .single();

          if (sizeError) {
            console.warn(`No sizes record found for product ${txnOrder.product_id}:`, sizeError);
            continue;
          }

          if (sizeData) {
            const currentRemaining = sizeData.remaining_quantity || 0;
            const qtyToDeduct = txnOrder.quantity || 0;
            const newRemainingQuantity = currentRemaining - qtyToDeduct;

            // Validate that we don't go negative
            if (newRemainingQuantity < 0) {
              throw new Error(`Not enough stock to restore order for product ${txnOrder.product_id}. Available: ${currentRemaining}, Needed: ${qtyToDeduct}`);
            }

            console.log(`Deducting stock for product ${txnOrder.product_id}: ${currentRemaining} - ${qtyToDeduct} = ${newRemainingQuantity}`);

            const { error: updateError } = await supabase
              .from('sizes')
              .update({ remaining_quantity: newRemainingQuantity })
              .eq('id', sizeData.id);

            if (updateError) {
              console.error(`Error updating stock for product ${txnOrder.product_id}:`, updateError);
              throw updateError;
            }
          }
        }
      }

      // Update the order status to Active
      const { error: restoreError } = await supabase
        .from('orders')
        .update({
          status: 'Active',
          cancellation_reason: null,
          cancelled_date: null
        })
        .eq('id', order.id);

      if (restoreError) throw restoreError;

      toast.success('✅ Order restored to Active! Stock has been deducted.', {
        position: 'top-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: 'colored',
      });

      onSuccess();
    } catch (error) {
      console.error('Error restoring order:', error);
      toast.error(`❌ ${error.message}`, {
        position: 'top-right',
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: 'colored',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={(e) => e.target === e.currentTarget && !loading && onClose()}
    >
      <div className="bg-gradient-to-b from-[#e7d6f7] to-[#f7d6d0] rounded-lg p-6 w-96 shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[#841c4f] text-xl font-bold">Restore Order</h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-[#841c4f] text-2xl hover:text-red-600 disabled:opacity-50"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-white/60 p-4 rounded">
            <p className="text-[#841c4f] font-semibold mb-2">Order Details:</p>
            <p className="text-sm text-gray-700">Customer: {order.customerName}</p>
            <p className="text-sm text-gray-700">Quantity: {order.quantity} ({order.size || 'N/A'})</p>
            <p className="text-sm text-gray-700">Platform: {order.platform}</p>
            <p className="text-sm text-gray-700">Amount: ₱{(order.totalAmount || 0).toFixed(2)}</p>
            {order.isRepeatCustomer && (
              <p className="text-sm text-green-700 font-semibold mt-2">Loyal Customer</p>
            )}
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3">
            <p className="text-sm text-yellow-800">
              <strong>Cancelled Reason:</strong> {order.cancellationReason || 'Not provided'}
            </p>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-3">
            <div className="text-sm text-blue-800">
              <strong>Restoring will:</strong>
              <ul className="list-disc ml-5 mt-1">
                <li>Change status from Cancelled → Active</li>
                <li>Deduct stock from inventory</li>
                <li>Make order count toward revenue again</li>
              </ul>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleRestore}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-green-200 hover:bg-green-300 disabled:bg-gray-300 disabled:cursor-not-allowed text-green-800 font-semibold rounded transition-colors"
            >
              {loading ? 'Restoring...' : 'Restore Order'}
            </button>
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-300 disabled:cursor-not-allowed text-gray-800 font-semibold rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RestoreOrderDialog;