import React from 'react';
import {
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Info,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export function ReviewTemporalBurstChart({ temporalAnalysis }) {
  if (!temporalAnalysis) return null;

  const {
    temporal_analysis_available = false,
    reason,
    daily_volume_timeline = [],
    burst_periods = [],
    has_burst_detected = false,
    calendar_span_days,
    average_reviews_per_day,
  } = temporalAnalysis;

  if (!temporal_analysis_available) {
    return (
      <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Clock size={16} style={{ color: 'var(--text-muted)' }} />
          <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
            Temporal Distribution & Publication Velocity
          </h3>
        </div>
        <div
          style={{
            padding: '12px 14px',
            background: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            fontSize: '12px',
            color: 'var(--text-muted)',
            lineHeight: 1.5,
          }}
        >
          <strong>Temporal Analysis Unavailable:</strong> {reason || 'Insufficient or missing review dates in this corpus to calculate daily publishing velocity.'}
        </div>
      </div>
    );
  }

  // Format date strings for chart
  const chartData = daily_volume_timeline.map((item) => ({
    date: item.date,
    displayDate: item.date.slice(5), // MM-DD
    count: item.count,
  }));

  return (
    <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 2px', color: 'var(--text-main)' }}>
            Temporal Distribution & Review Velocity
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
            Daily review volume over {calendar_span_days} days (average: {average_reviews_per_day} reviews/day)
          </p>
        </div>

        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '11px',
            fontWeight: 700,
            background: has_burst_detected ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            color: has_burst_detected ? '#fbbf24' : '#34d399',
            border: `1px solid ${has_burst_detected ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
          }}
        >
          {has_burst_detected ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
          {has_burst_detected ? `${burst_periods.length} Volume Burst(s) Detected` : 'Normal Temporal Velocity'}
        </span>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div style={{ height: '180px', width: '100%', marginBottom: '16px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="displayDate" stroke="var(--text-dim)" fontSize={11} tickLine={false} />
              <YAxis allowDecimals={false} stroke="var(--text-dim)" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-focus)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '12px',
                }}
                formatter={(val) => [`${val} reviews`, 'Daily Count']}
                labelFormatter={(lbl, items) => items[0]?.payload?.date || lbl}
              />
              <Bar dataKey="count" fill="#818cf8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Burst Warnings */}
      {burst_periods.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {burst_periods.map((burst, idx) => (
            <div
              key={idx}
              style={{
                fontSize: '12px',
                color: '#fbbf24',
                background: 'rgba(245, 158, 11, 0.08)',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertTriangle size={14} style={{ flexShrink: 0 }} />
              <span>{burst.note}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ReviewTemporalBurstChart;
