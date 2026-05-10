import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import ModalPortal from './ModalPortal';
import { supabase } from '../../supabase';
import CustomerTagEditDialog from '../customers/CustomerTagEditDialog';

function CustomersTabContent() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [tagDialogCustomer, setTagDialogCustomer] = useState(null);
  const [deleteConfirmCustomer, setDeleteConfirmCustomer] = useState(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data: customersData, error: custError } = await supabase
        .from('customers')
        .select('*')
        // FIX: The table has 'first_order_date', not 'created_at'.
        .order('first_order_date', { ascending: false });

      if (custError) throw custError;

      // Fetch orders to display contact/address from their latest order
      const { data: ordersData } = await supabase.from('orders').select('*').order('order_date', { ascending: false });

      const mapped = (customersData || []).map(c => {
        const latestOrder = (ordersData || []).find(o => o.customer_id === c.id);
        return {
          id: c.id,
          name: c.name,
          totalOrders: c.total_orders,
          totalSpent: c.total_spent,
          isRepeatCustomer: c.is_repeat_customer,
          cancelledOrderCount: c.cancelled_order_count,
          firstOrderDate: c.first_order_date,
          lastOrderDate: c.last_order_date,
          manualBogus: c.manual_bogus,
          finalTag: c.manual_bogus ? 'Bogus' : (c.is_repeat_customer ? 'Loyal' : (c.total_orders > 1 ? 'Regular' : 'New')),
          address: latestOrder?.address,
          contactNumber: latestOrder?.contact_number,
          shippingMethod: latestOrder?.shipping_method,
          paymentMethod: latestOrder?.payment_method
        };
      });

      setCustomers(mapped);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const handleTagClick = (customer) => {
    setTagDialogCustomer(customer);
    setShowTagDialog(true);
  };

  const handleTagUpdated = async (newTag) => {
    const message = newTag === 'Bogus' ? 'Customer marked as Bogus!' : 'Customer tag restored to original status!';
    toast.success(message, {
      position: 'top-right',
      autoClose: 2000,
      theme: 'colored',
    });
    
    await fetchCustomers();
  };

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (filterType === 'all' || 
       (filterType === 'new' && customer.finalTag === 'New') ||
       (filterType === 'regular' && customer.finalTag === 'Regular') ||
       (filterType === 'loyal' && customer.finalTag === 'Loyal') ||
       (filterType === 'bogus' && customer.finalTag === 'Bogus'))
  );

  const handleDeleteCustomer = (customer) => {
    setDeleteConfirmCustomer(customer);
  };

  const confirmDeleteCustomer = async () => {
    if (!deleteConfirmCustomer) return;

    try {
      const { error } = await supabase.from('customers').delete().eq('id', deleteConfirmCustomer.id);
      if (error) throw error;

      toast.success('✅ Customer deleted successfully!', {
        position: 'top-right',
        autoClose: 3000,
        theme: 'colored',
      });

      setDeleteConfirmCustomer(null);
      await fetchCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast.error('Failed to delete customer', {
        position: 'top-right',
        autoClose: 4000,
        theme: 'colored',
      });
    }
  };

  const getStatusBadge = (customer) => {
    const displayStatus = customer.finalTag || customer.status || 'New';

    let bgColor = 'bg-blue-200';
    let textColor = 'text-blue-800';
    
    if (displayStatus === 'Bogus') {
      bgColor = 'bg-red-200';
      textColor = 'text-red-800';
    } else if (displayStatus === 'Loyal') {
      bgColor = 'bg-green-200';
      textColor = 'text-green-800';
    } else if (displayStatus === 'Regular') {
      bgColor = 'bg-amber-200';
      textColor = 'text-amber-800';
    }

    return (
      <div className="flex items-center gap-1">
        <button
          onClick={() => handleTagClick(customer)}
          className={`px-3 py-1 ${bgColor} ${textColor} rounded text-xs font-semibold hover:opacity-75 cursor-pointer transition-opacity`}
          title="Click to edit"
        >
          {displayStatus}
        </button>
        {customer.manualBogus && (
          <span className="text-xs font-bold text-red-600" title="Manually marked as Bogus">
            🚫
          </span>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-600">Loading customers...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="px-6 py-4 border-b border-[#c99ab5]/30">
        <input
          type="text"
          placeholder="Search by customer name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 rounded-lg border border-[#c99ab5] bg-white text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#841c4f]"
        />
      </div>

      <div className="px-6 flex justify-end gap-2 items-center">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 border border-[#d4b5d4] rounded-lg focus:outline-none focus:border-[#841c4f] bg-white font-semibold text-gray-800"
        >
          <option value="all">All Customers</option>
          <option value="new">New</option>
          <option value="regular">Regular</option>
          <option value="loyal">Loyal</option>
          <option value="bogus">Bogus</option>
        </select>
      </div>

      <div className="max-h-[500px] overflow-y-auto px-6 py-4">
        <div className="overflow-x-auto">
          <table className="min-w-[1000px] w-full border-collapse text-sm bg-white rounded-lg overflow-hidden">
          <thead className="sticky top-0 text-gray-800 text-sm" style={{ background: 'linear-gradient(135deg, #D1C6F3 0%, #E9BCAC 100%)' }}>
            <tr>
              <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Customer Name</th>
              <th className="border border-gray-300 px-4 py-3 text-center font-semibold">Status</th>
              <th className="border border-gray-300 px-4 py-3 text-center font-semibold min-w-[70px]">Total Orders</th>
              <th className="border border-gray-300 px-4 py-3 text-center font-semibold min-w-[70px]">Cancelled</th>
              <th className="border border-gray-300 px-4 py-3 text-right font-semibold min-w-[80px]">Total Spent</th>
              <th className="border border-gray-300 px-4 py-3 text-center font-semibold">First Order</th>
              <th className="border border-gray-300 px-4 py-3 text-center font-semibold">Last Order</th>
              <th className="border border-gray-300 px-4 py-3 text-left font-semibold min-w-[120px]">Address</th>
              <th className="border border-gray-300 px-4 py-3 text-left font-semibold min-w-[160px]">Contact / Shipping / Payment</th>
              <th className="border border-gray-300 px-4 py-3 text-center font-semibold w-20">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan="10" className="text-center py-8 text-gray-600">
                  No customers found
                </td>
              </tr>
            ) : (
              filteredCustomers.map((customer, index) => (
                <tr 
                  key={customer.id} 
                  className={`${index % 2 === 0 ? 'bg-white' : 'bg-purple-50'} hover:bg-purple-100 transition-colors`}
                >
                  <td className="border border-[#65366F]/20 px-4 py-3 text-gray-800 font-medium">
                    {customer.name}
                  </td>
                  <td className="border border-[#65366F]/20 px-4 py-3 text-center">
                    {getStatusBadge(customer)}
                  </td>
                  <td className="border border-[#d4b5d4] px-4 py-3 text-center text-gray-800">
                    {customer.totalOrders}
                  </td>
                  <td className="border border-[#d4b5d4] px-4 py-3 text-center text-gray-800">
                    {customer.cancelledOrderCount}
                  </td>
                  <td className="border border-[#d4b5d4] px-4 py-3 text-right text-gray-800 font-semibold">
                    ₱{customer.totalSpent.toFixed(2)}
                  </td>
                  <td className="border border-[#d4b5d4] px-4 py-3 text-center text-gray-800 text-sm">
                    {new Date(customer.firstOrderDate).toLocaleDateString()}
                  </td>
                  <td className="border border-[#d4b5d4] px-4 py-3 text-center text-gray-800 text-sm">
                    {new Date(customer.lastOrderDate).toLocaleDateString()}
                  </td>
                  <td className="border border-[#d4b5d4] px-4 py-3 text-left text-gray-800 text-sm">
                    {customer.address || '—'}
                  </td>
                  <td className="border border-[#d4b5d4] px-4 py-3 text-left text-gray-800">
                    <div className="text-sm">
                      <div className="font-semibold">{customer.contactNumber || '—'}</div>
                      <div className="text-xs text-gray-600">{customer.shippingMethod || '—'} • {customer.paymentMethod || '—'}</div>
                    </div>
                  </td>
                  <td className="border border-[#d4b5d4] px-4 py-3 text-center">
                    <button
                      onClick={() => handleDeleteCustomer(customer)}
                      className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-semibold transition-colors"
                      title="Delete this customer"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {deleteConfirmCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md shadow-lg">
            <h3 className="text-lg font-bold text-red-600 mb-4">
              Delete Customer?
            </h3>
            
            <div className="mb-4 p-3 bg-red-100 rounded text-sm text-red-700">
              <p className="font-semibold">Customer: {deleteConfirmCustomer.name}</p>
              <p className="mt-2 text-xs">Only customer record will be deleted. Order history remains intact.</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={confirmDeleteCustomer}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-semibold transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteConfirmCustomer(null)}
                className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showTagDialog && (
        <CustomerTagEditDialog
          isOpen={showTagDialog}
          onClose={() => {
            setShowTagDialog(false);
            setTagDialogCustomer(null);
          }}
          customer={tagDialogCustomer}
          onTagUpdated={handleTagUpdated}
        />
      )}
    </div>
  );
}

export default CustomersTabContent;