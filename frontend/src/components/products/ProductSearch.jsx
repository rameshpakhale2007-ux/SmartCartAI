import React from 'react';
import { Search, X } from 'lucide-react';

export function ProductSearch({ value, onChange, onSubmit, onClear, placeholder = 'Search by product name, model, brand, or SKU...' }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) onSubmit(value);
  };

  return (
    <form onSubmit={handleSubmit} style={{ position: 'relative', width: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: 'var(--bg-input)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '6px 14px',
          width: '100%',
          transition: 'border-color var(--transition-fast)',
        }}
      >
        <Search size={18} style={{ color: 'var(--text-dim)', marginRight: '10px', flexShrink: 0 }} />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label="Search products"
          style={{
            border: 'none',
            background: 'transparent',
            padding: '4px 0',
            width: '100%',
            outline: 'none',
            fontSize: '14px',
            color: 'var(--text-main)',
          }}
        />
        {value && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear search query"
            style={{
              color: 'var(--text-dim)',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>
    </form>
  );
}

export default ProductSearch;
