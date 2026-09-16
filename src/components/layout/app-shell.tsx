import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { CustomCursor } from "@/components/motion";
import { TxOverlay } from "@/components/tx/tx-overlay";
import { TxProvider } from "@/components/tx/tx-context";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <TxProvider>
      <CustomCursor />
      <div className="site-grain" aria-hidden />
      <div className="flex min-h-dvh flex-col bg-bg text-fg">
        <Header />
        <div className="flex-1">{children}</div>
        <Footer />
      </div>
      <TxOverlay />
    </TxProvider>
  );
}
