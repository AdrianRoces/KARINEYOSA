import { useState } from 'react';
import { toast } from 'react-toastify';
import { supabase } from '../../supabase';

function EditTransactionDialog({ transaction, onClose, onSave }) {
  const [items, setItems] = useState(transaction.items || []);
  const [isPaid, setIsPaid] = useState(transaction.isPaid);
  const [status, setStatus] = useState(transaction.status);
  const [loading, setLoading] = useState(false);
  const [contactNumber, setContactNumber] = useState(transaction.contactNumber || '');
  const [address, setAddress] = useState(transaction.address || '');
  const [shippingMethod, setShippingMethod] = useState(transaction.shippingMethod || 'J&T');
  const [paymentMethod, setPaymentMethod] = useState(transaction.paymentMethod || 'COD');

  const handleSave = async () => {
    setLoading(true);
    try {
      const updatePromises = items.map(async item => {
        const { error } = await supabase.from('orders').update({
          status: status,
          is_paid: isPaid,
          contact_number: contactNumber,
          address: address,
          shipping_method: shippingMethod,
          payment_method: paymentMethod
        }).eq('id', item.id);

        if (error) throw error;
      });

      await Promise.all(updatePromises);
      
      toast.success('✅ Transaction updated successfully!', {
        position: 'top-right',
        autoClose: 3000,
        theme: 'colored'
      });
      onSave();
      onClose();
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast.error(`❌ ${error.message}`, {
        position: 'top-right',
        autoClose: 3000,
        theme: 'colored'
      });
    } finally {
      setLoading(false);
    }
  };

  // Compute clean items total purely from product quantities and prices.
  const itemsTotal = items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitPrice || item.unit_price || 0)), 0);
  
  // Calculate shipping by finding the max value applied in the transaction
  // This smoothly ignores zeros and handles legacy data where shipping was copied to every row
  const shippingTotal = items.length > 0 ? Math.max(...items.map(item => item.shippingFee || item.shipping_fee || 0)) : 0;
  
  // Transaction total strictly avoids compounding shipping fees
  const transactionTotal = itemsTotal + shippingTotal;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gradient-to-b from-[#e7d6f7] to-[#f7d6d0] rounded-lg p-6 w-[900px] shadow-lg max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-[#d2679f]/30">
          <h2 className="text-2xl font-bold text-[#841c4f]">Transaction Details</h2>
          <button
            onClick={onClose}
            className="text-[#841c4f] hover:text-red-600 text-3xl font-bold transition-colors"
          >
            ×
          </button>
        </div>

        <div className="bg-white/80 rounded-lg p-4 mb-4 border-2 border-[#d2679f]/30">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-600 font-semibold">Customer Name</p>
              <p className="text-lg font-bold text-[#841c4f]">{transaction.customerName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 font-semibold">Transaction Date</p>
              <p className="text-lg font-bold text-[#841c4f]">
                {new Date(transaction.orderDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 font-semibold">Employee</p>
              <p className="text-lg font-bold text-[#841c4f]">{transaction.employeeName || '—'}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-gray-600 font-semibold mb-1">Contact Number</label>
              <input
                type="text"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                className="w-full p-2 border-2 border-[#d2679f]/30 rounded bg-white/90 focus:border-[#841c4f] focus:outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 font-semibold mb-1">Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full p-2 border-2 border-[#d2679f]/30 rounded bg-white/90 focus:border-[#841c4f] focus:outline-none text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-600 font-semibold mb-1">Shipping Method</label>
              <select
                value={shippingMethod}
                onChange={(e) => setShippingMethod(e.target.value)}
                className="w-full p-2 border-2 border-[#d2679f]/30 rounded bg-white/90 focus:border-[#841c4f] focus:outline-none text-sm"
              >
                <option value="J&T">J&T Delivery</option>
                <option value="Other">Other Delivery</option>
                <option value="Pickup">Pickup</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 font-semibold mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full p-2 border-2 border-[#d2679f]/30 rounded bg-white/90 focus:border-[#841c4f] focus:outline-none text-sm"
              >
                <option value="COD">COD</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="GCash">GCash</option>
                <option value="Maya">Maya</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white/80 rounded-lg p-4 mb-4 border-2 border-[#d2679f]/30">
          <h3 className="text-lg font-bold text-[#841c4f] mb-3">Items in Transaction</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#d2679f]/20">
                <tr>
                  <th className="px-3 py-2 text-left text-[#841c4f] font-bold">Product</th>
                  <th className="px-3 py-2 text-center text-[#841c4f] font-bold">Qty</th>
                  <th className="px-3 py-2 text-right text-[#841c4f] font-bold">Unit Price</th>
                  <th className="px-3 py-2 text-right text-[#841c4f] font-bold">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const subtotal = (item.quantity || 0) * (item.unitPrice || item.unit_price || 0);
                  return (
                    <tr key={idx} className="border-b border-[#d2679f]/20">
                      <td className="px-3 py-2">{item.productName || item.product_name || 'Unknown'}</td>
                      <td className="px-3 py-2 text-center">{item.quantity}</td>
                      <td className="px-3 py-2 text-right">₱{(item.unitPrice || item.unit_price || 0).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-bold text-[#841c4f]">₱{subtotal.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 border-t-2 border-[#d2679f]/30 pt-3 space-y-2">
            <div className="flex justify-end gap-4">
              <span className="text-[#841c4f] font-semibold">Items Subtotal:</span>
              <span className="text-[#841c4f] font-bold">₱{itemsTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-end gap-4">
              <span className="text-[#841c4f] font-semibold">Shipping Fee:</span>
              <span className="text-[#841c4f] font-bold">₱{shippingTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-end gap-4 text-lg">
              <span className="text-[#841c4f] font-bold">TOTAL AMOUNT:</span>
              <span className="text-[#841c4f] font-bold">₱{transactionTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white/80 rounded-lg p-4 mb-4 border-2 border-[#d2679f]/30">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col justify-between">
              <label className="block text-sm font-semibold text-[#841c4f] mb-2">Payment Status</label>
              <div className="flex items-center gap-3 rounded-2xl border border-[#d2679f]/40 bg-white/90 px-4 py-3">
                <input
                  id="markAsPaid"
                  type="checkbox"
                  checked={isPaid}
                  onChange={(e) => setIsPaid(e.target.checked)}
                  className="h-5 w-5 rounded border-[#d2679f]/40 text-[#841c4f] focus:ring-[#841c4f]"
                />
                <label htmlFor="markAsPaid" className="text-sm font-semibold text-[#841c4f]">
                  mark as paid
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#841c4f] mb-2">Order Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full p-2 border-2 border-[#d2679f]/30 rounded bg-white/90 focus:border-[#841c4f] focus:outline-none"
              >
                <option value="Active">Active</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold rounded-lg transition"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-[#ffea99] hover:bg-[#f0dc8e] text-[#841c4f] font-bold rounded-lg transition disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditTransactionDialog;