import axiosClient from './axiosClient';

export const alertApi = {
  /**
   * List all alerts for the current user.
   */
  getAlerts: async (params = {}) => {
    return axiosClient.get('/alerts', { params });
  },

  /**
   * Create a new target-price alert.
   * data: { product_id, target_price, contact_email, retailer_id }
   */
  createAlert: async (data) => {
    return axiosClient.post('/alerts', data);
  },

  /**
   * Update an existing alert (is_active, target_price).
   */
  updateAlert: async (alertId, data) => {
    return axiosClient.patch(`/alerts/${alertId}`, data);
  },

  /**
   * Delete an existing alert.
   */
  deleteAlert: async (alertId) => {
    return axiosClient.delete(`/alerts/${alertId}`);
  },

  /**
   * Trigger an evaluation check across all active alerts.
   */
  checkAlerts: async () => {
    return axiosClient.post('/alerts/check');
  },

  /**
   * Trigger an evaluation check for a specific alert.
   */
  checkSingleAlert: async (alertId) => {
    return axiosClient.post(`/alerts/${alertId}/check`);
  },
};

export default alertApi;
