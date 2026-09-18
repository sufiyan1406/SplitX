import { useEffect, useState } from "react";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function remainingInDay() {
  const now = new Date();
  const end = new Date(now);
  end.setHours(24, 0, 0, 0);
  const ms = Math.max(0, end.getTime() - now.getTime());
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function RemainderClock({ className }: { className?: string }) {
  const [t, setT] = useState<string | null>(null);

  useEffect(() => {
    setT(remainingInDay());
    const id = window.setInterval(() => setT(remainingInDay()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <p className={className}>
      <span className="meta mr-2 hidden xl:inline">Day remainder</span>
      <time className="tabular-nums text-xs tracking-wide text-muted" dateTime={t ?? undefined}>
        {t ?? "——:——:——"}
      </time>
    </p>
  );
}
