import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, ExternalLink, Scale, CheckCircle2, AlertTriangle } from 'lucide-react';
import DataSourceBadge from '../common/DataSourceBadge';
import { formatINR } from '../../utils/currency';

export function ProductCard({ product }) {
  const [imageError, setImageError] = useState(false);

  if (!product) return null;

  const lowestOffer = product.lowest_eligible_offer;
  const offerCount = product.offer_count ?? 0;
  const hasUnknownShipping = product.has_unknown_shipping;

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: '16px',
        height: '100%',
        transition: 'transform var(--transition-fast), border-color var(--transition-fast)',
      }}
    >
      {/* Product Image & Badges */}
      <div
        style={{
          height: '180px',
          background: 'var(--bg-subtle)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: '14px',
        }}
      >
        {product.image_url && !imageError ? (
          <img
            src={product.image_url}
            alt={product.name}
            onError={() => setImageError(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div style={{ color: 'var(--text-dim)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <Package size={40} />
            <span style={{ fontSize: '11px' }}>Image Unavailable</span>
          </div>
        )}

        <div style={{ position: 'absolute', top: '8px', left: '8px' }}>
          <DataSourceBadge sourceType={product.source_type} size="small" />
        </div>

        <div style={{ position: 'absolute', top: '8px', right: '8px' }}>
          <span
            className="badge"
            style={{
              background: 'rgba(255, 255, 255, 0.92)',
              backdropFilter: 'blur(6px)',
              color: '#0f172a',
              fontSize: '11px',
              fontWeight: 700,
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)',
            }}
          >
            {offerCount} {offerCount === 1 ? 'Offer' : 'Offers'}
          </span>
        </div>
      </div>

      {/* Brand & Category */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {product.brand}
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
          {product.category}
        </span>
      </div>

      {/* Product Name */}
      <h3
        style={{
          fontSize: '15px',
          fontWeight: 700,
          color: 'var(--text-main)',
          lineHeight: 1.4,
          marginBottom: '12px',
          flex: 1,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
        title={product.name}
      >
        {product.name}
      </h3>

      {/* Price & Offer Status */}
      <div
        style={{
          padding: '10px 12px',
          background: 'var(--bg-subtle)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          marginBottom: '14px',
        }}
      >
        {lowestOffer ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Lowest Landed Price:</span>
              <span style={{ fontSize: '11px', color: 'var(--color-success)', fontWeight: 600 }}>
                via {lowestOffer.retailer_name}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#34d399' }}>
                {formatINR(lowestOffer.estimated_total ?? lowestOffer.price)}
              </span>
              {product.base_mrp && product.base_mrp > (lowestOffer.estimated_total ?? lowestOffer.price) && (
                <span style={{ fontSize: '12px', textDecoration: 'line-through', color: 'var(--text-dim)' }}>
                  {formatINR(product.base_mrp)}
                </span>
              )}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>
              {lowestOffer.shipping_cost === 0 ? 'Free Shipping Included' : `Incl. ${formatINR(lowestOffer.shipping_cost)} shipping`}
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Reference MRP:</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
              {formatINR(product.base_mrp)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-warning)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <AlertTriangle size={12} />
              <span>No in-stock verified offers</span>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: 'auto' }}>
        <Link
          to={`/products/${product.id}`}
          className="btn btn-secondary"
          style={{ fontSize: '12px', padding: '8px 10px', textAlign: 'center' }}
        >
          View Details
        </Link>
        <Link
          to={`/compare?id=${product.id}`}
          className="btn btn-primary"
          style={{ fontSize: '12px', padding: '8px 10px', textAlign: 'center' }}
        >
          <Scale size={13} />
          Compare
        </Link>
      </div>
    </div>
  );
}

export default ProductCard;
