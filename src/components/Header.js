import React, { useContext, useState, useEffect, useRef } from "react";
import { logout } from "../services/authService";
import { AuthContext } from "../context/AuthContext";
import { useAppointmentForm } from "../context/AppointmentFormContext";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  TextField,
  Box,
  CircularProgress,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  Typography,
} from "@mui/material";
import logo from "../assets/DigiCare__logo.png";
import LogoutIcon from "@mui/icons-material/Logout";
import SearchIcon from "@mui/icons-material/Search";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import CloseIcon from "@mui/icons-material/Close";
import "./Header.module.css";
import { getPatientProfile, getPatientDetails } from "../services/api";

function Header() {
  const isMobile = window.innerWidth <= 768;
  const [open, setOpen] = useState(false);
  const { setUser } = useContext(AuthContext);
  const { openAppointmentForm } = useAppointmentForm();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [patients, setPatients] = useState([]);
  const [showPatientList, setShowPatientList] = useState(false);
  const searchContainerRef = useRef(null);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleLogout = () => {
    setUser(null);
    logout();
    handleClose();
  };

  const handlePatientSelect = async (patient) => {
    try {
      setLoading(true);
      // Get complete patient details using getPatientDetails API
      const detailsResponse = await getPatientDetails(patient.patient_id);
      console.log('Patient details response:', detailsResponse);
      
      if (detailsResponse && detailsResponse.patient) {
        // Prepare the current appointment data if it exists
        const currentAppointment = detailsResponse.current_appointment ? {
          id: detailsResponse.current_appointment.appointment_id,
          token: detailsResponse.current_appointment.token,
          type: detailsResponse.current_appointment.appointment_type,
          status: detailsResponse.current_appointment.status,
          disease: detailsResponse.current_appointment.disease,
          fees: detailsResponse.current_appointment.fees_paid,
          paymentMode: detailsResponse.current_appointment.mode,
          paid: detailsResponse.current_appointment.paid,
          checkin: detailsResponse.current_appointment.checkin
        } : undefined;

        // Navigate to patient info page with the complete patient data
        navigate('/patient-info', { 
          state: { 
            patientInfo: {
              id: patient.patient_id
            },
            appointmentInfo: currentAppointment ? {
              id: currentAppointment.id
            } : undefined
          } 
        });
      }
    } catch (error) {
      console.error('Error fetching patient details:', error);
      setError("Failed to load complete patient details. Please try again.");
    } finally {
      setLoading(false);
      // Clear the search results
      setPatients([]);
      setShowPatientList(false);
      setSearchQuery("");
    }
  };

  const handleSearch = async (phoneNumber) => {
    try {
      setLoading(true);
      setError(null);
      setPatients([]);
      setShowPatientList(false);
      
      // Only search if query is a 10-digit phone number
      const isPhoneNumber = /^\d{10}$/.test(phoneNumber.trim());
      
      if (!isPhoneNumber) {
        // Don't show error until they've entered 10 digits
        return;
      }
      
      const response = await getPatientProfile(phoneNumber.trim());
      console.log('Search response:', response);
      
      if (Array.isArray(response) && response.length > 0) {
        setPatients(response);
        setShowPatientList(true);
      } else {
        setError("No patient found with the provided phone number");
      }
    } catch (error) {
      console.error('Error searching patient:', error);
      setError("Failed to search patient. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle input change for search query
  const handleSearchInputChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    setError(null);
    
    // Auto-search when 10 digits are entered
    if (value.length === 10 && /^\d{10}$/.test(value)) {
      handleSearch(value);
    } else if (value.length > 0) {
      // Clear results when input changes
      setPatients([]);
      setShowPatientList(false);
    }
  };

  // Add click outside listener to close patient list
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowPatientList(false);
      }
    }

    // Add event listener when patient list is shown
    if (showPatientList) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    
    // Clean up the event listener
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showPatientList]);

  // Add a function to clear the search
  const handleClearSearch = () => {
    setSearchQuery("");
    setPatients([]);
    setShowPatientList(false);
    setError(null);
  };

  return (
    <header>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <img
          src={logo}
          alt="DigiCare"
          style={{ width: "150px", height: "40px" }}
        />
      </Box>

      {/* Patient Search Bar - Center with New Appointment Button */}
      <Box 
        ref={searchContainerRef}
        sx={{ 
          flex: { xs: 0, md: 1 }, 
          maxWidth: { xs: '40px', md: '550px' }, 
          mx: 'auto',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}
      >
        <Button 
          variant="contained"
          startIcon={<AddCircleIcon sx={{ color: 'white' }} />}
          onClick={() => openAppointmentForm()}
          sx={{
            backgroundColor: '#1976d2',
            color: 'white',
            fontWeight: 600,
            fontSize: '0.9rem',
            height: '40px',
            padding: '0 24px',
            minWidth: '180px',
            borderRadius: '20px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.3s ease',
            textTransform: 'none',
            whiteSpace: 'nowrap',
            "&:hover": {
              backgroundColor: '#1565c0',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
              transform: 'translateY(-2px)'
            },
            "&:active": {
              transform: 'translateY(0px)',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
            },
            display: { xs: 'none', md: 'flex' }
          }}
        >
          New Appointment
        </Button>

        <TextField
          placeholder="Enter 10-digit phone number to search patient..."
          variant="outlined"
          size="small"
          fullWidth
          value={searchQuery}
          onChange={handleSearchInputChange}
          onKeyPress={(event) => {
            if (event.key === 'Enter' && searchQuery.length > 0) {
              handleSearch(searchQuery);
            }
          }}
          disabled={loading}
          error={!!error}
          helperText={error}
          sx={{
            display: { xs: 'none', md: 'flex' }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
            endAdornment: (
              <>
                {loading && <CircularProgress size={20} />}
                {searchQuery && !loading && (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="clear search"
                      onClick={handleClearSearch}
                      edge="end"
                      size="small"
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                )}
              </>
            ),
          }}
        />

        {/* Patient List Dropdown */}
        {showPatientList && patients.length > 0 && (
          <Box
            sx={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              zIndex: 1000,
              mt: 1,
              bgcolor: 'background.paper',
              borderRadius: 1,
              boxShadow: 3,
              maxHeight: '300px',
              overflowY: 'auto',
              display: { xs: 'none', md: 'block' }
            }}
          >
            <List sx={{ p: 0 }}>
              {patients.map((patient, index) => (
                <ListItem
                  key={patient.patient_id}
                  button
                  onClick={() => handlePatientSelect(patient)}
                  divider={index < patients.length - 1}
                  sx={{
                    py: 1.5,
                    '&:hover': {
                      bgcolor: 'rgba(25, 118, 210, 0.08)',
                    },
                  }}
                >
                  <ListItemText
                    primary={
                      <Typography variant="subtitle1" component="div" sx={{ fontWeight: 500 }}>
                        {patient.name}
                      </Typography>
                    }
                    secondary={
                      <Box sx={{ mt: 0.5 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <span>{patient.phone_number}</span>
                          <span>•</span>
                          <span>{patient.age || 'N/A'} years</span>
                          <span>•</span>
                          <span>{patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : patient.gender || 'N/A'}</span>
                        </Typography>
                        {patient.location && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            {patient.location}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </Box>

      {/* Mobile Logout Button */}
      {isMobile && (
        <IconButton
          color="primary"
          onClick={handleClickOpen}
          sx={{ marginLeft: "auto" }}
        >
          <LogoutIcon />
        </IconButton>
      )}

      {/* Desktop Logout Button */}
      {!isMobile && (
        <div className="logout-button">
          <Button variant="contained" color="primary" onClick={handleClickOpen}>
            Logout
          </Button>
        </div>
      )}

      {/* Logout Confirmation Dialog */}
      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{"Confirm Logout"}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to logout?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="primary">
            Cancel
          </Button>
          <Button onClick={handleLogout} color="primary" autoFocus>
            Logout
          </Button>
        </DialogActions>
      </Dialog>
    </header>
  );
}

export default Header;
