import React from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  HelpCircle,
  Database,
  Calendar,
  Store,
  TrendingDown,
  Info,
} from 'lucide-react';
import { formatINR } from '../../utils/currency';

export function getProvenanceInfo(provenance) {
  if (!provenance) {
    return { label: 'DEMO PROVENANCE', isDemo: true };
  }
  let source = '';
  if (typeof provenance === 'string') {
    source = provenance.toLowerCase().trim();
  } else if (typeof provenance === 'object') {
    source = (
      provenance.data_source ||
      provenance.source_type ||
      provenance.source ||
      (provenance.is_demonstration_data ? 'demo' : '') ||
      ''
    ).toLowerCase().trim();
  }

  if (source === 'demo' || source === 'demonstration') {
    return { label: 'DEMO PROVENANCE', isDemo: true };
  }
  if (source === 'dataset' || source === 'csv') {
    return { label: 'DATASET PROVENANCE', isDemo: false };
  }
  if (source === 'manual') {
    return { label: 'MANUAL ENTRY', isDemo: false };
  }
  if (source === 'api' || source === 'live') {
    return { label: 'AUTHORIZED API', isDemo: false };
  }
  return {
    label: source ? `${source.toUpperCase()} PROVENANCE` : 'UNKNOWN PROVENANCE',
    isDemo: false,
  };
}

export function HonestyScoreCard({ analysis }) {
  if (!analysis) return null;

  const classification = analysis.classification || analysis.finding?.classification || 'Insufficient Historical Evidence';
  const honesty_score = analysis.honesty_score !== undefined ? analysis.honesty_score : analysis.scoring?.honesty_index_score ?? null;
  const is_evidence_sufficient = analysis.is_evidence_sufficient !== undefined ? analysis.is_evidence_sufficient : analysis.has_sufficient_evidence ?? false;

  const current_price = analysis.current_price ?? analysis.current_offer?.price ?? null;
  const advertised_reference_price = analysis.advertised_reference_price ?? analysis.current_offer?.reference_price ?? null;
  const advertised_discount_pct = analysis.advertised_discount_pct ?? null;

  const benchmarks = analysis.benchmarks || null;
  const retailer = analysis.retailer || (analysis.current_offer ? { name: analysis.current_offer.retailer_name } : null);
  const days = analysis.days || 30;
  const provenance = analysis.provenance;
  const provenanceInfo = getProvenanceInfo(provenance);

  // Determine color theme based on classification
  let themeColor = '#94a3b8';
  let badgeBg = 'rgba(148, 163, 184, 0.15)';
  let borderGrad = 'rgba(148, 163, 184, 0.4)';
  let StatusIcon = HelpCircle;

  if (classification === 'Strong Historical Support') {
    themeColor = '#10b981';
    badgeBg = 'rgba(16, 185, 129, 0.15)';
    borderGrad = 'rgba(16, 185, 129, 0.4)';
    StatusIcon = ShieldCheck;
  } else if (classification === 'Moderate Historical Support') {
    themeColor = '#38bdf8';
    badgeBg = 'rgba(56, 189, 248, 0.15)';
    borderGrad = 'rgba(56, 189, 248, 0.4)';
    StatusIcon = ShieldCheck;
  } else if (classification === 'Price Pattern Requires Review') {
    themeColor = '#f59e0b';
    badgeBg = 'rgba(245, 158, 11, 0.15)';
    borderGrad = 'rgba(245, 158, 11, 0.4)';
    StatusIcon = AlertTriangle;
  } else if (classification === 'Potentially Misleading Discount') {
    themeColor = '#f87171';
    badgeBg = 'rgba(239, 68, 68, 0.15)';
    borderGrad = 'rgba(239, 68, 68, 0.4)';
    StatusIcon = ShieldAlert;
  }

  return (
    <div
      className="card"
      style={{
        padding: '24px',
        marginBottom: '24px',
        border: `1.5px solid ${borderGrad}`,
        background: '#ffffff',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-card)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '20px' }}>
        {/* Classification Title & Icon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: 'var(--radius-md)',
              background: badgeBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: themeColor,
              border: `1px solid ${borderGrad}`,
            }}
          >
            <StatusIcon size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '11px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  background: badgeBg,
                  color: themeColor,
                  border: `1px solid ${borderGrad}`,
                }}
              >
                {classification}
              </span>

              {/* Provenance Badge */}
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '11px',
                  fontWeight: 700,
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'var(--text-dim)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <Database size={11} />
                {provenanceInfo.label}
              </span>
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
              Discount Credibility Assessment
            </h2>
          </div>
        </div>

        {/* Score Ring / Badge */}
        {is_evidence_sufficient && honesty_score !== null ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              background: 'var(--bg-subtle)',
              padding: '10px 18px',
              borderRadius: 'var(--radius-lg)',
              border: `1px solid ${borderGrad}`,
            }}
          >
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Honesty Index
              </span>
              <div style={{ fontSize: '11px', color: themeColor, fontWeight: 700 }}>
                {honesty_score >= 80 ? 'High Evidence Alignment' : honesty_score >= 60 ? 'Moderate Alignment' : 'Review Advised'}
              </div>
            </div>
            <div
              data-testid="honesty-score-display"
              style={{
                fontSize: '32px',
                fontWeight: 900,
                color: themeColor,
                lineHeight: 1,
              }}
            >
              <span>{honesty_score}</span>
              <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-dim)', marginLeft: '4px' }}>/ 100</span>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              background: 'var(--bg-subtle)',
              padding: '10px 18px',
              borderRadius: 'var(--radius-lg)',
              border: `1px solid ${borderGrad}`,
            }}
          >
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Honesty Index
            </span>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#f59e0b', marginTop: '2px' }}>
              Inconclusive
            </div>
          </div>
        )}
      </div>

      {/* Insufficient Evidence Warning Banner */}
      {!is_evidence_sufficient && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            color: '#fbbf24',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <span>Insufficient historical observations to compute a reliable Honesty Index score.</span>
        </div>
      )}

      {/* Summary Narrative Banner */}
      {(analysis.summary || analysis.finding?.summary) && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-main)',
            fontSize: '13px',
            lineHeight: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <Info size={16} style={{ color: themeColor, flexShrink: 0 }} />
          <span>{analysis.summary || analysis.finding?.summary}</span>
        </div>
      )}

      {/* Snapshot Metrics Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '12px',
          background: 'var(--bg-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Current Listed Price
          </span>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#38bdf8', marginTop: '2px' }}>
            {current_price !== null ? formatINR(current_price) : 'No Offer'}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
            {retailer ? `at ${retailer.name}` : 'Cheapest active retailer'}
          </span>
        </div>

        <div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Advertised Reference MRP
          </span>
          <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-main)', marginTop: '2px' }}>
            {advertised_reference_price ? formatINR(advertised_reference_price) : 'None'}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Strike-through benchmark</span>
        </div>

        <div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Advertised Discount
          </span>
          <div style={{ fontSize: '20px', fontWeight: 900, color: advertised_discount_pct > 0 ? '#10b981' : 'var(--text-muted)', marginTop: '2px' }}>
            {advertised_discount_pct !== null ? `${advertised_discount_pct}% OFF` : 'N/A'}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Claimed reduction</span>
        </div>

        <div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            {days}-Day Historical Median
          </span>
          <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-main)', marginTop: '2px' }}>
            {benchmarks ? formatINR(benchmarks.historical_median ?? benchmarks.median_price) : '—'}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
            {benchmarks ? `${benchmarks.observation_count ?? benchmarks.observations_count ?? 0} snapshots` : 'No observations'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default HonestyScoreCard;
