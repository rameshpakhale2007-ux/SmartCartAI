import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from 'recharts';
import { formatINR } from '../../utils/currency';
import { TrendingDown, LineChart as ChartIcon } from 'lucide-react';

export function ResaleForecastChart({ forecastData }) {
  if (!forecastData || !forecastData.trajectory || forecastData.trajectory.length === 0) {
    return null;
  }

  const {
    trajectory = [],
    reference_price,
    ownership_months,
    estimated_resale_value,
  } = forecastData;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '10px 14px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
            fontSize: '12px',
          }}
        >
          <div style={{ fontWeight: 800, color: 'var(--text-main)', marginBottom: '6px' }}>
            Horizon: {label} Months
          </div>
          {payload.map((entry, idx) => (
            <div key={idx} style={{ color: entry.color, display: 'flex', justifyContent: 'space-between', gap: '14px', marginBottom: '2px' }}>
              <span>{entry.name}:</span>
              <strong>{formatINR(entry.value)}</strong>
            </div>
          ))}
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
            Depreciation Trajectory & Future Resale Projections
          </h3>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Reference Price: <strong>{formatINR(reference_price)}</strong>
        </div>
      </div>

      <div style={{ width: '100%', height: 320, marginTop: '10px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trajectory} margin={{ top: 10, right: 24, left: 14, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
            <XAxis
              dataKey="months"
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickFormatter={(v) => `${v}M`}
              tickLine={{ stroke: '#334155' }}
            />
            <YAxis
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickFormatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`}
              tickLine={{ stroke: '#334155' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
              iconType="circle"
            />
            {reference_price && (
              <ReferenceLine
                y={reference_price}
                stroke="#64748b"
                strokeDasharray="4 4"
                label={{
                  value: `Ref: ${formatINR(reference_price)}`,
                  fill: '#94a3b8',
                  fontSize: 10,
                  position: 'insideTopLeft',
                }}
              />
            )}
            <Line
              type="monotone"
              dataKey="optimistic"
              name="Optimistic Resale"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 3, fill: '#10b981' }}
            />
            <Line
              type="monotone"
              dataKey="expected"
              name="Expected Baseline"
              stroke="#38bdf8"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#38bdf8' }}
            />
            <Line
              type="monotone"
              dataKey="pessimistic"
              name="Pessimistic Resale"
              stroke="#f87171"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={{ r: 3, fill: '#f87171' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default ResaleForecastChart;
