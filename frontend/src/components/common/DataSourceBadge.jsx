import React from 'react';
import { Database, ShieldCheck, Sparkles, FileText } from 'lucide-react';

export function DataSourceBadge({ sourceType = 'demo', size = 'normal' }) {
  const normalized = (sourceType || '').toLowerCase();

  let label = 'Demo Fixture';
  let badgeClass = 'badge-demo';
  let Icon = Sparkles;

  if (normalized === 'api' || normalized === 'live') {
    label = 'Verified Live API';
    badgeClass = 'badge-live';
    Icon = ShieldCheck;
  } else if (normalized === 'dataset' || normalized === 'csv') {
    label = 'Imported Dataset';
    badgeClass = 'badge-dataset';
    Icon = Database;
  } else if (normalized === 'manual') {
    label = 'Manual Entry';
    badgeClass = 'badge-dataset';
    Icon = FileText;
  }

  const isSmall = size === 'small';

  return (
    <span
      className={`badge ${badgeClass}`}
      title={`Data Origin: ${label}`}
      style={{
        fontSize: isSmall ? '10px' : '11px',
        padding: isSmall ? '2px 6px' : '3px 8px',
      }}
    >
      <Icon size={isSmall ? 10 : 12} />
      {label}
    </span>
  );
}

export default DataSourceBadge;
