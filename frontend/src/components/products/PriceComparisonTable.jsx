import React from 'react';
import { ExternalLink, CheckCircle2, AlertTriangle, HelpCircle, Sparkles, ArrowUpDown } from 'lucide-react';
import DataSourceBadge from '../common/DataSourceBadge';
import { formatINR } from '../../utils/currency';
import { formatDate } from '../../utils/dates';

export function PriceComparisonTable({
  offers = [],
  cheapestEligibleOffer = null,
  sortBy = 'estimated_total',
  onSortChange,
}) {
  if (!offers || offers.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
        No retailer offers are currently registered for this product.
      </div>
    );
  }

  return (
    <div className="offers-table-wrap">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Showing <strong>{offers.length}</strong> multi-vendor offers
        </span>
        {onSortChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Sort table:</span>
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              style={{ fontSize: '12px', padding: '4px 8px' }}
              aria-label="Sort comparison table"
            >
              <option value="estimated_total">Landed Estimated Total</option>
              <option value="price">Base Listed Price</option>
              <option value="retailer">Retailer Name</option>
            </select>
          </div>
        )}
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Retailer</th>
            <th>Listed Price</th>
            <th>Shipping Cost</th>
            <th>Discount</th>
            <th>Estimated Landed Total</th>
            <th>Stock Status</th>
            <th>Provenance</th>
            <th>Updated</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {offers.map((offer) => {
            const isCheapest = offer.is_cheapest_eligible;
            const isUnknownShipping = offer.shipping_is_unknown;
            const isOutOfStock = !offer.is_available;

            return (
              <tr
                key={offer.id}
                style={{
                  backgroundColor: isCheapest ? 'rgba(16, 185, 129, 0.07)' : undefined,
                  borderLeft: isCheapest ? '3px solid var(--color-success)' : undefined,
                  opacity: isOutOfStock ? 0.75 : 1,
                }}
              >
                {/* Retailer */}
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                      {offer.retailer_name}
                    </span>
                    {isCheapest && (
                      <span
                        className="badge badge-success"
                        style={{ fontSize: '10px', padding: '2px 6px' }}
                        title="Cheapest eligible offer with verified in-stock availability and complete landed cost"
                      >
                        <Sparkles size={10} />
                        Best Landed Price
                      </span>
                    )}
                  </div>
                </td>

                {/* Listed Price */}
                <td style={{ fontWeight: 600 }}>
                  {formatINR(offer.price)}
                </td>

                {/* Shipping */}
                <td>
                  {isUnknownShipping ? (
                    <span
                      className="badge badge-warning"
                      style={{ fontSize: '11px', gap: '4px' }}
                      title="Shipping cost is not declared by this retailer. Total cannot be finalized."
                    >
                      <HelpCircle size={11} />
                      Unknown
                    </span>
                  ) : offer.shipping_cost === 0 ? (
                    <span style={{ color: 'var(--color-success)', fontWeight: 600, fontSize: '13px' }}>
                      Free Delivery
                    </span>
                  ) : (
                    <span>{formatINR(offer.shipping_cost)}</span>
                  )}
                </td>

                {/* Discount */}
                <td>
                  {offer.discount_pct && offer.discount_pct > 0 ? (
                    <span className="badge badge-warning" style={{ fontSize: '11px' }}>
                      {offer.discount_pct}% OFF
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Standard MRP</span>
                  )}
                </td>

                {/* Estimated Total */}
                <td>
                  {isUnknownShipping ? (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ color: 'var(--color-warning)', fontWeight: 600, fontSize: '13px' }}>
                        Incomplete Total
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                        Base: {formatINR(offer.price)} + Shipping ?
                      </span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                      <span
                        style={{
                          fontSize: '15px',
                          fontWeight: 800,
                          color: isCheapest ? '#34d399' : 'var(--text-main)',
                        }}
                      >
                        {formatINR(offer.estimated_total)}
                      </span>
                      {offer.shipping_is_estimated && (
                        <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>(Est.)</span>
                      )}
                    </div>
                  )}
                </td>

                {/* Stock Status */}
                <td>
                  {isOutOfStock ? (
                    <span
                      className="badge"
                      style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}
                    >
                      <AlertTriangle size={11} />
                      {offer.stock_status || 'Out of Stock'}
                    </span>
                  ) : (
                    <span
                      className="badge"
                      style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}
                    >
                      <CheckCircle2 size={11} />
                      {offer.stock_status || 'In Stock'}
                    </span>
                  )}
                </td>

                {/* Provenance */}
                <td>
                  <DataSourceBadge sourceType={offer.source_type} size="small" />
                </td>

                {/* Updated */}
                <td style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                  {formatDate(offer.updated_at)}
                </td>

                {/* Action */}
                <td>
                  {offer.product_url ? (
                    <a
                      href={offer.product_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                      style={{ fontSize: '11px', padding: '4px 8px' }}
                    >
                      Visit Retailer
                      <ExternalLink size={11} />
                    </a>
                  ) : (
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>N/A</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default PriceComparisonTable;
