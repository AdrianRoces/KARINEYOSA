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

function FloatingButtons({ onEditToggle, onAddProduct, onViewAllOrders, onManageCategories, onCartOpen, showEditMode, userRole = 'employee' }) {
  // STRICT ROLE CHECKING: Prioritize Local Storage to prevent default overrides
  const fallbackUser = JSON.parse(localStorage.getItem('user') || '{}');
  const roleFromStorage = String(fallbackUser.role || fallbackUser.Role || '').trim().toLowerCase();
  const passedRole = String(userRole || '').trim().toLowerCase();
  
  // Convert 'user' to 'employee' universally
  let normalizedRole = roleFromStorage || passedRole || 'employee';
  if (normalizedRole === 'user') normalizedRole = 'employee';

  const { cartItems } = useCart();
  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);
  
  // Logic: Employees AND admins can edit products (employees see stock manager only, admins see full edit)
  const canEditProducts = normalizedRole === 'admin' || normalizedRole === 'employee' || normalizedRole === 'owner';
  const isAdmin = normalizedRole === 'admin' || normalizedRole === 'owner';
  
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
            className="w-[56px] h-[56px] bg-gradient-to-br from-[#ffea99] to-[#ffe8cc] rounded-full flex items-center justify-center transition-transform duration-300 ease-in-out hover:scale-110 cursor-pointer shadow-lg"
            aria-label="Shopping Cart"
            title="Open cart"
            tooltipText="Open cart"
          >
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-[#841c4f]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 6h15l-1.5 9h-12z" />
              <path d="M6 6l-1.5-4H2" />
              <circle cx="9" cy="20" r="1.5" />
              <circle cx="18" cy="20" r="1.5" />
            </svg>
            {cartCount > 0 && (
              <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                {cartCount}
              </div>
            )}
          </TooltipButton>
          
          {canEditProducts && (
            <TooltipButton
              onClick={onEditToggle}
              className={`w-[56px] h-[56px] rounded-full transition-transform duration-300 ease-in-out hover:scale-110 cursor-pointer shadow-lg flex items-center justify-center ${
                showEditMode ? 'ring-4 ring-yellow-400 bg-white' : 'bg-white'
              }`}
              aria-label="Edit Products"
              title="Toggle edit mode"
              tooltipText={normalizedRole === 'employee' ? 'Manage stock' : 'Edit products'}
            >
              <svg viewBox="0 0 24 24" className="w-7 h-7 text-[#841c4f]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 20h16" />
                <path d="M14.5 5.5 18.5 9.5 9 19H5v-4L14.5 5.5Z" />
              </svg>
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
              <svg viewBox="0 0 24 24" className="w-7 h-7 text-[#841c4f]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v8" />
                <path d="M8 12h8" />
              </svg>
            </TooltipButton>
          )}
          <TooltipButton
            onClick={onViewAllOrders}
            className="w-[56px] h-[56px] bg-gradient-to-br from-[#c99ab5] to-[#d9a5be] rounded-full flex items-center justify-center transition-transform duration-300 ease-in-out hover:scale-110 cursor-pointer shadow-lg"
            aria-label="View All Orders"
            title="View all orders"
            tooltipText="View all orders"
          >
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 4H8a2 2 0 0 0-2 2v14h12V6a2 2 0 0 0-2-2Z" />
              <path d="M8 4V2h8v2" />
              <path d="M8 12h8" />
            </svg>
          </TooltipButton>
          {isAdmin && onManageCategories && (
            <TooltipButton
              onClick={onManageCategories}
              className="w-[56px] h-[56px] bg-gradient-to-br from-[#65366F] to-[#7d4a87] rounded-full flex items-center justify-center transition-transform duration-300 ease-in-out hover:scale-110 cursor-pointer shadow-lg"
              aria-label="Manage Categories"
              title="Manage product categories"
              tooltipText="Manage product categories"
            >
              <svg viewBox="0 0 24 24" className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 7v10l7 4 7-4V7L12 3 5 7Z" />
                <circle cx="12" cy="12" r="2" />
              </svg>
            </TooltipButton>
          )}
        </div>
      )}
      <TooltipButton
        onClick={toggleOpen}
        className="w-[60px] h-[60px] rounded-full flex items-center justify-center text-gray-800 transition-transform duration-300 ease-in-out hover:scale-110 shadow-xl border border-gray-400"
        style={{ background: 'linear-gradient(135deg, #D1C6F3 0%, #E9BCAC 100%)' }}
        aria-label={open ? 'Close actions' : 'Open actions'}
        title={open ? 'Close action drawer' : 'Open action drawer'}
        tooltipText={open ? 'Close action drawer' : 'Open action drawer'}
      >
        {open ? (
          <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 6l12 12" />
            <path d="M18 6 6 18" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
        )}
      </TooltipButton>
    </div>
  );

  return mounted && typeof document !== 'undefined'
    ? createPortal(content, document.body)
    : null;
}

export default FloatingButtons;