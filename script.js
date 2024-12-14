// script.js

document.addEventListener('DOMContentLoaded', () => {
  // ===========================
  //        CONSTANTS
  // ===========================
  const TEMPLATE_URL = './template_3.pdf'; // Template is in the same directory as index.html
  const CORRECT_PASSWORD_HASH = "1bbd278588a207c4eb532ff9ce3f89cd24b5dcfedc101c804c77bd5dc59ca6d6"; // SHA-256 hash of the correct password
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
  const previewSpinner = document.createElement('div'); // Creating a separate spinner for preview
  previewSpinner.classList.add('spinner');
  previewSpinner.id = 'previewSpinner';
  previewSpinner.style.display = 'none';
  previewBtn.parentElement.appendChild(previewSpinner); // Append spinner next to preview button

  const feedbackMessage = document.getElementById('feedbackMessage');
  const pdfPreview = document.getElementById('pdfPreview');

  // Form Inputs
  const eventDateInput = document.getElementById('eventDate');
  const bookingMessageInput = document.getElementById('bookingMessage');

  // Variable to store the latest generated PDF bytes
  let currentPdfBytes = null;

  // ===========================
  //        FUNCTIONS
  // ===========================

  /**
   * Trap focus within a specified element (modal)
   * @param {HTMLElement} element - The modal element to trap focus within
   */
  function trapFocus(element) {
    const focusableSelectors = 'button, [href], input, textarea, [tabindex]:not([tabindex="-1"])';
    const focusableElements = element.querySelectorAll(focusableSelectors);
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
        // Prevent closing the modal with Escape to ensure security
        e.preventDefault();
      }
    }

    element.addEventListener('keydown', handleTab);
  }

  /**
   * Hash a given password using SHA-256
   * @param {string} password - The plain text password to hash
   * @returns {Promise<string>} - The hexadecimal representation of the hash
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
   * Display feedback messages to the user
   * @param {string} message - The message to display
   * @param {string} type - The type of message: 'success', 'error', 'info'
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

    // Clear any existing timeout to avoid hiding the message prematurely
    if (feedbackMessage.timeoutId) {
      clearTimeout(feedbackMessage.timeoutId);
    }

    // Hide the feedback message after a specified time
    feedbackMessage.timeoutId = setTimeout(() => {
      feedbackMessage.style.display = 'none';
    }, FEEDBACK_DISPLAY_TIME);
  }

  /**
   * Show a loading spinner
   * @param {HTMLElement} spinner - The spinner element to display
   */
  function showSpinner(spinner) {
    spinner.style.display = 'inline-block';
  }

  /**
   * Hide a loading spinner
   * @param {HTMLElement} spinner - The spinner element to hide
   */
  function hideSpinner(spinner) {
    spinner.style.display = 'none';
  }

  /**
   * Format the current date as "dd MMM yyyy"
   * @returns {string} - The formatted date string
   */
  function getFormattedSubmissionDate() {
    const today = new Date();
    const day = today.getDate(); // No padding for single-digit days
    const month = today.toLocaleString('default', { month: 'short' }); // e.g., "Dec"
    const year = today.getFullYear();
    return `${day} ${month} ${year}`; 
  }

  /**
   * Generate PDF bytes by populating the template with user inputs
   * @returns {Promise<Uint8Array|null>} - The generated PDF bytes or null if an error occurred
   */
  async function generatePDFBytes() {
    try {
      // Retrieve and trim input values
      const eventDate = eventDateInput.value.trim();
      const bookingMessage = bookingMessageInput.value.trim();
      const submissionDate = getFormattedSubmissionDate();

      // Validate inputs
      if (!eventDate || !bookingMessage) {
        showFeedback("Please fill in both Event Date and Booking Request Message.", "error");
        return null;
      }

      // Fetch the template PDF
      const response = await fetch(TEMPLATE_URL, {
        method: 'GET',
        mode: 'same-origin', // Ensures same-origin policy; adjust if necessary
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

      // Load the PDF document
      const pdfDoc = await PDFLib.PDFDocument.load(templateBytes);
      const form = pdfDoc.getForm();

      // Retrieve form fields
      const eventDateField = form.getTextField('EventDateField');
      const submissionDateField = form.getTextField('SubmissionDateField');
      const annexureField = form.getTextField('AnnexureField');

      // Verify form fields exist
      if (!eventDateField || !submissionDateField || !annexureField) {
        showFeedback("One or more form fields are missing in the template PDF.", "error");
        console.error("Form fields not found. Please verify field names in 'template_3.pdf'.");
        return null;
      }

      // Embed the standard Courier font
      const { StandardFonts } = PDFLib;
      let courierFont;
      try {
        courierFont = await pdfDoc.embedFont(StandardFonts.Courier);
      } catch (fontError) {
        showFeedback("Failed to embed the standard Courier font.", "error");
        console.error("Error embedding Courier font:", fontError);
        return null;
      }

      // Populate form fields with user inputs
      eventDateField.setText(eventDate);
      eventDateField.setFont(courierFont);
      eventDateField.setFontSize(12);

      submissionDateField.setText(submissionDate);
      submissionDateField.setFont(courierFont);
      submissionDateField.setFontSize(12);

      annexureField.setText(bookingMessage);
      annexureField.setFont(courierFont);
      annexureField.setFontSize(12);

      // Flatten the form to make fields non-editable
      form.flatten();

      // Save and return the PDF bytes
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

  /**
   * Handle password submission
   */
  passwordSubmit.addEventListener('click', async function() {
    const enteredPassword = passwordInput.value;
    if (!enteredPassword) {
      passwordError.textContent = "Please enter a password.";
      passwordError.style.display = 'block';
      passwordInput.setAttribute('aria-invalid', 'true');
      passwordInput.focus();
      return;
    }

    // Hash the entered password
    const enteredHash = await hashPassword(enteredPassword);

    // Compare hashes
    if (enteredHash === CORRECT_PASSWORD_HASH) {
      // Correct password
      passwordModal.style.display = 'none';
      mainContent.style.display = 'flex';
      mainContent.querySelector('input, textarea, button').focus(); // Focus the first interactive element
    } else {
      // Incorrect password
      passwordError.textContent = "Incorrect Password. Try again.";
      passwordError.style.display = 'block';
      passwordInput.setAttribute('aria-invalid', 'true');
      passwordInput.value = ''; // Clear the input
      passwordInput.focus();
    }
  });

  /**
   * Allow pressing Enter to submit the password
   */
  passwordInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      passwordSubmit.click();
    }
  });

  /**
   * Handle Preview button click
   */
  previewBtn.addEventListener('click', async () => {
    // Provide feedback and disable the Preview button
    showFeedback("Generating PDF preview...", "info");
    previewBtn.disabled = true;
    showSpinner(previewSpinner);

    // Generate the PDF
    const pdfBytes = await generatePDFBytes();

    // Re-enable the Preview button and hide the spinner
    previewBtn.disabled = false;
    hideSpinner(previewSpinner);

    if (!pdfBytes) return; // Stop if PDF generation failed

    // Store the generated PDF bytes
    currentPdfBytes = pdfBytes;

    // Display the PDF in the iframe
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    pdfPreview.src = url;

    // Show the Download button
    downloadBtn.style.display = 'inline-block';

    // Provide success feedback
    showFeedback("PDF preview generated successfully.", "success");
  });

  /**
   * Handle Download button click
   */
  downloadBtn.addEventListener('click', async () => {
    if (!currentPdfBytes) {
      showFeedback("No PDF available to download. Please generate a preview first.", "error");
      return;
    }

    // Provide feedback and disable the Download button
    showFeedback("Generating PDF for download...", "info");
    downloadBtn.disabled = true;
    showSpinner(downloadSpinner);

    // Regenerate the PDF to ensure it has the latest inputs
    const pdfBytes = await generatePDFBytes();

    // Re-enable the Download button and hide the spinner
    downloadBtn.disabled = false;
    hideSpinner(downloadSpinner);

    if (!pdfBytes) return; // Stop if PDF generation failed

    // Generate the filename using the event date
    const eventDate = eventDateInput.value.trim();
    const formattedEventDate = eventDate.replace(/\s+/g, ''); // Remove all spaces
    const filename = `${PDF_FILENAME_PREFIX}${formattedEventDate}.pdf`;

    // Create a Blob from the PDF bytes and trigger the download
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url); // Clean up the URL object

    // Provide success feedback
    showFeedback("PDF downloaded successfully.", "success");
  });

  // ===========================
  //         INITIALIZATION
  // ===========================

  /**
   * Initialize focus trapping and set initial focus
   */
  function initializeModal() {
    // Trap focus within the password modal
    trapFocus(passwordModal);

    // Set initial focus to the password input
    passwordInput.focus();
  }

  // Initialize the modal on page load
  initializeModal();
});
