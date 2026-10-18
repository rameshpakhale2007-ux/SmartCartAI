import React from 'react';
import { Sliders } from 'lucide-react';

export function ProductSpecifications({ specs = {} }) {
  const entries = Object.entries(specs || {});

  if (entries.length === 0) {
    return (
      <div style={{ color: 'var(--text-dim)', fontSize: '13px', padding: '12px 0' }}>
        No technical specifications provided for this item.
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '12px',
      }}
    >
      {entries.map(([key, val]) => (
        <div
          key={key}
          style={{
            padding: '10px 14px',
            background: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {key}
          </div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>
            {String(val)}
          </div>
        </div>
      ))}
    </div>
  );
}

export default ProductSpecifications;
