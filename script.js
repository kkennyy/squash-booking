// script.js

document.addEventListener('DOMContentLoaded', () => {
  // ===========================
  //        CONSTANTS
  // ===========================
  const TEMPLATE_URL = './template_3.pdf'; // Template in same directory as index.html
  const CORRECT_PASSWORD_HASH = "1bbd278588a207c4eb532ff9ce3f89cd24b5dcfedc101c804c77bd5dc59ca6d6"; // SHA-256 hash of correct password
  const PDF_FILENAME_PREFIX = 'NP_CCAB_Booking_';
  const FEEDBACK_DISPLAY_TIME = 5000; // 5 seconds

  // ===========================
  //      ELEMENT SELECTORS
  // ===========================
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

  // Create a separate spinner for preview
  const previewSpinner = document.createElement('div');
  previewSpinner.classList.add('spinner');
  previewSpinner.id = 'previewSpinner';
  previewSpinner.style.display = 'none';
  previewBtn.parentElement.appendChild(previewSpinner);

  const feedbackMessage = document.getElementById('feedbackMessage');
  const pdfPreview = document.getElementById('pdfPreview');

  // Form Inputs
  const eventDateInput = document.getElementById('eventDate');
  const bookingMessageInput = document.getElementById('bookingMessage');

  let currentPdfBytes = null;

  // ===========================
  //        FUNCTIONS
  // ===========================

  /**
   * Trap focus within the modal for accessibility
   */
  function trapFocus(element) {
    const focusableSelectors = 'button, [href], input, textarea, [tabindex]:not([tabindex="-1"])';
    const focusableElements = element.querySelectorAll(focusableSelectors);
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    function handleTab(e) {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstFocusable) {
            e.preventDefault();
            lastFocusable.focus();
          }
        } else {
          if (document.activeElement === lastFocusable) {
            e.preventDefault();
            firstFocusable.focus();
          }
        }
      } else if (e.key === 'Escape') {
        // Prevent closing with Escape for security
        e.preventDefault();
      }
    }

    element.addEventListener('keydown', handleTab);
  }

  /**
   * Hash a given password using SHA-256
   */
  async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }

  /**
   * Display feedback messages
   */
  function showFeedback(message, type) {
    feedbackMessage.textContent = message;
    feedbackMessage.className = 'feedback-message';

    switch(type) {
      case 'success':
        feedbackMessage.classList.add('feedback-success');
        break;
      case 'error':
        feedbackMessage.classList.add('feedback-error');
        break;
      case 'info':
        feedbackMessage.classList.add('feedback-info');
        break;
      default:
        break;
    }

    feedbackMessage.style.display = 'block';

    // Clear any existing timeout
    if (feedbackMessage.timeoutId) {
      clearTimeout(feedbackMessage.timeoutId);
    }

    // Hide after FEEDBACK_DISPLAY_TIME
    feedbackMessage.timeoutId = setTimeout(() => {
      feedbackMessage.style.display = 'none';
    }, FEEDBACK_DISPLAY_TIME);
  }

  /**
   * Show a loading spinner
   */
  function showSpinner(spinner) {
    spinner.style.display = 'inline-block';
  }

  /**
   * Hide a loading spinner
   */
  function hideSpinner(spinner) {
    spinner.style.display = 'none';
  }

  /**
   * Format the current date as "dd MMM yyyy"
   */
  function getFormattedSubmissionDate() {
    const today = new Date();
    const day = today.getDate();
    const month = today.toLocaleString('default', { month: 'short' }); 
    const year = today.getFullYear();
    return `${day} ${month} ${year}`; 
  }

  /**
   * Generate PDF bytes by populating the template with user inputs
   */
  async function generatePDFBytes() {
    try {
      const eventDate = eventDateInput.value.trim();
      const bookingMessage = bookingMessageInput.value.trim();
      const submissionDate = getFormattedSubmissionDate();

      if (!eventDate || !bookingMessage) {
        showFeedback("Please fill in both Event Date and Booking Request Message.", "error");
        return null;
      }

      const response = await fetch(TEMPLATE_URL, {
        method: 'GET',
        mode: 'same-origin',
        cache: 'no-cache',
        headers: {
          'Accept': 'application/pdf'
        }
      });

      if (!response.ok) {
        showFeedback("Failed to fetch the template PDF. Please ensure 'template_3.pdf' is correctly hosted and accessible.", "error");
        console.error("Error fetching template_3.pdf:", response.status, response.statusText);
        return null;
      }

      const templateBytes = await response.arrayBuffer();
      const pdfDoc = await PDFLib.PDFDocument.load(templateBytes);
      const form = pdfDoc.getForm();

      // Get fields by their exact names
      const eventDateField = form.getTextField('EventDateField');
      const submissionDateField = form.getTextField('SubmissionDateField');
      const annexureField = form.getTextField('AnnexureField');

      if (!eventDateField || !submissionDateField || !annexureField) {
        showFeedback("One or more form fields are missing or not text fields in the template PDF.", "error");
        console.error("Ensure 'EventDateField', 'SubmissionDateField', and 'AnnexureField' are text fields.");
        return null;
      }

      // Just set text without changing font
      eventDateField.setText(eventDate);
      submissionDateField.setText(submissionDate);
      annexureField.setText(bookingMessage);

      // Flatten form
      form.flatten();

      const pdfBytes = await pdfDoc.save();
      return pdfBytes;

    } catch (error) {
      showFeedback("An unexpected error occurred during PDF generation.", "error");
      console.error("Error in generatePDFBytes:", error);
      return null;
    }
  }

  // ===========================
  //        EVENT LISTENERS
  // ===========================

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

    if (enteredHash === CORRECT_PASSWORD_HASH) {
      passwordModal.style.display = 'none';
      mainContent.style.display = 'flex';
      mainContent.querySelector('input, textarea, button').focus();
    } else {
      passwordError.textContent = "Incorrect Password. Try again.";
      passwordError.style.display = 'block';
      passwordInput.setAttribute('aria-invalid', 'true');
      passwordInput.value = '';
      passwordInput.focus();
    }
  });

  passwordInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      passwordSubmit.click();
    }
  });

  previewBtn.addEventListener('click', async () => {
    showFeedback("Generating PDF preview...", "info");
    previewBtn.disabled = true;
    showSpinner(previewSpinner);

    const pdfBytes = await generatePDFBytes();

    previewBtn.disabled = false;
    hideSpinner(previewSpinner);

    if (!pdfBytes) return;

    currentPdfBytes = pdfBytes;

    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    pdfPreview.src = url;

    downloadBtn.style.display = 'inline-block';

    showFeedback("PDF preview generated successfully.", "success");
  });

  downloadBtn.addEventListener('click', async () => {
    if (!currentPdfBytes) {
      showFeedback("No PDF available to download. Please generate a preview first.", "error");
      return;
    }

    showFeedback("Generating PDF for download...", "info");
    downloadBtn.disabled = true;
    showSpinner(downloadSpinner);

    const pdfBytes = await generatePDFBytes();

    downloadBtn.disabled = false;
    hideSpinner(downloadSpinner);

    if (!pdfBytes) return;

    const eventDate = eventDateInput.value.trim();
    const formattedEventDate = eventDate.replace(/\s+/g, '');
    const filename = `${PDF_FILENAME_PREFIX}${formattedEventDate}.pdf`;

    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    showFeedback("PDF downloaded successfully.", "success");
  });

  // Initialize modal focus trapping
  function initializeModal() {
    trapFocus(passwordModal);
    passwordInput.focus();
  }

  initializeModal();
});
