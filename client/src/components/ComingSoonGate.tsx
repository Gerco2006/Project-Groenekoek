import { useState, useEffect, type ReactNode } from "react";

// ─── Configuratie ────────────────────────────────────────────────
// Pas hier de instellingen aan:
const COMING_SOON_CONFIG = {
  enabled: true,                          // false = gate uitgeschakeld (voor na release)
  launchDate: new Date("2026-09-01T12:00:00"),  // Doeldatum voor de countdown
  accessCode: "TRAVNL2025",               // URL-parameter: website.nl/?preview=TRAVNL2025
};
// ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = "travnl-preview-access";

function getInitialAccess(): boolean {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("preview");
  if (code === COMING_SOON_CONFIG.accessCode) {
    localStorage.setItem(STORAGE_KEY, "true");
    const url = new URL(window.location.href);
    url.searchParams.delete("preview");
    window.history.replaceState({}, "", url.toString());
    return true;
  }
  return localStorage.getItem(STORAGE_KEY) === "true";
}

function useCountdown(target: Date) {
  const calc = () => {
    const diff = target.getTime() - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };
    const days = Math.floor(diff / 86_400_000);
    const hours = Math.floor((diff % 86_400_000) / 3_600_000);
    const minutes = Math.floor((diff % 3_600_000) / 60_000);
    const seconds = Math.floor((diff % 60_000) / 1_000);
    return { days, hours, minutes, seconds, done: false };
  };

  const [time, setTime] = useState(calc);

  useEffect(() => {
    const id = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(id);
  }, []);

  return time;
}

function CountdownBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 flex-1 sm:flex-none">
      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-md px-2 py-2 sm:px-4 sm:py-3 w-full sm:min-w-[72px] text-center">
        <span className="text-2xl sm:text-4xl font-bold text-white tabular-nums">
          {String(value).padStart(2, "0")}
        </span>
      </div>
      <span className="text-[10px] sm:text-xs text-white/60 uppercase tracking-widest">{label}</span>
    </div>
  );
}

function ComingSoonPage() {
  const { days, hours, minutes, seconds, done } = useCountdown(COMING_SOON_CONFIG.launchDate);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0f172a] px-6"
      data-testid="screen-coming-soon"
    >
      {/* Subtiele achtergrondgradiënt */}
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, #1d4ed8 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center text-center max-w-md w-full gap-8">
        {/* Logo + naam */}
        <div className="flex flex-col items-center gap-4">
          <img
            src="/travnl-logo.png"
            alt="TravNL"
            className="w-20 h-20 rounded-2xl object-cover shadow-2xl"
            data-testid="img-coming-soon-logo"
          />
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              TravNL
            </h1>
            <p className="text-white/50 text-sm mt-1 tracking-wide uppercase">
              De open-source reisplanner
            </p>
          </div>
        </div>

        {/* Hoofdboodschap */}
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-semibold text-white">
            Binnenkort beschikbaar
          </h2>
          <p className="text-white/70 text-sm sm:text-base leading-relaxed">
            TravNL lanceert binnenkort in <span className="text-blue-400 font-medium">Beta</span>.
            We zijn hard bezig met de laatste hand leggen aan de app.
          </p>
        </div>

        {/* Countdown of klaar-boodschap */}
        {done ? (
          <div className="bg-blue-500/20 border border-blue-400/30 rounded-lg px-6 py-4 text-blue-300 font-semibold text-lg">
            Beschikbaar!
          </div>
        ) : (
          <div
            className="flex items-start gap-1.5 sm:gap-4 w-full max-w-xs sm:max-w-none sm:w-auto"
            data-testid="container-countdown"
          >
            <CountdownBlock value={days} label="dagen" />
            <span className="text-white/40 text-xl sm:text-3xl font-light mt-2 sm:mt-3 shrink-0">:</span>
            <CountdownBlock value={hours} label="uur" />
            <span className="text-white/40 text-xl sm:text-3xl font-light mt-2 sm:mt-3 shrink-0">:</span>
            <CountdownBlock value={minutes} label="min" />
            <span className="text-white/40 text-xl sm:text-3xl font-light mt-2 sm:mt-3 shrink-0">:</span>
            <CountdownBlock value={seconds} label="sec" />
          </div>
        )}

        {/* Kleine voetnoot */}
        <p className="text-white/30 text-xs">
          © 2025–2026 TravNL · Gemaakt met de NS API
        </p>
      </div>
    </div>
  );
}

export function ComingSoonGate({ children }: { children: ReactNode }) {
  const [hasAccess] = useState<boolean>(getInitialAccess);

  if (!COMING_SOON_CONFIG.enabled || hasAccess) {
    return <>{children}</>;
  }

  return <ComingSoonPage />;
}
