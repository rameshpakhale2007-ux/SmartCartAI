import axiosClient from './axiosClient';

export const dashboardApi = {
  getHealth: async () => {
    return axiosClient.get('/health');
  },
  getSummary: async () => {
    return axiosClient.get('/dashboard/summary');
  },
};

export default dashboardApi;
