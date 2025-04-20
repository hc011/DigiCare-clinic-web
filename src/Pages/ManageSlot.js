import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Switch,
  FormControlLabel,
  Paper,
  Grid,
  useMediaQuery,
  useTheme,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
  Alert,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Divider,
  Checkbox
} from '@mui/material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import './ManageSlot.css';
import { formatSlotDateTime, timeConverter24to12 } from '../utils/dateUtils';
import { fetchCabinSlots, updateSlot } from '../services/api';
import { useCheckupCabin } from '../context/CheckupCabinContext';

const ManageSlot = () => {
  const { cabinId, selectedSlot: globalSelectedSlot, getCurrentCabinId, fetchCabinData } = useCheckupCabin();
  const [localSelectedSlot, setLocalSelectedSlot] = useState('');
  const [slotActive, setSlotActive] = useState(false);
  const [autoAdjust, setAutoAdjust] = useState(false);
  const [registrations, setRegistrations] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [startTimeDate, setStartTimeDate] = useState(null);
  const [endTimeDate, setEndTimeDate] = useState(null);
  const [slotDate, setSlotDate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [allSlots, setAllSlots] = useState([]);
  const [openSlots, setOpenSlots] = useState([]);
  const [currentSlotInfo, setCurrentSlotInfo] = useState(null);
  const [registrationsTime, setRegistrationsTime] = useState('');
  const [registrationsTimeDate, setRegistrationsTimeDate] = useState(null);
  const [registrationsDate, setRegistrationsDate] = useState(null);
  const [autoRegister, setAutoRegister] = useState(false);
  const [originalSlotValues, setOriginalSlotValues] = useState({});
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    if (globalSelectedSlot) {
      setLocalSelectedSlot(globalSelectedSlot);
    }
  }, [globalSelectedSlot]);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const formatSlotDateFromAPI = (slot) => {
    if (!slot) return '';
    
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

  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    action: null,
    confirmText: 'Confirm',
    cancelText: 'Cancel'
  });

  const callSlotApi = async (payload) => {
    setLoading(true);
    try {
      const response = await updateSlot(payload);
      setSnackbar({
        open: true,
        message: 'Slot updated successfully',
        severity: 'success'
      });
      fetchSlotData();
      return response;
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to update slot: ' + error.message,
        severity: 'error'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleSlotActiveChange = (event) => {
    const newValue = event.target.checked;
    setConfirmDialog({
      open: true,
      title: newValue ? 'Activate Slot?' : 'Deactivate Slot?',
      message: newValue 
        ? 'Are you sure you want to activate this slot?' 
        : 'Are you sure you want to deactivate this slot?',
      action: async () => {
        try {
          await callSlotApi({
            cabinId: cabinId,
            slot: localSelectedSlot,
            is_active: newValue
          });
          setSlotActive(newValue);
          // Update original values
          setOriginalSlotValues(prev => ({
            ...prev,
            is_active: newValue
          }));
        } catch (error) {
          console.error('Error updating slot active status:', error);
        }
      },
      confirmText: 'Yes',
      cancelText: 'No'
    });
  };

  const handleAutoAdjustChange = (event) => {
    const newValue = event.target.checked;
    setConfirmDialog({
      open: true,
      title: newValue ? 'Enable Auto Adjust?' : 'Disable Auto Adjust?',
      message: newValue 
        ? 'Are you sure you want to enable auto adjustment? The system will automatically adjust the queue.' 
        : 'Are you sure you want to disable auto adjustment? You will need to manage the queue manually.',
      action: async () => {
        try {
          await callSlotApi({
            cabinId: cabinId,
            slot: localSelectedSlot,
            auto_adjust: newValue
          });
          setAutoAdjust(newValue);
          // Update original values
          setOriginalSlotValues(prev => ({
            ...prev,
            auto_adjust: newValue
          }));
        } catch (error) {
          console.error('Error updating auto adjust status:', error);
        }
      },
      confirmText: 'Yes',
      cancelText: 'No'
    });
  };

  const handleRegistrationsChange = (event) => {
    const newValue = event.target.checked;
    setConfirmDialog({
      open: true,
      title: newValue ? 'Enable Online Appointments?' : 'Disable Online Appointments?',
      message: newValue 
        ? 'Are you sure you want to enable online appointments for this slot?' 
        : 'Are you sure you want to disable online appointments for this slot?',
      action: async () => {
        try {
          await callSlotApi({
            cabinId: cabinId,
            slot: localSelectedSlot,
            registrations: newValue
          });
          setRegistrations(newValue);
          // Update original values
          setOriginalSlotValues(prev => ({
            ...prev,
            registrations: newValue
          }));
        } catch (error) {
          console.error('Error updating online appointments status:', error);
        }
      },
      confirmText: 'Yes',
      cancelText: 'No'
    });
  };

  const handleAutoRegisterChange = (event) => {
    const newValue = event.target.checked;
    setConfirmDialog({
      open: true,
      title: newValue ? 'Enable Auto Online Appointments?' : 'Disable Auto Online Appointments?',
      message: newValue 
        ? 'Are you sure you want to enable auto online appointments? This will automatically enable online appointments.' 
        : 'Are you sure you want to disable auto online appointments?',
      action: async () => {
        try {
          // If auto register is being turned on, we also need to enable registrations
          const payload = {
            cabinId: cabinId,
            slot: localSelectedSlot,
            auto_register: newValue
          };
          
          if (newValue) {
            payload.registrations = true;
          }
          
          await callSlotApi(payload);
          setAutoRegister(newValue);
          
          // Update the registrations state if auto-register is enabled
          if (newValue) {
            setRegistrations(true);
          }
          
          // Update original values
          setOriginalSlotValues(prev => ({
            ...prev,
            auto_register: newValue,
            ...(newValue ? { registrations: true } : {})
          }));
        } catch (error) {
          console.error('Error updating auto register status:', error);
        }
      },
      confirmText: 'Yes',
      cancelText: 'No'
    });
  };

  const handleEndSlot = () => {
    setConfirmDialog({
      open: true,
      title: 'End Slot?',
      message: 'Are you sure you want to end this slot? This action cannot be undone and will finalize all appointments in this time slot.',
      action: async () => {
        try {
          await callSlotApi({
            cabinId: cabinId,
            slot: localSelectedSlot,
            status: 'ended'
          });
          fetchSlotData();
        } catch (error) {
          console.error('Error ending slot:', error);
        }
      },
      confirmText: 'End Slot',
      cancelText: 'Cancel'
    });
  };

  const handleConfirmDialogClose = () => {
    setConfirmDialog({
      ...confirmDialog,
      open: false
    });
  };

  const handleConfirmAction = () => {
    if (confirmDialog.action) {
      confirmDialog.action();
    }
    handleConfirmDialogClose();
  };

  const handleSnackbarClose = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };

  const handleSlotChange = (event) => {
    const newSlot = event.target.value;
    setLocalSelectedSlot(newSlot);
  };

  const timeStringToDate = (timeString) => {
    if (!timeString) return null;
    
    const today = new Date();
    const [hours, minutes] = timeString.split(':');
    
    const date = new Date();
    date.setHours(parseInt(hours, 10));
    date.setMinutes(parseInt(minutes, 10));
    date.setSeconds(0);
    
    return date;
  };
  
  const dateToTimeString = (date) => {
    if (!date) return '';
    
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${hours}:${minutes}`;
  };

  const handleTimeChange = (type) => {
    return (newTime) => {
      if (type === 'start') {
        setStartTimeDate(newTime);
        if (newTime) {
          setStartTime(dateToTimeString(newTime));
        }
      } else if (type === 'end') {
        setEndTimeDate(newTime);
        if (newTime) {
          setEndTime(dateToTimeString(newTime));
        }
      } else if (type === 'registrations') {
        setRegistrationsTimeDate(newTime);
        if (newTime) {
          setRegistrationsTime(dateToTimeString(newTime));
        }
      }
    };
  };

  const dateStringToDate = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString);
  };
  
  const dateToDateString = (date) => {
    if (!date) return '';
    
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  };

  const handleDateChange = (type) => (newDate) => {
    if (type === 'slot') {
      setSlotDate(newDate);
    } else if (type === 'registrations') {
      setRegistrationsDate(newDate);
    }
  };

  const handleSaveTimeChanges = () => {
    if (!startTime || !endTime) {
      setSnackbar({
        open: true,
        message: 'Please enter both start and end times',
        severity: 'error'
      });
      return;
    }

    const formattedSlotDate = slotDate ? dateToDateString(slotDate) : '';
    const formattedRegistrationsDate = registrationsDate ? dateToDateString(registrationsDate) : '';
    
    // Calculate registrations_day based on the difference between slot date and registrations date
    let registrationsDay = 0;
    if (slotDate && registrationsDate) {
      // Clone dates to avoid modifying the original objects
      const slotDateClone = new Date(slotDate.getTime());
      const registrationsDateClone = new Date(registrationsDate.getTime());
      
      // Reset time components for accurate day calculation
      slotDateClone.setHours(0, 0, 0, 0);
      registrationsDateClone.setHours(0, 0, 0, 0);
      
      // Calculate difference in days
      const timeDiff = slotDateClone.getTime() - registrationsDateClone.getTime();
      registrationsDay = Math.round(timeDiff / (1000 * 3600 * 24));
    }

    // Create a payload with only changed fields
    const payload = {
      cabinId: cabinId,
      slot: localSelectedSlot,
    };

    // Only add fields that have changed
    if (startTime !== originalSlotValues.start_time) {
      payload.start_time = startTime ? `${startTime}:00` : '';
    }
    
    if (endTime !== originalSlotValues.end_time) {
      payload.end_time = endTime ? `${endTime}:00` : '';
    }
    
    if (formattedSlotDate !== originalSlotValues.date) {
      payload.date = formattedSlotDate;
    }
    
    // if (registrationsTime !== originalSlotValues.registrations_time) {
    //   payload.registrations_time = registrationsTime;
    // }
    
    // if (formattedRegistrationsDate !== originalSlotValues.registrations_date) {
    //   payload.registrations_date = formattedRegistrationsDate;
    // }
    
    // if (registrationsDay !== originalSlotValues.registrations_day) {
    //   payload.registrations_day = registrationsDay;
    // }
    
    if (autoRegister !== originalSlotValues.auto_register) {
      payload.auto_register = autoRegister;
    }

    setConfirmDialog({
      open: true,
      title: 'Update Slot Settings?',
      message: `Are you sure you want to update this slot with the new time and date settings?`,
      action: async () => {
        try {
          await callSlotApi(payload);
        } catch (error) {
          console.error('Error updating slot settings:', error);
        }
      },
      confirmText: 'Update',
      cancelText: 'Cancel'
    });
  };

  const fetchSlotData = async () => {
    if (!cabinId) return;
    
    setLoading(true);
    try {
      const slots = await fetchCabinData(cabinId);      
      setAllSlots(slots);
      
      const available = slots.filter(slot => slot.status === 'open');
      setOpenSlots(available);
      
      const currentSlot = slots.find(slot => slot.slot === localSelectedSlot);
      if (currentSlot) {
        setCurrentSlotInfo(currentSlot);
        setSlotActive(currentSlot.is_active || false);
        setAutoAdjust(currentSlot.auto_adjust || false);
        setRegistrations(currentSlot.registrations || false);
        setAutoRegister(currentSlot.auto_register || false);
        
        setStartTime(currentSlot.start_time || '');
        setEndTime(currentSlot.end_time || '');
        setStartTimeDate(timeStringToDate(currentSlot.start_time || ''));
        setEndTimeDate(timeStringToDate(currentSlot.end_time || ''));
        
        setRegistrationsTime(currentSlot.registrations_time || '');
        setRegistrationsTimeDate(timeStringToDate(currentSlot.registrations_time || ''));
        
        // Get the slot date value
        const dateValue = currentSlot.date ? dateStringToDate(currentSlot.date) : dateStringToDate(currentSlot.slot.split('T')[0]);
        setSlotDate(dateValue);
        
        // Handle registrations date
        if (currentSlot.registrations_date) {
          // If registrations_date exists, use it directly
          setRegistrationsDate(dateStringToDate(currentSlot.registrations_date));
        } else if (dateValue) {
          // If no registrations_date but we have a registrations_day and slot date
          const calculatedDate = new Date(dateValue.getTime());
          // Subtract the registrations_day (if it exists) or default to 0 (same day)
          calculatedDate.setDate(calculatedDate.getDate() - (currentSlot.registrations_day || 0));
          setRegistrationsDate(calculatedDate);
        } else {
          setRegistrationsDate(null);
        }

        // Store original values for change comparison
        setOriginalSlotValues({
          start_time: currentSlot.start_time || '',
          end_time: currentSlot.end_time || '',
          date: currentSlot.date || '',
          registrations_time: currentSlot.registrations_time || '',
          registrations_date: currentSlot.registrations_date || '',
          registrations_day: currentSlot.registrations_day || 0,
          auto_register: currentSlot.auto_register || false,
          is_active: currentSlot.is_active || false,
          auto_adjust: currentSlot.auto_adjust || false,
          registrations: currentSlot.registrations || false
        });
      }
    } catch (error) {
      console.error('Error fetching cabin slots:', error);
      setSnackbar({
        open: true,
        message: 'Failed to fetch cabin slots: ' + error.message,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlotData();
  }, [cabinId, localSelectedSlot]);

  const isToday = (slot) => {
    if (!slot) return false;
    
    const today = new Date();
    const dateString = slot.date || slot.slot.split('T')[0];
    const slotDate = new Date(dateString);
    
    return (
      slotDate.getDate() === today.getDate() &&
      slotDate.getMonth() === today.getMonth() &&
      slotDate.getFullYear() === today.getFullYear()
    );
  };
  
  const groupedSlots = () => {
    if (!openSlots.length) return { today: [], future: [] };
    
    const today = [];
    const future = [];
    
    openSlots.forEach(slot => {
      if (isToday(slot)) {
        today.push(slot);
      } else {
        future.push(slot);
      }
    });
    
    const sortByTime = (a, b) => {
      if (a.date && b.date) {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        if (dateA.getTime() !== dateB.getTime()) {
          return dateA - dateB;
        }
      }
      
      const timeA = a.start_time || '';
      const timeB = b.start_time || '';
      return timeA.localeCompare(timeB);
    };
    
    return {
      today: today.sort(sortByTime),
      future: future.sort(sortByTime)
    };
  };

  // Function to check if a date is before or equal to another date
  const isBeforeOrEqual = (date1, date2) => {
    if (!date1 || !date2) return true;
    
    // Clone and reset time to compare only dates
    const d1 = new Date(date1.getTime());
    const d2 = new Date(date2.getTime());
    
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);
    
    return d1 <= d2;
  };
  
  // Function to check if a time is before or equal to another time
  const isTimeBeforeOrEqual = (time1, time2) => {
    if (!time1 || !time2) return true;
    
    const t1 = new Date();
    const t2 = new Date();
    
    const [h1, m1] = time1.split(':').map(Number);
    const [h2, m2] = time2.split(':').map(Number);
    
    t1.setHours(h1, m1, 0, 0);
    t2.setHours(h2, m2, 0, 0);
    
    return t1 <= t2;
  };

  return (
    <Box
      className="manage-slot-container"
      sx={{
        padding: isMobile ? '16px' : '24px',
        maxWidth: '900px',
        margin: '0 auto'
      }}
    >
      <Paper
        elevation={2}
        sx={{
          padding: isMobile ? '16px' : '32px',
          borderRadius: '12px',
          background: '#fff',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
        }}
      >
        <Box sx={{ mb: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, color: 'primary.main' }}>
            Manage Slot Settings
          </Typography>
        </Box>
        
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper
              elevation={1}
              sx={{
                padding: '24px 24px 16px',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                backgroundColor: 'rgba(25, 118, 210, 0.03)',
                borderLeft: '4px solid',
                borderColor: 'primary.main',
                mb: 1
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 500 }}>
                Select Slot
              </Typography>
              
              <FormControl fullWidth sx={{ mt: 1 }}>
                <InputLabel id="slot-select-label">Available Slots</InputLabel>
                <Select
                  labelId="slot-select-label"
                  id="slot-select"
                  value={localSelectedSlot || ''}
                  label="Available Slots"
                  onChange={handleSlotChange}
                  disabled={loading}
                  sx={{
                    '& .MuiSelect-select': { 
                      padding: '12px 14px',
                    }
                  }}
                >
                  {groupedSlots().today.length > 0 && (
                    <MenuItem disabled sx={{ 
                      opacity: 1, 
                      fontWeight: 'bold', 
                      color: 'primary.dark', 
                      pointerEvents: 'none',
                      backgroundColor: 'rgba(25, 118, 210, 0.05)',
                      py: 1
                    }}>
                      Today's Slots
                    </MenuItem>
                  )}
                  
                  {groupedSlots().today.map((slot) => (
                    <MenuItem 
                      key={slot.id} 
                      value={slot.slot}
                      sx={{
                        ...(slot.slot === localSelectedSlot && {
                          backgroundColor: 'rgba(25, 118, 210, 0.08)',
                          fontWeight: 'bold',
                          borderLeft: '4px solid',
                          borderColor: 'primary.main',
                          paddingLeft: '10px'
                        })
                      }}
                    >
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: slot.slot === localSelectedSlot ? 600 : 500 }}>
                          {timeConverter24to12(slot.start_time)} - {timeConverter24to12(slot.end_time)}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                          {slot.date ? formatSlotDateFromAPI(slot) : formatSlotDateTime(slot.slot)}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                  
                  {groupedSlots().future.length > 0 && (
                    <MenuItem disabled sx={{ 
                      opacity: 1, 
                      fontWeight: 'bold', 
                      color: 'primary.dark', 
                      pointerEvents: 'none', 
                      mt: 1,
                      backgroundColor: 'rgba(25, 118, 210, 0.05)',
                      py: 1
                    }}>
                      Other Slots
                    </MenuItem>
                  )}
                  
                  {groupedSlots().future.map((slot) => (
                    <MenuItem 
                      key={slot.id} 
                      value={slot.slot}
                      sx={{
                        ...(slot.slot === localSelectedSlot && {
                          backgroundColor: 'rgba(25, 118, 210, 0.08)',
                          fontWeight: 'bold',
                          borderLeft: '4px solid',
                          borderColor: 'primary.main',
                          paddingLeft: '10px'
                        })
                      }}
                    >
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: slot.slot === localSelectedSlot ? 600 : 500 }}>
                          {timeConverter24to12(slot.start_time)} - {timeConverter24to12(slot.end_time)}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                          {slot.date ? formatSlotDateFromAPI(slot) : formatSlotDateTime(slot.slot)}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                  
                  {openSlots.length === 0 && (
                    <MenuItem disabled>No open slots available</MenuItem>
                  )}
                </Select>
              </FormControl>
              
              {!currentSlotInfo && !loading && (
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                  Please select a slot to manage
                </Typography>
              )}
              {loading && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                  <CircularProgress size={16} />
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Loading slot information...
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>
          
          <Grid item xs={12}>
            <Paper
              elevation={1}
              sx={{
                padding: '24px 24px 16px',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                backgroundColor: currentSlotInfo ? 'rgba(46, 125, 50, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                borderLeft: '4px solid',
                borderColor: currentSlotInfo ? 'success.main' : 'divider',
                opacity: currentSlotInfo ? 1 : 0.7,
                mb: 1
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 500 }}>
                Slot Status
              </Typography>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={slotActive}
                    onChange={handleSlotActiveChange}
                    disabled={loading || !currentSlotInfo || currentSlotInfo.status !== 'open'}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1">Slot Active</Typography>
                    <Typography variant="caption" color="text.secondary">
                      When active, patients will be checked in for this slot
                    </Typography>
                  </Box>
                }
                sx={{ my: 0.5 }}
              />
              
              {/* <FormControlLabel
                control={
                  <Switch
                    checked={autoAdjust}
                    onChange={handleAutoAdjustChange}
                    disabled={loading || !currentSlotInfo || currentSlotInfo.status !== 'open'}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1">Auto Adjust Queue</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Automatically adjust queue numbers when patients are marked as done
                    </Typography>
                  </Box>
                }
                sx={{ my: 0.5 }}
              /> */}
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper
              elevation={1}
              sx={{
                padding: '24px 24px 16px',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                backgroundColor: currentSlotInfo ? 'rgba(233, 150, 122, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                borderLeft: '4px solid',
                borderColor: currentSlotInfo ? 'warning.main' : 'divider',
                opacity: currentSlotInfo ? 1 : 0.7,
                mb: 1
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 500 }}>
                Time & Booking Settings
              </Typography>
              
              <Typography variant="subtitle2" sx={{ mt: 1, fontWeight: 500, color: 'text.primary' }}>
                Slot Settings
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      label="Slot Date"
                      value={slotDate}
                      onChange={handleDateChange('slot')}
                      disabled={loading || !currentSlotInfo || currentSlotInfo.status !== 'open'}
                      renderInput={(params) => <TextField {...params} fullWidth />}
                      format="MM/dd/yyyy"
                    />
                  </LocalizationProvider>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <TimePicker
                      label="Start Time"
                      value={startTimeDate}
                      onChange={handleTimeChange('start')}
                      disabled={loading || !currentSlotInfo || currentSlotInfo.status !== 'open'}
                      ampm={true}
                      renderInput={(params) => <TextField {...params} fullWidth />}
                      minutesStep={5}
                    />
                  </LocalizationProvider>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <TimePicker
                      label="End Time"
                      value={endTimeDate}
                      onChange={handleTimeChange('end')}
                      disabled={loading || !currentSlotInfo || currentSlotInfo.status !== 'open'}
                      ampm={true}
                      renderInput={(params) => <TextField {...params} fullWidth />}
                      minutesStep={5}
                    />
                  </LocalizationProvider>
                </Grid>
              </Grid>
              
              <Divider sx={{ my: 1 }} />
              
              <Typography variant="subtitle2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                Online Booking Settings
              </Typography>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={registrations}
                    onChange={handleRegistrationsChange}
                    disabled={loading || !currentSlotInfo || currentSlotInfo.status !== 'open' || autoRegister}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1">Online Appointments</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Allow patients to book appointments online
                    </Typography>
                  </Box>
                }
                sx={{ my: 0.5 }}
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={autoRegister}
                    onChange={handleAutoRegisterChange}
                    disabled={loading || !currentSlotInfo || currentSlotInfo.status !== 'open'}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1">Auto Online Appointments</Typography>
                    <Typography variant="caption" color="text.secondary">
                      When enabled, online appointments will be processed automatically
                    </Typography>
                  </Box>
                }
                sx={{ my: 0.5 }}
              />
              
              <Grid container spacing={2}>
                {/* Commented out Online Booking Starts On (Date) field
                <Grid item xs={12} sm={6}>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      label="Online Booking Starts On (Date)"
                      value={registrationsDate}
                      onChange={handleDateChange('registrations')}
                      disabled={loading || !currentSlotInfo || currentSlotInfo.status !== 'open' || (!autoRegister && !registrations)}
                      renderInput={(params) => <TextField {...params} fullWidth />}
                      format="MM/dd/yyyy"
                      maxDate={slotDate}
                    />
                  </LocalizationProvider>
                </Grid>
                */}
                {/* Commented out Online Booking Starts At (Time) field
                <Grid item xs={12} sm={6}>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <TimePicker
                      label="Online Booking Starts At (Time)"
                      value={registrationsTimeDate}
                      onChange={handleTimeChange('registrations')}
                      disabled={loading || !currentSlotInfo || currentSlotInfo.status !== 'open' || (!autoRegister && !registrations)}
                      ampm={true}
                      renderInput={(params) => <TextField {...params} fullWidth />}
                      minutesStep={5}
                      maxTime={
                        registrationsDate && slotDate && 
                        isBeforeOrEqual(registrationsDate, slotDate) && 
                        dateToDateString(registrationsDate) === dateToDateString(slotDate) 
                          ? endTimeDate 
                          : null
                      }
                    />
                  </LocalizationProvider>
                </Grid>
                */}
                <Grid item xs={12}>
                  {slotDate && registrationsDate && (autoRegister || registrations) && (
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                      {isBeforeOrEqual(registrationsDate, slotDate) ? (
                        <>
                          Online booking will start {
                            dateToDateString(registrationsDate) === dateToDateString(slotDate) 
                              ? 'on the same day as the slot' 
                              : `${Math.round((slotDate - registrationsDate) / (1000 * 60 * 60 * 24))} day(s) before the slot`
                          }
                        </>
                      ) : (
                        <span style={{ color: 'red' }}>
                          The registration date cannot be after the slot date
                        </span>
                      )}
                    </Typography>
                  )}
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSaveTimeChanges}
                    disabled={
                      loading || 
                      !currentSlotInfo || 
                      currentSlotInfo.status !== 'open' || 
                      (registrationsDate && slotDate && !isBeforeOrEqual(registrationsDate, slotDate))
                    }
                    sx={{ 
                      width: 'fit-content',
                      boxShadow: '0 2px 8px rgba(25, 118, 210, 0.25)',
                      '&:hover': {
                        boxShadow: '0 4px 12px rgba(25, 118, 210, 0.35)',
                      }
                    }}
                  >
                    Save Changes
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
          
          {currentSlotInfo && currentSlotInfo.status === 'open' && (
            <Grid item xs={12}>
              <Box sx={{ 
                display: 'flex',
                justifyContent: 'center',
                mt: 2,
                mb: 3
              }}>
                <Button
                  variant="contained"
                  color="error"
                  onClick={handleEndSlot}
                  disabled={loading}
                  size="large"
                  sx={{ 
                    px: 4,
                    py: 1.5,
                    boxShadow: '0 4px 12px rgba(211, 47, 47, 0.25)',
                    '&:hover': {
                      boxShadow: '0 6px 16px rgba(211, 47, 47, 0.35)',
                    }
                  }}
                >
                  End Slot
                </Button>
              </Box>
            </Grid>
          )}
        </Grid>
      </Paper>

      <Box sx={{ height: isMobile ? '24px' : '8px' }} />

      <Dialog
        open={confirmDialog.open}
        onClose={handleConfirmDialogClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {confirmDialog.title}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {confirmDialog.message}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleConfirmDialogClose} color="primary">
            {confirmDialog.cancelText}
          </Button>
          <Button 
            onClick={handleConfirmAction} 
            color="primary" 
            variant="contained" 
            autoFocus
            sx={{ textTransform: 'none' }}
          >
            {confirmDialog.confirmText}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        ClickAwayListenerProps={{ onClickAway: handleSnackbarClose }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={snackbar.severity} 
          sx={{ 
            width: '100%',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)' 
          }}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ManageSlot; 