import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PriceAlerts from '../pages/PriceAlerts';
import productApi from '../api/productApi';
import alertApi from '../api/alertApi';

vi.mock('../api/productApi');
vi.mock('../api/alertApi');

const mockProducts = [
  { id: 1, name: 'Apple iPhone 15', brand: 'Apple', base_mrp: 79900 },
];

const mockAlerts = [
  {
    id: 10,
    product_id: 1,
    product_name: 'Apple iPhone 15',
    retailer_name: 'All Retailers',
    target_price: 65000,
    contact_email: 'shopper@example.com',
    is_active: true,
    trigger_status: 'active',
    last_observed_price: 68499,
    last_checked_at: '2026-10-10T15:00:00Z',
    created_at: '2026-10-09T10:00:00Z',
  },
  {
    id: 11,
    product_id: 1,
    product_name: 'Sony WH-1000XM5',
    retailer_name: 'Amazon India',
    target_price: 28000,
    contact_email: 'shopper@example.com',
    is_active: true,
    trigger_status: 'triggered',
    last_observed_price: 26990,
    last_checked_at: '2026-10-10T16:00:00Z',
    created_at: '2026-10-08T10:00:00Z',
  },
];

describe('PriceAlerts Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    productApi.getProducts.mockResolvedValue({
      success: true,
      data: { items: mockProducts },
    });
  });

  it('renders loading state initially', () => {
    alertApi.getAlerts.mockReturnValue(new Promise(() => {}));
    render(
      <BrowserRouter>
        <PriceAlerts />
      </BrowserRouter>
    );
    expect(screen.getByText(/Loading target-price monitoring alerts/i)).toBeInTheDocument();
  });

  it('renders alerts list with active and triggered statuses', async () => {
    alertApi.getAlerts.mockResolvedValue({
      success: true,
      data: { alerts: mockAlerts },
    });

    render(
      <BrowserRouter>
        <PriceAlerts />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Apple iPhone 15')).toBeInTheDocument();
    });

    expect(screen.getByText('Sony WH-1000XM5')).toBeInTheDocument();
    expect(screen.getAllByText('Active Monitoring').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Target Triggered')).toBeInTheDocument();
  });

  it('handles alert evaluation check trigger', async () => {
    alertApi.getAlerts.mockResolvedValue({
      success: true,
      data: { alerts: mockAlerts },
    });
    alertApi.checkAlerts.mockResolvedValue({
      success: true,
      data: { evaluated_count: 2, triggered_count: 1 },
    });

    render(
      <BrowserRouter>
        <PriceAlerts />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Check All Alerts')).toBeInTheDocument();
    });

    const checkBtn = screen.getByText('Check All Alerts');
    fireEvent.click(checkBtn);

    await waitFor(() => {
      expect(screen.getByText(/Evaluation completed: 2 active alert/i)).toBeInTheDocument();
    });
  });

  it('renders empty state when no alerts exist', async () => {
    alertApi.getAlerts.mockResolvedValue({
      success: true,
      data: { alerts: [] },
    });

    render(
      <BrowserRouter>
        <PriceAlerts />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No Active Price Alerts')).toBeInTheDocument();
    });
  });
});
