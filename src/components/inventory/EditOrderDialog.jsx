import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { supabase } from '../../supabase';

function EditOrderDialog({ order, onClose, onSuccess }) {
  const [editData, setEditData] = useState({
    status: order.status || 'Active',
    isPaid: order.isPaid || false,
    contactNumber: order.contactNumber || '',
    address: order.address || '',
    shippingMethod: order.shippingMethod || 'J&T',
    paymentMethod: order.paymentMethod || 'COD'
  });
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

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const calculateTotals = () => {
    const qty = parseInt(order.quantity) || 0;
    const unitPrice = parseFloat(order.unitPrice) || 0;
    const shippingFee = parseFloat(order.shippingFee) || 0;
    const itemsSubtotal = qty * unitPrice;
    const totalAmount = Number(order.totalAmount) || itemsSubtotal + shippingFee;
    return {
      itemsSubtotal: itemsSubtotal.toFixed(2),
      shippingFee: shippingFee.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
    };
  };

  const totals = calculateTotals();

  const handleSave = async () => {
    setLoading(true);
    try {
      // If status is being changed to "Cancelled", use the cancel_order function to restore inventory
      if (editData.status === 'Cancelled' && order.status !== 'Cancelled') {
        const cancellationReason = window.prompt('Please enter the cancellation reason:');
        if (!cancellationReason) {
          toast.warning('⚠️ Cancellation reason is required', {
            position: 'top-right',
            autoClose: 3000,
            theme: 'colored',
            style: { backgroundColor: '#ff9800' },
          });
          setLoading(false);
          return;
        }

        // Call the Supabase function to cancel the order and restore inventory
        const { data, error } = await supabase.rpc('cancel_order', {
          p_order_id: order.id,
          p_cancellation_reason: cancellationReason
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.message || 'Failed to cancel order');

        toast.success(`✅ ${data.message}\n📦 ${data.quantity_restored} items restored to inventory!`, {
          position: 'top-right',
          autoClose: 3000,
          theme: 'colored',
          style: { backgroundColor: '#4CAF50' },
        });
      } else {
        // For other status updates, update normally
        const { error } = await supabase.from('orders').update({
          status: editData.status,
          is_paid: editData.isPaid,
          contact_number: editData.contactNumber,
          address: editData.address,
          shipping_method: editData.shippingMethod,
          payment_method: editData.paymentMethod
        }).eq('id', order.id);

        if (error) throw error;

        toast.success('✅ Order updated successfully!', {
          position: 'top-right',
          autoClose: 3000,
          theme: 'colored',
          style: { backgroundColor: '#4CAF50' },
        });
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error(`❌ ${error.message}`, {
        position: 'top-right',
        autoClose: 5000,
        theme: 'colored',
        style: { backgroundColor: '#f44336' },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-gradient-to-b from-[#e7d6f7] to-[#f7d6d0] rounded-lg p-8 w-[550px] shadow-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-[#841c4f]">Edit Order</h2>
          <button
            onClick={onClose}
            className="text-[#841c4f] text-3xl hover:text-red-600 font-bold"
          >
            ×
          </button>
        </div>

        <div className="space-y-5">
          <div className="bg-white/80 p-4 rounded-lg border-2 border-[#d2679f]/30">
            <p className="text-sm text-gray-600 font-semibold mb-2">Order Details:</p>
            <div className="space-y-1 text-sm text-gray-700">
              <p>Customer: <span className="font-semibold text-[#841c4f]">{order.customerName}</span></p>
              <p>Product: <span className="font-semibold text-[#841c4f]">{order.productName}</span></p>
              <p>Quantity: <span className="font-semibold">{order.quantity}</span></p>
              <p>Platform: <span className="font-semibold">{order.platform}</span></p>
              {order.isRepeatCustomer && (
                <p className="text-green-700 font-bold">⭐ Loyal Customer</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-[#841c4f] font-semibold mb-2">Status</label>
            <select
              name="status"
              value={editData.status}
              onChange={handleInputChange}
              className="w-full p-3 border-2 border-[#d2679f]/30 rounded bg-white/90 focus:border-[#841c4f] focus:outline-none"
            >
              <option value="Active">Active</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[#841c4f] font-semibold mb-2">Contact Number</label>
              <input
                type="text"
                name="contactNumber"
                value={editData.contactNumber}
                onChange={handleInputChange}
                className="w-full p-3 border-2 border-[#d2679f]/30 rounded bg-white/90 focus:border-[#841c4f] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[#841c4f] font-semibold mb-2">Address</label>
              <input
                type="text"
                name="address"
                value={editData.address}
                onChange={handleInputChange}
                className="w-full p-3 border-2 border-[#d2679f]/30 rounded bg-white/90 focus:border-[#841c4f] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-3">
            <div>
              <label className="block text-[#841c4f] font-semibold mb-2">Shipping Method</label>
              <select
                name="shippingMethod"
                value={editData.shippingMethod}
                onChange={handleInputChange}
                className="w-full p-3 border-2 border-[#d2679f]/30 rounded bg-white/90 focus:border-[#841c4f] focus:outline-none"
              >
                <option value="J&T">J&T</option>
                <option value="Other">Other</option>
                <option value="Pickup">Pickup</option>
              </select>
            </div>
            <div>
              <label className="block text-[#841c4f] font-semibold mb-2">Payment Method</label>
              <select
                name="paymentMethod"
                value={editData.paymentMethod}
                onChange={handleInputChange}
                className="w-full p-3 border-2 border-[#d2679f]/30 rounded bg-white/90 focus:border-[#841c4f] focus:outline-none"
              >
                <option value="COD">COD</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="GCash">GCash</option>
                <option value="Maya">Maya</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="bg-white/80 p-4 rounded-lg border-2 border-[#d2679f]/30 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">Items Subtotal</span>
              <span className="font-semibold text-[#841c4f]">₱{totals.itemsSubtotal}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">Shipping Fee</span>
              <span className="font-semibold text-[#841c4f]">₱{totals.shippingFee}</span>
            </div>
            <div className="flex justify-between text-sm font-bold">
              <span>Total Amount</span>
              <span className="text-[#841c4f]">₱{totals.totalAmount}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white/80 p-3 rounded-lg border-2 border-[#d2679f]/30">
            <input
              type="checkbox"
              name="isPaid"
              id="isPaid"
              checked={editData.isPaid}
              onChange={handleInputChange}
              className="w-5 h-5 accent-[#841c4f] cursor-pointer"
            />
            <label htmlFor="isPaid" className="text-[#841c4f] font-semibold cursor-pointer">
              Mark as Paid
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-3 rounded-lg font-bold transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 bg-[#ffea99] hover:bg-[#f0dc8e] text-[#841c4f] py-3 rounded-lg font-bold transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditOrderDialog;