import React, { createContext, useContext, useState } from 'react';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [orderDetails, setOrderDetails] = useState({
    customerName: '',
    platform: '',
    contactNumber: '',
    address: '',
    shippingMethod: 'J&T',
    paymentMethod: 'COD',
    shippingFee: 0
  });
  const [customerType, setCustomerType] = useState(null);

  const addToCart = (product, quantity) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.id === product.id);
      if (existingItem) {
        return prevItems.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prevItems, { ...product, quantity }];
    });
  };

  const removeFromCart = (productId) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
    } else {
      setCartItems(prevItems =>
        prevItems.map(item =>
          item.id === productId ? { ...item, quantity } : item
        )
      );
    }
  };

  const clearCart = () => {
    setCartItems([]);
    setOrderDetails(prev => ({ ...prev, shippingFee: 0 }));
  };

  // RAW ITEMS TOTAL (Price * Qty)
  const getCartItemsTotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  // GRAND TOTAL (Items + Shipping)
  const getCartTotal = () => {
    const itemsTotal = getCartItemsTotal();
    const shipping = parseFloat(orderDetails.shippingFee) || 0;
    return itemsTotal + shipping;
  };

  // PROFIT CALCULATION (Ignoring shipping as it is an expense/pass-through)
  const getGrossProfit = () => {
    return cartItems.reduce((total, item) => {
      const cost = item.actualCost || item.actual_cost || 0;
      const profitPerUnit = item.price - cost;
      return total + (profitPerUnit * item.quantity);
    }, 0);
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        orderDetails,
        setOrderDetails,
        customerType,
        setCustomerType,
        getCartTotal,
        getCartItemsTotal,
        getGrossProfit
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};