import { cancelAllRequests } from "./axiosInstance";
import { logout } from "../services/authService";
/**
 * Handles automatic logout with proper error messaging
 * Stores the logout reason in sessionStorage to be displayed on the login page
 * 
 * @param {string} message - The message to display to the user
 * @param {string} severity - The severity level of the message (error, warning, info, success)
 */
export const handleAutoLogout = (message, severity = "error") => {
  if (!window.location.pathname.includes("/login")) {
    console.log(`Auto logout triggered: ${message}`);
    
    // Store the logout reason and severity in sessionStorage
    sessionStorage.setItem("autoLogoutReason", message);
    sessionStorage.setItem("autoLogoutSeverity", severity);
    
    // Clear user data
    localStorage.removeItem("user");
    
    // Cancel any pending requests
    cancelAllRequests();
    
    logout();    
  }
};

/**
 * Checks if there's an auto logout message in sessionStorage
 * and returns it if found, then clears it
 * 
 * @returns {Object|null} The auto logout message and severity, or null if none exists
 */
export const getAutoLogoutMessage = () => {
  const message = sessionStorage.getItem("autoLogoutReason");
  const severity = sessionStorage.getItem("autoLogoutSeverity") || "error";
  
  if (message) {
    // Clear the message so it doesn't show again on refresh
    sessionStorage.removeItem("autoLogoutReason");
    sessionStorage.removeItem("autoLogoutSeverity");
    
    return { message, severity };
  }
  
  return null;
}; 