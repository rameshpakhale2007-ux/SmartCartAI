import React from 'react';
import { Layers, CheckCircle, AlertTriangle, Info, HelpCircle } from 'lucide-react';

export function HonestyFactors({ analysis }) {
  if (!analysis) return null;

  const component_scores = analysis.component_scores || analysis.scoring?.components || null;
  const scoring_weights = analysis.scoring_weights || analysis.scoring?.weights || null;
  const explanations = analysis.explanations || analysis.finding?.explanations || [];
  const is_evidence_sufficient = analysis.is_evidence_sufficient ?? analysis.has_sufficient_evidence ?? false;

  if (!is_evidence_sufficient || !component_scores) {
    return (
      <div className="card" style={{ padding: '22px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <Layers size={18} style={{ color: 'var(--color-primary)' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>Evaluation Pillars & Factors</h3>
        </div>
        <div
          style={{
            padding: '16px',
            background: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-muted)',
            fontSize: '13px',
          }}
        >
          Detailed scoring pillar breakdown is unavailable because historical price observation history is sparse for this product/window.
        </div>
      </div>
    );
  }

  const factors = [
    {
      title: 'Historical Price Consistency',
      weight: scoring_weights?.consistency || scoring_weights?.price_consistency || '35%',
      score: component_scores.consistency_score ?? component_scores.price_consistency_score ?? 0,
      desc: 'Evaluates whether current price beats or aligns with historical minimum and median benchmarks.',
    },
    {
      title: 'Reference Price Credibility',
      weight: scoring_weights?.reference_price || scoring_weights?.reference_credibility || '30%',
      score: component_scores.reference_price_score ?? component_scores.reference_credibility_score ?? 0,
      desc: 'Checks if the advertised strike-through reference price reflects observed historical reality or is inflated.',
    },
    {
      title: 'Pre-Promotion Price Movement',
      weight: scoring_weights?.pre_promo_hike || scoring_weights?.pre_promo_stability || '20%',
      score: component_scores.pre_promo_hike_score ?? component_scores.pre_promo_stability_score ?? 0,
      desc: 'Inspects whether an artificial price surge was introduced shortly before discounting.',
    },
    {
      title: 'Evidence Density & Coverage',
      weight: scoring_weights?.data_quality || '15%',
      score: component_scores.data_quality_score ?? 0,
      desc: 'Evaluates the completeness, frequency, and depth of verified observation snapshots.',
    },
  ];

  return (
    <div className="card" style={{ padding: '22px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <Layers size={18} style={{ color: 'var(--color-primary)' }} />
        <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>Evaluation Pillars & Evidence Factors</h3>
      </div>

      {/* 4 Pillars Progress Bars */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '14px',
          marginBottom: '20px',
        }}
      >
        {factors.map((factor, idx) => {
          const s = Math.round(factor.score);
          const color = s >= 80 ? '#10b981' : s >= 60 ? '#38bdf8' : s >= 40 ? '#f59e0b' : '#f87171';
          return (
            <div
              key={idx}
              style={{
                padding: '14px',
                background: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                  {factor.title}
                </span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>
                  Weight: {factor.weight}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div
                  style={{
                    flex: 1,
                    height: '6px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: 'var(--radius-full)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${s}%`,
                      height: '100%',
                      background: color,
                      borderRadius: 'var(--radius-full)',
                    }}
                  />
                </div>
                <span style={{ fontSize: '14px', fontWeight: 800, color: color, minWidth: '38px', textAlign: 'right' }}>
                  {s}/100
                </span>
              </div>

              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-dim)', lineHeight: 1.4 }}>
                {factor.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* Explanations List */}
      {explanations && explanations.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
            Supporting Evidence Findings:
          </div>
          <ul
            style={{
              margin: 0,
              paddingLeft: '18px',
              fontSize: '13px',
              color: 'var(--text-main)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              lineHeight: 1.5,
            }}
          >
            {explanations.map((exp, idx) => (
              <li key={idx}>{exp}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default HonestyFactors;
