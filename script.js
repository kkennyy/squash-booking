// script2.js

document.addEventListener('DOMContentLoaded', () => {
  // Configuration
  const CONFIG = {
    TEMPLATE_URL: './template_3.pdf',
    CORRECT_PASSWORD_HASH: '1bbd278588a207c4eb532ff9ce3f89cd24b5dcfedc101c804c77bd5dc59ca6d6',
    PDF_FILENAME_PREFIX: 'NP_CCAB_Booking_',
    TOAST_DURATION: 4000,
    STORAGE_KEYS: {
      EVENT_DATE: 'savedEventDate',
      BOOKING_MESSAGE: 'savedBookingMessage',
      ONBOARDING_DISMISSED: 'onboardingDismissed'
    }
  };

  // DOM Elements
  const elements = {
    // Password modal
    passwordModal: document.getElementById('passwordModal'),
    passwordInput: document.getElementById('passwordInput'),
    passwordSubmit: document.getElementById('passwordSubmit'),
    passwordError: document.getElementById('passwordError'),
    
    // Main content
    mainContent: document.getElementById('mainContent'),
    
    // Form
    eventDateInput: document.getElementById('eventDate'),
    bookingMessageInput: document.getElementById('bookingMessage'),
    
    // Buttons
    previewBtn: document.getElementById('previewBtn'),
    previewBtnText: document.getElementById('previewBtnText'),
    downloadBtn: document.getElementById('downloadBtn'),
    downloadBtnText: document.getElementById('downloadBtnText'),
    
    // Preview
    pdfPreview: document.getElementById('pdfPreview'),
    previewEmpty: document.getElementById('previewEmpty'),
    previewBadge: document.getElementById('previewBadge'),
    
    // Onboarding
    onboardingOverlay: document.getElementById('onboardingOverlay'),
    onboardingDismiss: document.getElementById('onboardingDismiss'),
    
    // Toast
    toastContainer: document.getElementById('toastContainer')
  };

  // State
  let currentPdfBytes = null;

  // Utility Functions
  async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function getFormattedSubmissionDate() {
    const today = new Date();
    const day = today.getDate();
    const month = today.toLocaleString('default', { month: 'short' });
    const year = today.getFullYear();
    return `${day} ${month} ${year}`;
  }

  // Toast Notification System
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
      success: '<svg class="toast-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>',
      error: '<svg class="toast-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>',
      info: '<svg class="toast-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" /></svg>'
    };
    
    toast.innerHTML = `${icons[type] || icons.info}<span>${message}</span>`;
    elements.toastContainer.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 200);
    }, CONFIG.TOAST_DURATION);
  }

  // Button State Management
  function setButtonLoading(button, textElement, isLoading, loadingText = 'Processing...') {
    if (isLoading) {
      button.disabled = true;
      button._originalText = textElement.textContent;
      textElement.innerHTML = `<span class="spinner"></span>`;
    } else {
      button.disabled = false;
      textElement.textContent = button._originalText || textElement.textContent;
    }
  }

  // PDF Generation
  async function generatePDFBytes() {
    const eventDate = elements.eventDateInput.value.trim();
    const bookingMessage = elements.bookingMessageInput.value.trim();
    const submissionDate = getFormattedSubmissionDate();

    if (!eventDate || !bookingMessage) {
      showToast('Please fill in both Event Date and Booking Message.', 'error');
      return null;
    }

    try {
      const response = await fetch(CONFIG.TEMPLATE_URL);

      if (!response.ok) {
        showToast('Failed to load template PDF. Please refresh and try again.', 'error');
        console.error('Error fetching template:', response.status, response.statusText);
        return null;
      }

      const templateBytes = await response.arrayBuffer();
      const pdfDoc = await PDFLib.PDFDocument.load(templateBytes);
      const form = pdfDoc.getForm();

      const eventDateField = form.getTextField('EventDateField');
      const submissionDateField = form.getTextField('SubmissionDateField');
      const annexureField = form.getTextField('AnnexureField');

      if (!eventDateField || !submissionDateField || !annexureField) {
        showToast('Template PDF is missing required form fields.', 'error');
        console.error('Missing fields: EventDateField, SubmissionDateField, or AnnexureField');
        return null;
      }

      eventDateField.setText(eventDate);
      submissionDateField.setText(submissionDate);
      annexureField.setText(bookingMessage);

      form.flatten();
      return await pdfDoc.save();

    } catch (error) {
      showToast('An error occurred during PDF generation.', 'error');
      console.error('Error in generatePDFBytes:', error);
      return null;
    }
  }

  // Local Storage
  function restoreInputs() {
    const savedEventDate = localStorage.getItem(CONFIG.STORAGE_KEYS.EVENT_DATE);
    const savedBookingMessage = localStorage.getItem(CONFIG.STORAGE_KEYS.BOOKING_MESSAGE);

    if (savedEventDate) elements.eventDateInput.value = savedEventDate;
    if (savedBookingMessage) elements.bookingMessageInput.value = savedBookingMessage;
  }

  function saveInputs() {
    localStorage.setItem(CONFIG.STORAGE_KEYS.EVENT_DATE, elements.eventDateInput.value.trim());
    localStorage.setItem(CONFIG.STORAGE_KEYS.BOOKING_MESSAGE, elements.bookingMessageInput.value.trim());
  }

  // Onboarding
  function showOnboardingIfNeeded() {
    const dismissed = localStorage.getItem(CONFIG.STORAGE_KEYS.ONBOARDING_DISMISSED);
    if (!dismissed) {
      elements.onboardingOverlay.style.display = 'flex';
    }
  }

  // Focus Trap for Modals
  function trapFocus(element) {
    const focusableSelectors = 'button, [href], input, textarea, [tabindex]:not([tabindex="-1"])';
    const focusableElements = element.querySelectorAll(focusableSelectors);
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    function handleTab(e) {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        } else if (!e.shiftKey && document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    }
    
    element.addEventListener('keydown', handleTab);
  }

  // Event Handlers
  async function handlePasswordSubmit() {
    const enteredPassword = elements.passwordInput.value;
    
    if (!enteredPassword) {
      elements.passwordError.textContent = 'Please enter a password.';
      elements.passwordError.style.display = 'block';
      elements.passwordInput.setAttribute('aria-invalid', 'true');
      elements.passwordInput.focus();
      return;
    }

    const enteredHash = await hashPassword(enteredPassword);

    if (enteredHash === CONFIG.CORRECT_PASSWORD_HASH) {
      elements.passwordModal.style.display = 'none';
      elements.mainContent.classList.remove('hidden');
      
      restoreInputs();
      showOnboardingIfNeeded();
      
      const firstInput = elements.mainContent.querySelector('input, textarea');
      if (firstInput) firstInput.focus();
    } else {
      elements.passwordError.textContent = 'Incorrect password. Please try again.';
      elements.passwordError.style.display = 'block';
      elements.passwordInput.setAttribute('aria-invalid', 'true');
      elements.passwordInput.value = '';
      elements.passwordInput.focus();
    }
  }

  async function handlePreview() {
    setButtonLoading(elements.previewBtn, elements.previewBtnText, true);
    
    const pdfBytes = await generatePDFBytes();
    
    setButtonLoading(elements.previewBtn, elements.previewBtnText, false);

    if (!pdfBytes) return;

    currentPdfBytes = pdfBytes;

    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    
    elements.pdfPreview.src = url;
    elements.pdfPreview.classList.add('active');
    elements.previewEmpty.style.display = 'none';
    elements.previewBadge.classList.remove('hidden');
    elements.downloadBtn.classList.remove('hidden');
    
    saveInputs();
    showToast('PDF preview generated successfully.', 'success');
  }

  async function handleDownload() {
    if (!currentPdfBytes) {
      showToast('Please generate a preview first.', 'error');
      return;
    }

    setButtonLoading(elements.downloadBtn, elements.downloadBtnText, true);
    
    const pdfBytes = await generatePDFBytes();
    
    setButtonLoading(elements.downloadBtn, elements.downloadBtnText, false);

    if (!pdfBytes) return;

    const eventDate = elements.eventDateInput.value.trim();
    const formattedEventDate = eventDate.replace(/\s+/g, '');
    const filename = `${CONFIG.PDF_FILENAME_PREFIX}${formattedEventDate}.pdf`;

    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    
    URL.revokeObjectURL(url);
    showToast('PDF downloaded successfully.', 'success');
  }

  function handleOnboardingDismiss() {
    localStorage.setItem(CONFIG.STORAGE_KEYS.ONBOARDING_DISMISSED, 'true');
    elements.onboardingOverlay.style.display = 'none';
    elements.eventDateInput.focus();
  }

  // Event Listeners
  elements.passwordSubmit.addEventListener('click', handlePasswordSubmit);
  
  elements.passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handlePasswordSubmit();
  });

  elements.previewBtn.addEventListener('click', handlePreview);
  elements.downloadBtn.addEventListener('click', handleDownload);
  elements.onboardingDismiss.addEventListener('click', handleOnboardingDismiss);

  // Keyboard shortcut: Ctrl+P for preview
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
      e.preventDefault();
      elements.previewBtn.click();
    }
  });

  // Initialize
  function init() {
    trapFocus(elements.passwordModal);
    elements.passwordInput.focus();
  }

  init();
});
