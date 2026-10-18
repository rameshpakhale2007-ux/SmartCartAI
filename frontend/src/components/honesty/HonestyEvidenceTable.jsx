import React, { useState } from 'react';
import { Database, ChevronDown, ChevronUp } from 'lucide-react';
import { formatINR } from '../../utils/currency';
import { formatDate } from '../../utils/dates';

export function HonestyEvidenceTable({ observations = [] }) {
  const [expanded, setExpanded] = useState(false);

  if (!observations || observations.length === 0) return null;

  const displayList = expanded ? observations : observations.slice(-10);

  return (
    <div className="card" style={{ padding: '22px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Database size={18} style={{ color: 'var(--color-primary)' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>
            Underlying Price Snapshots ({observations.length} records)
          </h3>
        </div>

        {observations.length > 10 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="btn btn-secondary"
            style={{ fontSize: '12px', padding: '4px 10px', gap: '4px' }}
          >
            {expanded ? (
              <>
                <ChevronUp size={14} /> Show Recent 10
              </>
            ) : (
              <>
                <ChevronDown size={14} /> View All {observations.length}
              </>
            )}
          </button>
        )}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="table" style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '8px 12px', textAlign: 'left' }}>Recorded Date</th>
              <th style={{ padding: '8px 12px', textAlign: 'left' }}>Retailer</th>
              <th style={{ padding: '8px 12px', textAlign: 'right' }}>Observed Price</th>
              <th style={{ padding: '8px 12px', textAlign: 'left' }}>Data Provenance</th>
            </tr>
          </thead>
          <tbody>
            {displayList.map((obs, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '8px 12px', color: 'var(--text-main)' }}>
                  {formatDate(obs.recorded_at, true)}
                </td>
                <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>
                  {obs.retailer_name || 'Retailer'}
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#38bdf8' }}>
                  {formatINR(obs.price)}
                </td>
                <td style={{ padding: '8px 12px' }}>
                  <span
                    style={{
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '10px',
                      fontWeight: 700,
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'var(--text-dim)',
                    }}
                  >
                    {obs.source_type || 'demo'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default HonestyEvidenceTable;
