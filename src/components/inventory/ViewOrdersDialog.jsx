import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { supabase } from '../../supabase';
import EditOrderDialog from './EditOrderDialog';
import CancelOrderDialog from './CancelOrderDialog';
import CancelledOrdersDialog from './CancelledOrdersDialog';

function ViewOrdersDialog({ product, onClose }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showCancelledOrders, setShowCancelledOrders] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [product.id]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (showCancelledOrders) {
          setShowCancelledOrders(false);
        } else if (showEditDialog || showCancelDialog) {
          // Let the dialogs handle their own escape
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose, showCancelledOrders, showEditDialog, showCancelDialog]);

  const fetchOrders = async () => {
    try {
      // Fetch orders for this product from Supabase
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('product_id', product.id)
        .order('order_date', { ascending: false });

      if (ordersError) throw ordersError;

      // Fetch all customers for tag mapping
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*');

      if (customersError) throw customersError;

      // Create a map of customerId to customer data for quick lookup
      const customersMap = new Map((customersData || []).map(c => [c.id, c]));

      // Map is_repeat_customer to tag
      const enrichedOrders = (ordersData || []).map(order => ({
        ...order,
        customerTag: order.customer_id ? (customersMap.get(order.customer_id)?.is_repeat_customer ? 'Loyal' : 'Regular') : 'New'
      }));

      setOrders(enrichedOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (order) => {
    setSelectedOrder(order);
    setShowEditDialog(true);
  };

  const handleCancel = (order) => {
    setSelectedOrder(order);
    setShowCancelDialog(true);
  };

  const handleOrderSuccess = async () => {
    await fetchOrders();
  };

  if (showCancelledOrders) {
    return <CancelledOrdersDialog product={product} onClose={() => setShowCancelledOrders(false)} />;
  }

  const activeOrders = orders.filter(order => order.status !== 'Cancelled');
  const cancelledCount = orders.filter(order => order.status === 'Cancelled').length;

  // Compute strictly without shipping logic for accurate product-level reporting
  const totals = {
    revenue: activeOrders.reduce((sum, o) => sum + ((o.quantity || 0) * (o.unitPrice || o.unit_price || 0)), 0),
    quantity: activeOrders.reduce((sum, o) => sum + o.quantity, 0),
  };

  return (
    <div 
      className="fixed inset-0 min-h-screen bg-black/50 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 overflow-hidden p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <style>{`body { overflow: hidden; }`}</style>
      <div className="bg-gradient-to-b from-[#e7d6f7] to-[#f7d6d0] rounded-lg p-4 md:p-6 w-full max-w-6xl shadow-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-start gap-3 mb-3 md:mb-5 pb-3 md:pb-4 border-b-2 border-[#d2679f]/30 flex-shrink-0">
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <h2 className="text-base md:text-xl font-bold text-[#841c4f] truncate">ORDERS FOR {product.name?.toUpperCase()}</h2>
            {cancelledCount > 0 && (
              <button
                onClick={() => setShowCancelledOrders(true)}
                className="px-2 md:px-3 py-1 bg-red-200 hover:bg-red-300 text-red-800 rounded text-xs font-semibold transition-colors w-fit"
              >
                View Cancelled ({cancelledCount})
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-2xl md:text-3xl text-[#841c4f] hover:text-red-600 font-bold flex-shrink-0"
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-600 flex-1 flex items-center justify-center">Loading orders...</div>
        ) : activeOrders.length === 0 ? (
          <div className="text-center py-12 text-gray-600 flex-1 flex items-center justify-center">No active orders</div>
        ) : (
          <>
            {/* Totals Summary */}
            <div className="grid grid-cols-2 gap-2 md:gap-3 mb-3 md:mb-4 flex-shrink-0">
              <div className="bg-white/80 p-2 md:p-3 rounded-lg border-2 border-[#d2679f]/30">
                <p className="text-xs text-gray-600 font-semibold">Total Revenue</p>
                <p className="text-base md:text-lg font-bold text-[#841c4f]">₱{totals.revenue.toFixed(2)}</p>
              </div>
              <div className="bg-white/80 p-2 md:p-3 rounded-lg border-2 border-[#d2679f]/30">
                <p className="text-xs text-gray-600 font-semibold">Total Units</p>
                <p className="text-base md:text-lg font-bold text-[#841c4f]">{totals.quantity}</p>
              </div>
            </div>

            {/* Orders Table */}
            <div className="overflow-x-auto flex-1 min-h-0">
              <table className="min-w-[900px] w-full border-collapse text-xs md:text-sm">
                <thead className="sticky top-0">
                      <tr className="bg-[#d4b5d4]">
                        <th className="py-2 px-2 md:px-3 text-left text-[#841c4f] font-bold whitespace-nowrap">Customer</th>
                        <th className="py-2 px-2 md:px-3 text-center text-[#841c4f] font-bold whitespace-nowrap hidden sm:table-cell">Type</th>
                        <th className="py-2 px-2 md:px-3 text-center text-[#841c4f] font-bold">Qty</th>
                        <th className="py-2 px-2 md:px-3 text-center text-[#841c4f] font-bold whitespace-nowrap hidden md:table-cell">Platform</th>
                        <th className="py-2 px-2 md:px-3 text-center text-[#841c4f] font-bold whitespace-nowrap">Payment</th>
                        <th className="py-2 px-2 md:px-3 text-right text-[#841c4f] font-bold">Revenue</th>
                        <th className="py-2 px-2 md:px-3 text-center text-[#841c4f] font-bold whitespace-nowrap hidden sm:table-cell">Status</th>
                        <th className="py-2 px-2 md:px-3 text-center text-[#841c4f] font-bold">Actions</th>
                      </tr>
                </thead>
                <tbody>
                  {activeOrders.map((order, index) => {
                    const rowRevenue = (order.quantity || 0) * (order.unitPrice || order.unit_price || 0);
                    return (
                      <tr
                        key={order.id}
                        className={`${index % 2 === 0 ? 'bg-white' : 'bg-[#f9f4f9]'} hover:bg-purple-100 transition-colors border-b border-[#d2679f]/30`}
                      >
                        <td className="py-2 md:py-3 px-2 md:px-3 text-gray-800 font-medium truncate">{order.customerName}</td>
                        <td className="py-2 md:py-3 px-2 md:px-3 text-center hidden sm:table-cell">
                          {order.customerTag === 'Bogus' ? (
                            <span className="text-xs bg-red-200 text-red-800 px-1 md:px-2 py-1 rounded font-semibold inline-block">Bogus</span>
                          ) : order.customerTag === 'Loyal' ? (
                            <span className="text-xs bg-green-200 text-green-800 px-1 md:px-2 py-1 rounded font-semibold inline-block">Loyal</span>
                          ) : order.customerTag === 'Regular' ? (
                            <span className="text-xs bg-amber-200 text-amber-800 px-1 md:px-2 py-1 rounded font-semibold inline-block">Regular</span>
                          ) : (
                            <span className="text-xs bg-blue-200 text-blue-800 px-1 md:px-2 py-1 rounded font-semibold inline-block">New</span>
                          )}
                        </td>
                        <td className="py-2 md:py-3 px-2 md:px-3 text-center text-gray-800">{order.quantity}</td>
                        <td className="py-2 md:py-3 px-2 md:px-3 text-center text-gray-800 text-xs hidden md:table-cell">{order.platform}</td>
                        <td className="py-2 md:py-3 px-2 md:px-3 text-center">
                          {order.isPaid ? (
                            <span className="text-xs bg-green-100 text-green-800 px-1 md:px-2 py-1 rounded font-semibold inline-block">Paid</span>
                          ) : (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-1 md:px-2 py-1 rounded font-semibold inline-block">Pending</span>
                          )}
                        </td>
                        <td className="py-2 md:py-3 px-2 md:px-3 text-right text-gray-800 font-semibold whitespace-nowrap">₱{rowRevenue.toFixed(2)}</td>
                        <td className="py-2 md:py-3 px-2 md:px-3 text-center hidden sm:table-cell">
                          {order.status === 'Completed' ? (
                            <span className="px-1 md:px-2 py-1 bg-blue-200 text-blue-800 rounded text-xs font-semibold inline-block">Completed</span>
                          ) : (
                            <span className="px-1 md:px-2 py-1 bg-purple-200 text-purple-800 rounded text-xs font-semibold inline-block">Active</span>
                          )}
                        </td>
                        <td className="py-2 md:py-3 px-2 md:px-3">
                          <div className="flex gap-1 justify-center flex-wrap">
                            <button onClick={() => handleEdit(order)} className="px-1 md:px-2 py-1 bg-blue-200 hover:bg-blue-300 text-blue-800 rounded text-xs font-semibold transition-colors whitespace-nowrap">Edit</button>
                            <button onClick={() => handleCancel(order)} className="px-1 md:px-2 py-1 bg-red-200 hover:bg-red-300 text-red-800 rounded text-xs font-semibold transition-colors whitespace-nowrap">Cancel</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {showEditDialog && selectedOrder && (
          <EditOrderDialog
            order={selectedOrder}
            onClose={() => setShowEditDialog(false)}
            onSuccess={handleOrderSuccess}
          />
        )}

        {showCancelDialog && selectedOrder && (
          <CancelOrderDialog
            order={selectedOrder}
            onClose={() => setShowCancelDialog(false)}
            onSuccess={handleOrderSuccess}
          />
        )}
      </div>
    </div>
  );
}

export default ViewOrdersDialog;