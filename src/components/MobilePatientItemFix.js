/**
 * This script adds helper functions to restructure the PatientItem in mobile view
 * This fixes the issue with action buttons appearing above content
 */

// Run this function when the page loads to fix mobile patient items
export function fixMobilePatientItems() {
  // Only run in mobile view
  if (window.innerWidth > 768) return;
  
  // Wait for DOM to be ready
  setTimeout(() => {
    const patientItems = document.querySelectorAll('.patient-item');
    
    patientItems.forEach(item => {
      // Only process items that haven't been fixed yet
      if (item.dataset.mobilefixed) return;
      
      // Preserve important data attributes before manipulating the DOM
      const isLate = item.dataset.late === "true";
      const appointmentId = item.dataset.appointmentId;
      
      const content = item.querySelector('.patient-content');
      if (!content) return;
      
      // Get token badge and patient details
      const tokenBadge = content.querySelector('.token-badge');
      const patientDetails = content.querySelector('.patient-details');
      const actionButtons = content.querySelector('.action-buttons');
      const dragHandle = content.querySelector('.drag-handle');
      
      if (!tokenBadge || !patientDetails || !actionButtons) return;
      
      // Create wrapper for token and details
      const wrapper = document.createElement('div');
      wrapper.className = 'token-and-details';
      
      // IMPORTANT: Instead of cloning, move the actual elements
      // This preserves React's ability to update them later
      wrapper.appendChild(tokenBadge);
      wrapper.appendChild(patientDetails);
      
      // IMPORTANT: Remove dragHandle from content before clearing (preserve it with its event listeners)
      if (dragHandle) {
        content.removeChild(dragHandle);
      }
      
      // Clear remaining content
      while (content.firstChild) {
        content.removeChild(content.firstChild);
      }
      
      content.appendChild(wrapper);
      content.appendChild(actionButtons);
      
      // Re-add the original drag handle with its event listeners intact
      if (dragHandle) {
        // Append the original drag handle back to the content
        content.appendChild(dragHandle);
        
        // Style it properly for mobile view
        dragHandle.style.position = 'absolute';
        dragHandle.style.top = '8px';
        dragHandle.style.right = '8px';
        dragHandle.style.zIndex = '20';
        dragHandle.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
        dragHandle.style.borderRadius = '50%';
        dragHandle.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
        
        // Make sure it's visible
        dragHandle.style.opacity = '0.9';
      }
      
      // Double-check that status chips (especially "late") are still present
      if (isLate) {
        // Ensure the late class is still applied
        item.classList.add("late");
        
        // Find status tags container
        const statusTags = patientDetails.querySelector('.status-tags');
        if (statusTags) {
          // Check if late chip is missing
          const lateChip = statusTags.querySelector('.late-chip');
          if (!lateChip) {
            // Manually add late chip if missing
            const lateChipHTML = `
              <span class="late-chip MuiChip-root MuiChip-outlined MuiChip-sizeSmall MuiChip-colorError">
                <span class="MuiChip-icon">
                  <span class="material-icons MuiIcon-root MuiIcon-fontSizeSmall">access_time</span>
                </span>
                <span class="MuiChip-label">Late</span>
              </span>
            `;
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = lateChipHTML;
            statusTags.appendChild(tempDiv.firstChild);
          }
        }
      }
      
      // Mark as fixed
      item.dataset.mobilefixed = 'true';
    });
  }, 500);
}

// Run on resize to catch new items
window.addEventListener('resize', () => {
  if (window.innerWidth <= 768) {
    fixMobilePatientItems();
  }
});

// Export the fix function so it can be imported and used
export default fixMobilePatientItems; 