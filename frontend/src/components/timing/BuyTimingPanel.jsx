import React from 'react';
import {
  Calendar,
  Clock,
  Layers,
  Info,
  Database,
  ArrowUpRight,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { formatINR } from '../../utils/currency';
import BuyTimingBadge from './BuyTimingBadge';

export function BuyTimingPanel({
  timingData,
  daysWindow = 30,
  onWindowChange,
  loading = false,
}) {
  if (!timingData) return null;

  const {
    recommendation,
    recommendation_label,
    explanation,
    current_price,
    current_price_source,
    is_live_offer,
    data_status,
    observation_window_days,
    valid_observation_count,
    historical_metrics,
  } = timingData;

  const windows = [30, 60, 90, 180, 365];

  const recCode = typeof recommendation === 'object' && recommendation !== null
    ? recommendation.category
    : recommendation;
  const recLabel = recommendation_label || (typeof recommendation === 'object' && recommendation !== null
    ? recommendation.label
    : null);
  const expl = explanation || (typeof recommendation === 'object' && recommendation !== null
    ? [recommendation.headline, recommendation.summary].filter(Boolean).join(' ')
    : '');

  const metrics = timingData.historical_metrics || timingData.metrics || {};
  const currentPrice = current_price ?? metrics.current_price ?? null;
  const lowest = metrics.lowest_observed_price ?? currentPrice;
  const highest = metrics.highest_observed_price ?? currentPrice;
  const median = metrics.median_historical_price ?? metrics.historical_median ?? currentPrice;
  const range = metrics.historical_price_range ?? metrics.price_spread ?? (highest !== null && lowest !== null ? highest - lowest : 0);
  const windowDays = observation_window_days || timingData.window_days || daysWindow;
  const obsCount = valid_observation_count ?? metrics.observation_count ?? 0;
  const dataStatus = data_status || timingData.evidence?.data_status || 'SUFFICIENT';
  const obsAge = metrics.observation_age_days ?? metrics.most_recent_observation_age_days;

  // Percentage position within range (0% = at lowest, 100% = at highest)
  let rangePos = 50;
  if (range > 0 && currentPrice !== null && currentPrice !== undefined) {
    rangePos = Math.min(100, Math.max(0, Math.round(((currentPrice - lowest) / range) * 100)));
  }

  return (
    <section
      data-testid="buy-timing-panel"
      aria-label="Purchase Timing Assessment"
      className="card"
      style={{ padding: '24px', marginBottom: '24px' }}
    >
      {/* Header Row: Title & Window Selector */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Clock size={20} style={{ color: 'var(--color-primary)' }} />
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0 }}>
              Purchase Timing Assessment
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
              Evaluated over {windowDays} days of verified market observations
            </span>
          </div>
        </div>

        {/* Window Selector Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)' }}>
            Observation Window
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} role="group" aria-label="Observation Window Selector">
            {windows.map((w) => (
              <button
                key={w}
                type="button"
                disabled={loading}
                onClick={() => onWindowChange && onWindowChange(w)}
                className={`btn btn-sm ${daysWindow === w ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  fontSize: '11px',
                  padding: '4px 10px',
                  fontWeight: daysWindow === w ? 700 : 500,
                }}
                aria-pressed={daysWindow === w}
              >
                {w}D
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Recommendation Banner */}
      <div
        style={{
          padding: '18px 20px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-subtle)',
          border: '1px solid var(--border-subtle)',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BuyTimingBadge
              recommendation={recCode}
              label={recLabel}
              size="large"
            />
            {dataStatus === 'SUFFICIENT' ? (
              <span style={{ fontSize: '11px', color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={13} /> {obsCount} Verified Snapshots
              </span>
            ) : dataStatus === 'STALE' ? (
              <span style={{ fontSize: '11px', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertTriangle size={13} /> Stale Observations ({obsAge}d old)
              </span>
            ) : (
              <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                {obsCount} Observation(s)
              </span>
            )}
          </div>

          {currentPrice !== null && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                Current Observed Price
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)' }}>
                {formatINR(currentPrice)}
              </div>
            </div>
          )}
        </div>

        <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.6, color: 'var(--text-main)' }}>
          {expl}
        </p>

        {current_price_source && (
          <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-dim)' }}>
            Source: {current_price_source}
          </div>
        )}
      </div>

      {/* Key Benchmark Metrics Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <div style={{ padding: '12px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
            <span>Lowest Observed</span> {windowDays ? `(${windowDays}D)` : ''}
          </span>
          <div style={{ fontSize: '17px', fontWeight: 800, color: '#34d399', marginTop: '4px' }}>
            {lowest ? formatINR(lowest) : 'N/A'}
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Window minimum</span>
        </div>

        <div style={{ padding: '12px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
            <span>Historical Median</span>
          </span>
          <div style={{ fontSize: '17px', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>
            {median ? formatINR(median) : 'N/A'}
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Baseline mid-point</span>
        </div>

        <div style={{ padding: '12px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
            <span>Highest Observed</span> {windowDays ? `(${windowDays}D)` : ''}
          </span>
          <div style={{ fontSize: '17px', fontWeight: 800, color: '#f87171', marginTop: '4px' }}>
            {highest ? formatINR(highest) : 'N/A'}
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Window peak</span>
        </div>

        <div style={{ padding: '12px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
            <span>Observed Price Range</span>
          </span>
          <div style={{ fontSize: '17px', fontWeight: 800, color: '#818cf8', marginTop: '4px' }}>
            {formatINR(range || 0)}
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Spread across window</span>
        </div>
      </div>

      {/* Visual Historical Range Positioning Bar */}
      {range > 0 && currentPrice !== null && (
        <div style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-dim)', marginBottom: '6px' }}>
            <span>Window Low: {formatINR(lowest)}</span>
            <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
              Current Price: {formatINR(currentPrice)} ({rangePos}% of range)
            </span>
            <span>Window Peak: {formatINR(highest)}</span>
          </div>
          <div
            style={{
              position: 'relative',
              height: '8px',
              borderRadius: 'var(--radius-full)',
              background: 'linear-gradient(to right, #34d399, #38bdf8, #fbbf24, #f87171)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '-4px',
                left: `${rangePos}%`,
                transform: 'translateX(-50%)',
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: '#ffffff',
                border: '3px solid var(--color-primary)',
                boxShadow: '0 0 6px rgba(0,0,0,0.4)',
              }}
              title={`Current price is at ${rangePos}% of observed ${observation_window_days}-day range`}
            />
          </div>
        </div>
      )}
    </section>
  );
}

export default BuyTimingPanel;
