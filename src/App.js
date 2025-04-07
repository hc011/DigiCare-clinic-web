import React,  { useContext, useEffect, useState, useCallback, createContext } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Box } from "@mui/material";
import { AuthContext } from "./context/AuthContext";
import { AppointmentFormProvider } from "./context/AppointmentFormContext";
import NotificationProvider from "./context/NotificationContext";
import GlobalSnackbar from "./components/GlobalSnackbar";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import BottomNavigator from "./components/BottomNavigator";
import Home from "./Pages/Home";
import Login from "./Pages/Login";
import PrivateRoute from "./components/PrivateRoute";
import Help from "./Pages/Help";
import RoleBasedRoute from "./components/RolebasedRoute";
import AppointmentTable from "./Pages/AppointmentTable";
import PrescriptionPage from "./Pages/PrescriptionPage";
import { EventSource } from "eventsource";
import AddAppointmentMobile from "./Pages/AddAppointmentMobile";
import MobileAppointmentTable from "./Pages/MobileAppointmentTable";
import MobileQueuePage from "./Pages/MobileQueuePage";
import PastAppointmentsPage from "./Pages/PastAppointments";
import { Navigate } from "react-router-dom";
import AppointmentForm from "./components/AppointmentForm";
import AppointmentDetails from "./Pages/AppointmentDetails";
import webSocketService from "./services/websocketService";
import ManageSlot from "./Pages/ManageSlot";

import {
  fetchPatients,
  fetchCurrentPosition,
} from "./services/api";

