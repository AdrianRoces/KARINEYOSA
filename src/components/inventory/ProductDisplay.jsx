import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useCart } from '../CartContext';

// Helper component for typable quantity inputs
const TypableQuantity = ({ quantity, onUpdate }) => {
  const [inputValue, setInputValue] = useState(quantity.toString());

  useEffect(() => {
    setInputValue(quantity.toString());
  }, [quantity]);

  const handleChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleCommit = () => {
    let newQty = parseInt(inputValue, 10);
    if (isNaN(newQty) || newQty < 0) newQty = 0;
    setInputValue(newQty.toString());
    onUpdate(newQty);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.target.blur(); // Blurring the input triggers handleCommit automatically
    }
  };

  return (
    <input
      type="number"
      min="0"
      value={inputValue}
      onChange={handleChange}
      onBlur={handleCommit}
      onKeyDown={handleKeyDown}
      onClick={(e) => e.stopPropagation()}
      className="w-12 text-center text-lg sm:text-xl font-bold text-[#841c4f] bg-white rounded-md py-0.5 border border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#841c4f]"
      style={{ MozAppearance: 'textfield' }}
    />
  );
};

function ProductDisplay({
  products,
  showEditMode,
  onProductSelect,
}) {
  const { addToCart, updateQuantity, removeFromCart, cartItems } = useCart();
  const [productQuantities, setProductQuantities] = useState({});

  useEffect(() => {
    const quantities = cartItems.reduce((acc, item) => {
      acc[item.id] = item.quantity;
      return acc;
    }, {});
    setProductQuantities(quantities);
  }, [cartItems]);

  const updateCartQuantity = (product, nextQty) => {
    const currentQty = productQuantities[product.id] || 0;
    if (nextQty < 0) return;

    if (nextQty > product.remainingStock) {
      toast.warning(`⚠️ Only ${product.remainingStock} in stock`, {
        position: 'top-right',
        autoClose: 2500,
        theme: 'colored',
        style: { backgroundColor: '#ff9800' },
      });
      nextQty = product.remainingStock;
    }

    if (nextQty === 0) {
      removeFromCart(product.id);
    } else if (currentQty === 0) {
      addToCart(product, nextQty);
      toast.success(`Added ${nextQty} ${nextQty === 1 ? 'item' : 'items'} to cart!`, {
        position: 'top-right',
        autoClose: 2000,
        theme: 'colored',
        style: { backgroundColor: '#4CAF50' },
      });
    } else {
      updateQuantity(product.id, nextQty);
    }

    setProductQuantities((prev) => ({
      ...prev,
      [product.id]: nextQty,
    }));
  };

  return (
    <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 justify-center">
        {products.map((product) => {
          const cartQty = productQuantities[product.id] || 0;
          const displayStock = Math.max((product.remainingStock ?? 0) - cartQty, 0);

          return (
            <div
              key={product.id}
              className={`w-full max-w-[240px] rounded-[32px] border border-gray-300 shadow-[0_14px_24px_rgba(101,54,111,0.18)] px-4 py-4 transition-all duration-300 transform group hover:-translate-y-1 ${
                showEditMode ? 'cursor-pointer hover:shadow-[0_18px_40px_rgba(101,54,111,0.24)]' : ''
              }`}
              style={{ background: 'linear-gradient(135deg, #D1C6F3 0%, #E9BCAC 100%)' }}
              onClick={() => {
                if (showEditMode) {
                  onProductSelect(product);
                }
              }}
            >
              <div className="flex flex-col gap-4">
                <div className="overflow-hidden rounded-[28px] border border-[#65366F]/10 shadow-sm">
                  <div className="relative aspect-[3/4] w-full overflow-hidden">
                    <img
                      src={
                        product.image_path
                          ? product.image_path
                          : '/icons/image (2).png'
                      }
                      alt={product.name}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/icons/image (2).png';
                      }}
                    />
                    <div className="absolute inset-0 bg-black/0 transition-all duration-300 group-hover:bg-black/30" />
                    <div className="absolute left-3 right-3 top-3 flex justify-center transition-opacity duration-300 group-hover:opacity-0">
                      <div className="text-center pointer-events-none rounded-[18px] bg-black/70 px-4 py-2 shadow-[0_6px_18px_rgba(0,0,0,0.18)]">
                        <div className="text-lg font-semibold text-white leading-tight">
                          {product.name}
                        </div>
                        <div className="text-xs text-white/90 leading-tight mt-1">
                          {product.variantName || product.category || 'No variant'}
                        </div>
                      </div>
                    </div>
                    <div className="absolute inset-0 flex items-end p-4 opacity-0 transition-all duration-300 group-hover:opacity-100">
                      <div className="w-full rounded-[24px] bg-black/70 p-4 text-white backdrop-blur-sm">
                        <div className="text-lg font-bold">{product.name}</div>
                        <div className="mt-1 text-sm text-gray-200 truncate">
                          {product.variantName || product.category || 'No variant'}
                        </div>
                        <div className="mt-3 text-xl font-semibold">₱{Number(product.price || 0).toFixed(2)}</div>
                        <div className="mt-1 text-sm text-gray-200">
                          Stock: <span className="font-semibold">{displayStock}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] bg-white p-2 border border-[#65366F]/10 shadow-sm">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const qty = cartQty - 1;
                        updateCartQuantity(product, qty);
                      }}
                      className="w-9 h-9 rounded-full text-gray-800 text-base font-bold flex items-center justify-center hover:opacity-80 transition border border-gray-400"
                      style={{ background: 'linear-gradient(135deg, #D1C6F3 0%, #E9BCAC 100%)' }}
                      title="Decrease quantity"
                    >
                      −
                    </button>
                    
                    {/* Typable Quantity Component replaces the static span */}
                    <TypableQuantity 
                      quantity={cartQty} 
                      onUpdate={(newQty) => updateCartQuantity(product, newQty)} 
                    />

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const qty = cartQty + 1;
                        updateCartQuantity(product, qty);
                      }}
                      className="w-9 h-9 rounded-full text-gray-800 text-base font-bold flex items-center justify-center hover:opacity-80 transition border border-gray-400"
                      style={{ background: 'linear-gradient(135deg, #D1C6F3 0%, #E9BCAC 100%)' }}
                      title="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ProductDisplay;