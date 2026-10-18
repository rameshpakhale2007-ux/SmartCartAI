import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { formatINR } from '../../utils/currency';
import { formatDate } from '../../utils/dates';
import { LineChart as ChartIcon, AlertCircle, Info } from 'lucide-react';

export function HistoricalPriceEvidence({ analysis }) {
  if (!analysis) return null;

  const observations = analysis.observations || [];
  const benchmarks = analysis.benchmarks || null;
  const current_price = analysis.current_price ?? analysis.current_offer?.price ?? null;
  const advertised_reference_price = analysis.advertised_reference_price ?? analysis.current_offer?.reference_price ?? null;
  const days = analysis.days || 30;
  const is_evidence_sufficient = analysis.is_evidence_sufficient ?? analysis.has_sufficient_evidence ?? false;

  if (!is_evidence_sufficient || !observations || observations.length === 0) {
    return (
      <div className="card" style={{ padding: '24px', marginBottom: '24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#f59e0b', marginBottom: '8px' }}>
          <AlertCircle size={20} />
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>Insufficient Historical Price Evidence</h3>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '540px', margin: '0 auto', lineHeight: 1.5 }}>
          SmartCart AI does not interpolate or invent missing historical prices. At least 3 verified historical price snapshots are required to plot an objective price trajectory and evaluate discount honesty.
        </p>
      </div>
    );
  }

  const chartData = observations.map((obs) => {
    const d = new Date(obs.recorded_at);
    return {
      date: obs.recorded_at,
      displayDate: d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      price: obs.price,
      retailer: obs.retailer_name,
      sourceType: obs.source_type,
    };
  });

  const allPrices = chartData.map((d) => d.price);
  if (current_price) allPrices.push(current_price);
  if (advertised_reference_price) allPrices.push(advertised_reference_price);

  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const yPadding = (maxPrice - minPrice) * 0.1 || minPrice * 0.05;
  const yMin = Math.floor(Math.max(0, minPrice - yPadding));
  const yMax = Math.ceil(maxPrice + yPadding);

  const medianPrice = benchmarks?.historical_median ?? benchmarks?.median_price;

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '10px 14px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px' }}>
            {formatDate(data.date, true)}
          </div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#38bdf8' }}>
            {formatINR(data.price)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Retailer: <strong>{data.retailer}</strong>
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '4px' }}>
            Stored Evidence ({data.sourceType})
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card" style={{ padding: '22px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ChartIcon size={18} style={{ color: 'var(--color-primary)' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>
            {days}-Day Historical Price Observations & Benchmarks
          </h3>
        </div>

        {/* Legend pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '10px', height: '10px', background: '#6366f1', borderRadius: '2px' }} />
            Observed Price
          </span>
          {medianPrice && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '10px', height: '2px', background: '#f59e0b', borderTop: '2px dashed #f59e0b' }} />
              Median ({formatINR(medianPrice)})
            </span>
          )}
          {advertised_reference_price && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '10px', height: '2px', background: '#f87171', borderTop: '2px dashed #f87171' }} />
              Claimed MRP ({formatINR(advertised_reference_price)})
            </span>
          )}
        </div>
      </div>

      <div style={{ width: '100%', height: 340, marginTop: '10px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 12, right: 24, left: 16, bottom: 0 }}>
            <defs>
              <linearGradient id="honestyPriceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
            <XAxis
              dataKey="displayDate"
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickLine={{ stroke: '#334155' }}
            />
            <YAxis
              domain={[yMin, yMax]}
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickFormatter={(val) => `₹${Number(val).toLocaleString('en-IN')}`}
              tickLine={{ stroke: '#334155' }}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Advertised reference price line */}
            {advertised_reference_price && (
              <ReferenceLine
                y={advertised_reference_price}
                stroke="#f87171"
                strokeDasharray="4 4"
                label={{
                  value: `Ref MRP: ${formatINR(advertised_reference_price)}`,
                  fill: '#f87171',
                  fontSize: 11,
                  position: 'top',
                }}
              />
            )}

            {/* Historical median line */}
            {medianPrice && (
              <ReferenceLine
                y={medianPrice}
                stroke="#f59e0b"
                strokeDasharray="3 3"
                label={{
                  value: `Median: ${formatINR(medianPrice)}`,
                  fill: '#f59e0b',
                  fontSize: 11,
                  position: 'bottom',
                }}
              />
            )}

            {/* Current Price line */}
            {current_price && (
              <ReferenceLine
                y={current_price}
                stroke="#38bdf8"
                strokeDasharray="2 2"
                label={{
                  value: `Current: ${formatINR(current_price)}`,
                  fill: '#38bdf8',
                  fontSize: 11,
                  position: 'insideBottomRight',
                }}
              />
            )}

            <Area
              type="monotone"
              dataKey="price"
              stroke="#6366f1"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#honestyPriceGrad)"
              dot={{ r: 3, fill: '#6366f1', strokeWidth: 1, stroke: '#ffffff' }}
              activeDot={{ r: 6, fill: '#38bdf8', stroke: '#ffffff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default HistoricalPriceEvidence;
