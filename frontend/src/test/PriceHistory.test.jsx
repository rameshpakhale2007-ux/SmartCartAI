import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PriceHistory from '../pages/PriceHistory';
import productApi from '../api/productApi';
import historyApi from '../api/historyApi';

vi.mock('../api/productApi');
vi.mock('../api/historyApi');

const mockProduct = {
  id: 1,
  name: 'Apple iPhone 15 (128 GB) - Blue',
  brand: 'Apple',
  category: 'Smartphones',
  base_mrp: 79900,
  source_type: 'demo',
};

const mockHistoryResponse = {
  success: true,
  data: {
    product: mockProduct,
    days: 30,
    retailer_id: null,
    has_sufficient_data: true,
    available_retailers: [{ id: 1, name: 'Flipkart', code: 'flipkart' }],
    observations: [
      { id: 1, price: 74900, recorded_at: '2026-09-10T10:00:00Z', retailer_name: 'Flipkart', source_type: 'demo' },
      { id: 2, price: 72999, recorded_at: '2026-09-20T10:00:00Z', retailer_name: 'Flipkart', source_type: 'demo' },
      { id: 3, price: 68499, recorded_at: '2026-10-10T10:00:00Z', retailer_name: 'Flipkart', source_type: 'demo' },
    ],
    statistics: {
      current_observed_price: 68499,
      earliest_observed_price: 74900,
      min_price: 68499,
      max_price: 74900,
      median_price: 72999,
      price_spread: 6401,
      price_change: -6401,
      price_change_pct: -8.55,
      observation_count: 3,
      period_start: '2026-09-10T10:00:00Z',
      period_end: '2026-10-10T10:00:00Z',
    },
  },
};

describe('PriceHistory Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    productApi.getProducts.mockResolvedValue({
      success: true,
      data: { items: [mockProduct] },
    });
  });

  it('renders loading state initially', () => {
    historyApi.getProductHistory.mockReturnValue(new Promise(() => {}));
    render(
      <BrowserRouter>
        <PriceHistory />
      </BrowserRouter>
    );
    expect(screen.getByText(/Compiling 30-day price trajectory/i)).toBeInTheDocument();
  });

  it('renders statistics and time-window controls on success', async () => {
    historyApi.getProductHistory.mockResolvedValue(mockHistoryResponse);

    render(
      <BrowserRouter>
        <PriceHistory />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Apple iPhone 15 (128 GB) - Blue')).toBeInTheDocument();
    });

    expect(screen.getByText('Latest Observed Price')).toBeInTheDocument();
    expect(screen.getByText('Period Low (Min)')).toBeInTheDocument();
    expect(screen.getByText('Period High (Max)')).toBeInTheDocument();
    expect(screen.getByText('Period Median')).toBeInTheDocument();

    // Verify time window buttons exist
    expect(screen.getByRole('button', { name: /show 30 days history/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /show 60 days history/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /show 90 days history/i })).toBeInTheDocument();
  });

  it('handles insufficient data state gracefully', async () => {
    historyApi.getProductHistory.mockResolvedValue({
      success: true,
      data: {
        product: mockProduct,
        days: 30,
        has_sufficient_data: false,
        observations: [],
        statistics: null,
      },
    });

    render(
      <BrowserRouter>
        <PriceHistory />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Insufficient historical data/i)).toBeInTheDocument();
    });
  });

  it('handles error state and provides retry action', async () => {
    historyApi.getProductHistory.mockRejectedValue(new Error('Backend connection failed'));

    render(
      <BrowserRouter>
        <PriceHistory />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Price History Error/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Backend connection failed/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry request/i })).toBeInTheDocument();
  });
});
