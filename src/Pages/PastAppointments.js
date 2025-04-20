import * as React from "react";
import { useEffect, useState } from "react";
import "./PastAppointments.css";
import { DataGrid, GridToolbar, GridToolbarContainer, GridToolbarQuickFilter } from "@mui/x-data-grid";
import {
  Box,
  Typography,
  TextField,
  CircularProgress,
  Checkbox,
  Button,
  Alert,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  ToggleButtonGroup,
  ToggleButton,
  Autocomplete,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
// Import API functions
import { 
  fetchAppointments, 
  updateAppointmentDetails, 
  removeAppointment,
  getPatientProfile 
} from "../services/api";

import { useNavigate, useLocation } from "react-router-dom";
import { getCabinInfo } from "../utils/dateUtils";
import { useCheckupCabin } from "../context/CheckupCabinContext";

// Key for storing state in sessionStorage
const PAST_APPOINTMENTS_STATE_KEY = 'pastAppointmentsState';

// Custom toolbar component to match AppointmentTable.js
function CustomToolbar() {
  return (
    <GridToolbarContainer sx={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      p: 1
    }}>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <GridToolbarQuickFilter />
      </Box>
    </GridToolbarContainer>
  );
}

// Custom component for when there are no rows
const CustomNoRowsOverlay = () => (
  <div
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100%",
    }}
  >
    <Typography variant="h6">No past appointments found</Typography>
  </div>
);

