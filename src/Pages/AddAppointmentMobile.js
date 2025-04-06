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
} from "@mui/material";
import { addAppointment, fetchAppointments, getPatientProfile, getMaxTokenNumber } from "../services/api";
import { getCabinInfo } from "../utils/dateUtils";
import "./AddAppointmentMobile.css";
import { useNotification } from "../context/NotificationContext";

export default function AddAppointmentMobile({ patients }) {
  const user = JSON.parse(localStorage.getItem("user"));
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [suggestedToken, setSuggestedToken] = useState(1);
  const { showSuccessSnackbar, showErrorSnackbar } = useNotification();
  const [mobileSearchResults, setMobileSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

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

  const { cabinId, selectedSlot } = getCabinInfo(user);

  const fetchSuggestedToken = async () => {
    if (!cabinId || !selectedSlot) {
      console.error("Cannot fetch token: missing cabinId or selectedSlot");
      return;
    }
    
    try {
      setLoading(true);
      const maxToken = await getMaxTokenNumber(cabinId, selectedSlot);
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
  }, [cabinId, selectedSlot]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
  };

  const validateToken = (token) => {
    return !isNaN(token) && token > 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

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

    try {
      if (!cabinId || !selectedSlot) {
        setError("Unable to retrieve cabin information");
        setLoading(false);
        return;
      }

      const payload = {
        cabinId: cabinId,
        slot: selectedSlot,
        name: `${formData.firstName} ${formData.lastName}`.trim().toUpperCase(),
        token: formData.token,
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
        <TextField
          fullWidth
          label="Token Number"
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
                    setFormData(prev => ({
                      ...prev,
                      phone_number: value
                    }));
                    handleMobileSearch(value);
                  }
                }}
                inputProps={{
                  ...params.inputProps,
                  maxLength: 10,
                  value: formData.phone_number || ""
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
                sx={{ mb: 1 }}
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
        <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.checkin}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    checkin: e.target.checked,
                  }))
                }
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
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.paid}
                onChange={handlePaidCheckboxChange}
              />
            }
            label={
              <Typography 
                variant="body1" 
                sx={{ 
                  fontWeight: formData.paid ? 'bold' : 'normal',
                  color: formData.paid ? 'primary.main' : 'text.primary'
                }}
              >
                Payment Done
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
