const axios = require('axios');
const axiosRetry = require('axios-retry').default;
const { addLogEntry, LOG_LEVELS, getApiConfig } = require('./DBManager');

// Fetch API configuration
const apiConfig = getApiConfig();

// Log the fetched (and potentially validated/defaulted) API config for debugging
// In a production scenario, sensitive parts of config like tokens shouldn't be logged directly.
// For now, logging the structure helps confirm it's loaded.
addLogEntry(LOG_LEVELS.DEBUG, 'ApiClientConfigLoaded', {
    clientTimeoutMs: apiConfig.clientTimeoutMs,
    retryMaxAttempts: apiConfig.retryMaxAttempts,
    retryDelayFactorMs: apiConfig.retryDelayFactorMs,
    // Do not log baseUrl or bearerToken here directly to avoid sensitive data in general logs
    // but confirm they are part of the object if needed during specific debugging.
});


const apiClient = axios.create({
  timeout: apiConfig.clientTimeoutMs,
});

axiosRetry(apiClient, {
  retries: apiConfig.retryMaxAttempts,
  retryDelay: (retryCount) => {
    return retryCount * apiConfig.retryDelayFactorMs;
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