import { createContext, useState, useContext, useEffect } from "react";
import { fetchCabinSlots } from "../services/api";
import { logout } from "../services/authService";
import { handleAutoLogout } from "../utils/authUtils";
// Keys for localStorage
const CABIN_ID_KEY = "cabin_id";
const SELECTED_SLOT_KEY = "cabin_selected_slot";
const CABIN_SLOTS_KEY = "cabin_slots";
const SELECTED_SLOT_INFO_KEY = "cabin_selected_slot_info";
const SELECTED_CABIN_INDEX_KEY = "selected_cabin_index";

const CheckupCabinContext = createContext();
   
export const CheckupCabinProvider = ({ children }) => {
  // Get fresh user data from localStorage on each render
  const getUserData = () => JSON.parse(localStorage.getItem('user'));
  const user = getUserData();
  
  const [cabinSlots, setCabinSlots] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [cabinId, setCabinId] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedCabinIndex, setSelectedCabinIndex] = useState(() => {
    const savedIndex = localStorage.getItem(SELECTED_CABIN_INDEX_KEY);
    return savedIndex !== null ? parseInt(savedIndex, 10) : 0;
  });

  // Debug log the user data
  useEffect(() => {
    console.log('CheckupCabinContext - user data:', user);
    console.log('CheckupCabinContext - checkupcabindata:', user?.checkupcabindata);
    console.log('CheckupCabinContext - selected index:', selectedCabinIndex);
  }, [user, selectedCabinIndex]);

  // Helper function to get current cabin
  const getCurrentCabin = () => {
    const user = getUserData();
    if (!user?.checkupcabindata || user.checkupcabindata.length === 0) {
      console.log('getCurrentCabin - No cabin data available');
      return null;
    }
    
    // Safety check for index bounds
    const safeIndex = selectedCabinIndex < user.checkupcabindata.length ? 
      selectedCabinIndex : 0;
    
    const cabin = user.checkupcabindata[safeIndex];
    console.log('getCurrentCabin - Selected cabin:', cabin);
    return cabin;
  };

  // Helper functions to get specific cabin properties
  const getCurrentCabinId = () => {
    const cabin = getCurrentCabin();
    return cabin?.id || null;
  };

  const getCurrentDoctor = () => {
    const cabin = getCurrentCabin();
    return cabin?.doctor || "Dr.";
  };

  const getCurrentHospital = () => {
    const cabin = getCurrentCabin();
    return cabin?.hospital || "";
  };

  const getCurrentCabinSlots = () => {
    const cabin = getCurrentCabin();
    return cabin?.cabin_slots || [];
  };

  // Update localStorage when selected cabin changes
  useEffect(() => {
    console.log('selectedCabinIndex changed to:', selectedCabinIndex);
    localStorage.setItem(SELECTED_CABIN_INDEX_KEY, selectedCabinIndex.toString());
    const currentCabin = getCurrentCabin();
    if (currentCabin?.id) {
      console.log('Fetching cabin data for ID:', currentCabin.id);
      fetchCabinData(currentCabin.id);
    } else {
      console.log('No cabin ID found for index:', selectedCabinIndex);
    }
  }, [selectedCabinIndex]);

  // Clear previous cabin data on initial load
  useEffect(() => {
    // Clear any existing cabin data in localStorage
    localStorage.removeItem(CABIN_ID_KEY);
    localStorage.removeItem(SELECTED_SLOT_KEY);
    localStorage.removeItem(CABIN_SLOTS_KEY);
    localStorage.removeItem(SELECTED_SLOT_INFO_KEY);
    
    // Initialize if we have a user
    const initCabinData = async () => {
      const currentCabin = getCurrentCabin();
      if (currentCabin?.id) {
        try {
          await fetchCabinData(currentCabin.id);
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
    if (cabinSlots && getCurrentCabin()?.id) {
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
    const currentCabin = getCurrentCabin();
    if (!currentCabin?.id) return;
    
    const cabinId = currentCabin.id;
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
    const currentCabin = getCurrentCabin();
    if (!currentCabin?.id) {
      return { cabinId: null, selectedSlot: null, cabinSlots: [] };
    }
    
    const cId = currentCabin.id;
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

  // Update value object with all the helper functions
  const value = {
    cabinSlots,
    fetchCabinData,
    getLatestOpenCabinSlot,
    getLatestOpenCabin,
    getOpenSlots,
    getCabinInfo,
    isInitialized,
    cabinId,
    selectedSlot,
    selectedCabinIndex,
    setSelectedCabinIndex,
    getCurrentCabin,
    getUserData,
    getCurrentCabinId,
    getCurrentDoctor,
    getCurrentCabinSlots,
    getCurrentHospital,
    setSelectedSlot
  }
  
  return (
    <CheckupCabinContext.Provider value={value}>
      {children}
    </CheckupCabinContext.Provider>
  );
};

export const useCheckupCabin = () => useContext(CheckupCabinContext);