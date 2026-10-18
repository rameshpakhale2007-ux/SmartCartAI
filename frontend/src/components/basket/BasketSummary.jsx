import React from 'react';
import { ShoppingBag, Zap, Trash2, Sliders, Split, AlertCircle } from 'lucide-react';
import { formatINR } from '../../utils/currency';

export function BasketSummary({
  basketData,
  allowSplitOrders,
  setAllowSplitOrders,
  maxRetailers,
  setMaxRetailers,
  onOptimize,
  onClear,
  optimizing,
  disabled,
}) {
  const itemsCount = basketData?.total_items || 0;
  const uniqueProducts = basketData?.unique_products_count || 0;
  const catalogTotal = basketData?.catalog_mrp_total || 0;

  return (
    <div
      className="card"
      style={{
        padding: '20px',
        marginBottom: '24px',
        position: 'sticky',
        top: '20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <ShoppingBag size={18} style={{ color: 'var(--color-primary, #6366f1)' }} />
        <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Basket Summary</h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', fontSize: '13px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
          <span>Total Items</span>
          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{itemsCount} units</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
          <span>Unique Products</span>
          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{uniqueProducts}</span>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            paddingTop: '8px',
            borderTop: '1px solid var(--border-subtle)',
            fontSize: '14px',
          }}
        >
          <span style={{ color: 'var(--text-muted)' }}>Reference MRP Sum</span>
          <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{formatINR(catalogTotal)}</span>
        </div>
      </div>

      {/* Optimization Parameters */}
      <div
        style={{
          background: 'var(--bg-subtle)',
          padding: '14px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', fontSize: '12px', fontWeight: 700, color: 'var(--text-main)' }}>
          <Sliders size={14} />
          <span>Optimizer Controls</span>
        </div>

        {/* Split Orders Toggle */}
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '13px',
            cursor: 'pointer',
            marginBottom: '10px',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-main)' }}>
            <Split size={14} style={{ color: 'var(--text-muted)' }} />
            Allow Split Orders
          </span>
          <input
            type="checkbox"
            checked={allowSplitOrders}
            onChange={(e) => setAllowSplitOrders(e.target.checked)}
            disabled={disabled}
            style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary, #6366f1)', cursor: 'pointer' }}
          />
        </label>

        {/* Max Retailers Selector */}
        {allowSplitOrders && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Max Retailers:</span>
            <select
              className="input"
              value={maxRetailers}
              onChange={(e) => setMaxRetailers(Number(e.target.value))}
              disabled={disabled}
              style={{ padding: '4px 10px', fontSize: '12px', width: '90px' }}
            >
              {[2, 3, 4, 5].map((num) => (
                <option key={num} value={num}>
                  {num} stores
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onOptimize}
          disabled={disabled || itemsCount === 0 || optimizing}
          style={{
            padding: '12px',
            fontSize: '14px',
            fontWeight: 700,
            justifyContent: 'center',
            width: '100%',
          }}
        >
          <Zap size={16} />
          {optimizing ? 'Calculating Optimal Strategies...' : 'Optimize Basket Cost'}
        </button>

        {itemsCount > 0 && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClear}
            disabled={disabled || optimizing}
            style={{
              padding: '8px',
              fontSize: '12px',
              justifyContent: 'center',
              color: 'var(--color-danger, #f43f5e)',
            }}
          >
            <Trash2 size={13} />
            Clear Basket
          </button>
        )}
      </div>
    </div>
  );
}

export default BasketSummary;
