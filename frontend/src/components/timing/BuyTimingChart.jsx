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
import { LineChart as ChartIcon } from 'lucide-react';

export function BuyTimingChart({
  observations = [],
  currentPrice = null,
  historicalMedian = null,
  lowestObserved = null,
  days = 30,
}) {
  if (!observations || observations.length === 0) {
    return (
      <div className="card" style={{ padding: '30px', textAlign: 'center', marginBottom: '24px' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
          No historical price points available to graph for the selected {days}-day observation window.
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
    };
  });

  const prices = chartData.map((d) => d.price);
  if (currentPrice) prices.push(currentPrice);

  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const padding = (maxP - minP) * 0.1 || minP * 0.05;
  const yMin = Math.floor(Math.max(0, minP - padding));
  const yMax = Math.ceil(maxP + padding);

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
            fontSize: '12px',
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px' }}>
            {formatDate(data.date, true)}
          </div>
          <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '14px', marginBottom: '2px' }}>
            {formatINR(data.price)}
          </div>
          <div style={{ color: 'var(--color-primary)', fontSize: '11px' }}>
            {data.retailer}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ChartIcon size={18} style={{ color: 'var(--color-primary)' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>
            Historical Price Trajectory ({days} Days)
          </h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11px', color: 'var(--text-dim)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '10px', height: '2px', background: '#38bdf8' }} /> Median Reference
          </span>
          {currentPrice && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '10px', height: '2px', background: '#34d399' }} /> Current Price
            </span>
          )}
        </div>
      </div>

      <div style={{ width: '100%', height: '280px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="timingPriceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
            <XAxis
              dataKey="displayDate"
              stroke="var(--text-dim)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="var(--text-dim)"
              fontSize={11}
              domain={[yMin, yMax]}
              tickFormatter={(v) => `₹${Math.round(v / 1000)}k`}
              tickLine={false}
              axisLine={false}
              width={50}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Historical Median Reference Line */}
            {historicalMedian && (
              <ReferenceLine
                y={historicalMedian}
                stroke="#38bdf8"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `Median: ${formatINR(historicalMedian)}`,
                  fill: '#38bdf8',
                  fontSize: 10,
                  position: 'insideTopLeft',
                }}
              />
            )}

            {/* Current Price Reference Line */}
            {currentPrice && (
              <ReferenceLine
                y={currentPrice}
                stroke="#34d399"
                strokeDasharray="2 2"
                strokeWidth={2}
                label={{
                  value: `Current: ${formatINR(currentPrice)}`,
                  fill: '#34d399',
                  fontSize: 10,
                  position: 'insideBottomRight',
                }}
              />
            )}

            <Area
              type="monotone"
              dataKey="price"
              stroke="#38bdf8"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#timingPriceGradient)"
              activeDot={{ r: 5, fill: '#ffffff', stroke: '#38bdf8', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default BuyTimingChart;
