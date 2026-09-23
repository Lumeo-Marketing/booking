import { CALENDAR_ID, CUSTOM_FIELDS, LOCATION_ID } from "../lib/booking";
import type { BookingSubmission } from "../lib/booking-schema";

const GHL_API_URL = "https://services.leadconnectorhq.com";
const GHL_API_VERSION = "2023-02-21";
const SUBMISSION_CACHE_MS = 15 * 60 * 1000;

type BookingResult = {
  success: true;
  webhookConfigured: boolean;
  webhookDelivered: boolean;
};

const submissionPromises = new Map<string, Promise<BookingResult>>();

async function readJsonResponse(response: Response): Promise<Record<string, unknown>> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return {};
  return (await response.json()) as Record<string, unknown>;
}

async function readErrorResponse(response: Response) {
  return (await response.text()).slice(0, 500);
}

function formatAppointmentTime(startTime: string, timeZone: string) {
  const date = new Date(startTime);

  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
    const timezoneFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "long",
    });
    const timezoneDisplay = timezoneFormatter
      .formatToParts(date)
      .find((part) => part.type === "timeZoneName")?.value;

    return {
      startTimeDisplay: formatter.format(date),
      timezoneDisplay: timezoneDisplay || timeZone.replaceAll("_", " "),
    };
  } catch {
    return {
      startTimeDisplay: new Intl.DateTimeFormat("en-US", {
        timeZone: "UTC",
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      }).format(date),
      timezoneDisplay: timeZone.replaceAll("_", " "),
    };
  }
}

async function processBooking(data: BookingSubmission): Promise<BookingResult> {
  const locationId = process.env["GHL_LOCATION_ID"]?.trim() || LOCATION_ID;
  const calendarId = process.env["GHL_CALENDAR_ID"]?.trim() || CALENDAR_ID;
  const accessToken = process.env["GHL_PRIVATE_INTEGRATION_TOKEN"]?.trim();
  if (!accessToken) {
    throw new Error("GHL_PRIVATE_INTEGRATION_TOKEN is not configured");
  }

  const services = data.services.join(", ");
  const ghlHeaders = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    Version: GHL_API_VERSION,
  };

  const contactResponse = await fetch(`${GHL_API_URL}/contacts/upsert`, {
    method: "POST",
    headers: ghlHeaders,
    body: JSON.stringify({
      locationId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      timezone: data.timezone,
      address1: data.address,
      city: data.city,
      state: data.state.toUpperCase(),
      postalCode: data.zip,
      country: "US",
      source: "BlueHippo Online Booking",
      createNewIfDuplicateAllowed: false,
      customFields: [
        { id: CUSTOM_FIELDS.serviceType, fieldValue: services },
        { id: CUSTOM_FIELDS.zipCode, fieldValue: data.zip },
        { id: CUSTOM_FIELDS.contactPreference, fieldValue: data.contactPref },
      ],
    }),
  });

  if (!contactResponse.ok) {
    const responseBody = await readErrorResponse(contactResponse);
    console.error("GHL contact upsert failed", {
      status: contactResponse.status,
      submissionId: data.submissionId,
      responseBody,
    });
    throw new Error("Contact creation failed");
  }

  const contactResult = await readJsonResponse(contactResponse);
  const contact = contactResult["contact"];
  const contactId =
    typeof contact === "object" && contact !== null && "id" in contact
      ? (contact as { id?: unknown }).id
      : undefined;
  if (typeof contactId !== "string" || !contactId) {
    console.error("GHL contact upsert returned no contact ID", {
      submissionId: data.submissionId,
      contactResult,
    });
    throw new Error("Contact creation failed");
  }

  const appointmentResponse = await fetch(`${GHL_API_URL}/calendars/events/appointments`, {
    method: "POST",
    headers: ghlHeaders,
    body: JSON.stringify({
      title: `${services} - ${data.firstName} ${data.lastName}`,
      appointmentStatus: "confirmed",
      description: data.notes || `Services requested: ${services}`,
      address: `${data.address}, ${data.city}, ${data.state.toUpperCase()} ${data.zip}`,
      calendarId,
      locationId,
      contactId,
      startTime: data.selectedSlot,
      toNotify: false,
      ignoreDateRange: false,
      ignoreFreeSlotValidation: false,
    }),
  });

  if (!appointmentResponse.ok) {
    const responseBody = await readErrorResponse(appointmentResponse);
    console.error("GHL appointment creation failed", {
      status: appointmentResponse.status,
      submissionId: data.submissionId,
      contactId,
      responseBody,
    });
    throw new Error("Appointment creation failed");
  }

  const booking = await readJsonResponse(appointmentResponse);
  const { startTimeDisplay, timezoneDisplay } = formatAppointmentTime(
    data.selectedSlot,
    data.timezone,
  );
  const notificationPayload = {
    event: "booking.created",
    submissionId: data.submissionId,
    locationId,
    calendarId,
    customer: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      contactPreference: data.contactPref,
    },
    appointment: {
      services: data.services,
      servicesDisplay: services,
      startTime: data.selectedSlot,
      startTimeDisplay,
      timezone: data.timezone,
      timezoneDisplay,
      notes: data.notes,
    },
    serviceAddress: {
      address1: data.address,
      city: data.city,
      state: data.state.toUpperCase(),
      postalCode: data.zip,
      country: "US",
    },
    booking,
  };

  const webhookUrl = process.env["GHL_BOOKING_WEBHOOK_URL"]?.trim();
  let webhookDelivered = false;

  if (webhookUrl) {
    try {
      const webhookResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": data.submissionId,
        },
        body: JSON.stringify(notificationPayload),
      });

      if (!webhookResponse.ok) {
        throw new Error(`GHL webhook failed with status ${webhookResponse.status}`);
      }
      webhookDelivered = true;
    } catch (error) {
      // The appointment already exists, so a notification failure must not invite a retry
      // that could create a second booking.
      console.error("GHL booking webhook failed", {
        submissionId: data.submissionId,
        error,
      });
    }
  }

  return {
    success: true,
    webhookConfigured: Boolean(webhookUrl),
    webhookDelivered,
  };
}

export function submitBookingOnServer(data: BookingSubmission): Promise<BookingResult> {
  const existingSubmission = submissionPromises.get(data.submissionId);
  if (existingSubmission) {
    console.warn("Duplicate booking submission ignored", {
      submissionId: data.submissionId,
    });
    return existingSubmission;
  }

  const submission = processBooking(data).catch((error) => {
    submissionPromises.delete(data.submissionId);
    throw error;
  });
  submissionPromises.set(data.submissionId, submission);

  setTimeout(() => {
    if (submissionPromises.get(data.submissionId) === submission) {
      submissionPromises.delete(data.submissionId);
    }
  }, SUBMISSION_CACHE_MS).unref?.();

  return submission;
}
