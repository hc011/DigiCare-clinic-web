import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Chip,
  Button,
  IconButton,
  Card,
  CardContent,
  TextField,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  AppBar,
  Toolbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Autocomplete,
  CircularProgress,
  Alert,
  Collapse,
  Avatar,
  Backdrop,
} from '@mui/material';

// Import Timeline components from the correct package
import Timeline from '@mui/lab/Timeline';
import TimelineItem from '@mui/lab/TimelineItem';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineDot from '@mui/lab/TimelineDot';
import TimelineOppositeContent from '@mui/lab/TimelineOppositeContent';

// Import the PrescriptionForm component
import { PrescriptionForm } from './PrescriptionPage';

import {
  CalendarToday,
  AccessTime,
  LocalHospital,
  ArrowBack,
  MedicalServices,
  Save,
  Print,
  Close,
  ExpandMore,
  Add,
  Remove,
  RemoveCircleOutline,
  AttachMoney,
  CheckCircle,
  Paid as PaidIcon,
  Person,
  Assignment,
  ReceiptLong,
  PictureAsPdf,
  Image,
  Description,
  InsertDriveFile,
  Edit,
  Upload,
  CloudUpload,
  Cancel as CancelIcon,
  ContentCopy as ContentCopyIcon,
  FileCopy,
  History,
  Phone,
  Badge,
  Healing,
} from '@mui/icons-material';

import { PageHeader } from '../components/common/PageHeader';

import {getAttachments, uploadAttachment, deleteAttachment, getPatientDetails, getPrescriptions, savePrescription, manageVitals, saveTemplate, getVitals, getCurrentPrescription, getPastPrescriptions, getAppointmentDetails, markPatientAsDone} from '../services/api';
import { printPrescription } from '../utils/prescriptionUtils';

// Add this import at the top of the file
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

// Placeholder for showNotification function
const showNotification = (message, type) => {
  console.log(`Notification: ${type} - ${message}`);
};

const ConsultationPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  console.log(location.state)
  
  // Add global loading state
  const [isPageLoading, setIsPageLoading] = useState(true);
  
  // Add new state for tracking save status
  const [isSavingPrescription, setIsSavingPrescription] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Reset isPageLoading to true when the component mounts
  useEffect(() => {
    setIsPageLoading(true);
  }, []);
  
  // Get patient data from location state
  const patientInfo = location.state?.patientInfo || {
    id: "",
    name: "",
    age: "",
    gender: "",
    phone: "",
    allergies: "",
    chronicConditions: "",
  };

  const appointmentInfo = location.state?.appointmentInfo || {
    id: "",
    token: "",
    date: "",
    time: "",
    doctor: "",
    department: "",
    type: "",
    status: "",
    reason: "",
    paid: false,
    checkin: false,
    fees: 0,
    mode: "",
  };

  // Get vitals data from location state or use default values
  const vitalsInfo = {
    bloodPressure: '',
    heartRate: '',
    temperature: '',
    spO2: '',
    height: '',
    weight: '',
    bloodSugar: ''
  };

  // Add this line to get the getCurrentCabinId function from context
  const { getCurrentCabinId } = useCheckupCabin();

  // Replace this line later in the component
  const user = JSON.parse(localStorage.getItem("user"));
  const cabinId = getCurrentCabinId();

  // Get complaints data from location state or use empty array
  const complaintsData = location.state?.complaintsData || [];

  // Get queue position information
  const position = location.state?.position || 0;
  const late = location.state?.late || false;
  const status = location.state?.status || 'pending';

  // Ensure state variables are declared only once
  const [pastPrescriptions, setPastPrescriptions] = useState([]);
  const [isLoadingPrescriptions, setIsLoadingPrescriptions] = useState(false);
  const [pastPrescriptionsOpen, setPastPrescriptionsOpen] = useState(false);
  const [isLoadingPrescription, setIsLoadingPrescription] = useState(false);

  // Add useEffect to fetch past prescriptions when component mounts
  useEffect(() => {
    const fetchPastPrescriptions = async () => {
      try {
        setIsLoadingPrescriptions(true);

        if (patientInfo.id && cabinId) {
          const response = await getPastPrescriptions(patientInfo.id, cabinId);
          console.log("Past Prescriptions Response:", response);
          // Ensure response is an array before setting state
          setPastPrescriptions(Array.isArray(response?.prescription) ? response.prescription : []);
        } else {
          console.error('Missing patient ID or cabin ID');
          setPastPrescriptions([]);
        }
      } catch (error) {
        console.error("Error fetching past prescriptions:", error);
        setPastPrescriptions([]);
      } finally {
        setIsLoadingPrescriptions(false);
      }
    };

    fetchPastPrescriptions();
  }, [patientInfo.id]);

  useEffect(() => {
    console.log("Past Prescriptions:", pastPrescriptions);
  }, [pastPrescriptions]);

  // We're not going to use the complaints data for prefilling
  // Instead, we'll just initialize with an empty complaint

  // Add new state for current prescription
  const [currentPrescriptionDetails, setCurrentPrescriptionDetails] = useState(null);
  const [isLoadingCurrentPrescription, setIsLoadingCurrentPrescription] = useState(false);
  const [currentPrescriptionError, setCurrentPrescriptionError] = useState(null);

  // Function to fetch current prescription
  const fetchCurrentPrescription = async () => {
    if (!appointmentInfo?.id) return;

    try {
      setIsLoadingCurrentPrescription(true);
      setCurrentPrescriptionError(null);

      const prescriptionData = await getCurrentPrescription(appointmentInfo.id);
      console.log("Current prescription data:", prescriptionData);
      // The API returns the prescription data directly, not in an array
      if (prescriptionData) {
        console.log("Prescription Data:", prescriptionData)
        setCurrentPrescriptionDetails(prescriptionData);
      }
    } catch (error) {
      console.error("Error fetching current prescription:", error);
      setCurrentPrescriptionError("Failed to load current prescription");
    } finally {
      setIsLoadingCurrentPrescription(false);
    }
  };

  // Add useEffect to fetch current prescription
  useEffect(() => {
    if (appointmentInfo?.id) {
      fetchCurrentPrescription();
    }
  }, [appointmentInfo?.id]);

  // Update the prefilledPrescriptionData to use current prescription if available
  const prefilledPrescriptionData = {
    // For the main prescription state object
    patientName: patientInfo?.name || "",
    age: patientInfo?.age || "",
    gender: patientInfo?.gender || "",
    weight: currentPrescriptionDetails?.vitals?.weight || "",
    vitals: {
      bloodPressure: currentPrescriptionDetails?.vitals?.blood_pressure || "",
      heartRate: currentPrescriptionDetails?.vitals?.pulse_rate || "",
      temperature: currentPrescriptionDetails?.vitals?.temperature || "",
      spO2: currentPrescriptionDetails?.vitals?.spo2 || "",
      weight: currentPrescriptionDetails?.vitals?.weight || "",
      height: currentPrescriptionDetails?.vitals?.height || "",
      bloodSugar: currentPrescriptionDetails?.vitals?.blood_sugar || ""
    },
    // For the medications array
    medications: currentPrescriptionDetails?.medicines?.length > 0
      ? currentPrescriptionDetails.medicines.map(med => ({
          medicine: med.name || '',
          dose: med.dose || '',
          timing: med.when || '',
          frequency: med.frequency || '',
          duration: med.duration || '',
          notes: med.notes || '',
          isEditing: false
        }))
      : [{ medicine: '', dose: '', timing: '', frequency: '', duration: '', notes: '', isEditing: false }],
    // For the complaints array
    complaints: currentPrescriptionDetails?.complaints?.length > 0
      ? currentPrescriptionDetails.complaints.map(complaint => ({
          complaint: complaint.name || '',
          severity: complaint.severity || '',
          duration: complaint.duration || '',
          frequency: complaint.frequency || '',
          notes: complaint.notes || '',
          isEditing: false
        }))
      : [{ complaint: '', severity: '', duration: '', frequency: '', notes: '', isEditing: false }],
    // For the diagnoses array
    diagnoses: currentPrescriptionDetails?.diagnosis?.length > 0
      ? currentPrescriptionDetails.diagnosis.map(diagnosis => ({
          diagnosis: diagnosis.name || '',
          duration: diagnosis.duration || '',
          notes: diagnosis.notes || '',
          isEditing: false
        }))
      : [{ diagnosis: '', duration: '', notes: '', isEditing: false }],
    tests: currentPrescriptionDetails?.tests?.[0]?.testlist || [],
    instructions: currentPrescriptionDetails?.advice?.[0]?.advice || "",
    followUp: "",
    signature: ""
  };

  useEffect(() =>{
    console.log(prefilledPrescriptionData);
  },[prefilledPrescriptionData])

  const [openAttachmentDialog, setOpenAttachmentDialog] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const [confirmDoneDialog, setConfirmDoneDialog] = useState(false);
  const [isEditingVitals, setIsEditingVitals] = useState(false);
  const [editedVitals, setEditedVitals] = useState({...vitalsInfo});
  const [isCompletingConsultation, setIsCompletingConsultation] = useState(false);

  // Update the attachments to include the ECG report as a PDF
  const [attachments, setAttachments] = useState([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [attachmentsError, setAttachmentsError] = useState(null);

  // Get the PDF viewer context
  // const { openPdfViewer } = usePDFViewerContext();

  // Update the getAttachmentIcon function to make the icons more prominent
  const getAttachmentIcon = (type) => {
    switch (type) {
      case 'pdf':
        return <PictureAsPdf sx={{ fontSize: '1.5rem', color: '#f44336' }} />;
      case 'image':
        return <Image sx={{ fontSize: '1.5rem', color: '#2196f3' }} />;
      case 'document':
        return <Description sx={{ fontSize: '1.5rem', color: '#03a9f4' }} />;
      default:
        return <InsertDriveFile sx={{ fontSize: '1.5rem', color: '#757575' }} />;
    }
  };

  // Update the handleOpenAttachment function to directly open PDFs in a new tab
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
    setSelectedAttachment(null);
  };

  const handleDoneConsultation = () => {
    setConfirmDoneDialog(true);
  };

  const confirmDoneConsultation = async () => {
    try {
      setIsCompletingConsultation(true);
      // Call the markPatientAsDone API
      await markPatientAsDone(appointmentInfo.id);
      console.log("Patient marked as done successfully");
      // Navigate to the queue page
      navigate('/queue');
    } catch (error) {
      console.error("Error marking patient as done:", error);
      alert("Failed to mark consultation as done. Please try again.");
    } finally {
      setIsCompletingConsultation(false);
      setConfirmDoneDialog(false);

    }
  };

  const handleBackToPatient = () => {
    navigate(-1); // Navigate back to the previous page
  };

  // Add a ref to access the PrescriptionForm component's data
  const prescriptionFormRef = useRef();

  // Modify the handlePrescriptionSubmit function
  const handlePrescriptionSubmit = (formData) => {
    console.log("Raw form data received:", formData);
    
    // Check if medications exist and have the expected structure
    if (formData.medications) {
      console.log("Medications from form:", JSON.stringify(formData.medications, null, 2));
      
      // Log each medication individually for debugging
      formData.medications.forEach((med, index) => {
        console.log(`Medication ${index}:`, {
          medicine: med.medicine,
          dose: med.dose,
          frequency: med.frequency,
          timing: med.timing,
          duration: med.duration,
          notes: med.notes
        });
      });
    }
    const payload = {
      appointment_id: appointmentInfo.id || "",
      complaints: Array.isArray(formData.complaints) 
        ? formData.complaints.filter(complaint => complaint.complaint || complaint.duration || complaint.severity).map(complaint => ({
            name: complaint.complaint || "",
            duration: complaint.duration || "",
            severity: complaint.severity || "",
            frequency: complaint.frequency || "",
            notes: complaint.notes || ""
          }))
        : [],
      diagnosis: Array.isArray(formData.diagnoses) 
        ? formData.diagnoses.filter(diagnosis => diagnosis.diagnosis || diagnosis.duration).map(diagnosis => ({
            name: diagnosis.diagnosis || "",
            duration: diagnosis.duration || "",
            notes: diagnosis.notes || ""
          }))
        : [],
      medicine: Array.isArray(formData.medications) 
        ? formData.medications
            .filter(medication => medication.medicine || medication.dose || medication.frequency || medication.duration)
            .map(medication => {
              console.log("Processing medication:", medication);
              return {
                name: medication.medicine || "",
                dose: medication.dose || "",
                frequency: medication.frequency || "",
                when: medication.timing || "",
                duration: medication.duration || "",
                notes: medication.notes || ""
              };
            })
        : [],
      advice: formData.instructions || "",
      tests: Array.isArray(formData.tests) ? formData.tests : []
    };

    console.log("Saving prescription with payload:", JSON.stringify(payload, null, 2));
    
    // Set saving state to true
    setIsSavingPrescription(true);
    setSaveSuccess(false);
    
    // Call the savePrescription API with the payload
    savePrescription(payload)
      .then(data => {
        console.log('Prescription saved successfully:', data);
        setSaveSuccess(true);
        // Show success notification
        showNotification('Prescription saved successfully', 'success');
        // Reset success state after 2 seconds
        setTimeout(() => {
          setSaveSuccess(false);
        }, 2000);
        // Set shouldInitialize to false after successful save
        setShouldInitialize(false);
        fetchCurrentPrescription();
        })
      .catch(error => {
        console.error('Error saving prescription:', error);
        showNotification('Error saving prescription', 'error');
      })
      .finally(() => {
        setIsSavingPrescription(false);
      });
  };

  const handleEditVitals = () => {
    if (isEditingVitals) {
      // If we're currently editing and clicking save
      handleSaveVitals();
    } else {
      // If we're starting to edit
      setIsEditingVitals(true);
    }
  };

  const handleVitalsChange = (field, value) => {
    setEditedVitals(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Add this constant
  const hidePatientDetails = true; // Since we want to always hide patient details in consultation page

  // Add state for the file upload modal
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadFileType, setUploadFileType] = useState('pdf');
  const [isDragging, setIsDragging] = useState(false);

  // Add state for prescription modal
  const [prescriptionModalOpen, setPrescriptionModalOpen] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);

  // Add new state variables
  const [expandedAppointment, setExpandedAppointment] = useState(null);
  const [prescriptionDetails, setPrescriptionDetails] = useState(null);
  const [error, setError] = useState(null);
  const [pastAppointments, setPastAppointments] = useState([]);

  // Add these state variables at the top with other state declarations
  const [openSaveTemplateDialog, setOpenSaveTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateType, setTemplateType] = useState('');

  // Add these functions before the return statement
  const handleSaveTemplateOpen = (type) => {
    setTemplateType(type);
    setTemplateName('');
    setOpenSaveTemplateDialog(true);
  };

  const handleSaveTemplateClose = () => {
    setOpenSaveTemplateDialog(false);
    setTemplateName('');
  };

  const handleSaveTemplate = async () => {
    try {
      if (!templateName.trim()) {
        alert('Please enter a template name');
        return;
      }

      let payload;
      if (templateType === 'complaints') {
        // Get current form data from the PrescriptionForm component
        const formData = prescriptionFormRef.current?.getFormData();
        if (!formData) {
          alert('Unable to get form data');
          return;
        }

        payload = {
          name: templateName,
          complaints: formData.complaints.filter(complaint => 
            complaint.complaint || complaint.duration || complaint.severity
          ).map(complaint => ({
            name: complaint.complaint || "",
            duration: complaint.duration || "",
            severity: complaint.severity || "",
            frequency: "",
            notes: ""
          }))
        };
      }

      await saveTemplate(templateType, "CABIN_ID", payload);
      handleSaveTemplateClose();
      // Optionally show success message
      alert('Template saved successfully!');
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template. Please try again.');
    }
  };

  function formatDate(slot) {
    // Split the string at 'T' to get the date part
    const datePart = slot.split('T')[0];
  
    // Create a Date object from the date part
    const date = new Date(datePart);
  
    // Extract day, month, and year
    const day = String(date.getDate()).padStart(2, '0'); // Ensure two digits
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-indexed
    const year = date.getFullYear();
  
    // Return the formatted date
    return `${day}/${month}/${year}`;
  }
  

  // Add function to fetch patient details
  const fetchPatientDetails = async () => {
    try {
      setError(null);
      const response = await getPatientDetails(patientInfo.id);
      console.log("Patient details response:", response);
      
      if (response && response.other_appointments && Array.isArray(response.other_appointments)) {
        // Map the other_appointments to our pastAppointments state with proper structure
        const formattedAppointments = response.other_appointments
          .filter(app => app.appointment_id !== appointmentInfo.id) // Filter out current appointment
          .map(app => {
            // Extract date from appointment_id if possible
            let appointmentDate;
            try {
              if (app.appointment_id && app.appointment_id.includes('-')) {
                appointmentDate = app.appointment_id.split('-')[1].substring(0, 10);
                // Validate date format
                if (!/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate)) {
                  appointmentDate = new Date().toISOString().split('T')[0];
                }
              } else {
                appointmentDate = new Date().toISOString().split('T')[0];
              }
            } catch (e) {
              appointmentDate = new Date().toISOString().split('T')[0];
            }

            return {
              ...app,
              id: app.appointment_id,
              date: appointmentDate,
              token: app.token || 0,
              appointment_type: app.appointment_type || 'Consultation',
              status: app.status || 'pending',
              disease: app.disease || 'No diagnosis recorded'
            };
          });
        
        setPastAppointments(formattedAppointments);
        console.log("Formatted past appointments:", formattedAppointments);
      } else {
        console.log("No past appointments found in the response");
        setPastAppointments([]);
      }
    } catch (error) {
      console.error("Error fetching patient details:", error);
      setError("Failed to load patient history");
      setPastAppointments([]);
    }
  };

  // Add function to fetch prescription details
  const handleFetchPrescription = async (appointmentId) => {
    try {
      setIsLoadingPrescription(true);
      setError(null);
      
      // First, get the prescription data
      const prescriptionResponse = await getPrescriptions(appointmentId);
      console.log("Prescription response:", prescriptionResponse);
      
      // Then, get the vitals data
      const vitalsResponse = await getVitals(appointmentId);
      console.log("Vitals response:", vitalsResponse);
      
      // Finally, get any attachments
      const attachmentsResponse = await getAttachments(appointmentId);
      console.log("Attachments response:", attachmentsResponse);
      
      // Process attachments to ensure they have the correct format
      const processedAttachments = Array.isArray(attachmentsResponse) 
        ? attachmentsResponse.map(att => ({
            id: att.id,
            name: att.file_name || `Attachment-${att.id}`,
            type: att.file_type?.includes('pdf') ? 'pdf' : 
                  att.file_type?.includes('image') ? 'image' : 'document',
            url: getFullAttachmentUrl(att.file),
            description: att.description || ''
          }))
        : [];
      
      // Combine all the data into a comprehensive prescription details object
      if (prescriptionResponse && Array.isArray(prescriptionResponse) && prescriptionResponse.length > 0) {
        const prescriptionData = prescriptionResponse[0];
        
        // Create a combined prescription details object
        const combinedDetails = {
          ...prescriptionData,
          // Add vitals data if available
          vitals: vitalsResponse || {
            blood_pressure: "N/A",
            pulse_rate: "N/A",
            temperature: "N/A",
            spo2: "N/A"
          },
          // Ensure complaints is an array
          complaints: Array.isArray(prescriptionData.complaints) ? prescriptionData.complaints : [],
          // Ensure diagnosis is an array
          diagnosis: Array.isArray(prescriptionData.diagnosis) ? prescriptionData.diagnosis : [],
          // Ensure medicines is an array
          medicines: Array.isArray(prescriptionData.medicines) ? prescriptionData.medicines : [],
          // Ensure tests has a testlist array
          tests: prescriptionData.tests && prescriptionData.tests.testlist 
            ? prescriptionData.tests 
            : { testlist: [] },
          // Ensure advice has an advice string
          advice: prescriptionData.advice && typeof prescriptionData.advice.advice === 'string'
            ? prescriptionData.advice
            : { advice: prescriptionData.advice || "No advice recorded" },
          // Add processed attachments
          attachments: processedAttachments
        };
        
        setPrescriptionDetails(combinedDetails);
        setExpandedAppointment(appointmentId);
      } else {
        // If no prescription data is available, create a minimal object with available data
        setPrescriptionDetails({
          vitals: vitalsResponse || {
            blood_pressure: "N/A",
            pulse_rate: "N/A",
            temperature: "N/A",
            spo2: "N/A"
          },
          complaints: [],
          diagnosis: [],
          medicines: [],
          tests: { testlist: [] },
          advice: { advice: "No advice recorded" },
          attachments: processedAttachments
        });
        setExpandedAppointment(appointmentId);
      }
    } catch (error) {
      console.error("Error fetching prescription details:", error);
      setError("Failed to load prescription details");
      // Set minimal prescription details even on error
      setPrescriptionDetails({
        vitals: {
          blood_pressure: "N/A",
          pulse_rate: "N/A",
          temperature: "N/A",
          spo2: "N/A"
        },
        complaints: [],
        diagnosis: [],
        medicines: [],
        tests: { testlist: [] },
        advice: { advice: "Error loading prescription details" },
        attachments: []
      });
    } finally {
      setIsLoadingPrescription(false);
    }
  };

  // Add useEffect to fetch patient details on component mount
  useEffect(() => {
    if (patientInfo?.id) {
      fetchPatientDetails();
    }
  }, [patientInfo]);

  // Add function to handle opening the upload modal
  const handleOpenUploadModal = () => {
    setUploadModalOpen(true);
  };
  
  // Add function to handle closing the upload modal
  const handleCloseUploadModal = () => {
    setUploadModalOpen(false);
    setUploadFile(null);
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
    setUploadFile(file);
    
    // Set default file name from the file (without extension)
    const fileName = file.name.split('.').slice(0, -1).join('.');
    setUploadFileName(fileName);
    
    // Determine file type
    const fileType = file.type.includes('pdf') ? 'pdf' : 
                    file.type.includes('image') ? 'image' : 'document';
    setUploadFileType(fileType);
  };
  
  // Add function to handle file upload
  const handleFileUpload = async () => {
    if (!uploadFile || !uploadFileName) return;
    
    // Use appointment_id or id for synthetic patients (without mobile numbers)
    const appointmentId = appointmentInfo?.appointment_id || appointmentInfo?.id;
    
    // Return early if no appointment ID is available
    if (!appointmentId) {
      setAttachmentsError("Cannot upload file: No appointment ID available");
      return;
    }
    
    try {
      setAttachmentsLoading(true);
      setAttachmentsError(null);
      
      // Create form data
      const formData = new FormData();
      formData.append('appointment_id', appointmentId);
      formData.append('file', uploadFile);
      formData.append('file_name', uploadFileName);
      formData.append('file_type', uploadFile.type);
      formData.append('description', `Medical record uploaded for appointment ${appointmentId}`);
      
      // Upload the file
      const response = await uploadAttachment(formData);
      console.log('File uploaded successfully:', response);
      
      // Refresh attachments list
      await fetchAttachments();
      
      // Close the modal
      handleCloseUploadModal();
      
    } catch (error) {
      console.error('Error uploading file:', error);
      setAttachmentsError('Failed to upload file. Please try again.');
    } finally {
      setAttachmentsLoading(false);
    }
  };

  // Add function to handle opening the prescription modal
  const handleOpenPrescription = (prescription) => {
    console.log("Opening prescription:", prescription); // For debugging
    
    setSelectedPrescription({
      patientInfo: patientInfo,
      appointmentInfo: {
        date: new Date().toLocaleDateString(),
        doctor: appointmentInfo?.doctor || 'Doctor',
        diagnosis: prescription.diagnosis?.[0]?.name || '',
        id: appointmentInfo?.appointment_id || appointmentInfo?.id
      },
      initialData: {
        vitals: {
          bloodPressure: prescription.vitals?.blood_pressure || 'N/A',
          heartRate: prescription.vitals?.pulse_rate || 'N/A',
          temperature: prescription.vitals?.temperature || 'N/A',
          spO2: prescription.vitals?.spo2 || 'N/A',
          weight: prescription.vitals?.weight || 'N/A',
          height: prescription.vitals?.height || 'N/A',
          bloodSugar: prescription.vitals?.blood_sugar || 'N/A'
        },
        complaints: prescription.complaints?.map(complaint => ({
          complaint: complaint.name,
          severity: complaint.severity,
          duration: complaint.duration,
          frequency: complaint.frequency,
          notes: complaint.notes
        })) || [],
        diagnoses: prescription.diagnosis?.map(diag => ({
          diagnosis: diag.name,
          duration: diag.duration,
          notes: diag.notes
        })) || [],
        medications: prescription.medicines?.map(med => ({
          medicine: med.name,
          dose: med.dose,
          timing: med.when,
          frequency: med.frequency,
          duration: med.duration,
          notes: med.notes
        })) || [],
        tests: prescription.tests?.[0]?.testlist || [],
        instructions: prescription.advice?.[0]?.advice || '',
        followUp: '',
        attachments: prescription.attachments?.map(att => ({
          id: att.id,
          name: att.file_name,
          type: att.file_type?.includes('pdf') ? 'pdf' : 
                att.file_type?.includes('image') ? 'image' : 'document',
          url: getFullAttachmentUrl(att.file),
          date: new Date(att.uploaded_at).toLocaleDateString(),
          size: '1 MB' // You might want to get actual file size if available
        })) || []
      },
      readOnly: true
    });
    setPrescriptionModalOpen(true);
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
      patientInfo: selectedPrescription.patientInfo,
      appointmentInfo: selectedPrescription.appointmentInfo,
      complaints: selectedPrescription.initialData.complaints || [],
      diagnoses: selectedPrescription.initialData.diagnoses || [],
      medications: selectedPrescription.initialData.medications || [],
      tests: selectedPrescription.initialData.tests || []
    };
    
    // Use the global prescription print utility
    printPrescription(prescriptionData);
  };

  // Update the renderPrescriptionForm function
  const renderPrescriptionForm = () => (
    <Box>
      <PrescriptionForm 
        initialData={prefilledPrescriptionData}
        appointmentId={appointmentInfo.id}
        initialize={false} // Changed to false since we're already providing initialData
        onSubmit={handlePrescriptionSubmit}
        showPrintButton={false}
        showSubmitButton={false} // Hide the built-in submit button
        hidePatientDetails={hidePatientDetails}
        patientInfo={patientInfo}
        ref={prescriptionFormRef}
      />
      
      {/* Add a custom submit button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3, gap: 2 }}>
        <Button
          variant="outlined"
          color="primary"
          startIcon={<Print />}
          onClick={handlePrintCurrentPrescription}
        >
          Print
        </Button>
        <Button
          variant="contained"
          color={saveSuccess ? "success" : "primary"}
          startIcon={isSavingPrescription ? <CircularProgress size={20} /> : <Save />}
          onClick={() => {
            if (prescriptionFormRef.current && prescriptionFormRef.current.submitForm) {
              prescriptionFormRef.current.submitForm();
            }
          }}
          disabled={isSavingPrescription}
        >
          {isSavingPrescription ? "Saving..." : saveSuccess ? "Saved!" : "Save Prescription"}
        </Button>
      </Box>
    </Box>
  );

  // Add a new function to handle printing the current prescription
  const handlePrintCurrentPrescription = () => {
    // Get current prescription data from the form
    const formData = prescriptionFormRef.current?.getFormData();
    console.log("Form data retrieved for printing:", formData);
    
    // If form data couldn't be retrieved, use the prefilledPrescriptionData
    const currentPrescriptionData = (!formData || Object.keys(formData).length === 0) 
      ? {
          patientInfo: patientInfo,
          appointmentInfo: {
            ...appointmentInfo,
            date: new Date().toLocaleDateString(),
          },
          vitals: prefilledPrescriptionData.vitals || {
            bloodPressure: editedVitals.bloodPressure || 'N/A',
            heartRate: editedVitals.heartRate || 'N/A',
            temperature: editedVitals.temperature || 'N/A',
            spO2: editedVitals.spO2 || 'N/A',
            height: editedVitals.height || 'N/A',
            weight: editedVitals.weight || 'N/A',
            bloodSugar: editedVitals.bloodSugar || 'N/A'
          },
          complaints: prefilledPrescriptionData.complaints || [],
          medications: prefilledPrescriptionData.medications || [],
          diagnoses: prefilledPrescriptionData.diagnoses || [],
          tests: prefilledPrescriptionData.tests || [],
          instructions: prefilledPrescriptionData.instructions || '',
          followUp: prefilledPrescriptionData.followUp || ''
        }
      : {
          patientInfo: patientInfo,
          appointmentInfo: {
            ...appointmentInfo,
            date: new Date().toLocaleDateString(),
          },
          vitals: {
            bloodPressure: editedVitals.bloodPressure || 'N/A',
            heartRate: editedVitals.heartRate || 'N/A',
            temperature: editedVitals.temperature || 'N/A',
            spO2: editedVitals.spO2 || 'N/A',
            height: editedVitals.height || 'N/A',
            weight: editedVitals.weight || 'N/A',
            bloodSugar: editedVitals.bloodSugar || 'N/A'
          },
          complaints: formData.complaints?.filter(complaint => complaint.complaint || complaint.duration || complaint.severity) || [],
          medications: formData.medications?.filter(med => med.medicine || med.dose || med.frequency || med.duration) || [],
          diagnoses: formData.diagnoses?.filter(diag => diag.diagnosis || diag.duration) || [],
          tests: formData.tests || [],
          instructions: formData.instructions || '',
          followUp: formData.followUp || ''
        };
    
    console.log("Prescription data for printing:", currentPrescriptionData);
    
    // Use the global prescription print utility
    printPrescription(currentPrescriptionData);
  };

  // Add function to fetch attachments
  const fetchAttachments = async () => {
    // Use appointment_id or id for synthetic patients (without mobile numbers)
    const appointmentId = appointmentInfo?.appointment_id || appointmentInfo?.id;
    
    // Return early if no appointment ID is available
    if (!appointmentId) {
      console.error("No appointment ID available to fetch attachments");
      return;
    }
    
    try {
      setAttachmentsLoading(true);
      setAttachmentsError(null);
      
      const response = await getAttachments(appointmentId);
      console.log("Attachments response:", response);
      
      if (response) {
        setAttachments(response.map(att => ({
          id: att.id,
          name: att.file_name,
          type: att.file_type.includes('pdf') ? 'pdf' : 
                att.file_type.includes('image') ? 'image' : 'document',
          reportType: 'custom',
          date: new Date(att.uploaded_at).toLocaleDateString(),
          size: '1 MB', // Since size is not provided in the API
          url: getFullAttachmentUrl(att.file),
          description: att.description
        })));
      }
    } catch (error) {
      console.error("Error fetching attachments:", error);
      setAttachmentsError("Failed to load attachments. Please try again.");
    } finally {
      setAttachmentsLoading(false);
    }
  };

  useEffect(() => {
    // Fetch attachments when component mounts or appointment info changes
    fetchAttachments();
  }, [appointmentInfo?.id, appointmentInfo?.appointment_id]);

  // Add function to handle attachment deletion
  const handleDeleteAttachment = async (attachmentId, event) => {
    event.stopPropagation(); // Prevent the attachment box click event
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
      
      // Refresh attachments list
      await fetchAttachments();
      
    } catch (error) {
      console.error('Error deleting attachment:', error);
      setAttachmentsError('Failed to delete attachment. Please try again.');
    } finally {
      setAttachmentsLoading(false);
      setDeleteDialogOpen(false);
      setAttachmentToDelete(null);
    }
  };

  // Add function to handle appointment expansion
  const handleExpandAppointment = (appointmentId) => {
    if (expandedAppointment === appointmentId) {
      setExpandedAppointment(null);
      setPrescriptionDetails(null);
    } else {
      handleFetchPrescription(appointmentId);
    }
  };

  // Add JSX for past appointments section with real data
  const renderPastAppointments = () => {
    return (
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Past Appointments
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {pastAppointments.length > 0 ? (
          <List>
            {pastAppointments.map((appointment) => (
              <React.Fragment key={appointment.id}>
                <ListItem 
                  button 
                  onClick={() => handleExpandAppointment(appointment.id)}
                  sx={{
                    bgcolor: 'background.paper',
                    mb: 1,
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    '&:hover': {
                      bgcolor: 'action.hover',
                    }
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="subtitle1">
                          {appointment.date && new Date(appointment.date).toLocaleDateString()} 
                          {appointment.token ? ` - Token #${appointment.token}` : ''} 
                          {appointment.appointment_type ? ` - ${appointment.appointment_type}` : ''}
                        </Typography>
                        <Chip 
                          label={appointment.status}
                          size="small"
                          color={
                            appointment.status === 'done_checkup' || appointment.status === 'completed' ? 'success' : 
                            appointment.status === 'in_progress' ? 'primary' :
                            appointment.status === 'cancelled' ? 'error' : 'default'
                          }
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={
                      <Typography variant="body2" color="text.secondary">
                        {appointment.disease || 'No diagnosis recorded'}
                      </Typography>
                    }
                  />
                </ListItem>
                
                <Collapse in={expandedAppointment === appointment.id} timeout="auto" unmountOnExit>
                  <Box sx={{ p: 2, bgcolor: 'background.paper', ml: 2, borderLeft: 2, borderColor: 'primary.main' }}>
                    {isLoadingPrescription ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                        <CircularProgress size={24} />
                      </Box>
                    ) : prescriptionDetails ? (
                      <Grid container spacing={2}>
                        {/* Vitals */}
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" gutterBottom>Vitals</Typography>
                          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            <Typography variant="body2">BP: {prescriptionDetails.vitals.blood_pressure || 'N/A'}</Typography>
                            <Typography variant="body2">Temp: {prescriptionDetails.vitals.temperature || 'N/A'}°C</Typography>
                            <Typography variant="body2">Pulse: {prescriptionDetails.vitals.pulse_rate || 'N/A'}</Typography>
                            <Typography variant="body2">SpO2: {prescriptionDetails.vitals.spo2 || 'N/A'}%</Typography>
                          </Box>
                        </Grid>
                        
                        {/* Complaints */}
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" gutterBottom>Complaints</Typography>
                          {prescriptionDetails.complaints && prescriptionDetails.complaints.length > 0 ? (
                            prescriptionDetails.complaints.map((complaint, index) => (
                              <Typography key={index} variant="body2">
                                • {complaint.complaint || complaint.name} 
                                {complaint.duration ? ` - ${complaint.duration}` : ''} 
                                {complaint.severity ? ` (${complaint.severity})` : ''}
                              </Typography>
                            ))
                          ) : (
                            <Typography variant="body2" color="text.secondary">No complaints recorded</Typography>
                          )}
                        </Grid>
                        
                        {/* Diagnosis */}
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" gutterBottom>Diagnosis</Typography>
                          {prescriptionDetails.diagnosis && prescriptionDetails.diagnosis.length > 0 ? (
                            prescriptionDetails.diagnosis.map((diag, index) => (
                              <Typography key={index} variant="body2">
                                • {diag.diagnosis || diag.name} 
                                {diag.icd_code ? ` (${diag.icd_code})` : ''}
                                {diag.duration ? ` - ${diag.duration}` : ''}
                              </Typography>
                            ))
                          ) : (
                            <Typography variant="body2" color="text.secondary">No diagnosis recorded</Typography>
                          )}
                        </Grid>
                        
                        {/* Medicines */}
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" gutterBottom>Medications</Typography>
                          {prescriptionDetails.medicines && prescriptionDetails.medicines.length > 0 ? (
                            prescriptionDetails.medicines.map((med, index) => (
                              <Typography key={index} variant="body2">
                                • {med.name || med.medicine} 
                                {med.dose ? ` ${med.dose}` : ''} 
                                {med.frequency ? ` - ${med.frequency}` : ''} 
                                {med.duration ? ` for ${med.duration}` : ''} 
                                {med.instructions ? ` (${med.instructions})` : ''}
                                {med.when ? ` ${med.when}` : ''}
                              </Typography>
                            ))
                          ) : (
                            <Typography variant="body2" color="text.secondary">No medications prescribed</Typography>
                          )}
                        </Grid>
                        
                        {/* Tests */}
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" gutterBottom>Tests</Typography>
                          {prescriptionDetails.tests && prescriptionDetails.tests.testlist && prescriptionDetails.tests.testlist.length > 0 ? (
                            prescriptionDetails.tests.testlist.map((test, index) => (
                              <Typography key={index} variant="body2">• {test}</Typography>
                            ))
                          ) : (
                            <Typography variant="body2" color="text.secondary">No tests prescribed</Typography>
                          )}
                        </Grid>
                        
                        {/* Advice */}
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" gutterBottom>Advice</Typography>
                          <Typography variant="body2">
                            {prescriptionDetails.advice && prescriptionDetails.advice.advice ? 
                              prescriptionDetails.advice.advice : 'No specific advice provided'}
                          </Typography>
                        </Grid>
                        
                        {/* Attachments Section */}
                        {prescriptionDetails.attachments && prescriptionDetails.attachments.length > 0 && (
                          <Grid item xs={12}>
                            <Typography variant="subtitle2" sx={{ mb: 0.5, color: 'primary.main', fontSize: '0.875rem' }}>
                              Attachments
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                              {prescriptionDetails.attachments.map((attachment, idx) => (
                                <Chip
                                  key={idx}
                                  label={attachment.name || `Attachment ${idx + 1}`}
                                  onClick={() => handleOpenAttachment(attachment)}
                                  icon={getAttachmentIcon(attachment.type)}
                                  variant="outlined"
                                  sx={{ m: 0.5 }}
                                />
                              ))}
                            </Box>
                          </Grid>
                        )}
                      </Grid>
                    ) : (
                      <Typography color="text.secondary">No prescription details available</Typography>
                    )}
                  </Box>
                </Collapse>
              </React.Fragment>
            ))}
          </List>
        ) : (
          <Paper sx={{ p: 2, bgcolor: 'background.paper', textAlign: 'center' }}>
            <Typography color="text.secondary">No past appointments found</Typography>
          </Paper>
        )}
      </Box>
    );
  };

  const [isSavingVitals, setIsSavingVitals] = useState(false);
  const [vitalsLoading, setVitalsLoading] = useState(false);
  const [vitalsError, setVitalsError] = useState(null);

  // Add function to fetch vitals
  const fetchVitals = async () => {
    if (!appointmentInfo?.id) return;
    
    try {
      setVitalsLoading(true);
      setVitalsError(null);
      
      const response = await getVitals(appointmentInfo.id);
      console.log("Vitals response:", response);
      
      if (response) {
        setEditedVitals({
          bloodPressure: response.blood_pressure || '',
          heartRate: response.pulse_rate || '',
          temperature: response.temperature || '',
          spO2: response.spo2 || '',
          height: response.height || '',
          weight: response.weight || '',
          bloodSugar: response.blood_sugar || ''
        });
      }
    } catch (error) {
      console.error("Error fetching vitals:", error);
      setVitalsError("Failed to load vitals. Please try again.");
    } finally {
      setVitalsLoading(false);
    }
  };

  // Add useEffect to fetch vitals on component mount
  useEffect(() => {
    if (appointmentInfo?.id) {
      fetchVitals();
    }
  }, [appointmentInfo?.id]);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [attachmentToDelete, setAttachmentToDelete] = useState(null);

  const handleSaveVitals = async () => {
    try {
      setIsSavingVitals(true);
      // Prepare the payload for the API
      const vitalsPayload = {
        appointment_id: appointmentInfo.id,
        vitals: {
          blood_pressure: editedVitals.bloodPressure,
          pulse_rate: editedVitals.heartRate,
          temperature: editedVitals.temperature,
          spo2: editedVitals.spO2,
          height: editedVitals.height,
          weight: editedVitals.weight,
          blood_sugar: editedVitals.bloodSugar
        }
      };

      // Call the API
      const response = await manageVitals(vitalsPayload);
      console.log("Vitals updated successfully:", response);

      // Optionally, update the UI state or refetch data
      setIsEditingVitals(false);

    } catch (error) {
      console.error("Error saving vitals:", error);
      // Optionally, handle error (e.g., show an error message)
    } finally {
      setIsSavingVitals(false);
    }
  };

  // Add state for shouldInitialize
  const [shouldInitialize, setShouldInitialize] = useState(true);

  // Add useEffect to track all loading states and update isPageLoading
  useEffect(() => {
    const isLoading = isLoadingPrescriptions || 
                     isLoadingCurrentPrescription || 
                     attachmentsLoading ||
                     isLoadingPrescription || 
                     isSavingPrescription ||
                     isCompletingConsultation;
    
    // Use a short delay before turning off loading to avoid flicker
    if (!isLoading && isPageLoading) {
      const timer = setTimeout(() => {
        setIsPageLoading(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoadingPrescriptions, isLoadingCurrentPrescription, attachmentsLoading, 
      isPageLoading, isLoadingPrescription, isSavingPrescription, isCompletingConsultation]);

  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 4, px: { xs: 1, sm: 2 } }}>
      {/* Global Loading Backdrop */}
      <Backdrop
        sx={{ 
          color: '#fff', 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          flexDirection: 'column',
          backdropFilter: 'blur(3px)',
          background: 'rgba(0, 0, 0, 0.7)'
        }}
        open={isPageLoading}
      >
        <CircularProgress color="primary" size={60} thickness={4} 
          sx={{ mb: 2, color: '#fff' }} />
        <Typography variant="h6" sx={{ mb: 1, fontWeight: 'medium' }}>
          Loading Patient Data
        </Typography>
      </Backdrop>

      {/* More compact PageHeader */}
      <PageHeader 
        title="Patient Consultation"
        showBackButton={true}
        backButtonVariant="button"
        backButtonText="Back"
        onBackButtonClick={handleBackToPatient}
        sx={{ mb: 1 }}
      />

      {/* SECTION 1: Merged Header and Patient Details with Vitals (editable) and Attachments */}
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
        {/* Patient Header - More compact layout */}
        <Box sx={{ mb: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={7}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar 
                  sx={{ 
                    bgcolor: 'primary.light', 
                    color: 'primary.contrastText',
                    width: 40,
                    height: 40,
                    fontSize: '1.2rem'
                  }}
                >
                  {patientInfo.name?.charAt(0) || 'P'}
                </Avatar>
                <Box>
                  <Typography variant="h6" component="h1" sx={{ fontWeight: 'medium', mb: 0.5 }}>
                    {patientInfo.name}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {patientInfo.age && patientInfo.age !== '' && (
                      <Chip 
                        size="small"
                        icon={<Person />} 
                        label={patientInfo.age} 
                        variant="outlined" 
                      />
                    )}
                    {patientInfo.gender && patientInfo.gender !== '' && (
                      <Chip 
                        size="small"
                        label={patientInfo.gender} 
                        variant="outlined" 
                      />
                    )}
                    {patientInfo.id && (
                      <Chip 
                        size="small"
                        label={`ID: ${patientInfo.id}`} 
                        variant="outlined" 
                      />
                    )}
                    <Chip 
                      size="small"
                      label={`Token: #${appointmentInfo.token}`} 
                      color="primary" 
                      variant="outlined" 
                    />
                    { appointmentInfo.appointment_type && <Chip 
                      size="small" 
                      label={appointmentInfo.appointment_type} 
                      variant="outlined" 
                    />}
                    {patientInfo?.blood_type && patientInfo.blood_type !== '' && (
                      <Chip 
                        size="small" 
                        label={`Blood: ${patientInfo.blood_type}`}
                        variant="outlined"
                        color="error"
                      />
                    )}
                    {appointmentInfo.disease && (
                      <Chip 
                        size="small" 
                        icon={<LocalHospital />} 
                        label={appointmentInfo.disease} 
                        color="error" 
                        variant="outlined"
                      />
                    )}
                  </Box>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={5} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' }, gap: 1 }}>
              <Button 
                variant="contained" 
                color="success" 
                onClick={handleDoneConsultation}
                startIcon={<Save />}
                size="small"
                sx={{ py: 1, px: 2 }}
              >
                Complete Consultation
              </Button>
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ mb: 2 }} />
        
        {/* Editable Vitals - More compact layout */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <MedicalServices color="primary" sx={{ mr: 1 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 'medium', color: 'primary.main', mr: 2 }}>
                Vitals
              </Typography>
              <Button 
                variant="outlined" 
                color={isEditingVitals ? "success" : "primary"}
                size="small" 
                startIcon={isEditingVitals ? (isSavingVitals ? <CircularProgress size={20} /> : <Save />) : <Edit />}
                onClick={handleEditVitals}
                disabled={isSavingVitals || vitalsLoading}
                sx={{ ml: 2 }}
              >
                {isEditingVitals ? (isSavingVitals ? "Saving..." : "Save Vitals") : "Edit Vitals"}
              </Button>
              
            </Box>
          </Box>
          <Paper variant="outlined" sx={{ p: 1.5, bgcolor: isEditingVitals ? 'background.paper' : '#f8f9fa' }}>
            {vitalsError && (
              <Alert severity="error" sx={{ mb: 1 }}>
                {vitalsError}
              </Alert>
            )}
            {vitalsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 1 }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <Grid container spacing={1.5}>
                <Grid item xs={6} sm={4} md={2}>
                  <TextField
                    label="Blood Pressure"
                    value={editedVitals.bloodPressure}
                    variant="outlined"
                    size="small"
                    fullWidth
                    disabled={!isEditingVitals}
                    InputProps={{ 
                      endAdornment: <Typography variant="caption">mmHg</Typography>,
                      sx: { bgcolor: isEditingVitals ? 'background.paper' : 'transparent' }
                    }}
                    onChange={(e) => handleVitalsChange('bloodPressure', e.target.value)}
                  />
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                  <TextField
                    label="Heart Rate"
                    value={editedVitals.heartRate}
                    variant="outlined"
                    size="small"
                    fullWidth
                    disabled={!isEditingVitals}
                    InputProps={{ 
                      endAdornment: <Typography variant="caption">bpm</Typography>,
                      sx: { bgcolor: isEditingVitals ? 'background.paper' : 'transparent' }
                    }}
                    onChange={(e) => handleVitalsChange('heartRate', e.target.value)}
                  />
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                  <TextField
                    label="Temperature"
                    value={editedVitals.temperature}
                    variant="outlined"
                    size="small"
                    fullWidth
                    disabled={!isEditingVitals}
                    InputProps={{ 
                      endAdornment: <Typography variant="caption">°C</Typography>,
                      sx: { bgcolor: isEditingVitals ? 'background.paper' : 'transparent' }
                    }}
                    onChange={(e) => handleVitalsChange('temperature', e.target.value)}
                  />
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                  <TextField
                    label="SpO2"
                    value={editedVitals.spO2}
                    variant="outlined"
                    size="small"
                    fullWidth
                    disabled={!isEditingVitals}
                    InputProps={{ 
                      endAdornment: <Typography variant="caption">%</Typography>,
                      sx: { bgcolor: isEditingVitals ? 'background.paper' : 'transparent' }
                    }}
                    onChange={(e) => handleVitalsChange('spO2', e.target.value)}
                  />
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                  <TextField
                    label="Weight"
                    value={editedVitals.weight}
                    variant="outlined"
                    size="small"
                    fullWidth
                    disabled={!isEditingVitals}
                    InputProps={{ 
                      endAdornment: <Typography variant="caption">kg</Typography>,
                      sx: { bgcolor: isEditingVitals ? 'background.paper' : 'transparent' }
                    }}
                    onChange={(e) => handleVitalsChange('weight', e.target.value)}
                  />
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                  <TextField
                    label="Height"
                    value={editedVitals.height}
                    variant="outlined"
                    size="small"
                    fullWidth
                    disabled={!isEditingVitals}
                    InputProps={{ 
                      endAdornment: <Typography variant="caption">cm</Typography>,
                      sx: { bgcolor: isEditingVitals ? 'background.paper' : 'transparent' }
                    }}
                    onChange={(e) => handleVitalsChange('height', e.target.value)}
                  />
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                  <TextField
                    label="Blood Sugar"
                    value={editedVitals.bloodSugar}
                    variant="outlined"
                    size="small"
                    fullWidth
                    disabled={!isEditingVitals}
                    InputProps={{ 
                      endAdornment: <Typography variant="caption">mg/dL</Typography>,
                      sx: { bgcolor: isEditingVitals ? 'background.paper' : 'transparent' }
                    }}
                    onChange={(e) => handleVitalsChange('bloodSugar', e.target.value)}
                  />
                </Grid>
              </Grid>
            )}
          </Paper>
        </Box>
        
        {/* Attachments with Report Names - Improved layout */}
        <Box sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Description color="primary" sx={{ mr: 0.75 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 'medium', color: 'primary.main', fontSize: '0.95rem' }}>
              Attachments
            </Typography>
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
          <Paper variant="outlined" sx={{ p: 1 }}>
            {attachmentsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                <CircularProgress size={20} />
              </Box>
            ) : attachmentsError ? (
              <Alert 
                severity="error" 
                action={
                  <Button color="inherit" size="small" onClick={fetchAttachments}>
                    Retry
                  </Button>
                }
                sx={{ py: 0.5 }}
              >
                {attachmentsError}
              </Alert>
            ) : attachments.length > 0 ? (
              <Box 
                sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                  gap: 1,
                  p: 0.5,
                }}
              >
                {attachments.map((attachment) => (
                  <Box
                    key={attachment.id}
                    sx={{ 
                      border: '1px solid #e0e0e0',
                      borderRadius: 1,
                      p: 1,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'all 0.2s',
                      '&:hover': { 
                        bgcolor: 'rgba(0, 0, 0, 0.03)',
                        borderColor: 'primary.light'
                      }
                    }}
                    onClick={() => handleOpenAttachment(attachment)}
                  >
                    {getAttachmentIcon(attachment.type)}
                    <Box sx={{ ml: 1, flex: 1, overflow: 'hidden' }}>
                      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontSize: '0.7rem' }}>
                        {attachment.reportType === 'ecg-test' ? 'ECG Test Report' : 
                         attachment.reportType === 'blood-test' ? 'Blood Test Report' : 
                         attachment.type === 'pdf' ? 'PDF Document' :
                         attachment.type === 'image' ? 'Image' : 'Document'}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.875rem' }}>
                        {attachment.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                        {attachment.date} • {attachment.size}
                      </Typography>
                    </Box>
                    <IconButton 
                      size="small" 
                      onClick={(e) => handleDeleteAttachment(attachment.id, e)}
                      sx={{ 
                        ml: 0.5,
                        opacity: 0,
                        transition: 'opacity 0.2s',
                        '&:hover': { color: 'error.main' },
                        '.MuiBox-root:hover &': { opacity: 1 }
                      }}
                    >
                      <Close fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            ) : (
              <Box sx={{ py: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                  No attachments available
                </Typography>
              </Box>
            )}
          </Paper>
        </Box>
      </Paper>

      {/* SECTION 2: Prescription Page with more vertical spacing */}
      <Paper elevation={3} sx={{ p: { xs: 1.5, sm: 2 }, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
          <ReceiptLong color="primary" sx={{ mr: 0.75, fontSize: '1.1rem' }} />
          <Typography variant="h6" component="h2" sx={{ fontSize: '1.1rem', fontWeight: 'medium' }}>
            Prescription
          </Typography>
        </Box>
        <Divider sx={{ mb: 1.5 }} />
        
        {/* Prescription Form with more vertical spacing */}
        {renderPrescriptionForm()}
      </Paper>

      {/* Past Prescriptions Section - More compact layout */}
      <Paper elevation={3} sx={{ p: { xs: 1.5, sm: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
          <History sx={{ mr: 0.75, fontSize: '1.1rem', color: 'text.secondary' }} />
          <Typography variant="h6" component="h2" sx={{ fontSize: '1.1rem', fontWeight: 'medium' }}>
            Past Prescriptions
          </Typography>
        </Box>
        <Divider sx={{ mb: 1.5 }} />
        
        {isLoadingPrescriptions ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : pastPrescriptions.length > 0 ? (
          <Box>
            {pastPrescriptions.map((prescription, index) => (
              <Paper 
                key={index} 
                sx={{ 
                  mb: 1.5,
                  p: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  maxWidth: '100%',
                  overflow: 'hidden'
                }}
              >
                {/* Prescription Header - More compact */}
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  mb: 1,
                  pb: 1,
                  borderBottom: '1px solid',
                  borderColor: 'divider'
                }}>
                  <CalendarToday fontSize="small" color="action" sx={{ mr: 0.75 }} />
                  <Typography variant="body2">{formatDate(prescription.slot)}</Typography>
                  <Divider orientation="vertical" flexItem sx={{ mx: 1.5 }} />
                  {prescription.diagnosis && prescription.diagnosis.length > 0 && (
                    <>
                      <LocalHospital fontSize="small" color="action" sx={{ mr: 0.75 }} />
                      <Typography variant="body2">{prescription.diagnosis[0].name}</Typography>
                    </>
                  )}
                  {/* <Box sx={{ ml: 'auto' }}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<Print />}
                      onClick={() => handlePrintPrescription(prescription)}
                      sx={{ py: 0.5 }}
                    >
                      Print
                    </Button>
                  </Box> */}
                </Box>

                {/* Prescription Content - More compact grid */}
                <Grid container spacing={1.5}>
                  {/* Vitals Section - More compact */}
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" sx={{ mb: 0.5, color: 'primary.main', fontSize: '0.875rem' }}>
                      <MedicalServices sx={{ mr: 0.5, verticalAlign: 'middle', fontSize: '1rem' }} />
                      Vitals
                    </Typography>
                    <Grid container spacing={1}>
                      {prescription.vitals && Object.entries(prescription.vitals).map(([key, value]) => (
                        value ? (
                          <Grid item xs={6} sm={4} md={2} key={key}>
                            <Paper variant="outlined" sx={{ p: 1, textAlign: 'center' }}>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.75rem' }}>
                                {key.replace('_', ' ').toUpperCase()}
                              </Typography>
                              <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                                {value}
                                {key === 'blood_pressure' ? ' mmHg' : 
                                 key === 'temperature' ? ' °C' :
                                 key === 'pulse_rate' ? ' bpm' :
                                 key === 'spo2' ? ' %' :
                                 key === 'weight' ? ' kg' :
                                 key === 'height' ? ' cm' : ''}
                              </Typography>
                            </Paper>
                          </Grid>
                        ) : null
                      ))}
                    </Grid>
                  </Grid>

                  {/* Other sections with compact tables */}
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" sx={{ mb: 0.5, color: 'primary.main', fontSize: '0.875rem' }}>
                      Complaints
                    </Typography>
                    <TableContainer component={Paper} variant="outlined" sx={{mb:0}}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ py: 0.75, fontSize: '0.75rem' }}>Complaint</TableCell>
                            <TableCell sx={{ py: 0.75, fontSize: '0.75rem' }}>Severity</TableCell>
                            <TableCell sx={{ py: 0.75, fontSize: '0.75rem' }}>Duration</TableCell>
                            <TableCell sx={{ py: 0.75, fontSize: '0.75rem' }}>Frequency</TableCell>
                            <TableCell sx={{ py: 0.75, fontSize: '0.75rem' }}>Notes</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {prescription.complaints && prescription.complaints.length > 0 ? (
                            prescription.complaints.map((complaint, idx) => (
                              <TableRow key={idx}>
                                <TableCell sx={{ py: 0.75, fontSize: '0.875rem' }}>{complaint.name}</TableCell>
                                <TableCell sx={{ py: 0.75, fontSize: '0.875rem' }}>{complaint.severity}</TableCell>
                                <TableCell sx={{ py: 0.75, fontSize: '0.875rem' }}>{complaint.duration}</TableCell>
                                <TableCell sx={{ py: 0.75, fontSize: '0.875rem' }}>{complaint.frequency}</TableCell>
                                <TableCell sx={{ py: 0.75, fontSize: '0.875rem' }}>{complaint.notes}</TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={5} align="center" sx={{ py: 1, fontSize: '0.875rem' }}>
                                No complaints recorded
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Grid>

                  {/* Similar compact styling for other sections... */}
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" sx={{ mb: 0.5, color: 'primary.main', fontSize: '0.875rem' }}>
                      Diagnosis
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ py: 0.75, fontSize: '0.75rem' }}>Diagnosis</TableCell>
                            <TableCell sx={{ py: 0.75, fontSize: '0.75rem' }}>Duration</TableCell>
                            <TableCell sx={{ py: 0.75, fontSize: '0.75rem' }}>Notes</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {prescription.diagnosis && prescription.diagnosis.length > 0 ? (
                            prescription.diagnosis.map((diag, idx) => (
                              <TableRow key={idx}>
                                <TableCell sx={{ py: 0.75, fontSize: '0.875rem' }}>{diag.name}</TableCell>
                                <TableCell sx={{ py: 0.75, fontSize: '0.875rem' }}>{diag.duration}</TableCell>
                                <TableCell sx={{ py: 0.75, fontSize: '0.875rem' }}>{diag.notes}</TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={3} align="center" sx={{ py: 1, fontSize: '0.875rem' }}>
                                No diagnosis recorded
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="subtitle2" sx={{ mb: 0.5, color: 'primary.main', fontSize: '0.875rem' }}>
                      Medications
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ py: 0.75, fontSize: '0.75rem' }}>Medicine</TableCell>
                            <TableCell sx={{ py: 0.75, fontSize: '0.75rem' }}>Dose</TableCell>
                            <TableCell sx={{ py: 0.75, fontSize: '0.75rem' }}>When</TableCell>
                            <TableCell sx={{ py: 0.75, fontSize: '0.75rem' }}>Frequency</TableCell>
                            <TableCell sx={{ py: 0.75, fontSize: '0.75rem' }}>Duration</TableCell>
                            <TableCell sx={{ py: 0.75, fontSize: '0.75rem' }}>Notes</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {prescription.medicines && prescription.medicines.length > 0 ? (
                            prescription.medicines.map((med, idx) => (
                              <TableRow key={idx}>
                                <TableCell sx={{ py: 0.75, fontSize: '0.875rem' }}>{med.medicine || med.name}</TableCell>
                                <TableCell sx={{ py: 0.75, fontSize: '0.875rem' }}>{med.dose}</TableCell>
                                <TableCell sx={{ py: 0.75, fontSize: '0.875rem' }}>{med.timing || med.when}</TableCell>
                                <TableCell sx={{ py: 0.75, fontSize: '0.875rem' }}>{med.frequency}</TableCell>
                                <TableCell sx={{ py: 0.75, fontSize: '0.875rem' }}>{med.duration}</TableCell>
                                <TableCell sx={{ py: 0.75, fontSize: '0.875rem' }}>{med.notes}</TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={6} align="center" sx={{ py: 1, fontSize: '0.875rem' }}>
                                No medications prescribed
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="subtitle2" sx={{ mb: 0.5, color: 'primary.main', fontSize: '0.875rem' }}>
                      Tests
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 1 }}>
                      {prescription.tests && prescription.tests[0]?.testlist?.length > 0 ? (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {prescription.tests[0].testlist.map((test, idx) => (
                            <Chip
                              key={idx}
                              label={test}
                              variant="outlined"
                              size="small"
                            />
                          ))}
                        </Box>
                      ) : (
                        <Typography color="text.secondary">No tests prescribed</Typography>
                      )}
                    </Paper>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="subtitle2" sx={{ mb: 0.5, color: 'primary.main', fontSize: '0.875rem' }}>
                      Advice
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography>
                        {prescription.advice?.[0]?.advice || 'No specific advice provided'}
                      </Typography>
                    </Paper>
                  </Grid>

                  {/* Attachments Section */}
                  {prescription.attachments && prescription.attachments.length > 0 && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" sx={{ mb: 0.5, color: 'primary.main', fontSize: '0.875rem' }}>
                        Attachments
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {prescription.attachments.map((attachment, idx) => (
                          <Chip
                            key={idx}
                            label={attachment.file_name}
                            onClick={() => handleOpenAttachment({
                              ...attachment,
                              url: getFullAttachmentUrl(attachment.file),
                              type: attachment.file_type?.includes('pdf') ? 'pdf' : 
                                    attachment.file_type?.includes('image') ? 'image' : 'document'
                            })}
                            icon={getAttachmentIcon(
                              attachment.file_type?.includes('pdf') ? 'pdf' : 
                              attachment.file_type?.includes('image') ? 'image' : 'document'
                            )}
                            variant="outlined"
                            sx={{ m: 0.5 }}
                          />
                        ))}
                      </Box>
                    </Grid>
                  )}
                </Grid>
              </Paper>
            ))}
          </Box>
        ) : (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">No past prescriptions found</Typography>
          </Box>
        )}
      </Paper>

      {/* Delete Confirmation Dialog */}
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
                {uploadFile ? uploadFile.name : 'Drag and drop a file here or click to browse'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Supported file types: PDF, JPG, PNG, DOC
              </Typography>
            </Box>
            
            {/* File Details Form */}
            {uploadFile && (
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
                    File Size: {(uploadFile.size / (1024 * 1024)).toFixed(2)} MB
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
            startIcon={attachmentsLoading ? <CircularProgress size={20} color="inherit" /> : <CloudUpload />}
            onClick={handleFileUpload}
            disabled={!uploadFile || !uploadFileName || attachmentsLoading}
          >
            {attachmentsLoading ? 'Uploading...' : 'Upload File'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Done Consultation Dialog */}
      <Dialog
        open={confirmDoneDialog}
        onClose={() => !isCompletingConsultation && setConfirmDoneDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Complete Consultation</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to mark this consultation as complete? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setConfirmDoneDialog(false)} 
            disabled={isCompletingConsultation}
          >
            Cancel
          </Button>
          <Button 
            onClick={confirmDoneConsultation} 
            color="primary" 
            variant="contained"
            disabled={isCompletingConsultation}
          >
            {isCompletingConsultation ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Completing...
              </>
            ) : (
              'Complete Consultation'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Prescription Modal */}
      <Dialog
        open={prescriptionModalOpen}
        onClose={handleClosePrescriptionModal}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Prescription Details</Typography>
            <IconButton onClick={handleClosePrescriptionModal}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedPrescription && (
            <PrescriptionForm
              patientInfo={selectedPrescription.patientInfo}
              appointmentInfo={selectedPrescription.appointmentInfo}
              initialData={selectedPrescription.initialData}
              readOnly={selectedPrescription.readOnly}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePrescriptionModal}>Close</Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handlePrintPrescription}
            startIcon={<Print />}
          >
            Print
          </Button>
        </DialogActions>
      </Dialog>

      {/* Past Prescriptions Modal */}
      <Dialog
        open={pastPrescriptionsOpen}
        onClose={() => setPastPrescriptionsOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Past Prescriptions</Typography>
            <IconButton onClick={() => setPastPrescriptionsOpen(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {isLoadingPrescriptions ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress size={24} sx={{ mr: 1 }} />
              <Typography>Loading past prescriptions...</Typography>
            </Box>
          ) : pastPrescriptions.length === 0 ? (
            <Box display="flex" justifyContent="center" p={3}>
              <Typography>No past prescriptions found for this patient.</Typography>
            </Box>
          ) : (
            <Box sx={{ maxHeight: '75vh', overflowY: 'auto' }}>
              {pastPrescriptions.map((prescription, index) => (
                <Paper 
                  key={index} 
                  elevation={0} 
                  variant="outlined" 
                  sx={{ 
                    mb: 4, 
                    p: 3,
                    backgroundColor: '#fff',
                  }}
                >
                  {/* Prescription Header with Date */}
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    borderBottom: '2px solid #2196f3',
                    pb: 1,
                    mb: 3,
                    backgroundColor: '#f8fafc',
                    p: 2,
                    borderRadius: '8px 8px 0 0',
                    border: '1px solid #e2e8f0',
                    borderBottom: '2px solid #2196f3'
                  }}>
                    <Typography variant="h6" sx={{ 
                      fontWeight: '600',
                      color: '#1e40af',
                      fontSize: '1.1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}>
                      <CalendarToday sx={{ fontSize: '1.2rem', color: '#2563eb' }} />
                      {prescription.created_at ? new Date(prescription.created_at).toLocaleDateString() : 'No date'}
                    </Typography>
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      startIcon={<ContentCopyIcon />}
                      onClick={() => handleOpenPrescription(prescription)}
                    >
                      View Details
                    </Button>
                  </Box>
                  
                  {/* Medications Table */}
                  {prescription.medicines && prescription.medicines.length > 0 && (
                    <Box mb={2}>
                      <Typography variant="subtitle2" gutterBottom>Medications:</Typography>
                      <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ backgroundColor: 'rgba(0, 0, 0, 0.04)' }}>
                              <TableCell>Medicine</TableCell>
                              <TableCell>Dose</TableCell>
                              <TableCell>Timing</TableCell>
                              <TableCell>Frequency</TableCell>
                              <TableCell>Duration</TableCell>
                              <TableCell>Notes</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {prescription.medicines.map((med, idx) => (
                              <TableRow key={idx}>
                                <TableCell>{med.name || 'N/A'}</TableCell>
                                <TableCell>{med.dose || 'N/A'}</TableCell>
                                <TableCell>{med.when || 'N/A'}</TableCell>
                                <TableCell>{med.frequency || 'N/A'}</TableCell>
                                <TableCell>{med.duration || 'N/A'}</TableCell>
                                <TableCell>{med.notes || 'N/A'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  )}
                  
                  {/* Diagnosis Section */}
                  {prescription.diagnosis && prescription.diagnosis.length > 0 && (
                    <Box mb={2}>
                      <Typography variant="subtitle2" gutterBottom>Diagnosis:</Typography>
                      <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ backgroundColor: 'rgba(0, 0, 0, 0.04)' }}>
                              <TableCell>Diagnosis</TableCell>
                              <TableCell>Duration</TableCell>
                              <TableCell>Notes</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {prescription.diagnosis.map((diag, idx) => (
                              <TableRow key={idx}>
                                <TableCell>{diag.name || 'N/A'}</TableCell>
                                <TableCell>{diag.duration || 'N/A'}</TableCell>
                                <TableCell>{diag.notes || 'N/A'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  )}
                </Paper>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPastPrescriptionsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ConsultationPage; 