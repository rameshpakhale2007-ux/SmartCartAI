import axiosClient from './axiosClient';

export const tcoApi = {
  /**
   * Calculate Total Cost of Ownership over selected ownership horizon.
   * payload: { product_id, purchase_price, ownership_months, acquisition_cost, monthly_operating_cost, maintenance_cost, repair_cost, accessory_cost, financing_cost, estimated_resale_value, condition, auto_estimate_resale }
   */
  calculateTCO: async (payload) => {
    return axiosClient.post('/tco/calculate', payload);
  },

  /**
   * Forecast future resale value and compound depreciation curve.
   * params: { months, condition, scenario, annual_rate, persist }
   */
  getResaleForecast: async (productId, params = {}) => {
    return axiosClient.get(`/products/${productId}/resale-forecast`, { params });
  },

  /**
   * Compare TCO across up to 5 products.
   * payload: { products: [...] }
   */
  compareTCO: async (payload) => {
    return axiosClient.post('/tco/compare', payload);
  },

  /**
   * Retrieve stored forecast snapshots history for a product.
   */
  getForecastHistory: async (productId) => {
    return axiosClient.get(`/products/${productId}/resale-forecast/history`);
  },
};

export default tcoApi;
