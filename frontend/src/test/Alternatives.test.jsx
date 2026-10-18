import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Alternatives from '../pages/Alternatives';
import alternativeApi from '../api/alternativeApi';
import productApi from '../api/productApi';

vi.mock('../api/alternativeApi');
vi.mock('../api/productApi');

const mockSource = {
  id: 1,
  name: 'Apple iPhone 15 (128 GB)',
  brand: 'Apple',
  category: 'Smartphones',
  base_mrp: 79900,
};

const mockAlternativesResponse = {
  success: true,
  data: {
    source_product: mockSource,
    source_pricing: { best_listed_price: 68499, best_landed_price: 68499 },
    total_count: 2,
    total_pages: 1,
    alternatives: [
      {
        product: {
          id: 2,
          name: 'Samsung Galaxy S24 (128 GB)',
          brand: 'Samsung',
          category: 'Smartphones',
          base_mrp: 74999,
          sku: 'SAM-S24-128',
        },
        similarity_score: 84.5,
        explanations: ['Same product category (Smartphones)', 'Comparable price point within 15%'],
        pricing: {
          best_listed_price: 71999,
          best_landed_price: 71999,
          shipping_is_unknown: false,
          availability_status: 'In Stock',
          in_stock_offers_count: 2,
        },
        price_difference: 3500,
        is_cheaper: false,
        savings: 0,
      },
      {
        product: {
          id: 3,
          name: 'OnePlus 12R (128 GB)',
          brand: 'OnePlus',
          category: 'Smartphones',
          base_mrp: 39999,
          sku: 'ONEP-12R-128',
        },
        similarity_score: 72.0,
        explanations: ['Same product category (Smartphones)', 'Lower price point (Save ₹29,500)'],
        pricing: {
          best_listed_price: 38999,
          best_landed_price: 39039,
          shipping_is_unknown: false,
          availability_status: 'In Stock',
          in_stock_offers_count: 2,
        },
        price_difference: -29500,
        is_cheaper: true,
        savings: 29500,
      },
    ],
  },
};

describe('Alternatives Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    productApi.getProducts.mockResolvedValue({
      success: true,
      data: { items: [mockSource] },
    });
  });

  it('renders loading state initially', async () => {
    let resolveAlternatives;
    alternativeApi.getAlternatives.mockReturnValue(
      new Promise((resolve) => {
        resolveAlternatives = resolve;
      })
    );

    render(
      <BrowserRouter>
        <Alternatives />
      </BrowserRouter>
    );

    expect(screen.getByText(/Calculating hardware similarity vectors/i)).toBeInTheDocument();

    resolveAlternatives({
      success: true,
      data: {
        source_product: mockSource,
        source_pricing: {},
        total_count: 0,
        total_pages: 1,
        alternatives: [],
      },
    });
  });

  it('renders alternative cards with similarity badges and explanations', async () => {
    alternativeApi.getAlternatives.mockResolvedValue(mockAlternativesResponse);

    render(
      <BrowserRouter>
        <Alternatives />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Samsung Galaxy S24 (128 GB)')).toBeInTheDocument();
    });

    const samsungCard = screen.getByText('Samsung Galaxy S24 (128 GB)').closest('.card');
    expect(samsungCard).toBeInTheDocument();
    expect(within(samsungCard).getByText(/85% Excellent Match/i)).toBeInTheDocument();

    const onePlusCard = screen.getByText('OnePlus 12R (128 GB)').closest('.card');
    expect(onePlusCard).toBeInTheDocument();
    expect(within(onePlusCard).getByText(/72% High Similarity/i)).toBeInTheDocument();

    const savingsBadge = within(onePlusCard).getByTestId('savings-badge');
    expect(within(savingsBadge).getByText(/Save ₹29,500/i)).toBeInTheDocument();
    expect(within(onePlusCard).getByText(/Lower price point \(Save ₹29,500\)/i)).toBeInTheDocument();
  });

  it('handles side-by-side comparison toggle', async () => {
    alternativeApi.getAlternatives.mockResolvedValue(mockAlternativesResponse);
    alternativeApi.compareAlternatives.mockResolvedValue({
      success: true,
      data: {
        source_id: 1,
        products: [
          { product: mockSource, pricing: { best_listed_price: 68499 }, is_source: true },
          { product: mockAlternativesResponse.data.alternatives[0].product, pricing: { best_listed_price: 71999 }, is_source: false },
        ],
        specifications_matrix: [{ specification: 'Storage', values: { 1: '128GB', 2: '128GB' } }],
      },
    });

    render(
      <BrowserRouter>
        <Alternatives />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Samsung Galaxy S24 (128 GB)')).toBeInTheDocument();
    });

    const compareButtons = screen.getAllByRole('button', { name: /compare/i });
    fireEvent.click(compareButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Side-by-Side Specifications & Value Comparison/i)).toBeInTheDocument();
    });
  });

  it('displays empty state when no alternatives match filters', async () => {
    alternativeApi.getAlternatives.mockResolvedValue({
      success: true,
      data: {
        source_product: mockSource,
        source_pricing: {},
        total_count: 0,
        total_pages: 1,
        alternatives: [],
      },
    });

    render(
      <BrowserRouter>
        <Alternatives />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/No Comparable Alternatives Found/i)).toBeInTheDocument();
    });
  });
});
