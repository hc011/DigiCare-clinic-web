import React from "react";
import { Card, CardContent, Typography, Box, ListItem } from "@mui/material";
import { useState, useEffect } from "react";
import Skeleton from "@mui/material/Skeleton";

export default function StatisticsCard({ patients, currentPatient, loading, queueList }) {
  const [stats, setStats] = useState({
    totalPatientsToday: 0,
    patientsMarkedLate: 0,
    patientsDoneTillNow: 0,
    averageCheckupTime: "12 mins",
    patientsWaiting: 0,
    estimatedClosingTime: "5:30 PM",
    mostCommonIssue: "Flu",
    doctorAvailability: 3,
    totalCancelled: 0,
  });

  useEffect(() => {

    // const updatedStats = {
    //   totalPatientsToday: patients.length,
    //   patientsMarkedLate:
    //     patients.length !== 0
    //       ? patients.filter((p) => p.late === true).length
    //       : 0,
    //   patientsDoneTillNow: patients.filter((p) => p.status === "done_checkup")
    //     .length,
    //   averageCheckupTime: "12 mins",
    //   patientsWaiting:
    //     patients.length !== 0
    //       ? patients.filter(
    //           (p) => p.status !== "done_checkup" && p.status !== "cancelled"
    //         ).length
    //       : 0,
    //   estimatedClosingTime: "5:30 PM",
    //   mostCommonIssue: "Flu",
    //   doctorAvailability: 3,
    //   totalCancelled: patients.filter((p) => p.status === "cancelled").length,
    // };

    const updatedStats = {
      totalPatientsToday: queueList.filter(p => p.appointment !== null).length,
      patientsMarkedLate:
        queueList.length !== 0
          ? queueList.filter(p => p.appointment !== null).filter((p) => p.late === true).length
          : 0,
      patientsDoneTillNow: queueList.filter(p => p.appointment !== null).filter((p) => p.status === "done_checkup")
        .length,
      averageCheckupTime: "12 mins",
      patientsWaiting:
        queueList.length !== 0
          ? queueList.filter(p => p.appointment !== null).filter(
              (p) => p.status !== "done_checkup" && p.status !== "cancelled"
            ).length
          : 0,
      estimatedClosingTime: "5:30 PM",
      mostCommonIssue: "Flu",
      doctorAvailability: 3,
      totalCancelled: queueList.filter((p) => p.status === "cancelled").length,
    };

    setStats(updatedStats);
  }, [currentPatient, patients, queueList]);

  return (
    <Card sx={styles.card}>
      <CardContent>
        <Typography variant="h6" color="primary" sx={styles.title}>
          Clinic Statistics
        </Typography>

        {/* Statistics Grid */}
        {loading ? (
          [...Array(5)].map((_, index) => (
            <ListItem key={index}>
              <Skeleton
                variant="rectangular"
                width="100%"
                height={70}
                sx={{
                  borderRadius: 2,
                  mb: 2,
                  bgcolor: loading ? "grey.200" : "transparent",
                }}
              />
            </ListItem>
          ))
        ) : (
          <Box sx={styles.grid}>
            <StatItem
              label="Total Patients Count"
              value={stats.totalPatientsToday}
            />
            <StatItem
              label="Late Patients Count"
              value={stats.patientsMarkedLate}
            />
            <StatItem
              label="Patients Done Till Now"
              value={stats.patientsDoneTillNow}
            />
            <StatItem
              label="Patients Remaining"
              value={stats.patientsWaiting}
            />
            <StatItem label="Total Cancelled" value={stats.totalCancelled} />
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

// Reusable component for each statistic item
function StatItem({ label, value }) {
  return (
    <Box sx={styles.statItem}>
      <Typography variant="body2" color="textSecondary">
        {label}
      </Typography>
      <Typography variant="h6" sx={styles.statValue}>
        {value}
      </Typography>
    </Box>
  );
}

const styles = {
  card: {
    padding: "0 20px",
    boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.12)",
    borderRadius: "12px",
    // background: "linear-gradient(145deg, #ffffff, #f0f0f0)",
    background: "#fff",
    flexGrow: 1,
    margin: "10px",
  },
  title: {
    fontWeight: "bold",
    marginBottom: "16px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "16px",
  },
  statItem: {
    textAlign: "center",
    padding: "12px",
    borderRadius: "8px",
    backgroundColor: "#f9f9f9",
    boxShadow: "0px 2px 6px rgba(0, 0, 0, 0.1)",
  },
  statValue: {
    fontWeight: "bold",
    marginTop: "8px",
    color: "#1976d2",
  },
};
