import React, { useEffect, useState, useRef } from "react";
import { useMediaQuery, ListItem, Typography } from "@mui/material";
import Skeleton from "@mui/material/Skeleton";
import QueueContainer from "../components/QueueContainer";
import { keyframes } from "@emotion/react";
import StatisticsCard from "./StatisticsCard";
import DoctorHeader from "./DoctorHeader";
import { getCabinInfo } from "../utils/dateUtils";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const fadeIn = keyframes(`
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }`);

export default function Home({
  patients,
  currentPosition,
  setPatients,
  loading,
  queueList
}) {
  const user = JSON.parse(localStorage.getItem('user'));
  const doctor = user.checkupcabindata[0].doctor;
  const isMobile = useMediaQuery("(max-width: 768px)");
  const currentPatient = patients.find((p) => parseInt(p.position) === parseInt(currentPosition));

  useEffect(() => {
    console.log('Home component received updated patients data:', patients);
  }, [patients]);

  useEffect(() => {
    console.log('Home component received updated current position:', currentPosition);
  }, [currentPosition]);

  useEffect(() => {
    if (patients.length > 0 && currentPosition !== null) {
      const sorted = [...patients].sort((a, b) => a.position - b.position);
      setPatients(sorted);
    }
  }, [currentPosition]);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 300px",
        gap: "10px",
        height: "100%",
      }}
    >
      {!loading && patients.length === 0 ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
            width: "100%",
          }}
        >
          <Typography variant="h6">Currently no patients</Typography>
        </div>
      ) : (
        <div
          style={{ display: "flex", flexDirection: "column", flexGrow: "3" }}
        >
          {!isMobile && <DoctorHeader doctorName={doctor} />}{" "}
          <QueueContainer
            loading={loading}
            patients={patients}
            currentPosition={currentPosition}
            setPatients={setPatients}
          />
        </div>
      )}
      {!isMobile && (
        <StatisticsCard
          patients={patients}
          currentPatient={currentPatient}
          loading={loading}
          queueList={queueList}
        />
      )}
    </div>
  );
}
