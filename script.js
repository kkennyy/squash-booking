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
        // Prevent closing with Escape for security
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
   * For
