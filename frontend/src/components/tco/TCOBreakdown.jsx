import React from 'react';
import {
  DollarSign,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Info,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { formatINR } from '../../utils/currency';

export function TCOBreakdown({ tcoData }) {
  if (!tcoData) return null;

  const {
    gross_cost,
    net_cost,
    monthly_equivalent_cost,
    ownership_months,
    is_complete,
    completeness_status,
    missing_fields = [],
    cost_breakdown = {},
    breakdown_percentages = {},
    data_provenance = {},
    explanations = [],
  } = tcoData;

  const costItems = [
    { label: 'Purchase Price', value: cost_breakdown.purchase_price, pct: breakdown_percentages.purchase_price_pct, color: '#38bdf8' },
    { label: 'Acquisition / Delivery', value: cost_breakdown.acquisition_cost, pct: breakdown_percentages.acquisition_pct, color: '#818cf8' },
    { label: `Operating (${ownership_months} Months)`, value: cost_breakdown.total_operating_cost, pct: breakdown_percentages.operating_pct, color: '#a855f7' },
    { label: 'Maintenance & Servicing', value: cost_breakdown.maintenance_cost, pct: breakdown_percentages.maintenance_pct, color: '#ec4899' },
    { label: 'Repairs & Warranty', value: cost_breakdown.repair_cost, pct: breakdown_percentages.repair_pct, color: '#f59e0b' },
    { label: 'Accessories & Add-ons', value: cost_breakdown.accessory_cost, pct: breakdown_percentages.accessory_pct, color: '#10b981' },
    { label: 'Financing & Interest', value: cost_breakdown.financing_cost, pct: breakdown_percentages.financing_pct, color: '#f87171' },
  ];

  return (
    <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={18} style={{ color: 'var(--color-primary)' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>
            {ownership_months}-Month Ownership Cost Breakdown
          </h3>
        </div>

        {/* Completeness Badge */}
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
            background: is_complete ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
            color: is_complete ? '#34d399' : '#fbbf24',
            border: `1px solid ${is_complete ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
          }}
        >
          {is_complete ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
          <span>{is_complete ? 'Complete Cost Assessment' : 'Incomplete Cost Inputs'}</span>
        </span>
      </div>

      {/* Incomplete Inputs Warning Banner */}
      {!is_complete && (
        <div
          style={{
            marginBottom: '20px',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            color: '#fbbf24',
            fontSize: '13px',
            lineHeight: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
          role="alert"
        >
          <AlertTriangle size={18} style={{ flexShrink: 0 }} />
          <div>
            <strong>Incomplete Inputs Notice: </strong>
            The following cost factors were omitted: <em>{missing_fields.join(', ')}</em>.
            SmartCart AI does not silently assume missing expenses are zero. Supply all figures to finalize a complete Net TCO.
          </div>
        </div>
      )}

      {/* Top 4 Metrics Row */}
      <div className="metrics-grid" style={{ marginBottom: '22px' }}>
        {/* Gross Costs */}
        <div className="metric-card">
          <span className="metric-title">Gross Ownership Costs</span>
          <div className="metric-value" style={{ color: 'var(--text-main)' }}>
            {formatINR(gross_cost)}
          </div>
          <span className="metric-subtext">Sum of all active expenditures</span>
        </div>

        {/* Resale Proceeds */}
        <div className="metric-card">
          <span className="metric-title">Estimated Resale Recovery</span>
          <div className="metric-value" style={{ color: '#10b981' }}>
            {cost_breakdown.estimated_resale_value !== null ? (
              `- ${formatINR(cost_breakdown.estimated_resale_value)}`
            ) : (
              <span style={{ fontSize: '15px', color: '#f59e0b' }}>Unknown Resale</span>
            )}
          </div>
          <span className="metric-subtext">
            {data_provenance.resale_source || 'Deducted once upon disposal'}
          </span>
        </div>

        {/* Net TCO */}
        <div className="metric-card">
          <span className="metric-title">Net Total Cost of Ownership</span>
          <div className="metric-value" style={{ color: '#38bdf8' }}>
            {net_cost !== null ? formatINR(net_cost) : formatINR(gross_cost)}
          </div>
          <span className="metric-subtext">
            {net_cost !== null ? 'Gross costs minus resale proceeds' : 'Pending resale valuation'}
          </span>
        </div>

        {/* Monthly Equivalent */}
        <div className="metric-card">
          <span className="metric-title">Effective Monthly Cost</span>
          <div className="metric-value" style={{ color: '#818cf8' }}>
            {formatINR(monthly_equivalent_cost)}/mo
          </div>
          <span className="metric-subtext">
            Amortized over {ownership_months} months
          </span>
        </div>
      </div>

      {/* Stacked Cost Components Progress Bar */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
          Expenditure Allocation Share (% of Gross):
        </div>
        <div
          style={{
            height: '14px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 'var(--radius-full)',
            display: 'flex',
            overflow: 'hidden',
          }}
        >
          {costItems.map((item, idx) => {
            if (!item.pct || item.pct <= 0) return null;
            return (
              <div
                key={idx}
                style={{
                  width: `${item.pct}%`,
                  height: '100%',
                  background: item.color,
                }}
                title={`${item.label}: ${item.pct}%`}
              />
            );
          })}
        </div>
      </div>

      {/* Breakdown Table */}
      <div style={{ overflowX: 'auto', marginBottom: '18px' }}>
        <table className="table" style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '8px 12px', textAlign: 'left' }}>Cost Component</th>
              <th style={{ padding: '8px 12px', textAlign: 'right' }}>Amount</th>
              <th style={{ padding: '8px 12px', textAlign: 'right' }}>Share of Gross</th>
              <th style={{ padding: '8px 12px', textAlign: 'left' }}>Status / Provenance</th>
            </tr>
          </thead>
          <tbody>
            {costItems.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '8px 12px', fontWeight: 600 }}>
                  <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: item.color, marginRight: '8px' }} />
                  {item.label}
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: item.value !== null ? 'var(--text-main)' : '#f59e0b' }}>
                  {item.value !== null ? formatINR(item.value) : 'Omitted / Unknown'}
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-dim)' }}>
                  {item.pct ? `${item.pct}%` : '—'}
                </td>
                <td style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--text-muted)' }}>
                  {item.label === 'Purchase Price'
                    ? data_provenance.purchase_price_source
                    : item.value !== null
                    ? 'Supplied Assumption'
                    : 'Not entered'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Explanations */}
      {explanations && explanations.length > 0 && (
        <div style={{ background: 'var(--bg-subtle)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
            Financial Assessment Summary:
          </div>
          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--text-main)', lineHeight: 1.5 }}>
            {explanations.map((exp, idx) => (
              <li key={idx}>{exp}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default TCOBreakdown;
