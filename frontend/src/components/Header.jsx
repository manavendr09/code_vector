import React from 'react';
import { Package, Moon, Sun } from 'lucide-react';

export default function Header({ toggleDarkMode, isDarkMode, totalProducts }) {
  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Package className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white hidden sm:block">
            Product Browser
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {totalProducts !== null && (
            <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              Loaded: <span className="text-gray-900 dark:text-gray-100">{totalProducts}</span>
            </div>
          )}
          <button
            onClick={toggleDarkMode}
            className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </header>
  );
}
