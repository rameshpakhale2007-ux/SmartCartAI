import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Scale,
  Sparkles,
  AlertTriangle,
  Info,
  CheckCircle,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import PriceComparisonTable from '../components/products/PriceComparisonTable';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import EmptyState from '../components/common/EmptyState';
import DataSourceBadge from '../components/common/DataSourceBadge';
import { formatINR } from '../utils/currency';
import productApi from '../api/productApi';

export function PriceComparison() {
  const [searchParams, setSearchParams] = useSearchParams();
  const productIdFromQuery = searchParams.get('id');

  const [productsList, setProductsList] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(productIdFromQuery || '');
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('estimated_total');

  // Load available products for dropdown selector
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
        console.error('Failed to load products list for selector', err);
      }
    };
    loadCatalog();
  }, []);

  // Update selectedProductId when URL param changes
  useEffect(() => {
    if (productIdFromQuery && productIdFromQuery !== selectedProductId) {
      setSelectedProductId(productIdFromQuery);
    }
  }, [productIdFromQuery]);

  // Load comparison data whenever selectedProductId or sortBy changes
  const fetchComparison = async () => {
    if (!selectedProductId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await productApi.getProductOffers(selectedProductId, sortBy);
      if (res && res.success) {
        setComparisonData(res.data);
      } else {
        throw new Error('Failed to retrieve price comparison data');
      }
    } catch (err) {
      setError(err.message || 'Error communicating with pricing engine');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProductId) {
      fetchComparison();
    }
  }, [selectedProductId, sortBy]);

  const handleProductSelect = (id) => {
    setSelectedProductId(id);
    setSearchParams({ id });
  };

  const product = comparisonData?.product;
  const offers = comparisonData?.offers || [];
  const cheapestEligible = comparisonData?.cheapest_eligible_offer;
  const hasUnknownShipping = comparisonData?.has_unknown_shipping;

  return (
    <div>
      <PageHeader
        title="Multi-Platform Price Comparison"
        subtitle="Compare verified offers across e-commerce platforms with shipping, delivery SLAs, and landed cost validation"
      />

      {/* Product Selector Dropdown Bar */}
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
            Select Product:
          </label>
          <select
            value={selectedProductId}
            onChange={(e) => handleProductSelect(e.target.value)}
            style={{ width: '100%', maxWidth: '400px' }}
            aria-label="Select product to compare"
          >
            {productsList.map((p) => (
              <option key={p.id} value={p.id}>
                {p.brand} — {p.name}
              </option>
            ))}
          </select>
        </div>

        {product && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link to={`/products/${product.id}`} className="btn btn-secondary" style={{ fontSize: '12px' }}>
              Full Specs
            </Link>
            <Link to={`/history?id=${product.id}`} className="btn btn-secondary" style={{ fontSize: '12px' }}>
              Price History
            </Link>
          </div>
        )}
      </div>

      {loading ? (
        <LoadingSpinner message="Calculating multi-vendor landed totals..." />
      ) : error ? (
        <ErrorMessage
          title="Price Comparison Error"
          message={error}
          onRetry={fetchComparison}
        />
      ) : !product ? (
        <EmptyState
          title="No Product Selected"
          description="Please choose a product from the dropdown above to inspect multi-retailer pricing."
        />
      ) : (
        <>
          {/* Product Header Card */}
          <div
            className="card"
            style={{
              marginBottom: '20px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '20px',
              alignItems: 'center',
              justifyContent: 'space-between',
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
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                {product.name}
              </h2>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Official Reference MRP: <strong>{formatINR(product.base_mrp)}</strong>
              </div>
            </div>

            {/* Best Deal Callout Box */}
            {cheapestEligible ? (
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'rgba(16, 185, 129, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-success)',
                  }}
                >
                  <Sparkles size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>
                    Recommended Landed Deal
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#34d399' }}>
                    {formatINR(cheapestEligible.estimated_total)}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    via <strong>{cheapestEligible.retailer_name}</strong> (In Stock)
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  color: '#fbbf24',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertTriangle size={16} />
                <span>No eligible in-stock offers with verified complete landed pricing found.</span>
              </div>
            )}
          </div>

          {/* Unknown Shipping / Disclaimer Notice */}
          {hasUnknownShipping && (
            <div
              style={{
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 16px',
                marginBottom: '20px',
                fontSize: '13px',
                color: '#93c5fd',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <Info size={18} style={{ flexShrink: 0 }} />
              <div>
                <strong>Shipping Transparency Notice:</strong> Certain retailers do not declare fixed shipping costs upfront. SmartCart AI labels these totals as incomplete rather than assuming free delivery, ensuring price recommendations remain strictly honest.
              </div>
            </div>
          )}

          {/* Comparison Table */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                <Scale size={18} style={{ color: 'var(--color-primary)' }} />
                Retailer Offers Comparison
              </h2>
            </div>

            <PriceComparisonTable
              offers={offers}
              cheapestEligibleOffer={cheapestEligible}
              sortBy={sortBy}
              onSortChange={setSortBy}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default PriceComparison;
