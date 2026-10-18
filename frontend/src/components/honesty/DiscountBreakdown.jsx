import React from 'react';
import { Tag, TrendingDown, AlertCircle, Info, CheckCircle2 } from 'lucide-react';
import { formatINR } from '../../utils/currency';

export function DiscountBreakdown({ analysis }) {
  if (!analysis) return null;

  const currentPrice = analysis.current_price ?? analysis.current_offer?.price ?? null;
  const refPrice = analysis.advertised_reference_price ?? analysis.current_offer?.reference_price ?? null;
  const advDiscountPct = analysis.advertised_discount_pct !== undefined && analysis.advertised_discount_pct !== null
    ? Math.round(Number(analysis.advertised_discount_pct) * 10) / 10
    : (refPrice && currentPrice && refPrice > currentPrice ? Math.round(((refPrice - currentPrice) / refPrice) * 1000) / 10 : 0);
  const advSavings = analysis.advertised_savings ?? (refPrice && currentPrice && refPrice > currentPrice ? refPrice - currentPrice : 0);

  const benchmarks = analysis.benchmarks || null;
  const medianPrice = benchmarks?.historical_median ?? benchmarks?.median_price ?? null;
  const maxPrice = benchmarks?.historical_max ?? benchmarks?.max_price ?? null;
  const days = analysis.days || 30;

  const rawRealPct = analysis.real_discount_vs_median_pct ?? analysis.median_price_discount_pct ?? (medianPrice && currentPrice && currentPrice < medianPrice ? ((medianPrice - currentPrice) / medianPrice) * 100 : 0);
  const realDiscountPct = Math.round(Number(rawRealPct) * 10) / 10;
  const realSavings = analysis.real_savings_vs_median ?? (medianPrice && currentPrice && currentPrice < medianPrice ? medianPrice - currentPrice : 0);

  const isInflatedRef =
    refPrice &&
    maxPrice &&
    refPrice > maxPrice * 1.05;

  return (
    <div className="card" style={{ padding: '22px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <Tag size={18} style={{ color: 'var(--color-primary)' }} />
        <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>
          Advertised Discount vs. Historical Reality
        </h3>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '16px',
          marginBottom: '16px',
        }}
      >
        {/* Advertised Claim */}
        <div
          style={{
            padding: '16px',
            background: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Claimed Retailer Promotion
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '6px' }}>
            <span style={{ fontSize: '24px', fontWeight: 900, color: '#10b981' }}>
              {advDiscountPct !== null ? `${advDiscountPct}%` : '0%'}
            </span>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#10b981' }}>
              OFF
            </span>
            {advSavings > 0 && (
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                (Save {formatINR(advSavings)})
              </span>
            )}
          </div>

          <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '8px', lineHeight: 1.4 }}>
            Calculated from advertised reference price ({refPrice ? formatINR(refPrice) : 'N/A'}) to current price ({currentPrice ? formatINR(currentPrice) : 'N/A'}).
          </div>
        </div>

        {/* Real Historical Comparison */}
        <div
          style={{
            padding: '16px',
            background: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Savings vs. {days}-Day Median Price
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '6px' }}>
            <span
              style={{
                fontSize: '24px',
                fontWeight: 900,
                color: realSavings > 0 ? '#38bdf8' : 'var(--text-muted)',
              }}
            >
              {realDiscountPct > 0 ? `${realDiscountPct}%` : 'No Median Discount'}
            </span>
            {realDiscountPct > 0 && (
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#38bdf8' }}>
                Lower
              </span>
            )}
            {realSavings > 0 && (
              <span style={{ fontSize: '13px', color: '#38bdf8' }}>
                (Save {formatINR(realSavings)})
              </span>
            )}
          </div>

          <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '8px', lineHeight: 1.4 }}>
            {medianPrice ? (
              <>
                Measured against actual verified median ({formatINR(medianPrice)}) over {days} days of recorded transaction history.
              </>
            ) : (
              'Historical median unavailable due to sparse observation history.'
            )}
          </div>
        </div>
      </div>

      {/* Analytical Commentary */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          padding: '12px 14px',
          borderRadius: 'var(--radius-sm)',
          background: isInflatedRef ? 'rgba(245, 158, 11, 0.1)' : 'rgba(99, 102, 241, 0.08)',
          border: isInflatedRef ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(99, 102, 241, 0.2)',
          fontSize: '12px',
          color: isInflatedRef ? '#fbbf24' : 'var(--text-main)',
          lineHeight: 1.5,
        }}
      >
        <Info size={16} style={{ flexShrink: 0, marginTop: '2px', color: isInflatedRef ? '#f59e0b' : 'var(--color-primary)' }} />
        <div>
          <strong>Pricing Provenance Note: </strong>
          The advertised discount percentage is derived directly from the strike-through reference price supplied by the merchant. In contrast, SmartCart AI benchmarks evaluate current offers against actual observed historical selling prices. A high strike-through discount does not necessarily represent an unprecedented historical deal.
        </div>
      </div>
    </div>
  );
}

export default DiscountBreakdown;
