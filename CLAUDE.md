# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bookcraft is an AI-powered book generation platform built with Next.js 15 that allows users to create personalized books using OpenAI's GPT models. The application includes authentication, book management, payment processing (Stripe), and print-on-demand services (Lulu).

## Development Commands

### Essential Commands
- `npm run dev` - Start development server on port 5000 with Turbopack
- `npm run build` - Build for production
- `npm run build:mobile` - Build and sync to Capacitor native apps
- `npm run start` - Start production server on port 5000
- `npm run lint` - Run ESLint
- `npm run test:openai` - Test OpenAI API connection

### Capacitor Mobile App Commands
- `npm run cap:sync` - Sync web assets to native projects
- `npm run cap:open:ios` - Open iOS project in Xcode
- `npm run cap:open:android` - Open Android project in Android Studio
- `npm run cap:add:ios` - Add iOS platform (already configured)
- `npm run cap:add:android` - Add Android platform (already configured)

### Testing Commands
- Use `scripts/test-openai.js` to verify OpenAI API integration
- No formal test suite configured - manual testing via browser

## Architecture

### Core Technologies
- **Framework**: Next.js 15 with App Router and Turbopack
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS with Radix UI components
- **Database**: Supabase (PostgreSQL with real-time features)
- **Authentication**: Supabase Auth
- **AI**: OpenAI GPT API for book generation
- **Payments**: Stripe integration
- **Print Services**: Lulu print-on-demand API
- **Image Storage**: Local file system with planned cloud migration
- **Mobile**: Capacitor for iOS and Android native apps

### Key Directories
```
src/
├── app/                     # Next.js App Router
│   ├── api/                # API routes for backend functionality
│   ├── dashboard/          # User dashboard and book management
│   └── (static pages)/     # Marketing and info pages
├── components/             # React components
│   └── CapacitorProvider.tsx # Native app initialization
├── context/               # React Context providers
├── hooks/                 # Custom React hooks (including useHaptics)
└── lib/                   # Utility libraries and integrations

ios/                         # iOS native project (Capacitor)
android/                     # Android native project (Capacitor)
resources/                   # App icons and splash screens
```

### Important Architecture Patterns

#### ⚠️ i18n Pflicht-Regel (KRITISCH)
**Jeder neue User-facing String MUSS in allen 3 Sprachen eingetragen werden!**
- Datei: `src/lib/translations.ts`
- Sprachen: `en` (English), `de` (Deutsch), `es` (Español)
- Hardcoded Strings im JSX sind ein **Bug** — immer `t('key')` aus `useLanguage()` verwenden
- Gilt für: Buttons, Labels, Alerts, Toasts, Placeholders, Fehlermeldungen — alles was der User sieht
- Bei jedem PR sicherstellen: Alle neuen Keys in EN + DE + ES vorhanden

#### API Architecture
- All API routes use Next.js App Router (`route.ts` files)
- Authentication verified via Supabase JWT tokens
- Book generation creates empty structure first, then AI fills content in editor
- Print jobs handled via Lulu API with webhook integration

#### Database Schema
- Users table managed via Supabase Auth
- Books table stores generated content and metadata
- Print jobs tracked with status updates from Lulu webhooks
- All database operations centralized in `src/lib/supabase-db.ts`

#### Authentication Flow
- Supabase Auth handles user registration/login
- JWT tokens passed in Authorization header
- User profiles auto-created on first book generation
- Mock authentication system available when Supabase not configured

#### Book Generation Workflow

**Normal Books (Text-based):**
1. User creates book request via form
2. API creates empty book structure in database
3. User redirected to editor with AI-powered chapter generation
4. Content saved incrementally as user generates chapters
5. Final book can be exported as PDF or sent to print

**Picture Books (Image-based):**
1. User creates picture book request with configuration (pages, style, etc.)
2. API creates book structure and triggers n8n workflow
3. n8n workflow generates images via OpenAI DALL-E
4. Live-preview shows images in real-time as they are generated
5. Completed picture book can be edited and exported

### Environment Configuration

Required environment variables:
```env
# Supabase (Required for production)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# OpenAI (Required)
OPENAI_API_KEY=

# Stripe (Optional)
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Lulu Print (Optional)
LULU_CLIENT_ID=
LULU_CLIENT_SECRET=
LULU_WEBHOOK_SECRET=

# n8n Integration (Required for automated book generation)
N8N_PICTUREBOOK_WEBHOOK_URL=
N8N_WEBHOOK_SECRET=
NEXT_PUBLIC_APP_URL=
```

### Development Notes

#### Replit Configuration
- Application configured to run on port 5000
- Next.config.ts includes headers for Replit proxy environment
- Uses `0.0.0.0` binding for external access

