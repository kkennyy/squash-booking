// script.js

// Define your password hash (SHA-256)
const correctPasswordHash = "1bbd278588a207c4eb532ff9ce3f89cd24b5dcfedc101c804c77bd5dc59ca6d6"; // Provided hash

// Password Modal Elements
const passwordModal = document.getElementById('passwordModal');
const passwordInput = document.getElementById('passwordInput');
const passwordSubmit = document.getElementById('passwordSubmit');
const passwordError = document.getElementById('passwordError');

// Main Content Elements
const mainContent = document.getElementById('mainContent');
const previewBtn = document.getElementById('previewBtn');
const downloadBtn = document.getElementById('downloadBtn');
const downloadSpinner = document.getElementById('downloadSpinner');
const feedbackMessage = document.getElementById('feedbackMessage');
const pdfPreview = document.getElementById('pdfPreview');

// Get Form Inputs
const eventDateInput = document.getElementById('eventDate');
const bookingMessageInput = document.getElementById('bookingMessage');

let currentPdfBytes = null; // Will store the most recently generated PDF bytes

// Accessibility: Trap focus within the modal
function trapFocus(element) {
  const focusableElements = element.querySelectorAll('button, [href], input, textarea, [tabindex]:not([tabindex="-1"])');
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];

  function handleTab(e) {
    if (e.key === 'Tab') {
      if (e.shiftKey) { // Shift + Tab
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        }
      } else { // Tab
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    } else if (e.key === 'Escape') {
      // Optional: Prevent closing modal with Escape
      // To enable, uncomment the following lines
      // passwordModal.style.display = 'none';
      // mainContent.style.display = 'flex';
      // mainContent.querySelector('input, textarea, button').focus();
    }
  }

  element.addEventListener('keydown', handleTab);
}

// Initialize focus trapping on modal
trapFocus(passwordModal);

// Set initial focus to the password input when modal opens
passwordInput.focus();

// Function to hash the password using SHA-256
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// Password Submission Handler
passwordSubmit.addEventListener('click', async function() {
  const enteredPassword = passwordInput.value;
  if (!enteredPassword) {
    passwordError.textContent = "Please enter a password.";
    passwordError.style.display = 'block';
    passwordInput.setAttribute('aria-invalid', 'true');
    passwordInput.focus();
    return;
  }
  const enteredHash = await hashPassword(enteredPassword);
  if (enteredHash === correctPasswordHash) {
    passwordModal.style.display = 'none';
    mainContent.style.display = 'flex';
    mainContent.querySelector('input, textarea, button').focus(); // Set focus to first interactive element
  } else {
    passwordError.textContent = "Incorrect Password. Try again.";
    passwordError.style.display = 'block';
    passwordInput.setAttribute('aria-invalid', 'true');
    passwordInput.focus();
  }
});

// Allow pressing Enter to submit password
passwordInput.addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    passwordSubmit.click();
  }
});

// Function to show feedback messages
function showFeedback(message, type) {
  feedbackMessage.textContent = message;
  feedbackMessage.className = 'feedback-message';
  if (type === 'success') {
    feedbackMessage.classList.add('feedback-success');
  } else if (type === 'error') {
    feedbackMessage.classList.add('feedback-error');
  }
  feedbackMessage.style.display = 'block';
  setTimeout(() => {
    feedbackMessage.style.display = 'none';
  }, 5000); // Hide after 5 seconds
}

// Function to show loading spinner
function showSpinner(spinner) {
  spinner.style.display = 'inline-block';
}

// Function to hide loading spinner
function hideSpinner(spinner) {
  spinner.style.display = 'none';
}

// Utility to format the submission date as "dd MMM yyyy"
function getFormattedSubmissionDate() {
  const today = new Date();
  const day = today.getDate(); // No padding for single-digit days
  const month = today.toLocaleString('default', { month: 'short' }); // e.g., "Dec"
  const year = today.getFullYear();
  return `${day} ${month} ${year}`; 
}

// Function to generate PDF bytes
async function generatePDFBytes() {
  try {
    // Get the input values
    const eventDate = eventDateInput.value.trim();
    const bookingMessage = bookingMessageInput.value.trim();
    const submissionDate = getFormattedSubmissionDate();

    if (!eventDate || !bookingMessage) {
      showFeedback("Please fill in both Event Date and Booking Request Message.", "error");
      return null;
    }

    // Fetch the template PDF
    const response = await fetch('template.pdf');
    if (!response.ok) {
      showFeedback("Failed to fetch the template PDF. Please ensure 'template.pdf' is correctly hosted.", "error");
      console.error("Error fetching template.pdf:", response.statusText);
      return null;
    }
    const templateBytes = await response.arrayBuffer();

    const { PDFDocument } = PDFLib;
    const pdfDoc = await PDFDocument.load(templateBytes);
    const form = pdfDoc.getForm();

    // Attempt to get form fields
    const eventDateField = form.getTextField('EventDateField');
    const submissionDateField = form.getTextField('SubmissionDateField');
    const annexureField = form.getTextField('AnnexureField');

    // Verify that fields exist
    if (!eventDateField || !submissionDateField || !annexureField) {
      showFeedback("One or more form fields are missing in the template PDF.", "error");
      console.error("Form fields not found. Please verify field names in 'template.pdf'.");
      return null;
    }

    // Fill the fields
    eventDateField.setText(eventDate);
    submissionDateField.setText(submissionDate);
    annexureField.setText(bookingMessage);

    // Flatten the form to make the fields non-editable
    form.flatten();

    // Save PDF bytes
    const pdfBytes = await pdfDoc.save();
    return pdfBytes;

  } catch (error) {
    showFeedback("An unexpected error occurred during PDF generation.", "error");
    console.error("Error in generatePDFBytes:", error);
    return null;
  }
}

// Preview Button Click Handler
previewBtn.addEventListener('click', async () => {
  // Hide previous feedback messages
  showFeedback("Generating PDF preview...", "success");

  const pdfBytes = await generatePDFBytes();
  if (!pdfBytes) return;
  currentPdfBytes = pdfBytes;

  // Show the PDF in the iframe
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  pdfPreview.src = url;

  // Show the download button now that we have a valid preview
  downloadBtn.style.display = 'inline-block';
});

// Download Button Click Handler
downloadBtn.addEventListener('click', () => {
  if (!currentPdfBytes) {
    showFeedback("No PDF available to download. Please generate a preview first.", "error");
    return;
  }

  // Use the event date to build the filename
  const eventDate = eventDateInput.value.trim();
  const formattedEventDate = eventDate.replace(/\s+/g, ''); // Remove all spaces
  const filename = `NP_CCAB_Booking_${formattedEventDate}.pdf`;

  const blob = new Blob([currentPdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);

  showFeedback("PDF downloaded successfully.", "success");
});
