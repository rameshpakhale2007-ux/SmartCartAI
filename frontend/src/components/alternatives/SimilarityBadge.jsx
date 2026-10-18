import React from 'react';
import { Sparkles } from 'lucide-react';

export function SimilarityBadge({ score, size = 'md' }) {
  const numScore = Math.round(Number(score) || 0);

  let bg = 'rgba(100, 116, 139, 0.2)';
  let color = '#94a3b8';
  let border = 'rgba(100, 116, 139, 0.3)';
  let label = 'Low Match';

  if (numScore >= 80) {
    bg = 'rgba(16, 185, 129, 0.2)';
    color = '#10b981';
    border = 'rgba(16, 185, 129, 0.4)';
    label = 'Excellent Match';
  } else if (numScore >= 65) {
    bg = 'rgba(99, 102, 241, 0.2)';
    color = '#818cf8';
    border = 'rgba(99, 102, 241, 0.4)';
    label = 'High Similarity';
  } else if (numScore >= 45) {
    bg = 'rgba(245, 158, 11, 0.2)';
    color = '#f59e0b';
    border = 'rgba(245, 158, 11, 0.4)';
    label = 'Moderate Match';
  }

  const isSmall = size === 'sm';

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: isSmall ? '2px 7px' : '4px 10px',
        borderRadius: 'var(--radius-full)',
        background: bg,
        color: color,
        border: `1px solid ${border}`,
        fontSize: isSmall ? '11px' : '12px',
        fontWeight: 800,
      }}
      title={`Similarity Score: ${numScore}%`}
    >
      <Sparkles size={isSmall ? 11 : 13} />
      <span>{numScore}% {label}</span>
    </div>
  );
}

export default SimilarityBadge;
