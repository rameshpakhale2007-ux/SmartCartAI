import axiosClient from './axiosClient';

export const historyApi = {
  /**
   * Retrieve historical prices and trend statistics for a product.
   * days: 30, 60, or 90
   * retailerId: optional retailer filter
   */
  getProductHistory: async (productId, days = 30, retailerId = null) => {
    const params = { days };
    if (retailerId) {
      params.retailer_id = retailerId;
    }
    return axiosClient.get(`/products/${productId}/history`, { params });
  },
};

export default historyApi;
