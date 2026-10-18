import axiosClient from './axiosClient';

export const honestyApi = {
  /**
   * Retrieves comprehensive Honesty Index analysis for a single product.
   * @param {number|string} productId
   * @param {Object} [params] - { retailer_id, days }
   */
  getProductHonesty: (productId, params = {}) => {
    return axiosClient.get(`/products/${productId}/honesty`, { params });
  },

  /**
   * Retrieves isolated retailer-by-retailer honesty evaluations for a product.
   * @param {number|string} productId
   * @param {Object} [params] - { days }
   */
  getRetailersHonesty: (productId, params = {}) => {
    return axiosClient.get(`/products/${productId}/honesty/retailers`, { params });
  },

  /**
   * Retrieves catalog-wide honesty summary and credibility statistics.
   */
  getHonestySummary: () => {
    return axiosClient.get('/honesty/summary');
  },
};

export default honestyApi;
