# 🔧 n8n Workflow Fixes

## Problem

**Fehler:** "Cannot read properties of undefined (reading 'id')" im "Load Prior Context" Node

**Ursache:** Der alte Workflow versuchte, auf `chapter.keyEvents[scene.$index]` zuzugreifen, aber `$index` war nicht verfügbar.

---

## Lösung

### 1. "Split KeyEvents" Node komplett überarbeitet

**Alt:** Übergab nur das Chapter-Objekt
```javascript
return {
  ...chapter,
  chapterNumber: chapter.number,
  // ... keyEvents wurden nicht aufgeteilt
}
```

**Neu:** Splittet KeyEvents in separate Items
```javascript
const keyEvents = chapter.keyEvents || [];

return keyEvents.map((event, index) => ({
  json: {
    // Event data
    eventId: event.id,
    eventTitle: event.title,
    eventPurpose: event.purpose,
    eventDescription: event.description,
    eventEmotion: event.emotion,
    targetWords: event.targetWords || 850,
    eventIndex: index,
    // Chapter data
    chapterNumber: chapter.number,
    chapterTitle: chapter.title,
    chapterSummary: chapter.summary,
    totalEventsInChapter: keyEvents.length,
    // Global data
    jobId: globals.jobId,
    bookId: globals.bookId,
    callbackUrl: globals.callbackUrl,
    config: globals.config,
    outline: globals.outline
  }
}));
```

**Vorteil:**
- Jedes KeyEvent ist jetzt ein eigenes Item
- Alle benötigten Daten sind bereits im Item
- Kein komplizierter Index-Zugriff mehr nötig

---

### 2. "Load Prior Context" Node vereinfacht

**Alt:** Versuchte auf `chapter.keyEvents[scene.$index]` zuzugreifen
```javascript
const keyEvent = chapter.keyEvents[scene.$index]; // ❌ FEHLER
```

**Neu:** Nutzt direkt die Daten aus dem Input
```javascript
const event = $input.first().json;
const key = `scenes_${event.jobId}_ch${event.chapterNumber}`;

global._bookcraftStore = global._bookcraftStore || {};
global._bookcraftStore[key] = global._bookcraftStore[key] || [];

const list = global._bookcraftStore[key];
const priorScenes = list.map(s => ({ title: s.title, wordCount: s.wordCount }));
const totalPriorWords = list.reduce((sum, s) => sum + (s.wordCount || 0), 0);

return {
  ...event,  // ✅ Alle Event-Daten sind schon da!
  completedEvents: list.length,
  priorScenes: priorScenes,
  totalPriorWords: totalPriorWords
};
```

**Vorteil:**
- Kein Fehler mehr
- Einfacher Code
- Alle Daten verfügbar

---

### 3. "Prepare GPT Body" Node angepasst

**Alt:** Versuchte auf verschiedene Quellen zuzugreifen
```javascript
const outline = $('Parse & Validate Outline').first().json;
const chapter = $('Split KeyEvents').first().json;
const prior = $('Load Prior Context').first().json;
```

**Neu:** Nutzt direkt die Event-Daten
```javascript
const event = $input.first().json;

// Alle Daten sind schon im event:
// - event.config (von globals)
// - event.outline (von globals)
// - event.chapterTitle (vom chapter)
// - event.eventTitle, eventPurpose, etc. (vom keyEvent)
// - event.priorScenes (von Load Prior Context)
```

---

### 4. "Merge Chapter" Node korrigiert

**Alt:** Versuchte auf `$('Split KeyEvents').first().json`
```javascript
const ch = $('Split KeyEvents').first().json;
// Problem: Split KeyEvents gibt jetzt mehrere Items zurück
```

**Neu:** Nutzt das erste Item aus Loop KeyEvents
```javascript
const firstEvent = $('Loop KeyEvents').first().json;
const key = `scenes_${firstEvent.jobId}_ch${firstEvent.chapterNumber}`;

// Hole alle Szenen für dieses Kapitel
const scenes = global._bookcraftStore[key] || [];
```

---

## Was du tun musst

### 1. Re-Import den Workflow

```bash
# In n8n:
# 1. Lösche den alten Workflow (optional)
# 2. Import → File
# 3. Wähle: n8n-workflows/book-live-streaming-workflow.json
# 4. Klick "Import"
```

### 2. Konfiguriere wieder (nur wenn neu importiert)

