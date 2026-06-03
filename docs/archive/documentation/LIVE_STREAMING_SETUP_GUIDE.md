# 🚀 Live Book Generation - Complete Setup Guide

## Quick Start (5 Minutes)

### 1. Import n8n Workflow

```bash
# 1. Open n8n
# 2. Go to: Workflows → Import from File
# 3. Select: n8n-workflows/book-live-streaming-workflow.json
# 4. Click "Import"
```

### 2. Configure Supabase Credentials

In n8n Workflow:
1. Click on any "DB: ..." node
2. Click "Credentials"
3. Select your existing "Bookcraft" Supabase credentials
4. If not exists, create new:
   - **Name**: Bookcraft
   - **Host**: `your-project.supabase.co`
   - **Service Role Key**: From Supabase Dashboard → Settings → API

### 3. Set Environment Variables

Add to your `.env` file:

```bash
# n8n Webhook URLs
N8N_BOOK_LIVE_WEBHOOK_URL=https://your-n8n-instance.com/webhook/book-live-generation-start
N8N_WEBHOOK_SECRET=Bookcraft2025vonBeyerdigital!1234321

# OpenAI API Key (required)
OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE

# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App URL (for callbacks)
NEXT_PUBLIC_APP_URL=https://your-app.com
```

### 4. Activate n8n Workflow

In n8n:
1. Click "Active" toggle (top right)
2. Verify webhook is active: `GET https://your-n8n/webhook-test/book-live-generation-start`
3. Should return: 404 (POST required) ← This is correct!

### 5. Test the System

```bash
# Terminal 1: Start your app
npm run dev

# Terminal 2: Test with curl
curl -X POST http://localhost:5000/api/ai-config-generator \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"userPrompt": "Ein Fantasy-Roman über Magie"}'
```

**Expected Response:**
```json
{
  "success": true,
  "config": {
    "title": "...",
    "genre": "Fantasy",
    ...
  }
}
```

---

## Detailed Setup

### Step 1: n8n Workflow Configuration

#### 1.1 Import Workflow

```bash
# File: n8n-workflows/book-live-streaming-workflow.json
# Contains: 33 nodes, fully configured workflow
```

**Import Steps:**
1. Open n8n web interface
2. Click "Workflows" (left sidebar)
3. Click "Import from File"
4. Select `book-live-streaming-workflow.json`
5. Click "Import"

#### 1.2 Verify Webhook Path

**Node: "Webhook Start"**
- Path: `book-live-generation-start`
- Method: POST
- Response Mode: "Using 'Respond to Webhook' node"

**Test URL:**
```
https://your-n8n-instance.com/webhook/book-live-generation-start
```

#### 1.3 Configure All "DB: ..." Nodes

**Nodes to configure (7 total):**
1. DB: Update Progress
2. DB: Get Book
3. DB: Save Book
4. DB: Finalize Job
5. DB: Mark Book Complete
6. DB: Job 100% Complete

**For each node:**
1. Click node
2. Click "Credential to connect with"
3. Select "Bookcraft" (or create new)
4. Save

#### 1.4 Set Webhook Secret

**Nodes to update (6 total):**
1. Status Update: Start
2. Live-Preview: Outline Done
3. Live-Preview: KeyEvent Writing
4. 🌟 Stream Text Chunk
5. Live-Preview: KeyEvent Done
6. 🌟 Live-Preview: Chapter Complete
7. Live-Preview: BOOK COMPLETE!

**In each node:**
```javascript
// Find this line in the header parameters:
"value": "={{ $env.N8N_WEBHOOK_SECRET || 'Bookcraft2025vonBeyerdigital!1234321' }}"

// Make sure it matches your .env:
N8N_WEBHOOK_SECRET=Bookcraft2025vonBeyerdigital!1234321
```

**Or set as n8n environment variable:**
```bash
# In your n8n instance
export N8N_WEBHOOK_SECRET=Bookcraft2025vonBeyerdigital!1234321
```

#### 1.5 Set OpenAI API Key

**Nodes to update (2 total):**
1. Generate Book Outline
2. Write Scene (GPT-4o-mini)

**Option A: Use n8n Environment Variable (Recommended)**
```bash
# In your n8n instance
export OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE
```

**Option B: Hardcode in workflow**
```javascript
// In "Generate Book Outline" node:
"value": "Bearer YOUR_API_KEY_HERE"
```

