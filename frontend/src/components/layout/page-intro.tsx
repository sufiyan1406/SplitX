import type { ReactNode } from "react";
import { TextReveal } from "@/components/motion";

export function PageIntro({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="max-w-2xl">
      <p className="meta">{kicker}</p>
      <TextReveal as="h1" text={title} className="font-display mt-3 text-display leading-none" />
      {children ? <div className="mt-5 max-w-xl text-base leading-relaxed text-muted md:text-lg">{children}</div> : null}
    </header>
  );
}
