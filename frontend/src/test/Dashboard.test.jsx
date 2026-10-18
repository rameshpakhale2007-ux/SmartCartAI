import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';
import dashboardApi from '../api/dashboardApi';

// Mock dashboardApi
vi.mock('../api/dashboardApi');

describe('Dashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    dashboardApi.getSummary.mockReturnValue(new Promise(() => {})); // Never resolves
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    expect(screen.getByText(/Aggregating multi-vendor catalog/i)).toBeInTheDocument();
  });

  it('renders metrics and offers on successful API response', async () => {
    const mockSummary = {
      success: true,
      data: {
        metrics: {
          total_products_tracked: 42,
          active_price_alerts: 5,
          monitored_retailers: 4,
          average_basket_savings_pct: 12.5,
        },
        lowest_available_offers: [
          {
            product_id: 1,
            product_name: 'Apple iPhone 15',
            category: 'Smartphones',
            retailer_name: 'Flipkart',
            best_price: 68499,
            base_mrp: 79900,
            savings_from_mrp: 11401,
            source_type: 'demo',
          },
        ],
        favorable_deals: [],
        recent_price_changes: [],
        data_source_health: [
          { source: 'Local Catalog DB', type: 'store', status: 'Online', records: 42 },
        ],
      },
    };

    dashboardApi.getSummary.mockResolvedValue(mockSummary);

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Products Tracked')).toBeInTheDocument();
    });

    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Apple iPhone 15')).toBeInTheDocument();
    expect(screen.getByText('Flipkart')).toBeInTheDocument();
  });

  it('renders error state when API fails', async () => {
    dashboardApi.getSummary.mockRejectedValue(new Error('Network error: Unable to connect to Flask backend'));

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Backend Connection Error/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Network error: Unable to connect/i)).toBeInTheDocument();
  });
});
