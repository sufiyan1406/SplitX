import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { PageTransition } from "@/components/layout/page-transition";
import { ParallaxTypography } from "@/components/layout/parallax-typography";
import { SmoothScroll } from "@/components/layout/smooth-scroll";
import { TxOverlay } from "@/components/tx/tx-overlay";
import { TxProvider } from "@/components/tx/tx-context";
import { ModeProvider } from "@/lib/mode-context";
import { Toaster } from "sonner";
import "sonner/dist/styles.css";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <TxProvider>
      <ModeProvider>
        <SmoothScroll />
        <ParallaxTypography />
        <div className="site-grain" aria-hidden />
        <div className="relative z-1 flex min-h-dvh flex-col bg-transparent text-fg">
          <Header />
          <div className="flex-1">
            <PageTransition>{children}</PageTransition>
          </div>
          <Footer />
        </div>
        <TxOverlay />
        <Toaster
          position="top-right"
          theme="dark"
          toastOptions={{
            className: "!bg-transparent !p-0 !border-0 !shadow-none",
          }}
        />
      </ModeProvider>
    </TxProvider>
  );
}
