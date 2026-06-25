import React, { useState, useEffect, useCallback } from 'react';
import { fetchProducts } from './services/api';
import Header from './components/Header';
import CategoryFilter from './components/CategoryFilter';
import ProductGrid from './components/ProductGrid';
import LoadMoreButton from './components/LoadMoreButton';
import { Loader2, AlertCircle, Search } from 'lucide-react';

function App() {
  const [products, setProducts] = useState([]);
  const [category, setCategory] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check local storage or system preference
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) {
        return savedTheme === 'dark';
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Toggle theme
  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  // Apply theme class to document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const loadProducts = useCallback(async (currentCursor = null, shouldReset = false) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetchProducts({
        limit: 20,
        category,
        cursor: currentCursor
      });
      
      if (shouldReset) {
        setProducts(response.products);
      } else {
        setProducts((prev) => [...prev, ...response.products]);
      }
      
      setNextCursor(response.nextCursor);
    } catch (err) {
      console.error('Failed to fetch products:', err);
      setError('Failed to load products. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
      setIsInitialLoading(false);
    }
  }, [category]);

  // Initial load or category change
  useEffect(() => {
    setIsInitialLoading(true);
    setCursor(null);
    loadProducts(null, true);
  }, [category, loadProducts]);

  const handleLoadMore = () => {
    if (nextCursor && !isLoading) {
      setCursor(nextCursor);
      loadProducts(nextCursor, false);
    }
  };

  const handleCategoryChange = (newCategory) => {
    setCategory(newCategory);
  };

  // Client-side search filtering
  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.id.toString().includes(searchQuery)
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header 
        toggleDarkMode={toggleDarkMode} 
        isDarkMode={isDarkMode} 
        totalProducts={products.length} 
      />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Controls Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <CategoryFilter 
            selectedCategory={category} 
            onSelectCategory={handleCategoryChange} 
          />
          
          {/* Client-side Search */}
          <div className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search loaded products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
            />
          </div>
        </div>

        {/* Status / Content Section */}
        {error ? (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-6 flex flex-col items-center justify-center text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <h3 className="text-lg font-medium text-red-800 dark:text-red-300 mb-2">Oops! Something went wrong</h3>
            <p className="text-red-600 dark:text-red-400 mb-6">{error}</p>
            <button 
              onClick={() => loadProducts(cursor, cursor === null)}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : isInitialLoading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Loading amazing products...</p>
          </div>
        ) : (
          <>
            {searchQuery && filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">No loaded products match "{searchQuery}"</p>
                <button 
                  onClick={() => setSearchQuery('')}
                  className="mt-4 text-blue-600 hover:underline"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <ProductGrid products={filteredProducts} />
            )}
            
            {/* Pagination Button */}
            {!searchQuery && (
              <LoadMoreButton 
                onClick={handleLoadMore} 
                isLoading={isLoading} 
                hasMore={!!nextCursor} 
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
