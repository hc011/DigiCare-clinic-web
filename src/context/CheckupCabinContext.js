import { createContext, useState, useContext, useEffect } from "react";
import { fetchCabinSlots } from "../services/api";
import { logout } from "../services/authService";
import { handleAutoLogout } from "../utils/authUtils";
// Keys for localStorage
const CABIN_ID_KEY = "cabin_id";
const SELECTED_SLOT_KEY = "cabin_selected_slot";
const CABIN_SLOTS_KEY = "cabin_slots";
const SELECTED_SLOT_INFO_KEY = "cabin_selected_slot_info";

const CheckupCabinContext = createContext();
   
export const CheckupCabinProvider = ({ children }) => {
  const user = JSON.parse(localStorage.getItem('user'));
  const [cabinSlots, setCabinSlots] = useState(null);

  // Clear previous cabin data on initial load
  useEffect(() => {
    // Clear any existing cabin data in localStorage
    localStorage.removeItem(CABIN_ID_KEY);
    localStorage.removeItem(SELECTED_SLOT_KEY);
    localStorage.removeItem(CABIN_SLOTS_KEY);
    localStorage.removeItem(SELECTED_SLOT_INFO_KEY);
    // Initialize if we have a user
    if (user?.checkupcabindata?.[0]?.id) {
      fetchCabinData(user.checkupcabindata[0].id);
    }
  }, []);

  // Update localStorage whenever cabinSlots changes
  useEffect(() => {
    if (cabinSlots && user?.checkupcabindata?.[0]?.id) {
      updateLocalStorage();
    }
  }, [cabinSlots]);

  const fetchCabinData = async (cabinId) => {
    if (!cabinId) return null;

    try {
      const response = await fetchCabinSlots(cabinId);
      setCabinSlots(response);
      return response;
    } catch (error) {   
      console.error("Error fetching cabin data:", error);
      logout();
    }
  };

  const getOpenSlots = () => {
    if (!cabinSlots || cabinSlots.length === 0) return null;
    const openSlots = cabinSlots.filter(slot => slot.status === "open");
    return openSlots;
  }

  const getLatestOpenCabinSlot = () => {
    if (!cabinSlots || cabinSlots.length === 0) return null;

    const openSlots = getOpenSlots();
    
    if (openSlots.length === 0) return null;
    
    const sortedOpenSlots = [...openSlots].sort((a, b) => {
      const dateA = new Date(a.slot);
      const dateB = new Date(b.slot);
      return dateA - dateB;
    });
    return sortedOpenSlots[0];
  }

  // Helper function to update localStorage
  const updateLocalStorage = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user?.checkupcabindata?.[0]?.id) return;
    
    const cabinId = user.checkupcabindata[0].id;
    const latestOpenSlot = getLatestOpenCabinSlot();
    const selectedSlot = latestOpenSlot ? latestOpenSlot.slot : null; 
    
    // Update localStorage with the latest values
    localStorage.setItem(CABIN_ID_KEY, cabinId);
    if (selectedSlot) localStorage.setItem(SELECTED_SLOT_KEY, selectedSlot);
    if (latestOpenSlot) localStorage.setItem(SELECTED_SLOT_INFO_KEY, JSON.stringify(latestOpenSlot));
    localStorage.setItem(CABIN_SLOTS_KEY, JSON.stringify(cabinSlots));
  }

  const getCabinInfo = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user?.checkupcabindata?.[0]?.id) {
      return { cabinId: null, selectedSlot: null, cabinSlots: [] };
    }
    
    const cabinId = user.checkupcabindata[0].id;
    const latestOpenSlot = getLatestOpenCabinSlot();
    const selectedSlot = latestOpenSlot ? latestOpenSlot.slot : null; 
    
    // Update localStorage with the latest values
    localStorage.setItem(CABIN_ID_KEY, cabinId);
    if (selectedSlot) localStorage.setItem(SELECTED_SLOT_KEY, selectedSlot);
    localStorage.setItem(CABIN_SLOTS_KEY, JSON.stringify(cabinSlots));
    
    return { cabinId, selectedSlot, cabinSlots };
  }

  const value = {
    cabinSlots,
    fetchCabinData,
    getLatestOpenCabinSlot,
    getOpenSlots,
    getCabinInfo,
  }
  
  return (
    <CheckupCabinContext.Provider value={value}>
      {children}
    </CheckupCabinContext.Provider>
  );
};

export const useCheckupCabin = () => useContext(CheckupCabinContext);