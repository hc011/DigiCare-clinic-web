import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Switch,
  FormControlLabel,
  Paper,
  Grid,
  useMediaQuery,
  useTheme,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
  Alert,
  CircularProgress
} from '@mui/material';
import './ManageSlot.css';
import { getCabinInfo } from '../utils/dateUtils';
import { updateSlot } from '../services/api';

const ManageSlot = () => {
  const selectedSlotInfo = JSON.parse(localStorage.getItem('cabin_selected_slot_info')) || {};
  const [slotActive, setSlotActive] = useState(selectedSlotInfo?.is_active || false);
  const [autoAdjust, setAutoAdjust] = useState(selectedSlotInfo?.auto_adjust || false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  console.log(selectedSlotInfo)
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { cabinId, selectedSlot } = getCabinInfo();

  // Dialog states
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    action: null,
    confirmText: 'Confirm',
    cancelText: 'Cancel'
  });

  // Function to call the API
  const callSlotApi = async (payload) => {
    setLoading(true);
    try {
      const response = await updateSlot(payload);
      setSnackbar({
        open: true,
        message: 'Slot updated successfully',
        severity: 'success'
      });
      return response;
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to update slot: ' + error.message,
        severity: 'error'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleSlotActiveChange = (event) => {
    const newValue = event.target.checked;
    setConfirmDialog({
      open: true,
      title: newValue ? 'Activate Slot?' : 'Deactivate Slot?',
      message: newValue 
        ? 'Are you sure you want to activate this slot?' 
        : 'Are you sure you want to deactivate this slot?',
      action: async () => {
        try {
          await callSlotApi({
            cabinId: cabinId,
            slot: selectedSlot,
            is_active: newValue
          });
          setSlotActive(newValue);
        } catch (error) {
          console.error('Error updating slot active status:', error);
        }
      },
      confirmText: 'Yes',
      cancelText: 'No'
    });
  };

  const handleAutoAdjustChange = (event) => {
    const newValue = event.target.checked;
    setConfirmDialog({
      open: true,
      title: newValue ? 'Enable Auto Adjust?' : 'Disable Auto Adjust?',
      message: newValue 
        ? 'Are you sure you want to enable auto adjustment? The system will automatically adjust the queue.' 
        : 'Are you sure you want to disable auto adjustment? You will need to manage the queue manually.',
      action: async () => {
        try {
          await callSlotApi({
            cabinId: cabinId,
            slot: selectedSlot,
            auto_adjust: newValue
          });
          setAutoAdjust(newValue);
        } catch (error) {
          console.error('Error updating auto adjust status:', error);
        }
      },
      confirmText: 'Yes',
      cancelText: 'No'
    });
  };

  const handleEndSlot = () => {
    setConfirmDialog({
      open: true,
      title: 'End Current Slot?',
      message: 'Are you sure you want to end the current slot? This action cannot be undone and will finalize all appointments in this time slot.',
      action: async () => {
        try {
          await callSlotApi({
            cabinId: cabinId,
            slot: selectedSlot,
            status: 'ended'
          });
          // For demo purposes, let's just disable the slot
          setSlotActive(false);
        } catch (error) {
          console.error('Error ending slot:', error);
        }
      },
      confirmText: 'End Slot',
      cancelText: 'Cancel'
    });
  };

  const handleConfirmDialogClose = () => {
    setConfirmDialog({
      ...confirmDialog,
      open: false
    });
  };

  const handleConfirmAction = () => {
    if (confirmDialog.action) {
      confirmDialog.action();
    }
    handleConfirmDialogClose();
  };

  const handleSnackbarClose = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };

  // Fetch initial slot status on component mount
  useEffect(() => {
    const fetchSlotStatus = async () => {
      if (!cabinId || !selectedSlot) return;
      
      setLoading(true);
      try {
        // Check if selectedSlotInfo is available in localStorage
        const storedSlotInfo = JSON.parse(localStorage.getItem('cabin_selected_slot_info'));
        if (storedSlotInfo) {
          // Update state with values from localStorage
          setSlotActive(storedSlotInfo.is_active || false);
          setAutoAdjust(storedSlotInfo.auto_adjust || false);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching slot status:', error);
        setSnackbar({
          open: true,
          message: 'Failed to fetch slot status',
          severity: 'error'
        });
        setLoading(false);
      }
    };

    fetchSlotStatus();
  }, [cabinId, selectedSlot]);

  return (
    <Box
      className="manage-slot-container"
      sx={{
        padding: isMobile ? '16px' : '24px',
        maxWidth: '100%',
        margin: '0 auto'
      }}
    >
      <Typography variant={isMobile ? 'h5' : 'h4'} gutterBottom>
        Manage Slot
      </Typography>

      <Paper 
        elevation={3} 
        sx={{ 
          padding: isMobile ? '16px' : '24px', 
          marginTop: '20px',
          borderRadius: '8px',
          position: 'relative'
        }}
      >
        {loading && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              zIndex: 1,
              borderRadius: '8px',
            }}
          >
            <CircularProgress />
          </Box>
        )}
        
        <Grid container direction="column" spacing={4}>
          <Grid item>
            <FormControlLabel
              control={
                <Switch
                  checked={slotActive}
                  onChange={handleSlotActiveChange}
                  color="primary"
                  disabled={loading}
                  sx={{ 
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: '#4caf50',
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: '#4caf50',
                    }
                  }}
                />
              }
              label={
                <Typography variant="body1">
                  Slot is active
                </Typography>
              }
            />
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Enable if doctor is available for appointments at this time.
            </Typography>
          </Grid>

          <Grid item>
            <FormControlLabel
              control={
                <Switch
                  checked={autoAdjust}
                  onChange={handleAutoAdjustChange}
                  color="primary"
                  disabled={loading}
                  sx={{ 
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: '#2196f3',
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: '#2196f3',
                    }
                  }}
                />
              }
              label={
                <Typography variant="body1">
                  Auto Adjust
                </Typography>
              }
            />
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Enable for automatic queue management.
            </Typography>
          </Grid>

          <Grid item>
            <Box 
              sx={{ 
                display: 'flex', 
                justifyContent: isMobile ? 'flex-start' : 'flex-start',
                mt: 2 
              }}
            >
              <Button 
                variant="contained" 
                color="error"
                onClick={handleEndSlot}
                disabled={loading}
                sx={{
                  fontWeight: 'bold',
                  px: 4,
                  py: 1
                }}
              >
                End Slot
              </Button>
            </Box>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                This action cannot be undone.
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={handleConfirmDialogClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {confirmDialog.title}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {confirmDialog.message}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleConfirmDialogClose} color="primary">
            {confirmDialog.cancelText}
          </Button>
          <Button onClick={handleConfirmAction} color="primary" autoFocus>
            {confirmDialog.confirmText}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={snackbar.severity} 
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ManageSlot; 