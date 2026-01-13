# NP CCAB Squash Court Booking PDF Generator

A browser-based tool for generating monthly squash court booking request forms for New Pioneer Squash Club at CCAB Squash Courts.

## Overview

This web application allows authorised users to quickly generate pre-filled ActiveSG Corporate Booking Request Forms (PDF) by entering an event date and booking message. The tool populates a PDF template with the provided details and today's submission date, then allows preview and download.

## Features

- **Password Protection**: Access restricted via SHA-256 hashed password
- **PDF Generation**: Uses pdf-lib to fill form fields in the template PDF
- **Live Preview**: Renders the generated PDF in an iframe before download
- **Local Storage Persistence**: Saves form inputs across sessions
- **Keyboard Shortcut**: Ctrl+P triggers preview generation
- **First-Time Onboarding**: Guided overlay for new users

## Technical Stack

- **Frontend**: Vanilla HTML/CSS/JavaScript (no build step required)
- **PDF Library**: [pdf-lib](https://pdf-lib.js.org/) (CDN)
- **Template**: `template_3.pdf` - ActiveSG Corporate Booking Request Form with pre-filled hirer details for New Pioneer Squash Club

## PDF Form Fields

The template PDF contains three fillable fields:
| Field Name | Description |
|------------|-------------|
| `EventDateField` | Month/year of booking (e.g. "Feb 2025") |
| `SubmissionDateField` | Auto-populated with current date |
| `AnnexureField` | Multi-line booking request details |

## Usage

1. Open `index.html` in a browser
2. Enter the password when prompted
3. Fill in the Event Date (e.g. "Mar 2025")
4. Enter the booking message with slot details
5. Click **Preview** (or press Ctrl+P)
6. Review the PDF in the preview pane
7. Click **Download PDF** to save

## File Structure
```
├── index.html          # Main application
├── script.js           # Application logic
├── template_3.pdf      # Pre-filled PDF template
└── README.md           # This file
```

## Deployment

Static hosting only - no server required. Deploy to any web server or open locally via `file://` protocol (note: some browsers restrict local file access for fetch requests).

## Browser Compatibility

Tested on modern browsers (Chrome, Firefox, Edge, Safari). Requires JavaScript and Web Crypto API support.

## Notes

- Password hash is stored client-side (security through obscurity only - suitable for low-stakes access control)
- Form inputs persist in localStorage under keys: `savedEventDate`, `savedBookingMessage`, `onboardingDismissed`
- Output filename format: `NP_CCAB_Booking_<EventDate>.pdf`