import React from 'react';
import { Filter } from 'lucide-react';

const CATEGORIES = [
  'All Categories',
  'Electronics',
  'Fashion',
  'Books',
  'Sports',
  'Home',
  'Beauty',
  'Toys',
  'Automotive'
];

export default function CategoryFilter({ selectedCategory, onSelectCategory }) {
  return (
    <div className="flex items-center gap-3 w-full sm:w-auto">
      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
        <Filter className="h-5 w-5" />
        <span className="font-medium hidden sm:inline">Filter:</span>
      </div>
      <select
        value={selectedCategory || 'All Categories'}
        onChange={(e) => onSelectCategory(e.target.value === 'All Categories' ? null : e.target.value)}
        className="w-full sm:w-64 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none transition-colors"
      >
        {CATEGORIES.map((cat) => (
          <option key={cat} value={cat}>
            {cat}
          </option>
        ))}
      </select>
    </div>
  );
}
