import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import RestoreOrderDialog from './RestoreOrderDialog';
import DeleteConfirmationDialog from './DeleteConfirmationDialog';
import { supabase } from '../../supabase';

function CancelledOrdersDialog({ product, onClose }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    fetchCancelledOrders();
  }, [product.id]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (showRestoreDialog) {
          setShowRestoreDialog(false);
        } else if (showDeleteDialog) {
          setShowDeleteDialog(false);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose, showRestoreDialog, showDeleteDialog]);

  const fetchCancelledOrders = async () => {
    try {
      const [{ data: ordersData, error: ordersError }, { data: customersData, error: custError }] = await Promise.all([
        supabase.from('orders').select('*').eq('product_id', product.id).eq('status', 'Cancelled'),
        supabase.from('customers').select('*')
      ]);

      if (ordersError) throw ordersError;
      
      const customersMap = new Map((customersData || []).map(c => [
        c.id, 
        c.manual_bogus ? 'Bogus' : (c.is_repeat_customer ? 'Loyal' : (c.total_orders > 1 ? 'Regular' : 'New'))
      ]));

      const enrichedOrders = (ordersData || []).map(o => ({
        id: o.id,
        customerId: o.customer_id,
        customerName: o.customer_name,
        productId: o.product_id,
        productName: o.product_name,
        quantity: o.quantity,
        platform: o.platform,
        unitPrice: o.unit_price,
        profitPerUnit: o.profit_per_unit,
        totalAmount: o.total_amount,
        totalProfit: o.total_profit,
        isPaid: o.is_paid,
        status: o.status,
        orderDate: o.order_date,
        cancelledDate: o.cancelled_date,
        cancellationReason: o.cancellation_reason,
        contactNumber: o.contact_number,
        address: o.address,
        shippingMethod: o.shipping_method,
        paymentMethod: o.payment_method,
        shippingFee: o.shipping_fee,
        employeeName: o.employee_name,
        transactionId: o.transaction_id,
        customerTag: o.customer_id ? (customersMap.get(o.customer_id) || 'New') : 'New'
      }));

      setOrders(enrichedOrders);
    } catch (error) {
      console.error('Error fetching cancelled orders:', error);
      toast.error('Failed to load cancelled orders');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = (order) => {
    setSelectedOrder(order);
    setShowRestoreDialog(true);
  };

  const handleDeletePermanently = (order) => {
    setDeleteTarget(order);
    setShowDeleteDialog(true);
  };

  const confirmDeletePermanently = async () => {
    try {
      const { error } = await supabase.from('orders').delete().eq('id', deleteTarget.id);

      if (error) throw error;

      toast.success('Order permanently deleted!', {
        position: 'top-right',
        autoClose: 3000,
        theme: 'colored',
      });

      setShowDeleteDialog(false);
      setDeleteTarget(null);
      await fetchCancelledOrders();
    } catch (error) {
      console.error('Error deleting order:', error);
      toast.error(error.message, {
        position: 'top-right',
        autoClose: 5000,
        theme: 'colored',
      });
    }
  };

  const handleRestoreSuccess = async () => {
    setShowRestoreDialog(false);
    setSelectedOrder(null);
    await fetchCancelledOrders();
  };


  if (showRestoreDialog && selectedOrder) {
    return (
      <RestoreOrderDialog
        order={selectedOrder}
        onClose={() => setShowRestoreDialog(false)}
        onSuccess={handleRestoreSuccess}
      />
    );
  }

  return (
    <div 
      className="fixed inset-0 min-h-screen bg-black/50 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 overflow-hidden p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <style>{`body { overflow: hidden; }`}</style>
      <div className="bg-gradient-to-b from-[#e7d6f7] to-[#f7d6d0] rounded-lg p-6 w-full max-w-[1200px] shadow-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[#841c4f] text-xl font-bold">CANCELLED ORDERS</h2>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="text-[#841c4f] text-2xl hover:text-red-600"
            >
              ×
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-4">Loading cancelled orders...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-8 text-gray-600">
            No cancelled orders for this product
          </div>
        ) : (
          <div className="overflow-x-auto flex-1 min-h-0">
            <table className="min-w-[980px] w-full border-collapse">
              <thead className="sticky top-0 bg-[#d4b5d4]">
                <tr>
                  <th className="border border-[#b8a0b8] px-4 py-2 text-left text-[#841c4f] font-bold min-w-[120px]">Customer</th>
                  <th className="border border-[#b8a0b8] px-4 py-2 text-center text-[#841c4f] font-bold min-w-[80px]">Type</th>
                  <th className="border border-[#b8a0b8] px-4 py-2 text-center text-[#841c4f] font-bold min-w-[70px]">Qty</th>
                  <th className="border border-[#b8a0b8] px-4 py-2 text-center text-[#841c4f] font-bold min-w-[100px]">Platform</th>
                  <th className="border border-[#b8a0b8] px-4 py-2 text-left text-[#841c4f] font-bold min-w-[160px]">Contact / Shipping / Payment</th>
                  <th className="border border-[#b8a0b8] px-4 py-2 text-center text-[#841c4f] font-bold min-w-[120px]">Cancelled Date</th>
                  <th className="border border-[#b8a0b8] px-4 py-2 text-left text-[#841c4f] font-bold min-w-[100px]">Reason</th>
                  <th className="border border-[#b8a0b8] px-4 py-2 text-right text-[#841c4f] font-bold min-w-[100px]">Amount</th>
                  <th className="border border-[#b8a0b8] px-4 py-2 text-center text-[#841c4f] font-bold min-w-[120px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order, index) => (
                  <tr key={order.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-[#f9f4f9]'} hover:bg-purple-100 transition-colors`}>
                    <td className="border border-[#d4b5d4] px-4 py-2 text-sm text-gray-800 font-medium">
                      {order.customerName}
                    </td>
                    <td className="border border-[#d4b5d4] px-4 py-2 text-center">
                      {order.customerTag === 'Bogus' ? (
                        <span className="px-2 py-1 bg-red-200 text-red-800 rounded text-xs font-semibold">
                          Bogus
                        </span>
                      ) : order.customerTag === 'Loyal' ? (
                        <span className="px-2 py-1 bg-green-200 text-green-800 rounded text-xs font-semibold">
                          Loyal
                        </span>
                      ) : order.customerTag === 'Regular' ? (
                        <span className="px-2 py-1 bg-amber-200 text-amber-800 rounded text-xs font-semibold">
                          Regular
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-blue-200 text-blue-800 rounded text-xs font-semibold">
                          New
                        </span>
                      )}
                    </td>
                    <td className="border border-[#d4b5d4] px-4 py-2 text-center text-gray-800 text-sm">
                      {order.quantity}
                    </td>
                    <td className="border border-[#d4b5d4] px-4 py-2 text-center text-gray-800 text-sm">
                      {order.platform.charAt(0).toUpperCase() + order.platform.slice(1)}
                    </td>
                    <td className="border border-[#d4b5d4] px-4 py-2 text-left text-gray-800">
                      <div className="text-sm">
                        <div className="font-semibold">{order.contactNumber || ''}</div>
                        <div className="text-xs text-gray-600">{order.shippingMethod || ''} • {order.paymentMethod || ''}</div>
                      </div>
                    </td>
                    <td className="border border-[#d4b5d4] px-4 py-2 text-center text-gray-800 text-sm">
                      {new Date(order.cancelledDate).toLocaleDateString()}
                    </td>
                    <td className="border border-[#d4b5d4] px-4 py-2 text-sm text-gray-800 max-w-xs truncate">
                      {order.cancellationReason || 'N/A'}
                    </td>
                    <td className="border border-[#d4b5d4] px-4 py-2 text-right text-gray-800 text-sm font-semibold">
                      ₱{order.totalAmount.toFixed(2)}
                    </td>
                    <td className="border border-[#d4b5d4] px-4 py-2 text-center">
                      <div className="flex gap-2 justify-center flex-wrap">
                        <button
                          onClick={() => handleRestore(order)}
                          className="px-3 py-1 bg-green-200 hover:bg-green-300 text-green-800 rounded text-xs font-semibold transition-colors"
                          title="Restore order to Active"
                        >
                          Restore
                        </button>
                        <button
                          onClick={() => handleDeletePermanently(order)}
                          className="px-3 py-1 bg-red-200 hover:bg-red-300 text-red-800 rounded text-xs font-semibold transition-colors"
                          title="Permanently delete"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmationDialog
          isOpen={showDeleteDialog}
          onClose={() => {
            setShowDeleteDialog(false);
            setDeleteTarget(null);
          }}
          onConfirm={confirmDeletePermanently}
          title="Delete Cancelled Order Permanently"
          message="Are you sure you want to permanently delete this cancelled order? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
        />
      </div>
    </div>
  );
}

export default CancelledOrdersDialog;