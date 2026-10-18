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

export function PriceHistoryChart({ observations = [], statistics = null }) {
  if (!observations || observations.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
        No historical price observations available to chart.
      </div>
    );
  }

  // Format data points for Recharts
  const chartData = observations.map((obs) => {
    const dateObj = new Date(obs.recorded_at);
    return {
      date: obs.recorded_at,
      displayDate: dateObj.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      price: obs.price,
      retailer: obs.retailer_name,
      sourceType: obs.source_type,
    };
  });

  const minPrice = statistics?.min_price ?? Math.min(...chartData.map((d) => d.price));
  const maxPrice = statistics?.max_price ?? Math.max(...chartData.map((d) => d.price));
  const medianPrice = statistics?.median_price ?? null;

  // Compute padded Y-axis domain
  const yPadding = (maxPrice - minPrice) * 0.1 || minPrice * 0.05;
  const yMin = Math.floor(Math.max(0, minPrice - yPadding));
  const yMax = Math.ceil(maxPrice + yPadding);

  const CustomTooltip = ({ active, payload, label }) => {
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
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#2563eb' }}>
            {formatINR(data.price)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Retailer: <strong>{data.retailer}</strong>
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '4px' }}>
            Provenance: Stored Historical Observation ({data.sourceType})
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height: 360, marginTop: '10px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
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
          
          {medianPrice && (
            <ReferenceLine
              y={medianPrice}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              label={{
                value: `Median: ${formatINR(medianPrice)}`,
                fill: '#f59e0b',
                fontSize: 11,
                position: 'top',
              }}
            />
          )}

          {minPrice && (
            <ReferenceLine
              y={minPrice}
              stroke="#10b981"
              strokeDasharray="2 2"
              label={{
                value: `All-Time Low: ${formatINR(minPrice)}`,
                fill: '#10b981',
                fontSize: 11,
                position: 'bottom',
              }}
            />
          )}

          <Area
            type="monotone"
            dataKey="price"
            stroke="#6366f1"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#priceGradient)"
            dot={{ r: 3, fill: '#6366f1', strokeWidth: 1, stroke: '#ffffff' }}
            activeDot={{ r: 6, fill: '#38bdf8', stroke: '#ffffff', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default PriceHistoryChart;
