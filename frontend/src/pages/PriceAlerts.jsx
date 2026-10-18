import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Bell,
  Plus,
  Play,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Info,
} from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import AlertForm from '../components/alerts/AlertForm';
import AlertList from '../components/alerts/AlertList';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import EmptyState from '../components/common/EmptyState';
import productApi from '../api/productApi';
import alertApi from '../api/alertApi';

export function PriceAlerts() {
  const [searchParams] = useSearchParams();
  const preselectedProductId = searchParams.get('product_id');

  const [products, setProducts] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showCreateForm, setShowCreateForm] = useState(Boolean(preselectedProductId));
  const [checkingAll, setCheckingAll] = useState(false);
  const [checkingSingleId, setCheckingSingleId] = useState(null);
  const [checkResultBanner, setCheckResultBanner] = useState(null);

  // 1. Load catalog products for form
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await productApi.getProducts({ per_page: 50 });
        if (res && res.success) {
          setProducts(res.data.items || []);
        }
      } catch (err) {
        console.error('Failed to load products list', err);
      }
    };
    loadProducts();
  }, []);

  // 2. Load alerts
  const loadAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await alertApi.getAlerts();
      if (res && res.success) {
        setAlerts(res.data.alerts || []);
      } else {
        throw new Error('Failed to load alerts');
      }
    } catch (err) {
      setError(err.message || 'Unable to connect to alert service');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  // 3. Actions
  const handleAlertCreated = (newAlert) => {
    setShowCreateForm(false);
    setCheckResultBanner({
      type: 'success',
      message: `Alert configured successfully for ${newAlert.product_name}! Target set at ₹${newAlert.target_price.toLocaleString('en-IN')}.`,
    });
    loadAlerts();
  };

  const handleToggleActive = async (alertId, newStatus) => {
    try {
      await alertApi.updateAlert(alertId, { is_active: newStatus });
      loadAlerts();
    } catch (err) {
      alert(`Failed to update alert: ${err.message}`);
    }
  };

  const handleDeleteAlert = async (alertId) => {
    if (!window.confirm('Are you sure you want to delete this target-price alert?')) {
      return;
    }
    try {
      await alertApi.deleteAlert(alertId);
      loadAlerts();
    } catch (err) {
      alert(`Failed to delete alert: ${err.message}`);
    }
  };

  const handleCheckAllAlerts = async () => {
    try {
      setCheckingAll(true);
      setCheckResultBanner(null);
      const res = await alertApi.checkAlerts();
      if (res && res.success) {
        const data = res.data;
        setCheckResultBanner({
          type: 'info',
          message: `Evaluation completed: ${data.evaluated_count} active alert(s) checked. ${data.triggered_count} target price(s) triggered!`,
        });
        loadAlerts();
      }
    } catch (err) {
      setCheckResultBanner({
        type: 'error',
        message: `Evaluation check failed: ${err.message}`,
      });
    } finally {
      setCheckingAll(false);
    }
  };

  const handleCheckSingleAlert = async (alertId) => {
    try {
      setCheckingSingleId(alertId);
      const res = await alertApi.checkSingleAlert(alertId);
      if (res && res.success) {
        setCheckResultBanner({
          type: res.data.status === 'triggered' ? 'success' : 'info',
          message: res.data.message || 'Alert evaluation completed.',
        });
        loadAlerts();
      }
    } catch (err) {
      alert(`Failed to check alert: ${err.message}`);
    } finally {
      setCheckingSingleId(null);
    }
  };

  const activeCount = alerts.filter((a) => a.is_active).length;
  const triggeredCount = alerts.filter((a) => a.trigger_status === 'triggered').length;

  return (
    <div>
      <PageHeader
        title="Target-Price Alerts"
        subtitle="Automated price tracking triggers, instant notifications, and manual valuation checks"
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleCheckAllAlerts}
              disabled={checkingAll || activeCount === 0}
              className="btn btn-secondary"
            >
              <Play size={14} />
              {checkingAll ? 'Evaluating...' : 'Check All Alerts'}
            </button>
            <button
              onClick={() => setShowCreateForm((prev) => !prev)}
              className="btn btn-primary"
            >
              <Plus size={15} />
              {showCreateForm ? 'Close Form' : 'Arm New Alert'}
            </button>
          </div>
        }
      />

      {/* Check Result Banner */}
      {checkResultBanner && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: checkResultBanner.type === 'success'
              ? 'rgba(16, 185, 129, 0.15)'
              : checkResultBanner.type === 'error'
              ? 'rgba(239, 68, 68, 0.15)'
              : 'rgba(79, 70, 229, 0.15)',
            border: checkResultBanner.type === 'success'
              ? '1px solid rgba(16, 185, 129, 0.4)'
              : checkResultBanner.type === 'error'
              ? '1px solid rgba(239, 68, 68, 0.4)'
              : '1px solid rgba(79, 70, 229, 0.4)',
            color: checkResultBanner.type === 'success'
              ? '#34d399'
              : checkResultBanner.type === 'error'
              ? '#fca5a5'
              : '#818cf8',
            fontSize: '13px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {checkResultBanner.type === 'success' ? <CheckCircle2 size={16} /> : <Info size={16} />}
            <span>{checkResultBanner.message}</span>
          </div>
          <button
            onClick={() => setCheckResultBanner(null)}
            style={{ color: 'inherit', padding: '2px 6px', fontSize: '11px', textDecoration: 'underline' }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="metrics-grid" style={{ marginBottom: '20px' }}>
        <div className="metric-card">
          <span className="metric-title">Total Configured Alerts</span>
          <div className="metric-value">{alerts.length}</div>
          <span className="metric-subtext">Monitored shopping thresholds</span>
        </div>
        <div className="metric-card">
          <span className="metric-title">Active Monitoring</span>
          <div className="metric-value" style={{ color: '#818cf8' }}>
            {activeCount}
          </div>
          <span className="metric-subtext">Armed for periodic checks</span>
        </div>
        <div className="metric-card">
          <span className="metric-title">Triggered Alerts</span>
          <div className="metric-value" style={{ color: '#34d399' }}>
            {triggeredCount}
          </div>
          <span className="metric-subtext">Target condition satisfied</span>
        </div>
      </div>

      {/* Create Alert Form (Collapsible) */}
      {showCreateForm && (
        <AlertForm
          products={products}
          preselectedProductId={preselectedProductId}
          onAlertCreated={handleAlertCreated}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* Alerts List Area */}
      {loading ? (
        <LoadingSpinner message="Loading target-price monitoring alerts..." />
      ) : error ? (
        <ErrorMessage
          title="Alerts Service Error"
          message={error}
          onRetry={loadAlerts}
        />
      ) : alerts.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No Active Price Alerts"
            description="You have not configured any price drop triggers yet. Arm an alert for any product to receive notifications when offers drop to your budget."
            action={
              <button
                className="btn btn-primary"
                onClick={() => setShowCreateForm(true)}
              >
                <Plus size={14} />
                Create First Price Alert
              </button>
            }
          />
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <Bell size={18} style={{ color: 'var(--color-primary)' }} />
              Active Monitoring Triggers
            </h2>
            <button
              onClick={loadAlerts}
              className="btn btn-secondary"
              style={{ fontSize: '12px', padding: '4px 10px' }}
            >
              <RefreshCw size={12} />
              Refresh
            </button>
          </div>

          <AlertList
            alerts={alerts}
            onToggleActive={handleToggleActive}
            onCheckAlert={handleCheckSingleAlert}
            onDeleteAlert={handleDeleteAlert}
            checkingAlertId={checkingSingleId}
          />
        </div>
      )}
    </div>
  );
}

export default PriceAlerts;
