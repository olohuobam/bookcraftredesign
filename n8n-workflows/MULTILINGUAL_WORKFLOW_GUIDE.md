# n8n Workflow Anpassung für Mehrsprachigkeit

Diese Anleitung zeigt dir, welche Änderungen du in deinem n8n `picturebook-generation-workflow` vornehmen musst, damit die Sprachauswahl aus der App funktioniert.

## Übersicht der Änderungen

Du musst **4 Nodes** im Workflow anpassen:

1. **Neuer Node**: "Prepare Language Prompts" (neu erstellen)
2. **Node**: "Generate Picturebook Outline (Gemini)" (anpassen)
3. **Node**: "Generate Page Text (Gemini)" (anpassen)
4. **Nodes**: Alle Heartbeat/Status-Nachrichten (optional - für mehrsprachige UI-Meldungen)

---

## 1. Neuen Node erstellen: "Prepare Language Prompts"

### Position im Workflow
Dieser Node sollte **direkt nach "Webhook Response"** und **vor "Update Status - Start"** eingefügt werden.

### Node-Typ
**Code Node** (JavaScript)

### Node-Name
`Prepare Language Prompts`

### Code für den Node

```javascript
// Extract language from config (default to 'en' if not provided)
const webhookData = $input.first().json.body;
const language = webhookData.config?.language || 'en';

// Language name mapping
const languageNames = {
  en: 'English', de: 'German (Deutsch)', es: 'Spanish (Español)',
  fr: 'French (Français)', it: 'Italian (Italiano)', pt: 'Portuguese (Português)',
  nl: 'Dutch (Nederlands)', pl: 'Polish (Polski)', ru: 'Russian (Русский)',
  ja: 'Japanese (日本語)', ko: 'Korean (한국어)', zh: 'Chinese (中文)',
  ar: 'Arabic (العربية)', tr: 'Turkish (Türkçe)', hi: 'Hindi (हिन्दी)',
  sv: 'Swedish (Svenska)', da: 'Danish (Dansk)', no: 'Norwegian (Norsk)',
  fi: 'Finnish (Suomi)', cs: 'Czech (Čeština)', el: 'Greek (Ελληνικά)',
  he: 'Hebrew (עברית)', id: 'Indonesian (Bahasa Indonesia)',
  th: 'Thai (ไทย)', vi: 'Vietnamese (Tiếng Việt)'
};

const languageName = languageNames[language] || 'English';

// Define prompts for Outline Generation
const outlinePrompts = {
  de: `Du bist ein professioneller Bilderbuch-Autor. Erstelle eine detaillierte Seitengliederung für ein Bilderbuch.

BUCH: "{{title}}"
GENRE: {{genre}}
BESCHREIBUNG: {{description}}
HAUPTCHARAKTERE: {{mainCharacters}}
SCHAUPLATZ: {{setting}}
ZIELGRUPPE: {{targetAudience}}

STRUKTUR:
- {{totalPages}} Seiten
- Bildstil: {{imageStyle}}
- Ton: {{tone}}

Erstelle eine JSON-Antwort mit detaillierter Seitenübersicht:
{
  "bookSummary": "Kurze Zusammenfassung des Bilderbuchs",
  "pages": [
    {
      "number": 1,
      "text": "Kurzer Text für diese Seite (maximal 100 Wörter)",
      "imagePrompt": "Detaillierte Bildbeschreibung für KI-Bildgenerierung",
      "sceneDescription": "Was auf dieser Seite passiert"
    }
  ]
}

WICHTIG: Antworte NUR mit gültigem JSON, keine zusätzlichen Erklärungen!`,

  // Generic prompt for all other languages
  default: `You are a professional picture book author. Create a detailed page outline for a picture book.

**IMPORTANT: All text content must be written in ${languageName}.**

BOOK: "{{title}}"
GENRE: {{genre}}
DESCRIPTION: {{description}}
MAIN CHARACTERS: {{mainCharacters}}
SETTING: {{setting}}
TARGET AUDIENCE: {{targetAudience}}

STRUCTURE:
- {{totalPages}} pages
- Image style: {{imageStyle}}
- Tone: {{tone}}

Create a JSON response with detailed page overview:
{
  "bookSummary": "Brief summary of the picture book (in ${languageName})",
  "pages": [
    {
      "number": 1,
      "text": "Short text for this page (max 100 words, in ${languageName})",
      "imagePrompt": "Detailed image description for AI image generation (in English for best image quality)",
      "sceneDescription": "What happens on this page (in ${languageName})"
    }
  ]
}

