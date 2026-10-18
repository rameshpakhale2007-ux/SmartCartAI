import axiosClient from './axiosClient';

export const alternativeApi = {
  /**
   * Retrieve ranked product alternatives.
   * params: { min_similarity, min_price, max_price, brand, sort, page, per_page }
   */
  getAlternatives: async (productId, params = {}) => {
    return axiosClient.get(`/products/${productId}/alternatives`, { params });
  },

  /**
   * Side-by-side spec comparison between source product and alternative IDs.
   * alternativeIds: array of numbers e.g. [2, 3]
   */
  compareAlternatives: async (sourceProductId, alternativeIds = []) => {
    const idsParam = alternativeIds.join(',');
    return axiosClient.get(`/products/${sourceProductId}/alternatives/compare`, {
      params: { ids: idsParam },
    });
  },
};

export default alternativeApi;
