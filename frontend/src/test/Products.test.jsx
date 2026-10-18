import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Products from '../pages/Products';
import productApi from '../api/productApi';

vi.mock('../api/productApi');

const mockProductsResponse = {
  success: true,
  data: {
    items: [
      {
        id: 1,
        sku: 'APPL-IP15-128',
        name: 'Apple iPhone 15 (128 GB) - Blue',
        brand: 'Apple',
        category: 'Smartphones',
        base_mrp: 79900,
        source_type: 'demo',
        offer_count: 4,
        lowest_eligible_offer: {
          id: 101,
          retailer_name: 'Flipkart',
          price: 68499,
          shipping_cost: 40,
          estimated_total: 68539,
        },
      },
      {
        id: 2,
        sku: 'SNY-WH1000XM5',
        name: 'Sony WH-1000XM5 Wireless Headphones',
        brand: 'Sony',
        category: 'Audio',
        base_mrp: 34990,
        source_type: 'demo',
        offer_count: 2,
        lowest_eligible_offer: {
          id: 102,
          retailer_name: 'Amazon India',
          price: 26990,
          shipping_cost: 0,
          estimated_total: 26990,
        },
      },
    ],
    pagination: {
      page: 1,
      per_page: 12,
      total_items: 2,
      total_pages: 1,
      has_next: false,
      has_prev: false,
    },
    filters: {
      categories: ['Audio', 'Smartphones'],
      brands: ['Apple', 'Sony'],
    },
  },
};

describe('Products Page Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    productApi.getProducts.mockReturnValue(new Promise(() => {}));
    render(
      <BrowserRouter>
        <Products />
      </BrowserRouter>
    );
    expect(screen.getByText(/Searching multi-retailer catalog/i)).toBeInTheDocument();
  });

  it('renders product items and filters on success', async () => {
    productApi.getProducts.mockResolvedValue(mockProductsResponse);

    render(
      <BrowserRouter>
        <Products />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Apple iPhone 15 (128 GB) - Blue')).toBeInTheDocument();
    });

    expect(screen.getByText('Sony WH-1000XM5 Wireless Headphones')).toBeInTheDocument();
    expect(screen.getByText(/Showing/i)).toBeInTheDocument();
    expect(screen.getByText('All Categories')).toBeInTheDocument();
  });

  it('renders empty state when no products match', async () => {
    productApi.getProducts.mockResolvedValue({
      success: true,
      data: {
        items: [],
        pagination: { page: 1, per_page: 12, total_items: 0, total_pages: 1 },
        filters: { categories: [], brands: [] },
      },
    });

    render(
      <BrowserRouter>
        <Products />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No Products Found')).toBeInTheDocument();
    });
  });

  it('renders error message when API call fails', async () => {
    productApi.getProducts.mockRejectedValue(new Error('Connection timed out'));

    render(
      <BrowserRouter>
        <Products />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Catalog Query Error/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Connection timed out/i)).toBeInTheDocument();
  });
});
