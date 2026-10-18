import React, { useState } from 'react';
import { Award, ChevronDown, ChevronUp, Store, Split, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { formatINR } from '../../utils/currency';
import RetailerCostBreakdown from './RetailerCostBreakdown';

export function OptimizationStrategyCard({
  strategy,
  title,
  subtitle,
  type = 'single', // 'single' | 'multi'
  isRecommended = false,
  savings = 0,
}) {
  const [expanded, setExpanded] = useState(true);

  if (!strategy) {
    return (
      <div
        className="card"
        style={{
          padding: '20px',
          background: 'var(--bg-subtle)',
          borderStyle: 'dashed',
          textAlign: 'center',
          color: 'var(--text-dim)',
          marginBottom: '20px',
        }}
      >
        <h4 style={{ margin: '0 0 6px 0', color: 'var(--text-muted)' }}>{title}</h4>
        <p style={{ margin: 0, fontSize: '13px' }}>
          {type === 'single'
            ? 'No single retailer carries all products in your basket.'
            : 'Multi-retailer split strategy could not be computed.'}
        </p>
      </div>
    );
  }

  const isComplete = strategy.is_complete_total;
  const retailersCount = strategy.retailers_count || 1;

  return (
    <div
      className="card"
      style={{
        padding: '24px',
        marginBottom: '24px',
        border: isRecommended ? '2px solid var(--color-primary, #6366f1)' : '1px solid var(--border-subtle)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Recommended Ribbon */}
      {isRecommended && (
        <div
          style={{
            position: 'absolute',
            top: '0',
            right: '0',
            background: 'var(--color-primary, #6366f1)',
            color: '#fff',
            fontSize: '11px',
            fontWeight: 800,
            padding: '4px 14px',
            borderBottomLeftRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          <Award size={13} />
          Recommended Strategy
        </div>
      )}

      {/* Title & High Level Stats */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            {type === 'single' ? (
              <Store size={18} style={{ color: 'var(--color-accent)' }} />
            ) : (
              <Split size={18} style={{ color: 'var(--color-primary)' }} />
            )}
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>
              {title}
            </h3>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{subtitle}</span>
        </div>

        {/* Big Total Callout */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
            Final Payable Total
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: isRecommended ? '#34d399' : 'var(--text-main)' }}>
            {formatINR(strategy.final_payable_total)}
          </div>
          {!isComplete && (
            <div style={{ fontSize: '11px', color: 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
              <AlertTriangle size={12} />
              <span>Estimated (undisclosed shipping)</span>
            </div>
          )}
        </div>
      </div>

      {/* Savings Callout if Recommended */}
      {isRecommended && savings > 0 && (
        <div
          style={{
            background: 'rgba(52, 211, 153, 0.1)',
            border: '1px solid rgba(52, 211, 153, 0.25)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 14px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            color: '#34d399',
            fontWeight: 600,
          }}
        >
          <CheckCircle size={16} />
          <span>Saves {formatINR(savings)} compared to single-retailer checkout baseline!</span>
        </div>
      )}

      {/* Aggregate Cost Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '12px',
          background: 'var(--bg-subtle)',
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '16px',
          fontSize: '12px',
        }}
      >
        <div>
          <span style={{ color: 'var(--text-dim)', display: 'block' }}>Retailers Involved</span>
          <strong style={{ fontSize: '14px', color: 'var(--text-main)' }}>
            {retailersCount} {retailersCount === 1 ? 'store' : 'stores'}
          </strong>
        </div>
        <div>
          <span style={{ color: 'var(--text-dim)', display: 'block' }}>Items Subtotal</span>
          <strong style={{ fontSize: '14px', color: 'var(--text-main)' }}>
            {formatINR(strategy.total_items_cost)}
          </strong>
        </div>
        <div>
          <span style={{ color: 'var(--text-dim)', display: 'block' }}>Total Shipping</span>
          <strong style={{ fontSize: '14px', color: 'var(--text-main)' }}>
            {strategy.total_shipping === null ? (
              <span style={{ color: 'var(--color-warning)' }}>Undisclosed</span>
            ) : strategy.total_shipping === 0 ? (
              <span style={{ color: 'var(--color-success)' }}>Free (₹0)</span>
            ) : (
              formatINR(strategy.total_shipping)
            )}
          </strong>
        </div>
        <div>
          <span style={{ color: 'var(--text-dim)', display: 'block' }}>Discounts Applied</span>
          <strong style={{ fontSize: '14px', color: strategy.total_discounts > 0 ? 'var(--color-success)' : 'var(--text-muted)' }}>
            -{formatINR(strategy.total_discounts)}
          </strong>
        </div>
      </div>

      {/* Expand/Collapse shipments breakdown button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="btn btn-secondary"
          style={{ fontSize: '12px', padding: '6px 12px' }}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {expanded ? 'Hide Shipment Allocations' : 'View Detailed Shipment Allocations'}
        </button>

        <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
          {strategy.shipments?.length || 0} shipment(s)
        </span>
      </div>

      {/* Shipments breakdown list */}
      {expanded && (
        <div style={{ marginTop: '16px' }}>
          <RetailerCostBreakdown shipments={strategy.shipments} />
        </div>
      )}
    </div>
  );
}

export default OptimizationStrategyCard;
