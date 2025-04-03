import React, { useEffect, useState, useRef } from "react";
import "./AppointmentTable.css";
import { DataGrid, GridToolbar, GridToolbarContainer, GridToolbarQuickFilter } from "@mui/x-data-grid";
import {
  Button,
  Modal,
  Box,
  TextField,
  Alert,
  Typography,
  FormControlLabel,
  Checkbox,
  ToggleButtonGroup,
  ToggleButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  CircularProgress,
  Autocomplete,
  IconButton,
  Chip,
  Tooltip,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import {
  addAppointment,
  updateAppointmentDetails,
  removeAppointment,
  getPatientProfile,
  createSlot,
  fetchAppointments
} from "../services/api";
import { useNotification } from "../context/NotificationContext";
import { getCabinInfoFromUser } from '../utils/dateUtils';
import { useNavigate, useLocation } from "react-router-dom";
import webSocketService from "../services/websocketService";
import { useAppointmentForm } from "../context/AppointmentFormContext";

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

const CustomNoRowsOverlay = () => (
  <div
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100%",
    }}
  >
    <Typography variant="h6">Currently no patients</Typography>
  </div>
);

function generateDisplayRows(actualRows) {
  if (actualRows.length === 0) return [];

  const tokens = actualRows.map((row) => row.token);
  const minToken = Math.min(...tokens);
  const maxToken = Math.max(...tokens);

  const allTokens = Array.from(
    { length: maxToken - minToken + 1 },
    (_, i) => minToken + i
  );

  const tokenMap = new Map(actualRows.map((row) => [row.token, row]));

  return allTokens.map((token) => {
    const existing = tokenMap.get(token);
    return (
      existing || {
        id: token,
        token: token,
        appointment_id: "",
        firstName: "",
        lastName: "",
        checkin: false,
        paid: false,
        status: "",
        disease: "",
        age: "",
        phone_number: "",
        location: "",
        sex: "",
        guardian: "",
        appointment_type: "",
        isPlaceholder: true,
      }
    );
  });
}

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