#### Error Handling
- Graceful degradation when services unavailable
- Mock modes for Supabase and payment systems
- Console logging for debugging service connections

#### Code Style
- ESLint configured with Next.js and TypeScript rules
- Strict TypeScript enabled but `any` warnings downgraded for development
- Path aliases configured (`@/*` maps to `src/*`)

## Common Development Tasks

### Adding New API Routes
- Create `route.ts` files in `src/app/api/`
- Import authentication helpers from `src/lib/supabase-admin.ts`
- Use `SupabaseDB` class for database operations

### Integrating New AI Features
- OpenAI client configured in API routes
- Image generation uses separate endpoints
- Cost tracking implemented for API usage

### Database Operations
- Use `SupabaseDB` class methods in `src/lib/supabase-db.ts`
- User profile management via `src/lib/user-profile.ts`
- All database operations include proper error handling

### Print Integration
- Lulu API client in `src/lib/lulu-api.ts`
- PDF generation via jsPDF in `src/lib/lulu-pdf-generator.ts`
- Webhook handling for print job status updates
- `BookOrderComponent` handles the complete ordering workflow
- `PrintJobStatus` component shows real-time order tracking
- Integration in book editor via dedicated "Order Print" tab

### Frontend Print Integration
- Print ordering integrated directly in book editor (`/dashboard/books/[id]`)
- Print job status dashboard on main dashboard page
- Order buttons appear only for completed books
- Real-time order tracking with webhook status updates

### Adding New Pages
- Use `src/components/DashboardLayout.tsx` for authenticated pages
- Marketing pages use standard Next.js page structure
- Forms use React Hook Form with Zod validation

## n8n Workflow Integration

### Overview
Bookcraft uses n8n for automated book generation workflows, particularly for picture books. The integration uses webhooks for bidirectional communication.

### Picture Book Generation Workflow

**Components:**
- **Trigger API**: `/api/picturebook/generate` - Starts the workflow
- **Webhook Handler**: `/api/webhooks/n8n/book-status` - Receives status updates
- **Live Preview**: `/components/PictureBookGenerationLivePreview.tsx` - Real-time UI
- **Job Status Page**: `/dashboard/jobs/[jobId]` - User-facing progress page

**Flow:**
1. User submits picture book creation form
2. API creates book record and generation job in database
3. API triggers n8n workflow via webhook
4. n8n workflow:
   - Generates story structure and image descriptions
   - Sends initial config to webhook (pictureBookConfig)
   - Loops through all images:
     - Generates image via DALL-E
     - Uploads to CDN
     - Sends image update to webhook (image object)
   - Sends completion status
5. Live preview polls job status every 2 seconds
6. UI displays images in real-time as they arrive
7. Upon completion, user is redirected to editor

### Webhook Payload Structure

**Initial Configuration:**
```json
{
  "jobId": "uuid",
  "status": "processing",
  "progress": 0,
  "currentStep": "Generating picture book structure...",
  "pictureBookConfig": {
    "pages": [
      {
        "pageIndex": 0,
        "text": "Page text...",
        "panels": [
          { "panelIndex": 0, "description": "Image description..." }
        ]
      }
    ]
  }
}
```

**Image Update (sent after each generated image):**
```json
{
  "jobId": "uuid",
  "status": "processing",
  "progress": 25,
  "currentStep": "Generating image 3 of 12...",
  "image": {
    "pageIndex": 0,
    "panelIndex": 0,
    "imageUrl": "https://cdn.example.com/image.png",
    "description": "Optional description"
  }
}
```

**Completion:**
```json
{
  "jobId": "uuid",
  "status": "completed",
  "progress": 100,
  "currentStep": "Picture book successfully generated!"
}
```

### Live Preview Features

The picture book live preview provides:

1. **Real-time Image Feed**: Images appear as they're generated (2-second polling)
2. **New Image Animations**:
   - Green border and ring effect
   - "NEW!" badge with bounce animation
   - Scale effect for 3 seconds
3. **Progress Tracking**:
   - Overall percentage
   - Visual progress bar
   - Individual indicators per image
4. **Structured Layout**:
   - Grouped by pages
   - Optional page text display
   - Panel descriptions under images
5. **Responsive Grid**: Adapts to 1, 2, or 4 images per page

### Image Storage Architecture

**Flat Array Storage:**
```javascript
// Images stored as flat array in database
flatIndex = pageIndex * imagesPerPage + panelIndex

// Examples:
// 1 image/page: Page 0 Panel 0 → index 0, Page 1 Panel 0 → index 1
// 2 images/page: Page 0 Panel 0 → index 0, Page 0 Panel 1 → index 1
// 4 images/page: Page 0 Panel 0 → index 0, Page 0 Panel 3 → index 3
```

