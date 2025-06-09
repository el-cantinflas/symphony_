const axios = require('axios');
const axiosRetry = require('axios-retry').default;
const { addLogEntry, LOG_LEVELS, getApiConfig } = require('./DBManager');

class ApiClient {
  constructor(baseUrl, bearerToken) {
    const apiConfig = getApiConfig();

    this.baseUrl = baseUrl || apiConfig.baseUrl;
    this.bearerToken = bearerToken || apiConfig.bearerToken;
    this.clientTimeoutMs = apiConfig.clientTimeoutMs;
    this.retryMaxAttempts = apiConfig.retryMaxAttempts;
    this.retryDelayFactorMs = apiConfig.retryDelayFactorMs;

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: this.clientTimeoutMs,
      headers: {
        'Authorization': `Bearer ${this.bearerToken}`,
        'Content-Type': 'application/json'
      }
    });

    axiosRetry(this.client, {
      retries: this.retryMaxAttempts,
      retryDelay: (retryCount) => {
        return retryCount * this.retryDelayFactorMs;
      },
      retryCondition: (error) => {
        return axiosRetry.isNetworkOrIdempotentRequestError(error) || (error.response && error.response.status >= 500);
      },
      onRetry: (retryCount, error, requestConfig) => {
        const message = `Retrying request to ${requestConfig.url} (attempt ${retryCount}). Error: ${error.message}`;
        console.warn(message);
        addLogEntry(LOG_LEVELS.WARNING.name, 'ApiClientRetry', {
          url: requestConfig.url,
          method: requestConfig.method,
          attempt: retryCount,
          error: error.message,
        });
      }
    });

    this.client.interceptors.request.use(
      (config) => {
        addLogEntry(LOG_LEVELS.DEBUG.name, 'ApiClientRequestSent', {
          method: config.method,
          url: config.url,
        });
        return config;
      },
      (error) => {
        addLogEntry(LOG_LEVELS.ERROR.name, 'ApiClientRequestSetupFailed', {
          message: error.message,
        });
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        addLogEntry(LOG_LEVELS.DEBUG.name, 'ApiClientResponseReceived', {
          status: response.status,
        });
        return response;
      },
      (error) => {
        addLogEntry(LOG_LEVELS.ERROR.name, 'ApiClientRequestFailed', {
          message: error.message,
          url: error.config.url,
          status: error.response ? error.response.status : null,
        });
        return Promise.reject(error);
      }
    );
  }

  async checkConnection() {
    // A simple GET request to the base URL to check for connectivity.
    // This assumes the base URL endpoint can handle a GET request.
    return this.client.get('/');
  }

  async get(endpoint, params = {}) {
    return this.client.get(endpoint, { params });
  }

  async post(endpoint, data = {}) {
    return this.client.post(endpoint, data);
  }
}

module.exports = ApiClient;