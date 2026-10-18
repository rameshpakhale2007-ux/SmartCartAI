import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  TrendingUp,
  Search,
  ExternalLink,
  Store,
  RefreshCw,
  Clock,
  Layers,
  ArrowLeft,
  Bell,
  Scale
} from 'lucide-react';

import PageHeader from '../components/layout/PageHeader';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import EmptyState from '../components/common/EmptyState';

import BuyTimingPanel from '../components/timing/BuyTimingPanel';
import BuyTimingChart from '../components/timing/BuyTimingChart';
import TargetPriceAdvisor from '../components/timing/TargetPriceAdvisor';
import BuyTimingEvidencePanel from '../components/timing/BuyTimingEvidencePanel';

import productApi from '../api/productApi';
import historyApi from '../api/historyApi';
import buyTimingApi from '../api/buyTimingApi';

export function PriceForecast() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlProductId = searchParams.get('id') || searchParams.get('product_id');

  const [productsList, setProductsList] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(urlProductId || '');
  const [daysWindow, setDaysWindow] = useState(30);
  const [selectedRetailerId, setSelectedRetailerId] = useState('');

  // Timing and history data state
  const [timingData, setTimingData] = useState(null);
  const [historyObservations, setHistoryObservations] = useState([]);
  const [availableRetailers, setAvailableRetailers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Load initial product catalog for dropdown
  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const res = await productApi.getProducts({ per_page: 50 });
        if (res && res.success) {
          const items = res.data.items || [];
          setProductsList(items);
          if (!selectedProductId && items.length > 0) {
            const initialId = String(items[0].id);
            setSelectedProductId(initialId);
            setSearchParams({ id: initialId });
          }
        }
      } catch (err) {
        console.error('Failed to load products for timing advisor', err);
      }
    };
    loadCatalog();
  }, []);

  // 2. Synchronize selectedProductId when URL query changes
  useEffect(() => {
    if (urlProductId && urlProductId !== selectedProductId) {
      setSelectedProductId(urlProductId);
    }
  }, [urlProductId]);

  // 3. Fetch Buy Timing Assessment and Time-Series observations
  const fetchTimingData = async () => {
    if (!selectedProductId) return;
    try {
      setLoading(true);
      setError(null);

      const parsedRetailer = selectedRetailerId ? parseInt(selectedRetailerId, 10) : null;
      const numericId = Number(selectedProductId);

      // Parallel fetch: Timing assessment + Historical time-series points
      const [timingRes, historyRes] = await Promise.all([
        buyTimingApi.getBuyTimingAssessment(numericId, { days: daysWindow, retailer_id: parsedRetailer }),
        historyApi.getProductHistory(numericId, daysWindow, parsedRetailer)
      ]);

      if (timingRes && timingRes.success) {
        setTimingData(timingRes.data);
      } else {
        throw new Error(timingRes?.error?.message || 'Failed to retrieve timing assessment.');
      }

      if (historyRes && historyRes.success) {
        setHistoryObservations(historyRes.data.observations || []);
        if (historyRes.data.available_retailers) {
          setAvailableRetailers(historyRes.data.available_retailers);
        }
      }
    } catch (err) {
      setError(err.message || 'Error communicating with purchase timing intelligence service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProductId) {
      fetchTimingData();
    }
  }, [selectedProductId, daysWindow, selectedRetailerId]);

  const handleProductChange = (newId) => {
    setSelectedProductId(newId);
    setSelectedRetailerId('');
    setSearchParams({ id: newId });
  };

  const handleWindowChange = (newDays) => {
    setDaysWindow(newDays);
  };

  const selectedProduct = productsList.find((p) => String(p.id) === String(selectedProductId));

  return (
    <div>
      <PageHeader
        title="Best Time to Buy & Purchase Timing"
        subtitle="Time-series baseline trend evaluation, confidence bounds, and evidence-based purchase timing recommendations"
      />

      {/* Control Bar: Product & Retailer Selectors */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '240px', flex: 1 }}>
            <Search size={16} style={{ color: 'var(--text-dim)' }} />
            <select
              id="timing-product-select"
              aria-label="Select Product to Evaluate"
              value={selectedProductId}
              onChange={(e) => handleProductChange(e.target.value)}
              className="form-control"
              style={{ fontWeight: 600 }}
            >
              {productsList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.brand})
                </option>
              ))}
            </select>
          </div>

          {availableRetailers.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '180px' }}>
              <Store size={15} style={{ color: 'var(--text-dim)' }} />
              <select
                id="timing-retailer-select"
                aria-label="Filter by Retailer"
                value={selectedRetailerId}
                onChange={(e) => setSelectedRetailerId(e.target.value)}
                className="form-control"
                style={{ fontSize: '13px' }}
              >
                <option value="">All Market Retailers</option>
                {availableRetailers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={fetchTimingData}
            disabled={loading}
            className="btn btn-secondary btn-sm"
            aria-label="Refresh Assessment"
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
            Refresh
          </button>

          {selectedProductId && (
            <Link to={`/products/${selectedProductId}`} className="btn btn-secondary btn-sm">
              <ExternalLink size={13} />
              Details
            </Link>
          )}
        </div>
      </div>

      {loading && !timingData && (
        <LoadingSpinner message="Evaluating purchase timing intelligence & historical price trends..." />
      )}

      {error && !loading && (
        <ErrorMessage
          title="Analysis Could Not Be Loaded"
          message={error}
          onRetry={fetchTimingData}
        />
      )}

      {timingData && !loading && (
        <div>
          {/* Main Timing Recommendation Panel */}
          <BuyTimingPanel
            timingData={timingData}
            daysWindow={daysWindow}
            onWindowChange={handleWindowChange}
            loading={loading}
          />

          {/* Time-Series Trajectory Chart */}
          <BuyTimingChart
            observations={historyObservations}
            currentPrice={timingData.current_price ?? timingData.metrics?.current_price}
            historicalMedian={timingData.historical_metrics?.median_historical_price ?? timingData.metrics?.historical_median}
            lowestObserved={timingData.historical_metrics?.lowest_observed_price ?? timingData.metrics?.lowest_observed_price}
            days={daysWindow}
          />

          {/* Target Price Advisor & Alert Setup */}
          <TargetPriceAdvisor
            productId={Number(timingData.product_id || timingData.product?.id || selectedProductId)}
            productName={timingData.product_name || timingData.product?.name}
            currentPrice={timingData.current_price ?? timingData.metrics?.current_price}
            targetRecommendations={timingData.target_recommendations}
            retailerId={selectedRetailerId}
          />

          {/* Transparency & Limitations Panel */}
          <BuyTimingEvidencePanel timingData={timingData} />
        </div>
      )}
    </div>
  );
}

export default PriceForecast;
