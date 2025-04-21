import { getPaymentReceipt } from '../services/api';
import qrCodeImage from '../assets/qr_code.png';

/**
 * Formats a date string to 12-hour time format
 * @param {string} timeString - Time string in 24-hour format (HH:MM:SS)
 * @returns {string} Time in 12-hour format with AM/PM
 */
export const formatTimeTo12Hour = (timeString) => {
  if (!timeString) return '';
  
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours, 10);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  
  return `${hour12}:${minutes} ${period}`;
};

/**
 * Formats a date string in the format YYYY-MM-DD
 * @param {string} dateString - Date string
 * @returns {string} Formatted date (DD/MM/YYYY)
 */
export const formatDate = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

/**
 * Gets base URL for the application
 * @returns {string} The base URL
 */
const getBaseUrl = () => {
  const { protocol, host, pathname } = window.location;
  const basePath = pathname.split('/').slice(0, -1).join('/');
  return `${protocol}//${host}${basePath}`;
};

/**
 * Generates and prints a payment receipt for an appointment
 * @param {string} appointmentId - The appointment ID
 */
export const generateAndPrintReceipt = async (appointmentId) => {
  try {
    // Fetch payment receipt data from API
    const receiptData = await getPaymentReceipt(appointmentId);
    
    if (!receiptData) {
      console.error('No receipt data received from API');
      return;
    }
    
    const appointmentDate = formatDate(receiptData.slot);
    const startTime = formatTimeTo12Hour(receiptData.slot_start_time);
    const endTime = formatTimeTo12Hour(receiptData.slot_end_time);
    
    // Get base URL for assets
    const baseUrl = getBaseUrl();
    
    // Generate the receipt HTML content
    const receiptContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Receipt</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          /* Page setup for printing - hide browser headers/footers */
          @page {
            size: auto;
            margin: 5mm 0mm 0mm 0mm;
          }
          
          body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 10px;
            color: #333;
            background-color: #fff;
            position: relative;
          }
          .receipt {
            max-width: 700px;
            margin: 0 auto;
            padding: 15px;
            border: 1px solid #ddd;
            box-shadow: 0 0 5px rgba(0,0,0,0.1);
            position: relative;
          }
          .header {
            text-align: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #2196f3;
          }
          .hospital-name {
            font-size: 24px;
            font-weight: bold;
            color: #2196f3;
            margin-bottom: 3px;
          }
          .hospital-details {
            font-size: 12px;
            color: #555;
            margin-bottom: 3px;
          }
          .receipt-title {
            font-size: 18px;
            font-weight: bold;
            text-align: center;
            margin: 15px 0;
            text-transform: uppercase;
            color: #333;
          }
          .receipt-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
          }
          .receipt-info-section {
            flex: 1;
          }
          .info-row {
            margin-bottom: 8px;
            display: flex;
          }
          .info-label {
            font-weight: bold;
            width: 120px;
            color: #555;
            font-size: 13px;
          }
          .info-value {
            flex: 1;
            font-size: 13px;
          }
          .services-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
          }
          .services-table th, .services-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
            font-size: 13px;
          }
          .services-table th {
            background-color: #f5f5f5;
            font-weight: bold;
            color: #333;
          }
          .services-table tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          .amount-section {
            text-align: right;
            margin-top: 15px;
          }
          .amount-row {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 5px;
          }
          .amount-label {
            font-weight: bold;
            width: 120px;
            margin-right: 15px;
            font-size: 13px;
          }
          .total-amount {
            font-size: 16px;
            font-weight: bold;
            color: #2196f3;
          }
          .footer {
            margin-top: 25px;
            display: flex;
            justify-content: space-between;
          }
          .signature {
            margin-top: 25px;
            border-top: 1px solid #ddd;
            padding-top: 5px;
            width: 150px;
            text-align: center;
            font-size: 12px;
          }
          .paid-stamp {
            position: relative;
            text-align: center;
            margin: 20px auto;
          }
          .paid-stamp span {
            display: inline-block;
            border: 3px solid #4CAF50;
            color: #4CAF50;
            padding: 8px 20px;
            font-size: 22px;
            font-weight: bold;
            transform: rotate(-15deg);
            border-radius: 8px;
          }
          .footer-note {
            text-align: center;
            margin-top: 15px;
            font-size: 10px;
            color: #777;
          }
          .qr-section {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            margin: 15px auto;
            padding-top: 10px;
            border-top: 1px dashed #ddd;
            max-width: 100%;
          }
          .qr-text {
            font-size: 12px;
            color: #555;
            text-align: center;
            margin-bottom: 8px;
          }
          .qr-image {
            width: 100px;
            height: 100px;
          }
          .powered-by {
            position: absolute;
            bottom: 5px;
            right: 15px;
            font-size: 9px;
            color: #999;
            display: flex;
            align-items: center;
          }
          .powered-by img {
            height: 16px;
            margin-left: 3px;
          }
          @media print {
            body {
              margin: 8px 0 0 0;
              padding: 0;
            }
            .receipt {
              border: none;
              box-shadow: none;
              padding: 10px;
              max-height: 60vh;
              zoom: 0.9;
            }
            button {
              display: none;
            }
            .powered-by {
              bottom: 5px;
              right: 5px;
            }
            .qr-image {
              width: 80px;
              height: 80px;
            }
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <div class="hospital-name">${receiptData.hospital_name}</div>
            ${receiptData.hospital_address ? `<div class="hospital-details">${receiptData.hospital_address}</div>` : ''}
            <div class="hospital-details">Phone: ${receiptData.hospital_phone_number} | Email: ${receiptData.hospital_email}</div>
          </div>
          
          <div class="receipt-title">Payment Receipt</div>
          
          <div class="receipt-info">
            <div class="receipt-info-section">
              <div class="info-row">
                <div class="info-label">Patient Name:</div>
                <div class="info-value">${receiptData.name}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Phone Number:</div>
                <div class="info-value">${receiptData.patient_phone_number || 'N/A'}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Doctor:</div>
                <div class="info-value">${receiptData.doctor_name}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Payment Method:</div>
                <div class="info-value">${receiptData.mode ? receiptData.mode.charAt(0).toUpperCase() + receiptData.mode.slice(1) : 'Cash'}</div>
              </div>
            </div>
            <div class="receipt-info-section">
              <div class="info-row">
                <div class="info-label">Appointment Date:</div>
                <div class="info-value">${appointmentDate}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Slot:</div>
                <div class="info-value">${startTime} - ${endTime}</div>
              </div>
            </div>
          </div>
          
          <table class="services-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Consultation</td>
                <td>₹${receiptData.fees_paid}</td>
              </tr>
            </tbody>
          </table>
          
          <div class="amount-section">
            <div class="amount-row">
              <div class="amount-label">Total Amount:</div>
              <div class="total-amount">₹${receiptData.fees_paid}</div>
            </div>
          </div>
          
          <div class="paid-stamp">
            <span>PAID</span>
          </div>
          
          <div class="footer">
            <div class="signature">
              Received By
            </div>
            <div class="signature">
              Authorized Signature
            </div>
          </div>
          
          <div class="qr-section">
            <div class="qr-text">Book online appointments and track your waiting with <span style="font-weight: bold;">DigiCare</span>, scan the QR below</div>
            <img class="qr-image" src="${qrCodeImage}" alt="DigiCare QR Code" />
          </div>
          
          <div class="powered-by">
            Powered by <span style="font-weight: bold; color: #2196f3;">DigiCare</span>
          </div>
        </div>
        <script>
          // Auto-trigger print when the page loads
          window.onload = function() {
            // Small delay to ensure proper rendering before printing
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;
    
    // Open the receipt in a new window
    const printWindow = window.open('', '_blank');
    printWindow.document.open();
    printWindow.document.write(receiptContent);
    printWindow.document.close();
    
  } catch (error) {
    console.error('Error generating payment receipt:', error);
  }
}; 