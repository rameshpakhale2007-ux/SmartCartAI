import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PriceComparison from '../pages/PriceComparison';
import productApi from '../api/productApi';

vi.mock('../api/productApi');

const mockComparisonResponse = {
  success: true,
  data: {
    product: {
      id: 1,
      sku: 'APPL-IP15-128',
      name: 'Apple iPhone 15 (128 GB) - Blue',
      brand: 'Apple',
      category: 'Smartphones',
      base_mrp: 79900,
      source_type: 'demo',
    },
    total_offers: 3,
    available_offers_count: 2,
    cheapest_eligible_offer: {
      id: 101,
      retailer_name: 'Flipkart',
      price: 68499,
      shipping_cost: 40,
      estimated_total: 68539,
      is_cheapest_eligible: true,
    },
    has_unknown_shipping: true,
    offers: [
      {
        id: 101,
        retailer_name: 'Flipkart',
        price: 68499,
        shipping_cost: 40,
        shipping_is_unknown: false,
        estimated_total: 68539,
        stock_status: 'In Stock',
        is_available: true,
        is_cheapest_eligible: true,
        source_type: 'demo',
        updated_at: '2026-10-10T20:00:00Z',
      },
      {
        id: 102,
        retailer_name: 'Reliance Digital',
        price: 70900,
        shipping_cost: null,
        shipping_is_unknown: true,
        estimated_total: null,
        stock_status: 'In Stock',
        is_available: true,
        is_cheapest_eligible: false,
        source_type: 'demo',
        updated_at: '2026-10-10T20:00:00Z',
      },
      {
        id: 103,
        retailer_name: 'Tata CLiQ',
        price: 67999,
        shipping_cost: 0,
        shipping_is_unknown: false,
        estimated_total: 67999,
        stock_status: 'Out of Stock',
        is_available: false,
        is_cheapest_eligible: false,
        source_type: 'demo',
        updated_at: '2026-10-10T20:00:00Z',
      },
    ],
  },
};

describe('PriceComparison Page Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders comparison table and best deal highlight', async () => {
    productApi.getProducts.mockResolvedValue({
      success: true,
      data: { items: [mockComparisonResponse.data.product] },
    });
    productApi.getProductOffers.mockResolvedValue(mockComparisonResponse);

    render(
      <BrowserRouter>
        <PriceComparison />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Apple iPhone 15 (128 GB) - Blue')).toBeInTheDocument();
    });

    // Verify Best Landed Price callout
    expect(screen.getByText(/Recommended Landed Deal/i)).toBeInTheDocument();
    expect(screen.getByText('Best Landed Price')).toBeInTheDocument();

    // Verify Unknown Shipping Notice
    expect(screen.getByText(/Shipping Transparency Notice/i)).toBeInTheDocument();
    expect(screen.getByText('Incomplete Total')).toBeInTheDocument();

    // Verify Out of Stock badge
    expect(screen.getByText('Out of Stock')).toBeInTheDocument();
  });
});
