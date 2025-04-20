import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Avatar,
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  TextField,
  Tooltip,
  Divider,
  Modal,
  FormControlLabel,
  Checkbox,
  ToggleButtonGroup,
  ToggleButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  CalendarToday,
  AccessTime,
  LocalHospital,
  Phone,
  Email,
  Print,
  Share,
  Download,
  Description,
  FileCopy,
  PictureAsPdf,
  Image,
  MedicalServices,
  Assignment,
  InsertDriveFile,
  Edit,
  Add,
  FileUpload,
  ArrowBack,
  Paid as PaidIcon,
  CheckCircle,
  AttachMoney,
  Person,
  Healing,
  AssignmentLate,
  ArrowForward,
  Close,
  Upload,
  CloudUpload,
  History,
  Info as InfoIcon,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { PrescriptionForm } from './PrescriptionPage';
import { PageHeader } from '../components/common/PageHeader';
import { getPatientDetails, getPrescriptions, getPastPrescriptions, getAppointmentDetails, manageVitals, getAttachments, uploadAttachment, deleteAttachment, getVitals, getCurrentPrescription } from '../services/api';
import { useAppointmentForm } from '../context/AppointmentFormContext';
import { printPrescription } from '../utils/prescriptionUtils';
import { useCheckupCabin } from "../context/CheckupCabinContext";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

// Utility function to construct full URL for attachments
const getFullAttachmentUrl = (relativePath) => {
  if (!relativePath) return '';
  // Remove leading slash if present in both API_BASE_URL and relativePath
  const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  return `${baseUrl}${path}`;
};

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

const PatientInfoPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { openAppointmentForm } = useAppointmentForm();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { getCurrentCabinId } = useCheckupCabin();
  
  // Consolidated state declarations
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [patient, setPatient] = useState(location.state?.patientInfo || {});
  const [currentAppointment, setCurrentAppointment] = useState(location.state?.appointmentInfo || null);
  console.log(location.state)
  useEffect(() => {
    console.log(currentAppointment)
  }, [currentAppointment])
  const [vitals, setVitals] = useState(location.state?.vitalsInfo || {
    bloodPressure: '',
    heartRate: '',
    temperature: '',
    spO2: '',
    height: '',
    weight: '',
    bloodSugar: ''
  });
  const [editableVitals, setEditableVitals] = useState({});
  const [isEditingVitals, setIsEditingVitals] = useState(false);
  const [isSavingVitals, setIsSavingVitals] = useState(false);
  const [vitalsError, setVitalsError] = useState(null);
  const [pastAppointments, setPastAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [prescriptionModalOpen, setPrescriptionModalOpen] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [attachmentDialogOpen, setAttachmentDialogOpen] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const [reportsModalOpen, setReportsModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [attachmentsError, setAttachmentsError] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [attachmentToDelete, setAttachmentToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [appointmentDetailsOpen, setAppointmentDetailsOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [hasCurrentAppointment, setHasCurrentAppointment] = useState(location.state?.appointmentInfo !== undefined);
  const [openAttachmentDialog, setOpenAttachmentDialog] = useState(false);
  const [editingVitals, setEditingVitals] = useState(false);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadFileType, setUploadFileType] = useState('pdf');
  const [isDragging, setIsDragging] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [vitalsLoading, setVitalsLoading] = useState(false);
  const [complaints, setComplaints] = useState(location.state?.complaintsData || []);
  const [prescriptionLoadingMap, setPrescriptionLoadingMap] = useState({});


  const appointmentInfo = location.state?.appointmentInfo;
  const patientInfo = location.state?.patientInfo || {};

  // Get vitals data from location state or use default values
  const vitalsInfo = location.state?.vitalsInfo || {
    bloodPressure: '',
    heartRate: '',
    temperature: '',
    spO2: '',
    height: '',
    weight: '',
    bloodSugar: ''
  };

  // Get complaints data from location state or use empty array
  const complaintsData = location.state?.complaintsData || [];

  // Get queue position information
  const position = location.state?.position || 0;
  const late = location.state?.late || false;
  const status = location.state?.status || 'pending';

  const formatDate = (slot) => {
    const date = new Date(slot);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  const fetchAllAttachments = async (appointmentId) => {
    try {
      const attachmentsResponse = await getAttachments(appointmentId);
      if (attachmentsResponse && attachmentsResponse.length > 0) {
        setAttachments(attachmentsResponse.map(att => ({
          id: att.id,
          name: att.file_name,
          type: att.file_type.includes('pdf') ? 'pdf' : 
                att.file_type.includes('image') ? 'image' : 'document',
          reportType: 'custom',
          date: new Date(att.uploaded_at).toLocaleDateString(),
          size: '1 MB',
          url: getFullAttachmentUrl(att.file),
          description: att.description
        })));
      }
    } catch (attachmentsError) {
      console.error("Error fetching attachments:", attachmentsError);
      // Don't set error state as attachments are optional
    }
  }

  const fetchPatientDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      // Get patient ID and appointment ID from state
      const patientId = location.state?.patientInfo?.id;
      const appointmentId = location.state?.appointmentInfo?.id;
      
      console.log("Fetching details with:", { patientId, appointmentId });
      
      // If we have a patient ID, fetch patient details
      if (patientId) {
        const response = await getPatientDetails(patientId);
        if (response) {
          // Set patient details
          setPatient(response.patient);
          
          // Set current appointment if available in response
          if (response.current_appointment) {
            setCurrentAppointment(response.current_appointment);
        setHasCurrentAppointment(true);
          }
          
          // Set past appointments
          if (response.other_appointments) {
            setPastAppointments(response.other_appointments);
          }
          
          // Set prescriptions from appointments
          const prescriptionsList = response.other_appointments
            ?.filter(app => app.prescription)
            .map(app => ({
              ...app.prescription,
              appointmentId: app.id,
              date: app.date
            })) || [];
          setPrescriptions(prescriptionsList);
          
          // Set vitals if available
        if (response.vitals) {
          setVitals({
            bloodPressure: response.vitals.blood_pressure || '',
            heartRate: response.vitals.pulse_rate || '',
            temperature: response.vitals.temperature || '',
            spO2: response.vitals.spo2 || '',
            height: response.vitals.height || '',
            weight: response.vitals.weight || '',
            bloodSugar: response.vitals.blood_sugar || ''
          });
        }
        
          // Set attachments if available
          if (response.attachments) {
          setAttachments(response.attachments.map(att => ({
            id: att.id,
            name: att.file_name,
            type: att.file_type.includes('pdf') ? 'pdf' : 
                  att.file_type.includes('image') ? 'image' : 'document',
            reportType: 'custom',
              date: new Date(att.uploaded_at).toLocaleDateString(),
              size: '1 MB',
            url: getFullAttachmentUrl(att.file),
            description: att.description
          })));
          }
        }
      }
      
      // If we have an appointment ID but no current appointment data, fetch it separately
      if (appointmentId && !currentAppointment?.appointment_id) {
        try {
          console.log("Fetching appointment details for:", appointmentId);
          const appointmentResponse = await getAppointmentDetails(appointmentId);
          
          if (appointmentResponse) {
            console.log("Appointment details response:", appointmentResponse);
            
            // Set the current appointment
            setCurrentAppointment(appointmentResponse);
            setHasCurrentAppointment(true);
            
            // If we don't have patient data yet, create a synthetic patient object from appointment data
            if (!patient?.name) {
              // Try to use patient data from the appointment if it exists
              if (appointmentResponse.patient) {
                setPatient(appointmentResponse.patient);
              } else {
                // Create a synthetic patient object from appointment data
                // Extract first and last name from the full name
                const nameParts = appointmentResponse.name ? appointmentResponse.name.split(' ') : ['Unknown', ''];
                const firstName = nameParts[0];
                const lastName = nameParts.slice(1).join(' ');
                
                // Create synthetic patient object
                const syntheticPatient = {
                  id: null, // No database ID for synthetic patients
                  name: appointmentResponse.name || 'Unknown Patient',
                  first_name: firstName,
                  last_name: lastName,
                  phone_number: null, // No phone number available
                  age: null, // Age not available
                  gender: null, // Gender not available
                  address: null, // Address not available
                  guardian: null, // Guardian not available
                  email: null, // Email not available
                  isSynthetic: true, // Flag to indicate this is not a real patient record
                };
                
                // Set the synthetic patient object
                setPatient(syntheticPatient);
                
                console.log("Created synthetic patient:", syntheticPatient);
              }
            }
            
            // Fetch vitals for the appointment
            try {
              const vitalsResponse = await getVitals(appointmentId);
              if (vitalsResponse) {
                setVitals({
                  bloodPressure: vitalsResponse.blood_pressure || '',
                  heartRate: vitalsResponse.pulse_rate || '',
                  temperature: vitalsResponse.temperature || '',
                  spO2: vitalsResponse.spo2 || '',
                  height: vitalsResponse.height || '',
                  weight: vitalsResponse.weight || '',
                  bloodSugar: vitalsResponse.blood_sugar || ''
                });
              }
            } catch (vitalsError) {
              console.error("Error fetching vitals:", vitalsError);
              // Don't set error state as vitals are optional
            }
            
            // Fetch attachments for the appointment
            await fetchAllAttachments(appointmentId);
          }
        } catch (appointmentError) {
          console.error("Error fetching appointment details:", appointmentError);
          // Don't set error state here as the main patient data might still be available
        }
      }
    } catch (error) {
      console.error("Error fetching patient details:", error);
      setError("Failed to load patient details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("Location state changed:", location.state);
    
    // Update state variables when location.state changes
    if (location.state?.patientInfo) {
      setPatient(location.state.patientInfo);
    }
    
    // IMPORTANT: Always update hasCurrentAppointment, not just when true
    setHasCurrentAppointment(location.state?.appointmentInfo !== undefined);
    
    if (location.state?.appointmentInfo) {
      setCurrentAppointment(location.state.appointmentInfo);
    } else {
      // Also clear the currentAppointment when no appointment info exists
      setCurrentAppointment(null);
      // Also clear attachments since they're associated with appointments
      setAttachments([]);
      // Reset vitals when switching to a patient without an appointment
      setVitals({
        bloodPressure: '',
        heartRate: '',
        temperature: '',
        spO2: '',
        height: '',
        weight: '',
        bloodSugar: ''
      });
    }
    
    // Get IDs from location state
    const patientId = location.state?.patientInfo?.id;
    const appointmentId = location.state?.appointmentInfo?.id;
    
    // Log the IDs we have for debugging
    console.log("IDs from location state:", { patientId, appointmentId });
    
    // Always fetch the complete data when we have either a patient ID or appointment ID
    if (patientId || appointmentId) {
      fetchPatientDetails();
    }
  }, [location.state]);

  const handleCreatePrescription = () => {
    // Safely extract values with optional chaining and default values
    const patientWeight = vitals.weight ? vitals.weight.split(' ')[0] : '';
    
    navigate('/prescription', { 
      state: { 
        patientInfo: {
          patientName: patient?.name || currentAppointment?.name || 'Unknown Patient',
          age: patient?.age || '',
          gender: patient?.gender || '',
          weight: patientWeight,
          bloodPressure: vitals?.bloodPressure || '',
          heartRate: vitals?.heartRate || '',
          temperature: vitals?.temperature || '',
          spO2: vitals?.spO2 || '',
          height: vitals?.height || '',
          bloodSugar: vitals?.bloodSugar || '',
          allergies: patient?.allergies || '',
          chronicConditions: patient?.chronicConditions || '',
        },
        // Include appointment info to ensure we have an appointment ID
        appointmentInfo: {
          id: currentAppointment?.appointment_id || currentAppointment?.id
        }
      } 
    });
  };

  const handleOpenConsultation = () => {
    if (!hasCurrentAppointment) {
      // If there's no current appointment, don't navigate
      return;
    }
    
    console.log("Opening consultation with:", { currentAppointment, patientInfo });
    
    // For synthetic patients, we need to use the appointment data instead of patient data
    const isSyntheticPatient = patient?.isSynthetic;
    
    // Create a minimal state object with the necessary data
    const consultationState = {
      patientInfo: patient ? {
        id: patient.id || patient.patient_id,
        name: patient.name || (currentAppointment?.name || 'Unknown Patient'),
        age: patient.age || '',
        gender: patient.gender || '',
        allergies: patient.allergies || '',
        isSynthetic: isSyntheticPatient
      } : null,
      
      appointmentInfo: currentAppointment ? {
        id: currentAppointment.appointment_id || currentAppointment.id,
        token: currentAppointment.token,
        disease: currentAppointment.disease,
        appointment_type: currentAppointment.appointment_type,
        status: currentAppointment.status
      } : null,
      
      vitalsInfo: vitals
    };
    
    navigate('/consultation', { state: consultationState });
  };

  const handleOpenAttachment = (attachment) => {
    if (!attachment.url) {
      console.error('No URL available for attachment');
      return;
    }

    // For PDFs and images, try to open in a new tab
    if (attachment.type === 'pdf' || attachment.type === 'image') {
      // Create a temporary link element
      const link = document.createElement('a');
      link.href = attachment.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      
      // Try to open the file
      try {
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error('Error opening attachment:', error);
        setAttachmentsError('Failed to open the file. Please try again.');
      }
    } else {
      // For other types, show in the preview dialog
      setSelectedAttachment(attachment);
      setOpenAttachmentDialog(true);
    }
  };

  const handleCloseAttachmentDialog = () => {
    setOpenAttachmentDialog(false);
  };

  const handleVitalChange = (key, value) => {
    setVitals({
      ...vitals,
      [key]: value,
    });
  };

  const handleSaveVitals = async () => {
    try {
      setVitalsLoading(true);
      setVitalsError(null);

      // Debug logs
      console.log("Current Appointment:", currentAppointment);
      console.log("Location State:", location.state);

      // Get appointment from location state first
      const appointmentFromState = location.state?.appointmentInfo;
      if (appointmentFromState) {
        setCurrentAppointment(appointmentFromState);
      }

      // Get appointment ID from either currentAppointment or location state
      // For synthetic patients we need to use the appointment_id directly
      const appointmentId = currentAppointment?.appointment_id || currentAppointment?.id;
      
      if (!appointmentId) {
        setVitalsError("No active appointment found. Please select an appointment first.");
        return;
      }

      // Prepare the payload for the API
      const vitalsPayload = {
        appointment_id: selectedAppointment.id,
        vitals: {
          blood_pressure: vitals.bloodPressure,
          pulse_rate: vitals.heartRate,
          temperature: vitals.temperature,
          spo2: vitals.spO2,
          height: vitals.height,
          weight: vitals.weight,
          blood_sugar: vitals.bloodSugar
        }
      };

      // Debug log for payload
      console.log("Vitals Payload:", vitalsPayload);

      // Call the API
      const response = await manageVitals(vitalsPayload);
      console.log("Vitals updated successfully:", response);

      // Update the UI state
      setEditingVitals(false);
      setVitalsError(null);

    } catch (error) {
      console.error("Error saving vitals:", error);
      setVitalsError("Failed to save vitals. Please try again.");
    } finally {
      setVitalsLoading(false);
    }
  };

  const getAttachmentIcon = (type) => {
    switch (type) {
      case 'pdf':
        return <PictureAsPdf fontSize="small" color="error" />;
      case 'image':
        return <Image fontSize="small" color="primary" />;
      case 'document':
        return <Description fontSize="small" color="info" />;
      default:
        return <InsertDriveFile fontSize="small" />;
    }
  };

  // Add a function to handle going back
  const handleGoBack = () => {
    navigate(-1); // Navigate back to the previous page
  };

  // Update the handleOpenPrescription function
  const handleOpenPrescription = async (appointment) => {
    try {
      // Set loading state for this specific appointment
      setPrescriptionLoadingMap(prev => ({
        ...prev,
        [appointment.id]: true
      }));

      // Debug logs
      console.log("Opening prescription for appointment:", appointment);
      
      // Get appointment ID from either appointment.id or appointment.appointment_id
      const appointmentId = appointment.id || appointment.appointment_id;
      
      if (!appointmentId) {
        console.error("No appointment ID found in:", appointment);
        return;
      }

      // Call getCurrentPrescription API and log the result
      const prescriptionData = await getCurrentPrescription(appointmentId);
      console.log("Prescription Data:", prescriptionData);
      
      if (prescriptionData) {
        // Create prescription data object using the format expected by our utility
        const formattedPrescriptionData = {
          patientInfo: {
            id: appointment.patient.patient_id,
            name: appointment.name,
            age: appointment.patient.age,
            gender: appointment.patient.gender
          },
          appointmentInfo: {
            id: appointment.appointment_id,
            date: new Date(appointment.slot).toLocaleDateString()
          },
          complaints: prescriptionData.complaints?.map(comp => ({
            complaint: comp.name || '',
            frequency: comp.frequency || '',
            duration: comp.duration || '',
            severity: comp.severity || '',
            notes: comp.notes || ''
          })) || [],
          diagnoses: prescriptionData.diagnosis?.map(diag => ({
            diagnosis: diag.name || 'General Checkup',
            notes: diag.notes || ''
          })) || [],
          medications: prescriptionData.medicines?.map(med => ({
            medicine: med.name || '',
            dose: med.dose || '',
            frequency: med.frequency || '',
            duration: med.duration || '',
            timing: med.when || '',
            notes: med.notes || ''
          })) || [],
          tests: prescriptionData.tests?.flatMap(test => test.testlist || []) || []
        };
        
        // Use the global prescription utility
        printPrescription(formattedPrescriptionData);
      } else {
        // Handle case where no prescription data is found
        console.error("No prescription data found for appointment ID:", appointmentId);
      }
    } catch (error) {
      console.error("Error fetching prescription data:", error);
    } finally {
      // Clear loading state for this specific appointment
      setPrescriptionLoadingMap(prev => ({
        ...prev,
        [appointment.id]: false
      }));
    }
  };
  
  // Add function to handle closing the prescription modal
  const handleClosePrescriptionModal = () => {
    setPrescriptionModalOpen(false);
    setSelectedPrescription(null);
  };
  
  // Add function to handle printing the prescription
  const handlePrintPrescription = () => {
    // Prepare prescription data object
    const prescriptionData = {
      patientInfo: patientInfo,
      appointmentInfo: selectedPrescription?.appointmentInfo || {
        date: new Date().toLocaleDateString(),
      },
      complaints: selectedPrescription?.initialData?.complaints || [],
      diagnoses: selectedPrescription?.initialData?.diagnosis || [{
        diagnosis: selectedPrescription?.appointmentInfo?.diagnosis,
        notes: ''
      }],
      medications: selectedPrescription?.initialData?.medications || [],
      tests: selectedPrescription?.initialData?.tests || [],
    };
    
    // Use the global prescription print utility
    printPrescription(prescriptionData);
  };

  // Add functions to handle navigation to AppointmentDetails
  const handleOpenAppointmentDetails = (appointment) => {
    // Instead of navigating, set the appointment data and open the modal
    setSelectedAppointment({
      patient: {...appointment.patient},
      id: appointment.appointment_id,
      status: appointment.status,
      checkin: appointment.checkin,
      paid: appointment.paid,
      token: appointment.token ,
      appointment_type: appointment.appointment_type ,
      disease: appointment.disease,
      fees_paid: appointment.fees_paid,
      mode: appointment.mode,
      date: appointment.date || new Date(appointment.slot).toLocaleDateString(),
      time: appointment.time || new Date(appointment.slot).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      doctor: appointment.doctor || '',
      department: appointment.department || "",
    });
    setAppointmentDetailsOpen(true);
  };

  // Add function to handle closing the appointment details modal
  const handleCloseAppointmentDetails = () => {
    setAppointmentDetailsOpen(false);
    setSelectedAppointment(null);
  };

  // Add function to handle printing the payment receipt from modal
  const handlePrintPaymentReceipt = () => {
    if (!selectedAppointment) return;
    
    // Create a new window with the receipt content
    const printWindow = window.open('', '_blank');
    
    // Format the date for the receipt
    const receiptDate = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    // Generate a receipt number based on the appointment ID
    const appointmentIdNumber = selectedAppointment.id.replace(/\D/g, '');
    const receiptNumber = `RCP-${appointmentIdNumber}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    
    // Generate the receipt HTML content
    const receiptContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Receipt - ${patient.name}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: #333;
          }
          .receipt {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            border: 1px solid #ddd;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #2196f3;
          }
          .clinic-name {
            font-size: 24px;
            font-weight: bold;
            color: #2196f3;
            margin-bottom: 5px;
          }
          .clinic-address {
            font-size: 14px;
            margin-bottom: 5px;
          }
          .receipt-title {
            font-size: 18px;
            font-weight: bold;
            text-align: center;
            margin: 20px 0;
            text-transform: uppercase;
          }
          .receipt-details {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
          }
          .patient-details, .payment-details {
            flex: 1;
          }
          .detail-row {
            margin-bottom: 8px;
          }
          .label {
            font-weight: bold;
            display: inline-block;
            width: 150px;
          }
          .service-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          .service-table th, .service-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          .service-table th {
            background-color: #f5f5f5;
          }
          .amount-row {
            text-align: right;
            margin-top: 20px;
            font-weight: bold;
          }
          .footer {
            margin-top: 40px;
            display: flex;
            justify-content: space-between;
          }
          .signature {
            margin-top: 60px;
            border-top: 1px solid #ddd;
            padding-top: 5px;
            width: 200px;
            text-align: center;
          }
          .paid-stamp {
            position: relative;
            text-align: center;
            margin: 30px auto;
          }
          .paid-stamp span {
            display: inline-block;
            border: 3px solid #4CAF50;
            color: #4CAF50;
            padding: 10px 20px;
            font-size: 24px;
            font-weight: bold;
            transform: rotate(-15deg);
            border-radius: 5px;
          }
          @media print {
            body {
              margin: 0;
              padding: 15px;
            }
            .receipt {
              border: none;
            }
            button {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <div class="clinic-name">DigiCare Medical Center</div>
            <div class="clinic-address">123 Healthcare Avenue, Medical District</div>
            <div class="clinic-address">Phone: +91 1234567890 | Email: info@digicare.com</div>
          </div>
          
          <div class="receipt-title">Payment Receipt</div>
          
          <div class="receipt-details">
            <div class="patient-details">
              <div class="detail-row"><span class="label">Receipt No:</span> ${receiptNumber}</div>
              <div class="detail-row"><span class="label">Date:</span> ${receiptDate}</div>
              <div class="detail-row"><span class="label">Patient Name:</span> ${patient.name}</div>
              <div class="detail-row"><span class="label">Patient ID:</span> ${patient.id}</div>
            </div>
            <div class="payment-details">
              <div class="detail-row"><span class="label">Appointment ID:</span> ${selectedAppointment.id}</div>
              <div class="detail-row"><span class="label">Appointment Date:</span> ${selectedAppointment.date}</div>
              <div class="detail-row"><span class="label">Payment Method:</span> ${selectedAppointment.mode || 'Cash'}</div>
              <div class="detail-row"><span class="label">Payment Status:</span> Paid</div>
            </div>
          </div>
          
          <table class="service-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Doctor</th>
                <th>Department</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${selectedAppointment.appointment_type || 'Consultation'} - ${selectedAppointment.disease || 'General Checkup'}</td>
                <td>${selectedAppointment.doctor || ''}</td>
                <td>${selectedAppointment.department || 'General Medicine'}</td>
                <td>₹${selectedAppointment.fees_paid}</td>
              </tr>
            </tbody>
          </table>
          
          <div class="amount-row">
            <div class="detail-row"><span class="label">Subtotal:</span> ₹${selectedAppointment.fees_paid}</div>
            <div class="detail-row"><span class="label">Tax (0%):</span> ₹0</div>
            <div class="detail-row"><span class="label">Total Amount:</span> ₹${selectedAppointment.fees_paid}</div>
          </div>
          
          <div class="paid-stamp">
            <span>PAID</span>
          </div>
          
          <div class="footer">
            <div class="signature">
              Received By
            </div>
            <div class="signature">
              Authorized Signature
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #777;">
            This is a computer-generated receipt and does not require a physical signature.
          </div>
        </div>
      </body>
      </html>
    `;
    
    // Write the content to the new window
    printWindow.document.open();
    printWindow.document.write(receiptContent);
    printWindow.document.close();
    
    // Wait for the content to load and then print
    printWindow.onload = function() {
      printWindow.print();
    };
  };

  // Add functions to handle opening and closing the reports modal
  const handleOpenReportsModal = () => {
    setReportsModalOpen(true);
  };
  
  const handleCloseReportsModal = () => {
    setReportsModalOpen(false);
  };

  // Add function to handle opening the upload modal
  const handleOpenUploadModal = () => {
    setUploadModalOpen(true);
  };
  
  // Add function to handle closing the upload modal
  const handleCloseUploadModal = () => {
    setUploadModalOpen(false);
    setSelectedFile(null);
    setUploadFileName('');
    setUploadFileType('pdf');
    setIsDragging(false);
  };
  
  // Add function to handle file drop
  const handleFileDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFileSelect(file);
    }
  };
  
  // Add function to handle file selection
  const handleFileSelect = (file) => {
    setSelectedFile(file);
    
    // Set default file name from the file (without extension)
    const fileName = file.name.split('.').slice(0, -1).join('.');
    setUploadFileName(fileName);
    
    // Determine file type
    const fileType = file.type.includes('pdf') ? 'pdf' : 
                    file.type.includes('image') ? 'image' : 'document';
    setUploadFileType(fileType);
  };
  
  // Update the handleFileUpload function
  const handleFileUpload = async () => {
    if (!selectedFile || !uploadFileName) return;
    
    try {
      setAttachmentsLoading(true);
      setAttachmentsError(null);
      // Create form data
      const formData = new FormData();
      formData.append('appointment_id', currentAppointment.appointment_id);
      formData.append('file', selectedFile);
      formData.append('file_name', uploadFileName);
      formData.append('file_type', selectedFile.type);
      formData.append('description', `Medical record uploaded for appointment ${currentAppointment.appointment_id}`);
      
      // Upload the file
      const response = await uploadAttachment(formData);
      console.log('File uploaded successfully:', response);
      
      // Refresh patient details to get updated attachments
     await fetchAllAttachments(currentAppointment.appointment_id)      
      // Close the modal
      handleCloseUploadModal();
      
    } catch (error) {
      console.error('Error uploading file:', error);
      setAttachmentsError('Failed to upload file. Please try again.');
    } finally {
      setAttachmentsLoading(false);
    }
  };

  // Update the handleDeleteAttachment function
  const handleDeleteAttachment = async (attachmentId) => {
    setAttachmentToDelete(attachmentId);
    setDeleteDialogOpen(true);
  };

  // Add new function to handle actual deletion
  const confirmDeleteAttachment = async () => {
    if (!attachmentToDelete) return;
    
    try {
      setAttachmentsLoading(true);
      setAttachmentsError(null);
      
      await deleteAttachment(attachmentToDelete);
      console.log('Attachment deleted successfully');
      
      // Refresh patient details to get updated attachments
      await fetchPatientDetails();
      
    } catch (error) {
      console.error('Error deleting attachment:', error);
      setAttachmentsError('Failed to delete attachment. Please try again.');
    } finally {
      setAttachmentsLoading(false);
      setDeleteDialogOpen(false);
      setAttachmentToDelete(null);
    }
  };

  // Update the download function
  const handleDownloadAttachment = (attachment, event) => {
    event.stopPropagation(); // Prevent the attachment box click event

    if (!attachment.url) {
      console.error('No URL available for attachment');
      return;
    }

    // Create a temporary link element
    const link = document.createElement('a');
    link.href = attachment.url;
    link.download = attachment.name; // Set the download filename
    
    // Try to download the file
    try {
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading attachment:', error);
      setAttachmentsError('Failed to download the file. Please try again.');
    }
  };

  // Update the print function
  const handlePrintAttachment = (attachment, event) => {
    event.stopPropagation(); // Prevent the attachment box click event

    if (!attachment.url) {
      console.error('No URL available for attachment');
      return;
    }

    // For PDFs and images, open in a new tab for printing
    if (attachment.type === 'pdf' || attachment.type === 'image') {
      const printWindow = window.open(attachment.url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          try {
            printWindow.print();
          } catch (error) {
            console.error('Error printing attachment:', error);
            setAttachmentsError('Failed to print the file. Please download it first.');
          }
        };
      } else {
        setAttachmentsError('This file type cannot be printed directly. Please download it first.');
      }
    } else {
      setAttachmentsError('This file type cannot be printed directly. Please download it first.');
    }
  };

  // Add the handleOpenAppointmentModal function back
  const handleOpenAppointmentModal = () => {
    // Format patient data for the appointment form
    const patientData = {
      firstName: patient.name.split(' ')[0] || '',
      lastName: patient.name.split(' ').slice(1).join(' ') || '',
      age: patient.age || '',
      phone_number: patient.phone_number || patient.phone || '',
      sex: patient.gender === 'Male' ? 'M' : patient.gender === 'Female' ? 'F' : 'O',
      location: patient.location || patient.address || '',
      guardian: patient.guardian || '',
    };
    
    // Open the global appointment form with patient data
    openAppointmentForm(patientData);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 10 }}>
      <PageHeader 
        title="Patient Information"
        showBackButton={true}
        backButtonVariant="icon"
        onBackButtonClick={handleGoBack}
      />

      {/* Show loading indicator when data is being fetched */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Box sx={{ my: 2 }}>
          <Alert 
            severity="error" 
            action={
              <Button 
                color="inherit" 
                size="small" 
                onClick={() => {
                  if (patientInfo && patientInfo.id) {
                    fetchPatientDetails();
                  }
                }}
              >
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Patient Header */}
          <Paper elevation={2} sx={{ p: 2 }}>
            <Box>
              {/* Patient name and avatar */}
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Avatar 
                  sx={{ 
                    bgcolor: 'primary.light', 
                    color: 'primary.contrastText',
                    width: 40,
                    height: 40,
                    mr: 2,
                    fontSize: '1.2rem'
                  }}
                >
                  {patient?.name?.charAt(0) || 'P'}
                </Avatar>
                <Box>
                  <Typography 
                    variant="h6" 
                    component="h1" 
                    sx={{ 
                      fontWeight: 'medium', 
                      color: 'text.primary',
                      opacity: 0.9,
                      letterSpacing: '0.01em'
                    }}
                  >
                    {patient?.name || 'Unknown Patient'}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    {patient?.patient_id && <Typography variant="caption" color="text.secondary">
                      Patient ID: {patient?.patient_id || "Not specified"}
                    </Typography>}
                    {patient?.age && <Typography variant="caption" color="text.secondary">
                      Age: {patient?.age}
                    </Typography>}
                    {patient?.gender && <Typography variant="caption" color="text.secondary">
                       Gender: {patient?.gender}
                    </Typography>}
                    {patient?.phone_number && <Typography variant="caption" color="text.secondary">
                      Phone: {patient?.phone_number || "Not specified"}
                    </Typography>}
                    {patient?.allergies && <Typography variant="caption" color="text.secondary">
                      Allergies: {patient?.allergies}
                    </Typography>}
                    {patient?.guardian && (
                      <Typography variant="caption" color="text.secondary">
                        Guardian: {patient.guardian}
                      </Typography>
                    )}
                    {patient?.location && (
                      <Typography variant="caption" color="text.secondary">
                        Location: {patient.location}
                      </Typography>
                    )}
                    
                    {/* Display appointment info for synthetic patient */}
                    {patient?.isSynthetic && (
                      <>
                        {currentAppointment?.disease && (
                          <Typography variant="caption" color="text.secondary">
                            Complaint: {currentAppointment.disease}
                          </Typography>
                        )}
                        {currentAppointment?.guardian && (
                          <Typography variant="caption" color="text.secondary">
                            Guardian: {currentAppointment.guardian}
                          </Typography>
                        )}
                      </>
                    )}
                  </Box>
                </Box>
              </Box>
              
              {/* Notice for synthetic patient data */}
              {patient?.isSynthetic && (
                <Box sx={{ 
                  mt: 1, 
                  p: 1, 
                  bgcolor: 'info.light', 
                  color: 'info.contrastText',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <InfoIcon sx={{ mr: 1, fontSize: '1rem' }} />
                  <Typography variant="body2">
                    Limited patient information is available. To create a complete patient profile, update the appointment with a phone number.
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>

          {/* Current Appointment with Vitals and Attachments */}
          {hasCurrentAppointment && (
            <Paper elevation={2} sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, justifyContent: 'space-between' }}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <LocalHospital color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6" component="h2">
                      Current Appointment
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 4 }}>
                    Token #{currentAppointment.token} • {currentAppointment.appointment_type}
                  </Typography>
                </Box>
                {!isMobile && (
                  <Button 
                    variant="contained" 
                    color="primary" 
              size="medium"
                    onClick={handleOpenConsultation}
                  startIcon={<MedicalServices />}
                  sx={{ 
                    fontWeight: 'bold',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                    position: 'relative',
                    overflow: 'hidden',
                    animation: 'pulse 2s infinite',
                    '@keyframes pulse': {
                      '0%': {
                        boxShadow: '0 0 0 0 rgba(25, 118, 210, 0.7)',
                      },
                      '70%': {
                        boxShadow: '0 0 0 6px rgba(25, 118, 210, 0)',
                      },
                      '100%': {
                        boxShadow: '0 0 0 0 rgba(25, 118, 210, 0)',
                      }
                    },
                    '&:hover': {
                      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
                    },
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'linear-gradient(to right, transparent, rgba(255, 255, 255, 0.1), transparent)',
                      transform: 'translateX(-100%)',
                      transition: 'transform 0.6s',
                    },
                    '&:hover::after': {
                      transform: 'translateX(100%)',
                    }
                  }}
                  >
                    Open Consultation File
                  </Button>
                )}
                </Box>
              <Divider sx={{ mb: 1.5 }} />
              
              {/* Vitals and Attachments in a balanced layout */}
              <Grid container spacing={2}>
                {/* Vitals Section */}
              <Grid item xs={12} md={6}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Healing color="primary" sx={{ mr: 1, fontSize: '1.1rem' }} />
                      <Typography variant="subtitle1" sx={{ fontSize: '0.95rem', fontWeight: 'medium' }}>
                        Patient Vitals
                      </Typography>
                      <IconButton 
                        size="small" 
                        onClick={() => setEditingVitals(!editingVitals)} 
                        sx={{ ml: 1, p: 0.5 }}
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                    </Box>
                    
                          {editingVitals ? (
                    <Grid container spacing={1}>
                      {Object.entries(vitals).map(([key, value], index) => (
                        <Grid item xs={6} key={key}>
                          <TextField
                            fullWidth
                            size="small"
                            label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                            value={value}
                            onChange={(e) => handleVitalChange(key, e.target.value)}
                            disabled={vitalsLoading}
                            InputProps={{
                              endAdornment: (
                                <Typography variant="caption" color="text.secondary">
                                  {key === 'bloodPressure' ? 'mmHg' : 
                                   key === 'heartRate' ? 'bpm' : 
                                   key === 'temperature' ? '°C' : 
                                   key === 'spO2' ? '%' : 
                                   key === 'weight' ? 'kg' :
                                   key === 'height' ? 'cm' :
                                   key === 'bloodSugar' ? 'mg/dL' : ""}
                                </Typography>
                              ),
                            }}
                          />
                        </Grid>
                      ))}
                      <Grid item xs={12}>
                        {vitalsError && (
                          <Alert severity="error" sx={{ mb: 1 }}>
                            {vitalsError}
                          </Alert>
                        )}
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button 
                            variant="contained" 
                            onClick={handleSaveVitals}
                            size="small"
                            disabled={vitalsLoading}
                            sx={{ mt: 1 }}
                          >
                            {vitalsLoading ? (
                              <>
                                <CircularProgress size={20} sx={{ mr: 1 }} />
                                Saving...
                              </>
                            ) : (
                              'Save Vitals'
                            )}
                          </Button>
                          <Button
                            variant="outlined"
                            onClick={() => setEditingVitals(false)}
                            size="small"
                            disabled={vitalsLoading}
                            sx={{ mt: 1 }}
                          >
                            Cancel
                          </Button>
                        </Box>
                      </Grid>
            </Grid>
                  ) : (
                    <Box sx={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(2, 1fr)', 
                      gap: 2,
                      mt: 1,
                      p: 1.5,
                      borderRadius: 1,
                      bgcolor: 'rgba(0, 0, 0, 0.01)',
                      border: '1px solid #eee'
                    }}>
                      {Object.entries(vitals).map(([key, value], index) => (
                        <Box key={key} sx={{ display: 'flex', alignItems: 'baseline' }}>
                          <Typography variant="body2" color="text.secondary" sx={{ width: '50%', fontSize: '0.8rem' }}>
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
                          </Typography>
                          <Typography variant="body1" sx={{ 
                            fontWeight: key === 'bloodPressure' || key === 'heartRate' ? 'medium' : 'normal',
                            color: key === 'bloodPressure' ? 'error.main' : 'text.primary'
                          }}>
                            {value} {key === 'bloodPressure' ? 'mmHg' : 
                                    key === 'heartRate' ? 'bpm' : 
                                    key === 'temperature' ? '°C' : 
                                    key === 'spO2' ? '%' : 
                                    key === 'weight' ? 'kg' :
                                    key === 'height' ? 'cm' :
                                    key === 'bloodSugar' ? 'mg/dL' : ""}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              </Grid>

                  {/* Medical Records Section - Updated to match vitals styling */}
                  <Grid item xs={12} md={6}>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Description color="primary" sx={{ mr: 1, fontSize: '1.1rem' }} />
                        <Typography variant="subtitle1" sx={{ fontSize: '0.95rem', fontWeight: 'medium' }}>
                          Medical Records
                        </Typography>
                        <Button 
                          variant="text" 
                          color="primary" 
                          size="small"
                          onClick={handleOpenReportsModal}
                          sx={{ ml: 1, p: 0.5, minWidth: 'auto' }}
                        >
                          View All
                        </Button>
                        <Button 
                          variant="text" 
                          color="primary" 
                          size="small"
                          startIcon={<Upload fontSize="small" />}
                          onClick={handleOpenUploadModal}
                          sx={{ ml: 1, p: 0.5 }}
                        >
                          Upload
                        </Button>
                      </Box>
                      
                      <Box sx={{ 
                        display: 'grid', 
                        gridTemplateColumns: '1fr',
                        gap: 1,
                        mt: 1,
                        p: 1,
                        borderRadius: 1,
                        bgcolor: 'rgba(0, 0, 0, 0.01)',
                        border: '1px solid #eee',
                        maxHeight: '250px',
                        overflowY: 'auto'
                      }}>
                        {attachmentsLoading ? (
                          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                            <CircularProgress size={24} />
                          </Box>
                        ) : attachmentsError ? (
                          <Alert 
                            severity="error" 
                            action={
                              <Button color="inherit" size="small" 
                              onClick={() => {
                                handleCloseReportsModal();
                                handleOpenUploadModal();
                              }}>
                                Retry
                              </Button>
                            }
                          >
                            {attachmentsError}
                          </Alert>
                        ) : attachments.length > 0 ? (
                          <Grid container spacing={1}>
                            {attachments.map((attachment) => (
                              <Grid item xs={12} key={attachment.id}>
                                <Box 
                                  sx={{ 
                                    borderRadius: 1,
                                    border: '1px solid #eee',
                                    p: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    cursor: 'pointer',
                                    '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.01)' }
                                  }}
                                  onClick={() => handleOpenAttachment(attachment)}
                                >
                                  <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                                    {getAttachmentIcon(attachment.type)}
                                    <Box sx={{ minWidth: 0, ml: 1 }}>
                                      <Typography variant="body2" sx={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {attachment.name}
                                      </Typography>
                                    </Box>
                                  </Box>
                                  
                                  <IconButton 
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteAttachment(attachment.id);
                                    }}
                                    color="error"
                                  >
                                    <Close fontSize="small" />
                                  </IconButton>
                                </Box>
                              </Grid>
                            ))}
                          </Grid>
                        ) : (
                          <Box sx={{ py: 4, textAlign: 'center' }}>
                            <Typography variant="body2" color="text.secondary">
                              No medical records available.
                            </Typography>
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<Upload />}
                              onClick={() => {
                                handleCloseReportsModal();
                                handleOpenUploadModal();
                              }}
                              sx={{ mt: 2 }}
                            >
                              Upload New Record
                            </Button>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            )}

            {/* Message when no current appointment */}
            {!hasCurrentAppointment && (
              <Paper elevation={2} sx={{ p: 3, mb: 2, textAlign: 'center' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2 }}>
                  <CalendarToday sx={{ fontSize: 40, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    No Current Appointment
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 500, mx: 'auto', mb: 2 }}>
                    This patient doesn't have an appointment scheduled for today.
                  </Typography>
                  <Button 
                    variant="outlined" 
                    color="primary"
                    startIcon={<Add />}
                    onClick={handleOpenAppointmentModal}
                    sx={{ mt: 1 }}
                  >
                    Schedule New Appointment
                  </Button>
                </Box>
              </Paper>
            )}

          {/* Past Appointments */}
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <History sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography variant="h6" component="h2">
                Past Appointments
              </Typography>
            </Box>
            
            {pastAppointments.length > 0 ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Fees Paid</TableCell>
                      <TableCell>Mode</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pastAppointments.map((appointment) => (
                      <TableRow key={appointment.appointment_id}>
                        <TableCell>{formatDate(appointment.slot)}</TableCell>
                        <TableCell>{appointment.appointment_type}</TableCell>
                        <TableCell>
                          <Chip 
                            label={appointment.status}
                            size="small"
                            color={
                              appointment.status === 'Completed' ? 'success' : 
                              appointment.status === 'Cancelled' ? 'error' : 
                              'primary'
                            }
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={appointment.paid ? 'Paid' : 'Unpaid'}
                            size="small"
                            color={appointment.paid ? 'success' : 'error'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{appointment.mode || 'N/A'}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleOpenPrescription(appointment)}
                              disabled={prescriptionLoadingMap[appointment.id]}
                            >
                              {prescriptionLoadingMap[appointment.id] ? (
                                <>
                                  <CircularProgress size={16} sx={{ mr: 1 }} />
                                  Loading...
                                </>
                              ) : (
                                'Prescription'
                              )}
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleOpenAppointmentDetails(appointment)}
                            >
                              Details
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                  No past appointments found for this patient.
                </Typography>
              </Box>
            )}
          </Paper>
        </Box>
      )}

      {/* Attachment Preview Dialog */}
      <Dialog
        open={openAttachmentDialog}
        onClose={handleCloseAttachmentDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedAttachment?.name}
          <IconButton
            aria-label="close"
            onClick={handleCloseAttachmentDialog}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            &times;
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ p: 2, textAlign: 'center' }}>
            {selectedAttachment?.type === 'image' ? (
              <Box 
                component="img" 
                src="https://via.placeholder.com/800x600?text=Sample+Medical+Image"
                alt={selectedAttachment?.name}
                sx={{ maxWidth: '100%', maxHeight: '70vh' }}
              />
            ) : selectedAttachment?.type === 'pdf' ? (
              <Box sx={{ height: '70vh', bgcolor: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography>PDF Viewer would be integrated here</Typography>
              </Box>
            ) : (
              <Box sx={{ height: '70vh', bgcolor: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography>Document Viewer would be integrated here</Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAttachmentDialog}>Close</Button>
          <Button startIcon={<Download />} color="primary">Download</Button>
          <Button startIcon={<Print />} color="primary">Print</Button>
        </DialogActions>
      </Dialog>

      {/* Reports Modal */}
      <Dialog 
        open={reportsModalOpen} 
        onClose={handleCloseReportsModal}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Description color="primary" sx={{ mr: 1 }} />
            Medical Records
          </Box>
          <IconButton size="small" onClick={handleCloseReportsModal}>
            <Close fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {attachmentsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : attachmentsError ? (
            <Alert 
              severity="error" 
              action={
                <Button color="inherit" size="small" onClick={fetchPatientDetails}>
                  Retry
                </Button>
              }
            >
              {attachmentsError}
            </Alert>
          ) : attachments.length > 0 ? (
            <Grid container spacing={1}>
              {attachments.map((attachment) => (
                <Grid item xs={12} sm={6} key={attachment.id}>
                  <Box 
                    sx={{ 
                      borderRadius: 1,
                      border: '1px solid #eee',
                      p: 1.5,
                      display: 'flex',
                      flexDirection: 'column',
                      height: '100%',
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.01)' }
                    }}
                    onClick={() => handleOpenAttachment(attachment)}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <PictureAsPdf color="error" sx={{ mr: 1, fontSize: '1.5rem' }} />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {attachment.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {attachment.date} • {attachment.size}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Box sx={{ mt: 'auto', display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                      <Button 
                        variant="outlined" 
                        size="small" 
                        color="error"
                        startIcon={<Close sx={{ fontSize: '1rem' }} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAttachment(attachment.id);
                        }}
                        sx={{ py: 0.5 }}
                      >
                        Delete
                      </Button>
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                No medical records available.
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Upload />}
                onClick={() => {
                  handleCloseReportsModal();
                  handleOpenUploadModal();
                }}
                sx={{ mt: 2 }}
              >
                Upload New Record
              </Button>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Prescription Modal */}
      <Dialog
        open={prescriptionModalOpen}
        onClose={handleClosePrescriptionModal}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <MedicalServices color="primary" sx={{ mr: 1 }} />
            Prescription Details
          </Box>
          <Box>
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<Print />} 
              onClick={handlePrintPrescription}
              sx={{ mr: 1 }}
            >
              Print
            </Button>
            <IconButton size="small" onClick={handleClosePrescriptionModal}>
              <Close fontSize="small" />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedPrescription && (
            <Box sx={{ p: 2 }}>
              {/* Header Section */}
              <Box sx={{ mb: 3, textAlign: 'center' }}>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                  DigiCare Medical Center
                </Typography>
                <Typography variant="subtitle1">
                  {selectedPrescription.appointmentInfo.doctor}
                </Typography>
                <Typography variant="subtitle2" color="text.secondary">
                  {selectedPrescription.appointmentInfo.department}
                </Typography>
              </Box>
              
              {/* Patient and Appointment Info */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Patient Information
                  </Typography>
                  <Typography variant="body2">
                    <strong>Name:</strong> {selectedPrescription.initialData.patientName}
                  </Typography>
                  <Typography variant="body2">
                    <strong>ID:</strong> {selectedPrescription.initialData.patientId}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Age/Gender:</strong> {selectedPrescription.initialData.patientAge} years, {selectedPrescription.initialData.patientGender}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Appointment Details
                  </Typography>
                  <Typography variant="body2">
                    <strong>Date:</strong> {selectedPrescription.initialData.appointmentDate}
                  </Typography>
                  <Typography variant="body2">
                    <strong>ID:</strong> {selectedPrescription.initialData.appointmentId}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Status:</strong> {selectedPrescription.appointmentInfo.status}
                  </Typography>
                </Grid>
              </Grid>
              
              {/* Vitals Section */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Vitals
                </Typography>
                <Grid container spacing={2}>
                  {Object.entries(selectedPrescription.initialData.vitals).map(([key, value]) => (
                    <Grid item xs={6} sm={3} key={key}>
                      <Box sx={{ 
                        p: 1.5, 
                        bgcolor: 'background.default',
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider'
                      }}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                          {value}
                </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Box>
              
              {/* Complaints Section */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Complaints
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Complaint</TableCell>
                        <TableCell>Duration</TableCell>
                        <TableCell>Severity</TableCell>
                        <TableCell>Notes</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedPrescription.initialData.complaints.map((complaint, index) => (
                        <TableRow key={index}>
                          <TableCell>{complaint.name}</TableCell>
                          <TableCell>{complaint.duration}</TableCell>
                          <TableCell>{complaint.severity}</TableCell>
                          <TableCell>{complaint.notes}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>

              {/* Diagnosis Section */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Diagnosis
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Diagnosis</TableCell>
                        <TableCell>Notes</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedPrescription.initialData.diagnosis.map((diag, index) => (
                        <TableRow key={index}>
                          <TableCell>{diag.name}</TableCell>
                          <TableCell>{diag.notes}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>

              {/* Medications Section */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Medications
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Medicine</TableCell>
                        <TableCell>Dose</TableCell>
                        <TableCell>Frequency</TableCell>
                        <TableCell>Duration</TableCell>
                        <TableCell>Instructions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedPrescription.initialData.medications.map((med, index) => (
                        <TableRow key={index}>
                          <TableCell>{med.name}</TableCell>
                          <TableCell>{med.dose}</TableCell>
                          <TableCell>{med.frequency}</TableCell>
                          <TableCell>{med.duration}</TableCell>
                          <TableCell>{med.notes || med.timing || ''}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
              
              {/* Tests Section */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Tests Recommended
                </Typography>
                <Box sx={{ 
                  p: 2, 
                  bgcolor: 'background.default',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider'
                }}>
                  {selectedPrescription.initialData.tests.map((test, index) => (
                    <Typography key={index} variant="body2" sx={{ mb: 0.5 }}>
                      • {test}
                    </Typography>
                  ))}
                </Box>
              </Box>
              
              {/* Advice Section */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Advice
                </Typography>
                <Box sx={{ 
                  p: 2, 
                  bgcolor: 'background.default',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider'
                }}>
                  <Typography variant="body2">
                    {selectedPrescription.initialData.advice}
                  </Typography>
                </Box>
              </Box>
              
              {/* Follow-up Section */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Follow-up
                </Typography>
                <Typography variant="body2">
                  Please return for follow-up on {selectedPrescription.initialData.followUpDate}
                </Typography>
              </Box>
              
              {/* Signature Section */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                    {selectedPrescription.appointmentInfo.doctor}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedPrescription.appointmentInfo.department}
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* File Upload Modal */}
      <Dialog
        open={uploadModalOpen}
        onClose={handleCloseUploadModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CloudUpload color="primary" sx={{ mr: 1 }} />
            Upload Medical Record
          </Box>
          <IconButton size="small" onClick={handleCloseUploadModal}>
            <Close fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ p: 2 }}>
            {/* File Drop Area */}
            <Box
              sx={{
                border: isDragging ? '2px dashed #2196f3' : '2px dashed #ccc',
                borderRadius: 1,
                p: 3,
                mb: 3,
                textAlign: 'center',
                bgcolor: isDragging ? 'rgba(33, 150, 243, 0.04)' : 'transparent',
                transition: 'all 0.2s',
                cursor: 'pointer'
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDrop={handleFileDrop}
              onClick={() => document.getElementById('file-upload-input').click()}
            >
              <input
                id="file-upload-input"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />
              <CloudUpload color="primary" sx={{ fontSize: '3rem', mb: 1 }} />
              <Typography variant="body1" sx={{ mb: 1 }}>
                {selectedFile ? selectedFile.name : 'Drag and drop a file here or click to browse'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Supported file types: PDF, JPG, PNG, DOC
              </Typography>
            </Box>
            
            {/* File Details Form */}
            {selectedFile && (
              <Box sx={{ mt: 3 }}>
                <TextField
                  fullWidth
                  label="File Name"
                  value={uploadFileName}
                  onChange={(e) => setUploadFileName(e.target.value)}
                  margin="normal"
                  required
                  helperText="Enter a name for this medical record"
                />
                
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    File Type
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip
                      label="PDF"
                      variant={uploadFileType === 'pdf' ? 'filled' : 'outlined'}
                      color={uploadFileType === 'pdf' ? 'primary' : 'default'}
                      onClick={() => setUploadFileType('pdf')}
                      sx={{ cursor: 'pointer' }}
                    />
                    <Chip
                      label="Image"
                      variant={uploadFileType === 'image' ? 'filled' : 'outlined'}
                      color={uploadFileType === 'image' ? 'primary' : 'default'}
                      onClick={() => setUploadFileType('image')}
                      sx={{ cursor: 'pointer' }}
                    />
                    <Chip
                      label="Document"
                      variant={uploadFileType === 'document' ? 'filled' : 'outlined'}
                      color={uploadFileType === 'document' ? 'primary' : 'default'}
                      onClick={() => setUploadFileType('document')}
                      sx={{ cursor: 'pointer' }}
                    />
                  </Box>
                </Box>
                
                <Box sx={{ mt: 3, display: 'flex', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    File Size: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUploadModal}>Cancel</Button>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<CloudUpload />}
            onClick={handleFileUpload}
            disabled={!selectedFile || !uploadFileName}
          >
            Upload File
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Attachment</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this attachment? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={confirmDeleteAttachment} 
            color="error" 
            variant="contained"
            disabled={attachmentsLoading}
          >
            {attachmentsLoading ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Appointment Details Modal */}
      <Dialog
        open={appointmentDetailsOpen}
        onClose={handleCloseAppointmentDetails}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
          <Typography variant="h6">Appointment Details</Typography>
          <IconButton onClick={handleCloseAppointmentDetails} size="small">
            <Close fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedAppointment && (
            <Box sx={{ p: 2 }}>
              {/* Patient Information Section */}
              <Typography variant="h6" color="primary.main" sx={{ mb: 2 }}>
                Patient Information
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar 
                  sx={{ width: 56, height: 56, bgcolor: 'primary.main', mr: 2 }}
                >
                  {selectedAppointment.patient.name ? selectedAppointment.patient.name.charAt(0) : 'P'}
                </Avatar>
                <Box>
                  <Typography variant="h6">{selectedAppointment.patient.name || 'Unknown Patient'}</Typography>
                  <Box sx={{display: 'flex', flexDirection: 'row', gap: 1}}>
                  <Typography variant="body2" color="text.secondary">
                    ID: {selectedAppointment.patient.patient_id || 'Unknown'} 
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                     {selectedAppointment.patient.age  }
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                     {selectedAppointment.patient.gender}
                  </Typography>
                  </Box>
                </Box>
              </Box>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                {selectedAppointment.patient.phone_number && <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
                    label="Phone Number"
                    value={selectedAppointment.patient.phone_number}
                    InputProps={{ readOnly: true }}
                    variant="outlined"
                    size="small"
                    margin="normal"
                  />
                </Grid>}
                
                {selectedAppointment.patient.location && (
                  <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
                      label="Location"
                      value={selectedAppointment.patient.location}
                      InputProps={{ readOnly: true }}
                      variant="outlined"
                      size="small"
                      margin="normal"
                    />
                  </Grid>
                )}
                
                {selectedAppointment.patient.guardian && (
                  <Grid item xs={12} sm={6} md={4}>
            <TextField
                      fullWidth
                      label="Guardian Name"
                      value={selectedAppointment.patient.guardian}
                      InputProps={{ readOnly: true }}
                      variant="outlined"
                      size="small"
                      margin="normal"
                    />
                  </Grid>
                )}
              </Grid>
              
              <Divider sx={{ my: 3 }} />
              
              {/* Appointment Details */}
              <Typography variant="h6" color="primary.main" sx={{ mb: 2 }}>
                Appointment Details
              </Typography>
              
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={4}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Appointment Date
                    </Typography>
                    <Typography variant="body1">
                      {selectedAppointment.date || 'Not scheduled'}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Appointment Type
                    </Typography>
                    <Typography variant="body1">
                      {selectedAppointment.appointment_type || 'General Checkup'}
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6} md={4}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Reason for Visit
                    </Typography>
                    <Typography variant="body1">
                      {selectedAppointment.disease || 'Not specified'}
                    </Typography>
                  </Box>
                  
                  {selectedAppointment.doctor && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Doctor
                      </Typography>
                      <Typography variant="body1">
                        {selectedAppointment.doctor}
                      </Typography>
                    </Box>
                  )}
                  
                  {selectedAppointment.department && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Department
                      </Typography>
                      <Typography variant="body1">
                        {selectedAppointment.department}
                      </Typography>
                    </Box>
                  )}
                </Grid>
                
                <Grid item xs={12} sm={6} md={4}>
                  {selectedAppointment.fees_paid > 0 && (
                    <>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Amount
                        </Typography>
                        <Typography variant="body1">
                          ₹{selectedAppointment.fees_paid}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Payment Method
                        </Typography>
                        <Typography variant="body1">
                          {selectedAppointment.mode || 'Not specified'}
                        </Typography>
                      </Box>
                    </>
                  )}
                </Grid>
              </Grid>
              
              <Divider sx={{ my: 3 }} />
              
              {/* Appointment Status Information */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" color="primary.main" sx={{ mb: 2 }}>
                  Appointment Status
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={4}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Appointment ID
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      #{selectedAppointment.id}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={4}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Status
                    </Typography>
                <Typography 
                  variant="body1" 
                      fontWeight="medium"
                  sx={{ 
                        color: selectedAppointment.status?.toLowerCase() === 'completed' ? 'success.main' : 
                               selectedAppointment.status?.toLowerCase() === 'cancelled' ? 'error.main' : 
                               selectedAppointment.status?.toLowerCase() === 'pending' ? 'warning.main' : 'text.primary'
                  }}
                >
                      {selectedAppointment.status || 'Pending'}
                </Typography>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={4}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Payment Status
                    </Typography>
                <Typography 
                  variant="body1" 
                      fontWeight="medium"
                      sx={{ color: selectedAppointment.paid ? 'success.main' : 'error.main' }}
                    >
                      {selectedAppointment.paid ? 'Paid' : 'Unpaid'}
                </Typography>
                  </Grid>
                  
                  {selectedAppointment.token && (
                    <Grid item xs={12} sm={6} md={4}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Token Number
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        #{selectedAppointment.token}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
          </Box>
        </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAppointmentDetails}>Close</Button>
          {selectedAppointment && selectedAppointment.paid && (
          <Button 
            variant="contained"
              color="primary" 
              onClick={handlePrintPaymentReceipt}
              startIcon={<Print />}
            >
              Print Receipt
            </Button>
          )}
          {selectedAppointment && selectedAppointment.status === 'completed' && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<Assignment />}
              onClick={() => handleOpenPrescription({
                id: selectedAppointment.id,
                date: selectedAppointment.date,
                doctor: selectedAppointment.doctor,
                department: selectedAppointment.department,
                diagnosis: selectedAppointment.disease
              })}
            >
              View Prescription
          </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PatientInfoPage; 