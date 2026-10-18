import React from 'react';
import { Search, Filter, RotateCcw } from 'lucide-react';

export function CouponFilters({
  search,
  setSearch,
  retailerId,
  setRetailerId,
  discountType,
  setDiscountType,
  statusFilter,
  setStatusFilter,
  sort,
  setSort,
  onReset,
}) {
  return (
    <div
      className="card"
      style={{
        padding: '16px 20px',
        marginBottom: '24px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '14px',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      {/* Search Input */}
      <div style={{ flex: '1 1 260px', position: 'relative' }}>
        <Search
          size={16}
          style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-dim)',
          }}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by coupon code, promo title, or store..."
          className="form-input"
          style={{ width: '100%', paddingLeft: '38px', fontSize: '13px' }}
        />
      </div>

      {/* Selectors Group */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
        {/* Retailer Filter */}
        <select
          value={retailerId}
          onChange={(e) => setRetailerId(e.target.value)}
          className="form-select"
          style={{ fontSize: '13px', minWidth: '140px' }}
        >
          <option value="">All Retailers</option>
          <option value="1">Amazon India</option>
          <option value="2">Flipkart</option>
          <option value="3">Croma</option>
          <option value="4">Reliance Digital</option>
          <option value="5">Tata CLiQ</option>
        </select>

        {/* Discount Type Filter */}
        <select
          value={discountType}
          onChange={(e) => setDiscountType(e.target.value)}
          className="form-select"
          style={{ fontSize: '13px', minWidth: '150px' }}
        >
          <option value="">All Discount Types</option>
          <option value="percentage">Percentage (%)</option>
          <option value="fixed_amount">Fixed Amount (₹)</option>
          <option value="free_shipping">Free Shipping</option>
        </select>

        {/* Verification Status */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="form-select"
          style={{ fontSize: '13px', minWidth: '140px' }}
        >
          <option value="active">Active Promotions</option>
          <option value="verified">Verified Promos</option>
          <option value="unverified">Unverified Promos</option>
          <option value="expired">Expired Promos</option>
          <option value="all">All Statuses</option>
        </select>

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="form-select"
          style={{ fontSize: '13px', minWidth: '150px' }}
        >
          <option value="newest">Sort: Newest First</option>
          <option value="discount_desc">Sort: Highest Savings</option>
          <option value="min_order_asc">Sort: Lowest Min Order</option>
          <option value="expiring_soon">Sort: Expiring Soon</option>
        </select>

        {/* Reset Action */}
        <button
          onClick={onReset}
          className="btn btn-secondary"
          style={{ padding: '8px 12px', fontSize: '12px', gap: '4px' }}
          title="Reset all filters"
        >
          <RotateCcw size={13} />
          <span>Reset</span>
        </button>
      </div>
    </div>
  );
}

export default CouponFilters;
