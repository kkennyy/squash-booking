// script.js (Diagnostic Version)

document.addEventListener('DOMContentLoaded', () => {
  const TEMPLATE_URL = './template_3.pdf';
  const CORRECT_PASSWORD_HASH = "1bbd278588a207c4eb532ff9ce3f89cd24b5dcfedc101c804c77bd5dc59ca6d6";
  const PDF_FILENAME_PREFIX = 'NP_CCAB_Booking_';
  const FEEDBACK_DISPLAY_TIME = 5000;

  // Selectors
  const passwordModal = document.getElementById('passwordModal');
  const passwordInput = document.getElementById('passwordInput');
  const passwordSubmit = document.getElementById('passwordSubmit');
  const passwordError = document.getElementById('passwordError');
  const mainContent = document.getElementById('mainContent');
  const previewBtn = document.getElementById('previewBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const downloadSpinner = document.getElementById('downloadSpinner');
  const feedbackMessage = document.getElementById('feedbackMessage');
  const pdfPreview = document.getElementById('pdfPreview');
  const eventDateInput = document.getElementById('eventDate');
  const bookingMessageInput = document.getElementById('bookingMessage');

  const previewSpinner = document.createElement('div');
  previewSpinner.classList.add('spinner');
  previewSpinner.id = 'previewSpinner';
  previewSpinner.style.display = 'none';
  previewBtn.parentElement.appendChild(previewSpinner);

  let currentPdfBytes = null;

  function trapFocus(element) {
    const focusableElements = element.querySelectorAll('button, [href], input, textarea, [tabindex]:not([tabindex="-1"])');
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
        e.preventDefault();
      }
    }

    element.addEventListener('keydown', handleTab);
  }

  async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

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

    if (feedbackMessage.timeoutId) {
      clearTimeout(feedbackMessage.timeoutId);
    }

    feedbackMessage.timeoutId = setTimeout(() => {
      feedbackMessage.style.display = 'none';
    }, FEEDBACK_DISPLAY_TIME);
  }

  function showSpinner(spinner) {
    spinner.style.display = 'inline-block';
  }

  function hideSpinner(spinner) {
    spinner.style.display = 'none';
  }

  function getFormattedSubmissionDate() {
    const today = new Date();
    const day = today.getDate();
    const month = today.toLocaleString('default', { month: 'short' }); 
    const year = today.getFullYear();
    return `${day} ${month} ${year}`; 
  }

  // Diagnostic function to log all fields
  async function logFormFields() {
    try {
      const response = await fetch(TEMPLATE_URL, {
        method: 'GET',
        mode: 'same-origin',
        cache: 'no-cache',
        headers: {
          'Accept': 'application/pdf'
        }
      });

      if (!response.ok) {
        console.error("Error fetching template_3.pdf:", response.status, response.statusText);
        return;
      }

      const templateBytes = await response.arrayBuffer();
      const pdfDoc = await PDFLib.PDFDocument.load(templateBytes);
      const form = pdfDoc.getForm();
      const fields = form.getFields();

      console.log("Found form fields:");
      fields.forEach(field => {
        console.log("Field Name:", field.getName(), "| Type:", field.constructor.name);
      });
    } catch (error) {
      console.error("Error logging form fields:", error);
    }
  }

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

      const eventDateField = form.getTextField('EventDateField');
      const submissionDateField = form.getTextField('SubmissionDateField');
      const annexureField = form.getTextField('AnnexureField');

      if (!eventDateField || !submissionDateField || !annexureField) {
        showFeedback("One or more form fields are missing or not text fields in the template PDF.", "error");
        console.error("Check the PDF form fields.");
        return null;
      }

      const { StandardFonts } = PDFLib;
      let courierFont;
      try {
        courierFont = await pdfDoc.embedFont(StandardFonts.Courier);
      } catch (fontError) {
        showFeedback("Failed to embed the standard Courier font.", "error");
        console.error("Error embedding Courier font:", fontError);
        return null;
      }

      // Try calling setText first to ensure it's a text field
      eventDateField.setText(eventDate);

      // Now, try setFont
      eventDateField.setFont(courierFont);
      eventDateField.setFontSize(12);

      submissionDateField.setText(submissionDate);
      submissionDateField.setFont(courierFont);
      submissionDateField.setFontSize(12);

      annexureField.setText(bookingMessage);
      annexureField.setFont(courierFont);
      annexureField.setFontSize(12);

      form.flatten();

      const pdfBytes = await pdfDoc.save();
      return pdfBytes;

    } catch (error) {
      showFeedback("An unexpected error occurred during PDF generation.", "error");
      console.error("Error in generatePDFBytes:", error);
      return null;
    }
  }

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

  function initializeModal() {
    trapFocus(passwordModal);
    passwordInput.focus();
  }

  initializeModal();

  // Call the logFormFields function to diagnose field types
  logFormFields();
});
