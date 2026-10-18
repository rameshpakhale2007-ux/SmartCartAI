import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import HonestyIndex from '../pages/HonestyIndex';
import productApi from '../api/productApi';
import honestyApi from '../api/honestyApi';

vi.mock('../api/productApi');
vi.mock('../api/honestyApi');

// Test fixtures with realistic mocked API responses
const mockProduct1 = {
  id: 1,
  name: 'Apple iPhone 15 (128 GB) - Blue',
  brand: 'Apple',
  category: 'Smartphones',
  base_mrp: 79900,
  source_type: 'demo',
};

const mockProduct2 = {
  id: 2,
  name: 'Sony WH-1000XM5 Wireless Headphones',
  brand: 'Sony',
  category: 'Audio',
  base_mrp: 34990,
  source_type: 'dataset',
};

const mockHonestySuccessResponse = {
  success: true,
  data: {
    product: mockProduct1,
    current_offer: {
      retailer_id: 1,
      retailer_name: 'Amazon India',
      price: 68499,
      reference_price: 79900,
      in_stock: true,
    },
    days: 30,
    has_sufficient_evidence: true,
    advertised_discount_pct: 14.27,
    median_price_discount_pct: 6.17,
    benchmarks: {
      min_price: 68499,
      max_price: 74900,
      median_price: 72999,
      observation_count: 5,
      earliest_price: 74900,
      latest_price: 68499,
      price_change: -6401,
      price_change_pct: -8.55,
    },
    scoring: {
      honesty_index_score: 88,
      components: {
        price_consistency_score: 95,
        reference_credibility_score: 90,
        pre_promo_stability_score: 100,
        data_quality_score: 70,
      },
      weights: {
        price_consistency: 0.35,
        reference_credibility: 0.3,
        pre_promo_stability: 0.2,
        data_quality: 0.15,
      },
    },
    finding: {
      classification: 'Strong Historical Support',
      summary: 'Historical observations support the existence of a meaningful discount.',
      explanations: [
        'Current price of ₹68,499 is at or below the 30-day recorded historical minimum of ₹68,499.',
        'Advertised reference price (₹79,900) is consistent with observed historical peak (₹74,900) and catalog MRP.',
        'No pre-promotional artificial price surge was observed prior to this discount.',
      ],
    },
    provenance: {
      data_source: 'demo',
      verified_retailer_api: false,
      is_demonstration_data: true,
      observation_count: 5,
      timestamp: '2026-10-10T18:00:00Z',
    },
    limitations: [
      'Analysis is based on historical price observations within the selected 30-day window.',
      'Data source is demo, not real-time live retailer API.',
    ],
    available_retailers: [
      { id: 1, name: 'Amazon India', code: 'amazon' },
      { id: 2, name: 'Flipkart', code: 'flipkart' },
    ],
    observations: [
      { id: 101, price: 74900, recorded_at: '2026-09-12T10:00:00Z', retailer_name: 'Amazon India', source_type: 'demo' },
      { id: 102, price: 73999, recorded_at: '2026-09-20T10:00:00Z', retailer_name: 'Amazon India', source_type: 'demo' },
      { id: 103, price: 72999, recorded_at: '2026-09-28T10:00:00Z', retailer_name: 'Amazon India', source_type: 'demo' },
      { id: 104, price: 71499, recorded_at: '2026-10-04T10:00:00Z', retailer_name: 'Amazon India', source_type: 'demo' },
      { id: 105, price: 68499, recorded_at: '2026-10-10T10:00:00Z', retailer_name: 'Amazon India', source_type: 'demo' },
    ],
  },
};

const mockHonestyInsufficientResponse = {
  success: true,
  data: {
    product: mockProduct2,
    current_offer: {
      retailer_id: 2,
      retailer_name: 'Flipkart',
      price: 29990,
      reference_price: 34990,
      in_stock: true,
    },
    days: 30,
    has_sufficient_evidence: false,
    advertised_discount_pct: 14.29,
    median_price_discount_pct: null,
    benchmarks: {
      min_price: 29990,
      max_price: 29990,
      median_price: 29990,
      observation_count: 1,
      earliest_price: 29990,
      latest_price: 29990,
      price_change: 0,
      price_change_pct: 0,
    },
    scoring: null,
    finding: {
      classification: 'Insufficient Historical Evidence',
      summary: 'Insufficient historical observations to reliably evaluate the advertised discount.',
      explanations: [
        'Only 1 historical price observations found in 30 days (minimum required: 3).',
      ],
    },
    provenance: {
      data_source: 'dataset',
      verified_retailer_api: false,
      is_demonstration_data: false,
      observation_count: 1,
      timestamp: '2026-10-10T18:00:00Z',
    },
    limitations: [
      'At least 3 observations are required to score discount credibility.',
    ],
    available_retailers: [
      { id: 2, name: 'Flipkart', code: 'flipkart' },
    ],
    observations: [
      { id: 201, price: 29990, recorded_at: '2026-10-10T10:00:00Z', retailer_name: 'Flipkart', source_type: 'dataset' },
    ],
  },
};

