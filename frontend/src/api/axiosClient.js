import axios from 'axios';

// Centralized Axios client with proxy support and standardized error formatting
function resolveBaseUrl() {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (!envUrl) {
    return '/api';
  }
  const trimmed = envUrl.trim().replace(/\/+$/, '');
  if (!trimmed.endsWith('/api')) {
    return `${trimmed}/api`;
  }
  return trimmed;
}

const baseURL = resolveBaseUrl();

export const axiosClient = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Interceptor for responses
axiosClient.interceptors.response.use(
  (response) => {
    // Unpack standardized { success, data } envelope if available
    return response.data;
  },
  (error) => {
    let formattedMessage = 'An unexpected network error occurred.';
    let errorCode = 'NETWORK_ERROR';

    if (error.response) {
      const data = error.response.data;
      if (data && data.error) {
        formattedMessage = data.error.message || formattedMessage;
        errorCode = data.error.code || errorCode;
      } else if (data && data.message) {
        formattedMessage = data.message;
      } else {
        formattedMessage = `Server error (${error.response.status})`;
      }
    } else if (error.request) {
      formattedMessage = 'Unable to connect to the SmartCart backend service. Check if Flask is running.';
    }

    const customError = new Error(formattedMessage);
    customError.code = errorCode;
    customError.original = error;
    return Promise.reject(customError);
  }
);

export default axiosClient;