---

### Step 2: Frontend Configuration

#### 2.1 Verify New Files Exist

```bash
# Check these files exist:
src/app/dashboard/create/live-stream/page.tsx
src/components/LiveStreamingBookPreview.tsx
src/app/api/ai-config-generator/route.ts
src/app/api/book/start-live-generation/route.ts
src/app/api/book-generation-jobs/[jobId]/route.ts
```

#### 2.2 Verify Environment Variables

```bash
# Check .env file:
cat .env | grep N8N
```

**Expected output:**
```
N8N_BOOK_LIVE_WEBHOOK_URL=https://your-n8n.com/webhook/book-live-generation-start
N8N_WEBHOOK_SECRET=Bookcraft2025vonBeyerdigital!1234321
```

#### 2.3 Test API Routes

**Test 1: AI Config Generator**
```bash
curl -X POST http://localhost:5000/api/ai-config-generator \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "userPrompt": "Ein Krimi in London"
  }'
```

**Expected:**
```json
{
  "success": true,
  "config": {
    "title": "Schatten über Baker Street",
    "genre": "Krimi",
    "totalChapters": 12,
    ...
  }
}
```

**Test 2: Start Live Generation** (requires valid jobId)
```bash
curl -X POST http://localhost:5000/api/book/start-live-generation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "config": {
      "title": "Test Buch",
      "genre": "Fantasy",
      "description": "Ein Test",
      "totalChapters": 2,
      ...
    }
  }'
```

---

### Step 3: Testing the Complete Flow

#### 3.1 Browser Test

1. **Open the app:**
   ```
   http://localhost:5000/dashboard/create
   ```

2. **Click "Live Generation" card** (with ✨ badge)

3. **Enter a book idea:**
   ```
   "Ein Fantasy-Roman über eine junge Magierin, die ihre
   verlorenen Erinnerungen wiederfindet und dabei eine
   Verschwörung aufdeckt..."
   ```

4. **Click "Mit KI verbessern"**
   - Wait 3-5 seconds
   - Config should appear on right side

5. **Review & Edit Config** (optional)
   - Change title, genre, characters, etc.

6. **Click "Jetzt generieren!"**
   - Live Preview should start immediately
   - Progress bar should appear
   - Text should start appearing after ~30 seconds

#### 3.2 Monitor Backend Logs

**Terminal 1: Application Logs**
```bash
npm run dev
```

**Watch for:**
```
🤖 Generating AI book configuration for prompt: ...
✅ Generated book configuration: { title, genre, chapters }
🚀 Starting live book generation: { jobId, bookId }
✅ n8n live generation workflow started: { executionId }
```

**Terminal 2: n8n Execution Logs**
```bash
# In n8n web interface:
# 1. Click "Executions" (left sidebar)
# 2. Find your execution (should be "Running")
# 3. Click to open
# 4. Watch nodes light up green as they execute
```

#### 3.3 Monitor Live Updates

**Browser Console:**
```javascript
// Open DevTools → Console
// You should see:
📝 Received text chunk: { chapter: 1, textLength: 847, ... }
✨ Created new chapter: 1 Das Erwachen
📝 Received text chunk: { chapter: 1, textLength: 923, ... }
```

**Network Tab:**
```
# Requests every 2 seconds:
GET /api/book-generation-jobs/[jobId]
Status: 200 OK
```

---

### Step 4: Troubleshooting

#### Problem: "AI Config Generator not working"

**Check:**
```bash
# 1. OpenAI API Key
echo $OPENAI_API_KEY

# 2. Test API directly
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# 3. Check logs
tail -f logs/app.log | grep "config"
```

#### Problem: "n8n workflow not triggered"

**Check:**
```bash
# 1. Webhook URL
echo $N8N_BOOK_LIVE_WEBHOOK_URL

# 2. Test webhook
curl -X POST $N8N_BOOK_LIVE_WEBHOOK_URL \
  -H "Content-Type: application/json" \
  -H "x-n8n-webhook-secret: $N8N_WEBHOOK_SECRET" \
  -d '{"test": true}'

# Expected: 404 (need full payload)
# NOT Expected: Connection refused, timeout
```

**Fix:**
1. Check n8n is running
2. Check workflow is "Active"
3. Check firewall/network settings
4. Verify webhook URL is correct

#### Problem: "No text chunks arriving"

