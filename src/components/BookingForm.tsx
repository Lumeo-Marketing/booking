import { useEffect, useMemo, useState } from "react";
import {
  MapPin,
  Wrench,
  CalendarClock,
  UserCog,
  ClipboardList,
  ChevronLeft,
  CheckCircle2,
  Phone,
  Mail,
  MessageSquare,
  Loader2,
  AlertCircle,
  Snowflake,
  Wind,
  Flame,
  Thermometer,
  Droplets,
  Filter,
  Siren,
} from "lucide-react";
import {
  CALENDAR_ID,
  LOCATION_ID,
  CUSTOM_FIELDS,
  fetchCalendarFreeSlots,
  submitCalendarBooking,
  getBrowserTimezone,
  type FreeSlotsResponse,
} from "../lib/booking";
import { trackBookingSubmission } from "../lib/form-tracking";

type StepId = "LOCATION" | "SERVICE" | "SCHEDULE" | "CONTACT" | "ADDITIONAL";

const STEPS: { id: StepId; label: string; icon: typeof MapPin }[] = [
  { id: "LOCATION", label: "Location", icon: MapPin },
  { id: "SERVICE", label: "Service", icon: Wrench },
  { id: "SCHEDULE", label: "Schedule", icon: CalendarClock },
  { id: "CONTACT", label: "Contact", icon: UserCog },
  { id: "ADDITIONAL", label: "Additional", icon: ClipboardList },
];

const SERVICES: { label: string; icon: typeof Wrench }[] = [
  { label: "AC Repair", icon: Snowflake },
  { label: "AC Installation", icon: Wind },
  { label: "Heating Repair", icon: Flame },
  { label: "Heating Installation", icon: Thermometer },
  { label: "Maintenance & Tune-Up", icon: Wrench },
  { label: "Indoor Air Quality", icon: Droplets },
  { label: "Duct Cleaning", icon: Filter },
  { label: "Emergency Service", icon: Siren },
];

const CONTACT_PREFS = [
  { label: "Phone", icon: Phone },
  { label: "Email", icon: Mail },
  { label: "Text Message", icon: MessageSquare },
];

const slotLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

const dayKey = (iso: string) => iso.slice(0, 10);

