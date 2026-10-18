import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import BasketOptimizer from '../pages/BasketOptimizer';
import basketApi from '../api/basketApi';
import productApi from '../api/productApi';

vi.mock('../api/basketApi');
vi.mock('../api/productApi');

// Test fixtures with realistic mocked API responses
const mockCatalogProducts = [
  {
    id: 1,
    name: 'Apple iPhone 15 (128 GB) - Blue',
    brand: 'Apple',
    category: 'Smartphones',
    base_mrp: 79900,
  },
  {
    id: 2,
    name: 'Sony WH-1000XM5 Wireless Headphones',
    brand: 'Sony',
    category: 'Audio',
    base_mrp: 34990,
  },
];

const mockEmptyBasketResponse = {
  success: true,
  data: {
    basket_id: 1,
    user_identifier: 'test_guest',
    status: 'active',
    items: [],
    total_items: 0,
    unique_products_count: 0,
    catalog_mrp_total: 0.0,
  },
};

const mockPopulatedBasketResponse = {
  success: true,
  data: {
    basket_id: 1,
    user_identifier: 'test_guest',
    status: 'active',
    items: [
      {
        id: 101,
        basket_id: 1,
        product_id: 1,
        product_name: 'Apple iPhone 15 (128 GB) - Blue',
        product_brand: 'Apple',
        product_sku: 'APPL-IP15-128',
        product_image: null,
        base_mrp: 79900.0,
        quantity: 1,
        available_offers_count: 2,
        total_offers_count: 2,
        item_mrp_subtotal: 79900.0,
        lowest_offer: {
          price: 68499.0,
          retailer_name: 'Amazon India',
        },
      },
      {
        id: 102,
        basket_id: 1,
        product_id: 2,
        product_name: 'Sony WH-1000XM5 Wireless Headphones',
        product_brand: 'Sony',
        product_sku: 'SNY-WH1000-BLK',
        product_image: null,
        base_mrp: 34990.0,
        quantity: 2,
        available_offers_count: 3,
        total_offers_count: 3,
        item_mrp_subtotal: 69980.0,
        lowest_offer: {
          price: 26990.0,
          retailer_name: 'Flipkart',
        },
      },
    ],
    total_items: 3,
    unique_products_count: 2,
    catalog_mrp_total: 149880.0,
  },
};

const mockOptimizationSplitResult = {
  success: true,
  data: {
    status: 'success',
    basket_id: 1,
    items_count: 2,
    allow_split_orders: true,
    max_retailers: 3,
    optimization_algorithm: 'optimal',
    recommendation_type: 'multi_retailer',
    explanation: 'Splitting your order across 2 retailers saves ₹2,500.00 compared to purchasing everything from Flipkart.',
    potential_savings: 2500.0,
    single_retailer_strategy: {
      retailer_id: 2,
      retailer_name: 'Flipkart',
      retailers_count: 1,
      total_items_cost: 125980.0,
      total_shipping: 0.0,
      total_discounts: 500.0,
      final_payable_total: 125480.0,
      is_complete_total: true,
      shipments: [
        {
          retailer_id: 2,
          retailer_name: 'Flipkart',
          items_count: 3,
          subtotal: 125980.0,
          shipping_fee: 0.0,
          shipping_is_unknown: false,
          qualified_free_shipping: true,
          shipping_explanation: 'Qualified for free delivery',
          coupon_discount: 500.0,
          order_total: 125480.0,
          items: [
            {
              product_name: 'Apple iPhone 15',
              product_sku: 'APPL-IP15-128',
              quantity: 1,
              unit_price: 72000.0,
              line_subtotal: 72000.0,
            },
            {
              product_name: 'Sony WH-1000XM5',
              product_sku: 'SNY-WH1000-BLK',
              quantity: 2,
              unit_price: 26990.0,
              line_subtotal: 53980.0,
            },
          ],
        },
      ],
    },
    multi_retailer_strategy: {
      retailers_count: 2,
      total_items_cost: 122479.0,
      total_shipping: 501.0,
      total_discounts: 0.0,
      final_payable_total: 122980.0,
      is_complete_total: true,
      shipments: [
        {
          retailer_id: 1,
          retailer_name: 'Amazon India',
          items_count: 1,
          subtotal: 68499.0,
          shipping_fee: 0.0,
          shipping_is_unknown: false,
          qualified_free_shipping: true,
          shipping_explanation: 'Free shipping on orders above ₹499',
          coupon_discount: 0.0,
          order_total: 68499.0,
          items: [
            {
              product_name: 'Apple iPhone 15',
              product_sku: 'APPL-IP15-128',
              quantity: 1,
              unit_price: 68499.0,
              line_subtotal: 68499.0,
            },
          ],
        },
        {
          retailer_id: 2,
          retailer_name: 'Flipkart',
          items_count: 2,
          subtotal: 53980.0,
          shipping_fee: 501.0,
          shipping_is_unknown: false,
          qualified_free_shipping: false,
          shipping_explanation: 'Standard consolidated fee',
          coupon_discount: 0.0,
          order_total: 54481.0,
          items: [
            {
              product_name: 'Sony WH-1000XM5',
              product_sku: 'SNY-WH1000-BLK',
              quantity: 2,
              unit_price: 26990.0,
              line_subtotal: 53980.0,
            },
          ],
        },
      ],
    },
    unfeasible_single_retailers: [],
    unavailable_products: [],
  },
};

