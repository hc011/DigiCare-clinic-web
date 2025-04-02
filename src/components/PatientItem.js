import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./PatientItem.css";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button as MuiButton,
  CircularProgress,
  Tooltip,
  Chip,
  IconButton,
  Box,
  Typography,
} from "@mui/material";
import {
  Paid,
  CheckCircle,
  PendingActions,
  AccessTime,
  MedicalServices,
  Lock,
  LockOpen,
  Person,
  LocalHospital,
  SupervisorAccount,
  MeetingRoom,
  DoneAll,
  Schedule,
  MoneyOff,
  PersonOff,
  PersonPin,
} from "@mui/icons-material";
import DragHandleIcon from "@mui/icons-material/DragHandle";

// Add custom styles for clickable elements
const clickableStyle = {
  cursor: 'pointer',
  transition: 'background-color 0.2s',
  '&:hover': {
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
};

const PatientItem = ({
  position,
  appointment,
  late,
  currentPosition,
  handleNextPatient,
  handleLatePatient,
  paid,
  checkin,
  status,
}) => {
  const navigate = useNavigate();
  const [confirmAction, setConfirmAction] = useState(null);
  const [loadingType, setLoadingType] = useState(null);

  // Remove debugger statement and add more useful debugging
  

  // Determine if this is the current patient based on position
  // Force evaluate as numbers to ensure proper comparison
  let isCurrent = parseInt(position) === parseInt(currentPosition);
  const isLate = late;
  const isDone = status === "done_checkup" || status === "done";
  const isCancelled = status === "cancelled";
  const isPending = status === "pending";
  console.log("late", late);
  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    isCurrent = parseInt(position) === parseInt(currentPosition);
    console.log(`PatientItem ${position} - Current position: ${currentPosition}, isCurrent: ${position === currentPosition}`);
  }, [position, currentPosition]);

  // Log the data structure for debugging
  useEffect(() => {
    console.log('PatientItem received data:', {
      position,
      appointment,
      late,
      currentPosition,
      paid,
      checkin,
      status
    });
  }, [position, appointment, late, currentPosition, paid, checkin, status]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: appointment.appointment_id,
  });

  // Add a function to handle clicking on the patient item
  const handlePatientClick = (e) => {
    // Prevent click if we're dragging
    if (isDragging) return;
    
    // Prevent click if we clicked on a button inside the item
    if (e.target.closest('button') || e.target.closest('.MuiIconButton-root')) {
      return;
    }
    
    // Log the appointment data to see what's available
    console.log('Appointment data for patient click:', appointment);
    
    // Get patient ID either from patient object or appointment
    const patientId = appointment.patient?.patient_id || appointment.patient_id;
    
    // Get appointment ID
    const appointmentId = appointment.appointment_id;
    
    // Note: We're no longer checking if patient ID exists
    // We'll let the PatientInfoPage handle cases with missing patient info
    
    // Navigate to the patient info page with information available
    navigate('/patient-info', { 
      state: { 
        patientInfo: {
          id: patientId  // This may be null for some patients
        },
        appointmentInfo: {
          id: appointmentId,
          // Include more details from the appointment to help with synthetic patient creation
          position: position,
          token: appointment.token,
          name: appointment.name,
          disease: appointment.disease,
          appointment_type: appointment.appointment_type,
          guardian: appointment.guardian || (appointment.patient ? appointment.patient.guardian : null)
        },
        position: position,
        late: late,
        status: status,
        appointment: appointment
      } 
    });
  };

  const handleConfirm = async () => {
    if (confirmAction === "next") {
      setLoadingType("next");
      try {
          await handleNextPatient(appointment.appointment_id);
      } catch (error) {
        console.error("Error marking patient as done:", error);
      } finally {
        setLoadingType(null);
        setConfirmAction(null);
      }
    } else if (confirmAction === "late") {
      setLoadingType("late");
      try {
        await handleLatePatient(appointment.appointment_id, position);
      } catch (error) {
        console.error("Error marking patient as late:", error);
    } finally {
      setLoadingType(null);
        setConfirmAction(null);
      }
    }
  };

  return (
    <>
    <div
      ref={setNodeRef}
        style={{
          transform: CSS.Transform.toString(transform),
          transition,
          opacity: isDragging ? 0.5 : 1,
          cursor: 'pointer',
          WebkitTapHighlightColor: 'rgba(0,0,0,0)', // Remove default tap highlight on mobile
        }}
        className={`patient-item ${isCurrent ? "current" : ""} ${isLate ? "late" : ""} ${
          isDone ? "done" : ""
        } ${isCancelled ? "cancelled" : ""} ${isPending ? "pending" : ""}`}
        onClick={handlePatientClick} // Add the click handler
        data-paid={paid ? "true" : "false"}
        data-present={checkin ? "true" : "false"}
    >
      <div className="patient-content">
          <div className={`token-badge ${isCurrent ? "current-token" : ""} ${isLate ? "late-token" : ""} ${status === "cancelled" ? "cancelled-token" : ""}`}>
            <span>#{position === -1 ? appointment.token : (appointment.token || position)}</span>
          </div>

          <div className="patient-details">
            <div className="patient-header">
              <Typography variant="h6" component="h3">
                {appointment.name || "Unknown Patient"}
              </Typography>
              
              <div className="status-tags">
                {/* Add check-in status */}
                {checkin ? (
                  <Chip
                    icon={<PersonPin fontSize="small" />}
                    label="Present"
                    size="small"
                    color="info"
                    variant="outlined"
                  />
                ) : (
                  <Chip
                    icon={<PersonOff fontSize="small" />}
                    label="Not Present"
                    size="small"
                    color="default"
                    variant="outlined"
                  />
                )}
                
                {/* Add payment status */}
                {paid ? (
                  <Chip
                    icon={<Paid fontSize="small" />}
                    label="Paid"
                    size="small"
                    color="success"
                    variant="outlined"
                  />
                ) : (
                  <Chip
                    icon={<MoneyOff fontSize="small" />}
                    label="Not Paid"
                    size="small"
                    color="warning"
                    variant="outlined"
                  />
                )}
                
                {isLate && (
                  <Chip
                    icon={<AccessTime fontSize="small" />}
                    label="Late"
                    size="small"
                    color="error"
                    variant="outlined"
                    sx={{ fontWeight: 'bold' }}
                  />
                )}
                {isDone && (
                  <Chip
                    icon={<CheckCircle fontSize="small" />}
                    label="Done"
                    size="small"
                    color="success"
                    variant="outlined"
                  />
                )}
                {status === "cancelled" && (
                  <Chip
                    icon={<MeetingRoom fontSize="small" />}
                    label="Cancelled"
                    size="small"
                    color="error"
                    variant="outlined"
                  />
                )}
              </div>
            </div>

            {/* Guardian name if available */}
            {(appointment.guardian || (appointment.patient && appointment.patient.guardian)) && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5, color: 'text.secondary' }}>
                <SupervisorAccount fontSize="small" sx={{ mr: 0.5 }} />
                <Typography variant="body2">
                  Guardian: {appointment.patient?.guardian || appointment.guardian}
                </Typography>
              </Box>
            )}
          </div>
          
          <div className="action-buttons">
            {/* Mark Done button - show for all patients that aren't already done */}
            {!isDone && (
              <Tooltip title="Mark as Done">
                <MuiButton
                  variant={isCurrent ? "contained" : "outlined"}
                  color="primary"
                  size="small"
                  startIcon={<DoneAll />}
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmAction("next");
                  }}
                  disabled={loadingType === "next" || isDone}
                  sx={{ mr: 1 }}
                >
                  {loadingType === "next" ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    "Done"
                  )}
                </MuiButton>
              </Tooltip>
            )}
            
            {/* Mark Late button - show for all patients that aren't already late or done */}
            {!isDone && (
              <Tooltip title="Mark as Late">
                <MuiButton
                  variant="outlined"
                  color="secondary"
                  size="small"
                  startIcon={<Schedule />}
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmAction("late");
                  }}
                >
                  {loadingType === "late" ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    "Late"
                  )}
                </MuiButton>
              </Tooltip>
            )}
          </div>
          
          <div className="drag-handle" {...attributes} {...listeners}>
            <DragHandleIcon />
          </div>
        </div>
      </div>

      <Dialog open={!!confirmAction} onClose={() => setConfirmAction(null)}>
        <DialogTitle>
          {confirmAction === "next"
            ? "Mark Patient as Done"
            : "Mark Patient as Late"}
        </DialogTitle>
        <DialogContent>
          {confirmAction === "next"
            ? `Are you sure you want to mark ${appointment.name} as done?`
            : `Are you sure you want to mark ${appointment.name} as late?`}
        </DialogContent>
        <DialogActions>
          <MuiButton onClick={() => setConfirmAction(null)}>Cancel</MuiButton>
          <MuiButton
            onClick={handleConfirm}
            color="primary"
            variant="contained"
            disabled={loadingType}
          >
            {loadingType ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Confirm"
            )}
          </MuiButton>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PatientItem;