**Remember: All narrative text must be in ${languageName}. Only imagePrompt can be in English for optimal image generation.**

IMPORTANT: Respond ONLY with valid JSON, no additional explanations!`
};

// Define prompts for Page Text Generation
const pageTextPrompts = {
  de: `Du bist ein Bilderbuch-Autor. Schreibe einen kindgerechten, fesselnden Text für eine Bilderbuchseite.

BUCH: "{{title}}"
BUCHZUSAMMENFASSUNG: {{bookSummary}}

SEITE {{pageNumber}} von {{totalPages}}:
SZENE: {{sceneDescription}}
VORGESCHLAGENER TEXT: {{text}}

ZIELGRUPPE: {{targetAudience}}
TON: {{tone}}

Erstelle einen verbesserten, kindgerechten Text für diese Seite (maximal 100 Wörter).

Antworte mit JSON:
{
  "text": "Der finale Text für diese Seite",
  "imagePrompt": "{{imagePrompt}}"
}

WICHTIG: Antworte NUR mit gültigem JSON ohne Erklärungen.`,

  // Generic prompt for all other languages
  default: `You are a picture book author. Write child-friendly, engaging text for a picture book page.

**IMPORTANT: The text must be written in ${languageName}.**

BOOK: "{{title}}"
BOOK SUMMARY: {{bookSummary}}

PAGE {{pageNumber}} of {{totalPages}}:
SCENE: {{sceneDescription}}
SUGGESTED TEXT: {{text}}

TARGET AUDIENCE: {{targetAudience}}
TONE: {{tone}}

Create an improved, child-friendly text for this page (max 100 words, in ${languageName}).

Respond with JSON:
{
  "text": "The final text for this page (in ${languageName})",
  "imagePrompt": "{{imagePrompt}}"
}

IMPORTANT: Respond ONLY with valid JSON without explanations.`
};

// Select appropriate prompts based on language
const outlinePromptTemplate = outlinePrompts[language] || outlinePrompts.default;
const pageTextPromptTemplate = pageTextPrompts[language] || pageTextPrompts.default;

// Status messages by language
const statusMessages = {
  de: {
    structureGenerating: 'Bilderbuch-Struktur wird generiert (kann bis zu 1 Minute dauern)...',
    pagesBeingPrepared: 'Die Seiten werden vorbereitet...',
    pageTextCreating: 'Text wird erstellt...',
    pageImageGenerating: 'Bild wird generiert (kann bis zu 1 Minute dauern)...',
    pageFinished: 'ist fertig!',
    bookComplete: '🎉 Dein Bilderbuch ist fertig!',
    bookBeingPainted: 'wird gemalt...'
  },
  default: {
    structureGenerating: 'Generating picture book structure (may take up to 1 minute)...',
    pagesBeingPrepared: 'Preparing pages...',
    pageTextCreating: 'Creating text...',
    pageImageGenerating: 'Generating image (may take up to 1 minute)...',
    pageFinished: 'is complete!',
    bookComplete: '🎉 Your picture book is ready!',
    bookBeingPainted: 'is being illustrated...'
  }
};

const messages = statusMessages[language] || statusMessages.default;

// Return all prepared data
return [{
  json: {
    ...webhookData,
    language,
    languageName,
    outlinePromptTemplate,
    pageTextPromptTemplate,
    messages
  }
}];
```

### Workflow-Verbindungen aktualisieren
- **Input**: "Webhook Response"
- **Output**: "Update Status - Start"

**Wichtig**: Entferne die direkte Verbindung zwischen "Webhook Response" und "Update Status - Start" und verbinde stattdessen:
- "Webhook Response" → "Prepare Language Prompts"
- "Prepare Language Prompts" → "Update Status - Start"

---

## 2. Node anpassen: "💓 Heartbeat: Pre-Outline"

### Zu ändernder Parameter
Im Feld `fieldsUi.fieldValues` für `current_step`:

**ALT:**
```json
"fieldValue": "Bilderbuch-Struktur wird generiert (kann bis zu 1 Minute dauern)..."
```

**NEU:**
```json
"fieldValue": "={{ $('Prepare Language Prompts').item.json.messages.structureGenerating }}"
```

---

## 3. Node anpassen: "Generate Picturebook Outline (Gemini)"

### Zu ändernder Parameter
Im Feld `jsonBody` → `contents[0].parts[0].text`:

**ALT:**
Der gesamte hardcoded deutsche Text (Zeile 238 im Workflow)

