import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { useServerFn } from "@tanstack/react-start";
import { useShallow } from "zustand/react/shallow";
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
  Check,
} from "lucide-react";
import {
  CALENDAR_ID,
  fetchCalendarFreeSlots,
  getBrowserTimezone,
  type FreeSlotsResponse,
} from "../lib/booking";
import { submitBooking } from "../lib/booking-functions";
import { useBookingStore } from "../stores/booking-store";

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
] as const;

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
  const {
    step,
    zip,
    services,
    selectedDay,
    selectedSlot,
    firstName,
    lastName,
    email,
    phone,
    contactPref,
    notes,
    address,
    city,
    state,
    submissionId,
    updateProgress,
    resetProgress,
  } = useBookingStore(
    useShallow((state) => ({
      step: state.step,
      zip: state.zip,
      services: state.services,
      selectedDay: state.selectedDay,
      selectedSlot: state.selectedSlot,
      firstName: state.firstName,
      lastName: state.lastName,
      email: state.email,
      phone: state.phone,
      contactPref: state.contactPref,
      notes: state.notes,
      address: state.address,
      city: state.city,
      state: state.state,
      submissionId: state.submissionId,
      updateProgress: state.updateProgress,
      resetProgress: state.resetProgress,
    })),
  );
  const [slots, setSlots] = useState<FreeSlotsResponse>({});
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [notificationQueued, setNotificationQueued] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const directionRef = useRef<1 | -1>(1);
  const submissionLockRef = useRef(false);

  const tz = useMemo(() => getBrowserTimezone(), []);
  const submitBookingFn = useServerFn(submitBooking);

  useEffect(() => {
    void useBookingStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    if (!contentRef.current) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tween = gsap.fromTo(
      contentRef.current,
      { autoAlpha: 0, x: reduceMotion ? 0 : directionRef.current * 34 },
      { autoAlpha: 1, x: 0, duration: reduceMotion ? 0.01 : 0.35, ease: "power2.out" },
    );

    return () => {
      tween.kill();
    };
  }, [step]);

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
          const firstDay = Object.keys(data).find(
            (day) => (data[day]?.slots?.length ?? 0) > 0,
          );
          const savedProgress = useBookingStore.getState();
          const savedDayIsAvailable = Boolean(
            savedProgress.selectedDay && data[savedProgress.selectedDay]?.slots?.length,
          );
          const allSlots = Object.values(data).flatMap((day) => day.slots ?? []);
          updateProgress({
            selectedDay: savedDayIsAvailable ? savedProgress.selectedDay : (firstDay ?? ""),
            selectedSlot: allSlots.includes(savedProgress.selectedSlot)
              ? savedProgress.selectedSlot
              : "",
          });
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
  }, [step, updateProgress]);

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
        return services.length > 0;
      case 2:
        return !!selectedSlot;
      case 3:
        return Boolean(
          firstName.trim() &&
          lastName.trim() &&
          /^\S+@\S+\.\S+$/.test(email) &&
          phone.trim().length >= 7
        );
      case 4:
        return Boolean(address.trim().length >= 5 && city.trim() && /^[A-Za-z]{2}$/.test(state));
    }
    return false;
  };

  const moveToStep = (targetStep: number, direction: 1 | -1) => {
    if (transitioning || !contentRef.current) return;
    directionRef.current = direction;
    setTransitioning(true);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    gsap.to(contentRef.current, {
      autoAlpha: 0,
      x: reduceMotion ? 0 : direction * -34,
      duration: reduceMotion ? 0.01 : 0.2,
      ease: "power2.in",
      onComplete: () => {
        updateProgress({ step: targetStep });
        setTransitioning(false);
      },
    });
  };

  const next = async () => {
    if (step < STEPS.length - 1) moveToStep(step + 1, 1);
    else await submit();
  };
  const back = () => moveToStep(Math.max(0, step - 1), -1);

  const toggleService = (service: string) => {
    updateProgress({
      services: services.includes(service)
        ? services.filter((selectedService) => selectedService !== service)
        : [...services, service],
    });
  };

  const submit = async () => {
    if (submissionLockRef.current) return;
    submissionLockRef.current = true;
    setSubmitting(true);
    setSubmitError("");
    try {
      const activeSubmissionId = submissionId || crypto.randomUUID();
      if (!submissionId) updateProgress({ submissionId: activeSubmissionId });

      const result = await submitBookingFn({
        data: {
          firstName,
          lastName,
          email,
          phone,
          services,
          selectedSlot,
          timezone: tz,
          contactPref,
          address,
          city,
          state: state.toUpperCase(),
          zip,
          notes,
          submissionId: activeSubmissionId,
          page: {
            url: window.location.href,
            title: document.title,
            path: window.location.pathname,
            userAgent: navigator.userAgent,
          },
        },
      });

      useBookingStore.persist.clearStorage();
      setNotificationQueued(result.webhookDelivered);
      setConfirmed(true);
    } catch {
      submissionLockRef.current = false;
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
          .{" "}
          {notificationQueued
            ? `Confirmation details are being sent to ${email}.`
            : "Your appointment is confirmed. Please save these details; our team will follow up shortly."}
        </p>
        <button
          onClick={() => {
            setConfirmed(false);
            setNotificationQueued(false);
            submissionLockRef.current = false;
            resetProgress();
          }}
          className="btn-primary mt-2 rounded-lg px-6 py-2.5 text-sm font-semibold"
        >
          Book another appointment
        </button>
      </div>
    );
  }

  return (
    <div className="relative mx-auto w-full max-w-4xl overflow-hidden rounded-[20px] border border-border bg-card shadow-[0_20px_70px_rgba(42,67,179,0.14)]">
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
      <div className="px-6 pt-5 sm:px-10">
        <div className="relative grid w-full grid-cols-5">
          <div className="absolute left-[10%] right-[10%] top-[17px] z-0 h-px bg-border" />
          <div
            className="absolute left-[10%] top-[17px] z-0 h-px bg-primary transition-[width] duration-300"
            style={{ width: `${(step / (STEPS.length - 1)) * 80}%` }}
          />
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const active = i === step;
            const done = i < step;
            return (
              <div key={s.id} className="relative z-10 flex justify-center">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={classNames(
                      "flex h-9 w-9 items-center justify-center rounded-full border bg-card transition-all duration-300",
                      active && "border-primary bg-primary text-primary-foreground",
                      done && "border-primary bg-card text-primary",
                      !active && !done && "border-border bg-surface text-muted-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span
                    className={classNames(
                      "text-[9px] uppercase tracking-wide sm:text-[10px]",
                      active
                        ? "font-extrabold text-primary"
                        : "font-medium text-muted-foreground",
                    )}
                  >
                    {s.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <hr className="mx-6 my-4 border-border sm:mx-10" />

      {/* Step body */}
      <div ref={contentRef} className="px-6 py-4 sm:px-10">
        {step === 0 && (
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent text-primary">
              <MapPin className="h-9 w-9" />
            </div>
            <h3 className="text-xl font-bold text-ink">Where are you?</h3>
            <p className="max-w-xs text-sm text-muted-foreground">
              Enter the ZIP code for your service address.
            </p>
            <div className="mt-2 w-full max-w-xs text-left">
              <label className="mb-1.5 block text-sm font-semibold text-foreground">
                Zip Code <span className="text-destructive">*</span>
              </label>
              <input
                type="tel"
                inputMode="numeric"
                value={zip}
                onChange={(e) =>
                  updateProgress({ zip: e.target.value.replace(/[^\d-]/g, "") })
                }
                placeholder="e.g. 78154"
                className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm outline-none ring-primary focus:ring-2"
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <h3 className="mb-1 text-xl font-bold text-ink">What services do you need?</h3>
                <p className="text-sm text-muted-foreground">
                  Select all the services that apply.
                </p>
              </div>
              {services.length > 0 && (
                <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                  {services.length} selected
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {SERVICES.map((s) => {
                const Icon = s.icon;
                const selected = services.includes(s.label);
                return (
                  <button
                    type="button"
                    key={s.label}
                    aria-pressed={selected}
                    onClick={() => toggleService(s.label)}
                    className={classNames(
                      "relative flex min-h-28 flex-col items-center justify-center gap-2 rounded-xl border px-3 py-4 text-center text-sm font-semibold transition-all duration-200",
                      selected
                        ? "border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary/15"
                        : "border-border bg-surface text-foreground hover:border-primary/50",
                    )}
                  >
                    {selected && (
                      <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                    )}
                    <span
                      className={classNames(
                        "flex h-14 w-14 items-center justify-center rounded-2xl",
                        selected
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
                <div className="date-strip flex gap-2 overflow-x-auto">
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
                        updateProgress({ selectedDay: d.key, selectedSlot: "" });
                      }}
                      className={classNames(
                        "flex h-[100px] min-w-[86px] flex-col items-center justify-center gap-1 rounded-2xl border px-4 py-3 transition-all sm:min-w-[94px]",
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
                  <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {currentDaySlots.map((slot) => (
                      <button
                        key={slot}
                        onClick={() => updateProgress({ selectedSlot: slot })}
                        className={classNames(
                          "rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all",
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
                  onChange={(e) => updateProgress({ firstName: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Last Name *">
                <input
                  value={lastName}
                  onChange={(e) => updateProgress({ lastName: e.target.value })}
                  className={inputCls}
                />
              </Field>
            </div>
            <Field label="Email *">
              <input
                type="email"
                value={email}
                onChange={(e) => updateProgress({ email: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Phone *">
              <input
                type="tel"
                value={phone}
                onChange={(e) => updateProgress({ phone: e.target.value })}
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
                      onClick={() => updateProgress({ contactPref: p.label })}
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
            <div>
              <h3 className="text-xl font-bold text-ink">Service details</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Tell us where the technician should go and anything they should know.
              </p>
            </div>
            <Field label="Street address *">
              <input
                value={address}
                onChange={(e) => updateProgress({ address: e.target.value })}
                placeholder="Street address"
                className={inputCls}
              />
            </Field>
            <div className="grid grid-cols-[1fr_100px] gap-3">
              <Field label="City *">
                <input
                  value={city}
                  onChange={(e) => updateProgress({ city: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="State *">
                <input
                  value={state}
                  maxLength={2}
                  onChange={(e) =>
                    updateProgress({ state: e.target.value.replace(/[^A-Za-z]/g, "").toUpperCase() })
                  }
                  className={inputCls}
                />
              </Field>
            </div>
            <Field label="Notes for the technician">
              <textarea
                value={notes}
                onChange={(e) => updateProgress({ notes: e.target.value })}
                rows={4}
                placeholder="Describe the issue, access details, pets, etc."
                className={classNames(inputCls, "resize-none")}
              />
            </Field>

            <div className="rounded-xl bg-surface p-4 text-sm">
              <p className="mb-2 font-bold text-ink">Review your booking</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>
                  <span className="font-medium text-foreground">Services:</span>{" "}
                  {services.join(", ")}
                </li>
                <li>
                  <span className="font-medium text-foreground">Zip:</span> {zip}
                </li>
                <li>
                  <span className="font-medium text-foreground">Address:</span> {address}, {city},{" "}
                  {state} {zip}
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
      <div className="border-t border-border px-6 py-4 sm:px-10">
        {submitError && (
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" /> {submitError}
          </div>
        )}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={back}
            disabled={step === 0 || submitting || transitioning}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          <button
            type="button"
            onClick={() => void next()}
            disabled={!canContinue() || submitting || transitioning}
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
