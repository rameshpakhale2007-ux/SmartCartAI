import React from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Receipt,
  Truck,
  ArrowRight,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { formatINR } from '../../utils/currency';

export function CouponSavingsSummary({ result, onDismiss }) {
  if (!result) return null;

  const isEligible = Boolean(result.is_eligible);
  const coupon = result.coupon;

  return (
    <div
      className="card"
      style={{
        padding: '22px',
        marginBottom: '28px',
        border: isEligible ? '1.5px solid #a7f3d0' : '1.5px solid #fecaca',
        background: '#ffffff',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isEligible ? (
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10b981',
              }}
            >
              <CheckCircle2 size={22} />
            </div>
          ) : (
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444',
              }}
            >
              <XCircle size={22} />
            </div>
          )}
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: isEligible ? '#34d399' : '#f87171' }}>
              {isEligible ? 'Coupon Successfully Applied!' : 'Coupon Ineligible for Current Purchase'}
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
              {result.message || (isEligible ? 'Promotional savings verified.' : result.rejection_reason)}
            </p>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="btn btn-secondary"
            style={{ fontSize: '11px', padding: '4px 10px' }}
          >
            Dismiss Result
          </button>
        )}
      </div>

      {isEligible ? (
        <div>
          {/* Numbers Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
              padding: '16px',
              background: '#f8fafc',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid #e2e8f0',
              marginBottom: '16px',
            }}
          >
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Purchase Amount</span>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                {formatINR(result.purchase_amount)}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Discount Savings</span>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#10b981', marginTop: '2px' }}>
                - {formatINR(result.discount_amount)}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Delivery Fee</span>
              <div style={{ fontSize: '18px', fontWeight: 700, marginTop: '2px' }}>
                {result.shipping_is_unknown ? (
                  <span style={{ color: '#f59e0b', fontSize: '13px' }}>Undisclosed</span>
                ) : result.shipping_cost === 0 ? (
                  <span style={{ color: '#10b981' }}>FREE</span>
                ) : (
                  formatINR(result.shipping_cost)
                )}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Subtotal After Discount</span>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                {formatINR(result.subtotal_after_discount !== undefined ? result.subtotal_after_discount : Math.max(0, result.purchase_amount - result.discount_amount))}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Estimated Final Payable</span>
              <div style={{ fontSize: '20px', fontWeight: 900, color: result.shipping_is_unknown ? '#f59e0b' : '#38bdf8', marginTop: '2px' }}>
                {result.shipping_is_unknown || result.estimated_payable_amount === null ? (
                  <span style={{ fontSize: '13px', fontStyle: 'italic', color: '#fbbf24' }}>Incomplete (Shipping Undisclosed)</span>
                ) : (
                  formatINR(result.estimated_payable_amount)
                )}
              </div>
            </div>
          </div>

          {/* Unknown Shipping Warning */}
          {result.shipping_is_unknown && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                color: '#fbbf24',
                marginBottom: '14px',
              }}
            >
              <AlertTriangle size={15} />
              <span>
                Shipping fee is undisclosed by the retailer. The ₹{result.discount_amount?.toLocaleString('en-IN')} discount is confirmed, but the final landed payable amount remains incomplete until delivery charges are provided at checkout.
              </span>
            </div>
          )}

          {/* Calculation Explanations */}
          {result.calculation_notes && result.calculation_notes.length > 0 && (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>Calculation Breakdown:</div>
              <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {result.calculation_notes.map((note, idx) => (
                  <li key={idx}>{note}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: '10px 0' }}>
          <div style={{ fontSize: '13px', color: '#fca5a5', marginBottom: '8px' }}>
            <strong>Rejection Reason:</strong> {result.rejection_reason || result.message}
          </div>
          {result.coupon && (
            <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
              Coupon '{result.coupon.code}' requires:
              {result.coupon.min_order_value > 0 && ` Minimum order ${formatINR(result.coupon.min_order_value)}; `}
              {result.coupon.retailer_name && ` Valid at ${result.coupon.retailer_name}; `}
              {result.coupon.applicable_category && ` Category: ${result.coupon.applicable_category}; `}
              {result.coupon.is_expired && ` Expired on ${result.coupon.valid_until}.`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CouponSavingsSummary;
