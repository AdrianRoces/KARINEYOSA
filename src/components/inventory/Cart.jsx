import React, { useState, useRef, useEffect } from 'react';
import { useCart } from '../CartContext';
import { toast } from 'react-toastify';
import ModalPortal from './ModalPortal';
import { supabase } from '../../supabase';

const Cart = ({ onClose, onSubmit }) => {
  const {
    cartItems,
    removeFromCart,
    updateQuantity,
    orderDetails,
    setOrderDetails,
    customerType,
    setCustomerType,
    getCartTotal,
    getCartItemsTotal,
  } = useCart();

  const [fetchingCustomer, setFetchingCustomer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceTimer = useRef(null);
  const dialogRef = useRef(null);

  const userInfo = JSON.parse(localStorage.getItem('user') || '{}');
  const currentUser = userInfo.Username || userInfo.username || 'Unknown User';

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    const handleOutsideClick = (e) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target)) onClose();
    };
    const handleClickOutsideSuggestions = (e) => {
      if (!e.target.closest('.customer-input')) setShowSuggestions(false);
    };

    window.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('mousedown', handleClickOutsideSuggestions);
    
    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('mousedown', handleClickOutsideSuggestions);
    };
  }, [onClose]);

  const fetchCustomerType = async (name) => {
    if (!name.trim()) { setCustomerType(null); return; }
    setFetchingCustomer(true);
    try {
      const { data: customers, error } = await supabase.from('customers').select('*').ilike('name', `%${name}%`);
      if (!error && customers && customers.length > 0) {
        setSuggestions(customers);
        setShowSuggestions(true);
        const customer = customers[0];
        setCustomerType(customer.manual_bogus ? 'Bogus' : (customer.is_repeat_customer ? 'Loyal' : (customer.total_orders > 1 ? 'Regular' : 'New')));
      } else {
        setCustomerType('New');
      }
    } catch (error) {
      setCustomerType('New');
    } finally {
      setFetchingCustomer(false);
    }
  };

  const selectCustomer = async (customer) => {
    const customerName = customer.name;
    const tag = customer.manual_bogus ? 'Bogus' : (customer.is_repeat_customer ? 'Loyal' : (customer.total_orders > 1 ? 'Regular' : 'New'));
    const { data: lastOrder } = await supabase.from('orders').select('*').eq('customer_id', customer.id).order('order_date', { ascending: false }).limit(1).maybeSingle();

    setOrderDetails((prev) => ({
      ...prev,
      customerName,
      ...(lastOrder?.contact_number && { contactNumber: lastOrder.contact_number }),
      ...(lastOrder?.address && { address: lastOrder.address }),
      ...(lastOrder?.shipping_method && { shippingMethod: lastOrder.shipping_method }),
      ...(lastOrder?.payment_method && { paymentMethod: lastOrder.payment_method })
    }));
    setSuggestions([]);
    setShowSuggestions(false);
    setCustomerType(tag);
  };

  const handleCustomerNameChange = (e) => {
    const name = e.target.value;
    setOrderDetails({ ...orderDetails, customerName: name });
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => { fetchCustomerType(name); }, 500);
  };

  const validateForm = () => {
    if (!orderDetails.customerName.trim()) { alert('Please enter customer name'); return false; }
    if (cartItems.length === 0) { alert('Please add items to cart'); return false; }
    if (!orderDetails.platform) { alert('Please select a platform'); return false; }
    if (!orderDetails.contactNumber.trim()) { alert('Please enter contact number'); return false; }
    if (!orderDetails.address.trim()) { alert('Please enter address'); return false; }
    if (orderDetails.shippingMethod !== 'Pickup' && (!orderDetails.shippingFee || parseFloat(orderDetails.shippingFee) <= 0)) {
      alert('Please enter shipping fee amount');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      for (const item of cartItems) {
        const remaining = item.remainingStock || item.remaining_quantity || 0;
        if (item.quantity > remaining) {
          toast.error(`❌ Not enough stock for ${item.name}! Only ${remaining} items remaining.`, { position: 'top-right', autoClose: 3000, theme: 'colored' });
          setLoading(false); return;
        }
      }

      const transactionId = (crypto && crypto.randomUUID && crypto.randomUUID()) || `txn-${Date.now()}`;
      const shippingFee = orderDetails.shippingMethod !== 'Pickup' ? parseFloat(orderDetails.shippingFee) || 0 : 0;
      
      let customerId = null;
      const { data: existingCustomer } = await supabase.from('customers').select('*').eq('name', orderDetails.customerName).maybeSingle();
      
      if (existingCustomer) {
        customerId = existingCustomer.id;
        await supabase.from('customers').update({
          total_orders: (existingCustomer.total_orders || 0) + 1,
          total_spent: (existingCustomer.total_spent || 0) + getCartTotal(),
          is_repeat_customer: true,
          last_order_date: new Date().toISOString()
        }).eq('id', customerId);
      } else {
        const { data: newCustomer, error: newCustomerError } = await supabase.from('customers').insert({
          name: orderDetails.customerName,
          total_orders: 1,
          total_spent: getCartTotal(),
          is_repeat_customer: false,
          first_order_date: new Date().toISOString(),
          last_order_date: new Date().toISOString()
        }).select().single();
        if (newCustomerError) throw newCustomerError;
        customerId = newCustomer.id;
      }

      const ordersToInsert = cartItems.map((item, idx) => {
        const actualCost = item.actualCost || item.actual_cost || 0;
        const profit = item.price - actualCost;
        
        // MATHEMATICAL FIX: We no longer split the shipping fee. 
        // We assign the entire shipping fee strictly to the FIRST row of the transaction.
        // This prevents duplication of shipping fees entirely within the DB's SUM() aggregates.
        const currentItemShipping = idx === 0 ? shippingFee : 0;
        
        // Item total_amount is strictly the item subtotal (price * qty).
        // It does NOT include shipping anymore.
        const itemTotalAmount = item.price * item.quantity;

        return {
          transaction_id: transactionId,
          customer_id: customerId,
          customer_name: orderDetails.customerName,
          product_id: item.id,
          product_name: item.name,
          quantity: item.quantity,
          platform: orderDetails.platform,
          unit_price: item.price,
          profit_per_unit: profit,
          total_amount: itemTotalAmount, // Subtotal strictly without shipping
          total_profit: profit * item.quantity,
          is_paid: false,
          status: 'Active',
          contact_number: orderDetails.contactNumber,
          address: orderDetails.address,
          shipping_method: orderDetails.shippingMethod,
          payment_method: orderDetails.paymentMethod,
          shipping_fee: currentItemShipping, // Included in first row only
          employee_name: currentUser
        };
      });

      const { error: orderError } = await supabase.from('orders').insert(ordersToInsert);
      if (orderError) throw orderError;

      for (const item of cartItems) {
        const remaining = item.remainingStock || item.remaining_quantity || 0;
        const { data: sizeData } = await supabase.from('sizes').select('id').eq('product_id', item.id).single();
        if (sizeData) {
          await supabase.from('sizes').update({ remaining_quantity: remaining - item.quantity }).eq('id', sizeData.id);
        }
      }

      toast.success('✅ Order placed successfully!', { position: 'top-right', autoClose: 3000, theme: 'colored' });
      onSubmit();
    } catch (error) {
      toast.error(`❌ ${error.message}`, { position: 'top-right', autoClose: 3000, theme: 'colored' });
    } finally {
      setLoading(false);
    }
  };

  const getCustomerTypeColor = (type) => {
    switch (type) {
      case 'Bogus': return 'bg-red-200 text-red-800';
      case 'Loyal': return 'bg-green-200 text-green-800';
      case 'Regular': return 'bg-amber-200 text-amber-800';
      default: return 'bg-blue-200 text-blue-800';
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4 overflow-y-auto" onClick={onClose}>
        <div ref={dialogRef} className="relative w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-[28px] bg-gradient-to-b from-[#e7d6f7] to-[#f7d6d0] shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-b from-[#e7d6f7] to-[#f7d6d0] border-b-2 border-[#841c4f]/20 px-4 py-4 md:p-6 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-[#841c4f]">Shopping Cart</h2>
            {currentUser && <p className="text-xs text-[#841c4f]/70 mt-1">👤 <span className="font-semibold">{currentUser}</span> is making this transaction</p>}
          </div>
          <button onClick={onClose} className="text-2xl text-[#841c4f] hover:text-red-600 transition-colors flex-shrink-0">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 py-4 md:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            <div className="col-span-1 lg:col-span-2">
              <div className="bg-white/50 rounded-lg p-3 md:p-4 border border-[#841c4f]/10">
                <h3 className="text-lg font-bold text-[#841c4f] mb-3 md:mb-4">Cart Items</h3>
                {cartItems.length === 0 ? (
                  <div className="text-center py-8 text-[#841c4f]/60">Your cart is empty.</div>
                ) : (
                  <div className="space-y-2 md:space-y-3">
                    {cartItems.map(item => (
                      <div key={item.id} className="bg-white rounded-lg p-2 md:p-3 border border-[#841c4f]/10 flex items-start gap-2 md:gap-4">
                        <div className="w-14 h-16 md:w-16 md:h-20 flex-shrink-0">
                          <img src={item.imagePath || item.image_path || '/icons/image (2).png'} alt={item.name} className="w-full h-full object-cover rounded" onError={(e) => { e.target.onerror = null; e.target.src = '/icons/image (2).png'; }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-[#841c4f] mb-1 text-sm md:text-base truncate">{item.name}</div>
                          {(item.variantName || item.variant_name) && <div className="text-xs text-[#841c4f]/70 mb-1">{item.variantName || item.variant_name}</div>}
                          <div className="text-xs md:text-sm text-[#841c4f]/80">₱{item.price.toFixed(2)} each</div>
                        </div>
                        <div className="flex flex-col items-end gap-2 min-w-[110px]">
                          <button type="button" onClick={() => removeFromCart(item.id)} className="text-red-500 hover:text-red-700 font-bold text-lg h-6 w-6 flex items-center justify-center flex-shrink-0 self-end">×</button>
                          <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center gap-1 md:gap-2 bg-[#fff5e6] rounded px-2 py-1">
                              <button type="button" onClick={() => updateQuantity(item.id, item.quantity - 1)} className="text-[#841c4f] font-bold w-5 h-5 flex items-center justify-center hover:bg-[#841c4f] hover:text-white rounded"> − </button>
                              <span className="w-6 text-center font-bold text-[#841c4f]">{item.quantity}</span>
                              <button type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)} className="text-[#841c4f] font-bold w-5 h-5 flex items-center justify-center hover:bg-[#841c4f] hover:text-white rounded"> + </button>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-[#841c4f]/70">Subtotal</div>
                              <div className="font-bold text-[#841c4f]">₱{(item.price * item.quantity).toFixed(2)}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {cartItems.length > 0 && (
                  <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-[#841c4f]/10 text-right">
                    <div className="text-xs text-[#841c4f]/70 mb-1">Items Subtotal:</div>
                    <div className="text-xl font-bold text-[#841c4f]">₱{getCartItemsTotal().toFixed(2)}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="col-span-1 space-y-2 md:space-y-3">
              <div className="bg-white/50 rounded-lg p-3 border border-[#841c4f]/10">
                <h4 className="font-bold text-[#841c4f] mb-2 text-xs md:text-sm">CUSTOMER DETAILS</h4>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-semibold text-[#841c4f] mb-1">Customer Name:</label>
                    <div className="relative customer-input">
                      <input type="text" value={orderDetails.customerName} onChange={handleCustomerNameChange} onFocus={() => orderDetails.customerName && setShowSuggestions(true)} className="w-full p-2 rounded text-xs border border-[#841c4f]/20" required autoComplete="off" />
                      {showSuggestions && suggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 bg-white border-2 border-[#841c4f] rounded mt-1 shadow-lg z-10 max-h-40 overflow-y-auto">
                          {suggestions.map((customer) => (
                            <div key={customer.id} onClick={() => selectCustomer(customer)} className="p-3 hover:bg-[#e7d6f7] cursor-pointer border-b border-[#841c4f]/20">
                              <div className="flex justify-between items-center"><span className="text-[#841c4f] font-semibold text-sm">{customer.name}</span></div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {orderDetails.customerName && (
                      <div className="mt-2 p-2 bg-purple-100 rounded text-xs">
                        {fetchingCustomer ? '🔍 Checking...' : <span className={`px-2 py-1 ${getCustomerTypeColor(customerType)} rounded font-semibold`}>{customerType || 'New'}</span>}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#841c4f] mb-1">Contact Number:</label>
                    <input type="text" value={orderDetails.contactNumber} onChange={(e) => setOrderDetails({ ...orderDetails, contactNumber: e.target.value })} className="w-full p-2 rounded text-xs border border-[#841c4f]/20" required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#841c4f] mb-1">Address:</label>
                    <textarea value={orderDetails.address} onChange={(e) => setOrderDetails({ ...orderDetails, address: e.target.value })} className="w-full p-2 rounded text-xs border border-[#841c4f]/20 h-16" required />
                  </div>
                </div>
              </div>

              <div className="bg-white/50 rounded-lg p-3 border border-[#841c4f]/10">
                <h4 className="font-bold text-[#841c4f] mb-2 text-xs md:text-sm">PLATFORM & SHIPPING</h4>
                <div className="space-y-2">
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="platform" value="facebook" checked={orderDetails.platform === 'facebook'} onChange={(e) => setOrderDetails({ ...orderDetails, platform: e.target.value })} required /><img src="icons/image 10.png" alt="FB" className="w-5 h-5" /></label>
                    <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="platform" value="instagram" checked={orderDetails.platform === 'instagram'} onChange={(e) => setOrderDetails({ ...orderDetails, platform: e.target.value })} /><img src="icons/image 9.png" alt="IG" className="w-5 h-5" /></label>
                  </div>
                  <select value={orderDetails.shippingMethod} onChange={(e) => setOrderDetails({ ...orderDetails, shippingMethod: e.target.value })} className="w-full p-2 rounded text-xs border border-[#841c4f]/20">
                    <option value="J&T">J&T Delivery</option><option value="Other">Other Delivery</option><option value="Pickup">Pickup</option>
                  </select>
                  {orderDetails.shippingMethod !== 'Pickup' && (
                    <input type="number" min="0" step="0.01" value={orderDetails.shippingFee} onChange={(e) => setOrderDetails({ ...orderDetails, shippingFee: e.target.value })} className="w-full p-2 rounded text-xs border border-[#841c4f]/20" placeholder="Shipping Fee ₱" required />
                  )}
                </div>
              </div>

              <div className="bg-[#ffea99] rounded-lg p-3 border-2 border-[#841c4f]">
                <h4 className="font-bold text-[#841c4f] mb-2 text-xs md:text-sm">ORDER SUMMARY</h4>
                <div className="space-y-2 text-xs md:text-sm">
                  <div className="flex justify-between"><span className="text-[#841c4f]/70">Items:</span><span className="font-bold text-[#841c4f]">₱{getCartItemsTotal().toFixed(2)}</span></div>
                  {orderDetails.shippingMethod !== 'Pickup' && (
                    <div className="flex justify-between"><span className="text-[#841c4f]/70">Shipping:</span><span className="font-bold text-[#841c4f]">₱{(parseFloat(orderDetails.shippingFee) || 0).toFixed(2)}</span></div>
                  )}
                  <div className="border-t pt-2 flex justify-between font-bold"><span className="text-[#841c4f]">TOTAL:</span><span className="text-lg text-[#841c4f]">₱{getCartTotal().toFixed(2)}</span></div>
                </div>
              </div>

              <button type="submit" disabled={loading || cartItems.length === 0} className="w-full bg-[#ffea99] text-[#841c4f] px-4 py-3 rounded-lg font-bold hover:bg-[#841c4f] hover:text-white transition-colors">
                {loading ? 'Processing...' : 'PLACE ORDER'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </ModalPortal>
  );
};

export default Cart;