const mockOptimizationUnknownShippingResult = {
  success: true,
  data: {
    status: 'success',
    basket_id: 1,
    items_count: 2,
    allow_split_orders: true,
    max_retailers: 3,
    optimization_algorithm: 'optimal',
    recommendation_type: 'single_retailer',
    explanation: 'One or more evaluated offers have unknown shipping fees. Calculated totals are estimated.',
    potential_savings: 0.0,
    single_retailer_strategy: {
      retailer_id: 1,
      retailer_name: 'Amazon India',
      retailers_count: 1,
      total_items_cost: 120000.0,
      total_shipping: null,
      total_discounts: 0.0,
      final_payable_total: 120000.0,
      is_complete_total: false,
      shipments: [
        {
          retailer_id: 1,
          retailer_name: 'Amazon India',
          items_count: 2,
          subtotal: 120000.0,
          shipping_fee: null,
          shipping_is_unknown: true,
          shipping_explanation: 'At least one item has undisclosed shipping fees',
          coupon_discount: 0.0,
          order_total: 120000.0,
          items: [],
        },
      ],
    },
    multi_retailer_strategy: null,
    unfeasible_single_retailers: [],
    unavailable_products: [],
  },
};

const mockOptimizationUnavailableResult = {
  success: true,
  data: {
    status: 'no_feasible_solution',
    basket_id: 1,
    message: '1 product(s) in your basket have no available in-stock offers.',
    unavailable_products: [
      {
        product_id: 99,
        product_name: 'Rare Vintage Collectible',
        reason: 'No in-stock verified offers available across any retailer.',
      },
    ],
    single_retailer_strategy: null,
    multi_retailer_strategy: null,
    recommended_strategy: null,
    potential_savings: 0.0,
  },
};

