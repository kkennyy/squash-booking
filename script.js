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
      const courierNewFont = await pdfDoc.embedFont('Courier New');
      
      // Fill fields and set fonts
      eventDateField.setText(eventDate);
      eventDateField.setFont(courierNewFont);
      eventDateField.setFontSize(12);

      submissionDateField.setText(submissionDate);
      submissionDateField.setFont(courierNewFont);
      submissionDateField.setFontSize(12);

      annexureField.setText(bookingMessage);
      annexureField.setFont(courierNewFont);
      annexureField.setFontSize(12);
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
