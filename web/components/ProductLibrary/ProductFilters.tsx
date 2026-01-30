
import React from 'react';
import { CATEGORIES } from '../../constants';
import { Category } from '../../types';

interface ProductFiltersProps {
  activeCategory: Category | 'All';
  onCategoryChange: (category: Category | 'All') => void;
}

const ProductFilters: React.FC<ProductFiltersProps> = ({ activeCategory, onCategoryChange }) => {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-8">
      <button
        onClick={() => onCategoryChange('All')}
        className={`flex items-center space-x-2 px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-200 border ${
          activeCategory === 'All'
            ? 'bg-slate-900 text-white border-slate-900 shadow-lg'
            : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
        <span>全部</span>
      </button>
      
      <div className="h-6 w-px bg-slate-200 mx-2 hidden md:block"></div>
      
      {CATEGORIES.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onCategoryChange(cat.id as Category)}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-200 border ${
            activeCategory === cat.id
              ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200'
              : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
          }`}
        >
          <span className={`transition-colors ${activeCategory === cat.id ? 'text-white' : 'text-slate-400'}`}>
            {cat.icon}
          </span>
          <span>{cat.label}</span>
        </button>
      ))}
    </div>
  );
};

export default ProductFilters;