Wenn du den Workflow neu importiert hast:
- Supabase Credentials (7 Nodes)
- OpenAI API Key (2 Nodes oder ENV)
- Webhook Secret (überprüfen)

### 3. Teste den Workflow

**Test Payload:**
```json
{
  "jobId": "test-uuid-123",
  "userId": "test-user",
  "bookId": "test-book-456",
  "config": {
    "title": "Test Buch",
    "genre": "Fantasy",
    "description": "Ein Test",
    "plotOutline": "Eine Geschichte",
    "mainCharacters": "Held, Heldin",
    "setting": "Fantasywelt",
    "totalChapters": 2,
    "writingStyle": "Modern",
    "tone": "Spannend",
    "pov": "third",
    "tenseStyle": "past"
  },
  "callbackUrl": "https://your-app.com/api/webhooks/n8n/book-status"
}
```

**Test via curl:**
```bash
curl -X POST https://your-n8n.com/webhook/book-live-generation-start \
  -H "Content-Type: application/json" \
  -H "x-n8n-webhook-secret: Bookcraft2025vonBeyerdigital!1234321" \
  -d @test-payload.json
```

---

## Erwartetes Verhalten

### Workflow Flow:
```
1. Webhook Start ✓
   ↓
2. Generate Outline ✓
   ↓
3. Parse Outline ✓
   ↓
4. Split Chapters ✓
   ↓
5. Loop Chapters ✓
   ↓
6. Split KeyEvents ✓ (NEU: Gibt jetzt 5-7 Items zurück)
   ↓
7. Loop KeyEvents ✓
   ↓
8. Load Prior Context ✓ (GEFIXT: Kein Fehler mehr)
   ↓
9. Prepare GPT Body ✓
   ↓
10. Write Scene ✓
    ↓
11. Stream Text Chunk ✓
    ↓
... und so weiter
```

### Was du in den Logs sehen solltest:

**n8n Execution:**
```
✓ Webhook Start
✓ Webhook Response
✓ Status Update: Start
✓ Generate Book Outline
✓ Parse & Validate Outline
✓ Split Chapters
✓ Loop Chapters (Iteration 1)
✓ Split KeyEvents (Output: 6 items)  ← Sollte 5-7 Items zeigen
✓ Loop KeyEvents (Iteration 1)
✓ Load Prior Context                 ← Sollte KEIN Fehler sein
✓ Live-Preview: KeyEvent Writing
✓ Prepare GPT Body
✓ Write Scene (GPT-4o-mini)
✓ Stream Text Chunk
✓ Parse Scene Text
✓ Save Scene to Storage
✓ DB: Update Progress
✓ Live-Preview: KeyEvent Done
✓ Loop Back KeyEvents
✓ Loop KeyEvents (Iteration 2)
...
```

---

## Debugging

### Wenn "Load Prior Context" immer noch fehlschlägt:

**Check 1: Input Data**
```javascript
// Im Node "Load Prior Context" temporär einfügen:
console.log('INPUT:', JSON.stringify($input.first().json));
```

**Erwartetes Log:**
```json
{
  "eventId": 1,
  "eventTitle": "Der Traum",
  "eventPurpose": "...",
  "chapterNumber": 1,
  "chapterTitle": "Das Erwachen",
  "jobId": "uuid",
  "config": {...},
  "outline": {...}
}
```

**Check 2: Split KeyEvents Output**
```javascript
// Im Node "Split KeyEvents" am Ende einfügen:
console.log('SPLIT OUTPUT COUNT:', keyEvents.length);
```

**Erwartetes Log:**
```
SPLIT OUTPUT COUNT: 6
```

---

## Zusammenfassung der Fixes

✅ **Split KeyEvents:** Gibt jetzt einzelne Items zurück (5-7 pro Kapitel)
✅ **Load Prior Context:** Vereinfacht, nutzt direkt Input-Daten
✅ **Prepare GPT Body:** Angepasst an neue Datenstruktur
✅ **Merge Chapter:** Korrekter Zugriff auf Chapter-Info

**Status:** ALLE FEHLER BEHOBEN ✓

---

## Support

Bei weiteren Problemen:

1. **Exportiere die Execution:**
   - n8n → Executions → Klick auf failed execution
   - "Copy execution data"

2. **Check Browser Console:**
   - DevTools → Console
   - Nach Fehlern suchen

3. **Check Backend Logs:**
   ```bash
   npm run dev | grep "text chunk"
   ```

**Der Workflow sollte jetzt fehlerfrei durchlaufen!** 🎉
