import React from 'react';
import { Trash2, Plus, Minus, Package, AlertTriangle, CheckCircle, Store } from 'lucide-react';
import { formatINR } from '../../utils/currency';

export function BasketItemCard({ item, onUpdateQuantity, onRemove, disabled }) {
  if (!item) return null;

  const product = item.product || {};
  const lowestOffer = item.lowest_offer;
  const inStockOffers = item.available_offers_count || 0;
  const totalOffers = item.total_offers_count || 0;

  const handleQtyChange = (delta) => {
    const newQty = item.quantity + delta;
    if (newQty >= 1 && newQty <= 50) {
      onUpdateQuantity(item.id, newQty);
    }
  };

  return (
    <div
      className="card"
      style={{
        padding: '16px 20px',
        marginBottom: '14px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        borderLeft: inStockOffers > 0 ? '4px solid var(--color-success)' : '4px solid var(--color-warning)',
      }}
    >
      {/* Product Image & Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: '1 1 320px' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            background: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-sm)',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {item.product_image ? (
            <img
              src={item.product_image}
              alt={item.product_name}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          ) : (
            <Package size={28} style={{ color: 'var(--text-muted)' }} />
          )}
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase' }}>
              {item.product_brand || 'SmartCart'}
            </span>
            {item.product_sku && (
              <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                {item.product_sku}
              </span>
            )}
          </div>
          <h4
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--text-main)',
              lineHeight: 1.3,
              marginBottom: '6px',
            }}
          >
            {item.product_name}
          </h4>

          {/* Availability & Lowest offer snapshot */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', fontSize: '12px' }}>
            {lowestOffer ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--color-success)' }}>
                <CheckCircle size={13} />
                Lowest: <strong>{formatINR(lowestOffer.price)}</strong> ({lowestOffer.retailer_name})
              </span>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--color-warning)' }}>
                <AlertTriangle size={13} />
                No verified in-stock offers
              </span>
            )}

            <span style={{ color: 'var(--text-dim)' }}>•</span>
            <span style={{ color: 'var(--text-muted)' }}>
              {inStockOffers} of {totalOffers} stores in stock
            </span>
          </div>
        </div>
      </div>

      {/* Quantity Controls & Line Total */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
        {/* Quantity Stepper */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => handleQtyChange(-1)}
            disabled={disabled || item.quantity <= 1}
            style={{ padding: '6px 10px', minWidth: '32px' }}
            aria-label="Decrease quantity"
          >
            <Minus size={13} />
          </button>
          <span
            style={{
              fontWeight: 700,
              fontSize: '14px',
              minWidth: '28px',
              textAlign: 'center',
              color: 'var(--text-main)',
            }}
          >
            {item.quantity}
          </span>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => handleQtyChange(1)}
            disabled={disabled || item.quantity >= 50}
            style={{ padding: '6px 10px', minWidth: '32px' }}
            aria-label="Increase quantity"
          >
            <Plus size={13} />
          </button>
        </div>

        {/* MRP Reference Subtotal */}
        <div style={{ textAlign: 'right', minWidth: '100px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Catalog MRP</div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)' }}>
            {formatINR(item.item_mrp_subtotal || (item.base_mrp * item.quantity))}
          </div>
        </div>

        {/* Delete button */}
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => onRemove(item.id)}
          disabled={disabled}
          title="Remove item"
          style={{ padding: '8px 10px', color: 'var(--color-danger, #f43f5e)' }}
          aria-label="Remove item"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

export default BasketItemCard;
