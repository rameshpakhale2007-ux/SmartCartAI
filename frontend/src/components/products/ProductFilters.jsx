import React from 'react';
import { Filter, RotateCcw, ArrowUpDown } from 'lucide-react';

export function ProductFilters({
  categories = [],
  brands = [],
  selectedCategory,
  selectedBrand,
  minPrice,
  maxPrice,
  sortBy,
  onCategoryChange,
  onBrandChange,
  onMinPriceChange,
  onMaxPriceChange,
  onSortChange,
  onReset,
}) {
  const hasActiveFilters = Boolean(
    selectedCategory || selectedBrand || minPrice || maxPrice || (sortBy && sortBy !== 'newest')
  );

  return (
    <div
      className="card"
      style={{
        padding: '16px',
        marginBottom: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
          <Filter size={16} style={{ color: 'var(--color-primary)' }} />
          <span>Filters & Sorting</span>
        </div>
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="btn btn-secondary"
            style={{ fontSize: '11px', padding: '4px 8px', gap: '4px' }}
          >
            <RotateCcw size={12} />
            Reset All
          </button>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
        }}
      >
        {/* Category Filter */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
            Category
          </label>
          <select
            value={selectedCategory || ''}
            onChange={(e) => onCategoryChange(e.target.value)}
            style={{ width: '100%' }}
            aria-label="Filter by category"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Brand Filter */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
            Brand
          </label>
          <select
            value={selectedBrand || ''}
            onChange={(e) => onBrandChange(e.target.value)}
            style={{ width: '100%' }}
            aria-label="Filter by brand"
          >
            <option value="">All Brands</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        {/* Min Price */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
            Min Price (₹)
          </label>
          <input
            type="number"
            min="0"
            placeholder="e.g. 5000"
            value={minPrice || ''}
            onChange={(e) => onMinPriceChange(e.target.value)}
            style={{ width: '100%' }}
            aria-label="Minimum price in INR"
          />
        </div>

        {/* Max Price */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
            Max Price (₹)
          </label>
          <input
            type="number"
            min="0"
            placeholder="e.g. 100000"
            value={maxPrice || ''}
            onChange={(e) => onMaxPriceChange(e.target.value)}
            style={{ width: '100%' }}
            aria-label="Maximum price in INR"
          />
        </div>

        {/* Sort Order */}
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
            Sort By
          </label>
          <select
            value={sortBy || 'newest'}
            onChange={(e) => onSortChange(e.target.value)}
            style={{ width: '100%' }}
            aria-label="Sort products"
          >
            <option value="newest">Recently Added</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="name_asc">Name: A to Z</option>
            <option value="name_desc">Name: Z to A</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export default ProductFilters;
