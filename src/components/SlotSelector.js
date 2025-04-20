// import React from 'react';
// import { FormControl, Select, MenuItem, InputLabel } from '@mui/material';
// import { format } from 'date-fns';

// export const SlotSelector = ({ slots, currentSlot, onSlotChange }) => {
//   if (!slots || slots.length === 0) return null;

//   return (
//     <FormControl size="small" sx={{ minWidth: 200 }}>
//       <InputLabel>Current Session</InputLabel>
//       <Select
//         value={currentSlot || ''}
//         onChange={(e) => onSlotChange(e.target.value)}
//         label="Current Session"
//       >
//         {slots.map((slot) => (
//           <MenuItem key={slot} value={slot}>
//             {format(new Date(slot), 'PPP p')}
//           </MenuItem>
//         ))}
//       </Select>
//     </FormControl>
//   );
// }; 

import React, { useEffect, useState } from 'react';
import { useCheckupCabin } from '../context/CheckupCabinContext';
import { Select, MenuItem, FormControl, Box, Typography, useMediaQuery, useTheme } from '@mui/material';
import { timeConverter24to12 } from '../utils/dateUtils'; 
import { fetchCabinSlots } from '../services/api';
import { formatSlotDateTime } from '../utils/dateUtils';

const SlotSelector = () => {
  const { selectedCabinIndex, setSelectedCabinIndex, setSelectedSlot, selectedSlot, cabinId, cabinSlots } = useCheckupCabin();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const user = JSON.parse(localStorage.getItem('user'));
  const [openSlots, setOpenSlots] = useState([]);

  // Format the slot date for display using the date field when available
  const formatSlotDateFromAPI = (slot) => {
    if (!slot) return '';
    
    // Use date field if available, otherwise fall back to slot timestamp
    const dateToUse = slot.date || slot.slot.split('T')[0];
    
    try {
      const date = new Date(dateToUse);
      return date.toLocaleDateString('en-US', { 
        weekday: 'short',
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };

  // Sort slots by date and time
  const sortSlots = (slots) => {
    return [...slots].sort((a, b) => {
      // First sort by date if available
      if (a.date && b.date) {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        if (dateA.getTime() !== dateB.getTime()) {
          return dateA - dateB;
        }
      } else {
        // Fall back to slot field if date isn't available
        const dateA = new Date(a.slot);
        const dateB = new Date(b.slot);
        if (dateA.getTime() !== dateB.getTime()) {
          return dateA - dateB;
        }
      }
      
      // Then sort by time
      const timeA = a.start_time || '';
      const timeB = b.start_time || '';
      return timeA.localeCompare(timeB);
    });
  };

  useEffect(() => {
    const fetchSlots = async () => {
          try {
            const slots = await fetchCabinSlots(cabinId);
            const open = slots.filter(slot => slot.status === "open");
            setOpenSlots(sortSlots(open));
          } catch (error) {
            console.error("Error fetching slots:", error);
          }
        };
    if(cabinId !== null){
      fetchSlots();
    }
  }, [cabinId, cabinSlots]);

  useEffect(() => {
    if (!selectedSlot || openSlots.length === 0) return;
    
    // Always update the selected slot in localStorage
    localStorage.setItem('cabin_selected_slot', selectedSlot);
    
    // Find the slot info and update it in localStorage
    const slotInfo = openSlots.find(slot => slot.slot === selectedSlot);
    if (slotInfo) {
      localStorage.setItem('cabin_selected_slot_info', JSON.stringify(slotInfo));
    }
  }, [selectedSlot, openSlots]);
  
  // Additional function to handle slot selection with immediate localStorage update
  const handleSlotChange = (value) => {
    setSelectedSlot(value);
    
    // Immediately update localStorage (don't wait for useEffect)
    localStorage.setItem('cabin_selected_slot', value);
    
    const slotInfo = openSlots.find(slot => slot.slot === value);
    if (slotInfo) {
      localStorage.setItem('cabin_selected_slot_info', JSON.stringify(slotInfo));
    }
  };

  if (!user || !user.checkupcabindata || openSlots.length <= 0) {
    return null;
  }

  // Mobile View
  if (isMobile) {
    return (
      <FormControl fullWidth variant="outlined" size="medium">
        <Select
          value={selectedSlot}
          onChange={(e) => handleSlotChange(e.target.value)}
          displayEmpty
          sx={{
            borderRadius: '8px',
            backgroundColor: '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            '& .MuiSelect-select': {
              py: 1.5,
              px: 2,
              display: 'flex',
              alignItems: 'center',
              fontSize: '1rem',
              fontWeight: 500
            }
          }}
          MenuProps={{
            PaperProps: {
              sx: {
                maxHeight: '40vh',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                borderRadius: '8px',
                mt: 1
              }
            }
          }}
        >
          {openSlots.map((slot, index) => (
            <MenuItem 
              key={slot.slot} 
              value={slot.slot}
              sx={{
                py: 1.5,
                px: 2,
                '&.Mui-selected': {
                  backgroundColor: 'rgba(25, 118, 210, 0.08)',
                  fontWeight: 500
                },
                '&:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.04)'
                }
              }}
            >
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {timeConverter24to12(slot.start_time)} - {timeConverter24to12(slot.end_time)}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                  {slot.date ? formatSlotDateFromAPI(slot) : formatSlotDateTime(slot.slot)}
                </Typography>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  }

  // Desktop View (Improved)
  return (
    <FormControl size="small" sx={{ minWidth: 160 }}>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        width: '100%'
      }}>
        <Typography variant="caption" sx={{ 
          mb: 0.5, 
          fontWeight: 600,
          color: 'text.secondary',
          fontSize: '0.7rem'
        }}>
          TIME SLOT
        </Typography>
        <Select
          value={selectedSlot}
          onChange={(e) => handleSlotChange(e.target.value)}
          sx={{ 
            fontSize: '0.875rem',
            backgroundColor: '#fff',
            borderRadius: '4px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            '& .MuiSelect-select': { 
              py: 1,
              fontWeight: 500
            },
            '&:hover': {
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }
          }}
          MenuProps={{
            PaperProps: {
              sx: {
                maxHeight: '300px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                borderRadius: '4px'
              }
            }
          }}
        >
          {openSlots.map((slot, index) => (
            <MenuItem 
              key={slot.slot} 
              value={slot.slot}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: 'rgba(25, 118, 210, 0.08)',
                  fontWeight: 500
                },
                '&:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.04)'
                }
              }}
            >
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {timeConverter24to12(slot.start_time)} - {timeConverter24to12(slot.end_time)}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.7rem' }}>
                  {slot.date ? formatSlotDateFromAPI(slot) : formatSlotDateTime(slot.slot)}
                </Typography>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </Box>
    </FormControl>
  );
};

export default SlotSelector;