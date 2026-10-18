import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  Zap,
  Plus,
  RefreshCw,
  AlertTriangle,
  Info,
  ExternalLink,
  Store,
  Split,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import EmptyState from '../components/common/EmptyState';
import BasketItemCard from '../components/basket/BasketItemCard';
import BasketSummary from '../components/basket/BasketSummary';
import OptimizationStrategyCard from '../components/basket/OptimizationStrategyCard';
import basketApi from '../api/basketApi';
import productApi from '../api/productApi';
import { formatINR } from '../utils/currency';

export function BasketOptimizer() {
  const [basketData, setBasketData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [error, setError] = useState(null);

  // Optimization params & results
  const [allowSplitOrders, setAllowSplitOrders] = useState(true);
  const [maxRetailers, setMaxRetailers] = useState(3);
  const [optimizationResult, setOptimizationResult] = useState(null);

  // Catalog products for Quick-Add selector
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [selectedAddProductId, setSelectedAddProductId] = useState('');
  const [addingProduct, setAddingProduct] = useState(false);

  // Load basket and catalog
  const loadBasket = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await basketApi.getBasket();
      if (res && res.success) {
        setBasketData(res.data);
      } else {
        throw new Error(res.error?.message || 'Failed to load basket.');
      }
    } catch (err) {
      setError(err.message || 'Error connecting to basket service.');
    } finally {
      setLoading(false);
    }
  };

  const loadCatalog = async () => {
    try {
      const res = await productApi.getProducts({ per_page: 30 });
      if (res && res.success) {
        const items = res.data.items || [];
        setCatalogProducts(items);
        if (items.length > 0 && !selectedAddProductId) {
          setSelectedAddProductId(String(items[0].id));
        }
      }
    } catch (err) {
      console.error('Failed to load catalog for quick add', err);
    }
  };

  useEffect(() => {
    loadBasket();
    loadCatalog();
  }, []);

  // Basket item actions
  const handleUpdateQuantity = async (itemId, quantity) => {
    try {
      const res = await basketApi.updateItem(itemId, { quantity });
      if (res && res.success) {
        // Refresh basket and invalidate old optimization result
        setOptimizationResult(null);
        await loadBasket();
      }
    } catch (err) {
      alert(err.message || 'Failed to update item quantity.');
    }
  };

  const handleRemoveItem = async (itemId) => {
    try {
      const res = await basketApi.removeItem(itemId);
      if (res && res.success) {
        setOptimizationResult(null);
        await loadBasket();
      }
    } catch (err) {
      alert(err.message || 'Failed to remove item.');
    }
  };

  const handleClearBasket = async () => {
    if (!window.confirm('Are you sure you want to clear your entire basket?')) return;
    try {
      const res = await basketApi.clearBasket();
      if (res && res.success) {
        setOptimizationResult(null);
        await loadBasket();
      }
    } catch (err) {
      alert(err.message || 'Failed to clear basket.');
    }
  };

  const handleQuickAdd = async () => {
    if (!selectedAddProductId) return;
    try {
      setAddingProduct(true);
      const res = await basketApi.addItem({
        product_id: parseInt(selectedAddProductId),
        quantity: 1,
      });
      if (res && res.success) {
        setOptimizationResult(null);
        await loadBasket();
      }
    } catch (err) {
      alert(err.message || 'Failed to add item to basket.');
    } finally {
      setAddingProduct(false);
    }
  };

  // Run combinatorial optimization
  const handleOptimize = async () => {
    try {
      setOptimizing(true);
      setError(null);
      const res = await basketApi.optimizeBasket({
        allow_split_orders: allowSplitOrders,
        max_retailers: maxRetailers,
      });
      if (res && res.success) {
        setOptimizationResult(res.data);
      } else {
        throw new Error(res.error?.message || 'Failed to optimize basket.');
      }
    } catch (err) {
      setError(err.message || 'Error executing optimization engine.');
    } finally {
      setOptimizing(false);
    }
  };

  const items = basketData?.items || [];
  const hasItems = items.length > 0;

  return (
    <div>
      <PageHeader
        title="Multi-Vendor Basket Optimizer"
        subtitle="Compare single-store checkout totals against optimal multi-retailer allocations factoring shipping"
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link to="/products" className="btn btn-secondary" style={{ fontSize: '12px' }}>
              Browse Catalog
            </Link>
            <button
              onClick={loadBasket}
              className="btn btn-secondary"
              title="Refresh Basket"
              style={{ padding: '8px' }}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        }
      />

      {loading ? (
        <LoadingSpinner message="Loading your shopping basket and available merchant offers..." />
      ) : error ? (
        <ErrorMessage message={error} onRetry={loadBasket} />
      ) : (
        <div>
          {/* Quick-Add Product Bar */}
          <div
            className="card"
            style={{
              padding: '14px 18px',
              marginBottom: '20px',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={16} style={{ color: 'var(--color-primary, #6366f1)' }} />
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                Add Product to Basket:
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 300px', maxWidth: '500px' }}>
              <select
                className="input"
                value={selectedAddProductId}
                onChange={(e) => setSelectedAddProductId(e.target.value)}
                style={{ flex: 1, padding: '7px 12px', fontSize: '13px' }}
              >
                {catalogProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.brand} - {formatINR(p.base_mrp)})
                  </option>
                ))}
              </select>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleQuickAdd}
                disabled={addingProduct || !selectedAddProductId}
                style={{ padding: '7px 14px', fontSize: '13px', flexShrink: 0 }}
              >
                <Plus size={14} />
                {addingProduct ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>

          {!hasItems ? (
            <div className="card" style={{ padding: '40px 20px' }}>
              <EmptyState
                title="Your Basket is Empty"
                description="Use the product selector above or browse the catalog to add items and discover the lowest-cost purchasing strategy."
                action={
                  <Link to="/products" className="btn btn-primary" style={{ marginTop: '16px' }}>
                    Browse Product Catalog
                  </Link>
                }
              />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: '24px', alignItems: 'start' }}>
              {/* Left Column: Basket Items & Optimization Results */}
              <div>
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                      Basket Items ({items.length})
                    </h3>
                    <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                      Adjust quantities or delete items to re-optimize
                    </span>
                  </div>

                  {items.map((item) => (
                    <BasketItemCard
                      key={item.id}
                      item={item}
                      onUpdateQuantity={handleUpdateQuantity}
                      onRemove={handleRemoveItem}
                      disabled={optimizing}
                    />
                  ))}
                </div>

                {/* Optimization Results Section */}
                {optimizing && (
                  <div className="card" style={{ padding: '30px', textAlign: 'center', marginBottom: '24px' }}>
                    <LoadingSpinner message="Searching merchant permutations and calculating shipping thresholds..." />
                  </div>
                )}

                {optimizationResult && !optimizing && (
                  <div style={{ marginTop: '32px' }}>
                    {/* Header Explanation Banner */}
                    <div
                      className="card"
                      style={{
                        padding: '16px 20px',
                        marginBottom: '20px',
                        background:
                          optimizationResult.status === 'no_feasible_solution'
                            ? 'rgba(239, 68, 68, 0.08)'
                            : 'rgba(99, 102, 241, 0.08)',
                        borderLeft:
                          optimizationResult.status === 'no_feasible_solution'
                            ? '4px solid var(--color-danger, #ef4444)'
                            : '4px solid var(--color-primary, #6366f1)',
                      }}
                    >
                      <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>
                        Optimization Outcome: {optimizationResult.recommendation_type === 'multi_retailer' ? 'Split Orders Recommended' : optimizationResult.recommendation_type === 'single_retailer' ? 'Single Store Recommended' : 'Action Required'}
                      </h4>
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        {optimizationResult.explanation}
                      </p>
                    </div>

                    {/* If unavailable products prevented complete optimization */}
                    {optimizationResult.status === 'no_feasible_solution' && (
                      <div
                        className="card"
                        style={{
                          padding: '18px',
                          marginBottom: '20px',
                          border: '1px solid var(--color-danger, #ef4444)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-danger, #ef4444)', marginBottom: '10px' }}>
                          <AlertTriangle size={18} />
                          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>
                            Unfulfilled Items in Basket
                          </h4>
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: 'var(--text-muted)' }}>
                          {optimizationResult.unavailable_products?.map((u, idx) => (
                            <li key={idx} style={{ marginBottom: '4px' }}>
                              <strong>{u.product_name}</strong>: {u.reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Strategy Cards */}
                    {optimizationResult.status === 'success' && (
                      <div>
                        {/* Multi-Retailer Split Strategy */}
                        {allowSplitOrders && (
                          <OptimizationStrategyCard
                            strategy={optimizationResult.multi_retailer_strategy}
                            title="Multi-Retailer Split Strategy"
                            subtitle={`Distributed across up to ${maxRetailers} stores to capture the absolute lowest unit prices`}
                            type="multi"
                            isRecommended={optimizationResult.recommendation_type === 'multi_retailer'}
                            savings={optimizationResult.potential_savings}
                          />
                        )}

                        {/* Single-Retailer Full Strategy */}
                        <OptimizationStrategyCard
                          strategy={optimizationResult.single_retailer_strategy}
                          title={
                            optimizationResult.single_retailer_strategy
                              ? `Single Retailer: ${optimizationResult.single_retailer_strategy.retailer_name}`
                              : 'Single Retailer Checkout'
                          }
                          subtitle="Consolidated one-stop order fulfillment avoiding multiple delivery parcels"
                          type="single"
                          isRecommended={optimizationResult.recommendation_type === 'single_retailer'}
                          savings={0}
                        />

                        {/* Unfeasible single retailers note if any */}
                        {optimizationResult.unfeasible_single_retailers?.length > 0 && (
                          <div
                            className="card"
                            style={{
                              padding: '14px 18px',
                              background: 'var(--bg-subtle)',
                              fontSize: '12px',
                              color: 'var(--text-muted)',
                            }}
                          >
                            <span style={{ fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '6px' }}>
                              Retailers Unable to Fulfill 100% of Basket:
                            </span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                              {optimizationResult.unfeasible_single_retailers.map((r, rIdx) => (
                                <span
                                  key={rIdx}
                                  className="badge"
                                  style={{ background: 'var(--bg-main)', border: '1px solid var(--border-subtle)' }}
                                >
                                  {r.retailer_name}: Missing {r.missing_products?.length || 0} item(s)
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: Sticky Summary & Parameters */}
              <div>
                <BasketSummary
                  basketData={basketData}
                  allowSplitOrders={allowSplitOrders}
                  setAllowSplitOrders={setAllowSplitOrders}
                  maxRetailers={maxRetailers}
                  setMaxRetailers={setMaxRetailers}
                  onOptimize={handleOptimize}
                  onClear={handleClearBasket}
                  optimizing={optimizing}
                  disabled={!hasItems}
                />

                {/* Transparency / Disclaimers card */}
                <div
                  className="card"
                  style={{
                    padding: '16px',
                    fontSize: '11px',
                    color: 'var(--text-dim)',
                    lineHeight: 1.6,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: 'var(--text-muted)', fontWeight: 600 }}>
                    <Info size={14} />
                    <span>Optimization Methodology</span>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '16px' }}>
                    <li style={{ marginBottom: '4px' }}>
                      Shipping charges assume single parcel consolidation per merchant.
                    </li>
                    <li style={{ marginBottom: '4px' }}>
                      Merchant offers with undisclosed shipping are marked estimated and not assumed as ₹0.
                    </li>
                    <li style={{ marginBottom: '4px' }}>
                      Only verified promotion vouchers are deducted from confirmed payable totals.
                    </li>
                    <li>Demonstration records reflect catalog observations.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default BasketOptimizer;
