import axiosClient from './axiosClient';

export const basketApi = {
  /**
   * Retrieve active basket items and current offers.
   */
  getBasket: async (params = {}) => {
    return axiosClient.get('/basket', { params });
  },

  /**
   * Add a product to the basket.
   * data: { product_id, quantity, preferred_retailer_id }
   */
  addItem: async (data) => {
    return axiosClient.post('/basket/items', data);
  },

  /**
   * Update quantity of a basket item.
   * data: { quantity }
   */
  updateItem: async (itemId, data) => {
    return axiosClient.patch(`/basket/items/${itemId}`, data);
  },

  /**
   * Remove an item from the basket.
   */
  removeItem: async (itemId) => {
    return axiosClient.delete(`/basket/items/${itemId}`);
  },

  /**
   * Clear the entire basket.
   */
  clearBasket: async () => {
    return axiosClient.delete('/basket');
  },

  /**
   * Run multi-vendor basket optimization.
   * data: { allow_split_orders, max_retailers }
   */
  optimizeBasket: async (data = {}) => {
    return axiosClient.post('/basket/optimize', data);
  },
};

export default basketApi;