describe('BasketOptimizer Page Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    productApi.getProducts.mockResolvedValue({
      success: true,
      data: { items: mockCatalogProducts },
    });
  });

  it('renders loading state initially', () => {
    basketApi.getBasket.mockReturnValue(new Promise(() => {}));
    render(
      <BrowserRouter>
        <BasketOptimizer />
      </BrowserRouter>
    );

    expect(
      screen.getByText(/Loading your shopping basket and available merchant offers/i)
    ).toBeInTheDocument();
  });

  it('renders empty basket state when basket has no items', async () => {
    basketApi.getBasket.mockResolvedValue(mockEmptyBasketResponse);

    render(
      <BrowserRouter>
        <BasketOptimizer />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Your Basket is Empty')).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Use the product selector above or browse the catalog/i)
    ).toBeInTheDocument();
  });

  it('renders populated basket with items, quantities, and lowest store offer', async () => {
    basketApi.getBasket.mockResolvedValue(mockPopulatedBasketResponse);

    render(
      <BrowserRouter>
        <BasketOptimizer />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Apple iPhone 15 (128 GB) - Blue')).toBeInTheDocument();
      expect(screen.getByText('Sony WH-1000XM5 Wireless Headphones')).toBeInTheDocument();
    });

    expect(screen.getByText('Basket Summary')).toBeInTheDocument();
    expect(screen.getByText('3 units')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /optimize basket cost/i })).toBeInTheDocument();
  });

  it('handles item quantity change correctly', async () => {
    basketApi.getBasket.mockResolvedValue(mockPopulatedBasketResponse);
    basketApi.updateItem.mockResolvedValue({ success: true });

    render(
      <BrowserRouter>
        <BasketOptimizer />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Apple iPhone 15 (128 GB) - Blue')).toBeInTheDocument();
    });

    const increaseButtons = screen.getAllByRole('button', { name: /increase quantity/i });
    fireEvent.click(increaseButtons[0]);

    expect(basketApi.updateItem).toHaveBeenCalledWith(101, { quantity: 2 });
  });

  it('handles item removal correctly', async () => {
    basketApi.getBasket.mockResolvedValue(mockPopulatedBasketResponse);
    basketApi.removeItem.mockResolvedValue({ success: true });

    render(
      <BrowserRouter>
        <BasketOptimizer />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Apple iPhone 15 (128 GB) - Blue')).toBeInTheDocument();
    });

    const removeButtons = screen.getAllByRole('button', { name: /remove item/i });
    fireEvent.click(removeButtons[0]);

    expect(basketApi.removeItem).toHaveBeenCalledWith(101);
  });

  it('executes optimization and renders single vs multi-retailer comparison', async () => {
    basketApi.getBasket.mockResolvedValue(mockPopulatedBasketResponse);
    basketApi.optimizeBasket.mockResolvedValue(mockOptimizationSplitResult);

    render(
      <BrowserRouter>
        <BasketOptimizer />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /optimize basket cost/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /optimize basket cost/i }));

    await waitFor(() => {
      expect(screen.getByText(/Splitting your order across 2 retailers saves ₹2,500.00/i)).toBeInTheDocument();
    });

    // Check Multi-Retailer and Single-Retailer cards
    expect(screen.getByText('Multi-Retailer Split Strategy')).toBeInTheDocument();
    expect(screen.getByText(/Single Retailer: Flipkart/i)).toBeInTheDocument();
    expect(screen.getByText(/Saves ₹2,500 compared to single-retailer checkout baseline!/i)).toBeInTheDocument();
  });

  it('renders unknown shipping warnings and estimated totals appropriately', async () => {
    basketApi.getBasket.mockResolvedValue(mockPopulatedBasketResponse);
    basketApi.optimizeBasket.mockResolvedValue(mockOptimizationUnknownShippingResult);

    render(
      <BrowserRouter>
        <BasketOptimizer />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /optimize basket cost/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /optimize basket cost/i }));

    await waitFor(() => {
      expect(screen.getByText(/One or more evaluated offers have unknown shipping fees/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Estimated \(undisclosed shipping\)/i)).toBeInTheDocument();
  });

  it('handles unavailable products with no feasible solution state', async () => {
    basketApi.getBasket.mockResolvedValue(mockPopulatedBasketResponse);
    basketApi.optimizeBasket.mockResolvedValue(mockOptimizationUnavailableResult);

    render(
      <BrowserRouter>
        <BasketOptimizer />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /optimize basket cost/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /optimize basket cost/i }));

    await waitFor(() => {
      expect(screen.getByText(/Unfulfilled Items in Basket/i)).toBeInTheDocument();
      expect(screen.getByText(/Rare Vintage Collectible/i)).toBeInTheDocument();
    });
  });

  it('handles API error state with retry', async () => {
    basketApi.getBasket.mockRejectedValue(new Error('Basket service unavailable'));

    render(
      <BrowserRouter>
        <BasketOptimizer />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Basket service unavailable')).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole('button', { name: /try again/i });
    expect(retryBtn).toBeInTheDocument();

    basketApi.getBasket.mockResolvedValue(mockPopulatedBasketResponse);
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText('Apple iPhone 15 (128 GB) - Blue')).toBeInTheDocument();
    });
  });
});
