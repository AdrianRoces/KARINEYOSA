import { useState, useEffect } from 'react';
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
  const [activeDialog, setActiveDialog] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobileView, setIsMobileView] = useState(false);
  const itemsPerPage = isMobileView ? 10 : 12;
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

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeCategory, products.length, itemsPerPage]);

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
        variantName: product.variantName || product.variant_name || '',
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
    setActiveDialog(null);
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
      setActiveDialog('editProduct');
    }
  };

  const openDialog = (dialogName) => {
    setSelectedProductForEdit(null);
    setActiveDialog(dialogName);
  };

  const handleShowAddProductDialog = () => openDialog('addProduct');
  const handleShowAllOrdersDialog = () => openDialog('allOrders');

  const filteredProducts = getFilteredProducts();
  const totalProducts = filteredProducts.length;
  const pageCount = Math.max(1, Math.ceil(totalProducts / itemsPerPage));
  const currentPageSafe = Math.min(Math.max(currentPage, 1), pageCount);
  const startIndex = (currentPageSafe - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);
  const showingFrom = totalProducts === 0 ? 0 : startIndex + 1;
  const showingTo = totalProducts === 0 ? 0 : Math.min(startIndex + itemsPerPage, totalProducts);

  return (
    <div className="min-h-screen flex flex-col bg-[#faf8f9]">
      <CategoryTabs
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        products={products}
      />
      <div className="p-3 sm:p-5 pt-[50px] sm:pt-[56px]">
        <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />
        <div className="flex flex-col sm:flex-row justify-between border-b border-transparent mb-5 font-medium px-2 sm:px-4">
          <div className="flex items-center gap-2 font-['Satoshi'] text-lg sm:text-xl text-gray-900 select-none">
            PRODUCTS
          </div>
        </div>
        {loading ? (
          <div className="text-center py-8 text-gray-800">
            Loading products...
          </div>
        ) : (
          <>
            {totalProducts === 0 ? (
              <div className="text-center py-16 text-gray-700">
                No products found. Try changing your search or category.
              </div>
            ) : (
              <ProductDisplay
                products={paginatedProducts}
                showEditMode={showEditMode}
                onProductSelect={handleProductSelect}
                onStockAdded={fetchProducts}
              />
            )}

            <div className="mt-6 flex flex-col items-center gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPageSafe === 1}
                  className="rounded-full border border-[#65366F] bg-white px-4 py-2 text-sm font-semibold text-[#65366F] transition disabled:cursor-not-allowed disabled:opacity-50 hover:bg-[#f2e9f7]"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700">
                  Page <span className="font-semibold">{currentPageSafe}</span> of <span className="font-semibold">{pageCount}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(pageCount, prev + 1))}
                  disabled={currentPageSafe === pageCount}
                  className="rounded-full border border-[#65366F] bg-white px-4 py-2 text-sm font-semibold text-[#65366F] transition disabled:cursor-not-allowed disabled:opacity-50 hover:bg-[#f2e9f7]"
                >
                  Next
                </button>
              </div>
              <div className="text-sm text-gray-700">
                Showing <span className="font-semibold">{showingFrom}</span> to <span className="font-semibold">{showingTo}</span> of <span className="font-semibold">{totalProducts}</span> products
              </div>
            </div>
          </>
        )}
      </div>
      <FloatingButtons
        onEditToggle={toggleEditMode}
        onAddProduct={handleShowAddProductDialog}
        onViewAllOrders={handleShowAllOrdersDialog}
        onManageCategories={() => openDialog('categories')}
        onCartOpen={() => openDialog('cart')}
        showEditMode={showEditMode}
        userRole={userRole || JSON.parse(localStorage.getItem('user') || '{}').role}
      />
      {activeDialog === 'cart' && (
        <Cart
          onClose={() => setActiveDialog(null)}
          onSubmit={handleCartComplete}
        />
      )}
      {activeDialog === 'allOrders' && (
        <AllOrdersDialog
          onClose={() => setActiveDialog(null)}
          initialTab={allOrdersDialogTab}
        />
      )}
      {activeDialog === 'addProduct' && (
        <AddProductDialog
          onClose={() => setActiveDialog(null)}
          fetchProducts={fetchProducts}
        />
      )}
      {activeDialog === 'editProduct' && selectedProductForEdit && (
        <EditProductDialog
          product={selectedProductForEdit}
          userRole={userRole || JSON.parse(localStorage.getItem('user') || '{}').role}
          onClose={() => {
            setSelectedProductForEdit(null);
            setActiveDialog(null);
          }}
          fetchProducts={fetchProducts}
        />
      )}
      {activeDialog === 'categories' && (
        <CategoryManagerDialog
          onClose={() => setActiveDialog(null)}
          products={products}
          fetchProducts={fetchProducts}
        />
      )}
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
