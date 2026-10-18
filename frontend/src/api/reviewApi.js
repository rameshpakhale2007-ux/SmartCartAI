import axiosClient from './axiosClient';

export const reviewApi = {
  /**
   * Retrieves review pattern consistency and integrity assessment for a product.
   * params: { similarity_threshold?: float }
   */
  getProductReviewIntegrity: async (productId, params = {}) => {
    return axiosClient.get(`/products/${productId}/reviews/integrity`, { params });
  },

  /**
   * Retrieves paginated reviews for a product with optional rating/verified filters.
   * params: { page?: int, per_page?: int, rating?: int, verified_only?: bool, sort?: string }
   */
  getProductReviews: async (productId, params = {}) => {
    return axiosClient.get(`/products/${productId}/reviews`, { params });
  },

  /**
   * Analyzes an ad-hoc review corpus provided via JSON or uploaded CSV file.
   * Accepts JSON object or FormData instance.
   */
  analyzeAdhocReviews: async (payload) => {
    if (payload instanceof FormData) {
      return axiosClient.post('/reviews/analyze', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    return axiosClient.post('/reviews/analyze', payload);
  },
};

export default reviewApi;
