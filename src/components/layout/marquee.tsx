import { SERVICES } from "@/lib/catalog";

export function ServiceMarquee() {
  const items = [...SERVICES, ...SERVICES];
  return (
    <div className="marquee" aria-hidden>
      <div className="marquee-track">
        {items.map((s, i) => (
          <span key={`${s.id}-${i}`} className="marquee-item">
            {s.name}
            <span className="text-accent">/</span>
            {s.category}
          </span>
        ))}
      </div>
    </div>
  );
}
