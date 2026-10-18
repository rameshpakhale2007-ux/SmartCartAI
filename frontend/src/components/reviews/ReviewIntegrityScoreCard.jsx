import React from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  Layers,
  Database,
  Info,
  Sparkles,
} from 'lucide-react';

export function ReviewIntegrityScoreCard({ analysis }) {
  if (!analysis) return null;

  const {
    integrity_score,
    classification,
    classification_label,
    confidence,
    summary,
    usable_reviews_count = 0,
    total_reviews_count = 0,
    data_source = 'catalog_seed',
    metric_scores = {},
    weights_applied,
    excluded_metrics = [],
  } = analysis;

  const isSufficient = integrity_score !== null && integrity_score !== undefined;

  let themeColor = '#10b981';
  let themeBg = 'rgba(16, 185, 129, 0.12)';
  let themeBorder = 'rgba(16, 185, 129, 0.3)';

  if (!isSufficient) {
    themeColor = '#94a3b8';
    themeBg = 'rgba(148, 163, 184, 0.12)';
    themeBorder = 'rgba(148, 163, 184, 0.3)';
  } else if (integrity_score < 60) {
    themeColor = '#f87171';
    themeBg = 'rgba(248, 113, 113, 0.12)';
    themeBorder = 'rgba(248, 113, 113, 0.3)';
  } else if (integrity_score < 80) {
    themeColor = '#fbbf24';
    themeBg = 'rgba(251, 191, 36, 0.12)';
    themeBorder = 'rgba(251, 191, 36, 0.3)';
  }

  return (
    <div
      className="card"
      style={{
        padding: '24px',
        marginBottom: '24px',
        background: '#ffffff',
        border: `1.5px solid ${themeBorder}`,
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-card)',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                background: themeBg,
                color: themeColor,
                border: `1px solid ${themeBorder}`,
              }}
            >
              {isSufficient ? <ShieldCheck size={12} /> : <HelpCircle size={12} />}
              {classification_label || (isSufficient ? 'Pattern Analyzed' : 'Insufficient Evidence')}
            </span>

            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '11px',
                fontWeight: 600,
                background: 'rgba(100, 116, 139, 0.15)',
                color: 'var(--text-muted)',
              }}
            >
              <Database size={11} />
              Provenance: {data_source}
            </span>
          </div>

          <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '6px 0 2px', color: 'var(--text-main)' }}>
            Review Pattern Consistency Index
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
            Statistical analysis of textual originality, rating-sentiment alignment, and temporal distribution across {usable_reviews_count} usable reviews
          </p>
        </div>

        {/* Big Score Callout */}
        {isSufficient ? (
          <div
            data-testid="review-integrity-score-display"
            style={{
              display: 'flex',
              alignItems: 'baseline',
              padding: '12px 20px',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--bg-subtle)',
              border: `1px solid ${themeBorder}`,
            }}
          >
            <span style={{ fontSize: '36px', fontWeight: 900, color: themeColor, lineHeight: 1 }}>
              {integrity_score}
            </span>
            <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-dim)', marginLeft: '4px' }}>
              / 100
            </span>
          </div>
        ) : (
          <div
            data-testid="insufficient-evidence-banner"
            style={{
              padding: '10px 18px',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              textAlign: 'right',
            }}
          >
            <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>
              Consistency Index
            </span>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#f59e0b', marginTop: '2px' }}>
              Inconclusive (&lt; 5 reviews)
            </div>
          </div>
        )}
      </div>

      {/* Summary Message */}
      <div
        style={{
          padding: '12px 16px',
          background: '#f8fafc',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          fontSize: '13px',
          color: 'var(--text-main)',
          marginBottom: '20px',
          lineHeight: 1.5,
        }}
      >
        <strong>Analytical Summary:</strong> {summary}
      </div>

      {/* Three Pillar Metric Cards */}
      {isSufficient && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '16px' }}>
          <div style={{ padding: '14px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>
                Text Originality
              </span>
              {weights_applied?.text_originality && (
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  Weight: {Math.round(weights_applied.text_originality * 100)}%
                </span>
              )}
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>
              {metric_scores.text_originality_score ?? 'N/A'}%
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>TF-IDF non-duplication</span>
          </div>

          <div style={{ padding: '14px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>
                Sentiment Alignment
              </span>
              {weights_applied?.sentiment_alignment && (
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  Weight: {Math.round(weights_applied.sentiment_alignment * 100)}%
                </span>
              )}
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
              {metric_scores.sentiment_alignment_score ?? 'N/A'}%
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Rating-text harmony</span>
          </div>

          <div style={{ padding: '14px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>
                Temporal Dispersion
              </span>
              {weights_applied?.temporal_dispersion && (
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  Weight: {Math.round(weights_applied.temporal_dispersion * 100)}%
                </span>
              )}
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#a855f7', marginTop: '4px' }}>
              {metric_scores.temporal_dispersion_score !== null && metric_scores.temporal_dispersion_score !== undefined
                ? `${metric_scores.temporal_dispersion_score}%`
                : 'Excluded'}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {metric_scores.temporal_dispersion_score !== null ? 'Publishing distribution' : 'Dates unavailable'}
            </span>
          </div>
        </div>
      )}

      {/* Disclaimers & Limitations Note */}
      <div style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Info size={13} style={{ flexShrink: 0 }} />
        <span>
          <strong>Methodology Disclosure:</strong> Higher scores represent fewer detected anomalies in available evidence. Statistical indicators evaluate observed text and date patterns and do not constitute proof of seller fraud or bot coordination.
        </span>
      </div>
    </div>
  );
}

export default ReviewIntegrityScoreCard;
