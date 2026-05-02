import { useState, useEffect } from 'react';
import { ToastContainer } from 'react-toastify';
import { supabase } from '../../supabase';
import CategoryTabs from './CategoryTabs';
import SearchBar from './SearchBar';
import ProductDisplay from './ProductDisplay';
import FloatingButtons from './FloatingButtons';
import Cart from './Cart';
import AllOrdersDialog from './AllOrdersDialog';
import AddProductDialog from './AddProductDialog';
import EditProductDialog from './EditProductDialog';
import CategoryManagerDialog from './CategoryManagerDialog';
import { CartProvider, useCart } from '../CartContext';

function InventoryContent({ userRole }) {
  const { clearCart } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCart, setShowCart] = useState(false);
  const [showAllOrdersDialog, setShowAllOrdersDialog] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showAddProductDialog, setShowAddProductDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [showEditMode, setShowEditMode] = useState(false);
  const [selectedProductForEdit, setSelectedProductForEdit] = useState(null);
  const [allOrdersDialogTab, setAllOrdersDialogTab] = useState('active');

  useEffect(() => {
    fetchProducts();
  }, []);

  // Listen for navigation events from dashboard
  useEffect(() => {
    const handleNavigate = (event) => {
      const section = event.detail;
      if (section === 'orders') {
        setAllOrdersDialogTab('active');
        setShowAllOrdersDialog(true);
      } else if (section === 'customers') {
        setAllOrdersDialogTab('customers');
        setShowAllOrdersDialog(true);
      }
    };

    window.addEventListener('navigateToSection', handleNavigate);
    return () => window.removeEventListener('navigateToSection', handleNavigate);
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          sizes!product_id(
            id,
            quantity,
            total_quantity,
            remaining_quantity,
            facebook_quantity,
            instagram_quantity
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Map products to include stock info from sizes table
      const productsWithStock = (data || []).map(product => ({
        ...product,
        // Use first size entry's quantities, or defaults if no sizes exist
        remainingStock: product.sizes?.[0]?.remaining_quantity || 0,
        totalStock: product.sizes?.[0]?.total_quantity || 0,
        quantity: product.sizes?.[0]?.quantity || 0,
        facebookQuantity: product.sizes?.[0]?.facebook_quantity || 0,
        instagramQuantity: product.sizes?.[0]?.instagram_quantity || 0
      }));

      setProducts(productsWithStock);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCartComplete = async () => {
    await fetchProducts();
    setShowCart(false);
    clearCart();
  };

  const getFilteredProducts = () => {
    return products.filter((product) => {
      const matchesSearch = product.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesCategory =
        activeCategory === 'all' || product.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  };

  const toggleEditMode = () => {
    setShowEditMode(!showEditMode);
    if (showEditMode) {
      setSelectedProductForEdit(null);
    }
  };

  const handleProductSelect = (product) => {
    if (showEditMode) {
      setSelectedProductForEdit(product);
      setShowEditMode(false);
    }
  };

  const handleShowAddProductDialog = () => {
    setShowAddProductDialog(true);
  };

  const handleShowAllOrdersDialog = () => {
    setShowAllOrdersDialog(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#faf8f9]">
      <CategoryTabs
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        products={products}
      />
      <div className="p-5">
        <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />
        <div className="flex justify-between px-[45px] border-b border-transparent mb-5 font-medium">
          <div className="flex items-center gap-[5px] font-['Satoshi'] text-xl text-gray-900 px-[40px] select-none">
            PRODUCTS
          </div>
        </div>
        {loading ? (
          <div className="text-center py-8 text-gray-800">
            Loading products...
          </div>
        ) : (
          <ProductDisplay
            products={getFilteredProducts()}
            showEditMode={showEditMode}
            onProductSelect={handleProductSelect}
            onStockAdded={fetchProducts}
          />
        )}
      </div>
      <FloatingButtons
        onEditToggle={toggleEditMode}
        onAddProduct={handleShowAddProductDialog}
        onViewAllOrders={handleShowAllOrdersDialog}
        onManageCategories={() => setShowCategoryManager(true)}
        onCartOpen={() => setShowCart(true)}
        showEditMode={showEditMode}
        userRole={userRole}
      />
      {showCart && (
        <Cart
          onClose={() => setShowCart(false)}
          onSubmit={handleCartComplete}
        />
      )}
      {showAllOrdersDialog && (
        <AllOrdersDialog
          onClose={() => setShowAllOrdersDialog(false)}
          initialTab={allOrdersDialogTab}
        />
      )}
      {showAddProductDialog && (
        <AddProductDialog
          onClose={() => setShowAddProductDialog(false)}
          fetchProducts={fetchProducts}
        />
      )}
      {selectedProductForEdit && (
        <EditProductDialog
          product={selectedProductForEdit}
          userRole={userRole}
          onClose={() => setSelectedProductForEdit(null)}
          fetchProducts={fetchProducts}
        />
      )}
      {showCategoryManager && (
        <CategoryManagerDialog
          onClose={() => setShowCategoryManager(false)}
          products={products}
          fetchProducts={fetchProducts}
        />
      )}
      <ToastContainer />
    </div>
  );
}

function Inventory({ userRole }) {
  return (
    <CartProvider>
      <InventoryContent userRole={userRole} />
    </CartProvider>
  );
}

export default Inventory;