### Book Type Detection

The system automatically detects book type and shows appropriate live preview:

- **`book_type === 'picture'`**: Uses `PictureBookGenerationLivePreview`
- **`book_type !== 'picture'`**: Uses `BookGenerationLivePreview` (text chapters)

### Testing n8n Integration

1. Create a picture book via `/dashboard/create/picture`
2. Monitor backend logs: `Live-updated book [bookId] with image at page X, panel Y`
3. Open job status page: `/dashboard/jobs/[jobId]`
4. Verify real-time image updates
5. Check completion redirect to editor

### Documentation References

- **Full n8n Integration Guide**: `n8n-workflows/PICTUREBOOK_LIVE_PREVIEW.md`
- **Workflow JSON**: `n8n-workflows/picturebook-generation-workflow.json`
- **Setup Instructions**: `n8n-workflows/PICTUREBOOK_WORKFLOW_README.md`

### Common Issues

**Images not appearing in live preview:**
- Check webhook secret is configured correctly
- Verify n8n is sending correct pageIndex/panelIndex
- Check backend logs for webhook errors
- Ensure imageUrl is publicly accessible

**Progress not updating:**
- Verify 2-second polling is active (check browser network tab)
- Check job status API returns correct book_type
- Ensure token is valid and not expired## Capacitor Mobile App Integration

### Overview

Bookcraft is configured as a **hybrid mobile app** using Capacitor. The mobile apps (iOS & Android) run the Next.js web application in a native WebView, allowing access to native device features while maintaining all backend functionality.

### Architecture

**Hybrid Approach:**
- Web server runs normally with all API routes and SSR
- Native apps connect to the web server URL
- Native plugins provide device features (Haptics, Status Bar, Keyboard)

**Benefits:**
- Keep all backend logic (OpenAI, Supabase, Stripe)
- Native app distribution via App Stores
- Access to native device capabilities
- Single codebase for web and mobile

### Configuration Files

- **`capacitor.config.ts`**: Main Capacitor configuration
- **`ios/`**: iOS native project (Xcode)
- **`android/`**: Android native project (Android Studio)
- **`resources/`**: App icons and splash screens

### Development Workflow

**1. Start Next.js Server**
```bash
npm run dev
```

**2. Update Server URL in `capacitor.config.ts`**
```typescript
server: {
  url: 'http://YOUR_LOCAL_IP:5000',  // Replace with your IP
  cleartext: true,
}
```

**3. Sync Changes**
```bash
npm run cap:sync
```

**4. Open Native IDE**
```bash
npm run cap:open:ios      # For iOS (macOS only)
npm run cap:open:android  # For Android
```

**5. Run on Device/Simulator**
- Click play button in Xcode or Android Studio

### Native Features

**Available Plugins:**
- `@capacitor/app` - App state, back button handling
- `@capacitor/status-bar` - Status bar styling
- `@capacitor/keyboard` - Keyboard management
- `@capacitor/haptics` - Haptic feedback

**Usage Example:**
```tsx
import { useHaptics } from '@/hooks/useHaptics'

function MyButton() {
  const { impact } = useHaptics()

  return (
    <button onClick={() => {
      impact('medium')  // Haptic feedback
      // your action
    }}>
      Click me
    </button>
  )
}
```

**Platform Detection:**
```tsx
import { Capacitor } from '@capacitor/core'

if (Capacitor.isNativePlatform()) {
  console.log('Running in native app')
  console.log('Platform:', Capacitor.getPlatform()) // 'ios' or 'android'
}
```

### Mobile-Specific UI Features

**Safe Area Insets (iOS Notch/Dynamic Island):**
```tsx
<div className="safe-area-top">
  Content respects safe areas
</div>
```

**Touch-Friendly Buttons:**
```tsx
<button className="touch-target">
  Minimum 44x44px touch area
</button>
```

**iOS Smooth Scrolling:**
```tsx
<div className="ios-scroll">
  Scrollable content
</div>
```

### Build & Deploy

**iOS App Store:**
1. `npm run build:mobile`
2. `npm run cap:open:ios`
3. Product → Archive in Xcode
4. Distribute to App Store Connect

**Google Play Store:**
1. `npm run build:mobile`
2. `npm run cap:open:android`
3. Build → Generate Signed Bundle
4. Upload AAB to Play Console

See **`CAPACITOR_SETUP.md`** for complete deployment guide.

### Environment Variables

For mobile apps, ensure `NEXT_PUBLIC_APP_URL` is set:

```env
# Development (local network)
NEXT_PUBLIC_APP_URL=http://192.168.1.100:5000

# Production (deployed server)
NEXT_PUBLIC_APP_URL=https://bookcraft.com
```

