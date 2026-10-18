import React from 'react';
import { Filter, RotateCcw } from 'lucide-react';

export function AlternativeFilters({
  minSimilarity,
  setMinSimilarity,
  brand,
  setBrand,
  maxPrice,
  setMaxPrice,
  sort,
  setSort,
  onReset,
}) {
  return (
    <div
      className="card"
      style={{
        padding: '16px 20px',
        marginBottom: '24px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '14px',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600 }}>
        <Filter size={15} />
        <span>Filter Alternatives:</span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
        {/* Min Similarity */}
        <select
          value={minSimilarity}
          onChange={(e) => setMinSimilarity(Number(e.target.value))}
          className="form-select"
          style={{ fontSize: '13px', minWidth: '160px' }}
        >
          <option value="30">Min Similarity: 30%+</option>
          <option value="50">Min Similarity: 50%+</option>
          <option value="70">Min Similarity: 70%+</option>
          <option value="80">Min Similarity: 80%+</option>
        </select>

        {/* Max Budget Filter */}
        <input
          type="number"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          placeholder="Max budget (₹)"
          className="form-input"
          style={{ width: '140px', fontSize: '13px' }}
        />

        {/* Brand Filter */}
        <input
          type="text"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          placeholder="Filter brand..."
          className="form-input"
          style={{ width: '140px', fontSize: '13px' }}
        />

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="form-select"
          style={{ fontSize: '13px', minWidth: '160px' }}
        >
          <option value="similarity">Sort: Highest Similarity</option>
          <option value="price_asc">Sort: Price (Lowest First)</option>
          <option value="price_desc">Sort: Price (Highest First)</option>
          <option value="landed_price_asc">Sort: Landed Price (Lowest)</option>
        </select>

        {/* Reset */}
        <button
          onClick={onReset}
          className="btn btn-secondary"
          style={{ padding: '8px 12px', fontSize: '12px', gap: '4px' }}
          title="Reset filters"
        >
          <RotateCcw size={13} />
          <span>Reset</span>
        </button>
      </div>
    </div>
  );
}

export default AlternativeFilters;
