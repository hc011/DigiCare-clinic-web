import React, { useState, useEffect, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  CircularProgress,
  Chip,
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Checkbox,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  Autocomplete,
  Alert,
  Skeleton,
} from "@mui/material";
import {
  updateAppointmentDetails,
  removeAppointment,
  getPatientProfile,
  fetchAppointments as fetchAppointmentsApi
} from "../services/api";
import "./MobileAppointmentTable.css";
import SearchIcon from "@mui/icons-material/Search";
import { CheckCircle, Cancel, Edit } from "@mui/icons-material";
import CloseIcon from "@mui/icons-material/Close";
import { getCabinInfoFromUser } from "../utils/dateUtils";
import webSocketService from "../services/websocketService";
import { useNotification } from "../context/NotificationContext";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

// Function to get status color
const getStatusColor = (status) => {
  switch (status) {
    case "done":
    case "done_checkup":
      return "success";
    case "cancelled":
      return "error";
    case "pending":
      return "info";
    default:
      return "default";
  }
};

export default function MobileAppointmentTable() {
  const user = JSON.parse(localStorage.getItem("user"));
  const { cabinId, selectedSlot } = getCabinInfoFromUser(user);
  
  // State for appointment data
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Notification context for showing messages
  const { showErrorSnackbar, showSuccessSnackbar } = useNotification();
  
  // State for editing appointment
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState(null);
  
  // State for search and filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  
  // State for cancellation confirmation
  const [cancelConfirmationOpen, setCancelConfirmationOpen] = useState(false);
  const [rowToCancel, setRowToCancel] = useState(null);
  const [isCanceling, setIsCanceling] = useState(false);
  
  // State for patient search in edit modal
  const [editMobileSearchResults, setEditMobileSearchResults] = useState([]);
  const [isEditSearching, setIsEditSearching] = useState(false);
  
  // Memoized cabin info for appointments
  const cabinInfo = useMemo(() => {
    if (user && user.checkupcabindata && user.checkupcabindata.length > 0) {
      return {
        cabinNumber: user.checkupcabindata[0].cab_id,
        doctorName: user.checkupcabindata[0].doctor_name || "Dr.",
      };
    }
    return { cabinNumber: "", doctorName: "Dr." };
  }, [user]);

  // Handler to edit a specific appointment row
  const handleEditClick = (row) => {
    // When setting the selected appointment, parse the patient name into first and last name
    const fullName = row.patientName || '';
    const nameParts = fullName.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
    
    // Create a modified row with firstName and lastName properties
    const formattedRow = {
      ...row,
      firstName: firstName,
      lastName: lastName
    };
    
    setSelectedAppointment(formattedRow);
    setEditModalOpen(true);
  };

  // Close edit modal and reset state
  const handleEditModalClose = () => {
    setEditModalOpen(false);
    setSelectedAppointment(null);
    setUpdateError(null);
  };

  // Handle edit form submission
  const handleEditSubmit = async () => {
    if (!selectedAppointment) return;
    
    setIsUpdating(true);
    setUpdateError(null);
    
    try {
      // Combine firstName and lastName back into a full name if they exist
      const fullName = selectedAppointment.firstName && selectedAppointment.lastName 
        ? `${selectedAppointment.firstName} ${selectedAppointment.lastName}`.trim()
        : selectedAppointment.patientName || '';
      
      // Prepare data for API - match the format used in AppointmentTable
      const updateData = {
        appointment_id: selectedAppointment.appointment_id,
        checkin: selectedAppointment.checkin,
        status: selectedAppointment.status,
        name: fullName,
        phone_number: selectedAppointment.phone_number,
        age: selectedAppointment.age,
        sex: selectedAppointment.sex,
        location: selectedAppointment.location,
        guardian: selectedAppointment.guardian,
        disease: selectedAppointment.disease,
        paid: selectedAppointment.paid,
        mode: selectedAppointment.mode,
        fees_paid: selectedAppointment.fees_paid
      };
      
      // Call API to update
      await updateAppointmentDetails(updateData);
      
      // Update local state
      setAppointments(prev => 
        prev.map(apt => 
          apt.appointment_id === selectedAppointment.appointment_id 
            ? { 
                ...apt, 
                ...updateData,
                patientName: fullName
              } 
            : apt
        )
      );
      
      showSuccessSnackbar("Appointment updated successfully", 500);
      handleEditModalClose();
      
    } catch (error) {
      console.error("Failed to update appointment:", error);
      setUpdateError(error.message || "Update failed");
      showErrorSnackbar("Failed to update appointment. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Function to handle patient search in edit modal
  const handleEditMobileSearch = async (value) => {
    if (!value || value.length !== 10) {
      setEditMobileSearchResults([]);
      return;
    }

    setIsEditSearching(true);
    try {
      const result = await getPatientProfile(value);
      if (result && result.length > 0) {
        setEditMobileSearchResults(result);
      } else {
        setEditMobileSearchResults([]);
      }
    } catch (error) {
      console.error("Error searching patient profile:", error);
      setEditMobileSearchResults([]);
    } finally {
      setIsEditSearching(false);
    }
  };

  // Function to handle patient selection in edit modal
  const handleEditPatientSelect = (patient) => {
    if (patient) {
      // Split the patient name for the modal form
      const fullName = patient.name || '';
      const nameParts = fullName.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
      
      setSelectedAppointment(prev => ({
        ...prev,
        phone_number: patient.phone_number,
        patientName: patient.name || "",
        firstName: firstName,
        lastName: lastName,
        age: patient.age || "",
        sex: patient.gender || "",
        location: patient.location || "",
        guardian: patient.guardian || "",
      }));
      setEditMobileSearchResults([]);
    }
  };

  // Handle appointment cancellation
  const handleCancelAppointment = async () => {
    if (!rowToCancel) return;
    
    setIsCanceling(true);
    try {
      await removeAppointment({
        appointment_id: rowToCancel.appointment_id,
      });

      setAppointments((prev) =>
        prev.filter((apt) => apt.token !== rowToCancel.token)
      );

      setCancelConfirmationOpen(false);
      handleEditModalClose();
      showSuccessSnackbar("Appointment cancelled successfully");
      
    } catch (error) {
      console.error("Failed to cancel appointment:", error);
      showErrorSnackbar("Failed to cancel appointment. Please try again.");
    } finally {
      setIsCanceling(false);
      setRowToCancel(null);
    }
  };

  // Fetch appointments data
  const fetchAppointmentsData = async () => {
    if (!cabinId || !selectedSlot) {
      console.error("Missing cabin ID or selected slot");
      setError("Configuration error. Please log in again.");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const fetchedAppointments = await fetchAppointmentsApi(cabinId, selectedSlot);
      console.log(`Fetched ${fetchedAppointments.length} appointments:`, fetchedAppointments);
      
      const formattedAppointments = fetchedAppointments.map(apt => {
        // API returns 'name' property, not 'patient_name'
        const patientName = apt.patient_name || apt.name || '';
        
        return {
          id: apt.appointment_id || apt.token || Math.random().toString(36).substr(2, 9),
          token: apt.token || "",
          appointment_id: apt.appointment_id,
          patientName: patientName,
          checkin: apt.checkin || false,
          paid: apt.paid || false,
          status: apt.status || "pending",
          sex: apt.sex || (apt.patient?.gender) || "",
          guardian: apt.guardian_name || (apt.patient?.guardian) || "",
          phone_number: apt.phone_number || (apt.patient?.phone_number) || "",
          age: apt.age || (apt.patient?.age) || "",
          location: apt.location || (apt.patient?.location) || "",
          disease: apt.disease || "",
          mode: apt.mode || "",
          fees_paid: apt.fees_paid || 0,
          appointment_type: apt.appointment_type || "New",
          isPlaceholder: false,
        };
      });
      
      console.log("Formatted appointments:", formattedAppointments);
      setAppointments(formattedAppointments);
      setError(null);
    } catch (err) {
      console.error("Error fetching appointments:", err);
      setError("Failed to load appointments. Please try again.");
      showErrorSnackbar("Failed to load appointments. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch on component mount
  useEffect(() => {
    if (cabinId && selectedSlot) {
      fetchAppointmentsData();
    }
  }, [cabinId, selectedSlot]);

  // Setup WebSocket subscription for real-time updates
  useEffect(() => {
    if (!cabinId || !selectedSlot) return;

    console.log("Setting up WebSocket subscription for appointments in Mobile view");
    
    // Subscribe to appointment updates
    const unsubscribe = webSocketService.subscribe('appointment', (response) => {
      console.log("Received appointment update via WebSocket in Mobile view:", response);
      
      try {
        // Check for the right message format
        let appointmentData = null;
        
        if (response.data && response.data.type === "appointment_update" && response.data.data && response.data.data.appointment) {
          appointmentData = response.data.data.appointment;
        } else if (response.data && response.data.type === "queue_update" && response.data.data && response.data.data.appointment) {
          appointmentData = response.data.data.appointment;
        } else if (response.appointment) {
          appointmentData = response.appointment;
        }
        
        if (appointmentData) {
          setAppointments(prevAppointments => {
            // Get patient data safely
            const patientData = appointmentData.patient || {};
            
            // Format the appointment for our component's state structure
            const formattedAppointment = {
              id: appointmentData.appointment_id,
              token: appointmentData.token || "",
              appointment_id: appointmentData.appointment_id,
              patientName: appointmentData.name || appointmentData.patient_name || "",
              checkin: appointmentData.checkin || false,
              paid: appointmentData.paid || false,
              status: appointmentData.status || "pending",
              sex: appointmentData.sex || patientData.gender || "",
              guardian: appointmentData.guardian || patientData.guardian || "",
              phone_number: appointmentData.phone_number || patientData.phone_number || "",
              age: appointmentData.age || patientData.age || "",
              location: appointmentData.location || patientData.location || "",
              disease: appointmentData.disease || "",
              mode: appointmentData.mode || "cash",
              fees_paid: appointmentData.fees_paid || 0,
              appointment_type: appointmentData.appointment_type || "New",
              isPlaceholder: false
            };

            // Check if we already have this appointment
            const existingIndex = prevAppointments.findIndex(
              a => a.appointment_id === appointmentData.appointment_id
            );
            
            if (existingIndex !== -1) {
              // Update existing appointment while preserving any local state
              const newAppointments = [...prevAppointments];
              newAppointments[existingIndex] = {
                ...newAppointments[existingIndex],
                ...formattedAppointment
              };
              return newAppointments;
            } else {
              // Add new appointment
              return [...prevAppointments, formattedAppointment];
            }
          });
        }
      } catch (error) {
        console.error("Error processing WebSocket appointment data in Mobile view:", error);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [cabinId, selectedSlot]);

  // Apply filters and search
  const filteredAppointments = useMemo(() => {
    return appointments
      .filter(apt => {
        // Filter by status
        if (filterStatus !== 'all') {
          return apt.status === filterStatus;
        }
        return true;
      })
      .filter(apt => {
        // Search by patient name or token
        if (!searchQuery) return true;
        
        const query = searchQuery.toLowerCase();
        return (
          apt.patientName?.toLowerCase().includes(query) ||
          apt.token?.toString().includes(query)
        );
      })
      // Sort by token number
      .sort((a, b) => {
        // Convert token to number for proper sorting
        const tokenA = parseInt(a.token) || 0;
        const tokenB = parseInt(b.token) || 0;
        return tokenA - tokenB;
      });
  }, [appointments, filterStatus, searchQuery]);

  // Render functions
  const renderEditModal = () => (
    <Dialog
      open={editModalOpen}
      onClose={handleEditModalClose}
      fullWidth
      maxWidth="lg"
      PaperProps={{
        sx: {
          width: { xs: "98vw", sm: "95vw" },
          maxWidth: { xs: "98vw", sm: "95vw" },
          borderRadius: 2,
          p: { xs: 1.5, sm: 2 },
          m: 0,
          overflowY: "auto"
        }
      }}
    >
      <Box sx={{ 
        position: "relative", 
        p: 0, 
        pb: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
          Edit Appointment
        </Typography>
        <IconButton
          aria-label="close"
          onClick={handleEditModalClose}
          sx={{
            color: (theme) => theme.palette.grey[500],
            padding: '4px',
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
      <DialogContent sx={{ p: 0, pt: 1 }}>
        {selectedAppointment && (
          <Box
            sx={{
              display: "grid",
              gap: { xs: "8px", sm: "12px" },
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              width: "100%"
            }}
          >
            <Box sx={{ 
              display: "grid", 
              gridTemplateColumns: { xs: "1fr 1fr", sm: "1fr" },
              gap: { xs: "8px", sm: "12px" }
            }}>
              <TextField
                fullWidth
                label="Token Number"
                type="number"
                disabled={true}
                value={selectedAppointment.token}
                InputProps={{ 
                  readOnly: true,
                  style: { fontSize: '0.85rem' } 
                }}
                InputLabelProps={{ 
                  style: { fontSize: '0.85rem' } 
                }}
                size="small"
              />
              <Autocomplete
                fullWidth
                options={editMobileSearchResults}
                getOptionLabel={(option) => {
                  // Handle both objects from dropdown and direct string input
                  return typeof option === 'object' ? option?.phone_number || "" : option || "";
                }}
                loading={isEditSearching}
                value={selectedAppointment.phone_number || ""}
                onChange={(_, newValue) => {
                  if (typeof newValue === 'object') {
                    handleEditPatientSelect(newValue);
                  } else {
                    setSelectedAppointment(prev => ({
                      ...prev,
                      phone_number: newValue || ""
                    }));
                  }
                }}
                freeSolo={true}
                size="small"
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Mobile"
                    onChange={(e) => {
                      const value = e.target.value;
                      setSelectedAppointment(prev => ({
                        ...prev,
                        phone_number: value
                      }));
                      handleEditMobileSearch(value);
                    }}
                    inputProps={{
                      ...params.inputProps,
                      maxLength: 10,
                      value: selectedAppointment.phone_number || "",
                      style: { fontSize: '0.85rem' }
                    }}
                    InputLabelProps={{ 
                      style: { fontSize: '0.85rem' } 
                    }}
                    InputProps={{
                      ...params.InputProps,
                      style: { fontSize: '0.85rem' },
                      endAdornment: (
                        <>
                          {isEditSearching ? "Searching..." : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                    size="small"
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props} style={{ fontSize: '0.85rem' }}>
                    <div>
                      <Typography variant="body2" style={{ fontSize: '0.85rem' }}>{option.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.phone_number}
                      </Typography>
                    </div>
                  </li>
                )}
              />
            </Box>

            <Box sx={{ 
              display: "grid", 
              gridTemplateColumns: { xs: "1fr 1fr", sm: "1fr" },
              gap: { xs: "8px", sm: "12px" }
            }}>
              <TextField
                fullWidth
                label="First Name"
                value={selectedAppointment.firstName || ""}
                onChange={(e) =>
                  setSelectedAppointment((prev) => ({
                    ...prev,
                    firstName: e.target.value,
                  }))
                }
                InputProps={{ style: { fontSize: '0.85rem' } }}
                InputLabelProps={{ style: { fontSize: '0.85rem' } }}
                size="small"
              />
              <TextField
                fullWidth
                label="Last Name"
                value={selectedAppointment.lastName || ""}
                onChange={(e) =>
                  setSelectedAppointment((prev) => ({
                    ...prev,
                    lastName: e.target.value,
                  }))
                }
                InputProps={{ style: { fontSize: '0.85rem' } }}
                InputLabelProps={{ style: { fontSize: '0.85rem' } }}
                size="small"
              />
            </Box>

            <Box sx={{ 
              display: "grid", 
              gridTemplateColumns: "1fr 1fr",
              gap: { xs: "8px", sm: "12px" },
              gridColumn: { xs: "1", sm: "span 2" }
            }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selectedAppointment.checkin}
                    onChange={(e) =>
                      setSelectedAppointment((prev) => ({
                        ...prev,
                        checkin: e.target.checked,
                      }))
                    }
                    size="small"
                  />
                }
                label={
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontWeight: selectedAppointment.checkin ? 'bold' : 'normal',
                      color: selectedAppointment.checkin ? 'primary.main' : 'text.primary',
                      fontSize: '0.85rem'
                    }}
                  >
                    Present
                  </Typography>
                }
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selectedAppointment.paid}
                    onChange={(e) => {
                      const isPaid = e.target.checked;
                      // Log the current values for debugging
                      console.log("Current payment values:", {
                        paid: selectedAppointment.paid,
                        mode: selectedAppointment.mode,
                        fees_paid: selectedAppointment.fees_paid
                      });
                      
                      setSelectedAppointment((prev) => ({
                        ...prev,
                        paid: isPaid,
                        // If becoming paid, keep existing values or set defaults
                        // If becoming unpaid, set mode to empty and fees to 0
                        mode: isPaid ? (prev.mode) : "",
                        fees_paid: isPaid ? prev.fees_paid : 0
                      }));
                    }}
                    size="small"
                  />
                }
                label={
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontWeight: selectedAppointment.paid ? 'bold' : 'normal',
                      color: selectedAppointment.paid ? 'primary.main' : 'text.primary',
                      fontSize: '0.85rem'
                    }}
                  >
                    Payment
                  </Typography>
                }
              />
            </Box>

            {selectedAppointment.paid && (
              <Box sx={{ 
                display: "grid", 
                gridTemplateColumns: "1fr 1fr",
                gap: { xs: "8px", sm: "12px" },
                gridColumn: { xs: "1", sm: "span 2" }
              }}>
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ fontSize: '0.85rem' }}>Mode</InputLabel>
                  <Select
                    value={selectedAppointment.mode || "cash"}
                    onChange={(e) =>
                      setSelectedAppointment((prev) => ({
                        ...prev,
                        mode: e.target.value,
                      }))
                    }
                    label="Payment Mode"
                    sx={{ fontSize: '0.85rem' }}
                  >
                    <MenuItem value="cash" sx={{ fontSize: '0.85rem' }}>Cash</MenuItem>
                    <MenuItem value="online" sx={{ fontSize: '0.85rem' }}>Online</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  label="Fees"
                  type="number"
                  value={selectedAppointment.fees_paid || 0}
                  onChange={(e) => {
                    // Ensure the value is treated as a number
                    const feesValue = e.target.value !== "" ? Number(e.target.value) : 0;
                    setSelectedAppointment((prev) => ({
                      ...prev,
                      fees_paid: feesValue,
                    }));
                  }}
                  InputProps={{ style: { fontSize: '0.85rem' } }}
                  InputLabelProps={{ style: { fontSize: '0.85rem' } }}
                  size="small"
                />
              </Box>
            )}

            <Box sx={{ 
              display: "grid", 
              gridTemplateColumns: "1fr 1fr",
              gap: { xs: "8px", sm: "12px" },
              gridColumn: { xs: "1", sm: "span 2" }
            }}>
              <TextField
                fullWidth
                label="Age"
                type="number"
                value={selectedAppointment.age || ""}
                onChange={(e) =>
                  setSelectedAppointment((prev) => ({
                    ...prev,
                    age: e.target.value,
                  }))
                }
                InputProps={{ style: { fontSize: '0.85rem' } }}
                InputLabelProps={{ style: { fontSize: '0.85rem' } }}
                size="small"
              />
              <FormControl component="fieldset">
                <ToggleButtonGroup
                  value={selectedAppointment.sex || ""}
                  exclusive
                  onChange={(_, newValue) =>
                    setSelectedAppointment((prev) => ({
                      ...prev,
                      sex: newValue || "",
                    }))
                  }
                  color="primary"
                  size="small"
                  sx={{ height: '36px' }}
                >
                  <ToggleButton value="M" color="primary" sx={{ fontSize: '0.75rem', py: 0 }}>
                    Male
                  </ToggleButton>
                  <ToggleButton value="F" color="secondary" sx={{ fontSize: '0.75rem', py: 0 }}>
                    Female
                  </ToggleButton>
                  <ToggleButton value="O" sx={{ fontSize: '0.75rem', py: 0 }}>
                    Other
                  </ToggleButton>
                </ToggleButtonGroup>
              </FormControl>
            </Box>

            <Box sx={{ 
              display: "grid", 
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: { xs: "8px", sm: "12px" },
              gridColumn: { xs: "1", sm: "span 2" }
            }}>
              <TextField
                fullWidth
                label="Guardian"
                value={selectedAppointment.guardian || ""}
                onChange={(e) =>
                  setSelectedAppointment((prev) => ({
                    ...prev,
                    guardian: e.target.value,
                  }))
                }
                InputProps={{ style: { fontSize: '0.85rem' } }}
                InputLabelProps={{ style: { fontSize: '0.85rem' } }}
                size="small"
              />
              <TextField
                fullWidth
                label="Place"
                value={selectedAppointment.location || ""}
                onChange={(e) =>
                  setSelectedAppointment((prev) => ({
                    ...prev,
                    location: e.target.value,
                  }))
                }
                InputProps={{ style: { fontSize: '0.85rem' } }}
                InputLabelProps={{ style: { fontSize: '0.85rem' } }}
                size="small"
              />
            </Box>

            <Box sx={{ 
              display: "grid", 
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: { xs: "8px", sm: "12px" },
              gridColumn: { xs: "1", sm: "span 2" }
            }}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ fontSize: '0.85rem' }}>Appointment Type</InputLabel>
                <Select
                  value={selectedAppointment.appointment_type || "New"}
                  onChange={(e) =>
                    setSelectedAppointment((prev) => ({
                      ...prev,
                      appointment_type: e.target.value,
                    }))
                  }
                  label="Appointment Type"
                  sx={{ fontSize: '0.85rem' }}
                >
                  <MenuItem value="New" sx={{ fontSize: '0.85rem' }}>New</MenuItem>
                  <MenuItem value="Follow-up" sx={{ fontSize: '0.85rem' }}>Follow-up</MenuItem>
                  <MenuItem value="Emergency" sx={{ fontSize: '0.85rem' }}>Emergency</MenuItem>
                  <MenuItem value="Routine" sx={{ fontSize: '0.85rem' }}>Routine</MenuItem>
                  <MenuItem value="Cancelled" sx={{ fontSize: '0.85rem' }}>Cancelled</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Complaint"
                value={selectedAppointment.disease || ""}
                onChange={(e) =>
                  setSelectedAppointment((prev) => ({
                    ...prev,
                    disease: e.target.value,
                  }))
                }
                InputProps={{ style: { fontSize: '0.85rem' } }}
                InputLabelProps={{ style: { fontSize: '0.85rem' } }}
                size="small"
              />
            </Box>
          </Box>
        )}
      </DialogContent>
      <Box sx={{ 
        mt: 2, 
        display: "flex", 
        justifyContent: "space-between",
        px: { xs: 0.5, sm: 1 }
      }}>
        <Button
          onClick={() => {
            setRowToCancel(selectedAppointment);
            setCancelConfirmationOpen(true);
          }}
          color="error"
          variant="outlined"
          sx={{ 
            borderWidth: "1px",
            fontSize: '0.75rem',
            py: 0.5,
            px: 1,
            minWidth: '36px',
            '&:hover': {
              borderWidth: "1px"
            }
          }}
          disabled={isCanceling}
          size="small"
        >
          {isCanceling ? <CircularProgress size={16} /> : "Cancel"}
        </Button>
        <Button
          variant="contained"
          onClick={handleEditSubmit}
          disabled={isUpdating}
          sx={{ 
            fontSize: '0.75rem',
            py: 0.5,
            px: 1.5,
            minWidth: '40px'
          }}
          size="small"
        >
          {isUpdating ? <CircularProgress size={16} /> : "Update"}
        </Button>
      </Box>
    </Dialog>
  );

  // Confirmation dialog for cancelling an appointment
  const renderCancelConfirmationDialog = () => (
    <Dialog 
      open={cancelConfirmationOpen} 
      onClose={() => setCancelConfirmationOpen(false)}
      PaperProps={{
        sx: {
          width: { xs: "90vw", sm: "85vw" },
          maxWidth: { xs: "90vw", sm: "85vw" },
          borderRadius: 2,
        }
      }}
    >
      <DialogTitle sx={{ fontSize: '1rem', pt: 2, pb: 1 }}>Confirm Cancellation</DialogTitle>
      <DialogContent sx={{ pt: 0, px: 2, pb: 1 }}>
        <Typography sx={{ fontSize: '0.85rem' }}>
          Are you sure you want to cancel this appointment for {rowToCancel?.patientName || rowToCancel?.firstName + ' ' + rowToCancel?.lastName}?
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 1.5 }}>
        <Button 
          onClick={() => setCancelConfirmationOpen(false)} 
          size="small"
          sx={{ fontSize: '0.75rem', minWidth: '36px', px: 1 }}
        >
          No
        </Button>
        <Button 
          onClick={handleCancelAppointment} 
          color="error" 
          autoFocus 
          size="small"
          sx={{ fontSize: '0.75rem', minWidth: '36px', px: 1 }}
        >
          Yes
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Box sx={{ 
      padding: { xs: '6px 0px 80px 0px', sm: 2 },
      width: '100%',
      maxWidth: '100%',
      overflowX: 'hidden'
    }}>

      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search patients..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        margin="normal"
        size="small"
        sx={{ px: { xs: 1.5, sm: 0 }, m: 0, width: "95%", height: "1rem", mt: 0 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
          style: { fontSize: '0.9rem' }
        }}
      />

      {loading ? (
        <Box sx={{ px: { xs: 1.5, sm: 0 }, mt: 2 }}>
          {/* Table-like skeleton structure that matches the real content */}
          <Paper sx={{ borderRadius: { xs: 0, sm: '4px' }, boxShadow: { xs: 'none', sm: 1 }, overflow: 'hidden' }}>
            {/* Table header skeleton */}
            <Box sx={{ 
              display: 'flex', 
              backgroundColor: '#f5f5f5', 
              borderBottom: '1px solid #e0e0e0',
              py: 1
            }}>
              <Box sx={{ width: '20%', px: { xs: 1, sm: 2 } }}>
                <Skeleton variant="text" width="70%" height={24} />
              </Box>
              <Box sx={{ width: '50%', px: { xs: 1, sm: 2 } }}>
                <Skeleton variant="text" width="60%" height={24} />
              </Box>
              <Box sx={{ width: '30%', px: { xs: 1, sm: 2 } }}>
                <Skeleton variant="text" width="80%" height={24} />
              </Box>
            </Box>

            {/* Table rows skeletons */}
            {[...Array(10)].map((_, index) => (
              <Box 
                key={index}
                sx={{ 
                  display: 'flex',
                  py: 1,
                  borderBottom: '1px solid #f0f0f0',
                  backgroundColor: index % 2 === 0 ? '#ffffff' : '#fafafa'
                }}
              >
                {/* Token number cell */}
                <Box sx={{ width: '20%', px: { xs: 1, sm: 2 } }}>
                  <Skeleton variant="text" width="40%" height={24} />
                </Box>
                
                {/* Patient name cell */}
                <Box sx={{ width: '50%', px: { xs: 1, sm: 2 } }}>
                  <Skeleton variant="text" width="85%" height={24} />
                </Box>
                
                {/* Status cell with multiple status indicators */}
                <Box sx={{ width: '30%', px: { xs: 1, sm: 2 }, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Skeleton variant="rectangular" width="70%" height={18} sx={{ borderRadius: '4px' }} />
                  <Skeleton variant="rectangular" width="60%" height={18} sx={{ borderRadius: '4px' }} />
                  {index % 3 === 0 && (
                    <Skeleton variant="rectangular" width="75%" height={18} sx={{ borderRadius: '4px' }} />
                  )}
                </Box>
              </Box>
            ))}
          </Paper>
        </Box>
      ) : error ? (
        <Typography color="error" align="center" sx={{ mt: 2 }}>
          {error}
        </Typography>
      ) : filteredAppointments.length === 0 ? (
        <Typography align="center" sx={{ mt: 2 }}>
          No appointments found
        </Typography>
      ) : (
        <TableContainer 
          component={Paper} 
          sx={{ 
            mt: 2,
            width: '100%',
            maxWidth: '100%',
            borderRadius: { xs: 0, sm: '4px' },
            boxShadow: { xs: 'none', sm: 1 }
          }}
        >
          <Table size="small" className="mobile-table">
            <TableHead>
              <TableRow>
                <TableCell sx={{ py: 1, px: { xs: 1, sm: 2 }, width: '20%' }}>Token</TableCell>
                <TableCell sx={{ py: 1, px: { xs: 1, sm: 2 }, width: '50%' }}>Patient</TableCell>
                <TableCell sx={{ py: 1, px: { xs: 1, sm: 2 }, width: '30%' }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAppointments.map((appointment) => (
                <TableRow 
                  key={appointment.token}
                  onClick={() => !appointment.isPlaceholder && handleEditClick(appointment)}
                  hover={!appointment.isPlaceholder}
                  sx={{ 
                    cursor: appointment.isPlaceholder ? 'default' : 'pointer',
                    backgroundColor: appointment.isPlaceholder ? '#f9f9f9' : 'inherit'
                  }}
                >
                  <TableCell sx={{ py: 1, px: { xs: 1, sm: 2 } }}>#{appointment.token}</TableCell>
                  <TableCell sx={{ py: 1, px: { xs: 1, sm: 2 } }}>
                    {appointment.isPlaceholder ? (
                      <Typography variant="body2" sx={{ color: '#999', fontStyle: 'italic' }}>
                        Empty Slot
                      </Typography>
                    ) : (
                      <Typography variant="body1">
                        {appointment.patientName}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ py: 1, px: { xs: 1, sm: 2 } }}>
                    {appointment.isPlaceholder ? (
                      <Typography variant="body2" sx={{ color: '#999', fontStyle: 'italic' }}>
                        Available
                      </Typography>
                    ) : (
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.3 }}>
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center',
                          backgroundColor: getStatusColor(appointment.status) === 'success' ? '#e7f7e7' : 
                                          getStatusColor(appointment.status) === 'error' ? '#ffeaea' : 
                                          getStatusColor(appointment.status) === 'info' ? '#e3f2fd' : '#f5f5f5',
                          borderRadius: '4px',
                          py: 0.2,
                          px: 0.5,
                          width: 'fit-content'
                        }}>
                          <Box sx={{ 
                            width: '6px', 
                            height: '6px', 
                            borderRadius: '50%',
                            mr: 0.5, 
                            backgroundColor: getStatusColor(appointment.status) === 'success' ? 'success.main' : 
                                            getStatusColor(appointment.status) === 'error' ? 'error.main' : 
                                            getStatusColor(appointment.status) === 'info' ? 'info.main' : 'grey.500',
                          }} />
                          <Typography sx={{ fontSize: '0.65rem', fontWeight: 500 }}>
                            {appointment.status === "done" || appointment.status === "done_checkup" ? "Completed" : 
                             appointment.status === "cancelled" ? "Cancelled" : "Pending"}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center',
                          backgroundColor: appointment.checkin ? '#e7f7e7' : '#f5f5f5',
                          borderRadius: '4px',
                          py: 0.2,
                          px: 0.5,
                          width: 'fit-content'
                        }}>
                          <Box sx={{ 
                            width: '6px', 
                            height: '6px', 
                            borderRadius: '50%',
                            mr: 0.5, 
                            backgroundColor: appointment.checkin ? 'success.main' : 'grey.400',
                          }} />
                          <Typography sx={{ fontSize: '0.65rem', fontWeight: 500 }}>
                            {appointment.checkin ? "Present" : "Absent"}
                          </Typography>
                        </Box>
                        
                        {appointment.paid && (
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            backgroundColor: '#e7f7e7',
                            borderRadius: '4px',
                            py: 0.2,
                            px: 0.5,
                            width: 'fit-content'
                          }}>
                            <Box sx={{ 
                              width: '6px', 
                              height: '6px', 
                              borderRadius: '50%',
                              mr: 0.5, 
                              backgroundColor: 'success.main',
                            }} />
                            <Typography sx={{ fontSize: '0.65rem', fontWeight: 500 }}>
                              Paid ({appointment.mode || 'cash'})
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Edit Modal */}
      {renderEditModal()}
      
      {/* Cancel Confirmation Dialog */}
      {renderCancelConfirmationDialog()}
    </Box>
  );
}
