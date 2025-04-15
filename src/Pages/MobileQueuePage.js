import React, { useEffect, useState } from "react";
import { 
  Box, 
  Typography, 
  Container,
  useMediaQuery,
  CircularProgress,
  Divider,
  IconButton,
  Tooltip,
  Paper,
  Skeleton
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import QueueContainer from "../components/QueueContainer";
import BottomNavigator from "../components/BottomNavigator";
import { 
  markPatientAsDone,
  markPatientAsLate,
  shufflePatientPosition
} from "../services/api";
import "./MobileQueuePage.css";
import { getCabinInfo } from "../utils/dateUtils";

const MobileQueuePage = ({ patientsData, currentPositionData, onDataChange, loading, queueList }) => {
  const [patients, setPatients] = useState([]);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [localLoading, setLocalLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");
  const user = JSON.parse(localStorage.getItem("user"));
  const {cabinId, selectedSlot} = getCabinInfo(user);
  
  // Update local state when props change
  useEffect(() => {
    if (patientsData) {
      console.log("MobileQueuePage received updated patients data:", patientsData);
      setPatients(patientsData);
      
      // Mark data as loaded regardless of whether there are patients or not
      setDataLoaded(true);
      setLocalLoading(false);
      
      // No need to apply the mobile fix anymore since PatientItem handles it natively
    }
    
    if (currentPositionData !== undefined) {
      console.log("MobileQueuePage received updated current position:", currentPositionData);
      // Ensure we're using a number for the current position
      setCurrentPosition(parseInt(currentPositionData));
    }
  }, [patientsData, currentPositionData]);

  // Handle initial loading state - Add a backup timeout to ensure loading screen doesn't persist
  useEffect(() => {
    // Set a timeout to hide loader after a maximum time
    // This ensures loading won't stay forever if there's an issue
    const timer = setTimeout(() => {
      if (localLoading) {
        setLocalLoading(false);
        setDataLoaded(true);
      }
    }, 3000); // Max loading time of 3 seconds
    
    return () => clearTimeout(timer);
  }, [localLoading]);
  
  // No need for the mobile layout fix useEffect anymore since PatientItem handles it natively
  
  const handleNextPatient = async (id) => {
    try {
      // Don't set localLoading here since PatientItem has its own loading state
      await markPatientAsDone(id);
      // Notify parent component to refresh data
      if (onDataChange) onDataChange();
    } catch (error) {
      console.error("Error marking patient as done:", error);
    }
  };

  const handleLatePatient = async (id) => {
    try {
      // Don't set localLoading here since PatientItem has its own loading state
      await markPatientAsLate(id);
      // Notify parent component to refresh data
      if (onDataChange) onDataChange();
    } catch (error) {
      console.error("Error marking patient as late:", error);
    }
  };

  const shufflePosition = async (payload) => {
    try {
      // Don't set localLoading here since QueueContainer handles its own loading state
      await shufflePatientPosition(payload);
      // Notify parent component to refresh data
      if (onDataChange) onDataChange();
    } catch (error) {
      console.error("Error shuffling position:", error);
    }
  };

  // Calculate queue summary stats
  const queueStats = {
    total: queueList.filter(p => p.appointment !== null).length,
    pending: queueList.filter(p => p.appointment !== null).filter(p => p.status === "pending").length,
    checkedIn: queueList.filter(p => p.appointment !== null).filter(p => p.status === "pending").filter(p => p.type === "patient").filter(p => p.position !== -1).filter(p => p.checkin === true).length,
  };

  // If not mobile, display a message suggesting to use desktop view
  if (!isMobile) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        p: 3,
        textAlign: 'center'
      }}>
        <Typography variant="h5">
          This page is optimized for mobile devices. Please use a mobile device or resize your browser window.
        </Typography>
      </Box>
    );
  }

  // Combine prop loading state with local loading state
  const showLoader = loading; // Only show full-screen loader for initial page load

  return (
    <Box sx={{ pb: 6, width: '100%', maxWidth: '100%' }} className="mobile-queue-page">
      {/* Queue Summary Section */}
      <Paper elevation={0} sx={{ 
        p: 1.5, 
        m: 1, 
        mb: 0.5, 
        borderRadius: 2,
        background: "transparent",
        display: 'flex',
        flexDirection: 'column',
      }} className="queue-summary">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#475569" }}>
            Queue Summary
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
          <Box sx={{ textAlign: 'center', px: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
              Total Today
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 'bold', fontSize: '1rem' }}>
              {loading ? "-" : queueStats.total}
            </Typography>
          </Box>
          
          <Divider orientation="vertical" flexItem />
          
          <Box sx={{ textAlign: 'center', px: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
              Pending
            </Typography>
            <Typography variant="body1" color="primary" sx={{ fontWeight: 'bold', fontSize: '1rem' }}>
              {loading ? "-" : queueStats.pending}
            </Typography>
          </Box>
          
          <Divider orientation="vertical" flexItem />
          
          <Box sx={{ textAlign: 'center', px: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
              Present
            </Typography>
            <Typography variant="body1" color="info.main" sx={{ fontWeight: 'bold', fontSize: '1rem' }}>
              {loading ? "-" : queueStats.checkedIn}
            </Typography>
          </Box>
        </Box>
      </Paper>
      
      <Container 
        maxWidth={false} 
        disableGutters
        sx={{ 
          pt: 0.5,
          height: "calc(100vh - 140px)",
          width: '100%',
          overflow: 'hidden',
        }}
        className="mobile-container"
      >
        {showLoader ? (
          <Box sx={{ px: 1, pt: 1 }}>
            {/* Queue items skeletons */}
            {[...Array(5)].map((_, index) => (
              <Box 
                key={index}
                sx={{ 
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  backgroundColor: '#fff',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                  padding: '8px 8px 0 8px',
                  mb: 1.5
                }}
              >
                <Box sx={{ display: 'flex', width: '100%', mb: 1.5 }}>
                  {/* Token badge skeleton */}
                  <Box sx={{ mr: 1.5 }}>
                    <Skeleton variant="rectangular" width={60} height={30} sx={{ borderRadius: '20px' }} />
                  </Box>
                  
                  {/* Patient details skeleton */}
                  <Box sx={{ flex: 1 }}>
                    {/* Name */}
                    <Skeleton variant="text" width="70%" height={24} sx={{ mb: 1 }} />
                    
                    {/* Status tags */}
                    <Box sx={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      <Skeleton variant="rectangular" width={60} height={20} sx={{ borderRadius: '20px' }} />
                      <Skeleton variant="rectangular" width={70} height={20} sx={{ borderRadius: '20px' }} />
                      {index % 2 === 0 && (
                        <Skeleton variant="rectangular" width={65} height={20} sx={{ borderRadius: '20px' }} />
                      )}
                    </Box>
                  </Box>
                </Box>
                
                {/* Action buttons skeleton */}
                <Box 
                  sx={{ 
                    display: 'flex', 
                    width: '100%', 
                    justifyContent: 'space-evenly',
                    p: '4px 8px',
                    gap: '8px',
                    backgroundColor: '#f9f9f9',
                    borderTop: '1px solid #eee',
                    borderRadius: '0 0 8px 8px',
                    mt: 1
                  }}
                >
                  <Skeleton variant="rectangular" width="30%" height={30} sx={{ borderRadius: '4px' }} />
                  <Skeleton variant="rectangular" width="30%" height={30} sx={{ borderRadius: '4px' }} />
                  <Skeleton variant="rectangular" width="30%" height={30} sx={{ borderRadius: '4px' }} />
                </Box>
              </Box>
            ))}
          </Box>
        ) : (
          <QueueContainer
            loading={localLoading}
            patients={patients}
            setPatients={setPatients}
            currentPosition={currentPosition}
            handleNextPatient={handleNextPatient}
            handleLatePatient={handleLatePatient}
            shufflePosition={shufflePosition}
          />
        )}
      </Container>

      {/* Fixed Bottom Navigator */}
      <BottomNavigator />
    </Box>
  );
};

export default MobileQueuePage; 