import { PageIntro } from "@/components/layout/page-intro";
import { Magnetic, Reveal } from "@/components/motion";
import { SERVICES, unitLabel } from "@/lib/catalog";
import { formatEthDisplay } from "@/lib/eth";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/buy")({ component: BuyPage });

function BuyPage() {
  return (
    <main className="mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-16">
      <Reveal>
        <PageIntro kicker="Primary market" title="Buy a window, not a month.">
          Choose a service, pick a duration, pay only for the access you will actually use.
        </PageIntro>
      </Reveal>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map((s, i) => (
          <Reveal key={s.id} delay={i * 50}>
            <article className="flex h-full flex-col overflow-hidden border border-line bg-surface">
              <Link to="/buy/$serviceId" params={{ serviceId: s.id }} className="block">
                <div className="duotone aspect-4/3">
                  <img src={s.image} alt="" />
                </div>
                <div className="p-5">
                  <p className="meta">{s.category}</p>
                  <h2 className="mt-2 text-lg font-medium leading-snug">{s.name}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{s.blurb}</p>
                  <p className="mt-4 text-sm text-fg">
                    Package {unitLabel(s.unit, s.packageDuration)} · {formatEthDisplay(s.packagePriceEth)}
                  </p>
                  <p className="meta mt-2">Mock provider · {s.provider}</p>
                </div>
              </Link>
              <div className="mt-auto px-5 pb-5">
                <Magnetic>
                  <Link to="/buy/$serviceId" params={{ serviceId: s.id }} className="pill pill-solid w-full">
                    Buy access
                  </Link>
                </Magnetic>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </main>
  );
}
