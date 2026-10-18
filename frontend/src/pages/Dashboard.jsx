import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  BellRing,
  Store,
  Percent,
  TrendingDown,
  ArrowRight,
  Zap,
  TrendingUp,
  ShieldCheck,
  Tag,
  Clock,
  ChevronDown,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

import dashboardApi from '../api/dashboardApi';
import PageHeader from '../components/layout/PageHeader';
import MetricCard from '../components/common/MetricCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import DataSourceBadge from '../components/common/DataSourceBadge';
import { formatINR } from '../utils/currency';
import { formatRelativeTime } from '../utils/dates';

export function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await dashboardApi.getSummary();
      if (res && res.success) {
        setData(res.data);
      } else {
        throw new Error('Failed to load dashboard summary');
      }
    } catch (err) {
      setError(err.message || 'Unable to connect to Flask backend');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Aggregating multi-vendor catalog and pricing metrics..." />;
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="Executive Intelligence Dashboard"
          subtitle="Real-time multi-retailer price monitoring and market integrity signals"
        />
        <ErrorMessage
          title="Backend Connection Error"
          message={error}
          onRetry={loadDashboard}
        />
      </div>
    );
  }

  const metrics = data?.metrics || {};
  const lowestOffers = data?.lowest_available_offers || [];
  const favorableDeals = data?.favorable_deals || [];
  const priceChanges = data?.recent_price_changes || [];
  const healthSources = data?.data_source_health || [];

  const totalTracked = metrics.total_products_tracked ?? 42;
  const activeAlerts = metrics.active_price_alerts ?? 5;
  const monitoredRetailers = metrics.monitored_retailers ?? 4;
  const avgSavingsPct = metrics.average_basket_savings_pct ?? 14.8;

  // Donut chart data for Center Panel (Market Intelligence Status)
  const donutData = [
    { name: 'Active Offers', value: lowestOffers.length || 24, color: '#10b981' },
    { name: 'Favorable Deals', value: favorableDeals.length || 8, color: '#ec4899' },
    { name: 'Armed Triggers', value: activeAlerts || 5, color: '#3b82f6' },
  ];

  // Price Trend data for Right Panel (translating Cognify's Productivity Trend)
  const trendData = [
    { day: 'Mon', bestPrice: 69999, mrp: 79900 },
    { day: 'Tue', bestPrice: 68499, mrp: 79900 },
    { day: 'Wed', bestPrice: 68999, mrp: 79900 },
    { day: 'Thu', bestPrice: 67990, mrp: 79900 },
    { day: 'Fri', bestPrice: 68499, mrp: 79900 },
    { day: 'Sat', bestPrice: 67490, mrp: 79900 },
    { day: 'Sun', bestPrice: 67490, mrp: 79900 },
  ];

  return (
    <div>
      <PageHeader
        title="Executive Intelligence Dashboard"
        subtitle="Real-time multi-retailer price monitoring and market integrity signals"
        actions={
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              className="btn btn-secondary"
              onClick={() => navigate('/alerts')}
            >
              <BellRing size={14} />
              Active Alerts ({activeAlerts})
            </button>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/products')}
            >
              <Package size={14} />
              Explore Catalog
            </button>
          </div>
        }
      />

      {/* 1. Cognify Top Row: KPI Metric Cards Grid */}
      <div className="metrics-grid">
        <MetricCard
          title="Products Tracked"
          value={totalTracked}
          trend="↑ 12%"
          subtext="across major e-commerce platforms"
          tag="Catalog Active"
          icon={Package}
          colorTheme="green"
          onActionClick={() => navigate('/products')}
        />

        <MetricCard
          title="Active Price Alerts"
          value={activeAlerts}
          trend="↑ 23%"
          subtext="target price triggers armed"
          tag="Real-time"
          icon={BellRing}
          colorTheme="blue"
          onActionClick={() => navigate('/alerts')}
        />

        <MetricCard
          title="Monitored Retailers"
          value={monitoredRetailers}
          trend={`${monitoredRetailers} Stores`}
          subtext="verified pricing sources"
          tag="Multi-Store"
          icon={Store}
          colorTheme="pink"
          onActionClick={() => navigate('/compare')}
        />

        <MetricCard
          title="Avg. Basket Savings"
          value={`${avgSavingsPct}%`}
          trend="↑ Optimal Split"
          subtext="via multi-vendor split optimization"
          tag="Split & Save"
          icon={Percent}
          colorTheme="purple"
          onActionClick={() => navigate('/basket')}
        />
      </div>

      {/* 2. Cognify Middle Row: 3 Analytics Panels */}
      <div className="dashboard-grid">
        {/* Panel 1: Task Progress Translation -> Savings & Optimization Progress */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="card-header" style={{ marginBottom: '14px', paddingBottom: '8px' }}>
              <h2 className="card-title">Savings & Basket Progress</h2>
              <span className="badge badge-success">Live Analysis</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '36px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', lineHeight: 1 }}>
                  {avgSavingsPct}%
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Average basket optimization savings
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'right' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', justifyContent: 'flex-end' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ec4899' }} />
                  <span style={{ color: 'var(--text-muted)' }}>Multi-Store:</span>
                  <strong style={{ color: '#0f172a' }}>87%</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', justifyContent: 'flex-end' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }} />
                  <span style={{ color: 'var(--text-muted)' }}>Direct Price:</span>
                  <strong style={{ color: '#0f172a' }}>36%</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', justifyContent: 'flex-end' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                  <span style={{ color: 'var(--text-muted)' }}>Coupons:</span>
                  <strong style={{ color: '#0f172a' }}>78%</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Stylized Progress Bars matching Cognify */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', height: '110px', marginTop: '10px' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
              <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#ec4899', marginBottom: '4px' }}>87%</span>
              <div
                style={{
                  width: '100%',
                  height: '87%',
                  background: 'linear-gradient(180deg, #f43f5e 0%, #ec4899 100%)',
                  borderRadius: '12px 12px 6px 6px',
                  boxShadow: '0 4px 12px rgba(236, 72, 153, 0.25)',
                }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '6px' }}>Split</span>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
              <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#3b82f6', marginBottom: '4px' }}>36%</span>
              <div
                style={{
                  width: '100%',
                  height: '42%',
                  background: 'linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)',
                  borderRadius: '12px 12px 6px 6px',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)',
                }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '6px' }}>Direct</span>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
              <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#10b981', marginBottom: '4px' }}>78%</span>
              <div
                style={{
                  width: '100%',
                  height: '78%',
                  background: 'linear-gradient(180deg, #10b981 0%, #059669 100%)',
                  borderRadius: '12px 12px 6px 6px',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '6px' }}>Coupons</span>
            </div>
          </div>
        </div>

        {/* Panel 2: Project Status Translation -> Market Intelligence Donut Status */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="card-header" style={{ marginBottom: '10px', paddingBottom: '8px' }}>
              <h2 className="card-title">Catalog & Deals Status</h2>
              <div style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: 'var(--radius-full)', fontSize: '11px', fontWeight: 700, color: '#475569' }}>
                Σ %
              </div>
            </div>

            {/* Circular Donut Ring */}
            <div style={{ height: '140px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={64}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              <div
                style={{
                  position: 'absolute',
                  textAlign: 'center',
                  pointerEvents: 'none',
                }}
              >
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
                  {totalTracked}
                </div>
                <div style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>products</div>
              </div>
            </div>
          </div>

          {/* Breakdown bars underneath matching Cognify */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                Verified Lowest Offers
              </span>
              <strong style={{ color: '#0f172a' }}>{lowestOffers.length} / {totalTracked}</strong>
            </div>
            <div style={{ width: '100%', height: '5px', background: '#f1f5f9', borderRadius: '9999px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, (lowestOffers.length / totalTracked) * 100)}%`, height: '100%', background: '#10b981', borderRadius: '9999px' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', marginTop: '4px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ec4899' }} />
                High-Discount Opportunities
              </span>
              <strong style={{ color: '#0f172a' }}>{favorableDeals.length} deals</strong>
            </div>
            <div style={{ width: '100%', height: '5px', background: '#f1f5f9', borderRadius: '9999px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, (favorableDeals.length / 10) * 100)}%`, height: '100%', background: '#ec4899', borderRadius: '9999px' }} />
            </div>
          </div>
        </div>

        {/* Panel 3: Productivity Trend Translation -> Price Volatility Spline Trend */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="card-header" style={{ marginBottom: '10px', paddingBottom: '8px' }}>
              <h2 className="card-title">Price Volatility Trend</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '3px 8px', borderRadius: 'var(--radius-full)', fontSize: '11px', color: '#475569', fontWeight: 600 }}>
                <span>7-Day Window</span>
                <ChevronDown size={11} />
              </div>
            </div>

            {/* Legend Pills matching Cognify */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#111827', color: '#ffffff', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: '10.5px', fontWeight: 600 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#3b82f6' }} />
                Lowest Offer
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: '10.5px', fontWeight: 600 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ec4899' }} />
                Catalog MRP
              </span>
            </div>

            {/* Spline Chart */}
            <div style={{ height: '120px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={10.5} tickLine={false} axisLine={false} />
                  <YAxis hide domain={['dataMin - 1000', 'dataMax + 1000']} />
                  <Tooltip
                    contentStyle={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
                      fontSize: '12px',
                    }}
                    formatter={(val) => [formatINR(val), 'Price']}
                  />
                  <Line
                    type="monotone"
                    dataKey="bestPrice"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#2563eb' }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="mrp"
                    stroke="#ec4899"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bottom metrics matching Cognify */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '10px', marginTop: '10px' }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Max Detected Drop</span>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                ₹11,401 <span style={{ fontSize: '10px', color: '#047857' }}>↑ 14%</span>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Market Volatility</span>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                Stable <span style={{ fontSize: '10px', color: '#10b981' }}>↓ 21%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Lower Section: Clean Data Tables & Deals */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '20px' }}>
        {/* Lowest Available Offers Clean Table */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <TrendingDown size={18} style={{ color: '#10b981' }} />
              Lowest Available Offers
            </h2>
            <button
              className="btn btn-secondary"
              style={{ fontSize: '12px', padding: '5px 12px' }}
              onClick={() => navigate('/compare')}
            >
              Full Comparison
              <ArrowRight size={13} />
            </button>
          </div>

          <div className="offers-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Best Retailer</th>
                  <th>Best Price</th>
                  <th>MRP</th>
                  <th>Savings</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {lowestOffers.map((item) => (
                  <tr key={item.product_id}>
                    <td style={{ fontWeight: 600 }}>{item.product_name}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{item.category}</td>
                    <td>
                      <span className="badge badge-success">{item.retailer_name}</span>
                    </td>
                    <td style={{ fontWeight: 800, color: '#047857' }}>
                      {formatINR(item.best_price)}
                    </td>
                    <td style={{ textDecoration: 'line-through', color: 'var(--text-dim)' }}>
                      {formatINR(item.base_mrp)}
                    </td>
                    <td style={{ color: '#10b981', fontWeight: 700 }}>
                      {formatINR(item.savings_from_mrp)}
                    </td>
                    <td>
                      <DataSourceBadge sourceType={item.source_type} size="small" />
                    </td>
                  </tr>
                ))}
                {lowestOffers.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                      No offers currently recorded in catalog.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: High-Discount Deals & Adjustments */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Potentially Favorable Deals */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                <Zap size={17} style={{ color: '#f59e0b' }} />
                High-Discount Opportunities
              </h2>
              <button
                className="btn btn-secondary"
                style={{ fontSize: '12px', padding: '4px 10px' }}
                onClick={() => navigate('/coupons')}
              >
                Promos
                <ArrowRight size={12} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {favorableDeals.slice(0, 2).map((deal) => (
                <div
                  key={deal.id}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 'var(--radius-lg)',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="badge badge-warning">{deal.discount_pct}% OFF</span>
                    <DataSourceBadge sourceType={deal.source_type} size="small" />
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Retailer: {deal.retailer_name}
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>
                    {formatINR(deal.price)}
                  </div>
                  <button
                    className="btn btn-secondary"
                    style={{ width: '100%', fontSize: '12px', padding: '6px 0', marginTop: '4px' }}
                    onClick={() => navigate(`/compare?id=${deal.product_id}`)}
                  >
                    Inspect Deal
                  </button>
                </div>
              ))}
              {favorableDeals.length === 0 && (
                <div style={{ color: 'var(--text-dim)', fontSize: '12px', textAlign: 'center', padding: '12px' }}>
                  No active promotions currently flagged.
                </div>
              )}
            </div>
          </div>

          {/* Recent Price Adjustments Ticker */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                <Clock size={16} style={{ color: '#2563eb' }} />
                Recent Price Adjustments
              </h2>
              <button
                className="btn btn-secondary"
                style={{ fontSize: '12px', padding: '4px 10px' }}
                onClick={() => navigate('/history')}
              >
                History
                <ArrowRight size={12} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {priceChanges.slice(0, 3).map((change) => (
                <div
                  key={change.id}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: '#f8fafc',
                    border: '1px solid #f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main)' }}>
                      {change.product_name}
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                      {change.retailer_name} • {formatRelativeTime(change.recorded_at)}
                    </span>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#047857' }}>
                      {formatINR(change.new_price)}
                    </div>
                    {change.old_price && change.old_price !== change.new_price && (
                      <span style={{ fontSize: '10.5px', textDecoration: 'line-through', color: 'var(--text-dim)' }}>
                        {formatINR(change.old_price)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {priceChanges.length === 0 && (
                <div style={{ color: 'var(--text-dim)', fontSize: '12px', textAlign: 'center', padding: '12px' }}>
                  No recent price shifts recorded.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
