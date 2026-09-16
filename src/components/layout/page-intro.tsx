import type { ReactNode } from "react";

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
      <h1 className="font-display mt-3 text-display leading-none">{title}</h1>
      {children ? <div className="mt-5 max-w-xl text-base leading-relaxed text-muted md:text-lg">{children}</div> : null}
    </header>
  );
}
