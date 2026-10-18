import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Sparkles,
  Package,
  Layers,
  ArrowRight,
  Info,
  Scale,
  SlidersHorizontal,
  ChevronRight,
} from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import EmptyState from '../components/common/EmptyState';
import AlternativeCard from '../components/alternatives/AlternativeCard';
import AlternativeFilters from '../components/alternatives/AlternativeFilters';
import AlternativeComparison from '../components/alternatives/AlternativeComparison';
import { formatINR } from "../utils/currency";
import alternativeApi from "../api/alternativeApi";
import productApi from '../api/productApi';

export function Alternatives() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlProductId = searchParams.get('product_id') || searchParams.get('id');

  const [productsList, setProductsList] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(urlProductId || '');

  // Filter States
  const [minSimilarity, setMinSimilarity] = useState(30);
  const [brand, setBrand] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sort, setSort] = useState('similarity');
  const [page, setPage] = useState(1);

  // Comparison State
  const [comparedProductIds, setComparedProductIds] = useState([]);

  // Data States
  const [alternativesData, setAlternativesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Load catalog products for source selector
  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const res = await productApi.getProducts({ per_page: 50 });
        if (res && res.success) {
          const items = res.data.items || [];
          setProductsList(items);
          if (!selectedProductId && items.length > 0) {
            setSelectedProductId(String(items[0].id));
          } else if (!items.length) {
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load catalog products', err);
        setLoading(false);
      }
    };
    loadCatalog();
  }, []);

  // Sync when URL query param changes
  useEffect(() => {
    if (urlProductId) {
      setSelectedProductId(urlProductId);
    }
  }, [urlProductId]);

  // 2. Fetch Alternatives when source product or filters change
  const loadAlternatives = async () => {
    if (!selectedProductId) return;

    try {
      setLoading(true);
      setError(null);
      const params = {
        min_similarity: minSimilarity,
        brand: brand.trim() || undefined,
        max_price: maxPrice ? parseFloat(maxPrice) : undefined,
        sort,
        page,
        per_page: 12,
      };

      const res = await alternativeApi.getAlternatives(selectedProductId, params);
      if (res && res.success) {
        setAlternativesData(res.data);
      } else {
        throw new Error(res.error?.message || 'Failed to calculate product alternatives.');
      }
    } catch (err) {
      setError(err.message || 'Unable to retrieve alternative recommendations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProductId) {
      loadAlternatives();
    }
  }, [selectedProductId, minSimilarity, brand, maxPrice, sort, page]);

  const handleSelectProduct = (newId) => {
    setSelectedProductId(newId);
    setComparedProductIds([]);
    setSearchParams({ product_id: newId });
  };

  const handleToggleCompare = (altId) => {
    setComparedProductIds((prev) => {
      if (prev.includes(altId)) {
        return prev.filter((id) => id !== altId);
      }
      return [...prev, altId];
    });
  };

  const handleResetFilters = () => {
    setMinSimilarity(30);
    setBrand('');
    setMaxPrice('');
    setSort('similarity');
    setPage(1);
  };

  const sourceProduct = alternativesData?.source_product;
  const sourcePricing = alternativesData?.source_pricing;

  return (
    <div>
      <PageHeader
        title="Intelligent Product Alternatives Engine"
        subtitle="Discover comparable devices with equivalent hardware, lower retail prices, or better value based on multi-attribute similarity"
      />

      {/* Source Product Selector Card */}
      <div
        className="card"
        style={{
          padding: '20px 24px',
          marginBottom: '24px',
          background: '#ffffff',
          border: '1px solid var(--border-card)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
              Select Source Product to Find Alternatives For:
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => handleSelectProduct(e.target.value)}
              className="form-select"
              style={{ minWidth: '320px', fontSize: '14px', fontWeight: 600 }}
            >
              {productsList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.brand} — {p.category})
                </option>
              ))}
            </select>
          </div>

          {/* Active Source Product Quick Pill */}
          {sourceProduct && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 16px',
                background: '#f8fafc',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Current Target</span>
                <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)' }}>
                  {sourceProduct.name}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 900, color: '#38bdf8' }}>
                  Reference Price: {formatINR(sourcePricing?.best_listed_price || sourceProduct.base_mrp)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Side-by-Side Comparison Area */}
      {comparedProductIds.length > 0 && selectedProductId && (
        <AlternativeComparison
          sourceProductId={parseInt(selectedProductId, 10)}
          comparedIds={comparedProductIds}
          onClose={() => setComparedProductIds([])}
        />
      )}

      {/* Filters Toolbar */}
      <AlternativeFilters
        minSimilarity={minSimilarity}
        setMinSimilarity={setMinSimilarity}
        brand={brand}
        setBrand={setBrand}
        maxPrice={maxPrice}
        setMaxPrice={setMaxPrice}
        sort={sort}
        setSort={setSort}
        onReset={handleResetFilters}
      />

      {/* Methodology Disclaimer */}
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
        <Sparkles size={15} style={{ color: 'var(--color-accent)' }} />
        <span>
          <strong>Similarity Scoring Weights:</strong> Category Match (35%) • Technical Hardware Specifications (30%) • Price Proximity (25%) • Brand Alignment (10%). Unrelated product categories are strictly excluded.
        </span>
      </div>

      {/* Results Area */}
      {loading ? (
        <LoadingSpinner message="Calculating hardware similarity vectors and multi-store pricing..." />
      ) : error ? (
        <ErrorMessage
          title="Alternatives Engine Error"
          message={error}
          onRetry={loadAlternatives}
        />
      ) : !alternativesData || alternativesData.alternatives.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No Comparable Alternatives Found"
            description="No alternative products matched the current similarity threshold or budget constraints. Try lowering the minimum similarity percentage or clearing the budget filter."
            actionLabel="Reset Filters"
            onAction={handleResetFilters}
          />
        </div>
      ) : (
        <div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '20px',
              marginBottom: '24px',
            }}
          >
            {alternativesData.alternatives.map((alt) => (
              <AlternativeCard
                key={alt.product.id}
                alternative={alt}
                isCompared={comparedProductIds.includes(alt.product.id)}
                onToggleCompare={handleToggleCompare}
              />
            ))}
          </div>

          {/* Pagination */}
          {alternativesData.total_pages > 1 && (
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
                Page <strong>{page}</strong> of <strong>{alternativesData.total_pages}</strong>
              </span>
              <button
                onClick={() => setPage((p) => Math.min(alternativesData.total_pages, p + 1))}
                disabled={page >= alternativesData.total_pages}
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

export default Alternatives;
