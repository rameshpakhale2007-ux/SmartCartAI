import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Package,
  Scale,
  LineChart,
  ShieldAlert,
  ArrowLeft,
  Store,
  Layers,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Bell,
  Sparkles,
  Tag,
  ShoppingBag,
  MessageSquareText,
} from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import DataSourceBadge from '../components/common/DataSourceBadge';
import ProductSpecifications from '../components/products/ProductSpecifications';
import { formatINR } from '../utils/currency';
import { formatDate } from '../utils/dates';
import productApi from '../api/productApi';

export function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [product, setProduct] = useState(null);
  const [imageError, setImageError] = useState(false);

  const fetchProduct = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await productApi.getProductById(id);
      if (res && res.success) {
        setProduct(res.data);
      } else {
        throw new Error('Failed to retrieve product details');
      }
    } catch (err) {
      setError(err.message || 'Product could not be found or loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProduct();
  }, [id]);

  if (loading) {
    return <LoadingSpinner message="Retrieving product intelligence & specifications..." />;
  }

  if (error || !product) {
    return (
      <div>
        <PageHeader
          title="Product Intelligence"
          subtitle="Multi-vendor specifications and availability analysis"
        />
        <ErrorMessage
          title="Product Not Available"
          message={error || `Product #${id} does not exist.`}
          onRetry={fetchProduct}
        />
        <button
          onClick={() => navigate('/products')}
          className="btn btn-secondary"
          style={{ marginTop: '16px' }}
        >
          <ArrowLeft size={15} />
          Back to Product Catalog
        </button>
      </div>
    );
  }

  const summary = product.offers_summary || {};
  const cheapestOffer = summary.cheapest_eligible_offer;

  return (
    <div>
      <PageHeader
        title={product.name}
        subtitle={`${product.brand} • ${product.category} • SKU: ${product.sku}`}
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link to="/products" className="btn btn-secondary">
              <ArrowLeft size={14} />
              All Products
            </Link>
            <Link to={`/compare?id=${product.id}`} className="btn btn-primary">
              <Scale size={14} />
              Compare Prices
            </Link>
          </div>
        }
      />

      {/* Main Grid: Visuals & Core Pricing */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(300px, 420px) 1fr',
          gap: 'var(--space-xl)',
          marginBottom: 'var(--space-xl)',
        }}
      >
        {/* Left: Product Image & Meta */}
        <div className="card" style={{ padding: '20px' }}>
          <div
            style={{
              height: '320px',
              background: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              marginBottom: '16px',
              position: 'relative',
            }}
          >
            {product.image_url && !imageError ? (
              <img
                src={product.image_url}
                alt={product.name}
                onError={() => setImageError(true)}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <div style={{ color: 'var(--text-dim)', textAlign: 'center' }}>
                <Package size={56} style={{ margin: '0 auto 8px' }} />
                <span>Image Unavailable</span>
              </div>
            )}
            <div style={{ position: 'absolute', top: '10px', left: '10px' }}>
              <DataSourceBadge sourceType={product.source_type} />
            </div>
          </div>

          {/* Quick Meta List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Brand</span>
              <span style={{ fontWeight: 600 }}>{product.brand}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Category</span>
              <span style={{ fontWeight: 600 }}>{product.category}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-muted)' }}>SKU</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{product.sku}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Catalog Added</span>
              <span>{formatDate(product.created_at)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
              <span style={{ color: 'var(--text-muted)' }}>Last Price Sync</span>
              <span>{formatDate(product.updated_at, true)}</span>
            </div>
          </div>
        </div>

        {/* Right: Pricing Overview & Quick Intelligence Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
          {/* Price Snapshot Card */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                <Store size={18} style={{ color: 'var(--color-primary)' }} />
                Multi-Vendor Price Snapshot
              </h2>
              <span className="badge badge-success">
                {summary.total_offers || 0} Offers Available
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '20px',
              }}
            >
              <div style={{ padding: '14px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Reference MRP
                </span>
                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
                  {formatINR(product.base_mrp)}
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Manufacturer Listed</span>
              </div>

              <div style={{ padding: '14px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Best In-Stock Landed Price
                </span>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#34d399', marginTop: '4px' }}>
                  {cheapestOffer ? formatINR(cheapestOffer.estimated_total ?? cheapestOffer.price) : 'No In-Stock Offer'}
                </div>
                <span style={{ fontSize: '11px', color: 'var(--color-success)' }}>
                  {cheapestOffer ? `via ${cheapestOffer.retailer_name}` : 'Check back later'}
                </span>
              </div>

              <div style={{ padding: '14px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Price Variance / Spread
                </span>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#818cf8', marginTop: '4px' }}>
                  {formatINR(summary.price_spread || 0)}
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Across active retailers</span>
              </div>
            </div>

            {/* Quick module navigations */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
              <Link to={`/compare?id=${product.id}`} className="btn btn-primary" style={{ fontSize: '12px', justifyContent: 'center' }}>
                <Scale size={13} />
                Compare Retailers
              </Link>
              <Link to={`/history?id=${product.id}`} className="btn btn-secondary" style={{ fontSize: '12px', justifyContent: 'center' }}>
                <LineChart size={13} />
                Price History
              </Link>
              <Link to={`/alerts?product_id=${product.id}`} className="btn btn-secondary" style={{ fontSize: '12px', justifyContent: 'center' }}>
                <Bell size={13} />
                Set Price Alert
              </Link>
              <Link to={`/alternatives?product_id=${product.id}`} className="btn btn-secondary" style={{ fontSize: '12px', justifyContent: 'center' }}>
                <Sparkles size={13} />
                Similar Alternatives
              </Link>
              <Link to={`/coupons?product_id=${product.id}`} className="btn btn-secondary" style={{ fontSize: '12px', justifyContent: 'center' }}>
                <Tag size={13} />
                Applicable Coupons
              </Link>
              <Link to={`/honesty?id=${product.id}`} className="btn btn-secondary" style={{ fontSize: '12px', justifyContent: 'center' }}>
                <ShieldAlert size={13} />
                Honesty Index
              </Link>
              <Link to="/basket" className="btn btn-secondary" style={{ fontSize: '12px', justifyContent: 'center' }}>
                <ShoppingBag size={13} />
                Basket Optimizer
              </Link>
              <Link to={`/forecast?id=${product.id}`} className="btn btn-secondary" style={{ fontSize: '12px', justifyContent: 'center' }}>
                <Calendar size={13} />
                Best Time to Buy
              </Link>
              <Link to={`/tco?id=${product.id}`} className="btn btn-secondary" style={{ fontSize: '12px', justifyContent: 'center' }}>
                <Layers size={13} />
                TCO & Resale
              </Link>
              <Link to={`/reviews?id=${product.id}`} className="btn btn-secondary" style={{ fontSize: '12px', justifyContent: 'center' }}>
                <MessageSquareText size={13} />
                Review Integrity
              </Link>
            </div>
          </div>

          {/* Description Card */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Product Description</h2>
            </div>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, fontSize: '14px' }}>
              {product.description || 'No detailed description recorded for this product model.'}
            </p>
          </div>
        </div>
      </div>

      {/* Specifications Card */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            <Layers size={18} style={{ color: 'var(--color-accent)' }} />
            Technical Specifications
          </h2>
        </div>
        <ProductSpecifications specs={product.specs} />
      </div>
    </div>
  );
}

export default ProductDetails;