import { ThemeProvider } from '@mui/material/styles';
import { theme } from './theme/theme';
import Dashboard from './Pages/Dashboard';
import { getCabinInfo} from './utils/dateUtils';
import PatientInfoPage from './Pages/PatientInfoPage';
import ConsultationPage from './Pages/ConsultationPage';
import PDFViewer from './components/PDFViewer';
import usePDFViewer from './hooks/usePDFViewer';
import { useCheckupCabin } from './context/CheckupCabinContext';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const App = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  
  // Get values directly from the context
  const { isInitialized, cabinId, selectedSlot } = useCheckupCabin();
  
  const isMobile = window.innerWidth <= 768;
  const [currentPosition, setCurrentPosition] = useState(1);
  const [patients, setPatients] = useState([]);
  const [currentPatient, setCurrentPatient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentCabinSlot, setCurrentCabinSlot] = useState("2024-03-10T09:00:00.000Z");
  const { pdfViewerState, openPdfViewer, closePdfViewer } = usePDFViewer();
  
  // Get user from AuthContext instead of localStorage to ensure re-renders
  const { user: authUser } = useContext(AuthContext);
  
  // Use authUser for conditional rendering
  const currentUser = authUser || user;

  // Setup WebSocket connection at app level
  useEffect(() => {
    if (!cabinId || !selectedSlot || !currentUser) return;

    console.log("Setting up WebSocket connection at App level");
    webSocketService.connect(cabinId, selectedSlot);

    // Handle visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Tab is now visible, checking WebSocket connection state');
        console.log('Current wasClosedDueToInactivity flag:', webSocketService.wasClosedDueToInactivity);
        
        // Use the new connection checking method that handles inactivity reconnection
        const { shouldReload, connectionState } = webSocketService.checkConnection();
        console.log('checkConnection result:', { shouldReload, connectionState });
        
        if (shouldReload) {
          console.log('Connection was closed due to inactivity, reloading page');
          // Reset the flag before reloading to ensure it's in the correct state
          webSocketService.wasClosedDueToInactivity = false;
          window.location.reload();
          return;
        }
        
        // Original reconnection logic for other cases
        if (!webSocketService.ws || connectionState === WebSocket.CLOSED) {
          console.log('WebSocket connection needs to be re-established');
          webSocketService.reconnectAttempt = 0;
          webSocketService.connect(cabinId, selectedSlot);
        }
      }
    };

    // Add beforeunload event to force close the WebSocket when page unloads
    const handleBeforeUnload = () => {
      console.log('Page is being unloaded, force closing WebSocket connection');
      webSocketService.disconnect(true); // Force close the connection
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      webSocketService.disconnect();
    };
  }, [cabinId, selectedSlot, currentUser]);

  // Setup WebSocket subscriber for queue updates
  useEffect(() => {
    if (!cabinId || !selectedSlot || !currentUser) return;

    console.log("Setting up WebSocket subscription for queue updates in App");
    
    // Subscribe to queue updates
    const unsubscribe = webSocketService.subscribe('queue', (response) => {
      console.log("Received queue update via WebSocket in App:", response);
      
      try {
        // Check for the right message format
        let queueData = null;
        let cabinslotData = null;
        if (response.data && response.data.type === "queue_update" && response.data.data) {
          // Check for queue update
          if (response.data.data.queue) {
            queueData = response.data.data.queue;
          }
          
          // Check for cabinslot update
          if (response.data.data.cabinslot) {
            cabinslotData = response.data.data.cabinslot;
          }
        }
        
        // Handle queue data
        if (queueData) {
          console.log("Processing queue update:", queueData);
          
          
          // Update patient state
          setPatients(prevPatients => {
            // Find if the updated patient already exists in our list
            const existingPatientIndex = prevPatients.findIndex(
              p => p.appointment?.appointment_id === queueData.appointment?.appointment_id
            );
            
            // If appointment data exists in the queue update
            if (queueData.appointment) {
              const updatedPatient = {
                appointment: queueData.appointment,
                position: queueData.position,
                status: queueData.status,
                paid: queueData.paid,
                checkin: queueData.checkin,
                late: queueData.late
              };
              
              if (existingPatientIndex !== -1) {
                // Update existing patient
                const updatedPatients = [...prevPatients];
                updatedPatients[existingPatientIndex] = {
                  ...updatedPatients[existingPatientIndex],
                  ...updatedPatient
                };
                return updatedPatients;
              } else {
                // Add new patient to the list
                return [...prevPatients, updatedPatient];
              }
            }
            
            return prevPatients;
          });
        }
        
        // Handle cabinslot data
        if (cabinslotData) {
          console.log("Processing cabinslot update:", cabinslotData);
          // Update current position if current_number is provided
          if (cabinslotData.current_number !== undefined) {
            console.log("Updating current position to:", cabinslotData.current_number);
            setCurrentPosition(parseInt(cabinslotData.current_number));
          }
        }
      } catch (error) {
        console.error("Error processing WebSocket queue data in App:", error);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [cabinId, selectedSlot, currentUser]);

  // Initial data loading
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      console.log("Fetching initial data with:", cabinId, selectedSlot);
      try {            
        const patients = await fetchPatients(cabinId, selectedSlot);
        console.log("Fetched patients:", patients);
        setPatients(patients);
        
        const { current_number } = await fetchCurrentPosition(cabinId, selectedSlot);
        setCurrentPosition(current_number);
      } catch (error) {
        console.error("Error loading initial data:", error);
      } finally {
        setLoading(false);
      }
    };

    // Only fetch initial data when context is initialized and we have the required values
    if (isInitialized && cabinId && selectedSlot) {
      console.log("CheckupCabinContext is initialized with valid cabin data, running fetchInitialData");
      fetchInitialData();
    } else if (isInitialized) {
      console.log("CheckupCabinContext is initialized but missing required data - cabinId:", cabinId, "selectedSlot:", selectedSlot);
    }
  }, [isInitialized, cabinId, selectedSlot]);

  useEffect(() => {
    if (patients.length > 0 && currentPosition !== null) {
      const current = patients.find((p) => p.position === currentPosition);
      setCurrentPatient(current || null);
    }
  }, [patients, currentPosition]);

  return (
    <AppointmentFormProvider>
      <NotificationProvider>
        <ThemeProvider theme={theme}>
          <Router>
            <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
              {currentUser !== null && (
                <Header />
              )}
              <Box
                sx={{
                  display: "flex",
                  flex: 1,
                  overflow: "hidden",
                }}
              >
                {!isMobile && currentUser !== null && <Sidebar />}
                <Box
                  component="main"
                  sx={{
                    flexGrow: 1,
                    padding: "6px",
                    height: "100%",
                    width: "100%",
                    overflowY: "auto",
                    marginBottom: "200px",
                  }}
                >
                  <Routes>
                    <Route
                      path="/login"
                      element={currentUser ? (
                        isMobile ? 
                          <Navigate to="/mobile-queue" replace /> : 
                          <Navigate to="/" replace />
                      ) : <Login />}
                    />
                    <Route
                      path="/"
                      element={
                        <PrivateRoute>
                          {isMobile ? (
                            <Navigate to="/mobile-queue" replace />
                          ) : (
                            // <Dashboard 
                            //   patients={patients}
                            //   setPatients={setPatients}
                            //   currentPosition={currentPosition}
                            //   loading={loading}
                            //   handleNextPatient={handleNextPatient}
                            //   handleLatePatient={handleLatePatient}
                            //   shufflePosition={shufflePosition}
                            // />
                            <Navigate to="/queue" replace />
                          )}
                        </PrivateRoute>
                      }
                    />
                    <Route
                      path="/appointments"
                      element={
                        <PrivateRoute>
                          <AppointmentTable />
                        </PrivateRoute>
                      }
                    />
                    <Route
                      path="/past-appointments"
                      element={
                        <PrivateRoute>
                          <PastAppointmentsPage />
                        </PrivateRoute>
                      }
                    />
                    <Route
                      path="/prescription"
                      element={
                        <PrivateRoute>
                          <PrescriptionPage />
                        </PrivateRoute>
                      }
                    />

                    <Route
                      path="/patient-info"
                      element={
                        <PrivateRoute>
                          <PatientInfoPage />
                        </PrivateRoute>
                      }
                    />

                    <Route
                      path="/appointment-details"
                      element={
                        <PrivateRoute>
                          <AppointmentDetails />
                        </PrivateRoute>
                      }
                    />

                    <Route
                      path="/help"
                      element={
                        <PrivateRoute>
                          <Help />
                        </PrivateRoute>
                      }
                    />

                    <Route
                      path="/add-appointment"
                      element={
                        <PrivateRoute>
                          <AddAppointmentMobile patients={patients} />
                        </PrivateRoute>
                      }
                    />
                    <Route
                      path="/mobile-appointments"
                      element={
                        <PrivateRoute>
                          <MobileAppointmentTable />
                        </PrivateRoute>
                      }
                    />
                    <Route
                      path="/queue"
                      element={
                        <PrivateRoute>
                          <Home
                            currentPosition={currentPosition}
                            patients={patients}
                            setPatients={(patients) => setPatients(patients)}
                            loading={loading}
                          />
                        </PrivateRoute>
                      }
                    />
                    <Route
                      path="/consultation"
                      element={
                        <PrivateRoute>
                          <ConsultationPage />
                        </PrivateRoute>
                      }
                    />
                    <Route
                      path="/mobile-queue"
                      element={
                        <PrivateRoute>
                          <MobileQueuePage 
                            patientsData={patients} 
                            currentPositionData={currentPosition} 
                            loading={loading}
                          />
                        </PrivateRoute>
                      }
                    />
                    <Route
                      path="/manage-slot"
                      element={
                        <PrivateRoute>
                          <ManageSlot />
                        </PrivateRoute>
                      }
                    />
                    
                    <Route path="*" element={<Navigate to="/login" replace />} />
                  </Routes>
                </Box>
              </Box>
              {currentUser !== null && isMobile && <BottomNavigator />}
              
              {/* Global appointment form - available from anywhere */}
              <AppointmentForm />
              
              {/* PDF Viewer for reports/prescriptions */}
              {pdfViewerState.open && (
                <PDFViewer
                  url={pdfViewerState.pdfUrl}
                  onClose={closePdfViewer}
                  title={pdfViewerState.title}
                />
              )}
            </Box>
            <GlobalSnackbar />
          </Router>
        </ThemeProvider>
      </NotificationProvider>
    </AppointmentFormProvider>
  );
};

// Export the PDF viewer context to make it available throughout the app
export const PDFViewerContext = React.createContext({
  openPdfViewer: () => {},
  closePdfViewer: () => {}
});

// Create a PDF viewer provider component
export const PDFViewerProvider = ({ children }) => {
  const pdfViewerHook = usePDFViewer();
  
  return (
    <PDFViewerContext.Provider value={pdfViewerHook}>
      {children}
      <PDFViewer 
        open={pdfViewerHook.pdfViewerState.open}
        onClose={pdfViewerHook.closePdfViewer}
        pdfUrl={pdfViewerHook.pdfViewerState.pdfUrl}
        title={pdfViewerHook.pdfViewerState.title}
      />
    </PDFViewerContext.Provider>
  );
};

export default App;
