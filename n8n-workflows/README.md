# 📚 Bookcraft n8n Workflows

Production-ready Workflows für automatische Buchgenerierung mit Live-Preview.

---

## 🚀 Quick Start

### 1. Workflow importieren
```bash
n8n → Import → book-generation-production-workflow.json
```

### 2. API-Keys eintragen
- `YOUR_OPENAI_API_KEY_HERE` (2x)
- `YOUR_WEBHOOK_SECRET_HERE` (6x)
- `YOUR_SUPABASE_CREDENTIAL_ID` (7x)

### 3. Aktivieren & Testen
```bash
# Siehe: QUICK_START.md
```

### 4. Frontend integrieren
```tsx
import ProductionBookLivePreview from '@/components/ProductionBookLivePreview'

<ProductionBookLivePreview
  jobId={jobId}
  bookId={bookId}
  onComplete={() => router.push(`/dashboard/books/${bookId}`)}
/>
```

---

## 📦 Was ist enthalten?

### 🏆 Production Workflow (EMPFOHLEN)
**Datei:** `book-generation-production-workflow.json`

**Features:**
- ✅ **GPT-4.1-mini** (schnell & günstig!)
- ✅ **5-7 KeyEvents** pro Kapitel
- ✅ **~5000 Wörter** pro Kapitel
- ✅ **Live-Preview** (nur Titel, kein Text)
- ✅ **Perfekte Formatierung** für Editor

**Kosten:** ~$0.05-0.08 pro Kapitel
**Zeit:** ~5 Minuten pro Kapitel
**Qualität:** ⭐⭐⭐⭐⭐

**Dokumentation:**
- `PRODUCTION_WORKFLOW_README.md` - Vollständige Anleitung
- `QUICK_START.md` - 5-Minuten Setup
- `FRONTEND_INTEGRATION.md` - Frontend-Komponente

---

### 🎨 Picture Book Workflow
**Datei:** `picturebook-generation-workflow.json`

**Features:**
- Bilder mit DALL-E/Imagen
- Text + Bild pro Seite
- Für Kinderbücher

**Dokumentation:**
- `PICTUREBOOK_WORKFLOW_README.md`

---

### 🧪 Customer-Friendly Workflow
**Datei:** `book-generation-workflow-customer-friendly.json`

**Features:**
- Szenentext in Live-Preview
- Kürzere Kapitel (~1500-2500 Wörter)
- Für Demos/Prototypen

**Dokumentation:**
- `CUSTOMER_FRIENDLY_WORKFLOW_README.md`

---

## 📊 Workflow-Vergleich

| Feature | Production ⭐ | Customer-Friendly | Picture Book |
|---------|--------------|------------------|--------------|
| **Wörter/Kapitel** | ~5000 | ~1500-2500 | ~200-500 |
| **KeyEvents** | 5-7 (fix) | Variabel | N/A |
| **Live-Preview** | Nur Titel | Szenentext | Bilder |
| **Model** | GPT-4.1-mini | GPT-4o-mini | Gemini+Imagen |
| **Kosten/Kapitel** | $0.05-0.08 | $0.10 | $0.25 |
| **Zeit/Kapitel** | 5 Min | 5 Min | 3 Min |

**→ Für Production:** `book-generation-production-workflow.json`

Siehe: `WORKFLOW_COMPARISON.md`

---

## 🎯 Was der Production Workflow macht

### Input
```json
{
  "jobId": "uuid",
  "bookId": "uuid",
  "callbackUrl": "https://your-app/api/webhooks/n8n/book-status",
  "config": {
    "title": "Die Chroniken von Aetheria",
    "genre": "Fantasy",
    "description": "...",
    "totalChapters": 10,
    "writingStyle": "Episch",
    "tone": "Dramatisch",
    "pov": "third",
    "tenseStyle": "past"
  }
}
```

### Output
```
10 Kapitel
├─ Kapitel 1 (5.123 Wörter)
│  ├─ KeyEvent 1: Der Traum (856 Wörter)
│  ├─ KeyEvent 2: Das Erwachen (842 Wörter)
│  ├─ KeyEvent 3: Die Botschaft (891 Wörter)
│  ├─ KeyEvent 4: Der Mentor (867 Wörter)
│  ├─ KeyEvent 5: Die Entscheidung (834 Wörter)
│  └─ KeyEvent 6: Der Aufbruch (833 Wörter)
├─ Kapitel 2 (4.987 Wörter)
│  └─ ... (6 KeyEvents)
└─ ... (10 Kapitel total)

Total: ~50.000 Wörter
Zeit: ~45 Minuten
Kosten: ~$0.50-0.80
```

