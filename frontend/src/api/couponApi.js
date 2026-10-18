import axiosClient from './axiosClient';

export const couponApi = {
  /**
   * List coupons with search, filters, pagination, and sorting.
   * params: { search, retailer_id, discount_type, verification_status, product_id, category, active_only, sort, page, per_page }
   */
  getCoupons: async (params = {}) => {
    return axiosClient.get('/coupons', { params });
  },

  /**
   * Get single coupon details by ID.
   */
  getCouponById: async (couponId) => {
    return axiosClient.get(`/coupons/${couponId}`);
  },

  /**
   * Validate coupon code against purchase context.
   * payload: { coupon_code, purchase_amount, product_id, retailer_id, quantity, shipping_cost }
   */
  validateCoupon: async (payload) => {
    return axiosClient.post('/coupons/validate', payload);
  },

  /**
   * Create a new coupon (for testing or merchant submission).
   */
  createCoupon: async (payload) => {
    return axiosClient.post('/coupons', payload);
  },
};

export default couponApi;
