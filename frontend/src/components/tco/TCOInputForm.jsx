import React from 'react';
import {
  Calendar,
  DollarSign,
  Layers,
  Wrench,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { formatINR } from '../../utils/currency';

export function TCOInputForm({
  selectedProduct,
  bestOfferPrice,
  formData,
  onChange,
  onSubmit,
  onReset,
  loading = false,
}) {
  const durations = [6, 12, 24, 36, 48, 60];

  const handleInputChange = (field, value) => {
    onChange({
      ...formData,
      [field]: value === '' ? '' : Number(value),
    });
  };

  const handleSetPurchasePriceFromOffer = () => {
    if (bestOfferPrice) {
      onChange({
        ...formData,
        purchase_price: bestOfferPrice,
      });
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="card"
      style={{ padding: '24px', marginBottom: '24px' }}
      aria-label="TCO Assumptions Form"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={18} style={{ color: 'var(--color-primary)' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>
            Ownership Horizon & Cost Assumptions
          </h3>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="btn btn-secondary"
          style={{ fontSize: '11px', padding: '4px 8px', gap: '4px' }}
        >
          <RotateCcw size={12} />
          Reset Assumptions
        </button>
      </div>

      {/* Ownership Horizon Buttons */}
      <div style={{ marginBottom: '20px' }}>
        <label
          htmlFor="ownership-months-select"
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 700,
            color: 'var(--text-muted)',
            marginBottom: '8px',
            textTransform: 'uppercase',
          }}
        >
          Ownership Horizon (Duration)
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {durations.map((m) => (
            <button
              key={m}
              type="button"
              id={`duration-btn-${m}`}
              onClick={() => onChange({ ...formData, ownership_months: m })}
              className={formData.ownership_months === m ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ fontSize: '12px', padding: '6px 14px' }}
            >
              {m} Months ({Math.round(m / 12 * 10) / 10} Yrs)
            </button>
          ))}
        </div>
      </div>

      {/* Primary Financial Inputs Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        {/* Purchase Price */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label
              htmlFor="tco-purchase-price"
              style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)' }}
            >
              Purchase Price (₹) *
            </label>
            {bestOfferPrice && (
              <button
                type="button"
                onClick={handleSetPurchasePriceFromOffer}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-accent)',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline',
                }}
              >
                Use Offer ({formatINR(bestOfferPrice)})
              </button>
            )}
          </div>
          <input
            id="tco-purchase-price"
            type="number"
            min="0"
            step="1"
            className="input"
            value={formData.purchase_price ?? ''}
            onChange={(e) => handleInputChange('purchase_price', e.target.value)}
            placeholder="e.g. 50000"
            required
            style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
          />
        </div>

        {/* Acquisition Costs */}
        <div>
          <label
            htmlFor="tco-acquisition-cost"
            style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}
          >
            Acquisition & Delivery Costs (₹)
          </label>
          <input
            id="tco-acquisition-cost"
            type="number"
            min="0"
            step="1"
            className="input"
            value={formData.acquisition_cost ?? ''}
            onChange={(e) => handleInputChange('acquisition_cost', e.target.value)}
            placeholder="0 if none (leave blank if unknown)"
            style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
          />
        </div>

        {/* Monthly Operating Cost */}
        <div>
          <label
            htmlFor="tco-monthly-operating"
            style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}
          >
            Monthly Operating / Power / Data (₹/mo)
          </label>
          <input
            id="tco-monthly-operating"
            type="number"
            min="0"
            step="1"
            className="input"
            value={formData.monthly_operating_cost ?? ''}
            onChange={(e) => handleInputChange('monthly_operating_cost', e.target.value)}
            placeholder="0 if none (leave blank if unknown)"
            style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
          />
        </div>

        {/* Maintenance Costs */}
        <div>
          <label
            htmlFor="tco-maintenance-cost"
            style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}
          >
            Maintenance & Servicing Total (₹)
          </label>
          <input
            id="tco-maintenance-cost"
            type="number"
            min="0"
            step="1"
            className="input"
            value={formData.maintenance_cost ?? ''}
            onChange={(e) => handleInputChange('maintenance_cost', e.target.value)}
            placeholder="0 if none (leave blank if unknown)"
            style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
          />
        </div>

        {/* Repair & Insurance Costs */}
        <div>
          <label
            htmlFor="tco-repair-cost"
            style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}
          >
            Repairs & Extended Warranty (₹)
          </label>
          <input
            id="tco-repair-cost"
            type="number"
            min="0"
            step="1"
            className="input"
            value={formData.repair_cost ?? ''}
            onChange={(e) => handleInputChange('repair_cost', e.target.value)}
            placeholder="0 if none (leave blank if unknown)"
            style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
          />
        </div>

        {/* Accessories & Consumables */}
        <div>
          <label
            htmlFor="tco-accessory-cost"
            style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}
          >
            Accessories & Cases (₹)
          </label>
          <input
            id="tco-accessory-cost"
            type="number"
            min="0"
            step="1"
            className="input"
            value={formData.accessory_cost ?? ''}
            onChange={(e) => handleInputChange('accessory_cost', e.target.value)}
            placeholder="0 if none (leave blank if unknown)"
            style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
          />
        </div>

        {/* Financing Costs */}
        <div>
          <label
            htmlFor="tco-financing-cost"
            style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}
          >
            Financing & Interest Fees (₹)
          </label>
          <input
            id="tco-financing-cost"
            type="number"
            min="0"
            step="1"
            className="input"
            value={formData.financing_cost ?? ''}
            onChange={(e) => handleInputChange('financing_cost', e.target.value)}
            placeholder="0 if cash/upfront"
            style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
          />
        </div>

        {/* Resale Value Assumption */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label
              htmlFor="tco-resale-value"
              style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)' }}
            >
              Estimated Resale Value (₹)
            </label>
            <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Deducted once</span>
          </div>
          <input
            id="tco-resale-value"
            type="number"
            min="0"
            step="1"
            className="input"
            value={formData.estimated_resale_value ?? ''}
            onChange={(e) => handleInputChange('estimated_resale_value', e.target.value)}
            placeholder="Leave blank to use Resale Engine"
            style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          style={{ padding: '8px 20px', fontSize: '13px' }}
        >
          <Sparkles size={14} />
          {loading ? 'Evaluating TCO...' : 'Calculate Total Cost of Ownership'}
        </button>
      </div>
    </form>
  );
}

export default TCOInputForm;
