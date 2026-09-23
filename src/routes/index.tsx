import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import BookingForm from "../components/BookingForm";

const LOGO_URL =
  "https://vibe.filesafe.space/1789997936096434917/attachments/408c2677-f990-4337-83ac-afed469853ed.webp";

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
  const [showIntro, setShowIntro] = useState(true);
  const introRef = useRef<HTMLDivElement>(null);
  const introLogoRef = useRef<HTMLImageElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const context = gsap.context(() => {
      const timeline = gsap.timeline({
        onComplete: () => setShowIntro(false),
      });

      gsap.set(pageRef.current, {
        autoAlpha: 0,
        y: reduceMotion ? 0 : 16,
        filter: reduceMotion ? "none" : "blur(8px)",
      });
      timeline
        .fromTo(
          introLogoRef.current,
          { scale: reduceMotion ? 1 : 0.82, autoAlpha: 0 },
          {
            scale: reduceMotion ? 1 : 1.06,
            autoAlpha: 1,
            duration: reduceMotion ? 0.1 : 0.65,
            repeat: reduceMotion ? 0 : 1,
            yoyo: true,
            ease: "sine.inOut",
          },
        )
        .to(introRef.current, {
          autoAlpha: 0,
          duration: reduceMotion ? 0.1 : 0.4,
          ease: "power2.inOut",
        })
        .to(
          pageRef.current,
          {
            autoAlpha: 1,
            y: 0,
            filter: "blur(0px)",
            duration: reduceMotion ? 0.1 : 0.55,
            ease: "power3.out",
          },
          reduceMotion ? ">" : "-=0.15",
        );
    });

    return () => context.revert();
  }, []);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(74,92,255,0.12),_transparent_35%),linear-gradient(180deg,#f8faff_0%,#eef4ff_100%)] px-4 py-8 sm:px-6 lg:py-12">
      {showIntro && (
        <div
          ref={introRef}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#eef4ff]"
          role="status"
          aria-label="Loading booking form"
        >
          <img
            ref={introLogoRef}
            src={LOGO_URL}
            alt="BlueHippo HVAC"
            className="h-auto w-52 object-contain sm:w-64"
          />
        </div>
      )}

      <div ref={pageRef} className="mx-auto max-w-5xl opacity-0">
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

        <BookingForm />
      </div>
    </main>
  );
}

export default Index;
