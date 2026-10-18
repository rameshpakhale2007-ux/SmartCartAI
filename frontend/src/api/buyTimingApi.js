import axiosClient from './axiosClient';

export const buyTimingApi = {
  /**
   * Retrieves purchase-timing assessment and historical benchmarks for a product.
   * days: 30, 60, 90, 180, or 365
   * retailerId: optional retailer filter
   */
  getBuyTimingAssessment: async (productId, daysOrParams = 30, retailerId = null) => {
    let params = {};
    if (typeof daysOrParams === 'object' && daysOrParams !== null) {
      params = daysOrParams;
    } else {
      params.days = daysOrParams;
      if (retailerId) {
        params.retailer_id = retailerId;
      }
    }
    return axiosClient.get(`/products/${productId}/buy-timing`, { params });
  },

  /**
   * Establishes a target-price alert directly using the timing advisory interface.
   * data: { target_price, contact_email, retailer_id, user_identifier }
   */
  createTargetAlert: async (productId, data) => {
    return axiosClient.post(`/products/${productId}/buy-timing/target-alert`, data);
  },
};

export default buyTimingApi;
