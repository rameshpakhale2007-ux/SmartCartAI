import React, { useState } from 'react';
import {
  Bell,
  Target,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Info,
  DollarSign
} from 'lucide-react';
import { formatINR } from '../../utils/currency';
import buyTimingApi from '../../api/buyTimingApi';

export function TargetPriceAdvisor({
  productId,
  productName,
  currentPrice,
  targetRecommendations,
  retailerId = null,
  onAlertCreated,
}) {
  const targets = targetRecommendations || {};

  const conservative = targets.suggested_conservative_target;
  const moderate = targets.suggested_moderate_target;
  const aggressive = targets.suggested_aggressive_target;

  const [targetPrice, setTargetPrice] = useState(
    moderate ? String(moderate) : currentPrice ? String(Math.round(currentPrice * 0.95)) : ''
  );
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSelectPredefined = (val) => {
    if (val !== undefined && val !== null) {
      setTargetPrice(String(val));
      setSuccessMsg('');
      setErrorMsg('');
    }
  };

  const handleSubmitAlert = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    const parsedPrice = parseFloat(targetPrice);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setErrorMsg('Please enter a valid target price greater than ₹0.');
      return;
    }

    if (!email || !email.includes('@')) {
      setErrorMsg('Please enter a valid notification email address.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await buyTimingApi.createTargetAlert(productId, {
        target_price: parsedPrice,
        contact_email: email.trim().toLowerCase(),
        retailer_id: retailerId ? parseInt(retailerId, 10) : null,
      });

      if (res && res.success) {
        setSuccessMsg(`Target price alert established for ${formatINR(parsedPrice)}! We'll notify ${email.trim()} when matched.`);
        if (onAlertCreated) onAlertCreated(res.data);
      } else {
        throw new Error(res?.error?.message || 'Failed to establish price alert.');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error?.message || err.message || 'Error communicating with alert service.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
        <Target size={20} style={{ color: 'var(--color-primary)' }} />
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>
            Target-Price Advisor & Alert Trigger
          </h3>
          <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
            Choose an evidence-backed target or enter your own threshold
          </span>
        </div>
      </div>

      {/* Suggested Targets Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        {/* Conservative */}
        {conservative && (
          <div
            onClick={() => handleSelectPredefined(conservative)}
            style={{
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-subtle)',
              border: targetPrice === String(conservative) ? '2px solid #38bdf8' : '1px solid var(--border-subtle)',
              cursor: 'pointer',
              transition: 'border 0.2s ease',
            }}
            role="button"
            tabIndex={0}
            aria-label={`Select conservative target: ${formatINR(conservative)}`}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase' }}>
                Conservative
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Historical Median</span>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>
              {formatINR(conservative)}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
              Typical historical benchmark
            </span>
          </div>
        )}

        {/* Moderate */}
        {moderate && (
          <div
            onClick={() => handleSelectPredefined(moderate)}
            style={{
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-subtle)',
              border: targetPrice === String(moderate) ? '2px solid #34d399' : '1px solid var(--border-subtle)',
              cursor: 'pointer',
              transition: 'border 0.2s ease',
            }}
            role="button"
            tabIndex={0}
            aria-label={`Select moderate target: ${formatINR(moderate)}`}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#34d399', textTransform: 'uppercase' }}>
                Moderate
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>5% Below Median</span>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>
              {formatINR(moderate)}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
              Achievable bargain target
            </span>
          </div>
        )}

        {/* Aggressive */}
        {aggressive && (
          <div
            onClick={() => handleSelectPredefined(aggressive)}
            style={{
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-subtle)',
              border: targetPrice === String(aggressive) ? '2px solid #a855f7' : '1px solid var(--border-subtle)',
              cursor: 'pointer',
              transition: 'border 0.2s ease',
            }}
            role="button"
            tabIndex={0}
            aria-label={`Select aggressive target: ${formatINR(aggressive)}`}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#a855f7', textTransform: 'uppercase' }}>
                Aggressive
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Window Low</span>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>
              {formatINR(aggressive)}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
              Lowest observed in period
            </span>
          </div>
        )}
      </div>

      {/* Target Alert Form */}
      <form onSubmit={handleSubmitAlert} aria-label="Target Price Alert Form">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '14px' }}>
          <div>
            <label htmlFor="target-price-input" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
              Target Price (₹)
            </label>
            <input
              id="target-price-input"
              type="number"
              step="any"
              min="1"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              placeholder="e.g. 35000"
              className="form-control"
              required
            />
          </div>

          <div>
            <label htmlFor="target-email-input" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
              Notification Email
            </label>
            <input
              id="target-email-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="shopper@example.com"
              className="form-control"
              required
            />
          </div>
        </div>

        {errorMsg && (
          <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'rgba(248, 113, 113, 0.1)', border: '1px solid rgba(248, 113, 113, 0.3)', color: '#f87171', fontSize: '12px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={14} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'rgba(52, 211, 153, 0.1)', border: '1px solid rgba(52, 211, 153, 0.3)', color: '#34d399', fontSize: '12px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={14} />
            <span>{successMsg}</span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
            style={{ minWidth: '180px' }}
          >
            <Bell size={14} />
            {submitting ? 'Setting Alert...' : 'Set Price Alert'}
          </button>

          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            * Setting an alert does not guarantee that a future discount will occur.
          </span>
        </div>
      </form>
    </div>
  );
}

export default TargetPriceAdvisor;
