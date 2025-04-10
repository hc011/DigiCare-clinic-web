import axios from "axios";
import { cancelAllRequests } from "../utils/axiosInstance";
import webSocketService from "./websocketService";
import axiosInstance from "../utils/axiosInstance";
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

// Logout guard flag
let isLoggingOut = false;
export { isLoggingOut };

// Function to handle user login
export const login = async (username, password) => {
  try {
    // Send a POST request to the login API
    const response = await axios.post(
      `${API_BASE_URL}/api/login/`,
      {
        username,
        password,
      },
      { withCredentials: true }
    ); // Important for sending cookies

    // Check if response indicates success
    if (response.status !== 200) {
      throw new Error("Login failed");
    }

    // Access and refresh tokens are set as HTTP-only cookies by the server
    // No need to handle them manually in client-side code

    return response.data; // Return the response data if needed
  } catch (error) {
    console.error(
      "Login failed:",
      error.response ? error.response.data : error
    );
    throw error; // Rethrow error for further handling
  }
};

export const logout = async () => {
  // Prevent multiple simultaneous logout calls
  if (isLoggingOut) return;
  isLoggingOut = true;
  
  try {
    // Disconnect the WebSocket connection
    webSocketService.cleanupOnLogout();
    
    // Cancel all pending HTTP requests
    cancelAllRequests();
    
    await axiosInstance.post(
      "/api/logout",
      {},
      {
        withCredentials: true,
      }
    );
    // Successful logout - clear client storage and redirect
    localStorage.clear();
    sessionStorage.clear();
    window.location.replace("/login");
  } catch (error) {
    if (!axios.isCancel(error)) {
      console.error("Logout error:", error);
      
      // Special handling for 401 errors (after token refresh)
      if (error.response && error.response.status === 401 && error.config._retry) {
        console.log("Logout API call failed with 401 after token refresh, performing local logout");
        performLocalLogout();
      } else {
        // For other errors, store message for display on login page
        sessionStorage.setItem("autoLogoutReason", "Logout failed. Please try again later.");
        sessionStorage.setItem("autoLogoutSeverity", "warning");
        
        // Still redirect to login page for any error
        window.location.replace("/login");
      }
    }
  } finally {
    // Reset the flag after a timeout to ensure it's reset even if navigation is delayed
    setTimeout(() => {
      isLoggingOut = false;
    }, 5000);
  }
};

// Helper function to perform local logout operations
const performLocalLogout = () => {
  // Clear all application data
  localStorage.clear(); 
  sessionStorage.clear();
  
  // Clear cookies by setting expiration to past date
  // This will only clear non-httpOnly cookies that are accessible via JavaScript
  document.cookie.split(";").forEach(cookie => {
    const [name] = cookie.trim().split("=");
    if (name) { // Skip empty names
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    }
  });
  
  // Redirect to login page
  window.location.replace("/login");
};
