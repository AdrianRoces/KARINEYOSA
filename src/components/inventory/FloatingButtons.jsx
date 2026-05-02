import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useCart } from '../CartContext';

const TooltipButton = ({ tooltipText, children, className, ...props }) => (
  <div className="group relative">
    <button className={`relative ${className}`} {...props}>
      {children}
    </button>
    <div className="pointer-events-none absolute right-full mr-3 top-1/2 hidden -translate-y-1/2 rounded-[18px] bg-[#280A4F] px-4 py-2 text-sm font-semibold text-white shadow-lg opacity-0 transition-all duration-200 group-hover:block group-hover:opacity-100 whitespace-nowrap min-w-[140px] text-left">
      {tooltipText}
      <span className="absolute right-[-6px] top-1/2 -translate-y-1/2 h-3 w-3 rotate-45 bg-[#280A4F]" />
    </div>
  </div>
);

function FloatingButtons({ onEditToggle, onAddProduct, onViewAllOrders, onManageCategories, onCartOpen, showEditMode, userRole = 'user' }) {
  const normalizedRole = String(userRole || '').toLowerCase();
  const { cartItems } = useCart();
  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);
  const canEditProducts = normalizedRole === 'admin' || normalizedRole === 'employee';
  const isAdmin = normalizedRole === 'admin';
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleOpen = () => setOpen((prev) => !prev);

  const content = (
    <div className="fixed bottom-4 right-4 flex flex-col items-end gap-3 z-[9999] pointer-events-auto">
      {open && (
        <div className="flex flex-col items-end gap-3">
          <TooltipButton
            onClick={onCartOpen}
            className="w-[56px] h-[56px] bg-gradient-to-br from-[#ffea99] to-[#ffe8cc] rounded-full flex items-center justify-center transition-transform duration-300 ease-in-out hover:scale-110 cursor-pointer shadow-lg font-bold text-2xl text-[#841c4f]"
            aria-label="Shopping Cart"
            title="Open cart"
            tooltipText="Open cart"
          >
            🛒
            {cartCount > 0 && (
              <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                {cartCount}
              </div>
            )}
          </TooltipButton>
          {canEditProducts && (
            <TooltipButton
              onClick={onEditToggle}
              className={`w-[56px] h-[56px] rounded-full transition-transform duration-300 ease-in-out hover:scale-110 cursor-pointer shadow-lg ${
                showEditMode ? 'ring-4 ring-yellow-400' : 'bg-white'
              }`}
              aria-label="Edit Products"
              title="Toggle edit mode"
              tooltipText={normalizedRole === 'employee' ? 'Manage stock' : 'Toggle edit mode'}
            >
              <img src="icons/Group 6.png" alt="EDIT" className="w-[28px] h-[28px] mx-auto" />
            </TooltipButton>
          )}
          {isAdmin && (
            <TooltipButton
              onClick={onAddProduct}
              className="w-[56px] h-[56px] bg-gradient-to-br from-[#ffcc99] to-[#edc5b0] rounded-full flex items-center justify-center transition-transform duration-300 ease-in-out hover:scale-110 cursor-pointer shadow-lg"
              aria-label="Add New Product"
              title="Add a new product"
              tooltipText="Add a new product"
            >
              <img src="icons/addproduct.png" alt="ADD" className="w-[28px] h-[28px] object-cover" />
            </TooltipButton>
          )}
          <TooltipButton
            onClick={onViewAllOrders}
            className="w-[56px] h-[56px] bg-gradient-to-br from-[#c99ab5] to-[#d9a5be] rounded-full flex items-center justify-center transition-transform duration-300 ease-in-out hover:scale-110 cursor-pointer shadow-lg"
            aria-label="View All Orders"
            title="View all orders"
            tooltipText="View all orders"
          >
            <span className="text-white font-bold text-2xl">📋</span>
          </TooltipButton>
          {isAdmin && onManageCategories && (
            <TooltipButton
              onClick={onManageCategories}
              className="w-[56px] h-[56px] bg-gradient-to-br from-[#65366F] to-[#7d4a87] rounded-full flex items-center justify-center transition-transform duration-300 ease-in-out hover:scale-110 cursor-pointer shadow-lg"
              aria-label="Manage Categories"
              title="Manage product categories"
              tooltipText="Manage product categories"
            >
              <span className="text-white font-bold text-2xl">🏷️</span>
            </TooltipButton>
          )}
        </div>
      )}
      <TooltipButton
        onClick={toggleOpen}
        className="w-[60px] h-[60px] rounded-full flex items-center justify-center text-gray-800 text-3xl transition-transform duration-300 ease-in-out hover:scale-110 shadow-xl border border-gray-400 font-bold"
        style={{ background: 'linear-gradient(135deg, #D1C6F3 0%, #E9BCAC 100%)' }}
        aria-label={open ? 'Close actions' : 'Open actions'}
        title={open ? 'Close action drawer' : 'Open action drawer'}
        tooltipText={open ? 'Close action drawer' : 'Open action drawer'}
      >
        {open ? '×' : '+'}
      </TooltipButton>
    </div>
  );

  return mounted && typeof document !== 'undefined'
    ? createPortal(content, document.body)
    : null;
}

export default FloatingButtons;
