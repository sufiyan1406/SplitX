# SplitX — Web Frontend ⚡

> **Time-Tokenized Subscription Exchange** · Arbitrum Sepolia

This folder houses the frontend client application for SplitX built with **React 19**, **TanStack Start / Router**, and **Vite**.

For the complete protocol architecture, smart contracts registry, and deployment documentation, refer to the [Root README.md](../README.md).

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server with auto-open
npm run dev

# Build production bundle for Vercel
npm run build
```

---

## 🔑 Environment Variables

Copy `.env.example` to `.env`:

```bash
# Authentication (set to false for mock/hackathon mode)
VITE_AUTH_ENABLED=false

# Optional: Remote backend API URL
# VITE_API_URL=https://your-backend.onrender.com
```

---

## 🛠️ Key Libraries

- **Routing & SSR:** TanStack Start & TanStack Router
- **Styling:** Tailwind CSS v4 + Radix UI Primitives + Custom CSS Glitch Engine
- **Web3:** `viem` + Injected Wallet Connector
- **Typography:** Syne + JetBrains Mono + Outfit