// Update the custom toolbar component before the AppointmentTable component
function CustomToolbar(props) {
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

export default function AppointmentTable() {
  const user = JSON.parse(localStorage.getItem("user"));
  const { cabinId, selectedSlot } = getCabinInfoFromUser(user);
  const [currentCabinSlot, setCurrentCabinSlot] = useState(null);

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState("");
  const [newAppointment, setNewAppointment] = React.useState({
    id: "",
    token: "",
    appointment_id: "",
    firstName: "",
    lastName: "",
    checkin: false,
    paid: false,
    mode: "cash",
    fees_paid: 0,
    status: "pending",
    disease: "",
    age: "",
    phone_number: "",
    location: "",
    sex: "",
    guardian: "",
    appointment_type: "New",
  });

  const [showCollectionDetails, setShowCollectionDetails] =
    React.useState(false);

  const totalCollection = React.useMemo(
    () =>
      appointments
        .reduce((sum, row) => sum + (row.fees_paid || 0), 0),
    [appointments]
  );

  const [totalPatients, setTotalPatients] = useState(0);

  const totalCheckedIn = React.useMemo(
    () => appointments.filter((row) => row.checkin && !row.isPlaceholder).length,
    [appointments]
  );

  const totalPending = React.useMemo(
    () =>
      appointments.filter((row) => row.status === "pending" && !row.isPlaceholder)
        .length,
    [appointments]
  );

  const totalCompleted = React.useMemo(
    () =>
      appointments.filter((row) => row.status === "done_checkup" && !row.isPlaceholder)
        .length,
    [appointments]
  );

  const cashTotal = React.useMemo(
    () =>
      appointments
        .filter((row) => row.paid && row.mode === "cash")
        .reduce((sum, row) => sum + (row.fees_paid || 0), 0),
    [appointments]
  );

  const onlineTotal = React.useMemo(
    () =>
      appointments
        .filter((row) => row.paid && row.mode === "online")
        .reduce((sum, row) => sum + (row.fees_paid || 0), 0),
    [appointments]
  );

  const genderOptions = [
    { value: "M", label: "Male" },
    { value: "F", label: "Female" },
    { value: "O", label: "Other" },
  ];

  const [suggestedToken, setSuggestedToken] = React.useState();
  const [editConfirmationOpen, setEditConfirmationOpen] = React.useState(false);
  const [pendingRow, setPendingRow] = React.useState(null);
  const [originalRow, setOriginalRow] = React.useState(null);
  const [cancelConfirmationOpen, setCancelConfirmationOpen] =
    React.useState(false);
  const [rowToCancel, setRowToCancel] = React.useState(null);

  const [isUpdating, setIsUpdating] = React.useState(false);
  const [isCanceling, setIsCanceling] = React.useState(false);

  const [paginationModel, setPaginationModel] = React.useState({
    page: 0,
    pageSize: 50,
  });

  const { showSuccessSnackbar, showErrorSnackbar } = useNotification();

  const [mobileSearchResults, setMobileSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const location = useLocation();
  const { openAppointmentForm } = useAppointmentForm();

  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [selectedAppointment, setSelectedAppointment] = React.useState(null);
  const [editMobileSearchResults, setEditMobileSearchResults] = useState([]);
  const [isEditSearching, setIsEditSearching] = useState(false);
  
  const [rows, setRows] = useState([]);
  
  const navigate = useNavigate();
  
  const [endSlotModalOpen, setEndSlotModalOpen] = useState(false);
  const [newSlotData, setNewSlotData] = useState({
    datetime: ''
  });
  const [isCreatingSlot, setIsCreatingSlot] = useState(false);
  
  const getAppointments = async () => {
    if (!cabinId || !selectedSlot) return;
    
    console.log(`Fetching appointments for cabin ${cabinId} and slot ${selectedSlot}`);
    setLoading(true);
    
    try {
      const fetchedAppointments = await fetchAppointments(cabinId, selectedSlot);
      console.log(`Fetched ${fetchedAppointments.length} appointments`);
      const formattedAppointments = fetchedAppointments.map(apt => {
        return {
          ...apt,
          id: apt.appointment_id || apt.token || Math.random().toString(36).substr(2, 9)
        };
      });
      setAppointments(formattedAppointments);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      showErrorSnackbar(
        "Failed to fetch appointments. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (cabinId && selectedSlot && !loading && appointments.length === 0) {
      getAppointments();
    }
  }, [cabinId, selectedSlot, loading, appointments.length]);

  // Setup WebSocket subscription for real-time updates
  useEffect(() => {
    if (!cabinId || !selectedSlot) return;

    console.log("Setting up WebSocket subscription for appointments");
    
    // Subscribe to appointment updates
    const unsubscribe = webSocketService.subscribe('appointment', (response) => {
      console.log("Received appointment update via WebSocket:", response);
      
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
          console.log("Processing appointment update:", appointmentData);
          
          // Update rows state
          setRows((prevRows) => {
            // Handle null patient data safely
            const patientData = appointmentData.patient || {};
            
            // Check if name exists before splitting
            const name = appointmentData.patient_name || appointmentData.name || '';
            const nameParts = name.split(' ');
            
            const formattedAppointment = {
              id: appointmentData.appointment_id || appointmentData.token || Math.random().toString(36).substr(2, 9),
              token: appointmentData.token || "",
              appointment_id: appointmentData.appointment_id,
              firstName: nameParts[0] || "",
              lastName: nameParts.length > 1 ? nameParts.slice(1).join(' ') : "",
              checkin: appointmentData.checkin || false,
              paid: appointmentData.paid || false,
              status: appointmentData.status || "pending",
              disease: appointmentData.disease || "",
              age: patientData.age || "",
              phone_number: patientData.phone_number || "",
              location: patientData.location || "",
              sex: patientData.gender || "",
              guardian: patientData.guardian || "",
              appointment_type: appointmentData.appointment_type || "New",
              mode: appointmentData.mode || "",
              fees_paid: appointmentData.fees_paid || 0,
            };

            const existingIndex = prevRows.findIndex(
              (r) => r.appointment_id === appointmentData.appointment_id
            );

            if (existingIndex !== -1) {
              const newRows = [...prevRows];
              newRows[existingIndex] = formattedAppointment;
              return newRows;
            }

            return [...prevRows, formattedAppointment].sort(
              (a, b) => (a.token || 0) - (b.token || 0)
            );
          });
          
          // Also update the appointments state
          setAppointments(prevAppointments => {
            const existingIndex = prevAppointments.findIndex(
              a => a.appointment_id === appointmentData.appointment_id
            );
            
            if (existingIndex !== -1) {
              const newAppointments = [...prevAppointments];
              newAppointments[existingIndex] = {
                ...newAppointments[existingIndex],
                ...appointmentData
              };
              return newAppointments;
            }
            
            return [...prevAppointments, appointmentData];
          });
        }
      } catch (error) {
        console.error("Error processing WebSocket appointment data:", error);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [cabinId, selectedSlot]);

  useEffect(() => {
    if (appointments && appointments.length > 0) {
      const mappedRows = appointments.map(appointment => {
        const patientName = appointment.patient_name || appointment.name || '';
        const nameParts = patientName.split(' ');
        
        return {
          id: appointment.appointment_id || appointment.token,
          token: appointment.token || "",
          appointment_id: appointment.appointment_id,
          firstName: nameParts[0] || "",
          lastName: nameParts.length > 1 ? nameParts.slice(1).join(' ') : "",
          checkin: appointment.checkin || false,
          paid: appointment.paid || false,
          mode: appointment.payment_mode || appointment.mode || '-',
          fees_paid: appointment.fees_paid || 0,
          status: appointment.status || "pending",
          disease: appointment.disease || "",
          age: appointment.age || (appointment.patient?.age) || "",
          phone_number: appointment.phone_number || (appointment.patient?.phone_number) || "",
          location: appointment.location || (appointment.patient?.location) || "",
          sex: appointment.sex || (appointment.patient?.gender) || "",
          guardian: appointment.guardian_name || (appointment.patient?.guardian) || "",
          appointment_type: appointment.appointment_type ,
          isPlaceholder: false,
        };
      });
      
      console.log("Mapped rows:", mappedRows);
      setRows(mappedRows);
      setTotalPatients(mappedRows.length);
    } else {
      setRows([]);
      setTotalPatients(0);
    }
  }, [appointments]);

  const handleOpen = () => {
    const maxToken = appointments.length > 0 ? Math.max(...appointments.map((r) => r.token)) : 0;
    const nextToken = maxToken + 1;
    
    setNewAppointment(prev => ({
      ...prev,
      token: nextToken.toString()
    }));
    
    setOpen(true);
  };

  const handleClose = () => {
    resetForm();
    setOpen(false);
  };

  const resetForm = () => {
    setNewAppointment({
      id: "",
      token: "",
      appointment_id: "",
      firstName: "",
      lastName: "",
      checkin: false,
      paid: false,
      mode: "cash",
      fee_paids: 0,
      status: "pending",
      disease: "",
      age: "",
      phone_number: "",
      location: "",
      sex: "",
      guardian: "",
      appointment_type: "New",
    });
  };

  const columns = [
    {
      field: "token",
      headerName: "Token",
      width: 90,
      editable: false,
      renderCell: (params) => (
        <div
          style={{
            fontWeight: params.row.isPlaceholder ? 300 : 600,
            color: params.row.isPlaceholder ? "#666" : "#1976d2",
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
      renderCell: (params) =>
        params.row.isPlaceholder ? (
          <span style={{ color: "#666", fontStyle: "italic" }}>Empty Slot</span>
        ) : (
          <span>{params.value || ""}</span>
        ),
    },
    {
      field: "lastName",
      headerName: "Last Name",
      width: 120,
      editable: false,
      renderCell: (params) =>
        params.row.isPlaceholder ? (
          <span style={{ color: "#666", fontStyle: "italic" }}>Empty Slot</span>
        ) : (
          <span>{params.value || ""}</span>
        ),
    },
    {
      field: "age",
      headerName: "Age",
      width: 70,
      editable: false,
      renderCell: (params) =>
        params.row.isPlaceholder ? (
          <span style={{ color: "#999", fontStyle: "italic" }}></span>
        ) : (
          params.value
        ),
    },
    {
      field: "phone_number",
      headerName: "Mobile",
      width: 130,
      editable: false,
      renderCell: (params) =>
        params.row.isPlaceholder ? (
          <span style={{ color: "#999", fontStyle: "italic" }}></span>
        ) : (
          params.value
        ),
    },
    {
      field: "guardian",
      headerName: "Guardian",
      width: 150,
      editable: false,
      renderCell: (params) =>
        params.row.isPlaceholder ? (
          <span style={{ color: "#999", fontStyle: "italic" }}></span>
        ) : (
          params.value
        ),
    },
    {
      field: "location",
      headerName: "Place",
      width: 150,
      editable: false,
      renderCell: (params) =>
        params.row.isPlaceholder ? (
          <span style={{ color: "#999", fontStyle: "italic" }}></span>
        ) : (
          params.value
        ),
    },
    {
      field: "checkin",
      headerName: "Present-in-Clinic",
      width: 140,
      type: "boolean",
      editable: false,
      renderCell: (params) =>
        params.row.isPlaceholder ? (
          <span style={{ color: "#999", fontStyle: "italic" }}></span>
        ) : (
          <Checkbox checked={params?.value} disabled />
        ),
    },
    {
      field: "paid",
      headerName: "Payment",
      width: 100,
      type: "boolean",
      editable: false,
      renderCell: (params) =>
        params.row.isPlaceholder ? (
          <span style={{ color: "#999", fontStyle: "italic" }}></span>
        ) : (
          <Checkbox checked={params?.value} disabled />
        ),
    },
    {
      field: "mode",
      headerName: "Mode",
      width: 80,
      editable: false,
      renderCell: (params) =>
        params.row.isPlaceholder ? (
          <span style={{ color: "#999", fontStyle: "italic" }}></span>
        ) : (
          <span style={{ textTransform: "capitalize" }}>{params.value}</span>
        ),
    },
    {
      field: "fees_paid",
      headerName: "Fees",
      width: 80,
      editable: false,
      type: "number",
      renderCell: (params) => (params.row.isPlaceholder ? "" : params.value),
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 120,
      sortable: false,
      renderCell: (params) => 
        params.row.isPlaceholder ? (
          <span style={{ color: "#999", fontStyle: "italic" }}></span>
        ) : (
          <Button
            color="primary"
            variant="outlined"
            size="small"
            startIcon={<VisibilityIcon />}
            onClick={(e) => {
              e.stopPropagation();
              handleAppointmentClick(params.row);
            }}
            sx={{ fontSize: '0.75rem', py: 0.5 }}
          >
            Details
          </Button>
        ),
    },
  ];

  const handleRowClick = (params) => {
    if (params.row.isPlaceholder) return;
    
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
      appointment_type: params.row.appointment_type ,
      mode: params.row.mode ,
      fees_paid: params.row.fees_paid 
    };
    
    setSelectedAppointment(appointmentData);
    setEditModalOpen(true);
    
    setEditMobileSearchResults([]);
  };

  const handleEditModalClose = () => {
    setEditModalOpen(false);
    setSelectedAppointment(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "phone_number" && value.length > 10) {
      return;
    }

    setNewAppointment((prev) => ({ ...prev, [name]: value }));
  };

  const handleSexChange = (event, newSex) => {
    if (newSex !== null) {
      setNewAppointment((prev) => ({ ...prev, sex: newSex }));
    }
  };

  const validateToken = (token) => {
    return !appointments.some((row) => row.token === parseInt(token));
  };

  const AddAppointmentApi = async (newEntry) => {
    setIsAdding(true);
    console.log(newEntry);
    try {
      const result = await addAppointment({
        cabinId: cabinId,
        slot: selectedSlot,
        name: newEntry.name,
        token: newEntry.token,
        disease: newEntry.disease,
        appointment_type: newEntry.appointment_type,
        phone_number: newEntry.phone_number,
        age: newEntry.age,
        gender: newEntry.sex,
        location: newEntry.location,
        guardian: newEntry.guardian,
        fees_paid: newEntry.fees_paid || 0,
        mode: newEntry.mode,
        paid: newEntry.paid,
        checkin: newEntry.checkin
      });
      
      const newAppointment = {
        id: result?.queue?.appointment?.token ,
        token: result?.queue?.appointment?.token ,
        appointment_id: result?.queue?.appointment?.appointment_id || "",
        firstName: result?.queue?.appointment?.name?.split(" ")[0] || "",
        lastName: result?.queue?.appointment?.name?.split(" ").slice(1).join(" ") || "",
        checkin: result?.queue?.checkin || false,
        paid: result?.queue?.paid || false,
        status: result?.queue?.status || "",
        disease: result?.queue?.appointment?.disease || "",
        age: newEntry.age,
        phone_number: newEntry.phone_number,
        location: newEntry.location,
        sex: newEntry.sex,
        guardian: newEntry.guardian,
        appointment_type: result?.queue?.appointment?.appointment_type || "",
        mode: result?.queue?.appointment?.mode,
        fees_paid: result?.queue?.appointment?.fees_paid || 0,
      };
      
      setAppointments((prev) => [...prev, newAppointment].sort((a, b) => a.token - b.token));
      
      if (newEntry.phone_number) {
        showSuccessSnackbar("Appointment added successfully and patient profile created with past prescriptions. Patient added to queue with token " + newEntry.token);
        
        window.dispatchEvent(new CustomEvent('refreshQueue'));
      } else {
        showSuccessSnackbar("Appointment added successfully");
      }
      
      handleClose();
    } catch (error) {
      console.error("Error adding appointment:", error);
      setError("Failed to add appointment");
    } finally {
      setIsAdding(false);
    }
  };

  const updateAppointmentApi = async (newData) => {
    setIsUpdating(true);
    try {
      await updateAppointmentDetails(newData);      
      
      showSuccessSnackbar("Appointment updated successfully");
      setEditModalOpen(false);
      return { success: true };
    } catch (error) {
      console.error("Error updating appointment:", error);
      return { success: false, error: "Failed to update appointment" };
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddAppointment = () => {
    const trimmedFirstName = newAppointment.firstName.trim();
    const trimmedLastName = newAppointment.lastName.trim();

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
    if (
      newAppointment.phone_number &&
      (!/^\d+$/.test(newAppointment.phone_number) || newAppointment.phone_number.length > 10)
    ) {
      setError("Invalid mobile number (maximum 10 digits, numbers only)");
      return;
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

  const handleConfirmEdit = async () => {
    if (!selectedAppointment) return;
    
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
    const result = await updateAppointmentApi(updateData);
    
    if (result.success) {
      handleEditModalClose();
    } else {
      // Handle error
    }
  };

  const handleCancelEdit = () => {
    pendingRow.reject(originalRow);
  };

  const columnsWithPlaceholders = React.useMemo(
    () =>
      columns.map((col) => ({
        ...col,
        editable: col.editable ? (params) => !params.row.isPlaceholder : false,
      })),
    []
  );

  const handleCancelAppointment = (row) => {
    setRowToCancel(row);
    setCancelConfirmationOpen(true);
  };

  const cancelAppointment = async () => {
    setIsCanceling(true);
    try {
      await removeAppointment({
        appointment_id: rowToCancel.appointment_id
      });      
      
      showSuccessSnackbar("Appointment cancelled successfully");
      setCancelConfirmationOpen(false);
      setEditModalOpen(false);
    } catch (error) {
      console.error("Error cancelling appointment:", error);
    } finally {
      setIsCanceling(false);
    }
  };

  const isCellEditable = (params) => {
    return true;
  };

  const getRowClassName = (params) => {
    if (params.row.isPlaceholder) {
      return "placeholder-row";
    }
    if (params.row.status === "cancelled") {
      return "cancelled-row";
    }
    if (params.row.status === "done_checkup") {
      return "done-checkup-row";
    }
    return "data-row";
  };

  const formatAppointmentDateTime = (appointmentId) => {
    try {
      const dateTimePart = appointmentId.split('-').slice(1).join('-');
      const dateTime = new Date(`2025-${dateTimePart}`);
      
      return {
        date: dateTime.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        time: dateTime.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      };
    } catch (error) {
      console.error("Error formatting appointment date/time:", error);
      return { date: 'Unknown date', time: 'Unknown time' };
    }
  };

  const handleAppointmentClick = (appointment) => {
    const { date, time } = formatAppointmentDateTime(appointment.appointment_id);
    
    console.log("Appointment clicked:", appointment);
    
    const appointmentInfo = {
      id: appointment.appointment_id,
      status: mapStatusToReadable(appointment.status),
      patientId: appointment.patientId || undefined
    };
    
    navigate('/appointment-details', { 
      state: { 
        appointmentInfo,
        from: 'appointment-table',
        fromPastAppointments: appointment.status === 'done_checkup' || appointment.status === 'completed'
      } 
    });
  };
  
  const mapStatusToReadable = (status) => {
    switch(status) {
      case 'pending': return 'Pending';
      case 'done_checkup': return 'Completed';
      case 'cancelled': return 'Cancelled';
      case 'late': return 'Late';
      default: return status;
    }
  };

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
                value={selectedAppointment.appointment_type}
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
                <MenuItem value="Cancelled">Cancelled</MenuItem>
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
      setMobileSearchResults([]);
    }
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
      // Split the name into first and last name for the form fields
      const nameParts = patient.name.split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";
      
      setSelectedAppointment(prev => ({
        ...prev,
        phone_number: patient.phone_number,
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

  const handleEndSlotOpen = () => {
    setEndSlotModalOpen(true);
  };

  const handleEndSlotClose = () => {
    setEndSlotModalOpen(false);
    setNewSlotData({ datetime: '' });
  };

  const handleNewSlotChange = (e) => {
    setNewSlotData({
      datetime: e.target.value
    });
  };

  const handleEndSlotSubmit = async () => {
    try {
      setIsCreatingSlot(true);
      
      const datetime = new Date(newSlotData.datetime);
      const date = datetime.toISOString().split('T')[0];
      const time = datetime.toTimeString().split(' ')[0];
      
      const response = await createSlot(cabinId, selectedSlot, {
        date: date,
        time: time
      });
      
      const user = JSON.parse(localStorage.getItem("user"));
      if (user) {
        if (!user.checkupcabindata?.[0]?.cabin_slots) {
          user.checkupcabindata[0].cabin_slots = [];
        }
        
        const newSlot = response.slot;
        if (!user.checkupcabindata?.[0]?.cabin_slots.find(slot => slot.slot === newSlot)) {
          user.checkupcabindata[0].cabin_slots.push({
            slot: newSlot,
            is_active: true
          });
        }
        
        user.checkupcabindata[0].cabin_slots = user.checkupcabindata[0].cabin_slots.map(slot => ({
          ...slot,
          is_active: slot.slot === response.slot
        }));
        
        localStorage.setItem("user", JSON.stringify(user));
      }
      
      showSuccessSnackbar("Slot ended successfully and new slot created");
      handleEndSlotClose();
      
      window.location.reload();
    } catch (error) {
      console.error("Error ending slot:", error);
      showErrorSnackbar("Failed to end slot: " + error.message, "error");
    } finally {
      setIsCreatingSlot(false);
    }
  };

  const renderEndSlotModal = () => (
    <Modal
      open={endSlotModalOpen}
      onClose={handleEndSlotClose}
      aria-labelledby="end-slot-modal"
    >
      <Box sx={modalStyle}>
        <Typography variant="h6" component="h2" mb={2}>
          End Current Slot
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Please select the date and time for the new slot
        </Typography>
        <TextField
          fullWidth
          type="datetime-local"
          name="datetime"
          label="Date and Time"
          value={newSlotData.datetime}
          onChange={handleNewSlotChange}
          InputLabelProps={{ shrink: true }}
          sx={{ mb: 3 }}
          inputProps={{
            min: new Date().toISOString().slice(0, 16)
          }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button onClick={handleEndSlotClose}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleEndSlotSubmit}
            disabled={!newSlotData.datetime || isCreatingSlot}
          >
            {isCreatingSlot ? <CircularProgress size={24} /> : "End Slot"}
          </Button>
        </Box>
      </Box>
    </Modal>
  );

  // Calculate displayedRows based on rows after rows is defined
  const displayedRows = React.useMemo(() => generateDisplayRows(rows), [rows]);

  return (
    <div
      style={{
        height: "80vh",
        width: "95%",
        padding: "8px",
        minWidth: "600px",
        maxWidth: "95%",
        position: "relative",
      }}
    >
      <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center" }}>
        <Button
          variant="outlined"
          onClick={() => setShowCollectionDetails(!showCollectionDetails)}
          sx={{
            backgroundColor: showCollectionDetails ? "#f0f0f0" : "transparent",
            "&:hover": { backgroundColor: "#f5f5f5" },
          }}
        >
          <Typography variant="subtitle1" fontWeight="600">
            Summary
          </Typography>
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleEndSlotOpen}
          disabled={!selectedSlot}
        >
          End Slot
        </Button>
      </Box>

      {showCollectionDetails && (
        <Box
          sx={{
            mb: 2,
            p: 2,
            border: "1px solid #e0e0e0",
            borderRadius: 1,
            backgroundColor: "#fafafa",
            display: "flex",
            gap: 4,
            flexWrap: "wrap",
          }}
        >
          <Box>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Payment Breakdown
            </Typography>
            <Typography variant="body1">
              Total Collection: ₹{totalCollection}
            </Typography>
            <Typography variant="body1">Cash: ₹{cashTotal}</Typography>
            <Typography variant="body1">Online: ₹{onlineTotal}</Typography>
          </Box>

          <Box>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Appointment Statistics
            </Typography>
            <Typography variant="body1">
              Total Patients: {totalPatients}
            </Typography>
            <Typography variant="body1">
              Checked-In: {totalCheckedIn}
            </Typography>
            <Typography variant="body1">Pending: {totalPending}</Typography>
            <Typography variant="body1">Completed: {totalCompleted}</Typography>
          </Box>

          <Box>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Additional Metrics
            </Typography>
            <Typography variant="body1">
              New Appointments:{" "}
              {appointments.filter((row) => row.appointment_type === "New").length}
            </Typography>
            <Typography variant="body1">
              Follow-ups:{" "}
              {
                appointments.filter((row) => row.appointment_type === "Follow-up")
                  .length
              }
            </Typography>
            <Typography variant="body1">
              Emergencies:{" "}
              {
                appointments.filter((row) => row.appointment_type === "Emergency")
                  .length
              }
            </Typography>
          </Box>
        </Box>
      )}

      <div
        style={{
          width: "100%",
          height: "100%",
          overflowY: "auto",
          overflowX: "auto",
        }}
      >
        {renderEditModal()}

        <DataGrid
          rows={rows}
          columns={columns}
          slots={{ toolbar: CustomToolbar }}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[10, 25, 50]}
          getRowClassName={getRowClassName}
          sortModel={[{ field: "token", sort: "asc" }]}
          loading={loading}
          onRowClick={(params) => {
            if (!params.row.isPlaceholder) {
              handleRowClick(params);
            }
          }}
          components={{
            NoRowsOverlay: CustomNoRowsOverlay,
          }}
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
          getRowId={(row) => row.appointment_id || row.token || Math.random().toString(36).substr(2, 9)}
        />
      </div>

      <Dialog open={editConfirmationOpen} onClose={handleCancelEdit}>
        <DialogTitle>Confirm Changes</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to update this patient's details?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelEdit}>Cancel</Button>
          <Button
            onClick={handleConfirmEdit}
            color="primary"
            variant="contained"
            disabled={isUpdating}
          >
            {isUpdating ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Confirm"
            )}{" "}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={cancelConfirmationOpen}
        onClose={() => setCancelConfirmationOpen(false)}
      >
        <DialogTitle>Cancel Appointment</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to cancel this appointment?
          </DialogContentText>
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
            )}{" "}
          </Button>
        </DialogActions>
      </Dialog>

      <Modal open={open} onClose={handleClose}>
        <Box sx={modalStyle}>
          <Typography variant="h5" sx={{ mb: 2 }}>
            New Appointment
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

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
                    }
                  }}
                  inputProps={{
                    ...params.inputProps,
                    maxLength: 10,
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
              label="First Name"
              name="firstName"
              value={newAppointment.firstName}
              onChange={handleInputChange}
              required
            />
            <TextField
              label="Last Name"
              name="lastName"
              value={newAppointment.lastName}
              onChange={handleInputChange}
              required
            />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={newAppointment.checkin}
                    onChange={(e) =>
                      setNewAppointment((prev) => ({
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
                    fontWeight: newAppointment.checkin ? 'bold' : 'normal',
                    color: newAppointment.checkin ? 'primary.main' : 'text.primary'
                  }}
                >
                  Present in Clinic
                </Typography>
              }
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={newAppointment.paid}
                    onChange={(e) =>
                      setNewAppointment((prev) => ({
                        ...prev,
                        paid: e.target.checked,
                        mode: e.target.checked ? "cash" : "",
                      }))
                    }
                  />
                }
              label={
                <Typography 
                  variant="body1" 
                  sx={{ 
                    fontWeight: newAppointment.paid ? 'bold' : 'normal',
                    color: newAppointment.paid ? 'primary.main' : 'text.primary'
                  }}
                >
                  Payment Done
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
                name="appointmentType"
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

          <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
            <Button onClick={handleClose} sx={{ mr: 2 }} disabled={isAdding}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleAddAppointment}
              disabled={isAdding}
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

      <IconButton
        aria-label="add appointment"
        onClick={() => openAppointmentForm()}
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          backgroundColor: '#1976d2',
          color: 'white',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          '&:hover': {
            backgroundColor: '#1565c0',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
            transform: 'translateY(-2px)'
          },
          '&:active': {
            transform: 'translateY(0px)',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
          },
          transition: 'all 0.3s ease',
          zIndex: 1000,
          width: 64,
          height: 64,
          display: { xs: 'flex', md: 'none' }
        }}
      >
        <AddCircleIcon fontSize="large" />
      </IconButton>

      {renderEndSlotModal()}
    </div>
  );
}
