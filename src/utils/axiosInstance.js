import axios from "axios";
import { handleAutoLogout } from "./authUtils";
import { isLoggingOut } from "../services/authService";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
const REFRESH_TOKEN_URL = process.env.REACT_APP_REFRESH_TOKEN_URL;
const REQUEST_TIMEOUT = 60000; // 60 seconds

// Track active requests
const activeRequests = new Set();

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// Request Interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const cancelToken = axios.CancelToken.source();
    config.cancelToken = cancelToken.token;
    activeRequests.add(cancelToken);

    // Add timestamp for timeout tracking
    config.metadata = { startTime: Date.now() };

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    activeRequests.delete(response.config.cancelToken);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Clean up request tracking
    if (originalRequest?.cancelToken) {
      activeRequests.delete(originalRequest.cancelToken);
    }

    // Handle timeouts
    if (
      error.code === "ECONNABORTED" ||
      (originalRequest?.metadata &&
        Date.now() - originalRequest.metadata.startTime > REQUEST_TIMEOUT)
    ) {
      handleAutoLogout("Request timed out. Please try again later.", "error");
      return Promise.reject(error);
    }

    // Handle network errors
    if (!error.response) {
      handleAutoLogout("Network error. Please check your internet connection.", "error");
      return Promise.reject(error);
    }

    // Handle 429 Too Many Requests
    if (error.response?.status === 429) {
      handleAutoLogout("Too many requests. Please try again later.", "warning");
      return Promise.reject(error);
    }

    // Handle 401 Unauthorized - special handling for logout requests
    if (error.response?.status === 401 && !originalRequest._retry) {
      // For logout requests, add _retry flag but don't attempt token refresh
      if (originalRequest.url && originalRequest.url.includes('/api/logout')) {
        console.log("Logout request failed with 401, marking as retried");
        originalRequest._retry = true;
        return Promise.reject(error);
      }
      
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedRequestsQueue.push({ resolve, reject });
        })
          .then(() => axiosInstance(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await refreshAccessToken();
        const response = await axiosInstance(originalRequest);
        failedRequestsQueue.forEach(({ resolve }) => resolve());
        return response;
      } catch (refreshError) {
        failedRequestsQueue.forEach(({ reject }) => reject(refreshError));
        handleAutoLogout("Your session has expired. Please log in again.", "info");
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
        failedRequestsQueue = [];
      }
    }

    return Promise.reject(error);
  }
);

// Token refresh logic
let isRefreshing = false;
let failedRequestsQueue = [];

const refreshAccessToken = async () => {
  try {
    const response = await axios.post(
      REFRESH_TOKEN_URL,
      {},
      { withCredentials: true, timeout: 10000 }
    );
    return response.data;
  } catch (error) {
    // Only trigger auto-logout if we're not already in the logout process
    if (!isLoggingOut) {
      handleAutoLogout("Your session has expired. Please log in again.", "info");
    } else {
      console.log("Token refresh failed during logout process, skipping auto-logout");
    }
    throw error;
  }
};

// Request cancellation
export const cancelAllRequests = () => {
  activeRequests.forEach((source) => source.cancel("Request canceled"));
  activeRequests.clear();
};

export default axiosInstance;