### Live-Preview zeigt
```
✍️ Kapitel 3: Die magische Begegnung (wird geschrieben...)
Progress: 2/6 Szenen

✅ Kapitel 1: Der Traum (856 Wörter) ✓
✅ Kapitel 1: Das Erwachen (842 Wörter) ✓
✅ Kapitel 2: Ankunft (867 Wörter) ✓

🎉 Kapitel 1 ist fertig! (5.123 Wörter in 6 Szenen)
```

**Kein Szenentext wird angezeigt!** Nur Titel und Progress.

---

## 🔧 Setup-Schritte

### Backend
1. Workflow in n8n importieren
2. API-Keys eintragen (OpenAI, Webhook Secret, Supabase)
3. Workflow aktivieren
4. Webhook-URL in `.env` eintragen

### Frontend
1. Neue Komponente kopieren: `ProductionBookLivePreview.tsx`
2. In Job-Status-Page verwenden
3. Webhook-Route anpassen (metadata speichern)

**Siehe:** `FRONTEND_INTEGRATION.md`

---

## 📈 Performance & Kosten

### Beispiel: 10-Kapitel Buch

**Production Workflow (GPT-4.1-mini):**
- ⏱️ Zeit: ~45 Minuten
- 💰 Kosten: ~$0.50-0.80
- 📝 Output: ~50.000 Wörter
- ⭐ Qualität: Exzellent

**Bei 100 Büchern/Monat:**
- 💰 Kosten: ~$65/Monat
- 💵 Ersparnis vs. GPT-4o: ~$240/Monat!
- 📊 Das sind **$2.880/Jahr** gespart!

---

## 📁 Datei-Übersicht

```
n8n-workflows/
├── book-generation-production-workflow.json   ⭐ MAIN
├── ProductionBookLivePreview.tsx              ⭐ FRONTEND
│
├── PRODUCTION_WORKFLOW_README.md              📖 Hauptdoku
├── QUICK_START.md                             🚀 5-Min Setup
├── FRONTEND_INTEGRATION.md                    🎨 Frontend Guide
├── WORKFLOW_COMPARISON.md                     📊 Vergleich
├── CHANGELOG.md                               📝 Änderungen
├── TEST_PAYLOADS.md                           🧪 Test-Daten
│
├── book-generation-workflow-customer-friendly.json
├── CUSTOMER_FRIENDLY_WORKFLOW_README.md
├── SETUP_CHECKLIST.md
├── USER_EXPERIENCE.md
│
├── picturebook-generation-workflow.json
└── PICTUREBOOK_WORKFLOW_README.md
```

---

## ✅ Checkliste: Production-Ready

- [ ] Workflow importiert & aktiviert
- [ ] API-Keys eingetragen
- [ ] Test-Buch generiert (2 Kapitel)
- [ ] Frontend-Komponente integriert
- [ ] Live-Preview zeigt KeyEvents
- [ ] Formatierung im Editor korrekt
- [ ] Kosten im OpenAI Dashboard geprüft
- [ ] Performance zufriedenstellend

---

## 🎉 Erfolg!

Wenn alles funktioniert:
- ✅ Bücher werden in ~45 Min generiert
- ✅ Kosten nur ~$0.65 pro 10-Kapitel Buch
- ✅ Konsistente ~5000 Wörter/Kapitel
- ✅ Perfekte Formatierung im Editor
- ✅ Live-Preview zeigt nur relevante Infos
- ✅ Kunde ist glücklich! 😊

---

## 📞 Support

Bei Fragen oder Problemen:

1. **Check die Docs**
   - `PRODUCTION_WORKFLOW_README.md`
   - `FRONTEND_INTEGRATION.md`

2. **Debug Steps**
   - Browser Console prüfen
   - n8n Execution Logs prüfen
   - Backend Logs prüfen
   - Datenbank: `book_generation_jobs.metadata`

3. **Test-Payloads**
   - Siehe: `TEST_PAYLOADS.md`

---

## 🚀 Los geht's!

```bash
# 1. Import
n8n → Import → book-generation-production-workflow.json

# 2. Setup (5 Min)
Siehe: QUICK_START.md

# 3. Testen
curl -X POST ... (siehe TEST_PAYLOADS.md)

# 4. Live gehen! 🎉
```

**Happy Book Generation! 📚✨**