**Check:**
```bash
# 1. Frontend polling
# Browser DevTools → Network → Filter: book-generation-jobs
# Should see requests every 2s

# 2. Webhook secret
# Backend: .env
echo $N8N_WEBHOOK_SECRET

# n8n: Check all webhook nodes have matching secret

# 3. Backend logs
tail -f logs/app.log | grep "text chunk"
```

**Expected output:**
```
📝 Received text chunk for chapter 1: 347 characters
```

#### Problem: "Typing animation not working"

**Check Browser Console:**
```javascript
// Should see:
📝 Received text chunk: { ... }
✨ Created new chapter: 1 Das Erwachen
```

**Check Component:**
```typescript
// In LiveStreamingBookPreview.tsx
// Add debug logs:
console.log('Text queue length:', textQueueRef.current.length)
console.log('Is typing:', isTyping)
```

---

### Step 5: Production Deployment

#### 5.1 Environment Variables

**On Production Server:**
```bash
# Set all required vars:
export N8N_BOOK_LIVE_WEBHOOK_URL=https://n8n.yourcompany.com/webhook/book-live-generation-start
export N8N_WEBHOOK_SECRET=YOUR_PRODUCTION_SECRET_HERE
export OPENAI_API_KEY=sk-proj-YOUR_PRODUCTION_KEY
export NEXT_PUBLIC_APP_URL=https://yourapp.com
```

#### 5.2 Security Checklist

- [ ] Change webhook secret from default
- [ ] Use environment variables (not hardcoded)
- [ ] Enable HTTPS for all webhooks
- [ ] Rate limit API endpoints
- [ ] Monitor OpenAI costs
- [ ] Set up error alerts

#### 5.3 Performance Optimization

**Frontend:**
```typescript
// Increase polling interval in production:
const pollInterval = process.env.NODE_ENV === 'production' ? 3000 : 2000
```

**Backend:**
```typescript
// Add caching for job status:
import { Redis } from 'ioredis'
const redis = new Redis(process.env.REDIS_URL)
```

**n8n:**
```javascript
// Add delay between webhook calls:
await new Promise(resolve => setTimeout(resolve, 200))
```

---

## Success Checklist

- [ ] n8n workflow imported and active
- [ ] All Supabase credentials configured
- [ ] OpenAI API key set (n8n + backend)
- [ ] Webhook secret matches (n8n + backend)
- [ ] Environment variables set
- [ ] AI Config Generator works
- [ ] Live Generation starts
- [ ] Text chunks arrive
- [ ] Typing animation works
- [ ] Chapters complete
- [ ] Book marked as complete
- [ ] Redirect to editor works

---

## Quick Reference

### Environment Variables
```bash
N8N_BOOK_LIVE_WEBHOOK_URL=https://...
N8N_WEBHOOK_SECRET=Bookcraft2025vonBeyerdigital!1234321
OPENAI_API_KEY=sk-proj-...
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_APP_URL=https://...
```

### Key URLs
```
Frontend: /dashboard/create/live-stream
Webhook: /api/webhooks/n8n/book-status
Job Status: /api/book-generation-jobs/[jobId]
Config Gen: /api/ai-config-generator
Start Gen: /api/book/start-live-generation
```

### Key Files
```
n8n-workflows/book-live-streaming-workflow.json
src/app/dashboard/create/live-stream/page.tsx
src/components/LiveStreamingBookPreview.tsx
src/app/api/ai-config-generator/route.ts
src/app/api/book/start-live-generation/route.ts
src/app/api/webhooks/n8n/book-status/route.ts
```

---

## Support

**Documentation:**
- `LIVE_BOOK_GENERATION_FEATURE.md` - Feature overview
- `LIVE_STREAMING_WORKFLOW_README.md` - n8n workflow details
- `LIVE_STREAMING_SETUP_GUIDE.md` - This file

**Debugging:**
1. Check application logs
2. Check n8n execution logs
3. Check browser console
4. Check network tab
5. Test with curl

**Common Issues:**
- Webhook timeout → Check n8n is running
- No text chunks → Check webhook secret
- Typing not working → Check browser console

---

**Setup Complete! 🎉**

You're ready to create books with live streaming!

Test it now:
1. Open: `http://localhost:5000/dashboard/create`
2. Click: "Live Generation"
3. Enter: Your book idea
4. Watch: Magic happen! ✨
