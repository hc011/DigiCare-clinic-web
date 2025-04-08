import React, { useEffect, useState, useRef } from "react";
import PatientItem from "./PatientItem";
import "./QueueContainer.css";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  Skeleton,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  Dialog,
  CircularProgress,
  Typography,
  Box,
} from "@mui/material";
import { markPatientAsDone, markPatientAsLate, shufflePatientPosition } from "../services/api";

const QueueContainer = ({
  loading,
  patients,
  setPatients,
  currentPosition,
}) => {
  const [mergedGroup, setMergedGroup] = useState([]);
  const [confirmDrag, setConfirmDrag] = useState(false);
  const [dragActiveId, setDragActiveId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const originalPatientsRef = useRef([]);
  const [isShifting, setIsShifting] = useState(false);

  useEffect(() => {
    console.log('QueueContainer received patients:', patients);
  }, [patients]);

  useEffect(() => {
    const sortedPatients = [...patients]
      .filter((p) => p.status === "pending")
      .sort((a, b) => a.position - b.position);

    setMergedGroup(sortedPatients);
    console.log('Sorted patients for queue:', sortedPatients);
    console.log('Current position in queue:', currentPosition);
  }, [patients, currentPosition]);

  const handleNextPatient = async (id) => {    
    const result = await markPatientAsDone(id);
    return result;
  };

  const handleLatePatient = async (id) => {
    const result = await markPatientAsLate(id);
    return result;
  };

  const shufflePosition = async (payload) => {
    const result = await shufflePatientPosition(payload);
    return result;
  };

  const handleDragEnd = async (event) => {
    debugger;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    originalPatientsRef.current = [...patients];

    const activeIndex = mergedGroup.findIndex(
      (p) => p.appointment?.appointment_id === active.id
    );
    const overIndex = mergedGroup.findIndex(
      (p) => p.appointment?.appointment_id === over.id
    );

    if (activeIndex === -1 || overIndex === -1) {
      console.error("Could not find patient in drag operation", { active, over });
      return;
    }

    const newMergedGroup = arrayMove(mergedGroup, activeIndex, overIndex);
    setMergedGroup(newMergedGroup);
    setConfirmDrag(true);
    setDragActiveId(active.id);
    setDragOverId(over.id);
  };

  const handleConfirmDrag = async () => {
    setIsShifting(true);

    const sortedPatients = patients.sort((a, b) => a.position - b.position);
    const activeIndex = sortedPatients.findIndex(
      (p) => p.appointment?.appointment_id === dragActiveId
    );
    const overIndex = sortedPatients.findIndex(
      (p) => p.appointment?.appointment_id === dragOverId
    );
    
    let newPosition;
    debugger;
    // Determine if dragging up or down
    if (activeIndex > overIndex) {
      // Dragging UP
      // If dropped at the very top, special case
      if (overIndex === 0) {
        newPosition = patients.sort((a, b) => a.position - b.position)[0].position - 1;
      } else {
        // Position between the drop target and the item after it
        newPosition = patients.sort((a, b) => a.position - b.position)[overIndex].position - 1;
      }
    } else {
      // Dragging DOWN
      // If dropped at the very bottom, special case
      if (overIndex === mergedGroup.length - 1) {
        newPosition = patients.sort((a, b) => a.position - b.position)[overIndex].position + 1;
      } else {
        // Position between the drop target and the item before it
        newPosition = patients.sort((a, b) => a.position - b.position)[overIndex].position + 1;
      }
    }
    
    await shufflePosition({
      appointment_id: dragActiveId,
      new_position: newPosition,
    });
    
    setIsShifting(false);
    setConfirmDrag(false);
  };

  const handleCancelDrag = () => {
    setPatients(originalPatientsRef.current);
    setConfirmDrag(false);
  };

  return (
    <div className="queue-container">
      {loading ? (
        <div className="skeleton-container">
          {[...Array(5)].map((_, index) => (
            <Box 
              key={index} 
              className="skeleton-item" 
              sx={{ 
                display: 'flex',
                flexDirection: 'column',
                borderRadius: '8px',
                overflow: 'hidden',
                backgroundColor: '#fff',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                padding: { xs: '8px 8px 0 8px', sm: '12px 12px 0 12px' }
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
        </div>
      ) : mergedGroup.length === 0 ? (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100%',
          flexDirection: 'column',
          gap: 2,
          p: 4,
          textAlign: 'center'
        }}
        className="empty-queue-message"
        >
          <Typography variant="h6" color="text.secondary">
            No patients in queue
          </Typography>
          <Typography variant="body2" color="text.secondary">
            All patients have been processed or no appointments are scheduled.
          </Typography>
        </Box>
      ) : (
        <DndContext
          modifiers={[restrictToVerticalAxis]}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={mergedGroup.map((p) => p.appointment.appointment_id)}
            strategy={verticalListSortingStrategy}
          >
            {mergedGroup.map((patient) => (
              <PatientItem
                key={patient.appointment.appointment_id}
                position={patient.position}
                appointment={patient.appointment}
                late={patient.late}
                currentPosition={currentPosition}
                handleNextPatient={handleNextPatient}
                handleLatePatient={handleLatePatient}
                isDraggable={patient.position > currentPosition}
                paid={patient.paid}
                status={patient.status}
                checkin={patient.checkin}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}

      <Dialog open={confirmDrag} onClose={handleCancelDrag}>
        <DialogTitle>Confirm Position Change</DialogTitle>
        <DialogContent>
          Are you sure you want to move this patient to the new position?
        </DialogContent>
        <DialogActions> 
          <Button onClick={handleCancelDrag}>Cancel</Button>
          <Button onClick={handleConfirmDrag} color="primary">
            {isShifting ? (
              <CircularProgress size={24} color="white" />
            ) : (
              "Confirm"
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default QueueContainer;
