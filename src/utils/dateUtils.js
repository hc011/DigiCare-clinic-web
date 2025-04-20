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
 * @returns {Object} - Cabin information (cabinId, selectedSlot, cabinSlots, isInitialized)
 */
export const useContextCabinInfo = () => {
  const { isInitialized, cabinId, selectedSlot, cabinSlots } = useCheckupCabin();
  return { cabinId, selectedSlot, cabinSlots, isInitialized };
};

export const timeConverter24to12 = (time) => {
  if(!time) return '';
  const [hours, minutes] = time.split(':');
  const period = hours >= 12 ? 'PM' : 'AM';
  const adjustedHours = hours % 12 || 12; // Convert to 12-hour format
  return `${adjustedHours}:${minutes} ${period}`;
}

  // Format the slot date and time for display
  export const formatSlotDateTime = (slotDateTime) => {
    if (!slotDateTime) return 'No slot selected';
    const date = new Date(slotDateTime);    
    const weekday = date.toLocaleString('en-US', { weekday: 'short' });
    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'long' });
    const year = date.getFullYear();
    const time = date.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    // Format as "day, date month, year time"
    return `${weekday}, ${day} ${month}, ${year}`;
  };