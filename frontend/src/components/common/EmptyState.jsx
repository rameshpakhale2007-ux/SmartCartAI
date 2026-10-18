import React from 'react';
import { PackageOpen } from 'lucide-react';

export function EmptyState({
  title = 'No Data Available',
  description = 'There are no records matching your current filter or request.',
  action,
}) {
  return (
    <div className="state-container">
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'var(--bg-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-dim)',
          marginBottom: '16px',
        }}
      >
        <PackageOpen size={28} />
      </div>
      <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
        {title}
      </h4>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '400px', lineHeight: 1.5 }}>
        {description}
      </p>
      {action && <div style={{ marginTop: '16px' }}>{action}</div>}
    </div>
  );
}

export default EmptyState;
