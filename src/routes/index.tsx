import { createFileRoute } from "@tanstack/react-router";
import BookingForm from "../components/BookingForm";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BlueHippo HVAC — Book Online" },
      {
        name: "description",
        content: "Book your HVAC service online with BlueHippo HVAC.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(74,92,255,0.12),_transparent_35%),linear-gradient(180deg,#f8faff_0%,#eef4ff_100%)] px-4 py-8 sm:px-6 lg:py-12">
      <div className="mx-auto max-w-4xl">
        <div className="mb-4 flex flex-col items-center justify-center">
          <img
            src="https://vibe.filesafe.space/1789997936096434917/attachments/408c2677-f990-4337-83ac-afed469853ed.webp"
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

        <BookingForm />
      </div>
    </main>
  );
}

export default Index;
