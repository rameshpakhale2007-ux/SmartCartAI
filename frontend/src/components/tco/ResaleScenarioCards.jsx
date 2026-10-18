import React from 'react';
import { Sparkles, TrendingDown, ArrowUpRight, Check } from 'lucide-react';
import { formatINR } from '../../utils/currency';

export function ResaleScenarioCards({
  scenarios,
  selectedScenario = 'expected',
  onSelectScenario,
}) {
  if (!scenarios) return null;

  const scenarioKeys = ['optimistic', 'expected', 'pessimistic'];

  const themeMap = {
    optimistic: {
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.08)',
      border: 'rgba(16, 185, 129, 0.3)',
      badge: 'Optimistic Scenario',
    },
    expected: {
      color: '#38bdf8',
      bg: 'rgba(56, 189, 248, 0.08)',
      border: 'rgba(56, 189, 248, 0.3)',
      badge: 'Baseline Projection',
    },
    pessimistic: {
      color: '#f87171',
      bg: 'rgba(248, 113, 113, 0.08)',
      border: 'rgba(248, 113, 113, 0.3)',
      badge: 'Pessimistic Scenario',
    },
  };

  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <h4 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
          Resale Valuation Scenarios
        </h4>
        <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
          Click 'Apply to TCO' to update active assumptions
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '16px',
        }}
      >
        {scenarioKeys.map((key) => {
          const sc = scenarios[key];
          if (!sc) return null;
          const theme = themeMap[key];
          const isSelected = selectedScenario === key;

          return (
            <div
              key={key}
              className="card"
              style={{
                padding: '18px',
                background: isSelected ? theme.bg : 'var(--bg-card)',
                border: isSelected ? `2px solid ${theme.color}` : `1px solid ${theme.border}`,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all var(--transition-fast)',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      color: theme.color,
                    }}
                  >
                    {theme.badge}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600 }}>
                    ~{sc.annual_rate}% / yr
                  </span>
                </div>

                <div style={{ fontSize: '24px', fontWeight: 900, color: theme.color, marginBottom: '4px' }}>
                  {formatINR(sc.estimated_resale)}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  <TrendingDown size={14} style={{ color: theme.color }} />
                  <span>Depreciation: <strong>{sc.depreciation_pct}%</strong></span>
                </div>

                <p style={{ fontSize: '12px', color: 'var(--text-dim)', margin: 0, lineHeight: 1.4 }}>
                  {sc.description}
                </p>
              </div>

              <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => onSelectScenario && onSelectScenario(key, sc.estimated_resale)}
                  className={isSelected ? 'btn btn-primary' : 'btn btn-secondary'}
                  style={{ width: '100%', fontSize: '12px', padding: '6px 12px', justifyContent: 'center', gap: '6px' }}
                >
                  {isSelected ? <Check size={13} /> : <ArrowUpRight size={13} />}
                  <span>{isSelected ? 'Applied to TCO' : 'Apply to TCO'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ResaleScenarioCards;
