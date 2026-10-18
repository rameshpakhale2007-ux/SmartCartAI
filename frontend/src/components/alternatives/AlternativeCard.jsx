import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  Scale,
  ExternalLink,
  Check,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Layers,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { formatINR } from '../../utils/currency';
import SimilarityBadge from './SimilarityBadge';

export function AlternativeCard({
  alternative,
  onToggleCompare,
  isCompared = false,
}) {
  const [imgError, setImgError] = useState(false);
  const {
    product = {},
    similarity_score = 0,
    explanations = [],
    pricing = {},
    price_difference = 0,
    is_cheaper = false,
    savings = 0,
  } = alternative || {};

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '20px',
        border: isCompared ? '2px solid var(--color-accent)' : '1px solid var(--border-subtle)',
        background: isCompared ? 'rgba(99, 102, 241, 0.04)' : 'var(--bg-card)',
        position: 'relative',
        transition: 'all var(--transition-fast)',
      }}
    >
      <div>
        {/* Top Header: Similarity Badge & Compare Checkbox */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <SimilarityBadge score={similarity_score} />
          <button
            onClick={() => onToggleCompare && onToggleCompare(product.id)}
            className="btn btn-secondary"
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              gap: '4px',
              border: isCompared ? '1px solid var(--color-accent)' : '1px solid var(--border-subtle)',
              color: isCompared ? 'var(--color-accent)' : 'var(--text-muted)',
            }}
          >
            {isCompared ? <Check size={12} /> : <Plus size={12} />}
            <span>{isCompared ? 'Comparing' : 'Compare'}</span>
          </button>
        </div>

        {/* Product Media & Basic Meta */}
        <div style={{ display: 'flex', gap: '14px', marginBottom: '14px' }}>
          <div
            style={{
              width: '84px',
              height: '84px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {product.image_url && !imgError ? (
              <img
                src={product.image_url}
                alt={product.name}
                onError={() => setImgError(true)}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <Package size={32} style={{ color: 'var(--text-dim)' }} />
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>
              {product.brand} • {product.category}
            </div>
            <h3
              style={{
                fontSize: '15px',
                fontWeight: 700,
                color: 'var(--text-main)',
                margin: '3px 0 6px',
                lineHeight: 1.3,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {product.name}
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
              SKU: {product.sku}
            </span>
          </div>
        </div>

        {/* Pricing Comparison Row */}
        <div
          style={{
            background: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '12px',
            marginBottom: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '4px' }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Best Offer Price</span>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#38bdf8' }}>
                {pricing.best_listed_price ? formatINR(pricing.best_listed_price) : formatINR(product.base_mrp)}
              </div>
            </div>

            {/* Price Delta Badge */}
            {price_difference !== 0 && (
              <div
                data-testid="savings-badge"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  fontSize: '11px',
                  fontWeight: 800,
                  color: is_cheaper ? '#10b981' : '#f87171',
                }}
              >
                {is_cheaper ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                <span>
                  {is_cheaper ? `Save ${formatINR(savings)}` : `+${formatINR(price_difference)}`}
                </span>
              </div>
            )}
          </div>

          {/* Landed Price Note */}
          <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
            {pricing.best_landed_price ? (
              <span>Landed Total: <strong>{formatINR(pricing.best_landed_price)}</strong> (incl. shipping)</span>
            ) : pricing.shipping_is_unknown ? (
              <span style={{ color: '#f59e0b' }}>Delivery fee undisclosed (Landed price incomplete)</span>
            ) : (
              <span>MRP: {formatINR(product.base_mrp)}</span>
            )}
            {pricing.availability_status && (
              <span style={{ marginLeft: '8px' }}>• {pricing.availability_status} ({pricing.in_stock_offers_count || 0} stores)</span>
            )}
          </div>
        </div>

        {/* Explanations List */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
            Why SmartCart Recommends This:
          </div>
          <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {explanations.slice(0, 3).map((exp, idx) => (
              <li key={idx} style={{ lineHeight: 1.4 }}>{exp}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
        <Link
          to={`/products/${product.id}`}
          className="btn btn-secondary"
          style={{ fontSize: '11px', justifyContent: 'center', gap: '4px' }}
        >
          <span>View Specs</span>
          <ExternalLink size={12} />
        </Link>
        <Link
          to={`/compare?id=${product.id}`}
          className="btn btn-primary"
          style={{ fontSize: '11px', justifyContent: 'center', gap: '4px' }}
        >
          <Scale size={12} />
          <span>Compare Stores</span>
        </Link>
      </div>
    </div>
  );
}

export default AlternativeCard;
