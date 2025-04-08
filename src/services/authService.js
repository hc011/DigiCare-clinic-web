import axios from "axios";
import { cancelAllRequests } from "../utils/axiosInstance";
import webSocketService from "./websocketService";
import axiosInstance from "../utils/axiosInstance";
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

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
  } catch (error) {
    if (!axios.isCancel(error)) {
      console.error("Logout error:", error);
    }
  } finally {
    localStorage.removeItem("user");
    window.location.replace("/login");
  }
};
