import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Tag,
  Percent,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertCircle,
  HelpCircle,
  Layers,
} from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import EmptyState from '../components/common/EmptyState';
import CouponCard from '../components/coupons/CouponCard';
import CouponFilters from '../components/coupons/CouponFilters';
import CouponValidationForm from '../components/coupons/CouponValidationForm';
import CouponSavingsSummary from '../components/coupons/CouponSavingsSummary';
import couponApi from '../api/couponApi';
import productApi from '../api/productApi';

export function Coupons() {
  const [searchParams] = useSearchParams();
  const preselectedProductId = searchParams.get('product_id');

  // Filters State
  const [search, setSearch] = useState('');
  const [retailerId, setRetailerId] = useState('');
  const [discountType, setDiscountType] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);

  // Data State
  const [couponsData, setCouponsData] = useState({ items: [], total_count: 0, total_pages: 1 });
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Validation State
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [validationResult, setValidationResult] = useState(null);

  // 1. Load Products for validation dropdown
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await productApi.getProducts({ per_page: 50 });
        if (res && res.success) {
          setProducts(res.data.items || []);
        }
      } catch (err) {
        console.error('Failed to load products for coupon validation', err);
      }
    };
    loadProducts();
  }, []);

  // 2. Load Coupons
  const loadCoupons = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        search: search.trim() || undefined,
        retailer_id: retailerId || undefined,
        discount_type: discountType || undefined,
        product_id: preselectedProductId || undefined,
        sort,
        page,
        per_page: 12,
      };

      if (statusFilter === 'active') {
        params.active_only = true;
      } else if (statusFilter === 'verified') {
        params.verification_status = 'verified';
        params.active_only = false;
      } else if (statusFilter === 'unverified') {
        params.verification_status = 'unverified';
        params.active_only = false;
      } else if (statusFilter === 'expired') {
        params.verification_status = 'expired';
        params.active_only = false;
      } else if (statusFilter === 'all') {
        params.active_only = false;
      }

      const res = await couponApi.getCoupons(params);
      if (res && res.success) {
        setCouponsData(res.data);
      } else {
        throw new Error('Failed to retrieve coupon promotions catalog.');
      }
    } catch (err) {
      setError(err.message || 'Unable to connect to the coupon intelligence service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, [search, retailerId, discountType, statusFilter, sort, page, preselectedProductId]);

  const handleResetFilters = () => {
    setSearch('');
    setRetailerId('');
    setDiscountType('');
    setStatusFilter('active');
    setSort('newest');
    setPage(1);
  };

  const handleSelectCoupon = (coupon) => {
    setSelectedCoupon(coupon);
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  return (
    <div>
      <PageHeader
        title="Coupons & Promotions Intelligence"
        subtitle="Discover verified discounts, test eligibility rules against cart totals, and transparently compute true net savings"
      />

      {/* Metrics Row */}
      <div className="metrics-grid" style={{ marginBottom: '24px' }}>
        <div className="metric-card">
          <span className="metric-title">Catalog Promotions</span>
          <div className="metric-value">{couponsData.total_count}</div>
          <span className="metric-subtext">Active & archival discounts</span>
        </div>
        <div className="metric-card">
          <span className="metric-title">Verified Offers</span>
          <div className="metric-value" style={{ color: '#34d399' }}>
            {couponsData.items.filter((c) => c.verification_status === 'verified').length}
          </div>
          <span className="metric-subtext">Validated merchant terms</span>
        </div>
        <div className="metric-card">
          <span className="metric-title">Supported Retailers</span>
          <div className="metric-value" style={{ color: '#818cf8' }}>
            5
          </div>
          <span className="metric-subtext">Amazon, Flipkart, Croma & more</span>
        </div>
      </div>

      {/* Interactive Validator Area */}
      <CouponValidationForm
        selectedCoupon={selectedCoupon}
        products={products}
        onValidationComplete={(res) => setValidationResult(res)}
        onResetSelection={() => setSelectedCoupon(null)}
      />

      {/* Savings Summary Banner */}
      {validationResult && (
        <CouponSavingsSummary
          result={validationResult}
          onDismiss={() => setValidationResult(null)}
        />
      )}

      {/* Filters Toolbar */}
      <CouponFilters
        search={search}
        setSearch={setSearch}
        retailerId={retailerId}
        setRetailerId={setRetailerId}
        discountType={discountType}
        setDiscountType={setDiscountType}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        sort={sort}
        setSort={setSort}
        onReset={handleResetFilters}
      />

      {/* Provenance Notice */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 14px',
          background: 'rgba(99, 102, 241, 0.08)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          borderRadius: 'var(--radius-md)',
          fontSize: '12px',
          color: 'var(--text-muted)',
          marginBottom: '20px',
        }}
      >
        <HelpCircle size={15} style={{ color: 'var(--color-accent)' }} />
        <span>
          <strong>Provenance Transparency:</strong> Demonstration coupons are seeded for algorithmic testing and savings evaluation. SmartCart AI does not scrape live checkouts without authorization.
        </span>
      </div>

      {/* Coupons Grid Area */}
      {loading ? (
        <LoadingSpinner message="Scanning active promotional vouchers and discount codes..." />
      ) : error ? (
        <ErrorMessage
          title="Coupons Service Error"
          message={error}
          onRetry={loadCoupons}
        />
      ) : couponsData.items.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No Matching Promotions Found"
            description="No coupons matched your current search filters or retailer selection. Try broadening your criteria or resetting filters."
            actionLabel="Reset All Filters"
            onAction={handleResetFilters}
          />
        </div>
      ) : (
        <div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '20px',
              marginBottom: '24px',
            }}
          >
            {couponsData.items.map((coupon) => (
              <CouponCard
                key={coupon.id}
                coupon={coupon}
                isSelected={selectedCoupon?.id === coupon.id}
                onSelectForValidation={handleSelectCoupon}
              />
            ))}
          </div>

          {/* Pagination */}
          {couponsData.total_pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="btn btn-secondary"
                style={{ fontSize: '12px' }}
              >
                Previous Page
              </button>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Page <strong>{page}</strong> of <strong>{couponsData.total_pages}</strong>
              </span>
              <button
                onClick={() => setPage((p) => Math.min(couponsData.total_pages, p + 1))}
                disabled={page >= couponsData.total_pages}
                className="btn btn-secondary"
                style={{ fontSize: '12px' }}
              >
                Next Page
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Coupons;
