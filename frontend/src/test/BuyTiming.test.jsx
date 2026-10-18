import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PriceForecast from '../pages/PriceForecast';
import productApi from '../api/productApi';
import historyApi from '../api/historyApi';
import buyTimingApi from '../api/buyTimingApi';

vi.mock('../api/productApi');
vi.mock('../api/historyApi');
vi.mock('../api/buyTimingApi');

const mockProduct = {
  id: 1,
  name: 'Sony WH-1000XM5 Wireless Headphones',
  brand: 'Sony',
  category: 'Audio',
  base_mrp: 34990,
  source_type: 'demo',
};

const mockHistoryResponse = {
  success: true,
  data: {
    product: mockProduct,
    days: 90,
    retailer_id: null,
    has_sufficient_data: true,
    available_retailers: [{ id: 1, name: 'Amazon India', code: 'amazon' }],
    observations: [
      { id: 1, price: 29990, recorded_at: '2026-08-01T10:00:00Z', retailer_name: 'Amazon India' },
      { id: 2, price: 28490, recorded_at: '2026-09-01T10:00:00Z', retailer_name: 'Amazon India' },
      { id: 3, price: 26990, recorded_at: '2026-10-01T10:00:00Z', retailer_name: 'Amazon India' },
    ],
    statistics: {
      current_observed_price: 26990,
      earliest_observed_price: 29990,
      min_price: 26990,
      max_price: 29990,
      median_price: 28490,
      price_spread: 3000,
      price_change: -3000,
      price_change_pct: -10.0,
      observation_count: 3,
      period_start: '2026-08-01T10:00:00Z',
      period_end: '2026-10-01T10:00:00Z',
    },
  },
};

const mockTimingResponseGood = {
  success: true,
  data: {
    product: mockProduct,
    retailer: null,
    window_days: 90,
    recommendation: {
      category: 'GOOD_TIME_TO_BUY',
      label: 'Good Time to Buy',
      badge_color: 'success',
      confidence: 'HIGH',
      headline: 'Current price is at or near the 90-day historical low.',
      summary: 'Current price of ₹26,990 is below the historical median of ₹28,490.',
      actionable_advice: 'Historical data indicates favorable pricing. Consider buying now.',
      range_position_pct: 0.0,
    },
    metrics: {
      current_price: 26990,
      lowest_observed_price: 26990,
      highest_observed_price: 29990,
      historical_median: 28490,
      historical_mean: 28490,
      historical_range: 3000,
      price_change: -3000,
      price_change_pct: -10.0,
      observation_count: 3,
      first_observation_date: '2026-08-01T10:00:00Z',
      last_observation_date: '2026-10-01T10:00:00Z',
      most_recent_observation_age_days: 2,
    },
    evidence: {
      evidence_type: 'HISTORICAL_ANALYSIS',
      data_status: 'SUFFICIENT',
      is_stale: false,
      retailer_specific: false,
      trend_direction: 'FALLING',
      provenance: 'Observed catalogue snapshots across all active retailers.',
    },
    target_recommendations: {
      suggested_conservative_target: 28490,
      suggested_moderate_target: 25640,
      suggested_aggressive_target: 26990,
      reference_window_low: 26990,
      reference_window_median: 28490,
      disclaimer: 'Target recommendations are derived from observed historical distributions and do not represent a guaranteed discount.',
    },
    limitations: [
      'Historical observations do not guarantee future discounts or price floor recurrences.',
      'Analysis covers 90 days of recorded snapshots across all active retailers.',
    ],
  },
};

const mockTimingResponseWaiting = {
  success: true,
  data: {
    ...mockTimingResponseGood.data,
    recommendation: {
      category: 'CONSIDER_WAITING',
      label: 'Consider Waiting',
      badge_color: 'danger',
      confidence: 'MEDIUM',
      headline: 'Current price is noticeably above the historical median.',
      summary: 'Current price of ₹29,990 sits near the 90-day peak.',
      actionable_advice: 'If your purchase is not urgent, waiting or setting a target price alert is recommended.',
      range_position_pct: 100.0,
    },
    metrics: {
      ...mockTimingResponseGood.data.metrics,
      current_price: 29990,
    },
  },
};

const mockTimingResponseInsufficient = {
  success: true,
  data: {
    product: mockProduct,
    retailer: null,
    window_days: 90,
    recommendation: {
      category: 'INSUFFICIENT_DATA',
      label: 'Insufficient Historical Data',
      badge_color: 'neutral',
      confidence: 'LOW',
      headline: 'Not enough historical observations to form a reliable purchase timing assessment.',
      summary: 'Only 1 observation available in the last 90 days. At least 3 are required.',
      actionable_advice: 'Monitor this item or set a target alert to track future price shifts.',
      range_position_pct: null,
    },
    metrics: {
      current_price: 29990,
      lowest_observed_price: null,
      highest_observed_price: null,
      historical_median: null,
      historical_mean: null,
      historical_range: null,
      price_change: null,
      price_change_pct: null,
      observation_count: 1,
      first_observation_date: null,
      last_observation_date: null,
      most_recent_observation_age_days: null,
    },
    evidence: {
      evidence_type: 'HISTORICAL_ANALYSIS',
      data_status: 'INSUFFICIENT_DATA',
      is_stale: false,
      retailer_specific: false,
      trend_direction: 'UNCERTAIN',
      provenance: 'Catalogue snapshots.',
    },
    target_recommendations: {},
    limitations: [
      'Sparse price history: 1 observation recorded in the selected 90-day window.',
      'No predictive forecasting: future discounts cannot be guaranteed.',
    ],
  },
};

