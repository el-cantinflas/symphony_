const axios = require('axios');
const axiosRetry = require('axios-retry').default;
const { addLogEntry, LOG_LEVELS, getApiConfig } = require('./DBManager');

// Fetch API configuration
const apiConfig = getApiConfig();

// Log the fetched (and potentially validated/defaulted) API config for debugging
// In a production scenario, sensitive parts of config like tokens shouldn't be logged directly.
// For now, logging the structure helps confirm it's loaded.
addLogEntry(LOG_LEVELS.DEBUG.name, 'ApiClientConfigLoaded', {
    clientTimeoutMs: apiConfig.clientTimeoutMs,
    retryMaxAttempts: apiConfig.retryMaxAttempts,
    retryDelayFactorMs: apiConfig.retryDelayFactorMs,
    // Do not log baseUrl or bearerToken here directly to avoid sensitive data in general logs
    // but confirm they are part of the object if needed during specific debugging.
});


const apiClient = axios.create({
  baseURL: apiConfig.baseUrl,
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
    addLogEntry(LOG_LEVELS.WARNING.name, 'ApiClientRetry', {
      url: requestConfig.url,
      method: requestConfig.method,
      attempt: retryCount,
      error: error.message,
      responseData: error.response ? error.response.data : null,
      responseStatus: error.response ? error.response.status : null,
    });
  }
});

// Request Interceptor to log outgoing requests
apiClient.interceptors.request.use(
  (config) => {
    // In a production scenario, consider redacting sensitive information from headers (e.g., Authorization)
    // and payload before logging.
    addLogEntry(LOG_LEVELS.DEBUG.name, 'ApiClientRequestSent', {
      method: config.method,
      url: config.url,
      headers: config.headers,
      params: config.params,
      data: config.data,
    });
    return config;
  },
  (error) => {
    // This error is for request setup, not response.
    addLogEntry(LOG_LEVELS.ERROR.name, 'ApiClientRequestSetupFailed', {
      message: error.message,
      stack: error.stack,
    });
    return Promise.reject(error);
  }
);

// Response Interceptor to log successful responses and errors for requests that ultimately fail after retries
apiClient.interceptors.response.use(
  (response) => {
    // Log successful response
    // In a production scenario, consider redacting sensitive information from response data.
    addLogEntry(LOG_LEVELS.DEBUG.name, 'ApiClientResponseReceived', {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data,
      request: {
        method: response.config.method,
        url: response.config.url,
        params: response.config.params,
        // request data might be large or sensitive, log selectively if needed
        // data: response.config.data
      }
    });
    return response;
  },
  (error) => {
    const requestConfig = error.config;
    let logData = {
      error: error.message,
      responseData: error.response ? error.response.data : null,
      responseStatus: error.response ? error.response.status : null,
      responseHeaders: error.response ? error.response.headers : null,
    };

    if (requestConfig) {
      logData.url = requestConfig.url;
      logData.method = requestConfig.method;
      logData.params = requestConfig.params;
      logData.data = requestConfig.data; // Request payload
      logData.requestHeaders = requestConfig.headers;
      console.error(`Request to ${requestConfig.url} failed after retries. Error: ${error.message}`);
    } else {
      console.error(`Request failed (no request.config available). Error: ${error.message}`);
    }

    addLogEntry(LOG_LEVELS.ERROR.name, 'ApiClientRequestFailed', logData);
    return Promise.reject(error);
  }
);

module.exports = apiClient;