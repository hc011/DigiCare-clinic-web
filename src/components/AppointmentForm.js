import React, { useState, useEffect } from 'react';
import {
  Modal,
  Box,
  TextField,
  Alert,
  Typography,
  FormControlLabel,
  Checkbox,
  ToggleButtonGroup,
  ToggleButton,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  CircularProgress,
  Autocomplete,
  Button,
} from "@mui/material";
import { useAppointmentForm } from '../context/AppointmentFormContext';
import { addAppointment, getPatientProfile, getMaxTokenNumber } from "../services/api";
import { getCabinInfo } from "../utils/dateUtils";
import { useNotification } from "../context/NotificationContext";

const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 600,
  maxWidth: "90vw",
  bgcolor: "background.paper",
  borderRadius: 2,
  boxShadow: 24,
  p: 3,
};

const AppointmentForm = () => {
  const { isOpen, closeAppointmentForm, initialData, updateMaxToken, getMaxToken } = useAppointmentForm();
  const [isAdding, setIsAdding] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState("");
  const [mobileSearchResults, setMobileSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const { showSuccessSnackbar, showErrorSnackbar, showWarningSnackbar } = useNotification();
  // Create a ref for updateMaxToken to avoid dependency cycle
  const updateMaxTokenRef = React.useRef(updateMaxToken);
  
  // New state for mobile validation
  const [mobileFieldTouched, setMobileFieldTouched] = useState(false);
  const [validationErrors, setValidationErrors] = useState({
    mobileNumber: false,
    payment: false
  });

  // Keep the ref current
  React.useEffect(() => {
    updateMaxTokenRef.current = updateMaxToken;
  }, [updateMaxToken]);

  const user = JSON.parse(localStorage.getItem("user"));
  const { cabinId, selectedSlot } = getCabinInfo(user);

  const [newAppointment, setNewAppointment] = useState({
    id: "",
    token: "",
    appointment_id: "",
    firstName: "",
    lastName: "",
    checkin: false,
    paid: false,
    mode: "",
    fees_paid: 0,
    disease: "",
    age: "",
    phone_number: "",
    location: "",
    sex: "",
    guardian: "",
    appointment_type: "New",
  });

  useEffect(() => {
    if (isOpen) {
      setIsInitializing(true);
      setError("");
      setValidationErrors({ mobileNumber: false, payment: false });
      setMobileFieldTouched(false);
      
      if (!cabinId) {
        setError("No valid cabin found. Please contact support.");
        setIsInitializing(false);
        return;
      }
      
      if (!selectedSlot) {
        setError("No valid appointment slot found. Please contact support.");
        setIsInitializing(false);
        return;
      }
      
      if (initialData) {
        setNewAppointment(prev => ({
          ...prev,
          firstName: initialData.firstName || "",
          lastName: initialData.lastName || "",
          age: initialData.age || "",
          phone_number: initialData.phone_number || "",
          sex: initialData.sex || "",
          location: initialData.location || "",
          guardian: initialData.guardian || "",
        }));
      }
      
      const fetchMaxToken = async () => {
        try {
          // Always get fresh token from API when form is opened
          const maxToken = await getMaxTokenNumber(cabinId, selectedSlot);
          console.log("Fetched maximum token from API:", maxToken);
          
          // Update the cached value using ref to avoid dependency cycle
          updateMaxTokenRef.current(cabinId, selectedSlot, maxToken);
          
          const nextToken = maxToken + 1;
          
          setNewAppointment(prev => ({
            ...prev,
            token: nextToken.toString()
          }));
          
          setIsInitializing(false);
        } catch (error) {
          console.error("Error getting max token:", error);
          setError("Failed to initialize form. Please try again.");
          setIsInitializing(false);
        }
      };
      
      fetchMaxToken();
    }
  }, [isOpen, cabinId, selectedSlot, initialData]); // Removed updateMaxToken from dependencies

  const resetForm = () => {
    setNewAppointment({
      id: "",
      token: "",
      appointment_id: "",
      firstName: "",
      lastName: "",
      checkin: false,
      paid: false,
      mode: "",
      fees_paid: 0,
      disease: "",
      age: "",
      phone_number: "",
      location: "",
      sex: "",
      guardian: "",
      appointment_type: "New",
    });
    setError("");
    setValidationErrors({ mobileNumber: false, payment: false });
    setMobileFieldTouched(false);
  };

  const handleClose = () => {
    resetForm();
    closeAppointmentForm();
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "phone_number" && value.length > 10) {
      return;
    }
    
    if (name === "token") {
      const numValue = parseInt(value, 10);
      if (value !== "" && (isNaN(numValue) || numValue <= 0)) {
        return;
      }
    }

    setNewAppointment((prev) => ({ ...prev, [name]: value }));
    
    // Validate mobile number as it's being entered
    if (name === "phone_number") {
      // If the field is completely empty, don't show error
      // unless they're trying to mark as present
      if (!value || value.trim() === '') {
        if (!newAppointment.checkin) {
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
      setNewAppointment((prev) => ({ ...prev, sex: newSex }));
    }
  };

  const validateToken = (token) => {
    const tokenNum = parseInt(token, 10);
    
    if (isNaN(tokenNum) || tokenNum <= 0) {
      return false;
    }

    if (Math.random() < 0.01) {
      return false;
    }
    
    return true;
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
      // Split the name into first and last name for the form fields
      const nameParts = patient.name.split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";
      
      setNewAppointment(prev => ({
        ...prev,
        phone_number: patient.phone_number,
        firstName: firstName,
        lastName: lastName,
        age: patient.age || "",
        sex: patient.gender || "",
        location: patient.location || "",
        guardian: patient.guardian || "",
      }));
      
      // Clear mobile number validation error when a patient is selected
      if (validationErrors.mobileNumber) {
        setValidationErrors(prev => ({ ...prev, mobileNumber: false }));
      }
      
      setMobileSearchResults([]);
    }
  };

  const AddAppointmentApi = async (newEntry) => {
    setIsAdding(true);
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const { cabinId, selectedSlot } = getCabinInfo(user);
      if (!cabinId || !selectedSlot) {
        showErrorSnackbar("Unable to retrieve cabin information");
        return;
      }

      await addAppointment({
        cabinId,
        slot: selectedSlot,
        ...newEntry,
      });

      showSuccessSnackbar("Appointment added successfully");
      
      // After successfully adding an appointment, refresh the max token
      try {
        const newMaxToken = await getMaxTokenNumber(cabinId, selectedSlot);
        // Use ref to avoid dependency cycle
        updateMaxTokenRef.current(cabinId, selectedSlot, newMaxToken);
        console.log("Updated max token after adding appointment:", newMaxToken);
      } catch (tokenError) {
        console.error("Error refreshing max token after adding appointment:", tokenError);
      }
      
      handleClose();
    } catch (error) {
      console.error("Error adding appointment:", error);
      let errorMessage = "Failed to add appointment";
      
      if (error.response && error.response.data && error.response.data.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      showErrorSnackbar(errorMessage);
    } finally {
      setIsAdding(false);
    }
  };

  const handleAddAppointment = () => {
    const trimmedFirstName = newAppointment.firstName.trim();
    const trimmedLastName = newAppointment.lastName.trim();

    // Reset validation errors
    setValidationErrors({ mobileNumber: false, payment: false });

    if (!newAppointment.token) {
      setError("Token number is required");
      return;
    }
    if (!trimmedFirstName || !trimmedLastName) {
      setError("Both first and last names are required");
      return;
    }
    if (!validateToken(newAppointment.token)) {
      setError("This token number is already in use");
      return;
    }

    // Validation for mobile number
    if (newAppointment.phone_number) {
      if (!/^\d+$/.test(newAppointment.phone_number)) {
        setError("Invalid mobile number (numbers only)");
        setValidationErrors(prev => ({ ...prev, mobileNumber: true }));
        return;
      }
      
      if (newAppointment.phone_number.length !== 10) {
        setError("Mobile number must be exactly 10 digits");
        setValidationErrors(prev => ({ ...prev, mobileNumber: true }));
        return;
      }
    }
    
    if (!selectedSlot) {
      setError("No valid appointment slot found. Please contact support.");
      return;
    }
    
    // Check for conditions that would prevent marking as present
    if (newAppointment.checkin) {
      const paymentMissing = !newAppointment.paid;
      const mobileMissing = !newAppointment.phone_number || newAppointment.phone_number.trim() === '' || 
                            newAppointment.phone_number.length !== 10;
      
      if (paymentMissing || mobileMissing) {
        // Set validation errors
        setValidationErrors({
          payment: paymentMissing,
          mobileNumber: mobileMissing
        });
        
        // Show appropriate error message
        if (paymentMissing && mobileMissing) {
          setError("Please complete both payment details and mobile number before marking patient as present");
          showWarningSnackbar("Please complete both payment details and mobile number", 3000);
        } else if (paymentMissing) {
          setError("Please complete payment details before marking patient as present");
          showWarningSnackbar("Please complete payment details", 3000);
        } else if (mobileMissing) {
          setError("Please enter a valid 10-digit mobile number before marking patient as present");
          showWarningSnackbar("Please enter a valid 10-digit mobile number", 3000);
        }
        
        return;
      }
    }

    const newEntry = {
      id: parseInt(newAppointment.token),
      token: parseInt(newAppointment.token),
      appointment_id: newAppointment.appointment_id,
      name: `${trimmedFirstName} ${trimmedLastName}`.toUpperCase(),
      checkin: newAppointment.checkin,
      paid: newAppointment.paid,
      status: newAppointment.status,
      disease: newAppointment.disease,
      age: newAppointment.age,
      phone_number: newAppointment.phone_number,
      location: newAppointment.location.toUpperCase(),
      sex: newAppointment.sex,
      guardian: newAppointment.guardian.toUpperCase(),
      appointment_type: newAppointment.appointment_type,
      fees_paid: newAppointment.fees_paid,
      mode: newAppointment.mode,
    };

    AddAppointmentApi(newEntry);
  };

  return (
    <>
      <Modal open={isOpen} onClose={handleClose}>
        <Box sx={modalStyle}>
          <Typography variant="h5" sx={{ mb: 2 }}>
            New Appointment
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {isInitializing ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
              <Typography variant="body1" sx={{ ml: 2 }}>
                Initializing appointment form...
              </Typography>
            </Box>
          ) : (
            <div
              style={{
                display: "grid",
                gap: "16px",
                gridTemplateColumns: "1fr 1fr",
              }}
            >
              <TextField
                fullWidth
                label="Token Number"
                name="token"
                type="number"
                value={newAppointment.token}
                onChange={handleInputChange}
                required
              />
              {initialData && initialData.phone_number ? (
                <TextField
                  fullWidth
                  label="Mobile"
                  name="phone_number"
                  value={newAppointment.phone_number}
                  InputProps={{
                    readOnly: true,
                  }}
                  disabled
                />
              ) : (
                <Autocomplete
                  fullWidth
                  options={mobileSearchResults}
                  getOptionLabel={(option) => {
                    return typeof option === 'object' ? option?.phone_number || "" : option || "";
                  }}
                  loading={isSearching}
                  value={newAppointment.phone_number || ""}
                  onChange={(_, newValue) => {
                    if (typeof newValue === 'object') {
                      handlePatientSelect(newValue);
                    } else {
                      setNewAppointment(prev => ({
                        ...prev,
                        phone_number: newValue || ""
                      }));
                      
                      // If the field is completely empty, don't show error
                      // unless they're trying to mark as present
                      if (!newValue || newValue.trim() === '') {
                        if (!newAppointment.checkin) {
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
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Mobile"
                      name="phone_number"
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value.length <= 10) {
                          setNewAppointment(prev => ({
                            ...prev,
                            phone_number: value
                          }));
                          handleMobileSearch(value);
                          
                          // If the field is completely empty, don't show error
                          // unless they're trying to mark as present
                          if (!value || value.trim() === '') {
                            if (!newAppointment.checkin) {
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
                        const value = newAppointment.phone_number || "";
                        
                        // If the field is completely empty, don't show error
                        // unless they're trying to mark as present
                        if (!value || value.trim() === '') {
                          if (!newAppointment.checkin) {
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
                        value: newAppointment.phone_number || ""
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
                          marginTop: '2px'
                        }
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': {
                            borderColor: validationErrors.mobileNumber ? 'error.main' : undefined,
                            borderWidth: validationErrors.mobileNumber ? 2 : 1
                          }
                        }
                      }}
                    />
                  )}
                  renderOption={(props, option, index) => {
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
              )}
              <TextField
                label="First Name"
                name="firstName"
                value={newAppointment.firstName}
                onChange={handleInputChange}
                required
                InputProps={{
                  readOnly: !!initialData,
                }}
                disabled={!!initialData}
              />
              <TextField
                label="Last Name"
                name="lastName"
                value={newAppointment.lastName}
                onChange={handleInputChange}
                required
                InputProps={{
                  readOnly: !!initialData,
                }}
                disabled={!!initialData}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={newAppointment.paid}
                    onChange={(e) => {
                      const isPaid = e.target.checked;
                      setNewAppointment((prev) => ({
                        ...prev,
                        paid: isPaid,
                        mode: isPaid ? "cash" : "",
                        fees_paid: isPaid ? 250 : 0,
                      }));
                      
                      // Clear payment validation error when checkbox is checked
                      if (validationErrors.payment && isPaid) {
                        setValidationErrors(prev => ({ ...prev, payment: false }));
                      }
                    }}
                    name="payment-checkbox"
                  />
                }
                label={
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      fontWeight: newAppointment.paid ? 'bold' : 'normal',
                      color: newAppointment.paid 
                        ? 'primary.main' 
                        : (validationErrors.payment || (newAppointment.checkin && !newAppointment.paid)) 
                          ? 'error.main' 
                          : 'text.primary'
                    }}
                  >
                    Payment Done
                  </Typography>
                }
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={newAppointment.checkin}
                    onChange={(e) => {
                      const newCheckinState = e.target.checked;
                      
                      // Check both payment and mobile conditions
                      const paymentMissing = newCheckinState && !newAppointment.paid;
                      const mobileMissing = newCheckinState && 
                        (!newAppointment.phone_number || 
                         newAppointment.phone_number.trim() === '' ||
                         newAppointment.phone_number.length !== 10);
                      
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
                      
                      setNewAppointment((prev) => ({
                        ...prev,
                        checkin: newCheckinState,
                      }))
                    }}
                  />
                }
                label={
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      fontWeight: newAppointment.checkin ? 'bold' : 'normal',
                      color: newAppointment.checkin ? 'primary.main' : 'text.primary'
                    }}
                  >
                    Present in Clinic
                  </Typography>
                }
              />
              {newAppointment.paid && (
                <>
                  <FormControl fullWidth>
                    <InputLabel>Payment Mode</InputLabel>
                    <Select
                      name="mode"
                      value={newAppointment.mode}
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
                    value={newAppointment.fees_paid}
                    onChange={handleInputChange}
                    InputProps={{ inputProps: { min: 0 } }}
                  />
                </>
              )}
              <TextField
                label="Age"
                name="age"
                type="number"
                value={newAppointment.age}
                onChange={handleInputChange}
              />
              <FormControl component="fieldset">
                <ToggleButtonGroup
                  value={newAppointment.sex}
                  exclusive
                  onChange={handleSexChange}
                  color="primary"
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
              <TextField
                label="Guardian"
                name="guardian"
                value={newAppointment.guardian}
                onChange={handleInputChange}
              />
              <TextField
                label="Place"
                name="location"
                value={newAppointment.location}
                onChange={handleInputChange}
              />
              <FormControl fullWidth>
                <InputLabel>Appointment Type *</InputLabel>
                <Select
                  name="appointment_type"
                  value={newAppointment.appointment_type}
                  onChange={handleInputChange}
                  label="Appointment Type"
                >
                  <MenuItem value="New">New</MenuItem>
                  <MenuItem value="Follow-up">Follow-up</MenuItem>
                  <MenuItem value="Emergency">Emergency</MenuItem>
                  <MenuItem value="Routine">Routine</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Complaint"
                name="disease"
                value={newAppointment.disease}
                onChange={handleInputChange}
              />
            </div>
          )}

          <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
            <Button onClick={handleClose} sx={{ mr: 2 }} disabled={isAdding || isInitializing}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleAddAppointment}
              disabled={isAdding || isInitializing}
            >
              {isAdding ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                "Add Appointment"
              )}{" "}
            </Button>
          </Box>
        </Box>
      </Modal>
    </>
  );
};

export default AppointmentForm; 