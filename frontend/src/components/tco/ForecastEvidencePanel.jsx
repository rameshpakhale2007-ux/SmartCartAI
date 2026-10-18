import React from 'react';
import { Database, ShieldCheck, AlertTriangle, Info, HelpCircle } from 'lucide-react';

export function ForecastEvidencePanel({ forecastData }) {
  if (!forecastData) return null;

  const {
    has_sufficient_data,
    observation_count = 0,
    confidence = 'Medium',
    forecast_method,
    annual_depreciation_rate,
    explanations = [],
    limitations = [],
  } = forecastData;

  return (
    <div className="card" style={{ padding: '22px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Database size={18} style={{ color: 'var(--color-primary)' }} />
          <h4 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>
            Model Evidence, Calibration & Limitations
          </h4>
        </div>

        {/* Sufficiency Badge */}
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
            background: has_sufficient_data ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
            color: has_sufficient_data ? '#34d399' : '#fbbf24',
            border: `1px solid ${has_sufficient_data ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
          }}
        >
          {has_sufficient_data ? <ShieldCheck size={13} /> : <AlertTriangle size={13} />}
          <span>
            {has_sufficient_data
              ? `Calibrated Evidence (${observation_count} snapshots)`
              : `Sparse Evidence (${observation_count} snapshots)`}
          </span>
        </span>
      </div>

      {/* Model Parameters Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          background: 'var(--bg-subtle)',
          padding: '14px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '16px',
        }}
      >
        <div>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>
            Forecasting Model
          </span>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
            {forecast_method === 'historical_trend_calibrated'
              ? 'Empirical Trend + Category Baseline'
              : 'Compound Annual Depreciation Scenario'}
          </div>
        </div>

        <div>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>
            Calibrated Annual Rate
          </span>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#38bdf8', marginTop: '2px' }}>
            {annual_depreciation_rate}% / year
          </div>
        </div>

        <div>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>
            Confidence Rating
          </span>
          <div style={{ fontSize: '13px', fontWeight: 700, color: confidence === 'High' ? '#10b981' : confidence === 'Medium' ? '#38bdf8' : '#f59e0b', marginTop: '2px' }}>
            {confidence} Confidence
          </div>
        </div>
      </div>

      {/* Explanations List */}
      {explanations && explanations.length > 0 && (
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
            Methodology Findings:
          </div>
          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--text-main)', lineHeight: 1.5 }}>
            {explanations.map((exp, idx) => (
              <li key={idx} style={{ marginBottom: '3px' }}>{exp}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Limitations Disclaimers */}
      {limitations && limitations.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
            Transparent Limitations & Market Assumptions:
          </div>
          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '11px', color: 'var(--text-dim)', lineHeight: 1.4 }}>
            {limitations.map((lim, idx) => (
              <li key={idx} style={{ marginBottom: '3px' }}>{lim}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default ForecastEvidencePanel;
