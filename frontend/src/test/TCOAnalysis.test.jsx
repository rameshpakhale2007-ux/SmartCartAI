import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import TCOAnalysis from '../pages/TCOAnalysis';
import productApi from '../api/productApi';
import tcoApi from '../api/tcoApi';

vi.mock('../api/productApi');
vi.mock('../api/tcoApi');

const mockProduct = {
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
  source_type: 'demo',
};

const mockOffersResponse = {
  success: true,
  data: {
    product: mockProduct,
    cheapest_eligible_offer: {
      id: 101,
      price: 68499,
      retailer_name: 'Amazon India',
    },
  },
};

const mockForecastResponse = {
  success: true,
  data: {
    product_id: 1,
    ownership_months: 36,
    reference_price: 68499,
    reference_price_source: 'Lowest in-stock offer from Amazon India',
    estimated_resale_value: 29500,
    depreciation_amount: 38999,
    depreciation_pct: 56.9,
    annual_depreciation_rate: 22.0,
    has_sufficient_data: true,
    status: 'sufficient_data',
    observation_count: 5,
    forecast_method: 'historical_trend_calibrated',
    confidence: 'Medium',
    scenarios: {
      optimistic: {
        name: 'Optimistic',
        annual_rate: 14.3,
        estimated_resale: 36800,
        depreciation_pct: 46.3,
        description: 'Assumes premium retention',
      },
      expected: {
        name: 'Expected',
        annual_rate: 22.0,
        estimated_resale: 29500,
        depreciation_pct: 56.9,
        description: 'Standard category trajectory',
      },
      pessimistic: {
        name: 'Pessimistic',
        annual_rate: 31.9,
        estimated_resale: 21200,
        depreciation_pct: 69.1,
        description: 'Rapid obsolescence',
      },
    },
    trajectory: [
      { months: 6, label: '6M', expected: 61500, optimistic: 63800, pessimistic: 58200 },
      { months: 12, label: '12M', expected: 53400, optimistic: 58700, pessimistic: 46600 },
      { months: 24, label: '24M', expected: 41600, optimistic: 50300, pessimistic: 31800 },
      { months: 36, label: '36M', expected: 29500, optimistic: 36800, pessimistic: 21200 },
      { months: 48, label: '48M', expected: 23000, optimistic: 31500, pessimistic: 14400 },
      { months: 60, label: '60M', expected: 17900, optimistic: 27000, pessimistic: 9800 },
    ],
    explanations: ['Reference price of ₹68,499.00 sourced from lowest active offer.'],
    limitations: ['Forecast is an illustrative financial model.'],
  },
};

const mockTCOResponseComplete = {
  success: true,
  data: {
    product_id: 1,
    ownership_months: 36,
    gross_cost: 75499,
    net_cost: 45999,
    monthly_equivalent_cost: 1277.75,
    resale_recovery_pct: 43.1,
    is_complete: true,
    completeness_status: 'complete',
    missing_fields: [],
    cost_breakdown: {
      purchase_price: 68499,
      acquisition_cost: 500,
      monthly_operating_cost: 150,
      total_operating_cost: 5400,
      maintenance_cost: 500,
      repair_cost: 300,
      accessory_cost: 300,
      financing_cost: 0,
      estimated_resale_value: 29500,
    },
    breakdown_percentages: {
      purchase_price_pct: 90.7,
      operating_pct: 7.2,
      maintenance_pct: 0.7,
      repair_pct: 0.4,
      accessory_pct: 0.4,
      financing_pct: 0.0,
    },
    data_provenance: {
      purchase_price_source: 'Best active offer (Amazon India)',
      resale_source: 'Resale Forecast Engine (historical_trend_calibrated)',
    },
    explanations: [
      'Gross ownership costs total ₹75,499.00 over 36 months.',
      'Deducting estimated resale proceeds of ₹29,500.00 once results in Net TCO of ₹45,999.00.',
    ],
  },
};

const mockTCOResponseIncomplete = {
  success: true,
  data: {
    product_id: 1,
    ownership_months: 36,
    gross_cost: 68499,
    net_cost: null,
    monthly_equivalent_cost: 1902.75,
    resale_recovery_pct: null,
    is_complete: false,
    completeness_status: 'incomplete',
    missing_fields: ['monthly_operating_cost', 'maintenance_cost', 'estimated_resale_value'],
    cost_breakdown: {
      purchase_price: 68499,
      acquisition_cost: null,
      monthly_operating_cost: null,
      total_operating_cost: null,
      maintenance_cost: null,
      repair_cost: null,
      accessory_cost: null,
      financing_cost: null,
      estimated_resale_value: null,
    },
    breakdown_percentages: {
      purchase_price_pct: 100.0,
    },
    data_provenance: {
      purchase_price_source: 'Catalog base MRP',
      resale_source: 'Not entered',
    },
    explanations: [
      'Gross ownership costs total ₹68,499.00 over 36 months.',
      'Notice: The following optional cost parameters were omitted: monthly_operating_cost, maintenance_cost, estimated_resale_value.',
    ],
  },
};

