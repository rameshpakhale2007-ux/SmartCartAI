import React, { useState, useEffect } from 'react';
import { Tag, ShoppingCart, Calculator, AlertCircle, Sparkles, Building2 } from 'lucide-react';
import couponApi from '../../api/couponApi';

export function CouponValidationForm({
  selectedCoupon,
  products = [],
  onValidationComplete,
  onResetSelection,
}) {
  const [couponCode, setCouponCode] = useState(selectedCoupon ? selectedCoupon.code : '');
  const [productId, setProductId] = useState('');
  const [retailerId, setRetailerId] = useState('');
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [shippingCost, setShippingCost] = useState('0');
  const [shippingUnknown, setShippingUnknown] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Sync when selected coupon changes from the cards
  useEffect(() => {
    if (selectedCoupon) {
      setCouponCode(selectedCoupon.code);
      if (selectedCoupon.retailer_id) {
        setRetailerId(String(selectedCoupon.retailer_id));
      }
      if (selectedCoupon.applicable_product_id) {
        setProductId(String(selectedCoupon.applicable_product_id));
      }
    }
  }, [selectedCoupon]);

  // When product changes, auto-suggest purchase amount if empty
  const handleProductChange = (pId) => {
    setProductId(pId);
    const prod = products.find((p) => String(p.id) === String(pId));
    if (prod && prod.base_mrp) {
      setPurchaseAmount(String(prod.base_mrp));
    }
  };

  const handleValidate = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!couponCode.trim()) {
      setFormError('Please enter or select a coupon promo code.');
      return;
    }

    const numAmount = parseFloat(purchaseAmount);
    if (isNaN(numAmount) || numAmount < 0) {
      setFormError('Please enter a valid order purchase amount (>= ₹0).');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        coupon_code: couponCode.trim(),
        purchase_amount: numAmount,
        product_id: productId ? parseInt(productId, 10) : null,
        retailer_id: retailerId ? parseInt(retailerId, 10) : null,
        quantity: 1,
        shipping_cost: shippingUnknown ? null : (parseFloat(shippingCost) || 0.0),
      };

      const res = await couponApi.validateCoupon(payload);
      if (res && res.data) {
        onValidationComplete(res.data);
      } else {
        throw new Error('Unexpected response format from validation service.');
      }
    } catch (err) {
      setFormError(err.message || 'Failed to validate coupon against order.');
      if (err.original?.response?.data?.data) {
        // Validation outcome returned rejection data inside error envelope
        onValidationComplete(err.original.response.data.data);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="card"
      style={{
        padding: '24px',
        background: '#ffffff',
        border: '1.5px solid #dbeafe',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-card)',
        marginBottom: '28px',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(99, 102, 241, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#818cf8',
            }}
          >
            <Calculator size={18} />
          </div>
          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 800, margin: 0 }}>Interactive Coupon Eligibility & Savings Validator</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
              Test any coupon code against target order values, retailer restrictions, and delivery fees
            </p>
          </div>
        </div>
        {selectedCoupon && (
          <button
            onClick={() => {
              setCouponCode('');
              if (onResetSelection) onResetSelection();
            }}
            className="btn btn-secondary"
            style={{ fontSize: '11px', padding: '4px 10px' }}
          >
            Clear Selected
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
            color: '#f87171',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px',
          }}
        >
          <AlertCircle size={15} />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleValidate}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '16px' }}>
          {/* Coupon Code Input */}
          <div>
            <label className="form-label" style={{ fontSize: '12px', marginBottom: '6px', display: 'block' }}>
              Coupon Code *
            </label>
            <div style={{ position: 'relative' }}>
              <Tag size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="e.g. ELECTRO10"
                className="form-input"
                style={{ width: '100%', paddingLeft: '32px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}
                required
              />
            </div>
          </div>

          {/* Product Preselection / Choice */}
          <div>
            <label className="form-label" style={{ fontSize: '12px', marginBottom: '6px', display: 'block' }}>
              Target Product (Optional)
            </label>
            <select
              value={productId}
              onChange={(e) => handleProductChange(e.target.value)}
              className="form-select"
              style={{ width: '100%', fontSize: '13px' }}
            >
              <option value="">— Generic / Basket Purchase —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.brand})
                </option>
              ))}
            </select>
          </div>

          {/* Retailer Selector */}
          <div>
            <label className="form-label" style={{ fontSize: '12px', marginBottom: '6px', display: 'block' }}>
              Retailer Store (Optional)
            </label>
            <select
              value={retailerId}
              onChange={(e) => setRetailerId(e.target.value)}
              className="form-select"
              style={{ width: '100%', fontSize: '13px' }}
            >
              <option value="">— Any / Platform-wide —</option>
              <option value="1">Amazon India</option>
              <option value="2">Flipkart</option>
              <option value="3">Croma</option>
              <option value="4">Reliance Digital</option>
              <option value="5">Tata CLiQ</option>
            </select>
          </div>

          {/* Order Purchase Amount */}
          <div>
            <label className="form-label" style={{ fontSize: '12px', marginBottom: '6px', display: 'block' }}>
              Order Amount (₹) *
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={purchaseAmount}
              onChange={(e) => setPurchaseAmount(e.target.value)}
              placeholder="e.g. 5000"
              className="form-input"
              style={{ width: '100%', fontSize: '13px' }}
              required
            />
          </div>

          {/* Shipping Cost */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="form-label" style={{ fontSize: '12px', margin: 0 }}>
                Shipping Fee (₹)
              </label>
              <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={shippingUnknown}
                  onChange={(e) => setShippingUnknown(e.target.checked)}
                />
                Unknown fee
              </label>
            </div>
            <input
              type="number"
              min="0"
              step="any"
              value={shippingUnknown ? '' : shippingCost}
              onChange={(e) => setShippingCost(e.target.value)}
              placeholder={shippingUnknown ? 'Undisclosed by retailer' : '0'}
              disabled={shippingUnknown}
              className="form-input"
              style={{ width: '100%', fontSize: '13px', opacity: shippingUnknown ? 0.6 : 1 }}
            />
          </div>
        </div>

        {/* Submit Action */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{ padding: '9px 20px', gap: '6px', fontSize: '13px' }}
          >
            <Sparkles size={15} />
            <span>{submitting ? 'Evaluating Eligibility...' : 'Evaluate Coupon & Calculate Savings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

export default CouponValidationForm;
