import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';

const OrderForm = ({ product, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    customerName: '',
    quantity: 1,
    platform: '', // Must be 'facebook' or 'instagram'
    totalAmount: product.price,
    contactNumber: '',
    address: '',
    shippingMethod: 'J&T',
    paymentMethod: 'COD'
  });

  const [customerType, setCustomerType] = useState(null);
  const [fetchingCustomer, setFetchingCustomer] = useState(false);
  const debounceTimer = useRef(null);

  // Add form validation
  const validateForm = () => {
    if (!formData.customerName.trim()) {
      alert('Please enter customer name');
      return false;
    }
    if (formData.quantity < 1) {
      alert('Quantity must be at least 1');
      return false;
    }
    if (!formData.platform) {
      alert('Please select a platform');
      return false;
    }
    if (!formData.contactNumber.trim()) {
      alert('Please enter contact number');
      return false;
    }
    if (!formData.address.trim()) {
      alert('Please enter address');
      return false;
    }
    return true;
  };

  const fetchCustomerType = async (name) => {
    if (!name.trim()) {
      setCustomerType(null);
      return;
    }

    setFetchingCustomer(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .ilike('name', `%${name}%`)
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const customer = data[0];
        const tag = customer.is_repeat_customer ? 'Loyal' : 'Regular';
        console.log(`Customer "${name}" found:`, { 
          tag, 
          total_orders: customer.total_orders,
          cancelled_order_count: customer.cancelled_order_count
        });
        setCustomerType(tag);
      } else {
        console.log(`No customer found for "${name}", will be a New customer`);
        setCustomerType('New');
      }
    } catch (error) {
      console.error('Error fetching customer type:', error);
      setCustomerType('New');
    } finally {
      setFetchingCustomer(false);
    }
  };

  const handleCustomerNameChange = (e) => {
    const name = e.target.value;
    setFormData({ ...formData, customerName: name });

    // Clear existing debounce timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new debounce timer to fetch after 500ms of inactivity
    debounceTimer.current = setTimeout(() => {
      fetchCustomerType(name);
    }, 500);
  };

  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  const handleQuantityChange = (e) => {
    const quantity = parseInt(e.target.value) || 0;
    setFormData({
      ...formData,
      quantity,
      totalAmount: quantity * product.price,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check if there's enough remaining stock
    const remainingStock = product.remainingStock;

    if (formData.quantity > remainingStock) {
      alert(
        `Not enough stock available! Only ${remainingStock} items remaining.`
      );
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      // Use Supabase directly - the order will be created by the onSubmit handler
      // This component just validates and passes data
      onSubmit({
        customerName: formData.customerName,
        quantity: parseInt(formData.quantity),
        platform: formData.platform,
        contactNumber: formData.contactNumber,
        address: formData.address,
        shippingMethod: formData.shippingMethod,
        paymentMethod: formData.paymentMethod
      });
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to place order');
      }

      const result = await response.json();
      onSubmit(result);
      onClose();
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-[#FFE2F0] p-6 rounded-xl w-[400px]">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[#841c4f] mb-1">Customer Name:</label>
            <input
              type="text"
              value={formData.customerName}
              onChange={handleCustomerNameChange}
              className="w-full p-2 rounded"
              required
            />
            {formData.customerName && (
              <div className="mt-2 p-2 bg-purple-100 rounded text-sm">
                {fetchingCustomer ? (
                  <p className="text-gray-700">🔍 Checking customer type...</p>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-700"><strong>Type:</strong></span>
                    {customerType === 'Bogus' ? (
                      <span className="px-2 py-1 bg-red-200 text-red-800 rounded text-xs font-semibold">
                        ⚠️ Bogus
                      </span>
                    ) : customerType === 'Loyal' ? (
                      <span className="px-2 py-1 bg-green-200 text-green-800 rounded text-xs font-semibold">
                        ⭐ Loyal
                      </span>
                    ) : customerType === 'Regular' ? (
                      <span className="px-2 py-1 bg-amber-200 text-amber-800 rounded text-xs font-semibold">
                        📊 Regular
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-blue-200 text-blue-800 rounded text-xs font-semibold">
                        👤 New
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-[#841c4f] mb-1">Quantity:</label>
            <input
              type="number"
              value={formData.quantity}
              onChange={handleQuantityChange}
              className="w-full p-2 rounded"
              min="1"
              required
            />
          </div>

          <div>
            <label className="block text-[#841c4f] mb-1">Contact Number:</label>
            <input
              type="text"
              value={formData.contactNumber}
              onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
              className="w-full p-2 rounded"
              required
            />
          </div>

          <div>
            <label className="block text-[#841c4f] mb-1">Address:</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full p-2 rounded"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[#841c4f] mb-1">Shipping Method:</label>
              <select
                value={formData.shippingMethod}
                onChange={(e) => setFormData({ ...formData, shippingMethod: e.target.value })}
                className="w-full p-2 rounded"
              >
                <option value="J&T">J&T</option>
                <option value="Other">Other</option>
                <option value="Pickup">Pickup</option>
              </select>
            </div>
            <div>
              <label className="block text-[#841c4f] mb-1">Payment Method:</label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                className="w-full p-2 rounded"
              >
                <option value="COD">COD</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="GCash">GCash</option>
                <option value="Maya">Maya</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>



          <div className="text-[#841c4f] mb-4">
            <label className="block text-center mb-2">PLATFORM</label>
            <div className="flex justify-center gap-8">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="platform"
                  value="facebook"
                  checked={formData.platform === 'facebook'}
                  onChange={(e) =>
                    setFormData({ ...formData, platform: e.target.value })
                  }
                  required
                />
                <img
                  src="icons/image 10.png"
                  alt="Facebook"
                  className="w-8 h-8"
                />
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="platform"
                  value="instagram"
                  checked={formData.platform === 'instagram'}
                  onChange={(e) =>
                    setFormData({ ...formData, platform: e.target.value })
                  }
                />
                <img
                  src="icons/image 9.png"
                  alt="Instagram"
                  className="w-8 h-8"
                />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-[#841c4f] mb-1">Total Amount:</label>
            <input
              type="text"
              value={`₱ ${formData.totalAmount.toFixed(2)}`}
              className="w-full p-2 rounded bg-white"
              disabled
            />
          </div>

          <div className="flex justify-center pt-4">
            <button
              type="submit"
              className="bg-[#ffea99] text-[#841c4f] px-8 py-2 rounded-lg hover:bg-[#841c4f] hover:text-white transition-colors"
            >
              ORDER
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrderForm;
