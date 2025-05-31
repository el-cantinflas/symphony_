const axios = require('axios');
const axiosRetry = require('axios-retry').default;
const { addLogEntry, LOG_LEVELS } = require('./DBManager');

const apiClient = axios.create({
  // Default timeout of 10 seconds
  timeout: 10000,
});

axiosRetry(apiClient, {
  retries: 3, // Number of retries
  retryDelay: (retryCount) => {
    return retryCount * 1000; // Time interval between retries
  },
  retryCondition: (error) => {
    // Retry on network errors or 5xx server errors
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || (error.response && error.response.status >= 500);
  },
  onRetry: (retryCount, error, requestConfig) => {
    const message = `Retrying request to ${requestConfig.url} (attempt ${retryCount}). Error: ${error.message}`;
    console.warn(message); // Also log to console for immediate visibility during development
    addLogEntry(LOG_LEVELS.WARNING, 'ApiClientRetry', { 
      url: requestConfig.url,
      method: requestConfig.method,
      attempt: retryCount,
      error: error.message,
      responseData: error.response ? error.response.data : null,
      responseStatus: error.response ? error.response.status : null,
    });
  }
});

// Interceptor to log errors for requests that ultimately fail after retries
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestConfig = error.config;
    const message = `Request to ${requestConfig.url} failed after retries. Error: ${error.message}`;
    console.error(message); // Also log to console
    addLogEntry(LOG_LEVELS.ERROR, 'ApiClientRequestFailed', {
      url: requestConfig.url,
      method: requestConfig.method,
      params: requestConfig.params,
      data: requestConfig.data,
      error: error.message,
      responseData: error.response ? error.response.data : null,
      responseStatus: error.response ? error.response.status : null,
      headers: error.response ? error.response.headers : null,
    });
    return Promise.reject(error);
  }
);

module.exports = apiClient;