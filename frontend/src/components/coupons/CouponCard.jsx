import React, { useState } from 'react';
import {
  Tag,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  Copy,
  Check,
  Building2,
  ShoppingBag,
  Layers,
  ArrowRight,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { formatINR } from '../../utils/currency';

export function CouponCard({ coupon, onSelectForValidation, isSelected = false }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(coupon.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = () => {
    if (coupon.is_expired) {
      return (
        <span
          data-testid="coupon-status-badge"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '11px',
            fontWeight: 700,
            background: 'rgba(100, 116, 139, 0.2)',
            color: '#94a3b8',
            border: '1px solid rgba(100, 116, 139, 0.3)',
          }}
        >
          <Clock size={12} />
          Expired
        </span>
      );
    }
    if (!coupon.is_active) {
      return (
        <span
          data-testid="coupon-status-badge"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '11px',
            fontWeight: 700,
            background: 'rgba(239, 68, 68, 0.2)',
            color: '#f87171',
            border: '1px solid rgba(239, 68, 68, 0.3)',
          }}
        >
          <XCircle size={12} />
          Inactive
        </span>
      );
    }
    if (coupon.verification_status === 'verified') {
      return (
        <span
          data-testid="coupon-status-badge"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '11px',
            fontWeight: 700,
            background: 'rgba(16, 185, 129, 0.2)',
            color: '#34d399',
            border: '1px solid rgba(16, 185, 129, 0.3)',
          }}
        >
          <ShieldCheck size={12} />
          Verified Promo
        </span>
      );
    }
    return (
      <span
        data-testid="coupon-status-badge"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '3px 8px',
          borderRadius: 'var(--radius-sm)',
          fontSize: '11px',
          fontWeight: 700,
          background: 'rgba(245, 158, 11, 0.2)',
          color: '#fbbf24',
          border: '1px solid rgba(245, 158, 11, 0.3)',
        }}
      >
        <AlertTriangle size={12} />
        Unverified Submission
      </span>
    );
  };

  const getDiscountDisplay = () => {
    if (coupon.discount_type === 'percentage') {
      return (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span style={{ fontSize: '24px', fontWeight: 900, color: '#38bdf8' }}>
            {coupon.discount_value}% OFF
          </span>
          {coupon.max_discount_value && (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              (Up to {formatINR(coupon.max_discount_value)})
            </span>
          )}
        </div>
      );
    }
    if (coupon.discount_type === 'free_shipping') {
      return (
        <div style={{ fontSize: '20px', fontWeight: 900, color: '#10b981' }}>
          FREE DELIVERY
        </div>
      );
    }
    return (
      <div style={{ fontSize: '24px', fontWeight: 900, color: '#a855f7' }}>
        {formatINR(coupon.discount_value)} OFF
      </div>
    );
  };

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '20px',
        border: isSelected ? '2px solid var(--color-accent)' : '1px solid var(--border-subtle)',
        background: isSelected ? 'rgba(99, 102, 241, 0.05)' : 'var(--bg-card)',
        position: 'relative',
        transition: 'all var(--transition-fast)',
      }}
    >
      <div>
        {/* Top Badges */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Building2 size={13} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
              {coupon.retailer_name}
            </span>
          </div>
          {getStatusBadge()}
        </div>

        {/* Big Discount Value */}
        <div style={{ marginBottom: '8px' }}>
          {getDiscountDisplay()}
        </div>

        {/* Title & Description */}
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}>
          {coupon.title}
        </h3>
        {coupon.description && (
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '14px' }}>
            {coupon.description}
          </p>
        )}

        {/* Code Box with Copy */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-subtle)',
            border: '1px dashed var(--border-focus)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 12px',
            marginBottom: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Tag size={14} style={{ color: 'var(--color-accent)' }} />
            <code style={{ fontSize: '14px', fontWeight: 800, letterSpacing: '0.05em', color: '#818cf8' }}>
              {coupon.code}
            </code>
          </div>
          <button
            onClick={handleCopy}
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
            title="Copy coupon code"
          >
            {copied ? <Check size={12} style={{ color: '#10b981' }} /> : <Copy size={12} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        {/* Restrictions & Conditions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', color: 'var(--text-dim)', marginBottom: '14px' }}>
          {coupon.min_order_value > 0 && (
            <div>• Min. Order Value: <strong>{formatINR(coupon.min_order_value)}</strong></div>
          )}
          {coupon.applicable_category && (
            <div>• Category: <strong>{coupon.applicable_category}</strong></div>
          )}
          {coupon.applicable_product_name && (
            <div>• Restricted to: <strong>{coupon.applicable_product_name}</strong></div>
          )}
          {coupon.valid_until && (
            <div>• Valid until: <strong>{new Date(coupon.valid_until).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></div>
          )}
        </div>
      </div>

      {/* Footer Provenance & Validate Action */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', marginTop: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
            Provenance: {coupon.source_type === 'demo' ? 'Demonstration (Demo)' : coupon.source_type}
          </span>
          <button
            onClick={() => onSelectForValidation && onSelectForValidation(coupon)}
            className={isSelected ? 'btn btn-primary' : 'btn btn-secondary'}
            style={{ fontSize: '11px', padding: '6px 12px', gap: '4px' }}
          >
            <span>{isSelected ? 'Selected' : 'Test & Validate'}</span>
            <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default CouponCard;
