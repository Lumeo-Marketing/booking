import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  ChefHat,
  CookingPot,
  Flame,
  Hammer,
  Home,
  Refrigerator,
  Sparkles,
  Wrench,
} from "lucide-react";
import BookingForm, { type ServiceOption, type BookingFormTheme } from "../components/BookingForm";
import { useBookingStore } from "../stores/booking-store";

const LOGO_URL =
  "https://vibe.filesafe.space/1789997936096434917/attachments/408c2677-f990-4337-83ac-afed469853ed.webp";

const KITCHEN_SERVICES: ServiceOption[] = [
  { label: "Cabinet Repair", icon: Hammer },
  { label: "Countertop Install", icon: Home },
  { label: "Appliance Repair", icon: Refrigerator },
  { label: "Sink & Faucet", icon: CookingPot },
  { label: "Garbage Disposal", icon: Wrench },
  { label: "Range Hood", icon: Flame },
  { label: "Kitchen Remodel", icon: ChefHat },
  { label: "Deep Cleaning", icon: Sparkles },
];

const KITCHEN_THEME: BookingFormTheme = {
  primary: "#5b8def",
  primaryForeground: "#ffffff",
  soft: "rgba(91, 141, 239, 0.10)",
  softStrong: "rgba(91, 141, 239, 0.18)",
  border: "rgba(91, 141, 239, 0.25)",
  gradient: "linear-gradient(135deg, #5b8def 0%, #2c5cff 100%)",
};

export const Route = createFileRoute("/kitchen")({
  head: () => ({
    meta: [
      { title: "BlueHippo Kitchen — Book Online" },
      {
        name: "description",
        content: "Book kitchen remodeling and repair services online with BlueHippo.",
      },
    ],
  }),
  component: KitchenPage,
});

function KitchenPage() {
  useEffect(() => {
    useBookingStore.getState().resetProgress();
    useBookingStore.persist.clearStorage();
  }, []);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_35%),linear-gradient(180deg,#f8fbff_0%,#eef6ff_100%)] px-4 py-8 sm:px-6 lg:py-12">
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

        </div>

        <div className="mb-5 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-cyan-700/80">
            BlueHippo
          </p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-cyan-700 sm:text-3xl">
            Kitchen Services
          </h1>
        </div>

        <BookingForm
          source="Kitchen"
          serviceCatalog={KITCHEN_SERVICES}
          servicePrompt="What kitchen service do you need?"
          serviceSubtext="Choose the kitchen services that match your project."
          theme={KITCHEN_THEME}
        />
      </div>
    </main>
  );
}
