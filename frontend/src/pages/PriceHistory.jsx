import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  LineChart,
  Calendar,
  Store,
  TrendingDown,
  TrendingUp,
  Percent,
  Clock,
  RefreshCw,
  Info,
  Scale,
  Bell,
} from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import PriceHistoryChart from '../components/charts/PriceHistoryChart';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import EmptyState from '../components/common/EmptyState';
import DataSourceBadge from '../components/common/DataSourceBadge';
import { formatINR } from '../utils/currency';
import { formatDate } from '../utils/dates';
import productApi from '../api/productApi';
import historyApi from '../api/historyApi';

export function PriceHistory() {
  const [searchParams, setSearchParams] = useSearchParams();
  const productIdFromQuery = searchParams.get('id');

  const [productsList, setProductsList] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(productIdFromQuery || '');
  const [daysWindow, setDaysWindow] = useState(30);
  const [selectedRetailerId, setSelectedRetailerId] = useState('');

  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Load products for selector
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
        console.error('Failed to load products list', err);
      }
    };
    loadCatalog();
  }, []);

  // 2. Synchronize selectedProductId when query param changes
  useEffect(() => {
    if (productIdFromQuery && productIdFromQuery !== selectedProductId) {
      setSelectedProductId(productIdFromQuery);
    }
  }, [productIdFromQuery]);

  // 3. Fetch history observations and statistics
  const fetchHistory = async () => {
    if (!selectedProductId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await historyApi.getProductHistory(
        selectedProductId,
        daysWindow,
        selectedRetailerId ? parseInt(selectedRetailerId, 10) : null
      );
      if (res && res.success) {
        setHistoryData(res.data);
      } else {
        throw new Error('Failed to retrieve historical price data');
      }
    } catch (err) {
      setError(err.message || 'Error communicating with historical price service');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProductId) {
      fetchHistory();
    }
  }, [selectedProductId, daysWindow, selectedRetailerId]);

  const handleProductChange = (newId) => {
    setSelectedProductId(newId);
    setSelectedRetailerId(''); // Reset retailer filter on product switch
    setSearchParams({ id: newId });
  };

  const product = historyData?.product;
  const stats = historyData?.statistics;
  const observations = historyData?.observations || [];
  const availableRetailers = historyData?.available_retailers || [];
  const hasSufficientData = historyData?.has_sufficient_data;

  return (
    <div>
      <PageHeader
        title="Historical Price Tracking"
        subtitle="30-day, 60-day, and 90-day time-series trajectories, volatility analysis, and median reference benchmarks"
      />

      {/* Product & Filter Selection Bar */}
      <div
        className="card"
        style={{
          padding: '16px',
          marginBottom: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '260px' }}>
          <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            Product:
          </label>
          <select
            value={selectedProductId}
            onChange={(e) => handleProductChange(e.target.value)}
            style={{ width: '100%', maxWidth: '380px' }}
            aria-label="Select product for price history"
          >
            {productsList.map((p) => (
              <option key={p.id} value={p.id}>
                {p.brand} — {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Retailer Filter */}
        {availableRetailers.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
              Filter Retailer:
            </label>
            <select
              value={selectedRetailerId}
              onChange={(e) => setSelectedRetailerId(e.target.value)}
              style={{ fontSize: '12px', padding: '4px 8px' }}
              aria-label="Filter historical data by retailer"
            >
              <option value="">All Retailers Combined</option>
              {availableRetailers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Time Window Buttons (30, 60, 90 Days) */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {[30, 60, 90].map((days) => (
            <button
              key={days}
              onClick={() => setDaysWindow(days)}
              className={daysWindow === days ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ fontSize: '12px', padding: '6px 14px' }}
              aria-label={`Show ${days} days history`}
            >
              {days} Days
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message={`Compiling ${daysWindow}-day price trajectory & statistical aggregations...`} />
      ) : error ? (
        <ErrorMessage
          title="Price History Error"
          message={error}
          onRetry={fetchHistory}
        />
      ) : !product ? (
        <EmptyState
          title="No Product Selected"
          description="Select a product from the dropdown above to inspect historical price movements."
        />
      ) : (
        <>
          {/* Product Header & Quick Links */}
          <div
            className="card"
            style={{
              marginBottom: '20px',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase' }}>
                  {product.brand}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>•</span>
                <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{product.category}</span>
                <DataSourceBadge sourceType={product.source_type} size="small" />
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '2px' }}>
                {product.name}
              </h2>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Time Window: <strong>Past {daysWindow} Days</strong>
                {stats?.period_start && (
                  <span> ({formatDate(stats.period_start)} to {formatDate(stats.period_end)})</span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <Link to={`/compare?id=${product.id}`} className="btn btn-secondary" style={{ fontSize: '12px' }}>
                <Scale size={13} />
                Compare Retailers
              </Link>
              <Link to={`/alerts?product_id=${product.id}`} className="btn btn-primary" style={{ fontSize: '12px' }}>
                <Bell size={13} />
                Set Price Alert
              </Link>
            </div>
          </div>

          {/* Statistics Grid */}
          {stats ? (
            <div className="metrics-grid" style={{ marginBottom: '20px' }}>
              <div className="metric-card">
                <span className="metric-title">Latest Observed Price</span>
                <div className="metric-value" style={{ color: '#38bdf8' }}>
                  {formatINR(stats.current_observed_price)}
                </div>
                <span className="metric-subtext">
                  Most recent observation in period
                </span>
              </div>

              <div className="metric-card">
                <span className="metric-title">Period Low (Min)</span>
                <div className="metric-value" style={{ color: '#34d399' }}>
                  {formatINR(stats.min_price)}
                </div>
                <span className="metric-subtext">
                  All-time low across {stats.observation_count} checks
                </span>
              </div>

              <div className="metric-card">
                <span className="metric-title">Period High (Max)</span>
                <div className="metric-value" style={{ color: '#f87171' }}>
                  {formatINR(stats.max_price)}
                </div>
                <span className="metric-subtext">
                  Maximum observed strike price
                </span>
              </div>

              <div className="metric-card">
                <span className="metric-title">Period Median</span>
                <div className="metric-value" style={{ color: '#fbbf24' }}>
                  {formatINR(stats.median_price)}
                </div>
                <span className="metric-subtext">
                  Median benchmark for discount validity
                </span>
              </div>

              <div className="metric-card">
                <span className="metric-title">Period Price Change</span>
                <div
                  className="metric-value"
                  style={{
                    color: stats.price_change <= 0 ? 'var(--color-success)' : 'var(--color-danger)',
                  }}
                >
                  {stats.price_change <= 0 ? formatINR(stats.price_change) : `+${formatINR(stats.price_change)}`}
                </div>
                <span className="metric-subtext">
                  {stats.price_change_pct <= 0 ? `${stats.price_change_pct}% price drop` : `+${stats.price_change_pct}% price increase`}
                </span>
              </div>
            </div>
          ) : null}

          {/* Historical Observation vs Current Price Disclaimer */}
          <div
            style={{
              background: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              marginBottom: '20px',
              fontSize: '12px',
              color: '#93c5fd',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Info size={16} style={{ flexShrink: 0 }} />
            <span>
              <strong>Methodology Note:</strong> This chart displays stored chronological observation records ({observations.length} data points). Historical observations represent prices captured at the recorded timestamps and do not imply live real-time scrapings.
            </span>
          </div>

          {/* Interactive Recharts Area */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                <LineChart size={18} style={{ color: 'var(--color-primary)' }} />
                Price Fluctuation Over Time ({daysWindow} Days)
              </h2>
              {stats && (
                <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                  Total Observations: <strong>{stats.observation_count}</strong>
                </span>
              )}
            </div>

            {!hasSufficientData ? (
              <div style={{ padding: '30px', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '8px' }}>
                  Insufficient historical data available for this selection.
                </p>
                <p style={{ color: 'var(--text-dim)', fontSize: '12px' }}>
                  SmartCart AI requires at least 3 validated price observations to compute statistical curves.
                </p>
              </div>
            ) : (
              <PriceHistoryChart observations={observations} statistics={stats} />
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default PriceHistory;
