import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  AlertTriangle,
  Droplets,
  Flame,
  Gauge,
  Home,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
import BookingForm, { type ServiceOption, PLUMBING_THEME } from "../components/BookingForm";
import { useBookingStore } from "../stores/booking-store";

const LOGO_URL =
  "https://vibe.filesafe.space/1789997936096434917/attachments/408c2677-f990-4337-83ac-afed469853ed.webp";

const PLUMBING_SERVICES: ServiceOption[] = [
  { label: "Leak Detection", icon: Droplets },
  { label: "Drain Cleaning", icon: Wrench },
  { label: "Water Heater Repair", icon: Flame },
  { label: "Toilet Repair", icon: Gauge },
  { label: "Pipe Repair", icon: ShieldCheck },
  { label: "Water Softener", icon: Sparkles },
  { label: "Bathroom Remodel", icon: Home },
  { label: "Emergency Plumbing", icon: AlertTriangle },
];

export const Route = createFileRoute("/plumbing")({
  head: () => ({
    meta: [
      { title: "BlueHippo Plumbing — Book Online" },
      {
        name: "description",
        content: "Book plumbing service online with BlueHippo HVAC and plumbing experts.",
      },
    ],
  }),
  component: PlumbingPage,
});

function PlumbingPage() {
  useEffect(() => {
    useBookingStore.getState().resetProgress();
    useBookingStore.persist.clearStorage();
  }, []);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(52,133,255,0.12),_transparent_35%),linear-gradient(180deg,#f8fbff_0%,#edf5ff_100%)] px-4 py-8 sm:px-6 lg:py-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex flex-col items-center justify-center">
          <img
            src={LOGO_URL}
            alt="BlueHippo HVAC Logo"
            className="h-20 w-auto object-contain sm:h-24"
          />

          <div className="mt-3 flex flex-col items-center gap-1 text-center text-sm font-bold text-slate-800 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-5 sm:gap-y-1">
            <span>7666 Bandera Rd, San Antonio, TX</span>
            <span className="hidden sm:inline text-slate-400">|</span>
            <a href="mailto:info@callbluehippo.com" className="font-bold hover:text-primary">
              info@callbluehippo.com
            </a>
            <span className="hidden sm:inline text-slate-400">|</span>
            <a href="tel:+12109721009" className="font-bold hover:text-primary">
              (210) 972-1009
            </a>
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-full border border-primary/30 bg-white px-4 py-2 text-sm font-semibold text-primary shadow-sm transition hover:border-primary hover:bg-primary/5"
            >
              Back to HVAC Booking
            </Link>
            <Link
              to="/kitchen"
              className="inline-flex items-center justify-center rounded-full border border-primary/30 bg-white px-4 py-2 text-sm font-semibold text-primary shadow-sm transition hover:border-primary hover:bg-primary/5"
            >
              Book Kitchen Service
            </Link>
          </div>
        </div>

        <BookingForm
          serviceCatalog={PLUMBING_SERVICES}
          servicePrompt="What plumbing issue are you dealing with?"
          serviceSubtext="Choose the plumbing services you need."
          theme={PLUMBING_THEME}
        />
      </div>
    </main>
  );
}
