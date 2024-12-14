// script.js

document.addEventListener('DOMContentLoaded', () => {
  // Password Handling
  const passwordModal = document.getElementById('passwordModal');
  const passwordSubmitBtn = document.getElementById('passwordSubmit');
  const passwordInput = document.getElementById('passwordInput');
  const passwordError = document.getElementById('passwordError');
  const mainContent = document.getElementById('mainContent');

  const VALID_PASSWORD = 'newpioneersquashclub'; // Replace with your actual password

  passwordSubmitBtn.addEventListener('click', () => {
    const enteredPassword = passwordInput.value.trim();

    if (enteredPassword === VALID_PASSWORD) {
      // Correct password
      passwordModal.style.display = 'none';
      mainContent.style.display = 'flex';
    } else {
      // Incorrect password
      passwordError.style.display = 'block';
      passwordInput.value = '';
      passwordInput.focus();
    }
  });

  // Optional: Allow pressing Enter to submit the password
  passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      passwordSubmitBtn.click();
    }
  });

  // PDF Generation and Other Functionalities
  const eventDateInput = document.getElementById('eventDate');
  const bookingMessageInput = document.getElementById('bookingMessage');
  const previewBtn = document.getElementById('previewBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const downloadSpinner = document.getElementById('downloadSpinner');
  const feedbackMessage = document.getElementById('feedbackMessage');
  const pdfPreview = document.getElementById('pdfPreview');

  previewBtn.addEventListener('click', async () => {
    feedbackMessage.style.display = 'none';
    const pdfBytes = await generatePDFBytes();

    if (pdfBytes) {
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      pdfPreview.src = url;
      downloadBtn.style.display = 'inline-block';
    }
  });

  downloadBtn.addEventListener('click', async () => {
    downloadBtn.style.display = 'none';
    downloadSpinner.style.display = 'inline-block';

    const pdfBytes = await generatePDFBytes();

    if (pdfBytes) {
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${eventDateInput.value.trim()}_BookingForm.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showFeedback("PDF downloaded successfully!", "success");
    }

    downloadSpinner.style.display = 'none';
  });

  // Utility Functions
  function showFeedback(message, type) {
    feedbackMessage.textContent = message;
    feedbackMessage.className = `feedback-message feedback-${type}`;
    feedbackMessage.style.display = 'block';
  }

  function getFormattedSubmissionDate() {
    const now = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return now.toLocaleDateString(undefined, options);
  }

  // The generatePDFBytes function as provided
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

      // Fetch the template PDF with updated settings
      const response = await fetch('/squash-booking/template_3.pdf', {
        method: 'GET',
        mode: 'same-origin',
        cache: 'no-cache',
        headers: {
          'Accept': 'application/pdf',
          'Sec-Fetch-Mode': 'no-cors'
        }
      });

      if (!response.ok) {
        showFeedback("Failed to fetch the template PDF. Please ensure 'template_3.pdf' is correctly hosted.", "error");
        console.error("Error fetching template_3.pdf:", response.statusText);
        return null;
      }
      
      const templateBytes = await response.arrayBuffer();

      const { PDFDocument, StandardFonts } = PDFLib;
      const pdfDoc = await PDFDocument.load(templateBytes);
      const form = pdfDoc.getForm();

      // Attempt to get form fields
      const eventDateField = form.getTextField('EventDateField');
      const submissionDateField = form.getTextField('SubmissionDateField');
      const annexureField = form.getTextField('AnnexureField');

      // Verify that fields exist
      if (!eventDateField || !submissionDateField || !annexureField) {
        showFeedback("One or more form fields are missing in the template PDF.", "error");
        console.error("Form fields not found. Please verify field names in 'template_3.pdf'.");
        return null;
      }

      // Try both font approaches
      try {
        // Approach 1: Using Standard Fonts
        const courierFont = await pdfDoc.embedFont(StandardFonts.Courier);
        
        // Fill fields and set fonts
        eventDateField.setText(eventDate);
        eventDateField.setFont(courierFont);
        eventDateField.setFontSize(12);

        submissionDateField.setText(submissionDate);
        submissionDateField.setFont(courierFont);
        submissionDateField.setFontSize(12);

        annexureField.setText(bookingMessage);
        annexureField.setFont(courierFont);
        annexureField.setFontSize(12);
      } catch (fontError) {
        console.error("Error setting standard font, trying alternate approach:", fontError);
        
        // Approach 2: Using custom Courier New font
        // Note: PDFLib does not support embedding system fonts directly by name.
        // You need to fetch the font file or use a supported method.
        // For demonstration, we'll fallback without changing the font.
        eventDateField.setText(eventDate);
        submissionDateField.setText(submissionDate);
        annexureField.setText(bookingMessage);
      }

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
});
