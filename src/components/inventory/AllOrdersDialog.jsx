import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import EditTransactionDialog from './EditTransactionDialog';
import CustomersTabContent from './CustomersTabContent';
import DeleteConfirmationDialog from './DeleteConfirmationDialog';
import { supabase } from '../../supabase';

function AllOrdersDialog({ onClose, initialTab = 'active' }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    fetchAllOrders();
  }, []);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const fetchAllOrders = async () => {
    try {
      const [{ data: ordersData, error: ordersError }, { data: customersData, error: custError }] = await Promise.all([
        supabase.from('orders').select('*').order('order_date', { ascending: false }),
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
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const groupTransactions = (orderList) => {
    const grouped = {};
    orderList.forEach(order => {
      const txnId = order.transactionId || `single-${order.id}`;
      if (!grouped[txnId]) {
        grouped[txnId] = {
          transactionId: txnId,
          customerName: order.customerName,
          customerTag: order.customerTag,
          platform: order.platform,
          orderDate: order.orderDate,
          employeeName: order.employeeName,
          contactNumber: order.contactNumber,
          address: order.address,
          shippingMethod: order.shippingMethod,
          paymentMethod: order.paymentMethod,
          status: order.status,
          isPaid: order.isPaid,
          cancellationReason: order.cancellationReason,
          items: [],
          itemsTotal: 0,
          shippingFee: 0,
          totalAmount: 0
        };
      }
      
      if (!grouped[txnId].cancellationReason && order.cancellationReason) {
        grouped[txnId].cancellationReason = order.cancellationReason;
      }
      
      grouped[txnId].items.push(order);
      
      // Calculate true items subtotal without shipping
      const itemSubtotal = (order.quantity || 0) * (order.unitPrice || order.unit_price || 0);
      grouped[txnId].itemsTotal += itemSubtotal;
      
      // Get the highest shipping fee assigned in this transaction's rows
      grouped[txnId].shippingFee = Math.max(grouped[txnId].shippingFee, order.shippingFee || order.shipping_fee || 0);
      
      if (grouped[txnId].items.length === 1) {
        grouped[txnId].status = order.status;
        grouped[txnId].isPaid = order.isPaid;
      }
    });

    // Finalize total amount dynamically to ignore any legacy corrupted database totals
    Object.values(grouped).forEach(txn => {
      txn.totalAmount = txn.itemsTotal + txn.shippingFee;
    });

    return Object.values(grouped);
  };

  const getFilteredTransactions = () => {
    let filtered = groupTransactions(orders);
    
    if (activeTab === 'active') {
      filtered = filtered.filter((t) => t.status !== 'Cancelled' && t.status !== 'Completed');
    } else if (activeTab === 'completed') {
      filtered = filtered.filter((t) => t.status === 'Completed');
    } else if (activeTab === 'cancelled') {
      filtered = filtered.filter((t) => t.status === 'Cancelled');
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.customerName.toLowerCase().includes(term) ||
          t.platform.toLowerCase().includes(term)
      );
    }

    return filtered;
  };

  const handleEdit = (transaction) => {
    setSelectedTransaction(transaction);
    setShowEditDialog(true);
  };

  const handleCancel = (transaction) => {
    setCancelTarget(transaction);
    setCancelReason('');
    setShowCancelDialog(true);
  };

  const confirmCancelTransaction = async () => {
    if (!cancelReason.trim()) {
      toast.error('❌ Cancellation reason is required.', { position: 'top-right', autoClose: 3000, theme: 'colored' });
      return;
    }

    try {
      console.log('Cancelling transaction:', cancelTarget);

      // Updating the status to 'Cancelled' automatically triggers the database backend
      // to perfectly restore the product quantity. We don't have to calculate it on the frontend anymore!
      const cancelPromises = cancelTarget.items.map(item =>
        supabase.from('orders').update({ 
          status: 'Cancelled', 
          cancellation_reason: cancelReason.trim(),
          cancelled_date: new Date().toISOString()
        }).eq('id', item.id)
      );

      await Promise.all(cancelPromises);
      
      toast.success('✅ Transaction cancelled successfully! Stock has been restored.', { position: 'top-right', autoClose: 3000, theme: 'colored' });
      setShowCancelDialog(false);
      setCancelTarget(null);
      setCancelReason('');
      await fetchAllOrders();
    } catch (error) {
      console.error('Error cancelling transaction:', error);
      toast.error(`❌ ${error.message}`, { position: 'top-right', autoClose: 3000, theme: 'colored' });
    }
  };

  const handleRestoreTransaction = async (transaction) => {
    try {
      console.log('Restoring transaction:', transaction);

      // Just like canceling, changing it back to Active automatically triggers the backend
      // to deduct the stock again so you don't over-calculate.
      const restorePromises = transaction.items.map(item =>
        supabase.from('orders').update({ 
          status: 'Active', 
          cancellation_reason: null, 
          cancelled_date: null 
        }).eq('id', item.id)
      );

      await Promise.all(restorePromises);
      
      toast.success('✅ Transaction restored successfully! Stock has been deducted.', { position: 'top-right', autoClose: 3000, theme: 'colored' });
      await fetchAllOrders();
    } catch (error) {
      console.error('Error restoring transaction:', error);
      toast.error(`❌ ${error.message}`, { position: 'top-right', autoClose: 3000, theme: 'colored' });
    }
  };

  const handleDeleteCancelledTransaction = (transaction) => {
    setDeleteTarget(transaction);
    setShowDeleteDialog(true);
  };

  const confirmDeleteTransactionPermanently = async () => {
    try {
      const deletePromises = deleteTarget.items.map(item =>
        supabase.from('orders').delete().eq('id', item.id)
      );

      await Promise.all(deletePromises);
      toast.success('✅ Cancelled transaction permanently deleted!', { position: 'top-right', autoClose: 3000, theme: 'colored' });
      setShowDeleteDialog(false);
      setDeleteTarget(null);
      await fetchAllOrders();
    } catch (error) {
      console.error('Error deleting cancelled transaction:', error);
      toast.error('Failed to delete cancelled transaction', { position: 'top-right', autoClose: 3000, theme: 'colored' });
    }
  };

  const handleTransactionSuccess = async () => {
    setShowEditDialog(false);
    setSelectedTransaction(null);
    await fetchAllOrders();
  };

  const filteredTransactions = getFilteredTransactions();
  const allTransactions = groupTransactions(orders);

  return (
    <div 
      className="fixed inset-0 min-h-screen bg-black/50 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 overflow-hidden p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <style>{`body { overflow: hidden; }`}</style>
      <div className="bg-gradient-to-b from-[#e7d6f7] to-[#f7d6d0] rounded-lg w-full max-w-6xl max-h-[90vh] shadow-lg flex flex-col overflow-hidden">
        <div className="px-4 md:px-6 pt-4 md:pt-6 pb-0 flex justify-between items-center flex-shrink-0 gap-4">
          <h2 className="text-lg md:text-xl font-bold text-[#841c4f] truncate">TRANSACTIONS</h2>
          <button
            onClick={onClose}
            className="text-[#841c4f] text-2xl hover:text-red-600 flex-shrink-0"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="overflow-x-auto flex-shrink-0 border-b-2 border-[#c99ab5]">
          <div className="flex gap-1 md:gap-2 px-4 md:px-6 py-0">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-3 md:px-6 py-3 font-semibold transition-all whitespace-nowrap text-sm md:text-base ${
                activeTab === 'active'
                  ? 'text-gray-800 bg-gradient-to-br from-[#D1C6F3] to-[#E9BCAC] border-b-4 border-[#a8939f] rounded-t'
                  : 'text-gray-800 hover:text-gray-900 hover:bg-white/80'
              }`}
            >
              Active ({allTransactions.filter((t) => t.status !== 'Cancelled' && t.status !== 'Completed').length})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`px-3 md:px-6 py-3 font-semibold transition-all whitespace-nowrap text-sm md:text-base ${
                activeTab === 'completed'
                  ? 'text-gray-800 bg-gradient-to-br from-[#D1C6F3] to-[#E9BCAC] border-b-4 border-[#a8939f] rounded-t'
                  : 'text-gray-800 hover:text-gray-900 hover:bg-white/80'
              }`}
            >
              Completed ({allTransactions.filter((t) => t.status === 'Completed').length})
            </button>
            <button
              onClick={() => setActiveTab('cancelled')}
              className={`px-3 md:px-6 py-3 font-semibold transition-all whitespace-nowrap text-sm md:text-base ${
                activeTab === 'cancelled'
                  ? 'text-white bg-red-600 border-b-4 border-red-700 rounded-t'
                  : 'text-red-600 hover:text-red-700 hover:bg-red-50'
              }`}
            >
              Cancelled ({allTransactions.filter((t) => t.status === 'Cancelled').length})
            </button>
            <button
              onClick={() => setActiveTab('customers')}
              className={`px-3 md:px-6 py-3 font-semibold transition-all whitespace-nowrap text-sm md:text-base ${
                activeTab === 'customers'
                  ? 'text-white bg-blue-600 border-b-4 border-blue-700 rounded-t'
                  : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
              }`}
            >
              Customers
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'customers' ? (
          <div className="overflow-y-auto flex-1">
            <CustomersTabContent />
          </div>
        ) : loading ? (
          <div className="px-4 md:px-6 text-center py-8">Loading transactions...</div>
        ) : (
          <div className="overflow-y-auto flex-1 flex flex-col min-h-0">
            {/* Search Bar */}
            <div className="px-4 md:px-6 py-3 md:py-4 border-b border-[#c99ab5]/30 flex-shrink-0">
              <input
                type="text"
                placeholder="Search by customer name or platform..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 md:px-4 py-2 rounded-lg border border-[#c99ab5] bg-white text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#841c4f] text-sm md:text-base"
              />
            </div>

            {/* Transactions Table */}
            {filteredTransactions.length === 0 ? (
              <div className="px-4 md:px-6 text-center py-8 text-gray-600 flex-1 flex items-center justify-center">
                {searchTerm.trim()
                  ? `No ${activeTab} transactions found matching "${searchTerm}"`
                  : `No ${activeTab} transactions found`}
              </div>
            ) : (
              <div className="flex-1 min-h-0 flex flex-col">
                <div className={`${activeTab === 'cancelled' ? 'overflow-x-auto flex-1 min-h-0' : 'overflow-x-auto flex-1 min-h-0'}`}>
                  <div className={`${activeTab === 'cancelled' ? 'inline-block min-w-full' : 'inline-block min-w-full'} px-4 md:px-6 py-3 md:py-4`}>
                    <table className={`${activeTab === 'cancelled' ? 'min-w-[1200px]' : 'min-w-[1000px]'} w-full border-collapse bg-white rounded-lg overflow-hidden`}>
                      <thead className="sticky top-0 text-gray-800 text-sm md:text-base" style={{ background: 'linear-gradient(135deg, #D1C6F3 0%, #E9BCAC 100%)' }}>
                        <tr>
                        <th className="border border-gray-300 px-2 md:px-4 py-2 md:py-3 text-left font-bold whitespace-nowrap">
                          Customer
                        </th>
                        <th className="border border-gray-300 px-2 md:px-4 py-2 md:py-3 text-center font-bold whitespace-nowrap">
                          Type
                        </th>
                        <th className="border border-gray-300 px-2 md:px-4 py-2 md:py-3 text-center font-bold whitespace-nowrap">
                          Platform
                        </th>
                        <th className="border border-gray-300 px-2 md:px-4 py-2 md:py-3 text-center font-bold whitespace-nowrap">
                          Date
                        </th>
                        <th className="border border-gray-300 px-2 md:px-4 py-2 md:py-3 text-right font-bold whitespace-nowrap">
                          Total
                        </th>
                        <th className="border border-gray-300 px-2 md:px-4 py-2 md:py-3 text-center font-bold whitespace-nowrap">
                          Payment Status
                        </th>
                        <th className="border border-gray-300 px-2 md:px-4 py-2 md:py-3 text-center font-bold whitespace-nowrap">
                          Status
                        </th>
                        {activeTab === 'cancelled' && (
                          <th className="border border-gray-300 px-2 md:px-4 py-2 md:py-3 text-left font-bold whitespace-nowrap">
                            Reason
                          </th>
                        )}
                        <th className="border border-gray-300 px-2 md:px-4 py-2 md:py-3 text-center font-bold whitespace-nowrap">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="text-xs md:text-sm">
                      {filteredTransactions.map((transaction, index) => (
                        <tr
                          key={transaction.transactionId}
                          className={`${index % 2 === 0 ? 'bg-white' : 'bg-[#f9eef5]'} ${
                            transaction.status === 'Cancelled' ? 'bg-[#ffe0f0]' : ''
                          } hover:bg-[#FFE2F0]/50 transition-colors border-b border-[#65366F]/10`}
                        >
                          <td className="border border-[#65366F]/20 px-2 md:px-4 py-2 md:py-3 text-gray-800 font-semibold">
                            <div className="truncate">{transaction.customerName}</div>
                            <div className="text-xs text-gray-600 md:hidden">{transaction.platform}</div>
                          </td>
                          <td className="border border-[#65366F]/20 px-2 md:px-4 py-2 md:py-3 text-center">
                            {transaction.customerTag === 'Bogus' ? (
                              <span className="px-1 md:px-2 py-1 bg-red-200 text-red-800 rounded text-xs font-semibold inline-block">
                                Bogus
                              </span>
                            ) : transaction.customerTag === 'Loyal' ? (
                              <span className="px-1 md:px-2 py-1 bg-green-200 text-green-800 rounded text-xs font-semibold inline-block">
                                Loyal
                              </span>
                            ) : transaction.customerTag === 'Regular' ? (
                              <span className="px-1 md:px-2 py-1 bg-amber-200 text-amber-800 rounded text-xs font-semibold inline-block">
                                Regular
                              </span>
                            ) : (
                              <span className="px-1 md:px-2 py-1 bg-blue-200 text-blue-800 rounded text-xs font-semibold inline-block">
                                New
                              </span>
                            )}
                          </td>
                          <td className="border border-[#65366F]/20 px-2 md:px-4 py-2 md:py-3 text-center text-gray-800 capitalize font-medium">
                            {transaction.platform}
                          </td>
                          <td className="border border-[#65366F]/20 px-2 md:px-4 py-2 md:py-3 text-center text-gray-800">
                            {new Date(transaction.orderDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                          </td>
                          <td className="border border-[#65366F]/20 px-2 md:px-4 py-2 md:py-3 text-right text-gray-800 font-bold whitespace-nowrap">
                            ₱{transaction.totalAmount.toFixed(2)}
                          </td>
                          <td className="border border-[#65366F]/20 px-2 md:px-4 py-2 md:py-3 text-center">
                            {transaction.isPaid ? (
                              <span className="px-1 md:px-2 py-1 bg-green-200 text-green-800 rounded text-xs font-semibold inline-block">
                                ✓ Paid
                              </span>
                            ) : (
                              <span className="px-1 md:px-2 py-1 bg-yellow-200 text-yellow-800 rounded text-xs font-semibold inline-block">
                                ○ Pending
                              </span>
                            )}
                          </td>
                          <td className="border border-[#65366F]/20 px-2 md:px-4 py-2 md:py-3 text-center">
                            {transaction.status === 'Completed' ? (
                              <span className="px-1 md:px-2 py-1 bg-blue-200 text-blue-800 rounded text-xs font-semibold inline-block">
                                ✓ Completed
                              </span>
                            ) : transaction.status === 'Cancelled' ? (
                              <span className="px-1 md:px-2 py-1 bg-red-200 text-red-800 rounded text-xs font-semibold inline-block">
                                ✕ Cancelled
                              </span>
                            ) : (
                              <span className="px-1 md:px-2 py-1 bg-purple-200 text-purple-800 rounded text-xs font-semibold inline-block">
                                ◊ Active
                              </span>
                            )}
                          </td>
                          {activeTab === 'cancelled' && (
                            <td className="border border-[#65366F]/20 px-2 md:px-4 py-2 md:py-3 text-left text-gray-700 text-xs md:text-sm max-w-xs">
                              <div className="truncate" title={transaction.cancellationReason || 'No reason provided'}>
                                {transaction.cancellationReason || '—'}
                              </div>
                            </td>
                          )}
                          <td className="border border-[#65366F]/20 px-2 md:px-4 py-2 md:py-3 text-center">
                            <div className="flex gap-1 justify-center flex-wrap">
                              {transaction.status === 'Cancelled' ? (
                                <>
                                  <button
                                    onClick={() => handleEdit(transaction)}
                                    className="px-2 md:px-3 py-1 bg-blue-200 hover:bg-blue-300 text-blue-800 rounded text-xs font-semibold transition-colors"
                                    title="View transaction details"
                                  >
                                    View
                                  </button>
                                  <button
                                    onClick={() => handleRestoreTransaction(transaction)}
                                    className="px-2 md:px-3 py-1 bg-green-200 hover:bg-green-300 text-green-800 rounded text-xs font-semibold transition-colors"
                                    title="Restore transaction"
                                  >
                                    Restore
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCancelledTransaction(transaction)}
                                    className="px-2 md:px-3 py-1 bg-red-200 hover:bg-red-300 text-red-800 rounded text-xs font-semibold transition-colors"
                                    title="Delete cancelled transaction"
                                  >
                                    Delete
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleEdit(transaction)}
                                    className="px-2 md:px-3 py-1 bg-blue-200 hover:bg-blue-300 text-blue-800 rounded text-xs font-semibold transition-colors"
                                    title="Edit transaction"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleCancel(transaction)}
                                    className="px-2 md:px-3 py-1 bg-red-200 hover:bg-red-300 text-red-800 rounded text-xs font-semibold transition-colors"
                                    title="Cancel transaction"
                                  >
                                    Cancel
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            )}
          </div>
        )}
      </div>

      {showCancelDialog && cancelTarget && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4 overflow-hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCancelDialog(false);
              setCancelTarget(null);
              setCancelReason('');
            }
          }}
        >
          <div className="bg-gradient-to-b from-[#e7d6f7] to-[#f7d6d0] rounded-lg p-4 md:p-6 w-full max-w-lg shadow-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3 md:mb-4">
              <h2 className="text-lg md:text-xl font-bold text-[#841c4f]">Cancel Transaction</h2>
              <button
                onClick={() => {
                  setShowCancelDialog(false);
                  setCancelTarget(null);
                  setCancelReason('');
                }}
                className="text-2xl text-[#841c4f] hover:text-red-600 flex-shrink-0"
              >
                ×
              </button>
            </div>
            <p className="text-gray-700 mb-3 md:mb-4 text-sm">Cancellation reason:</p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={5}
              className="w-full p-3 border rounded bg-white/90 border-[#d2679f]/30 focus:outline-none focus:ring-2 focus:ring-[#d2679f] text-sm"
              placeholder="e.g., Customer requested, Out of stock, Payment failed"
            />
            <div className="flex justify-end gap-2 md:gap-3 mt-4">
              <button
                onClick={() => {
                  setShowCancelDialog(false);
                  setCancelTarget(null);
                  setCancelReason('');
                }}
                className="px-3 md:px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded font-semibold transition-colors text-sm"
              >
                Keep Transaction
              </button>
              <button
                onClick={confirmCancelTransaction}
                className="px-3 md:px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded font-semibold transition-colors text-sm"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <DeleteConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setDeleteTarget(null);
        }}
        onConfirm={confirmDeleteTransactionPermanently}
        title="Delete Cancelled Transaction"
        message="Are you sure you want to permanently delete this cancelled transaction? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />

      {/* Edit Transaction Dialog */}
      {showEditDialog && selectedTransaction && (
        <EditTransactionDialog
          transaction={selectedTransaction}
          onClose={() => setShowEditDialog(false)}
          onSave={handleTransactionSuccess}
        />
      )}
    </div>
  );
}

export default AllOrdersDialog;