**NEU:**
```javascript
={{
  const prompt = $('Prepare Language Prompts').item.json.outlinePromptTemplate;
  const config = $('Prepare Language Prompts').item.json.body.config;

  // Replace placeholders with actual values
  return prompt
    .replace(/\{\{title\}\}/g, config.title || '')
    .replace(/\{\{genre\}\}/g, config.genre || '')
    .replace(/\{\{description\}\}/g, config.description || '')
    .replace(/\{\{mainCharacters\}\}/g, config.mainCharacters || '')
    .replace(/\{\{setting\}\}/g, config.setting || '')
    .replace(/\{\{targetAudience\}\}/g, config.targetAudience || '')
    .replace(/\{\{totalPages\}\}/g, config.totalPages || 12)
    .replace(/\{\{imageStyle\}\}/g, config.imageStyle || '')
    .replace(/\{\{tone\}\}/g, config.tone || '');
}}
```

**Wichtig**: Diese Änderung ersetzt den gesamten hardcoded Prompt-Text. Der neue Code holt den Template-String aus dem "Prepare Language Prompts" Node und ersetzt die Platzhalter mit den tatsächlichen Werten.

---

## 4. Node anpassen: "💓 Heartbeat: Pre-Text"

### Zu ändernder Parameter
Im Feld `fieldsUi.fieldValues` für `current_step`:

**ALT:**
```json
"fieldValue": "={{ 'Seite ' + $json.number + ': Text wird erstellt...' }}"
```

**NEU:**
```javascript
"fieldValue": "={{ 'Page ' + $json.number + ': ' + $('Prepare Language Prompts').item.json.messages.pageTextCreating }}"
```

---

## 5. Node anpassen: "Generate Page Text (Gemini)"

### Zu ändernder Parameter
Im Feld `jsonBody` → `contents[0].parts[0].text`:

**ALT:**
Der gesamte hardcoded deutsche Text (Zeile 373 im Workflow)

**NEU:**
```javascript
={{
  const prompt = $('Prepare Language Prompts').item.json.pageTextPromptTemplate;
  const config = $('Parse Outline').item.json.config;
  const outline = $('Parse Outline').item.json.outline;
  const pageData = $input.item.json;

  // Replace placeholders with actual values
  return prompt
    .replace(/\{\{title\}\}/g, config.title || '')
    .replace(/\{\{bookSummary\}\}/g, outline.bookSummary || '')
    .replace(/\{\{pageNumber\}\}/g, pageData.number)
    .replace(/\{\{totalPages\}\}/g, config.totalPages || 12)
    .replace(/\{\{sceneDescription\}\}/g, pageData.sceneDescription || '')
    .replace(/\{\{text\}\}/g, pageData.text || '')
    .replace(/\{\{targetAudience\}\}/g, config.targetAudience || '')
    .replace(/\{\{tone\}\}/g, config.tone || '')
    .replace(/\{\{imagePrompt\}\}/g, pageData.imagePrompt || '');
}}
```

---

## 6. Node anpassen: "💓 Heartbeat: Pre-Image"

### Zu ändernder Parameter
Im Feld `fieldsUi.fieldValues` für `current_step`:

**ALT:**
```json
"fieldValue": "={{ 'Seite ' + $json.number + ': Bild wird generiert (kann bis zu 1 Minute dauern)...' }}"
```

**NEU:**
```javascript
"fieldValue": "={{ 'Page ' + $json.number + ': ' + $('Prepare Language Prompts').item.json.messages.pageImageGenerating }}"
```

---

## 7. Node anpassen: "Update Status - Outline Done"

### Zu ändernder Parameter
Im Feld `fieldsUi.fieldValues` für `current_step`:

**ALT:**
```json
"fieldValue": "Die Seiten werden vorbereitet..."
```

**NEU:**
```json
"fieldValue": "={{ $('Prepare Language Prompts').item.json.messages.pagesBeingPrepared }}"
```

---

## 8. Node anpassen: "Update Job Progress"

### Zu ändernder Parameter
Im Feld `fieldsUi.fieldValues` für `current_step`:

**ALT:**
```json
"fieldValue": "={{ \"Seite \" + $json.number + \" wird gemalt...\" }}"
```

**NEU:**
```javascript
"fieldValue": "={{ 'Page ' + $json.number + ' ' + $('Prepare Language Prompts').item.json.messages.bookBeingPainted }}"
```

---

## 9. Node anpassen: "Finalize Job"