describe('PriceForecast / Best Time to Buy Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    productApi.getProducts.mockResolvedValue({
      success: true,
      data: { items: [mockProduct] },
    });
    historyApi.getProductHistory.mockResolvedValue(mockHistoryResponse);
    buyTimingApi.getBuyTimingAssessment.mockResolvedValue(mockTimingResponseGood);
  });

  it('renders loading state initially', () => {
    buyTimingApi.getBuyTimingAssessment.mockReturnValue(new Promise(() => {}));
    render(
      <BrowserRouter>
        <PriceForecast />
      </BrowserRouter>
    );
    expect(screen.getByText(/Evaluating purchase timing intelligence/i)).toBeInTheDocument();
  });

  it('renders recommendation panel with GOOD_TIME_TO_BUY and statistics', async () => {
    render(
      <BrowserRouter>
        <PriceForecast />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Good Time to Buy/i)).toBeInTheDocument();
    });

    const panel = screen.getByTestId('buy-timing-panel');
    expect(within(panel).getByText('Current Observed Price')).toBeInTheDocument();
    expect(within(panel).getByText('Historical Median')).toBeInTheDocument();
    expect(within(panel).getByText('Lowest Observed')).toBeInTheDocument();
    expect(within(panel).getByText('Highest Observed')).toBeInTheDocument();
    expect(within(panel).getByText('Observation Window')).toBeInTheDocument();
  });

  it('renders CONSIDER_WAITING state and explanations', async () => {
    buyTimingApi.getBuyTimingAssessment.mockResolvedValue(mockTimingResponseWaiting);

    render(
      <BrowserRouter>
        <PriceForecast />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Consider Waiting/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Current price is noticeably above the historical median/i)).toBeInTheDocument();
  });

  it('renders INSUFFICIENT_DATA state gracefully with limitations disclosed', async () => {
    buyTimingApi.getBuyTimingAssessment.mockResolvedValue(mockTimingResponseInsufficient);

    render(
      <BrowserRouter>
        <PriceForecast />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Insufficient Historical Data/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Only 1 observation available in the last 90 days/i)).toBeInTheDocument();
  });

  it('allows changing the observation window', async () => {
    render(
      <BrowserRouter>
        <PriceForecast />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Good Time to Buy/i)).toBeInTheDocument();
    });

    const btn30d = screen.getByRole('button', { name: '30D' });
    fireEvent.click(btn30d);

    await waitFor(() => {
      expect(buyTimingApi.getBuyTimingAssessment).toHaveBeenCalledWith(1, { days: 30, retailer_id: null });
    });
  });

  it('displays target recommendations and populates target alert input', async () => {
    render(
      <BrowserRouter>
        <PriceForecast />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Target-Price Advisor & Alert Trigger')).toBeInTheDocument();
    });

    expect(screen.getByText('Conservative')).toBeInTheDocument();
    expect(screen.getByText('Moderate')).toBeInTheDocument();
    expect(screen.getByText('Aggressive')).toBeInTheDocument();

    const aggBtn = screen.getByRole('button', { name: /Select aggressive target/i });
    fireEvent.click(aggBtn);

    const priceInput = screen.getByLabelText(/Target Price \(₹\)/i);
    expect(priceInput.value).toBe('26990');
  });

  it('successfully creates target-price alert through form submission', async () => {
    buyTimingApi.createTargetAlert.mockResolvedValue({
      success: true,
      data: { id: 10, target_price: 26000 },
    });

    render(
      <BrowserRouter>
        <PriceForecast />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Target-Price Advisor & Alert Trigger')).toBeInTheDocument();
    });

    const emailInput = screen.getByLabelText(/Notification Email/i);
    fireEvent.change(emailInput, { target: { value: 'shopper@example.com' } });

    const priceInput = screen.getByLabelText(/Target Price \(₹\)/i);
    fireEvent.change(priceInput, { target: { value: '26000' } });

    const submitBtn = screen.getByRole('button', { name: /Set Price Alert/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(buyTimingApi.createTargetAlert).toHaveBeenCalledWith(1, {
        target_price: 26000,
        contact_email: 'shopper@example.com',
        retailer_id: null,
      });
      expect(screen.getByText(/Target price alert established for/i)).toBeInTheDocument();
    });
  });

  it('handles alert creation failure with error message', async () => {
    buyTimingApi.createTargetAlert.mockRejectedValue(new Error('Active alert already exists for this product.'));

    render(
      <BrowserRouter>
        <PriceForecast />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Target-Price Advisor & Alert Trigger')).toBeInTheDocument();
    });

    const emailInput = screen.getByLabelText(/Notification Email/i);
    fireEvent.change(emailInput, { target: { value: 'shopper@example.com' } });

    const priceInput = screen.getByLabelText(/Target Price \(₹\)/i);
    fireEvent.change(priceInput, { target: { value: '25000' } });

    const submitBtn = screen.getByRole('button', { name: /Set Price Alert/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Active alert already exists for this product/i)).toBeInTheDocument();
    });
  });

  it('handles API failure gracefully', async () => {
    buyTimingApi.getBuyTimingAssessment.mockRejectedValue(new Error('Failed to evaluate purchase timing intelligence'));

    render(
      <BrowserRouter>
        <PriceForecast />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Failed to evaluate purchase timing intelligence/i)).toBeInTheDocument();
    });
  });

  it('displays explicit historical analysis limitations without promising guaranteed future discounts', async () => {
    render(
      <BrowserRouter>
        <PriceForecast />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Evidence & Limitations Disclosure')).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Historical observations do not guarantee future discounts or price floor recurrences/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Setting an alert does not guarantee that a future discount will occur/i)
    ).toBeInTheDocument();
  });
});
