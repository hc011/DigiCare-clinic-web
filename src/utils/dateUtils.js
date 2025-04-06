import { useCheckupCabin } from '../context/CheckupCabinContext';

// Keys for localStorage
const CABIN_ID_KEY = "cabin_id";
const SELECTED_SLOT_KEY = "cabin_selected_slot";
const CABIN_SLOTS_KEY = "cabin_slots";

/**
 * Get cabin information from localStorage
 * This function can be used anywhere, not just in React components
 * 
 * @param {Object} user - User object (kept for backward compatibility but not used)
 * @returns {Object} - Cabin information (cabinId, selectedSlot, cabinSlots)
 */
export const getCabinInfo = (user) => {
  // Read values from localStorage (set by CheckupCabinContext)
  const cabinId = localStorage.getItem(CABIN_ID_KEY);
  const selectedSlot = localStorage.getItem(SELECTED_SLOT_KEY);
  
  // Parse cabin slots from localStorage (or return empty array if not found)
  let cabinSlots = [];
  try {
    const cabinSlotsString = localStorage.getItem(CABIN_SLOTS_KEY);
    if (cabinSlotsString) {
      cabinSlots = JSON.parse(cabinSlotsString);
    }
  } catch (error) {
    console.error("Error parsing cabin slots from localStorage:", error);
  }

  return { cabinId, selectedSlot, cabinSlots };
};

/**
 * React hook for getting cabin information directly from the context
 * This hook can ONLY be used in React function components
 * 
 * @returns {Object} - Cabin information (cabinId, selectedSlot, cabinSlots)
 */
export const useContextCabinInfo = () => {
  return useCheckupCabin().getCabinInfo();
};