function classNames(...c: (string | false | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export default function BookingForm() {
  const [step, setStep] = useState(0);
  const [zip, setZip] = useState("");
  const [service, setService] = useState("");
  const [slots, setSlots] = useState<FreeSlotsResponse>({});
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState("");
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<string>("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [contactPref, setContactPref] = useState("Phone");

  const [notes, setNotes] = useState("");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const tz = useMemo(() => getBrowserTimezone(), []);

  // Fetch a 14-day window of availability when entering the Schedule step.
  useEffect(() => {
    if (step !== 2) return;
    let cancelled = false;
    const run = async () => {
      setSlotsLoading(true);
      setSlotsError("");
      try {
        const start = Date.now();
        const end = start + 14 * 24 * 60 * 60 * 1000;
        const data = await fetchCalendarFreeSlots(CALENDAR_ID, start, end);
        if (!cancelled) {
          setSlots(data);
          const firstDay = Object.keys(data).find((d) => data[d].slots?.length);
          if (firstDay) setSelectedDay(firstDay);
        }
      } catch {
        if (!cancelled) setSlotsError("Couldn't load open time slots.");
      } finally {
        if (!cancelled) setSlotsLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [step]);

  const days = useMemo(() => {
    const keys = Object.keys(slots).sort();
    return keys.map((k) => {
      const d = new Date(k + "T00:00:00");
      return {
        key: k,
        weekday: d.toLocaleDateString("en-US", { weekday: "short" }),
        day: d.getDate(),
        month: d.toLocaleDateString("en-US", { month: "short" }),
        hasSlots: (slots[k]?.slots?.length ?? 0) > 0,
      };
    });
  }, [slots]);

  const currentDaySlots = selectedDay ? (slots[selectedDay]?.slots ?? []) : [];

  const canContinue = (): boolean => {
    switch (step) {
      case 0:
        return /^\d{5}(-\d{4})?$/.test(zip);
      case 1:
        return !!service;
      case 2:
        return !!selectedSlot;
      case 3:
        return (
          firstName.trim() &&
          lastName.trim() &&
          /^\S+@\S+\.\S+$/.test(email) &&
          phone.trim().length >= 7
        );
      case 4:
        return true;
    }
    return false;
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else void submit();
  };
  const back = () => setStep(Math.max(0, step - 1));

  const submit = async () => {
    setSubmitting(true);
    setSubmitError("");
    try {
      await submitCalendarBooking({
        locationId: LOCATION_ID,
        calendarId: CALENDAR_ID,
        firstName,
        lastName,
        email,
        phone,
        selectedSlot,
        notes,
        address1: address,
        postalCode: zip,
        timezone: tz,
        customFields: [
          { id: CUSTOM_FIELDS.serviceType, field_value: service },
          { id: CUSTOM_FIELDS.zipCode, field_value: zip },
          { id: CUSTOM_FIELDS.contactPreference, field_value: contactPref },
        ],
      });

      // Fire CRM form-tracking event so subaccount automations can trigger on submission.
      trackBookingSubmission({
        firstName,
        lastName,
        email,
        phone,
        address,
        zip,
        notes,
        timezone: tz,
        service,
        contactPref,
      });

      setConfirmed(true);
    } catch {
      setSubmitError("Booking failed. Please try again or call us.");
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmed) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-10 text-center">
        <CheckCircle2 className="h-16 w-16 text-primary" />
        <h3 className="text-2xl font-bold text-ink">You're booked!</h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          We've reserved your appointment for{" "}
          <span className="font-semibold text-foreground">
            {selectedSlot &&
              new Date(selectedSlot).toLocaleString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
          </span>
          . A confirmation is on its way to {email}.
        </p>
        <button
          onClick={() => {
            setConfirmed(false);
            setStep(0);
            setZip("");
            setService("");
            setSelectedSlot("");
            setSelectedDay("");
          }}
          className="btn-primary mt-2 rounded-lg px-6 py-2.5 text-sm font-semibold"
        >
          Book another appointment
        </button>
      </div>
    );
  }

  return (
    <div className="relative mx-auto w-full max-w-3xl overflow-hidden rounded-[28px] border border-border bg-card shadow-[0_20px_70px_rgba(42,67,179,0.14)]">
      <div className="bg-primary px-6 py-5 text-primary-foreground sm:px-10">
        <div className="flex justify-center">
          <img
            src="https://vibe.filesafe.space/1789997936096434917/attachments/408c2677-f990-4337-83ac-afed469853ed.webp"
            alt="BlueHippo HVAC Logo"
            className="h-16 w-auto object-contain sm:h-20"
          />
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-6 pt-5">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const active = i === step;
            const done = i < step;
            return (
              <div key={s.id} className="flex flex-1 items-center">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={classNames(
                      "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors",
                      active && "border-primary bg-primary text-primary-foreground",
                      done && "border-primary bg-primary/10 text-primary",
                      !active && !done && "border-border bg-surface text-muted-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span
                    className={classNames(
                      "text-[10px] font-medium uppercase tracking-wide",
                      active ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="mx-1 mb-4 h-0.5 flex-1 rounded-full bg-border">
                    <div
                      className={classNames(
                        "h-full rounded-full transition-all",
                        i < step ? "bg-primary" : "bg-transparent",
                      )}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <hr className="mx-6 my-4 border-border" />

      {/* Step body */}
      <div className="px-6 py-4">
        {step === 0 && (
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent text-primary">
              <MapPin className="h-9 w-9" />
            </div>
            <h3 className="text-xl font-bold text-ink">Where are you?</h3>
            <p className="max-w-xs text-sm text-muted-foreground">
              Enter your zip or postal code so we can check if we service your area.
            </p>
            <div className="mt-2 w-full max-w-xs text-left">
              <label className="mb-1.5 block text-sm font-semibold text-foreground">
                Zip Code <span className="text-destructive">*</span>
              </label>
              <input
                type="tel"
                inputMode="numeric"
                value={zip}
                onChange={(e) => setZip(e.target.value.replace(/[^\d-]/g, ""))}
                placeholder="e.g. 78154"
                className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm outline-none ring-primary focus:ring-2"
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-3">
            <h3 className="text-xl font-bold text-ink">What service do you need?</h3>
            <p className="text-sm text-muted-foreground">
              Choose the service that best matches your request.
            </p>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {SERVICES.map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.label}
                    onClick={() => setService(s.label)}
                    className={classNames(
                      "flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-center text-sm font-semibold transition-all",
                      service === s.label
                        ? "border-primary bg-primary/10 text-primary shadow-sm"
                        : "border-border bg-surface text-foreground hover:border-primary/50",
                    )}
                  >
                    <span
                      className={classNames(
                        "flex h-14 w-14 items-center justify-center rounded-2xl",
                        service === s.label
                          ? "bg-primary text-primary-foreground"
                          : "bg-primary/10 text-primary",
                      )}
                    >
                      <Icon className="h-7 w-7" />
                    </span>
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-3">
            <h3 className="text-xl font-bold text-ink">Pick a time that works</h3>
            <p className="text-sm text-muted-foreground">
              Showing open slots for the next two weeks. Times in your local timezone ({tz}).
            </p>

            {slotsLoading && (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading availability…
              </div>
            )}
            {slotsError && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" /> {slotsError}
              </div>
            )}

            {!slotsLoading && !slotsError && (
              <>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {days.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No open slots in the next two weeks — please call us.
                    </p>
                  )}
                  {days.map((d) => (
                    <button
                      key={d.key}
                      disabled={!d.hasSlots}
                      onClick={() => {
                        setSelectedDay(d.key);
                        setSelectedSlot("");
                      }}
                      className={classNames(
                        "flex min-w-[68px] flex-col items-center gap-0.5 rounded-xl border px-3 py-2 transition-all",
                        !d.hasSlots && "opacity-40",
                        selectedDay === d.key
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-surface text-foreground hover:border-primary/50",
                      )}
                    >
                      <span className="text-[10px] uppercase tracking-wide">{d.weekday}</span>
                      <span className="text-lg font-bold leading-none">{d.day}</span>
                      <span className="text-[10px] text-muted-foreground">{d.month}</span>
                    </button>
                  ))}
                </div>

                {selectedDay && (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {currentDaySlots.map((slot) => (
                      <button
                        key={slot}
                        onClick={() => setSelectedSlot(slot)}
                        className={classNames(
                          "rounded-lg border px-2 py-2 text-sm font-medium transition-all",
                          selectedSlot === slot
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-surface text-foreground hover:border-primary/50",
                        )}
                      >
                        {slotLabel(slot)}
                      </button>
                    ))}
                    {currentDaySlots.length === 0 && (
                      <p className="col-span-full text-sm text-muted-foreground">
                        No open slots this day — try another.
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-3">
            <h3 className="text-xl font-bold text-ink">Your contact details</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="First Name *">
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Last Name *">
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>
            <Field label="Email *">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Phone *">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputCls}
              />
            </Field>
            <div>
              <p className="mb-1.5 text-sm font-semibold text-foreground">
                Preferred contact method
              </p>
              <div className="grid grid-cols-3 gap-2">
                {CONTACT_PREFS.map((p) => {
                  const Icon = p.icon;
                  return (
                    <button
                      key={p.label}
                      onClick={() => setContactPref(p.label)}
                      className={classNames(
                        "flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-sm font-medium transition-all",
                        contactPref === p.label
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-surface text-foreground hover:border-primary/50",
                      )}
                    >
                      <Icon className="h-4 w-4" /> {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col gap-3">
            <h3 className="text-xl font-bold text-ink">Anything else?</h3>
            <Field label="Service address">
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street address (optional)"
                className={inputCls}
              />
            </Field>
            <Field label="Notes for the technician">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Describe the issue, access details, pets, etc."
                className={classNames(inputCls, "resize-none")}
              />
            </Field>

            <div className="rounded-xl bg-surface p-4 text-sm">
              <p className="mb-2 font-bold text-ink">Review your booking</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>
                  <span className="font-medium text-foreground">Service:</span> {service}
                </li>
                <li>
                  <span className="font-medium text-foreground">Zip:</span> {zip}
                </li>
                <li>
                  <span className="font-medium text-foreground">When:</span>{" "}
                  {selectedSlot &&
                    new Date(selectedSlot).toLocaleString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                </li>
                <li>
                  <span className="font-medium text-foreground">Name:</span> {firstName} {lastName}
                </li>
                <li>
                  <span className="font-medium text-foreground">Contact:</span> {contactPref} via{" "}
                  {contactPref === "Email" ? email : phone}
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border px-6 py-4">
        {submitError && (
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" /> {submitError}
          </div>
        )}
        <div className="flex items-center justify-between">
          <button
            onClick={back}
            disabled={step === 0 || submitting}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          <button
            onClick={next}
            disabled={!canContinue() || submitting}
            className="btn-primary inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {step === STEPS.length - 1 ? "Confirm Booking" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm outline-none ring-primary focus:ring-2";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-foreground">{label}</label>
      {children}
    </div>
  );
}
