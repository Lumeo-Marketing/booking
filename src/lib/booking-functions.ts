import { createServerFn } from "@tanstack/react-start";

import { bookingSubmissionSchema } from "./booking-schema";

export const submitBooking = createServerFn({ method: "POST" })
  .validator(bookingSubmissionSchema)
  .handler(async ({ data }) => {
    const { submitBookingOnServer } = await import("../server/booking");
    return submitBookingOnServer(data);
  });
