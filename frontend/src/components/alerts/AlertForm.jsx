import React, { useState, useEffect } from 'react';
import { Bell, Check, AlertCircle, X, ShieldAlert } from 'lucide-react';
import { formatINR } from '../../utils/currency';
import alertApi from '../../api/alertApi';

export function AlertForm({
  products = [],
  preselectedProductId = null,
  onAlertCreated,
  onCancel,
}) {
  const [productId, setProductId] = useState(preselectedProductId ? String(preselectedProductId) : '');
  const [retailerId, setRetailerId] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [duplicateNotice, setDuplicateNotice] = useState(null);

  // Sync preselected product ID if passed
  useEffect(() => {
    if (preselectedProductId) {
      setProductId(String(preselectedProductId));
    } else if (!productId && products.length > 0) {
      setProductId(String(products[0].id));
    }
  }, [preselectedProductId, products]);

  // Selected product reference for helpful guidance
  const selectedProduct = products.find((p) => String(p.id) === String(productId));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setDuplicateNotice(null);

    if (!productId) {
      setFormError('Please select a product to monitor.');
      return;
    }

    const numPrice = parseFloat(targetPrice);
    if (isNaN(numPrice) || numPrice <= 0) {
      setFormError('Please enter a valid target price greater than ₹0.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setFormError('Please enter a valid notification email address.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        product_id: parseInt(productId, 10),
        target_price: numPrice,
        contact_email: email.trim(),
        retailer_id: retailerId ? parseInt(retailerId, 10) : null,
      };

      const res = await alertApi.createAlert(payload);
      if (res && res.success) {
        if (res.data && res.message && res.message.includes('already configured')) {
          setDuplicateNotice(res.message);
        } else {
          // Success
          if (onAlertCreated) onAlertCreated(res.data);
        }
      } else {
        throw new Error(res.error?.message || 'Failed to create price alert');
      }
    } catch (err) {
      setFormError(err.message || 'Unable to submit price alert request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="card"
      style={{
        padding: '20px',
        border: '1px solid var(--border-focus)',
        marginBottom: '24px',
        background: 'var(--bg-card)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bell size={18} style={{ color: 'var(--color-primary)' }} />
          Configure New Target-Price Trigger
        </h3>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{ color: 'var(--text-dim)', padding: '4px' }}
            aria-label="Close form"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {formError && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            color: '#fca5a5',
            fontSize: '13px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={16} />
          <span>{formError}</span>
        </div>
      )}

      {duplicateNotice && (
        <div
          style={{
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            color: '#fbbf24',
            fontSize: '13px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <ShieldAlert size={16} />
          <span>{duplicateNotice}</span>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
          marginBottom: '16px',
        }}
      >
        {/* Product Selector */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
            Product *
          </label>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            style={{ width: '100%' }}
            required
            aria-label="Select product"
          >
            <option value="">Select a product...</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.brand} — {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Retailer Selector */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
            Target Retailer (Optional)
          </label>
          <select
            value={retailerId}
            onChange={(e) => setRetailerId(e.target.value)}
            style={{ width: '100%' }}
            aria-label="Select target retailer"
          >
            <option value="">All Retailers (Lowest Available)</option>
            <option value="1">Amazon India</option>
            <option value="2">Flipkart</option>
            <option value="3">Croma</option>
            <option value="4">Reliance Digital</option>
            <option value="5">Tata CLiQ</option>
          </select>
        </div>

        {/* Target Price */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
            Target Price (₹) *
          </label>
          <input
            type="number"
            min="1"
            step="any"
            placeholder={selectedProduct?.base_mrp ? `e.g. ${Math.round(selectedProduct.base_mrp * 0.9)}` : 'e.g. 50000'}
            value={targetPrice}
            onChange={(e) => setTargetPrice(e.target.value)}
            style={{ width: '100%' }}
            required
            aria-label="Target price in INR"
          />
        </div>

        {/* Notification Email */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
            Notification Email *
          </label>
          <input
            type="email"
            placeholder="shopper@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%' }}
            required
            aria-label="Notification contact email"
          />
        </div>
      </div>

      {selectedProduct && (
        <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '16px' }}>
          Reference MRP: <strong>{formatINR(selectedProduct.base_mrp)}</strong>
          {selectedProduct.lowest_eligible_offer && (
            <span>
              {' '}• Current lowest in-stock offer:{' '}
              <strong style={{ color: '#34d399' }}>
                {formatINR(selectedProduct.lowest_eligible_offer.estimated_total ?? selectedProduct.lowest_eligible_offer.price)}
              </strong>{' '}
              via {selectedProduct.lowest_eligible_offer.retailer_name}
            </span>
          )}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn btn-secondary">
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="btn btn-primary"
          style={{ minWidth: '150px' }}
        >
          {submitting ? 'Creating Trigger...' : 'Arm Price Alert'}
        </button>
      </div>
    </form>
  );
}

export default AlertForm;
