import React, { useState, useEffect } from 'react';
import { Scale, X, Layers, AlertCircle, ExternalLink } from 'lucide-react';
import { formatINR } from '../../utils/currency';
import alternativeApi from '../../api/alternativeApi';
import LoadingSpinner from '../common/LoadingSpinner';

export function AlternativeComparison({
  sourceProductId,
  comparedIds = [],
  onClose,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!sourceProductId || comparedIds.length === 0) return;

    const loadMatrix = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await alternativeApi.compareAlternatives(sourceProductId, comparedIds);
        if (res && res.success) {
          setData(res.data);
        } else {
          throw new Error('Failed to load comparison matrix.');
        }
      } catch (err) {
        setError(err.message || 'Unable to load side-by-side comparison matrix.');
      } finally {
        setLoading(false);
      }
    };

    loadMatrix();
  }, [sourceProductId, comparedIds]);

  if (comparedIds.length === 0) return null;

  return (
    <div
      className="card"
      style={{
        padding: '24px',
        marginBottom: '28px',
        border: '1.5px solid #bfdbfe',
        background: '#ffffff',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Scale size={20} style={{ color: 'var(--color-accent)' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Side-by-Side Specifications & Value Comparison</h3>
        </div>
        <button
          onClick={onClose}
          className="btn btn-secondary"
          style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <X size={13} />
          <span>Close Comparison</span>
        </button>
      </div>

      {loading ? (
        <LoadingSpinner message="Building side-by-side specifications matrix..." />
      ) : error ? (
        <div style={{ color: '#f87171', fontSize: '13px', padding: '12px' }}>{error}</div>
      ) : !data ? null : (
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-subtle)' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', width: '220px', color: 'var(--text-muted)' }}>
                  Attribute / Specification
                </th>
                {data.products.map((pSummary) => (
                  <th
                    key={pSummary.product.id}
                    style={{
                      padding: '10px 14px',
                      textAlign: 'left',
                      minWidth: '200px',
                      background: pSummary.is_source ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                    }}
                  >
                    <div>
                      {pSummary.is_source && (
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            color: '#818cf8',
                            textTransform: 'uppercase',
                            display: 'block',
                            marginBottom: '2px',
                          }}
                        >
                          Source Target
                        </span>
                      )}
                      <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '14px' }}>
                        {pSummary.product?.name}
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 900, color: '#38bdf8', marginTop: '4px' }}>
                        {formatINR(pSummary.pricing?.best_listed_price || pSummary.product?.base_mrp || 0)}
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Brand Row */}
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>Brand</td>
                {data.products.map((pSummary) => (
                  <td key={pSummary.product?.id || Math.random()} style={{ padding: '10px 14px' }}>
                    {pSummary.product?.brand || '—'}
                  </td>
                ))}
              </tr>

              {/* Best Landed Price Row */}
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>Best Landed Total</td>
                {data.products.map((pSummary) => (
                  <td key={pSummary.product?.id || Math.random()} style={{ padding: '10px 14px' }}>
                    {pSummary.pricing?.best_landed_price ? (
                      formatINR(pSummary.pricing.best_landed_price)
                    ) : (
                      <span style={{ color: '#f59e0b', fontSize: '11px' }}>Undisclosed shipping</span>
                    )}
                  </td>
                ))}
              </tr>

              {/* In-Stock Stores Row */}
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>Active Retailers</td>
                {data.products.map((pSummary) => (
                  <td key={pSummary.product?.id || Math.random()} style={{ padding: '10px 14px' }}>
                    {pSummary.pricing?.available_retailers && Array.isArray(pSummary.pricing.available_retailers) && pSummary.pricing.available_retailers.length > 0
                      ? pSummary.pricing.available_retailers.join(', ')
                      : 'None available'}
                  </td>
                ))}
              </tr>

              {/* Dynamic Technical Specifications Matrix */}
              {data.specifications_matrix.map((row) => (
                <tr key={row.specification} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>
                    {row.specification}
                  </td>
                  {data.products.map((pSummary) => (
                    <td
                      key={pSummary.product?.id || Math.random()}
                      style={{
                        padding: '10px 14px',
                        background: pSummary.is_source ? 'rgba(99, 102, 241, 0.05)' : 'transparent',
                      }}
                    >
                      {row.values[String(pSummary.product?.id)] || '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AlternativeComparison;
