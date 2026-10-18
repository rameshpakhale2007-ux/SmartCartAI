import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  ShieldAlert,
  Search,
  Calendar,
  Store,
  RefreshCw,
  ExternalLink,
  Info,
  Scale,
  LineChart,
  Tag,
  AlertTriangle,
} from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import EmptyState from '../components/common/EmptyState';
import HonestyScoreCard from '../components/honesty/HonestyScoreCard';
import DiscountBreakdown from '../components/honesty/DiscountBreakdown';
import HonestyFactors from '../components/honesty/HonestyFactors';
import HistoricalPriceEvidence from '../components/honesty/HistoricalPriceEvidence';
import HonestyEvidenceTable from '../components/honesty/HonestyEvidenceTable';
import productApi from '../api/productApi';
import honestyApi from '../api/honestyApi';
import { formatINR } from '../utils/currency';

export function HonestyIndex() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlProductId = searchParams.get('id') || searchParams.get('product_id');

  const [productsList, setProductsList] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(urlProductId || '');
  const [selectedRetailerId, setSelectedRetailerId] = useState('');
  const [daysWindow, setDaysWindow] = useState(30);

  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Load catalog products for selector dropdown
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
        console.error('Failed to load product catalog for Honesty Index', err);
      }
    };
    loadCatalog();
  }, []);

  // Sync if query param changes
  useEffect(() => {
    if (urlProductId && urlProductId !== selectedProductId) {
      setSelectedProductId(urlProductId);
      setSelectedRetailerId(''); // Reset retailer filter on product change
    }
  }, [urlProductId]);

  // 2. Fetch Honesty Index Analysis
  const loadAnalysis = async () => {
    if (!selectedProductId) return;

    try {
      setLoading(true);
      setError(null);

      const params = {
        days: daysWindow,
        retailer_id: selectedRetailerId ? parseInt(selectedRetailerId) : undefined,
      };

      const res = await honestyApi.getProductHonesty(selectedProductId, params);
      if (res && res.success) {
        setAnalysisData(res.data);
      } else {
        throw new Error(res.error?.message || 'Failed to retrieve honesty analysis.');
      }
    } catch (err) {
      setError(err.message || 'Unable to connect to Honesty Index engine.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalysis();
  }, [selectedProductId, selectedRetailerId, daysWindow]);

  const handleProductSelect = (id) => {
    setSelectedProductId(id);
    setSelectedRetailerId('');
    setSearchParams({ id });
  };

  const selectedProductObj = productsList.find((p) => String(p.id) === String(selectedProductId));

  return (
    <div>
      <PageHeader
        title="Fake Discount Detector & Honesty Index"
        subtitle="Uncover misleading strike-through prices by measuring advertised discounts against verified historical medians"
        actions={
          selectedProductId ? (
            <div style={{ display: 'flex', gap: '8px' }}>
              <Link to={`/products/${selectedProductId}`} className="btn btn-secondary" style={{ fontSize: '12px' }}>
                <ExternalLink size={13} />
                Product Details
              </Link>
              <Link to={`/history?id=${selectedProductId}`} className="btn btn-secondary" style={{ fontSize: '12px' }}>
                <LineChart size={13} />
                Price History
              </Link>
              <Link to={`/compare?id=${selectedProductId}`} className="btn btn-secondary" style={{ fontSize: '12px' }}>
                <Scale size={13} />
                Compare Retailers
              </Link>
            </div>
          ) : null
        }
      />

      {/* Control Bar: Product Selector, Retailer Filter, Days Window */}
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
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '14px', flex: 1, minWidth: '280px' }}>
          {/* Product Select */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px' }}>
            <Search size={16} style={{ color: 'var(--text-muted)' }} />
            <select
              className="input"
              value={selectedProductId}
              onChange={(e) => handleProductSelect(e.target.value)}
              style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }}
            >
              {productsList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.brand} - {formatINR(p.base_mrp)})
                </option>
              ))}
            </select>
          </div>

          {/* Retailer Select */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Store size={15} style={{ color: 'var(--text-muted)' }} />
            <select
              className="input"
              value={selectedRetailerId}
              onChange={(e) => setSelectedRetailerId(e.target.value)}
              style={{ padding: '8px 12px', fontSize: '13px', minWidth: '160px' }}
            >
              <option value="">All / Best Retailer</option>
              {analysisData?.available_retailers?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Days Window Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Calendar size={15} style={{ color: 'var(--text-muted)' }} />
          {[30, 60, 90].map((days) => (
            <button
              key={days}
              onClick={() => setDaysWindow(days)}
              className={daysWindow === days ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              {days} Days
            </button>
          ))}
          <button
            onClick={loadAnalysis}
            className="btn btn-secondary"
            title="Refresh Analysis"
            style={{ padding: '6px 10px' }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <LoadingSpinner message="Evaluating historical observations and discount credibility..." />
      ) : error ? (
        <ErrorMessage message={error} onRetry={loadAnalysis} />
      ) : !analysisData ? (
        <EmptyState
          title="No Product Selected"
          description="Choose a product from the catalog dropdown above to calculate its discount credibility."
        />
      ) : (
        <div>
          {/* Top Score Card */}
          <HonestyScoreCard analysis={analysisData} />

          {/* Advertised vs Real Breakdown */}
          <DiscountBreakdown analysis={analysisData} />

          {/* 4-Pillar Scoring Factors & Explanations */}
          <HonestyFactors analysis={analysisData} />

          {/* Recharts Historical Price Chart with Median & Ref Price lines */}
          <HistoricalPriceEvidence analysis={analysisData} />

          {/* Underlying Observations Snapshots Table */}
          <HonestyEvidenceTable observations={analysisData.observations} />
        </div>
      )}
    </div>
  );
}

export default HonestyIndex;
