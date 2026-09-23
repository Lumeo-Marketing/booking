import { CALENDAR_ID, CUSTOM_FIELDS, LOCATION_ID } from "../lib/booking";
import type { BookingSubmission } from "../lib/booking-schema";

const BOOKING_ENDPOINT = "https://backend.leadconnectorhq.com/vibe-ai/booking/submit";
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
  const services = data.services.join(", ");
  const bookingResponse = await fetch(BOOKING_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": data.submissionId,
    },
    body: JSON.stringify({
      locationId,
      calendarId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      selectedSlot: data.selectedSlot,
      selectedTimezone: data.timezone,
      timezone: data.timezone,
      sessionId: data.submissionId,
      notes: data.notes,
      address1: data.address,
      city: data.city,
      state: data.state.toUpperCase(),
      postalCode: data.zip,
      country: "US",
      customFields: [
        { id: CUSTOM_FIELDS.serviceType, field_value: services },
        { id: CUSTOM_FIELDS.zipCode, field_value: data.zip },
        { id: CUSTOM_FIELDS.contactPreference, field_value: data.contactPref },
      ],
    }),
  });

  if (!bookingResponse.ok) {
    const responseBody = (await bookingResponse.text()).slice(0, 500);
    console.error("GHL booking submission failed", {
      status: bookingResponse.status,
      submissionId: data.submissionId,
      responseBody,
    });
    throw new Error("Booking submission failed");
  }

  const booking = await readJsonResponse(bookingResponse);
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
