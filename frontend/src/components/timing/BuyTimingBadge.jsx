import React from 'react';
import {
  CheckCircle2,
  Clock,
  TrendingDown,
  AlertTriangle,
  HelpCircle,
  AlertCircle
} from 'lucide-react';

export function BuyTimingBadge({ recommendation, label, size = 'normal' }) {
  const configs = {
    GOOD_TIME_TO_BUY: {
      color: '#34d399',
      bg: 'rgba(52, 211, 153, 0.12)',
      border: 'rgba(52, 211, 153, 0.3)',
      icon: TrendingDown,
      defaultLabel: 'Good Time to Buy',
    },
    CONSIDER_WAITING: {
      color: '#fbbf24',
      bg: 'rgba(251, 191, 36, 0.12)',
      border: 'rgba(251, 191, 36, 0.3)',
      icon: Clock,
      defaultLabel: 'Consider Waiting',
    },
    PRICE_IS_TYPICAL: {
      color: '#38bdf8',
      bg: 'rgba(56, 189, 248, 0.12)',
      border: 'rgba(56, 189, 248, 0.3)',
      icon: CheckCircle2,
      defaultLabel: 'Price Is Typical',
    },
    INSUFFICIENT_DATA: {
      color: '#94a3b8',
      bg: 'rgba(148, 163, 184, 0.12)',
      border: 'rgba(148, 163, 184, 0.3)',
      icon: HelpCircle,
      defaultLabel: 'Insufficient Evidence',
    },
    CURRENT_PRICE_UNAVAILABLE: {
      color: '#f87171',
      bg: 'rgba(248, 113, 113, 0.12)',
      border: 'rgba(248, 113, 113, 0.3)',
      icon: AlertCircle,
      defaultLabel: 'Current Price Unavailable',
    },
  };

  const currentConfig = configs[recommendation] || configs.INSUFFICIENT_DATA;
  const Icon = currentConfig.icon;
  const displayLabel = label || currentConfig.defaultLabel;

  const isLarge = size === 'large';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isLarge ? '8px' : '6px',
        padding: isLarge ? '6px 14px' : '4px 10px',
        borderRadius: 'var(--radius-full)',
        fontSize: isLarge ? '13px' : '11px',
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        background: currentConfig.bg,
        color: currentConfig.color,
        border: `1px solid ${currentConfig.border}`,
      }}
      aria-label={`Buy timing: ${displayLabel}`}
    >
      <Icon size={isLarge ? 16 : 13} />
      <span>{displayLabel}</span>
    </span>
  );
}

export default BuyTimingBadge;
