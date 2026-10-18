import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Calculator,
  Search,
  ExternalLink,
  LineChart,
  Scale,
  Plus,
  X,
  Layers,
  Sparkles,
  AlertCircle,
  TrendingDown,
} from 'lucide-react';

import PageHeader from '../components/layout/PageHeader';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import EmptyState from '../components/common/EmptyState';

import TCOInputForm from '../components/tco/TCOInputForm';
import TCOBreakdown from '../components/tco/TCOBreakdown';
import ResaleForecastChart from '../components/tco/ResaleForecastChart';
import ResaleScenarioCards from '../components/tco/ResaleScenarioCards';
import ForecastEvidencePanel from '../components/tco/ForecastEvidencePanel';
import TCOComparisonTable from '../components/tco/TCOComparisonTable';

import productApi from '../api/productApi';
import tcoApi from '../api/tcoApi';
import { formatINR } from '../utils/currency';

export function TCOAnalysis() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlProductId = searchParams.get('id') || searchParams.get('product_id');

  const [productsList, setProductsList] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(urlProductId || '');

  // Form State
  const [formData, setFormData] = useState({
    ownership_months: 36,
    purchase_price: '',
    acquisition_cost: '',
    monthly_operating_cost: '',
    maintenance_cost: '',
    repair_cost: '',
    accessory_cost: '',
    financing_cost: '',
    estimated_resale_value: '',
    condition: 'good',
  });

  // TCO and Forecast Data State
  const [tcoData, setTcoData] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [bestOfferPrice, setBestOfferPrice] = useState(null);

  // Status State
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState(null);

  // Multi-Product Comparison State
  const [compareProductIds, setCompareProductIds] = useState([]);
  const [comparisonResult, setComparisonResult] = useState(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);

  // 1. Fetch Product Catalog for selector
  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const res = await productApi.getProducts({ per_page: 50 });
        if (res && res.success) {
          const items = res.data.items || [];
          setProductsList(items);
          if (!selectedProductId && items.length > 0) {
            setSelectedProductId(String(items[0].id));
            setSearchParams({ id: String(items[0].id) });
          }
        }
      } catch (err) {
        console.error('Failed to load products for TCO', err);
      }
    };
    loadCatalog();
  }, []);

  // Sync URL query param
  useEffect(() => {
    if (urlProductId && urlProductId !== selectedProductId) {
      setSelectedProductId(urlProductId);
    }
  }, [urlProductId]);

  // 2. Fetch Best Offer Price & Baseline Resale Forecast on product change
  useEffect(() => {
    if (!selectedProductId) return;

    const loadProductData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch product details & offers
        const offersRes = await productApi.getProductOffers(selectedProductId);
        let bestPrice = null;
        if (offersRes && offersRes.success) {
          const cheapest = offersRes.data.cheapest_eligible_offer;
          if (cheapest && cheapest.price) {
            bestPrice = cheapest.price;
          }
        }
        setBestOfferPrice(bestPrice);

        // Fetch Resale Forecast
        const fcRes = await tcoApi.getResaleForecast(selectedProductId, {
          months: formData.ownership_months,
          condition: formData.condition,
        });

        let estimatedResale = null;
        if (fcRes && fcRes.success) {
          setForecastData(fcRes.data);
          estimatedResale = fcRes.data.estimated_resale_value;
        }

        // Initialize default form purchase price
        const initialPrice = bestPrice || (offersRes?.data?.product?.base_mrp ?? '');
        const updatedForm = {
          ...formData,
          purchase_price: initialPrice,
          estimated_resale_value: estimatedResale ?? '',
        };
        setFormData(updatedForm);

        // Execute initial TCO calculation
        const tcoRes = await tcoApi.calculateTCO({
          product_id: parseInt(selectedProductId),
          ...updatedForm,
          purchase_price: initialPrice ? Number(initialPrice) : undefined,
          estimated_resale_value: estimatedResale ? Number(estimatedResale) : undefined,
        });

        if (tcoRes && tcoRes.success) {
          setTcoData(tcoRes.data);
        }
      } catch (err) {
        setError(err.message || 'Unable to compute initial TCO analysis.');
      } finally {
        setLoading(false);
      }
    };

    loadProductData();
  }, [selectedProductId]);

  // Recalculate forecast when ownership duration changes in form
  useEffect(() => {
    if (!selectedProductId) return;

    const refreshForecast = async () => {
      try {
        const fcRes = await tcoApi.getResaleForecast(selectedProductId, {
          months: formData.ownership_months,
          condition: formData.condition,
        });
        if (fcRes && fcRes.success) {
          setForecastData(fcRes.data);
        }
      } catch (err) {
        console.error('Failed to update forecast trajectory', err);
      }
    };

    refreshForecast();
  }, [formData.ownership_months, formData.condition]);

  // Handler for Manual/Recalculate TCO Submission
  const handleCalculateTCO = async () => {
    try {
      setCalculating(true);
      setError(null);

      const payload = {
        product_id: parseInt(selectedProductId),
        ownership_months: Number(formData.ownership_months),
        purchase_price: formData.purchase_price !== '' ? Number(formData.purchase_price) : undefined,
        acquisition_cost: formData.acquisition_cost !== '' ? Number(formData.acquisition_cost) : undefined,
        monthly_operating_cost: formData.monthly_operating_cost !== '' ? Number(formData.monthly_operating_cost) : undefined,
        maintenance_cost: formData.maintenance_cost !== '' ? Number(formData.maintenance_cost) : undefined,
        repair_cost: formData.repair_cost !== '' ? Number(formData.repair_cost) : undefined,
        accessory_cost: formData.accessory_cost !== '' ? Number(formData.accessory_cost) : undefined,
        financing_cost: formData.financing_cost !== '' ? Number(formData.financing_cost) : undefined,
        estimated_resale_value: formData.estimated_resale_value !== '' ? Number(formData.estimated_resale_value) : undefined,
      };

      const res = await tcoApi.calculateTCO(payload);
      if (res && res.success) {
        setTcoData(res.data);
      } else {
        throw new Error(res.error?.message || 'Failed to calculate TCO.');
      }
    } catch (err) {
      setError(err.message || 'TCO calculation failed.');
    } finally {
      setCalculating(false);
    }
  };

  // Handler for resetting form
  const handleResetForm = () => {
    setFormData({
      ownership_months: 36,
      purchase_price: bestOfferPrice || '',
      acquisition_cost: '',
      monthly_operating_cost: '',
      maintenance_cost: '',
      repair_cost: '',
      accessory_cost: '',
      financing_cost: '',
      estimated_resale_value: forecastData?.estimated_resale_value || '',
      condition: 'good',
    });
  };

  // Handler to apply scenario resale value directly into TCO form
  const handleApplyScenarioResale = (scenarioKey, resaleVal) => {
    setFormData((prev) => ({
      ...prev,
      estimated_resale_value: resaleVal,
    }));
    // Auto recalculate TCO with selected scenario
    tcoApi.calculateTCO({
      product_id: parseInt(selectedProductId),
      ...formData,
      estimated_resale_value: resaleVal,
    }).then((res) => {
      if (res && res.success) {
        setTcoData(res.data);
      }
    });
  };

  // Multi-Product Comparison Handler
  const handleAddCompareProduct = (id) => {
    if (compareProductIds.length >= 4) return;
    if (!compareProductIds.includes(id) && String(id) !== String(selectedProductId)) {
      setCompareProductIds([...compareProductIds, id]);
    }
  };

  const handleRemoveCompareProduct = (id) => {
    setCompareProductIds(compareProductIds.filter((cid) => cid !== id));
  };

  const handleRunComparison = async () => {
    if (compareProductIds.length === 0) return;

    try {
      setComparisonLoading(true);
      const allIds = [parseInt(selectedProductId), ...compareProductIds];

      const productsPayload = allIds.map((pid) => ({
        product_id: pid,
        ownership_months: Number(formData.ownership_months),
        auto_estimate_resale: true,
      }));

      const res = await tcoApi.compareTCO({ products: productsPayload });
      if (res && res.success) {
        setComparisonResult(res.data);
      }
    } catch (err) {
      console.error('Failed to run TCO comparison', err);
    } finally {
      setComparisonLoading(false);
    }
  };

  const selectedProductObj = productsList.find((p) => String(p.id) === String(selectedProductId));

  return (
    <div>
      <PageHeader
        title="Total Cost of Ownership (TCO) & Resale Engine"
        subtitle="Forecast full lifecycle costs: Purchase + Acquisition + Operations minus Projected Resale Value"
        actions={
          selectedProductId ? (
            <div style={{ display: 'flex', gap: '8px' }}>
              <Link to={`/products/${selectedProductId}`} className="btn btn-secondary" style={{ fontSize: '12px' }}>
                <ExternalLink size={13} />
                Product Details
              </Link>
              <Link to={`/compare?id=${selectedProductId}`} className="btn btn-secondary" style={{ fontSize: '12px' }}>
                <Scale size={13} />
                Compare Retailers
              </Link>
              <Link to={`/history?id=${selectedProductId}`} className="btn btn-secondary" style={{ fontSize: '12px' }}>
                <LineChart size={13} />
                Price History
              </Link>
            </div>
          ) : null
        }
      />

      {/* Product Selector Control Bar */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '280px' }}>
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <label htmlFor="tco-product-select" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)' }}>
            Select Product:
          </label>
          <select
            id="tco-product-select"
            className="input"
            value={selectedProductId}
            onChange={(e) => {
              setSelectedProductId(e.target.value);
              setSearchParams({ id: e.target.value });
              setCompareProductIds([]);
              setComparisonResult(null);
            }}
            style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }}
          >
            {productsList.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.brand} - {formatINR(p.base_mrp)})
              </option>
            ))}
          </select>
        </div>

        {selectedProductObj && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <span>Category: <strong style={{ color: 'var(--text-main)' }}>{selectedProductObj.category}</strong></span>
            <span>•</span>
            <span>Catalog MRP: <strong style={{ color: 'var(--text-main)' }}>{formatINR(selectedProductObj.base_mrp)}</strong></span>
            {bestOfferPrice && (
              <>
                <span>•</span>
                <span>Best Offer: <strong style={{ color: '#38bdf8' }}>{formatINR(bestOfferPrice)}</strong></span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <LoadingSpinner message="Evaluating historical price trends & computing lifecycle ownership model..." />
      ) : error ? (
        <ErrorMessage message={error} onRetry={handleCalculateTCO} />
      ) : !selectedProductObj ? (
        <EmptyState
          title="No Product Selected"
          description="Choose a product from the catalog dropdown above to calculate its Total Cost of Ownership."
        />
      ) : (
        <div>
          {/* Section B: Assumptions Form */}
          <TCOInputForm
            selectedProduct={selectedProductObj}
            bestOfferPrice={bestOfferPrice}
            formData={formData}
            onChange={setFormData}
            onSubmit={handleCalculateTCO}
            onReset={handleResetForm}
            loading={calculating}
          />

          {/* Section C: TCO Breakdown */}
          {tcoData && <TCOBreakdown tcoData={tcoData} />}

          {/* Section D: Resale Forecast Trajectory & Scenarios */}
          {forecastData && (
            <div>
              <ResaleForecastChart forecastData={forecastData} />

              <ResaleScenarioCards
                scenarios={forecastData.scenarios}
                onSelectScenario={handleApplyScenarioResale}
              />

              <ForecastEvidencePanel forecastData={forecastData} />
            </div>
          )}

          {/* Section E: Multi-Product Comparison Bar & Table */}
          <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 4px', color: 'var(--text-main)' }}>
                  Compare Against Alternative Catalog Products
                </h4>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-dim)' }}>
                  Select up to 4 additional products to evaluate TCO efficiency side-by-side.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <select
                  className="input"
                  aria-label="Add product to compare"
                  style={{ fontSize: '12px', padding: '6px 10px', minWidth: '220px' }}
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddCompareProduct(parseInt(e.target.value));
                      e.target.value = '';
                    }
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>+ Add product to compare...</option>
                  {productsList
                    .filter((p) => String(p.id) !== String(selectedProductId) && !compareProductIds.includes(p.id))
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({formatINR(p.base_mrp)})
                      </option>
                    ))}
                </select>

                <button
                  type="button"
                  onClick={handleRunComparison}
                  disabled={compareProductIds.length === 0 || comparisonLoading}
                  className="btn btn-primary"
                  style={{ fontSize: '12px', padding: '6px 14px' }}
                >
                  <Scale size={13} />
                  {comparisonLoading ? 'Comparing...' : `Compare (${compareProductIds.length + 1})`}
                </button>
              </div>
            </div>

            {/* Selected Compare Chips */}
            {compareProductIds.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-full)',
                    background: 'rgba(99, 102, 241, 0.15)',
                    color: '#818cf8',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  Base: {selectedProductObj.name}
                </span>
                {compareProductIds.map((cid) => {
                  const cp = productsList.find((p) => p.id === cid);
                  return (
                    <span
                      key={cid}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-full)',
                        background: 'var(--bg-subtle)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-main)',
                        fontSize: '11px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>{cp ? cp.name : `Product #${cid}`}</span>
                      <X
                        size={12}
                        style={{ cursor: 'pointer', color: '#f87171' }}
                        onClick={() => handleRemoveCompareProduct(cid)}
                      />
                    </span>
                  );
                })}
              </div>
            )}

            {comparisonResult && (
              <TCOComparisonTable comparisonData={comparisonResult} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default TCOAnalysis;