export default function PastAppointments() {
  const { getCurrentCabinId, getCurrentCabinSlots } = useCheckupCabin();
  
  const cabinId = getCurrentCabinId();
  const cabinSlots = getCurrentCabinSlots();

  const navigate = useNavigate();
  const location = useLocation();

  // Initialize state from sessionStorage or defaults
  const [selectedDate, setSelectedDate] = useState(() => {
    const savedState = sessionStorage.getItem(PAST_APPOINTMENTS_STATE_KEY);
    if (savedState) {
      const parsedState = JSON.parse(savedState);
      return parsedState.selectedDate ? new Date(parsedState.selectedDate) : getUTCDateOnly();
    }
    return getUTCDateOnly();
  });
  
  const [searchQuery, setSearchQuery] = useState(() => {
    const savedState = sessionStorage.getItem(PAST_APPOINTMENTS_STATE_KEY);
    if (savedState) {
      const parsedState = JSON.parse(savedState);
      return parsedState.searchQuery || "";
    }
    return "";
  });
  
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [matchingSlots, setMatchingSlots] = useState([]);
  const [noSlots, setNoSlots] = useState(false);
  
  const [selectedSlot, setSelectedSlot] = useState(() => {
    const savedState = sessionStorage.getItem(PAST_APPOINTMENTS_STATE_KEY);
    if (savedState) {
      const parsedState = JSON.parse(savedState);
      return parsedState.selectedSlot || null;
    }
    return null;
  });

  // Edit modal states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [cancelConfirmationOpen, setCancelConfirmationOpen] = useState(false);
  const [rowToCancel, setRowToCancel] = useState(null);
  const [editMobileSearchResults, setEditMobileSearchResults] = useState([]);
  const [isEditSearching, setIsEditSearching] = useState(false);
  const [error, setError] = useState("");

  // Pagination model
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 25,
  });

  // Define columns to match AppointmentTable.js styling
  const columns = [
    {
      field: "token",
      headerName: "Token",
      width: 90,
      editable: false,
      renderCell: (params) => (
        <div
          style={{
            fontWeight: 600,
            color: "#1976d2",
          }}
        >
          #{params?.row?.token || ""}
        </div>
      ),
    },
    {
      field: "firstName",
      headerName: "First Name",
      width: 120,
      editable: false,
    },
    {
      field: "lastName",
      headerName: "Last Name",
      width: 120,
      editable: false,
    },
    {
      field: "age",
      headerName: "Age",
      width: 70,
      editable: false,
    },
    {
      field: "phone_number",
      headerName: "Mobile",
      width: 130,
      editable: false,
    },
    {
      field: "guardian",
      headerName: "Guardian",
      width: 150,
      editable: false,
    },
    {
      field: "location",
      headerName: "Place",
      width: 150,
      editable: false,
    },
    {
      field: "checkin",
      headerName: "Present-in-Clinic",
      width: 140,
      type: "boolean",
      editable: false,
      renderCell: (params) => <Checkbox checked={params?.value} disabled />,
    },
    {
      field: "paid",
      headerName: "Payment",
      width: 100,
      type: "boolean",
      editable: false,
      renderCell: (params) => <Checkbox checked={params?.value} disabled />,
    },
    {
      field: "mode",
      headerName: "Mode",
      width: 80,
      editable: false,
      renderCell: (params) => (
        <span style={{ textTransform: "capitalize" }}>{params.value}</span>
      ),
    },
    {
      field: "fees_paid",
      headerName: "Fees",
      width: 80,
      editable: false,
      type: "number",
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Button
          color="primary"
          variant="outlined"
          size="small"
          startIcon={<VisibilityIcon />}
          onClick={(e) => {
            e.stopPropagation(); // Prevent row click from triggering
            handleAppointmentClick(params.row);
          }}
          sx={{ fontSize: '0.75rem', py: 0.5 }}
        >
          Details
        </Button>
      ),
    },
  ];

  // Save state to sessionStorage whenever relevant state changes
  useEffect(() => {
    const stateToSave = {
      selectedDate: selectedDate ? selectedDate.toISOString() : null,
      selectedSlot,
      searchQuery
    };
    sessionStorage.setItem(PAST_APPOINTMENTS_STATE_KEY, JSON.stringify(stateToSave));
  }, [selectedDate, selectedSlot, searchQuery]);

  // First useEffect - Only find matching slots when the date changes
  useEffect(() => {
    // Fetch past appointments data
    const allCabinSlots = getCurrentCabinSlots();
    
    console.log("Available cabin slots:", allCabinSlots);
    
    // Format the selected date as YYYY-MM-DD in UTC
    // This ensures we're using the date in UTC time, not local time
    const year = selectedDate.getUTCFullYear();
    const month = String(selectedDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getUTCDate()).padStart(2, '0');
    const selectedDateString = `${year}-${month}-${day}`;
    
    console.log("Filtering for date:", selectedDateString);
    
    // Find matching slots for the selected date by comparing UTC dates
    // Include all slots for the selected date, both active and inactive
    const matchingCabinSlots = allCabinSlots.filter(slot => {
      // Extract the slot date string from the slot object or string
      const slotStr = typeof slot === 'string' ? slot : slot.slot;
      const slotDate = new Date(slotStr);
      const slotYear = slotDate.getUTCFullYear();
      const slotMonth = String(slotDate.getUTCMonth() + 1).padStart(2, '0');
      const slotDay = String(slotDate.getUTCDate()).padStart(2, '0');
      const slotDateString = `${slotYear}-${slotMonth}-${slotDay}`;
      
      console.log("Comparing slot date:", slotDateString, "with selected date:", selectedDateString);
      return slotDateString === selectedDateString;
    });
    
    console.log("Matching slots for date:", matchingCabinSlots);
    
    if (matchingCabinSlots.length === 0) {
      // If no slots available for this date
      setNoSlots(true);
      setMatchingSlots([]);
      setSelectedSlot(null);
      setRows([]);
      return;
    }
    
    // If slots are available
    setNoSlots(false);
    
    // Convert slot objects to slot strings for display and selection
    const slotStrings = matchingCabinSlots.map(slot => 
      typeof slot === 'string' ? slot : slot.slot
    );
    setMatchingSlots(slotStrings);
    
    // Always select the first matching slot
    setSelectedSlot(slotStrings[0]);
    
    // Now fetch the appointments directly
    getAppointments(slotStrings[0]);
    
  }, [selectedDate, cabinId]);

  // Handle date change
  const handleDateChange = (newDate) => {
    console.log("Date changed to:", newDate);
    setSelectedDate(newDate);
    
    // Save to session storage
    const currentState = sessionStorage.getItem(PAST_APPOINTMENTS_STATE_KEY);
    const parsedState = currentState ? JSON.parse(currentState) : {};
    sessionStorage.setItem(PAST_APPOINTMENTS_STATE_KEY, JSON.stringify({
      ...parsedState,
      selectedDate: newDate.toISOString()
    }));
    
    // The slots and data will be updated by the useEffect that depends on selectedDate
  };

  // Handle search query change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Handle slot selection
  const handleSlotClick = (slot) => {
    console.log("Slot clicked:", slot);
    setSelectedSlot(slot);
    
    // Save to session storage
    const currentState = sessionStorage.getItem(PAST_APPOINTMENTS_STATE_KEY);
    const parsedState = currentState ? JSON.parse(currentState) : {};
    sessionStorage.setItem(PAST_APPOINTMENTS_STATE_KEY, JSON.stringify({
      ...parsedState,
      selectedSlot: slot
    }));
    
    // Find if this is an inactive slot
    const allCabinSlots = getCurrentCabinSlots();
    const slotObj = allCabinSlots.find(s => (typeof s === 'string' ? s : s.slot) === slot);
    const isActive = typeof slotObj === 'string' ? true : (slotObj?.is_active ?? true);
    
    getAppointments(slot); // Fetch appointments for the selected slot
  };

  const handleRowClick = (params) => {
    // Open edit modal when row is clicked
    const appointmentData = {
      ...params.row,
      firstName: params.row.firstName || "",
      lastName: params.row.lastName || "",
      phone_number: params.row.phone_number || "",
      age: params.row.age || "",
      sex: params.row.sex || "",
      guardian: params.row.guardian || "",
      location: params.row.location || "",
      disease: params.row.disease || "",
      appointment_type: params.row.appointment_type || "New",
      mode: params.row.mode || "cash",
      fees_paid: params.row.fees_paid || 0
    };
    
    setSelectedAppointment(appointmentData);
    // setEditModalOpen(true);
    
    // Clear any previous search results
    setEditMobileSearchResults([]);
  };

  const getAppointments = async (dateTime) => {
    if (!cabinId || !dateTime) {
      console.log("Cannot fetch appointments - missing cabinId or dateTime:", { cabinId, dateTime });
      return;
    }
    
    setLoading(true);
    try {
      console.log("Fetching past appointments for cabin:", cabinId, "and slot:", dateTime);
      
      // Call the real API to fetch appointments
      const data = await fetchAppointments(cabinId, dateTime);
      console.log("Received appointment data:", data);
      
      if (data && data.length !== 0) {
        console.log("Received past appointments data:", data);
        
        const formattedData = data.map((item) => {
          const [firstName, ...lastNameParts] = item.name.split(" ");
          return {
            id: item.token,
            token: item.token,
            appointment_id: item.appointment_id,
            firstName: firstName || "",
            lastName: lastNameParts.join(" ") || "",
            checkin: item.checkin || false,
            paid: item.paid || false,
            status: item.status,
            disease: item.disease !== null ? item.disease : "",
            age: item.patient ? item.patient.age : "",
            phone_number: item.patient ? item.patient.phone_number : "",
            location: item.patient ? item.patient.location : "",
            sex: item.patient?.gender || "",
            guardian: item.patient ? item.patient.guardian : "",
            appointment_type:
              item.appointment_type?.charAt(0).toUpperCase() +
              item.appointment_type?.slice(1).toLowerCase(),
            mode: item.mode || "",
            fees_paid: item.fees_paid || 0,
            date: item.date || new Date(dateTime).toISOString().split('T')[0],
            time: item.time || new Date(dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            patientId: item.patient_id
          };
        });
        
        console.log("Formatted past appointments data:", formattedData);
        setRows(formattedData);
      } else {
        console.log("No past appointments data received or empty data array");
        setRows([]);
      }
    } catch (error) {
      console.error("Error fetching past appointments:", error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  // Summary calculations
  const totals = React.useMemo(
    () => ({
      totalCollection: rows.reduce((sum, row) => sum + (row.fees_paid || 0), 0),
      totalPatients: rows.length,
      totalCheckedIn: rows.filter((row) => row.checkin).length,
      totalPending: rows.filter((row) => row.status === "pending").length,
      totalCompleted: rows.filter((row) => row.status === "done_checkup")
        .length,
      cashTotal: rows
        .filter((row) => row.mode === "cash")
        .reduce((sum, row) => sum + (row.fees_paid || 0), 0),
      onlineTotal: rows
        .filter((row) => row.mode === "online")
        .reduce((sum, row) => sum + (row.fees_paid || 0), 0),
    }),
    [rows]
  );

  // Helper function to map API status to human-readable status
  const mapStatusToReadable = (status) => {
    switch(status) {
      case 'pending': return 'Pending';
      case 'done_checkup': return 'Completed';
      case 'cancelled': return 'Cancelled';
      case 'late': return 'Late';
      default: return status;
    }
  };

  // Edit Modal functions
  const handleEditModalClose = () => {
    setEditModalOpen(false);
    setSelectedAppointment(null);
    setError("");
  };

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

  const handleEditPatientSelect = (patient) => {
    if (patient) {
      setSelectedAppointment(prev => ({
        ...prev,
        phone_number: patient.phone_number,
        firstName: patient.name.split(" ")[0] || "",
        lastName: patient.name.split(" ").slice(1).join(" ") || "",
        age: patient.age || "",
        sex: patient.gender || "",
        location: patient.location || "",
        guardian: patient.guardian || "",
      }));
      setEditMobileSearchResults([]);
    }
  };

  const handleConfirmEdit = async () => {
    if (!selectedAppointment) return;
    
    // Prepare data for update
    setIsUpdating(true);
    try {
      const updateData = {
        token: selectedAppointment.token,
        appointment_id: selectedAppointment.appointment_id,
        name: `${selectedAppointment.firstName} ${selectedAppointment.lastName}`.trim().toUpperCase(),
        checkin: selectedAppointment.checkin,
        paid: selectedAppointment.paid,
        status: selectedAppointment.status,
        disease: selectedAppointment.disease,
        age: selectedAppointment.age,
        phone_number: selectedAppointment.phone_number,
        location: selectedAppointment.location,
        gender: selectedAppointment.sex || null,
        guardian: `${selectedAppointment.guardian}`.toUpperCase(),
        appointment_type: selectedAppointment.appointment_type,
        mode: selectedAppointment.mode || "",
        fees_paid: selectedAppointment.fees_paid || 0,
      };
      
      await updateAppointmentDetails(updateData);      
      
      // Refresh the appointment list to reflect changes
      getAppointments(selectedSlot);
      
      // Close the modal
      handleEditModalClose();
    } catch (error) {
      console.error("Error updating appointment:", error);
      setError("Failed to update appointment: " + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const cancelAppointment = async () => {
    if (!rowToCancel) return;
    
    setIsCanceling(true);
    try {
      await removeAppointment({
        appointment_id: rowToCancel.appointment_id
      });      
      
      // Refresh the appointment list
      getAppointments(selectedSlot);
      
      // Close the dialog
      setCancelConfirmationOpen(false);
      setEditModalOpen(false);
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      setError("Failed to cancel appointment: " + error.message);
    } finally {
      setIsCanceling(false);
    }
  };

  // Function to handle clicking on an appointment (Details button)
  const handleAppointmentClick = (appointment) => {
    console.log('Handling appointment click:', appointment);
    
    // Pass only the minimal information needed - just like AppointmentTable.js
    // The rest will be fetched from the API in the AppointmentDetails component
    const appointmentInfo = {
      id: appointment.appointment_id,
      status: mapStatusToReadable(appointment.status),
      patientId: appointment.patientId
    };
    
    // Navigate to the appointment details page with minimal info
    navigate('/appointment-details', { 
      state: { 
        appointmentInfo,
        from: 'appointment-table', // Use 'appointment-table' to trigger API fetch
        fromPastAppointments: true
      } 
    });
  };

  // Render edit modal
  const renderEditModal = () => (
    <Dialog
      open={editModalOpen}
      onClose={handleEditModalClose}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          width: "600px",
          maxWidth: "90vw",
          borderRadius: 2,
          p: 3,
        }
      }}
    >
      <DialogTitle sx={{ position: "relative", pr: 6, p: 0, mb: 2 }}>
        <Typography component="div" variant="h5">Edit Appointment</Typography>
        <IconButton
          aria-label="close"
          onClick={handleEditModalClose}
          sx={{
            position: "absolute",
            right: 0,
            top: 0,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 0, pt: 1 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {selectedAppointment && (
          <div
            style={{
              display: "grid",
              gap: "16px",
              gridTemplateColumns: "1fr 1fr",
              paddingTop: "8px"
            }}
          >
            <TextField
              fullWidth
              label="Token Number"
              type="number"
              disabled = {true}
              value={selectedAppointment.token}
              InputProps={{ readOnly: true }}
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
                    value: selectedAppointment.phone_number || ""
                  }}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {isEditSearching ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              renderOption={(props, option) => (
                <li {...props}>
                  <div>
                    <Typography variant="body1">{option.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {option.phone_number}
                    </Typography>
                  </div>
                </li>
              )}
            />
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
            />
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
                />
              }
              label={
                <Typography 
                  variant="body1" 
                  sx={{ 
                    fontWeight: selectedAppointment.checkin ? 'bold' : 'normal',
                    color: selectedAppointment.checkin ? 'primary.main' : 'text.primary'
                  }}
                >
                  Present in Clinic
                </Typography>
              }
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={selectedAppointment.paid}
                  onChange={(e) =>
                    setSelectedAppointment((prev) => ({
                      ...prev,
                      paid: e.target.checked,
                      mode: e.target.checked ? prev.mode || "cash" : "",
                      fees_paid: e.target.checked ? prev.fees_paid || 250 : 0,
                    }))
                  }
                />
              }
              label={
                <Typography 
                  variant="body1" 
                  sx={{ 
                    fontWeight: selectedAppointment.paid ? 'bold' : 'normal',
                    color: selectedAppointment.paid ? 'primary.main' : 'text.primary'
                  }}
                >
                  Payment Done
                </Typography>
              }
            />
            {selectedAppointment.paid && (
              <>
                <FormControl fullWidth>
                  <InputLabel>Payment Mode</InputLabel>
                  <Select
                    value={selectedAppointment.mode || "cash"}
                    onChange={(e) =>
                      setSelectedAppointment((prev) => ({
                        ...prev,
                        mode: e.target.value,
                      }))
                    }
                    label="Payment Mode"
                  >
                    <MenuItem value="cash">Cash</MenuItem>
                    <MenuItem value="online">Online</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  label="Fees"
                  type="number"
                  value={selectedAppointment.fees_paid || 0}
                  onChange={(e) =>
                    setSelectedAppointment((prev) => ({
                      ...prev,
                      fees_paid: Number(e.target.value),
                    }))
                  }
                />
              </>
            )}
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
              fullWidth
              label="Guardian"
              value={selectedAppointment.guardian || ""}
              onChange={(e) =>
                setSelectedAppointment((prev) => ({
                  ...prev,
                  guardian: e.target.value,
                }))
              }
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
            />
            <FormControl fullWidth>
              <InputLabel>Appointment Type</InputLabel>
              <Select
                value={selectedAppointment.appointment_type || "New"}
                onChange={(e) =>
                  setSelectedAppointment((prev) => ({
                    ...prev,
                    appointment_type: e.target.value,
                  }))
                }
                label="Appointment Type"
              >
                <MenuItem value="New">New</MenuItem>
                <MenuItem value="Follow-up">Follow-up</MenuItem>
                <MenuItem value="Emergency">Emergency</MenuItem>
                <MenuItem value="Routine">Routine</MenuItem>
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
            />
          </div>
        )}
      </DialogContent>
      <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
        <Button
          onClick={() => {
            setRowToCancel(selectedAppointment);
            setCancelConfirmationOpen(true);
          }}
          color="error"
          variant="outlined"
          sx={{ 
            mr: 2,
            borderWidth: "2px",
            '&:hover': {
              borderWidth: "2px"
            }
          }}
          disabled={isCanceling}
        >
          {isCanceling ? <CircularProgress size={24} /> : "Cancel Appointment"}
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirmEdit}
          disabled={isUpdating}
        >
          {isUpdating ? <CircularProgress size={24} /> : "Update"}
        </Button>
      </Box>
    </Dialog>
  );

  // Render cancel confirmation dialog
  const renderCancelConfirmationDialog = () => (
    <Dialog
      open={cancelConfirmationOpen}
      onClose={() => setCancelConfirmationOpen(false)}
    >
      <DialogTitle>Cancel Appointment</DialogTitle>
      <DialogContent>
        <Typography>
          Are you sure you want to cancel this appointment?
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setCancelConfirmationOpen(false)}>No</Button>
        <Button
          onClick={cancelAppointment}
          color="primary"
          variant="contained"
          disabled={isCanceling}
        >
          {isCanceling ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            "Yes"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Helper function to create a Date object with only the date part in UTC
  function getUTCDateOnly() {
    const now = new Date();
    // Subtract one day to get yesterday's date
    now.setDate(now.getDate() - 1);
    return new Date(Date.UTC(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ));
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <div
        style={{
          height: "90vh",
          width: "96%",
          margin: "0 auto",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header with Title, Stats, Search, and Date Picker */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            mb: 3,
            gap: 2,
          }}
        >
          {/* Title and Stats - Left Side */}
          <Box>
            <Typography variant="h5" sx={{ mb: 2 }}>
              Past Appointments
            </Typography>
            <Box
              sx={{
                display: "flex",
                gap: 4,
              }}
            >
              <Box>
                <Typography variant="subtitle2" color="textSecondary">
                  Total Patients
                </Typography>
                <Typography variant="h6">{totals.totalPatients}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">
                  Completed
                </Typography>
                <Typography variant="h6">{totals.totalCompleted}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">
                  Total Collection
                </Typography>
                <Typography variant="h6">₹{totals.totalCollection}</Typography>
              </Box>
            </Box>
          </Box>

          {/* Date Picker - Right Side */}
          <Box
            sx={{
              display: "flex",
              gap: 2,
              alignItems: "center",
              justifyContent: "flex-end",
            }}
          >
            <DatePicker
              label="Select Date"
              value={selectedDate}
              onChange={(newDate) => {
                // Ensure we're using UTC date
                const utcDate = new Date(Date.UTC(
                  newDate.getFullYear(),
                  newDate.getMonth(),
                  newDate.getDate()
                ));
                handleDateChange(utcDate);
              }}
              maxDate={(() => {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                return yesterday;
              })()}
              slotProps={{ 
                textField: { 
                  size: 'small', 
                  sx: { width: 200 }
                }
              }}
              // Use date-fns compatible format
              format="dd/MM/yyyy"
            />
            {loading && <CircularProgress size={24} />}
          </Box>
          
          {/* Slot selector */}
          {matchingSlots.length > 0 && (
            <Box sx={{ mb: 2, display: "flex", gap: 2, width: '100%' }}>
              {matchingSlots.map((slot, index) => {
                // Format the time for display
                const slotDate = new Date(slot);
                // Adjust to display in UTC time instead of local time
                const timeStr = new Date(slotDate.getTime()).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  timeZone: 'UTC'  // Force UTC timezone
                });
                
                // Find the corresponding slot object to check its is_active status
                const allCabinSlots = getCurrentCabinSlots();
                const slotObj = allCabinSlots.find(s => (typeof s === 'string' ? s : s.slot) === slot);
                const isActive = typeof slotObj === 'string' ? true : (slotObj?.is_active ?? true);
                
                return (
                  <Button
                    key={slot}
                    variant={selectedSlot === slot ? "contained" : "outlined"}
                    onClick={() => handleSlotClick(slot)}
                    sx={{
                      position: 'relative',
                      '&::after': {
                        position: 'absolute',
                        top: '-8px',
                        right: '-8px',
                        fontSize: '0.6rem',
                        fontWeight: 'bold',
                        display: isActive ? 'none' : 'block'
                      }
                    }}
                  >
                    {timeStr}
                  </Button>
                );
              })}
            </Box>
          )}
        </Box>

        {/* No Slots Message */}
        {noSlots && (
          <Alert severity="info" sx={{ mb: 3 }}>
            This date has no slots available.
          </Alert>
        )}

        {/* DataGrid */}
        <div style={{ flexGrow: 1, width: "100%" }}>
          <DataGrid
            rows={rows}
            columns={columns}
            slots={{ 
              toolbar: CustomToolbar,
              noRowsOverlay: CustomNoRowsOverlay
            }}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[10, 25, 50]}
            checkboxSelection={false}
            disableRowSelectionOnClick
            onRowClick={handleRowClick}
            loading={loading}
            sortModel={[{ field: "token", sort: "asc" }]}
            sx={{
              "& .MuiDataGrid-columnHeaders": {
                backgroundColor: "#f5f5f5",
                borderBottom: "2px solid #e0e0e0",
                fontWeight: "bold",
                fontSize: "0.875rem",
              },
              "& .MuiDataGrid-cell:focus": { outline: "none" },
              "& .MuiDataGrid-columnHeader:focus": { outline: "none" },
              "& .MuiDataGrid-cell": {
                borderBottom: "1px solid #f0f0f0",
                whiteSpace: "normal !important",
                wordWrap: "break-word",
                cursor: "pointer",
              },
              "& .MuiDataGrid-columnHeader": {
                maxWidth: "100% !important",
              },
              "& .MuiDataGrid-row": {
                maxWidth: "100% !important",
              },
            }}
          />
        </div>

        {/* Edit Modal */}
        {renderEditModal()}

        {/* Cancel Confirmation Dialog */}
        {renderCancelConfirmationDialog()}
      </div>
    </LocalizationProvider>
  );
}
