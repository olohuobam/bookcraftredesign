# Bookcraft

KI-gestützte Buchgenerierungsplattform — Text- und Fotobücher erstellen, exportieren & kaufen.

## Stack

- **Next.js 15** + TypeScript + Tailwind CSS + shadcn/ui
- **Supabase** — Auth, PostgreSQL, Storage
- **OpenAI** — Buchgenerierung (GPT-4o) + Cover-Erstellung (gpt-image-2)
- **Stripe** — Digitalkauf + Abonnements
- **Capacitor** — iOS & Android App (via Codemagic CI)

## Setup

```bash
npm install
cp .env.example .env.local  # Werte aus README-ENV.md eintragen
npm run dev
```

## Wichtige Scripts

| Command | Beschreibung |
|---|---|
| `npm run dev` | Dev-Server (localhost:3000) |
| `npm run build` | Production Build |
| `npm test` | Vitest Unit Tests |
| `npm run test:e2e` | Playwright E2E Tests |
| `npm run build:mobile` | Capacitor Build (iOS/Android) |
| `npm run cap:sync` | Capacitor Sync nach Build |

## Projektstruktur

```
src/
├── app/          # Next.js App Router + API Routes
├── components/   # React Komponenten
├── lib/          # Utilities, Supabase Client, Stripe
└── types/        # TypeScript Typen

supabase/
└── migrations/   # DB Migrations (Supabase CLI)

android/ ios/     # Capacitor Mobile Apps
```

## Mobile (Capacitor)

iOS & Android werden über **Codemagic** gebaut. Konfiguration in `codemagic.yaml`.

```bash
npm run cap:sync   # Nach jedem Build
```

## Docs

- [Environment Variables](./README-ENV.md)
- [Lulu Print-on-Demand](./Luludocumentation.md)
