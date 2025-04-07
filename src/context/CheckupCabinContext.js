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
  const [isInitialized, setIsInitialized] = useState(false);
  const [cabinId, setCabinId] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Clear previous cabin data on initial load
  useEffect(() => {
    // Clear any existing cabin data in localStorage
    localStorage.removeItem(CABIN_ID_KEY);
    localStorage.removeItem(SELECTED_SLOT_KEY);
    localStorage.removeItem(CABIN_SLOTS_KEY);
    localStorage.removeItem(SELECTED_SLOT_INFO_KEY);
    
    // Initialize if we have a user
    const initCabinData = async () => {
      if (user?.checkupcabindata?.[0]?.id) {
        try {
          await fetchCabinData(user.checkupcabindata[0].id);
        } finally {
          // Always mark as initialized, even if there was an error
          setIsInitialized(true);
        }
      } else {
        setIsInitialized(true); // Still mark as initialized if no user data to prevent waiting indefinitely
      }
    };
    
    initCabinData();
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
      
      // Set cabinId directly in state
      setCabinId(cabinId);
      
      // Get and set the selected slot
      const latestOpenSlot = getLatestOpenCabin(response);
      if (latestOpenSlot) {
        setSelectedSlot(latestOpenSlot.slot);
      }
      
      return response;
    } catch (error) {   
      console.error("Error fetching cabin data:", error);
      logout();
      return null;
    }
  };

  // Helper function to find latest open cabin from provided slots
  const getLatestOpenCabin = (slots) => {
    if (!slots || slots.length === 0) return null;
    
    const openSlots = slots.filter(slot => slot.status === "open");
    if (openSlots.length === 0) return null;
    
    const sortedOpenSlots = [...openSlots].sort((a, b) => {
      const dateA = new Date(a.slot);
      const dateB = new Date(b.slot);
      return dateA - dateB;
    });
    
    return sortedOpenSlots[0];
  };

  const getOpenSlots = () => {
    if (!cabinSlots || cabinSlots.length === 0) return null;
    const openSlots = cabinSlots.filter(slot => slot.status === "open");
    return openSlots;
  }

  const getLatestOpenCabinSlot = () => {
    return getLatestOpenCabin(cabinSlots);
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
    if (selectedSlot) {
      localStorage.setItem(SELECTED_SLOT_KEY, selectedSlot);
      setSelectedSlot(selectedSlot);
    }
    if (latestOpenSlot) localStorage.setItem(SELECTED_SLOT_INFO_KEY, JSON.stringify(latestOpenSlot));
    localStorage.setItem(CABIN_SLOTS_KEY, JSON.stringify(cabinSlots));
    
    // Also update our state
    setCabinId(cabinId);
  }

  const getCabinInfo = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user?.checkupcabindata?.[0]?.id) {
      return { cabinId: null, selectedSlot: null, cabinSlots: [] };
    }
    
    const cId = user.checkupcabindata[0].id;
    const latestOpenSlot = getLatestOpenCabinSlot();
    const sSlot = latestOpenSlot ? latestOpenSlot.slot : null; 
    
    // Update localStorage with the latest values
    localStorage.setItem(CABIN_ID_KEY, cId);
    if (sSlot) {
      localStorage.setItem(SELECTED_SLOT_KEY, sSlot);
      setSelectedSlot(sSlot);
    }
    localStorage.setItem(CABIN_SLOTS_KEY, JSON.stringify(cabinSlots));
    
    // Also update our state
    setCabinId(cId);
    
    return { cabinId: cId, selectedSlot: sSlot, cabinSlots };
  }

  const value = {
    cabinSlots,
    fetchCabinData,
    getLatestOpenCabinSlot,
    getOpenSlots,
    getCabinInfo,
    isInitialized,
    cabinId,
    selectedSlot
  }
  
  return (
    <CheckupCabinContext.Provider value={value}>
      {children}
    </CheckupCabinContext.Provider>
  );
};

export const useCheckupCabin = () => useContext(CheckupCabinContext);