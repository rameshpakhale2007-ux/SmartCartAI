import React from 'react';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Play,
  Power,
  Trash2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { formatINR } from '../../utils/currency';
import { formatDate, formatRelativeTime } from '../../utils/dates';

export function AlertList({
  alerts = [],
  onToggleActive,
  onCheckAlert,
  onDeleteAlert,
  checkingAlertId = null,
}) {
  if (!alerts || alerts.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
        No target-price alerts currently configured. Use the form above to arm a new alert.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {alerts.map((alert) => {
        const isTriggered = alert.trigger_status === 'triggered';
        const isActive = alert.is_active;
        const isChecking = checkingAlertId === alert.id;

        return (
          <div
            key={alert.id}
            className="card"
            style={{
              padding: '16px 20px',
              borderLeft: isTriggered
                ? '4px solid #34d399'
                : isActive
                ? '4px solid var(--color-primary)'
                : '4px solid var(--text-dim)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {/* Top row: Product info & status */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-main)' }}>
                    {alert.product_name}
                  </span>
                  <span
                    className="badge"
                    style={{
                      background: 'var(--bg-subtle)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-muted)',
                      fontSize: '11px',
                    }}
                  >
                    {alert.retailer_name || 'All Retailers'}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                  Notification recipient: <strong>{alert.contact_email}</strong>
                </div>
              </div>

              {/* Status Badge */}
              <div>
                {isTriggered ? (
                  <span
                    className="badge badge-success"
                    style={{ fontSize: '12px', padding: '4px 10px', gap: '6px' }}
                  >
                    <Sparkles size={12} />
                    Target Triggered
                  </span>
                ) : isActive ? (
                  <span
                    className="badge"
                    style={{
                      background: 'rgba(79, 70, 229, 0.15)',
                      color: '#818cf8',
                      border: '1px solid rgba(79, 70, 229, 0.3)',
                      fontSize: '12px',
                      padding: '4px 10px',
                      gap: '6px',
                    }}
                  >
                    <CheckCircle2 size={12} />
                    Active Monitoring
                  </span>
                ) : (
                  <span
                    className="badge"
                    style={{
                      background: 'rgba(100, 116, 139, 0.15)',
                      color: '#94a3b8',
                      fontSize: '12px',
                      padding: '4px 10px',
                    }}
                  >
                    Inactive
                  </span>
                )}
              </div>
            </div>

            {/* Middle row: Pricing comparison */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
                padding: '12px 14px',
                background: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                  Target Threshold
                </span>
                <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                  {formatINR(alert.target_price)}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                  Last Observed Price
                </span>
                <div
                  style={{
                    fontSize: '17px',
                    fontWeight: 800,
                    color: alert.last_observed_price && alert.last_observed_price <= alert.target_price
                      ? '#34d399'
                      : 'var(--text-main)',
                    marginTop: '2px',
                  }}
                >
                  {alert.last_observed_price ? formatINR(alert.last_observed_price) : 'Pending check'}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                  Last Checked
                </span>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {alert.last_checked_at ? formatRelativeTime(alert.last_checked_at) : 'Never'}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                  Created
                </span>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {formatDate(alert.created_at)}
                </div>
              </div>
            </div>

            {/* Bottom row: Actions toolbar */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={() => onCheckAlert(alert.id)}
                disabled={isChecking || !isActive}
                className="btn btn-secondary"
                style={{ fontSize: '12px', padding: '6px 12px' }}
                title="Verify target price right now against live/seeded offers"
              >
                <Play size={13} />
                {isChecking ? 'Checking...' : 'Check Now'}
              </button>

              <button
                onClick={() => onToggleActive(alert.id, !isActive)}
                className="btn btn-secondary"
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                <Power size={13} style={{ color: isActive ? 'var(--color-warning)' : 'var(--color-success)' }} />
                {isActive ? 'Deactivate' : 'Reactivate'}
              </button>

              <button
                onClick={() => onDeleteAlert(alert.id)}
                className="btn btn-secondary"
                style={{ fontSize: '12px', padding: '6px 12px', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                title="Delete alert"
              >
                <Trash2 size={13} />
                Delete
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default AlertList;
