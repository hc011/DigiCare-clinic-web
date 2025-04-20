import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  ToggleButtonGroup,
  ToggleButton,
  Box,
  Autocomplete,
  Paper,
  IconButton,
} from "@mui/material";
import { addAppointment, fetchAppointments, getPatientProfile, getMaxTokenNumber } from "../services/api";
import { getCabinInfo } from "../utils/dateUtils";
import "./AddAppointmentMobile.css";
import { useNotification } from "../context/NotificationContext";
import CloseIcon from '@mui/icons-material/Close';
import { useCheckupCabin } from '../context/CheckupCabinContext';
import { fetchCabinSlots } from "../services/api";
import { timeConverter24to12 } from '../utils/dateUtils';

export default function AddAppointmentMobile({ patients }) {
  const user = JSON.parse(localStorage.getItem("user"));
  const { cabinId, selectedSlot } = getCabinInfo(user);

  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [suggestedToken, setSuggestedToken] = useState(1);
  const { showSuccessSnackbar, showErrorSnackbar, showWarningSnackbar } = useNotification();
  const [mobileSearchResults, setMobileSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Add new state for mobile validation
  const [mobileFieldTouched, setMobileFieldTouched] = useState(false);
  const [validationErrors, setValidationErrors] = useState({
    mobileNumber: false,
    payment: false
  });

  const { getLatestOpenCabin } = useCheckupCabin();
  const [localCabinId, setLocalCabinId] = useState(cabinId || null);
  const [localSelectedSlot, setLocalSelectedSlot] = useState(selectedSlot || null);
  const [localOpenSlots, setLocalOpenSlots] = useState([]);
  const cabins = user?.checkupcabindata || [];

  const [formData, setFormData] = useState({
    token: "",
    firstName: "",
    lastName: "",
    age: "",
    phone_number: "",
    location: "",
    sex: "",
    disease: "",
    guardian: "",
    appointment_type: "New",
    checkin: false,
    paid: false,
    status: "pending",
    mode: "",
    fees_paid: 0,
  });

  useEffect(() => {
    if(cabinId !== localCabinId) {
      setLocalCabinId(cabinId);
    }
    if(selectedSlot !== localSelectedSlot) {
      setLocalSelectedSlot(selectedSlot);
    }
  }, [cabinId, selectedSlot]);
  
  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const slots = await fetchCabinSlots(localCabinId);
        const openSlots = slots.filter(slot => slot.status === "open");
        const latestOpenSlot = getLatestOpenCabin(openSlots).slot;
        setLocalSelectedSlot(latestOpenSlot);
        setLocalOpenSlots(openSlots);
      } catch (error) {
        console.error("Error fetching slots:", error);
      }
    };
  
    if (localCabinId) {
      fetchSlots();
    }
  }, [localCabinId]);

  useEffect(() => {
      const fetchMaxToken = async () => {
        try {
          const maxToken = await getMaxTokenNumber(localCabinId, localSelectedSlot);          
          const nextToken = maxToken + 1;
      
          setSuggestedToken(nextToken);
          setFormData((prev) => ({ ...prev, token: nextToken }));
          
        } catch (error) {
          console.error("Error getting max token:", error);
          setError("Failed to initialize form. Please try again.");
        }
      };
  
      // Check if selectedSlot changed
      if (localCabinId && localSelectedSlot) {
        console.log(localSelectedSlot)
        fetchMaxToken();
      }
  
    }, [localSelectedSlot]);  

  // Format the slot date for display using the date field when available
  const formatSlotDateFromAPI = (slotObj) => {
    if (!slotObj) return 'No slot selected';
    
    // Use date field if available, otherwise fall back to slot timestamp
    const dateToUse = slotObj.date || slotObj.slot.split('T')[0];
    
    try {
      const date = new Date(dateToUse);
      const weekday = date.toLocaleString('en-US', { weekday: 'short' });
      const day = date.getDate();
      const month = date.toLocaleString('en-US', { month: 'long' });
      const year = date.getFullYear();
      
      return `${weekday}, ${day} ${month}, ${year}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  const formatSlotDateTime = (slotDateTime) => {
    if (!slotDateTime) return 'No slot selected';
    
    const date = new Date(slotDateTime);
    
    const weekday = date.toLocaleString('en-US', { weekday: 'short' });
    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'long' });
    const year = date.getFullYear();
    
    return `${weekday}, ${day} ${month}, ${year}`;
  };

  const fetchSuggestedToken = async () => {
    if (!localCabinId || !localSelectedSlot) {
      console.error("Cannot fetch token: missing cabinId or selectedSlot");
      return;
    }
    
    try {
      setLoading(true);
      const maxToken = await getMaxTokenNumber(localCabinId, localSelectedSlot);
      const nextToken = maxToken + 1;
      console.log("Fetched maximum token from API:", maxToken, "Next token:", nextToken);
      setSuggestedToken(nextToken);
      setFormData((prev) => ({ ...prev, token: nextToken }));
    } catch (error) {
      console.error("Error fetching max token:", error);
      // Fallback to calculating from patients if API fails
      try {
        let maxToken = 0;
        maxToken = patients.length > 0
          ? Math.max(...patients.map((p) => parseInt(p.appointment.token) || 0))
          : 0;
        setSuggestedToken(maxToken + 1);
        setFormData((prev) => ({ ...prev, token: maxToken + 1 }));
      } catch (fallbackError) {
        console.error("Fallback token calculation failed:", fallbackError);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestedToken();
    // Reset validation errors when component mounts
    setValidationErrors({ mobileNumber: false, payment: false });
    setMobileFieldTouched(false);
  }, [localCabinId, localSelectedSlot]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Validate mobile number as it's being entered
    if (name === "phone_number") {
      // If the field is completely empty, don't show error
      // unless they're trying to mark as present
      if (!value || value.trim() === '') {
        if (!formData.checkin) {
          setValidationErrors(prev => ({ 
            ...prev, 
            mobileNumber: false 
          }));
        }
      } else {
        // Otherwise validate for 10 digits
        const isValid = value.trim().length === 10;
        if (mobileFieldTouched || validationErrors.mobileNumber) {
          setValidationErrors(prev => ({ 
            ...prev, 
            mobileNumber: !isValid 
          }));
        }
      }
    }
  };

  const handleSexChange = (event, newSex) => {
    if (newSex !== null) {
      setFormData((prev) => ({ ...prev, sex: newSex }));
    }
  };

  const handlePaidCheckboxChange = (e) => {
    const paid = e.target.checked;
    setFormData((prev) => ({
      ...prev,
      paid,
      mode: paid ? "cash" : "",
      fees_paid: paid ? 250 : 0,
    }));
    
    // Clear payment validation error when checkbox is checked
    if (validationErrors.payment && paid) {
      setValidationErrors(prev => ({ ...prev, payment: false }));
    }
  };

  const handleCheckinChange = (e) => {
    const newCheckinState = e.target.checked;
    
    // Check both payment and mobile conditions
    const paymentMissing = newCheckinState && !formData.paid;
    const mobileMissing = newCheckinState && 
      (!formData.phone_number || 
       formData.phone_number.trim() === '' ||
       formData.phone_number.length !== 10);
    
    // Update validation errors
    setValidationErrors({
      payment: paymentMissing,
      mobileNumber: mobileMissing
    });
    
    // Only allow checking the box if validations pass
    if (paymentMissing || mobileMissing) {
      // Show appropriate snackbar message
      if (paymentMissing && mobileMissing) {
        showWarningSnackbar("Please complete both payment details and mobile number", 3000);
      } else if (paymentMissing) {
        showWarningSnackbar("Please complete payment details", 3000);
      } else if (mobileMissing) {
        showWarningSnackbar("Please enter valid 10-digit mobile number", 3000);
      }
      return;
    }
    
    setFormData((prev) => ({
      ...prev,
      checkin: newCheckinState,
    }));
  };

  const validateToken = (token) => {
    return !isNaN(token) && token > 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Reset validation errors before validation
    setValidationErrors({ mobileNumber: false, payment: false });

    if (!validateToken(formData.token)) {
      setError("Please enter a valid token number");
      setLoading(false);
      return;
    }

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError("First name and last name are required");
      setLoading(false);
      return;
    }
    
    // Check for mobile validation if present
    if (formData.phone_number) {
      if (!/^\d+$/.test(formData.phone_number)) {
        setError("Invalid mobile number (numbers only)");
        setValidationErrors(prev => ({ ...prev, mobileNumber: true }));
        setLoading(false);
        return;
      }
      
      if (formData.phone_number.length !== 10) {
        setError("Mobile number must be exactly 10 digits");
        setValidationErrors(prev => ({ ...prev, mobileNumber: true }));
        setLoading(false);
        return;
      }
    }
    
    // Check conditions for marking patient as present
    if (formData.checkin) {
      const paymentMissing = !formData.paid;
      const mobileMissing = !formData.phone_number || 
                          formData.phone_number.trim() === '' ||
                          formData.phone_number.length !== 10;
      
      if (paymentMissing || mobileMissing) {
        // Set validation errors
        setValidationErrors({
          payment: paymentMissing,
          mobileNumber: mobileMissing
        });
        
        // Show appropriate error message
        if (paymentMissing && mobileMissing) {
          setError("Please complete both payment details and mobile number before marking patient as present");
          showWarningSnackbar("Please complete both payment details and mobile number");
        } else if (paymentMissing) {
          setError("Please complete payment details before marking patient as present");
          showWarningSnackbar("Please complete payment details");
        } else if (mobileMissing) {
          setError("Please enter a valid 10-digit mobile number before marking patient as present");
          showWarningSnackbar("Please enter a valid 10-digit mobile number");
        }
        
        setLoading(false);
        return;
      }
    }

    try {
      if (!localCabinId || !localSelectedSlot) {
        setError("Unable to retrieve cabin information");
        setLoading(false);
        return;
      }

      const payload = {
        cabinId: localCabinId,
        slot: localSelectedSlot,
        name: `${formData.firstName} ${formData.lastName}`.trim().toUpperCase(),
        token: parseInt(formData.token),
        paid: formData.paid,
        checkin: formData.checkin,
        age: formData.age,
        phone_number: formData.phone_number,
        location: `${formData.location}`.toUpperCase(),
        gender: formData.sex,
        guardian: `${formData.guardian}`.toUpperCase(),
        disease: formData.disease,
        appointment_type: formData.appointment_type,
        mode: formData.mode || "",
        fees_paid: formData.fees_paid || 0,
      };

      await addAppointment(payload);

      // Reset form fields
      setFormData({
        ...formData,
        firstName: "",
        lastName: "",
        age: "",
        phone_number: "",
        location: "",
        sex: "",
        disease: "",
        guardian: "",
        checkin: false,
        paid: false,
        mode: "",
        fees_paid: 0,
      });
      
      // Reset validation errors
      setValidationErrors({ mobileNumber: false, payment: false });
      setMobileFieldTouched(false);

      // Refresh token suggestion after successfully adding
      await fetchSuggestedToken();
      
      setError("");
      showSuccessSnackbar("Appointment added successfully!", 500 );
    } catch (error) {
      setError(error.response?.data?.message || "Failed to add appointment");
    } finally {
      setLoading(false);
    }
  };

  const handleMobileSearch = async (value) => {
    if (!value || value.length !== 10) {
      setMobileSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const result = await getPatientProfile(value);
      if (result && result.length > 0) {
        setMobileSearchResults(result);
      } else {
        setMobileSearchResults([]);
      }
    } catch (error) {
      console.error("Error searching patient profile:", error);
      setMobileSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handlePatientSelect = (patient) => {
    if (patient) {
      setFormData(prev => ({
        ...prev,
        phone_number: patient.phone_number,
        firstName: patient.name.split(" ")[0] || "",
        lastName: patient.name.split(" ").slice(1).join(" ") || "",
        age: patient.age || "",
        sex: patient.gender || "",
        location: patient.location || "",
        guardian: patient.guardian || "",
      }));
      
      // Clear mobile validation error when a patient is selected
      if (validationErrors.mobileNumber) {
        setValidationErrors(prev => ({ ...prev, mobileNumber: false }));
      }
      
      setMobileSearchResults([]);
    }
  };

  return (
    <div
      style={{
        padding: "16px",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
        New Appointment
      </Typography>

      <form
        onSubmit={handleSubmit}
        style={{
          flex: 1,
          paddingBottom: "350px", // Space for fixed button
        }}
      >
        {error && (
          <Typography color="error" sx={{ mb: 1 }}>
            {error}
          </Typography>
        )}
        {/* Token Input */}

        {/* Add this after your token TextField */}
        <FormControl fullWidth sx={{ mb: 1 }}>
          <InputLabel>Select Cabin</InputLabel>
          <Select
            name="cabin"
            value={localCabinId}
            onChange={(e) => setLocalCabinId(Number(e.target.value))}
            label="Select Cabin"
          >
            {cabins.map((cabin) => (
              <MenuItem key={cabin.id} value={cabin.id}>
                {cabin.doctor}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth sx={{ mb: 1 }}>
          <InputLabel>Select Slot</InputLabel>
          <Select
            name="slot"
            value={localSelectedSlot}
            onChange={(e) => setLocalSelectedSlot(e.target.value)}
            label="Select Slot"
          >
            {localOpenSlots.map((slot) => (
              <MenuItem key={slot.slot} value={slot.slot}>
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="body1">
                    {timeConverter24to12(slot.start_time)} - {timeConverter24to12(slot.end_time)} ({formatSlotDateFromAPI(slot)})
                  </Typography>
                  {/* <Typography variant="caption" color="text.secondary">
                    {formatSlotDateTime(slot.slot)}
                  </Typography> */}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          fullWidth
          label="Token Number"
          disabled={loading}
          name="token"
          type="number"
          value={formData.token}
          onChange={handleInputChange}
          required
          sx={{ mb: 1 }}
          // helperText={`Suggested token: ${suggestedToken}`}
          InputProps={{ inputProps: { min: 1 } }}
        />

        {/* Name Row */}
        <Box sx={{ mb: 1 }}>
          <Autocomplete
            fullWidth
            disableClearable
            options={mobileSearchResults}
            getOptionLabel={(option) => {
              // Handle both objects from dropdown and direct string input
              return typeof option === 'object' ? option?.phone_number || "" : option || "";
            }}
            loading={isSearching}
            value={formData.phone_number || ""}
            onChange={(_, newValue) => {
              if (typeof newValue === 'object') {
                handlePatientSelect(newValue);
              } else {
                setFormData(prev => ({
                  ...prev,
                  phone_number: newValue || ""
                }));
                
                // If the field is completely empty, don't show error
                // unless they're trying to mark as present
                if (!newValue || newValue.trim() === '') {
                  if (!formData.checkin) {
                    setValidationErrors(prev => ({ 
                      ...prev, 
                      mobileNumber: false 
                    }));
                  }
                } else {
                  // Otherwise validate for 10 digits
                  const isValid = newValue.trim().length === 10;
                  if (mobileFieldTouched || validationErrors.mobileNumber) {
                    setValidationErrors(prev => ({ 
                      ...prev, 
                      mobileNumber: !isValid 
                    }));
                  }
                }
              }
            }}
            freeSolo={true}
            ListboxProps={{
              style: { maxHeight: '400px' }
            }}
            ListboxComponent={(props) => (
              <div 
                {...props}
                style={{
                  ...props.style,
                  position: 'relative'
                }}
              >
                {mobileSearchResults.length > 0 && (
                  <IconButton
                    size="small"
                    onClick={() => setMobileSearchResults([])}
                    sx={{ 
                      position: 'absolute',
                      right: 4,
                      top: 4,
                      p: 0.5,
                      minWidth: '24px',
                      minHeight: '24px',
                      zIndex: 2,
                      bgcolor: 'background.paper',
                      '&:hover': {
                        bgcolor: 'action.hover'
                      }
                    }}
                  >
                    <CloseIcon sx={{ fontSize: '1rem' }} />
                  </IconButton>
                )}
                {props.children}
              </div>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Mobile"
                name="phone_number"
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= 10) {
                    setFormData(prev => ({
                      ...prev,
                      phone_number: value
                    }));
                    handleMobileSearch(value);
                    
                    // If the field is completely empty, don't show error
                    // unless they're trying to mark as present
                    if (!value || value.trim() === '') {
                      if (!formData.checkin) {
                        setValidationErrors(prev => ({ 
                          ...prev, 
                          mobileNumber: false 
                        }));
                      }
                    } else {
                      // Otherwise validate for 10 digits
                      const isValid = value.trim().length === 10;
                      if (mobileFieldTouched || validationErrors.mobileNumber) {
                        setValidationErrors(prev => ({ 
                          ...prev, 
                          mobileNumber: !isValid 
                        }));
                      }
                    }
                  }
                }}
                onBlur={() => {
                  // Mark field as touched when user leaves the field
                  setMobileFieldTouched(true);
                  
                  // Get the current value
                  const value = formData.phone_number || "";
                  
                  // If the field is completely empty, don't show error
                  // unless they're trying to mark as present
                  if (!value || value.trim() === '') {
                    if (!formData.checkin) {
                      setValidationErrors(prev => ({ 
                        ...prev, 
                        mobileNumber: false 
                      }));
                    }
                  } else {
                    // Otherwise validate for 10 digits
                    const isValid = value.trim().length === 10;
                    setValidationErrors(prev => ({ 
                      ...prev, 
                      mobileNumber: !isValid
                    }));
                  }
                }}
                inputProps={{
                  ...params.inputProps,
                  maxLength: 10,
                  value: formData.phone_number || "",
                  type: "tel",
                  pattern: "[0-9]*",
                  inputMode: "numeric"
                }}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {isSearching ? <CircularProgress color="inherit" size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
                error={validationErrors.mobileNumber}
                helperText={validationErrors.mobileNumber ? "Please enter 10 digits" : ""}
                FormHelperTextProps={{
                  sx: { 
                    margin: 0, 
                    marginTop: '2px',
                    fontSize: '0.7rem'
                  }
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': {
                      borderColor: validationErrors.mobileNumber ? 'error.main' : undefined,
                      borderWidth: validationErrors.mobileNumber ? 2 : 1
                    }
                  },
                  mb: 1
                }}
              />
            )}
            renderOption={(props, option) => {
              const { key, ...otherProps } = props;
              const uniqueKey = option.patient_id;
              return (
                <li key={uniqueKey} {...otherProps}>
                  <div>
                    <Typography variant="body1">{option.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {option.phone_number}
                    </Typography>
                  </div>
                </li>
              );
            }}
          />
        </Box>

        <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
          <TextField
            fullWidth
            label="First Name"
            name="firstName"
            value={formData.firstName.toUpperCase()}
            onChange={handleInputChange}
            required
          />
          <TextField
            fullWidth
            label="Last Name"
            name="lastName"
            value={formData.lastName.toUpperCase()}
            onChange={handleInputChange}
            required
          />
        </Box>

        {/* Check-in/Payment Row */}
        <Box sx={{ display: "flex", gap:1, mb: 1, justifyContent: "space-between" }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.paid}
                onChange={handlePaidCheckboxChange}
                name="payment-checkbox-mobile"
              />
            }
            label={
              <Typography 
                variant="body1" 
                sx={{ 
                  fontWeight: formData.paid ? 'bold' : 'normal',
                  color: formData.paid 
                    ? 'primary.main' 
                    : (validationErrors.payment || (formData.checkin && !formData.paid)) 
                      ? 'error.main' 
                      : 'text.primary'
                }}
              >
                Payment
              </Typography>
            }
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.checkin}
                onChange={handleCheckinChange}
              />
            }
            label={
              <Typography 
                variant="body1" 
                sx={{ 
                  fontWeight: formData.checkin ? 'bold' : 'normal',
                  color: formData.checkin ? 'primary.main' : 'text.primary'
                }}
              >
                Present in Clinic
              </Typography>
            }
          />
        </Box>

        {formData.paid && (
          <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Payment Mode</InputLabel>
              <Select
                name="mode"
                value={formData.mode}
                onChange={handleInputChange}
                label="Payment Mode"
              >
                <MenuItem value="cash">Cash</MenuItem>
                <MenuItem value="online">Online</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Fees"
              name="fees_paid"
              type="number"
              value={formData.fees_paid}
              onChange={handleInputChange}
              InputProps={{ inputProps: { min: 0 } }}
            />
          </Box>
        )}

        {/* Age & Gender Row */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 1 }}>
          <TextField
            fullWidth
            label="Age"
            name="age"
            type="number"
            value={formData.age}
            onChange={handleInputChange}
            InputProps={{ inputProps: { min: 0, max: 120 } }}
          />
          
          <FormControl component="fieldset" fullWidth>
            <ToggleButtonGroup
              value={formData.sex}
              exclusive
              onChange={handleSexChange}
              color="primary"
              fullWidth
            >
              <ToggleButton value="M" color="primary">
                Male
              </ToggleButton>
              <ToggleButton value="F" color="secondary">
                Female
              </ToggleButton>
              <ToggleButton value="O">Other</ToggleButton>
            </ToggleButtonGroup>
          </FormControl>
        </Box>

        {/* Guardian & Location Row */}
        <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
          <TextField
            fullWidth
            label="Guardian"
            name="guardian"
            value={formData.guardian.toUpperCase()}
            onChange={handleInputChange}
          />
          <TextField
            fullWidth
            label="Location"
            name="location"
            value={formData.location.toUpperCase()}
            onChange={handleInputChange}
          />
        </Box>

        {/* Disease and Appointment Type */}
        <TextField
          fullWidth
          label="Complaint"
          name="disease"
          value={formData.disease}
          onChange={handleInputChange}
          sx={{ mb: 1 }}
        />

        <FormControl fullWidth sx={{ mb: 1 }}>
          <InputLabel>Appointment Type *</InputLabel>
          <Select
            name="appointment_type"
            value={formData.appointment_type}
            onChange={handleInputChange}
            label="Appointment Type"
          >
            <MenuItem value="New">New</MenuItem>
            <MenuItem value="Follow-up">Follow-up</MenuItem>
            <MenuItem value="Emergency">Emergency</MenuItem>
            <MenuItem value="Routine">Routine</MenuItem>
          </Select>
        </FormControl>
      </form>

      {/* Fixed Submit Button */}
      <Box
        sx={{
          position: "fixed",
          bottom: "56px", // Adjust based on your BottomNavigator height
          left: 0,
          right: 0,
          backgroundColor: "transparent",
          padding: "16px",
          zIndex: 2,
        }}
      >
        <Button
          onClick={handleSubmit}
          fullWidth
          variant="contained"
          disabled={loading}
          sx={{
            py: 1.5,
            borderRadius: "12px",
            fontSize: "1rem",
            backgroundColor: "#1976d2",
            "&:hover": {
              backgroundColor: "#1565c0",
            },
          }}
        >
          {loading ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            "Add Appointment"
          )}
        </Button>
      </Box>
    </div>
  );
}
