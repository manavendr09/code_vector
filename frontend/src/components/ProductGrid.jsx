import React from 'react';
import ProductCard from './ProductCard';

export default function ProductGrid({ products }) {
  if (!products || products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
        <div className="bg-gray-100 dark:bg-gray-800 rounded-full p-4 mb-4">
          <span className="text-4xl" role="img" aria-label="sad face">
            😕
          </span>
        </div>
        <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">No products found</h3>
        <p className="text-gray-500 dark:text-gray-400 max-w-sm">
          We couldn't find any products matching your current filters. Try selecting a different category.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
