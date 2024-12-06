const previewBtn = document.getElementById('previewBtn');
const downloadBtn = document.getElementById('downloadBtn');
const eventDateInput = document.getElementById('eventDate');
const bookingMessageInput = document.getElementById('bookingMessage');
const pdfPreview = document.getElementById('pdfPreview');

let currentPdfBytes = null; // Will store the most recently generated PDF bytes

// Utility to format the submission date as "dd MMM yyyy"
function getFormattedSubmissionDate() {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = today.toLocaleString('default', { month: 'short' }); // e.g. "Dec"
  const year = today.getFullYear();
  return `${day} ${month} ${year}`; 
}

async function generatePDFBytes() {
  // Get the input values
  const eventDate = eventDateInput.value.trim();
  const bookingMessage = bookingMessageInput.value.trim();
  const submissionDate = getFormattedSubmissionDate();

  if (!eventDate || !bookingMessage) {
    alert("Please fill in both Event Date and Booking Request Message.");
    return null;
  }

  // Fetch the template PDF
  const templateBytes = await fetch('template.pdf').then(res => res.arrayBuffer());

  const { PDFDocument } = PDFLib;
  const pdfDoc = await PDFDocument.load(templateBytes);
  const form = pdfDoc.getForm();

  // Fill the fields. Make sure these field names match your template's fields.
  // For example, if your fields are named:
  // "EventDateField", "SubmissionDateField", and "AnnexureField"
  form.getTextField('EventDateField').setText(eventDate);
  form.getTextField('SubmissionDateField').setText(submissionDate);
  form.getTextField('AnnexureField').setText(bookingMessage);

  // Flatten the form
  form.flatten();

  // Save PDF bytes
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

previewBtn.addEventListener('click', async () => {
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

downloadBtn.addEventListener('click', () => {
  if (!currentPdfBytes) return;

  // Use the event date to build the filename
  const eventDate = eventDateInput.value.trim();
  const formattedEventDate = eventDate.replace(/\s+/g, ''); // Remove all spaces
  const filename = "NP_CCAB_Booking_" + formattedEventDate + ".pdf";

  const blob = new Blob([currentPdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
});