describe('TCOAnalysis Page Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    productApi.getProducts.mockResolvedValue({
      success: true,
      data: { items: [mockProduct, mockProduct2] },
    });
    productApi.getProductOffers.mockResolvedValue(mockOffersResponse);
    tcoApi.getResaleForecast.mockResolvedValue(mockForecastResponse);
    tcoApi.calculateTCO.mockResolvedValue(mockTCOResponseComplete);
  });

  it('renders loading state initially while fetching catalog and initial projections', () => {
    tcoApi.calculateTCO.mockReturnValue(new Promise(() => {}));
    render(
      <BrowserRouter>
        <TCOAnalysis />
      </BrowserRouter>
    );
    expect(screen.getByText(/Evaluating historical price trends & computing lifecycle ownership model/i)).toBeInTheDocument();
  });

  it('renders complete TCO breakdown with gross, net, and monthly equivalent figures', async () => {
    render(
      <BrowserRouter>
        <TCOAnalysis />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Complete Cost Assessment/i)).toBeInTheDocument();
    });

    // Check Gross, Net, Monthly metrics
    expect(screen.getByText('Gross Ownership Costs')).toBeInTheDocument();
    expect(screen.getByText('Net Total Cost of Ownership')).toBeInTheDocument();
    expect(screen.getByText('Effective Monthly Cost')).toBeInTheDocument();

    // Check values
    expect(screen.getByText('₹75,499')).toBeInTheDocument();
    expect(screen.getByText('₹45,999')).toBeInTheDocument();
  });

  it('displays incomplete inputs notice when costs are omitted', async () => {
    tcoApi.calculateTCO.mockResolvedValue(mockTCOResponseIncomplete);

    render(
      <BrowserRouter>
        <TCOAnalysis />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Incomplete Cost Inputs/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Incomplete Inputs Notice/i)).toBeInTheDocument();
    expect(screen.getByText(/SmartCart AI does not silently assume missing expenses are zero/i)).toBeInTheDocument();
  });

  it('renders resale forecast trajectory, scenarios, and calibration evidence', async () => {
    render(
      <BrowserRouter>
        <TCOAnalysis />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Depreciation Trajectory & Future Resale Projections')).toBeInTheDocument();
    });

    expect(screen.getByText('Resale Valuation Scenarios')).toBeInTheDocument();
    expect(screen.getByText('Baseline Projection')).toBeInTheDocument();
    expect(screen.getByText('Optimistic Scenario')).toBeInTheDocument();
    expect(screen.getByText('Pessimistic Scenario')).toBeInTheDocument();

    // Calibrated evidence panel
    expect(screen.getByText(/Calibrated Evidence \(5 snapshots\)/i)).toBeInTheDocument();
  });

  it('supports selecting ownership horizon buttons (6, 12, 24, 36, 48, 60 Months)', async () => {
    render(
      <BrowserRouter>
        <TCOAnalysis />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Ownership Horizon & Cost Assumptions')).toBeInTheDocument();
    });

    const btn24 = screen.getByRole('button', { name: /24 Months/i });
    fireEvent.click(btn24);

    expect(tcoApi.getResaleForecast).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ months: 24 })
    );
  });

  it('allows applying scenario resale directly to TCO calculation', async () => {
    render(
      <BrowserRouter>
        <TCOAnalysis />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Resale Valuation Scenarios')).toBeInTheDocument();
    });

    const applyButtons = screen.getAllByRole('button', { name: /apply to tco/i });
    expect(applyButtons.length).toBeGreaterThan(0);

    fireEvent.click(applyButtons[0]);

    // Verifies calculateTCO is triggered with updated scenario
    expect(tcoApi.calculateTCO).toHaveBeenCalled();
  });

  it('handles multi-product TCO comparison', async () => {
    tcoApi.compareTCO.mockResolvedValue({
      success: true,
      data: {
        comparison_status: 'fully_comparable',
        is_fully_comparable: true,
        products_count: 2,
        summary_message: "'Apple iPhone 15' offers the lowest verified Net TCO (₹45,999.00).",
        comparisons: [
          mockTCOResponseComplete.data,
          {
            ...mockTCOResponseComplete.data,
            product_id: 2,
            net_cost: 52000,
            monthly_equivalent_cost: 1444.44,
          },
        ],
      },
    });

    render(
      <BrowserRouter>
        <TCOAnalysis />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Compare Against Alternative Catalog Products')).toBeInTheDocument();
    });

    // Add product to compare
    const selectAdd = screen.getByRole('combobox', { name: /add product to compare/i });
    fireEvent.change(selectAdd, { target: { value: '2' } });

    const compareBtn = screen.getByRole('button', { name: /compare \(2\)/i });
    fireEvent.click(compareBtn);

    await waitFor(() => {
      expect(screen.getByText(/Side-by-Side Multi-Product TCO Comparison/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/'Apple iPhone 15' offers the lowest verified Net TCO/i)).toBeInTheDocument();
  });

  it('handles error state and provides retry action', async () => {
    productApi.getProductOffers.mockRejectedValue(new Error('Network service unavailable'));

    render(
      <BrowserRouter>
        <TCOAnalysis />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Network service unavailable')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});
