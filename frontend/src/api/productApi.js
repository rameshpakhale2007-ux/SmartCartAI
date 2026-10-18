import axiosClient from './axiosClient';

export const productApi = {
  /**
   * Search and filter products with pagination.
   * params: { search, category, brand, retailer, min_price, max_price, sort, page, per_page }
   */
  getProducts: async (params = {}) => {
    return axiosClient.get('/products', { params });
  },

  /**
   * Retrieve single product details by ID.
   */
  getProductById: async (productId) => {
    return axiosClient.get(`/products/${productId}`);
  },

  /**
   * Retrieve retailer offers and price comparison calculation for a product.
   */
  getProductOffers: async (productId, sort = 'estimated_total') => {
    return axiosClient.get(`/products/${productId}/offers`, {
      params: { sort },
    });
  },

  /**
   * Comparison API route conforming to /api/comparison?product_id=X&sort=Y.
   */
  getComparison: async (productId, sort = 'estimated_total') => {
    return axiosClient.get('/comparison', {
      params: { product_id: productId, sort },
    });
  },
};

export default productApi;
