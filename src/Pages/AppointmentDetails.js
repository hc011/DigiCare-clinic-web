import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Paper,
  Typography,
  Box,
  Grid,
  Chip,
  Button,
  TextField,
  Divider,
  IconButton,
  Avatar,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  DialogActions,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  CalendarToday,
  AccessTime,
  Person,
  LocalHospital,
  AttachMoney,
  EventAvailable,
  Notes,
  Edit,
  ArrowBack,
  Assignment,
  MedicalServices,
  CheckCircle,
  Cancel,
  PriorityHigh,
  LocationOn,
  Phone,
  SupervisorAccount,
  Payment,
  ReceiptLong,
  Print,
  Close,
} from '@mui/icons-material';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import { Layout } from '../components/Layout';
import { PageHeader } from '../components/common/PageHeader';
import dayjs from 'dayjs';
import { getAppointmentDetails, updateAppointmentDetails, removeAppointment, getPatientDetails, paymentReceipt } from '../services/api';
import { printPrescription } from '../utils/prescriptionUtils';
import { generateAndPrintReceipt } from '../utils/receiptUtils';
import { useNotification } from "../context/NotificationContext";
import { useCheckupCabin } from "../context/CheckupCabinContext";

const AppointmentDetails = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  const location = useLocation();
  const navigate = useNavigate();
  const [appointmentInfo, setAppointmentInfo] = useState(null);
  const [patientInfo, setPatientInfo] = useState(null);
  const [isFromPastAppointments, setIsFromPastAppointments] = useState(false);
  const [prescriptionModalOpen, setPrescriptionModalOpen] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  
  // Add states for edit modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [cancelConfirmationOpen, setCancelConfirmationOpen] = useState(false);
  
  // Replace snackbar state with the compatibility hook
  const { showSuccessSnackbar, showErrorSnackbar } = useNotification();
  
  const [loading, setLoading] = useState(true);
  
  const { getCurrentDoctor } = useCheckupCabin();
  
  const fetchAppointmentDetails = async (appointmentId) => {
    try {
      const response = await getAppointmentDetails(appointmentId);
      console.log('API Response:', response);
      
      if (response) {
        // Extract patient info from the nested patient object
        const extractedPatientInfo = response.patient ? {
          id: response.patient.patient_id,
          name: response.patient.name,
          phone: response.patient.phone_number,
          age: response.patient.age,
          gender: response.patient.gender,
          location: response.patient.location,
          guardian: response.patient.guardian,
          allergies: response.patient.allergies,
        } : null;
        
        // If patient info is null or missing key fields, try to fetch it directly using patient_id
        if (!extractedPatientInfo && response.patient?.patient_id) {
          try {
            const patientResponse = await getPatientDetails(response.patient.patient_id);
            if (patientResponse && patientResponse.patient) {
              const fetchedPatientInfo = {
                id: patientResponse.patient.patient_id,
                name: patientResponse.patient.name,
                phone: patientResponse.patient.phone_number,
                age: patientResponse.patient.age,
                gender: patientResponse.patient.gender,
                location: patientResponse.patient.location,
                guardian: patientResponse.patient.guardian,
                allergies: patientResponse.patient.allergies,
              };
              setPatientInfo(fetchedPatientInfo);
            }
          } catch (patientError) {
            console.error('Error fetching patient details:', patientError);
          }
        } else if (extractedPatientInfo) {
          setPatientInfo(extractedPatientInfo);
        } else {
          // Handle case where patient info is missing
          console.warn('Patient information is missing in the appointment details response');
          setPatientInfo({
            id: '',
            name: response.name || 'Unknown Patient',
            phone: '',
            age: '',
            gender: '',
            location: '',
            guardian: ''
          });
        }
        // Extract appointment info from the response
        const extractedAppointmentInfo = {
          id: response.appointment_id,
          status: response.status,
          checkin: response.checkin || false,
          paid: response.paid || false,
          token: response.token,
          appointment_type: response.appointment_type || 'New',
          disease: response.disease || '',
          fees_paid: response.fees_paid || 0,
          mode: response.mode || 'cash',
          // Format date and time from the slot field if available
          date: response.slot ? new Date(response.slot).toLocaleDateString() : 'Not scheduled',
          time: response.slot ? new Date(response.slot).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Not scheduled',
          // Add any other fields that might be needed
          doctor: getCurrentDoctor(),
          department: 'General Medicine' // This may need to be updated based on your actual data
        };
        
        setAppointmentInfo(extractedAppointmentInfo);
      } else {
        console.error('Empty response when fetching appointment details');
        // Set default values or show an error message
        showErrorSnackbar('Failed to fetch appointment details');
      }
    } catch (error) {
      console.error('Error fetching appointment details:', error);
      showErrorSnackbar('Failed to fetch appointment details: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Get data from location state or fetch from API if available
    if (location.state) {
      const { patientInfo: receivedPatientInfo, appointmentInfo: receivedAppointmentInfo, from, fromPastAppointments } = location.state;
      
      // Set the "from past appointments" flag
      setIsFromPastAppointments(fromPastAppointments || false);

      // If coming from appointment table, fetch from API using the appointment ID
      if (from === 'appointment-table' && receivedAppointmentInfo && receivedAppointmentInfo.id) {
        fetchAppointmentDetails(receivedAppointmentInfo.id);
      } 
      // If complete data is provided (from PatientInfoPage), use it directly
      else if (receivedPatientInfo && receivedAppointmentInfo && receivedAppointmentInfo.id) {
        // Fix any field name differences in patient info
        const fixedPatientInfo = {
          ...receivedPatientInfo,
          // Handle guardian field which might be named differently
          guardian: receivedPatientInfo.guardian || receivedPatientInfo.guardianName || ''
        };
        
        // Ensure appointmentInfo has all required fields with correct names
        const fixedAppointmentInfo = {
          ...receivedAppointmentInfo,
          // Make sure ID is properly set
          id: receivedAppointmentInfo.id || receivedAppointmentInfo.appointment_id,
          // Make sure all required fields are present
          status: receivedAppointmentInfo.status || 'completed',
          checkin: receivedAppointmentInfo.checkin || false,
          paid: receivedAppointmentInfo.paid || false,
          token: receivedAppointmentInfo.token || '',
          appointment_type: receivedAppointmentInfo.appointment_type || 'New',
          disease: receivedAppointmentInfo.disease || '',
          fees_paid: receivedAppointmentInfo.fees_paid || 0,
          mode: receivedAppointmentInfo.mode || 'cash',
        };
        
        setPatientInfo(fixedPatientInfo);
        setAppointmentInfo(fixedAppointmentInfo);
      } 
      // If we have just the appointment ID, fetch complete data from API
      else if (receivedAppointmentInfo && receivedAppointmentInfo.id) {
        fetchAppointmentDetails(receivedAppointmentInfo.id);
      }
    } else {
      // If no location state, try to get ID from URL params
      const params = new URLSearchParams(location.search);
      const appointmentId = params.get('id');
      
      if (appointmentId) {
        fetchAppointmentDetails(appointmentId);
      } else {
        console.error('No appointment ID provided in location state or URL');
      }
    }
  }, [location]);

  // If we don't have appointment data yet, show a loading state
  if (loading) {
    
    return (
      <Layout>
        <PageHeader title="Appointment Details" />
        <Box sx={{ p: 3, textAlign: 'center' }}>
          Loading appointment details...
        </Box>
      </Layout>
    );
  }

  // Get status color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'error';
      case 'pending':
        return 'warning';
      case 'late':
        return 'error';
      default:
        return 'default';
    }
  };

  // Get payment status color
  const getPaymentStatusColor = (paid) => {
    return paid ? 'success' : 'error';
  };

  // Handle back navigation
  const handleBack = () => {
    // Simply navigate back, the state is preserved in sessionStorage
    navigate(-1);
  };

  // Add function to handle opening the prescription modal
  const handleOpenPrescription = () => {
    setSelectedPrescription({
      patientInfo: patientInfo,
      appointmentInfo: appointmentInfo,
      initialData: {
        patientName: patientInfo.name,
        patientId: patientInfo.id,
        patientAge: patientInfo.age,
        patientGender: patientInfo.gender,
        appointmentId: appointmentInfo.id,
        appointmentDate: appointmentInfo.date,
        doctor: appointmentInfo.doctor,
        department: appointmentInfo.department,
        complaints: [{ complaint: appointmentInfo.reason, duration: "2 weeks", severity: "Moderate" }],
        diagnosis: [{ diagnosis: appointmentInfo.reason, notes: "Patient responded well to treatment" }],
        medications: [
          { 
            medicine: "Amlodipine", 
            dose: "5mg", 
            frequency: "Once daily", 
            duration: "30 days",
            timing: "After breakfast",
            notes: "Take regularly"
          }
        ],
        tests: ["Complete Blood Count", "Lipid Profile"],
        advice: "Maintain a healthy diet and exercise regularly",
        followUpDate: dayjs(appointmentInfo.date).add(2, 'week').format('YYYY-MM-DD'),
        vitals: {
          bloodPressure: "120/80",
          heartRate: "72",
          temperature: "98.6",
          respiratoryRate: "16",
          spO2: "98",
        }
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
      patientInfo: patientInfo,
      appointmentInfo: selectedPrescription?.appointmentInfo || {
        date: new Date().toLocaleDateString(),
      },
      complaints: selectedPrescription?.initialData?.complaints || [],
      diagnoses: selectedPrescription?.initialData?.diagnosis || [{
        diagnosis: selectedPrescription?.appointmentInfo?.reason,
        notes: ''
      }],
      medications: selectedPrescription?.initialData?.medications || [],
      tests: selectedPrescription?.initialData?.tests || [],
    };
    
    // Use the global prescription print utility
    printPrescription(prescriptionData);
  };

  // Add function to handle printing the payment receipt
  const handlePrintPaymentReceipt = async() => {
    try {
      await generateAndPrintReceipt(appointmentInfo.id);
    } catch (error) {
      console.error('Error printing receipt:', error);
      showErrorSnackbar('Failed to generate payment receipt');
    }
  };

  // Add function to handle opening the edit modal
  const handleOpenEditModal = () => {
    // Create an object in the format expected by the edit modal
    const appointmentToEdit = {
      appointment_id: appointmentInfo.id,
      token: appointmentInfo.token || '',
      firstName: patientInfo?.name?.split(' ')[0] || '',
      lastName: patientInfo?.name?.split(' ').slice(1).join(' ') || '',
      checkin: appointmentInfo.checkin,
      paid: appointmentInfo.paid,
      status: appointmentInfo.status || 'Pending',
      disease: appointmentInfo.disease || '',
      age: patientInfo?.age || '',
      phone_number: patientInfo?.phone || '',
      location: patientInfo?.location || '',
      sex: patientInfo?.gender?.charAt(0) || '',
      guardian: patientInfo?.guardian || '',
      appointment_type: appointmentInfo.appointment_type || '',
      fees_paid: appointmentInfo.fees_paid || 0,
      mode: appointmentInfo.mode || '',
    };
    
    setSelectedAppointment(appointmentToEdit);
    setEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setSelectedAppointment(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSelectedAppointment((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSexChange = (event, newSex) => {
    setSelectedAppointment((prev) => ({
      ...prev,
      sex: newSex || "",
    }));
  };

  const handleUpdateAppointment = async () => {
    if (!selectedAppointment) return;
    setIsUpdating(true);
    try {
      // Prepare data for update
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
      
      // Refresh appointment details
      fetchAppointmentDetails(appointmentInfo.id || appointmentInfo.appointment_id);
      
      // Close modal
      handleCloseEditModal();
    } catch (error) {
      console.error("Error updating appointment:", error);
    } finally {
      setIsUpdating(false);
    }
  };


  const handleCancelAppointment = async () => {
    setIsCanceling(true);
    try {
      // Call the API to cancel the appointment
      await removeAppointment({
        appointment_id: appointmentInfo.id
      });
      
      // Show success message
      showSuccessSnackbar("Appointment cancelled successfully");
      
      // Close the dialogs
      setCancelConfirmationOpen(false);
      setEditModalOpen(false);
      
      // Navigate back to the appointment list
      navigate(-1);
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      // Show error message
      showErrorSnackbar("Failed to cancel appointment");
    } finally {
      setIsCanceling(false);
    }
  };

  return (
    <Layout>
      {/* Page Header with integrated Back Button */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, flexWrap: 'wrap' }}>
        <PageHeader 
          title="Appointment Details" 
          showBackButton={true}
          backButtonVariant="icon"
          onBackButtonClick={handleBack}
        />
      
        {/* Action Buttons moved to the top */}
        <Box sx={{ display: 'flex', gap: 2, ml: 'auto', mt: { xs: 2, md: 0 } }}>
          
          {/* {!isFromPastAppointments && (
            <Button
              variant="outlined"
              startIcon={<Edit />}
              onClick={handleOpenEditModal}
            >
              Edit Appointment
            </Button>
          )} */}
          
          {!isFromPastAppointments && appointmentInfo.status !== 'cancelled' && 
           appointmentInfo.status !== 'completed' && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<Cancel />}
              onClick={() => setCancelConfirmationOpen(true)}
            >
              Cancel Appointment
            </Button>
          )}
        </Box>
      </Box>

      {/* Consolidated Card with All Information */}
      <Paper 
        elevation={0} 
                  sx={{ 
          mb: { xs: 4, md: 6 },
          bgcolor: 'white', 
          borderRadius: 2,
          border: '1px solid #f0f0f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}
      >
        <Typography 
          variant="h6" 
          sx={{ 
            p: 2,
            color: 'primary.main', 
            fontWeight: 'medium',
            borderBottom: '1px solid #f0f0f0',
            backgroundColor: '#fcfcfc'
                  }}
                >
          Appointment Information
        </Typography>
        
        <Box sx={{ p: { xs: 2, md: 3 } }}>
          {/* Patient Information Section - Moved to top */}
          {patientInfo && (
            <>
              <Typography variant="h6" color="primary.main" sx={{ mb: 2 }}>
                Patient Information
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar 
                  sx={{ width: 56, height: 56, bgcolor: 'primary.main', mr: 2 }}
                >
                  {patientInfo.name ? patientInfo.name.charAt(0) : 'P'}
                </Avatar>
                <Box>
                  <Typography variant="h6">{patientInfo.name || 'Unknown Patient'}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    ID: {patientInfo.id || 'Unknown'} {patientInfo.age} {patientInfo.gender}
                  </Typography>
                </Box>
                <Button 
                  variant="outlined" 
                  startIcon={<Person />} 
                  sx={{ ml: 'auto' }}
                  onClick={() => navigate('/patient-info', { 
                    state: { 
                      patientInfo: { id: patientInfo.id },
                      appointmentInfo: { id: appointmentInfo.id } 
                    } 
                  })}
                >
                  View Complete Profile
                </Button>
              </Box>

               <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    label="Phone Number"
                    value={patientInfo.phone}
                    InputProps={{ readOnly: true }}
                    variant="outlined"
                    size="small"
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    label="Email"
                    value={patientInfo.email || "Not available"}
                    InputProps={{ readOnly: true }}
                    variant="outlined"
                    size="small"
                    margin="normal"
                  />
                </Grid>
                
                {patientInfo.location && (
                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      fullWidth
                      label="Location"
                      value={patientInfo.location}
                      InputProps={{ readOnly: true }}
                      variant="outlined"
                      size="small"
                      margin="normal"
                    />
                  </Grid>
                )}
                
                {patientInfo.guardian && (
                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      fullWidth
                      label="Guardian Name"
                      value={patientInfo.guardian}
                      InputProps={{ readOnly: true }}
                      variant="outlined"
                      size="small"
                      margin="normal"
                    />
                  </Grid>
                )}
              </Grid>
            </>
          )}
          
          <Divider sx={{ my: 3 }} />
          
          {/* Appointment Details - Moved before Appointment Status */}
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
                  {appointmentInfo.date || 'Not scheduled'}
                </Typography>
              </Box>
              
              {/* <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Time
                </Typography>
                <Typography variant="body1">
                  {appointmentInfo.time || 'Time not set'}
                </Typography>
              </Box> */}
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Appointment Type
                </Typography>
                <Typography variant="body1">
                  {appointmentInfo.appointment_type || 'General Checkup'}
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Reason for Visit
                </Typography>
                <Typography variant="body1">
                  {appointmentInfo.disease || 'Not specified'}
                </Typography>
              </Box>
              
              {appointmentInfo.doctor && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Doctor
                  </Typography>
                  <Typography variant="body1">
                    {appointmentInfo.doctor}
                  </Typography>
                </Box>
              )}
              
              {/* Add View Prescription button here for past appointments */}
              {isFromPastAppointments && appointmentInfo.status?.toLowerCase() === 'completed' && (
                <Box sx={{ mt: 3 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<Assignment />}
                    onClick={handleOpenPrescription}
                    size="medium"
                  >
                    View Prescription
                  </Button>
                </Box>
              )}
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              {appointmentInfo.fees_paid > 0 && (
                <>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Amount
                    </Typography>
                    <Typography variant="body1">
                      ₹{appointmentInfo.fees_paid}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Payment Method
                    </Typography>
                    <Typography variant="body1">
                      {appointmentInfo.mode || 'Not specified'}
                    </Typography>
                  </Box>
                  
                  {/* Add Print Receipt Button */}
                  {appointmentInfo.paid && (
                    <Box sx={{ mt: 3 }}>
                      <Button
                        variant="outlined"
                        color="primary"
                        startIcon={<Print />}
                        onClick={handlePrintPaymentReceipt}
                        size="medium"
                      >
                        Print Receipt
                      </Button>
                    </Box>
                  )}
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
                  #{appointmentInfo.id}
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
                    color: appointmentInfo.status?.toLowerCase() === 'completed' ? 'success.main' : 
                           appointmentInfo.status?.toLowerCase() === 'cancelled' ? 'error.main' : 
                           appointmentInfo.status?.toLowerCase() === 'pending' ? 'warning.main' : 'text.primary'
                  }}
                >
                  {appointmentInfo.status || 'Pending'}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <Typography variant="subtitle2" color="text.secondary">
                  Payment Status
                </Typography>
                <Typography 
                  variant="body1" 
                  fontWeight="medium"
                  sx={{ color: appointmentInfo.paid ? 'success.main' : 'error.main' }}
                >
                  {appointmentInfo.paid ? 'Paid' : 'Unpaid'}
                </Typography>
              </Grid>
              
              {appointmentInfo.token && (
                <Grid item xs={12} sm={6} md={4}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Token Number
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    #{appointmentInfo.token}
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Box>
        
        </Box>
      </Paper>
      
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
            Prescription - {selectedPrescription?.appointmentInfo?.date}
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
            <Box sx={{ p: 2, bgcolor: '#fff' }}>
              {/* Prescription Header */}
              <Box sx={{ textAlign: 'center', mb: 3, pb: 2, borderBottom: '2px solid #2196f3' }}>
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
              
              {/* Patient Information */}
              <Grid container spacing={2} sx={{ mb: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2">
                    <strong>Patient Name:</strong> {patientInfo.name}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Patient ID:</strong> {patientInfo.id}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Age/Gender:</strong> {patientInfo.age} years, {patientInfo.gender}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2">
                    <strong>Date:</strong> {selectedPrescription.appointmentInfo.date}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Appointment ID:</strong> {selectedPrescription.appointmentInfo.id}
                  </Typography>
                  <Typography variant="body2">
                    <strong>BP:</strong> {selectedPrescription.initialData.vitals.bloodPressure} mmHg | <strong>Temp:</strong> {selectedPrescription.initialData.vitals.temperature}°C
                  </Typography>
                </Grid>
              </Grid>
              
              {/* Diagnosis */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 1, pb: 0.5, borderBottom: '1px solid #eee', color: 'primary.main' }}>
                  Diagnosis
                </Typography>
                <Typography variant="body1">
                  {selectedPrescription.initialData.diagnosis?.[0]?.diagnosis || selectedPrescription.appointmentInfo.reason}
                </Typography>
              </Box>
              
              {/* Medications */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 1, pb: 0.5, borderBottom: '1px solid #eee', color: 'primary.main' }}>
                  Medications
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Medication</strong></TableCell>
                        <TableCell><strong>Dose</strong></TableCell>
                        <TableCell><strong>Frequency</strong></TableCell>
                        <TableCell><strong>Duration</strong></TableCell>
                        <TableCell><strong>Instructions</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedPrescription.initialData.medications.map((med, index) => (
                        <TableRow key={index}>
                          <TableCell>{med.medicine}</TableCell>
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
              
              {/* Tests */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 1, pb: 0.5, borderBottom: '1px solid #eee', color: 'primary.main' }}>
                  Tests Recommended
                </Typography>
                <Box sx={{ p: 2, bgcolor: '#f9f9f9', borderRadius: 1 }}>
                  {selectedPrescription.initialData.tests.map((test, index) => (
                    <Typography key={index} variant="body2" sx={{ mb: 0.5 }}>
                      • {test}
                    </Typography>
                  ))}
                </Box>
              </Box>
              
              {/* Advice */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 1, pb: 0.5, borderBottom: '1px solid #eee', color: 'primary.main' }}>
                  Advice
                </Typography>
                <Box sx={{ p: 2, bgcolor: '#f9f9f9', borderRadius: 1 }}>
                  <Typography variant="body1">
                    {selectedPrescription.initialData.advice}
                  </Typography>
                </Box>
              </Box>
              
              {/* Follow-up */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 1, pb: 0.5, borderBottom: '1px solid #eee', color: 'primary.main' }}>
                  Follow-up
                </Typography>
                <Typography variant="body1">
                  Please return for follow-up on {selectedPrescription.initialData.followUpDate}.
                </Typography>
              </Box>
              
              {/* Signature */}
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

      {/* Edit Appointment Modal */}
      <Dialog
        open={editModalOpen}
        onClose={handleCloseEditModal}
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
            onClick={handleCloseEditModal}
            sx={{
              position: "absolute",
              right: 0,
              top: 0,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <Close />
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
                disabled={true}
                label="Token Number"
                type="number"
                name="token"
                value={selectedAppointment.token}
                InputProps={{ readOnly: true }}
              />
              <TextField
                fullWidth
                label="Mobile"
                name="phone_number"
                value={selectedAppointment.phone_number}
                onChange={handleInputChange}
                inputProps={{ maxLength: 10 }}
              />
              <TextField
                fullWidth
                label="First Name"
                name="firstName"
                value={selectedAppointment.firstName}
                onChange={handleInputChange}
              />
              <TextField
                fullWidth
                label="Last Name"
                name="lastName"
                value={selectedAppointment.lastName}
                onChange={handleInputChange}
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
                      value={selectedAppointment.mode}
                      name="mode"
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
                    type="number"
                    name="fees_paid"
                    value={selectedAppointment.fees_paid}
                    onChange={handleInputChange}
                  />
                </>
              )}
              <TextField
                fullWidth
                label="Age"
                type="number"
                name="age"
                value={selectedAppointment.age}
                onChange={handleInputChange}
              />
              <FormControl component="fieldset">
                <ToggleButtonGroup
                  value={selectedAppointment.sex}
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
                fullWidth
                label="Guardian"
                name="guardian"
                value={selectedAppointment.guardian}
                onChange={handleInputChange}
              />
              <TextField
                fullWidth
                label="Place"
                name="location"
                value={selectedAppointment.location}
                onChange={handleInputChange}
              />
              <FormControl fullWidth>
                <InputLabel>Appointment Type</InputLabel>
                <Select
                  value={selectedAppointment.appointment_type}
                  name="appointment_type"
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
                fullWidth
                label="Complaint"
                name="disease"
                value={selectedAppointment.disease}
                onChange={handleInputChange}
              />
            </div>
          )}
        </DialogContent>
        <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
          <Button
            onClick={() => setCancelConfirmationOpen(true)}
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
            onClick={handleUpdateAppointment}
            disabled={isUpdating}
          >
            {isUpdating ? <CircularProgress size={24} /> : "Update"}
          </Button>
        </Box>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog
        open={cancelConfirmationOpen}
        onClose={() => setCancelConfirmationOpen(false)}
      >
        <DialogTitle>Cancel Appointment</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to cancel this appointment? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelConfirmationOpen(false)}>No, Keep It</Button>
          <Button onClick={handleCancelAppointment} color="error" variant="contained">
            Yes, Cancel Appointment
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
};

export default AppointmentDetails;