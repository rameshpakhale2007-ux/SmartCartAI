import React, { useEffect, useState } from 'react';
import PageHeader from '../components/layout/PageHeader';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import dashboardApi from '../api/dashboardApi';
import { Server, Database, CheckCircle, RefreshCw } from 'lucide-react';

export function Settings() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkHealth = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await dashboardApi.getHealth();
      setHealth(res);
    } catch (err) {
      setError(err.message || 'Failed to connect to backend');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div>
      <PageHeader
        title="Settings & System Diagnostics"
        subtitle="Manage configuration parameters, data sources, and verify backend API connectivity"
        actions={
          <button className="btn btn-secondary" onClick={checkHealth}>
            <RefreshCw size={14} />
            Refresh Diagnostics
          </button>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-xl)' }}>
        {/* Diagnostics Card */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <Server size={18} style={{ color: 'var(--color-primary)' }} />
              API Gateway & Health Status
            </h2>
          </div>

          {loading ? (
            <LoadingSpinner message="Checking backend diagnostics..." />
          ) : error ? (
            <ErrorMessage title="Health Check Failed" message={error} onRetry={checkHealth} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Status</span>
                <span className="badge badge-success">
                  <CheckCircle size={12} />
                  {health?.status || 'Unknown'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Service</span>
                <span style={{ fontWeight: 600 }}>{health?.service}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Version</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{health?.version}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Database Connection</span>
                <span className="badge badge-success">{health?.database}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Server Timestamp</span>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                  {health?.timestamp}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Configuration Card */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <Database size={18} style={{ color: 'var(--color-accent)' }} />
              Environment & Provenance Rules
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px', lineHeight: 1.6 }}>
            <p style={{ color: 'var(--text-muted)' }}>
              SmartCart AI operates with strict separation of data sources. Demonstration fixtures and imported datasets are never mixed with live APIs without explicit provenance tags.
            </p>
            <div style={{ padding: '12px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>Currency Locale</div>
              <div style={{ color: 'var(--text-dim)' }}>Indian Rupee (INR - ₹) with standard comma grouping</div>
            </div>
            <div style={{ padding: '12px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>File Upload Limits</div>
              <div style={{ color: 'var(--text-dim)' }}>Enforced maximum CSV upload: 5 MB</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
