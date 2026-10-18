import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Package, ChevronLeft, ChevronRight } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import ProductCard from '../components/products/ProductCard';
import ProductSearch from '../components/products/ProductSearch';
import ProductFilters from '../components/products/ProductFilters';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import EmptyState from '../components/common/EmptyState';
import productApi from '../api/productApi';

export function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [search, setSearch] = useState(initialQuery);
  const [debouncedSearch, setDebouncedSearch] = useState(initialQuery);
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [productsData, setProductsData] = useState({
    items: [],
    pagination: { page: 1, per_page: 12, total_items: 0, total_pages: 1 },
    filters: { categories: [], brands: [] },
  });

  // Track latest request token to prevent stale responses from overwriting newer ones
  const latestRequestRef = useRef(0);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 on new query
    }, 350);
    return () => clearTimeout(handler);
  }, [search]);

  // Sync with URL query parameter changes
  useEffect(() => {
    const q = searchParams.get('q');
    if (q !== null && q !== search) {
      setSearch(q);
      setDebouncedSearch(q);
      setPage(1);
    }
  }, [searchParams]);

  const fetchProducts = async () => {
    const requestId = ++latestRequestRef.current;
    try {
      setLoading(true);
      setError(null);

      const params = {
        search: debouncedSearch.trim() || undefined,
        category: category || undefined,
        brand: brand || undefined,
        min_price: minPrice ? Number(minPrice) : undefined,
        max_price: maxPrice ? Number(maxPrice) : undefined,
        sort: sortBy,
        page,
        per_page: 12,
      };

      const res = await productApi.getProducts(params);

      // Verify this is still the newest request
      if (requestId === latestRequestRef.current) {
        if (res && res.success) {
          setProductsData(res.data);
        } else {
          throw new Error('Failed to load products');
        }
      }
    } catch (err) {
      if (requestId === latestRequestRef.current) {
        setError(err.message || 'Error fetching products from server');
      }
    } finally {
      if (requestId === latestRequestRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [debouncedSearch, category, brand, minPrice, maxPrice, sortBy, page]);

  const handleResetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setCategory('');
    setBrand('');
    setMinPrice('');
    setMaxPrice('');
    setSortBy('newest');
    setPage(1);
    setSearchParams({});
  };

  const pagination = productsData.pagination || {};
  const items = productsData.items || [];

  return (
    <div>
      <PageHeader
        title="Product Catalog & Search"
        subtitle="Explore multi-vendor tracked items, compare landed prices, and uncover verified deals"
      />

      {/* Global Search Box */}
      <div style={{ marginBottom: '16px' }}>
        <ProductSearch
          value={search}
          onChange={setSearch}
          onClear={() => {
            setSearch('');
            setDebouncedSearch('');
            setSearchParams({});
          }}
          placeholder="Search products by title, model, category, brand or SKU..."
        />
      </div>

      {/* Filters and Sorters */}
      <ProductFilters
        categories={productsData.filters?.categories || []}
        brands={productsData.filters?.brands || []}
        selectedCategory={category}
        selectedBrand={brand}
        minPrice={minPrice}
        maxPrice={maxPrice}
        sortBy={sortBy}
        onCategoryChange={(val) => { setCategory(val); setPage(1); }}
        onBrandChange={(val) => { setBrand(val); setPage(1); }}
        onMinPriceChange={(val) => { setMinPrice(val); setPage(1); }}
        onMaxPriceChange={(val) => { setMaxPrice(val); setPage(1); }}
        onSortChange={(val) => { setSortBy(val); setPage(1); }}
        onReset={handleResetFilters}
      />

      {/* Main Content Area */}
      {loading ? (
        <LoadingSpinner message="Searching multi-retailer catalog..." />
      ) : error ? (
        <ErrorMessage
          title="Catalog Query Error"
          message={error}
          onRetry={fetchProducts}
        />
      ) : items.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No Products Found"
            description="No items match your active search terms and filter parameters. Try clearing your filters or broadening your search."
            action={
              <button className="btn btn-secondary" onClick={handleResetFilters}>
                Reset Search Filters
              </button>
            }
          />
        </div>
      ) : (
        <>
          {/* Result Count Status */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Showing <strong>{items.length}</strong> of <strong>{pagination.total_items}</strong> products
            </span>
          </div>

          {/* Product Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 'var(--space-lg)',
              marginBottom: 'var(--space-xl)',
            }}
          >
            {items.map((prod) => (
              <ProductCard key={prod.id} product={prod} />
            ))}
          </div>

          {/* Pagination Controls */}
          {pagination.total_pages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '12px',
                marginTop: 'var(--space-xl)',
              }}
            >
              <button
                className="btn btn-secondary"
                disabled={!pagination.has_prev}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={{ opacity: pagination.has_prev ? 1 : 0.4 }}
              >
                <ChevronLeft size={16} />
                Previous
              </button>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Page <strong>{pagination.page}</strong> of <strong>{pagination.total_pages}</strong>
              </span>
              <button
                className="btn btn-secondary"
                disabled={!pagination.has_next}
                onClick={() => setPage((p) => p + 1)}
                style={{ opacity: pagination.has_next ? 1 : 0.4 }}
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Products;