### Testing

**Development:**
- Use local network IP for `server.url`
- Ensure firewall allows connections
- Mobile device must be on same WiFi network

**Production:**
- Point to production URL
- Ensure HTTPS is configured
- Test all API endpoints work remotely

### Common Issues

**Blank screen in mobile app:**
- Check `capacitor.config.ts` server URL
- Verify development server is running
- Check firewall settings
- Test URL in mobile browser first

**Cannot connect to API:**
- Ensure CORS is configured
- Check network connectivity
- Verify API routes are accessible remotely
- Check environment variables

**Native plugins not working:**
- Run `npm run cap:sync` after installing plugins
- Rebuild app in Xcode/Android Studio
- Check plugin is imported correctly

### Documentation

Complete mobile app setup guide: **`CAPACITOR_SETUP.md`**

Key topics:
- Prerequisites (Xcode, Android Studio)
- Development setup
- Icon generation
- Building for production
- App Store submission
- Troubleshooting

---

# 🤖 Agent Team (Beyerdigital)

Claude Code liest diese Datei automatisch. Rico ist der Orchestrator und delegiert via `Task` Tool.

## 🏗️ Rico — Orchestrator (Lead Architect)
**Du bist Rico, Lead Architect für Bookcraft.**

Bei komplexen Tasks analysierst du zuerst, dann delegierst du:
- **Frontend** → Nova via Task Tool
- **Backend/API/DB** → Axel via Task Tool
- **Code Review** → Rexx via Task Tool (nach Nova/Axel)
- **Testing** → Tess via Task Tool (nach Rexx-Approval)
- Parallele Tasks wo möglich
- Ergebnisse zusammenführen, Build-Check, PR erstellen

Wann du NICHT delegierst: Triviale 1-Zeiler → direkt selbst erledigen.

## ✨ Nova — Frontend
**React, Next.js Pages, Tailwind CSS, UI/UX, Animationen, Mobile-Responsive**
- Primärfarben: #3E86D7 → #7B4AE8 Gradient
- Keine Emojis in der UI
- Mobile first
- Kein Backend-Code (kein `/api/`, kein Supabase direkt)

## ⚙️ Axel — Backend
**API Routes (`app/api/`), Supabase, OpenAI, Stripe, Lulu, Auth, Middleware**
- Image Gen: Primary `gpt-image-1.5` (quality: "high", b64_json), Fallback DALL-E 3
- DALL-E 3 URLs laufen ab → IMMER b64 in Supabase speichern!
- Kein UI-Code (kein CSS, kein Tailwind)

## 🔍 Rexx — Code Reviewer
**Review nach jedem Feature — Security, Performance, TypeScript, Patterns**
- Kein `any`, kein `@ts-ignore`, keine API Keys im Code
- RLS bei neuen Supabase Tables prüfen
- Output: ✅ Approve oder ⚠️ Changes requested (konkrete Fixes)
- Schreibt KEINEN Code — nur Reviews

## ⚖️ Lex — Legal Expert
**Zuständig für:** DSGVO, Impressum, AGB, Cookie-Consent, Datenschutzerklärungen, Vertragsrecht, SaaS-Recht
**Expertise:** Deutsches Recht, EU-Recht (DSGVO, DSA, AI Act), E-Commerce- & App-Recht
**Wann einsetzen:** Neue Features mit Datenschutz-Relevanz, Rechtstexte, Cookie-Implementierungen, Stripe/Zahlungen, neue Datenverarbeitungen
**Output:** Rechtliche Einschätzung + konkrete Handlungsempfehlungen
**Kein Anwalt** — Empfehlungen, keine Rechtsberatung im juristischen Sinne.

## 🧪 Tess — QA Tester
**Test-Szenarien, Unit Tests (`*.test.ts`), API-Route Tests, Smoke Tests**
- Test-Prioritäten: Book Generation → Auth → Stripe → Images → Mobile
- Happy Path + Edge Cases + Error Cases
- Regressions identifizieren
- Deployt NICHTS — nur testen und Bugs reporten

## 🔄 Vollständiger Workflow
```
Rico analysiert
  ↓
Nova (Frontend) + Axel (Backend) — parallel
  ↓
Rexx reviewed
  ↓
Nova/Axel fixen Findings
  ↓
Tess testet
  ↓
npm run build ✅ → PR → Vercel grün ✅
```

## ⚠️ Zero Tolerance (ALLE Agents)
```bash
git config user.name "Julezbeyer"
git config user.email "123315753+Julezbeyer@users.noreply.github.com"
```
- Falshe Git-Identity → NICHT committen
- Roter Vercel-Build → NICHT "done" melden
- `npm run build` überspringen → VERBOTEN
