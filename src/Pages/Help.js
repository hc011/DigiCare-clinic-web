import React from "react";
import {
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  Divider,
  Card,
  CardContent,
  CardHeader,
  Button,
  Link,
  Grid,
  Paper
} from "@mui/material";
import { 
  HelpOutline, 
  DescriptionOutlined, 
  EventNote, 
  PeopleOutline,
  SettingsOutlined,
  SupportOutlined,
  BookOutlined,
  KeyboardOutlined
} from "@mui/icons-material";
import { Layout } from "../components/Layout";

const Help = () => {
  return (
    <Layout>
      <Box sx={{ maxWidth: "100%", margin: "auto" }}>
        <Typography variant="h4" gutterBottom>
          Help Center
        </Typography>
        <Typography variant="body1" paragraph>
          Welcome to the DigiCare Reception Dashboard help center. Here you can find guides, answers to frequently asked questions, and best practices.
        </Typography>

        <Box sx={{ my: 4 }}>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<BookOutlined />}
            component={Link}
            href="/docs/user-guide.md"
            target="_blank"
            sx={{ mr: 2, mb: 2 }}
          >
            Full User Guide
          </Button>
          <Button 
            variant="outlined" 
            color="primary"
            startIcon={<SupportOutlined />}
            component={Link}
            href="mailto:support@digicare.com"
            sx={{ mb: 2 }}
          >
            Contact Support
          </Button>
        </Box>

        <Grid container spacing={3}>
          {/* Quick Start Guide */}
          <Grid item xs={12} md={6}>
            <Card elevation={2}>
              <CardHeader 
                title="Getting Started" 
                avatar={<HelpOutline color="primary" />}
              />
              <CardContent>
                <List>
                  <ListItem>
                    <ListItemText
                      primary="1. Logging In"
                      secondary="Enter your username and password on the login page and click 'Submit'. If you have been logged out automatically, you'll see a message explaining why."
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="2. Navigation"
                      secondary="Use the sidebar (desktop) or bottom navigation (mobile) to access different sections of the application."
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="3. Dashboard"
                      secondary="The dashboard provides an overview of all current patients, appointments, and queue status."
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Core Features */}
          <Grid item xs={12} md={6}>
            <Card elevation={2}>
              <CardHeader 
                title="Core Features" 
                avatar={<DescriptionOutlined color="primary" />}
              />
              <CardContent>
                <List>
                  <ListItem>
                    <ListItemText
                      primary="Queue Management"
                      secondary="View, reorder, and manage the patient queue. Mark patients as seen, late, or reschedule them as needed."
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Appointment Management"
                      secondary="Create, view, and update patient appointments. Filter appointments by date, doctor, or status."
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Patient Information"
                      secondary="Access comprehensive patient details, including medical history and upcoming appointments."
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Common Tasks */}
          <Grid item xs={12} md={6}>
            <Card elevation={2}>
              <CardHeader 
                title="Common Tasks" 
                avatar={<EventNote color="primary" />}
              />
              <CardContent>
                <List>
                  <ListItem>
                    <ListItemText
                      primary="Adding an Appointment"
                      secondary="Click 'Add Appointment' in the navigation, fill in the required patient information, and submit the form."
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Managing the Queue"
                      secondary="Use the queue manager to view the list of patients, drag and drop to reorder, and mark patients as done or late."
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Viewing Reports"
                      secondary="Access patient reports through the patient information page. Click on a report to view it in the PDF viewer."
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Best Practices */}
          <Grid item xs={12} md={6}>
            <Card elevation={2}>
              <CardHeader 
                title="Best Practices" 
                avatar={<SettingsOutlined color="primary" />}
              />
              <CardContent>
                <List>
                  <ListItem>
                    <ListItemText
                      primary="1. Keep Patient Information Up-to-Date"
                      secondary="Ensure all patient information is accurate and complete for optimal care."
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="2. Regular Queue Management"
                      secondary="Review the queue regularly to ensure efficient patient flow and timely service."
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="3. Secure Your Account"
                      secondary="Use strong passwords and always log out when not using the system."
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Keyboard Shortcuts */}
          {/* <Grid item xs={12}>
            <Card elevation={2}>
              <CardHeader 
                title="Keyboard Shortcuts" 
                avatar={<KeyboardOutlined color="primary" />}
              />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
                      <Typography variant="subtitle2">N</Typography>
                      <Typography variant="body2">Move to next patient</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
                      <Typography variant="subtitle2">F</Typography>
                      <Typography variant="body2">Search for a patient</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
                      <Typography variant="subtitle2">A</Typography>
                      <Typography variant="body2">Open appointment form</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
                      <Typography variant="subtitle2">Esc</Typography>
                      <Typography variant="body2">Close modal/dialog</Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid> */}
        </Grid>

        <Box sx={{ mt: 4, p: 3, bgcolor: 'background.paper', borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>
            Need More Help?
          </Typography>
          <Typography variant="body1" paragraph>
            For additional assistance, please contact our support team at{" "}
            <Link href="mailto:digicare.india2024@gmail.com">digicare.india2024@gmail.com</Link>
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            When reporting an issue, please include:
          </Typography>
          <ul>
            <li>Your username</li>
            <li>A detailed description of the problem</li>
            <li>Steps to reproduce the issue</li>
            <li>Any error messages you received</li>
          </ul>
        </Box>
      </Box>
    </Layout>
  );
};

export default Help;
