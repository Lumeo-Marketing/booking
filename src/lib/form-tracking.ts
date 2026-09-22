// Form tracking helper wired to the CRM external-tracking integration.
// Fires a form_submission event so subaccount automations/workflows can
// trigger on this form's submission.

export const FORM_TRACKING_ID = "tk_79692fdf37774d818f87fb64ccb3814d";
export const FORM_TRACKING_LOCATION_ID = "IyxA7vToI8oKgZYNWysK";
export const FORM_TRACKING_PROJECT_ID = "1789997936096434917";

// Stable slug for this form — do not change after publish (workflow Form filter keys off this).
export const BLUEHIPPO_FORM_ID = "bluehippo-hvac-booking";
export const BLUEHIPPO_FORM_NAME = "BlueHippo HVAC Booking";

// Custom field ids registered on the subaccount (shared with calendar booking).
export const FORM_CUSTOM_FIELDS = {
  serviceType: "G8jLIRDcDzFuxCe8rp4p",
  contactPreference: "hOerveYBhc6scsCyCDK2",
} as const;

type StandardTrackingFieldKey = string;
type RegisteredCustomFieldId = string;
type TrackingCustomField = { value?: unknown; label: string };
type TrackingFileField = { file?: File; label: string };
type TrackingImageDataField = { dataUrl?: string; label: string };

const TRACKING_ENDPOINT = "https://backend.leadconnectorhq.com/external-tracking/events";

export const postTrackingEvent = (
  trackingPayload: Record<string, unknown> & {
    formData: Record<StandardTrackingFieldKey, unknown>;
    formLabels: Record<StandardTrackingFieldKey, string>;
  },
  options: {
    customFields?: Record<RegisteredCustomFieldId, TrackingCustomField>;
    fileFields?: Record<RegisteredCustomFieldId, TrackingFileField>;
    imageDataFields?: Record<RegisteredCustomFieldId, TrackingImageDataField>;
  } = {},
) => {
  const { customFields = {}, fileFields = {}, imageDataFields = {} } = options;
  const eventPayload = {
    ...trackingPayload,
    formData: { ...trackingPayload.formData },
    formLabels: { ...trackingPayload.formLabels },
  };
  const body = new FormData();

  for (const [key, field] of Object.entries(customFields)) {
    if (field.value === undefined) continue;
    eventPayload.formData[key] = field.value;
    eventPayload.formLabels[key] = field.label;
  }

  for (const [key, field] of Object.entries(imageDataFields)) {
    const dataUrl = field.dataUrl;
    if (!dataUrl) continue;
    if (!dataUrl.startsWith("data:image/")) {
      throw new Error("Image data field must be a data:image/* base64 string");
    }
    eventPayload.formData[key] = dataUrl;
    eventPayload.formLabels[key] = field.label;
  }

  for (const [key, field] of Object.entries(fileFields)) {
    const file = field.file;
    if (!file) continue;
    if (file.size > 50 * 1024 * 1024) {
      throw new Error("File must be 50 MB or smaller");
    }
    eventPayload.formData[key] = {
      filename: file.name,
      size: file.size,
      type: file.type || "application/octet-stream",
    };
    eventPayload.formLabels[key] = field.label;
    body.append(key, file, file.name);
  }

  for (const key of Object.keys(eventPayload.formData)) {
    eventPayload.formLabels[key] ||= key;
  }

  body.append("event", JSON.stringify(eventPayload));

  fetch(TRACKING_ENDPOINT, {
    method: "POST",
    headers: {
      version: "2021-07-28",
    },
    body,
  }).catch(() => {}); // Fire-and-forget — don't block form UX
};

export type BookingTrackingInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  zip: string;
  notes: string;
  timezone: string;
  service: string;
  contactPref: string;
};

// Builds + fires the tracking event for a BlueHippo booking submission.
export const trackBookingSubmission = (input: BookingTrackingInput) => {
  const trackingPayload = {
    type: "external_form_submission",
    timestamp: Date.now(),
    formId: BLUEHIPPO_FORM_ID,
    formData: {
      // Standard CRM fields only
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email,
      phone: input.phone,
      address: input.address,
      postal_code: input.zip,
      calendar_notes: input.notes,
      Timezone: input.timezone,
    },
    formLabels: {
      first_name: "First Name",
      last_name: "Last Name",
      email: "Email",
      phone: "Phone",
      address: "Service Address",
      postal_code: "Zip Code",
      calendar_notes: "Notes for the Technician",
      Timezone: "Timezone",
    },
    url: typeof window !== "undefined" ? window.location.href : "",
    title: typeof document !== "undefined" ? document.title : "",
    path: typeof window !== "undefined" ? window.location.pathname : "",
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    trackingId: FORM_TRACKING_ID,
    locationId: FORM_TRACKING_LOCATION_ID,
    projectId: FORM_TRACKING_PROJECT_ID,
    sessionId: crypto.randomUUID(),
    properties: {
      deviceType:
        typeof navigator !== "undefined" && /Mobile|Android|iPhone/i.test(navigator.userAgent)
          ? "mobile"
          : "desktop",
      source: "ai_studio",
      projectId: FORM_TRACKING_PROJECT_ID,
      formName: BLUEHIPPO_FORM_NAME,
    },
  };

  // Non-standard fields go through customFields using registered ids.
  postTrackingEvent(trackingPayload, {
    customFields: {
      [FORM_CUSTOM_FIELDS.serviceType]: {
        value: input.service,
        label: "Service Type",
      },
      [FORM_CUSTOM_FIELDS.contactPreference]: {
        value: input.contactPref,
        label: "Contact Preference",
      },
    },
  });
};
