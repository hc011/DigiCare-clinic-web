import * as React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Box from "@mui/material/Box";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import { styled } from '@mui/material/styles';

import AddIcon from "@mui/icons-material/Add";
import MedicalInformationIcon from "@mui/icons-material/MedicalInformation";
import TimerIcon from "@mui/icons-material/Timer";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import QueueIcon from "@mui/icons-material/PeopleAlt";
import SettingsIcon from "@mui/icons-material/Settings";

// Create a more compact version of BottomNavigationAction
const CompactBottomNavigationAction = styled(BottomNavigationAction)(({ theme }) => ({
  padding: '6px 0',
  minWidth: 'auto',
  '& .MuiBottomNavigationAction-label': {
    fontSize: '0.8rem',
    '&.Mui-selected': {
      fontSize: '1rem',
    },
  },
  '& .MuiSvgIcon-root': {
    fontSize: '1.5rem',
  },
}));

export default function BottomNavigator() {
  const navigate = useNavigate();
  const location = useLocation();

  // Map paths to their respective indices
  const pathToIndex = {
    "/mobile-queue": 0,
    "/add-appointment": 1,
    "/mobile-appointments": 2,
    "/manage-slot": 3,
  };

  const [value, setValue] = React.useState(pathToIndex[location.pathname] || 0);

  return (
    <Box sx={{ 
      position: "fixed", 
      bottom: "0", 
      width: "100%", 
      zIndex: 1000,
      boxShadow: '0px -2px 5px rgba(0, 0, 0, 0.05)'
    }}>
      <BottomNavigation
        showLabels
        value={value}
        sx={{ 
          height: 48, // Reduced height
          '& .MuiBottomNavigationAction-root': {
            py: 0
          }
        }}
        onChange={(event, newValue) => {
          setValue(newValue);
          const paths = ["/mobile-queue", "/add-appointment", "/mobile-appointments", "/manage-slot"];
          navigate(paths[newValue]);
        }}
      >
        <CompactBottomNavigationAction
          label="Queue"
          icon={<QueueIcon />}
        />
        <CompactBottomNavigationAction 
          label="Add New" 
          icon={<AddIcon />} 
        />
        <CompactBottomNavigationAction
          label="Appointments"
          icon={<CalendarTodayIcon />}
        />
        <CompactBottomNavigationAction
          label="Manage"
          icon={<SettingsIcon />}
        />
      </BottomNavigation>
    </Box>
  );
}
