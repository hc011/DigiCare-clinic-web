import React, { useEffect, useState } from 'react';
import { useCheckupCabin } from '../context/CheckupCabinContext';
import { Select, MenuItem, FormControl, Box, Typography, useMediaQuery, useTheme, InputLabel } from '@mui/material';

const CabinSelector = () => {
  const { selectedCabinIndex, setSelectedCabinIndex, getUserData } = useCheckupCabin();
  const [userData, setUserData] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    const user = getUserData();
    setUserData(user);
  }, [getUserData]);

  if (!userData || !userData.checkupcabindata || userData.checkupcabindata.length <= 1) {
    return null;
  }

  const currentCabin = userData.checkupcabindata[selectedCabinIndex];

  // Mobile View
  if (isMobile) {
    return (
      <FormControl fullWidth variant="outlined" size="medium">
        <Select
          value={selectedCabinIndex}
          onChange={(e) => setSelectedCabinIndex(Number(e.target.value))}
          displayEmpty
          sx={{
            borderRadius: '8px',
            backgroundColor: '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            '& .MuiSelect-select': {
              py: 1.5,
              px: 2,
              display: 'flex',
              alignItems: 'center',
              fontSize: '1rem',
              fontWeight: 500
            }
          }}
          MenuProps={{
            PaperProps: {
              sx: {
                maxHeight: '40vh',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                borderRadius: '8px',
                mt: 1
              }
            }
          }}
        >
          {userData.checkupcabindata.map((cabin, index) => (
            <MenuItem 
              key={cabin.id || index} 
              value={index}
              sx={{
                py: 1.5,
                px: 2,
                '&.Mui-selected': {
                  backgroundColor: 'rgba(25, 118, 210, 0.08)',
                  fontWeight: 500
                },
                '&:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.04)'
                }
              }}
            >
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {cabin.doctor || 'Doctor'}
                </Typography>
                {cabin.hospital && (
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                    {cabin.hospital}
                  </Typography>
                )}
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  }

  // Desktop View (Improved)
  return (
    <FormControl size="small" sx={{ minWidth: 160 }}>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        width: '100%'
      }}>
        <Typography variant="caption" sx={{ 
          mb: 0.5, 
          fontWeight: 600,
          color: 'text.secondary',
          fontSize: '0.7rem'
        }}>
          DOCTOR
        </Typography>
        <Select
          value={selectedCabinIndex}
          onChange={(e) => setSelectedCabinIndex(Number(e.target.value))}
          sx={{ 
            fontSize: '0.875rem',
            backgroundColor: '#fff',
            borderRadius: '4px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            '& .MuiSelect-select': { 
              py: 1,
              fontWeight: 500
            },
            '&:hover': {
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }
          }}
          MenuProps={{
            PaperProps: {
              sx: {
                maxHeight: '300px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                borderRadius: '4px'
              }
            }
          }}
        >
          {userData.checkupcabindata.map((cabin, index) => (
            <MenuItem 
              key={cabin.id || index} 
              value={index}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: 'rgba(25, 118, 210, 0.08)',
                  fontWeight: 500
                },
                '&:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.04)'
                }
              }}
            >
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {cabin.doctor || 'Doctor'}
                </Typography>
                {cabin.hospital && (
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.7rem' }}>
                    {cabin.hospital}
                  </Typography>
                )}
              </Box>
            </MenuItem>
          ))}
        </Select>
      </Box>
    </FormControl>
  );
};

export default CabinSelector;