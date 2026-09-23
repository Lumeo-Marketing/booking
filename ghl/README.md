# HighLevel booking setup

## Internal notification workflow

Preferred setup:

1. Create a workflow using **Customer Booked Appointment** and filter it to the BlueHippo calendar.
2. Add **Send Internal Notification**, choose **Email**, and select the internal recipients.
3. Open the HTML/code editor and paste `internal-booking-notification.html`.
4. In the HighLevel merge-field picker, confirm the exact merge keys for Service Type, Contact Preference, Timezone, and appointment notes. Custom-field merge keys can differ from their labels.
5. Book a test appointment and confirm that contact fields, appointment time, address, services, and notes render correctly.

For the customer-facing **Send Email** action, paste `customer-booking-confirmation.html`. Its dynamic values use the inbound webhook mapping. After pasting, reinsert any value that GHL does not recognize through **Custom Values → Inbound Webhook Trigger** so GHL stores the exact token generated for the selected mapping reference.

The logo uses a public absolute HTTPS URL because email clients cannot load relative assets from the booking application bundle.

## Optional inbound webhook

If the appointment trigger does not run for API-created bookings, create an **Inbound Webhook** workflow trigger and store its URL as `GHL_BOOKING_WEBHOOK_URL`. Never expose that URL in client-side environment variables.

The webhook receives `customer`, `appointment`, and `serviceAddress` objects, plus the raw GHL booking response. Configure the internal notification action after the webhook trigger and map its fields from a test payload. Use `appointment.startTimeDisplay`, `appointment.timezoneDisplay`, and `appointment.servicesDisplay` in emails; the unsuffixed values are raw machine-readable data.