### Zu ändernder Parameter
Im Feld `fieldsUi.fieldValues` für `current_step`:

**ALT:**
```json
"fieldValue": "Dein Bilderbuch ist fertig!"
```

**NEU:**
```json
"fieldValue": "={{ $('Prepare Language Prompts').item.json.messages.bookComplete }}"
```

---

## 10. Node anpassen: "Final Status Update"

### Zu ändernder Parameter
Im Feld `jsonBody`:

**ALT:**
```json
"currentStep": "🎉 Dein Bilderbuch ist fertig!"
```

**NEU:**
```javascript
"currentStep": "={{ $('Prepare Language Prompts').item.json.messages.bookComplete }}"
```

---

## Zusammenfassung der Änderungen

### Nodes die erstellt werden müssen:
1. ✨ **NEU**: "Prepare Language Prompts" (Code Node nach "Webhook Response")

### Nodes die angepasst werden müssen:
2. 🔧 "💓 Heartbeat: Pre-Outline"
3. 🔧 "Generate Picturebook Outline (Gemini)" (WICHTIGSTE ÄNDERUNG)
4. 🔧 "💓 Heartbeat: Pre-Text"
5. 🔧 "Generate Page Text (Gemini)" (WICHTIGSTE ÄNDERUNG)
6. 🔧 "💓 Heartbeat: Pre-Image"
7. 🔧 "Update Status - Outline Done"
8. 🔧 "Update Job Progress"
9. 🔧 "Finalize Job"
10. 🔧 "Final Status Update"

---

## Testen der Änderungen

Nach den Änderungen solltest du testen:

1. **Englisches Buch**: Wähle Englisch in der App → Buch sollte auf Englisch generiert werden
2. **Deutsches Buch**: Wähle Deutsch → Buch sollte auf Deutsch generiert werden
3. **Andere Sprache** (z.B. Spanisch): Wähle Spanisch → Buch sollte auf Spanisch sein
4. **Kein Language-Parameter**: Sollte standardmäßig auf Englisch fallen

### Debug-Tipps

Wenn es nicht funktioniert:
- Überprüfe die n8n Execution Logs
- Prüfe ob `config.language` korrekt vom Webhook empfangen wird
- Teste den "Prepare Language Prompts" Node einzeln
- Stelle sicher, dass alle Node-Referenzen (`$('Prepare Language Prompts')`) korrekt sind

---

## Vorteile dieser Lösung

✅ **Zentrale Konfiguration**: Alle Sprach-Logik in einem Node
✅ **Einfach erweiterbar**: Neue Sprachen nur im "Prepare Language Prompts" Node hinzufügen
✅ **Deutsche Prompts bleiben erhalten**: Spezielle DE-Prompts für beste deutsche Qualität
✅ **Fallback auf Englisch**: Sichere Standardsprache
✅ **Konsistente Status-Meldungen**: Mehrsprachige UI-Nachrichten

---

## Optional: Alternative für "Generate Picturebook Outline (Gemini)"

Falls die obige Expression-Syntax in n8n Probleme macht, kannst du auch einen zusätzlichen Code-Node einfügen:

### Node: "Build Outline Prompt"
**Position**: Zwischen "💓 Heartbeat: Pre-Outline" und "Generate Picturebook Outline (Gemini)"

```javascript
const promptTemplate = $('Prepare Language Prompts').item.json.outlinePromptTemplate;
const config = $('Prepare Language Prompts').item.json.body.config;

const finalPrompt = promptTemplate
  .replace(/\{\{title\}\}/g, config.title || '')
  .replace(/\{\{genre\}\}/g, config.genre || '')
  .replace(/\{\{description\}\}/g, config.description || '')
  .replace(/\{\{mainCharacters\}\}/g, config.mainCharacters || '')
  .replace(/\{\{setting\}\}/g, config.setting || '')
  .replace(/\{\{targetAudience\}\}/g, config.targetAudience || '')
  .replace(/\{\{totalPages\}\}/g, config.totalPages || 12)
  .replace(/\{\{imageStyle\}\}/g, config.imageStyle || '')
  .replace(/\{\{tone\}\}/g, config.tone || '');

return [{
  json: {
    ...config,
    outlinePrompt: finalPrompt
  }
}];
```

Dann im "Generate Picturebook Outline (Gemini)" Node einfach:
```javascript
"text": "={{ $('Build Outline Prompt').item.json.outlinePrompt }}"
```

---

🎉 **Fertig!** Mit diesen Änderungen unterstützt dein n8n Workflow alle 25 Sprachen.
