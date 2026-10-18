import React from 'react';
import {
  Database,
  Info,
  ShieldCheck,
  AlertTriangle,
  FileText
} from 'lucide-react';

export function BuyTimingEvidencePanel({ timingData }) {
  if (!timingData) return null;

  const windowDays = timingData.observation_window_days || timingData.window_days || 30;
  const metrics = timingData.historical_metrics || timingData.metrics || {};
  const validCount = timingData.valid_observation_count ?? metrics.observation_count ?? 0;
  const dataStatus = timingData.data_status || timingData.evidence?.data_status || 'SUFFICIENT';
  const evidenceType = timingData.evidence_type || timingData.evidence?.evidence_type || 'HISTORICAL_ANALYSIS';
  const limitations = timingData.limitations || [];
  const obsAge = metrics.observation_age_days ?? metrics.most_recent_observation_age_days ?? null;

  return (
    <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Database size={18} style={{ color: 'var(--color-primary)' }} />
          <h4 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>
            Evidence & Limitations Disclosure
          </h4>
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
            background: dataStatus === 'SUFFICIENT' ? 'rgba(52, 211, 153, 0.12)' : 'rgba(251, 191, 36, 0.12)',
            color: dataStatus === 'SUFFICIENT' ? '#34d399' : '#fbbf24',
            border: `1px solid ${dataStatus === 'SUFFICIENT' ? 'rgba(52, 211, 153, 0.3)' : 'rgba(251, 191, 36, 0.3)'}`,
          }}
        >
          {dataStatus === 'SUFFICIENT' ? <ShieldCheck size={13} /> : <AlertTriangle size={13} />}
          <span>{dataStatus} EVIDENCE ({validCount} SNAPSHOTS)</span>
        </span>
      </div>

      {/* Disclosures Grid */}
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
          <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
            Evidence Methodology
          </span>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
            Empirical Historical Analysis
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Non-predictive statistical baseline</span>
        </div>

        <div>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
            Observation Horizon
          </span>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
            {windowDays} Days ({validCount} data points)
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Chronologically bounded</span>
        </div>

        <div>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
            Data Freshness
          </span>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
            {obsAge !== null && obsAge !== undefined ? `${obsAge} day(s) ago` : 'Live offer checked'}
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Latest recorded price snapshot</span>
        </div>
      </div>

      {/* Explicit Limitations List */}
      {limitations.length > 0 && (
        <div>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '8px' }}>
            Declared Limitations & Assumptions:
          </span>
          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--text-dim)', lineHeight: 1.6 }}>
            {limitations.map((lim, idx) => (
              <li key={idx} style={{ marginBottom: '4px' }}>
                {lim}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default BuyTimingEvidencePanel;
