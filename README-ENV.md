# Environment Variables Configuration

This document lists all required environment variables for the Bookcraft application.

## Authentication (Supabase)

```env
# Supabase Project Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Setup Instructions**: See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for detailed setup guide.

## AI & Content Generation

```env
# OpenAI API for book generation and image creation
OPENAI_API_KEY=your-openai-api-key
```

**Setup Instructions**: See [OPENAI_SETUP.md](./OPENAI_SETUP.md) for detailed setup guide.

## Payment Processing

```env
# Stripe for payment processing
STRIPE_SECRET_KEY=your-stripe-secret-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key

# Stripe Webhook Signature Secret (REQUIRED for /api/stripe/webhook and /api/webhooks/stripe)
# Get this from your Stripe Dashboard → Developers → Webhooks → your endpoint → Signing secret
# Format: whsec_...
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-signing-secret
```

**Setup Instructions**: See [STRIPE_SETUP.md](./STRIPE_SETUP.md) for detailed setup guide.

> ⚠️ **`STRIPE_WEBHOOK_SECRET` is required in production.** Both `/api/stripe/webhook` and `/api/webhooks/stripe` will return HTTP 400 if this variable is missing or the signature is invalid.

## Print & Fulfillment (Lulu API)

```env
# Lulu Print API Configuration
LULU_CLIENT_ID=your-lulu-client-id
LULU_CLIENT_SECRET=your-lulu-client-secret
LULU_API_URL=https://api.sandbox.lulu.com  # or https://api.lulu.com for production
LULU_AUTH_URL=https://api.sandbox.lulu.com/auth/realms/glasstree/protocol/openid-connect/token  # or production equivalent
LULU_WEBHOOK_SECRET=your-webhook-secret-for-hmac-validation

# Environment Selection (development uses sandbox, production uses live)
NODE_ENV=development  # or production
```

**Setup Instructions**: See [LULU_SETUP.md](./LULU_SETUP.md) for detailed setup guide.

## Database

```env
# SQLite Database (default)
DATABASE_URL="file:./dev.db"

# OR PostgreSQL/Supabase Database (optional)
# DATABASE_URL="postgresql://user:password@host:port/database"
```

## Development vs Production

### Development Mode
- **Supabase**: Falls back to mock authentication if credentials not provided
- **OpenAI**: Falls back to placeholder content if API key not provided  
- **Stripe**: Can use test mode with test keys
- **Database**: Uses local SQLite file

### Production Mode
- All environment variables must be properly configured
- Use production keys and credentials
- Database should be hosted (PostgreSQL recommended)

## Environment File Setup

Create a `.env.local` file in your project root:

```env
# Authentication (Supabase)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# AI & Content Generation
OPENAI_API_KEY=sk-...

# Payment Processing
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Database
DATABASE_URL="file:./dev.db"
```

## Apple IAP / StoreKit 2

Required for iOS in-app purchase validation. Set up in App Store Connect under **Users and Access → Integrations → In-App Purchase**.

```env
# Apple App Store Server API (StoreKit 2) — required for iOS IAP validation
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
APPLE_KEY_ID="ABCDE12345"          # Key ID from App Store Connect
APPLE_ISSUER_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # Issuer ID (UUID)
APPLE_BUNDLE_ID="com.bookcraft.app"  # Your app's bundle identifier

# Legacy — keep during transition for old app versions using verifyReceipt
APPLE_SHARED_SECRET="your_shared_secret_here"
```

**Setup steps:**
1. Go to App Store Connect → **Integrations → In-App Purchase**
2. Create or use an existing **API Key** (type: In-App Purchase)
3. Download the `.p8` private key file (only downloadable once!)
4. Copy the contents of the `.p8` file into `APPLE_PRIVATE_KEY` (replace newlines with `\n`)
5. Copy the **Key ID** and **Issuer ID** from the same page

**Notes:**
- `APPLE_PRIVATE_KEY` must be in PEM format with literal `\n` characters (not actual newlines) when stored in environment variables
- The legacy `APPLE_SHARED_SECRET` can be removed once all app clients have updated to StoreKit 2
- Sandbox validation is handled automatically (production is tried first, then sandbox)

## Google Play IAP (Android)

**REQUIRED for Android in-app purchase validation.** Without `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` configured in production, **all Android purchases and subscriptions will be rejected** by the server with `"Receipt validation failed"`.

```env
# Google Play Developer API Service Account — REQUIRED for Android IAP validation
# Full JSON content of the service account key file (single line, no newlines).
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...@...iam.gserviceaccount.com",...}

# Optional — defaults to 'com.bookcraft.app' if missing
GOOGLE_PLAY_PACKAGE_NAME=com.bookcraft.app
```

**Setup steps:**
1. **Google Cloud Console** → create a project linked to your Play Console account
2. **APIs & Services → Library** → enable **Google Play Android Developer API**
3. **IAM & Admin → Service Accounts** → create a new service account (any name, no role needed in GCP)
4. Open the service account → **Keys → Add key → Create new key → JSON** → download the file
5. **Google Play Console** → **Setup → API access** → link the Google Cloud project
6. Find the service account in the list → **Grant access** → permissions:
   - **View financial data, orders, and cancellation survey responses**
   - **Manage orders and subscriptions** (for refunds via API, optional)
7. Copy the entire JSON file content into `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` (must be valid JSON, escape newlines in `private_key` as `\n` if your env-store doesn't preserve them literally)

**Vercel-specific:** paste the JSON as the env-var value directly. Vercel preserves multi-line values. Do NOT wrap in quotes.

**Verification:**
- After deploy, attempt a purchase from a real signed-release APK installed from a Play Store internal-testing track (sideloaded APKs cannot complete IAP)
- Server logs should show `IAP: Purchase validated successfully` instead of `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON not configured`

**Common gotchas:**
- The Google Play product/subscription IDs in the Play Console must match exactly: `com.bookcraft.book.499` / `.999` / `.1499` / `.1999` (one-time) and `com.bookcraft.subscription.pro` (subscription)
- Subscription **base plan IDs** must match the codebase: `montly` (yes, typo) for monthly, `yearly` for yearly — see `src/hooks/useNativeSubscription.ts`
- Products must be **Active** in the Play Console, not Draft

## Verification

After setting up environment variables:

1. **Test Supabase**: Visit `/supabase-test` to verify authentication setup
2. **Test OpenAI**: Try generating a book to verify AI integration
3. **Test Stripe**: Attempt a payment flow (use test mode)
4. **Test Database**: Check if user data persists correctly

## Migration Notes

### From Firebase to Supabase
- ✅ `NEXT_PUBLIC_FIREBASE_*` variables replaced with `NEXT_PUBLIC_SUPABASE_*`
- ✅ `FIREBASE_*` server variables replaced with `SUPABASE_SERVICE_ROLE_KEY`
- ✅ Automatic fallback to mock authentication for development
- 🔄 Some API routes still being migrated

### Legacy Variables (No Longer Used)
```env
# These Firebase variables are no longer needed:
# NEXT_PUBLIC_FIREBASE_API_KEY
# NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN  
# NEXT_PUBLIC_FIREBASE_PROJECT_ID
# NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
# NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
# NEXT_PUBLIC_FIREBASE_APP_ID
# FIREBASE_PROJECT_ID
# FIREBASE_CLIENT_EMAIL
# FIREBASE_PRIVATE_KEY
```