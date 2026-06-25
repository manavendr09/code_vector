import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadMoreButton({ onClick, isLoading, hasMore }) {
  if (!hasMore) return null;

  return (
    <div className="mt-12 flex justify-center">
      <button
        onClick={onClick}
        disabled={isLoading}
        className="group relative inline-flex items-center justify-center gap-2 px-8 py-3 text-sm font-medium text-white transition-all duration-300 bg-blue-600 border border-transparent rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed dark:focus:ring-offset-gray-900 overflow-hidden"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading...</span>
          </>
        ) : (
          <>
            <span>Load More Products</span>
            <div className="absolute inset-0 h-full w-full rounded-full border-2 border-white/20 scale-[1.05] opacity-0 transition-all group-hover:scale-100 group-hover:opacity-100"></div>
          </>
        )}
      </button>
    </div>
  );
}
