import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Coupons from '../pages/Coupons';
import couponApi from '../api/couponApi';
import productApi from '../api/productApi';

vi.mock('../api/couponApi');
vi.mock('../api/productApi');

const mockCoupons = [
  {
    id: 1,
    code: 'ELECTRO10',
    title: 'Tech Fest 10% Off',
    description: '10% discount on all electronics, capped at ₹3,000',
    discount_type: 'percentage',
    discount_value: 10,
    min_order_value: 10000,
    max_discount_value: 3000,
    retailer_name: 'All Retailers',
    verification_status: 'verified',
    effective_status: 'verified',
    is_expired: false,
    is_active: true,
    source_type: 'demo',
    valid_until: '2026-12-31T23:59:59Z',
  },
  {
    id: 2,
    code: 'DIWALI2025',
    title: 'Past Festival 20% Celebration',
    description: 'Expired promo',
    discount_type: 'percentage',
    discount_value: 20,
    min_order_value: 5000,
    max_discount_value: 4000,
    retailer_name: 'All Retailers',
    verification_status: 'expired',
    effective_status: 'expired',
    is_expired: true,
    is_active: true,
    source_type: 'demo',
    valid_until: '2025-11-01T00:00:00Z',
  },
];

describe('Coupons Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    productApi.getProducts.mockResolvedValue({
      success: true,
      data: { items: [{ id: 1, name: 'Apple iPhone 15', base_mrp: 79900 }] },
    });
  });

  it('renders loading state initially', () => {
    couponApi.getCoupons.mockReturnValue(new Promise(() => {}));
    render(
      <BrowserRouter>
        <Coupons />
      </BrowserRouter>
    );
    expect(screen.getByText(/Scanning active promotional vouchers/i)).toBeInTheDocument();
  });

  it('renders coupon list with codes and badges on success', async () => {
    couponApi.getCoupons.mockResolvedValue({
      success: true,
      data: { items: mockCoupons, total_count: 2, total_pages: 1 },
    });

    render(
      <BrowserRouter>
        <Coupons />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Tech Fest 10% Off')).toBeInTheDocument();
    });

    const techFestCard = screen.getByText('Tech Fest 10% Off').closest('.card');
    expect(within(techFestCard).getByText('ELECTRO10')).toBeInTheDocument();
    expect(within(techFestCard).getByText('10% OFF')).toBeInTheDocument();
    const verifiedBadge = within(techFestCard).getByTestId('coupon-status-badge');
    expect(within(verifiedBadge).getByText(/Verified Promo/i)).toBeInTheDocument();

    const pastFestivalCard = screen.getByText('Past Festival 20% Celebration').closest('.card');
    const expiredBadge = within(pastFestivalCard).getByTestId('coupon-status-badge');
    expect(within(expiredBadge).getByText(/Expired/i)).toBeInTheDocument();
  });

  it('handles coupon validation and displays savings summary', async () => {
    couponApi.getCoupons.mockResolvedValue({
      success: true,
      data: { items: mockCoupons, total_count: 2, total_pages: 1 },
    });

    couponApi.validateCoupon.mockResolvedValue({
      success: true,
      data: {
        is_eligible: true,
        discount_amount: 1500,
        purchase_amount: 15000,
        shipping_cost: 0,
        shipping_is_unknown: false,
        estimated_payable_amount: 13500,
        is_complete_total: true,
        calculation_notes: ['10% discount applied.'],
        message: 'Coupon ELECTRO10 is eligible! Total estimated savings: ₹1,500.',
      },
    });

    render(
      <BrowserRouter>
        <Coupons />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Tech Fest 10% Off')).toBeInTheDocument();
    });

    // Enter coupon code and order amount, then validate
    const codeInput = screen.getByPlaceholderText(/e.g. ELECTRO10/i);
    fireEvent.change(codeInput, { target: { value: 'ELECTRO10' } });

    const amountInput = screen.getByPlaceholderText(/e.g. 5000/i);
    fireEvent.change(amountInput, { target: { value: '15000' } });

    const submitBtn = screen.getByText(/Evaluate Coupon & Calculate Savings/i);
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Coupon Successfully Applied!/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/10% discount applied/i)).toBeInTheDocument();
  });

  it('displays empty state when no promotions match', async () => {
    couponApi.getCoupons.mockResolvedValue({
      success: true,
      data: { items: [], total_count: 0, total_pages: 1 },
    });

    render(
      <BrowserRouter>
        <Coupons />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/No Matching Promotions Found/i)).toBeInTheDocument();
    });
  });

  it('displays error state and provides retry action', async () => {
    couponApi.getCoupons.mockRejectedValue(new Error('Coupon service down'));

    render(
      <BrowserRouter>
        <Coupons />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Coupons Service Error/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Coupon service down/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry request/i })).toBeInTheDocument();
  });
});
