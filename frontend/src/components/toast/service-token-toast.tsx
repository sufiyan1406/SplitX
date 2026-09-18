"use client";

import { getService, unitLabel } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { Check, Copy, ExternalLink, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export interface ServiceTokenToastProps {
  serviceId: string;
  duration: number;
  unit: string;
  tokenId?: number;
  toastId: string | number;
}

const SERVICE_META: Record<
  string,
  {
    brandColor: string;
    brandBg: string;
    shortName: string;
    iconSvg: React.ReactNode;
    codePrefix: string;
  }
> = {
  netflix: {
    brandColor: "#ef233c",
    brandBg: "rgba(239, 35, 60, 0.15)",
    shortName: "Netflix",
    codePrefix: "NFLX",
    iconSvg: (
      <svg viewBox="0 0 24 24" className="size-6 fill-current" aria-label="Netflix">
        <path d="M4 2v20l4-2.5V4.5L16 19.5V2l4-2v20l-4 2.5V7.5L8 22V2H4z" fill="#ef233c" />
      </svg>
    ),
  },
  spotify: {
    brandColor: "#1db954",
    brandBg: "rgba(29, 185, 84, 0.15)",
    shortName: "Spotify",
    codePrefix: "SPOT",
    iconSvg: (
      <svg viewBox="0 0 24 24" className="size-6 fill-current text-[#1db954]" aria-label="Spotify">
        <circle cx="12" cy="12" r="10" fill="#1db954" opacity="0.2" />
        <path
          d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424a.627.627 0 0 1-.86.208c-2.355-1.439-5.32-1.764-8.814-.966a.626.626 0 1 1-.28-1.222c3.824-.875 7.1-.508 9.746 1.118a.627.627 0 0 1 .208.862zm1.226-2.724a.784.784 0 0 1-1.077.258c-2.695-1.657-6.804-2.137-9.992-1.168a.785.785 0 1 1-.457-1.5c3.64-1.106 8.188-.574 11.268 1.332a.784.784 0 0 1 .258 1.078zm.105-2.835C14.692 8.94 9.38 8.762 6.3 9.697a.942.942 0 1 1-.55-1.802c3.535-1.074 9.404-.863 13.125 1.348a.942.942 0 0 1-1 1.624l.042-.002z"
          fill="#1db954"
        />
      </svg>
    ),
  },
  "ai-api": {
    brandColor: "#06b6d4",
    brandBg: "rgba(6, 182, 212, 0.15)",
    shortName: "Cortex AI",
    codePrefix: "CRTX",
    iconSvg: (
      <svg viewBox="0 0 24 24" className="size-6 text-[#06b6d4]" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2a4 4 0 0 0-4 4c0 1.5.8 2.8 2 3.5V14h4V9.5c1.2-.7 2-2 2-3.5a4 4 0 0 0-4-4z" />
        <path d="M9 18h6" />
        <path d="M10 22h4" />
      </svg>
    ),
  },
  nimbus: {
    brandColor: "#3b82f6",
    brandBg: "rgba(59, 130, 246, 0.15)",
    shortName: "Nimbus Cloud",
    codePrefix: "NMBS",
    iconSvg: (
      <svg viewBox="0 0 24 24" className="size-6 text-[#3b82f6]" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
      </svg>
    ),
  },
  lumen: {
    brandColor: "#f59e0b",
    brandBg: "rgba(245, 158, 11, 0.15)",
    shortName: "Lumen",
    codePrefix: "LUMN",
    iconSvg: (
      <svg viewBox="0 0 24 24" className="size-6 text-[#f59e0b]" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
      </svg>
    ),
  },
  forge: {
    brandColor: "#f97316",
    brandBg: "rgba(249, 115, 22, 0.15)",
    shortName: "Forge",
    codePrefix: "FORG",
    iconSvg: (
      <svg viewBox="0 0 24 24" className="size-6 text-[#f97316]" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
  },
  apex: {
    brandColor: "#ef4444",
    brandBg: "rgba(239, 68, 68, 0.15)",
    shortName: "Apex Game Pass",
    codePrefix: "APEX",
    iconSvg: (
      <svg viewBox="0 0 24 24" className="size-6 text-[#ef4444]" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
};

export function generateServiceToken(serviceId: string, tokenId?: number): string {
  const meta = SERVICE_META[serviceId];
  const prefix = meta?.codePrefix ?? serviceId.toUpperCase().slice(0, 4);
  const tokenStr = tokenId ? String(tokenId).padStart(3, "0") : "001";
  const segment1 = Math.floor(1000 + Math.random() * 9000);
  const segment2 = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-SPLX-${tokenStr}-${segment1}-${segment2}`;
}

export function ServiceTokenToastView({
  serviceId,
  duration,
  unit,
  tokenId,
  toastId,
}: ServiceTokenToastProps) {
  const service = getService(serviceId);
  const meta = SERVICE_META[serviceId] ?? {
    brandColor: "#ef233c",
    brandBg: "rgba(239, 35, 60, 0.15)",
    shortName: service?.name ?? "Service",
    codePrefix: "SPLX",
    iconSvg: <Sparkles className="size-5 text-hot" />,
  };

  const [tokenKey] = useState(() => generateServiceToken(serviceId, tokenId));
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(tokenKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2400);
  };

  return (
    <div
      className="relative w-full max-w-[420px] border border-line bg-surface/95 p-4 shadow-2xl backdrop-blur-xl transition-all font-sans"
      style={{
        borderLeft: `3px solid ${meta.brandColor}`,
        boxShadow: `0 10px 30px -10px ${meta.brandBg}, 0 20px 40px -15px rgba(0,0,0,0.9)`,
      }}
    >
      {/* Top micro-bar */}
      <div className="flex items-center justify-between pb-2.5 border-b border-line/60">
        <div className="flex items-center gap-2">
          <span
            className="size-2 rounded-full animate-pulse"
            style={{ backgroundColor: meta.brandColor }}
          />
          <span className="font-mono text-[10px] tracking-wider uppercase text-muted">
            Subscription Access Granted
          </span>
        </div>
        <button
          type="button"
          onClick={() => toast.dismiss(toastId)}
          className="text-muted hover:text-fg transition-colors p-1"
          aria-label="Dismiss toast"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {/* Main headline and graphic card */}
      <div className="mt-3 flex items-center gap-3">
        <div
          className="relative size-12 shrink-0 border border-line/80 flex items-center justify-center overflow-hidden"
          style={{ backgroundColor: meta.brandBg }}
        >
          {service?.image && (
            <img
              src={service.image}
              alt=""
              className="absolute inset-0 size-full object-cover opacity-40 mix-blend-luminosity"
            />
          )}
          <div className="relative z-1">{meta.iconSvg}</div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-fg leading-tight">
            This is your {meta.shortName} token to use on the platform
          </p>
          <p className="mt-1 font-mono text-[11px] text-muted">
            <span className="text-hot font-medium">{unitLabel(unit as any, duration)}</span> unlocked
            {tokenId && <span> · NFT #{tokenId}</span>}
          </p>
        </div>
      </div>

      {/* Token Box */}
      <div className="mt-3 flex items-center justify-between gap-2 border border-line/90 bg-bg-deep p-2">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[9px] uppercase tracking-widest text-faint">Platform Token Key</p>
          <p className="truncate font-mono text-xs font-semibold text-fg tracking-wide select-all">
            {tokenKey}
          </p>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            "pill px-2.5 py-1 text-[11px] font-mono shrink-0 transition-all",
            copied ? "bg-ok/20 border-ok text-ok" : "border-line hover:border-hot text-fg",
          )}
        >
          {copied ? (
            <span className="inline-flex items-center gap-1">
              <Check className="size-3" /> Copied!
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <Copy className="size-3" /> Copy
            </span>
          )}
        </button>
      </div>

      {/* Footer link to assets */}
      <div className="mt-3 flex items-center justify-between pt-2 border-t border-line/40 text-[11px]">
        <span className="font-mono text-[10px] text-faint">Ready to redeem</span>
        {tokenId && (
          <a
            href={`/assets/${tokenId}`}
            onClick={() => toast.dismiss(toastId)}
            className="inline-flex items-center gap-1 font-medium text-hot hover:underline"
          >
            View in My Assets <ExternalLink className="size-3" />
          </a>
        )}
      </div>
    </div>
  );
}

export function showServiceTokenToast(params: {
  serviceId: string;
  duration: number;
  unit: string;
  tokenId?: number;
}) {
  toast.custom(
    (id) => (
      <ServiceTokenToastView
        serviceId={params.serviceId}
        duration={params.duration}
        unit={params.unit}
        tokenId={params.tokenId}
        toastId={id}
      />
    ),
    {
      duration: 12000,
    },
  );
}
