import React from 'react';
import { Scale, CheckCircle2, AlertTriangle, Trophy, ExternalLink } from 'lucide-react';
import { formatINR } from '../../utils/currency';

export function TCOComparisonTable({ comparisonData }) {
  if (!comparisonData || !comparisonData.comparisons || comparisonData.comparisons.length === 0) {
    return null;
  }

  const {
    is_fully_comparable,
    comparison_status,
    summary_message,
    comparisons = [],
  } = comparisonData;

  return (
    <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Scale size={20} style={{ color: 'var(--color-primary)' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>
            Side-by-Side Multi-Product TCO Comparison
          </h3>
        </div>

        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '3px 10px',
            borderRadius: 'var(--radius-full)',
            fontSize: '11px',
            fontWeight: 800,
            textTransform: 'uppercase',
            background: is_fully_comparable ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
            color: is_fully_comparable ? '#34d399' : '#fbbf24',
            border: `1px solid ${is_fully_comparable ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
          }}
        >
          {is_fully_comparable ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
          <span>{is_fully_comparable ? 'Fully Comparable' : 'Partially Comparable'}</span>
        </span>
      </div>

      {/* Summary / Ranking Banner */}
      <div
        style={{
          marginBottom: '18px',
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          background: is_fully_comparable ? 'rgba(56, 189, 248, 0.1)' : 'rgba(245, 158, 11, 0.1)',
          border: `1px solid ${is_fully_comparable ? 'rgba(56, 189, 248, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
          color: is_fully_comparable ? '#38bdf8' : '#fbbf24',
          fontSize: '13px',
          lineHeight: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        {is_fully_comparable ? <Trophy size={18} style={{ flexShrink: 0 }} /> : <AlertTriangle size={18} style={{ flexShrink: 0 }} />}
        <span>{summary_message}</span>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table className="table" style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '10px 14px', textAlign: 'left' }}>Product</th>
              <th style={{ padding: '10px 14px', textAlign: 'right' }}>Purchase Price</th>
              <th style={{ padding: '10px 14px', textAlign: 'center' }}>Horizon</th>
              <th style={{ padding: '10px 14px', textAlign: 'right' }}>Operating Cost</th>
              <th style={{ padding: '10px 14px', textAlign: 'right' }}>Maintenance & Repairs</th>
              <th style={{ padding: '10px 14px', textAlign: 'right' }}>Resale Recovery</th>
              <th style={{ padding: '10px 14px', textAlign: 'right' }}>Net TCO</th>
              <th style={{ padding: '10px 14px', textAlign: 'right' }}>Monthly Cost</th>
              <th style={{ padding: '10px 14px', textAlign: 'center' }}>Completeness</th>
            </tr>
          </thead>
          <tbody>
            {comparisons.map((item, idx) => {
              const p = item.product;
              const cb = item.cost_breakdown || {};
              const isBest = is_fully_comparable && idx === 0;

              return (
                <tr
                  key={idx}
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    background: isBest ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
                  }}
                >
                  <td style={{ padding: '10px 14px', fontWeight: 700 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {isBest && <Trophy size={14} style={{ color: '#10b981' }} />}
                      <span>{p ? p.name : `Product #${idx + 1}`}</span>
                    </div>
                    {p && (
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginTop: '2px' }}>
                        {p.brand} • {p.category}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600 }}>
                    {formatINR(cb.purchase_price)}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {item.ownership_months}M
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                    {cb.total_operating_cost !== null ? formatINR(cb.total_operating_cost) : <span style={{ color: '#f59e0b', fontSize: '11px' }}>Omitted</span>}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                    {formatINR((cb.maintenance_cost || 0) + (cb.repair_cost || 0))}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', color: '#10b981', fontWeight: 600 }}>
                    {cb.estimated_resale_value !== null ? formatINR(cb.estimated_resale_value) : <span style={{ color: '#f59e0b', fontSize: '11px' }}>Unknown</span>}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 900, color: isBest ? '#10b981' : '#38bdf8' }}>
                    {item.net_cost !== null ? formatINR(item.net_cost) : formatINR(item.gross_cost)}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#818cf8' }}>
                    {formatINR(item.monthly_equivalent_cost)}/mo
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '10px',
                        fontWeight: 700,
                        background: item.is_complete ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: item.is_complete ? '#34d399' : '#fbbf24',
                      }}
                    >
                      {item.is_complete ? 'Complete' : 'Incomplete'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TCOComparisonTable;
