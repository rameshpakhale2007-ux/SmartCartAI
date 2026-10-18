import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Star, AlertCircle, CheckCircle2, TrendingUp } from 'lucide-react';

export function ReviewDistributionChart({ sentimentAnalysis }) {
  if (!sentimentAnalysis) return null;

  const {
    rating_distribution = {},
    sentiment_distribution = {},
    divergent_reviews = [],
    divergent_count = 0,
    divergence_ratio = 0.0,
  } = sentimentAnalysis;

  // Prepare rating data for BarChart
  const ratingData = [5, 4, 3, 2, 1].map((stars) => ({
    stars: `${stars} ★`,
    count: rating_distribution[String(stars)] || 0,
    starsNum: stars,
  }));

  const totalRated = ratingData.reduce((acc, curr) => acc + curr.count, 0);

  const totalSentiment =
    (sentiment_distribution.POSITIVE || 0) +
    (sentiment_distribution.NEUTRAL || 0) +
    (sentiment_distribution.NEGATIVE || 0);

  return (
    <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 2px', color: 'var(--text-main)' }}>
            Rating & Text Sentiment Analysis
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
            Observed star ratings contrasted with rule-based text sentiment polarity
          </p>
        </div>

        {divergent_count > 0 && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '11px',
              fontWeight: 700,
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#f87171',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}
          >
            <AlertCircle size={12} />
            {divergent_count} Contradictory Review(s) ({Math.round(divergence_ratio * 100)}%)
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
        {/* Rating Breakdown Bars */}
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '10px' }}>
            Reported Star Distribution ({totalRated} Total)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {ratingData.map((item) => {
              const pct = totalRated > 0 ? Math.round((item.count / totalRated) * 100) : 0;
              return (
                <div key={item.stars} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                  <span style={{ width: '32px', fontWeight: 600, color: 'var(--text-muted)' }}>
                    {item.stars}
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: '8px',
                      background: 'var(--bg-subtle)',
                      borderRadius: 'var(--radius-full)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: item.starsNum >= 4 ? '#10b981' : item.starsNum === 3 ? '#fbbf24' : '#ef4444',
                        borderRadius: 'var(--radius-full)',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                  <span style={{ width: '45px', textAlign: 'right', color: 'var(--text-dim)', fontSize: '11px' }}>
                    {item.count} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sentiment Polarity Distribution */}
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '10px' }}>
            Text Sentiment Polarity ({totalSentiment} Analyzed)
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
            <div style={{ padding: '10px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16, 185, 129, 0.2)', textAlign: 'center' }}>
              <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>Positive</span>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
                {sentiment_distribution.POSITIVE || 0}
              </div>
            </div>

            <div style={{ padding: '10px', background: 'rgba(148, 163, 184, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(148, 163, 184, 0.2)', textAlign: 'center' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>Neutral</span>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#94a3b8', marginTop: '2px' }}>
                {sentiment_distribution.NEUTRAL || 0}
              </div>
            </div>

            <div style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.2)', textAlign: 'center' }}>
              <span style={{ fontSize: '11px', color: '#f87171', fontWeight: 700 }}>Negative</span>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#f87171', marginTop: '2px' }}>
                {sentiment_distribution.NEGATIVE || 0}
              </div>
            </div>
          </div>

          {/* Divergence description */}
          {divergent_count > 0 ? (
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', lineHeight: 1.5 }}>
              <strong>Divergence Flag:</strong> {divergent_count} review(s) show a mismatch between assigned star ratings and the text's expressed polarity (e.g., 5-star ratings with severe defect complaints, or 1-star ratings with praise).
            </div>
          ) : (
            <div style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={13} />
              <span>No severe rating-sentiment contradictions detected in the analyzed sample.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ReviewDistributionChart;
