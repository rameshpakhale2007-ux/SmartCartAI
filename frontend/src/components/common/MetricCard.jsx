import React from 'react';
import { ArrowUpRight } from 'lucide-react';

export function MetricCard({
  title,
  value,
  subtext,
  icon: Icon,
  trend,
  colorTheme = 'blue',
  tag,
  onActionClick,
}) {
  return (
    <div className="metric-card">
      <div className="metric-card-top">
        {Icon ? (
          <div className={`metric-icon-box ${colorTheme}`}>
            <Icon size={20} strokeWidth={2.2} />
          </div>
        ) : (
          <div style={{ width: 44, height: 44 }} />
        )}

        <button
          className="metric-action-btn"
          aria-label={`View details for ${title}`}
          onClick={onActionClick}
          type="button"
        >
          <ArrowUpRight size={16} strokeWidth={2} />
        </button>
      </div>

      <span className="metric-title">{title}</span>

      <div className="metric-value-row">
        <span className="metric-value">{value}</span>
        {trend && (
          <span
            className={`metric-trend-badge ${
              String(trend).includes('-') || String(trend).includes('↓')
                ? 'negative'
                : 'positive'
            }`}
          >
            {trend}
          </span>
        )}
      </div>

      {(subtext || tag) && (
        <div className="metric-bottom-row">
          <span className="metric-subtext">{subtext}</span>
          {tag && <span className="metric-pill-tag">{tag}</span>}
        </div>
      )}
    </div>
  );
}

export default MetricCard;
