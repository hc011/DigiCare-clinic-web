import React, { useEffect } from "react";
import { Snackbar, Alert, Box, AlertTitle } from "@mui/material";
import { useNotification } from "../context/NotificationContext";

const GlobalSnackbar = () => {
  const { notification, hideNotification } = useNotification();
  const { open, message, severity, autoHideDuration, position, title } = notification;

  useEffect(() => {
    let timer;
    if (open && autoHideDuration && autoHideDuration > 0) {
      timer = setTimeout(() => {
        hideNotification();
      }, autoHideDuration);
    }
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [open, autoHideDuration, hideNotification]);

  // Special case for full-screen success alert (SuccessAlert replacement)
  if (severity === "success" && title && position.vertical === "center" && position.horizontal === "center") {
    return (
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          display: open ? 'flex' : 'none',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'rgba(255, 255, 255, 0.9)',
        }}
        onClick={hideNotification}
      >
        <Alert 
          severity="success"
          sx={{ 
            maxWidth: '80%',
            boxShadow: 3,
          }}
        >
          <AlertTitle>{title}</AlertTitle>
          {message}
        </Alert>
      </Box>
    );
  }

  // Regular snackbar (CustomSnackbar replacement)
  return (
    <Box 
      sx={{ 
        position: 'fixed',
        zIndex: 1400,
        [position.vertical]: 24,
        [position.horizontal]: 24,
        transition: 'all 0.3s ease'
      }}
      style={{ 
        display: open ? 'block' : 'none',
        opacity: open ? 1 : 0
      }}
    >
      <Alert
        onClose={hideNotification}
        severity={severity}
        sx={{
          width: "100%",
          minWidth: "288px",
          boxShadow: 3,
          alignItems: "center",
          ".MuiAlert-icon": {
            alignItems: "center",
          },
        }}
        elevation={6}
        variant="filled"
      >
        <span
          style={{ fontSize: "0.95rem", display: "flex", alignItems: "center" }}
        >
          {message}
        </span>
      </Alert>
    </Box>
  );
};

export default GlobalSnackbar; 