const mockHonestyNoOfferResponse = {
  success: true,
  data: {
    product: mockProduct1,
    current_offer: null,
    days: 30,
    has_sufficient_evidence: false,
    advertised_discount_pct: null,
    median_price_discount_pct: null,
    benchmarks: {
      min_price: null,
      max_price: null,
      median_price: null,
      observation_count: 0,
      earliest_price: null,
      latest_price: null,
      price_change: 0,
      price_change_pct: 0,
    },
    scoring: null,
    finding: {
      classification: 'Insufficient Historical Evidence',
      summary: 'No active retailer offer available to compare against historical benchmarks.',
      explanations: ['No active retailer offer available for this product.'],
    },
    provenance: {
      data_source: 'demo',
      verified_retailer_api: false,
      is_demonstration_data: true,
      observation_count: 0,
      timestamp: '2026-10-10T18:00:00Z',
    },
    limitations: ['Active offer required for discount analysis.'],
    available_retailers: [],
    observations: [],
  },
};

describe('HonestyIndex Page Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    productApi.getProducts.mockResolvedValue({
      success: true,
      data: { items: [mockProduct1, mockProduct2] },
    });
  });

  it('renders loading state initially while fetching evaluation', () => {
    honestyApi.getProductHonesty.mockReturnValue(new Promise(() => {}));
    render(
      <BrowserRouter>
        <HonestyIndex />
      </BrowserRouter>
    );

    expect(
      screen.getByText(/Evaluating historical observations and discount credibility/i)
    ).toBeInTheDocument();
  });

  it('renders successful analysis with score, breakdown, and factors', async () => {
    honestyApi.getProductHonesty.mockResolvedValue(mockHonestySuccessResponse);

    render(
      <BrowserRouter>
        <HonestyIndex />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Strong Historical Support')).toBeInTheDocument();
    });

    // Score display
    const scoreContainer = screen.getByTestId('honesty-score-display');
    expect(within(scoreContainer).getByText('88')).toBeInTheDocument();
    expect(within(scoreContainer).getByText('/ 100')).toBeInTheDocument();

    // Advertised vs Real Discount breakdown
    expect(screen.getByText('14.3%')).toBeInTheDocument();
    expect(screen.getByText('6.2%')).toBeInTheDocument();

    // Explanations present
    expect(
      screen.getByText(/Current price of ₹68,499 is at or below the 30-day recorded historical minimum/i)
    ).toBeInTheDocument();

    // Recharts section rendered
    expect(screen.getByText(/30-Day Historical Price Observations/i)).toBeInTheDocument();
  });

  it('handles insufficient historical evidence state gracefully without inventing scores', async () => {
    honestyApi.getProductHonesty.mockResolvedValue(mockHonestyInsufficientResponse);

    render(
      <BrowserRouter>
        <HonestyIndex />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Insufficient Historical Evidence').length).toBeGreaterThan(0);
    });

    // Score should show N/A or inconclusive message
    expect(screen.getByText('Inconclusive')).toBeInTheDocument();
    expect(
      screen.getByText(/Insufficient historical observations to compute a reliable Honesty Index score/i)
    ).toBeInTheDocument();
  });

  it('handles missing current offer state cleanly', async () => {
    honestyApi.getProductHonesty.mockResolvedValue(mockHonestyNoOfferResponse);

    render(
      <BrowserRouter>
        <HonestyIndex />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Insufficient Historical Evidence').length).toBeGreaterThan(0);
    });

    expect(
      screen.getByText(/No active retailer offer available to compare against historical benchmarks/i)
    ).toBeInTheDocument();
  });

  it('handles error state with retry button', async () => {
    honestyApi.getProductHonesty.mockRejectedValue(new Error('Network connection error'));

    render(
      <BrowserRouter>
        <HonestyIndex />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Network connection error')).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole('button', { name: /try again/i });
    expect(retryBtn).toBeInTheDocument();

    // Now mock success and click retry
    honestyApi.getProductHonesty.mockResolvedValue(mockHonestySuccessResponse);
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText('Strong Historical Support')).toBeInTheDocument();
    });
  });

  it('supports switching time windows (30, 60, 90 days)', async () => {
    honestyApi.getProductHonesty.mockResolvedValue(mockHonestySuccessResponse);

    render(
      <BrowserRouter>
        <HonestyIndex />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('30 Days')).toBeInTheDocument();
    });

    const btn60 = screen.getByRole('button', { name: '60 Days' });
    fireEvent.click(btn60);

    expect(honestyApi.getProductHonesty).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ days: 60 })
    );

    const btn90 = screen.getByRole('button', { name: '90 Days' });
    fireEvent.click(btn90);

    expect(honestyApi.getProductHonesty).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ days: 90 })
    );
  });

  it('ensures absence of unsupported fraud accusations or hostile language', async () => {
    honestyApi.getProductHonesty.mockResolvedValue(mockHonestySuccessResponse);

    const { container } = render(
      <BrowserRouter>
        <HonestyIndex />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Strong Historical Support')).toBeInTheDocument();
    });

    const renderedText = container.textContent.toLowerCase();
    expect(renderedText).not.toContain('fraud');
    expect(renderedText).not.toContain('scam');
    expect(renderedText).not.toContain('criminal');
    expect(renderedText).not.toContain('liar');
    expect(renderedText).not.toContain('cheat');
  });
});
