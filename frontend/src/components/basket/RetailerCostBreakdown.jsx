import React from 'react';
import { Store, Truck, Tag, AlertTriangle, CheckCircle2, Package } from 'lucide-react';
import { formatINR } from '../../utils/currency';
import DataSourceBadge from '../common/DataSourceBadge';

export function RetailerCostBreakdown({ shipments = [] }) {
  if (!shipments || shipments.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {shipments.map((shipment, idx) => {
        const isUnknownShipping = shipment.shipping_is_unknown;
        const isFreeShipping = shipment.qualified_free_shipping;
        const appliedCoupon = shipment.applied_coupon;
        const conditionalCoupons = shipment.conditional_coupons || [];

        return (
          <div
            key={shipment.retailer_id || idx}
            style={{
              background: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              padding: '16px',
            }}
          >
            {/* Shipment Header */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                paddingBottom: '12px',
                borderBottom: '1px solid var(--border-subtle)',
                marginBottom: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-main)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-primary, #6366f1)',
                  }}
                >
                  <Store size={18} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>
                    Shipment {idx + 1}: {shipment.retailer_name}
                  </h4>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {shipment.items_count} item(s) allocated
                  </span>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Shipment Total: </span>
                <strong style={{ fontSize: '16px', color: 'var(--text-main)' }}>
                  {formatINR(shipment.order_total)}
                </strong>
                {isUnknownShipping && (
                  <span style={{ fontSize: '11px', color: 'var(--color-warning)', display: 'block' }}>
                    *Excludes undisclosed shipping
                  </span>
                )}
              </div>
            </div>

            {/* Allocated Items List */}
            <div style={{ marginBottom: '14px' }}>
              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: 'var(--text-dim)', textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '6px 8px' }}>Product</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center' }}>Qty</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Unit Price</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {shipment.items.map((item, iIdx) => (
                    <tr key={iIdx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                      <td style={{ padding: '8px', color: 'var(--text-main)' }}>
                        <div style={{ fontWeight: 600 }}>{item.product_name}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{item.product_sku}</div>
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        {item.quantity}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', color: 'var(--text-muted)' }}>
                        {formatINR(item.unit_price)}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600, color: 'var(--text-main)' }}>
                        {formatINR(item.line_subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Shipment Cost Breakdown Details */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '10px',
                fontSize: '12px',
                padding: '10px 12px',
                background: 'var(--bg-main)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              {/* Shipping info */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <Truck size={15} style={{ color: 'var(--color-accent)', marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                    {isFreeShipping ? (
                      <span style={{ color: 'var(--color-success)' }}>Free Shipping (₹0)</span>
                    ) : isUnknownShipping ? (
                      <span style={{ color: 'var(--color-warning)' }}>Undisclosed Shipping</span>
                    ) : (
                      <span>Shipping Fee: {formatINR(shipment.shipping_fee)}</span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {shipment.shipping_explanation}
                  </div>
                </div>
              </div>

              {/* Coupon info */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <Tag size={15} style={{ color: 'var(--color-primary)', marginTop: '2px', flexShrink: 0 }} />
                <div>
                  {appliedCoupon ? (
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--color-success)' }}>
                        Coupon {appliedCoupon.code}: -{formatINR(shipment.coupon_discount)}
                      </span>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {appliedCoupon.title}
                      </div>
                    </div>
                  ) : conditionalCoupons.length > 0 ? (
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--color-warning)' }}>
                        {conditionalCoupons[0].code} (Unverified)
                      </span>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Potential savings: {formatINR(conditionalCoupons[0].potential_discount)} (excluded from confirmed total)
                      </div>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-dim)' }}>No applicable coupons</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default RetailerCostBreakdown;
